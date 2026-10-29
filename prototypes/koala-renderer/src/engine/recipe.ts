// 레시피 = 3D 기본 도형 목록(순수 데이터). 좌표는 아이템 로컬(발자국 뒤쪽 모서리가 원점).
import type { AABB, V3 } from "./iso";

/** 색 참조: 팔레트 이름(예 "mint") 또는 "#rrggbb" */
export type ColorRef = string;
export type Material = "paint" | "wood" | "fabric" | "knit" | "metal" | "ceramic" | "plant" | "paper" | "fur" | "glass" | "card" | "dark";

interface Base {
  c: ColorRef;
  mat?: Material;
  /** 0~1 불투명도 */
  a?: number;
  /** 윤곽선을 그리지 않음(눈, 작은 무늬 등) */
  noLine?: boolean;
  /** 이 방향(수평)을 향한 면에만 붙은 부품(얼굴 등): 보는 사람 반대쪽이면 그리지 않는다 */
  n?: [number, number];
}

/** 축 정렬 상자 */
export interface BoxShape extends Base { t: "box"; x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }
/** 세운 원뿔대(원기둥): 바닥 반지름 r0, 위 반지름 r1 */
export interface CylShape extends Base { t: "cyl"; cx: number; cy: number; z0: number; z1: number; r0: number; r1: number; top?: ColorRef }
/** 축 정렬 타원체 */
export interface EllShape extends Base { t: "ell"; cx: number; cy: number; cz: number; rx: number; ry: number; rz: number; /** z축 회전(라디안). 있으면 rx가 이 방향 */ yaw?: number }
/** 축 평면 위의 원(벽시계, 둥근 깔개) */
export interface DiscShape extends Base { t: "disc"; plane: "x" | "y" | "z"; cx: number; cy: number; cz: number; r: number }
/** 평면 3D 다각형 */
export interface PolyShape extends Base { t: "poly"; pts: V3[] }
/** 3D 선 */
export interface LineShape { t: "line"; pts: V3[]; c: ColorRef; w: number; a?: number; n?: [number, number] }

export type Shape = BoxShape | CylShape | EllShape | DiscShape | PolyShape | LineShape;
export type Recipe = Shape[];

export type Rot = 0 | 1 | 2 | 3;

/** 발자국 w×d 안에서 회전. rot 0 = 앞면이 +y, 1 = +x, 2 = -y, 3 = -x */
export function rotPoint(x: number, y: number, w: number, d: number, rot: Rot): [number, number] {
  switch (rot) {
    case 0: return [x, y];
    case 1: return [y, w - x];
    case 2: return [w - x, d - y];
    case 3: return [d - y, x];
  }
}

export function rotSize(w: number, d: number, rot: Rot): [number, number] {
  return rot % 2 === 0 ? [w, d] : [d, w];
}

const rp = (p: V3, w: number, d: number, rot: Rot): V3 => {
  const [x, y] = rotPoint(p[0], p[1], w, d, rot);
  return [x, y, p[2]];
};

/** 수평 방향 벡터 회전(rotPoint와 같은 회전) */
export function rotDir(x: number, y: number, rot: Rot): [number, number] {
  switch (rot) {
    case 0: return [x, y];
    case 1: return [y, -x];
    case 2: return [-x, -y];
    case 3: return [-y, x];
  }
}

export function rotateShape(s: Shape, w: number, d: number, rot: Rot): Shape {
  if (rot === 0) return s;
  if ("n" in s && s.n) s = { ...s, n: rotDir(s.n[0], s.n[1], rot) };
  switch (s.t) {
    case "box": {
      const [ax, ay] = rotPoint(s.x0, s.y0, w, d, rot);
      const [bx, by] = rotPoint(s.x1, s.y1, w, d, rot);
      return { ...s, x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: Math.min(ay, by), y1: Math.max(ay, by) };
    }
    case "cyl": {
      const [cx, cy] = rotPoint(s.cx, s.cy, w, d, rot);
      return { ...s, cx, cy };
    }
    case "ell": {
      const [cx, cy] = rotPoint(s.cx, s.cy, w, d, rot);
      if (s.yaw !== undefined) return { ...s, cx, cy, yaw: s.yaw - (rot * Math.PI) / 2 };
      return rot % 2 ? { ...s, cx, cy, rx: s.ry, ry: s.rx } : { ...s, cx, cy };
    }
    case "disc": {
      const [cx, cy] = rotPoint(s.cx, s.cy, w, d, rot);
      const plane = s.plane === "z" || rot % 2 === 0 ? s.plane : s.plane === "x" ? "y" : "x";
      return { ...s, cx, cy, plane };
    }
    case "poly": return { ...s, pts: s.pts.map((p) => rp(p, w, d, rot)) };
    case "line": return { ...s, pts: s.pts.map((p) => rp(p, w, d, rot)) };
  }
}

