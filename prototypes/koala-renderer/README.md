# 코알라 렌더러 프로토타입

코알라 캐릭터를 **3D 도형 데이터 → 등각(아이소메트릭) 투영 → SVG 또는 2D Canvas**로 그리는 코드다. 별도 프로젝트 `koala-house-3d`(이 저장소 밖, 로컬 `I:\koala-house-3d`)에서 시안 페이지 실행에 필요한 파일만 2026-10-29에 복사했다. 이 폴더에서 바로 고쳐도 되고, 원본 프로젝트와 자동으로 동기화되지는 않는다.

- 그림 파일(PNG/SVG)은 없다. 자세, 방향, 걷기 단계를 넣으면 매번 도형을 계산해서 새로 그린다.
- 시안은 6종이다. A~C는 팔다리가 타원 하나씩인 이전 시안이고, D~F는 팔꿈치와 무릎이 굽는 관절 팔다리 시안이다. 실제 게임은 아직 A(통통 인형)를 임시로 쓰고 있고, 사용자가 A~F 중 하나를 고르기를 기다리는 중이다.
- `shots/`에 D·E·F와 A를 찍은 화면이 있다(`koala-cuddle.png`, `koala-climber.png`, `koala-joey.png`, `koala-plush.png`). 브라우저 없이도 지금 모습을 볼 수 있다.

## 실행

이 폴더(`prototypes/koala-renderer/`)에서 실행한다. Node 20 이상.

```
npm install
npm run dev          # http://127.0.0.1:4178/koala.html (자동으로 열림)
npm test             # 단위 테스트(부품이 몸에 붙어 있는지, 뒤에서 얼굴이 안 보이는지 등)
npm run typecheck
npm run build        # dist/
npm run preview      # http://127.0.0.1:4179/koala.html
npm run shots -- http://127.0.0.1:4179/ shots   # 스크린샷(Playwright + 설치된 Chrome 필요)
```

시안 페이지 주소 옵션:

| 주소 | 내용 |
|---|---|
| `/koala.html` | 6종 전부 |
| `/koala.html?design=climber` | 한 종만. `plush` `forest` `explorer` `cuddle` `climber` `joey` |
| `&debug=1` | 파란 선 = 머리 윤곽, 분홍 점 = 보이는 얼굴 부품, 빨간 점 = 기준점 |
| `&still=1` | 걷기 순환 애니메이션을 멈춤(스크린샷용) |

포트 4178/4179는 고정이다(`strictPort`). 원본 프로젝트의 개발 서버가 같은 포트로 떠 있으면 실행되지 않으니 그쪽을 먼저 끈다.

## 파일별 역할

그리는 흐름: `koala.ts`(3D 도형 목록) → `compile.ts`(투영·색·윤곽 → 2D 표시 목록) → `painter.ts`(SVG 문자열 또는 Canvas).

| 파일 | 역할 |
|---|---|
| `koala.html` | 시안 페이지 껍데기. `src/pages/koala.ts`를 불러온다 |
| `src/pages/koala.ts` | 시안 페이지. 디자인 × 4방향(정면/비스듬히/옆/뒤) × 자세 3가지를 **SVG**로 표에 그리고, 오른쪽 걷기 순환은 **Canvas**에 매 프레임 그린다 |
| `src/art/koala.ts` | **코알라 리그.** 디자인 6종(`DESIGNS`), 자세·방향·걷기 단계를 받아 타원체 목록을 만든다. 관절 팔다리(`rigLimbs`), 얼굴 부품 배치, 그리는 순서(`order`) |
| `src/engine/recipe.ts` | 3D 도형 타입(`ell` 타원체, `box`, `cyl`, `disc`, `poly`, `line`). `Recipe = Shape[]` |
| `src/engine/iso.ts` | 등각 투영의 유일한 기준. 월드 1 = 타일 한 칸, `TW=64` `TH=32` `ZH=36`px. `project(x,y,z)`, `projectEllipsoid()`(타원체의 화면 타원) |
| `src/engine/compile.ts` | 레시피 → 표시 목록. 화풍(`Look`)에 따라 명암·그라데이션·하이라이트·윤곽선을 정하고, 보는 쪽 반대를 향한 얼굴 부품을 뺀다 |
| `src/engine/depth.ts` | 도형 상자 기준 깊이 정렬(겹치는 쌍만 비교, 가를 수 없는 쌍은 입력 순서) |
| `src/engine/display.ts` | 2D 표시 목록 타입(`poly` `ell` `line` `text`), 화면 범위 계산 |
| `src/render/painter.ts` | 표시 목록을 그린다. `drawList(ctx, dl)` = Canvas, `toSvg(dl, rect, size)` = SVG 문자열, `bake`/`stamp` = 오프스크린 캐시 |
| `src/art/styles.ts`, `palette.ts`, `color.ts` | 화풍 A/B/C(시안 페이지는 C), 색 이름표(`fur`, `eye`, `nose` …), 색 계산 |
| `src/style.css` | 공용 기본 스타일 |
| `tests/koala.test.ts` | 디자인 × 자세 × 8방향 × 걷기 단계에서 부품이 부모 윤곽에 붙어 있는지, 뒤에서 얼굴이 안 보이는지, 정면에서 귀가 머리 밖으로 보이는지 |
| `scripts/shots-koala3.mjs` | 시안 스크린샷 |

