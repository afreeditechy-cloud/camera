import {
  classifyOrientation,
} from './orientationClassifier'

import {
  calculateMovement,
} from './movementDetector'

import {
  updateTemporalState,
  resetTemporalEngine,
} from './temporalEngine'

let previousLandmarks = null

export function analyzePosition(
  landmarks
) {
  const orientation =
    classifyOrientation(
      landmarks
    )

  const movement =
    calculateMovement(
      landmarks,
      previousLandmarks
    )

  previousLandmarks =
    landmarks

  const temporal =
    updateTemporalState({
      orientation:
        orientation.orientation,

      confidence:
        orientation.confidence,

      movement:
        movement.moving,
    })

  return {
    position:
      temporal.state,

    orientation:
      orientation.orientation,

    confidence:
      temporal.confidence,

    movement:
      movement.moving,

    movementScore:
      movement.movementScore,

    metrics:
      orientation.metrics,

    temporal,
  }
}

export function resetPositionEngine() {
  previousLandmarks = null

  resetTemporalEngine()
}