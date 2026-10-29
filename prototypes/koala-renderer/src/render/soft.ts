// 코알라 전용 "부드러운" 그리기(시안). 같은 부위 목록(koalaParts)을 받아 그리는 방식만 바꾼다.
// 위치·자세·그리는 순서는 그대로이고, 단계(level)가 올라갈수록 다음이 차례로 더해진다.
//   1 바깥 윤곽선만: 모든 털 부위의 윤곽을 먼저 뒤에 깔고 그 위에 선 없이 칠한다 → 이음새 선이 사라진다.
//     앞에 겹친 부위(팔·머리 등)는 아주 옅은 선으로만 구분한다.
//   2 이음새 메우기: 팔다리가 몸·다리에 붙는 자리를 볼록 껍질(hull)로 메워 구슬 이음 느낌을 없앤다.
//   3 빛 통일: 부위마다 붙은 흰 점 대신 한 방향(왼쪽 위) 빛, 겹친 자리에 부드러운 그림자.
//   4 털 디테일: 머리·귀·몸 가장자리와 가슴털을 살짝 들쭉날쭉하게, 정수리 털 몇 가닥.
import type { Part } from "../art/koala";
import { mix } from "../art/color";
import type { Look } from "../engine/compile";
import { project, projectEllipsoid } from "../engine/iso";

export type Level = 1 | 2 | 3 | 4;
type Pt = [number, number];

interface Item {
  part: Part;
  pts: Pt[];
  cx: number; cy: number; a: number; b: number; rot: number;
  base: string; mid: string;
  fur: boolean;          // 윤곽을 갖는 털 부위(몸·머리·팔다리·귀·장신구)
  bridge?: { pts: Pt[]; color: string };
}

const TAU = Math.PI * 2;
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

