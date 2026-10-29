// 코알라 리그: 디자인 × 자세 × 방향(yaw). 부품은 몸 방향을 따라 도는 타원체이고,
// 얼굴 부품은 머리 표면에 납작하게 붙어 보는 사람 반대쪽이면 그리지 않는다(방향별 얼굴 부품 규칙).
// 기준점: 앉기 = 엉덩이 중심(좌석 기준점), 서기·걷기 = 두 발 사이 바닥.
import type { Recipe, Shape } from "../engine/recipe";

export type Pose = "stand" | "sit" | "walk";
export type DesignId = "plush" | "forest" | "explorer" | "cuddle" | "climber" | "joey";

export interface KoalaDesign {
  id: DesignId;
  name: string;
  desc: string;
  head: number;           // 머리 반지름
  headZ: { stand: number; sit: number };
  body: [number, number, number]; // 앞뒤, 좌우, 위아래 반지름
  ear: [number, number, number];  // 두께(앞뒤), 폭, 높이
  earOut: number;         // 귀가 머리 옆으로 나간 정도
  tufts: boolean;         // 귀 가장자리 흰 털
  limb: number;           // 팔다리 길이 배율
  nose: [number, number]; // 폭, 높이
  shine: boolean;         // 눈 반짝임
  fur: string; furDark: string; fluff: string;
  scarf?: string; pack?: string;
  /** 관절 팔다리(D~F): 어깨→팔꿈치→손목, 엉덩이→무릎→발목을 잇는 구슬 사슬 */
  rig?: Rig;
}

export interface Rig {
  hip: number;            // 서 있을 때 엉덩이 높이(다리 길이)
  arm: number; leg: number; // 팔·다리 길이 배율
  armT: number; legT: number; // 팔·다리 굵기(윗부분 반지름)
  hug?: boolean;          // 팔을 앞으로 모은 자세(나무 껴안는 코알라)
  claws?: boolean;        // 앞발 발톱
  chest?: string;         // 가슴 털 색(없으면 fluff)
}

