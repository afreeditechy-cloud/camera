const CONFIG = {
  HISTORY_SIZE: 20,

  REQUIRED_STABLE_SAMPLES: 8,

  BACK_CONFIRMATION_FRAMES: 10,

  MAX_UNKNOWN_SAMPLES: 3,
}

const STATES = {
  UNKNOWN: 'UNKNOWN',

  FRONT: 'FRONT',

  BACK_CONFIRMING:
    'BACK_CONFIRMING',

  BACK_WARNING:
    'BACK_WARNING',

  MOVEMENT: 'MOVEMENT',
}

let history = []

let backFrames = 0

let movementFrames = 0

let warningStartTime = null

let currentState =
  STATES.UNKNOWN

function pushSample(
  orientation,
  confidence
) {
  history.push({
    orientation,
    confidence,
    time: Date.now(),
  })

  if (
    history.length >
    CONFIG.HISTORY_SIZE
  ) {
    history.shift()
  }
}

function getStableOrientation() {
  const samples =
    history.slice(
      -CONFIG.REQUIRED_STABLE_SAMPLES
    )

  if (
    samples.length <
    CONFIG.REQUIRED_STABLE_SAMPLES
  ) {
    return {
      orientation: 'UNKNOWN',
      confidence: 0,
    }
  }

  const front =
    samples.filter(
      (sample) =>
        sample.orientation ===
          'FRONT' &&
        sample.confidence >= 45
    )

  const back =
    samples.filter(
      (sample) =>
        sample.orientation ===
          'BACK' &&
        sample.confidence >= 45
    )

  const unknown =
    samples.filter(
      (sample) =>
        sample.orientation ===
        'UNKNOWN'
    )

  if (
    unknown.length >
    CONFIG.MAX_UNKNOWN_SAMPLES
  ) {
    return {
      orientation: 'UNKNOWN',
      confidence: 0,
    }
  }

  if (
    back.length >
      front.length &&
    back.length >= 5
  ) {
    const confidence =
      back.reduce(
        (sum, sample) =>
          sum +
          sample.confidence,
        0
      ) / back.length

    return {
      orientation: 'BACK',
      confidence:
        Math.round(
          confidence
        ),
    }
  }

  if (
    front.length >
      back.length &&
    front.length >= 5
  ) {
    const confidence =
      front.reduce(
        (sum, sample) =>
          sum +
          sample.confidence,
        0
      ) / front.length

    return {
      orientation: 'FRONT',
      confidence:
        Math.round(
          confidence
        ),
    }
  }

  return {
    orientation: 'UNKNOWN',
    confidence: 0,
  }
}

export function updateTemporalState({
  orientation,
  confidence,
  movement,
}) {
  pushSample(
    orientation,
    confidence
  )

  /*
   * Movement is temporary.
   */
  if (movement) {
    movementFrames += 1

    if (
      movementFrames <= 5
    ) {
      currentState =
        STATES.MOVEMENT

      return createResult()
    }
  } else {
    movementFrames = 0
  }

  const stable =
    getStableOrientation()

  /*
   * FRONT
   */
  if (
    stable.orientation ===
    'FRONT'
  ) {
    backFrames = 0

    warningStartTime =
      null

    currentState =
      STATES.FRONT

    return createResult(
      stable.confidence
    )
  }

  /*
   * BACK
   */
  if (
    stable.orientation ===
    'BACK'
  ) {
    backFrames += 1

    if (
      backFrames <
      CONFIG.BACK_CONFIRMATION_FRAMES
    ) {
      currentState =
        STATES.BACK_CONFIRMING

      return createResult(
        stable.confidence
      )
    }

    currentState =
      STATES.BACK_WARNING

    if (!warningStartTime) {
      warningStartTime =
        new Date().toISOString()
    }

    return createResult(
      stable.confidence
    )
  }

  /*
   * UNKNOWN
   */
  backFrames = 0

  warningStartTime =
    null

  currentState =
    STATES.UNKNOWN

  return createResult(0)
}

function createResult(
  confidence = 0
) {
  return {
    state:
      currentState,

    confidence,

    backFrames,

    backConfirmationProgress:
      Math.min(
        100,
        Math.round(
          (
            backFrames /
            CONFIG.BACK_CONFIRMATION_FRAMES
          ) * 100
        )
      ),

    warning:
      currentState ===
      STATES.BACK_WARNING,

    warningMessage:
      currentState ===
      STATES.BACK_WARNING
        ? 'Possible back-facing position detected. Please check the baby.'
        : null,

    warningStartTime,

    historyLength:
      history.length,
  }
}

export function resetTemporalEngine() {
  history = []

  backFrames = 0

  movementFrames = 0

  warningStartTime =
    null

  currentState =
    STATES.UNKNOWN
}

export {
  STATES,
}