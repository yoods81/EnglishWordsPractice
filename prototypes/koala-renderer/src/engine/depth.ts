// 깊이 정렬: 화면에서 겹치는 쌍에만 분리 축 규칙으로 앞뒤를 정하고 위상 정렬한다.
// 분리할 수 없는 쌍(같은 묶음 안의 겹치는 도형)은 입력 순서(레시피 순서)를 따른다.
import { behind, screenRect, type AABB } from "./iso";

export interface Sortable { box: AABB }

const rectOverlap = (a: ReturnType<typeof screenRect>, b: ReturnType<typeof screenRect>) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** 그리는 순서(인덱스 배열)를 돌려준다. */
export function depthOrder<T extends Sortable>(items: readonly T[]): number[] {
  const n = items.length;
  const rects = items.map((it) => screenRect(it.box));
  const out: number[][] = Array.from({ length: n }, () => []);
  const indeg = new Array<number>(n).fill(0);
  const edge = (a: number, b: number) => { out[a]!.push(b); indeg[b]!++; };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!rectOverlap(rects[i]!, rects[j]!)) continue;
      const a = items[i]!.box, b = items[j]!.box;
      const ab = behind(a, b), ba = behind(b, a);
      if (ab && !ba) edge(i, j);
      else if (ba && !ab) edge(j, i);
      else edge(i, j); // 분리 불가(또는 맞닿은 양방향) → 입력 순서
    }
  }

  // Kahn: 준비된 것 중 입력 순서가 가장 앞선 것부터. 순환이 생기면 가장 앞선 것을 강제로 꺼낸다.
  const done = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  const ready: number[] = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) ready.push(i);
  while (order.length < n) {
    let pick: number;
    if (ready.length) {
      let k = 0;
      for (let q = 1; q < ready.length; q++) if (ready[q]! < ready[k]!) k = q;
      pick = ready.splice(k, 1)[0]!;
    } else {
      pick = done.findIndex((d) => !d);
    }
    if (done[pick]) continue;
    done[pick] = true;
    order.push(pick);
    for (const m of out[pick]!) {
      if (--indeg[m]! === 0 && !done[m]) ready.push(m);
    }
  }
  return order;
}

/** 정렬 결과가 분리 규칙을 모두 지키는지 검사(테스트·디버그용). 위반 쌍을 돌려준다. */
export function orderViolations<T extends Sortable>(items: readonly T[], order: readonly number[]): [number, number][] {
  const pos = new Array<number>(items.length);
  order.forEach((idx, p) => { pos[idx] = p; });
  const bad: [number, number][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const a = items[i]!.box, b = items[j]!.box;
      if (!rectOverlap(screenRect(a), screenRect(b))) continue;
      if (behind(a, b) && !behind(b, a) && pos[i]! > pos[j]!) bad.push([i, j]);
    }
  }
  return bad;
}