export const DESIGNS: Record<DesignId, KoalaDesign> = {
  plush: {
    id: "plush", name: "통통 인형", desc: "큰 머리, 크고 둥근 귀, 큰 코. 귀여움을 가장 강조",
    head: 0.47, headZ: { stand: 1.2, sit: 1.05 }, body: [0.33, 0.37, 0.4], ear: [0.12, 0.25, 0.24], earOut: 0.44, tufts: false,
    limb: 1, nose: [0.12, 0.17], shine: true, fur: "fur", furDark: "furDark", fluff: "fluff",
  },
  forest: {
    id: "forest", name: "숲속 친구", desc: "실제 코알라에 가까운 비례, 귀 가장자리 흰 털, 긴 팔다리",
    head: 0.4, headZ: { stand: 1.32, sit: 1.12 }, body: [0.36, 0.4, 0.48], ear: [0.11, 0.21, 0.2], earOut: 0.4, tufts: true,
    limb: 1.2, nose: [0.1, 0.19], shine: false, fur: "#9b9aa3", furDark: "#7d7b86", fluff: "#efece6",
  },
  explorer: {
    id: "explorer", name: "꼬마 탐험가", desc: "통통 인형 비례에 목도리와 작은 배낭. 집과 집 사이를 오가는 주인공",
    head: 0.45, headZ: { stand: 1.2, sit: 1.05 }, body: [0.33, 0.37, 0.4], ear: [0.12, 0.23, 0.23], earOut: 0.43, tufts: false,
    limb: 1, nose: [0.12, 0.16], shine: true, fur: "fur", furDark: "furDark", fluff: "fluff", scarf: "coral", pack: "mustard",
  },
  cuddle: {
    id: "cuddle", name: "포근 코알라", desc: "통통 인형 비례에 관절 팔다리. 팔꿈치가 굽어 앞발이 배 앞에 모이고, 짧고 굵은 다리에 발이 앞으로",
    head: 0.44, headZ: { stand: 1.2, sit: 1.08 }, body: [0.34, 0.38, 0.42], ear: [0.12, 0.24, 0.23], earOut: 0.42, tufts: true,
    limb: 1, nose: [0.11, 0.19], shine: true, fur: "fur", furDark: "furDark", fluff: "fluff",
    rig: { hip: 0.3, arm: 1, leg: 1, armT: 0.1, legT: 0.14 },
  },
  climber: {
    id: "climber", name: "나무타기 친구", desc: "실제 코알라처럼 긴 팔과 큰 앞발(두 갈래 엄지·발톱), 앞으로 모은 팔, 흰 가슴털",
    head: 0.41, headZ: { stand: 1.34, sit: 1.14 }, body: [0.37, 0.4, 0.48], ear: [0.11, 0.22, 0.21], earOut: 0.4, tufts: true,
    limb: 1.15, nose: [0.1, 0.21], shine: false, fur: "#9b9aa3", furDark: "#7d7b86", fluff: "#efece6",
    rig: { hip: 0.3, arm: 1.25, leg: 1.05, armT: 0.11, legT: 0.15, hug: true, claws: true, chest: "#f4f1ea" },
  },
  joey: {
    id: "joey", name: "아기 코알라", desc: "큰 머리와 짧고 통통한 관절 팔다리. 걸을 때 팔이 크게 흔들리는 아장아장 걸음",
    head: 0.5, headZ: { stand: 1.04, sit: 1.0 }, body: [0.32, 0.35, 0.36], ear: [0.13, 0.27, 0.26], earOut: 0.46, tufts: false,
    limb: 0.85, nose: [0.12, 0.15], shine: true, fur: "#b4b4bd", furDark: "#94949f", fluff: "fluff",
    rig: { hip: 0.22, arm: 0.82, leg: 0.8, armT: 0.1, legT: 0.13 },
  },
};
export let DEFAULT_DESIGN: DesignId = "plush";
/** 게임 전체에서 쓸 코알라 디자인(시안 선택 전에는 통통 인형) */
export function setKoalaDesign(d: DesignId) { DEFAULT_DESIGN = d; }

/** 보는 사람 방향(월드 수평): +x +y 사이 */
const VIEW = Math.PI / 4;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export type Role = "body" | "head" | "limb" | "ear" | "decal" | "acc";
export interface Part { shape: Shape; role: Role; parent?: number; /** 같은 번호끼리는 한 덩어리로 그린다(관절 팔다리) */ grp?: number }

export interface KoalaOpts { pose?: Pose; yaw?: number; design?: DesignId; phase?: number; viewYaw?: number }

/**
 * 부품 목록(테스트용 정보 포함). yaw = 몸이 바라보는 방향(월드 수평 각, 0 = +x, π/2 = +y).
 * viewYaw = 이 레시피 좌표계에서 본 보는 사람 방향(가구 회전 안에서 그릴 때 다름).
 */
