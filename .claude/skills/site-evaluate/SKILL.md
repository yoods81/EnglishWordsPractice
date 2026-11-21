---
name: site-evaluate
description: Koala Study Mate 사이트를 루브릭(100점)으로 평가한다. 로컬 서버에서 모바일·태블릿·데스크탑 폭과 관리자/무료/프리미엄/비회원 계정으로 화면을 돌려 보고, 접근성·성능을 측정하고, CLAUDE.md 규칙 위반을 찾아 점수와 개선 목록을 보고서로 남긴다. "사이트평가", "사이트 점검", "출시 전 검증" 때 사용.
---

# 사이트 평가 — Koala Study Mate

목표: 고치지 않고 **평가만** 한다. 근거(스크린샷·측정값·파일:줄)가 없는 점수는 쓰지 않는다.

## 0. 준비 (여러 번 실행해도 안전)
1. `bash .claude/skills/browser-test/setup.sh` — 로컬 DB·테스트 계정(admin/paid/free)·playwright-core
2. `npm install --prefix .claude/skills/site-evaluate --no-audit --no-fund` — axe-core (node_modules는 gitignore)
3. 로컬 서버가 꺼져 있으면 `npx wrangler dev --port 8787`을 백그라운드로 켜고 `Ready on`을 기다린다.
4. 원격 DB·배포·`--remote`가 붙은 명령은 절대 실행하지 않는다.

## 1. 평가 기준
`rubric.md`를 읽고 그 순서대로 평가한다. 각 항목: 점수 / 근거 / 고칠 점.

## 2. 자동 측정
```bash
node .claude/skills/site-evaluate/evaluate.mjs eval-out                 # 전체: 4계정 × 3폭 × 공개 페이지 + 앱 탭
node .claude/skills/site-evaluate/evaluate.mjs eval-out --dev=mobile     # 모바일만
node .claude/skills/site-evaluate/evaluate.mjs eval-out --role=none,free --view=quiz,koala
```
- 옵션: `--dev=mobile,tablet,desktop` `--role=none,free,paid,admin` `--view=quiz,spelling,...` `--pages=/,/faq.html` `--no-shots`
- 결과: `eval-out/result.json`(숫자)과 `eval-out/*.png`(스크린샷). `eval-out/`은 gitignore.
- **측정 결과 폴더는 저장소 안 `eval-out/`에만 만든다.** 저장소 밖(`I:\tmp` 등)이나 다른 드라이브에 폴더를 만들지 않는다. 임시 스크립트도 `eval-out/` 안에 둔다.
- result.json 항목: `loadMs`, `overflow`(가로 넘침 px), `smallTargets`(44px 미만 버튼 수·예시), `brokenImages`, `axe`(위반 id·심각도·개수), `errors`(페이지·콘솔 오류)
- `errors`에서 `ERR_TUNNEL_CONNECTION_FAILED`·`ERR_NAME_NOT_RESOLVED`처럼 바깥 주소(구글 폰트·통계 등)를 못 불러온 것은 인터넷이 막힌 환경 탓일 수 있다. `@ 주소`를 보고 사이트 자체 오류와 구분해 적는다.
- 측정만으로 점수를 주지 않는다. **스크린샷을 Read로 직접 보고** 디자인·문구·잘림을 판단한다(모바일 390 폭 우선).

## 3. 손으로 확인 (browser-test 방식)
자동 측정이 못 보는 것은 `.claude/skills/browser-test/lib.mjs`의 `open({ role, width, height })`로 `eval-out/` 안에 임시 스크립트를 써서 확인한다.
- 같은 날 반복 금지: 같은 계정으로 퀴즈 2판을 풀어 나온 단어를 비교
- 하루 제한: 비회원·무료 계정의 남은 문제 수 표시와 제한 도달 화면
- My Koala(캐릭터·방·코인·배지), 코알라 하우스, 내 계정, 오답 노트
- 데이터를 만들거나 바꾸는 테스트는 시작에 `snapshot(p)`, 끝에 `restore(p, snap)`. "전부 삭제" 반복문 금지.

## 4. 규칙 점검 (CLAUDE.md 기준)
- 금지 이모지 검색: `grep -rnE "🎴|🃏|🎲|🍺|🍷|🍸|🎰" public/ --include=*.html --include=*.js`
- 버튼이 아닌 것에 알약 모양·테두리, 카테고리 줄 한 줄+화살표, 내부 스크롤바 여부
- `npm test` 실행 결과

## 5. 보고서
`docs/evaluations/YYYY-MM-DD.md`에 `report-template.md` 형식으로 저장한다(같은 날 두 번째면 `-2`).
꼭 필요한 스크린샷만 `docs/evaluations/img/YYYY-MM-DD/`로 복사해 링크한다.
이전 보고서가 있으면 점수 변화를 비교한다.
사용자에게는 한국어로 총점·영역별 점수·가장 시급한 5가지·확인하지 못한 것만 요약한다.