/** 투영 타원을 점으로. jag = 가장자리 털 들쭉날쭉(진폭, 개수) */
function ellPts(cx: number, cy: number, a: number, b: number, rot: number, seg: number, jag?: { amp: number; freq: number; from?: number; to?: number }): Pt[] {
  const c = Math.cos(rot), s = Math.sin(rot), out: Pt[] = [];
  for (let i = 0; i < seg; i++) {
    const t = (i / seg) * TAU;
    let k = 1;
    if (jag) {
      // 화면에서 본 각도(아래 = π/2)로 털이 날 구간을 정한다
      const x = a * Math.cos(t), y = b * Math.sin(t);
      const sa = Math.atan2(x * s + y * c, x * c - y * s);
      const inRange = jag.from === undefined || angIn(sa, jag.from, jag.to!);
      if (inRange) {
        // 둥근 털 뭉치(물결): 톱니처럼 뾰족하지 않게 |sin|을 쓴다
        k = 1 + jag.amp * Math.abs(Math.sin((t * jag.freq) / 2)) - jag.amp * 0.55;
      }
    }
    const x = a * Math.cos(t) * k, y = b * Math.sin(t) * k;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}
function angIn(a: number, from: number, to: number): boolean {
  const w = (v: number) => ((v % TAU) + TAU) % TAU;
  const A = w(a - from), B = w(to - from);
  return A <= B;
}

function hull(p: Pt[]): Pt[] {
  const s = [...p].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [], up: Pt[] = [];
  for (const q of s) { while (lo.length >= 2 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop(); lo.push(q); }
  for (let i = s.length - 1; i >= 0; i--) { const q = s[i]!; while (up.length >= 2 && cross(up[up.length - 2]!, up[up.length - 1]!, q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

const path = (p: Pt[]) => `M${p.map(([x, y]) => `${n2(x)} ${n2(y)}`).join("L")}Z`;

let uid = 0;

export interface SoftOut { svg: string; x0: number; y0: number; x1: number; y1: number }

/**
 * 부위 목록 → SVG 조각(<g>…</g>)과 화면 범위. extraBack = 맨 뒤에 깔 SVG(바닥 그림자 등).
 */
export function softSvg(parts: Part[], look: Look, level: Level, extraBack = ""): SoftOut {
  const id = `s${uid++}`;
  const items: Item[] = [];
  const byIndex = new Map<number, Item>();
  parts.forEach((p, i) => {
    const s = p.shape;
    if (s.t !== "ell") return;
    if (s.n && s.n[0] + s.n[1] <= 0.05) return; // 보는 사람 반대쪽 얼굴 부품
    const [cx, cy] = project(s.cx, s.cy, s.cz);
    const e = projectEllipsoid(s.rx, s.ry, s.rz, s.yaw ?? 0);
    const base = look.color(s.c);
    const mid = look.shade(base, 0.35, 0.6, 0.72);
    const fur = p.role !== "decal";
    let jag: Parameters<typeof ellPts>[6];
    if (level >= 4) {
      const big = Math.max(e.a, e.b);
      if (p.role === "head") jag = { amp: 0.045, freq: 22, from: 0.25, to: Math.PI - 0.25 };      // 볼·턱 털
      else if (p.role === "ear" && !s.noLine) jag = { amp: 0.07, freq: 12 };                     // 귀 털
      else if (p.role === "body") jag = { amp: 0.035, freq: 22 };
      else if (p.role === "decal" && p.parent !== undefined && big > 4 && ["body", "ear"].includes(parts[p.parent]!.role)) jag = { amp: 0.07, freq: 14 }; // 가슴털·귀 안쪽
    }
    const it: Item = { part: p, pts: ellPts(cx, cy, e.a, e.b, e.rot, jag ? 96 : 48, jag), cx, cy, a: e.a, b: e.b, rot: e.rot, base, mid, fur };
    items.push(it);
    byIndex.set(i, it);
  });

  // 이음새 메우기: 팔다리(부모가 털 부위, 다른 덩어리)와 부모 사이
  if (level >= 2) {
    for (const it of items) {
      const p = it.part;
      if (p.role !== "limb" || p.parent === undefined) continue;
      const par = byIndex.get(p.parent);
      if (!par || !par.fur || par.part.role === "ear") continue;
      if (p.grp !== undefined && par.part.grp === p.grp) continue; // 같은 사슬 구슬은 이미 이어져 있다
      const t = 0.5, k = 0.7;
      const mx = it.cx + (par.cx - it.cx) * t, my = it.cy + (par.cy - it.cy) * t;
      const inner = ellPts(mx, my, it.a * k, it.b * k, it.rot, 24);
      const color = it.base === par.base ? it.mid : par.mid; // 발(진한 색)은 다리 색으로 잇는다
      it.bridge = { pts: hull([...it.pts, ...inner]), color };
    }
  }

  // 덩어리: 관절 사슬(grp)은 한 덩어리, 나머지는 부위 하나
  const units: Item[][] = [];
  for (const it of items) {
    const last = units[units.length - 1];
    const g = it.part.grp;
    if (g !== undefined && last && last[0]!.part.grp === g) last.push(it);
    else units.push([it]);
  }

  const furMid = look.shade(look.color("fur"), 0.35, 0.6, 0.72);
  const lineCol = mix(furMid, "#3e2618", 0.62);
  const W = 1.05;
  const out: string[] = [];
  const defs: string[] = [];
  const clip: string[] = [];

  // 1) 바깥 윤곽: 모든 털 부위(+이음새)를 굵은 선으로 맨 뒤에
  for (const it of items) {
    if (!it.fur) continue;
    for (const pts of it.bridge ? [it.bridge.pts, it.pts] : [it.pts]) {
      out.push(`<path d="${path(pts)}" fill="${lineCol}" stroke="${lineCol}" stroke-width="${W * 2}"/>`);
      clip.push(`<path d="${path(pts)}"/>`);
    }
  }

  if (level >= 3) {
    defs.push(`<filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1"/></filter>`);
  }

  // 부위 칠하기
  const fillOf = (it: Item, color = it.mid): string => {
    if (level < 3) {
      // 기존과 같은 느낌의 작은 하이라이트 대신, 은은한 원형 그라데이션
      return color;
    }
    const gid = `${id}g${defs.length}`;
    const r = Math.max(it.a, it.b);
    const hi = mix(color, "#ffffff", 0.16), lo = mix(color, "#5b4a52", 0.16);
    defs.push(`<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${n2(it.cx - r * 0.35)}" cy="${n2(it.cy - r * 0.45)}" r="${n2(r * 1.6)}"><stop offset="0" stop-color="${hi}"/><stop offset="0.5" stop-color="${color}"/><stop offset="1" stop-color="${lo}"/></radialGradient>`);
    return `url(#${gid})`;
  };

  let first = true;
  for (const unit of units) {
    const head = unit[0]!;
    if (head.fur) {
      // 앞에 겹치는 부위를 옅게 구분: 1~2단계 = 옅은 선, 3단계 이상 = 부드러운 그림자
      if (!first && head.part.role !== "body") {
        for (const it of unit) {
          if (!it.fur || it.part.shape.t === "ell" && it.part.shape.noLine) continue;
          for (const pts of it.bridge ? [it.bridge.pts, it.pts] : [it.pts]) {
            if (level >= 3) out.push(`<g clip-path="url(#${id}c)"><path d="${path(pts)}" transform="translate(0.6 1.4)" fill="#4a3530" opacity="0.32" filter="url(#${id}b)"/></g>`);
            else out.push(`<path d="${path(pts)}" fill="none" stroke="${lineCol}" stroke-width="${W}" opacity="0.22"/>`);
          }
        }
      }
      for (const it of unit) {
        if (it.bridge) out.push(`<path d="${path(it.bridge.pts)}" fill="${it.bridge.color}"/>`);
        out.push(`<path d="${path(it.pts)}" fill="${it.fur ? fillOf(it) : it.mid}"/>`);
        if (level < 3 && it.fur && Math.min(it.a, it.b) > 2.5 && !(it.part.shape.t === "ell" && it.part.shape.noLine)) {
          // 1~2단계는 기존 화풍의 작은 하이라이트를 유지(빛 통일 전)
          const c = Math.cos(it.rot), s = Math.sin(it.rot);
          const hx = -it.a * 0.28, hy = -it.b * 0.34;
          out.push(`<ellipse cx="${n2(it.cx + hx * c - hy * s)}" cy="${n2(it.cy + hx * s + hy * c)}" rx="${n2(it.a * 0.36)}" ry="${n2(it.b * 0.26)}" transform="rotate(${n2((it.rot * 180) / Math.PI)} ${n2(it.cx + hx * c - hy * s)} ${n2(it.cy + hx * s + hy * c)})" fill="${mix(it.mid, "#ffffff", 0.28)}" opacity="0.75"/>`);
        }
      }
      first = false;
    } else {
      // 얼굴·가슴 장식
      const s = head.part.shape;
      const a = s.t === "ell" && s.a !== undefined ? ` opacity="${s.a}"` : "";
      const stroke = s.t === "ell" && s.noLine === false ? ` stroke="${mix(head.mid, "#1a1418", 0.4)}" stroke-width="0.8"` : "";
      const fill = s.c === "nose" && level >= 3 ? fillOf(head) : head.mid;
      out.push(`<path d="${path(head.pts)}" fill="${fill}"${stroke}${a}/>`);
    }
  }

  // 3단계: 전체 실루엣에 한 방향 빛
  let overlay = "";
  if (level >= 3) {
    const xs = items.flatMap((i) => i.pts.map((p) => p[0])), ys = items.flatMap((i) => i.pts.map((p) => p[1]));
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    defs.push(`<clipPath id="${id}c">${clip.join("")}</clipPath>`);
    defs.push(`<linearGradient id="${id}l" gradientUnits="userSpaceOnUse" x1="${n2(x0)}" y1="${n2(y0)}" x2="${n2(x1)}" y2="${n2(y1)}"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.75" stop-color="#3b2a33" stop-opacity="0"/><stop offset="1" stop-color="#3b2a33" stop-opacity="0.2"/></linearGradient>`);
    overlay = `<rect x="${n2(x0 - 2)}" y="${n2(y0 - 2)}" width="${n2(x1 - x0 + 4)}" height="${n2(y1 - y0 + 4)}" fill="url(#${id}l)" clip-path="url(#${id}c)"/>`;
  }

  // 4단계: 정수리 털 몇 가닥(머리 윗부분, 보이는 쪽)
  let tuft = "";
  if (level >= 4) {
    const h = items.find((i) => i.part.role === "head");
    if (h) {
      const tx = h.cx - h.a * 0.05, ty = h.cy - h.b * 0.95, u = h.a * 0.1;
      // 짧게 휜 털 두 가닥
      const strands = [`M${n2(tx - u * 0.6)} ${n2(ty + u * 0.4)}Q${n2(tx - u * 0.9)} ${n2(ty - u * 0.9)} ${n2(tx + u * 0.1)} ${n2(ty - u * 1.3)}`,
        `M${n2(tx + u * 0.4)} ${n2(ty + u * 0.4)}Q${n2(tx + u * 0.5)} ${n2(ty - u * 0.6)} ${n2(tx + u * 1.3)} ${n2(ty - u * 0.8)}`];
      tuft = `<path d="${strands.join("")}" fill="none" stroke="${lineCol}" stroke-width="${W}" stroke-linecap="round"/>`;
    }
  }

  const all = items.flatMap((i) => [...i.pts, ...(i.bridge?.pts ?? [])]);
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  return {
    svg: `${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${extraBack}${out.join("")}${overlay}${tuft}`,
    x0: Math.min(...xs) - W * 2, y0: Math.min(...ys) - W * 2, x1: Math.max(...xs) + W * 2, y1: Math.max(...ys) + W * 2,
  };
}
