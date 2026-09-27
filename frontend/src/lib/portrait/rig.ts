import Delaunator from "delaunator";
import type { Portrait } from "@/lib/character/types";
import {
  BROWS,
  CHEEK_LEFT,
  CHEEK_RIGHT,
  CHIN,
  EYE_CORNERS,
  EYES,
  FACE_OVAL,
  FOREHEAD,
  INNER_BROWS,
  INNER_LIPS,
  LOWER_INNER_CENTER,
  LOWER_INNER_LIP,
  MOUTH_CORNERS,
  OUTER_LIPS,
  UPPER_INNER_CENTER,
  UPPER_INNER_LIP,
} from "./landmarks";

type Vec = [number, number];

// Displacements in face-height units; the mouth interior shader relies on the same values.
export const JAW_DROP = 0.085;
export const LIP_LIFT = 0.012;
export const CAVITY_DEPTH = 0.14;

export interface Pose {
  open: number;
  wide: number;
  smile: number;
  lid: number;
  brow: number;
  browInner: number;
  roll: number;
  tx: number;
  ty: number;
  scale: number;
  breath: number;
}

export interface FaceRig {
  width: number;
  height: number;
  count: number;
  base: Float32Array;
  uv: Float32Array;
  index: Uint32Array;
  jaw: Float32Array;
  upperLip: Float32Array;
  cornerA: Float32Array;
  cornerB: Float32Array;
  blink: Float32Array;
  brow: Float32Array;
  browInner: Float32Array;
  head: Float32Array;
  torso: Float32Array;
  faceHeight: number;
  u: Vec;
  v: Vec;
  pivot: Vec;
  focus: Vec;
  mouthPolygon: Vec[];
  mouthQuad: { base: Float32Array; uv: Float32Array; depth: Float32Array; across: Float32Array };
}

const UPPER_OUTER_LIP = new Set([185, 40, 39, 37, 0, 267, 269, 270, 409]);
const LOWER_OUTER_LIP = new Set([146, 91, 181, 84, 17, 314, 405, 321, 375]);
const LIP_CORNERS = new Set([61, 291, 78, 308]);

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function interp(curve: Vec[], a: number) {
  if (a <= curve[0][0]) return curve[0][1];
  for (let k = 1; k < curve.length; k++) {
    if (a <= curve[k][0]) {
      const [a0, b0] = curve[k - 1];
      const [a1, b1] = curve[k];
      return a1 === a0 ? b1 : b0 + ((b1 - b0) * (a - a0)) / (a1 - a0);
    }
  }
  return curve[curve.length - 1][1];
}