export function koalaParts(o: KoalaOpts = {}): Part[] {
  const pose = o.pose ?? "sit", yaw = o.yaw ?? Math.PI / 2, D = DESIGNS[o.design ?? DEFAULT_DESIGN], ph = o.phase ?? 0.25;
  const view = o.viewYaw ?? VIEW;
  const F: [number, number] = [Math.cos(yaw), Math.sin(yaw)], S: [number, number] = [-F[1], F[0]];
  // 머리는 보는 사람 쪽으로 최대 30° 돌린다(뒤를 볼 때는 돌리지 않음)
  const diff = wrap(view - yaw);
  const turn = Math.abs(diff) < (100 * Math.PI) / 180 ? Math.max(-0.52, Math.min(0.52, diff)) : 0;
  const hy = yaw + turn, HF: [number, number] = [Math.cos(hy), Math.sin(hy)], HS: [number, number] = [-HF[1], HF[0]];
  const parts: Part[] = [];
  const P = (f: number, s: number, z: number, fr: [number, number] = F, sr: [number, number] = S): [number, number, number] =>
    [fr[0] * f + sr[0] * s, fr[1] * f + sr[1] * s, z];
  const E = (c: [number, number, number], r: [number, number, number], col: string, role: Role, extra: Partial<Shape> = {}, parent?: number, y = yaw): number => {
    parts.push({ shape: { t: "ell", cx: c[0], cy: c[1], cz: c[2], rx: r[0], ry: r[1], rz: r[2], yaw: y, c: col, ...(role === "decal" ? { noLine: true } : { mat: "fur" }), ...extra } as Shape, role, ...(parent !== undefined ? { parent } : {}) });
    return parts.length - 1;
  };
  const L = D.limb, swing = pose === "walk" ? Math.sin(ph * Math.PI * 2) : 0, bob = pose === "walk" ? Math.abs(Math.cos(ph * Math.PI * 2)) * 0.03 : 0;
  const [bf, bs, bz] = D.body;

  let body: number;
  if (D.rig) {
    body = rigLimbs(D, D.rig, pose, swing, bob, { E, P, parts, F });
  } else if (pose === "sit") {
    body = E(P(-0.02, 0, 0.44), [bf, bs, bz + 0.02], D.fur, "body");
    for (const side of [-1, 1]) {
      const th = E(P(0.2 * L, side * 0.19, 0.12), [0.24 * L, 0.13, 0.12], D.fur, "limb", {}, body);
      E(P(0.42 * L, side * 0.19, 0.14), [0.06, 0.09, 0.1], D.furDark, "limb", {}, th);
    }
    E(P(0.2, 0, 0.42), [0.12, bs * 0.68, bz * 0.72], D.fluff, "decal", { n: [F[0], F[1]] }, body);
    for (const side of [-1, 1]) E(P(0.18, side * 0.3, 0.45), [0.2 * L, 0.11, 0.11], D.fur, "limb", {}, body);
  } else {
    const hip = 0.32 * L + bob;
    for (const side of [-1, 1]) {
      const fwd = side * swing * 0.14 * L, lift = pose === "walk" ? Math.max(0, side * swing) * 0.06 : 0;
      const leg = E(P(fwd, side * 0.16, hip * 0.5 + lift), [0.13, 0.12, hip * 0.55], D.fur, "limb");
      E(P(fwd + 0.07, side * 0.16, 0.05 + lift), [0.14, 0.1, 0.06], D.furDark, "limb", {}, leg);
    }
    body = E(P(0, 0, hip + bz * 0.9), [bf, bs, bz], D.fur, "body");
    E(P(bf * 0.62, 0, hip + bz * 0.85), [0.12, bs * 0.66, bz * 0.7], D.fluff, "decal", { n: [F[0], F[1]] }, body);
    for (const side of [-1, 1]) {
      const fwd = -side * swing * 0.12 * L;
      E(P(0.06 + fwd, side * (bs + 0.02), hip + bz * 1.05 - 0.1 * L), [0.11, 0.1, 0.22 * L], D.fur, "limb", {}, body);
    }
  }
  if (D.pack) {
    const z = pose === "sit" ? 0.52 : 0.32 * L + bz * 1.0;
    E(P(-bf - 0.06, 0, z), [0.1, 0.24, 0.22], D.pack, "acc", { mat: "fabric" } as Partial<Shape>, body);
  }

  // 머리
  const hz = (pose === "sit" ? D.headZ.sit : D.headZ.stand) + bob + (pose === "walk" ? 0 : 0);
  const R = D.head;
  if (D.scarf) {
    E(P(0.02, 0, hz - R * 0.86), [bf * 0.95, bs * 0.92, 0.08], D.scarf, "acc", { mat: "knit" } as Partial<Shape>, body);
    E(P(bf * 0.55, bs * 0.35, hz - R * 1.15), [0.06, 0.07, 0.16], D.scarf, "acc", { mat: "knit" } as Partial<Shape>, body);
  }
  const Hc = (f: number, s: number, z: number) => { const p = P(f, s, z, HF, HS); return [p[0], p[1], hz + p[2]] as [number, number, number]; };
  const head = E(Hc(0.02, 0, 0), [R, R * 1.02, R * 0.92], D.fur, "head", {}, body, hy);
  for (const side of [-1, 1]) {
    // 귀: 머리 위쪽 옆, 조금 뒤 — 옆모습에서도 머리 윤곽 위로 솟아 보이게
    const ear = E(Hc(-0.1, side * D.earOut, R * 0.74), D.ear, D.fur, "ear", {}, head, hy);
    // 귀 안쪽: 앞을 향한 면에만
    E(Hc(D.ear[0] * 0.55 - 0.1, side * D.earOut, R * 0.72), [0.035, D.ear[1] * 0.62, D.ear[2] * 0.62], D.fluff, "decal", { n: [HF[0], HF[1]] }, ear, hy);
    if (D.tufts) for (const k of [-1, 0, 1]) E(Hc(-0.06, side * (D.earOut + D.ear[1] * 0.8), R * 0.74 + k * 0.11), [0.05, 0.06, 0.06], D.fluff, "ear", { noLine: true }, ear, hy);
  }
  // 얼굴: 머리 표면 위(반지름 0.93R)에 납작하게. 법선 = 머리 중심에서 바깥으로
  const onHead = (af: number, as: number, az: number) => {
    const n = Math.hypot(af, as, az);
    const k = (R * 0.93) / n;
    return { pos: Hc(0.02 + af * k, as * k, az * k), nrm: [HF[0] * af + HS[0] * as, HF[1] * af + HS[1] * as] as [number, number] };
  };
  const face = (af: number, as: number, az: number, r: [number, number, number], col: string, extra: Partial<Shape> = {}) => {
    const { pos, nrm } = onHead(af, as, az);
    const ny = Math.atan2(nrm[1], nrm[0]);
    E(pos, r, col, "decal", { n: nrm, ...extra }, head, ny);
  };
  for (const side of [-1, 1]) {
    face(0.82, side * 0.4, 0.16, [0.02, 0.045, 0.06], "eye");
    if (D.shine) face(0.8, side * 0.38 - 0.06, 0.24, [0.012, 0.016, 0.018], "white");
    face(0.65, side * 0.62, -0.22, [0.02, 0.07, 0.045], "cheek", { a: 0.8 } as Partial<Shape>);
  }
  face(0.97, 0, -0.08, [D.nose[0] * 0.8, D.nose[0], D.nose[1]], "nose", { noLine: false } as Partial<Shape>);
  face(0.9, -0.05, 0.02, [0.012, 0.022, 0.035], "white", { a: 0.7 } as Partial<Shape>);
  face(0.86, 0, -0.42, [0.015, 0.05, 0.015], "eye");
  return order(parts, view);
}

