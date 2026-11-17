const MOVEMENT_THRESHOLD = 0.018

const TRACKED_LANDMARKS = [
  0,  // nose
  11, // left shoulder
  12, // right shoulder
  23, // left hip
  24, // right hip
  25, // left knee
  26, // right knee
]

export function calculateMovement(
  currentLandmarks,
  previousLandmarks
) {
  if (
    !currentLandmarks ||
    !previousLandmarks
  ) {
    return {
      moving: false,
      movementScore: 0,
    }
  }

  let totalMovement = 0
  let validPoints = 0

  for (const index of TRACKED_LANDMARKS) {
    const current = currentLandmarks[index]
    const previous = previousLandmarks[index]

    if (!current || !previous) {
      continue
    }

    const dx = current.x - previous.x
    const dy = current.y - previous.y

    const movement = Math.sqrt(
      dx * dx + dy * dy
    )

    totalMovement += movement
    validPoints++
  }

  if (validPoints === 0) {
    return {
      moving: false,
      movementScore: 0,
    }
  }

  const movementScore =
    totalMovement / validPoints

  return {
    moving:
      movementScore >= MOVEMENT_THRESHOLD,

    movementScore: Number(
      movementScore.toFixed(4)
    ),
  }
}