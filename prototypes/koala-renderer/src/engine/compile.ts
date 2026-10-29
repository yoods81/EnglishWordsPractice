// 레시피(3D 도형) → 2D 표시 목록. 도형 단위 깊이 정렬, 면 음영, 화풍(윤곽선·무늬) 적용.
import { depthOrder } from "./depth";
import type { DisplayList, DItem, Paint } from "./display";
import { project, projectEllipsoid, type V2, type V3 } from "./iso";
import { shapeBounds, type Material, type Recipe, type Shape } from "./recipe";

/** 화풍이 엔진에 제공하는 것 */
export interface Look {
  /** 색 참조 → hex */
  color(ref: string): string;
  /** 면 방향 계수(윗면 1에 가까움, 오른쪽 면 어두움) → 음영 색 */
  shade(hex: string, nx: number, ny: number, nz: number): string;
  /** 면 윤곽선: 없으면 null */
  outline(hex: string, mat?: Material): { color: string; width: number } | null;
  /** 타원체 칠하기 방식 */
  ellipsoid: "flat" | "grad" | "spot";
  /** 윗면 앞 모서리 밝은 선 */
  edgeLight: boolean;
  /** 나뭇결·천 무늬 선 */
  texture: boolean;
  lighten(hex: string, k: number): string;
  darken(hex: string, k: number): string;
}

const SEG = 36;

function pts2(p: V2[]): number[] {
  const out: number[] = [];
  for (const [x, y] of p) out.push(x, y);
  return out;
}
const pr = (p: V3): V2 => project(p[0], p[1], p[2]);

function face(look: Look, base: string, corners: V3[], n: V3, s: Shape, out: DItem[]) {
  const fill = look.shade(base, n[0], n[1], n[2]);
  const line = "noLine" in s && s.noLine ? null : look.outline(fill, "mat" in s ? s.mat : undefined);
  const a = "a" in s ? s.a : undefined;
  out.push({ k: "poly", pts: pts2(corners.map(pr)), fill, ...(line ? { stroke: line.color, sw: line.width } : {}), ...(a !== undefined ? { a } : {}) });
  if (look.texture && "mat" in s && s.mat && corners.length === 4) texture(look, fill, corners, s.mat, out);
}

function texture(look: Look, fill: string, c: V3[], mat: Material, out: DItem[]) {
  const P = c.map(pr);
  const len = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const e01 = len(P[0]!, P[1]!), e12 = len(P[1]!, P[2]!);
  if (Math.max(e01, e12) < 18 || Math.min(e01, e12) < 5) return;
  // 긴 변과 나란한 선
  const [A, B, C, D] = e01 >= e12 ? [c[0]!, c[1]!, c[2]!, c[3]!] : [c[1]!, c[2]!, c[3]!, c[0]!];
  const lerp = (p: V3, q: V3, t: number): V3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  const col = look.darken(fill, 0.18);
  if (mat === "wood") {
    for (const [t, s0, s1] of [[0.28, 0.08, 0.7], [0.55, 0.3, 0.95], [0.8, 0.05, 0.55]] as const) {
      const p = lerp(lerp(A, D, t), lerp(B, C, t), s0), q = lerp(lerp(A, D, t), lerp(B, C, t), s1);
      out.push({ k: "line", pts: pts2([pr(p), pr(q)]), stroke: col, sw: 0.7, a: 0.55 });
    }
  } else if (mat === "fabric" || mat === "knit") {
    const m: V3 = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2, (A[2] + C[2]) / 2];
    const q = [A, B, C, D].map((p) => pr(lerp(p, m, 0.16)));
    out.push({ k: "line", pts: pts2([...q, q[0]!]), stroke: col, sw: 0.6, a: 0.6, dash: [2, 2] });
  }
}

function emitBox(look: Look, s: Extract<Shape, { t: "box" }>, out: DItem[]) {
  const base = look.color(s.c);
  const { x0, y0, z0, x1, y1, z1 } = s;
  if (x1 > x0 && y1 > y0) face(look, base, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], s, out);
  if (x1 > x0 && z1 > z0) face(look, base, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], s, out);
  if (y1 > y0 && z1 > z0) face(look, base, [[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]], [1, 0, 0], s, out);
  if (look.edgeLight && x1 > x0 && y1 > y0 && z1 > z0 && !s.noLine) {
    const hl = look.lighten(look.shade(base, 0, 0, 1), 0.35);
    out.push({ k: "line", pts: pts2([pr([x0, y1, z1]), pr([x1, y1, z1]), pr([x1, y0, z1])]), stroke: hl, sw: 0.9, a: 0.85 });
  }
}

function ring(cx: number, cy: number, z: number, r: number, from: number, to: number, n: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    out.push(project(cx + r * Math.cos(t), cy + r * Math.sin(t), z));
  }
  return out;
}