type V = [number, number, number];
interface RigCtx {
  E: (c: V, r: V, col: string, role: Role, extra?: Partial<Shape>, parent?: number, y?: number) => number;
  P: (f: number, s: number, z: number) => V;
  parts: Part[];
  F: [number, number];
}
let grpSeq = 0;

/**
 * 관절 팔다리 + 몸통. 반환값 = 몸통 부품 번호.
 * 팔다리는 관절점(몸 기준 앞 f, 옆 s, 높이 z)을 잇는 구슬 사슬: 윤곽선 있는 구슬을 먼저,
 * 같은 구슬을 선 없이 한 번 더 덮어 겹친 자리의 안쪽 선을 지운다 → 하나로 이어진 팔다리.
 */
function rigLimbs(D: KoalaDesign, R: Rig, pose: Pose, swing: number, bob: number, c: RigCtx): number {
  const { E, P, parts, F } = c;
  const [bf, bs, bz] = D.body;
  const tube = (pts: V[], radii: number[], col: string, parent: number): number => {
    const g = ++grpSeq;
    const beads: [V, number][] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!, b = pts[i + 1]!, len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const n = Math.max(1, Math.ceil(len / (Math.min(radii[i]!, radii[i + 1]!) * 0.7)));
      for (let k = i === 0 ? 0 : 1; k <= n; k++) {
        const t = k / n;
        beads.push([[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], radii[i]! + (radii[i + 1]! - radii[i]!) * t]);
      }
    }
    let prev = parent;
    const ids: number[] = [];
    for (const [q, r] of beads) { prev = E(P(...q), [r, r, r], col, "limb", {}, prev); parts[prev]!.grp = g; ids.push(prev); }
    beads.forEach(([q, r], i) => { const k = E(P(...q), [r, r, r], col, "limb", { noLine: true }, ids[i]); parts[k]!.grp = g; });
    return prev;
  };
  const sub = (end: number, q: V, r: V, col: string, extra: Partial<Shape> = {}) => {
    const k = E(P(...q), r, col, "limb", extra, end); parts[k]!.grp = parts[end]!.grp; return k;
  };
  const paw = (end: number, at: V, side: number) => {
    // 앞발: 손바닥 + 두 갈래(엄지 둘 · 손가락 셋 묶음), 발톱
    const t = R.armT;
    const palm = sub(end, at, [t * 0.95, t * 0.9, t * 0.85], D.furDark);
    sub(end, [at[0] + 0.04, at[1] + side * t * 0.55, at[2] - t * 0.35], [t * 0.5, t * 0.45, t * 0.45], D.furDark);
    sub(end, [at[0] + 0.05, at[1] - side * t * 0.35, at[2] - t * 0.4], [t * 0.55, t * 0.5, t * 0.45], D.furDark);
    if (R.claws) for (const o of [-0.5, 0, 0.6]) sub(palm, [at[0] + 0.07, at[1] + side * o * t, at[2] - t * 0.82], [0.014, 0.014, 0.03], "nose", { noLine: true });
  };
  const A = R.arm, Lg = R.leg, chest = R.chest ?? D.fluff;
  let body: number;
  if (pose === "sit") {
    body = E(P(-0.02, 0, bz + 0.04), [bf, bs, bz + 0.02], D.fur, "body");
    // 다리: 엉덩이에서 앞으로 뻗고 무릎이 살짝 섬, 발바닥이 앞을 봄
    for (const side of [-1, 1]) {
      const hip: V = [0.04, side * 0.2, 0.16], knee: V = [0.26 * Lg, side * 0.25, 0.2], ank: V = [0.42 * Lg, side * 0.23, 0.11];
      const end = tube([hip, knee, ank], [R.legT, R.legT * 0.85, R.legT * 0.7], D.fur, body);
      const t = R.legT;
      sub(end, [0.47 * Lg, side * 0.23, 0.15], [t * 0.45, t * 0.75, t * 0.95], D.furDark);
    }
    E(P(bf * 0.6, 0, bz + 0.02), [0.12, bs * 0.66, bz * 0.72], chest, "decal", { n: [F[0], F[1]] }, body);
    // 팔: 어깨에서 내려와 팔꿈치가 굽고 앞발이 무릎 위에
    for (const side of [-1, 1]) {
      const sh: V = [0.04, side * (bs - 0.06), bz * 1.45], el: V = [0.12, side * (bs + 0.03), bz * 1.45 - 0.22 * A], wr: V = [0.3, side * bs * 0.45, 0.3];
      const end = tube([sh, el, wr], [R.armT, R.armT * 0.9, R.armT * 0.8], D.fur, body);
      paw(end, [wr[0] + 0.04, wr[1], wr[2] - 0.02], side);
    }
    return body;
  }
  const hipZ = R.hip + bob;
  body = E(P(0, 0, hipZ + bz * 0.9), [bf, bs, bz], D.fur, "body");
  for (const side of [-1, 1]) {
    // 다리: 앞뒤로 흔들고, 앞으로 나간 다리는 발이 살짝 들림
    const fwd = side * swing * 0.13 * Lg, lift = pose === "walk" ? Math.max(0, side * swing) * 0.06 : 0;
    const hip: V = [-0.02, side * 0.17, hipZ + 0.06], knee: V = [0.05 + fwd * 0.6, side * 0.18, hipZ * 0.5 + lift], ank: V = [fwd, side * 0.17, R.legT * 0.6 + lift];
    const end = tube([hip, knee, ank], [R.legT, R.legT * 0.85, R.legT * 0.7], D.fur, body);
    sub(end, [fwd + 0.07, side * 0.17, 0.05 + lift], [R.legT * 1.05, R.legT * 0.8, R.legT * 0.5], D.furDark);
  }
  E(P(bf * 0.62, 0, hipZ + bz * 0.85), [0.12, bs * 0.66, bz * 0.7], chest, "decal", { n: [F[0], F[1]] }, body);
  for (const side of [-1, 1]) {
    // 팔: 걸을 때 다리와 반대로 흔듦. hug = 앞발이 가슴 앞에 모임
    const fwd = -side * swing * 0.12 * A;
    const shZ = hipZ + bz * 1.45;
    const sh: V = [0.04, side * (bs - 0.06), shZ];
    const el: V = R.hug ? [0.2 + fwd * 0.5, side * (bs + 0.04), shZ - 0.2 * A] : [0.06 + fwd * 0.6, side * (bs + 0.04), shZ - 0.2 * A];
    const wr: V = R.hug ? [bf + 0.06 + fwd * 0.3, side * bs * 0.4, shZ - 0.26 * A] : [0.18 + fwd, side * bs * 0.62, shZ - 0.4 * A];
    const end = tube([sh, el, wr], [R.armT, R.armT * 0.9, R.armT * 0.8], D.fur, body);
    paw(end, [wr[0] + 0.03, wr[1], wr[2] - 0.03], side);
  }
  return body;
}

