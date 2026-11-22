# 학년·레벨 대응표와 정리 계획 (초안, 2026-11-22)

첫 화면 혼합안(뮤즈)은 학년 칩 "Year 3 / 4 / 5 / 6"과 "Years 3-6"을 쓰고, 앱 안은 "Lower Primary / Upper Primary / Middle School / High School"을 쓴다.
랜딩을 만들기 전에 이 둘을 하나의 표로 맞춘다. **레벨 id(`elem_low` 등)와 단어 데이터는 바꾸지 않고, 화면에 보이는 이름만 바꾼다** — 저장된 레벨·단어·서버 데이터 이전이 필요 없다.

## 1. 지금 앱의 레벨 체계

| 레벨 id | 영어 화면 이름 | 영어 설명 | 한국어 화면 이름 | 영어 트랙 내장 단어* |
|---|---|---|---|---|
| `elem_low` | Lower Primary | Early primary vocabulary | 초등학교 저학년 | 뜻 70 · 스펠링 49 · 유의/반의 30 · 동음 20 (예전 `year4`) |
| `elem_high` | Upper Primary | Upper primary vocabulary | 초등학교 고학년 | 뜻 60 · 스펠링 40 · 유의/반의 30 · 동음 16 (예전 `year5`·`year6`) |
| `middle` | Middle School | Middle school vocabulary | 중학교 | 내장 단어 없음 (관리자 단어 목록만) |
| `high` | High School | High school vocabulary | 고등학교 | 내장 단어 없음 (관리자 단어 목록만) |

\* `public/js/words.js`의 내장 단어만 센 숫자. 사이트에서 말하는 2,096개는 대부분 서버의 관리자 단어 목록에 있다.

- 처음 쓰는 사람의 기본값은 `elem_low`(앱이 Year 4 기준이라서). 처음 Start를 누르면 레벨을 고르라고 묻는다.
- **영어 트랙**(영어 네이티브 기준)과 **한국어 트랙**(한국 학생 기준, 한 단계 쉬움)은 같은 4단계 id를 쓰지만 단어가 다르다(`levelEn` / `levelKo`).
- 예전 id 변환표 `LEGACY_LEVEL_MAP`: year4→elem_low, year5·year6→elem_high, year7→middle.

## 2. 무엇이 문제인가

1. **호주에서 쓰는 뜻과 어긋난다.** 호주 학교에서 "lower primary"는 보통 Foundation~Year 2, "upper primary"는 Year 3~6을 가리킨다. 그런데 앱의 Lower Primary에는 **Year 4 단어**가 들어 있다. Year 4 아이의 부모는 "Upper Primary"를 고를 가능성이 크고, 그러면 Year 5·6 단어부터 나와 어렵게 느낀다(뮤즈 점검에서 audit, surplus 같은 단어가 나온 것도 이 경우일 수 있다).
2. **사이트 안내와 이름이 다르다.** About·FAQ·첫 화면은 "Years 3-6"인데, 앱 안 레벨 선택창에는 Year가 보이지 않는다.
3. **Middle / High School은 주마다 학년이 다르다**(대부분 7~12학년이 High School이고, 일부 주에는 Middle School이 따로 있다).

## 3. 제안 대응표 (영어 화면)

| 레벨 id | 지금 | **제안 이름** | 제안 설명 한 줄 | 랜딩 학년 칩 |
|---|---|---|---|---|
| `elem_low` | Lower Primary | **Years 3–4** | Everyday school words for Years 3 and 4 | Years 3–4 |
| `elem_high` | Upper Primary | **Years 5–6** | Harder words for Years 5 and 6 | Years 5–6 |
| `middle` | Middle School | **Years 7–9** | Secondary school words | (랜딩에는 안 보임) |
| `high` | High School | **Years 10–12** | Senior school words | (랜딩에는 안 보임) |

- **랜딩 칩은 4개(Year 3·4·5·6)가 아니라 2개(Years 3–4 / Years 5–6)를 권한다.** 칩 4개는 실제로 레벨 2개로만 갈리므로, Year 3과 Year 4를 눌러도 같은 단어가 나와 "학년별로 다르다"는 기대와 맞지 않는다.
- 앱 안 레벨 선택창에도 랜딩과 같은 이름을 쓴다(한 번 정하면 첫 화면·About·FAQ·앱이 모두 같은 말).
- **한국어 화면은 그대로 둔다**(초등학교 저학년/고학년/중학교/고등학교). 한국어 트랙은 한국 학생 기준이라 호주 Year로 바꾸면 오히려 틀린 정보가 된다. 단, 한국어 화면에서 영어 트랙을 볼 때 이름 옆에 "(호주 3–4학년)"을 붙일지는 결정이 필요하다.

## 4. 바꿀 곳 (계획표)

