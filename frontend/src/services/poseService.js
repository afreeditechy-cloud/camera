import {
  FilesetResolver,
  PoseLandmarker,
} from '@mediapipe/tasks-vision'

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'

const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task'
let poseLandmarker = null

export async function createPoseLandmarker() {
  if (poseLandmarker) {
    return poseLandmarker
  }

  const vision = await FilesetResolver.forVisionTasks(WASM_PATH)

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate: 'GPU',
    },

    runningMode: 'VIDEO',

    numPoses: 1,

    minPoseDetectionConfidence: 0.5,

    minPosePresenceConfidence: 0.5,

    minTrackingConfidence: 0.5,
  })

  return poseLandmarker
}

export function getPoseLandmarker() {
  return poseLandmarker
}