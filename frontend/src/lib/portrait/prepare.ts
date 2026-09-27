import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { Portrait } from "@/lib/character/types";

// Keep the wasm version in sync with the installed @mediapipe/tasks-vision package.
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const MAX_EDGE = 1400;

export type PortraitErrorCode = "model" | "no-face" | "too-small" | "image";

export class PortraitError extends Error {
  constructor(public code: PortraitErrorCode) {
    super(code);
  }
}

let landmarker: Promise<FaceLandmarker> | null = null;

// MediaPipe's wasm binds console.error when it loads and prints routine "INFO: ..." lines through it,
// which the Next.js dev overlay reports as errors. Loading behind a filter drops only those lines.
async function withoutInfoLogs<T>(run: () => Promise<T>) {
  const consoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("INFO:")) return;
    consoleError(...args);
  };
  try {
    return await run();
  } finally {
    console.error = consoleError;
  }
}

function loadLandmarker() {
  landmarker ??= withoutInfoLogs(async () => {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 1,
    });
  }).catch((e) => {
    landmarker = null;
    throw e;
  });
  return landmarker;
}

// Runs entirely in the browser: the photo itself is never uploaded anywhere.
export async function preparePortrait(file: File): Promise<Portrait> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PortraitError("image");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let detector: FaceLandmarker;
  try {
    detector = await loadLandmarker();
  } catch {
    throw new PortraitError("model");
  }
  const face = detector.detect(canvas).faceLandmarks[0];
  if (!face) throw new PortraitError("no-face");

  const landmarks = face.slice(0, 468).flatMap((p) => [Math.round(p.x * width * 10) / 10, Math.round(p.y * height * 10) / 10]);
  const faceHeight = Math.hypot(landmarks[20] - landmarks[304], landmarks[21] - landmarks[305]);
  if (faceHeight < 120) throw new PortraitError("too-small");

  return { src: canvas.toDataURL("image/jpeg", 0.9), width, height, landmarks };
}
