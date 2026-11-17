const POINTS = {
  NOSE: 0,

  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,

  LEFT_HIP: 23,
  RIGHT_HIP: 24,

  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,

  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
}

function distance2D(a, b) {
  if (!a || !b) return 0

  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  )
}

function distance3D(a, b) {
  if (!a || !b) return 0

  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow((a.z ?? 0) - (b.z ?? 0), 2)
  )
}

function midpoint(a, b) {
  if (!a || !b) return null

  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
  }
}

function rawAngle(a, b) {
  if (!a || !b) return 0

  return (
    Math.atan2(
      b.y - a.y,
      b.x - a.x
    ) *
    (180 / Math.PI)
  )
}

function normalizedAngle(value) {
  let result = Math.abs(value) % 180

  if (result > 90) {
    result = 180 - result
  }

  return result
}

function getVisibility(point) {
  if (!point) return 0

  if (point.visibility === undefined) {
    return 1
  }

  return point.visibility
}

function average(values) {
  const valid = values.filter(
    (value) =>
      typeof value === 'number' &&
      Number.isFinite(value)
  )

  if (valid.length === 0) {
    return 0
  }

  return (
    valid.reduce(
      (sum, value) => sum + value,
      0
    ) / valid.length
  )
}

export function analyzeLandmarks(landmarks) {
  if (
    !landmarks ||
    landmarks.length < 29
  ) {
    return null
  }

  const nose =
    landmarks[POINTS.NOSE]

  const leftShoulder =
    landmarks[POINTS.LEFT_SHOULDER]

  const rightShoulder =
    landmarks[POINTS.RIGHT_SHOULDER]

  const leftHip =
    landmarks[POINTS.LEFT_HIP]

  const rightHip =
    landmarks[POINTS.RIGHT_HIP]

  const leftKnee =
    landmarks[POINTS.LEFT_KNEE]

  const rightKnee =
    landmarks[POINTS.RIGHT_KNEE]

  const leftAnkle =
    landmarks[POINTS.LEFT_ANKLE]

  const rightAnkle =
    landmarks[POINTS.RIGHT_ANKLE]

  if (
    !leftShoulder ||
    !rightShoulder ||
    !leftHip ||
    !rightHip
  ) {
    return null
  }

  const shoulderCenter =
    midpoint(
      leftShoulder,
      rightShoulder
    )

  const hipCenter =
    midpoint(
      leftHip,
      rightHip
    )

  const shoulderWidth2D =
    distance2D(
      leftShoulder,
      rightShoulder
    )

  const shoulderWidth3D =
    distance3D(
      leftShoulder,
      rightShoulder
    )

  const hipWidth2D =
    distance2D(
      leftHip,
      rightHip
    )

  const hipWidth3D =
    distance3D(
      leftHip,
      rightHip
    )

  const torsoLength2D =
    distance2D(
      shoulderCenter,
      hipCenter
    )

  const torsoLength3D =
    distance3D(
      shoulderCenter,
      hipCenter
    )

  const shoulderAngle =
    normalizedAngle(
      rawAngle(
        leftShoulder,
        rightShoulder
      )
    )

  const hipAngle =
    normalizedAngle(
      rawAngle(
        leftHip,
        rightHip
      )
    )

  const bodyAxisAngle =
    normalizedAngle(
      rawAngle(
        shoulderCenter,
        hipCenter
      )
    )

  const shoulderDepthDifference =
    Math.abs(
      (leftShoulder.z ?? 0) -
      (rightShoulder.z ?? 0)
    )

  const hipDepthDifference =
    Math.abs(
      (leftHip.z ?? 0) -
      (rightHip.z ?? 0)
    )

  const shoulderCompression =
    torsoLength2D > 0
      ? shoulderWidth2D /
        torsoLength2D
      : 0

  const hipCompression =
    torsoLength2D > 0
      ? hipWidth2D /
        torsoLength2D
      : 0

  const shoulderDepthRatio =
    torsoLength3D > 0
      ? shoulderDepthDifference /
        torsoLength3D
      : 0

  const hipDepthRatio =
    torsoLength3D > 0
      ? hipDepthDifference /
        torsoLength3D
      : 0

  const poseVisibility =
    average([
      getVisibility(leftShoulder),
      getVisibility(rightShoulder),
      getVisibility(leftHip),
      getVisibility(rightHip),
    ])

  const fullBodyVisibility =
    average([
      getVisibility(nose),
      getVisibility(leftShoulder),
      getVisibility(rightShoulder),
      getVisibility(leftHip),
      getVisibility(rightHip),
      getVisibility(leftKnee),
      getVisibility(rightKnee),
      getVisibility(leftAnkle),
      getVisibility(rightAnkle),
    ])

  return {
    nose,

    shoulderCenter,
    hipCenter,

    shoulderWidth2D,
    shoulderWidth3D,

    hipWidth2D,
    hipWidth3D,

    torsoLength2D,
    torsoLength3D,

    shoulderAngle,
    hipAngle,
    bodyAxisAngle,

    shoulderCompression,
    hipCompression,

    shoulderDepthDifference,
    hipDepthDifference,

    shoulderDepthRatio,
    hipDepthRatio,

    poseVisibility,
    fullBodyVisibility,

    landmarks,
  }
}