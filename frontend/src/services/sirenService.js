let audioContext = null

let sirenTimer = null

let sirenActive = false

export function unlockSirenAudio() {
  try {
    if (!audioContext) {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext

      if (!AudioContext) {
        return false
      }

      audioContext =
        new AudioContext()
    }

    if (
      audioContext.state ===
      'suspended'
    ) {
      audioContext.resume()
    }

    return true
  } catch (error) {
    console.error(
      '[SafeNest] Audio initialization failed:',
      error
    )

    return false
  }
}

function playTone(
  frequency,
  duration,
  startTime
) {
  if (!audioContext) {
    return
  }

  const oscillator =
    audioContext.createOscillator()

  const gain =
    audioContext.createGain()

  oscillator.type =
    'square'

  oscillator.frequency.setValueAtTime(
    frequency,
    startTime
  )

  gain.gain.setValueAtTime(
    0.0001,
    startTime
  )

  gain.gain.exponentialRampToValueAtTime(
    0.18,
    startTime + 0.03
  )

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + duration
  )

  oscillator.connect(gain)

  gain.connect(
    audioContext.destination
  )

  oscillator.start(startTime)

  oscillator.stop(
    startTime + duration
  )
}

function playSirenCycle() {
  if (
    !audioContext ||
    !sirenActive
  ) {
    return
  }

  const now =
    audioContext.currentTime

  playTone(
    700,
    0.20,
    now
  )

  playTone(
    1000,
    0.20,
    now + 0.23
  )

  playTone(
    700,
    0.20,
    now + 0.46
  )

  playTone(
    1000,
    0.20,
    now + 0.69
  )
}

export function startSiren() {
  if (
    !unlockSirenAudio()
  ) {
    return
  }

  if (sirenActive) {
    return
  }

  sirenActive = true

  playSirenCycle()

  sirenTimer =
    window.setInterval(
      playSirenCycle,
      1300
    )
}

export function stopSiren() {
  sirenActive = false

  if (sirenTimer) {
    window.clearInterval(
      sirenTimer
    )

    sirenTimer = null
  }
}

export function isSirenActive() {
  return sirenActive
}