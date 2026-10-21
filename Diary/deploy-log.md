# 배포 일지

다른 컴퓨터에서 "작업시작" 할 때 git pull로 같이 받아지는 파일입니다. 세션 끝에 이어서 기록.

---

## 2026-10-22 — My Koala 아이템 관리 시스템 (관리자용) 1차 배포

### 배경
관리자가 "마이 코알라" 화면에서 코드 수정·배포 없이 새 카테고리·새 아이템을 추가할 수 있게 해달라는 요청.

### 설계 핵심 결정
- 기존 ~250개 아이템(`koala-core.js`의 `ITEMS`, `koala-house.js`의 `D`)은 **한 글자도 안 건드림**. House 일부 아이템은 `parts` 대신 SVG를 그리는 함수(코드)를 들고 있어서 DB 행으로 옮기는 게 불가능했고, 책장/액자/장난감상자 등은 "안에 하위 아이템 고르기" 메타데이터가 있어 이관 중 하나라도 빠뜨리면 조용히 깨질 위험이 컸음.
- 그래서 **D1 DB(`items`, `item_categories` 테이블)에는 관리자가 새로 만든 아이템만 들어가고**, 프런트는 이 DB 아이템을 기존 하드코딩 카탈로그 위에 "추가(merge)"만 함 — 교체 아님.
- House 아이템은 기존에 이미 있던 `/img/house/manifest.json` 이미지 교체 메커니즘을 그대로 재사용(새 드로잉 코드 불필요).
- 캐릭터/스터디룸 새 아이템은 2D 스티커용 사진 + 3D 팝아웃용 사진을 각각 업로드받음(품질 차등 유지).

### 바뀐 파일
- `migrations/0014_koala_items.sql` (신규 — D1 스키마, 원격 적용 완료)
- `worker/index.js` — 공개 조회 API(`/api/items`, `/api/item-categories`, `/api/items/manifest`, `/api/items/image/:key`) + 관리자 CRUD(`/api/admin/items*`, `/api/admin/item-categories*`) + 이미지 업로드(R2)
- `wrangler.jsonc` — R2 바인딩(`ITEM_IMAGES` → 버킷 `koala-study-mate-items`, 원격 버킷 생성 완료)
- `public/js/koala-core.js` — `loadItems()` 등 추가 로더(캐릭터/스터디룸 병합)
- `public/js/koala-house.js` — `loadCatalog()` 추가 로더(House 병합)
- `public/js/koala-art.js` — `registerCustomItem()`: 관리자 아이템을 기존 `ART`/`ROOM_ART` 테이블에 끼워 넣어 렌더링(슬롯별 범용 배치 박스 사용)
- `public/js/koala-house-ui.js` — 카테고리 탭·manifest에 관리자 데이터 병합, 관리자 전용 "+" 버튼
- `public/js/koala-admin-items.js` (신규) — 카테고리 추가 / 아이템 추가·수정 공용 모달
- `public/js/app.js` — 관리자 진입점(카테고리 "+", "+ 아이템 추가", 아이템 상세팝업 "✏️ 수정"), 로더 부트스트랩
- `public/css/style.css`, `public/css/koala-house.css` — 관리자 UI 스타일
- `public/sw.js` — v193
- `package.json` — `db:migrate:items`(:local) 스크립트

### 배포 상태
- 코드 배포 완료(2026-10-22), 원격 D1 마이그레이션 적용 완료, 원격 R2 버킷(`koala-study-mate-items`) 생성 완료.
- 로컬에서 관리자 세션을 직접 만들어 생성/중복거부/수정/비활성화/카테고리추가/이미지 업로드→R2→서빙까지 API 레벨로 전부 확인함.
- **실제 브라우저로는 아직 열어보지 않음** — 다음에 로그인해서 캐릭터/스터디룸/House 화면에서 버튼이 제대로 보이고 눌리는지 꼭 확인할 것.

### 알려진 제한사항 / 남은 과제
1. **House 아이템 수정 버튼 없음** — 추가만 가능. House 상점엔 캐릭터 화면 같은 "탭하면 상세팝업" 구조가 없어서 수정 진입점을 어디에 둘지부터 다시 봐야 함.
2. **새 캐릭터/스터디룸 아이템은 프리미엄 3D 팝아웃 전용 옷장(`KSLOT`/`KBOX`/`K3` 시스템)에 안 나옴** — 그 시스템은 아이템마다 사람이 손으로 좌표를 맞춘 표라 자동화가 안 됨. 3D용 사진은 DB에 저장은 되어 있어서(`image_key`) 나중에 연결 가능.
3. 관리자가 새로 만든 아이템에는 서브아이템 선택 기능(책장 속 책 고르기 등)이 없음 — 의도적 범위 제외.
4. 관리자 폼의 unlock 방식은 "무료/코인"만 지원(스트릭/뱃지 조건은 백엔드는 가능하나 폼 UI 생략) — 필요해지면 폼에 추가.
5. 로컬 테스트용 `.dev.vars`(SESSION_SECRET 더미값)를 만들어 둠 — gitignore 대상이라 git에는 안 올라감, 다른 컴퓨터에서 로컬 테스트하려면 똑같이 하나 만들어야 함.
