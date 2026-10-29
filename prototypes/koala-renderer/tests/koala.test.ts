import { describe, expect, it } from "vitest";
import { DESIGNS, koalaParts, type DesignId, type Pose } from "../src/art/koala";
import { project, projectEllipsoid } from "../src/engine/iso";
import type { EllShape } from "../src/engine/recipe";

/** 화면에 투영한 타원 안에서의 정규화 거리(1 = 윤곽) */
function ellDist(px: number, py: number, s: EllShape): number {
  const [cx, cy] = project(s.cx, s.cy, s.cz);
  const e = projectEllipsoid(s.rx, s.ry, s.rz, s.yaw ?? 0);
  const c = Math.cos(-e.rot), n = Math.sin(-e.rot), dx = px - cx, dy = py - cy;
  const u = dx * c - dy * n, v = dx * n + dy * c;
  return Math.hypot(u / e.a, v / Math.max(e.b, 1e-6));
}

const YAWS = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
const POSES: Pose[] = ["stand", "sit", "walk"];

describe("코알라: 8방향 × 자세 × 디자인 — 부품이 몸 윤곽 안에 붙어 있음", () => {
  for (const d of Object.keys(DESIGNS) as DesignId[]) for (const pose of POSES) {
    it(`${d} · ${pose}`, () => {
      const bad: string[] = [];
      for (const yaw of YAWS) for (const phase of pose === "walk" ? [0, 0.25, 0.5, 0.75] : [0.25]) {
        const parts = koalaParts({ design: d, pose, yaw, phase });
        parts.forEach((p, i) => {
          if (p.parent === undefined || p.shape.t !== "ell") return;
          const par = parts[p.parent]!.shape as EllShape, s = p.shape as EllShape;
          const [x, y] = project(s.cx, s.cy, s.cz);
          const visible = !s.n || s.n[0] + s.n[1] > 0.05;
          if (!visible) return;
          // 얼굴 장식: 중심이 부모(머리·귀·몸) 윤곽 안
          // 귀·팔다리·장신구: 부모 윤곽에 닿아 있음(중심이 부모 윤곽을 크게 벗어나지 않음)
          const lim = p.role === "decal" ? 0.98 : 1.9;
          const dist = ellDist(x, y, par);
          if (dist > lim) bad.push(`yaw ${Math.round((yaw * 180) / Math.PI)}° φ${phase} #${i} ${p.role} ${s.c}: ${dist.toFixed(2)}`);
        });
      }
      expect(bad).toEqual([]);
    });
  }

  it("뒤를 볼 때 얼굴 부품은 그리지 않음", () => {
    const parts = koalaParts({ pose: "stand", yaw: (5 * Math.PI) / 4 });
    const faceVisible = parts.filter((p) => p.role === "decal" && (p.shape as EllShape).c === "eye" && (!p.shape.n || p.shape.n[0] + p.shape.n[1] > 0.05));
    expect(faceVisible).toEqual([]);
  });

  it("정면에서 두 귀가 모두 머리 윤곽 밖으로 보임", () => {
    const parts = koalaParts({ pose: "stand", yaw: Math.PI / 4 });
    const head = parts.find((p) => p.role === "head")!.shape as EllShape;
    const ears = parts.filter((p) => p.role === "ear" && (p.shape as EllShape).rx > 0.08).map((p) => p.shape as EllShape);
    expect(ears.length).toBe(2);
    for (const e of ears) { const [x, y] = project(e.cx, e.cy, e.cz + e.rz * 0.8); expect(ellDist(x, y, head)).toBeGreaterThan(1); }
  });
});
