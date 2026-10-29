// 그리기 방식 개선 시안: 같은 코알라 데이터(자세·방향·위치 그대로)를 현재 방식과 개선 1~4단계로 나란히 그린다.
import "../style.css";
import { DESIGNS, koala, koalaParts, type DesignId, type Pose } from "../art/koala";
import { STYLES } from "../art/styles";
import { compile } from "../engine/compile";
import { project } from "../engine/iso";
import { toSvg } from "../render/painter";
import { softSvg, type Level } from "../render/soft";

const style = STYLES.c;
const q = new URLSearchParams(location.search);
const still = q.get("still") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
let design = (q.get("design") as DesignId | null) ?? "plush";

const LEVELS: [Level | 0, string, string][] = [
  [0, "현재", "부위마다 테두리와 흰 하이라이트(지금 VS Code 시안과 같음)"],
  [1, "① 바깥 윤곽선만", "겉 실루엣에만 선, 이음새 선 제거. 앞에 겹친 팔·머리만 옅은 선으로 구분"],
  [2, "①+② 이음새 메우기", "팔다리가 몸에 붙는 자리를 메워 구슬을 이은 느낌을 없앰"],
  [3, "①~③ 빛 통일", "왼쪽 위 한 방향 빛, 겹친 자리에 부드러운 그림자, 흰 점 하이라이트 제거"],
  [4, "①~④ 털 디테일", "볼·귀·가슴 가장자리 털, 정수리 털 몇 가닥"],
];
const COLS: [string, Pose, number][] = [
  ["정면", "stand", Math.PI / 4],
  ["비스듬히", "stand", Math.PI / 2],
  ["옆", "stand", -Math.PI / 4],
  ["뒤", "stand", (5 * Math.PI) / 4],
  ["앉기", "sit", Math.PI / 2],
];

function groundSvg(): string {
  const r = 0.55, pts: string[] = [];
  for (let i = 0; i < 24; i++) { const [x, y] = project(r * Math.cos((i / 24) * Math.PI * 2), r * Math.sin((i / 24) * Math.PI * 2), 0); pts.push(`${x.toFixed(2)},${y.toFixed(2)}`); }
  return `<polygon points="${pts.join(" ")}" fill="#5a3e2b" opacity="0.12"/>`;
}
const VIEW = { x0: -40, y0: -80, x1: 40, y1: 14 };
const vb = () => `${VIEW.x0 - 3} ${VIEW.y0 - 3} ${VIEW.x1 - VIEW.x0 + 6} ${VIEW.y1 - VIEW.y0 + 6}`;

function draw(level: Level | 0, pose: Pose, yaw: number, phase?: number): string {
  if (level === 0) {
    const dl = compile(koala(pose, { yaw, design, ...(phase !== undefined ? { phase } : {}) }), style);
    return toSvg(dl, VIEW, 150).replace(/^<svg([^>]*)>/, `<svg$1>${groundSvg()}`).replace(/width="150" height="150"/, "");
  }
  const s = softSvg(koalaParts({ pose, yaw, design, ...(phase !== undefined ? { phase } : {}) }), style, level, groundSvg());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb()}" stroke-linejoin="round" stroke-linecap="round">${s.svg}</svg>`;
}

