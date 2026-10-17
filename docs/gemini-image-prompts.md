# 집 외관 · 정원 3D 이미지 — Gemini 프롬프트

공통 규칙: 한 번에 한 장씩, 정사각형(1:1). 결과는 흰 배경 그대로 보내주시면 배경 제거/크기 맞춤은 제가 처리해요.

**공통 스타일 문구(모든 프롬프트 앞에 붙이기):**
`Cute glossy 3D clay-toy style render, soft rounded shapes, isometric three-quarter view from the front-left, soft studio lighting, subtle contact shadow, isolated on a pure plain white background, no scenery, no text, no watermark, single object centered with margin around it.`

## 집 외관 (6장)
1. cottage — `A cozy small cottage with warm cream walls, red-orange tiled gable roof, round wooden front door, tiny chimney and two small windows.`
2. villa — `A charming single-storey villa with pale yellow walls, terracotta hip roof, arched windows, blue door and a small front porch.`
3. twoStory — `A friendly two-storey family house with light blue walls, dark grey gable roof, white window frames, front door with a small awning and a balcony.`
4. modern — `A modern flat-roof white cube house with large glass windows, wooden accent wall, grey door and a thin overhanging roof slab.`
5. cabin — `A rustic log cabin with brown timber walls, green shingled roof, stone chimney, wooden door and a small porch with a lantern.`
6. castle — `A tiny storybook castle with light grey stone walls, two round towers with pointed pink roofs, a wooden gate, small flags on top.`

## 정원 모양 (6장, 작은 마당 한 조각)
7. lawn — `A small square patch of fresh green lawn grass with a thin soil edge (diorama tile, 3D), a few tiny daisies.`
8. flower — `A small square garden bed full of colorful tulips and daisies on green grass (diorama tile, 3D).`
9. wide — `A wide rectangular lawn tile with a curved stepping-stone path and two small round bushes (diorama tile, 3D).`
10. zen — `A small square zen garden tile with raked pale sand, three smooth grey stones and a tiny bonsai (diorama tile, 3D).`
11. winter — `A small square garden tile covered in white snow with a little snowman and a snow-dusted fir tree (diorama tile, 3D).`
12. autumn — `A small square garden tile with orange and red fallen leaves, a small maple tree and a pumpkin (diorama tile, 3D).`

## 울타리 · 길 (6장)
13. fence — `A short section of white wooden picket fence, 3D, straight diagonal line.`
14. hedge — `A short section of neatly trimmed green hedge with a few tiny flowers, 3D.`
15. stone — `A short section of rounded grey stone wall with moss on top, 3D.`
16. stones path — `A short winding path of flat round grey stepping stones set in grass, 3D tile.`
17. brick path — `A short straight path of red-brown bricks in a herringbone pattern, 3D tile.`
18. plank path — `A short straight boardwalk path of warm wooden planks, 3D tile.`

## 마당 바닥 조각(선택)
19. pond — `A small round blue pond with lily pads and a tiny wooden bridge, diorama tile, 3D.`

## 새 아이템 업그레이드 (docs/ref/*.png 참고 그림을 함께 올리기)

공통: `Use the attached picture as the exact reference for shape, proportions and camera angle (isometric, seen from the front-left, long side running down-right). Redraw it as a cute glossy 3D clay-toy style render with soft rounded shapes and soft studio lighting. Keep the SAME camera angle, the same silhouette and the same colours. Isolated on a pure plain white background, no scenery, no shadow on the ground except a tiny contact shadow, no text, no watermark, single object centered with margin around it.`

20. carCompactRed (빨간 소형차) — `A small red compact hatchback car with round headlights and small wheels.`
21. carCompactYellow (노란 소형차) — `A small yellow compact hatchback car with round headlights and small wheels.`
22. carSedanBlue (파란 중형 세단) — `A blue family sedan with a smooth rounded body, glass windows and four wheels.`
23. carSedanSilver (은색 중형 세단) — `A silver family sedan with a smooth rounded body, glass windows and four wheels.`
24. carSuvGreen (초록 SUV) — `A green SUV with a tall boxy roof, roof rails and chunky wheels.`
25. carSuvWhite (하얀 SUV) — `A white SUV with a tall boxy roof, roof rails and chunky wheels.`
26. carUteOrange (주황 유트) — `An orange pickup ute with a short cabin and an open cargo bed behind it.`
27. carUteGrey (회색 유트) — `A grey pickup ute with a short cabin and an open cargo bed behind it.`
28. garageShelf (차고 선반) — `A garage storage rack: four dark steel posts and three wooden boards (bottom, middle, top), open on all sides, empty.`
29. shoeCabinet (신발장) — `A cream shoe cabinet with two closed doors, small brass handles and four short feet.`
30. toolbox (공구함) — `A red metal toolbox with a grey carry handle on the lid and a silver latch.`
31. contL (큰 수납함) — `A large blue plastic storage container with a lid and a small handle slot.`
32. contM (중간 수납함) — `A medium green plastic storage container with a lid and a small handle slot.`
33. contS (작은 수납함) — `A small yellow plastic storage container with a lid and a small handle slot.`

## 집 · 성 다시 받기 (카메라 고정용 참고 그림)
집 그림이 마당 격자와 어긋나 보이는 이유는 Gemini가 카메라 각도를 매번 다르게 잡기 때문이에요. 아래 참고 그림(회색 블록)을 **같이 올리고** 아래 문구를 쓰면 각도가 고정돼요.
- 집 5종(villa, twoStory, modern, cabin, cottage): `docs/ref/refHouseBlock6x4.png` (6x4칸)
- 동화 성(castle): `docs/ref/refCastleBlock4x4.png` (4x4칸)

**카메라 고정 문구(참고 그림과 함께, 스타일 문구 뒤에 붙이기):**
`Use the attached grey block ONLY as a camera and footprint guide. Redraw the building so that it stands exactly on that block's footprint, with the identical camera: true 2:1 isometric (dimetric) view, orthographic with no perspective, the ground edges run at exactly 26.6 degrees, the front-bottom corner of the building is at the same bottom-centre point as the block, the building is NOT rotated or tilted compared with the block, left wall and right wall both clearly visible. Do not draw the block's ground grid. Plain pure white background.`

**성(castle)만 따로 추가:**
`A complete storybook castle keep seen as a full 3D building, not a flat front gate: it fills the whole square footprint with four round corner towers with pointed pink cone roofs and small flags, grey stone curtain walls on both visible sides (the left wall and the right wall) with battlements, a wooden arched gate on the left wall, a central taller tower with a pink roof behind, visible roof surfaces and wall thickness on both sides.`

받은 그림은 배경 그대로(흰색) 보내주시면 돼요. 이미 마당에서 쓰는 크기에 맞춰 제가 넣어요.