function inside(p: Vec, poly: Vec[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const byA = (p: Vec, q: Vec) => p[0] - q[0];

export function buildRig(portrait: Portrait): FaceRig {
  const W = portrait.width;
  const H = portrait.height;
  const L: Vec[] = [];
  for (let i = 0; i < 468; i++) L.push([portrait.landmarks[2 * i], portrait.landmarks[2 * i + 1]]);

  // Face-aligned frame: origin at the mouth, u across the face, v down the face.
  const origin: Vec = [(L[UPPER_INNER_CENTER][0] + L[LOWER_INNER_CENTER][0]) / 2, (L[UPPER_INNER_CENTER][1] + L[LOWER_INNER_CENTER][1]) / 2];
  const ax = L[CHEEK_RIGHT][0] - L[CHEEK_LEFT][0];
  const ay = L[CHEEK_RIGHT][1] - L[CHEEK_LEFT][1];
  const an = Math.hypot(ax, ay) || 1;
  const u: Vec = [ax / an, ay / an];
  const v: Vec = [-u[1], u[0]];
  const toLocal = (p: Vec): Vec => {
    const dx = p[0] - origin[0];
    const dy = p[1] - origin[1];
    return [dx * u[0] + dy * u[1], dx * v[0] + dy * v[1]];
  };
  const toImage = (a: number, b: number): Vec => [origin[0] + a * u[0] + b * v[0], origin[1] + a * u[1] + b * v[1]];

  const F = Math.hypot(L[FOREHEAD][0] - L[CHIN][0], L[FOREHEAD][1] - L[CHIN][1]);
  const halfW = Math.abs(toLocal(L[CHEEK_RIGHT])[0] - toLocal(L[CHEEK_LEFT])[0]) / 2;
  const bChin = toLocal(L[CHIN])[1];

  // Dense landmarks on the face, a coarser grid elsewhere so the warp falls off smoothly.
  const points: Vec[] = L.slice();
  const border: boolean[] = new Array(L.length).fill(false);
  const oval = FACE_OVAL.map((i) => L[i]);
  const step = F / 6;
  const nx = Math.max(2, Math.ceil(W / step));
  const ny = Math.max(2, Math.ceil(H / step));
  const minGap2 = (step * 0.6) ** 2;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const p: Vec = [(W * i) / nx, (H * j) / ny];
      const edge = i === 0 || j === 0 || i === nx || j === ny;
      if (!edge && (inside(p, oval) || L.some((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < minGap2))) continue;
      points.push(p);
      border.push(edge);
    }
  }

  const count = points.length;
  const coords = new Float64Array(count * 2);
  points.forEach((p, i) => {
    coords[2 * i] = p[0];
    coords[2 * i + 1] = p[1];
  });
  const index = new Uint32Array(new Delaunator(coords).triangles);

  const base = new Float32Array(count * 2);
  const uv = new Float32Array(count * 2);
  points.forEach((p, i) => {
    base[2 * i] = p[0];
    base[2 * i + 1] = p[1];
    uv[2 * i] = p[0] / W;
    uv[2 * i + 1] = 1 - p[1] / H;
  });

  const outerLips = OUTER_LIPS.map((i) => L[i]);
  const upperInner = UPPER_INNER_LIP.map((i) => toLocal(L[i])).sort(byA);
  const lowerInner = LOWER_INNER_LIP.map((i) => toLocal(L[i])).sort(byA);
  const midline = (a: number) => (interp(upperInner, a) + interp(lowerInner, a)) / 2;
  const corners = MOUTH_CORNERS.map((i) => toLocal(L[i])).sort(byA);
  const cornerHalf = Math.max(Math.abs(corners[0][0]), Math.abs(corners[1][0]));

  const eyes = EYES.map((e) => {
    const outer = toLocal(L[e.outer]);
    const inner = toLocal(L[e.inner]);
    return {
      upper: [outer, ...e.upper.map((i) => toLocal(L[i])), inner].sort(byA),
      lower: [outer, ...e.lower.map((i) => toLocal(L[i])), inner].sort(byA),
      brow: e.brow.map((i) => toLocal(L[i])).sort(byA),
      aMin: Math.min(outer[0], inner[0]),
      aMax: Math.max(outer[0], inner[0]),
    };
  });
  const brows = BROWS.map((i) => toLocal(L[i]));
  const innerBrows = INNER_BROWS.map((i) => toLocal(L[i]));
  const bEyes = EYE_CORNERS.reduce((s, i) => s + toLocal(L[i])[1], 0) / EYE_CORNERS.length;
  const headCenter = bEyes - 0.12 * F;
  const ra = halfW * 1.35;
  const rb = F * 0.95;

  const jaw = new Float32Array(count);
  const upperLip = new Float32Array(count);
  const cornerA = new Float32Array(count);
  const cornerB = new Float32Array(count);
  const blink = new Float32Array(count);
  const brow = new Float32Array(count);
  const browInner = new Float32Array(count);
  const head = new Float32Array(count);
  const torso = new Float32Array(count);

  const nearest = (a: number, b: number, set: Vec[]) =>
    Math.min(...set.map((q) => Math.hypot(a - q[0], b - q[1])));

  for (let i = 0; i < count; i++) {
    if (border[i]) continue;
    const [a, b] = toLocal(points[i]);

    if (LOWER_OUTER_LIP.has(i)) jaw[i] = 1;
    else if (UPPER_OUTER_LIP.has(i)) upperLip[i] = 1;
    else if (LIP_CORNERS.has(i)) jaw[i] = 0.5;
    else if (i < 468 && inside(points[i], outerLips)) {
      const cb = smoothstep(0.7, 1, Math.abs(a) / cornerHalf);
      if (b > midline(a)) jaw[i] = 1 - 0.5 * cb;
      else {
        upperLip[i] = 1 - cb;
        jaw[i] = 0.25 * cb;
      }
    } else {
      let wy = smoothstep(-0.02 * F, 0.06 * F, b);
      if (b > bChin) wy *= 1 - smoothstep(bChin, bChin + 0.3 * F, b);
      jaw[i] = wy * (1 - smoothstep(0.5 * halfW, 1.05 * halfW, Math.abs(a)));
      if (b < 0) {
        upperLip[i] =
          0.6 * (1 - smoothstep(0, 0.1 * F, -b)) * (1 - smoothstep(0.35 * halfW, 0.6 * halfW, Math.abs(a)));
      }
    }

    cornerA[i] = Math.exp(-((Math.hypot(a - corners[0][0], b - corners[0][1]) / (0.1 * F)) ** 2));
    cornerB[i] = Math.exp(-((Math.hypot(a - corners[1][0], b - corners[1][1]) / (0.1 * F)) ** 2));

    // Blink: skin between brow and upper lid slides down; the eye itself compresses toward the lower lid.
    for (const eye of eyes) {
      const ew = eye.aMax - eye.aMin;
      if (a < eye.aMin - 0.3 * ew || a > eye.aMax + 0.3 * ew) continue;
      const aa = Math.min(eye.aMax, Math.max(eye.aMin, a));
      const up = interp(eye.upper, aa);
      const low = interp(eye.lower, aa);
      const gap = Math.max(0, low - up);
      const browLine = interp(eye.brow, aa);
      const taper = a < eye.aMin || a > eye.aMax ? 1 - Math.abs(a - aa) / (0.3 * ew) : 1;
      let value = 0;
      if (b >= up && b <= low) value = low - b;
      else if (b < up && b > browLine) value = gap * ((b - browLine) / (up - browLine)) ** 1.5 * taper;
      blink[i] = Math.max(blink[i], value);
    }

    brow[i] = Math.exp(-((nearest(a, b, brows) / (0.08 * F)) ** 2));
    browInner[i] = Math.exp(-((nearest(a, b, innerBrows) / (0.06 * F)) ** 2));

    const d = Math.hypot(a / ra, (b - headCenter) / rb);
    head[i] = (1 - smoothstep(1, 1.5, d)) * (1 - smoothstep(bChin + 0.05 * F, bChin + 0.45 * F, b));
    torso[i] = smoothstep(bChin + 0.2 * F, bChin + 0.7 * F, b) * (1 - head[i]);
  }

  const innerLocal = INNER_LIPS.map((i) => toLocal(L[i]));
  const aMin = Math.min(...innerLocal.map((p) => p[0]));
  const aMax = Math.max(...innerLocal.map((p) => p[0]));
  const bTop = Math.min(...innerLocal.map((p) => p[1]));
  const bBot = Math.max(...innerLocal.map((p) => p[1]));
  const mw = aMax - aMin;
  const quadLocal: Vec[] = [
    [aMin - 0.15 * mw, bTop - 0.03 * F],
    [aMax + 0.15 * mw, bTop - 0.03 * F],
    [aMax + 0.15 * mw, bBot + 0.16 * F],
    [aMin - 0.15 * mw, bBot + 0.16 * F],
  ];
  const bLower = toLocal(L[LOWER_INNER_CENTER])[1];
  const mouthQuad = {
    base: new Float32Array(8),
    uv: new Float32Array(8),
    depth: new Float32Array(4),
    across: new Float32Array([0, 1, 1, 0]),
  };
  quadLocal.forEach(([a, b], k) => {
    const [x, y] = toImage(a, b);
    mouthQuad.base[2 * k] = x;
    mouthQuad.base[2 * k + 1] = y;
    mouthQuad.uv[2 * k] = x / W;
    mouthQuad.uv[2 * k + 1] = 1 - y / H;
    mouthQuad.depth[k] = (b - bLower) / (CAVITY_DEPTH * F);
  });

  const eyeMid = EYE_CORNERS.reduce<Vec>((s, i) => [s[0] + L[i][0] / 4, s[1] + L[i][1] / 4], [0, 0]);

  return {
    width: W,
    height: H,
    count,
    base,
    uv,
    index,
    jaw,
    upperLip,
    cornerA,
    cornerB,
    blink,
    brow,
    browInner,
    head,
    torso,
    faceHeight: F,
    u,
    v,
    pivot: toImage(0, bChin + 0.3 * F),
    focus: eyeMid,
    mouthPolygon: INNER_LIPS.map((i) => L[i]),
    mouthQuad,
  };
}

export function deform(rig: FaceRig, pose: Pose, face: Float32Array, mouth: Float32Array) {
  const { faceHeight: F, u, v, pivot } = rig;
  const jawK = JAW_DROP * F * pose.open;
  const lipLift = LIP_LIFT * F * pose.open;
  const wideK = 0.028 * F * pose.wide;
  const smileK = 0.02 * F * pose.smile;
  const blinkK = 0.92 * pose.lid;
  const browK = 0.03 * F * pose.brow;
  const innerK = 0.025 * F * pose.browInner;
  const cos = Math.cos(pose.roll);
  const sin = Math.sin(pose.roll);
  const s = 1 + pose.scale;
  const hx = (pose.tx * u[0] + pose.ty * v[0]) * F;
  const hy = (pose.tx * u[1] + pose.ty * v[1]) * F;
  const breath = pose.breath * 0.004 * F;

  const moveHead = (x: number, y: number, weight: number): Vec => {
    const rx = x - pivot[0];
    const ry = y - pivot[1];
    const x2 = pivot[0] + s * (cos * rx - sin * ry) + hx;
    const y2 = pivot[1] + s * (sin * rx + cos * ry) + hy;
    return [x + (x2 - x) * weight, y + (y2 - y) * weight];
  };

  for (let i = 0; i < rig.count; i++) {
    const cA = rig.cornerA[i];
    const cB = rig.cornerB[i];
    const da = (cB - cA) * wideK;
    const db =
      rig.jaw[i] * jawK -
      rig.upperLip[i] * lipLift +
      rig.blink[i] * blinkK -
      rig.brow[i] * browK -
      rig.browInner[i] * innerK -
      (cA + cB) * smileK;
    let x = rig.base[2 * i] + da * u[0] + db * v[0];
    let y = rig.base[2 * i + 1] + da * u[1] + db * v[1];
    const h = rig.head[i];
    if (h > 0) [x, y] = moveHead(x, y, h);
    const lift = (rig.torso[i] + h) * breath;
    face[3 * i] = x - v[0] * lift;
    face[3 * i + 1] = -(y - v[1] * lift);
    face[3 * i + 2] = 0;
  }

  for (let k = 0; k < 4; k++) {
    const [x, y] = moveHead(rig.mouthQuad.base[2 * k] - lipLift * v[0], rig.mouthQuad.base[2 * k + 1] - lipLift * v[1], 1);
    mouth[3 * k] = x - v[0] * breath;
    mouth[3 * k + 1] = -(y - v[1] * breath);
    mouth[3 * k + 2] = 0;
  }
}

// Visible window into the photo for a given viewport aspect, framed like a video call.
export function frameView(rig: FaceRig, aspect: number, margin = 0.025) {
  const W = rig.width;
  const H = rig.height;
  const h = Math.min(rig.faceHeight * 2.5, H * (1 - 2 * margin), (W * (1 - 2 * margin)) / aspect);
  const w = h * aspect;
  const x = Math.min(Math.max(rig.focus[0] - w / 2, W * margin), W * (1 - margin) - w);
  const y = Math.min(Math.max(rig.focus[1] - h * 0.4, H * margin), H * (1 - margin) - h);
  return { x, y, w, h };
}

export function drawMouthMask(rig: FaceRig) {
  const canvas = document.createElement("canvas");
  canvas.width = rig.width;
  canvas.height = rig.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.filter = "blur(0.7px)";
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  rig.mouthPolygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
  return canvas;
}