## 코알라 3D 도형 데이터

### 입력값

```ts
koala(pose, { yaw, design, phase, viewYaw }): Recipe      // 그리기용 도형 목록
koalaParts({ pose, yaw, design, phase, viewYaw }): Part[] // 부위 정보 포함(테스트·디버그용)
```

| 입력 | 값 | 뜻 |
|---|---|---|
| `pose` | `"stand"` `"sit"` `"walk"` | 자세. 기본 `sit` |
| `yaw` | 라디안 | 몸이 바라보는 월드 수평 방향. 0 = +x, π/2 = +y. 시안의 4방향: 정면 π/4, 비스듬히 π/2, 옆 −π/4, 뒤 5π/4 |
| `design` | `DesignId` | 6종 중 하나. 없으면 `DEFAULT_DESIGN`(현재 `plush`, `setKoalaDesign()`으로 바꿈) |
| `phase` | 0~1 | 걷기 단계(`walk`에서만). 다리 흔들기 = sin(2π·phase), 몸 들썩임 = abs(cos(2π·phase)) × 0.03 |
| `viewYaw` | 라디안 | 이 좌표계에서 본 보는 사람 방향. 기본 π/4(화면 쪽 = +x+y). 회전된 가구 안에서 그릴 때만 다르게 준다 |

머리는 보는 사람 쪽으로 최대 30° 돌아간다. 몸 방향과 보는 방향의 차이가 100°를 넘으면(뒤를 볼 때) 돌리지 않는다.

### 출력: 부위 목록

모든 부위는 타원체(`EllShape`: 중심 `cx cy cz`, 반지름 `rx ry rz`, 수평 회전 `yaw`, 색 `c`)다. 엔진의 타원체는 수직축 회전만 되고 기울일 수 없다. 그래서 기울어진 팔다리는 작은 구슬을 이어 붙여 만든다.

`Part = { shape, role, parent?, grp? }`

| role | 부위 |
|---|---|
| `body` | 몸통 1개 |
| `head` | 머리 1개(부모 = 몸통) |
| `ear` | 귀 2개, 귀 가장자리 흰 털(`tufts` 디자인) |
| `limb` | 팔·다리·앞발·발. A~C는 부위마다 타원 1~2개, D~F는 관절 구슬 사슬(아래) |
| `decal` | 몸이나 머리 표면에 납작하게 붙은 장식: 가슴털, 귀 안쪽, 눈, 눈 반짝임, 볼, 코, 코 하이라이트, 입. 법선 `n`이 있어서, 보는 쪽(+x+y) 반대를 향하면 `compile`이 그리지 않는다 |
| `acc` | 장신구(꼬마 탐험가의 목도리, 배낭) |

- `parent`: 붙어 있는 부위의 번호. 테스트가 "자식의 중심이 부모 윤곽에 붙어 있는지"를 검사할 때 쓴다.
- `grp`: 같은 번호끼리는 한 덩어리로 그린다(관절 팔다리 하나).