function emitCyl(look: Look, s: Extract<Shape, { t: "cyl" }>, out: DItem[]) {
  const base = look.color(s.c);
  const a = s.a;
  if (s.z1 > s.z0) {
    // 앞쪽 반: 바깥 법선이 보는 방향(+x+y)을 향하는 각 -45°~135°
    const lo = ring(s.cx, s.cy, s.z0, s.r0, -Math.PI / 4, (3 * Math.PI) / 4, SEG / 2);
    const hi = ring(s.cx, s.cy, s.z1, s.r1, (3 * Math.PI) / 4, -Math.PI / 4, SEG / 2);
    const fill = look.shade(base, 0.62, 0.78, 0);
    const line = s.noLine ? null : look.outline(fill, s.mat);
    out.push({ k: "poly", pts: pts2([...lo, ...hi]), fill, ...(line ? { stroke: line.color, sw: line.width } : {}), ...(a !== undefined ? { a } : {}) });
    if (look.edgeLight && !s.noLine) {
      const hl = ring(s.cx, s.cy, s.z0 + (s.z1 - s.z0) * 0.5, (s.r0 + s.r1) / 2, Math.PI * 0.3, Math.PI * 0.55, 6);
      out.push({ k: "line", pts: pts2(hl), stroke: look.lighten(fill, 0.3), sw: 1, a: 0.5 });
    }
  }
  if (s.r1 > 0.001) {
    const topCol = s.top ? look.color(s.top) : base;
    const fill = look.shade(topCol, 0, 0, 1);
    const line = s.noLine ? null : look.outline(fill, s.mat);
    out.push({ k: "poly", pts: pts2(ring(s.cx, s.cy, s.z1, s.r1, 0, Math.PI * 2, SEG)), fill, ...(line ? { stroke: line.color, sw: line.width } : {}), ...(a !== undefined ? { a } : {}) });
  }
}

function emitEll(look: Look, s: Extract<Shape, { t: "ell" }>, out: DItem[]) {
  const base = look.color(s.c);
  const [cx, cy] = project(s.cx, s.cy, s.cz);
  const e = projectEllipsoid(s.rx, s.ry, s.rz, s.yaw ?? 0);
  const mid = look.shade(base, 0.35, 0.6, 0.72);
  const line = s.noLine ? null : look.outline(mid, s.mat);
  let fill: Paint = mid;
  if (look.ellipsoid === "grad") {
    const r = Math.max(e.a, e.b);
    fill = {
      type: "radial", cx: cx - r * 0.3, cy: cy - r * 0.38, r: r * 1.35,
      stops: [[0, look.lighten(look.shade(base, 0, 0, 1), 0.18)], [0.55, mid], [1, look.shade(base, 1, 0, 0)]],
    };
  }
  const a = s.a;
  out.push({ k: "ell", cx, cy, rx: e.a, ry: e.b, rot: e.rot, fill, ...(line ? { stroke: line.color, sw: line.width } : {}), ...(a !== undefined ? { a } : {}) });
  if (look.ellipsoid === "spot" && Math.min(e.a, e.b) > 2.5 && !s.noLine) {
    out.push({ k: "ell", cx: cx - e.a * 0.28, cy: cy - e.b * 0.34, rx: e.a * 0.36, ry: e.b * 0.26, rot: e.rot, fill: look.lighten(mid, 0.28), a: 0.75 });
  }
}

function emitDisc(look: Look, s: Extract<Shape, { t: "disc" }>, out: DItem[]) {
  const pts: V3[] = [];
  for (let i = 0; i < SEG; i++) {
    const t = (i / SEG) * Math.PI * 2, u = s.r * Math.cos(t), v = s.r * Math.sin(t);
    pts.push(s.plane === "z" ? [s.cx + u, s.cy + v, s.cz] : s.plane === "y" ? [s.cx + u, s.cy, s.cz + v] : [s.cx, s.cy + u, s.cz + v]);
  }
  const n: V3 = s.plane === "z" ? [0, 0, 1] : s.plane === "y" ? [0, 1, 0] : [1, 0, 0];
  face(look, look.color(s.c), pts, n, { ...s, mat: undefined } as Shape, out);
}

function emitPoly(look: Look, s: Extract<Shape, { t: "poly" }>, out: DItem[]) {
  const [p0, p1, p2] = s.pts as [V3, V3, V3];
  const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
  let n: V3 = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  n = [n[0] / l, n[1] / l, n[2] / l];
  if (n[0] + n[1] + n[2] < 0) n = [-n[0], -n[1], -n[2]];
  face(look, look.color(s.c), s.pts, [Math.max(0, n[0]), Math.max(0, n[1]), Math.max(0, n[2])], s, out);
}

export function emitShape(look: Look, s: Shape, out: DItem[]) {
  // 보는 사람(+x+y) 반대쪽을 향한 얼굴 부품은 가려진다
  if ("n" in s && s.n && s.n[0] + s.n[1] <= 0.05) return;
  switch (s.t) {
    case "box": return emitBox(look, s, out);
    case "cyl": return emitCyl(look, s, out);
    case "ell": return emitEll(look, s, out);
    case "disc": return emitDisc(look, s, out);
    case "poly": return emitPoly(look, s, out);
    case "line":
      out.push({ k: "line", pts: pts2(s.pts.map(pr)), stroke: look.color(s.c), sw: s.w, ...(s.a !== undefined ? { a: s.a } : {}) });
  }
}

/** 레시피 전체를 도형 단위 깊이 정렬 후 표시 목록으로 */
export function compile(recipe: Recipe, look: Look, sort = true): DisplayList {
  const order = sort ? depthOrder(recipe.map((s) => ({ box: shapeBounds(s) }))) : recipe.map((_, i) => i);
  const out: DItem[] = [];
  for (const i of order) emitShape(look, recipe[i]!, out);
  return out;
}
