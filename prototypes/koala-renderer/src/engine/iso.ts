// 등각 투영 — 모든 그림의 유일한 기준. 상수와 투영 공식은 이 파일에만 둔다.
// 월드 단위 1 = 타일 한 칸. x: 화면 오른쪽 아래, y: 왼쪽 아래, z: 위.

export const TW = 64; // 타일 폭(px)
export const TH = 32; // 타일 높이(px)
export const ZH = 36; // 높이 1단위당 px

export type V3 = readonly [number, number, number];
export type V2 = [number, number];

export interface AABB {
  x0: number; y0: number; z0: number;
  x1: number; y1: number; z1: number;
}

export function project(x: number, y: number, z: number): V2 {
  return [(x - y) * (TW / 2), (x + y) * (TH / 2) - z * ZH];
}

export const projectV = (p: V3): V2 => project(p[0], p[1], p[2]);

/** 화면 좌표 → 높이 z 평면 위의 월드 (x, y) */
export function unprojectAtZ(sx: number, sy: number, z = 0): [number, number] {
  const a = sx / (TW / 2);
  const b = (sy + z * ZH) / (TH / 2);
  return [(a + b) / 2, (b - a) / 2];
}

/** 반 칸(0.5) 격자에 맞춘다. */
export const snapHalf = (v: number): number => Math.round(v * 2) / 2;

export function aabbCorners(b: AABB): V3[] {
  const out: V3[] = [];
  for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) out.push([x, y, z]);
  return out;
}

/** 경계 상자의 화면 사각 범위 */
export function screenRect(b: AABB): { x0: number; y0: number; x1: number; y1: number } {
  // x-y 최소: (x0,y1), 최대: (x1,y0). 화면 y 최소: (x0,y0,z1), 최대: (x1,y1,z0)
  return {
    x0: (b.x0 - b.y1) * (TW / 2),
    x1: (b.x1 - b.y0) * (TW / 2),
    y0: (b.x0 + b.y0) * (TH / 2) - b.z1 * ZH,
    y1: (b.x1 + b.y1) * (TH / 2) - b.z0 * ZH,
  };
}

/** 경계 상자 투영의 볼록 외곽(육각형) — 그림이 이 안에 있어야 한다. */
export function aabbHull(b: AABB): V2[] {
  const p = (x: number, y: number, z: number) => project(x, y, z);
  return [
    p(b.x0, b.y0, b.z1), p(b.x1, b.y0, b.z1), p(b.x1, b.y0, b.z0),
    p(b.x1, b.y1, b.z0), p(b.x0, b.y1, b.z0), p(b.x0, b.y1, b.z1),
  ];
}

/** 타원체(축 정렬)를 투영한 타원: 중심, 반지름 두 개, 회전 각 */
export function projectEllipsoid(rx: number, ry: number, rz: number, yaw = 0): { a: number; b: number; rot: number } {
  // Σ = M R D² Rᵀ Mᵀ, M = [[TW/2, -TW/2, 0], [TH/2, TH/2, -ZH]], R = z축 회전(yaw)
  const hx = TW / 2, hy = TH / 2;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // 월드 공분산(수평 2×2)
  const wxx = rx * rx * c * c + ry * ry * s * s, wyy = rx * rx * s * s + ry * ry * c * c, wxy = (rx * rx - ry * ry) * c * s;
  const sxx = hx * hx * (wxx + wyy - 2 * wxy);
  const sxy = hx * hy * (wxx - wyy);
  const syy = hy * hy * (wxx + wyy + 2 * wxy) + ZH * ZH * rz * rz;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  const rot = Math.abs(sxy) < 1e-9 ? (sxx >= syy ? 0 : Math.PI / 2) : Math.atan2(l1 - sxx, sxy);
  return { a: Math.sqrt(l1), b: Math.sqrt(Math.max(0, l2)), rot };
}

export function aabbUnion(a: AABB, b: AABB): AABB {
  return {
    x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), z0: Math.min(a.z0, b.z0),
    x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), z1: Math.max(a.z1, b.z1),
  };
}

export function aabbTranslate(b: AABB, dx: number, dy: number, dz: number): AABB {
  return { x0: b.x0 + dx, y0: b.y0 + dy, z0: b.z0 + dz, x1: b.x1 + dx, y1: b.y1 + dy, z1: b.z1 + dz };
}

const EPS = 1e-6;

/** 3D로 겹치는가(맞닿음은 겹침 아님) */
export function aabbIntersect(a: AABB, b: AABB): boolean {
  return a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS &&
    a.y0 < b.y1 - EPS && b.y0 < a.y1 - EPS &&
    a.z0 < b.z1 - EPS && b.z0 < a.z1 - EPS;
}

/** a가 b보다 뒤(먼저 그려야 함)인지: 분리 축이 있고 a가 뒤쪽 */
export function behind(a: AABB, b: AABB): boolean {
  return a.x1 <= b.x0 + EPS || a.y1 <= b.y0 + EPS || a.z1 <= b.z0 + EPS;
}
