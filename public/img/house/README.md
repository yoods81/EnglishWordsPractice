# 내 집 아이템 이미지 교체 (AI 이미지)

`/img/house/manifest.json` 을 만들면 해당 아이템이 SVG 대신 PNG/WebP 이미지로 그려집니다.

```json
{
  "bedBlue": { "src": "/img/house/bedBlue.webp", "wpx": 140, "ratio": 1.1, "ax": 0.5, "ay": 0.92 }
}
```
- 키: `koala-house.js` 의 `D` 카탈로그 아이템 id
- `src`: 배경 투명 PNG/WebP (아이소메트릭, 같은 각도)
- `wpx`: 화면에 그릴 가로 폭(px, 타일 1칸=64px 기준)
- `ratio`: 세로/가로 비율
- `ax`, `ay`: 이미지에서 바닥 앵커 위치(0~1) — 보통 가로 중앙, 아래쪽
manifest에 없는 아이템은 기본 SVG로 그려집니다.

## Extra keys (koala + rotation)
- `koala:back` — koala seen from behind (used when the koala faces away). Until supplied, the front picture is mirrored.
- `koala:sit` — koala sitting pose (on a chair or on the floor). Until supplied, the standing picture is lowered.
- Items rotate in 4 directions (0/90/180/270). One picture per item is fine; supply `id:1`, `id:2`, `id:3` keys for rotated views if you want hand-drawn angles.
