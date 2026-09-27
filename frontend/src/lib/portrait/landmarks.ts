// Indices into the 468-point MediaPipe face mesh.

export const FOREHEAD = 10;
export const CHIN = 152;
export const CHEEK_LEFT = 234;
export const CHEEK_RIGHT = 454;
export const UPPER_INNER_CENTER = 13;
export const LOWER_INNER_CENTER = 14;
export const MOUTH_CORNERS = [61, 291] as const;
export const EYE_CORNERS = [33, 133, 263, 362] as const;

export const OUTER_LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
export const INNER_LIPS = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
export const UPPER_INNER_LIP = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
export const LOWER_INNER_LIP = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];

export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

export interface EyeIndices {
  outer: number;
  inner: number;
  upper: number[];
  lower: number[];
  brow: number[];
}

export const EYES: EyeIndices[] = [
  { outer: 33, inner: 133, upper: [246, 161, 160, 159, 158, 157, 173], lower: [7, 163, 144, 145, 153, 154, 155], brow: [70, 63, 105, 66, 107] },
  { outer: 263, inner: 362, upper: [466, 388, 387, 386, 385, 384, 398], lower: [249, 390, 373, 374, 380, 381, 382], brow: [300, 293, 334, 296, 336] },
];

export const BROWS = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
export const INNER_BROWS = [107, 66, 55, 65, 336, 296, 285, 295];
