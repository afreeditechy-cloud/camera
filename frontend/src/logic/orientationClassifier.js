const P = {
  NOSE: 0,

  LEFT_EYE: 2,
  RIGHT_EYE: 5,

  LEFT_EAR: 7,
  RIGHT_EAR: 8,

  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,

  LEFT_HIP: 23,
  RIGHT_HIP: 24,
}

const MIN_VISIBILITY = 0.35

const FRONT_THRESHOLD = 0.58
const BACK_THRESHOLD = 0.58

const MIN_SCORE_GAP = 0.08

function visibility(point) {
  if (!point) return 0

  if (point.visibility === undefined) {
    return 1
  }

  return point.visibility
}

function average(values) {
  const valid = values.filter(
    (value) => Number.isFinite(value)
  )

  if (!valid.length) {
    return 0
  }

  return (
    valid.reduce(
      (sum, value) => sum + value,
      0
    ) / valid.length
  )
}

function distance(a, b) {
  if (!a || !b) return 0

  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  )
}

function clamp(value, min, max) {
  return Math.min(
    max,
    Math.max(min, value)
  )
}

export function classifyOrientation(landmarks) {
  if (
    !landmarks ||
    landmarks.length < 29
  ) {
    return {
      orientation: 'UNKNOWN',
      confidence: 0,
      metrics: {},
    }
  }

  const nose =
    landmarks[P.NOSE]

  const leftEye =
    landmarks[P.LEFT_EYE]

  const rightEye =
    landmarks[P.RIGHT_EYE]

  const leftEar =
    landmarks[P.LEFT_EAR]

  const rightEar =
    landmarks[P.RIGHT_EAR]

  const leftShoulder =
    landmarks[P.LEFT_SHOULDER]

  const rightShoulder =
    landmarks[P.RIGHT_SHOULDER]

  const leftHip =
    landmarks[P.LEFT_HIP]

  const rightHip =
    landmarks[P.RIGHT_HIP]

  const noseV =
    visibility(nose)

  const leftEyeV =
    visibility(leftEye)

  const rightEyeV =
    visibility(rightEye)

  const leftEarV =
    visibility(leftEar)

  const rightEarV =
    visibility(rightEar)

  const leftShoulderV =
    visibility(leftShoulder)

  const rightShoulderV =
    visibility(rightShoulder)

  const leftHipV =
    visibility(leftHip)

  const rightHipV =
    visibility(rightHip)

  const bodyVisibility =
    average([
      leftShoulderV,
      rightShoulderV,
      leftHipV,
      rightHipV,
    ])

  if (
    bodyVisibility <
    MIN_VISIBILITY
  ) {
    return {
      orientation: 'UNKNOWN',
      confidence: 0,
      metrics: {
        bodyVisibility:
          Number(
            bodyVisibility.toFixed(2)
          ),
      },
    }
  }

  /*
   * ------------------------------------------------
   * FACE EVIDENCE
   * ------------------------------------------------
   *
   * When the child is facing the camera,
   * the eyes and nose are normally much stronger.
   */

  const eyeScore =
    average([
      leftEyeV,
      rightEyeV,
    ])

  const earScore =
    average([
      leftEarV,
      rightEarV,
    ])

  const faceScore =
    (
      noseV * 0.40 +
      eyeScore * 0.45 +
      earScore * 0.15
    )

  /*
   * ------------------------------------------------
   * FRONT SCORE
   * ------------------------------------------------
   */

  let frontScore =
    faceScore

  /*
   * A frontal body normally has both shoulders
   * and both hips tracked reasonably well.
   */

  const bodySymmetry =
    average([
      leftShoulderV,
      rightShoulderV,
      leftHipV,
      rightHipV,
    ])

  frontScore =
    (
      frontScore * 0.75 +
      bodySymmetry * 0.25
    )

  /*
   * ------------------------------------------------
   * BACK SCORE
   * ------------------------------------------------
   *
   * We DO NOT simply say:
   *
   * "no face = BACK"
   *
   * because that would produce many false alerts.
   *
   * Instead, require:
   *
   * 1. body visible
   * 2. face evidence low
   * 3. shoulders visible
   * 4. hips visible
   */

  const faceAbsence =
    clamp(
      1 - faceScore,
      0,
      1
    )

  const shoulderEvidence =
    average([
      leftShoulderV,
      rightShoulderV,
    ])

  const hipEvidence =
    average([
      leftHipV,
      rightHipV,
    ])

  let backScore =
    (
      faceAbsence * 0.55 +
      shoulderEvidence * 0.25 +
      hipEvidence * 0.20
    )

  /*
   * ------------------------------------------------
   * BODY GEOMETRY
   * ------------------------------------------------
   */

  const shoulderWidth =
    distance(
      leftShoulder,
      rightShoulder
    )

  const hipWidth =
    distance(
      leftHip,
      rightHip
    )

  let geometryScore = 0.5

  if (
    shoulderWidth > 0 &&
    hipWidth > 0
  ) {
    const ratio =
      hipWidth /
      shoulderWidth

    if (
      ratio >= 0.55 &&
      ratio <= 1.45
    ) {
      geometryScore = 1
    } else if (
      ratio >= 0.40 &&
      ratio <= 1.60
    ) {
      geometryScore = 0.7
    } else {
      geometryScore = 0.35
    }
  }

  backScore =
    (
      backScore * 0.85 +
      geometryScore * 0.15
    )

  /*
   * ------------------------------------------------
   * DECISION
   * ------------------------------------------------
   */

  const scoreGap =
    Math.abs(
      frontScore -
      backScore
    )

  let orientation =
    'UNKNOWN'

  let confidence = 0

  if (
    frontScore >=
      FRONT_THRESHOLD &&
    frontScore >
      backScore &&
    scoreGap >=
      MIN_SCORE_GAP
  ) {
    orientation =
      'FRONT'

    confidence =
      frontScore * 100
  } else if (
    backScore >=
      BACK_THRESHOLD &&
    backScore >
      frontScore &&
    scoreGap >=
      MIN_SCORE_GAP
  ) {
    orientation =
      'BACK'

    confidence =
      backScore * 100
  }

  return {
    orientation,

    confidence:
      Math.round(
        clamp(
          confidence,
          0,
          99
        )
      ),

    metrics: {
      noseVisibility:
        Number(
          noseV.toFixed(2)
        ),

      eyeVisibility:
        Number(
          eyeScore.toFixed(2)
        ),

      earVisibility:
        Number(
          earScore.toFixed(2)
        ),

      bodyVisibility:
        Number(
          bodyVisibility.toFixed(2)
        ),

      shoulderVisibility:
        Number(
          shoulderEvidence.toFixed(2)
        ),

      hipVisibility:
        Number(
          hipEvidence.toFixed(2)
        ),

      frontScore:
        Number(
          frontScore.toFixed(3)
        ),

      backScore:
        Number(
          backScore.toFixed(3)
        ),

      scoreGap:
        Number(
          scoreGap.toFixed(3)
        ),

      geometryScore:
        Number(
          geometryScore.toFixed(2)
        ),

      noseDetected:
        noseV >= 0.35,

      eyesDetected:
        eyeScore >= 0.35,
    },
  }
}