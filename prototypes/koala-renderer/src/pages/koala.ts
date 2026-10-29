// 코알라 캐릭터 시안: 디자인 3종 × 4방향 × 자세 3가지 + 걷기 순환 미리보기
import "../style.css";
import { DESIGNS, koala, koalaParts, type DesignId, type Pose } from "../art/koala";
import { STYLES } from "../art/styles";
import { compile } from "../engine/compile";
import { dlBounds, type DItem } from "../engine/display";
import { project, projectEllipsoid } from "../engine/iso";
import { clear, drawList, setView, toSvg } from "../render/painter";

const style = STYLES.c;
const q = new URLSearchParams(location.search);
const only = q.get("design") as DesignId | null;
const debug = q.get("debug") === "1";

const DIRS: [string, number][] = [["정면", Math.PI / 4], ["비스듬히", Math.PI / 2], ["옆", -Math.PI / 4], ["뒤", (5 * Math.PI) / 4]];
const POSES: [string, Pose][] = [["서기", "stand"], ["앉기", "sit"], ["걷기(중간 동작)", "walk"]];

function ground(): DItem[] {
  const r = 0.55, pts: number[] = [];
  for (let i = 0; i < 24; i++) { const [x, y] = project(r * Math.cos((i / 24) * Math.PI * 2), r * Math.sin((i / 24) * Math.PI * 2), 0); pts.push(x, y); }
  return [{ k: "poly", pts, fill: "#5a3e2b", a: 0.12 }];
}

/** 디버그: 머리 윤곽과 얼굴 부품 중심 */
function overlay(design: DesignId, pose: Pose, yaw: number): DItem[] {
  const parts = koalaParts({ pose, yaw, design });
  const out: DItem[] = [];
  for (const p of parts) {
    if (p.shape.t !== "ell") continue;
    const [cx, cy] = project(p.shape.cx, p.shape.cy, p.shape.cz);
    if (p.role === "head") { const e = projectEllipsoid(p.shape.rx, p.shape.ry, p.shape.rz, p.shape.yaw ?? 0); out.push({ k: "ell", cx, cy, rx: e.a, ry: e.b, rot: e.rot, stroke: "#2f6bff", sw: 1 }); }
    if (p.role === "decal" && p.shape.n && p.shape.n[0] + p.shape.n[1] > 0.05) out.push({ k: "ell", cx, cy, rx: 1.2, ry: 1.2, rot: 0, fill: "#e0249a" });
  }
  const [ox, oy] = project(0, 0, 0);
  out.push({ k: "ell", cx: ox, cy: oy, rx: 2.5, ry: 2.5, rot: 0, fill: "#d1001f" });
  return out;
}

function cell(design: DesignId, pose: Pose, yaw: number): string {
  const dl = [...ground(), ...compile(koala(pose, { yaw, design }), style), ...(debug ? overlay(design, pose, yaw) : [])];
  const b = dlBounds(dl);
  const pad = { ...b, y0: Math.min(b.y0, -80), y1: Math.max(b.y1, 14), x0: Math.min(b.x0, -40), x1: Math.max(b.x1, 40) };
  return toSvg(dl, pad, 150, "");
}

const ids = (only ? [only] : (Object.keys(DESIGNS) as DesignId[]));
const root = document.getElementById("kh-root")!;
root.innerHTML = `
  <style>
    body { overflow: auto !important; background: #f3e8d6; }
    .ks { max-width: 980px; margin: 0 auto; padding: 18px 16px 40px; color: #5a3e2b; }
    .ks h1 { font-size: 22px; margin: 0 0 4px; } .ks .sub { font-size: 13px; opacity: .75; margin: 0 0 16px; }
    .sheet { background: #fbf5ea; border-radius: 20px; box-shadow: 0 3px 0 #e2cfae; padding: 14px 16px 18px; margin-bottom: 22px; }
    .sheet h2 { margin: 0; font-size: 19px; } .sheet h2 b { color: #c4724a; margin-right: 6px; } .sheet p { margin: 4px 0 10px; font-size: 13px; opacity: .8; }
    .grid { display: grid; grid-template-columns: 70px repeat(4, 1fr) 1.2fr; gap: 6px; align-items: center; }
    .grid .h { font-size: 12px; font-weight: 700; text-align: center; opacity: .75; }
    .grid .r { font-size: 13px; font-weight: 700; }
    .grid svg { width: 100%; height: auto; display: block; }
    .grid canvas { width: 100%; aspect-ratio: 1; display: block; }
    .c { background: #fff; border-radius: 14px; }
    @media (max-width: 700px) { .grid { grid-template-columns: 44px repeat(4, 1fr); } .anim { grid-column: 1 / -1; } .grid .h.anim { display: none; } }
  </style>
  <div class="ks">
    <h1>코알라 캐릭터 시안</h1>
    <p class="sub">같은 리그(방향 × 자세)로 그린 디자인 ${ids.length}종 · 화풍 C · 4방향은 정면 / 비스듬히(가구 앞 방향) / 옆 / 뒤 · 오른쪽은 걷기 순환(방향이 돌아감)${debug ? " · 파란 선 = 머리 윤곽, 분홍 점 = 보이는 얼굴 부품, 빨간 점 = 기준점" : ""}</p>
    ${ids.map((id) => `
      <section class="sheet" id="d-${id}">
        <h2><b>${"ABCDEF"[Object.keys(DESIGNS).indexOf(id)]}</b>${DESIGNS[id].name}</h2><p>${DESIGNS[id].desc}</p>
        <div class="grid">
          <span></span>${DIRS.map(([k]) => `<span class="h">${k}</span>`).join("")}<span class="h anim">걷기 순환</span>
          ${POSES.map(([label, pose], pi) => `<span class="r">${label}</span>${DIRS.map(([, yaw]) => `<div class="c">${cell(id, pose, yaw)}</div>`).join("")}${pi === 0 ? `<div class="c anim" style="grid-row: span 3"><canvas data-anim="${id}" width="300" height="300"></canvas></div>` : ""}`).join("")}
        </div>
      </section>`).join("")}
  </div>`;

// 걷기 순환: 위상 0→1, 방향은 8방향으로 천천히 돈다
const cans = [...document.querySelectorAll<HTMLCanvasElement>("canvas[data-anim]")];
const still = q.get("still") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
function frame(t: number) {
  for (const c of cans) {
    const ctx = c.getContext("2d")!;
    const dpr = 2; c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
    clear(ctx, c.width, c.height);
    const phase = still ? 0.25 : (t / 900) % 1;
    const yaw = Math.PI / 4 + Math.floor((still ? 0 : t) / 1800) * (Math.PI / 4);
    const dl = [...ground(), ...compile(koala("walk", { yaw, design: c.dataset.anim as DesignId, phase }), style)];
    const sc = Math.min(c.width, c.height) / 150;
    setView(ctx, sc, c.width / 2, c.height * 0.78);
    drawList(ctx, dl);
  }
  if (!still) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
