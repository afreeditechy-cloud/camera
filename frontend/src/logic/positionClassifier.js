import {
  analyzeLandmarks,
} from './landmarkAnalyzer'

const CONFIG = {
  MIN_POSE_VISIBILITY: 0.50,

  // We primarily want to analyze lying poses.
  MAX_LYING_BODY_AXIS_ANGLE: 55,

  // Projected shoulder width compared with
  // shoulder-to-hip body length.
  BACK_SHOULDER_RATIO: 0.42,
  SIDE_SHOULDER_RATIO: 0.30,

  // Difference in shoulder depth can indicate
  // one shoulder being closer to the camera.
  SIDE_DEPTH_RATIO: 0.12,

  // Minimum confidence required before
  // returning a definite position.
  MIN_CLASSIFICATION_CONFIDENCE: 55,
}

function clamp(value, min, max) {
  return Math.min(
    max,
    Math.max(min, value)
  )
}

function scoreRange(
  value,
  low,
  high
) {
  if (value <= low) return 0

  if (value >= high) return 1

  return (
    (value - low) /
    (high - low)
  )
}

function inverseScoreRange(
  value,
  low,
  high
) {
  if (value <= low) return 1

  if (value >= high) return 0

  return (
    1 -
    (
      (value - low) /
      (high - low)
    )
  )
}

function classifyBack(
  features
) {
  const shoulderWidthScore =
    scoreRange(
      features.shoulderCompression,
      CONFIG.SIDE_SHOULDER_RATIO,
      CONFIG.BACK_SHOULDER_RATIO
    )

  const depthScore =
    inverseScoreRange(
      features.shoulderDepthRatio,
      0.04,
      CONFIG.SIDE_DEPTH_RATIO
    )

  const shoulderAlignmentScore =
    inverseScoreRange(
      features.shoulderAngle,
      15,
      45
    )

  const hipAlignmentScore =
    inverseScoreRange(
      features.hipAngle,
      15,
      45
    )

  const score =
    (
      shoulderWidthScore * 0.45 +
      depthScore * 0.30 +
      shoulderAlignmentScore * 0.15 +
      hipAlignmentScore * 0.10
    )

  return clamp(
    score,
    0,
    1
  )
}

function classifySide(
  features
) {
  const shoulderCompressionScore =
    inverseScoreRange(
      features.shoulderCompression,
      CONFIG.SIDE_SHOULDER_RATIO,
      CONFIG.BACK_SHOULDER_RATIO
    )

  const depthScore =
    scoreRange(
      features.shoulderDepthRatio,
      0.05,
      CONFIG.SIDE_DEPTH_RATIO
    )

  const shoulderAngleScore =
    scoreRange(
      features.shoulderAngle,
      20,
      65
    )

  const hipAngleScore =
    scoreRange(
      features.hipAngle,
      20,
      65
    )

  const score =
    (
      shoulderCompressionScore * 0.45 +
      depthScore * 0.30 +
      shoulderAngleScore * 0.15 +
      hipAngleScore * 0.10
    )

  return clamp(
    score,
    0,
    1
  )
}

export function classifyPosition(
  landmarks
) {
  if (
    !landmarks ||
    landmarks.length < 29
  ) {
    return {
      position: 'UNKNOWN',
      confidence: 0,
      movement: false,
      metrics: {},
    }
  }

  const features =
    analyzeLandmarks(
      landmarks
    )

  if (!features) {
    return {
      position: 'UNKNOWN',
      confidence: 0,
      movement: false,
      metrics: {},
    }
  }

  const poseQuality =
    features.poseVisibility

  /*
   * If the core body landmarks are not
   * visible enough, don't guess.
   */
  if (
    poseQuality <
    CONFIG.MIN_POSE_VISIBILITY
  ) {
    return {
      position: 'UNKNOWN',
      confidence: Math.round(
        poseQuality * 100
      ),
      movement: false,
      metrics: buildMetrics(
        features
      ),
    }
  }

  /*
   * We only classify positions when the
   * body is approximately horizontal.
   *
   * A large body-axis angle usually means
   * the person is standing/sitting or the
   * camera geometry is unsuitable.
   */
  if (
    features.bodyAxisAngle >
    CONFIG.MAX_LYING_BODY_AXIS_ANGLE
  ) {
    return {
      position: 'UNKNOWN',
      confidence: Math.round(
        poseQuality * 70
      ),
      movement: false,
      metrics: buildMetrics(
        features
      ),
    }
  }

  const backScore =
    classifyBack(features)

  const sideScore =
    classifySide(features)

  const scoreDifference =
    Math.abs(
      backScore -
      sideScore
    )

  /*
   * If the classifier cannot clearly
   * distinguish BACK from SIDE,
   * return UNKNOWN rather than guessing.
   */
  if (
    scoreDifference < 0.12
  ) {
    return {
      position: 'UNKNOWN',
      confidence: Math.round(
        poseQuality * 50
      ),
      movement: false,
      metrics: {
        ...buildMetrics(
          features
        ),

        backScore: Number(
          backScore.toFixed(3)
        ),

        sideScore: Number(
          sideScore.toFixed(3)
        ),

        scoreDifference: Number(
          scoreDifference.toFixed(3)
        ),
      },
    }
  }

  const position =
    backScore > sideScore
      ? 'BACK'
      : 'SIDE'

  const winningScore =
    Math.max(
      backScore,
      sideScore
    )

  const confidence =
    Math.round(
      clamp(
        (
          winningScore *
          100 *
          0.75
        ) +
        (
          scoreDifference *
          100 *
          0.25
        ),
        0,
        99
      )
    )

  if (
    confidence <
    CONFIG.MIN_CLASSIFICATION_CONFIDENCE
  ) {
    return {
      position: 'UNKNOWN',
      confidence,
      movement: false,
      metrics: {
        ...buildMetrics(
          features
        ),

        backScore: Number(
          backScore.toFixed(3)
        ),

        sideScore: Number(
          sideScore.toFixed(3)
        ),

        scoreDifference: Number(
          scoreDifference.toFixed(3)
        ),
      },
    }
  }

  return {
    position,
    confidence,
    movement: false,

    metrics: {
      ...buildMetrics(
        features
      ),

      backScore: Number(
        backScore.toFixed(3)
      ),

      sideScore: Number(
        sideScore.toFixed(3)
      ),

      scoreDifference: Number(
        scoreDifference.toFixed(3)
      ),
    },
  }
}

function buildMetrics(
  features
) {
  return {
    poseQuality: Number(
      features.poseVisibility.toFixed(2)
    ),

    fullBodyVisibility: Number(
      features.fullBodyVisibility.toFixed(2)
    ),

    shoulderAngle: Number(
      features.shoulderAngle.toFixed(1)
    ),

    hipAngle: Number(
      features.hipAngle.toFixed(1)
    ),

    bodyAxisAngle: Number(
      features.bodyAxisAngle.toFixed(1)
    ),

    shoulderWidth: Number(
      features.shoulderWidth2D.toFixed(3)
    ),

    hipWidth: Number(
      features.hipWidth2D.toFixed(3)
    ),

    torsoLength: Number(
      features.torsoLength2D.toFixed(3)
    ),

    shoulderCompression: Number(
      features.shoulderCompression.toFixed(3)
    ),

    hipCompression: Number(
      features.hipCompression.toFixed(3)
    ),

    shoulderDepthRatio: Number(
      features.shoulderDepthRatio.toFixed(3)
    ),

    hipDepthRatio: Number(
      features.hipDepthRatio.toFixed(3)
    ),

    noseVisible:
      Boolean(features.nose),
  }
}