export function translateShape(s: Shape, dx: number, dy: number, dz: number): Shape {
  const tp = (p: V3): V3 => [p[0] + dx, p[1] + dy, p[2] + dz];
  switch (s.t) {
    case "box": return { ...s, x0: s.x0 + dx, x1: s.x1 + dx, y0: s.y0 + dy, y1: s.y1 + dy, z0: s.z0 + dz, z1: s.z1 + dz };
    case "cyl": return { ...s, cx: s.cx + dx, cy: s.cy + dy, z0: s.z0 + dz, z1: s.z1 + dz };
    case "ell": return { ...s, cx: s.cx + dx, cy: s.cy + dy, cz: s.cz + dz };
    case "disc": return { ...s, cx: s.cx + dx, cy: s.cy + dy, cz: s.cz + dz };
    case "poly": return { ...s, pts: s.pts.map(tp) };
    case "line": return { ...s, pts: s.pts.map(tp) };
  }
}

export function shapeBounds(s: Shape): AABB {
  switch (s.t) {
    case "box": return { x0: s.x0, y0: s.y0, z0: s.z0, x1: s.x1, y1: s.y1, z1: s.z1 };
    case "cyl": {
      const r = Math.max(s.r0, s.r1);
      return { x0: s.cx - r, x1: s.cx + r, y0: s.cy - r, y1: s.cy + r, z0: s.z0, z1: s.z1 };
    }
    case "ell": {
      const c = Math.cos(s.yaw ?? 0), n = Math.sin(s.yaw ?? 0);
      const hx = Math.hypot(s.rx * c, s.ry * n), hy = Math.hypot(s.rx * n, s.ry * c);
      return { x0: s.cx - hx, x1: s.cx + hx, y0: s.cy - hy, y1: s.cy + hy, z0: s.cz - s.rz, z1: s.cz + s.rz };
    }
    case "disc": {
      const r = s.r;
      return {
        x0: s.plane === "x" ? s.cx : s.cx - r, x1: s.plane === "x" ? s.cx : s.cx + r,
        y0: s.plane === "y" ? s.cy : s.cy - r, y1: s.plane === "y" ? s.cy : s.cy + r,
        z0: s.plane === "z" ? s.cz : s.cz - r, z1: s.plane === "z" ? s.cz : s.cz + r,
      };
    }
    case "poly":
    case "line": {
      const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
      for (const [x, y, z] of s.pts) {
        b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x);
        b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y);
        b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z);
      }
      return b;
    }
  }
}

export function recipeBounds(r: Recipe): AABB | null {
  let b: AABB | null = null;
  for (const s of r) {
    const sb = shapeBounds(s);
    b = b ? {
      x0: Math.min(b.x0, sb.x0), y0: Math.min(b.y0, sb.y0), z0: Math.min(b.z0, sb.z0),
      x1: Math.max(b.x1, sb.x1), y1: Math.max(b.y1, sb.y1), z1: Math.max(b.z1, sb.z1),
    } : sb;
  }
  return b;
}

/** 모든 도형이 상자 안에 있는가 — 벗어난 도형 목록을 돌려준다 */
export function outside(r: Recipe, box: AABB, eps = 1e-6): Shape[] {
  return r.filter((s) => {
    const b = shapeBounds(s);
    return b.x0 < box.x0 - eps || b.y0 < box.y0 - eps || b.z0 < box.z0 - eps ||
      b.x1 > box.x1 + eps || b.y1 > box.y1 + eps || b.z1 > box.z1 + eps;
  });
}