/** 그리는 순서: 보는 사람에게서 먼 것부터. 붙은 장식(얼굴 등)은 부모 바로 뒤 */
function order(parts: Part[], view: number): Part[] {
  const vx = Math.cos(view), vy = Math.sin(view);
  const depth = (s: Shape) => (s.t === "ell" ? s.cx * vx + s.cy * vy + s.cz * 0.15 : 0);
  const grpDepth = new Map<number, number[]>();
  parts.forEach((p) => { if (p.grp !== undefined) { const a = grpDepth.get(p.grp) ?? []; a.push(depth(p.shape)); grpDepth.set(p.grp, a); } });
  const grpKey = new Map([...grpDepth].map(([g, a]) => [g, a.reduce((x, y) => x + y, 0) / a.length]));
  const key = parts.map((p, i) => {
    // 관절 팔다리: 한 덩어리의 평균 깊이, 안에서는 만든 순서대로(윤곽 구슬 → 덮는 구슬 → 앞발)
    if (p.grp !== undefined) return grpKey.get(p.grp)! + i * 1e-6;
    if (p.role === "decal" && p.parent !== undefined) return depth(parts[p.parent]!.shape) + 0.5 + depth(p.shape) * 0.01 + i * 1e-6;
    if (p.role === "head") return depth(p.shape) + 0.3;
    if (p.role === "ear" && p.parent !== undefined) return depth(parts[p.parent]!.shape) + 0.3 + (depth(p.shape) - depth(parts[p.parent]!.shape)) * 2;
    if (p.role === "acc") return depth(p.shape) - (p.shape.t === "ell" && p.shape.cz > 0.9 ? -0.25 : 0);
    return depth(p.shape);
  });
  const idx = parts.map((_, i) => i).sort((a, b) => key[a]! - key[b]!);
  const remap = new Map(idx.map((old, nw) => [old, nw]));
  return idx.map((i) => ({ ...parts[i]!, ...(parts[i]!.parent !== undefined ? { parent: remap.get(parts[i]!.parent!)! } : {}) }));
}

export function koala(pose: Pose = "sit", o: Omit<KoalaOpts, "pose"> = {}): Recipe {
  return koalaParts({ ...o, pose }).map((p) => p.shape);
}