**관절 팔다리(D~F, `rigLimbs`)**: 어깨 → 팔꿈치 → 손목, 엉덩이 → 무릎 → 발목 관절점(몸 기준 앞 `f`, 옆 `s`, 높이 `z`)을 잇는 선 위에 구슬을 촘촘히 놓는다. 반지름은 위에서 아래로 가늘어진다. 윤곽선 있는 구슬을 먼저 그리고, 같은 구슬을 윤곽선 없이 한 번 더 덮는다. 그러면 구슬끼리 겹친 안쪽 선이 지워져 하나로 이어진 팔다리 윤곽이 된다. 앞발은 손바닥과 두 갈래(엄지 둘, 손가락 셋)이고, 나무타기 친구는 발톱이 있다. 디자인별 수치는 `Rig`(엉덩이 높이, 팔·다리 길이 배율, 굵기, `hug`, `claws`, `chest`)에 있다.

**그리는 순서**: `koala.ts`의 `order()`가 보는 사람에게서 먼 것부터 정렬한다. 얼굴 장식은 부모 바로 뒤, 관절 팔다리는 덩어리 평균 깊이로 정한다. `compile()`이 기본값(`sort = true`)으로 `depthOrder()`를 한 번 더 돌리지만, 화면에서 겹치고 상자로 앞뒤를 가를 수 없는 쌍은 입력 순서를 따른다. 그래서 대부분 `order()` 순서가 유지되고, 상자가 확실히 갈리는 쌍(예: 먼 발과 가까운 발)만 상자 규칙으로 정해진다. 그리기 방식을 바꿀 때 순서가 어긋나면 이 두 단계를 같이 봐야 한다.

## 위치 기준점

코알라 레시피의 원점 (0, 0, 0)이 기준점이다(`koala.ts` 맨 위 주석).

| 자세 | 기준점 |
|---|---|
| `sit` | **엉덩이 중심**. 가구 좌석 기준점에 그대로 놓는다 |
| `stand`, `walk` | **두 발 사이 바닥**(z = 0). 발바닥이 z ≈ 0에 닿는다 |

시안 페이지는 이 원점에 바닥 그림자 원을 그리고, `debug=1`이면 빨간 점으로 표시한다.

원본 게임(`koala-house-3d`, 이 폴더에는 없음)에서는 이렇게 쓴다.
- 가구 템플릿마다 `seats: { id, pose: "sit" | "lie", x, y, z, facing: "+y" | "+x" | "-y" | "-x" }`(가구 로컬 좌표)가 있다.
- `src/engine/scene.ts`가 `koala("sit", { yaw: facing → 각도, viewYaw: π/4 + 가구회전 × π/2 })`를 만들고, 좌석 (x, y, z)만큼 옮긴 뒤 가구와 함께 회전한다. `facing` → `yaw`: `+y` = π/2, `+x` = 0, `-y` = −π/2, `-x` = π.
- `src/game/world.ts`는 앉은 코알라의 부품 상자로 좌석 위 소품과 겹치는지 검사한다. 겹치면 앉기를 거절한다(현재 기본 정책).
- 서기·걷기 자세는 아직 게임 화면에 나오지 않고 시안 페이지에만 있다. 방 사이를 걷는 애니메이션은 다음 단계(M4) 예정이다.

## My Koala 페이지와의 관계

**아직 연결 전이다.** 이 저장소의 My Koala(`public/js/koala-art.js`, `koala-core.js`, `koala-house.js`, `koala-house-ui.js`, `koala-admin-items.js`)는 이 코드를 불러오지 않는다. 이 폴더를 참조하는 곳도 없다. 기존 My Koala는 SVG 문자열 빌더(`koala-art.js`)와 등각 방 꾸미기(`koala-house.js`)로 따로 동작한다.

- 이 폴더는 배포 대상이 아니다. `wrangler.jsonc`의 정적 파일 디렉터리는 `./public`뿐이다.
- 루트 `npm test`도 이 폴더의 테스트를 실행하지 않는다.
- 붙인다면 `koala()` + `compile()` + `toSvg()`로 특정 자세의 SVG를 뽑아 쓰거나(2D 스티커 쪽), `drawList()`로 Canvas에 매 프레임 그리는 방식(입체 쪽)이 자연스럽다. TypeScript라서 빌드 단계가 필요하다.