const root = document.getElementById("kh-root")!;
function render() {
  const ids = Object.keys(DESIGNS) as DesignId[];
  root.innerHTML = `
  <style>
    html, body { height: auto !important; overflow: auto !important; background: #f3e8d6; }
    .ks { max-width: 1040px; margin: 0 auto; padding: 18px 16px 40px; color: #5a3e2b; }
    .ks h1 { font-size: 22px; margin: 0 0 4px; } .ks .sub { font-size: 13px; opacity: .78; margin: 0 0 14px; line-height: 1.5; }
    .tabbar { display: flex; align-items: center; gap: 4px; background: #cfeee0; border-radius: 12px; padding: 4px; margin-bottom: 18px; }
    .tabs { flex: 1; display: flex; overflow-x: auto; scrollbar-width: none; scroll-behavior: smooth; }
    .tabs::-webkit-scrollbar { display: none; }
    .arr { flex: none; width: 30px; height: 34px; border: 0; border-radius: 9px; background: #fff; color: #2f5a4a; font: 700 16px system-ui, sans-serif; box-shadow: 0 2px 0 #a8dcc6; cursor: pointer; }
    .tabs button { flex: 1 0 auto; border: 0; background: transparent; color: #3d6b5a; font: 700 13px system-ui, sans-serif; padding: 9px 12px; border-radius: 9px; cursor: pointer; white-space: nowrap; }
    .tabs button.on { background: #fff; color: #2f5a4a; box-shadow: 0 2px 0 #a8dcc6; }
    .row { background: #fbf5ea; border-radius: 20px; box-shadow: 0 3px 0 #e2cfae; padding: 12px 14px 14px; margin-top: 18px; }
    .row h2 { margin: 0; font-size: 17px; } .row p { margin: 3px 0 10px; font-size: 13px; opacity: .8; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr) 1.15fr; gap: 6px; align-items: stretch; }
    .grid .h { font-size: 12px; font-weight: 700; text-align: center; opacity: .7; padding-bottom: 2px; }
    .c { background: #fff; border-radius: 14px; display: flex; align-items: center; }
    .c svg { width: 100%; height: auto; display: block; }
    .anim { position: relative; }
    @media (max-width: 700px) { .grid { grid-template-columns: repeat(3, 1fr); } .grid .h { display: none; } }
  </style>
  <div class="ks">
    <h1>코알라 그리기 방식 개선 시안</h1>
    <p class="sub">코알라 데이터(자세·방향·위치 기준점)는 그대로 두고 <b>그리는 방식만</b> 바꿨어요. 위에서 아래로 개선 단계가 하나씩 더해져요. 맨 오른쪽 칸은 걷기 순환 애니메이션이에요.</p>
    <div class="tabbar"><button class="arr" data-dir="-1" aria-label="왼쪽">‹</button><div class="tabs">${ids.map((id, i) => `<button data-d="${id}" class="${id === design ? "on" : ""}">${"ABCDEF"[i]} ${DESIGNS[id].name}</button>`).join("")}</div><button class="arr" data-dir="1" aria-label="오른쪽">›</button></div>
    ${LEVELS.map(([lv, title, desc]) => `
      <section class="row">
        <h2>${title}</h2><p>${desc}</p>
        <div class="grid">
          ${COLS.map(([k]) => `<span class="h">${k}</span>`).join("")}<span class="h">걷기 순환</span>
          ${COLS.map(([, pose, yaw]) => `<div class="c">${draw(lv, pose, yaw)}</div>`).join("")}
          <div class="c anim" data-lv="${lv}">${draw(lv, "walk", Math.PI / 4, 0.25)}</div>
        </div>
      </section>`).join("")}
  </div>`;
  root.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => b.onclick = () => {
    design = b.dataset.d as DesignId;
    try { history.replaceState(null, "", `?design=${design}`); } catch { /* 미리보기 창 등에서 막힐 수 있음 */ }
    render();
  });
  const tabs = root.querySelector<HTMLElement>(".tabs")!;
  root.querySelectorAll<HTMLButtonElement>(".arr").forEach((b) => b.onclick = () => tabs.scrollBy({ left: Number(b.dataset.dir) * tabs.clientWidth * 0.7 }));
  root.querySelector<HTMLElement>(".tabs .on")?.scrollIntoView({ inline: "center", block: "nearest" });
}
render();

// 걷기 순환: 방향이 8방향으로 천천히 돈다. 시안이라 매 프레임 SVG를 새로 만든다(게임에서는 Canvas 경로로 옮긴다).
let last = 0;
function frame(t: number) {
  if (t - last > 33) {
    last = t;
    const phase = (t / 900) % 1, yaw = Math.PI / 4 + Math.floor(t / 1800) * (Math.PI / 4);
    root.querySelectorAll<HTMLElement>(".anim").forEach((el) => { el.innerHTML = draw(Number(el.dataset.lv) as Level | 0, "walk", yaw, phase); });
  }
  requestAnimationFrame(frame);
}
if (!still) requestAnimationFrame(frame);
