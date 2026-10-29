// 화풍 3종 — 같은 레시피에 선 굵기·음영·색감만 바꾼다.
import type { Look } from "../engine/compile";
import type { Material } from "../engine/recipe";
import { adjust, mix } from "./color";
import { PALETTE } from "./palette";

export type StyleId = "a" | "b" | "c";

export interface Style extends Look {
  id: StyleId;
  name: string;
  desc: string;
  /** 무대 배경(CSS) */
  backdrop: string;
  /** 바닥 접촉 그림자 진하기 */
  contact: number;
  /** HTML UI 색 */
  ui: { panel: string; ink: string; accent: string; soft: string; shadow: string };
}

interface Params {
  id: StyleId; name: string; desc: string;
  sat: number; light: number; warm?: { hue: number; k: number };
  top: number; left: number; right: number; tint: string; tintK: number;
  line: ((fill: string, mat?: Material) => { color: string; width: number } | null);
  ellipsoid: Look["ellipsoid"]; edgeLight: boolean; texture: boolean;
  backdrop: string; contact: number; ui: Style["ui"];
}

function make(p: Params): Style {
  const cache = new Map<string, string>();
  const color = (ref: string): string => {
    let v = cache.get(ref);
    if (!v && ref.length === 9 && ref.startsWith("#")) return ref; // 반투명 선 색은 그대로
    if (!v) {
      const raw = ref.startsWith("#") ? ref : PALETTE[ref] ?? "#ff00ff";
      v = adjust(raw, p.sat, p.light, p.warm);
      cache.set(ref, v);
    }
    return v;
  };
  return {
    id: p.id, name: p.name, desc: p.desc, backdrop: p.backdrop, contact: p.contact, ui: p.ui,
    ellipsoid: p.ellipsoid, edgeLight: p.edgeLight, texture: p.texture,
    color,
    shade(hex, nx, ny, nz) {
      const q = nx * nx + ny * ny + nz * nz || 1;
      const f = (p.top * nz * nz + p.left * ny * ny + p.right * nx * nx) / q;
      return f >= 1 ? mix(hex, "#ffffff", Math.min(0.5, (f - 1) * 2)) : mix(hex, p.tint, Math.min(0.85, (1 - f) * p.tintK));
    },
    outline: p.line,
    lighten: (hex, k) => mix(hex, "#ffffff", k),
    darken: (hex, k) => mix(hex, p.tint, k),
  };
}

export const STYLES: Record<StyleId, Style> = {
  a: make({
    id: "a", name: "그림책 스티커", desc: "굵은 갈색 외곽선, 2단 음영, 밝은 파스텔",
    sat: 1.08, light: 0.02, top: 1.0, left: 0.9, right: 0.8, tint: "#4d3550", tintK: 1.4,
    line: () => ({ color: "#4a3428", width: 1.5 }),
    ellipsoid: "spot", edgeLight: false, texture: false,
    backdrop: "radial-gradient(circle at 50% 40%, #fff7e6 0%, #fde9c8 60%, #f6d9a8 100%)", contact: 0.14,
    ui: { panel: "#fffaf0", ink: "#4a3428", accent: "#f08a5d", soft: "#fde9c8", shadow: "0 3px 0 #f2cf9a" },
  }),
  b: make({
    id: "b", name: "점토 디오라마", desc: "외곽선 없음, 3단 면 음영, 모서리 하이라이트, 부드러운 그림자",
    sat: 0.9, light: 0.0, top: 1.05, left: 0.86, right: 0.7, tint: "#2c3558", tintK: 1.25,
    line: () => null,
    ellipsoid: "grad", edgeLight: true, texture: false,
    backdrop: "linear-gradient(180deg, #d9eef0 0%, #c3e2e2 55%, #a9d3d4 100%)", contact: 0.22,
    ui: { panel: "#f7fbfb", ink: "#2f4250", accent: "#3fa7a0", soft: "#dcefee", shadow: "0 3px 0 #b7dcdb" },
  }),
  c: make({
    id: "c", name: "따뜻한 손그림", desc: "가는 색 선, 나뭇결·바느질 무늬, 저채도 따뜻한 색",
    sat: 0.72, light: 0.01, warm: { hue: 32, k: 0.12 }, top: 1.0, left: 0.9, right: 0.8, tint: "#6a4330", tintK: 1.3,
    line: (fill) => ({ color: mix(fill, "#3e2618", 0.5), width: 0.85 }),
    ellipsoid: "spot", edgeLight: false, texture: true,
    backdrop: "repeating-linear-gradient(45deg, rgba(150,110,70,.05) 0 2px, transparent 2px 9px), #f3e8d6", contact: 0.16,
    ui: { panel: "#fbf5ea", ink: "#5a3e2b", accent: "#c4724a", soft: "#efe1c8", shadow: "0 3px 0 #e2cfae" },
  }),
};
