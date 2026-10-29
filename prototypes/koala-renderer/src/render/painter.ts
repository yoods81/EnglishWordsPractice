// 그리기 코드의 유일한 위치. 표시 목록 → Canvas 2D / SVG 문자열.
// 다른 2D 엔진으로 바꿀 때는 이 파일만 새로 쓴다.
import type { DisplayList, Paint, Rect } from "../engine/display";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function canvasPaint(ctx: Ctx, p: Paint): string | CanvasGradient {
  if (typeof p === "string") return p;
  const g = ctx.createRadialGradient(p.cx, p.cy, 0, p.cx, p.cy, p.r);
  for (const [o, c] of p.stops) g.addColorStop(o, c);
  return g;
}

/** 표시 목록을 현재 변환 상태의 ctx에 그린다. */
export function drawList(ctx: Ctx, dl: DisplayList): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const d of dl) {
    ctx.globalAlpha = d.k === "text" ? 1 : d.a ?? 1;
    if (d.k === "poly") {
      ctx.beginPath();
      ctx.moveTo(d.pts[0]!, d.pts[1]!);
      for (let i = 2; i < d.pts.length; i += 2) ctx.lineTo(d.pts[i]!, d.pts[i + 1]!);
      ctx.closePath();
      if (d.fill) { ctx.fillStyle = canvasPaint(ctx, d.fill); ctx.fill(); }
      if (d.stroke) { ctx.strokeStyle = d.stroke; ctx.lineWidth = d.sw ?? 1; ctx.stroke(); }
    } else if (d.k === "ell") {
      ctx.beginPath();
      ctx.ellipse(d.cx, d.cy, Math.max(0.01, d.rx), Math.max(0.01, d.ry), d.rot, 0, Math.PI * 2);
      if (d.fill) { ctx.fillStyle = canvasPaint(ctx, d.fill); ctx.fill(); }
      if (d.stroke) { ctx.strokeStyle = d.stroke; ctx.lineWidth = d.sw ?? 1; ctx.stroke(); }
    } else if (d.k === "line") {
      ctx.beginPath();
      ctx.moveTo(d.pts[0]!, d.pts[1]!);
      for (let i = 2; i < d.pts.length; i += 2) ctx.lineTo(d.pts[i]!, d.pts[i + 1]!);
      ctx.setLineDash(d.dash ?? []);
      ctx.strokeStyle = d.stroke; ctx.lineWidth = d.sw; ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.font = `600 ${d.size}px system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (d.bg) {
        const w = ctx.measureText(d.text).width + 4;
        ctx.fillStyle = d.bg; ctx.fillRect(d.x - w / 2, d.y - d.size / 2 - 1, w, d.size + 2);
      }
      ctx.fillStyle = d.color; ctx.fillText(d.text, d.x, d.y);
    }
  }
  ctx.globalAlpha = 1;
}

export function clear(ctx: Ctx, w: number, h: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
}

export function setView(ctx: Ctx, scale: number, tx: number, ty: number): void {
  ctx.setTransform(scale, 0, 0, scale, tx, ty);
}

export interface Sprite { img: HTMLCanvasElement | OffscreenCanvas; ox: number; oy: number; w: number; h: number }

const PAD = 4;

/** 표시 목록을 실제 배율(scale = 확대 × dpr)로 비트맵에 굽는다. 소수 위치(fx, fy)를 미리 반영한다. */
export function bake(dl: DisplayList, b: Rect, scale: number, fx: number, fy: number): Sprite {
  const ox = Math.floor(b.x0 * scale) - PAD, oy = Math.floor(b.y0 * scale) - PAD;
  const w = Math.max(1, Math.ceil(b.x1 * scale) - ox + PAD + 1), h = Math.max(1, Math.ceil(b.y1 * scale) - oy + PAD + 1);
  const img = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = img.getContext("2d") as Ctx;
  ctx.setTransform(scale, 0, 0, scale, -ox + fx, -oy + fy);
  drawList(ctx, dl);
  return { img, ox, oy, w, h };
}

/** 스프라이트를 기기 픽셀 좌표(정수 위치)에 찍는다. */
export function stamp(ctx: Ctx, s: Sprite, ix: number, iy: number, alpha = 1): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(s.img, ix + s.ox, iy + s.oy);
  ctx.globalAlpha = 1;
}

// ---------- SVG ----------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const n = (v: number) => (Math.round(v * 100) / 100).toString();

export function toSvg(dl: DisplayList, b: Rect, size: number, title = ""): string {
  const pad = 3;
  const vw = b.x1 - b.x0 + pad * 2, vh = b.y1 - b.y0 + pad * 2;
  const defs: string[] = [];
  const body: string[] = [];
  let gid = 0;
  const paint = (p: Paint | undefined): string => {
    if (!p) return "none";
    if (typeof p === "string") return p;
    const id = `g${gid++}`;
    defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(p.cx)}" cy="${n(p.cy)}" r="${n(p.r)}">${p.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</radialGradient>`);
    return `url(#${id})`;
  };
  for (const d of dl) {
    const op = d.k !== "text" && d.a !== undefined ? ` opacity="${n(d.a)}"` : "";
    if (d.k === "poly") {
      body.push(`<polygon points="${d.pts.map(n).join(" ")}" fill="${paint(d.fill)}"${d.stroke ? ` stroke="${d.stroke}" stroke-width="${n(d.sw ?? 1)}"` : ""}${op}/>`);
    } else if (d.k === "ell") {
      body.push(`<ellipse cx="${n(d.cx)}" cy="${n(d.cy)}" rx="${n(d.rx)}" ry="${n(d.ry)}" transform="rotate(${n((d.rot * 180) / Math.PI)} ${n(d.cx)} ${n(d.cy)})" fill="${paint(d.fill)}"${d.stroke ? ` stroke="${d.stroke}" stroke-width="${n(d.sw ?? 1)}"` : ""}${op}/>`);
    } else if (d.k === "line") {
      body.push(`<polyline points="${d.pts.map(n).join(" ")}" fill="none" stroke="${d.stroke}" stroke-width="${n(d.sw)}"${d.dash ? ` stroke-dasharray="${d.dash.join(" ")}"` : ""}${op}/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(b.x0 - pad)} ${n(b.y0 - pad)} ${n(vw)} ${n(vh)}" width="${size}" height="${size}" stroke-linejoin="round" stroke-linecap="round" role="img"${title ? ` aria-label="${esc(title)}"` : ""}>${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${body.join("")}</svg>`;
}