| 단계 | 할 일 | 파일 | 데이터 이전 |
|---|---|---|---|
| 1 | 영어 레벨 이름·설명 바꾸기 | `public/js/words.js`(`LEVELS` label), `public/js/app.js`(`LEVEL_DESCRIPTIONS.en`, 레벨 표시 주석) | 없음 (id 그대로) |
| 2 | 정적 페이지 문구 맞추기 | `scripts/faq-data.json`("Which school years is it for?"), `public/about.html`, `scripts/gen-learn-pages.mjs`(공개 단어 목록 페이지에 레벨 이름이 나오면) | 없음 |
| 3 | 레벨 선택창 첫 질문 다듬기 | 처음 Start를 누를 때 묻는 창: "Which year is your child in?" + Years 3–4 / 5–6 / 7–9 / 10–12 | 없음 |
| 4 | 코알라 하우스(집 앱) 확인 | `public/house/` 번들에 레벨 이름이 들어가 있으면 집 앱 저장소에서 같이 바꾼다 | 없음 |
| 5 | 랜딩 맛보기 | 칩 2개 → `elem_low` / `elem_high`. 칩마다 쉬운 첫 단어를 고정한다(예: because / although — 확정 필요) | 없음 |
| 6 | 테스트 | 단위 테스트(`npm test`) + 브라우저로 레벨 선택창·설정 줄("Vocabulary · Years 5–6 · 10 questions")이 휴대폰 폭에서 한 줄에 들어가는지 확인 | — |

## 5. 결정 (2026-11-22, 사용자) — 적용함 (sw v290)

1. 영어 이름은 **Years 3–4 / Years 5–6 / Years 7–9 / Years 10–12** (`words.js` LEVELS, 설명 `LEVEL_DESCRIPTIONS.en`, 짧은 이름 `qzShortLevel` "Yr 3–4" 등).
2. 랜딩 칩은 **2개**(Years 3–4 / Years 5–6) — 랜딩을 만들 때 적용.
3. Year 3에게도 지금 `elem_low` 단어로 괜찮다 — 별도 쉬운 단어 작업 없음.
4. 한국어 화면은 한국 학년 기준 **초등 저학년 / 초등 고학년 / 중학교 / 고등학교** (`words_ko.js` KO_LEVELS, "초등학교 저학년"에서 짧게).
5. Middle/High는 Years 7–9 / 10–12.

엑셀 가져오기는 예전 이름(Lower Primary, 초등학교 저학년 등)과 새 이름(Years 3-4 등, 하이픈·대시 모두)을 다 알아듣는다(`LEVEL_ALIASES`).
**남은 것:** 코알라 하우스(집 앱, 저장소 yoods81/koala-house-3d)에도 예전 이름(Lower Primary / 초등학교 저학년 …)이 따로 들어 있다 — 집 앱에서 같이 바꾸고 다시 빌드해야 한다.

## (원래 질문)

1. 영어 이름: **"Years 3–4" 방식**(제안) / "Lower Primary (Years 3–4)"처럼 둘 다 쓰기 / 지금 그대로.
2. 랜딩 칩: **2개**(제안) / 뮤즈 안대로 4개.
3. Year 3 아이에게 지금의 `elem_low` 단어(Year 4 기준)가 너무 어렵지 않은지 — 어렵다면 나중에 Year 3용 쉬운 단어를 `elem_low` 안에서 앞쪽으로 내보내는 방법을 따로 검토한다(레벨을 하나 더 만들지는 않는다).
4. 한국어 화면에 호주 학년을 같이 보여 줄지.
5. Middle/High의 학년 범위 표기(Years 7–9 / 10–12 vs. "Secondary").

## 6. 다음 논의: 첫 화면 랜딩 분리 (나중에)

이 표가 정해진 뒤 랜딩 분리를 함께 다듬는다. 미리 적어 둔 논점:

- 비회원이 지금처럼 바로 앱에 들어가는 흐름을 유지할지, 랜딩 → "Start free"를 한 번 더 누르게 할지(한 번 더 누르면 이탈이 생길 수 있음).
- 맛보기 문제의 "+10 coins / Streak"는 비회원에게 없는 기능이라 빼야 한다.
- 뮤즈 목업의 "No ads / No chat" 알약과 알약형 학년 칩은 디자인 규칙 위반 → 평면 스타일로 다시 그린다.
- 리포트 샘플은 실제 주간 이메일 항목(학습한 날, 문제 수, 정답률, 연속 학습, 완료 단어, 모드별 결과, 어려운 단어)과 같은 모양으로, "Sample" 표시를 붙인다. 발송은 **월요일 아침**(일요일 아님).
- 효과 측정 수치(클릭률·전환율)를 셀 도구가 아직 없다 → 어린이 대상이라 쿠키 없는 집계(서버에서 버튼 클릭 수만 세기)를 검토.
