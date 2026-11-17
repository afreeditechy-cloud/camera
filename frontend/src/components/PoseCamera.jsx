import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  createPoseLandmarker,
} from '../services/poseService'

import {
  analyzePosition,
  resetPositionEngine,
} from '../logic/positionEngine'

import {
  drawSafeNestSkeleton,
} from '../logic/skeletonRenderer'

import {
  startSiren,
  stopSiren,
  unlockSirenAudio,
} from '../services/sirenService'

function PoseCamera() {
  const videoRef =
    useRef(null)

  const canvasRef =
    useRef(null)

  const streamRef =
    useRef(null)

  const animationFrameRef =
    useRef(null)

  const lastFrameTimeRef =
    useRef(0)

  const frameCounterRef =
    useRef(0)

  const fpsTimerRef =
    useRef(0)

  const mountedRef =
    useRef(false)

  const [cameraReady, setCameraReady] =
    useState(false)

  const [poseReady, setPoseReady] =
    useState(false)

  const [poseDetected, setPoseDetected] =
    useState(false)

  const [fps, setFps] =
    useState(0)

  const [error, setError] =
    useState('')

  const [sirenEnabled, setSirenEnabled] =
    useState(false)

  const [positionData, setPositionData] =
    useState({
      position: 'UNKNOWN',
      orientation: 'UNKNOWN',
      confidence: 0,
      movement: false,
      movementScore: 0,
      metrics: {},
    })

  const [temporalData, setTemporalData] =
    useState({
      state: 'UNKNOWN',
      backFrames: 0,
      backConfirmationProgress: 0,
      warning: false,
      warningMessage: null,
    })

  useEffect(() => {
    mountedRef.current = true

    async function startCamera() {
      try {
        setError('')

        if (
          !navigator.mediaDevices?.getUserMedia
        ) {
          throw new Error(
            'Camera access is not supported by this browser.'
          )
        }

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              width: {
                ideal: 1280,
              },

              height: {
                ideal: 720,
              },

              facingMode: 'user',
            },

            audio: false,
          })

        if (!mountedRef.current) {
          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            )

          return
        }

        streamRef.current =
          stream

        const video =
          videoRef.current

        if (!video) {
          throw new Error(
            'Camera video element was not found.'
          )
        }

        video.srcObject =
          stream

        video.onloadedmetadata =
          async () => {
            try {
              await video.play()

              if (
                !mountedRef.current
              ) {
                return
              }

              setCameraReady(true)

              await startPoseDetection()
            } catch (playError) {
              console.error(
                '[SafeNest] Video playback error:',
                playError
              )

              setError(
                'Unable to start camera playback.'
              )
            }
          }
      } catch (cameraError) {
        console.error(
          '[SafeNest] Camera error:',
          cameraError
        )

        if (
          !mountedRef.current
        ) {
          return
        }

        if (
          cameraError?.name ===
          'NotAllowedError'
        ) {
          setError(
            'Camera permission was denied. Please allow camera access.'
          )
        } else if (
          cameraError?.name ===
          'NotFoundError'
        ) {
          setError(
            'No camera was found on this device.'
          )
        } else if (
          cameraError?.name ===
          'NotReadableError'
        ) {
          setError(
            'The camera is already being used by another application.'
          )
        } else {
          setError(
            cameraError?.message ||
              'Unable to access the camera.'
          )
        }
      }
    }

    async function startPoseDetection() {
      try {
        const landmarker =
          await createPoseLandmarker()

        if (
          !mountedRef.current
        ) {
          return
        }

        setPoseReady(true)

        runPoseDetection(
          landmarker
        )
      } catch (poseError) {
        console.error(
          '[SafeNest] Pose initialization error:',
          poseError
        )

        if (
          !mountedRef.current
        ) {
          return
        }

        setError(
          poseError?.message ||
            'Unable to initialize MediaPipe Pose.'
        )
      }
    }

    function runPoseDetection(
      landmarker
    ) {
      if (
        !mountedRef.current
      ) {
        return
      }

      const video =
        videoRef.current

      const canvas =
        canvasRef.current

      if (!video || !canvas) {
        return
      }

      if (
        video.readyState < 2
      ) {
        animationFrameRef.current =
          requestAnimationFrame(
            () =>
              runPoseDetection(
                landmarker
              )
          )

        return
      }

      const now =
        performance.now()

      lastFrameTimeRef.current =
        now

      const width =
        video.videoWidth

      const height =
        video.videoHeight

      if (
        width > 0 &&
        height > 0 &&
        (
          canvas.width !== width ||
          canvas.height !== height
        )
      ) {
        canvas.width = width
        canvas.height = height
      }

      const ctx =
        canvas.getContext('2d')

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      )

      try {
        const result =
          landmarker.detectForVideo(
            video,
            now
          )

        frameCounterRef.current += 1

        if (
          fpsTimerRef.current === 0
        ) {
          fpsTimerRef.current =
            now
        }

        const elapsed =
          now -
          fpsTimerRef.current

        if (
          elapsed >= 1000
        ) {
          const calculatedFps =
            (
              frameCounterRef.current /
              elapsed
            ) * 1000

          setFps(
            Math.round(
              calculatedFps
            )
          )

          frameCounterRef.current =
            0

          fpsTimerRef.current =
            now
        }

        if (
          !result.landmarks ||
          result.landmarks.length === 0
        ) {
          setPoseDetected(false)

          setPositionData({
            position: 'UNKNOWN',
            orientation: 'UNKNOWN',
            confidence: 0,
            movement: false,
            movementScore: 0,
            metrics: {},
          })

          setTemporalData({
            state: 'UNKNOWN',
            backFrames: 0,
            backConfirmationProgress: 0,
            warning: false,
            warningMessage: null,
          })

          stopSiren()
        } else {
          const landmarks =
            result.landmarks[0]

          setPoseDetected(true)

          drawSafeNestSkeleton(
            ctx,
            landmarks,
            canvas.width,
            canvas.height
          )

          const analysis =
            analyzePosition(
              landmarks
            )

          setPositionData(
            analysis
          )

          if (
            analysis.temporal
          ) {
            setTemporalData(
              analysis.temporal
            )

            if (
              analysis.temporal?.warning
            ) {
              if (
                sirenEnabled
              ) {
                startSiren()
              }
            } else {
              stopSiren()
            }
          }
        }
      } catch (detectionError) {
        console.error(
          '[SafeNest] Pose detection error:',
          detectionError
        )
      }

      animationFrameRef.current =
        requestAnimationFrame(
          () =>
            runPoseDetection(
              landmarker
            )
        )
    }

    startCamera()

    return () => {
      mountedRef.current =
        false

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        )

        animationFrameRef.current =
          null
      }

      resetPositionEngine()

      stopSiren()

      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          )

        streamRef.current =
          null
      }

      if (
        videoRef.current
      ) {
        videoRef.current.srcObject =
          null
      }
    }
  }, [sirenEnabled])

  function enableSiren() {
    const success =
      unlockSirenAudio()

    if (success) {
      setSirenEnabled(true)
    }
  }

  const currentState =
    temporalData.state

  const isBack =
    currentState ===
      'BACK_WARNING' ||
    currentState ===
      'BACK_CONFIRMING'

  return (
    <main className="safenest-page">
      <header className="safenest-header">
        <div>
          <div className="brand-row">
            <span className="brand-dot" />

            <h1>SAFENEST</h1>
          </div>

          <p className="page-subtitle">
            Infant Orientation AI
            Research Dashboard
          </p>
        </div>

        <div className="header-status">
          <span
            className={
              cameraReady
                ? 'status-dot online'
                : 'status-dot'
            }
          />

          {cameraReady
            ? 'CAMERA ONLINE'
            : 'CAMERA OFFLINE'}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <strong>
            SYSTEM ERROR
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      <section className="dashboard-grid">
        <div className="camera-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">
                LIVE CAMERA
              </span>

              <h2>
                Infant Pose Tracking
              </h2>
            </div>

            <div className="live-indicator">
              <span className="live-dot" />

              LIVE
            </div>
          </div>

          <div className="camera-container">
            <video
              ref={videoRef}
              className="camera-video"
              autoPlay
              playsInline
              muted
            />

            <canvas
              ref={canvasRef}
              className="pose-canvas"
            />

            {!cameraReady && (
              <div className="camera-loading">
                <div className="loading-spinner" />

                <span>
                  Initializing camera...
                </span>
              </div>
            )}

            {temporalData.warning && (
              <div className="camera-alert">
                <strong>
                  BACK ORIENTATION
                </strong>

                <span>
                  Please check the baby.
                </span>
              </div>
            )}
          </div>

          <div className="camera-footer">
            <div>
              <span>AI ENGINE</span>

              <strong
                className={
                  poseReady
                    ? 'success-text'
                    : ''
                }
              >
                {poseReady
                  ? 'POSE READY'
                  : 'INITIALIZING'}
              </strong>
            </div>

            <div>
              <span>POSE</span>

              <strong>
                {poseDetected
                  ? 'DETECTED'
                  : 'NOT DETECTED'}
              </strong>
            </div>

            <div>
              <span>FPS</span>

              <strong>
                {fps}
              </strong>
            </div>
          </div>
        </div>

        <aside className="analysis-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">
                AI ANALYSIS
              </span>

              <h2>
                Baby Orientation
              </h2>
            </div>
          </div>

          <div
            className={
              `position-display ${
                isBack
                  ? 'back'
                  : ''
              }`
            }
          >
            <span className="position-label">
              CURRENT ORIENTATION
            </span>

            <div className="position-value">
              {currentState}
            </div>

            <div className="confidence-row">
              <span>
                AI Confidence
              </span>

              <strong>
                {positionData.confidence}%
              </strong>
            </div>

            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{
                  width:
                    `${Math.min(
                      100,
                      Math.max(
                        0,
                        positionData.confidence
                      )
                    )}%`,
                }}
              />
            </div>
          </div>

          <div className="analysis-card">
            <div className="analysis-card-header">
              <span>
                ORIENTATION
              </span>

              <span className="indicator-normal" />
            </div>

            <div className="analysis-value">
              {positionData.orientation}
            </div>

            <div className="analysis-detail">
              FRONT = facing camera
              <br />
              BACK = facing away
            </div>
          </div>

          <div className="analysis-card">
            <div className="analysis-card-header">
              <span>
                MOVEMENT
              </span>

              <span
                className={
                  positionData.movement
                    ? 'indicator-warning'
                    : 'indicator-normal'
                }
              />
            </div>

            <div className="analysis-value">
              {positionData.movement
                ? 'DETECTED'
                : 'STABLE'}
            </div>

            <div className="analysis-detail">
              Movement score:{' '}

              <strong>
                {
                  positionData
                    .movementScore
                }
              </strong>
            </div>
          </div>

          <div className="temporal-card">
            <div className="debug-title">
              BACK CONFIRMATION
            </div>

            <div className="temporal-state">
              {currentState}
            </div>

            {currentState ===
              'BACK_CONFIRMING' && (
              <>
                <div className="temporal-label">
                  Checking sustained
                  orientation...
                </div>

                <div className="temporal-progress">
                  <div
                    className="temporal-progress-fill"
                    style={{
                      width:
                        `${temporalData.backConfirmationProgress}%`,
                    }}
                  />
                </div>

                <div className="temporal-detail">
                  Confirmation:{' '}
                  {
                    temporalData
                      .backConfirmationProgress
                  }%
                </div>
              </>
            )}

            {temporalData.warning && (
              <div className="warning-message">
                <strong>
                  ALERT
                </strong>

                <span>
                  {
                    temporalData
                      .warningMessage
                  }
                </span>
              </div>
            )}
          </div>

          <div className="analysis-card">
            <div className="analysis-card-header">
              <span>
                SOFTWARE ALERT
              </span>

              <span
                className={
                  sirenEnabled
                    ? 'indicator-normal'
                    : 'indicator-warning'
                }
              />
            </div>

            <div className="analysis-value">
              {sirenEnabled
                ? 'ENABLED'
                : 'DISABLED'}
            </div>

            <button
              type="button"
              className="siren-button"
              onClick={
                enableSiren
              }
            >
              {sirenEnabled
                ? 'ALERT SIREN ENABLED'
                : 'ENABLE ALERT SIREN'}
            </button>

            <div className="analysis-detail">
              Software prototype.
              Hardware version will
              use vibration.
            </div>
          </div>

          <div className="debug-panel">
            <div className="debug-title">
              ORIENTATION ANALYSIS
            </div>

            <div className="debug-grid">
              <div>
                <span>
                  Body visibility
                </span>

                <strong>
                  {
                    positionData
                      .metrics
                      ?.bodyVisibility ??
                    '--'
                  }
                </strong>
              </div>

              <div>
                <span>
                  Nose visibility
                </span>

                <strong>
                  {
                    positionData
                      .metrics
                      ?.noseVisibility ??
                    '--'
                  }
                </strong>
              </div>

              <div>
                <span>
                  Eye visibility
                </span>

                <strong>
                  {
                    positionData
                      .metrics
                      ?.eyeVisibility ??
                    '--'
                  }
                </strong>
              </div>

              <div>
                <span>
                  Ear visibility
                </span>

                <strong>
                  {
                    positionData
                      .metrics
                      ?.earVisibility ??
                    '--'
                  }
                </strong>
              </div>

              <div>
                <span>
                  Front score
                </span>

                <strong>
                  {
                    positionData
                      .metrics
                      ?.frontScore ??
                    '--'
                  }
                </strong>
              </div>

              <div>
                <span>
                  Back score
                </span>

                <strong>
                  {
                    positionData
                      .metrics
                      ?.backScore ??
                    '--'
                  }
                </strong>
              </div>

              <div>
                <span>
                  Score difference
                </span>

                <strong>
                  {
                    positionData
                      .metrics
                      ?.scoreDifference ??
                    '--'
                  }
                </strong>
              </div>

              <div>
                <span>
                  Nose detected
                </span>

                <strong>
                  {
                    positionData
                      .metrics
                      ?.noseDetected
                    ? 'YES'
                    : 'NO'
                  }
                </strong>
              </div>
            </div>
          </div>

          <div className="research-notice">
            <span>
              RESEARCH MODE
            </span>

            <p>
              Orientation detection is
              experimental. It must be
              validated using infant
              recordings before any
              real-world safety use.
            </p>
          </div>
        </aside>
      </section>
    </main>
  )
}

export default PoseCamera