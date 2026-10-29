// 2D 표시 목록 — 엔진의 출력이자 painter의 입력. 좌표는 줌 1의 화면 px.

export interface RadialPaint { type: "radial"; cx: number; cy: number; r: number; stops: [number, string][] }
export type Paint = string | RadialPaint;

export interface DPoly { k: "poly"; pts: number[]; fill?: Paint; stroke?: string; sw?: number; a?: number }
export interface DEll { k: "ell"; cx: number; cy: number; rx: number; ry: number; rot: number; fill?: Paint; stroke?: string; sw?: number; a?: number }
export interface DLine { k: "line"; pts: number[]; stroke: string; sw: number; a?: number; dash?: number[] }
export interface DText { k: "text"; x: number; y: number; text: string; color: string; size: number; bg?: string }

export type DItem = DPoly | DEll | DLine | DText;
export type DisplayList = DItem[];

export interface Rect { x0: number; y0: number; x1: number; y1: number }

export function dlBounds(dl: DisplayList): Rect {
  const r = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x: number, y: number) => {
    if (x < r.x0) r.x0 = x; if (x > r.x1) r.x1 = x;
    if (y < r.y0) r.y0 = y; if (y > r.y1) r.y1 = y;
  };
  for (const d of dl) {
    if (d.k === "poly" || d.k === "line") for (let i = 0; i < d.pts.length; i += 2) add(d.pts[i]!, d.pts[i + 1]!);
    else if (d.k === "ell") {
      const c = Math.cos(d.rot), s = Math.sin(d.rot);
      const hx = Math.sqrt((d.rx * c) ** 2 + (d.ry * s) ** 2);
      const hy = Math.sqrt((d.rx * s) ** 2 + (d.ry * c) ** 2);
      add(d.cx - hx, d.cy - hy); add(d.cx + hx, d.cy + hy);
    } else add(d.x, d.y);
  }
  return r;
}

export function dlTranslate(dl: DisplayList, dx: number, dy: number): DisplayList {
  return dl.map((d) => {
    switch (d.k) {
      case "poly": return { ...d, pts: d.pts.map((v, i) => v + (i % 2 ? dy : dx)), fill: movePaint(d.fill, dx, dy) };
      case "line": return { ...d, pts: d.pts.map((v, i) => v + (i % 2 ? dy : dx)) };
      case "ell": return { ...d, cx: d.cx + dx, cy: d.cy + dy, fill: movePaint(d.fill, dx, dy) };
      case "text": return { ...d, x: d.x + dx, y: d.y + dy };
    }
  });
}

function movePaint(p: Paint | undefined, dx: number, dy: number): Paint | undefined {
  return p && typeof p !== "string" ? { ...p, cx: p.cx + dx, cy: p.cy + dy } : p;
}
