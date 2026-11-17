const CONNECTIONS = [
  // Head → neck
  [0, 11],
  [0, 12],

  // Shoulders
  [11, 12],

  // Left arm
  [11, 13],
  [13, 15],

  // Right arm
  [12, 14],
  [14, 16],

  // Torso
  [11, 23],
  [12, 24],

  // Hips
  [23, 24],

  // Left leg
  [23, 25],
  [25, 27],

  // Right leg
  [24, 26],
  [26, 28],
]

const JOINTS = [
  11,
  12,
  13,
  14,
  15,
  16,
  23,
  24,
  25,
  26,
  27,
  28,
]

function visible(point) {
  if (!point) return false

  if (
    point.visibility === undefined
  ) {
    return true
  }

  return point.visibility >= 0.5
}

function pointXY(
  point,
  width,
  height
) {
  return {
    x: point.x * width,
    y: point.y * height,
  }
}

function drawCircle(
  ctx,
  point,
  width,
  height,
  radius
) {
  const p = pointXY(
    point,
    width,
    height
  )

  ctx.beginPath()

  ctx.arc(
    p.x,
    p.y,
    radius,
    0,
    Math.PI * 2
  )

  ctx.fill()
}

function drawLine(
  ctx,
  first,
  second,
  width,
  height
) {
  const a = pointXY(
    first,
    width,
    height
  )

  const b = pointXY(
    second,
    width,
    height
  )

  ctx.beginPath()

  ctx.moveTo(
    a.x,
    a.y
  )

  ctx.lineTo(
    b.x,
    b.y
  )

  ctx.stroke()
}

function drawHead(
  ctx,
  landmarks,
  width,
  height
) {
  const nose =
    landmarks[0]

  if (!visible(nose)) {
    return
  }

  /*
   * Estimate head size from
   * shoulder width.
   */
  const leftShoulder =
    landmarks[11]

  const rightShoulder =
    landmarks[12]

  let radius = 20

  if (
    visible(leftShoulder) &&
    visible(rightShoulder)
  ) {
    const shoulderDistance =
      Math.sqrt(
        Math.pow(
          (
            leftShoulder.x -
            rightShoulder.x
          ) * width,
          2
        ) +
        Math.pow(
          (
            leftShoulder.y -
            rightShoulder.y
          ) * height,
          2
        )
      )

    radius =
      Math.max(
        14,
        Math.min(
          35,
          shoulderDistance * 0.30
        )
      )
  }

  const center =
    pointXY(
      nose,
      width,
      height
    )

  ctx.beginPath()

  ctx.arc(
    center.x,
    center.y,
    radius,
    0,
    Math.PI * 2
  )

  ctx.stroke()
}

export function drawSafeNestSkeleton(
  ctx,
  landmarks,
  width,
  height
) {
  if (
    !ctx ||
    !landmarks ||
    width <= 0 ||
    height <= 0
  ) {
    return
  }

  ctx.save()

  /*
   * Reference-style skeleton.
   */
  ctx.strokeStyle =
    '#39ff88'

  ctx.fillStyle =
    '#39ff88'

  ctx.lineWidth = 4

  ctx.lineCap =
    'round'

  ctx.lineJoin =
    'round'

  /*
   * Body.
   */
  for (
    const [aIndex, bIndex]
    of CONNECTIONS
  ) {
    const a =
      landmarks[aIndex]

    const b =
      landmarks[bIndex]

    if (
      !visible(a) ||
      !visible(b)
    ) {
      continue
    }

    drawLine(
      ctx,
      a,
      b,
      width,
      height
    )
  }

  /*
   * Head.
   */
  drawHead(
    ctx,
    landmarks,
    width,
    height
  )

  /*
   * Joints.
   */
  for (
    const index of JOINTS
  ) {
    const point =
      landmarks[index]

    if (!visible(point)) {
      continue
    }

    drawCircle(
      ctx,
      point,
      width,
      height,
      5
    )
  }

  ctx.restore()
}