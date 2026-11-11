// 만든 곳: koala-house-3d f00b63a — npm run build:config-lib (src/server/config-lib.ts). 손으로 고치지 않음: 집 앱과 같은 설정 검증(사이트 S12).
// src/data/prices.ts
var PRICES = {
	/** 새 방: 크기별 고정(작은 40칸 이하 · 중간 41~60칸 · 큰 61칸 이상) */
	room: {
		small: 240,
		medium: 360,
		large: 480
	},
	/** 정원 넓히기(앞으로 3줄씩): 한 번에 고정, 최대 max번 */
	garden: {
		each: 120,
		max: 2
	},
	garage: 200,
	/** 집터 넓히기: 한 단계에 고정, 최대 max단계. 되돌리거나 되팔 수 없다 */
	lot: {
		each: 300,
		max: 3
	},
	/** 외관 코인 선택지(앞의 무료 3개는 0). 색은 모두 color */
	look: {
		mat: {
			log: 120,
			stone: 150,
			timber: 180
		},
		roofKind: {
			tile: 120,
			dormer: 150,
			thatch: 150,
			tower: 200
		},
		fenceKind: {
			iron: 120,
			flower: 100,
			bamboo: 100
		},
		/** 마당 길(5단계 H5 — 예전 PATHS) */
		path: { plank: 100 },
		color: 30
	},
	/**
	* 3D 물건: 사이트의 같은 종류 중간 가격. 같은 물건(템플릿)이면 색·크기가 달라도 같은 가격, 하나에 200 이하.
	* 관리 화면에서 손으로 고친 값(priceManual)은 reprice 스크립트가 건너뛴다.
	*/
	item: {
		rug: 70,
		desk: 110,
		light: 90,
		storage: 100,
		frame: 80,
		plant: 60,
		pet: 115,
		toyBox: 120,
		chair: 80,
		table: 90,
		sofa: 150,
		bed: 180,
		wardrobe: 120,
		small: 20,
		tree: 100,
		bush: 60,
		fence: 70,
		lamp: 90,
		bench: 80,
		mailbox: 80,
		fountain: 150,
		slide: 120
	},
	/** 방 벽지·바닥 선택지(5단계 H5): 한 번 사면 어느 방에나 계속 무료. 방 종류 기본은 0 */
	roomDecor: 60,
	/** 되팔기·방 지우기 때 돌려주는 비율(수수료 20%). 관리자는 0 */
	resale: .8
};
/** 게임 안 보상(이 앱이 직접 주는 코인): 모두 고정. 도장 선물은 코인이 아니라 장식 아이템(5개마다 1개) */
var REWARDS = {
	walk: 5,
	quest: 10
};
PRICES.garden.max;
PRICES.lot.max;
// src/engine/recipe.ts
/** 발자국 w×d 안에서 회전. rot 0 = 앞면이 +y, 1 = +x, 2 = -y, 3 = -x */
function rotPoint(x, y, w, d, rot) {
	switch (rot) {
		case 0: return [x, y];
		case 1: return [y, w - x];
		case 2: return [w - x, d - y];
		case 3: return [d - y, x];
	}
}
function rotSize(w, d, rot) {
	return rot % 2 === 0 ? [w, d] : [d, w];
}
var rp = (p, w, d, rot) => {
	const [x, y] = rotPoint(p[0], p[1], w, d, rot);
	return [
		x,
		y,
		p[2]
	];
};
/** 수평 방향 벡터 회전(rotPoint와 같은 회전) */
function rotDir(x, y, rot) {
	switch (rot) {
		case 0: return [x, y];
		case 1: return [y, -x];
		case 2: return [-x, -y];
		case 3: return [-y, x];
	}
}
function rotateShape(s, w, d, rot) {
	if (rot === 0) return s;
	if ("n" in s && s.n) s = {
		...s,
		n: rotDir(s.n[0], s.n[1], rot)
	};
	switch (s.t) {
		case "box": {
			const [ax, ay] = rotPoint(s.x0, s.y0, w, d, rot);
			const [bx, by] = rotPoint(s.x1, s.y1, w, d, rot);
			const out = {
				...s,
				x0: Math.min(ax, bx),
				x1: Math.max(ax, bx),
				y0: Math.min(ay, by),
				y1: Math.max(ay, by)
			};
			if (s.img && rot % 2) {
				if (s.flip) delete out.flip;
				else out.flip = true;
			}
			if (s.picN) {
				const [nx, ny] = rotDir(s.picN[0], s.picN[1], rot);
				out.picN = [
					nx || 0,
					ny || 0,
					s.picN[2]
				];
			}
			return out;
		}
		case "cyl": {
			const [cx, cy] = rotPoint(s.cx, s.cy, w, d, rot);
			return {
				...s,
				cx,
				cy
			};
		}
		case "ell": {
			const [cx, cy] = rotPoint(s.cx, s.cy, w, d, rot);
			if (s.yaw !== void 0) return {
				...s,
				cx,
				cy,
				yaw: s.yaw - rot * Math.PI / 2
			};
			return rot % 2 ? {
				...s,
				cx,
				cy,
				rx: s.ry,
				ry: s.rx
			} : {
				...s,
				cx,
				cy
			};
		}
		case "disc": {
			const [cx, cy] = rotPoint(s.cx, s.cy, w, d, rot);
			const plane = s.plane === "z" || rot % 2 === 0 ? s.plane : s.plane === "x" ? "y" : "x";
			return {
				...s,
				cx,
				cy,
				plane
			};
		}
		case "poly": return {
			...s,
			pts: s.pts.map((p) => rp(p, w, d, rot))
		};
		case "line": return {
			...s,
			pts: s.pts.map((p) => rp(p, w, d, rot))
		};
	}
}
function translateShape(s, dx, dy, dz) {
	const tp = (p) => [
		p[0] + dx,
		p[1] + dy,
		p[2] + dz
	];
	switch (s.t) {
		case "box": return {
			...s,
			x0: s.x0 + dx,
			x1: s.x1 + dx,
			y0: s.y0 + dy,
			y1: s.y1 + dy,
			z0: s.z0 + dz,
			z1: s.z1 + dz
		};
		case "cyl": return {
			...s,
			cx: s.cx + dx,
			cy: s.cy + dy,
			z0: s.z0 + dz,
			z1: s.z1 + dz
		};
		case "ell": return {
			...s,
			cx: s.cx + dx,
			cy: s.cy + dy,
			cz: s.cz + dz
		};
		case "disc": return {
			...s,
			cx: s.cx + dx,
			cy: s.cy + dy,
			cz: s.cz + dz
		};
		case "poly": return {
			...s,
			pts: s.pts.map(tp)
		};
		case "line": return {
			...s,
			pts: s.pts.map(tp)
		};
	}
}
function shapeBounds(s) {
	switch (s.t) {
		case "box": return {
			x0: s.x0,
			y0: s.y0,
			z0: s.z0,
			x1: s.x1,
			y1: s.y1,
			z1: s.z1
		};
		case "cyl": {
			const r = Math.max(s.r0, s.r1);
			return {
				x0: s.cx - r,
				x1: s.cx + r,
				y0: s.cy - r,
				y1: s.cy + r,
				z0: s.z0,
				z1: s.z1
			};
		}
		case "ell": {
			const c = Math.cos(s.yaw ?? 0), n = Math.sin(s.yaw ?? 0);
			const hx = Math.hypot(s.rx * c, s.ry * n), hy = Math.hypot(s.rx * n, s.ry * c);
			return {
				x0: s.cx - hx,
				x1: s.cx + hx,
				y0: s.cy - hy,
				y1: s.cy + hy,
				z0: s.cz - s.rz,
				z1: s.cz + s.rz
			};
		}
		case "disc": {
			const r = s.r;
			return {
				x0: s.plane === "x" ? s.cx : s.cx - r,
				x1: s.plane === "x" ? s.cx : s.cx + r,
				y0: s.plane === "y" ? s.cy : s.cy - r,
				y1: s.plane === "y" ? s.cy : s.cy + r,
				z0: s.plane === "z" ? s.cz : s.cz - r,
				z1: s.plane === "z" ? s.cz : s.cz + r
			};
		}
		case "poly":
		case "line": {
			const b = {
				x0: Infinity,
				y0: Infinity,
				z0: Infinity,
				x1: -Infinity,
				y1: -Infinity,
				z1: -Infinity
			};
			for (const [x, y, z] of s.pts) {
				b.x0 = Math.min(b.x0, x);
				b.x1 = Math.max(b.x1, x);
				b.y0 = Math.min(b.y0, y);
				b.y1 = Math.max(b.y1, y);
				b.z0 = Math.min(b.z0, z);
				b.z1 = Math.max(b.z1, z);
			}
			return b;
		}
	}
}
/** 모든 도형이 상자 안에 있는가 — 벗어난 도형 목록을 돌려준다 */
function outside(r, box, eps = 1e-6) {
	return r.filter((s) => {
		const b = shapeBounds(s);
		return b.x0 < box.x0 - eps || b.y0 < box.y0 - eps || b.z0 < box.z0 - eps || b.x1 > box.x1 + eps || b.y1 > box.y1 + eps || b.z1 > box.z1 + eps;
	});
}
// src/art/palette.ts
var PALETTE = {
	white: "#fbfaf6",
	cream: "#f6ecd6",
	ivory: "#efe6d2",
	butter: "#f7d77c",
	mustard: "#e0a83e",
	peach: "#f6b99a",
	coral: "#ee7f6a",
	pink: "#f3a9b9",
	rose: "#d9748c",
	red: "#d9534f",
	lilac: "#b9a6dd",
	plum: "#8a6aa6",
	sky: "#9fd0ee",
	blue: "#5d9ad6",
	navy: "#3d5b8c",
	mint: "#9fdcc4",
	teal: "#4fb3a5",
	sage: "#a9c49a",
	olive: "#8a9a52",
	green: "#6fb36a",
	grey: "#b9b8b4",
	slate: "#7f8a96",
	charcoal: "#4b4f57",
	black: "#2d2b30",
	oak: "#d9a86c",
	birch: "#ead2a8",
	walnut: "#9c6a45",
	choc: "#6e4a33",
	cherry: "#b5674a",
	brass: "#d8b25a",
	steel: "#c4ccd4",
	glass: "#cfe9f5",
	card: "#d6a86e",
	tape: "#ecd3a2",
	terracotta: "#cf7b55",
	clay: "#e3b48c",
	leaf: "#6fae5c",
	leafDark: "#4f8d4a",
	leafLight: "#9ccb74",
	stem: "#5e8a3c",
	fur: "#a9aab3",
	furDark: "#8a8b96",
	furLight: "#d6d6dc",
	fluff: "#f4f2ee",
	nose: "#3a3742",
	cheek: "#f2a3a8",
	eye: "#2b2930",
	wallA: "#f3dfc4",
	wallB: "#e9cfae",
	wainscot: "#cfe3d4",
	trim: "#fbf6ee",
	floorWood: "#d8ab78",
	floorDark: "#c4925f",
	skyDay: "#bfe6fb",
	sun: "#fff3b8",
	wallOut: "#f1e3cc",
	wallCap: "#8d6e5a",
	grass: "#a6cf7e",
	lawn: "#bfdd8f",
	asphalt: "#9aa0a8",
	paving: "#e6dac6",
	sand: "#ead3a2",
	water: "#8fcbe4",
	soil: "#a87b55",
	roofOrange: "#e08a4a",
	roofBrown: "#9a6a4a",
	lemon: "#f5e9a8",
	roofRed: "#cf7058",
	roofBlue: "#6487b6",
	roofGreen: "#6f9d69",
	roofPlum: "#9a6f9c",
	brick: "#c98b6b",
	gumBark: "#e9e3d6",
	gumLeaf: "#93af86",
	cloud: "#ffffff",
	wombat: "#a2826a",
	wombatLight: "#cdb59f"
};
var items_default = {
	format: "koala-house/items",
	version: 1,
	updatedAt: "2026-10-30T11:54:59.483Z",
	items: [
		{
			"id": "sofa-3-mint",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "mint",
				"leg": "walnut"
			},
			"name": {
				"ko": "민트 소파",
				"en": "mint sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-3-coral",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "coral",
				"leg": "walnut"
			},
			"name": {
				"ko": "코랄 소파",
				"en": "coral sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-3-sky",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "sky",
				"leg": "walnut"
			},
			"name": {
				"ko": "하늘색 소파",
				"en": "sky sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-3-butter",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "butter",
				"leg": "walnut"
			},
			"name": {
				"ko": "버터색 소파",
				"en": "butter sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-3-sage",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "sage",
				"leg": "walnut"
			},
			"name": {
				"ko": "세이지 소파",
				"en": "sage sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-3-lilac",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "lilac",
				"leg": "walnut"
			},
			"name": {
				"ko": "라일락 소파",
				"en": "lilac sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-3-pink",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "pink",
				"leg": "walnut"
			},
			"name": {
				"ko": "분홍 소파",
				"en": "pink sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-3-teal",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "teal",
				"leg": "walnut"
			},
			"name": {
				"ko": "청록 소파",
				"en": "teal sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-3-navy",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "navy",
				"leg": "walnut"
			},
			"name": {
				"ko": "남색 소파",
				"en": "navy sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-3-cream",
			"tpl": "sofa",
			"p": {
				"len": 3,
				"c": "cream",
				"leg": "walnut"
			},
			"name": {
				"ko": "크림 소파",
				"en": "cream sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-1-6-mint",
			"tpl": "sofa",
			"p": {
				"len": 1.6,
				"c": "mint",
				"leg": "walnut"
			},
			"name": {
				"ko": "민트 소파",
				"en": "mint sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-1-6-coral",
			"tpl": "sofa",
			"p": {
				"len": 1.6,
				"c": "coral",
				"leg": "walnut"
			},
			"name": {
				"ko": "코랄 소파",
				"en": "coral sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-1-6-sky",
			"tpl": "sofa",
			"p": {
				"len": 1.6,
				"c": "sky",
				"leg": "walnut"
			},
			"name": {
				"ko": "하늘색 소파",
				"en": "sky sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-1-6-butter",
			"tpl": "sofa",
			"p": {
				"len": 1.6,
				"c": "butter",
				"leg": "walnut"
			},
			"name": {
				"ko": "버터색 소파",
				"en": "butter sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-1-6-sage",
			"tpl": "sofa",
			"p": {
				"len": 1.6,
				"c": "sage",
				"leg": "walnut"
			},
			"name": {
				"ko": "세이지 소파",
				"en": "sage sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-1-6-lilac",
			"tpl": "sofa",
			"p": {
				"len": 1.6,
				"c": "lilac",
				"leg": "walnut"
			},
			"name": {
				"ko": "라일락 소파",
				"en": "lilac sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-4-mint",
			"tpl": "sofa",
			"p": {
				"len": 4,
				"c": "mint",
				"leg": "walnut"
			},
			"name": {
				"ko": "민트 소파",
				"en": "mint sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-4-coral",
			"tpl": "sofa",
			"p": {
				"len": 4,
				"c": "coral",
				"leg": "walnut"
			},
			"name": {
				"ko": "코랄 소파",
				"en": "coral sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sofa-4-navy",
			"tpl": "sofa",
			"p": {
				"len": 4,
				"c": "navy",
				"leg": "walnut"
			},
			"name": {
				"ko": "남색 소파",
				"en": "navy sofa"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "coffeetable-2-1-oak",
			"tpl": "coffeeTable",
			"p": {
				"w": 2,
				"d": 1,
				"c": "oak"
			},
			"name": {
				"ko": "오크 거실 탁자",
				"en": "oak coffee table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "coffeetable-2-1-birch",
			"tpl": "coffeeTable",
			"p": {
				"w": 2,
				"d": 1,
				"c": "birch"
			},
			"name": {
				"ko": "자작나무 거실 탁자",
				"en": "birch coffee table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "coffeetable-2-1-walnut",
			"tpl": "coffeeTable",
			"p": {
				"w": 2,
				"d": 1,
				"c": "walnut"
			},
			"name": {
				"ko": "호두나무 거실 탁자",
				"en": "walnut coffee table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "coffeetable-2-1-choc",
			"tpl": "coffeeTable",
			"p": {
				"w": 2,
				"d": 1,
				"c": "choc"
			},
			"name": {
				"ko": "초콜릿 거실 탁자",
				"en": "choc coffee table"
			},
			"cat": "table",
			"price": 90,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "coffeetable-2-1-cherry",
			"tpl": "coffeeTable",
			"p": {
				"w": 2,
				"d": 1,
				"c": "cherry"
			},
			"name": {
				"ko": "체리 거실 탁자",
				"en": "cherry coffee table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "coffeetable-1-5-1-oak",
			"tpl": "coffeeTable",
			"p": {
				"w": 1.5,
				"d": 1,
				"c": "oak"
			},
			"name": {
				"ko": "오크 거실 탁자",
				"en": "oak coffee table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "coffeetable-1-5-1-walnut",
			"tpl": "coffeeTable",
			"p": {
				"w": 1.5,
				"d": 1,
				"c": "walnut"
			},
			"name": {
				"ko": "호두나무 거실 탁자",
				"en": "walnut coffee table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sidetable-oak",
			"tpl": "sideTable",
			"p": { "c": "oak" },
			"name": {
				"ko": "오크 둥근 협탁",
				"en": "oak side table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sidetable-birch",
			"tpl": "sideTable",
			"p": { "c": "birch" },
			"name": {
				"ko": "자작나무 둥근 협탁",
				"en": "birch side table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sidetable-walnut",
			"tpl": "sideTable",
			"p": { "c": "walnut" },
			"name": {
				"ko": "호두나무 둥근 협탁",
				"en": "walnut side table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sidetable-choc",
			"tpl": "sideTable",
			"p": { "c": "choc" },
			"name": {
				"ko": "초콜릿 둥근 협탁",
				"en": "choc side table"
			},
			"cat": "table",
			"price": 90,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sidetable-cherry",
			"tpl": "sideTable",
			"p": { "c": "cherry" },
			"name": {
				"ko": "체리 둥근 협탁",
				"en": "cherry side table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "diningtable-oak",
			"tpl": "diningTable",
			"p": { "c": "oak" },
			"name": {
				"ko": "오크 둥근 식탁",
				"en": "oak round table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "diningtable-birch",
			"tpl": "diningTable",
			"p": { "c": "birch" },
			"name": {
				"ko": "자작나무 둥근 식탁",
				"en": "birch round table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "diningtable-walnut",
			"tpl": "diningTable",
			"p": { "c": "walnut" },
			"name": {
				"ko": "호두나무 둥근 식탁",
				"en": "walnut round table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "diningtable-choc",
			"tpl": "diningTable",
			"p": { "c": "choc" },
			"name": {
				"ko": "초콜릿 둥근 식탁",
				"en": "choc round table"
			},
			"cat": "table",
			"price": 90,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "diningtable-cherry",
			"tpl": "diningTable",
			"p": { "c": "cherry" },
			"name": {
				"ko": "체리 둥근 식탁",
				"en": "cherry round table"
			},
			"cat": "table",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "chair-oak-coral",
			"tpl": "chair",
			"p": {
				"c": "oak",
				"seat": "coral"
			},
			"name": {
				"ko": "오크 의자",
				"en": "oak chair"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "chair-oak-teal",
			"tpl": "chair",
			"p": {
				"c": "oak",
				"seat": "teal"
			},
			"name": {
				"ko": "오크 의자",
				"en": "oak chair"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "chair-oak-sky",
			"tpl": "chair",
			"p": {
				"c": "oak",
				"seat": "sky"
			},
			"name": {
				"ko": "오크 의자",
				"en": "oak chair"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "chair-oak-butter",
			"tpl": "chair",
			"p": {
				"c": "oak",
				"seat": "butter"
			},
			"name": {
				"ko": "오크 의자",
				"en": "oak chair"
			},
			"cat": "seat",
			"price": 80,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "chair-oak-sage",
			"tpl": "chair",
			"p": {
				"c": "oak",
				"seat": "sage"
			},
			"name": {
				"ko": "오크 의자",
				"en": "oak chair"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "chair-walnut-coral",
			"tpl": "chair",
			"p": {
				"c": "walnut",
				"seat": "coral"
			},
			"name": {
				"ko": "호두나무 의자",
				"en": "walnut chair"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "chair-walnut-mint",
			"tpl": "chair",
			"p": {
				"c": "walnut",
				"seat": "mint"
			},
			"name": {
				"ko": "호두나무 의자",
				"en": "walnut chair"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "stool-teal-oak",
			"tpl": "stool",
			"p": {
				"c": "teal",
				"leg": "oak"
			},
			"name": {
				"ko": "청록 둥근 의자",
				"en": "teal stool"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "stool-coral-oak",
			"tpl": "stool",
			"p": {
				"c": "coral",
				"leg": "oak"
			},
			"name": {
				"ko": "코랄 둥근 의자",
				"en": "coral stool"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "stool-butter-oak",
			"tpl": "stool",
			"p": {
				"c": "butter",
				"leg": "oak"
			},
			"name": {
				"ko": "버터색 둥근 의자",
				"en": "butter stool"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "stool-lilac-oak",
			"tpl": "stool",
			"p": {
				"c": "lilac",
				"leg": "oak"
			},
			"name": {
				"ko": "라일락 둥근 의자",
				"en": "lilac stool"
			},
			"cat": "seat",
			"price": 80,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "stool-sage-oak",
			"tpl": "stool",
			"p": {
				"c": "sage",
				"leg": "oak"
			},
			"name": {
				"ko": "세이지 둥근 의자",
				"en": "sage stool"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "beanbag-mint",
			"tpl": "beanbag",
			"p": { "c": "mint" },
			"name": {
				"ko": "민트 빈백",
				"en": "mint beanbag"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "beanbag-coral",
			"tpl": "beanbag",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 빈백",
				"en": "coral beanbag"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "beanbag-sky",
			"tpl": "beanbag",
			"p": { "c": "sky" },
			"name": {
				"ko": "하늘색 빈백",
				"en": "sky beanbag"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "beanbag-butter",
			"tpl": "beanbag",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 빈백",
				"en": "butter beanbag"
			},
			"cat": "seat",
			"price": 80,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "beanbag-sage",
			"tpl": "beanbag",
			"p": { "c": "sage" },
			"name": {
				"ko": "세이지 빈백",
				"en": "sage beanbag"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "beanbag-lilac",
			"tpl": "beanbag",
			"p": { "c": "lilac" },
			"name": {
				"ko": "라일락 빈백",
				"en": "lilac beanbag"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "beanbag-pink",
			"tpl": "beanbag",
			"p": { "c": "pink" },
			"name": {
				"ko": "분홍 빈백",
				"en": "pink beanbag"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorcushion-mint",
			"tpl": "floorCushion",
			"p": { "c": "mint" },
			"name": {
				"ko": "민트 방석",
				"en": "mint floor cushion"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorcushion-coral",
			"tpl": "floorCushion",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 방석",
				"en": "coral floor cushion"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorcushion-sky",
			"tpl": "floorCushion",
			"p": { "c": "sky" },
			"name": {
				"ko": "하늘색 방석",
				"en": "sky floor cushion"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorcushion-butter",
			"tpl": "floorCushion",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 방석",
				"en": "butter floor cushion"
			},
			"cat": "seat",
			"price": 80,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorcushion-sage",
			"tpl": "floorCushion",
			"p": { "c": "sage" },
			"name": {
				"ko": "세이지 방석",
				"en": "sage floor cushion"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorcushion-lilac",
			"tpl": "floorCushion",
			"p": { "c": "lilac" },
			"name": {
				"ko": "라일락 방석",
				"en": "lilac floor cushion"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorcushion-pink",
			"tpl": "floorCushion",
			"p": { "c": "pink" },
			"name": {
				"ko": "분홍 방석",
				"en": "pink floor cushion"
			},
			"cat": "seat",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-2-4-oak-cream",
			"tpl": "bookcase",
			"p": {
				"w": 2,
				"h": 4,
				"c": "oak",
				"back": "cream"
			},
			"name": {
				"ko": "오크 책장",
				"en": "oak bookcase"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-2-4-birch-cream",
			"tpl": "bookcase",
			"p": {
				"w": 2,
				"h": 4,
				"c": "birch",
				"back": "cream"
			},
			"name": {
				"ko": "자작나무 책장",
				"en": "birch bookcase"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-2-4-walnut-cream",
			"tpl": "bookcase",
			"p": {
				"w": 2,
				"h": 4,
				"c": "walnut",
				"back": "cream"
			},
			"name": {
				"ko": "호두나무 책장",
				"en": "walnut bookcase"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-2-4-choc-cream",
			"tpl": "bookcase",
			"p": {
				"w": 2,
				"h": 4,
				"c": "choc",
				"back": "cream"
			},
			"name": {
				"ko": "초콜릿 책장",
				"en": "choc bookcase"
			},
			"cat": "storage",
			"price": 100,
			"tier": "premium",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-2-4-cherry-cream",
			"tpl": "bookcase",
			"p": {
				"w": 2,
				"h": 4,
				"c": "cherry",
				"back": "cream"
			},
			"name": {
				"ko": "체리 책장",
				"en": "cherry bookcase"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-1-4-oak-sky",
			"tpl": "bookcase",
			"p": {
				"w": 1,
				"h": 4,
				"c": "oak",
				"back": "sky"
			},
			"name": {
				"ko": "오크 책장",
				"en": "oak bookcase"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-1-4-walnut-sky",
			"tpl": "bookcase",
			"p": {
				"w": 1,
				"h": 4,
				"c": "walnut",
				"back": "sky"
			},
			"name": {
				"ko": "호두나무 책장",
				"en": "walnut bookcase"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desk-2-5-birch-sky",
			"tpl": "desk",
			"p": {
				"w": 2.5,
				"c": "birch",
				"c2": "sky"
			},
			"name": {
				"ko": "자작나무 책상",
				"en": "birch desk"
			},
			"cat": "table",
			"price": 110,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desk-2-5-birch-mint",
			"tpl": "desk",
			"p": {
				"w": 2.5,
				"c": "birch",
				"c2": "mint"
			},
			"name": {
				"ko": "자작나무 책상",
				"en": "birch desk"
			},
			"cat": "table",
			"price": 110,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desk-2-5-birch-pink",
			"tpl": "desk",
			"p": {
				"w": 2.5,
				"c": "birch",
				"c2": "pink"
			},
			"name": {
				"ko": "자작나무 책상",
				"en": "birch desk"
			},
			"cat": "table",
			"price": 110,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desk-2-5-birch-butter",
			"tpl": "desk",
			"p": {
				"w": 2.5,
				"c": "birch",
				"c2": "butter"
			},
			"name": {
				"ko": "자작나무 책상",
				"en": "birch desk"
			},
			"cat": "table",
			"price": 110,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desk-2-walnut-sage",
			"tpl": "desk",
			"p": {
				"w": 2,
				"c": "walnut",
				"c2": "sage"
			},
			"name": {
				"ko": "호두나무 책상",
				"en": "walnut desk"
			},
			"cat": "table",
			"price": 110,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desk-2-walnut-coral",
			"tpl": "desk",
			"p": {
				"w": 2,
				"c": "walnut",
				"c2": "coral"
			},
			"name": {
				"ko": "호두나무 책상",
				"en": "walnut desk"
			},
			"cat": "table",
			"price": 110,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sideboard-2-4-sage-walnut",
			"tpl": "sideboard",
			"p": {
				"w": 2.4,
				"c": "sage",
				"top": "walnut"
			},
			"name": {
				"ko": "세이지 낮은 수납장",
				"en": "sage sideboard"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sideboard-2-4-pink-walnut",
			"tpl": "sideboard",
			"p": {
				"w": 2.4,
				"c": "pink",
				"top": "walnut"
			},
			"name": {
				"ko": "분홍 낮은 수납장",
				"en": "pink sideboard"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sideboard-2-4-sky-walnut",
			"tpl": "sideboard",
			"p": {
				"w": 2.4,
				"c": "sky",
				"top": "walnut"
			},
			"name": {
				"ko": "하늘색 낮은 수납장",
				"en": "sky sideboard"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sideboard-2-4-butter-walnut",
			"tpl": "sideboard",
			"p": {
				"w": 2.4,
				"c": "butter",
				"top": "walnut"
			},
			"name": {
				"ko": "버터색 낮은 수납장",
				"en": "butter sideboard"
			},
			"cat": "storage",
			"price": 100,
			"tier": "premium",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sideboard-2-4-mint-walnut",
			"tpl": "sideboard",
			"p": {
				"w": 2.4,
				"c": "mint",
				"top": "walnut"
			},
			"name": {
				"ko": "민트 낮은 수납장",
				"en": "mint sideboard"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sideboard-2-4-cream-walnut",
			"tpl": "sideboard",
			"p": {
				"w": 2.4,
				"c": "cream",
				"top": "walnut"
			},
			"name": {
				"ko": "크림 낮은 수납장",
				"en": "cream sideboard"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sideboard-2-4-coral-walnut",
			"tpl": "sideboard",
			"p": {
				"w": 2.4,
				"c": "coral",
				"top": "walnut"
			},
			"name": {
				"ko": "코랄 낮은 수납장",
				"en": "coral sideboard"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sideboard-2-4-navy-walnut",
			"tpl": "sideboard",
			"p": {
				"w": 2.4,
				"c": "navy",
				"top": "walnut"
			},
			"name": {
				"ko": "남색 낮은 수납장",
				"en": "navy sideboard"
			},
			"cat": "storage",
			"price": 100,
			"tier": "premium",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sideboard-1-6-cream-oak",
			"tpl": "sideboard",
			"p": {
				"w": 1.6,
				"c": "cream",
				"top": "oak"
			},
			"name": {
				"ko": "크림 낮은 수납장",
				"en": "cream sideboard"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dresser-2-sage-oak",
			"tpl": "dresser",
			"p": {
				"w": 2,
				"c": "sage",
				"top": "oak"
			},
			"name": {
				"ko": "세이지 서랍장",
				"en": "sage dresser"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dresser-2-pink-oak",
			"tpl": "dresser",
			"p": {
				"w": 2,
				"c": "pink",
				"top": "oak"
			},
			"name": {
				"ko": "분홍 서랍장",
				"en": "pink dresser"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dresser-2-sky-oak",
			"tpl": "dresser",
			"p": {
				"w": 2,
				"c": "sky",
				"top": "oak"
			},
			"name": {
				"ko": "하늘색 서랍장",
				"en": "sky dresser"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dresser-2-butter-oak",
			"tpl": "dresser",
			"p": {
				"w": 2,
				"c": "butter",
				"top": "oak"
			},
			"name": {
				"ko": "버터색 서랍장",
				"en": "butter dresser"
			},
			"cat": "storage",
			"price": 100,
			"tier": "premium",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dresser-2-mint-oak",
			"tpl": "dresser",
			"p": {
				"w": 2,
				"c": "mint",
				"top": "oak"
			},
			"name": {
				"ko": "민트 서랍장",
				"en": "mint dresser"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dresser-2-cream-oak",
			"tpl": "dresser",
			"p": {
				"w": 2,
				"c": "cream",
				"top": "oak"
			},
			"name": {
				"ko": "크림 서랍장",
				"en": "cream dresser"
			},
			"cat": "storage",
			"price": 100,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "windowbench-2-5-trim-teal",
			"tpl": "windowBench",
			"p": {
				"w": 2.5,
				"c": "trim",
				"c2": "teal"
			},
			"name": {
				"ko": "창가 벤치",
				"en": "trim window bench"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "windowbench-2-5-trim-coral",
			"tpl": "windowBench",
			"p": {
				"w": 2.5,
				"c": "trim",
				"c2": "coral"
			},
			"name": {
				"ko": "창가 벤치",
				"en": "trim window bench"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "windowbench-2-5-trim-butter",
			"tpl": "windowBench",
			"p": {
				"w": 2.5,
				"c": "trim",
				"c2": "butter"
			},
			"name": {
				"ko": "창가 벤치",
				"en": "trim window bench"
			},
			"cat": "seat",
			"price": 150,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "windowbench-2-5-trim-sage",
			"tpl": "windowBench",
			"p": {
				"w": 2.5,
				"c": "trim",
				"c2": "sage"
			},
			"name": {
				"ko": "창가 벤치",
				"en": "trim window bench"
			},
			"cat": "seat",
			"price": 150,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorlamp-butter",
			"tpl": "floorLamp",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 스탠드 조명",
				"en": "butter floor lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorlamp-cream",
			"tpl": "floorLamp",
			"p": { "c": "cream" },
			"name": {
				"ko": "크림 스탠드 조명",
				"en": "cream floor lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorlamp-coral",
			"tpl": "floorLamp",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 스탠드 조명",
				"en": "coral floor lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorlamp-sky",
			"tpl": "floorLamp",
			"p": { "c": "sky" },
			"name": {
				"ko": "하늘색 스탠드 조명",
				"en": "sky floor lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "floorlamp-sage",
			"tpl": "floorLamp",
			"p": { "c": "sage" },
			"name": {
				"ko": "세이지 스탠드 조명",
				"en": "sage floor lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantbig-terracotta-leaf-bush-1",
			"tpl": "plantBig",
			"p": {
				"pot": "terracotta",
				"leaf": "leaf",
				"kind": "bush",
				"seed": 1
			},
			"name": {
				"ko": "테라코타 큰 화분",
				"en": "terracotta big plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantbig-cream-leaf-bush-1",
			"tpl": "plantBig",
			"p": {
				"pot": "cream",
				"leaf": "leaf",
				"kind": "bush",
				"seed": 1
			},
			"name": {
				"ko": "크림 큰 화분",
				"en": "cream big plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantbig-sky-leaf-bush-1",
			"tpl": "plantBig",
			"p": {
				"pot": "sky",
				"leaf": "leaf",
				"kind": "bush",
				"seed": 1
			},
			"name": {
				"ko": "하늘색 큰 화분",
				"en": "sky big plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantbig-white-leaf-bush-1",
			"tpl": "plantBig",
			"p": {
				"pot": "white",
				"leaf": "leaf",
				"kind": "bush",
				"seed": 1
			},
			"name": {
				"ko": "흰 큰 화분",
				"en": "white big plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "premium",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantbig-terracotta-leaf-tall-4",
			"tpl": "plantBig",
			"p": {
				"pot": "terracotta",
				"leaf": "leaf",
				"kind": "tall",
				"seed": 4
			},
			"name": {
				"ko": "테라코타 큰 화분",
				"en": "terracotta big plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantbig-cream-leaf-tall-4",
			"tpl": "plantBig",
			"p": {
				"pot": "cream",
				"leaf": "leaf",
				"kind": "tall",
				"seed": 4
			},
			"name": {
				"ko": "크림 큰 화분",
				"en": "cream big plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantbig-charcoal-leaf-tall-4",
			"tpl": "plantBig",
			"p": {
				"pot": "charcoal",
				"leaf": "leaf",
				"kind": "tall",
				"seed": 4
			},
			"name": {
				"ko": "숯색 큰 화분",
				"en": "charcoal big plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-white-leaf-round",
			"tpl": "plantSmall",
			"p": {
				"pot": "white",
				"leaf": "leaf",
				"kind": "round"
			},
			"name": {
				"ko": "흰 작은 화분",
				"en": "white small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-sky-leaf-round",
			"tpl": "plantSmall",
			"p": {
				"pot": "sky",
				"leaf": "leaf",
				"kind": "round"
			},
			"name": {
				"ko": "하늘색 작은 화분",
				"en": "sky small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-pink-leaf-round",
			"tpl": "plantSmall",
			"p": {
				"pot": "pink",
				"leaf": "leaf",
				"kind": "round"
			},
			"name": {
				"ko": "분홍 작은 화분",
				"en": "pink small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-teal-leaf-round",
			"tpl": "plantSmall",
			"p": {
				"pot": "teal",
				"leaf": "leaf",
				"kind": "round"
			},
			"name": {
				"ko": "청록 작은 화분",
				"en": "teal small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "premium",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-butter-leaf-round",
			"tpl": "plantSmall",
			"p": {
				"pot": "butter",
				"leaf": "leaf",
				"kind": "round"
			},
			"name": {
				"ko": "버터색 작은 화분",
				"en": "butter small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-white-leaf-cactus",
			"tpl": "plantSmall",
			"p": {
				"pot": "white",
				"leaf": "leaf",
				"kind": "cactus"
			},
			"name": {
				"ko": "흰 작은 화분",
				"en": "white small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-terracotta-leaf-cactus",
			"tpl": "plantSmall",
			"p": {
				"pot": "terracotta",
				"leaf": "leaf",
				"kind": "cactus"
			},
			"name": {
				"ko": "테라코타 작은 화분",
				"en": "terracotta small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-pink-leaf-cactus",
			"tpl": "plantSmall",
			"p": {
				"pot": "pink",
				"leaf": "leaf",
				"kind": "cactus"
			},
			"name": {
				"ko": "분홍 작은 화분",
				"en": "pink small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "premium",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-terracotta-leaf-flower",
			"tpl": "plantSmall",
			"p": {
				"pot": "terracotta",
				"leaf": "leaf",
				"kind": "flower"
			},
			"name": {
				"ko": "테라코타 작은 화분",
				"en": "terracotta small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-white-leaf-flower",
			"tpl": "plantSmall",
			"p": {
				"pot": "white",
				"leaf": "leaf",
				"kind": "flower"
			},
			"name": {
				"ko": "흰 작은 화분",
				"en": "white small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantsmall-sky-leaf-flower",
			"tpl": "plantSmall",
			"p": {
				"pot": "sky",
				"leaf": "leaf",
				"kind": "flower"
			},
			"name": {
				"ko": "하늘색 작은 화분",
				"en": "sky small plant"
			},
			"cat": "plant",
			"price": 60,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "books-1-3-coral-navy-butter-teal-cream-plum-sage",
			"tpl": "books",
			"p": {
				"w": 1,
				"seed": 3,
				"cols": "coral,navy,butter,teal,cream,plum,sage"
			},
			"name": {
				"ko": "책 한 줄",
				"en": "Books"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "books-0-5-5-teal-butter-coral-cream",
			"tpl": "books",
			"p": {
				"w": .5,
				"seed": 5,
				"cols": "teal,butter,coral,cream"
			},
			"name": {
				"ko": "책 한 줄",
				"en": "Books"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "books-1-8-pink-sky-mint-lilac",
			"tpl": "books",
			"p": {
				"w": 1,
				"seed": 8,
				"cols": "pink,sky,mint,lilac"
			},
			"name": {
				"ko": "책 한 줄",
				"en": "Books"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookstack-teal-butter-coral",
			"tpl": "bookStack",
			"p": {
				"a": "teal",
				"b": "butter",
				"c": "coral"
			},
			"name": {
				"ko": "코랄 쌓인 책",
				"en": "coral book stack"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookstack-navy-cream-teal",
			"tpl": "bookStack",
			"p": {
				"a": "navy",
				"b": "cream",
				"c": "teal"
			},
			"name": {
				"ko": "청록 쌓인 책",
				"en": "teal book stack"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookstack-pink-sky-sage",
			"tpl": "bookStack",
			"p": {
				"a": "pink",
				"b": "sky",
				"c": "sage"
			},
			"name": {
				"ko": "세이지 쌓인 책",
				"en": "sage book stack"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desklamp-coral",
			"tpl": "deskLamp",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 책상 조명",
				"en": "coral desk lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desklamp-teal",
			"tpl": "deskLamp",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 책상 조명",
				"en": "teal desk lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desklamp-butter",
			"tpl": "deskLamp",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 책상 조명",
				"en": "butter desk lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desklamp-navy",
			"tpl": "deskLamp",
			"p": { "c": "navy" },
			"name": {
				"ko": "남색 책상 조명",
				"en": "navy desk lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desklamp-pink",
			"tpl": "deskLamp",
			"p": { "c": "pink" },
			"name": {
				"ko": "분홍 책상 조명",
				"en": "pink desk lamp"
			},
			"cat": "light",
			"price": 90,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mug-white",
			"tpl": "mug",
			"p": { "c": "white" },
			"name": {
				"ko": "흰 머그컵",
				"en": "white mug"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mug-sky",
			"tpl": "mug",
			"p": { "c": "sky" },
			"name": {
				"ko": "하늘색 머그컵",
				"en": "sky mug"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mug-pink",
			"tpl": "mug",
			"p": { "c": "pink" },
			"name": {
				"ko": "분홍 머그컵",
				"en": "pink mug"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mug-teal",
			"tpl": "mug",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 머그컵",
				"en": "teal mug"
			},
			"cat": "small",
			"price": 20,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mug-butter",
			"tpl": "mug",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 머그컵",
				"en": "butter mug"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mug-coral",
			"tpl": "mug",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 머그컵",
				"en": "coral mug"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mug-navy",
			"tpl": "mug",
			"p": { "c": "navy" },
			"name": {
				"ko": "남색 머그컵",
				"en": "navy mug"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mug-mint",
			"tpl": "mug",
			"p": { "c": "mint" },
			"name": {
				"ko": "민트 머그컵",
				"en": "mint mug"
			},
			"cat": "small",
			"price": 20,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "teapot-white",
			"tpl": "teapot",
			"p": { "c": "white" },
			"name": {
				"ko": "흰 찻주전자",
				"en": "white teapot"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "teapot-sky",
			"tpl": "teapot",
			"p": { "c": "sky" },
			"name": {
				"ko": "하늘색 찻주전자",
				"en": "sky teapot"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "teapot-pink",
			"tpl": "teapot",
			"p": { "c": "pink" },
			"name": {
				"ko": "분홍 찻주전자",
				"en": "pink teapot"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "teapot-teal",
			"tpl": "teapot",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 찻주전자",
				"en": "teal teapot"
			},
			"cat": "small",
			"price": 20,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "teapot-butter",
			"tpl": "teapot",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 찻주전자",
				"en": "butter teapot"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fruitbowl-cream",
			"tpl": "fruitBowl",
			"p": { "c": "cream" },
			"name": {
				"ko": "크림 과일 그릇",
				"en": "cream fruit bowl"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fruitbowl-sky",
			"tpl": "fruitBowl",
			"p": { "c": "sky" },
			"name": {
				"ko": "하늘색 과일 그릇",
				"en": "sky fruit bowl"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fruitbowl-pink",
			"tpl": "fruitBowl",
			"p": { "c": "pink" },
			"name": {
				"ko": "분홍 과일 그릇",
				"en": "pink fruit bowl"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fruitbowl-teal",
			"tpl": "fruitBowl",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 과일 그릇",
				"en": "teal fruit bowl"
			},
			"cat": "small",
			"price": 20,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "vase-teal-pink-butter-coral",
			"tpl": "vase",
			"p": {
				"c": "teal",
				"f1": "pink",
				"f2": "butter",
				"f3": "coral"
			},
			"name": {
				"ko": "청록 꽃병",
				"en": "teal vase"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "vase-navy-pink-butter-coral",
			"tpl": "vase",
			"p": {
				"c": "navy",
				"f1": "pink",
				"f2": "butter",
				"f3": "coral"
			},
			"name": {
				"ko": "남색 꽃병",
				"en": "navy vase"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "vase-white-pink-butter-coral",
			"tpl": "vase",
			"p": {
				"c": "white",
				"f1": "pink",
				"f2": "butter",
				"f3": "coral"
			},
			"name": {
				"ko": "흰 꽃병",
				"en": "white vase"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "vase-coral-pink-butter-coral",
			"tpl": "vase",
			"p": {
				"c": "coral",
				"f1": "pink",
				"f2": "butter",
				"f3": "coral"
			},
			"name": {
				"ko": "코랄 꽃병",
				"en": "coral vase"
			},
			"cat": "small",
			"price": 20,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "vase-butter-pink-butter-coral",
			"tpl": "vase",
			"p": {
				"c": "butter",
				"f1": "pink",
				"f2": "butter",
				"f3": "coral"
			},
			"name": {
				"ko": "버터색 꽃병",
				"en": "butter vase"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "radio-mint",
			"tpl": "radio",
			"p": { "c": "mint" },
			"name": {
				"ko": "민트 라디오",
				"en": "mint radio"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "radio-coral",
			"tpl": "radio",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 라디오",
				"en": "coral radio"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "radio-butter",
			"tpl": "radio",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 라디오",
				"en": "butter radio"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "radio-sky",
			"tpl": "radio",
			"p": { "c": "sky" },
			"name": {
				"ko": "하늘색 라디오",
				"en": "sky radio"
			},
			"cat": "small",
			"price": 20,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "photoframe-walnut-sky",
			"tpl": "photoFrame",
			"p": {
				"c": "walnut",
				"art": "sky"
			},
			"name": {
				"ko": "호두나무 사진 액자",
				"en": "walnut photo frame"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "photoframe-coral-sky",
			"tpl": "photoFrame",
			"p": {
				"c": "coral",
				"art": "sky"
			},
			"name": {
				"ko": "코랄 사진 액자",
				"en": "coral photo frame"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "photoframe-teal-sky",
			"tpl": "photoFrame",
			"p": {
				"c": "teal",
				"art": "sky"
			},
			"name": {
				"ko": "청록 사진 액자",
				"en": "teal photo frame"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "photoframe-oak-sky",
			"tpl": "photoFrame",
			"p": {
				"c": "oak",
				"art": "sky"
			},
			"name": {
				"ko": "오크 사진 액자",
				"en": "oak photo frame"
			},
			"cat": "small",
			"price": 20,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pencilcup-navy",
			"tpl": "pencilCup",
			"p": { "c": "navy" },
			"name": {
				"ko": "남색 연필꽂이",
				"en": "navy pencil cup"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pencilcup-coral",
			"tpl": "pencilCup",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 연필꽂이",
				"en": "coral pencil cup"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pencilcup-teal",
			"tpl": "pencilCup",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 연필꽂이",
				"en": "teal pencil cup"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-mint",
			"tpl": "pillow",
			"p": { "c": "mint" },
			"name": {
				"ko": "민트 쿠션",
				"en": "mint pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-coral",
			"tpl": "pillow",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 쿠션",
				"en": "coral pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-sky",
			"tpl": "pillow",
			"p": { "c": "sky" },
			"name": {
				"ko": "하늘색 쿠션",
				"en": "sky pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-butter",
			"tpl": "pillow",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 쿠션",
				"en": "butter pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-sage",
			"tpl": "pillow",
			"p": { "c": "sage" },
			"name": {
				"ko": "세이지 쿠션",
				"en": "sage pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-lilac",
			"tpl": "pillow",
			"p": { "c": "lilac" },
			"name": {
				"ko": "라일락 쿠션",
				"en": "lilac pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-pink",
			"tpl": "pillow",
			"p": { "c": "pink" },
			"name": {
				"ko": "분홍 쿠션",
				"en": "pink pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-teal",
			"tpl": "pillow",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 쿠션",
				"en": "teal pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-navy",
			"tpl": "pillow",
			"p": { "c": "navy" },
			"name": {
				"ko": "남색 쿠션",
				"en": "navy pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pillow-cream",
			"tpl": "pillow",
			"p": { "c": "cream" },
			"name": {
				"ko": "크림 쿠션",
				"en": "cream pillow"
			},
			"cat": "small",
			"price": 20,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "blocks",
			"tpl": "blocks",
			"p": {},
			"name": {
				"ko": "쌓기 블록",
				"en": "Blocks"
			},
			"cat": "toy",
			"price": 20,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "ball-coral",
			"tpl": "ball",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 공",
				"en": "coral ball"
			},
			"cat": "toy",
			"price": 20,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "ball-teal",
			"tpl": "ball",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 공",
				"en": "teal ball"
			},
			"cat": "toy",
			"price": 20,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "ball-butter",
			"tpl": "ball",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 공",
				"en": "butter ball"
			},
			"cat": "toy",
			"price": 20,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "ball-sky",
			"tpl": "ball",
			"p": { "c": "sky" },
			"name": {
				"ko": "하늘색 공",
				"en": "sky ball"
			},
			"cat": "toy",
			"price": 20,
			"tier": "premium",
			"tags": ["play"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "movingbox-1",
			"tpl": "movingBox",
			"p": { "s": 1 },
			"name": {
				"ko": "이삿짐 상자",
				"en": "Moving box"
			},
			"cat": "box",
			"price": 20,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "movingbox-0-8",
			"tpl": "movingBox",
			"p": { "s": .8 },
			"name": {
				"ko": "이삿짐 상자",
				"en": "Moving box"
			},
			"cat": "box",
			"price": 20,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "movingbox-0-5",
			"tpl": "movingBox",
			"p": { "s": .5 },
			"name": {
				"ko": "이삿짐 상자",
				"en": "Moving box"
			},
			"cat": "box",
			"price": 20,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-1-1-2-walnut-hills",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "hills"
			},
			"name": {
				"ko": "호두나무 그림 액자",
				"en": "walnut picture"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-1-1-2-walnut-tree",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "tree"
			},
			"name": {
				"ko": "호두나무 그림 액자",
				"en": "walnut picture"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-1-1-2-walnut-stripes",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "stripes"
			},
			"name": {
				"ko": "호두나무 그림 액자",
				"en": "walnut picture"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-1-1-2-walnut-sun",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "sun"
			},
			"name": {
				"ko": "호두나무 그림 액자",
				"en": "walnut picture"
			},
			"cat": "wall",
			"price": 80,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-0-8-0-8-cream-hills",
			"tpl": "frame",
			"p": {
				"w": .8,
				"h": .8,
				"c": "cream",
				"art": "hills"
			},
			"name": {
				"ko": "크림 그림 액자",
				"en": "cream picture"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-0-8-0-8-cream-tree",
			"tpl": "frame",
			"p": {
				"w": .8,
				"h": .8,
				"c": "cream",
				"art": "tree"
			},
			"name": {
				"ko": "크림 그림 액자",
				"en": "cream picture"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-0-8-0-8-cream-sun",
			"tpl": "frame",
			"p": {
				"w": .8,
				"h": .8,
				"c": "cream",
				"art": "sun"
			},
			"name": {
				"ko": "크림 그림 액자",
				"en": "cream picture"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-0-5-0-7-coral-tree",
			"tpl": "frame",
			"p": {
				"w": .5,
				"h": .7,
				"c": "coral",
				"art": "tree"
			},
			"name": {
				"ko": "코랄 그림 액자",
				"en": "coral picture"
			},
			"cat": "wall",
			"price": 80,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-0-5-0-7-coral-sun",
			"tpl": "frame",
			"p": {
				"w": .5,
				"h": .7,
				"c": "coral",
				"art": "sun"
			},
			"name": {
				"ko": "코랄 그림 액자",
				"en": "coral picture"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "clock-coral",
			"tpl": "clock",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 벽시계",
				"en": "coral clock"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "clock-teal",
			"tpl": "clock",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 벽시계",
				"en": "teal clock"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "clock-butter",
			"tpl": "clock",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 벽시계",
				"en": "butter clock"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "clock-navy",
			"tpl": "clock",
			"p": { "c": "navy" },
			"name": {
				"ko": "남색 벽시계",
				"en": "navy clock"
			},
			"cat": "wall",
			"price": 80,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bunting-2-8-coral-butter-teal-pink-sky",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "coral,butter,teal,pink,sky"
			},
			"name": {
				"ko": "깃발 장식",
				"en": "Bunting"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bunting-2-mint-lilac-butter",
			"tpl": "bunting",
			"p": {
				"w": 2,
				"cols": "mint,lilac,butter"
			},
			"name": {
				"ko": "깃발 장식",
				"en": "Bunting"
			},
			"cat": "wall",
			"price": 80,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "wallshelf-2-oak",
			"tpl": "wallShelf",
			"p": {
				"w": 2,
				"c": "oak"
			},
			"name": {
				"ko": "오크 벽 선반",
				"en": "oak wall shelf"
			},
			"cat": "wall",
			"price": 100,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "wallshelf-2-birch",
			"tpl": "wallShelf",
			"p": {
				"w": 2,
				"c": "birch"
			},
			"name": {
				"ko": "자작나무 벽 선반",
				"en": "birch wall shelf"
			},
			"cat": "wall",
			"price": 100,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "wallshelf-2-walnut",
			"tpl": "wallShelf",
			"p": {
				"w": 2,
				"c": "walnut"
			},
			"name": {
				"ko": "호두나무 벽 선반",
				"en": "walnut wall shelf"
			},
			"cat": "wall",
			"price": 100,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rugrect-6-4-cream-coral-teal",
			"tpl": "rugRect",
			"p": {
				"w": 6,
				"d": 4,
				"c": "cream",
				"c2": "coral",
				"c3": "teal"
			},
			"name": {
				"ko": "크림 네모 깔개",
				"en": "cream rug"
			},
			"cat": "rug",
			"price": 70,
			"tier": "free",
			"tags": ["cozy"],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rugrect-4-3-sky-navy-cream",
			"tpl": "rugRect",
			"p": {
				"w": 4,
				"d": 3,
				"c": "sky",
				"c2": "navy",
				"c3": "cream"
			},
			"name": {
				"ko": "하늘색 네모 깔개",
				"en": "sky rug"
			},
			"cat": "rug",
			"price": 70,
			"tier": "free",
			"tags": ["cozy"],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rugrect-3-2-pink-plum-cream",
			"tpl": "rugRect",
			"p": {
				"w": 3,
				"d": 2,
				"c": "pink",
				"c2": "plum",
				"c3": "cream"
			},
			"name": {
				"ko": "분홍 네모 깔개",
				"en": "pink rug"
			},
			"cat": "rug",
			"price": 70,
			"tier": "free",
			"tags": ["cozy"],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rugrect-4-2-sage-cream-mustard",
			"tpl": "rugRect",
			"p": {
				"w": 4,
				"d": 2,
				"c": "sage",
				"c2": "cream",
				"c3": "mustard"
			},
			"name": {
				"ko": "세이지 네모 깔개",
				"en": "sage rug"
			},
			"cat": "rug",
			"price": 70,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "ruground-1-7-sage-cream-mustard",
			"tpl": "rugRound",
			"p": {
				"r": 1.7,
				"c": "sage",
				"c2": "cream",
				"c3": "mustard"
			},
			"name": {
				"ko": "세이지 둥근 깔개",
				"en": "sage round rug"
			},
			"cat": "rug",
			"price": 70,
			"tier": "free",
			"tags": ["cozy"],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "ruground-1-2-lilac-cream-pink",
			"tpl": "rugRound",
			"p": {
				"r": 1.2,
				"c": "lilac",
				"c2": "cream",
				"c3": "pink"
			},
			"name": {
				"ko": "라일락 둥근 깔개",
				"en": "lilac round rug"
			},
			"cat": "rug",
			"price": 70,
			"tier": "free",
			"tags": ["cozy"],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "ruground-1-butter-cream-coral",
			"tpl": "rugRound",
			"p": {
				"r": 1,
				"c": "butter",
				"c2": "cream",
				"c3": "coral"
			},
			"name": {
				"ko": "버터색 둥근 깔개",
				"en": "butter round rug"
			},
			"cat": "rug",
			"price": 70,
			"tier": "free",
			"tags": ["cozy"],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bed-oak-white-sky",
			"tpl": "bed",
			"p": {
				"c": "oak",
				"sheet": "white",
				"blanket": "sky"
			},
			"name": {
				"ko": "오크 침대",
				"en": "oak bed"
			},
			"cat": "seat",
			"price": 180,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": ["bedroom"],
			"tplVersion": 1
		},
		{
			"id": "bed-oak-white-pink",
			"tpl": "bed",
			"p": {
				"c": "oak",
				"sheet": "white",
				"blanket": "pink"
			},
			"name": {
				"ko": "오크 침대",
				"en": "oak bed"
			},
			"cat": "seat",
			"price": 180,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": ["bedroom"],
			"tplVersion": 1
		},
		{
			"id": "bed-oak-white-mint",
			"tpl": "bed",
			"p": {
				"c": "oak",
				"sheet": "white",
				"blanket": "mint"
			},
			"name": {
				"ko": "오크 침대",
				"en": "oak bed"
			},
			"cat": "seat",
			"price": 180,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": ["bedroom"],
			"tplVersion": 1
		},
		{
			"id": "bed-oak-white-butter",
			"tpl": "bed",
			"p": {
				"c": "oak",
				"sheet": "white",
				"blanket": "butter"
			},
			"name": {
				"ko": "오크 침대",
				"en": "oak bed"
			},
			"cat": "seat",
			"price": 180,
			"tier": "premium",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": ["bedroom"],
			"tplVersion": 1
		},
		{
			"id": "bed-oak-white-lilac",
			"tpl": "bed",
			"p": {
				"c": "oak",
				"sheet": "white",
				"blanket": "lilac"
			},
			"name": {
				"ko": "오크 침대",
				"en": "oak bed"
			},
			"cat": "seat",
			"price": 180,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": ["bedroom"],
			"tplVersion": 1
		},
		{
			"id": "wardrobe-cream-oak",
			"tpl": "wardrobe",
			"p": {
				"c": "cream",
				"top": "oak"
			},
			"name": {
				"ko": "크림 옷장",
				"en": "cream wardrobe"
			},
			"cat": "storage",
			"price": 120,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": ["bedroom"],
			"tplVersion": 1
		},
		{
			"id": "wardrobe-sage-oak",
			"tpl": "wardrobe",
			"p": {
				"c": "sage",
				"top": "oak"
			},
			"name": {
				"ko": "세이지 옷장",
				"en": "sage wardrobe"
			},
			"cat": "storage",
			"price": 120,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": ["bedroom"],
			"tplVersion": 1
		},
		{
			"id": "wardrobe-sky-oak",
			"tpl": "wardrobe",
			"p": {
				"c": "sky",
				"top": "oak"
			},
			"name": {
				"ko": "하늘색 옷장",
				"en": "sky wardrobe"
			},
			"cat": "storage",
			"price": 120,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": ["bedroom"],
			"tplVersion": 1
		},
		{
			"id": "wardrobe-pink-oak",
			"tpl": "wardrobe",
			"p": {
				"c": "pink",
				"top": "oak"
			},
			"name": {
				"ko": "분홍 옷장",
				"en": "pink wardrobe"
			},
			"cat": "storage",
			"price": 120,
			"tier": "premium",
			"tags": ["study"],
			"place": "floor",
			"rooms": ["bedroom"],
			"tplVersion": 1
		},
		{
			"id": "gumtree-1",
			"tpl": "gumTree",
			"p": {
				"seed": 1,
				"k": 1.5
			},
			"name": {
				"ko": "유칼립투스 나무",
				"en": "Gum tree"
			},
			"cat": "outdoor",
			"price": 100,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "gumtree-5",
			"tpl": "gumTree",
			"p": {
				"seed": 5,
				"k": 1.5
			},
			"name": {
				"ko": "유칼립투스 나무",
				"en": "Gum tree"
			},
			"cat": "outdoor",
			"price": 100,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "roundtree-leaf",
			"tpl": "roundTree",
			"p": {
				"leaf": "leaf",
				"k": 1.5
			},
			"name": {
				"ko": "초록 둥근 나무",
				"en": "green round tree"
			},
			"cat": "outdoor",
			"price": 100,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "roundtree-leafdark",
			"tpl": "roundTree",
			"p": {
				"leaf": "leafDark",
				"k": 1.5
			},
			"name": {
				"ko": "진초록 둥근 나무",
				"en": "dark green round tree"
			},
			"cat": "outdoor",
			"price": 100,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "roundtree-olive",
			"tpl": "roundTree",
			"p": {
				"leaf": "olive",
				"k": 1.5
			},
			"name": {
				"ko": "올리브 둥근 나무",
				"en": "olive round tree"
			},
			"cat": "outdoor",
			"price": 100,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "bush-leaf-none",
			"tpl": "bush",
			"p": {
				"c": "leaf",
				"f": "none"
			},
			"name": {
				"ko": "초록 덤불",
				"en": "green bush"
			},
			"cat": "outdoor",
			"price": 60,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "bush-leaf-pink",
			"tpl": "bush",
			"p": {
				"c": "leaf",
				"f": "pink"
			},
			"name": {
				"ko": "초록 덤불",
				"en": "green bush"
			},
			"cat": "outdoor",
			"price": 60,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "bush-sage-butter",
			"tpl": "bush",
			"p": {
				"c": "sage",
				"f": "butter"
			},
			"name": {
				"ko": "세이지 덤불",
				"en": "sage bush"
			},
			"cat": "outdoor",
			"price": 60,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "flowerbed-3-2-coral-butter-pink-lilac",
			"tpl": "flowerBed",
			"p": {
				"w": 3,
				"seed": 2,
				"cols": "coral,butter,pink,lilac"
			},
			"name": {
				"ko": "꽃밭",
				"en": "Flower bed"
			},
			"cat": "outdoor",
			"price": 60,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "flowerbed-2-4-white-sky-lilac",
			"tpl": "flowerBed",
			"p": {
				"w": 2,
				"seed": 4,
				"cols": "white,sky,lilac"
			},
			"name": {
				"ko": "꽃밭",
				"en": "Flower bed"
			},
			"cat": "outdoor",
			"price": 60,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "fence-4-white",
			"tpl": "fence",
			"p": {
				"len": 4,
				"c": "white"
			},
			"name": {
				"ko": "흰 울타리",
				"en": "white fence"
			},
			"cat": "outdoor",
			"price": 70,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "fence-2-white",
			"tpl": "fence",
			"p": {
				"len": 2,
				"c": "white"
			},
			"name": {
				"ko": "흰 울타리",
				"en": "white fence"
			},
			"cat": "outdoor",
			"price": 70,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "fence-4-oak",
			"tpl": "fence",
			"p": {
				"len": 4,
				"c": "oak"
			},
			"name": {
				"ko": "오크 울타리",
				"en": "oak fence"
			},
			"cat": "outdoor",
			"price": 70,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "lamppost-charcoal",
			"tpl": "lampPost",
			"p": { "c": "charcoal" },
			"name": {
				"ko": "숯색 가로등",
				"en": "charcoal lamp post"
			},
			"cat": "outdoor",
			"price": 90,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "lamppost-teal",
			"tpl": "lampPost",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 가로등",
				"en": "teal lamp post"
			},
			"cat": "outdoor",
			"price": 90,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "bench-oak-charcoal",
			"tpl": "bench",
			"p": {
				"c": "oak",
				"leg": "charcoal"
			},
			"name": {
				"ko": "오크 벤치",
				"en": "oak bench"
			},
			"cat": "outdoor",
			"price": 80,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "bench-teal-charcoal",
			"tpl": "bench",
			"p": {
				"c": "teal",
				"leg": "charcoal"
			},
			"name": {
				"ko": "청록 벤치",
				"en": "teal bench"
			},
			"cat": "outdoor",
			"price": 80,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "mailbox-red",
			"tpl": "mailbox",
			"p": { "c": "red" },
			"name": {
				"ko": "빨간 우편함",
				"en": "red mailbox"
			},
			"cat": "outdoor",
			"price": 80,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "mailbox-teal",
			"tpl": "mailbox",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 우편함",
				"en": "teal mailbox"
			},
			"cat": "outdoor",
			"price": 80,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "mailbox-butter",
			"tpl": "mailbox",
			"p": { "c": "butter" },
			"name": {
				"ko": "버터색 우편함",
				"en": "butter mailbox"
			},
			"cat": "outdoor",
			"price": 80,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "fountain",
			"tpl": "fountain",
			"p": {},
			"name": {
				"ko": "분수",
				"en": "Fountain"
			},
			"cat": "outdoor",
			"price": 150,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "slide-coral",
			"tpl": "slide",
			"p": { "c": "coral" },
			"name": {
				"ko": "코랄 미끄럼틀",
				"en": "coral slide"
			},
			"cat": "outdoor",
			"price": 120,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "slide-teal",
			"tpl": "slide",
			"p": { "c": "teal" },
			"name": {
				"ko": "청록 미끄럼틀",
				"en": "teal slide"
			},
			"cat": "outdoor",
			"price": 120,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": ["yard"],
			"tplVersion": 1
		},
		{
			"id": "garden-daisy",
			"tpl": "gardenPlot",
			"p": {
				"kind": "daisy",
				"stage": 7,
				"empty": 0,
				"pot": 1
			},
			"name": {
				"ko": "정원에서 키운 데이지 화분",
				"en": "Home-grown daisy pot"
			},
			"cat": "plant",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["nature", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "garden-tomato",
			"tpl": "gardenPlot",
			"p": {
				"kind": "tomato",
				"stage": 7,
				"empty": 0,
				"pot": 1
			},
			"name": {
				"ko": "정원에서 키운 토마토 화분",
				"en": "Home-grown tomato pot"
			},
			"cat": "plant",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["nature", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "garden-waratah",
			"tpl": "gardenPlot",
			"p": {
				"kind": "waratah",
				"stage": 7,
				"empty": 0,
				"pot": 1
			},
			"name": {
				"ko": "정원에서 키운 와라타 화분",
				"en": "Home-grown waratah pot"
			},
			"cat": "plant",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["nature", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "garden-sunflower",
			"tpl": "gardenPlot",
			"p": {
				"kind": "sunflower",
				"stage": 7,
				"empty": 0,
				"pot": 1
			},
			"name": {
				"ko": "정원에서 키운 해바라기 화분",
				"en": "Home-grown sunflower pot"
			},
			"cat": "plant",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["nature", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "garden-pumpkin",
			"tpl": "gardenPlot",
			"p": {
				"kind": "pumpkin",
				"stage": 7,
				"empty": 0,
				"pot": 1
			},
			"name": {
				"ko": "정원에서 키운 호박 화분",
				"en": "Home-grown pumpkin pot"
			},
			"cat": "plant",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["nature", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "garden-wattle",
			"tpl": "gardenPlot",
			"p": {
				"kind": "wattle",
				"stage": 7,
				"empty": 0,
				"pot": 1
			},
			"name": {
				"ko": "정원에서 키운 골든 와틀 화분",
				"en": "Home-grown golden wattle pot"
			},
			"cat": "plant",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["nature", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-spring-bunting",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "pink,butter,mint"
			},
			"name": {
				"ko": "봄 축제 깃발",
				"en": "Spring fair bunting"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-spring-lantern",
			"tpl": "lantern",
			"p": {
				"c": "pink",
				"kind": "flower"
			},
			"name": {
				"ko": "봄 꽃등",
				"en": "Spring flower lantern"
			},
			"cat": "light",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-spring-kite",
			"tpl": "kite",
			"p": {
				"c": "pink",
				"c2": "butter"
			},
			"name": {
				"ko": "봄 연",
				"en": "Spring kite"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-summer-bunting",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "sky,teal,butter"
			},
			"name": {
				"ko": "여름 축제 깃발",
				"en": "Summer fair bunting"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-summer-lantern",
			"tpl": "lantern",
			"p": {
				"c": "sky",
				"kind": "sea"
			},
			"name": {
				"ko": "여름 바다등",
				"en": "Summer sea lantern"
			},
			"cat": "light",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-summer-kite",
			"tpl": "kite",
			"p": {
				"c": "sky",
				"c2": "teal"
			},
			"name": {
				"ko": "여름 연",
				"en": "Summer kite"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-autumn-bunting",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "terracotta,mustard,plum"
			},
			"name": {
				"ko": "가을 축제 깃발",
				"en": "Autumn fair bunting"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-autumn-lantern",
			"tpl": "lantern",
			"p": {
				"c": "terracotta",
				"kind": "leaf"
			},
			"name": {
				"ko": "가을 단풍등",
				"en": "Autumn leaf lantern"
			},
			"cat": "light",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-autumn-kite",
			"tpl": "kite",
			"p": {
				"c": "terracotta",
				"c2": "mustard"
			},
			"name": {
				"ko": "가을 연",
				"en": "Autumn kite"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-winter-bunting",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "navy,white,sky"
			},
			"name": {
				"ko": "겨울 축제 깃발",
				"en": "Winter fair bunting"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-winter-lantern",
			"tpl": "lantern",
			"p": {
				"c": "navy",
				"kind": "star"
			},
			"name": {
				"ko": "겨울 별등",
				"en": "Winter star lantern"
			},
			"cat": "light",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fest-winter-kite",
			"tpl": "kite",
			"p": {
				"c": "navy",
				"c2": "white"
			},
			"name": {
				"ko": "겨울 연",
				"en": "Winter kite"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["seasonal", "exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "letter-frame",
			"tpl": "stampFrame",
			"p": {},
			"name": {
				"ko": "우표 액자",
				"en": "Stamp frame"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "letter-mug",
			"tpl": "letterMug",
			"p": {},
			"name": {
				"ko": "편지 머그",
				"en": "Letter mug"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "letter-box",
			"tpl": "letterBox",
			"p": {},
			"name": {
				"ko": "편지 상자",
				"en": "Letter box"
			},
			"cat": "box",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "letter-lamp",
			"tpl": "postieLamp",
			"p": {},
			"name": {
				"ko": "우체부 등",
				"en": "Postie lamp"
			},
			"cat": "light",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "dex-trophy-gold",
			"tpl": "trophy",
			"p": { "c": "gold" },
			"name": {
				"ko": "금 도감 트로피",
				"en": "Gold word-book trophy"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["study", "exclusive"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dex-trophy-silver",
			"tpl": "trophy",
			"p": { "c": "silver" },
			"name": {
				"ko": "은 도감 트로피",
				"en": "Silver word-book trophy"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["study", "exclusive"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dex-trophy-bronze",
			"tpl": "trophy",
			"p": { "c": "bronze" },
			"name": {
				"ko": "동 도감 트로피",
				"en": "Bronze word-book trophy"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["study", "exclusive"],
			"place": "surface",
			"alsoFloor": true,
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dex-frame",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": .8,
				"c": "oak",
				"art": "sun"
			},
			"name": {
				"ko": "주제 도감 액자",
				"en": "Topic word-book frame"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["study", "exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "req-postie",
			"tpl": "pelicanFigure",
			"p": {},
			"name": {
				"ko": "우체부 핍 인형",
				"en": "Pip the pelican figure"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "req-clock",
			"tpl": "cuckooClock",
			"p": {},
			"name": {
				"ko": "시계방 틱의 뻐꾸기 시계",
				"en": "Tick's cuckoo clock"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "req-library",
			"tpl": "globeBooks",
			"p": {},
			"name": {
				"ko": "도서관 모의 지구본",
				"en": "Mo's globe & books"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "req-bakery",
			"tpl": "cakeStand",
			"p": {},
			"name": {
				"ko": "빵집 번의 케이크 접시",
				"en": "Bun's cake stand"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "room-study",
			"tpl": "koalaPencilCup",
			"p": {},
			"name": {
				"ko": "공부방 전용 코알라 연필꽂이",
				"en": "Study koala pencil cup"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "room-play",
			"tpl": "ringStacker",
			"p": {},
			"name": {
				"ko": "놀이방 전용 무지개 고리 쌓기",
				"en": "Playroom rainbow ring stacker"
			},
			"cat": "toy",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "room-kitchen",
			"tpl": "cookieJar",
			"p": {},
			"name": {
				"ko": "부엌 전용 코알라 쿠키 병",
				"en": "Kitchen koala cookie jar"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "room-bath",
			"tpl": "rubberDucks",
			"p": {},
			"name": {
				"ko": "욕실 전용 고무 오리 셋",
				"en": "Bathroom rubber ducks"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "room-bedroom",
			"tpl": "moonLamp",
			"p": {},
			"name": {
				"ko": "침실 전용 달과 별 무드등",
				"en": "Bedroom moon & star lamp"
			},
			"cat": "light",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "room-living",
			"tpl": "koalaCushion",
			"p": {},
			"name": {
				"ko": "거실 전용 코알라 쿠션",
				"en": "Living room koala cushion"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "room-toilet",
			"tpl": "cactusPot",
			"p": {},
			"name": {
				"ko": "화장실 전용 선인장 화분",
				"en": "Toilet cactus pot"
			},
			"cat": "plant",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "room-library",
			"tpl": "bookStand",
			"p": {},
			"name": {
				"ko": "서재 전용 펼친 그림책",
				"en": "Library open picture book"
			},
			"cat": "small",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "room-workshop",
			"tpl": "toolBoard",
			"p": {},
			"name": {
				"ko": "작업실 전용 공구 벽판",
				"en": "Workshop tool board"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "room-laundry",
			"tpl": "sockLine",
			"p": {},
			"name": {
				"ko": "세탁실 전용 양말 빨랫줄",
				"en": "Laundry sock line"
			},
			"cat": "wall",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "room-cinema",
			"tpl": "popcornCart",
			"p": {},
			"name": {
				"ko": "시네마룸 전용 팝콘 기계",
				"en": "Cinema popcorn machine"
			},
			"cat": "box",
			"price": 0,
			"tier": "free",
			"hidden": true,
			"tags": ["exclusive"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "asmr-box",
			"tpl": "asmrBox",
			"p": {},
			"name": {
				"ko": "ASMR 상자",
				"en": "ASMR Box"
			},
			"cat": "toy",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "trophy-cabinet",
			"tpl": "trophyCabinet",
			"p": {},
			"name": {
				"ko": "트로피 진열장",
				"en": "Trophy cabinet"
			},
			"cat": "storage",
			"price": 0,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1,
			"badge": "quiz100"
		},
		{
			"id": "xmas-tree",
			"tpl": "xmasTree",
			"p": {},
			"name": {
				"ko": "크리스마스 트리",
				"en": "Christmas tree"
			},
			"cat": "plant",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["seasonal"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1,
			"season": "christmas"
		},
		{
			"id": "beach-towel",
			"tpl": "beachTowel",
			"p": {},
			"name": {
				"ko": "비치 타월",
				"en": "Beach towel"
			},
			"cat": "rug",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": ["seasonal"],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1,
			"season": "summer"
		},
		{
			"id": "cubby-shelf-white",
			"tpl": "cubbyShelf",
			"p": {},
			"name": {
				"ko": "칸칸 수납장",
				"en": "Cubby shelf"
			},
			"cat": "storage",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "cubby-shelf-oak",
			"tpl": "cubbyShelf",
			"p": {
				"c": "oak",
				"b1": "sky",
				"b2": "pink",
				"b3": "mint"
			},
			"name": {
				"ko": "오크 칸칸 수납장",
				"en": "Oak cubby shelf"
			},
			"cat": "storage",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fridge-white",
			"tpl": "fridge",
			"p": {},
			"name": {
				"ko": "냉장고",
				"en": "Fridge"
			},
			"cat": "storage",
			"price": 160,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "fridge-mint",
			"tpl": "fridge",
			"p": { "c": "mint" },
			"name": {
				"ko": "민트 냉장고",
				"en": "Mint fridge"
			},
			"cat": "storage",
			"price": 160,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "basin-sky",
			"tpl": "basin",
			"p": {},
			"name": {
				"ko": "세면대",
				"en": "Wash basin"
			},
			"cat": "storage",
			"price": 120,
			"priceManual": true,
			"tier": "free",
			"tags": ["bath"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "toolbox-red",
			"tpl": "toolbox",
			"p": {},
			"name": {
				"ko": "공구함",
				"en": "Toolbox"
			},
			"cat": "storage",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "shoe-cabinet",
			"tpl": "shoeCabinet",
			"p": {},
			"name": {
				"ko": "신발장",
				"en": "Shoe cabinet"
			},
			"cat": "storage",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "metal-shelf",
			"tpl": "metalShelf",
			"p": {},
			"name": {
				"ko": "철제 선반",
				"en": "Metal shelf"
			},
			"cat": "storage",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "toy-box-oak",
			"tpl": "toyBox",
			"p": {
				"c": "oak",
				"c2": "coral"
			},
			"name": {
				"ko": "나무 장난감 상자",
				"en": "Wooden toy box"
			},
			"cat": "toy",
			"price": 120,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "toy-box-pink",
			"tpl": "toyBox",
			"p": {
				"c": "pink",
				"c2": "sky"
			},
			"name": {
				"ko": "무지개 장난감 상자",
				"en": "Rainbow toy box"
			},
			"cat": "toy",
			"price": 120,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "toy-box-navy",
			"tpl": "toyBox",
			"p": {
				"c": "navy",
				"c2": "butter"
			},
			"name": {
				"ko": "별 장난감 상자",
				"en": "Star toy box"
			},
			"cat": "toy",
			"price": 120,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plush-bear",
			"tpl": "plush",
			"p": { "kind": "bear" },
			"name": {
				"ko": "곰 인형",
				"en": "Teddy bear"
			},
			"cat": "toy",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "plush-bunny",
			"tpl": "plush",
			"p": {
				"kind": "bunny",
				"c": "white"
			},
			"name": {
				"ko": "토끼 인형",
				"en": "Bunny plush"
			},
			"cat": "toy",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "toy-car",
			"tpl": "toyCar",
			"p": {},
			"name": {
				"ko": "장난감 자동차",
				"en": "Toy car"
			},
			"cat": "toy",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "toy-robot",
			"tpl": "toyRobot",
			"p": {},
			"name": {
				"ko": "장난감 로봇",
				"en": "Toy robot"
			},
			"cat": "toy",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "toy-dino",
			"tpl": "toyDino",
			"p": {},
			"name": {
				"ko": "공룡 인형",
				"en": "Toy dinosaur"
			},
			"cat": "toy",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "toy-rocket",
			"tpl": "toyRocket",
			"p": {},
			"name": {
				"ko": "장난감 로켓",
				"en": "Toy rocket"
			},
			"cat": "toy",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "toy-drum",
			"tpl": "toyDrum",
			"p": {},
			"name": {
				"ko": "북",
				"en": "Toy drum"
			},
			"cat": "toy",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "aquarium",
			"tpl": "aquarium",
			"p": {},
			"name": {
				"ko": "어항",
				"en": "Aquarium"
			},
			"cat": "small",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tv",
			"tpl": "tv",
			"p": {},
			"name": {
				"ko": "텔레비전",
				"en": "TV"
			},
			"cat": "small",
			"price": 150,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tv-wall",
			"tpl": "tvWall",
			"p": {},
			"name": {
				"ko": "벽걸이 TV",
				"en": "Wall TV"
			},
			"cat": "wall",
			"price": 150,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "computer-laptop",
			"tpl": "computer",
			"p": { "kind": "laptop" },
			"name": {
				"ko": "노트북",
				"en": "Laptop"
			},
			"cat": "small",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "computer-desktop",
			"tpl": "computer",
			"p": { "kind": "desktop" },
			"name": {
				"ko": "컴퓨터",
				"en": "Desktop computer"
			},
			"cat": "small",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bath-bottles",
			"tpl": "bathBottles",
			"p": {},
			"name": {
				"ko": "샴푸·린스·핸드워시",
				"en": "Shampoo set"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["bath"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "soap",
			"tpl": "soap",
			"p": {},
			"name": {
				"ko": "비누",
				"en": "Soap"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["bath"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tooth-cup",
			"tpl": "toothSet",
			"p": {},
			"name": {
				"ko": "양치 컵",
				"en": "Toothbrush cup"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["bath"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "desk-clock",
			"tpl": "deskClock",
			"p": {},
			"name": {
				"ko": "탁상시계",
				"en": "Desk clock"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "crayon-box",
			"tpl": "crayonBox",
			"p": {},
			"name": {
				"ko": "크레용 상자",
				"en": "Crayon box"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "marble-bag",
			"tpl": "marbleBag",
			"p": {},
			"name": {
				"ko": "구슬 주머니",
				"en": "Marble bag"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-pizza",
			"tpl": "food",
			"p": { "kind": "pizza" },
			"name": {
				"ko": "피자",
				"en": "Pizza"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-bread",
			"tpl": "food",
			"p": { "kind": "bread" },
			"name": {
				"ko": "빵",
				"en": "Bread"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-pasta",
			"tpl": "food",
			"p": { "kind": "pasta" },
			"name": {
				"ko": "파스타",
				"en": "Pasta"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-meat",
			"tpl": "food",
			"p": { "kind": "meat" },
			"name": {
				"ko": "고기",
				"en": "Roast meat"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-veggies",
			"tpl": "food",
			"p": { "kind": "veggies" },
			"name": {
				"ko": "채소",
				"en": "Vegetables"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-kimchi",
			"tpl": "food",
			"p": { "kind": "kimchi" },
			"name": {
				"ko": "김치",
				"en": "Kimchi"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-eggs",
			"tpl": "food",
			"p": { "kind": "eggs" },
			"name": {
				"ko": "달걀",
				"en": "Eggs"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-cheese",
			"tpl": "food",
			"p": { "kind": "cheese" },
			"name": {
				"ko": "치즈",
				"en": "Cheese"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-chocolate",
			"tpl": "food",
			"p": { "kind": "chocolate" },
			"name": {
				"ko": "초콜릿",
				"en": "Chocolate"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "food-icecream",
			"tpl": "food",
			"p": { "kind": "icecream" },
			"name": {
				"ko": "아이스크림",
				"en": "Ice cream"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "drink-water",
			"tpl": "drink",
			"p": { "kind": "water" },
			"name": {
				"ko": "물병",
				"en": "Water bottle"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "drink-milk",
			"tpl": "drink",
			"p": { "kind": "milk" },
			"name": {
				"ko": "우유",
				"en": "Milk"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "drink-juice",
			"tpl": "drink",
			"p": { "kind": "juice" },
			"name": {
				"ko": "주스",
				"en": "Juice"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tool-drill",
			"tpl": "toolSet",
			"p": { "kind": "drill" },
			"name": {
				"ko": "전동 드릴",
				"en": "Drill"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tool-screwdriver",
			"tpl": "toolSet",
			"p": { "kind": "screwdriver" },
			"name": {
				"ko": "드라이버",
				"en": "Screwdriver"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tool-saw",
			"tpl": "toolSet",
			"p": { "kind": "saw" },
			"name": {
				"ko": "톱",
				"en": "Hand saw"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tool-hammer",
			"tpl": "toolSet",
			"p": { "kind": "hammer" },
			"name": {
				"ko": "망치",
				"en": "Hammer"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tool-wrench",
			"tpl": "toolSet",
			"p": { "kind": "wrench" },
			"name": {
				"ko": "스패너",
				"en": "Wrench"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tool-pliers",
			"tpl": "toolSet",
			"p": { "kind": "pliers" },
			"name": {
				"ko": "펜치",
				"en": "Pliers"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "tool-tape",
			"tpl": "toolSet",
			"p": { "kind": "tape" },
			"name": {
				"ko": "줄자",
				"en": "Measuring tape"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "paint-can",
			"tpl": "paintCan",
			"p": {},
			"name": {
				"ko": "페인트 통",
				"en": "Paint can"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "shoes-sneakers",
			"tpl": "shoes",
			"p": {
				"kind": "sneakers",
				"c": "red"
			},
			"name": {
				"ko": "운동화",
				"en": "Sneakers"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "shoes-boots",
			"tpl": "shoes",
			"p": {
				"kind": "boots",
				"c": "walnut"
			},
			"name": {
				"ko": "부츠",
				"en": "Boots"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "shoes-sandals",
			"tpl": "shoes",
			"p": {
				"kind": "sandals",
				"c": "sky"
			},
			"name": {
				"ko": "샌들",
				"en": "Sandals"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "shoes-slippers",
			"tpl": "shoes",
			"p": {
				"kind": "slippers",
				"c": "pink"
			},
			"name": {
				"ko": "슬리퍼",
				"en": "Slippers"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "shoes-school",
			"tpl": "shoes",
			"p": {
				"kind": "school",
				"c": "black"
			},
			"name": {
				"ko": "학교 신발",
				"en": "School shoes"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "shoes-rain",
			"tpl": "shoes",
			"p": {
				"kind": "rain",
				"c": "butter"
			},
			"name": {
				"ko": "장화",
				"en": "Rain boots"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1,
			"alsoFloor": true
		},
		{
			"id": "piano",
			"tpl": "piano",
			"p": {},
			"name": {
				"ko": "피아노",
				"en": "Piano"
			},
			"cat": "seat",
			"price": 180,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "armchair-lilac",
			"tpl": "armchair",
			"p": { "c": "lilac" },
			"name": {
				"ko": "보라 안락의자",
				"en": "Purple armchair"
			},
			"cat": "seat",
			"price": 150,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "armchair-mustard",
			"tpl": "armchair",
			"p": { "c": "mustard" },
			"name": {
				"ko": "노랑 안락의자",
				"en": "Yellow armchair"
			},
			"cat": "seat",
			"price": 150,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bathtub",
			"tpl": "bathtub",
			"p": {},
			"name": {
				"ko": "욕조",
				"en": "Bathtub"
			},
			"cat": "seat",
			"price": 180,
			"priceManual": true,
			"tier": "free",
			"tags": ["bath"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "toilet",
			"tpl": "toilet",
			"p": {},
			"name": {
				"ko": "변기",
				"en": "Toilet"
			},
			"cat": "seat",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["bath"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "counter-mint",
			"tpl": "counter",
			"p": {},
			"name": {
				"ko": "조리대",
				"en": "Kitchen counter"
			},
			"cat": "table",
			"price": 120,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "stove",
			"tpl": "stove",
			"p": {},
			"name": {
				"ko": "가스레인지",
				"en": "Stove"
			},
			"cat": "table",
			"price": 150,
			"priceManual": true,
			"tier": "free",
			"tags": ["kitchen"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mirror-brass",
			"tpl": "mirror",
			"p": {},
			"name": {
				"ko": "거울",
				"en": "Mirror"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-day",
			"tpl": "window",
			"p": { "view": "day" },
			"name": {
				"ko": "맑은 하늘 창문",
				"en": "Sunny window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-night",
			"tpl": "window",
			"p": { "view": "night" },
			"name": {
				"ko": "밤 창문",
				"en": "Night window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-rain",
			"tpl": "window",
			"p": { "view": "rain" },
			"name": {
				"ko": "비 오는 창문",
				"en": "Rainy window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-snow",
			"tpl": "window",
			"p": { "view": "snow" },
			"name": {
				"ko": "눈 오는 창문",
				"en": "Snowy window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-sunset",
			"tpl": "window",
			"p": { "view": "sunset" },
			"name": {
				"ko": "노을 창문",
				"en": "Sunset window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-sea",
			"tpl": "window",
			"p": { "view": "sea" },
			"name": {
				"ko": "바다 창문",
				"en": "Sea window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-city",
			"tpl": "window",
			"p": { "view": "city" },
			"name": {
				"ko": "도시 창문",
				"en": "City window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-tree",
			"tpl": "window",
			"p": { "view": "tree" },
			"name": {
				"ko": "나무 창문",
				"en": "Tree window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-round",
			"tpl": "window",
			"p": {
				"view": "day",
				"shape": "round"
			},
			"name": {
				"ko": "동그란 창문",
				"en": "Round window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "window-curtain",
			"tpl": "window",
			"p": {
				"view": "day",
				"curtain": "pink"
			},
			"name": {
				"ko": "커튼 창문",
				"en": "Curtain window"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-map",
			"tpl": "poster",
			"p": { "art": "map" },
			"name": {
				"ko": "세계 지도 포스터",
				"en": "World map poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-rocket",
			"tpl": "poster",
			"p": { "art": "rocket" },
			"name": {
				"ko": "로켓 포스터",
				"en": "Rocket poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-rainbow",
			"tpl": "poster",
			"p": { "art": "rainbow" },
			"name": {
				"ko": "무지개 포스터",
				"en": "Rainbow poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-kangaroo",
			"tpl": "poster",
			"p": { "art": "kangaroo" },
			"name": {
				"ko": "캥거루 포스터",
				"en": "Kangaroo poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-dino",
			"tpl": "poster",
			"p": { "art": "dino" },
			"name": {
				"ko": "공룡 포스터",
				"en": "Dino poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-abc",
			"tpl": "poster",
			"p": { "art": "abc" },
			"name": {
				"ko": "ABC 포스터",
				"en": "ABC poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-solar",
			"tpl": "poster",
			"p": { "art": "solar" },
			"name": {
				"ko": "태양계 포스터",
				"en": "Solar system poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-fish",
			"tpl": "poster",
			"p": { "art": "fish" },
			"name": {
				"ko": "물고기 포스터",
				"en": "Fish poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-mountain",
			"tpl": "poster",
			"p": { "art": "mountain" },
			"name": {
				"ko": "산 포스터",
				"en": "Mountain poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-math",
			"tpl": "poster",
			"p": { "art": "math" },
			"name": {
				"ko": "수학 포스터",
				"en": "Math poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "poster-music",
			"tpl": "poster",
			"p": { "art": "music" },
			"name": {
				"ko": "음악 포스터",
				"en": "Music poster"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "collage-picnic",
			"tpl": "collageFrame",
			"p": {
				"a": "picnic",
				"b": "beach",
				"e": "birthday"
			},
			"name": {
				"ko": "추억 사진 액자",
				"en": "Memories photo collage"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "collage-park",
			"tpl": "collageFrame",
			"p": {
				"a": "park",
				"b": "zoo",
				"e": "camp"
			},
			"name": {
				"ko": "나들이 사진 액자",
				"en": "Day out photo collage"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "collage-snow",
			"tpl": "collageFrame",
			"p": {
				"a": "snow",
				"b": "grad",
				"e": "picnic"
			},
			"name": {
				"ko": "겨울과 졸업 사진 액자",
				"en": "Snow and graduation photo collage"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "mobile-cranes",
			"tpl": "mobile",
			"p": {},
			"name": {
				"ko": "종이학 모빌",
				"en": "Paper crane mobile"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "lights-mix",
			"tpl": "fairyLights",
			"p": { "kind": "mix" },
			"name": {
				"ko": "반짝 전구",
				"en": "Fairy lights"
			},
			"cat": "wall",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "lights-star",
			"tpl": "fairyLights",
			"p": { "kind": "star" },
			"name": {
				"ko": "별 조명",
				"en": "Star lights"
			},
			"cat": "wall",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "lights-warm",
			"tpl": "fairyLights",
			"p": { "kind": "warm" },
			"name": {
				"ko": "전구 줄",
				"en": "Bulb string"
			},
			"cat": "wall",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pendant-basic",
			"tpl": "pendantLamp",
			"p": { "kind": "basic" },
			"name": {
				"ko": "천장 램프",
				"en": "Hanging lamp"
			},
			"cat": "light",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pendant-cloud",
			"tpl": "pendantLamp",
			"p": { "kind": "cloud" },
			"name": {
				"ko": "구름 조명",
				"en": "Cloud lamp"
			},
			"cat": "light",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pendant-sun",
			"tpl": "pendantLamp",
			"p": { "kind": "sun" },
			"name": {
				"ko": "해님 조명",
				"en": "Sunny lamp"
			},
			"cat": "light",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pendant-flower",
			"tpl": "pendantLamp",
			"p": { "kind": "flower" },
			"name": {
				"ko": "꽃 조명",
				"en": "Flower lamp"
			},
			"cat": "light",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pendant-jellyfish",
			"tpl": "pendantLamp",
			"p": { "kind": "jellyfish" },
			"name": {
				"ko": "해파리 조명",
				"en": "Jellyfish lamp"
			},
			"cat": "light",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pendant-orbs",
			"tpl": "pendantLamp",
			"p": { "kind": "orbs" },
			"name": {
				"ko": "무지개 구슬",
				"en": "Rainbow orbs"
			},
			"cat": "light",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "chandelier",
			"tpl": "chandelier",
			"p": {},
			"name": {
				"ko": "샹들리에",
				"en": "Chandelier"
			},
			"cat": "light",
			"price": 150,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rug-star",
			"tpl": "shapeRug",
			"p": {
				"kind": "star",
				"c": "butter",
				"c2": "cream"
			},
			"name": {
				"ko": "별 깔개",
				"en": "Star rug"
			},
			"cat": "rug",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rug-heart",
			"tpl": "shapeRug",
			"p": {
				"kind": "heart",
				"c": "pink",
				"c2": "white"
			},
			"name": {
				"ko": "하트 깔개",
				"en": "Heart rug"
			},
			"cat": "rug",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rug-cloud",
			"tpl": "shapeRug",
			"p": {
				"kind": "cloud",
				"c": "white",
				"c2": "sky"
			},
			"name": {
				"ko": "구름 깔개",
				"en": "Cloud rug"
			},
			"cat": "rug",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rug-flower",
			"tpl": "shapeRug",
			"p": {
				"kind": "flower",
				"c": "lilac",
				"c2": "butter"
			},
			"name": {
				"ko": "꽃 깔개",
				"en": "Flower rug"
			},
			"cat": "rug",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rug-paw",
			"tpl": "shapeRug",
			"p": {
				"kind": "paw",
				"c": "clay",
				"c2": "cream"
			},
			"name": {
				"ko": "발바닥 깔개",
				"en": "Paw print rug"
			},
			"cat": "rug",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bonsai",
			"tpl": "bonsai",
			"p": {},
			"name": {
				"ko": "분재",
				"en": "Bonsai"
			},
			"cat": "plant",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["nature"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "palm-pot",
			"tpl": "palmPot",
			"p": {},
			"name": {
				"ko": "야자 화분",
				"en": "Palm in a pot"
			},
			"cat": "plant",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bamboo-pot",
			"tpl": "bambooPot",
			"p": {},
			"name": {
				"ko": "대나무 화분",
				"en": "Bamboo in a pot"
			},
			"cat": "plant",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "storage-bin-1-3",
			"tpl": "storageBin",
			"p": { "k": 1.3 },
			"name": {
				"ko": "큰 수납함",
				"en": "Large storage bin"
			},
			"cat": "box",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "storage-bin-1",
			"tpl": "storageBin",
			"p": { "k": 1 },
			"name": {
				"ko": "중간 수납함",
				"en": "Medium storage bin"
			},
			"cat": "box",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "storage-bin-0-7",
			"tpl": "storageBin",
			"p": { "k": .7 },
			"name": {
				"ko": "작은 수납함",
				"en": "Small storage bin"
			},
			"cat": "box",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-cat",
			"tpl": "petCat",
			"p": {},
			"name": {
				"ko": "고양이",
				"en": "Cat"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-dog",
			"tpl": "petDog",
			"p": {},
			"name": {
				"ko": "강아지",
				"en": "Puppy"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-bunny",
			"tpl": "petBunny",
			"p": {},
			"name": {
				"ko": "토끼",
				"en": "Bunny"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-fish",
			"tpl": "petFish",
			"p": {},
			"name": {
				"ko": "금붕어 어항",
				"en": "Goldfish bowl"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-turtle",
			"tpl": "petTurtle",
			"p": {},
			"name": {
				"ko": "거북이",
				"en": "Turtle"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-parrot",
			"tpl": "petParrot",
			"p": {},
			"name": {
				"ko": "앵무새",
				"en": "Parrot"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-hedgehog",
			"tpl": "petHedgehog",
			"p": {},
			"name": {
				"ko": "고슴도치",
				"en": "Hedgehog"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-duckling",
			"tpl": "petDuckling",
			"p": {},
			"name": {
				"ko": "아기 오리",
				"en": "Duckling"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-frog",
			"tpl": "petFrog",
			"p": {},
			"name": {
				"ko": "개구리",
				"en": "Frog"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-joey",
			"tpl": "petJoey",
			"p": {},
			"name": {
				"ko": "아기 캥거루",
				"en": "Baby kangaroo"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-cat-partyhat",
			"tpl": "petCat",
			"p": { "wear": "partyHat" },
			"name": {
				"ko": "파티 모자 쓴 고양이",
				"en": "Cat in a party hat"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-bunny-bow",
			"tpl": "petBunny",
			"p": { "wear": "bow" },
			"name": {
				"ko": "리본 단 토끼",
				"en": "Bunny with a bow"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-dog-tophat",
			"tpl": "petDog",
			"p": { "wear": "topHat" },
			"name": {
				"ko": "신사 모자 쓴 강아지",
				"en": "Puppy in a top hat"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-hedgehog-flowers",
			"tpl": "petHedgehog",
			"p": { "wear": "flowers" },
			"name": {
				"ko": "꽃관 쓴 고슴도치",
				"en": "Hedgehog in a flower crown"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-dog-collar",
			"tpl": "petDog",
			"p": { "wear": "collar" },
			"name": {
				"ko": "빨간 목줄 강아지",
				"en": "Puppy with a red collar"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-cat-bell",
			"tpl": "petCat",
			"p": { "wear": "bell" },
			"name": {
				"ko": "방울 목줄 고양이",
				"en": "Cat with a bell"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-joey-scarf",
			"tpl": "petJoey",
			"p": { "wear": "scarf" },
			"name": {
				"ko": "목도리 두른 아기 캥거루",
				"en": "Joey in a scarf"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-parrot-bowtie",
			"tpl": "petParrot",
			"p": { "wear": "bowTie" },
			"name": {
				"ko": "나비넥타이 앵무새",
				"en": "Parrot in a bow tie"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-dog-sweater",
			"tpl": "petDog",
			"p": { "wear": "sweater" },
			"name": {
				"ko": "스웨터 입은 강아지",
				"en": "Puppy in a sweater"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-duckling-raincoat",
			"tpl": "petDuckling",
			"p": { "wear": "raincoat" },
			"name": {
				"ko": "우비 입은 아기 오리",
				"en": "Duckling in a raincoat"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-cat-cape",
			"tpl": "petCat",
			"p": { "wear": "cape" },
			"name": {
				"ko": "망토 두른 고양이",
				"en": "Cat in a hero cape"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-frog-boots",
			"tpl": "petFrog",
			"p": { "wear": "boots" },
			"name": {
				"ko": "장화 신은 개구리",
				"en": "Frog in rain boots"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pet-turtle-sneakers",
			"tpl": "petTurtle",
			"p": { "wear": "sneakers" },
			"name": {
				"ko": "운동화 신은 거북이",
				"en": "Turtle in sneakers"
			},
			"cat": "pet",
			"price": 115,
			"priceManual": true,
			"tier": "free",
			"tags": ["cozy"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "pond",
			"tpl": "pond",
			"p": {},
			"name": {
				"ko": "연못",
				"en": "Pond"
			},
			"cat": "outdoor",
			"price": 150,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "swing",
			"tpl": "swing",
			"p": {},
			"name": {
				"ko": "그네",
				"en": "Swing"
			},
			"cat": "outdoor",
			"price": 120,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "sandpit",
			"tpl": "sandbox",
			"p": {},
			"name": {
				"ko": "모래놀이터",
				"en": "Sandpit"
			},
			"cat": "outdoor",
			"price": 120,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "dog-kennel",
			"tpl": "doghouse",
			"p": {},
			"name": {
				"ko": "강아지 집",
				"en": "Dog kennel"
			},
			"cat": "outdoor",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "snowman",
			"tpl": "snowman",
			"p": {},
			"name": {
				"ko": "눈사람",
				"en": "Snowman"
			},
			"cat": "outdoor",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rock",
			"tpl": "rock",
			"p": {},
			"name": {
				"ko": "바위",
				"en": "Rock"
			},
			"cat": "outdoor",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "stepping-stones",
			"tpl": "steppingStones",
			"p": {},
			"name": {
				"ko": "징검다리 돌",
				"en": "Stepping stones"
			},
			"cat": "outdoor",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "garden-gate",
			"tpl": "gate",
			"p": {},
			"name": {
				"ko": "대문",
				"en": "Garden gate"
			},
			"cat": "outdoor",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "car-compact",
			"tpl": "car",
			"p": {
				"kind": "compact",
				"c": "red"
			},
			"name": {
				"ko": "빨간 소형차",
				"en": "Red compact car"
			},
			"cat": "outdoor",
			"price": 200,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "car-sedan",
			"tpl": "car",
			"p": {
				"kind": "sedan",
				"c": "slate"
			},
			"name": {
				"ko": "은색 세단",
				"en": "Silver sedan"
			},
			"cat": "outdoor",
			"price": 200,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "car-sport",
			"tpl": "car",
			"p": {
				"kind": "sport",
				"c": "black"
			},
			"name": {
				"ko": "검은 스포츠카",
				"en": "Black sports car"
			},
			"cat": "outdoor",
			"price": 200,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "car-ute",
			"tpl": "car",
			"p": {
				"kind": "ute",
				"c": "mustard"
			},
			"name": {
				"ko": "주황 유트",
				"en": "Orange ute"
			},
			"cat": "outdoor",
			"price": 200,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "meadow-patch",
			"tpl": "meadowPatch",
			"p": {},
			"name": {
				"ko": "꽃 들판 깔개",
				"en": "Wildflower patch"
			},
			"cat": "outdoor",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "snow-patch",
			"tpl": "snowPatch",
			"p": {},
			"name": {
				"ko": "눈 덮인 마당 장식",
				"en": "Snowy patch"
			},
			"cat": "outdoor",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor", "seasonal"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-sea",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "sea"
			},
			"name": {
				"ko": "바다 위 배 그림 액자",
				"en": "Sea picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-rainbow",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "rainbow"
			},
			"name": {
				"ko": "무지개 그림 액자",
				"en": "Rainbow picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-space",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "space"
			},
			"name": {
				"ko": "우주 여행 그림 액자",
				"en": "Space picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-flowers",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "flowers"
			},
			"name": {
				"ko": "꽃밭 그림 액자",
				"en": "Flowers picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-koala",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "koala"
			},
			"name": {
				"ko": "코알라 그림 액자",
				"en": "Koala picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-night",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "night"
			},
			"name": {
				"ko": "별밤 그림 액자",
				"en": "Night picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-beach",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "beach"
			},
			"name": {
				"ko": "야자수 해변 그림 액자",
				"en": "Beach picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-castle",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "castle"
			},
			"name": {
				"ko": "동화 속 성 그림 액자",
				"en": "Castle picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-butterfly",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "butterfly"
			},
			"name": {
				"ko": "나비 그림 액자",
				"en": "Butterfly picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-puppy",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "puppy"
			},
			"name": {
				"ko": "강아지 그림 액자",
				"en": "Puppy picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-kitten",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "kitten"
			},
			"name": {
				"ko": "고양이 그림 액자",
				"en": "Kitten picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-mountain",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "mountain"
			},
			"name": {
				"ko": "눈 덮인 산 그림 액자",
				"en": "Mountain picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-dino",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "dino"
			},
			"name": {
				"ko": "공룡 그림 액자",
				"en": "Dino picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-balloons",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "balloons"
			},
			"name": {
				"ko": "풍선 그림 액자",
				"en": "Balloons picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-rocket",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "rocket"
			},
			"name": {
				"ko": "로켓 그림 액자",
				"en": "Rocket picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-fish",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "fish"
			},
			"name": {
				"ko": "물고기 그림 액자",
				"en": "Fish picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-cake",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "cake"
			},
			"name": {
				"ko": "생일 케이크 그림 액자",
				"en": "Cake picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-art-snowman",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "walnut",
				"art": "snowman"
			},
			"name": {
				"ko": "눈사람 그림 액자",
				"en": "Snowman picture"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-brass",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "brass",
				"art": "flowers"
			},
			"name": {
				"ko": "금빛 테 액자",
				"en": "Golden frame"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-pink",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "pink",
				"art": "flowers"
			},
			"name": {
				"ko": "캔디 테 액자",
				"en": "Candy frame"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-steel",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1.2,
				"c": "steel",
				"art": "flowers"
			},
			"name": {
				"ko": "알루미늄 테 액자",
				"en": "Aluminium frame"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "frame-round",
			"tpl": "frame",
			"p": {
				"w": 1,
				"h": 1,
				"c": "oak",
				"art": "sea",
				"shape": "round"
			},
			"name": {
				"ko": "동그란 액자",
				"en": "Round frame"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bunting-heart",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "coral,butter,teal,pink,sky",
				"shape": "heart"
			},
			"name": {
				"ko": "하트 가랜드",
				"en": "Heart garland"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bunting-star",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "coral,butter,teal,pink,sky",
				"shape": "star"
			},
			"name": {
				"ko": "별 가랜드",
				"en": "Star garland"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bunting-chain",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "coral,butter,teal,pink,sky",
				"shape": "chain"
			},
			"name": {
				"ko": "종이 고리 가랜드",
				"en": "Paper chain garland"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bunting-leaf",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "coral,butter,teal,pink,sky",
				"shape": "leaf"
			},
			"name": {
				"ko": "잎사귀 가랜드",
				"en": "Leaf garland"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bunting-pom",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "coral,butter,teal,pink,sky",
				"shape": "pom"
			},
			"name": {
				"ko": "방울 가랜드",
				"en": "Pom-pom garland"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bunting-ribbon",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "coral,butter,teal,pink,sky",
				"shape": "ribbon"
			},
			"name": {
				"ko": "리본 가랜드",
				"en": "Streamer garland"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bunting-snow",
			"tpl": "bunting",
			"p": {
				"w": 2.8,
				"cols": "coral,butter,teal,pink,sky",
				"shape": "snow"
			},
			"name": {
				"ko": "눈송이 가랜드",
				"en": "Snowflake garland"
			},
			"cat": "wall",
			"price": 80,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "wall",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-toys",
			"tpl": "bookcase",
			"p": {
				"w": 2,
				"h": 4,
				"c": "oak",
				"back": "cream",
				"fill": "toys"
			},
			"name": {
				"ko": "장난감 선반",
				"en": "Toy shelf"
			},
			"cat": "storage",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-plants",
			"tpl": "bookcase",
			"p": {
				"w": 2,
				"h": 4,
				"c": "oak",
				"back": "cream",
				"fill": "plants"
			},
			"name": {
				"ko": "화분 선반",
				"en": "Plant shelf"
			},
			"cat": "storage",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-craft",
			"tpl": "bookcase",
			"p": {
				"w": 2,
				"h": 4,
				"c": "oak",
				"back": "cream",
				"fill": "craft"
			},
			"name": {
				"ko": "공작 선반",
				"en": "Craft shelf"
			},
			"cat": "storage",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookcase-games",
			"tpl": "bookcase",
			"p": {
				"w": 2,
				"h": 4,
				"c": "oak",
				"back": "cream",
				"fill": "games"
			},
			"name": {
				"ko": "보드게임 선반",
				"en": "Games shelf"
			},
			"cat": "storage",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["play"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rugrect-rainbow",
			"tpl": "rugRect",
			"p": {
				"w": 5,
				"d": 3,
				"c": "cream",
				"c2": "coral",
				"c3": "teal",
				"pattern": "rainbow"
			},
			"name": {
				"ko": "무지개 깔개",
				"en": "Rainbow rug"
			},
			"cat": "rug",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rugrect-stripes",
			"tpl": "rugRect",
			"p": {
				"w": 4,
				"d": 3,
				"c": "white",
				"c2": "sky",
				"c3": "teal",
				"pattern": "stripes"
			},
			"name": {
				"ko": "줄무늬 매트",
				"en": "Striped mat"
			},
			"cat": "rug",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "rugrect-runner",
			"tpl": "rugRect",
			"p": {
				"w": 6,
				"d": 2,
				"c": "cream",
				"c2": "coral",
				"c3": "teal"
			},
			"name": {
				"ko": "긴 러그",
				"en": "Runner rug"
			},
			"cat": "rug",
			"price": 70,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "rug",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantbig-fern",
			"tpl": "plantBig",
			"p": {
				"pot": "terracotta",
				"leaf": "leaf",
				"kind": "fern",
				"seed": 1
			},
			"name": {
				"ko": "고사리 화분",
				"en": "Fern"
			},
			"cat": "plant",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "plantbig-monstera",
			"tpl": "plantBig",
			"p": {
				"pot": "cream",
				"leaf": "leafDark",
				"kind": "monstera",
				"seed": 1
			},
			"name": {
				"ko": "몬스테라 화분",
				"en": "Monstera"
			},
			"cat": "plant",
			"price": 60,
			"priceManual": true,
			"tier": "free",
			"tags": ["nature"],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "bookstack-notebooks",
			"tpl": "bookStack",
			"p": {
				"a": "sky",
				"b": "pink",
				"c": "butter",
				"kind": "notebooks"
			},
			"name": {
				"ko": "공책과 일기장",
				"en": "Notebooks and diary"
			},
			"cat": "small",
			"price": 20,
			"priceManual": true,
			"tier": "free",
			"tags": ["study"],
			"place": "surface",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "diningtable-square",
			"tpl": "diningTable",
			"p": {
				"c": "oak",
				"shape": "square"
			},
			"name": {
				"ko": "네모 식탁",
				"en": "Square table"
			},
			"cat": "table",
			"price": 90,
			"priceManual": true,
			"tier": "free",
			"tags": [],
			"place": "floor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "roundtree-apple",
			"tpl": "roundTree",
			"p": {
				"leaf": "leaf",
				"fruit": "apple"
			},
			"name": {
				"ko": "사과나무",
				"en": "Apple tree"
			},
			"cat": "outdoor",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "roundtree-cherry",
			"tpl": "roundTree",
			"p": { "leaf": "pink" },
			"name": {
				"ko": "벚꽃나무",
				"en": "Cherry blossom tree"
			},
			"cat": "outdoor",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "roundtree-maple",
			"tpl": "roundTree",
			"p": { "leaf": "terracotta" },
			"name": {
				"ko": "단풍나무",
				"en": "Maple tree"
			},
			"cat": "outdoor",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		},
		{
			"id": "gumtree-pine",
			"tpl": "gumTree",
			"p": {
				"seed": 1,
				"kind": "pine"
			},
			"name": {
				"ko": "소나무",
				"en": "Pine tree"
			},
			"cat": "outdoor",
			"price": 100,
			"priceManual": true,
			"tier": "free",
			"tags": ["outdoor"],
			"place": "outdoor",
			"rooms": "any",
			"tplVersion": 1
		}
	]
};
// src/data/types.ts
var box = (x0, y0, z0, x1, y1, z1, c, o = {}) => ({
	t: "box",
	x0,
	y0,
	z0,
	x1,
	y1,
	z1,
	c,
	...o
});
var cyl = (cx, cy, z0, z1, r0, r1, c, o = {}) => ({
	t: "cyl",
	cx,
	cy,
	z0,
	z1,
	r0,
	r1,
	c,
	...o
});
var ell = (cx, cy, cz, rx, ry, rz, c, o = {}) => ({
	t: "ell",
	cx,
	cy,
	cz,
	rx,
	ry,
	rz,
	c,
	...o
});
var disc = (plane, cx, cy, cz, r, c, o = {}) => ({
	t: "disc",
	plane,
	cx,
	cy,
	cz,
	r,
	c,
	...o
});
var poly = (pts, c, o = {}) => ({
	t: "poly",
	pts,
	c,
	...o
});
var line = (pts, c, w = 1, a) => ({
	t: "line",
	pts,
	c,
	w,
	...a !== void 0 ? { a } : {}
});
/** 결정적 의사 난수 (같은 seed → 같은 그림) */
function rng(seed) {
	let s = (seed * 9301 + 49297) % 233280 || 1;
	return () => {
		s = (s * 9301 + 49297) % 233280;
		return s / 233280;
	};
}
var num$1 = (p, k) => Number(p[k]);
var str = (p, k) => String(p[k]);
// src/art/friends.ts
function face(H) {
	const f = [.5, .866], s = [.866, -.5];
	const at = (kf, ks, dz) => [
		H[0] + f[0] * kf + s[0] * ks,
		H[1] + f[1] * kf + s[1] * ks,
		H[2] + dz
	];
	const E = (p, r, rz, c, o = { noLine: true }) => ell(p[0], p[1], p[2], r, r, rz, c, o);
	/** 얼굴 부품: 얼굴 방향을 향할 때만 보인다 */
	const F = (p, r, rz, c, o = { noLine: true }) => ({
		...E(p, r, rz, c, o),
		n: [f[0], f[1]]
	});
	const fl = (pts, c, w) => ({
		...line(pts, c, w),
		n: [f[0], f[1]]
	});
	return {
		at,
		E,
		F,
		fl
	};
}
/** 웜뱃: 통통한 몸, 작은 둥근 귀, 넓적한 코 */
function wombat() {
	const H = [
		0,
		.12,
		.98
	];
	const { at, E, F, fl } = face(H);
	return [
		ell(0, 0, .46, .5, .42, .46, "wombat", { mat: "fur" }),
		ell(0, .17, .4, .33, .24, .34, "wombatLight", { mat: "fur" }),
		ell(-.25, .3, .1, .17, .22, .1, "wombat", { mat: "fur" }),
		ell(.25, .3, .1, .17, .22, .1, "wombat", { mat: "fur" }),
		ell(-.38, .18, .42, .12, .13, .22, "wombat", { mat: "fur" }),
		ell(.38, .18, .42, .12, .13, .22, "wombat", { mat: "fur" }),
		E(at(-.02, -.3, .3), .11, .1, "wombat", { mat: "fur" }),
		ell(H[0], H[1], H[2], .44, .4, .36, "wombat", { mat: "fur" }),
		E(at(-.02, .3, .3), .11, .1, "wombat", { mat: "fur" }),
		F(at(.05, .3, .29), .06, .06, "wombatLight"),
		F(at(.36, -.17, .08), .04, .05, "eye"),
		F(at(.4, -.18, .11), .013, .015, "white"),
		F(at(.36, .17, .08), .04, .05, "eye"),
		F(at(.4, .16, .11), .013, .015, "white"),
		F(at(.3, -.28, -.08), .06, .04, "cheek", {
			noLine: true,
			a: .75
		}),
		F(at(.3, .28, -.08), .06, .04, "cheek", {
			noLine: true,
			a: .75
		}),
		{
			...ell(...at(.4, 0, -.06), .15, .15, .09, "nose", {}),
			n: [.5, .866]
		},
		fl([
			at(.38, -.05, -.2),
			at(.39, 0, -.23),
			at(.38, .05, -.2)
		], "eye", 1.2)
	];
}
// src/art/koala.ts
var DESIGNS = {
	plush: {
		id: "plush",
		name: "통통 인형",
		desc: "큰 머리, 크고 둥근 귀, 큰 코. 귀여움을 가장 강조",
		head: .47,
		headZ: {
			stand: 1.2,
			sit: 1.05
		},
		body: [
			.33,
			.37,
			.4
		],
		ear: [
			.12,
			.25,
			.24
		],
		earOut: .44,
		tufts: false,
		limb: 1,
		nose: [.12, .17],
		shine: true,
		fur: "fur",
		furDark: "furDark",
		fluff: "fluff"
	},
	forest: {
		id: "forest",
		name: "숲속 친구",
		desc: "실제 코알라에 가까운 비례, 귀 가장자리 흰 털, 긴 팔다리",
		head: .4,
		headZ: {
			stand: 1.32,
			sit: 1.12
		},
		body: [
			.36,
			.4,
			.48
		],
		ear: [
			.11,
			.21,
			.2
		],
		earOut: .4,
		tufts: true,
		limb: 1.2,
		nose: [.1, .19],
		shine: false,
		fur: "#9b9aa3",
		furDark: "#7d7b86",
		fluff: "#efece6"
	},
	explorer: {
		id: "explorer",
		name: "꼬마 탐험가",
		desc: "통통 인형 비례에 목도리와 작은 배낭. 집과 집 사이를 오가는 주인공",
		head: .45,
		headZ: {
			stand: 1.2,
			sit: 1.05
		},
		body: [
			.33,
			.37,
			.4
		],
		ear: [
			.12,
			.23,
			.23
		],
		earOut: .43,
		tufts: false,
		limb: 1,
		nose: [.12, .16],
		shine: true,
		fur: "fur",
		furDark: "furDark",
		fluff: "fluff",
		scarf: "coral",
		pack: "mustard"
	},
	cuddle: {
		id: "cuddle",
		name: "포근 코알라",
		desc: "통통 인형 비례에 관절 팔다리. 팔꿈치가 굽어 앞발이 배 앞에 모이고, 짧고 굵은 다리에 발이 앞으로",
		head: .44,
		headZ: {
			stand: 1.2,
			sit: 1.08
		},
		body: [
			.34,
			.38,
			.42
		],
		ear: [
			.12,
			.24,
			.23
		],
		earOut: .42,
		tufts: true,
		limb: 1,
		nose: [.11, .19],
		shine: true,
		fur: "fur",
		furDark: "furDark",
		fluff: "fluff",
		rig: {
			hip: .3,
			arm: 1,
			leg: 1,
			armT: .1,
			legT: .14
		}
	},
	climber: {
		id: "climber",
		name: "나무타기 친구",
		desc: "실제 코알라처럼 긴 팔과 큰 앞발(두 갈래 엄지·발톱), 앞으로 모은 팔, 흰 가슴털",
		head: .41,
		headZ: {
			stand: 1.34,
			sit: 1.14
		},
		body: [
			.37,
			.4,
			.48
		],
		ear: [
			.11,
			.22,
			.21
		],
		earOut: .4,
		tufts: true,
		limb: 1.15,
		nose: [.1, .21],
		shine: false,
		fur: "#9b9aa3",
		furDark: "#7d7b86",
		fluff: "#efece6",
		rig: {
			hip: .3,
			arm: 1.25,
			leg: 1.05,
			armT: .11,
			legT: .15,
			hug: true,
			claws: true,
			chest: "#f4f1ea"
		}
	},
	joey: {
		id: "joey",
		name: "아기 코알라",
		desc: "큰 머리와 짧고 통통한 관절 팔다리. 걸을 때 팔이 크게 흔들리는 아장아장 걸음",
		head: .5,
		headZ: {
			stand: 1.04,
			sit: 1
		},
		body: [
			.32,
			.35,
			.36
		],
		ear: [
			.13,
			.27,
			.26
		],
		earOut: .46,
		tufts: false,
		limb: .85,
		nose: [.12, .15],
		shine: true,
		fur: "#b4b4bd",
		furDark: "#94949f",
		fluff: "fluff",
		rig: {
			hip: .22,
			arm: .82,
			leg: .8,
			armT: .1,
			legT: .13
		}
	}
};
var DEFAULT_DESIGN = "joey";
/** 보는 사람 방향(월드 수평): +x +y 사이 */
var VIEW = Math.PI / 4;
var wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/**
* 부품 목록(테스트용 정보 포함). yaw = 몸이 바라보는 방향(월드 수평 각, 0 = +x, π/2 = +y).
* viewYaw = 이 레시피 좌표계에서 본 보는 사람 방향(가구 회전 안에서 그릴 때 다름).
*/
function koalaParts(o = {}) {
	if (o.pose === "lie") return order(lieParts(o), o.viewYaw ?? VIEW);
	return order(buildParts(o), o.viewYaw ?? VIEW);
}
/** 서기·앉기·걷기 부품(그리는 순서 정하기 전) */
function buildParts(o) {
	const pose = o.pose ?? "sit", yaw = o.yaw ?? Math.PI / 2, D = DESIGNS[o.design ?? DEFAULT_DESIGN], ph = o.phase ?? .25;
	const view = o.viewYaw ?? VIEW;
	const F = [Math.cos(yaw), Math.sin(yaw)], S = [-F[1], F[0]];
	const diff = wrap(view - yaw);
	const hy = yaw + (Math.abs(diff) < 100 * Math.PI / 180 ? Math.max(-.52, Math.min(.52, diff)) : 0), HF = [Math.cos(hy), Math.sin(hy)], HS = [-HF[1], HF[0]];
	const parts = [];
	const P = (f, s, z, fr = F, sr = S) => [
		fr[0] * f + sr[0] * s,
		fr[1] * f + sr[1] * s,
		z
	];
	const E = (c, r, col, role, extra = {}, parent, y = yaw) => {
		parts.push({
			shape: {
				t: "ell",
				cx: c[0],
				cy: c[1],
				cz: c[2],
				rx: r[0],
				ry: r[1],
				rz: r[2],
				yaw: y,
				c: col,
				...role === "decal" ? { noLine: true } : { mat: "fur" },
				...extra
			},
			role,
			...parent !== void 0 ? { parent } : {}
		});
		return parts.length - 1;
	};
	const L = D.limb, swing = pose === "walk" ? Math.sin(ph * Math.PI * 2) : 0, bob = pose === "walk" ? Math.abs(Math.cos(ph * Math.PI * 2)) * .03 : 0;
	const [bf, bs, bz] = D.body;
	let body;
	if (D.rig) body = rigLimbs(D, D.rig, pose, swing, bob, {
		E,
		P,
		parts,
		F,
		...o.limbs ? { limbs: o.limbs } : {}
	});
	else if (pose === "sit") {
		body = E(P(-.02, 0, .44), [
			bf,
			bs,
			bz + .02
		], D.fur, "body");
		for (const side of [-1, 1]) {
			const th = E(P(.2 * L, side * .19, .12), [
				.24 * L,
				.13,
				.12
			], D.fur, "limb", {}, body);
			E(P(.42 * L, side * .19, .14), [
				.06,
				.09,
				.1
			], D.furDark, "limb", {}, th);
		}
		E(P(.2, 0, .42), [
			.12,
			bs * .68,
			bz * .72
		], D.fluff, "decal", { n: [F[0], F[1]] }, body);
		for (const side of [-1, 1]) E(P(.18, side * .3, .45), [
			.2 * L,
			.11,
			.11
		], D.fur, "limb", {}, body);
	} else {
		const hip = .32 * L + bob;
		for (const side of [-1, 1]) {
			const fwd = side * swing * .14 * L, lift = pose === "walk" ? Math.max(0, side * swing) * .06 : 0;
			const leg = E(P(fwd, side * .16, hip * .5 + lift), [
				.13,
				.12,
				hip * .55
			], D.fur, "limb");
			E(P(fwd + .07, side * .16, .05 + lift), [
				.14,
				.1,
				.06
			], D.furDark, "limb", {}, leg);
		}
		body = E(P(0, 0, hip + bz * .9), [
			bf,
			bs,
			bz
		], D.fur, "body");
		E(P(bf * .62, 0, hip + bz * .85), [
			.12,
			bs * .66,
			bz * .7
		], D.fluff, "decal", { n: [F[0], F[1]] }, body);
		for (const side of [-1, 1]) E(P(.06 + -side * swing * .12 * L, side * (bs + .02), hip + bz * 1.05 - .1 * L), [
			.11,
			.1,
			.22 * L
		], D.fur, "limb", {}, body);
	}
	if (D.pack) {
		const z = pose === "sit" ? .52 : .32 * L + bz * 1;
		E(P(-bf - .06, 0, z), [
			.1,
			.24,
			.22
		], D.pack, "acc", { mat: "fabric" }, body);
	}
	const hz = (pose === "sit" ? D.headZ.sit : D.headZ.stand) + bob + (pose === "walk" ? 0 : 0);
	const R = D.head;
	if (D.scarf) {
		E(P(.02, 0, hz - R * .86), [
			bf * .95,
			bs * .92,
			.08
		], D.scarf, "acc", { mat: "knit" }, body);
		E(P(bf * .55, bs * .35, hz - R * 1.15), [
			.06,
			.07,
			.16
		], D.scarf, "acc", { mat: "knit" }, body);
	}
	const Hc = (f, s, z) => {
		const p = P(f, s, z, HF, HS);
		return [
			p[0],
			p[1],
			hz + p[2]
		];
	};
	const head = E(Hc(.02, 0, 0), [
		R,
		R * 1.02,
		R * .92
	], D.fur, "head", {}, body, hy);
	for (const side of [-1, 1]) {
		const ear = E(Hc(-.1, side * D.earOut, R * .74), D.ear, D.fur, "ear", {}, head, hy);
		E(Hc(D.ear[0] * .55 - .1, side * D.earOut, R * .72), [
			.035,
			D.ear[1] * .62,
			D.ear[2] * .62
		], D.fluff, "decal", { n: [HF[0], HF[1]] }, ear, hy);
		if (D.tufts) for (const k of [
			-1,
			0,
			1
		]) E(Hc(-.06, side * (D.earOut + D.ear[1] * .8), R * .74 + k * .11), [
			.05,
			.06,
			.06
		], D.fluff, "ear", { noLine: true }, ear, hy);
	}
	const onHead = (af, as, az) => {
		const n = Math.hypot(af, as, az);
		const k = R * .93 / n;
		return {
			pos: Hc(.02 + af * k, as * k, az * k),
			nrm: [HF[0] * af + HS[0] * as, HF[1] * af + HS[1] * as]
		};
	};
	const face = (af, as, az, r, col, extra = {}) => {
		const { pos, nrm } = onHead(af, as, az);
		const ny = Math.atan2(nrm[1], nrm[0]);
		E(pos, r, col, "decal", {
			n: nrm,
			...extra
		}, head, ny);
	};
	for (const side of [-1, 1]) {
		if (o.sleep) face(.84, side * .4, .12, [
			.02,
			.06,
			.014
		], "eye");
		else face(.82, side * .4, .16, [
			.02,
			.045,
			.06
		], "eye");
		if (D.shine && !o.sleep) face(.8, side * .38 - .06, .24, [
			.012,
			.016,
			.018
		], "white");
		face(.65, side * .62, -.22, [
			.02,
			.07,
			.045
		], "cheek", { a: .8 });
	}
	face(.97, 0, -.08, [
		D.nose[0] * .8,
		D.nose[0],
		D.nose[1]
	], "nose", { noLine: false });
	face(.9, -.05, .02, [
		.012,
		.022,
		.035
	], "white", { a: .7 });
	face(.86, 0, -.42, [
		.015,
		.05,
		.015
	], "eye");
	return parts;
}
/** 머리 덩어리(머리 · 귀 · 얼굴 장식)에 드는 부품인지 */
function headSet(parts) {
	const out = /* @__PURE__ */ new Set();
	const up = (i) => {
		const p = parts[i];
		if (p.role === "head") return true;
		return p.parent !== void 0 && (p.role === "ear" || p.role === "decal") ? up(p.parent) : false;
	};
	parts.forEach((_, i) => {
		if (up(i)) out.add(i);
	});
	return out;
}
var v3 = {
	add: (a, b) => [
		a[0] + b[0],
		a[1] + b[1],
		a[2] + b[2]
	],
	mul: (a, k) => [
		a[0] * k,
		a[1] * k,
		a[2] * k
	],
	norm: (a) => {
		const l = Math.hypot(...a) || 1;
		return [
			a[0] / l,
			a[1] / l,
			a[2] / l
		];
	}
};
/** 기울어진 타원체(축 e0·e1·e2, 반지름 r)를 감싸는 축 정렬 반지름 — 수평 회전만 되는 타원체로 근사 */
var boxRadii = (e, r) => [
	0,
	1,
	2
].map((k) => Math.hypot(r[0] * e[0][k], r[1] * e[1][k], r[2] * e[2][k]));
/**
* 누운 머리: 얼굴 방향 f(위로, 발 쪽으로 조금), 정수리 방향 u, 옆 s. 머리 중심 (0,0,0) 기준 부품.
* 얼굴 장식은 머리 표면의 정확한 자리에 두고, 모양만 축 정렬로 근사한다(작아서 티가 안 남).
*/
function lieHead(D, f, u, sleep) {
	const R = D.head, parts = [];
	const s = [
		f[1] * u[2] - f[2] * u[1],
		f[2] * u[0] - f[0] * u[2],
		f[0] * u[1] - f[1] * u[0]
	];
	const at = (af, as, az) => v3.add(v3.add(v3.mul(f, af), v3.mul(s, as)), v3.mul(u, az));
	const ell = (c, axes, r, col, role, parent, extra = {}) => {
		const rr = boxRadii(axes, r);
		parts.push({
			shape: {
				t: "ell",
				cx: c[0],
				cy: c[1],
				cz: c[2],
				rx: rr[0],
				ry: rr[1],
				rz: rr[2],
				yaw: 0,
				c: col,
				...role === "decal" ? { noLine: true } : { mat: "fur" },
				...extra
			},
			role,
			...parent !== void 0 ? { parent } : {}
		});
		return parts.length - 1;
	};
	const head = ell([
		0,
		0,
		0
	], [
		f,
		s,
		u
	], [
		R,
		R * 1.02,
		R * .92
	], D.fur, "head");
	for (const side of [-1, 1]) {
		const ear = ell(at(-.1, side * D.earOut, R * .74), [
			f,
			s,
			u
		], D.ear, D.fur, "ear", head);
		ell(at(D.ear[0] * .55 - .1, side * D.earOut, R * .72), [
			f,
			s,
			u
		], [
			.035,
			D.ear[1] * .62,
			D.ear[2] * .62
		], D.fluff, "decal", ear);
	}
	const face = (af, as, az, r, col, extra = {}) => {
		const n = v3.norm(at(af, as, az)), pos = v3.mul(n, R * .93);
		const sd = v3.norm(v3.add(s, v3.mul(n, -(s[0] * n[0] + s[1] * n[1] + s[2] * n[2]))));
		const ud = [
			n[1] * sd[2] - n[2] * sd[1],
			n[2] * sd[0] - n[0] * sd[2],
			n[0] * sd[1] - n[1] * sd[0]
		];
		ell(pos, [
			n,
			sd,
			ud
		], r, col, "decal", head, {
			...n[2] < .6 ? { n: [n[0], n[1]] } : {},
			...extra
		});
	};
	for (const side of [-1, 1]) {
		if (sleep) face(.84, side * .4, .12, [
			.02,
			.06,
			.014
		], "eye");
		else face(.82, side * .4, .16, [
			.02,
			.045,
			.06
		], "eye");
		face(.65, side * .62, -.22, [
			.02,
			.07,
			.045
		], "cheek", { a: .8 });
	}
	face(.97, 0, -.08, [
		D.nose[0] * .8,
		D.nose[0],
		D.nose[1]
	], "nose", { noLine: false });
	face(.9, -.05, .02, [
		.012,
		.022,
		.035
	], "white", { a: .7 });
	face(.86, 0, -.42, [
		.015,
		.05,
		.015
	], "eye");
	return parts;
}
/**
* 눕기: 천장을 보고 반듯이. 몸·팔다리 = 서기 바탕(팔다리 모양은 시안별)을 뒤로 90° 눕힌 것(타원체는 수평 회전만 되므로 축 바꾸기).
* 머리는 따로: 베개에 기대어 30°쯤 들려 얼굴이 천장과 발 쪽 사이를 본다(위에서 내려다보는 화면에서도 얼굴이 보이게).
* 기준점 = 몸 전체 가운데, 누운 면(z = 0). yaw = 머리 쪽 방향.
*/
function lieParts(o) {
	const D = DESIGNS[o.design ?? DEFAULT_DESIGN], yaw = o.yaw ?? -Math.PI / 2;
	const base = buildParts({
		...o,
		pose: "stand",
		yaw: 0,
		viewYaw: 0,
		sleep: true,
		limbs: "belly"
	});
	const heads = headSet(base);
	const keep = base.map((_, i) => i).filter((i) => !heads.has(i) && base[i].shape.t === "ell");
	const remap = new Map(keep.map((old, k) => [old, k]));
	let out = keep.map((i) => {
		const p = base[i], e = p.shape, { n: _n, ...rest } = e;
		return {
			...p,
			shape: {
				...rest,
				cx: e.cz,
				cy: -e.cy,
				cz: e.cx,
				rx: e.rz,
				ry: e.ry,
				rz: e.rx,
				yaw: 0
			},
			...p.parent !== void 0 ? { parent: remap.get(p.parent) ?? 0 } : {}
		};
	});
	let x0 = Infinity, x1 = -Infinity, z0 = Infinity;
	for (const p of out) {
		const e = p.shape;
		x0 = Math.min(x0, e.cx - e.rx);
		x1 = Math.max(x1, e.cx + e.rx);
		z0 = Math.min(z0, e.cz - e.rz);
	}
	const R = D.head;
	const hc = [
		x1 + R * .55,
		0,
		R * .92 + .06
	];
	const lift = 40 * Math.PI / 180;
	const u = [
		Math.cos(lift),
		0,
		Math.sin(lift)
	], f = [
		-Math.sin(lift),
		0,
		Math.cos(lift)
	];
	const total = [x0, hc[0] + R], mx = (total[0] + total[1]) / 2;
	for (const p of out) {
		const e = p.shape;
		e.cx -= mx;
		e.cz -= z0;
	}
	const bodyIdx = out.findIndex((p) => p.role === "body");
	const head = lieHead(D, f, u, o.sleep ?? true).map((p) => {
		const e = p.shape;
		return {
			...p,
			shape: {
				...e,
				cx: e.cx + hc[0] - mx,
				cy: e.cy,
				cz: e.cz + hc[2]
			},
			parent: p.parent !== void 0 ? p.parent + out.length : bodyIdx
		};
	});
	out = [...out, ...head];
	const c = Math.cos(yaw), sn = Math.sin(yaw);
	for (const p of out) {
		const e = p.shape;
		const x = e.cx, y = e.cy;
		e.cx = x * c - y * sn;
		e.cy = x * sn + y * c;
		e.yaw = yaw;
		if (e.n) {
			const [nx, ny] = e.n;
			e.n = [nx * c - ny * sn, nx * sn + ny * c];
		}
	}
	return out;
}
var grpSeq = 0;
/**
* 관절 팔다리 + 몸통. 반환값 = 몸통 부품 번호.
* 팔다리는 관절점(몸 기준 앞 f, 옆 s, 높이 z)을 잇는 구슬 사슬: 윤곽선 있는 구슬을 먼저,
* 같은 구슬을 선 없이 한 번 더 덮어 겹친 자리의 안쪽 선을 지운다 → 하나로 이어진 팔다리.
*/
function rigLimbs(D, R, pose, swing, bob, c) {
	const { E, P, parts, F } = c;
	const [bf, bs, bz] = D.body;
	const tube = (pts, radii, col, parent) => {
		const g = ++grpSeq;
		const beads = [];
		for (let i = 0; i + 1 < pts.length; i++) {
			const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
			const n = Math.max(1, Math.ceil(len / (Math.min(radii[i], radii[i + 1]) * .7)));
			for (let k = i === 0 ? 0 : 1; k <= n; k++) {
				const t = k / n;
				beads.push([[
					a[0] + (b[0] - a[0]) * t,
					a[1] + (b[1] - a[1]) * t,
					a[2] + (b[2] - a[2]) * t
				], radii[i] + (radii[i + 1] - radii[i]) * t]);
			}
		}
		let prev = parent;
		const ids = [];
		for (const [q, r] of beads) {
			prev = E(P(...q), [
				r,
				r,
				r
			], col, "limb", {}, prev);
			parts[prev].grp = g;
			ids.push(prev);
		}
		beads.forEach(([q, r], i) => {
			const k = E(P(...q), [
				r,
				r,
				r
			], col, "limb", { noLine: true }, ids[i]);
			parts[k].grp = g;
		});
		return prev;
	};
	const sub = (end, q, r, col, extra = {}) => {
		const k = E(P(...q), r, col, "limb", extra, end);
		parts[k].grp = parts[end].grp;
		return k;
	};
	const paw = (end, at, side) => {
		const t = R.armT;
		const palm = sub(end, at, [
			t * .95,
			t * .9,
			t * .85
		], D.furDark);
		sub(end, [
			at[0] + .04,
			at[1] + side * t * .55,
			at[2] - t * .35
		], [
			t * .5,
			t * .45,
			t * .45
		], D.furDark);
		sub(end, [
			at[0] + .05,
			at[1] - side * t * .35,
			at[2] - t * .4
		], [
			t * .55,
			t * .5,
			t * .45
		], D.furDark);
		if (R.claws) for (const o of [
			-.5,
			0,
			.6
		]) sub(palm, [
			at[0] + .07,
			at[1] + side * o * t,
			at[2] - t * .82
		], [
			.014,
			.014,
			.03
		], "nose", { noLine: true });
	};
	const A = R.arm, Lg = R.leg, chest = R.chest ?? D.fluff;
	let body;
	if (pose === "sit") {
		body = E(P(-.02, 0, bz + .04), [
			bf,
			bs,
			bz + .02
		], D.fur, "body");
		for (const side of [-1, 1]) {
			const end = tube([
				[
					.04,
					side * .2,
					.16
				],
				[
					.26 * Lg,
					side * .25,
					.2
				],
				[
					.42 * Lg,
					side * .23,
					.11
				]
			], [
				R.legT,
				R.legT * .85,
				R.legT * .7
			], D.fur, body);
			const t = R.legT;
			sub(end, [
				.47 * Lg,
				side * .23,
				.15
			], [
				t * .45,
				t * .75,
				t * .95
			], D.furDark);
		}
		E(P(bf * .6, 0, bz + .02), [
			.12,
			bs * .66,
			bz * .72
		], chest, "decal", { n: [F[0], F[1]] }, body);
		for (const side of [-1, 1]) {
			const sh = [
				.04,
				side * (bs - .06),
				bz * 1.45
			], el = [
				.12,
				side * (bs + .03),
				bz * 1.45 - .22 * A
			], wr = [
				.3,
				side * bs * .45,
				.3
			];
			paw(tube([
				sh,
				el,
				wr
			], [
				R.armT,
				R.armT * .9,
				R.armT * .8
			], D.fur, body), [
				wr[0] + .04,
				wr[1],
				wr[2] - .02
			], side);
		}
		return body;
	}
	const hipZ = R.hip + bob;
	body = E(P(0, 0, hipZ + bz * .9), [
		bf,
		bs,
		bz
	], D.fur, "body");
	for (const side of [-1, 1]) {
		const fwd = side * swing * .13 * Lg, lift = pose === "walk" ? Math.max(0, side * swing) * .06 : 0;
		const hip = [
			-.02,
			side * .17,
			hipZ + .06
		], knee = [
			.05 + fwd * .6,
			side * .18,
			hipZ * .5 + lift
		], ank = [
			fwd,
			side * .17,
			R.legT * .6 + lift
		];
		sub(tube([
			hip,
			knee,
			ank
		], [
			R.legT,
			R.legT * .85,
			R.legT * .7
		], D.fur, body), [
			fwd + .07,
			ank[1],
			.05 + lift
		], [
			R.legT * 1.05,
			R.legT * .8,
			R.legT * .5
		], D.furDark);
	}
	E(P(bf * .62, 0, hipZ + bz * .85), [
		.12,
		bs * .66,
		bz * .7
	], chest, "decal", { n: [F[0], F[1]] }, body);
	for (const side of [-1, 1]) {
		const fwd = -side * swing * .12 * A;
		const shZ = hipZ + bz * 1.45;
		const sh = [
			.04,
			side * (bs - .06),
			shZ
		];
		let el = R.hug ? [
			.2 + fwd * .5,
			side * (bs + .04),
			shZ - .2 * A
		] : [
			.06 + fwd * .6,
			side * (bs + .04),
			shZ - .2 * A
		];
		let wr = R.hug ? [
			bf + .06 + fwd * .3,
			side * bs * .4,
			shZ - .26 * A
		] : [
			.18 + fwd,
			side * bs * .62,
			shZ - .4 * A
		];
		if (c.limbs === "belly") {
			el = [
				.16,
				side * (bs + .03),
				shZ - .17
			];
			wr = [
				bf + .04,
				side * .08,
				hipZ + bz * .95
			];
		}
		paw(tube([
			sh,
			el,
			wr
		], [
			R.armT,
			R.armT * .9,
			R.armT * .8
		], D.fur, body), [
			wr[0] + .03,
			wr[1],
			wr[2] - .03
		], side);
	}
	return body;
}
/** 그리는 순서: 보는 사람에게서 먼 것부터. 붙은 장식(얼굴 등)은 부모 바로 뒤 */
function order(parts, view) {
	const vx = Math.cos(view), vy = Math.sin(view);
	const depth = (s) => s.t === "ell" ? s.cx * vx + s.cy * vy + s.cz * .15 : 0;
	const grpDepth = /* @__PURE__ */ new Map();
	parts.forEach((p) => {
		if (p.grp !== void 0) {
			const a = grpDepth.get(p.grp) ?? [];
			a.push(depth(p.shape));
			grpDepth.set(p.grp, a);
		}
	});
	const grpKey = new Map([...grpDepth].map(([g, a]) => [g, a.reduce((x, y) => x + y, 0) / a.length]));
	const key = parts.map((p, i) => {
		if (p.grp !== void 0) return grpKey.get(p.grp) + i * 1e-6;
		if (p.role === "decal" && p.parent !== void 0) return depth(parts[p.parent].shape) + .5 + depth(p.shape) * .01 + i * 1e-6;
		if (p.role === "head") return depth(p.shape) + .3;
		if (p.role === "ear" && p.parent !== void 0) return depth(parts[p.parent].shape) + .3 + (depth(p.shape) - depth(parts[p.parent].shape)) * 2;
		if (p.role === "acc") return depth(p.shape) - (p.shape.t === "ell" && p.shape.cz > .9 ? -.25 : 0);
		return depth(p.shape);
	});
	const idx = parts.map((_, i) => i).sort((a, b) => key[a] - key[b]);
	const remap = new Map(idx.map((old, nw) => [old, nw]));
	return idx.map((i) => ({
		...parts[i],
		...parts[i].parent !== void 0 ? { parent: remap.get(parts[i].parent) } : {}
	}));
}
var koalaSeq = 0;
/** 그리기용 도형 목록. 도형마다 부품 정보(kp)를 붙여 compile이 한 덩어리로 부드럽게 그린다 */
function koala(pose = "sit", o = {}) {
	const id = ++koalaSeq;
	return koalaParts({
		...o,
		pose
	}).map((p, i) => ({
		...p.shape,
		kp: {
			id,
			i,
			role: p.role,
			...p.parent !== void 0 ? { parent: p.parent } : {},
			...p.grp !== void 0 ? { grp: p.grp } : {}
		}
	}));
}
// src/data/templates-extra.ts
var EXTRA = [];
var def$2 = (t) => {
	EXTRA.push(t);
};
def$2({
	id: "bed",
	cat: "seat",
	name: {
		ko: "침대",
		en: "Bed"
	},
	place: "floor",
	defaults: {
		c: "oak",
		sheet: "white",
		blanket: "sky"
	},
	size: () => ({
		w: 2.2,
		d: 3.2,
		h: 1.7
	}),
	recipe: (p) => [
		box(0, 0, 0, 2.2, .15, 1.7, str(p, "c"), { mat: "wood" }),
		box(.05, .15, 0, 2.15, 3.2, .55, str(p, "c"), { mat: "wood" }),
		box(.1, .18, .55, 2.1, 3.12, .95, str(p, "sheet"), { mat: "fabric" }),
		ell(1.1, .55, 1.05, .62, .28, .13, str(p, "sheet"), { mat: "fabric" }),
		box(.06, 1.25, .9, 2.14, 3.18, 1.08, str(p, "blanket"), { mat: "knit" }),
		box(.06, 1.25, 1.08, 2.14, 1.6, 1.12, "white", { mat: "fabric" })
	],
	seats: () => [{
		id: "lie",
		pose: "lie",
		x: 1.1,
		y: 1.55,
		z: 1.12,
		facing: "-y"
	}]
});
def$2({
	id: "wardrobe",
	cat: "storage",
	name: {
		ko: "옷장",
		en: "Wardrobe"
	},
	place: "floor",
	defaults: {
		c: "cream",
		top: "oak"
	},
	size: () => ({
		w: 2,
		d: 1,
		h: 4.4
	}),
	recipe: (p) => [
		box(.05, .05, 0, 1.95, .9, .2, "choc", { mat: "wood" }),
		box(0, 0, .2, 2, .95, 4.3, str(p, "c"), { mat: "paint" }),
		line([[
			1,
			.95,
			.3
		], [
			1,
			.95,
			4.2
		]], "#00000050", 1),
		poly([
			[
				.15,
				.951,
				.6
			],
			[
				.85,
				.951,
				.6
			],
			[
				.85,
				.951,
				3.9
			],
			[
				.15,
				.951,
				3.9
			]
		], "glass", { a: .85 }),
		ell(.92, .97, 2.2, .04, .02, .07, "brass", { noLine: true }),
		ell(1.08, .97, 2.2, .04, .02, .07, "brass", { noLine: true }),
		box(0, 0, 4.3, 2, 1, 4.4, str(p, "top"), { mat: "wood" })
	]
});
def$2({
	id: "gumTree",
	shadow: "round",
	cat: "outdoor",
	name: {
		ko: "유칼립투스 나무",
		en: "Gum tree"
	},
	place: "outdoor",
	defaults: {
		seed: 1,
		k: 1.5,
		kind: "gum"
	},
	size: (p) => ({
		w: 2 * num$1(p, "k"),
		d: 2 * num$1(p, "k"),
		h: 4.8 * num$1(p, "k")
	}),
	recipe(p) {
		if (str(p, "kind") === "pine") return scaled([cyl(1, 1, 0, 1.4, .16, .12, "walnut", { mat: "wood" }), ...[
			[
				.9,
				2.4,
				.95
			],
			[
				1.9,
				3.5,
				.75
			],
			[
				2.9,
				4.6,
				.52
			]
		].map(([z0, z1, rr]) => cyl(1, 1, z0, z1, rr, .05, "leafDark", { mat: "plant" }))], num$1(p, "k"));
		const R = rng(num$1(p, "seed"));
		const r = [
			cyl(1, 1, 0, 2.8, .2, .11, "gumBark", { mat: "wood" }),
			line([[
				1,
				1,
				2.1
			], [
				.55,
				1.2,
				2.9
			]], "gumBark", 3),
			line([[
				1,
				1,
				2.3
			], [
				1.45,
				.8,
				3.1
			]], "gumBark", 3)
		];
		[
			[
				1,
				1,
				3.55,
				.72
			],
			[
				.6,
				1.15,
				3.15,
				.42
			],
			[
				1.42,
				.82,
				3.3,
				.45
			],
			[
				1.02,
				1.35,
				4.1,
				.48
			],
			[
				.85,
				.75,
				4.05,
				.4
			]
		].forEach(([x, y, z, s], i) => r.push(ell(x, y, z, s, s, s * .85, i % 2 ? "gumLeaf" : R() > .5 ? "sage" : "olive", { mat: "plant" })));
		return scaled(r, num$1(p, "k"));
	}
});
def$2({
	id: "roundTree",
	shadow: "round",
	cat: "outdoor",
	name: {
		ko: "둥근 나무",
		en: "Round tree"
	},
	place: "outdoor",
	defaults: {
		leaf: "leaf",
		k: 1.5,
		fruit: "none"
	},
	size: (p) => ({
		w: 2 * num$1(p, "k"),
		d: 2 * num$1(p, "k"),
		h: 4.2 * num$1(p, "k")
	}),
	recipe: (p) => scaled([
		cyl(1, 1, 0, 2.2, .17, .12, "walnut", { mat: "wood" }),
		ell(1, 1, 3, .92, .92, 1, str(p, "leaf"), { mat: "plant" }),
		ell(.72, 1.2, 3.3, .38, .38, .38, str(p, "leaf") === "pink" ? "white" : "leafLight", { mat: "plant" }),
		...str(p, "fruit") === "apple" ? [
			[
				1.5,
				1.6,
				2.9
			],
			[
				1,
				1.85,
				3.3
			],
			[
				1.75,
				1,
				3.2
			],
			[
				1.35,
				1.75,
				3.7
			],
			[
				.6,
				1.75,
				2.8
			]
		].map(([x, y, z]) => ell(x, y, z, .1, .1, .1, "red", { noLine: true })) : []
	], num$1(p, "k"))
});
def$2({
	id: "bush",
	shadow: "round",
	cat: "outdoor",
	name: {
		ko: "덤불",
		en: "Bush"
	},
	place: "outdoor",
	defaults: {
		c: "leaf",
		f: "none"
	},
	size: () => ({
		w: 1,
		d: 1,
		h: .95
	}),
	recipe(p) {
		const r = [
			ell(.38, .45, .4, .34, .34, .36, "leafDark", { mat: "plant" }),
			ell(.62, .55, .45, .36, .36, .4, str(p, "c"), { mat: "plant" }),
			ell(.5, .42, .68, .26, .26, .26, "leafLight", { mat: "plant" })
		];
		if (str(p, "f") !== "none") for (const [x, y, z] of [
			[
				.35,
				.72,
				.55
			],
			[
				.7,
				.8,
				.5
			],
			[
				.55,
				.62,
				.86
			]
		]) r.push(ell(x, y, z, .06, .06, .06, str(p, "f"), { noLine: true }));
		return r;
	}
});
def$2({
	id: "flowerBed",
	cat: "outdoor",
	name: {
		ko: "꽃밭",
		en: "Flower bed"
	},
	place: "outdoor",
	defaults: {
		w: 3,
		seed: 2,
		cols: "coral,butter,pink,lilac"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: 1,
		h: .65
	}),
	recipe(p) {
		const w = num$1(p, "w"), R = rng(num$1(p, "seed")), cols = str(p, "cols").split(",");
		const r = [box(0, 0, 0, w, 1, .22, "brick", { mat: "paint" }), poly([
			[
				.1,
				.1,
				.221
			],
			[
				w - .1,
				.1,
				.221
			],
			[
				w - .1,
				.9,
				.221
			],
			[
				.1,
				.9,
				.221
			]
		], "soil")];
		for (let x = .3; x < w - .35; x += .4) for (const y of [.3, .68]) {
			const z = .36 + R() * .12;
			r.push(ell(x + R() * .1, y, z - .08, .1, .1, .08, "leaf", { noLine: true }));
			r.push(ell(x + R() * .1, y + .02, z + .08, .075, .075, .07, cols[Math.floor(R() * cols.length)]));
		}
		return r;
	}
});
/** 4단계 ② 축제: 장터 가판대(줄무늬 차양 + 물건) */
def$2({
	id: "stall",
	cat: "outdoor",
	name: {
		ko: "장터 가판대",
		en: "Market stall"
	},
	place: "outdoor",
	defaults: {
		c: "coral",
		goods: "fruit"
	},
	size: () => ({
		w: 2.4,
		d: 1.4,
		h: 2.4
	}),
	recipe(p) {
		const c = str(p, "c"), goods = str(p, "goods"), r = [
			box(.1, .3, 0, 2.3, 1.3, .9, "oak", { mat: "wood" }),
			box(.05, .25, .9, 2.35, 1.35, .98, "walnut", { mat: "wood" }),
			box(.12, .3, .98, .2, .38, 2.1, "walnut", { mat: "wood" }),
			box(2.2, .3, .98, 2.28, .38, 2.1, "walnut", { mat: "wood" })
		];
		for (let i = 0, x = 0; x < 2.4 - 1e-6; x += .4, i++) r.push(poly([
			[
				x,
				0,
				2.1
			],
			[
				x + .4,
				0,
				2.1
			],
			[
				x + .4,
				1.4,
				1.8
			],
			[
				x,
				1.4,
				1.8
			]
		], i % 2 ? "white" : c));
		const R = rng(goods.length * 7);
		for (let k = 0; k < 9; k++) {
			const x = .35 + k % 5 * .4, y = .55 + Math.floor(k / 5) * .4;
			r.push(goods === "fruit" ? ell(x, y, 1.08, .1, .1, .09, [
				"#e0483a",
				"#f2a33a",
				"#f2d34e",
				"#7fb35a"
			][Math.floor(R() * 4)]) : box(x - .1, y - .1, .98, x + .1, y + .1, 1.14, [
				"sky",
				"pink",
				"butter",
				"mint"
			][Math.floor(R() * 4)], { mat: "paint" }));
		}
		return r;
	}
});
/** 4단계 미션 보상 전용 새 그림(시안): 우표 액자 */
def$2({
	id: "stampFrame",
	cat: "wall",
	name: {
		ko: "우표 액자",
		en: "Stamp frame"
	},
	place: "wall",
	defaults: {},
	size: () => ({
		w: 1.2,
		d: .08,
		h: .95
	}),
	recipe() {
		const r = [box(0, 0, 0, 1.2, .06, .95, "#c9a24a", { mat: "wood" }), poly([
			[
				.08,
				.061,
				.08
			],
			[
				1.12,
				.061,
				.08
			],
			[
				1.12,
				.061,
				.87
			],
			[
				.08,
				.061,
				.87
			]
		], "cream")];
		[
			"#cfe6d8",
			"#f6d6b8",
			"#bfe0ec",
			"#f6e1dd",
			"#e5eed8",
			"#d6e6f2"
		].forEach((c, i) => {
			const x = .16 + i % 3 * .32, z = .5 - Math.floor(i / 3) * .36;
			r.push(poly([
				[
					x,
					.063,
					z
				],
				[
					x + .24,
					.063,
					z
				],
				[
					x + .24,
					.063,
					z + .3
				],
				[
					x,
					.063,
					z + .3
				]
			], "white"), poly([
				[
					x + .03,
					.065,
					z + .03
				],
				[
					x + .21,
					.065,
					z + .03
				],
				[
					x + .21,
					.065,
					z + .27
				],
				[
					x + .03,
					.065,
					z + .27
				]
			], c), ell(x + .12, .066, z + .15, .05, .004, .05, [
				"#8f9aa3",
				"#b8763f",
				"#7a5a43",
				"#d63a3a",
				"#f5c533",
				"#fbfaf6"
			][i], { noLine: true }));
		});
		return r;
	}
});
/** 미션 보상 새 그림(시안): 편지 머그(봉투 무늬 + 하트 실링) */
def$2({
	id: "letterMug",
	cat: "small",
	name: {
		ko: "편지 머그",
		en: "Letter mug"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .4,
		d: .32,
		h: .34
	}),
	recipe() {
		return [
			cyl(.16, .16, 0, .3, .13, .14, "white", {
				mat: "ceramic",
				top: "#6b4a33"
			}),
			ell(.32, .16, .16, .07, .025, .08, "white", { mat: "ceramic" }),
			poly([
				[
					.06,
					.295,
					.08
				],
				[
					.26,
					.295,
					.08
				],
				[
					.26,
					.295,
					.22
				],
				[
					.06,
					.295,
					.22
				]
			], "#f6e3c4"),
			line([
				[
					.06,
					.296,
					.22
				],
				[
					.16,
					.296,
					.14
				],
				[
					.26,
					.296,
					.22
				]
			], "#c4724a", 1.5),
			ell(.16, .297, .14, .025, .004, .025, "#d63a3a", { noLine: true })
		];
	}
});
/** 미션 보상 새 그림(시안): 빨간 우체통 모양 편지 상자(바닥) */
def$2({
	id: "letterBox",
	cat: "box",
	name: {
		ko: "편지 상자",
		en: "Letter box"
	},
	place: "floor",
	defaults: {},
	size: () => ({
		w: .7,
		d: .6,
		h: 1.2
	}),
	recipe() {
		return [
			box(.25, .22, 0, .45, .38, .5, "charcoal", { mat: "metal" }),
			box(.05, .05, .5, .65, .55, 1, "#d63a3a", { mat: "paint" }),
			cyl(.35, .3, 1, 1.18, .3, .3, "#d63a3a", { mat: "paint" }),
			box(.18, .548, .82, .52, .56, .88, "charcoal", { mat: "metal" }),
			poly([
				[
					.2,
					.552,
					.58
				],
				[
					.5,
					.552,
					.58
				],
				[
					.5,
					.552,
					.74
				],
				[
					.2,
					.552,
					.74
				]
			], "#f6e3c4"),
			ell(.35, .553, .66, .03, .004, .03, "#d63a3a", { noLine: true })
		];
	}
});
/** 미션 보상 새 그림(시안): 우체부 등(봉투 모양 갓) */
def$2({
	id: "postieLamp",
	cat: "light",
	name: {
		ko: "우체부 등",
		en: "Postie lamp"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .5,
		d: .4,
		h: .8
	}),
	recipe() {
		return [
			cyl(.25, .2, 0, .04, .16, .16, "#3d74a8", { mat: "metal" }),
			cyl(.25, .2, .04, .5, .025, .025, "#3d74a8", { mat: "metal" }),
			box(.04, .06, .48, .46, .34, .78, "#f6e3c4", { mat: "fabric" }),
			line([
				[
					.04,
					.341,
					.78
				],
				[
					.25,
					.341,
					.62
				],
				[
					.46,
					.341,
					.78
				]
			], "#c4724a", 2),
			ell(.25, .343, .62, .035, .004, .035, "#d63a3a", { noLine: true })
		];
	}
});
/** 미션 보상 새 그림(시안): 펠리컨 우체부 인형 */
def$2({
	id: "pelicanFigure",
	cat: "small",
	name: {
		ko: "펠리컨 인형",
		en: "Pelican figure"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .45,
		d: .62,
		h: .62
	}),
	recipe() {
		return [
			cyl(.2, .2, 0, .04, .18, .17, "#c98a52", { mat: "wood" }),
			ell(.2, .17, .2, .13, .12, .16, "#f4f1ea"),
			ell(.09, .17, .22, .04, .1, .11, "#b9b4aa"),
			ell(.2, .25, .44, .075, .075, .075, "#f4f1ea"),
			ell(.265, .27, .47, .004, .014, .014, "#2b2a30", { noLine: true }),
			poly([
				[
					.2,
					.31,
					.4
				],
				[
					.2,
					.42,
					.37
				],
				[
					.2,
					.52,
					.34
				],
				[
					.2,
					.57,
					.33
				],
				[
					.2,
					.54,
					.31
				],
				[
					.2,
					.46,
					.25
				],
				[
					.2,
					.38,
					.24
				],
				[
					.2,
					.32,
					.3
				]
			], "#f6c46a"),
			poly([
				[
					.201,
					.3,
					.45
				],
				[
					.201,
					.42,
					.41
				],
				[
					.201,
					.54,
					.36
				],
				[
					.201,
					.6,
					.35
				],
				[
					.201,
					.58,
					.33
				],
				[
					.201,
					.52,
					.34
				],
				[
					.201,
					.4,
					.38
				],
				[
					.201,
					.31,
					.41
				]
			], "#f08a24"),
			cyl(.2, .25, .5, .57, .065, .065, "#3d74a8", { mat: "fabric" }),
			box(.15, .29, .5, .25, .36, .52, "#2b5a85", { mat: "fabric" })
		];
	}
});
/** 미션 보상 새 그림(시안): 뻐꾸기 벽시계 */
def$2({
	id: "cuckooClock",
	cat: "wall",
	name: {
		ko: "뻐꾸기 시계",
		en: "Cuckoo clock"
	},
	place: "wall",
	defaults: {},
	size: () => ({
		w: .8,
		d: .22,
		h: 1.2
	}),
	recipe() {
		return [
			box(.1, 0, .4, .7, .18, .95, "#8a5a36", { mat: "wood" }),
			poly([
				[
					.02,
					.18,
					.95
				],
				[
					.78,
					.18,
					.95
				],
				[
					.4,
					.18,
					1.2
				]
			], "#6b4423"),
			disc("y", .4, .2, .66, .2, "cream"),
			line([[
				.4,
				.203,
				.66
			], [
				.4,
				.203,
				.8
			]], "#2b2a30", 2),
			line([[
				.4,
				.203,
				.66
			], [
				.5,
				.203,
				.66
			]], "#2b2a30", 2),
			box(.33, .12, .92, .47, .2, 1.04, "#f2a33a", { mat: "paint" }),
			line([[
				.32,
				.1,
				.4
			], [
				.32,
				.1,
				.05
			]], "#b0612c", 1.2),
			line([[
				.48,
				.1,
				.4
			], [
				.48,
				.1,
				.12
			]], "#b0612c", 1.2),
			cyl(.32, .1, 0, .08, .04, .04, "#c9a24a", { mat: "metal" }),
			cyl(.48, .1, .06, .14, .04, .04, "#c9a24a", { mat: "metal" })
		];
	}
});
/** 미션 보상 새 그림(시안): 지구본과 책 */
def$2({
	id: "globeBooks",
	cat: "small",
	name: {
		ko: "지구본과 책",
		en: "Globe & books"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .6,
		d: .4,
		h: .6
	}),
	recipe() {
		return [
			box(.02, .04, 0, .58, .36, .07, "#5b4a8a", { mat: "fabric" }),
			box(.04, .05, .07, .54, .35, .13, "#c8553d", { mat: "fabric" }),
			cyl(.3, .2, .13, .17, .08, .08, "#c9a24a", { mat: "metal" }),
			cyl(.3, .2, .17, .3, .015, .015, "#c9a24a", { mat: "metal" }),
			ell(.3, .2, .42, .15, .15, .15, "#6fb6dd"),
			ell(.27, .32, .46, .06, .02, .05, "#7fb35a", { noLine: true }),
			ell(.36, .33, .38, .04, .02, .04, "#7fb35a", { noLine: true })
		];
	}
});
/** 미션 보상 새 그림(시안): 3단 케이크 접시 */
def$2({
	id: "cakeStand",
	cat: "small",
	name: {
		ko: "케이크 접시",
		en: "Cake stand"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .5,
		d: .5,
		h: .6
	}),
	recipe() {
		const r = [cyl(.25, .25, 0, .56, .015, .015, "#c9a24a", { mat: "metal" })];
		for (const [z, rr] of [
			[.04, .24],
			[.24, .18],
			[.42, .12]
		]) {
			r.push(cyl(.25, .25, z, z + .02, rr, rr, "white", { mat: "ceramic" }));
			for (let k = 0; k < 4; k++) {
				const a = k / 4 * Math.PI * 2;
				r.push(ell(.25 + Math.cos(a) * rr * .55, .25 + Math.sin(a) * rr * .55, z + .06, .04, .04, .04, [
					"#f6b7c8",
					"#f2d34e",
					"#c98a52",
					"#7fb35a"
				][k]));
			}
		}
		return r;
	}
});
/** 4단계 ⑥ 방 테마 전용 새 그림: 공부방 — 코알라 연필꽂이 */
def$2({
	id: "koalaPencilCup",
	cat: "small",
	name: {
		ko: "코알라 연필꽂이",
		en: "Koala pencil cup"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .36,
		d: .3,
		h: .58
	}),
	recipe() {
		const r = [];
		[
			["#f2c94c", -.05],
			["#3d74a8", 0],
			["#d63a3a", .05]
		].forEach(([c, dx], i) => r.push(cyl(.12 + dx * 1.4, .13, .2, .5 + i * .03, .024, .024, c, {
			mat: "wood",
			top: "#f6d6b8"
		})));
		r.push(cyl(.16, .15, 0, .26, .12, .12, "#a7b0b8", { mat: "ceramic" }), ell(.06, .15, .27, .05, .03, .05, "#8f9aa3"), ell(.26, .15, .27, .05, .03, .05, "#8f9aa3"), ell(.16, .27, .13, .03, .006, .04, "#3d3b45", { noLine: true }), ell(.11, .27, .18, .012, .004, .012, "#2b2a30", { noLine: true }), ell(.21, .27, .18, .012, .004, .012, "#2b2a30", { noLine: true }));
		return r;
	}
});
/** 놀이방 — 무지개 고리 쌓기 */
def$2({
	id: "ringStacker",
	cat: "toy",
	name: {
		ko: "무지개 고리 쌓기",
		en: "Rainbow ring stacker"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .36,
		d: .36,
		h: .5
	}),
	recipe() {
		const r = [cyl(.18, .18, 0, .04, .16, .16, "#8a5a36", { mat: "wood" }), cyl(.18, .18, .04, .44, .025, .025, "#c98a52", { mat: "wood" })];
		[
			"#d63a3a",
			"#f2a33a",
			"#f2d34e",
			"#7fb35a",
			"#4f9fd0",
			"#8a6bbf"
		].forEach((c, i) => {
			const rr = .15 - i * .018;
			r.push(cyl(.18, .18, .04 + i * .06, .1 + i * .06, rr, rr, c, { mat: "paint" }));
		});
		r.push(ell(.18, .18, .46, .045, .045, .04, "#f2d34e"));
		return r;
	}
});
/** 부엌 — 코알라 쿠키 병 */
def$2({
	id: "cookieJar",
	cat: "small",
	name: {
		ko: "코알라 쿠키 병",
		en: "Koala cookie jar"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .4,
		d: .36,
		h: .5
	}),
	recipe() {
		return [
			cyl(.2, .18, 0, .32, .15, .15, "#d6ecf2", { mat: "glass" }),
			ell(.13, .22, .1, .05, .05, .03, "#c98a52"),
			ell(.25, .25, .16, .05, .05, .03, "#b8763f"),
			ell(.18, .28, .22, .05, .05, .03, "#c98a52"),
			cyl(.2, .18, .32, .38, .16, .16, "#a7b0b8", { mat: "ceramic" }),
			ell(.2, .18, .4, .08, .08, .05, "#a7b0b8"),
			ell(.1, .18, .44, .05, .03, .05, "#8f9aa3"),
			ell(.3, .18, .44, .05, .03, .05, "#8f9aa3"),
			ell(.2, .26, .41, .02, .006, .025, "#3d3b45", { noLine: true })
		];
	}
});
/** 욕실 — 고무 오리 셋 */
def$2({
	id: "rubberDucks",
	cat: "small",
	name: {
		ko: "고무 오리 셋",
		en: "Rubber ducks"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .5,
		d: .4,
		h: .26
	}),
	recipe() {
		const r = [cyl(.25, .2, 0, .035, .2, .17, "#9fd3e6", { mat: "ceramic" })];
		[
			[.11, 1],
			[.27, .75],
			[.39, .65]
		].forEach(([x, s]) => {
			const k = s, cx = x, cy = .17, z = .035;
			r.push(ell(cx, cy, z + .06 * k, .07 * k, .09 * k, .06 * k, "#f2d34e"), ell(cx, cy + .04 * k, z + .145 * k, .05 * k, .05 * k, .05 * k, "#f2d34e"), poly([
				[
					cx - .025 * k,
					cy + .085 * k,
					z + .14 * k
				],
				[
					cx + .025 * k,
					cy + .085 * k,
					z + .14 * k
				],
				[
					cx,
					cy + .125 * k,
					z + .13 * k
				]
			], "#f2a33a"), ell(cx + .03 * k, cy + .065 * k, z + .165 * k, .008, .004, .008, "#2b2a30", { noLine: true }), ell(cx - .03 * k, cy + .065 * k, z + .165 * k, .008, .004, .008, "#2b2a30", { noLine: true }));
		});
		return r;
	}
});
/** 침실 — 달과 별 무드등 */
def$2({
	id: "moonLamp",
	cat: "light",
	name: {
		ko: "달과 별 무드등",
		en: "Moon & star lamp"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .4,
		d: .3,
		h: .5
	}),
	recipe() {
		return [
			box(.04, .06, 0, .36, .24, .05, "#5b4a8a", { mat: "wood" }),
			cyl(.2, .15, .05, .12, .012, .012, "#c9a24a", { mat: "metal" }),
			ell(.2, .15, .28, .15, .06, .15, "#fff1b8"),
			ell(.26, .17, .32, .11, .05, .12, "#5b4a8a"),
			poly([
				[
					.08,
					.2,
					.42
				],
				[
					.1,
					.2,
					.46
				],
				[
					.12,
					.2,
					.42
				],
				[
					.1,
					.2,
					.38
				]
			], "#f2d34e")
		];
	}
});
/** 거실 — 코알라 쿠션 */
def$2({
	id: "koalaCushion",
	cat: "small",
	name: {
		ko: "코알라 쿠션",
		en: "Koala cushion"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .5,
		d: .2,
		h: .46
	}),
	recipe() {
		return [
			ell(.09, .1, .36, .08, .06, .08, "#8f9aa3"),
			ell(.41, .1, .36, .08, .06, .08, "#8f9aa3"),
			ell(.09, .15, .36, .04, .02, .04, "#e8d6dd"),
			ell(.41, .15, .36, .04, .02, .04, "#e8d6dd"),
			ell(.25, .1, .21, .2, .09, .2, "#a7b0b8", { mat: "fabric" }),
			ell(.25, .19, .18, .04, .01, .055, "#3d3b45", { noLine: true }),
			ell(.17, .19, .25, .015, .005, .015, "#2b2a30", { noLine: true }),
			ell(.33, .19, .25, .015, .005, .015, "#2b2a30", { noLine: true })
		];
	}
});
/** 화장실 — 선인장 화분 */
def$2({
	id: "cactusPot",
	cat: "plant",
	name: {
		ko: "선인장 화분",
		en: "Cactus pot"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .34,
		d: .3,
		h: .5
	}),
	recipe() {
		return [
			cyl(.17, .15, 0, .14, .11, .1, "#e7895f", {
				mat: "ceramic",
				top: "#6b4a33"
			}),
			cyl(.17, .15, .14, .42, .055, .055, "#6fae6a"),
			ell(.17, .15, .42, .055, .055, .04, "#6fae6a"),
			cyl(.08, .15, .24, .34, .03, .03, "#6fae6a"),
			ell(.08, .15, .34, .03, .03, .025, "#6fae6a"),
			box(.08, .13, .22, .13, .17, .25, "#6fae6a"),
			ell(.17, .15, .47, .03, .03, .02, "#f6b7c8")
		];
	}
});
/** 서재 — 펼친 그림책 받침대 */
def$2({
	id: "bookStand",
	cat: "small",
	name: {
		ko: "펼친 그림책 받침대",
		en: "Open picture book"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .5,
		d: .34,
		h: .36
	}),
	recipe() {
		return [
			box(.05, .05, 0, .45, .3, .03, "#8a5a36", { mat: "wood" }),
			poly([
				[
					.06,
					.24,
					.04
				],
				[
					.06,
					.08,
					.3
				],
				[
					.25,
					.08,
					.3
				],
				[
					.25,
					.24,
					.04
				]
			], "#c8553d"),
			poly([
				[
					.25,
					.24,
					.04
				],
				[
					.25,
					.08,
					.3
				],
				[
					.44,
					.08,
					.3
				],
				[
					.44,
					.24,
					.04
				]
			], "#c8553d"),
			poly([
				[
					.08,
					.235,
					.05
				],
				[
					.08,
					.085,
					.29
				],
				[
					.245,
					.09,
					.3
				],
				[
					.245,
					.24,
					.05
				]
			], "#fbf3e2"),
			poly([
				[
					.255,
					.24,
					.05
				],
				[
					.255,
					.09,
					.3
				],
				[
					.42,
					.085,
					.29
				],
				[
					.42,
					.235,
					.05
				]
			], "#fbf3e2"),
			ell(.16, .17, .18, .04, .03, .04, "#7fb35a", { noLine: true }),
			ell(.34, .17, .2, .035, .03, .035, "#f2a33a", { noLine: true })
		];
	}
});
/** 작업실 — 공구 벽판 */
def$2({
	id: "toolBoard",
	cat: "wall",
	name: {
		ko: "공구 벽판",
		en: "Tool board"
	},
	place: "wall",
	defaults: {},
	size: () => ({
		w: 1.1,
		d: .12,
		h: .8
	}),
	recipe() {
		const y = .05, r = [box(0, 0, 0, 1.1, y, .8, "#d9b98a", { mat: "wood" })];
		for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) r.push(ell(.1 + i * .113, .051000000000000004, .1 + j * .12, .008, .002, .008, "#8a6a4f", { noLine: true }));
		r.push(box(.12, y, .25, .15, .08, .62, "#8a5a36"), box(.08, y, .55, .19, .09, .66, "#8f9aa3", { mat: "metal" }), box(.36, y, .2, .39, .08, .5, "#d63a3a"), box(.355, y, .5, .395, .08, .66, "#a7b0b8", { mat: "metal" }), line([[
			.55,
			.08,
			.62
		], [
			.68,
			.08,
			.3
		]], "#3d74a8", 4), line([[
			.68,
			.08,
			.62
		], [
			.55,
			.08,
			.3
		]], "#3d74a8", 4), box(.82, y, .2, .98, .09, .36, "#f2d34e"), line([[
			.82,
			.1,
			.5
		], [
			.98,
			.1,
			.5
		]], "#8f9aa3", 3));
		return r;
	}
});
/** 세탁실 — 양말 빨랫줄 */
def$2({
	id: "sockLine",
	cat: "wall",
	name: {
		ko: "양말 빨랫줄",
		en: "Sock washing line"
	},
	place: "wall",
	defaults: {},
	size: () => ({
		w: 1.2,
		d: .12,
		h: .64
	}),
	recipe() {
		const y = .06, sag = (x) => .56 - .05 * (1 - ((x - .6) / .57) ** 2), r = [box(0, 0, .5, .06, y, .62, "#8a5a36", { mat: "wood" }), box(1.14, 0, .5, 1.2, y, .62, "#8a5a36", { mat: "wood" })];
		[
			"#d63a3a",
			"#7fb35a",
			"#4f9fd0",
			"#f2a33a",
			"#8a6bbf"
		].forEach((c, i) => {
			const x = .16 + i * .2, top = sag(x + .04), sy = .06999999999999999;
			r.push(poly([
				[
					x,
					sy,
					top
				],
				[
					x + .08,
					sy,
					top
				],
				[
					x + .08,
					sy,
					top - .2
				],
				[
					x + .14,
					sy,
					top - .22
				],
				[
					x + .14,
					sy,
					top - .28
				],
				[
					x,
					sy,
					top - .28
				]
			], c), poly([
				[
					x,
					.071,
					top
				],
				[
					x + .08,
					.071,
					top
				],
				[
					x + .08,
					.071,
					top - .04
				],
				[
					x,
					.071,
					top - .04
				]
			], "white"), box(x + .025, .075, top - .03, x + .055, .09999999999999999, top + .035, "#c98a52", { mat: "wood" }));
		});
		r.push(line(Array.from({ length: 13 }, (_, k) => {
			const x = .03 + k * .095;
			return [
				x,
				.08,
				sag(x)
			];
		}), "#5b4a3a", 2));
		return r;
	}
});
/** 시네마룸 — 팝콘 기계 */
def$2({
	id: "popcornCart",
	cat: "box",
	name: {
		ko: "팝콘 기계",
		en: "Popcorn machine"
	},
	place: "floor",
	defaults: {},
	size: () => ({
		w: .6,
		d: .5,
		h: 1.34
	}),
	recipe() {
		const RED = "#d63a3a", POP = "#fff6d8";
		const r = [box(.05, .05, .08, .55, .45, .6, RED, { mat: "paint" })];
		for (let i = 0; i < 5; i++) r.push(box(.05 + i * .1, .448, .08, .1 + i * .1, .452, .6, "#ffffff", { noLine: true }));
		r.push(cyl(.12, .42, 0, .1, .06, .06, "#555"), cyl(.48, .42, 0, .1, .06, .06, "#555"), box(.05, .05, .6, .55, .45, 1.1, "#d6ecf2", {
			mat: "glass",
			a: .55
		}));
		for (let i = 0; i < 26; i++) {
			const fx = i * 37 % 100 / 100, fy = i * 61 % 100 / 100, fz = i * 23 % 100 / 100;
			const cx = .1 + .4 * fx, cy = .1 + .3 * fy, cz = .62 + fz * .08 + (.5 - Math.abs(fx - .5)) * .1, c = i % 5 === 0 ? "#ffe08a" : POP;
			r.push(ell(cx, cy, cz, .03, .03, .025, c, { noLine: true }), ell(cx + .022, cy, cz + .015, .022, .022, .02, c, { noLine: true }), ell(cx - .015, cy + .012, cz + .02, .02, .02, .018, POP, { noLine: true }));
		}
		r.push(box(.03, .03, 1.1, .57, .47, 1.16, RED, { mat: "paint" }), poly(Array.from({ length: 10 }, (_, k) => {
			const a = Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? .035 : .08;
			return [
				.3 + Math.cos(a) * rr,
				.25,
				1.25 + Math.sin(a) * rr
			];
		}), "#f2d34e"));
		return r;
	}
});
/** 4단계 ⑤ 마을 게시판(주민 부탁 시안 b) */
def$2({
	id: "noticeBoard",
	cat: "outdoor",
	name: {
		ko: "마을 게시판",
		en: "Notice board"
	},
	place: "outdoor",
	defaults: {},
	size: () => ({
		w: 2.8,
		d: .6,
		h: 2.6
	}),
	recipe() {
		const r = [
			box(.1, .2, 0, .3, .4, 2.4, "walnut", { mat: "wood" }),
			box(2.5, .2, 0, 2.7, .4, 2.4, "walnut", { mat: "wood" }),
			box(0, .25, .9, 2.8, .4, 2.3, "oak", { mat: "wood" }),
			box(-.1, .1, 2.3, 2.9, .6, 2.5, "roofRed", { mat: "paint" })
		];
		for (const [x, z, c] of [
			[
				.3,
				1.5,
				"white"
			],
			[
				1,
				1.7,
				"butter"
			],
			[
				1.7,
				1.4,
				"sky"
			],
			[
				.6,
				1.05,
				"pink"
			],
			[
				1.5,
				1,
				"mint"
			]
		]) r.push(poly([
			[
				x,
				.41,
				z
			],
			[
				x + .55,
				.41,
				z
			],
			[
				x + .55,
				.41,
				z + .6
			],
			[
				x,
				.41,
				z + .6
			]
		], c), ell(x + .27, .42, z + .55, .04, .01, .04, "coral", { noLine: true }));
		return r;
	}
});
/** 4단계 ④ 도감 트로피(선반·탁자 위에 올리는 소품). c = 금·은·동 */
def$2({
	id: "trophy",
	cat: "small",
	name: {
		ko: "트로피",
		en: "Trophy"
	},
	place: "surface",
	defaults: { c: "gold" },
	size: () => ({
		w: .5,
		d: .5,
		h: .75
	}),
	recipe(p) {
		const c = {
			gold: "#e9b949",
			silver: "#c9ced6",
			bronze: "#c98a52"
		}[str(p, "c")] ?? "#e9b949";
		return [
			box(.08, .08, 0, .42, .42, .12, "walnut", { mat: "wood" }),
			box(.14, .14, .12, .36, .36, .2, "choc", { mat: "wood" }),
			cyl(.25, .25, .2, .36, .04, .04, c, { mat: "metal" }),
			cyl(.25, .25, .36, .66, .08, .17, c, { mat: "metal" }),
			ell(.08, .25, .55, .07, .02, .08, c, { mat: "metal" }),
			ell(.42, .25, .55, .07, .02, .08, c, { mat: "metal" }),
			ell(.25, .42, .5, .05, .01, .05, "white", { noLine: true })
		];
	}
});
/** 4단계 ② 축제: 무대(단 + 뒤판 + 깃발) */
def$2({
	id: "festStage",
	cat: "outdoor",
	name: {
		ko: "축제 무대",
		en: "Festival stage"
	},
	place: "outdoor",
	defaults: { c: "coral" },
	size: () => ({
		w: 9,
		d: 4,
		h: 4.6
	}),
	recipe(p) {
		const c = str(p, "c"), r = [
			box(0, .6, 0, 9, 4, .7, "walnut", { mat: "wood" }),
			box(.2, .8, .7, 8.8, 4, .75, "oak", { mat: "wood" }),
			box(.2, .6, .75, 8.8, .9, 4, c, { mat: "fabric" }),
			box(0, .5, 0, .3, .9, 4.6, "walnut", { mat: "wood" }),
			box(8.7, .5, 0, 9, .9, 4.6, "walnut", { mat: "wood" }),
			box(0, .5, 4.3, 9, .9, 4.6, "butter", { mat: "paint" }),
			box(3.6, 3.95, 0, 5.4, 4, .7, "oak", { mat: "wood" })
		];
		for (let x = .4, i = 0; x < 8.7; x += .6, i++) r.push(poly([
			[
				x,
				.92,
				4.3
			],
			[
				x + .5,
				.92,
				4.3
			],
			[
				x + .25,
				.92,
				3.9
			]
		], [
			"sky",
			"pink",
			"butter",
			"mint"
		][i % 4]));
		for (const x of [2.2, 6.8]) r.push(cyl(x, 2.6, .75, 1.9, .05, .05, "charcoal", { mat: "metal" }), ell(x, 2.6, 1.95, .12, .12, .12, "charcoal"));
		return r;
	}
});
/** 4단계 ② 축제: 하늘의 불꽃(그림자 없음) */
def$2({
	id: "fireworks",
	shadow: "none",
	cat: "outdoor",
	name: {
		ko: "불꽃놀이",
		en: "Fireworks"
	},
	place: "outdoor",
	defaults: { seed: 1 },
	size: () => ({
		w: 6,
		d: 6,
		h: 18
	}),
	recipe(p) {
		const R = rng(num$1(p, "seed")), r = [], cols = [
			"#ffd166",
			"#ef476f",
			"#7bdff2",
			"#b2f7a1",
			"#f7a6ff"
		];
		for (let b = 0; b < 3; b++) {
			const cx = 1 + R() * 4, cy = 1 + R() * 4, cz = 11 + R() * 4, rad = 2.6 + R() * 1.4, c = cols[Math.floor(R() * cols.length)];
			for (let k = 0; k < 14; k++) {
				const a = k / 14 * Math.PI * 2, e = (R() - .5) * .8;
				r.push(line([[
					cx + Math.cos(a) * rad * .3,
					cy,
					cz + Math.sin(a) * rad * .3
				], [
					cx + Math.cos(a) * rad,
					cy + e,
					cz + Math.sin(a) * rad
				]], c, 3.5));
				r.push(ell(cx + Math.cos(a) * rad * 1.08, cy + e, cz + Math.sin(a) * rad * 1.08, .18, .18, .18, c, { noLine: true }));
			}
		}
		return r;
	}
});
/** 4단계 ② 축제: 두 기둥 사이 등불 줄 */
def$2({
	id: "lanternString",
	cat: "outdoor",
	name: {
		ko: "등불 줄",
		en: "Lantern string"
	},
	place: "outdoor",
	defaults: {
		len: 6,
		cols: "coral,butter,sky,pink"
	},
	size: (p) => ({
		w: num$1(p, "len"),
		d: .3,
		h: 3.2
	}),
	recipe(p) {
		const w = num$1(p, "len"), cols = str(p, "cols").split(","), y = .15;
		const sag = (x) => 2.9 - .5 * Math.sin(Math.PI * x / w), pts = [];
		for (let i = 0; i <= 16; i++) pts.push([
			w * i / 16,
			y,
			sag(w * i / 16)
		]);
		const r = [
			box(0, .08, 0, .12, .22, 3, "walnut", { mat: "wood" }),
			box(w - .12, .08, 0, w, .22, 3, "walnut", { mat: "wood" }),
			line(pts, "choc", 1.2)
		];
		const n = Math.max(3, Math.floor(w / .8));
		for (let i = 1; i < n; i++) {
			const x = w * i / n, z = sag(x);
			r.push(ell(x, y, z - .22, .13, .13, .17, cols[i % cols.length]), line([[
				x,
				y,
				z
			], [
				x,
				y,
				z - .06
			]], "choc", 1));
		}
		return r;
	}
});
/** 축제 선물: 서 있는 등불(바닥) */
def$2({
	id: "lantern",
	cat: "light",
	name: {
		ko: "등불",
		en: "Lantern"
	},
	place: "floor",
	defaults: {
		c: "coral",
		kind: "flower"
	},
	size: () => ({
		w: .6,
		d: .6,
		h: 1.4
	}),
	recipe(p) {
		const c = str(p, "c"), kind = str(p, "kind");
		const r = [
			cyl(.3, .3, 0, .06, .24, .24, "walnut"),
			cyl(.3, .3, .06, .8, .03, .03, "walnut"),
			ell(.3, .3, 1.02, .25, .25, .3, c, { mat: "glass" }),
			cyl(.3, .3, 1.3, 1.36, .1, .06, "walnut")
		];
		if (kind === "star") for (let k = 0; k < 5; k++) {
			const a = k / 5 * Math.PI * 2;
			r.push(ell(.3 + Math.cos(a) * .24, .3 + Math.sin(a) * .24, 1.02, .05, .05, .05, "butter", { noLine: true }));
		}
		else if (kind === "leaf") r.push(ell(.3, .55, 1.02, .1, .02, .07, "#c8553d", { noLine: true }));
		else if (kind === "sea") r.push(line([
			[
				.08,
				.55,
				.95
			],
			[
				.3,
				.55,
				1.05
			],
			[
				.52,
				.55,
				.95
			]
		], "white", 1.5));
		else r.push(ell(.3, .55, 1.02, .07, .02, .07, "pink", { noLine: true }));
		return r;
	}
});
/** 축제 선물: 벽에 거는 연 */
def$2({
	id: "kite",
	cat: "wall",
	name: {
		ko: "연",
		en: "Kite"
	},
	place: "wall",
	defaults: {
		c: "coral",
		c2: "butter"
	},
	size: () => ({
		w: 1,
		d: .06,
		h: 1.4
	}),
	recipe(p) {
		const c = str(p, "c"), c2 = str(p, "c2"), y = .04;
		return [
			poly([
				[
					.5,
					y,
					1.4
				],
				[
					1,
					y,
					.95
				],
				[
					.5,
					y,
					.5
				]
			], c),
			poly([
				[
					.5,
					y,
					1.4
				],
				[
					0,
					y,
					.95
				],
				[
					.5,
					y,
					.5
				]
			], c2),
			line([[
				.5,
				.045,
				1.4
			], [
				.5,
				.045,
				.5
			]], "choc", 1),
			line([[
				0,
				.045,
				.95
			], [
				1,
				.045,
				.95
			]], "choc", 1),
			line([
				[
					.5,
					y,
					.5
				],
				[
					.42,
					y,
					.3
				],
				[
					.56,
					y,
					.15
				],
				[
					.48,
					y,
					0
				]
			], "choc", 1.2),
			poly([
				[
					.38,
					y,
					.32
				],
				[
					.48,
					y,
					.27
				],
				[
					.42,
					y,
					.22
				]
			], c),
			poly([
				[
					.5,
					y,
					.14
				],
				[
					.6,
					y,
					.1
				],
				[
					.53,
					y,
					.05
				]
			], c2)
		];
	}
});
/** 4단계 정원 가꾸기: 화분 상자 한 칸에 심은 씨앗. stage 0(심음) ~ 7(다 자람), kind = 씨앗 종류 */
def$2({
	id: "gardenPlot",
	cat: "outdoor",
	name: {
		ko: "정원 칸",
		en: "Garden plot"
	},
	place: "outdoor",
	defaults: {
		kind: "daisy",
		stage: 0,
		empty: 0,
		pot: 0
	},
	size: (p) => num$1(p, "pot") ? {
		w: 1,
		d: 1,
		h: str(p, "kind") === "sunflower" ? 2.2 : 1.45
	} : {
		w: 1.4,
		d: 1.4,
		h: 1.8
	},
	recipe(p) {
		const pot = !!num$1(p, "pot"), kind = str(p, "kind"), st = pot ? 7 : Math.max(0, Math.min(7, num$1(p, "stage"))), t = st / 7;
		const cx = pot ? .5 : .7, cy = pot ? .5 : .7, top = pot ? .36 : .3;
		const r = pot ? [cyl(cx, cy, 0, top, .26, .34, "terracotta", {
			mat: "ceramic",
			top: "soil"
		})] : [box(0, 0, 0, 1.4, 1.4, top, "walnut", { mat: "wood" }), poly([
			[
				.12,
				.12,
				top + .001
			],
			[
				1.28,
				.12,
				top + .001
			],
			[
				1.28,
				1.28,
				top + .001
			],
			[
				.12,
				1.28,
				top + .001
			]
		], "soil")];
		if (num$1(p, "empty")) return r;
		if (!pot) r.push(box(1.08, 1.12, top, 1.12, 1.16, top + .45, "oak", { mat: "wood" }), box(.98, 1.15, top + .3, 1.22, 1.17, top + .48, "cream", { mat: "paint" }));
		if (st === 0) {
			r.push(ell(cx, cy, top + .03, .14, .14, .05, "#8a5a36", { noLine: true }));
			return r;
		}
		const k = pot ? 1 : 1.6, base = r.length, out = () => k === 1 ? r : [...r.slice(0, base), ...r.slice(base).map((sh) => grow(sh, cx, cy, top, k))];
		const leaf = "#6fa35a", stemH = top + (kind === "sunflower" ? .35 + 1.15 * t : .15 + .55 * t);
		if (kind !== "pumpkin") r.push(cyl(cx, cy, top, stemH, .035, .03, "#5d8f4a"));
		const nLeaf = Math.min(6, 1 + Math.floor(st / 1.4));
		for (let i = 0; i < nLeaf; i++) {
			const a = i * 2.4, rr = .08 + .1 * t, z = top + .08 + (stemH - top) * (.25 + .6 * (i / Math.max(1, nLeaf)));
			r.push(ell(cx + Math.cos(a) * (.12 + .12 * t), cy + Math.sin(a) * (.12 + .12 * t), kind === "pumpkin" ? top + .06 : z, rr * 1.3, rr, rr * .45, leaf, { noLine: true }));
		}
		if (st < 5) return out();
		const bloom = st === 7;
		if (kind === "daisy") for (const [dx, dy, dz] of [
			[
				0,
				0,
				0
			],
			[
				.22,
				-.12,
				-.12
			],
			[
				-.2,
				.14,
				-.08
			]
		]) {
			const z = stemH + dz;
			if (bloom) for (let k = 0; k < 8; k++) {
				const a = k / 8 * Math.PI * 2;
				r.push(ell(cx + dx + Math.cos(a) * .1, cy + dy + Math.sin(a) * .1, z, .07, .07, .03, "white", { noLine: true }));
			}
			r.push(ell(cx + dx, cy + dy, z + .01, bloom ? .06 : .05, bloom ? .06 : .05, .04, bloom ? "#f2c12e" : "#9fca7a", { noLine: true }));
		}
		else if (kind === "tomato") {
			r.push(ell(cx, cy, stemH - .1, .3, .3, .25, leaf));
			if (bloom) for (const [dx, dy, dz] of [
				[
					.18,
					.1,
					0
				],
				[
					-.15,
					.2,
					-.1
				],
				[
					.05,
					-.2,
					.05
				],
				[
					-.2,
					-.05,
					.08
				]
			]) r.push(ell(cx + dx, cy + dy, stemH - .1 + dz, .09, .09, .09, "#e0483a"));
			else r.push(ell(cx + .15, cy + .12, stemH - .1, .05, .05, .05, "#f2d34e", { noLine: true }));
		} else if (kind === "waratah") {
			if (bloom) {
				r.push(ell(cx, cy, stemH + .12, .16, .16, .2, "#d63a3a"));
				for (let k = 0; k < 7; k++) {
					const a = k / 7 * Math.PI * 2;
					r.push(ell(cx + Math.cos(a) * .17, cy + Math.sin(a) * .17, stemH, .1, .1, .03, "#b82a2a", { noLine: true }));
				}
			} else r.push(ell(cx, cy, stemH + .06, .08, .08, .12, "#8fbf6a"));
		} else if (kind === "sunflower") {
			if (bloom) {
				for (let k = 0; k < 12; k++) {
					const a = k / 12 * Math.PI * 2;
					r.push(ell(cx + Math.cos(a) * .2, cy + .03, stemH + Math.sin(a) * .2, .09, .03, .09, "#f6c431", { noLine: true }));
				}
				r.push(disc("y", cx, cy + .06, stemH, .14, "#6b4423"));
			} else r.push(ell(cx, cy, stemH, .1, .1, .1, "#8fbf6a"));
		} else if (kind === "pumpkin") {
			r.push(cyl(cx - .2, cy, top, top + .06, .03, .03, "#5d8f4a"));
			r.push(ell(cx + .1, cy + .05, top + (bloom ? .22 : .1), bloom ? .3 : .12, bloom ? .26 : .1, bloom ? .22 : .09, bloom ? "#ee8a2c" : "#c9d36a"));
			if (bloom) r.push(cyl(cx + .1, cy + .05, top + .42, top + .52, .03, .025, "#6b4423"));
		} else if (kind === "wattle") {
			r.push(ell(cx, cy, stemH, .32, .32, .28, "#7e9c5a"));
			if (bloom) for (let k = 0; k < 14; k++) {
				const a = k * 2.3, z = stemH - .2 + k % 5 * .1;
				r.push(ell(cx + Math.cos(a) * .28, cy + Math.sin(a) * .28, z, .06, .06, .06, "#f7d23e", { noLine: true }));
			}
		}
		return out();
	}
});
def$2({
	id: "fence",
	cat: "outdoor",
	name: {
		ko: "울타리",
		en: "Fence"
	},
	place: "outdoor",
	defaults: {
		len: 4,
		c: "white",
		kind: "picket"
	},
	size: (p) => ({
		w: num$1(p, "len"),
		d: .3,
		h: str(p, "kind") === "stone" ? .7 : 1
	}),
	recipe(p) {
		const w = num$1(p, "len"), c = str(p, "c"), kind = str(p, "kind"), r = [];
		if (kind === "hedge") {
			r.push(box(0, .02, 0, w, .28, .85, c, { mat: "plant" }));
			for (let x = .3; x < w; x += .6) r.push(ell(x, .15, .85, .32, .15, .14, c, {
				mat: "plant",
				noLine: true
			}));
			return r;
		}
		if (kind === "iron") {
			for (let x = .1; x < w - .05; x += .3) r.push(box(x, .13, 0, x + .05, .17, 1.05, "charcoal", { mat: "metal" }), ell(x + .025, .15, 1.1, .05, .03, .08, "brass", { noLine: true }));
			r.push(box(0, .12, .12, w, .18, .18, "charcoal", { mat: "metal" }), box(0, .12, .85, w, .18, .91, "charcoal", { mat: "metal" }));
			const n = Math.max(1, Math.round(w / 2));
			for (let i = 0; i <= n; i++) {
				const x = Math.min(w - .16, w / n * i);
				r.push(box(x, .07, 0, x + .16, .23, 1.2, "charcoal", { mat: "metal" }));
			}
			return r;
		}
		if (kind === "bamboo") {
			for (let x = .08, k = 0; x < w - .05; x += .2, k++) {
				const top = 1 + k * 37 % 5 * .04;
				r.push(cyl(x, .15, 0, top, .08, .08, k % 2 ? "#b9c46a" : "#a8b85a", { mat: "plant" }));
				r.push(line([[
					x - .08,
					.23,
					.45
				], [
					x + .08,
					.23,
					.45
				]], "olive", 1, .6));
			}
			r.push(box(0, .22, .6, w, .26, .68, "clay", { mat: "fabric" }));
			return r;
		}
		if (kind === "stone") {
			r.push(box(0, .04, 0, w, .26, .62, c, { mat: "paint" }), box(-.02, .02, .62, w + .02, .28, .7, "paving", { mat: "paint" }));
			for (const z of [.2, .41]) r.push(line([[
				0,
				.261,
				z
			], [
				w,
				.261,
				z
			]], "wallCap", 1, .35));
			for (let x = .5, k = 0; x < w; x += .5, k++) {
				const z0 = k % 2 ? 0 : .2, z1 = k % 2 ? .2 : .41;
				r.push(line([[
					x,
					.261,
					z0
				], [
					x,
					.261,
					z1
				]], "wallCap", 1, .35), line([[
					x + .25,
					.261,
					z1
				], [
					x + .25,
					.261,
					Math.min(.62, z1 + .21)
				]], "wallCap", 1, .35));
			}
			return r;
		}
		for (let x = 0; x <= w - .12 + 1e-9; x += 1) r.push(box(x + (x + .12 > w ? -.12 : 0), .09, 0, x + .12 + (x + .12 > w ? -.12 : 0), .21, 1, c, { mat: "wood" }));
		if (w % 1 > .2 || r.length === 0) r.push(box(w - .12, .09, 0, w, .21, 1, c, { mat: "wood" }));
		r.push(box(0, .12, .3, w, .18, .42, c, { mat: "wood" }), box(0, .12, .68, w, .18, .8, c, { mat: "wood" }));
		if (kind === "flower") {
			const R = rng(Math.round(w * 13)), cols = [
				"coral",
				"pink",
				"butter",
				"lilac",
				"white"
			];
			r.push(box(0, .22, 0, w, .3, .12, "soil", { mat: "wood" }));
			for (let x = .15; x < w - .1; x += .28) {
				r.push(ell(x, .26, .2, .13, .06, .12, "leaf", {
					mat: "plant",
					noLine: true
				}));
				r.push(ell(x + .05, .27, .3 + R() * .4, .07, .03, .07, cols[Math.floor(R() * cols.length)], { noLine: true }));
			}
		}
		return r;
	}
});
def$2({
	id: "lampPost",
	shadow: "round",
	cat: "outdoor",
	name: {
		ko: "가로등",
		en: "Lamp post"
	},
	place: "outdoor",
	defaults: { c: "charcoal" },
	size: () => ({
		w: .6,
		d: .6,
		h: 3.4
	}),
	recipe: (p) => [
		cyl(.3, .3, 0, .25, .22, .18, str(p, "c"), { mat: "metal" }),
		cyl(.3, .3, .25, 2.8, .06, .06, str(p, "c"), { mat: "metal" }),
		cyl(.3, .3, 2.75, 3.15, .16, .22, "butter", { mat: "glass" }),
		cyl(.3, .3, 3.15, 3.4, .26, .06, str(p, "c"), { mat: "metal" })
	]
});
def$2({
	id: "bench",
	cat: "outdoor",
	name: {
		ko: "벤치",
		en: "Bench"
	},
	place: "outdoor",
	defaults: {
		c: "oak",
		leg: "charcoal"
	},
	size: () => ({
		w: 2,
		d: 1.1,
		h: 1.4
	}),
	recipe(p) {
		const c = str(p, "c"), l = str(p, "leg");
		return [
			box(.15, .05, 0, .27, 1, .5, l, { mat: "metal" }),
			box(.12, 0, .5, 1.88, .12, 1.4, c, { mat: "wood" }),
			box(.1, .12, .42, 1.9, 1.05, .52, c, { mat: "wood" }),
			box(1.73, .05, 0, 1.85, 1, .5, l, { mat: "metal" })
		];
	},
	seats: () => [{
		id: "s1",
		pose: "sit",
		x: 1,
		y: .5,
		z: .52
	}]
});
def$2({
	id: "mailbox",
	shadow: "round",
	cat: "outdoor",
	name: {
		ko: "우편함",
		en: "Mailbox"
	},
	place: "outdoor",
	defaults: { c: "red" },
	size: () => ({
		w: .5,
		d: .6,
		h: 1.4
	}),
	recipe: (p) => [
		box(.2, .25, 0, .3, .35, .9, "walnut", { mat: "wood" }),
		box(.07, .05, .9, .43, .6, 1.25, str(p, "c"), { mat: "paint" }),
		poly([
			[
				.43,
				.15,
				1.15
			],
			[
				.43,
				.15,
				1.4
			],
			[
				.43,
				.3,
				1.33
			]
		], "butter")
	]
});
def$2({
	id: "fountain",
	shadow: "round",
	cat: "outdoor",
	name: {
		ko: "분수",
		en: "Fountain"
	},
	place: "outdoor",
	defaults: {},
	size: () => ({
		w: 3,
		d: 3,
		h: 1.8
	}),
	recipe: () => [
		cyl(1.5, 1.5, 0, .5, 1.45, 1.45, "paving", {
			mat: "paint",
			top: "water"
		}),
		cyl(1.5, 1.5, .5, 1.15, .18, .14, "paving", { mat: "paint" }),
		cyl(1.5, 1.5, 1.1, 1.3, .45, .6, "paving", {
			mat: "paint",
			top: "water"
		}),
		ell(1.5, 1.5, 1.52, .12, .12, .25, "water", { a: .85 }),
		ell(1.15, 1.85, .56, .15, .15, .04, "white", {
			noLine: true,
			a: .6
		})
	]
});
def$2({
	id: "slide",
	cat: "outdoor",
	name: {
		ko: "미끄럼틀",
		en: "Slide"
	},
	place: "outdoor",
	defaults: { c: "coral" },
	size: () => ({
		w: 3.4,
		d: 1.4,
		h: 2.6
	}),
	recipe(p) {
		const c = str(p, "c");
		return [
			box(.1, .2, 0, .22, .32, 2, "sky", { mat: "metal" }),
			box(.1, 1.08, 0, .22, 1.2, 2, "sky", { mat: "metal" }),
			box(1.1, .2, 0, 1.22, .32, 2.6, "sky", { mat: "metal" }),
			box(.1, .2, 1.6, 1.3, 1.2, 1.75, "butter", { mat: "paint" }),
			box(1.1, 1.08, 0, 1.22, 1.2, 2.6, "sky", { mat: "metal" }),
			poly([
				[
					1.3,
					.35,
					1.7
				],
				[
					3.3,
					.35,
					.1
				],
				[
					3.3,
					1.05,
					.1
				],
				[
					1.3,
					1.05,
					1.7
				]
			], c),
			poly([
				[
					1.3,
					1.05,
					1.7
				],
				[
					3.3,
					1.05,
					.1
				],
				[
					3.3,
					1.08,
					.35
				],
				[
					1.3,
					1.08,
					1.95
				]
			], c)
		];
	}
});
def$2({
	id: "cloud",
	shadow: "none",
	cat: "outdoor",
	name: {
		ko: "구름(잠긴 구역)",
		en: "Cloud"
	},
	place: "outdoor",
	defaults: {
		s: 4,
		seed: 1
	},
	size: (p) => ({
		w: num$1(p, "s"),
		d: num$1(p, "s"),
		h: num$1(p, "s") * .55
	}),
	recipe(p) {
		const s = num$1(p, "s"), R = rng(num$1(p, "seed")), r = [];
		for (let i = 0; i < 6; i++) {
			const rr = s * (.16 + R() * .1);
			const x = rr + R() * (s - 2 * rr), y = rr + R() * (s - 2 * rr), z = Math.min(s * .55 - rr * .8, rr * .8 + R() * s * .15);
			r.push(ell(x, y, z, rr, rr, rr * .8, "cloud", { noLine: true }));
		}
		return r;
	}
});
/** 집 외관(지붕 포함). 실내 방 하나를 감싸는 블록 */
def$2({
	id: "houseBlock",
	sortByFoot: true,
	cat: "outdoor",
	name: {
		ko: "집 외관",
		en: "House"
	},
	place: "outdoor",
	defaults: {
		w: 14.6,
		d: 11.6,
		h: 5,
		wall: "wallOut",
		roof: "roofRed",
		trim: "white",
		door: 1,
		doorU: .45,
		shop: 0,
		awning: "coral",
		chimney: 1,
		mat: "plaster",
		roofKind: "gable",
		tv: 1,
		lv: 1,
		rh: 0,
		shed: "",
		towers: "",
		doorC: "teal"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: num$1(p, "d"),
		h: num$1(p, "h") + (num$1(p, "rh") > 0 ? num$1(p, "rh") : Math.min(3.2, num$1(p, "d") * .3)) + (num$1(p, "chimney") ? .7 : 0)
	}),
	recipe(p) {
		const w = num$1(p, "w"), d = num$1(p, "d"), h = num$1(p, "h"), m = .25;
		const kind = str(p, "roofKind"), rh = kind === "flat" ? .4 : num$1(p, "rh") > 0 ? num$1(p, "rh") : Math.min(3.2, d * .3);
		const wall = str(p, "wall"), roof = str(p, "roof"), trim = str(p, "trim");
		const fy = d - m, fx = w - m;
		const r = [box(m, m, 0, fx, fy, h, wall, { mat: "paint" })];
		wallTexture(r, str(p, "mat"), m, fx, fy, h, num$1(p, "lv"));
		const winY = (x) => {
			r.push(poly([
				[
					x,
					fy + .001,
					1.8
				],
				[
					x + 1.6,
					fy + .001,
					1.8
				],
				[
					x + 1.6,
					fy + .001,
					3.8
				],
				[
					x,
					fy + .001,
					3.8
				]
			], "skyDay"));
			r.push(line([[
				x + .8,
				fy + .002,
				1.8
			], [
				x + .8,
				fy + .002,
				3.8
			]], trim, 2));
			r.push(box(x - .1, fy, 1.6, x + 1.7, d - .08, 1.75, trim, { mat: "paint" }));
		};
		const winX = (y) => {
			r.push(poly([
				[
					fx + .001,
					y,
					1.8
				],
				[
					fx + .001,
					y + 1.6,
					1.8
				],
				[
					fx + .001,
					y + 1.6,
					3.8
				],
				[
					fx + .001,
					y,
					3.8
				]
			], "skyDay"));
			r.push(line([[
				fx + .002,
				y + .8,
				1.8
			], [
				fx + .002,
				y + .8,
				3.8
			]], trim, 2));
		};
		const doorX = num$1(p, "door") ? m + (w - 2 * m) * num$1(p, "doorU") : -1;
		for (let x = 1.25; x + 1.7 < fx; x += 3.2) if (doorX < 0 || x + 1.7 < doorX - .4 || x > doorX + 1.8) winY(x);
		for (let y = 1.45; y + 1.7 < fy; y += 3.4) winX(y);
		if (doorX >= 0) {
			r.push(poly([
				[
					doorX,
					fy + .001,
					0
				],
				[
					doorX + 1.3,
					fy + .001,
					0
				],
				[
					doorX + 1.3,
					fy + .001,
					2.7
				],
				[
					doorX,
					fy + .001,
					2.7
				]
			], num$1(p, "shop") ? "glass" : str(p, "doorC")));
			r.push(ell(doorX + 1.1, fy + .02, 1.3, .05, .02, .05, "brass", { noLine: true }));
			r.push(box(doorX - .2, fy, 0, doorX + 1.5, d - .02, .15, "paving", { mat: "paint" }));
		}
		if (num$1(p, "shop")) {
			const aw = str(p, "awning");
			for (let x = m, i = 0; x < fx - .01; x += .7, i++) {
				const x1 = Math.min(fx, x + .7);
				r.push(poly([
					[
						x,
						fy,
						3.5
					],
					[
						x1,
						fy,
						3.5
					],
					[
						x1,
						d - .02,
						3
					],
					[
						x,
						d - .02,
						3
					]
				], i % 2 ? "white" : aw));
			}
			r.push(box(w / 2 - 1.5, fy, 3.9, w / 2 + 1.5, fy + .1, 4.7, trim, { mat: "paint" }));
			r.push(ell(w / 2 - .6, fy + .12, 4.3, .22, .02, .22, aw, { noLine: true }), ell(w / 2 + .6, fy + .12, 4.3, .22, .02, .22, "butter", { noLine: true }));
		}
		const ridge = h + rh, e = rh * (m / (d / 2));
		const chimney = () => {
			if (num$1(p, "chimney")) r.push(box(w * .72, d * .18, h + rh * .2, w * .72 + .9, d * .18 + .9, ridge + .7, "brick", { mat: "paint" }));
		};
		const shed = str(p, "shed");
		if (shed && kind !== "flat" && kind !== "tower") {
			shedRoof(r, shed, kind, w, d, h, m, fx, fy, roof, wall, trim);
			return r;
		}
		if (kind === "tower") {
			r.push(box(0, 0, h, w, d, h + .25, "slate", { mat: "paint" }));
			for (let x = .4; x < w - .6; x += .9) r.push(box(x, d - .35, h + .25, x + .5, d, h + .75, wall, { mat: "paint" }));
			for (let y = .4; y < d - .6; y += .9) r.push(box(w - .35, y, h + .25, w, y + .5, h + .75, wall, { mat: "paint" }));
			const tr = Math.min(1, Math.min(w, d) * .16), top = ridge + (num$1(p, "chimney") ? .6 : 0), mine = String(p.towers ?? "").split(",");
			const corners = [
				[
					"x0y0",
					tr,
					tr
				],
				[
					"x1y0",
					w - tr,
					tr
				],
				[
					"x0y1",
					tr,
					d - tr
				],
				[
					"x1y1",
					w - tr,
					d - tr
				]
			].filter(([k]) => mine.includes(k));
			for (const [, cx, cy] of corners) {
				r.push(cyl(cx, cy, h - 1.2, ridge - .9, tr, tr, wall, { mat: "paint" }), cyl(cx, cy, ridge - .9, top, tr + .05, .03, roof));
				r.push(ell(cx + tr * .7, cy + tr * .7, ridge - 1.6, .05, .05, .25, "skyDay", { noLine: true }));
			}
			return r;
		}
		if (kind === "flat") {
			chimney();
			r.push(box(0, 0, h, w, d, h + .25, roof, { mat: "paint" }), box(0, 0, h + .25, w, .2, ridge, trim, { mat: "paint" }), box(w - .2, .2, h + .25, w, d, ridge, trim, { mat: "paint" }), box(0, .2, h + .25, .2, d, ridge, trim, { mat: "paint" }), box(.2, d - .2, h + .25, w - .2, d, ridge, trim, { mat: "paint" }));
			return r;
		}
		if (kind === "hip") {
			const i = Math.min(d / 2, w / 2);
			r.push(poly([
				[
					0,
					0,
					h
				],
				[
					w,
					0,
					h
				],
				[
					w - i,
					d / 2,
					ridge
				],
				[
					i,
					d / 2,
					ridge
				]
			], roof));
			chimney();
			r.push(poly([
				[
					w,
					0,
					h
				],
				[
					w,
					d,
					h
				],
				[
					w - i,
					d / 2,
					ridge
				]
			], roof, { mat: "dark" }));
			r.push(poly([
				[
					i,
					d / 2,
					ridge
				],
				[
					w - i,
					d / 2,
					ridge
				],
				[
					w,
					d,
					h
				],
				[
					0,
					d,
					h
				]
			], roof));
			r.push(line([[
				0,
				d,
				h
			], [
				w,
				d,
				h
			]], trim, 2.5), line([[
				w - i,
				d / 2,
				ridge
			], [
				w,
				d,
				h
			]], trim, 2.5));
			return r;
		}
		const thatch = kind === "thatch", tv = num$1(p, "tv"), rc = thatch ? "#e8c97e" : roof, o = thatch ? tv === 2 ? .45 : .55 : 0;
		const top = ridge + o * .3, eave = h - o * .6;
		r.push(poly([
			[
				-o,
				-o,
				eave
			],
			[
				w + o,
				-o,
				eave
			],
			[
				w + o,
				d / 2,
				top
			],
			[
				-o,
				d / 2,
				top
			]
		], rc));
		chimney();
		r.push(poly([
			[
				fx,
				m,
				h
			],
			[
				fx,
				fy,
				h
			],
			[
				fx,
				fy,
				h + e
			],
			[
				fx,
				d / 2,
				ridge
			],
			[
				fx,
				m,
				h + e
			]
		], wall));
		r.push(poly([
			[
				-o,
				d / 2,
				top
			],
			[
				w + o,
				d / 2,
				top
			],
			[
				w + o,
				d + o,
				eave
			],
			[
				-o,
				d + o,
				eave
			]
		], rc));
		/** 앞 지붕 위 점: t = 0(용마루) ~ 1(처마) */
		const along = (t) => [d / 2 + (d / 2 + o) * t, top - (top - eave) * t];
		if (kind === "tile") {
			for (let t = .14; t < 1; t += .14) {
				const [y, z] = along(t);
				r.push(line([[
					0,
					y,
					z
				], [
					w,
					y,
					z
				]], "black", 1.2, .3));
			}
			for (let x = .6; x < w; x += .6) for (let t = 0; t < .99; t += .28) {
				const [y0, z0] = along(t), [y1, z1] = along(t + .14);
				r.push(line([[
					x,
					y0,
					z0
				], [
					x,
					y1,
					z1
				]], "black", 1, .18));
			}
			for (let x = .3; x < w; x += .6) {
				const [y, z] = along(1);
				r.push(ell(x, y + .02, z + .04, .29, .05, .11, roof, { mat: "ceramic" }));
			}
		} else if (kind === "dormer") for (const cx of [w * .3, w * .7]) {
			const [y, z] = along(.45), dw = 1.6, dh = 1.5;
			r.push(box(cx - dw / 2, y - .6, z - .4, cx + dw / 2, y + .4, z + dh, "wallOut", { mat: "paint" }));
			r.push(poly([
				[
					cx - dw / 2 + .3,
					y + .401,
					z + .1
				],
				[
					cx + dw / 2 - .3,
					y + .401,
					z + .1
				],
				[
					cx + dw / 2 - .3,
					y + .401,
					z + 1.1
				],
				[
					cx - dw / 2 + .3,
					y + .401,
					z + 1.1
				]
			], "skyDay"));
			r.push(line([[
				cx,
				y + .402,
				z + .1
			], [
				cx,
				y + .402,
				z + 1.1
			]], trim, 1.5));
			r.push(poly([
				[
					cx - dw / 2,
					y + .41,
					z + dh
				],
				[
					cx + dw / 2,
					y + .41,
					z + dh
				],
				[
					cx,
					y + .41,
					z + dh + .6
				]
			], "wallOut"));
			r.push(poly([
				[
					cx - dw / 2 - .15,
					y + .5,
					z + dh
				],
				[
					cx,
					y + .5,
					z + dh + .7
				],
				[
					cx,
					y - .6,
					z + dh + .7
				],
				[
					cx - dw / 2 - .15,
					y - .6,
					z + dh
				]
			], roof));
			r.push(poly([
				[
					cx + dw / 2 + .15,
					y + .5,
					z + dh
				],
				[
					cx,
					y + .5,
					z + dh + .7
				],
				[
					cx,
					y - .6,
					z + dh + .7
				],
				[
					cx + dw / 2 + .15,
					y - .6,
					z + dh
				]
			], roof, { mat: "dark" }));
		}
		else if (thatch) {
			thatchRoof(r, tv, w, d, o, top, eave, along);
			return r;
		}
		const edge = trim;
		r.push(line([[
			-o,
			d + o,
			eave
		], [
			w + o,
			d + o,
			eave
		]], edge, 2.5), line([[
			w + o,
			d / 2,
			top
		], [
			w + o,
			d + o,
			eave
		]], edge, 2.5));
		return r;
	}
});
/**
* 외쪽 지붕(지붕 합치기 시안 B): 붙은 방 쪽이 높고(본채 처마 높이) 반대쪽(low)으로 기운다.
* 고른 지붕 모양을 따라: 기와 = 기와 줄, 초가 = 짚 색 + 처마 짚 단면, 그 밖(박공·모임·다락 창) = 고른 색 판
*/
function shedRoof(r, low, kind, w, d, h, m, fx, fy, roof, wall, trim) {
	const o = 0, up = 1.6, thatch = kind === "thatch", rc = thatch ? "#e8c97e" : roof;
	const zAt = (x, y) => {
		const t = low === "y0" ? y / d : low === "y1" ? 1 - y / d : low === "x0" ? x / w : 1 - x / w;
		return h + up * Math.max(0, Math.min(1, t));
	};
	r.push(poly([
		[
			fx,
			m,
			h
		],
		[
			fx,
			fy,
			h
		],
		[
			fx,
			fy,
			zAt(fx, fy)
		],
		[
			fx,
			m,
			zAt(fx, m)
		]
	], wall));
	r.push(poly([
		[
			m,
			fy,
			h
		],
		[
			fx,
			fy,
			h
		],
		[
			fx,
			fy,
			zAt(fx, fy)
		],
		[
			m,
			fy,
			zAt(m, fy)
		]
	], wall));
	const P = (x, y) => [
		x,
		y,
		zAt(x, y) + .05
	];
	r.push(poly([
		P(-0, -0),
		P(w + o, -0),
		P(w + o, d + o),
		P(-0, d + o)
	], rc));
	const alongY = low === "y0" || low === "y1";
	if (kind === "tile") for (let k = .6; k < (alongY ? d : w); k += .6) r.push(alongY ? line([[
		-0,
		k,
		zAt(0, k) + .07
	], [
		w + o,
		k,
		zAt(0, k) + .07
	]], "black", 1.1, .28) : line([[
		k,
		-0,
		zAt(k, 0) + .07
	], [
		k,
		d + o,
		zAt(k, 0) + .07
	]], "black", 1.1, .28));
	else if (thatch) for (let k = .2; k < (alongY ? w : d); k += .3) r.push(alongY ? line([[
		k,
		-0,
		zAt(k, -0) + .06
	], [
		k,
		d + o,
		zAt(k, d + o) + .06
	]], "#b98a46", 1, .35) : line([[
		-0,
		k,
		zAt(-0, k) + .06
	], [
		w + o,
		k,
		zAt(w + o, k) + .06
	]], "#b98a46", 1, .35));
	r.push(line([P(-0, d + o), P(w + o, d + o)], thatch ? "#8f6a33" : trim, thatch ? 4 : 2.5), line([P(w + o, -0), P(w + o, d + o)], thatch ? "#8f6a33" : trim, thatch ? 4 : 2.5));
}
/**
* 초가 지붕(시안 tv): 짚을 두껍고 둥글게 덮은 질감 + 처마 끝 볏짚 단면.
* 1 둥근 처마: 처마·박공 끝을 둥근 짚단으로 말고, 끝에 짚 단면 결
* 2 층층 초가: 짚을 세 겹으로 덮어 겹마다 두꺼운 턱과 짚 끝
* 3 새끼줄 초가: 둥근 처마 + 지붕 위를 새끼줄 그물로 묶고 용마루를 굵게
*/
function thatchRoof(r, tv, w, d, o, top, eave, along) {
	const straw = "#e2c27a", deep = "#b98a46", end = "#8f6a33", hi = "#f3dda0";
	for (let x = .15; x < w; x += .32) {
		const [y0, z0] = along(.04), [y1, z1] = along(.96);
		r.push(line([[
			x,
			y0,
			z0
		], [
			x + .06,
			y1,
			z1
		]], deep, 1, .35));
	}
	/** 앞 처마와 오른쪽 박공 끝을 따라 둥근 짚단(타원을 이어 붙임) */
	const roll = (rad) => {
		for (let x = -o + rad * .6; x < w + o; x += rad * .9) r.push(ell(x, d + o - rad * .2, eave - rad * .1, rad * .7, rad, rad * .8, straw, { noLine: true }));
		for (let t = 0; t <= 1.001; t += .07) {
			const y = d / 2 + (d / 2 + o) * t, z = top - (top - eave) * t;
			r.push(ell(w + o - rad * .2, y, z - rad * .1, rad, rad * .7, rad * .8, straw, { noLine: true }));
		}
	};
	/** 처마 끝 볏짚 단면: 짧은 세로 결 + 아래 그늘 */
	const ends = (y, z, len) => {
		for (let x = -o + .06; x < w + o; x += .12) r.push(line([[
			x,
			y,
			z
		], [
			x + .02,
			y + .02,
			z - len
		]], Math.round(x * 8) % 3 ? end : deep, 1, .75));
		r.push(line([[
			-o,
			y + .01,
			z - len
		], [
			w + o,
			y + .01,
			z - len
		]], end, 2, .8));
	};
	if (tv === 2) {
		for (const t of [.34, .67]) {
			const [y, z] = along(t);
			r.push(box(-o * (1 - t), y - .05, z - .28, w + o * (1 - t), y + .12, z + .02, straw, { mat: "fabric" }));
			ends(y + .13, z - .02, .26);
		}
		const [y, z] = along(1);
		r.push(box(-o, y - .3, z - .4, w + o, y + .02, z + .02, straw, { mat: "fabric" }));
		ends(y + .03, z - .02, .38);
		r.push(box(-o, d / 2 - .35, top - .15, w + o, d / 2 + .35, top + .3, deep, { mat: "fabric" }));
		return;
	}
	for (const t of [.3, .62]) {
		const [y, z] = along(t);
		r.push(line([[
			-o,
			y,
			z + .06
		], [
			w + o,
			y,
			z + .06
		]], hi, 3, .55), line([[
			-o,
			y + .12,
			z - .04
		], [
			w + o,
			y + .12,
			z - .04
		]], deep, 1.5, .35));
	}
	roll(.42);
	const [ey, ez] = along(1);
	ends(ey + .3, ez - .05, .42);
	if (tv === 3) {
		for (let x = -o; x + 1.6 <= w + o; x += 1.1) {
			const [y0, z0] = along(.02), [y1, z1] = along(.92);
			r.push(line([[
				x,
				y0,
				z0 + .05
			], [
				x + 1.6,
				y1,
				z1 + .05
			]], end, 1.4, .7), line([[
				x + 1.6,
				y0,
				z0 + .05
			], [
				x,
				y1,
				z1 + .05
			]], end, 1.4, .7));
		}
		r.push(box(-o, d / 2 - .45, top - .1, w + o, d / 2 + .45, top + .35, deep, { mat: "fabric" }));
		for (let x = -o + .25; x < w + o; x += .5) r.push(line([[
			x,
			d / 2 + .46,
			top + .35
		], [
			x - .15,
			d / 2 + .46,
			top - .1
		]], end, 1.6, .8));
	} else r.push(box(-o, d / 2 - .3, top - .1, w + o, d / 2 + .3, top + .25, deep, { mat: "fabric" }));
}
/** 바깥벽 무늬: 회벽(plaster) = 없음, 나무판(wood) = 가로 판자 줄, 벽돌(brick) = 줄눈. 보이는 앞(+y)·오른쪽(+x) 면만 */
function wallTexture(r, mat, m, fx, fy, h, lv = 1) {
	if (mat === "log") {
		const step = lv === 2 ? .62 : .5, rr = step / 2;
		const band = (z0, z1, c, a) => {
			r.push(poly([
				[
					m,
					fy + 4e-4,
					z0
				],
				[
					fx,
					fy + 4e-4,
					z0
				],
				[
					fx,
					fy + 4e-4,
					z1
				],
				[
					m,
					fy + 4e-4,
					z1
				]
			], c, {
				a,
				noLine: true
			}));
			r.push(poly([
				[
					fx + 4e-4,
					m,
					z0
				],
				[
					fx + 4e-4,
					fy,
					z0
				],
				[
					fx + 4e-4,
					fy,
					z1
				],
				[
					fx + 4e-4,
					m,
					z1
				]
			], c, {
				a,
				noLine: true
			}));
		};
		for (let z = rr, k = 0; z < h; z += step, k++) {
			band(z - rr, z + rr, k % 2 ? "walnut" : "oak", .5);
			band(z + rr * .25, z + rr * .7, "birch", .45);
			band(z - rr, z - rr * .55, "choc", .4);
			if (lv === 2) r.push(line([[
				m,
				fy + 6e-4,
				z + rr
			], [
				fx,
				fy + 6e-4,
				z + rr
			]], "cream", 2.2, .9), line([[
				fx + 6e-4,
				m,
				z + rr
			], [
				fx + 6e-4,
				fy,
				z + rr
			]], "cream", 2.2, .9));
			else r.push(line([[
				m,
				fy + 6e-4,
				z + rr
			], [
				fx,
				fy + 6e-4,
				z + rr
			]], "choc", 1.4, .6), line([[
				fx + 6e-4,
				m,
				z + rr
			], [
				fx + 6e-4,
				fy,
				z + rr
			]], "choc", 1.4, .6));
			const out = lv === 3 ? .3 : .05;
			const endAt = (x, y) => {
				r.push(disc("y", x, y, z, rr * .95, "oak"), disc("y", x, y + .01, z, rr * .5, "birch", { noLine: true }));
			};
			if (lv !== 3 || k % 2 === 0) endAt(fx + out, fy + .06 + (lv === 3 ? .25 : 0));
			if (lv === 3) {
				if (k % 2 === 1) r.push(disc("x", fx + .06 + .25, fy + out, z, rr * .95, "oak"), disc("x", fx + .07 + .25, fy + out, z, rr * .5, "birch", { noLine: true }));
				endAt(m + .3, fy + .31);
			}
		}
	} else if (mat === "stone") {
		const R = rng(Math.round((fx + fy) * 7));
		for (let z = 0, k = 0; z < h - .05; k++) {
			const z1 = Math.min(h, z + .38 + R() * .2);
			r.push(line([[
				m,
				fy + .001,
				z1
			], [
				fx,
				fy + .001,
				z1
			]], "wallCap", 1.4, .45), line([[
				fx + .001,
				m,
				z1
			], [
				fx + .001,
				fy,
				z1
			]], "wallCap", 1.4, .45));
			for (let x = m + R() * .6; x < fx; x += .6 + R() * .7) r.push(line([[
				x,
				fy + .001,
				z
			], [
				x,
				fy + .001,
				z1
			]], "wallCap", 1.4, .45));
			for (let y = m + R() * .6; y < fy; y += .6 + R() * .7) r.push(line([[
				fx + .001,
				y,
				z
			], [
				fx + .001,
				y,
				z1
			]], "wallCap", 1.4, .45));
			if (k % 2 === 1) {
				const x = m + R() * (fx - m - 1), y = m + R() * (fy - m - 1);
				r.push(poly([
					[
						x,
						fy + .001,
						z + .04
					],
					[
						x + .6,
						fy + .001,
						z + .04
					],
					[
						x + .6,
						fy + .001,
						z1 - .04
					],
					[
						x,
						fy + .001,
						z1 - .04
					]
				], "slate", {
					a: .18,
					noLine: true
				}));
				r.push(poly([
					[
						fx + .001,
						y,
						z + .04
					],
					[
						fx + .001,
						y + .6,
						z + .04
					],
					[
						fx + .001,
						y + .6,
						z1 - .04
					],
					[
						fx + .001,
						y,
						z1 - .04
					]
				], "slate", {
					a: .18,
					noLine: true
				}));
			}
			z = z1;
		}
	} else if (mat === "timber") {
		const beam = (pts) => {
			r.push(line(pts, "choc", 5));
		};
		const zm = h * .48, span = 2.4;
		for (const z of [
			.15,
			zm,
			h - .15
		]) {
			beam([[
				m,
				fy + .003,
				z
			], [
				fx,
				fy + .003,
				z
			]]);
			beam([[
				fx + .003,
				m,
				z
			], [
				fx + .003,
				fy,
				z
			]]);
		}
		const nx = Math.max(1, Math.round((fx - m) / span)), sx = (fx - m) / nx;
		const ny = Math.max(1, Math.round((fy - m) / span)), sy = (fy - m) / ny;
		for (let i = 0; i <= nx; i++) beam([[
			m + i * sx,
			fy + .003,
			0
		], [
			m + i * sx,
			fy + .003,
			h
		]]);
		for (let i = 0; i <= ny; i++) beam([[
			fx + .003,
			m + i * sy,
			0
		], [
			fx + .003,
			m + i * sy,
			h
		]]);
		for (let i = 0; i < nx; i++) {
			const a = m + i * sx;
			beam([[
				a,
				fy + .003,
				zm
			], [
				a + sx / 2,
				fy + .003,
				h - .15
			]]);
			beam([[
				a + sx,
				fy + .003,
				zm
			], [
				a + sx / 2,
				fy + .003,
				h - .15
			]]);
		}
		for (let i = 0; i < ny; i++) {
			const a = m + i * sy;
			beam([[
				fx + .003,
				a,
				zm
			], [
				fx + .003,
				a + sy / 2,
				h - .15
			]]);
			beam([[
				fx + .003,
				a + sy,
				zm
			], [
				fx + .003,
				a + sy / 2,
				h - .15
			]]);
		}
	} else if (mat === "wood") for (let z = .45; z < h; z += .45) r.push(line([[
		m,
		fy + .001,
		z
	], [
		fx,
		fy + .001,
		z
	]], "wallCap", 1, .3), line([[
		fx + .001,
		m,
		z
	], [
		fx + .001,
		fy,
		z
	]], "wallCap", 1, .3));
	else if (mat === "brick") {
		const bh = .36, bw = .8;
		for (let k = 1, z = bh; z < h; z += bh, k++) {
			r.push(line([[
				m,
				fy + .001,
				z
			], [
				fx,
				fy + .001,
				z
			]], "white", 1, .55), line([[
				fx + .001,
				m,
				z
			], [
				fx + .001,
				fy,
				z
			]], "white", 1, .55));
			for (let x = m + (k % 2 ? bw / 2 : 0); x < fx; x += bw) r.push(line([[
				x,
				fy + .001,
				z - bh
			], [
				x,
				fy + .001,
				z
			]], "white", 1, .45));
			for (let y = m + (k % 2 ? bw / 2 : 0); y < fy; y += bw) r.push(line([[
				fx + .001,
				y,
				z - bh
			], [
				fx + .001,
				y,
				z
			]], "white", 1, .45));
		}
	}
}
/** 차고: 작은 건물 + 말아 올리는 문(앞 +y) */
def$2({
	id: "garage",
	shadow: "none",
	sortByFoot: true,
	cat: "outdoor",
	name: {
		ko: "차고",
		en: "Garage"
	},
	place: "outdoor",
	defaults: {
		w: 5.6,
		d: 6.4,
		wall: "wallOut",
		roof: "roofRed",
		door: "white",
		trim: "white",
		mat: "plaster",
		drive: 0,
		dv: 3,
		lv: 1,
		roofKind: "gable"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: num$1(p, "d") + num$1(p, "drive"),
		h: 4.4
	}),
	recipe(p) {
		const w = num$1(p, "w"), d = num$1(p, "d"), h = 3.4, m = .2, fx = w - m, fy = d - m, wall = str(p, "wall"), trim = str(p, "trim");
		const r = [poly([
			[
				.1,
				.1,
				.01
			],
			[
				fx + .5,
				.1,
				.01
			],
			[
				fx + .5,
				fy + .1,
				.01
			],
			[
				.1,
				fy + .1,
				.01
			]
		], "black", {
			a: .12,
			noLine: true
		}), box(m, m, 0, fx, fy, h, wall, { mat: "paint" })];
		wallTexture(r, str(p, "mat"), m, fx, fy, h, num$1(p, "lv"));
		driveway(r, num$1(p, "dv"), .5, fx - .3, d, d + num$1(p, "drive"));
		const x0 = .8, x1 = fx - .6;
		r.push(box(.68, fy, 0, x1 + .12, fy + .04, 2.75, trim, { mat: "paint" }));
		r.push(poly([
			[
				x0,
				fy + .05,
				0
			],
			[
				x1,
				fy + .05,
				0
			],
			[
				x1,
				fy + .05,
				2.6
			],
			[
				x0,
				fy + .05,
				2.6
			]
		], str(p, "door")));
		for (let z = .32; z < 2.6; z += .32) r.push(line([[
			x0,
			fy + .051,
			z
		], [
			x1,
			fy + .051,
			z
		]], "wallCap", 1, .35));
		r.push(box(x0, fy, 0, x1, d, .05, "paving", { mat: "paint" }));
		const kind = str(p, "roofKind"), thatch = kind === "thatch", rc = thatch ? "#e8c97e" : str(p, "roof");
		if (kind === "flat") {
			r.push(box(0, 0, h, w, d, 3.6, rc, { mat: "paint" }), box(w - .15, 0, 3.6, w, d, 3.85, trim, { mat: "paint" }), box(0, d - .15, 3.6, w - .15, d, 3.85, trim, { mat: "paint" }));
			return r;
		}
		const R = 4.4;
		r.push(poly([
			[
				-.1,
				-.1,
				h
			],
			[
				w + .1,
				-.1,
				h
			],
			[
				w + .1,
				d / 2,
				R
			],
			[
				-.1,
				d / 2,
				R
			]
		], rc));
		r.push(poly([
			[
				fx,
				m,
				h
			],
			[
				fx,
				fy,
				h
			],
			[
				fx,
				d / 2,
				4.25
			]
		], wall));
		r.push(poly([
			[
				-.1,
				d / 2,
				R
			],
			[
				w + .1,
				d / 2,
				R
			],
			[
				w + .1,
				d + .1,
				h
			],
			[
				-.1,
				d + .1,
				h
			]
		], rc));
		if (kind === "tile") for (let t = .2; t < 1; t += .2) {
			const y = d / 2 + (d / 2 + .1) * t, z = R - 1.0000000000000004 * t;
			r.push(line([[
				-.1,
				y,
				z + .01
			], [
				w + .1,
				y,
				z + .01
			]], "black", 1, .3));
		}
		if (thatch) {
			for (let x = .15; x < w; x += .3) r.push(line([[
				x,
				d / 2,
				4.41
			], [
				x + .05,
				d + .1,
				3.4099999999999997
			]], "#b98a46", 1, .35));
			for (let x = 0; x < w + .1; x += .12) r.push(line([[
				x,
				d + .12,
				h
			], [
				x + .02,
				d + .13,
				3.15
			]], "#8f6a33", 1, .75));
		}
		r.push(line([[
			-.1,
			d + .1,
			h
		], [
			w + .1,
			d + .1,
			h
		]], thatch ? "#8f6a33" : trim, thatch ? 3.5 : 2.5));
		return r;
	}
});
/**
* 차고 진입로(시안 dv): 1 콘크리트 판(이음 줄) · 2 두 줄 바퀴길(가운데 잔디) · 3 벽돌 깔기
* x0~x1 폭으로 y0(차고 문)부터 y1(울타리)까지
*/
function driveway(r, dv, x0, x1, y0, y1) {
	if (y1 - y0 < .1) return;
	const z = .02, sl = (a, b, c, e, col, o = {}) => r.push(poly([
		[
			a,
			b,
			z
		],
		[
			c,
			b,
			z
		],
		[
			c,
			e,
			z
		],
		[
			a,
			e,
			z
		]
	], col, {
		noLine: true,
		...o
	}));
	if (dv === 2) {
		const tw = .9;
		sl(x0 + .3, y0, x0 + .3 + tw, y1, "paving");
		sl(x1 - .3 - tw, y0, x1 - .3, y1, "paving");
		for (let y = y0 + .8; y < y1; y += .8) r.push(line([[
			x0 + .3,
			y,
			.021
		], [
			x0 + .3 + tw,
			y,
			.021
		]], "wallCap", 1, .5), line([[
			x1 - .3 - tw,
			y,
			.021
		], [
			x1 - .3,
			y,
			.021
		]], "wallCap", 1, .5));
		return;
	}
	if (dv === 3) {
		sl(x0, y0, x1, y1, "terracotta", { a: .85 });
		const bh = .4, bw = .8;
		for (let k = 0, y = y0 + bh; y < y1; y += bh, k++) {
			r.push(line([[
				x0,
				y,
				.021
			], [
				x1,
				y,
				.021
			]], "white", 1, .55));
			for (let x = x0 + (k % 2 ? bw / 2 : 0); x < x1; x += bw) r.push(line([[
				x,
				y - bh,
				.021
			], [
				x,
				y,
				.021
			]], "white", 1, .45));
		}
		r.push(line([[
			x0,
			y0,
			.022
		], [
			x0,
			y1,
			.022
		]], "wallCap", 2, .8), line([[
			x1,
			y0,
			.022
		], [
			x1,
			y1,
			.022
		]], "wallCap", 2, .8));
		return;
	}
	sl(x0, y0, x1, y1, "paving");
	for (let y = y0 + 1.5; y < y1 - .2; y += 1.5) r.push(line([[
		x0,
		y,
		.021
	], [
		x1,
		y,
		.021
	]], "wallCap", 1.2, .6));
	r.push(line([[
		(x0 + x1) / 2,
		y0,
		.021
	], [
		(x0 + x1) / 2,
		y1,
		.021
	]], "wallCap", 1, .4));
	r.push(line([[
		x0,
		y0,
		.022
	], [
		x0,
		y1,
		.022
	]], "wallCap", 1.6, .7), line([[
		x1,
		y0,
		.022
	], [
		x1,
		y1,
		.022
	]], "wallCap", 1.6, .7));
}
/** 한 도형을 (cx, cy, z0) 기준으로 k배(정원 식물 키우기) */
function grow(sh, cx, cy, z0, k) {
	const t = (q) => [
		cx + (q[0] - cx) * k,
		cy + (q[1] - cy) * k,
		z0 + (q[2] - z0) * k
	];
	switch (sh.t) {
		case "box": return {
			...sh,
			x0: cx + (sh.x0 - cx) * k,
			y0: cy + (sh.y0 - cy) * k,
			z0: z0 + (sh.z0 - z0) * k,
			x1: cx + (sh.x1 - cx) * k,
			y1: cy + (sh.y1 - cy) * k,
			z1: z0 + (sh.z1 - z0) * k
		};
		case "cyl": return {
			...sh,
			cx: cx + (sh.cx - cx) * k,
			cy: cy + (sh.cy - cy) * k,
			z0: z0 + (sh.z0 - z0) * k,
			z1: z0 + (sh.z1 - z0) * k,
			r0: sh.r0 * k,
			r1: sh.r1 * k
		};
		case "ell": return {
			...sh,
			cx: cx + (sh.cx - cx) * k,
			cy: cy + (sh.cy - cy) * k,
			cz: z0 + (sh.cz - z0) * k,
			rx: sh.rx * k,
			ry: sh.ry * k,
			rz: sh.rz * k
		};
		case "disc": return {
			...sh,
			cx: cx + (sh.cx - cx) * k,
			cy: cy + (sh.cy - cy) * k,
			cz: z0 + (sh.cz - z0) * k,
			r: sh.r * k
		};
		case "poly": return {
			...sh,
			pts: sh.pts.map(t)
		};
		case "line": return {
			...sh,
			pts: sh.pts.map(t)
		};
	}
}
/** 레시피 전체를 k배 (나무 크기 변형용) */
function scaled(r, k) {
	const t = (q) => [
		q[0] * k,
		q[1] * k,
		q[2] * k
	];
	return r.map((s) => {
		switch (s.t) {
			case "box": return {
				...s,
				x0: s.x0 * k,
				y0: s.y0 * k,
				z0: s.z0 * k,
				x1: s.x1 * k,
				y1: s.y1 * k,
				z1: s.z1 * k
			};
			case "cyl": return {
				...s,
				cx: s.cx * k,
				cy: s.cy * k,
				z0: s.z0 * k,
				z1: s.z1 * k,
				r0: s.r0 * k,
				r1: s.r1 * k
			};
			case "ell": return {
				...s,
				cx: s.cx * k,
				cy: s.cy * k,
				cz: s.cz * k,
				rx: s.rx * k,
				ry: s.ry * k,
				rz: s.rz * k
			};
			case "disc": return {
				...s,
				cx: s.cx * k,
				cy: s.cy * k,
				cz: s.cz * k,
				r: s.r * k
			};
			case "poly": return {
				...s,
				pts: s.pts.map(t)
			};
			case "line": return {
				...s,
				pts: s.pts.map(t),
				w: s.w * k
			};
		}
	});
}
def$2({
	id: "friendWombat",
	shadow: "round",
	cat: "friend",
	name: {
		ko: "웜뱃",
		en: "Wombat"
	},
	place: "outdoor",
	defaults: {},
	size: () => ({
		w: 1.2,
		d: 1.2,
		h: 1.4
	}),
	recipe: () => wombat().map((s) => shift(s, .6, .5, 0))
});
function shift(s, dx, dy, dz) {
	const t = (q) => [
		q[0] + dx,
		q[1] + dy,
		q[2] + dz
	];
	switch (s.t) {
		case "ell": return {
			...s,
			cx: s.cx + dx,
			cy: s.cy + dy,
			cz: s.cz + dz
		};
		case "line": return {
			...s,
			pts: s.pts.map(t)
		};
		default: return s;
	}
}
def$2({
	id: "koalaFig",
	shadow: "round",
	cat: "friend",
	name: {
		ko: "코알라",
		en: "Koala"
	},
	place: "floor",
	defaults: {
		yaw: .785,
		pose: "stand"
	},
	size: () => ({
		w: 1,
		d: 1,
		h: 1.7
	}),
	recipe: (p) => {
		const ps = str(p, "pose");
		return koala(ps === "sit" || ps === "lie" ? ps : "stand", {
			yaw: num$1(p, "yaw"),
			viewYaw: Math.PI / 4
		}).map((s) => translateShape(s, .5, .5, 0));
	}
});
// src/data/templates-h5.ts
var H5 = [];
var def$1 = (t) => {
	H5.push(t);
};
var GOLD = "#e9b949";
/** z 평면 위 별(5각) */
var starPts = (cx, cy, z, R, r, rot = -Math.PI / 2) => Array.from({ length: 10 }, (_, i) => {
	const a = rot + i * Math.PI / 5, rr = i % 2 ? r : R;
	return [
		cx + Math.cos(a) * rr,
		cy + Math.sin(a) * rr,
		z
	];
});
/** 세운 별(앞면 y 평면) */
var starY = (cx, y, cz, R, r) => Array.from({ length: 10 }, (_, i) => {
	const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
	return [
		cx + Math.cos(a) * rr,
		y,
		cz - Math.sin(a) * rr
	];
});
var cup = (r, x, y, z, s, c = GOLD) => {
	r.push(box(x - .09 * s, y - .09 * s, z, x + .09 * s, y + .09 * s, z + .06 * s, "walnut", { mat: "wood" }), cyl(x, y, z + .06 * s, z + .16 * s, .025 * s, .025 * s, c, { mat: "metal" }), cyl(x, y, z + .16 * s, z + .34 * s, .05 * s, .11 * s, c, { mat: "metal" }));
};
/** 앞면(y)에 붙은 원 */
var dotY = (x, y, z, r, c) => disc("y", x, y, z, r, c, { noLine: true });
var eyes = (x, y, z, dx = .06) => [ell(x - dx, y, z, .025, .01, .03, "eye", { noLine: true }), ell(x + dx, y, z, .025, .01, .03, "eye", { noLine: true })];
def$1({
	id: "trophyCabinet",
	cat: "storage",
	name: {
		ko: "트로피 진열장",
		en: "Trophy cabinet"
	},
	place: "floor",
	defaults: { c: "walnut" },
	size: () => ({
		w: 1.8,
		d: .82,
		h: 3.8
	}),
	recipe(p) {
		const w = 1.8, h = 3.8, c = str(p, "c"), r = [box(0, 0, 0, w, .8, .5, c, { mat: "wood" })];
		r.push(box(0, 0, .5, .12, .8, 3.55, c, { mat: "wood" }), box(1.6800000000000002, 0, .5, w, .8, 3.55, c, { mat: "wood" }), box(.12, 0, .5, 1.6800000000000002, .08, 3.55, "navy", { mat: "paint" }));
		for (const z of [1.55, 2.6]) r.push(box(.12, .08, z, 1.6800000000000002, .74, z + .05, "glass", { a: .7 }));
		cup(r, .55, .42, .5, 2.2);
		cup(r, 1.25, .42, .5, 1.6, "#c9ced6");
		cup(r, .9, .42, 1.6, 2);
		cup(r, .45, .42, 2.65, 1.4, "#c98a52");
		cup(r, 1.3, .42, 2.65, 1.5);
		r.push(box(0, 0, 3.55, w, .8, h, c, { mat: "wood" }));
		r.push(poly([
			[
				.12,
				.8,
				.55
			],
			[
				1.6800000000000002,
				.8,
				.55
			],
			[
				1.6800000000000002,
				.8,
				3.5
			],
			[
				.12,
				.8,
				3.5
			]
		], "glass", { a: .28 }));
		r.push(line([[
			w / 2,
			.81,
			.55
		], [
			w / 2,
			.81,
			3.5
		]], "choc", 2), line([[
			0,
			.81,
			.5
		], [
			w,
			.81,
			.5
		]], "choc", 2));
		r.push(poly(starPts(w / 2, .4, 3.799, .32, .14), GOLD, { noLine: true }));
		return r;
	}
});
def$1({
	id: "xmasTree",
	shadow: "round",
	cat: "plant",
	name: {
		ko: "크리스마스 트리",
		en: "Christmas tree"
	},
	place: "floor",
	defaults: {},
	size: () => ({
		w: 1.6,
		d: 1.6,
		h: 3.75
	}),
	recipe() {
		const r = [cyl(.8, .8, 0, .35, .18, .18, "walnut", { mat: "wood" }), cyl(.8, .8, 0, .08, .7, .7, "white", { mat: "fabric" })], R = rng(7);
		for (const [z0, z1, rr] of [
			[
				.3,
				1.45,
				.78
			],
			[
				1.05,
				2.15,
				.6
			],
			[
				1.75,
				2.85,
				.42
			],
			[
				2.45,
				3.25,
				.25
			]
		]) r.push(cyl(.8, .8, z0, z1, rr, .04, "leafDark", { mat: "plant" }));
		for (let i = 0; i < 16; i++) {
			const a = R() * Math.PI * 2, z = .5 + R() * 2.5, rr = Math.max(.12, (3.1 - z) * .27);
			r.push(ell(.8 + Math.cos(a) * rr, .8 + Math.sin(a) * rr, z, .07, .07, .07, [
				"red",
				GOLD,
				"sky",
				"white"
			][i % 4], { mat: "ceramic" }));
		}
		r.push(poly(starY(.8, .81, 3.47, .25, .1), GOLD), poly(starY(.8, .79, 3.47, .25, .1), GOLD));
		r.push(box(.05, 1.05, 0, .5, 1.5, .4, "red", { mat: "paint" }), box(.24, 1.05, 0, .31, 1.5, .41, GOLD), box(1.05, 1.1, 0, 1.45, 1.5, .3, "sky", { mat: "paint" }), box(1.05, 1.27, 0, 1.45, 1.33, .31, "white"));
		return r;
	}
});
def$1({
	id: "beachTowel",
	shadow: "none",
	cat: "rug",
	name: {
		ko: "비치 타월",
		en: "Beach towel"
	},
	place: "decal",
	defaults: {},
	size: () => ({
		w: 1.4,
		d: 2.6,
		h: .05
	}),
	recipe() {
		const r = [box(0, 0, 0, 1.4, 2.6, .03, "sky", { mat: "fabric" }), disc("z", .7, .75, .031, .32, "butter", { noLine: true })];
		for (let i = 0; i < 8; i++) {
			const a = i / 8 * Math.PI * 2;
			r.push(line([[
				.7 + Math.cos(a) * .4,
				.75 + Math.sin(a) * .4,
				.032
			], [
				.7 + Math.cos(a) * .52,
				.75 + Math.sin(a) * .52,
				.032
			]], "butter", 2));
		}
		for (const y of [
			1.5,
			1.85,
			2.2
		]) {
			const pts = [];
			for (let x = .1; x <= 1.31; x += .1) pts.push([
				x,
				y + Math.sin(x * 9) * .05,
				.032
			]);
			r.push(line(pts, "white", 2));
		}
		return r;
	}
});
def$1({
	id: "fridge",
	cat: "storage",
	name: {
		ko: "냉장고",
		en: "Fridge"
	},
	place: "floor",
	defaults: { c: "white" },
	size: () => ({
		w: 1.2,
		d: 1.06,
		h: 3.6
	}),
	recipe: (p) => [
		box(0, 0, .08, 1.2, 1, 3.6, str(p, "c"), { mat: "paint" }),
		box(.05, .05, 0, 1.15, .95, .08, "charcoal"),
		line([[
			0,
			1.001,
			2.3
		], [
			1.2,
			1.001,
			2.3
		]], "slate", 1.5),
		box(.95, 1, 2.45, 1.03, 1.06, 3.2, "steel", { mat: "metal" }),
		box(.95, 1, 1.2, 1.03, 1.06, 2.1, "steel", { mat: "metal" }),
		dotY(.3, 1.002, 3.1, .07, "coral"),
		dotY(.5, 1.002, 2.85, .06, "sky"),
		poly([
			[
				.2,
				1.002,
				2.5
			],
			[
				.55,
				1.002,
				2.5
			],
			[
				.55,
				1.002,
				2.75
			],
			[
				.2,
				1.002,
				2.75
			]
		], "butter", { noLine: true })
	],
	surfaces: () => [{
		id: "top",
		x: .1,
		y: .1,
		w: 1,
		d: .8,
		z: 3.6,
		maxH: 1,
		cell: .05
	}]
});
def$1({
	id: "cubbyShelf",
	cat: "storage",
	name: {
		ko: "칸칸 수납장",
		en: "Cubby shelf"
	},
	place: "floor",
	defaults: {
		c: "white",
		b1: "coral",
		b2: "teal",
		b3: "butter"
	},
	size: () => ({
		w: 2.1,
		d: .8,
		h: 2.1
	}),
	recipe(p) {
		const c = str(p, "c"), bins = [
			str(p, "b1"),
			str(p, "b2"),
			str(p, "b3")
		], r = [box(0, 0, 0, 2.1, .06, 2.1, c, { mat: "paint" })];
		for (const x of [
			0,
			.7,
			1.4,
			2.04
		]) r.push(box(x, 0, 0, Math.min(2.1, x + .06), .8, 2.1, c, { mat: "paint" }));
		for (const z of [
			0,
			1.02,
			2.04
		]) r.push(box(0, 0, z, 2.1, .8, z + .06, c, { mat: "paint" }));
		[
			[.06, .06],
			[1.46, .06],
			[.76, 1.08]
		].forEach(([x, z], i) => r.push(box(x + .04, .15, z, x + .6, .78, z + .82, bins[i], { mat: "fabric" }), box(x + .24, .78, z + .55, x + .42, .8, z + .62, "white")));
		return r;
	},
	surfaces: () => [{
		id: "top",
		x: .05,
		y: .05,
		w: 2,
		d: .7,
		z: 2.1,
		maxH: 1.2,
		cell: .05
	}, {
		id: "c1",
		x: .76,
		y: .06,
		w: .58,
		d: .7,
		z: .06,
		maxH: .9,
		cell: .05
	}]
});
def$1({
	id: "shoeCabinet",
	cat: "storage",
	name: {
		ko: "신발장",
		en: "Shoe cabinet"
	},
	place: "floor",
	defaults: { c: "cream" },
	size: () => ({
		w: 1.6,
		d: .76,
		h: 1.7
	}),
	recipe(p) {
		const r = [
			box(0, 0, .1, 1.6, .7, 1.7, str(p, "c"), { mat: "paint" }),
			box(.05, .05, 0, .15, .15, .1, "walnut"),
			box(1.45, .55, 0, 1.55, .65, .1, "walnut")
		];
		for (const x of [.05, .82]) {
			r.push(poly([
				[
					x,
					.701,
					.2
				],
				[
					x + .73,
					.701,
					.2
				],
				[
					x + .73,
					.701,
					1.6
				],
				[
					x,
					.701,
					1.6
				]
			], "ivory"));
			for (let z = .35; z < 1.55; z += .18) r.push(line([[
				x + .06,
				.702,
				z
			], [
				x + .67,
				.702,
				z
			]], "grey", 1.2));
		}
		r.push(box(.68, .7, .85, .74, .76, 1, "brass", { mat: "metal" }), box(.86, .7, .85, .92, .76, 1, "brass", { mat: "metal" }));
		return r;
	},
	surfaces: () => [{
		id: "top",
		x: .05,
		y: .05,
		w: 1.5,
		d: .6,
		z: 1.7,
		maxH: 1,
		cell: .05
	}]
});
def$1({
	id: "basin",
	cat: "storage",
	name: {
		ko: "세면대",
		en: "Wash basin"
	},
	place: "floor",
	defaults: { c: "sky" },
	size: () => ({
		w: 1.2,
		d: .85,
		h: 1.8
	}),
	recipe(p) {
		const c = str(p, "c");
		return [
			box(.05, .05, 0, 1.15, .75, 1.2, c, { mat: "paint" }),
			poly([
				[
					.1,
					.751,
					.15
				],
				[
					.58,
					.751,
					.15
				],
				[
					.58,
					.751,
					1.1
				],
				[
					.1,
					.751,
					1.1
				]
			], c),
			poly([
				[
					.62,
					.751,
					.15
				],
				[
					1.1,
					.751,
					.15
				],
				[
					1.1,
					.751,
					1.1
				],
				[
					.62,
					.751,
					1.1
				]
			], c),
			box(.5, .75, .55, .56, .8, .75, "steel"),
			box(.64, .75, .55, .7, .8, .75, "steel"),
			box(0, 0, 1.2, 1.2, .85, 1.35, "white", { mat: "ceramic" }),
			ell(.6, .45, 1.36, .35, .25, .02, "sky", {
				noLine: true,
				a: .7
			}),
			cyl(.6, .12, 1.35, 1.75, .04, .04, "steel", { mat: "metal" }),
			box(.58, .12, 1.7, .62, .35, 1.75, "steel", { mat: "metal" }),
			ell(.25, .3, 1.42, .08, .05, .06, "pink")
		];
	}
});
def$1({
	id: "toolbox",
	cat: "storage",
	name: {
		ko: "공구함",
		en: "Toolbox"
	},
	place: "floor",
	defaults: { c: "red" },
	size: () => ({
		w: 1,
		d: .6,
		h: .9
	}),
	recipe: (p) => [
		box(.05, .05, 0, .95, .55, .5, str(p, "c"), { mat: "metal" }),
		box(.02, .02, .5, .98, .58, .58, str(p, "c"), { mat: "metal" }),
		box(.2, .27, .58, .25, .33, .85, "slate"),
		box(.75, .27, .58, .8, .33, .85, "slate"),
		box(.2, .27, .8, .8, .33, .86, "slate"),
		box(.45, .55, .3, .55, .58, .42, "steel", { mat: "metal" })
	]
});
def$1({
	id: "metalShelf",
	cat: "storage",
	name: {
		ko: "철제 선반",
		en: "Metal shelf"
	},
	place: "floor",
	defaults: { c: "slate" },
	size: () => ({
		w: 2,
		d: .7,
		h: 2.6
	}),
	recipe(p) {
		const c = str(p, "c"), r = [];
		for (const [x, y] of [
			[0, 0],
			[1.92, 0],
			[0, .62],
			[1.92, .62]
		]) r.push(box(x, y, 0, x + .08, y + .08, 2.6, c, { mat: "metal" }));
		for (const z of [
			.2,
			1,
			1.8,
			2.52
		]) r.push(box(0, 0, z, 2, .7, z + .06, "steel", { mat: "metal" }));
		r.push(cyl(.4, .35, 1.06, 1.4, .15, .15, "sky", { mat: "metal" }), cyl(.75, .35, 1.06, 1.35, .13, .13, "coral", { mat: "metal" }), box(1.2, .1, .26, 1.8, .6, .65, "card", { mat: "card" }), box(.2, .1, 1.86, .9, .6, 2.15, "teal", { mat: "paint" }));
		return r;
	}
});
def$1({
	id: "toyBox",
	cat: "toy",
	name: {
		ko: "장난감 상자",
		en: "Toy box"
	},
	place: "floor",
	defaults: {
		c: "oak",
		c2: "coral"
	},
	size: () => ({
		w: 1.4,
		d: .92,
		h: 1.3
	}),
	recipe: (p) => [
		box(0, .15, 0, 1.4, .9, .85, str(p, "c"), { mat: "wood" }),
		box(.08, .23, .84, 1.32, .82, .86, "choc"),
		ell(.45, .5, .95, .2, .2, .2, "butter"),
		ell(.4, .5, 1.15, .08, .08, .08, "butter"),
		box(.8, .35, .8, 1.1, .6, 1.05, "sky", { mat: "paint" }),
		poly([
			[
				0,
				.15,
				.86
			],
			[
				1.4,
				.15,
				.86
			],
			[
				1.4,
				0,
				1.3
			],
			[
				0,
				0,
				1.3
			]
		], str(p, "c2")),
		poly(starY(.7, .901, .45, .22, .09), "butter", { noLine: true })
	]
});
def$1({
	id: "plush",
	shadow: "round",
	cat: "toy",
	name: {
		ko: "봉제 인형",
		en: "Plush toy"
	},
	place: "surface",
	defaults: {
		kind: "bear",
		c: "clay"
	},
	size: () => ({
		w: .5,
		d: .5,
		h: .72
	}),
	recipe(p) {
		const c = str(p, "c"), bunny = str(p, "kind") === "bunny";
		const r = [
			ell(.25, .25, .16, .17, .15, .16, c, { mat: "fur" }),
			ell(.25, .28, .4, .15, .14, .13, c, { mat: "fur" }),
			ell(.12, .33, .06, .06, .07, .05, c, { mat: "fur" }),
			ell(.38, .33, .06, .06, .07, .05, c, { mat: "fur" }),
			ell(.25, .4, .37, .06, .03, .045, "cream", { noLine: true }),
			ell(.25, .42, .39, .02, .01, .015, "nose", { noLine: true }),
			...eyes(.25, .41, .44, .05)
		];
		if (bunny) r.push(ell(.18, .27, .6, .04, .03, .11, c, { mat: "fur" }), ell(.32, .27, .6, .04, .03, .11, c, { mat: "fur" }));
		else r.push(ell(.13, .27, .5, .05, .03, .05, c, { mat: "fur" }), ell(.37, .27, .5, .05, .03, .05, c, { mat: "fur" }));
		r.push(poly([
			[
				.18,
				.39,
				.27
			],
			[
				.32,
				.39,
				.27
			],
			[
				.25,
				.4,
				.31
			]
		], "coral", { noLine: true }));
		return r;
	}
});
def$1({
	id: "toyRobot",
	cat: "toy",
	name: {
		ko: "장난감 로봇",
		en: "Toy robot"
	},
	place: "surface",
	defaults: { c: "sky" },
	size: () => ({
		w: .4,
		d: .36,
		h: .74
	}),
	recipe: (p) => [
		box(.08, .1, 0, .17, .26, .16, "slate", { mat: "metal" }),
		box(.23, .1, 0, .32, .26, .16, "slate", { mat: "metal" }),
		box(.05, .06, .16, .35, .3, .42, str(p, "c"), { mat: "metal" }),
		box(0, .12, .22, .05, .24, .38, "slate"),
		box(.35, .12, .22, .4, .24, .38, "slate"),
		box(.09, .08, .44, .31, .28, .62, "steel", { mat: "metal" }),
		dotY(.15, .281, .54, .035, "butter"),
		dotY(.25, .281, .54, .035, "butter"),
		cyl(.2, .18, .62, .68, .01, .01, "slate"),
		ell(.2, .18, .7, .025, .025, .025, "coral"),
		dotY(.2, .301, .3, .05, "coral")
	]
});
def$1({
	id: "toyCar",
	cat: "toy",
	name: {
		ko: "장난감 자동차",
		en: "Toy car"
	},
	place: "surface",
	defaults: { c: "red" },
	size: () => ({
		w: .66,
		d: .4,
		h: .32
	}),
	recipe: (p) => [
		box(.05, .08, .06, .61, .32, .16, str(p, "c"), { mat: "paint" }),
		box(.17, .1, .16, .47, .3, .27, str(p, "c"), { mat: "paint" }),
		poly([
			[
				.19,
				.301,
				.17
			],
			[
				.45,
				.301,
				.17
			],
			[
				.43,
				.301,
				.25
			],
			[
				.21,
				.301,
				.25
			]
		], "glass", { noLine: true }),
		...[
			[.17, .08],
			[.49, .08],
			[.17, .32],
			[.49, .32]
		].map(([x, y]) => cyl(x, y, 0, .12, .06, .06, "charcoal"))
	]
});
def$1({
	id: "toyDino",
	shadow: "round",
	cat: "toy",
	name: {
		ko: "공룡 인형",
		en: "Toy dinosaur"
	},
	place: "surface",
	defaults: { c: "green" },
	size: () => ({
		w: .62,
		d: .34,
		h: .5
	}),
	recipe(p) {
		const c = str(p, "c");
		return [
			ell(.3, .17, .2, .18, .12, .13, c, { mat: "fur" }),
			ell(.5, .17, .38, .09, .08, .08, c, { mat: "fur" }),
			line([[
				.42,
				.17,
				.28
			], [
				.48,
				.17,
				.34
			]], c, 6),
			poly([
				[
					.12,
					.17,
					.15
				],
				[
					.02,
					.17,
					.1
				],
				[
					.12,
					.17,
					.24
				]
			], c),
			ell(.22, .21, .05, .05, .05, .05, c),
			ell(.38, .21, .05, .05, .05, .05, c),
			...[
				.2,
				.3,
				.4
			].map((x) => poly([
				[
					x - .04,
					.17,
					.31
				],
				[
					x + .04,
					.17,
					.31
				],
				[
					x,
					.17,
					.4
				]
			], "butter")),
			ell(.54, .25, .41, .015, .01, .015, "eye", { noLine: true })
		];
	}
});
def$1({
	id: "toyRocket",
	cat: "toy",
	name: {
		ko: "장난감 로켓",
		en: "Toy rocket"
	},
	place: "surface",
	defaults: { c: "white" },
	size: () => ({
		w: .4,
		d: .4,
		h: .75
	}),
	recipe: (p) => [
		cyl(.2, .2, .08, .5, .09, .09, str(p, "c"), { mat: "metal" }),
		cyl(.2, .2, .5, .72, .09, .01, "coral", { mat: "metal" }),
		poly([
			[
				.11,
				.2,
				.08
			],
			[
				.02,
				.2,
				0
			],
			[
				.11,
				.2,
				.26
			]
		], "coral"),
		poly([
			[
				.29,
				.2,
				.08
			],
			[
				.38,
				.2,
				0
			],
			[
				.29,
				.2,
				.26
			]
		], "coral"),
		dotY(.2, .292, .36, .04, "sky"),
		cyl(.2, .2, 0, .08, .06, .07, "slate")
	]
});
def$1({
	id: "toyDrum",
	shadow: "round",
	cat: "toy",
	name: {
		ko: "북",
		en: "Toy drum"
	},
	place: "surface",
	defaults: { c: "red" },
	size: () => ({
		w: .5,
		d: .5,
		h: .45
	}),
	recipe(p) {
		const r = [
			cyl(.25, .25, 0, .3, .22, .22, str(p, "c"), {
				mat: "paint",
				top: "cream"
			}),
			cyl(.25, .25, 0, .03, .23, .23, "butter"),
			cyl(.25, .25, .27, .3, .23, .23, "butter")
		];
		for (let i = 0; i < 6; i++) {
			const a = i / 6 * Math.PI;
			r.push(line([[
				.25 + Math.cos(a) * .225,
				.25 + Math.sin(a) * .225,
				.03
			], [
				.25 + Math.cos(a + .5) * .225,
				.25 + Math.sin(a + .5) * .225,
				.27
			]], "white", 1.2));
		}
		r.push(line([[
			.1,
			.2,
			.31
		], [
			.4,
			.05,
			.42
		]], "oak", 3), line([[
			.15,
			.35,
			.31
		], [
			.45,
			.3,
			.42
		]], "oak", 3));
		return r;
	}
});
def$1({
	id: "aquarium",
	cat: "small",
	name: {
		ko: "어항",
		en: "Aquarium"
	},
	place: "surface",
	defaults: { c: "charcoal" },
	size: () => ({
		w: 1.2,
		d: .5,
		h: .85
	}),
	recipe(p) {
		const c = str(p, "c");
		return [
			box(0, 0, 0, 1.2, .5, .06, c),
			box(.02, .02, .06, 1.18, .48, .75, "water", { a: .45 }),
			box(.04, .04, .06, 1.16, .46, .12, "sand"),
			ell(.2, .25, .3, .04, .03, .18, "leaf", { noLine: true }),
			ell(.95, .3, .25, .04, .03, .13, "leafLight", { noLine: true }),
			ell(.5, .3, .45, .08, .03, .05, "#f08a3c", { noLine: true }),
			poly([
				[
					.42,
					.3,
					.45
				],
				[
					.36,
					.3,
					.5
				],
				[
					.36,
					.3,
					.4
				]
			], "#f08a3c", { noLine: true }),
			ell(.78, .25, .32, .06, .03, .04, "sky", { noLine: true }),
			box(0, 0, .75, 1.2, .5, .85, c)
		];
	}
});
function tvFace(y0, y1, z0, c) {
	return [
		box(0, y0, z0, 1.4, y1, z0 + .77, c, { mat: "metal" }),
		poly([
			[
				.06,
				y1 + .001,
				z0 + .05
			],
			[
				1.34,
				y1 + .001,
				z0 + .05
			],
			[
				1.34,
				y1 + .001,
				z0 + .72
			],
			[
				.06,
				y1 + .001,
				z0 + .72
			]
		], "#3b5f8a", { noLine: true }),
		poly([
			[
				.1,
				y1 + .002,
				z0 + .05
			],
			[
				.6,
				y1 + .002,
				z0 + .05
			],
			[
				.4,
				y1 + .002,
				z0 + .42
			]
		], "green", { noLine: true }),
		poly([
			[
				.4,
				y1 + .002,
				z0 + .05
			],
			[
				1.1,
				y1 + .002,
				z0 + .05
			],
			[
				.8,
				y1 + .002,
				z0 + .52
			]
		], "leafDark", { noLine: true }),
		dotY(1.1, y1 + .003, z0 + .57, .08, "butter")
	];
}
def$1({
	id: "tv",
	cat: "small",
	name: {
		ko: "텔레비전",
		en: "TV"
	},
	place: "surface",
	defaults: { c: "charcoal" },
	size: () => ({
		w: 1.4,
		d: .4,
		h: .95
	}),
	recipe: (p) => [
		box(.5, .12, 0, .9, .32, .04, str(p, "c"), { mat: "metal" }),
		box(.66, .18, .04, .74, .24, .2, str(p, "c"), { mat: "metal" }),
		...tvFace(.16, .26, .18, str(p, "c"))
	]
});
def$1({
	id: "tvWall",
	cat: "wall",
	name: {
		ko: "벽걸이 TV",
		en: "Wall TV"
	},
	place: "wall",
	defaults: { c: "charcoal" },
	size: () => ({
		w: 1.4,
		d: .12,
		h: .8
	}),
	recipe: (p) => tvFace(0, .1, 0, str(p, "c"))
});
def$1({
	id: "computer",
	cat: "small",
	name: {
		ko: "컴퓨터",
		en: "Computer"
	},
	place: "surface",
	defaults: {
		c: "steel",
		kind: "laptop"
	},
	size: (p) => str(p, "kind") === "desktop" ? {
		w: .8,
		d: .5,
		h: .75
	} : {
		w: .7,
		d: .5,
		h: .45
	},
	recipe(p) {
		const c = str(p, "c");
		if (str(p, "kind") === "desktop") return [
			box(.32, .12, 0, .48, .28, .04, c, { mat: "metal" }),
			box(.37, .16, .04, .43, .22, .2, c, { mat: "metal" }),
			box(0, .12, .2, .8, .22, .72, c, { mat: "metal" }),
			poly([
				[
					.04,
					.221,
					.24
				],
				[
					.76,
					.221,
					.24
				],
				[
					.76,
					.221,
					.68
				],
				[
					.04,
					.221,
					.68
				]
			], "#6fa8d8", { noLine: true }),
			box(.1, .3, 0, .7, .48, .03, "white")
		];
		return [
			box(0, .05, 0, .7, .5, .03, c, { mat: "metal" }),
			poly([
				[
					.08,
					.2,
					.031
				],
				[
					.62,
					.2,
					.031
				],
				[
					.62,
					.42,
					.031
				],
				[
					.08,
					.42,
					.031
				]
			], "slate", { noLine: true }),
			poly([
				[
					0,
					.05,
					.03
				],
				[
					.7,
					.05,
					.03
				],
				[
					.7,
					0,
					.45
				],
				[
					0,
					0,
					.45
				]
			], c, { mat: "metal" }),
			poly([
				[
					.04,
					.052,
					.06
				],
				[
					.66,
					.052,
					.06
				],
				[
					.66,
					.006,
					.42
				],
				[
					.04,
					.006,
					.42
				]
			], "#6fa8d8", { noLine: true })
		];
	}
});
def$1({
	id: "food",
	shadow: "round",
	cat: "small",
	name: {
		ko: "음식 접시",
		en: "Plate of food"
	},
	place: "surface",
	defaults: { kind: "pizza" },
	size: () => ({
		w: .6,
		d: .6,
		h: .34
	}),
	recipe(p) {
		const r = [cyl(.3, .3, 0, .04, .24, .29, "white", { mat: "ceramic" })], k = str(p, "kind"), R = rng(5);
		const blobs = (n, s, z, cs) => {
			for (let i = 0; i < n; i++) {
				const a = R() * Math.PI * 2, d = R() * .15;
				r.push(ell(.3 + Math.cos(a) * d, .3 + Math.sin(a) * d, z, s, s, s * .7, cs[i % cs.length]));
			}
		};
		if (k === "pizza") {
			r.push(cyl(.3, .3, .04, .07, .25, .25, "#e8b45c", { top: "#f1c85e" }));
			for (let i = 0; i < 6; i++) {
				const a = i / 6 * Math.PI * 2 + .3;
				r.push(disc("z", .3 + Math.cos(a) * .14, .3 + Math.sin(a) * .14, .072, .035, "red", { noLine: true }));
			}
		} else if (k === "bread") r.push(ell(.3, .3, .12, .22, .12, .09, "#d79a55"), line([[
			.18,
			.26,
			.2
		], [
			.22,
			.34,
			.2
		]], "#b5763a", 1.5), line([[
			.3,
			.26,
			.21
		], [
			.34,
			.34,
			.21
		]], "#b5763a", 1.5));
		else if (k === "pasta") {
			r.push(ell(.3, .3, .07, .2, .2, .05, "#f1d38a"));
			for (let i = 0; i < 6; i++) r.push(ell(.22 + i % 3 * .08, .24 + Math.floor(i / 3) * .12, .12, .04, .04, .03, "red"));
		} else if (k === "meat") r.push(ell(.3, .3, .08, .17, .12, .05, "#b5674a"), ell(.3, .3, .12, .13, .09, .02, "#c98a6a", { noLine: true }), ell(.45, .36, .08, .05, .05, .04, "green"));
		else if (k === "veggies") blobs(7, .06, .08, [
			"green",
			"coral",
			"butter",
			"leafLight"
		]);
		else if (k === "kimchi") {
			r.push(cyl(.3, .3, .04, .22, .14, .16, "white", { mat: "ceramic" }));
			blobs(5, .05, .24, ["#d9534f"]);
		} else if (k === "eggs") for (const [x, y] of [
			[.2, .25],
			[.38, .3],
			[.27, .4]
		]) r.push(ell(x, y, .05, .09, .09, .015, "white", { noLine: true }), ell(x, y, .065, .035, .035, .02, "butter"));
		else if (k === "cheese") r.push(box(.12, .2, .04, .48, .42, .16, "#f2c94c"), disc("y", .25, .421, .1, .03, "#d9a92e"), disc("y", .38, .421, .12, .025, "#d9a92e"));
		else if (k === "chocolate") {
			r.push(box(.12, .16, .04, .48, .44, .08, "choc"));
			for (const x of [.24, .36]) r.push(line([[
				x,
				.16,
				.081
			], [
				x,
				.44,
				.081
			]], "#4a3020", 1));
			r.push(line([[
				.12,
				.3,
				.081
			], [
				.48,
				.3,
				.081
			]], "#4a3020", 1));
		} else {
			r.push(cyl(.3, .3, .04, .12, .13, .15, "sky", { mat: "ceramic" }));
			for (const [z, c] of [[.17, "pink"], [.24, "cream"]]) r.push(ell(.3, .3, z, .09, .09, .07, c));
			r.push(ell(.3, .3, .3, .025, .025, .025, "red"));
		}
		return r;
	}
});
def$1({
	id: "drink",
	cat: "small",
	name: {
		ko: "음료 병",
		en: "Drink bottle"
	},
	place: "surface",
	defaults: { kind: "water" },
	size: () => ({
		w: .2,
		d: .2,
		h: .5
	}),
	recipe(p) {
		const k = str(p, "kind");
		if (k === "juice") return [
			box(.03, .03, 0, .17, .17, .34, "butter", { mat: "paint" }),
			poly([
				[
					.03,
					.03,
					.34
				],
				[
					.17,
					.03,
					.34
				],
				[
					.17,
					.1,
					.42
				],
				[
					.03,
					.1,
					.42
				]
			], "#fff1c2"),
			poly([
				[
					.03,
					.17,
					.34
				],
				[
					.17,
					.17,
					.34
				],
				[
					.17,
					.1,
					.42
				],
				[
					.03,
					.1,
					.42
				]
			], "#f3cf6a"),
			box(.06, .168, .08, .14, .172, .24, "#fff6e0", { noLine: true }),
			ell(.1, .174, .16, .035, .005, .035, "#ff8a00", { noLine: true }),
			ell(.1, .176, .205, .012, .004, .012, "#6bb36b", { noLine: true }),
			line([[
				.12,
				.08,
				.4
			], [
				.145,
				.065,
				.5
			]], "#ff6f8a", 3)
		];
		const body = k === "milk" ? "white" : k === "juice" ? "mustard" : "glass", cap = k === "milk" ? "sky" : k === "juice" ? "green" : "blue", a = k === "water" ? .6 : 1;
		return [
			cyl(.1, .1, 0, .36, .08, .08, body, {
				mat: "glass",
				a
			}),
			cyl(.1, .1, .36, .44, .08, .035, body, { a }),
			cyl(.1, .1, .44, .5, .035, .035, cap),
			box(.03, .17, .12, .17, .18, .24, k === "milk" ? "sky" : k === "juice" ? "coral" : "white")
		];
	}
});
def$1({
	id: "bathBottles",
	cat: "small",
	name: {
		ko: "욕실 용품",
		en: "Bath bottles"
	},
	place: "surface",
	defaults: {
		a: "pink",
		b: "mint",
		c: "sky"
	},
	size: () => ({
		w: .6,
		d: .25,
		h: .5
	}),
	recipe: (p) => [
		box(.03, .05, 0, .17, .2, .36, str(p, "a"), { mat: "paint" }),
		cyl(.1, .12, .36, .45, .03, .03, "white"),
		box(.22, .05, 0, .38, .2, .3, str(p, "b"), { mat: "paint" }),
		cyl(.3, .12, .3, .36, .05, .04, "white"),
		cyl(.48, .12, 0, .26, .08, .08, str(p, "c"), { mat: "paint" }),
		box(.46, .1, .26, .5, .14, .38, "white"),
		box(.46, .1, .36, .58, .14, .38, "white")
	]
});
def$1({
	id: "soap",
	cat: "small",
	name: {
		ko: "비누",
		en: "Soap"
	},
	place: "surface",
	defaults: { c: "pink" },
	size: () => ({
		w: .4,
		d: .3,
		h: .16
	}),
	recipe: (p) => [
		ell(.2, .15, .02, .19, .14, .02, "sky", { mat: "ceramic" }),
		ell(.2, .15, .07, .13, .09, .05, str(p, "c")),
		ell(.3, .1, .13, .04, .04, .03, "white", { noLine: true }),
		ell(.34, .16, .13, .025, .025, .02, "white", { noLine: true })
	]
});
def$1({
	id: "toothSet",
	cat: "small",
	name: {
		ko: "양치 컵",
		en: "Toothbrush cup"
	},
	place: "surface",
	defaults: { c: "mint" },
	size: () => ({
		w: .25,
		d: .25,
		h: .45
	}),
	recipe: (p) => [
		cyl(.125, .125, 0, .2, .09, .1, str(p, "c"), { mat: "ceramic" }),
		line([[
			.1,
			.12,
			.15
		], [
			.07,
			.1,
			.42
		]], "coral", 3),
		line([[
			.15,
			.13,
			.15
		], [
			.18,
			.15,
			.4
		]], "sky", 3),
		box(.03, .08, .38, .1, .12, .44, "white"),
		line([[
			.13,
			.11,
			.15
		], [
			.13,
			.1,
			.36
		]], "white", 4)
	]
});
def$1({
	id: "deskClock",
	cat: "small",
	name: {
		ko: "탁상시계",
		en: "Desk clock"
	},
	place: "surface",
	defaults: { c: "coral" },
	size: () => ({
		w: .4,
		d: .3,
		h: .45
	}),
	recipe(p) {
		const c = str(p, "c");
		return [
			cyl(.2, .12, .04, .38, .11, .11, c, { mat: "metal" }),
			dotY(.2, .231, .21, .13, "white"),
			line([[
				.2,
				.232,
				.21
			], [
				.2,
				.232,
				.31
			]], "black", 1.5),
			line([[
				.2,
				.232,
				.21
			], [
				.27,
				.232,
				.21
			]], "black", 1.5),
			ell(.1, .12, .4, .06, .06, .04, c, { mat: "metal" }),
			ell(.3, .12, .4, .06, .06, .04, c, { mat: "metal" }),
			box(.08, .1, 0, .12, .14, .06, "slate"),
			box(.28, .1, 0, .32, .14, .06, "slate")
		];
	}
});
def$1({
	id: "crayonBox",
	cat: "small",
	name: {
		ko: "크레용 상자",
		en: "Crayon box"
	},
	place: "surface",
	defaults: { c: "butter" },
	size: () => ({
		w: .45,
		d: .25,
		h: .35
	}),
	recipe(p) {
		const r = [];
		[
			"red",
			"blue",
			"green",
			"mustard",
			"lilac",
			"coral"
		].forEach((c, i) => r.push(box(.04 + i * .065, .08, .15, .09 + i * .065, .13, .32, c)));
		r.push(box(.02, .03, 0, .43, .22, .2, str(p, "c"), { mat: "card" }), poly([
			[
				.1,
				.221,
				.06
			],
			[
				.35,
				.221,
				.06
			],
			[
				.35,
				.221,
				.15
			],
			[
				.1,
				.221,
				.15
			]
		], "green", { noLine: true }));
		return r;
	}
});
def$1({
	id: "marbleBag",
	shadow: "round",
	cat: "small",
	name: {
		ko: "구슬 주머니",
		en: "Marble bag"
	},
	place: "surface",
	defaults: { c: "plum" },
	size: () => ({
		w: .45,
		d: .4,
		h: .32
	}),
	recipe: (p) => [
		ell(.18, .2, .12, .15, .15, .12, str(p, "c"), { mat: "fabric" }),
		cyl(.18, .2, .2, .3, .05, .08, str(p, "c"), { mat: "fabric" }),
		line([[
			.12,
			.22,
			.22
		], [
			.24,
			.22,
			.22
		]], "butter", 2),
		ell(.36, .32, .04, .04, .04, .04, "sky", { mat: "glass" }),
		ell(.4, .2, .04, .035, .035, .035, "coral", { mat: "glass" })
	]
});
def$1({
	id: "toolSet",
	cat: "small",
	name: {
		ko: "공구 소품",
		en: "Tool"
	},
	place: "surface",
	defaults: { kind: "hammer" },
	size: () => ({
		w: .6,
		d: .3,
		h: .25
	}),
	recipe(p) {
		switch (str(p, "kind")) {
			case "drill": return [
				box(.05, .08, .05, .4, .22, .18, "mustard", { mat: "paint" }),
				box(.12, .1, 0, .22, .2, .08, "charcoal"),
				cyl(.48, .15, .1, .13, .02, .02, "steel")
			];
			case "screwdriver": return [box(.05, .11, 0, .3, .19, .08, "red", { mat: "paint" }), box(.3, .135, .02, .58, .165, .05, "steel", { mat: "metal" })];
			case "saw": return [poly([
				[
					.18,
					.15,
					.01
				],
				[
					.58,
					.15,
					.01
				],
				[
					.58,
					.25,
					.01
				],
				[
					.18,
					.2,
					.01
				]
			], "steel", { mat: "metal" }), box(.02, .1, 0, .2, .25, .05, "oak", { mat: "wood" })];
			case "wrench": return [
				box(.1, .13, 0, .5, .17, .03, "steel", { mat: "metal" }),
				ell(.08, .15, .015, .07, .07, .015, "steel"),
				ell(.52, .15, .015, .07, .07, .015, "steel")
			];
			case "pliers": return [
				line([
					[
						.05,
						.08,
						.02
					],
					[
						.35,
						.15,
						.02
					],
					[
						.55,
						.15,
						.02
					]
				], "steel", 3),
				line([[
					.05,
					.22,
					.02
				], [
					.35,
					.15,
					.02
				]], "steel", 3),
				box(.02, .06, 0, .18, .11, .04, "red"),
				box(.02, .19, 0, .18, .24, .04, "red")
			];
			case "tape": return [cyl(.15, .15, 0, .12, .13, .13, "mustard", {
				mat: "paint",
				top: "butter"
			}), box(.27, .12, 0, .55, .18, .01, "butter")];
			default: return [box(.05, .12, 0, .45, .18, .05, "oak", { mat: "wood" }), box(.42, .06, 0, .55, .24, .1, "slate", { mat: "metal" })];
		}
	}
});
def$1({
	id: "paintCan",
	cat: "small",
	name: {
		ko: "페인트 통",
		en: "Paint can"
	},
	place: "surface",
	defaults: { c: "sky" },
	size: () => ({
		w: .35,
		d: .35,
		h: .42
	}),
	recipe: (p) => [
		cyl(.175, .175, 0, .3, .15, .15, "steel", {
			mat: "metal",
			top: str(p, "c")
		}),
		poly([
			[
				.06,
				.32,
				.12
			],
			[
				.29,
				.32,
				.12
			],
			[
				.29,
				.32,
				.25
			],
			[
				.06,
				.32,
				.25
			]
		], str(p, "c"), { noLine: true }),
		line([
			[
				.03,
				.175,
				.3
			],
			[
				.175,
				.175,
				.42
			],
			[
				.32,
				.175,
				.3
			]
		], "slate", 1.5)
	]
});
def$1({
	id: "shoes",
	cat: "small",
	name: {
		ko: "신발 한 켤레",
		en: "Pair of shoes"
	},
	place: "surface",
	defaults: {
		kind: "sneakers",
		c: "red"
	},
	size: () => ({
		w: .5,
		d: .4,
		h: .38
	}),
	recipe(p) {
		const k = str(p, "kind"), c = str(p, "c"), tall = k === "boots" || k === "rain", r = [];
		for (const x of [.13, .37]) if (k === "sandals" || k === "slippers") r.push(box(x - .09, .04, 0, x + .09, .36, .04, k === "slippers" ? "white" : "walnut"), ell(x, .24, .07, .09, .08, .04, c, { mat: k === "slippers" ? "fur" : "fabric" }));
		else {
			r.push(box(x - .09, .04, 0, x + .09, .36, .04, k === "school" ? "black" : "white"), ell(x, .22, .1, .09, .13, .07, c, { mat: k === "school" ? "paint" : "fabric" }));
			if (tall) r.push(box(x - .08, .06, .04, x + .08, .2, .36, c, { mat: k === "rain" ? "paint" : "fabric" }));
			if (k === "sneakers") r.push(line([[
				x - .05,
				.3,
				.14
			], [
				x + .05,
				.28,
				.14
			]], "white", 1.5));
		}
		return r;
	}
});
def$1({
	id: "piano",
	cat: "seat",
	name: {
		ko: "피아노",
		en: "Piano"
	},
	place: "floor",
	defaults: { c: "black" },
	size: () => ({
		w: 2.2,
		d: 1.1,
		h: 2.4
	}),
	recipe(p) {
		const c = str(p, "c"), r = [
			box(0, 0, 0, 2.2, .55, 2.4, c, { mat: "paint" }),
			box(0, .55, 1.15, 2.2, 1, 1.25, c, { mat: "paint" }),
			box(.05, .55, 1.25, 2.15, .95, 1.3, "white"),
			box(.1, .55, 0, .22, 1, 1.15, c, { mat: "paint" }),
			box(1.98, .55, 0, 2.1, 1, 1.15, c, { mat: "paint" }),
			box(.15, .5, 1.7, 2.05, .6, 2, c, { mat: "paint" }),
			poly([
				[
					.7,
					.601,
					1.75
				],
				[
					1.5,
					.601,
					1.75
				],
				[
					1.5,
					.601,
					1.95
				],
				[
					.7,
					.601,
					1.95
				]
			], "cream", { noLine: true })
		];
		for (let x = .12; x < 2.08; x += .14) if (Math.round((x - .12) / .14) % 7 !== 2 && Math.round((x - .12) / .14) % 7 !== 6) r.push(box(x + .09, .55, 1.3, x + .15, .78, 1.34, "black"));
		return r;
	}
});
def$1({
	id: "bathtub",
	cat: "seat",
	name: {
		ko: "욕조",
		en: "Bathtub"
	},
	place: "floor",
	defaults: { c: "white" },
	size: () => ({
		w: 2.6,
		d: 1.3,
		h: 1.55
	}),
	recipe(p) {
		const r = [box(0, 0, .12, 2.6, 1.3, 1.1, str(p, "c"), { mat: "ceramic" })];
		for (const [x, y] of [
			[.2, .2],
			[2.4, .2],
			[.2, 1.1],
			[2.4, 1.1]
		]) r.push(cyl(x, y, 0, .14, .07, .09, "brass", { mat: "metal" }));
		r.push(poly([
			[
				.15,
				.15,
				1.101
			],
			[
				2.45,
				.15,
				1.101
			],
			[
				2.45,
				1.15,
				1.101
			],
			[
				.15,
				1.15,
				1.101
			]
		], "water", { noLine: true }));
		for (const [x, y, s] of [
			[
				.8,
				.5,
				.18
			],
			[
				1.1,
				.75,
				.22
			],
			[
				1.5,
				.45,
				.16
			],
			[
				1.9,
				.8,
				.2
			],
			[
				.5,
				.85,
				.14
			]
		]) r.push(ell(x, y, 1.13, s, s, s * .6, "white", { noLine: true }));
		r.push(cyl(2.35, .3, 1.1, 1.45, .04, .04, "steel", { mat: "metal" }), ell(2.3, .45, 1.48, .12, .08, .05, "steel", { mat: "metal" }));
		return r;
	},
	seats: () => [{
		id: "bath",
		pose: "sit",
		x: 1.3,
		y: .65,
		z: .5,
		facing: "+x"
	}]
});
def$1({
	id: "toilet",
	cat: "seat",
	name: {
		ko: "변기",
		en: "Toilet"
	},
	place: "floor",
	defaults: { c: "white" },
	size: () => ({
		w: .9,
		d: 1.2,
		h: 1.7
	}),
	recipe: (p) => [
		box(.1, 0, .6, .8, .35, 1.6, str(p, "c"), { mat: "ceramic" }),
		box(.1, 0, 1.6, .8, .38, 1.7, str(p, "c"), { mat: "ceramic" }),
		box(.55, .36, 1.45, .7, .4, 1.52, "steel"),
		cyl(.45, .75, 0, .55, .22, .28, str(p, "c"), { mat: "ceramic" }),
		cyl(.45, .75, .55, .68, .38, .38, str(p, "c"), {
			mat: "ceramic",
			top: "sky"
		})
	],
	seats: () => [{
		id: "s1",
		pose: "sit",
		x: .45,
		y: .75,
		z: .68,
		facing: "+y"
	}]
});
def$1({
	id: "armchair",
	cat: "seat",
	name: {
		ko: "안락의자",
		en: "Armchair"
	},
	place: "floor",
	defaults: { c: "lilac" },
	size: () => ({
		w: 1.4,
		d: 1.3,
		h: 2.1
	}),
	recipe: (p) => [
		box(.15, .15, 0, .25, .25, .2, "walnut"),
		box(1.15, 1.05, 0, 1.25, 1.15, .2, "walnut"),
		box(1.15, .15, 0, 1.25, .25, .2, "walnut"),
		box(.15, 1.05, 0, .25, 1.15, .2, "walnut"),
		box(.1, .1, .2, 1.3, 1.25, .75, str(p, "c"), { mat: "fabric" }),
		box(.25, .3, .75, 1.15, 1.2, .95, str(p, "c"), { mat: "fabric" }),
		box(.1, .1, .75, 1.3, .35, 2.1, str(p, "c"), { mat: "fabric" }),
		box(.05, .1, .75, .28, 1.25, 1.35, str(p, "c"), { mat: "fabric" }),
		box(1.12, .1, .75, 1.35, 1.25, 1.35, str(p, "c"), { mat: "fabric" }),
		ell(.7, .42, 1.25, .32, .08, .22, "cream", { mat: "knit" })
	],
	seats: () => [{
		id: "s1",
		pose: "sit",
		x: .7,
		y: .75,
		z: .95,
		facing: "+y"
	}]
});
def$1({
	id: "counter",
	cat: "table",
	name: {
		ko: "조리대",
		en: "Kitchen counter"
	},
	place: "floor",
	defaults: {
		c: "mint",
		top: "white"
	},
	size: () => ({
		w: 2,
		d: .9,
		h: 2
	}),
	recipe(p) {
		const c = str(p, "c"), r = [
			box(.05, .05, 0, 1.95, .8, .12, "charcoal"),
			box(0, 0, .12, 2, .85, 1.48, c, { mat: "paint" }),
			box(0, 0, 1.48, 2, .9, 1.6, str(p, "top"), { mat: "ceramic" })
		];
		for (const x of [.05, 1.02]) {
			r.push(poly([
				[
					x,
					.851,
					.2
				],
				[
					x + .93,
					.851,
					.2
				],
				[
					x + .93,
					.851,
					1.4
				],
				[
					x,
					.851,
					1.4
				]
			], c));
			r.push(box(x + .4, .85, 1.2, x + .55, .9, 1.25, "steel", { mat: "metal" }));
		}
		r.push(box(.5, .25, 1.55, 1.1, .75, 1.601, "steel", { mat: "metal" }), cyl(.8, .15, 1.6, 2, .03, .03, "steel", { mat: "metal" }), box(.78, .15, 1.95, .82, .4, 1.99, "steel", { mat: "metal" }));
		return r;
	},
	surfaces: () => [{
		id: "top",
		x: 1.15,
		y: .1,
		w: .8,
		d: .75,
		z: 1.6,
		maxH: 1.2,
		cell: .05
	}]
});
def$1({
	id: "stove",
	cat: "table",
	name: {
		ko: "가스레인지",
		en: "Stove"
	},
	place: "floor",
	defaults: { c: "white" },
	size: () => ({
		w: 1.2,
		d: .96,
		h: 1.65
	}),
	recipe(p) {
		const r = [box(0, 0, 0, 1.2, .9, 1.55, str(p, "c"), { mat: "paint" }), box(0, 0, 1.55, 1.2, .9, 1.6, "charcoal", { mat: "metal" })];
		for (const [x, y] of [
			[.3, .3],
			[.9, .3],
			[.3, .65],
			[.9, .65]
		]) r.push(cyl(x, y, 1.6, 1.64, .15, .15, "slate", { mat: "metal" }), disc("z", x, y, 1.641, .06, "charcoal", { noLine: true }));
		r.push(poly([
			[
				.15,
				.901,
				.25
			],
			[
				1.05,
				.901,
				.25
			],
			[
				1.05,
				.901,
				1
			],
			[
				.15,
				.901,
				1
			]
		], "charcoal"), poly([
			[
				.25,
				.902,
				.35
			],
			[
				.95,
				.902,
				.35
			],
			[
				.95,
				.902,
				.85
			],
			[
				.25,
				.902,
				.85
			]
		], "#5b4a40", { noLine: true }));
		r.push(box(.2, .9, 1.05, 1, .96, 1.1, "steel", { mat: "metal" }));
		for (const x of [
			.2,
			.45,
			.75,
			1
		]) r.push(dotY(x, .902, 1.35, .05, "slate"));
		return r;
	},
	surfaces: () => [{
		id: "top",
		x: .1,
		y: .1,
		w: 1,
		d: .7,
		z: 1.64,
		maxH: 1,
		cell: .05
	}]
});
var VIEW_SKY = {
	night: "navy",
	sunset: "peach",
	rain: "slate",
	snow: "sky",
	sea: "skyDay",
	city: "skyDay",
	tree: "skyDay",
	day: "skyDay"
};
def$1({
	id: "window",
	cat: "wall",
	name: {
		ko: "창문",
		en: "Window"
	},
	place: "wall",
	defaults: {
		view: "day",
		shape: "square",
		curtain: "none"
	},
	size: () => ({
		w: 1.5,
		d: .2,
		h: 1.75
	}),
	recipe(p) {
		const view = str(p, "view"), round = str(p, "shape") === "round", cur = str(p, "curtain");
		const at = (u, v, yy = .101) => [
			.12 + 1.26 * u,
			yy,
			.22 + 1.36 * v
		];
		const ring = (rx, rz, yy) => Array.from({ length: 28 }, (_, i) => {
			const t = i / 28 * Math.PI * 2;
			return [
				.75 + Math.cos(t) * rx,
				yy,
				.9 + Math.sin(t) * rz
			];
		});
		const r = round ? [poly(ring(.75, .8, .08), "trim", { mat: "paint" }), poly(ring(.62, .66, .101), VIEW_SKY[view] ?? "skyDay", { noLine: true })] : [
			box(0, 0, .1, 1.5, .1, 1.7, "trim", { mat: "paint" }),
			box(0, 0, 0, 1.5, .2, .12, "trim", { mat: "paint" }),
			poly([
				at(0, 0),
				at(1, 0),
				at(1, 1),
				at(0, 1)
			], VIEW_SKY[view] ?? "skyDay", { noLine: true })
		];
		const yy = .10200000000000001, X = (u) => at(u, 0)[0], Z = (v) => at(0, v)[2];
		if (view === "night") {
			r.push(dotY(X(.68), yy, Z(.72), .16, "butter"), dotY(X(.74), .10300000000000001, Z(.77), .13, "navy"));
			for (const [u, v] of [
				[.25, .75],
				[.35, .5],
				[.55, .35]
			]) r.push(poly(starY(X(u), yy, Z(v), .05, .02), "butter", { noLine: true }));
		} else if (view === "sunset") r.push(dotY(X(.5), yy, Z(.3), .3, "coral"));
		else if (view === "rain") for (let i = 0; i < 9; i++) r.push(line([[
			X(.1 + i % 3 * .33),
			yy,
			Z(.85 - Math.floor(i / 3) * .28)
		], [
			X(.06 + i % 3 * .33),
			yy,
			Z(.75 - Math.floor(i / 3) * .28)
		]], "sky", 1.5));
		else if (view === "snow") for (let i = 0; i < 10; i++) r.push(dotY(X(.12 + i * 37 % 80 / 100), yy, Z(.3 + i * 53 % 65 / 100), .025, "white"));
		else if (view === "sea") r.push(poly([
			at(.08, .08, yy),
			at(.92, .08, yy),
			at(.92, .45, yy),
			at(.08, .45, yy)
		], "blue", { noLine: true }), dotY(X(.7), .10300000000000001, Z(.7), .1, "sun"));
		else if (view === "city") for (const [u, w, hh, c] of [
			[
				.1,
				.18,
				.55,
				"slate"
			],
			[
				.3,
				.15,
				.75,
				"grey"
			],
			[
				.48,
				.2,
				.45,
				"navy"
			],
			[
				.7,
				.2,
				.65,
				"slate"
			]
		]) r.push(poly([
			at(u, .08, yy),
			at(u + w, .08, yy),
			at(u + w, hh, yy),
			at(u, hh, yy)
		], c, { noLine: true }));
		else if (view === "tree") r.push(poly([
			at(.45, .08, yy),
			at(.55, .08, yy),
			at(.55, .4, yy),
			at(.45, .4, yy)
		], "walnut", { noLine: true }), dotY(X(.5), .10300000000000001, Z(.6), .36, "green"));
		else r.push(ell(X(.3), yy, Z(.7), .22, .001, .1, "white", { noLine: true }), ell(X(.45), yy, Z(.72), .16, .001, .12, "white", { noLine: true }));
		if (round) r.push(line([[
			.75,
			.10600000000000001,
			.24
		], [
			.75,
			.10600000000000001,
			1.56
		]], "trim", 3), line([[
			.13,
			.10600000000000001,
			.9
		], [
			1.37,
			.10600000000000001,
			.9
		]], "trim", 3));
		else r.push(line([at(.5, 0, .10600000000000001), at(.5, 1, .10600000000000001)], "trim", 3), line([at(0, .5, .10600000000000001), at(1, .5, .10600000000000001)], "trim", 3));
		if (cur !== "none") for (const u0 of [0, 1.15]) r.push(poly([
			[
				u0,
				.17,
				.15
			],
			[
				u0 + .35,
				.17,
				.15
			],
			[
				u0 + .35,
				.17,
				1.75
			],
			[
				u0,
				.17,
				1.75
			]
		], cur, { mat: "fabric" }));
		return r;
	}
});
var POSTER_BG = {
	map: "sky",
	rocket: "navy",
	rainbow: "white",
	kangaroo: "butter",
	dino: "mint",
	abc: "cream",
	solar: "navy",
	fish: "sky",
	mountain: "skyDay",
	math: "white",
	music: "pink"
};
def$1({
	id: "poster",
	cat: "wall",
	name: {
		ko: "포스터",
		en: "Poster"
	},
	place: "wall",
	defaults: { art: "map" },
	size: () => ({
		w: 1.3,
		d: .05,
		h: 1
	}),
	recipe(p) {
		const art = str(p, "art"), r = [box(0, 0, 0, 1.3, .03, 1, "white", { mat: "paper" })];
		const at = (u, v) => [
			.08 + 1.14 * u,
			.031,
			.08 + .84 * v
		];
		const P = (pts, c) => r.push(poly(pts.map(([u, v]) => at(u, v)), c, { noLine: true }));
		const D = (u, v, s, c) => r.push(disc("y", at(u, 0)[0], .032, at(0, v)[2], s, c, { noLine: true }));
		P([
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1]
		], POSTER_BG[art] ?? "sky");
		const arc = (rr0, rr1, c) => P(Array.from({ length: 13 }, (_, k) => {
			const t = Math.PI - k / 12 * Math.PI;
			return [.5 + Math.cos(t) * rr0, .15 + Math.sin(t) * rr0 * 1.5];
		}).concat(Array.from({ length: 13 }, (_, k) => {
			const t = k / 12 * Math.PI;
			return [.5 + Math.cos(t) * rr1, .15 + Math.sin(t) * rr1 * 1.5];
		})), c);
		switch (art) {
			case "map":
				for (const b of [
					[
						[.08, .6],
						[.3, .75],
						[.35, .5],
						[.22, .35],
						[.1, .45]
					],
					[
						[.4, .7],
						[.62, .8],
						[.68, .55],
						[.5, .45]
					],
					[
						[.45, .4],
						[.58, .38],
						[.55, .1],
						[.48, .15]
					],
					[
						[.72, .25],
						[.92, .3],
						[.88, .1],
						[.75, .08]
					]
				]) P(b, "sage");
				break;
			case "rocket":
				P([
					[.45, .2],
					[.55, .2],
					[.55, .65],
					[.5, .85],
					[.45, .65]
				], "white");
				P([
					[.45, .2],
					[.36, .1],
					[.45, .35]
				], "coral");
				P([
					[.55, .2],
					[.64, .1],
					[.55, .35]
				], "coral");
				P([
					[.46, .2],
					[.54, .2],
					[.5, .04]
				], "butter");
				D(.2, .8, .03, "butter");
				D(.8, .6, .03, "butter");
				break;
			case "rainbow":
				[
					"coral",
					"butter",
					"mint",
					"sky",
					"lilac"
				].forEach((c, i) => arc(.45 - i * .06, .39 - i * .06, c));
				break;
			case "kangaroo":
				P([
					[.3, .1],
					[.6, .12],
					[.65, .45],
					[.55, .7],
					[.5, .85],
					[.45, .7],
					[.35, .45]
				], "terracotta");
				P([
					[.3, .12],
					[.1, .05],
					[.3, .25]
				], "terracotta");
				P([
					[.48, .85],
					[.44, .97],
					[.52, .88]
				], "terracotta");
				break;
			case "dino":
				P([
					[.15, .15],
					[.65, .15],
					[.75, .45],
					[.85, .75],
					[.75, .8],
					[.6, .5],
					[.3, .45]
				], "green");
				P([
					[.15, .15],
					[.03, .3],
					[.25, .3]
				], "green");
				break;
			case "abc":
				[
					[.15, "coral"],
					[.45, "teal"],
					[.75, "mustard"]
				].forEach(([u, c]) => P([
					[u - .1, .3],
					[u + .1, .3],
					[u + .1, .7],
					[u - .1, .7]
				], c));
				break;
			case "solar":
				D(.15, .5, .15, "butter");
				[
					[
						.35,
						.03,
						"slate"
					],
					[
						.5,
						.05,
						"coral"
					],
					[
						.65,
						.06,
						"sky"
					],
					[
						.85,
						.09,
						"mustard"
					]
				].forEach(([u, s, c]) => D(u, .5, s, c));
				break;
			case "fish":
				for (const [u, v, c] of [
					[
						.3,
						.6,
						"mustard"
					],
					[
						.6,
						.35,
						"coral"
					],
					[
						.75,
						.7,
						"butter"
					]
				]) {
					P([
						[u - .12, v],
						[u, v + .08],
						[u + .1, v],
						[u, v - .08]
					], c);
					P([
						[u + .1, v],
						[u + .17, v + .06],
						[u + .17, v - .06]
					], c);
				}
				break;
			case "mountain":
				P([
					[0, 0],
					[1, 0],
					[.6, .8]
				], "slate");
				P([
					[.5, .6],
					[.7, .6],
					[.6, .8]
				], "white");
				P([
					[0, 0],
					[.55, 0],
					[.25, .55]
				], "sage");
				break;
			case "math":
				for (const [u, v, c] of [
					[
						.25,
						.65,
						"coral"
					],
					[
						.6,
						.65,
						"teal"
					],
					[
						.25,
						.3,
						"mustard"
					],
					[
						.6,
						.3,
						"lilac"
					]
				]) {
					P([
						[u, v - .02],
						[u + .2, v - .02],
						[u + .2, v + .02],
						[u, v + .02]
					], c);
					if (v > .5) P([
						[u + .08, v - .1],
						[u + .12, v - .1],
						[u + .12, v + .1],
						[u + .08, v + .1]
					], c);
				}
				break;
			case "music":
				for (const [u, v] of [[.3, .3], [.65, .4]]) {
					D(u, v, .08, "black");
					P([
						[u + .07, v],
						[u + .09, v],
						[u + .09, v + .45],
						[u + .07, v + .45]
					], "black");
				}
				P([
					[.37, .72],
					[.74, .82],
					[.74, .88],
					[.37, .78]
				], "black");
		}
		for (const [u, v] of [[0, 1], [1, 1]]) {
			const [x, , z] = at(u, v);
			r.push(poly([
				[
					Math.max(0, x - .08),
					.034,
					z - .03
				],
				[
					x + .06,
					.034,
					z + .02
				],
				[
					x + .05,
					.034,
					Math.min(1, z + .06)
				],
				[
					Math.max(0, x - .09),
					.034,
					z + .01
				]
			], "tape", { noLine: true }));
		}
		return r;
	}
});
def$1({
	id: "mirror",
	cat: "wall",
	name: {
		ko: "거울",
		en: "Mirror"
	},
	place: "wall",
	defaults: { c: "brass" },
	size: () => ({
		w: .9,
		d: .08,
		h: 1.3
	}),
	recipe(p) {
		const ring = (rx, rz, yy) => Array.from({ length: 28 }, (_, i) => {
			const t = i / 28 * Math.PI * 2;
			return [
				.45 + Math.cos(t) * rx,
				yy,
				.65 + Math.sin(t) * rz
			];
		});
		return [
			poly(ring(.45, .65, .04), str(p, "c"), { mat: "metal" }),
			poly(ring(.37, .56, .05), "glass"),
			poly([
				[
					.25,
					.051,
					.5
				],
				[
					.35,
					.051,
					.5
				],
				[
					.5,
					.051,
					1
				],
				[
					.4,
					.051,
					1
				]
			], "white", {
				noLine: true,
				a: .6
			})
		];
	}
});
var PHOTO = {
	picnic: ["lawn", "coral"],
	beach: ["sand", "sky"],
	birthday: ["pink", "butter"],
	park: ["green", "sky"],
	zoo: ["butter", "mustard"],
	camp: ["navy", "coral"],
	snow: ["white", "sky"],
	grad: ["navy", "black"]
};
def$1({
	id: "collageFrame",
	cat: "wall",
	name: {
		ko: "사진 콜라주 액자",
		en: "Photo collage"
	},
	place: "wall",
	defaults: {
		c: "oak",
		a: "picnic",
		b: "beach",
		e: "birthday"
	},
	size: () => ({
		w: 1.8,
		d: .1,
		h: .9
	}),
	recipe(p) {
		const r = [box(0, 0, 0, 1.8, .08, .9, str(p, "c"), { mat: "wood" })];
		[
			str(p, "a"),
			str(p, "b"),
			str(p, "e")
		].forEach((ph, i) => {
			const x0 = .1 + i * .55, [g, s] = PHOTO[ph] ?? ["sky", "coral"];
			r.push(poly([
				[
					x0,
					.081,
					.1
				],
				[
					x0 + .5,
					.081,
					.1
				],
				[
					x0 + .5,
					.081,
					.8
				],
				[
					x0,
					.081,
					.8
				]
			], s, { noLine: true }), poly([
				[
					x0,
					.082,
					.1
				],
				[
					x0 + .5,
					.082,
					.1
				],
				[
					x0 + .5,
					.082,
					.35
				],
				[
					x0,
					.082,
					.35
				]
			], g, { noLine: true }));
			r.push(dotY(x0 + .25, .083, .42, .08, "fur"), dotY(x0 + .38, .083, .65, .06, ph === "camp" || ph === "grad" ? "butter" : "white"));
		});
		return r;
	}
});
def$1({
	id: "mobile",
	cat: "wall",
	name: {
		ko: "모빌",
		en: "Hanging mobile"
	},
	place: "wall",
	defaults: { c: "pink" },
	size: () => ({
		w: 1.2,
		d: .6,
		h: 1.4
	}),
	recipe(p) {
		const r = [
			box(.5, 0, 1.3, .7, .05, 1.4, "oak"),
			line([
				[
					.6,
					.05,
					1.35
				],
				[
					.6,
					.3,
					1.35
				],
				[
					.6,
					.3,
					1.15
				]
			], "choc", 1),
			line([[
				.1,
				.3,
				1.15
			], [
				1.1,
				.3,
				1.15
			]], "oak", 2)
		];
		[
			"pink",
			"sky",
			"butter",
			"mint",
			str(p, "c")
		].forEach((c, i) => {
			const x = .15 + i * .22, z = .85 - i % 2 * .25;
			r.push(line([[
				x,
				.3,
				1.15
			], [
				x,
				.3,
				z + .12
			]], "grey", .8), poly([
				[
					x - .12,
					.3,
					z
				],
				[
					x,
					.36,
					z + .1
				],
				[
					x + .12,
					.3,
					z
				],
				[
					x,
					.24,
					z - .05
				]
			], c), poly([
				[
					x,
					.3,
					z
				],
				[
					x + .03,
					.3,
					z + .16
				],
				[
					x - .03,
					.3,
					z + .12
				]
			], c));
		});
		return r;
	}
});
def$1({
	id: "fairyLights",
	cat: "wall",
	name: {
		ko: "꼬마전구 줄",
		en: "Fairy lights"
	},
	place: "wall",
	defaults: {
		w: 2.6,
		kind: "mix"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: .14,
		h: .6
	}),
	recipe(p) {
		const w = num$1(p, "w"), y = .06, kind = str(p, "kind"), sag = (x) => .52 - .18 * Math.sin(Math.PI * x / w), pts = [];
		for (let i = 0; i <= 16; i++) pts.push([
			w * i / 16,
			y,
			sag(w * i / 16)
		]);
		const r = [line(pts, "leafDark", 1)], n = Math.floor(w / .25);
		for (let i = 0; i < n; i++) {
			const x = w * (i + .5) / n, c = kind === "warm" || kind === "star" ? "butter" : [
				"butter",
				"coral",
				"mint",
				"sky",
				"pink"
			][i % 5];
			if (kind === "star") r.push(poly(starY(x, .08, sag(x) - .1, .07, .03), c));
			else r.push(ell(x, .08, sag(x) - .08, .05, .03, .07, c, { a: .95 }));
			r.push(ell(x, .09, sag(x) - .08, .06, .01, .08, c, {
				noLine: true,
				a: .25
			}));
		}
		return r;
	}
});
def$1({
	id: "pendantLamp",
	shadow: "none",
	cat: "light",
	name: {
		ko: "천장 조명",
		en: "Ceiling lamp"
	},
	place: "wall",
	defaults: {
		kind: "basic",
		c: "butter"
	},
	size: () => ({
		w: 1,
		d: .9,
		h: 1.6
	}),
	recipe(p) {
		const kind = str(p, "kind"), c = str(p, "c"), r = [box(.4, 0, 1.5, .6, .06, 1.6, "brass", { mat: "metal" }), line([
			[
				.5,
				.06,
				1.55
			],
			[
				.5,
				.5,
				1.55
			],
			[
				.5,
				.5,
				.8
			]
		], "charcoal", 1.2)];
		if (kind === "cloud") for (const [x, z, s] of [
			[
				.3,
				.55,
				.2
			],
			[
				.5,
				.62,
				.26
			],
			[
				.72,
				.55,
				.2
			],
			[
				.5,
				.48,
				.2
			]
		]) r.push(ell(x, .5, z, s, .2, s * .8, "white", { mat: "fabric" }));
		else if (kind === "sun") {
			r.push(ell(.5, .5, .55, .24, .24, .24, "butter"));
			for (let i = 0; i < 8; i++) {
				const a = i / 8 * Math.PI * 2;
				r.push(line([[
					.5 + Math.cos(a) * .28,
					.5,
					.55 + Math.sin(a) * .28
				], [
					.5 + Math.cos(a) * .4,
					.5,
					.55 + Math.sin(a) * .4
				]], "mustard", 3));
			}
		} else if (kind === "flower") {
			for (let i = 0; i < 5; i++) {
				const a = i / 5 * Math.PI * 2;
				r.push(ell(.5 + Math.cos(a) * .18, .5 + Math.sin(a) * .18, .55, .14, .14, .08, "pink"));
			}
			r.push(ell(.5, .5, .58, .1, .1, .08, "butter"));
		} else if (kind === "jellyfish") {
			r.push(ell(.5, .5, .65, .3, .3, .18, "lilac", { a: .85 }));
			for (let i = 0; i < 5; i++) r.push(line([
				[
					.3 + i * .1,
					.5,
					.5
				],
				[
					.28 + i * .1,
					.5,
					.3
				],
				[
					.32 + i * .1,
					.5,
					.15
				]
			], "lilac", 2));
		} else if (kind === "orbs") [
			"coral",
			"butter",
			"mint",
			"sky",
			"lilac"
		].forEach((cc, i) => {
			const x = .15 + i * .17, z = .35 + i % 2 * .2;
			r.push(line([[
				.5,
				.5,
				.8
			], [
				x,
				.5,
				z + .1
			]], "charcoal", .8), ell(x, .5, z, .08, .08, .08, cc, { a: .95 }));
		});
		else r.push(cyl(.5, .5, .35, .8, .38, .12, c, { mat: "fabric" }), ell(.5, .5, .36, .12, .12, .05, "sun", { noLine: true }));
		r.push(ell(.5, .5, .1, .3, .3, .06, "sun", {
			noLine: true,
			a: .3
		}));
		return r;
	}
});
def$1({
	id: "chandelier",
	shadow: "none",
	cat: "light",
	name: {
		ko: "샹들리에",
		en: "Chandelier"
	},
	place: "wall",
	defaults: {},
	size: () => ({
		w: 1.4,
		d: 1.4,
		h: 1.6
	}),
	recipe() {
		const r = [
			box(.6, 0, 1.5, .8, .06, 1.6, "brass", { mat: "metal" }),
			line([
				[
					.7,
					.06,
					1.55
				],
				[
					.7,
					.7,
					1.55
				],
				[
					.7,
					.7,
					.9
				]
			], "brass", 1.5),
			cyl(.7, .7, .45, .55, .5, .5, "brass", { mat: "metal" }),
			ell(.7, .7, .75, .12, .12, .2, "brass", { mat: "metal" })
		];
		for (let i = 0; i < 6; i++) {
			const a = i / 6 * Math.PI * 2, x = .7 + Math.cos(a) * .5, y = .7 + Math.sin(a) * .5;
			r.push(cyl(x, y, .55, .72, .035, .035, "white"), ell(x, y, .78, .035, .035, .06, "sun", { noLine: true }), ell(x, y, .38, .03, .03, .06, "glass", { a: .8 }));
		}
		return r;
	}
});
var heartPts = (cx, cy, s, z) => Array.from({ length: 36 }, (_, i) => {
	const t = i / 36 * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
	return [
		cx + x / 17 * s,
		cy - y / 17 * s,
		z
	];
});
def$1({
	id: "shapeRug",
	shadow: "none",
	cat: "rug",
	name: {
		ko: "모양 깔개",
		en: "Shaped rug"
	},
	place: "decal",
	defaults: {
		kind: "star",
		c: "butter",
		c2: "cream"
	},
	size: () => ({
		w: 2.4,
		d: 2.4,
		h: .05
	}),
	recipe(p) {
		const kind = str(p, "kind"), c = str(p, "c"), c2 = str(p, "c2");
		if (kind === "heart") return [
			poly(heartPts(1.2, 1.15, 1.15, .03), c, { mat: "knit" }),
			poly(heartPts(1.2, 1.15, .85, .031), c2, { noLine: true }),
			poly(heartPts(1.2, 1.15, .6, .032), c, { noLine: true })
		];
		if (kind === "cloud") return [...[
			[
				.7,
				1.3,
				.55
			],
			[
				1.25,
				1,
				.7
			],
			[
				1.75,
				1.35,
				.55
			],
			[
				1.2,
				1.55,
				.6
			]
		].map(([x, y, s]) => ell(x, y, .025, s, s * .8, .025, c, { mat: "knit" })), ell(1.2, 1.25, .045, .6, .4, .005, c2, { noLine: true })];
		if (kind === "flower") {
			const r = [];
			for (let i = 0; i < 6; i++) {
				const a = i / 6 * Math.PI * 2;
				r.push(ell(1.2 + Math.cos(a) * .62, 1.2 + Math.sin(a) * .62, .025, .5, .5, .025, c, { mat: "knit" }));
			}
			r.push(ell(1.2, 1.2, .03, .55, .55, .02, c2));
			return r;
		}
		if (kind === "paw") return [
			ell(1.2, 1.5, .025, .75, .65, .025, c, { mat: "knit" }),
			...[
				[.5, .6],
				[.95, .35],
				[1.45, .35],
				[1.9, .6]
			].map(([x, y]) => ell(x, y, .025, .28, .3, .025, c, { mat: "knit" })),
			ell(1.2, 1.5, .045, .45, .38, .005, c2, { noLine: true })
		];
		return [
			poly(starPts(1.2, 1.25, .03, 1.2, .55), c, { mat: "knit" }),
			poly(starPts(1.2, 1.25, .031, .85, .4), c2, { noLine: true }),
			disc("z", 1.2, 1.25, .032, .22, c, { noLine: true })
		];
	}
});
def$1({
	id: "bonsai",
	shadow: "round",
	cat: "plant",
	name: {
		ko: "분재",
		en: "Bonsai"
	},
	place: "surface",
	defaults: { pot: "navy" },
	size: () => ({
		w: .7,
		d: .5,
		h: .7
	}),
	recipe: (p) => [
		box(.05, .08, 0, .65, .42, .1, str(p, "pot"), { mat: "ceramic" }),
		box(.08, .11, .1, .62, .39, .11, "soil"),
		poly([
			[
				.3,
				.25,
				.1
			],
			[
				.36,
				.25,
				.1
			],
			[
				.3,
				.25,
				.3
			],
			[
				.45,
				.25,
				.45
			],
			[
				.4,
				.25,
				.48
			],
			[
				.25,
				.25,
				.32
			]
		], "walnut"),
		ell(.47, .25, .52, .17, .13, .07, "leafDark", { mat: "plant" }),
		ell(.22, .25, .42, .13, .1, .06, "leaf", { mat: "plant" }),
		ell(.36, .25, .62, .12, .1, .06, "leaf", { mat: "plant" })
	]
});
def$1({
	id: "palmPot",
	shadow: "round",
	cat: "plant",
	name: {
		ko: "야자 화분",
		en: "Palm in a pot"
	},
	place: "floor",
	defaults: { pot: "cream" },
	size: () => ({
		w: 1.4,
		d: 1.4,
		h: 2.8
	}),
	recipe(p) {
		const r = [cyl(.7, .7, 0, .6, .3, .36, str(p, "pot"), {
			mat: "ceramic",
			top: "soil"
		})];
		for (let i = 0; i < 5; i++) r.push(cyl(.7 + i * .02, .7, .6 + i * .36, .96 + i * .36, .09 - i * .008, .08 - i * .008, i % 2 ? "walnut" : "clay", { mat: "wood" }));
		const top = [
			.8,
			.7,
			2.45
		];
		for (let i = 0; i < 7; i++) {
			const a = i / 7 * Math.PI * 2, tip = [
				.7 + Math.cos(a) * .66,
				.7 + Math.sin(a) * .66,
				1.95 + i % 2 * .25
			], px = -Math.sin(a) * .14, py = Math.cos(a) * .14;
			const mid = [
				(top[0] + tip[0]) / 2,
				(top[1] + tip[1]) / 2,
				top[2] + .2
			];
			r.push(poly([
				top,
				[
					mid[0] + px,
					mid[1] + py,
					mid[2]
				],
				tip,
				[
					mid[0] - px,
					mid[1] - py,
					mid[2]
				]
			], i % 2 ? "leaf" : "leafDark", { mat: "plant" }));
		}
		return r;
	}
});
def$1({
	id: "bambooPot",
	shadow: "round",
	cat: "plant",
	name: {
		ko: "대나무 화분",
		en: "Bamboo in a pot"
	},
	place: "floor",
	defaults: { pot: "white" },
	size: () => ({
		w: .9,
		d: .9,
		h: 2.8
	}),
	recipe(p) {
		const r = [box(.12, .12, 0, .78, .78, .6, str(p, "pot"), { mat: "ceramic" }), box(.16, .16, .6, .74, .74, .61, "soil")];
		for (const [x, y, h] of [
			[
				.35,
				.4,
				2.7
			],
			[
				.55,
				.45,
				2.3
			],
			[
				.45,
				.6,
				2
			]
		]) {
			r.push(cyl(x, y, .6, h, .045, .045, "leafLight", { mat: "plant" }));
			for (let z = 1; z < h - .1; z += .45) r.push(cyl(x, y, z, z + .04, .055, .055, "stem"));
			r.push(ell(x + .16, y, h - .2, .16, .05, .04, "leaf", { mat: "plant" }), ell(x - .15, y + .05, h - .5, .16, .05, .04, "leafDark", { mat: "plant" }));
		}
		return r;
	}
});
def$1({
	id: "storageBin",
	cat: "box",
	name: {
		ko: "수납함",
		en: "Storage bin"
	},
	place: "floor",
	defaults: {
		c: "sky",
		k: 1
	},
	size: (p) => ({
		w: num$1(p, "k"),
		d: .7 * num$1(p, "k"),
		h: .7 * num$1(p, "k")
	}),
	recipe(p) {
		const k = num$1(p, "k"), c = str(p, "c");
		return [
			box(.05 * k, .05 * k, 0, .95 * k, .65 * k, .6 * k, "glass", { a: .75 }),
			box(.1 * k, .1 * k, .05 * k, .6 * k, .6 * k, .4 * k, "coral", { mat: "fabric" }),
			box(0, 0, .6 * k, k, .7 * k, .7 * k, c, { mat: "paint" })
		];
	}
});
function wear(r, w, a) {
	const [hx, hy, hz, hs] = a.head, [nx, ny, nz, ns] = a.neck, [bx, by, bz, brx, bry, brz] = a.body;
	switch (w) {
		case "partyHat":
			r.push(cyl(hx, hy, hz + hs * .8, hz + hs * 2, hs * .5, .01, "coral"), ell(hx, hy, hz + hs * 2, hs * .12, hs * .12, hs * .12, "butter"));
			break;
		case "bow":
			r.push(ell(hx - hs * .25, hy, hz + hs * .9, hs * .25, hs * .1, hs * .18, "pink"), ell(hx + hs * .25, hy, hz + hs * .9, hs * .25, hs * .1, hs * .18, "pink"), ell(hx, hy, hz + hs * .9, hs * .1, hs * .1, hs * .1, "rose"));
			break;
		case "topHat":
			r.push(cyl(hx, hy, hz + hs * .85, hz + hs * .9, hs * .6, hs * .6, "black"), cyl(hx, hy, hz + hs * .9, hz + hs * 1.6, hs * .38, hs * .38, "black"), cyl(hx, hy, hz + hs * .95, hz + hs * 1.05, hs * .39, hs * .39, "red"));
			break;
		case "flowers":
			for (let i = 0; i < 6; i++) {
				const t = i / 6 * Math.PI * 2;
				r.push(ell(hx + Math.cos(t) * hs * .6, hy + Math.sin(t) * hs * .6, hz + hs * .75, hs * .13, hs * .13, hs * .1, [
					"pink",
					"butter",
					"white"
				][i % 3]));
			}
			break;
		case "collar":
			r.push(cyl(nx, ny, nz - ns * .1, nz + ns * .1, ns, ns, "red"), ell(nx, ny + ns, nz - ns * .25, ns * .15, ns * .05, ns * .15, GOLD));
			break;
		case "bell":
			r.push(cyl(nx, ny, nz - ns * .1, nz + ns * .1, ns, ns, "blue"), ell(nx, ny + ns, nz - ns * .3, ns * .2, ns * .2, ns * .2, GOLD, { mat: "metal" }));
			break;
		case "scarf":
			r.push(cyl(nx, ny, nz - ns * .2, nz + ns * .2, ns * 1.05, ns * 1.05, "teal", { mat: "knit" }), box(nx + ns * .3, ny + ns * .7, nz - ns * 1.1, nx + ns * .6, ny + ns * 1, nz, "teal", { mat: "knit" }));
			break;
		case "bowTie":
			r.push(poly([
				[
					nx,
					ny + ns,
					nz
				],
				[
					nx - ns * .5,
					ny + ns,
					nz + ns * .25
				],
				[
					nx - ns * .5,
					ny + ns,
					nz - ns * .25
				]
			], "red"), poly([
				[
					nx,
					ny + ns,
					nz
				],
				[
					nx + ns * .5,
					ny + ns,
					nz + ns * .25
				],
				[
					nx + ns * .5,
					ny + ns,
					nz - ns * .25
				]
			], "red"));
			break;
		case "sweater":
			r.push(ell(bx, by, bz, brx * 1.04, bry * 1.04, brz * .8, "coral", { mat: "knit" }), ell(bx, by, bz, brx * 1.05, bry * 1.05, brz * .15, "white", { mat: "knit" }));
			break;
		case "raincoat":
			r.push(ell(bx, by, bz + brz * .1, brx * 1.06, bry * 1.06, brz * .85, "butter", { mat: "paint" }));
			break;
		case "cape":
			r.push(poly([
				[
					bx - brx,
					by - bry * .8,
					bz + brz * .8
				],
				[
					bx + brx,
					by - bry * .8,
					bz + brz * .8
				],
				[
					bx + brx * 1.1,
					by - bry * 1,
					Math.max(.02, bz - brz * .9)
				],
				[
					bx - brx * 1.1,
					by - bry * 1,
					Math.max(.02, bz - brz * .9)
				]
			], "red"));
			break;
		case "boots":
		case "sneakers": for (const [fx, fy] of a.feet) r.push(ell(fx, fy, .05, .07, .07, .05, w === "boots" ? "butter" : "blue", { mat: "paint" }));
	}
}
function pet(id, ko, en, c0, size, place, draw, anchor) {
	def$1({
		id,
		shadow: "round",
		cat: "pet",
		name: {
			ko,
			en
		},
		place,
		defaults: {
			c: c0,
			...anchor ? { wear: "none" } : {}
		},
		size: () => ({
			w: size[0],
			d: size[1],
			h: size[2]
		}),
		recipe(p) {
			const r = draw(str(p, "c"));
			if (anchor) wear(r, str(p, "wear"), anchor);
			return r;
		}
	});
}
pet("petCat", "고양이", "Cat", "mustard", [
	.8,
	.7,
	1.05
], "floor", (c) => [
	ell(.4, .3, .2, .24, .22, .2, c, { mat: "fur" }),
	ell(.4, .38, .52, .18, .16, .16, c, { mat: "fur" }),
	poly([
		[
			.26,
			.38,
			.62
		],
		[
			.33,
			.38,
			.62
		],
		[
			.27,
			.38,
			.78
		]
	], c),
	poly([
		[
			.47,
			.38,
			.62
		],
		[
			.54,
			.38,
			.62
		],
		[
			.53,
			.38,
			.78
		]
	], c),
	...eyes(.4, .53, .55),
	ell(.4, .54, .49, .02, .01, .015, "pink", { noLine: true }),
	ell(.3, .48, .06, .06, .08, .05, c, { mat: "fur" }),
	ell(.5, .48, .06, .06, .08, .05, c, { mat: "fur" }),
	line([
		[
			.6,
			.2,
			.1
		],
		[
			.72,
			.25,
			.2
		],
		[
			.74,
			.35,
			.38
		]
	], c, 4)
], {
	head: [
		.4,
		.38,
		.52,
		.17
	],
	neck: [
		.4,
		.36,
		.38,
		.13
	],
	body: [
		.4,
		.3,
		.2,
		.24,
		.22,
		.2
	],
	feet: [[.3, .48], [.5, .48]]
});
pet("petDog", "강아지", "Puppy", "cream", [
	.9,
	.8,
	1.15
], "floor", (c) => [
	ell(.45, .32, .25, .26, .25, .23, c, { mat: "fur" }),
	ell(.45, .42, .6, .2, .18, .18, c, { mat: "fur" }),
	ell(.25, .42, .55, .06, .05, .15, "walnut", { mat: "fur" }),
	ell(.65, .42, .55, .06, .05, .15, "walnut", { mat: "fur" }),
	ell(.45, .58, .54, .08, .05, .06, "white"),
	ell(.45, .62, .57, .03, .01, .02, "nose", { noLine: true }),
	...eyes(.45, .58, .65, .07),
	ell(.33, .55, .07, .07, .09, .06, c, { mat: "fur" }),
	ell(.57, .55, .07, .07, .09, .06, c, { mat: "fur" })
], {
	head: [
		.45,
		.42,
		.6,
		.19
	],
	neck: [
		.45,
		.4,
		.44,
		.15
	],
	body: [
		.45,
		.32,
		.25,
		.26,
		.25,
		.23
	],
	feet: [[.33, .55], [.57, .55]]
});
pet("petBunny", "토끼", "Bunny", "white", [
	.7,
	.7,
	1.15
], "floor", (c) => [
	ell(.35, .3, .2, .22, .24, .2, c, { mat: "fur" }),
	ell(.35, .42, .48, .15, .14, .14, c, { mat: "fur" }),
	ell(.29, .4, .72, .04, .03, .14, c, { mat: "fur" }),
	ell(.41, .4, .72, .04, .03, .14, c, { mat: "fur" }),
	ell(.29, .42, .72, .02, .01, .1, "pink", { noLine: true }),
	ell(.41, .42, .72, .02, .01, .1, "pink", { noLine: true }),
	...eyes(.35, .55, .5, .05),
	ell(.35, .56, .45, .02, .01, .015, "pink", { noLine: true }),
	ell(.35, .07, .18, .07, .05, .07, "white", { mat: "fur" })
], {
	head: [
		.35,
		.42,
		.5,
		.14
	],
	neck: [
		.35,
		.38,
		.36,
		.12
	],
	body: [
		.35,
		.3,
		.2,
		.22,
		.24,
		.2
	],
	feet: [[.25, .5], [.45, .5]]
});
pet("petFish", "금붕어 어항", "Goldfish bowl", "sky", [
	.6,
	.6,
	.6
], "surface", (c) => [
	cyl(.3, .3, 0, .05, .18, .18, c),
	ell(.3, .3, .3, .29, .29, .26, "glass", { a: .45 }),
	ell(.3, .3, .25, .25, .25, .16, "water", {
		a: .55,
		noLine: true
	}),
	ell(.33, .35, .3, .08, .04, .05, "#f08a3c"),
	poly([
		[
			.24,
			.35,
			.3
		],
		[
			.17,
			.35,
			.36
		],
		[
			.17,
			.35,
			.24
		]
	], "#f08a3c"),
	ell(.22, .28, .08, .06, .06, .03, "leaf", { noLine: true })
], null);
pet("petTurtle", "거북이", "Turtle", "green", [
	.85,
	.6,
	.6
], "floor", (c) => [
	ell(.38, .3, .15, .3, .25, .15, "olive", { mat: "paint" }),
	ell(.38, .3, .2, .24, .2, .12, c),
	...[
		[.3, .25],
		[.46, .25],
		[.38, .38]
	].map(([x, y]) => ell(x, y, .3, .06, .06, .02, "olive", { noLine: true })),
	ell(.72, .32, .2, .1, .09, .09, "leafLight"),
	...eyes(.76, .4, .24, .04),
	...[
		[.15, .12],
		[.6, .12],
		[.15, .5],
		[.6, .5]
	].map(([x, y]) => ell(x, y, .05, .07, .07, .05, "leafLight"))
], {
	head: [
		.72,
		.32,
		.2,
		.09
	],
	neck: [
		.62,
		.32,
		.18,
		.08
	],
	body: [
		.38,
		.3,
		.15,
		.3,
		.25,
		.15
	],
	feet: [[.15, .5], [.6, .5]]
});
pet("petParrot", "앵무새", "Parrot", "green", [
	.6,
	.6,
	1.4
], "floor", (c) => [
	cyl(.3, .3, 0, .05, .22, .22, "walnut"),
	cyl(.3, .3, .05, .55, .03, .03, "walnut"),
	box(.08, .27, .55, .52, .33, .59, "walnut"),
	ell(.3, .3, .77, .13, .12, .2, c),
	ell(.3, .33, 1.02, .11, .1, .1, c),
	poly([
		[
			.3,
			.42,
			1
		],
		[
			.34,
			.46,
			.94
		],
		[
			.26,
			.46,
			.94
		]
	], "mustard"),
	...eyes(.3, .42, 1.05, .05),
	poly([
		[
			.24,
			.22,
			.65
		],
		[
			.36,
			.22,
			.65
		],
		[
			.3,
			.12,
			.6
		]
	], "blue"),
	ell(.3, .35, .75, .08, .03, .12, "red", { noLine: true })
], {
	head: [
		.3,
		.33,
		1.02,
		.1
	],
	neck: [
		.3,
		.32,
		.9,
		.09
	],
	body: [
		.3,
		.3,
		.77,
		.13,
		.12,
		.2
	],
	feet: [[.25, .33], [.35, .33]]
});
pet("petHedgehog", "고슴도치", "Hedgehog", "walnut", [
	.75,
	.55,
	.75
], "floor", (c) => {
	const r = [ell(.35, .27, .18, .28, .22, .18, c, { mat: "fur" })];
	for (let i = 0; i < 10; i++) {
		const a = i / 10 * Math.PI;
		r.push(poly([
			[
				.35 + Math.cos(a) * .24,
				.24,
				.18 + Math.sin(a) * .15
			],
			[
				.35 + Math.cos(a) * .32,
				.24,
				.18 + Math.sin(a) * .24
			],
			[
				.35 + Math.cos(a + .2) * .24,
				.24,
				.18 + Math.sin(a + .2) * .15
			]
		], "choc"));
	}
	r.push(ell(.6, .35, .15, .09, .09, .08, "clay"), ell(.68, .38, .14, .02, .02, .02, "nose", { noLine: true }), ...eyes(.6, .43, .2, .04));
	return r;
}, {
	head: [
		.6,
		.35,
		.16,
		.08
	],
	neck: [
		.52,
		.32,
		.15,
		.08
	],
	body: [
		.35,
		.27,
		.18,
		.28,
		.22,
		.18
	],
	feet: [[.25, .45], [.5, .45]]
});
pet("petDuckling", "아기 오리", "Duckling", "butter", [
	.5,
	.55,
	.8
], "floor", (c) => [
	ell(.25, .25, .15, .18, .16, .14, c, { mat: "fur" }),
	ell(.25, .3, .38, .12, .11, .11, c, { mat: "fur" }),
	poly([
		[
			.2,
			.42,
			.36
		],
		[
			.3,
			.42,
			.36
		],
		[
			.25,
			.5,
			.33
		]
	], "mustard"),
	...eyes(.25, .4, .42, .05),
	ell(.12, .25, .18, .04, .1, .06, c),
	ell(.38, .25, .18, .04, .1, .06, c)
], {
	head: [
		.25,
		.3,
		.38,
		.11
	],
	neck: [
		.25,
		.28,
		.27,
		.09
	],
	body: [
		.25,
		.25,
		.15,
		.18,
		.16,
		.14
	],
	feet: [[.18, .38], [.32, .38]]
});
pet("petFrog", "개구리", "Frog", "green", [
	.6,
	.55,
	.65
], "floor", (c) => [
	ell(.3, .27, .13, .22, .2, .13, c),
	ell(.18, .32, .3, .08, .07, .07, c),
	ell(.42, .32, .3, .08, .07, .07, c),
	ell(.18, .37, .31, .03, .02, .03, "eye", { noLine: true }),
	ell(.42, .37, .31, .03, .02, .03, "eye", { noLine: true }),
	line([
		[
			.2,
			.46,
			.15
		],
		[
			.3,
			.47,
			.13
		],
		[
			.4,
			.46,
			.15
		]
	], "rose", 2),
	ell(.1, .42, .04, .08, .06, .04, c),
	ell(.5, .42, .04, .08, .06, .04, c)
], {
	head: [
		.3,
		.32,
		.25,
		.12
	],
	neck: [
		.3,
		.3,
		.2,
		.11
	],
	body: [
		.3,
		.27,
		.13,
		.22,
		.2,
		.13
	],
	feet: [[.1, .42], [.5, .42]]
});
pet("petJoey", "아기 캥거루", "Baby kangaroo", "terracotta", [
	.8,
	.7,
	1.3
], "floor", (c) => [
	ell(.4, .3, .35, .2, .18, .3, c, { mat: "fur" }),
	ell(.4, .38, .8, .13, .12, .13, c, { mat: "fur" }),
	ell(.33, .36, 1, .04, .03, .09, c),
	ell(.47, .36, 1, .04, .03, .09, c),
	ell(.4, .49, .76, .05, .03, .04, "clay"),
	...eyes(.4, .49, .84, .05),
	ell(.4, .45, .3, .12, .04, .12, "clay", { noLine: true }),
	line([
		[
			.25,
			.15,
			.15
		],
		[
			.1,
			.05,
			.05
		],
		[
			.05,
			.05,
			.03
		]
	], c, 6),
	ell(.32, .5, .04, .06, .14, .04, c),
	ell(.48, .5, .04, .06, .14, .04, c)
], {
	head: [
		.4,
		.38,
		.8,
		.12
	],
	neck: [
		.4,
		.36,
		.66,
		.1
	],
	body: [
		.4,
		.3,
		.35,
		.2,
		.18,
		.3
	],
	feet: [[.32, .5], [.48, .5]]
});
def$1({
	id: "swing",
	cat: "outdoor",
	name: {
		ko: "그네",
		en: "Swing"
	},
	place: "outdoor",
	defaults: { c: "coral" },
	size: () => ({
		w: 3,
		d: 1.6,
		h: 3
	}),
	recipe(p) {
		const r = [];
		for (const x of [.1, 2.75]) r.push(poly([
			[
				x,
				.1,
				0
			],
			[
				x + .15,
				.1,
				0
			],
			[
				x + .15,
				.8,
				3
			],
			[
				x,
				.8,
				3
			]
		], "walnut"), poly([
			[
				x,
				1.5,
				0
			],
			[
				x + .15,
				1.5,
				0
			],
			[
				x + .15,
				.8,
				3
			],
			[
				x,
				.8,
				3
			]
		], "walnut"));
		r.push(box(.1, .72, 2.85, 2.9, .88, 3, "walnut", { mat: "wood" }));
		for (const x of [1, 1.9]) r.push(line([[
			x,
			.8,
			2.85
		], [
			x,
			.8,
			.75
		]], "choc", 1.2), line([[
			x + .1,
			.8,
			2.85
		], [
			x + .1,
			.8,
			.75
		]], "choc", 1.2));
		r.push(box(.95, .6, .65, 2.05, 1, .75, str(p, "c"), { mat: "paint" }));
		return r;
	}
});
def$1({
	id: "pond",
	shadow: "none",
	cat: "outdoor",
	name: {
		ko: "연못",
		en: "Pond"
	},
	place: "outdoor",
	defaults: {},
	size: () => ({
		w: 3.2,
		d: 2.4,
		h: .35
	}),
	recipe() {
		const R = rng(3), r = [ell(1.6, 1.2, .05, 1.3, .95, .05, "water"), ell(1.55, 1.15, .08, 1, .7, .02, "#7ab8d6", { noLine: true })];
		for (let i = 0; i < 14; i++) {
			const a = i / 14 * Math.PI * 2;
			r.push(ell(1.6 + Math.cos(a) * 1.35, 1.2 + Math.sin(a) * .98, .13, .18 + R() * .06, .14, .12, i % 3 ? "grey" : "slate", { mat: "paint" }));
		}
		r.push(ell(1.2, 1, .11, .25, .2, .01, "leaf", { noLine: true }), ell(1.9, 1.4, .11, .2, .16, .01, "leafLight", { noLine: true }), ell(1.25, 1, .13, .06, .06, .03, "pink", { noLine: true }));
		return r;
	}
});
def$1({
	id: "doghouse",
	cat: "outdoor",
	name: {
		ko: "강아지 집",
		en: "Dog kennel"
	},
	place: "outdoor",
	defaults: {
		c: "sky",
		roof: "coral"
	},
	size: () => ({
		w: 1.6,
		d: 1.6,
		h: 1.9
	}),
	recipe(p) {
		const c = str(p, "c"), roof = str(p, "roof");
		return [
			box(.1, .1, 0, 1.5, 1.5, 1.1, c, { mat: "wood" }),
			poly([
				[
					0,
					0,
					1.05
				],
				[
					1.6,
					0,
					1.05
				],
				[
					1.6,
					.8,
					1.9
				],
				[
					0,
					.8,
					1.9
				]
			], roof),
			poly([
				[
					0,
					.8,
					1.9
				],
				[
					1.6,
					.8,
					1.9
				],
				[
					1.6,
					1.6,
					1.05
				],
				[
					0,
					1.6,
					1.05
				]
			], roof),
			poly([
				[
					1.5,
					.1,
					1.1
				],
				[
					1.5,
					1.5,
					1.1
				],
				[
					1.5,
					.8,
					1.8
				]
			], c),
			poly([
				[
					.55,
					1.501,
					0
				],
				[
					1.05,
					1.501,
					0
				],
				[
					1.05,
					1.501,
					.6
				],
				[
					.95,
					1.501,
					.75
				],
				[
					.8,
					1.501,
					.8
				],
				[
					.65,
					1.501,
					.75
				],
				[
					.55,
					1.501,
					.6
				]
			], "#4a3a30"),
			dotY(.8, 1.502, .95, .08, "butter")
		];
	}
});
def$1({
	id: "sandbox",
	cat: "outdoor",
	name: {
		ko: "모래놀이터",
		en: "Sandpit"
	},
	place: "outdoor",
	defaults: { c: "coral" },
	size: () => ({
		w: 2.4,
		d: 2.4,
		h: .7
	}),
	recipe(p) {
		const c = str(p, "c");
		return [
			box(0, 0, 0, 2.4, .15, .4, c, { mat: "wood" }),
			box(0, 2.25, 0, 2.4, 2.4, .4, c, { mat: "wood" }),
			box(0, .15, 0, .15, 2.25, .4, c, { mat: "wood" }),
			box(2.25, .15, 0, 2.4, 2.25, .4, c, { mat: "wood" }),
			box(.15, .15, 0, 2.25, 2.25, .3, "sand"),
			ell(.9, 1, .35, .35, .3, .15, "sand"),
			cyl(1.6, 1.5, .3, .55, .15, .18, "sky", { mat: "paint" }),
			line([[
				1.8,
				.8,
				.32
			], [
				2,
				.6,
				.65
			]], "butter", 3)
		];
	}
});
def$1({
	id: "snowman",
	shadow: "round",
	cat: "outdoor",
	name: {
		ko: "눈사람",
		en: "Snowman"
	},
	place: "outdoor",
	defaults: {},
	size: () => ({
		w: 1.2,
		d: 1.2,
		h: 2.4
	}),
	recipe: () => [
		ell(.6, .6, .45, .5, .5, .45, "white"),
		ell(.6, .6, 1.2, .36, .36, .34, "white"),
		ell(.6, .6, 1.75, .26, .26, .25, "white"),
		cyl(.6, .6, 1.95, 2, .28, .28, "black"),
		cyl(.6, .6, 2, 2.4, .18, .18, "black"),
		poly([
			[
				.6,
				.85,
				1.78
			],
			[
				.6,
				1.1,
				1.74
			],
			[
				.6,
				.85,
				1.72
			]
		], "coral"),
		...eyes(.6, .85, 1.85, .08),
		cyl(.6, .6, 1.45, 1.55, .3, .3, "red", { mat: "knit" })
	]
});
def$1({
	id: "rock",
	shadow: "round",
	cat: "outdoor",
	name: {
		ko: "바위",
		en: "Rock"
	},
	place: "outdoor",
	defaults: { c: "grey" },
	size: () => ({
		w: 1.4,
		d: 1.1,
		h: .8
	}),
	recipe: (p) => [
		ell(.65, .55, .35, .55, .45, .35, str(p, "c"), { mat: "paint" }),
		ell(1.05, .65, .2, .3, .25, .2, "slate", { mat: "paint" }),
		ell(.5, .75, .62, .15, .1, .05, "leafLight", { noLine: true })
	]
});
def$1({
	id: "steppingStones",
	shadow: "none",
	cat: "outdoor",
	name: {
		ko: "징검다리 돌",
		en: "Stepping stones"
	},
	place: "outdoor",
	defaults: { c: "paving" },
	size: () => ({
		w: 1,
		d: 3,
		h: .1
	}),
	recipe: (p) => [
		.4,
		1.2,
		2.1,
		2.7
	].map((y, i) => ell(.5 + (i % 2 ? .1 : -.1), y, .04, .32, .26, .04, str(p, "c"), { mat: "paint" }))
});
def$1({
	id: "gate",
	cat: "outdoor",
	name: {
		ko: "대문",
		en: "Garden gate"
	},
	place: "outdoor",
	defaults: { c: "white" },
	size: () => ({
		w: 2.2,
		d: .4,
		h: 2
	}),
	recipe(p) {
		const c = str(p, "c"), r = [box(0, .1, 0, .25, .35, 2, c, { mat: "paint" }), box(1.95, .1, 0, 2.2, .35, 2, c, { mat: "paint" })];
		for (let x = .4; x < 1.9; x += .25) r.push(box(x, .18, .15, x + .12, .26, 1.5, c, { mat: "paint" }));
		r.push(box(.25, .18, .4, 1.95, .26, .5, c), box(.25, .18, 1.2, 1.95, .26, 1.3, c), ell(1.1, .27, .85, .06, .02, .06, "brass", { noLine: true }));
		return r;
	}
});
def$1({
	id: "car",
	cat: "outdoor",
	name: {
		ko: "자동차",
		en: "Car"
	},
	place: "outdoor",
	defaults: {
		kind: "compact",
		c: "red"
	},
	size: () => ({
		w: 3.4,
		d: 1.8,
		h: 1.6
	}),
	recipe(p) {
		const k = str(p, "kind"), c = str(p, "c"), long = k === "sedan" || k === "sport", ute = k === "ute";
		const r = [box(.1, .25, .25, 3.3, 1.55, .85, c, { mat: "paint" })];
		const cab = ute ? [.8, 2] : long ? [.8, 2.6] : [.9, 2.3], top = k === "sport" ? 1.3 : 1.5;
		r.push(box(cab[0], .3, .85, cab[1], 1.5, top, c, { mat: "paint" }), poly([
			[
				cab[0] + .08,
				1.501,
				.92
			],
			[
				cab[1] - .08,
				1.501,
				.92
			],
			[
				cab[1] - .08,
				1.501,
				top - .08
			],
			[
				cab[0] + .08,
				1.501,
				top - .08
			]
		], "glass", { noLine: true }));
		if (ute) r.push(box(2.1, .25, .85, 3.25, .35, 1.1, c), box(2.1, 1.45, .85, 3.25, 1.55, 1.1, c), box(3.15, .25, .85, 3.25, 1.55, 1.1, c));
		for (const [x, y] of [
			[.75, .25],
			[2.65, .25],
			[.75, 1.55],
			[2.65, 1.55]
		]) r.push(cyl(x, y, 0, .5, .25, .25, "charcoal"));
		r.push(dotY(3.15, 1.551, .6, .08, "butter"), dotY(.3, 1.551, .6, .08, "red"));
		return r;
	}
});
def$1({
	id: "meadowPatch",
	shadow: "none",
	cat: "outdoor",
	name: {
		ko: "꽃 들판 깔개",
		en: "Wildflower patch"
	},
	place: "outdoor",
	defaults: {},
	size: () => ({
		w: 3,
		d: 3,
		h: .2
	}),
	recipe() {
		const R = rng(11), r = [ell(1.5, 1.5, .02, 1.45, 1.45, .02, "lawn", { noLine: true })];
		for (let i = 0; i < 26; i++) {
			const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 1.25, x = 1.5 + Math.cos(a) * d, y = 1.5 + Math.sin(a) * d;
			r.push(cyl(x, y, .02, .12, .01, .01, "stem"), ell(x, y, .14, .06, .06, .03, [
				"butter",
				"pink",
				"white",
				"lilac",
				"coral"
			][i % 5], { noLine: true }));
		}
		return r;
	}
});
def$1({
	id: "snowPatch",
	shadow: "none",
	cat: "outdoor",
	name: {
		ko: "눈 덮인 마당 장식",
		en: "Snowy patch"
	},
	place: "outdoor",
	defaults: {},
	size: () => ({
		w: 3,
		d: 3,
		h: .8
	}),
	recipe() {
		const r = [ell(1.5, 1.5, .03, 1.45, 1.4, .03, "white", { noLine: true })];
		for (const [x, y, s] of [
			[
				.7,
				.8,
				.35
			],
			[
				2.2,
				1.1,
				.28
			],
			[
				1.4,
				2.2,
				.32
			]
		]) r.push(ell(x, y, .13, s, s * .8, s * .35, "white"));
		r.push(ell(2.2, 2.2, .25, .22, .22, .22, "white"), ell(2.2, 2.2, .55, .15, .15, .15, "white"), ell(2.2, 2.33, .55, .03, .06, .02, "coral", { noLine: true }));
		return r;
	}
});
def$1({
	id: "asmrBox",
	cat: "toy",
	name: {
		ko: "ASMR 상자",
		en: "ASMR Box"
	},
	place: "floor",
	defaults: { open: "no" },
	size: () => ({
		w: 1.1,
		d: .85,
		h: 1.35
	}),
	recipe(p) {
		const open = str(p, "open") === "yes", r = [box(.05, .1, 0, 1.05, .8, .65, "lilac", { mat: "paint" })];
		for (const [x, y] of [
			[.05, .1],
			[.93, .1],
			[.05, .68],
			[.93, .68]
		]) r.push(box(x, y, 0, x + .12, y + .12, .7, "mustard", { mat: "paint" }));
		for (let i = 0; i < 3; i++) r.push(line(Array.from({ length: 9 }, (_, k) => {
			const t = -.9 + k / 8 * 1.8;
			return [
				.55 + Math.sin(t) * (.1 + i * .07),
				.801,
				.33 + Math.cos(t) * (.1 + i * .07)
			];
		}), i === 1 ? "white" : "butter", 2.5));
		r.push(dotY(.55, .802, .33, .06, "butter"), box(.48, .79, .52, .62, .83, .65, "pink"));
		if (open) {
			r.push(box(.15, .2, .6, .95, .7, .66, "plum", { noLine: true }));
			r.push(poly([
				[
					.05,
					.1,
					.65
				],
				[
					1.05,
					.1,
					.65
				],
				[
					1.05,
					0,
					1.35
				],
				[
					.05,
					0,
					1.35
				]
			], "pink"), poly([
				[
					.05,
					.12,
					.65
				],
				[
					1.05,
					.12,
					.65
				],
				[
					1.05,
					.02,
					1.35
				],
				[
					.05,
					.02,
					1.35
				]
			], "rose", { noLine: true }));
		} else {
			for (let k = 0; k < 6; k++) {
				const t0 = k / 6 * Math.PI, t1 = (k + 1) / 6 * Math.PI;
				r.push(poly([
					[
						.05,
						.45 - Math.cos(t0) * .35,
						.65 + Math.sin(t0) * .32
					],
					[
						1.05,
						.45 - Math.cos(t0) * .35,
						.65 + Math.sin(t0) * .32
					],
					[
						1.05,
						.45 - Math.cos(t1) * .35,
						.65 + Math.sin(t1) * .32
					],
					[
						.05,
						.45 - Math.cos(t1) * .35,
						.65 + Math.sin(t1) * .32
					]
				], "pink"));
			}
			r.push(poly(Array.from({ length: 13 }, (_, k) => {
				const t = k / 12 * Math.PI;
				return [
					1.05,
					.45 - Math.cos(t) * .35,
					.65 + Math.sin(t) * .32
				];
			}), "pink"));
			r.push(ell(.55, .45, 1, .1, .03, .06, "mint", { noLine: true }));
		}
		return r;
	}
});
def$1({
	id: "asmrToy",
	shadow: "round",
	cat: "toy",
	name: {
		ko: "ASMR 장난감",
		en: "ASMR toy"
	},
	place: "surface",
	defaults: { kind: "mochiSquish" },
	size: () => ({
		w: .6,
		d: .6,
		h: .6
	}),
	recipe(p) {
		const face = (x, y, z) => [
			...eyes(x, y, z, .07),
			ell(x - .12, y, z - .04, .04, .01, .025, "cheek", { noLine: true }),
			ell(x + .12, y, z - .04, .04, .01, .025, "cheek", { noLine: true })
		];
		switch (str(p, "kind")) {
			case "mochiSquish": return [ell(.3, .3, .17, .27, .26, .17, "pink"), ...face(.3, .55, .2)];
			case "slimeSquish": return [
				cyl(.3, .3, 0, .28, .2, .23, "glass", { a: .6 }),
				ell(.3, .3, .32, .22, .22, .12, "lilac"),
				ell(.36, .38, .44, .06, .06, .08, "lilac"),
				ell(.2, .4, .42, .02, .02, .02, "white", { noLine: true }),
				ell(.38, .22, .42, .02, .02, .02, "white", { noLine: true })
			];
			case "tofuSquish": return [box(.08, .08, 0, .52, .52, .36, "cream", { mat: "paint" }), ...face(.3, .521, .22)];
			case "jellySquish": return [
				box(.1, .1, 0, .5, .5, .4, "sky", { a: .75 }),
				...face(.3, .501, .24),
				ell(.2, .25, .4, .05, .05, .005, "white", {
					noLine: true,
					a: .7
				})
			];
			case "clickPen": return [
				box(.05, .25, .04, .55, .35, .12, "blue", { mat: "paint" }),
				box(0, .27, .06, .06, .33, .1, "steel"),
				box(.5, .27, .06, .6, .33, .1, "red"),
				box(.3, .34, .12, .45, .36, .14, "steel")
			];
			case "keySwitch": return [
				box(.1, .1, 0, .5, .5, .12, "charcoal"),
				box(.15, .15, .12, .45, .45, .3, "lilac", { mat: "paint" }),
				cyl(.3, .3, .3, .33, .12, .12, "white")
			];
			case "fidgetCube": return [
				box(.1, .1, 0, .5, .5, .4, "mint", { mat: "paint" }),
				dotY(.2, .501, .3, .05, "coral"),
				dotY(.4, .501, .3, .05, "butter"),
				dotY(.3, .501, .12, .06, "lilac"),
				cyl(.3, .3, .4, .44, .1, .1, "sky"),
				box(.5, .2, .15, .51, .4, .25, "coral")
			];
			case "clickerBtn": return [cyl(.3, .3, 0, .14, .24, .26, "slate", { mat: "metal" }), ell(.3, .3, .16, .18, .18, .12, "red")];
			case "bubbleWrap": {
				const r = [box(.03, .03, 0, .57, .57, .02, "glass", { a: .7 })];
				for (let x = .1; x < .55; x += .12) for (let y = .1; y < .55; y += .12) r.push(ell(x, y, .04, .045, .045, .03, "white", { a: .85 }));
				return r;
			}
			case "pushPop": {
				const r = [];
				[
					"coral",
					"mustard",
					"butter",
					"mint",
					"sky",
					"lilac"
				].forEach((c, i) => r.push(box(.05, .05 + i * .083, 0, .55, .13 + i * .083, .06, c)));
				for (let x = .12; x < .55; x += .13) for (let y = .1; y < .55; y += .13) r.push(disc("z", x, y, .061, .04, "white", {
					a: .4,
					noLine: true
				}));
				return r;
			}
			case "popBoba": {
				const r = [cyl(.3, .3, 0, .4, .18, .22, "glass", { a: .55 })];
				for (let i = 0; i < 9; i++) r.push(ell(.22 + i % 3 * .08, .24 + Math.floor(i / 3) * .06, .06 + Math.floor(i / 3) * .1, .045, .045, .045, [
					"coral",
					"butter",
					"pink"
				][i % 3]));
				return r;
			}
			case "waterBeads": {
				const r = [cyl(.3, .3, 0, .15, .2, .27, "white", { mat: "ceramic" })];
				for (let i = 0; i < 10; i++) r.push(ell(.18 + i % 4 * .08, .2 + Math.floor(i / 4) * .09, .17, .045, .045, .04, [
					"sky",
					"pink",
					"mint",
					"lilac",
					"butter"
				][i % 5], { a: .85 }));
				return r;
			}
			case "kineticSand": return [
				box(.03, .03, 0, .57, .57, .08, "sky", { mat: "paint" }),
				ell(.3, .3, .1, .22, .2, .12, "sand"),
				poly([
					[
						.3,
						.1,
						.1
					],
					[
						.32,
						.1,
						.1
					],
					[
						.32,
						.5,
						.18
					],
					[
						.3,
						.5,
						.18
					]
				], "terracotta", { noLine: true })
			];
			case "soapCut": return [
				box(.1, .15, 0, .5, .45, .2, "mint", { mat: "paint" }),
				box(.1, .15, .2, .5, .45, .24, "pink", { mat: "paint" }),
				...[
					.2,
					.3,
					.4
				].map((x) => line([
					[
						x,
						.15,
						.24
					],
					[
						x,
						.451,
						.24
					],
					[
						x,
						.451,
						.05
					]
				], "white", 1))
			];
			case "iceCrunch": return [
				box(.08, .1, 0, .32, .34, .22, "glass", { a: .7 }),
				box(.3, .25, 0, .52, .47, .2, "glass", { a: .7 }),
				box(.18, .2, .22, .4, .42, .42, "glass", { a: .75 })
			];
			case "scratchPad": {
				const r = [box(.05, .05, 0, .55, .55, .03, "black")];
				[
					"coral",
					"butter",
					"mint",
					"sky"
				].forEach((c, i) => r.push(line([
					[
						.12,
						.15 + i * .1,
						.031
					],
					[
						.3,
						.2 + i * .1,
						.031
					],
					[
						.48,
						.13 + i * .1,
						.031
					]
				], c, 2)));
				return r;
			}
		}
		return [];
	}
});
// src/data/templates.ts
var T = [];
var def = (t) => {
	T.push(t);
};
def({
	id: "sofa",
	cat: "seat",
	name: {
		ko: "소파",
		en: "Sofa"
	},
	place: "floor",
	defaults: {
		len: 3,
		c: "mint",
		leg: "walnut"
	},
	size: (p) => ({
		w: num$1(p, "len"),
		d: 1.4,
		h: 1.8
	}),
	recipe(p) {
		const w = num$1(p, "len"), c = str(p, "c"), leg = str(p, "leg");
		const r = [
			box(.1, .15, 0, .24, .29, .15, leg, { mat: "wood" }),
			box(w - .24, .15, 0, w - .1, .29, .15, leg, { mat: "wood" }),
			box(.1, 1.15, 0, .24, 1.29, .15, leg, { mat: "wood" }),
			box(w - .24, 1.15, 0, w - .1, 1.29, .15, leg, { mat: "wood" }),
			box(0, .05, .15, w, 1.4, .6, c, { mat: "fabric" }),
			box(0, 0, .6, w, .45, 1.8, c, { mat: "fabric" }),
			box(0, .45, .6, .35, 1.4, 1.25, c, { mat: "fabric" }),
			box(w - .35, .45, .6, w, 1.4, 1.25, c, { mat: "fabric" })
		];
		const inner = w - .7, n = inner > 1.6 ? 2 : 1, cw = inner / n;
		for (let i = 0; i < n; i++) r.push(box(.35 + i * cw + .02, .47, .6, .35 + (i + 1) * cw - .02, 1.38, .9, c, { mat: "fabric" }));
		return r;
	},
	surfaces: (p) => [{
		id: "seat",
		x: .35,
		y: .45,
		w: num$1(p, "len") - .7,
		d: .93,
		z: .9,
		maxH: 1.2,
		cell: .1
	}],
	seats: (p) => {
		const w = num$1(p, "len");
		return w >= 2.6 ? [
			{
				id: "s1",
				pose: "sit",
				x: w / 2,
				y: .8,
				z: .9
			},
			{
				id: "s0",
				pose: "sit",
				x: w * .3,
				y: .8,
				z: .9
			},
			{
				id: "s2",
				pose: "sit",
				x: w * .7,
				y: .8,
				z: .9
			}
		] : [{
			id: "s1",
			pose: "sit",
			x: w / 2,
			y: .8,
			z: .9
		}];
	}
});
def({
	id: "coffeeTable",
	cat: "table",
	name: {
		ko: "거실 탁자",
		en: "Coffee table"
	},
	place: "floor",
	defaults: {
		w: 2,
		d: 1,
		c: "oak"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: num$1(p, "d"),
		h: .9
	}),
	recipe(p) {
		const w = num$1(p, "w"), d = num$1(p, "d"), c = str(p, "c");
		const leg = (x, y) => box(x, y, 0, x + .12, y + .12, .78, c, { mat: "wood" });
		return [
			leg(.08, .08),
			leg(w - .2, .08),
			leg(.08, d - .2),
			box(.22, .22, .25, w - .22, d - .22, .31, c, { mat: "wood" }),
			leg(w - .2, d - .2),
			box(0, 0, .78, w, d, .9, c, { mat: "wood" })
		];
	},
	surfaces: (p) => [{
		id: "top",
		x: 0,
		y: 0,
		w: num$1(p, "w"),
		d: num$1(p, "d"),
		z: .9,
		maxH: 1.2,
		cell: .05
	}]
});
def({
	id: "sideTable",
	shadow: "round",
	cat: "table",
	name: {
		ko: "둥근 협탁",
		en: "Side table"
	},
	place: "floor",
	defaults: { c: "walnut" },
	size: () => ({
		w: .7,
		d: .7,
		h: 1
	}),
	recipe: (p) => [
		cyl(.35, .35, 0, .08, .24, .22, str(p, "c"), { mat: "wood" }),
		cyl(.35, .35, .08, .92, .05, .05, str(p, "c"), { mat: "wood" }),
		cyl(.35, .35, .92, 1, .34, .34, str(p, "c"), { mat: "wood" })
	],
	surfaces: () => [{
		id: "top",
		x: .1,
		y: .1,
		w: .5,
		d: .5,
		z: 1,
		maxH: 1,
		cell: .05
	}]
});
def({
	id: "diningTable",
	shadow: "round",
	cat: "table",
	name: {
		ko: "둥근 식탁",
		en: "Round table"
	},
	place: "floor",
	defaults: {
		c: "birch",
		shape: "round"
	},
	size: () => ({
		w: 1.6,
		d: 1.6,
		h: 1.5
	}),
	recipe: (p) => str(p, "shape") === "square" ? [...[
		[.1, .1],
		[1.38, .1],
		[.1, 1.38],
		[1.38, 1.38]
	].map(([x, y]) => box(x, y, 0, x + .12, y + .12, 1.38, str(p, "c"), { mat: "wood" })), box(0, 0, 1.38, 1.6, 1.6, 1.5, str(p, "c"), { mat: "wood" })] : [
		cyl(.8, .8, 0, .12, .46, .42, str(p, "c"), { mat: "wood" }),
		cyl(.8, .8, .12, 1.38, .1, .1, str(p, "c"), { mat: "wood" }),
		cyl(.8, .8, 1.38, 1.5, .79, .79, str(p, "c"), { mat: "wood" })
	],
	surfaces: () => [{
		id: "top",
		x: .3,
		y: .3,
		w: 1,
		d: 1,
		z: 1.5,
		maxH: 1.2,
		cell: .05
	}]
});
def({
	id: "chair",
	cat: "seat",
	name: {
		ko: "의자",
		en: "Chair"
	},
	place: "floor",
	defaults: {
		c: "oak",
		seat: "coral"
	},
	size: () => ({
		w: 1,
		d: 1,
		h: 1.9
	}),
	recipe(p) {
		const c = str(p, "c"), s = str(p, "seat");
		const leg = (x, y) => box(x, y, 0, x + .09, y + .09, .85, c, { mat: "wood" });
		return [
			leg(.17, .17),
			leg(.74, .17),
			leg(.17, .74),
			box(.15, .15, .95, .85, .25, 1.9, c, { mat: "wood" }),
			leg(.74, .74),
			box(.15, .15, .85, .85, .85, .95, c, { mat: "wood" }),
			box(.2, .27, .95, .8, .82, 1.03, s, { mat: "fabric" })
		];
	},
	seats: () => [{
		id: "s1",
		pose: "sit",
		x: .5,
		y: .5,
		z: 1.03,
		facing: "+y"
	}]
});
def({
	id: "stool",
	shadow: "round",
	cat: "seat",
	name: {
		ko: "둥근 의자",
		en: "Stool"
	},
	place: "floor",
	defaults: {
		c: "teal",
		leg: "oak"
	},
	size: () => ({
		w: .7,
		d: .7,
		h: 1
	}),
	recipe: (p) => [
		box(.12, .12, 0, .2, .2, .88, str(p, "leg"), { mat: "wood" }),
		box(.5, .12, 0, .58, .2, .88, str(p, "leg"), { mat: "wood" }),
		box(.12, .5, 0, .2, .58, .88, str(p, "leg"), { mat: "wood" }),
		box(.5, .5, 0, .58, .58, .88, str(p, "leg"), { mat: "wood" }),
		cyl(.35, .35, .86, 1, .33, .33, str(p, "c"), { mat: "fabric" })
	],
	seats: () => [{
		id: "s1",
		pose: "sit",
		x: .35,
		y: .35,
		z: 1,
		facing: "+y"
	}]
});
def({
	id: "beanbag",
	shadow: "round",
	cat: "seat",
	name: {
		ko: "빈백",
		en: "Beanbag"
	},
	place: "floor",
	defaults: { c: "butter" },
	size: () => ({
		w: 1.2,
		d: 1.2,
		h: 1
	}),
	recipe: (p) => [ell(.6, .46, .62, .42, .32, .36, str(p, "c"), { mat: "fabric" }), ell(.6, .64, .32, .55, .55, .32, str(p, "c"), { mat: "fabric" })],
	seats: () => [{
		id: "s1",
		pose: "sit",
		x: .6,
		y: .66,
		z: .6,
		facing: "+y"
	}]
});
def({
	id: "floorCushion",
	shadow: "round",
	cat: "seat",
	name: {
		ko: "방석",
		en: "Floor cushion"
	},
	place: "floor",
	defaults: { c: "lilac" },
	size: () => ({
		w: 1,
		d: 1,
		h: .35
	}),
	recipe: (p) => [ell(.5, .5, .16, .44, .44, .16, str(p, "c"), { mat: "fabric" }), ell(.5, .5, .31, .06, .06, .03, "cream", { noLine: true })],
	seats: () => [{
		id: "s1",
		pose: "sit",
		x: .5,
		y: .5,
		z: .32,
		facing: "+y"
	}]
});
def({
	id: "bookcase",
	cat: "storage",
	name: {
		ko: "책장",
		en: "Bookcase"
	},
	place: "floor",
	defaults: {
		w: 2,
		h: 4,
		c: "oak",
		back: "cream",
		fill: "none"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: .8,
		h: num$1(p, "h")
	}),
	recipe(p) {
		const w = num$1(p, "w"), h = num$1(p, "h"), c = str(p, "c");
		const r = [
			box(0, 0, 0, .1, .8, h - .1, c, { mat: "wood" }),
			box(.1, 0, 0, w - .1, .06, h - .1, str(p, "back"), { mat: "paint" }),
			box(.1, .06, 0, w - .1, .8, .2, c, { mat: "wood" })
		];
		for (const z of shelfLevels(h).slice(1)) r.push(box(.1, .06, z - .08, w - .1, .8, z, c, { mat: "wood" }));
		r.push(box(w - .1, 0, 0, w, .8, h - .1, c, { mat: "wood" }), box(0, 0, h - .1, w, .8, h, c, { mat: "wood" }));
		shelfFill(r, str(p, "fill"), w, h);
		return r;
	},
	surfaces(p) {
		const w = num$1(p, "w"), h = num$1(p, "h"), lv = shelfLevels(h);
		return lv.map((z, i) => ({
			id: `L${i}`,
			x: .1,
			y: .06,
			w: w - .2,
			d: .74,
			z,
			maxH: (i + 1 < lv.length ? lv[i + 1] - .08 : h - .1) - z,
			cell: .05
		}));
	}
});
/** 책장 칸 채우기(예전 장난감·화분·공작·보드게임 선반, 5단계 H5 변형). 맨 위 칸은 비워 둔다(올려놓기) */
function shelfFill(r, fill, w, h) {
	if (fill === "none") return;
	shelfLevels(h).slice(0, 3).forEach((z, i) => {
		for (let x = .2, k = 0; x < w - .45; x += .55, k++) {
			const c = [
				"coral",
				"teal",
				"butter",
				"lilac",
				"sky"
			][(i + k) % 5];
			if (fill === "toys") {
				if (k % 2) r.push(ell(x + .17, .45, z + .17, .15, .15, .15, c));
				else r.push(box(x, .25, z, x + .32, .6, z + .3, c, { mat: "paint" }));
			} else if (fill === "plants") r.push(cyl(x + .17, .45, z, z + .22, .13, .15, "terracotta", { mat: "ceramic" }), ell(x + .17, .45, z + .36, .17, .17, .16, k % 2 ? "leaf" : "leafDark", { mat: "plant" }));
			else if (fill === "craft") {
				if (k % 2) r.push(cyl(x + .17, .45, z, z + .3, .12, .12, c, { mat: "paint" }));
				else r.push(box(x, .2, z, x + .36, .65, z + .08, c, { mat: "paper" }), box(x + .02, .22, z + .08, x + .34, .63, z + .16, "white", { mat: "paper" }));
			} else if (fill === "games") r.push(box(x, .2, z, x + .42, .65, z + .09, c, { mat: "card" }), box(x + .02, .22, z + .09, x + .4, .63, z + .18, [
				"navy",
				"coral",
				"teal"
			][(i + k) % 3], { mat: "card" }));
		}
	});
}
function shelfLevels(h) {
	const n = 4, step = (h - .1 - .2) / n;
	return Array.from({ length: n }, (_, i) => Math.round((.2 + i * step) * 1e3) / 1e3);
}
def({
	id: "desk",
	cat: "table",
	name: {
		ko: "책상",
		en: "Desk"
	},
	place: "floor",
	defaults: {
		w: 2.5,
		c: "birch",
		c2: "sky"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: 1.2,
		h: 1.5
	}),
	recipe(p) {
		const w = num$1(p, "w"), d = 1.2, c = str(p, "c"), c2 = str(p, "c2");
		const dx0 = w - .9, dx1 = w - .06, fy = 1.16;
		return [
			box(.06, .1, 0, .16, 1.0999999999999999, 1.38, c, { mat: "wood" }),
			box(.16, .05, .6, dx0, .12, 1.38, c, { mat: "wood" }),
			box(dx0, .08, 0, dx1, fy, 1.38, c2, { mat: "paint" }),
			line([[
				dx0 + .04,
				fy,
				.46
			], [
				dx1 - .04,
				fy,
				.46
			]], "#00000055", 1),
			line([[
				dx0 + .04,
				fy,
				.92
			], [
				dx1 - .04,
				fy,
				.92
			]], "#00000055", 1),
			ell((dx0 + dx1) / 2, 1.175, .24, .06, .02, .04, "brass", { noLine: true }),
			ell((dx0 + dx1) / 2, 1.175, .7, .06, .02, .04, "brass", { noLine: true }),
			ell((dx0 + dx1) / 2, 1.175, 1.16, .06, .02, .04, "brass", { noLine: true }),
			box(0, 0, 1.38, w, d, 1.5, c, { mat: "wood" })
		];
	},
	surfaces: (p) => [{
		id: "top",
		x: 0,
		y: 0,
		w: num$1(p, "w"),
		d: 1.2,
		z: 1.5,
		maxH: 1.4,
		cell: .05
	}]
});
def({
	id: "sideboard",
	cat: "storage",
	name: {
		ko: "낮은 수납장",
		en: "Sideboard"
	},
	place: "floor",
	defaults: {
		w: 2.4,
		c: "sage",
		top: "walnut"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: .8,
		h: 1.6
	}),
	recipe(p) {
		const w = num$1(p, "w"), c = str(p, "c");
		const r = [
			box(.1, .1, 0, .2, .2, .2, str(p, "top"), { mat: "wood" }),
			box(w - .2, .1, 0, w - .1, .2, .2, str(p, "top"), { mat: "wood" }),
			box(.1, .6, 0, .2, .7, .2, str(p, "top"), { mat: "wood" }),
			box(w - .2, .6, 0, w - .1, .7, .2, str(p, "top"), { mat: "wood" }),
			box(0, 0, .2, w, .78, 1.5, c, { mat: "paint" })
		];
		const n = Math.round(w / .8);
		for (let i = 1; i < n; i++) r.push(line([[
			w * i / n,
			.78,
			.28
		], [
			w * i / n,
			.78,
			1.42
		]], "#00000050", 1));
		for (let i = 0; i < n; i++) r.push(ell(w * (i + .5) / n, .79, 1.1, .04, .01, .04, "brass", { noLine: true }));
		r.push(box(0, 0, 1.5, w, .8, 1.6, str(p, "top"), { mat: "wood" }));
		return r;
	},
	surfaces: (p) => [{
		id: "top",
		x: 0,
		y: 0,
		w: num$1(p, "w"),
		d: .8,
		z: 1.6,
		maxH: 1.5,
		cell: .05
	}]
});
def({
	id: "dresser",
	cat: "storage",
	name: {
		ko: "서랍장",
		en: "Dresser"
	},
	place: "floor",
	defaults: {
		w: 2,
		c: "pink",
		top: "oak"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: .8,
		h: 2.2
	}),
	recipe(p) {
		const w = num$1(p, "w"), c = str(p, "c"), fy = .76;
		const r = [
			box(.05, .05, 0, w - .05, .7, .15, "choc", { mat: "wood" }),
			box(0, 0, .15, w, fy, 2.1, c, { mat: "paint" }),
			line([[
				.05,
				fy,
				.8
			], [
				w - .05,
				fy,
				.8
			]], "#00000050", 1),
			line([[
				.05,
				fy,
				1.45
			], [
				w - .05,
				fy,
				1.45
			]], "#00000050", 1)
		];
		for (const z of [
			.48,
			1.12,
			1.78
		]) for (const x of [w * .28, w * .72]) r.push(ell(x, .775, z, .05, .015, .05, "brass", { noLine: true }));
		r.push(box(0, 0, 2.1, w, .8, 2.2, str(p, "top"), { mat: "wood" }));
		return r;
	},
	surfaces: (p) => [{
		id: "top",
		x: 0,
		y: 0,
		w: num$1(p, "w"),
		d: .8,
		z: 2.2,
		maxH: 1.2,
		cell: .05
	}]
});
def({
	id: "windowBench",
	cat: "seat",
	name: {
		ko: "창가 벤치",
		en: "Window bench"
	},
	place: "floor",
	defaults: {
		w: 2.5,
		c: "trim",
		c2: "teal"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: 1,
		h: 1.15
	}),
	recipe(p) {
		const w = num$1(p, "w"), r = [box(0, 0, 0, w, 1, .95, str(p, "c"), { mat: "wood" })];
		const n = Math.round(w / .8);
		for (let i = 0; i < n; i++) {
			const x0 = w * i / n + .1, x1 = w * (i + 1) / n - .1;
			r.push(line([
				[
					x0,
					1,
					.15
				],
				[
					x1,
					1,
					.15
				],
				[
					x1,
					1,
					.8
				],
				[
					x0,
					1,
					.8
				],
				[
					x0,
					1,
					.15
				]
			], "#00000040", 1));
		}
		r.push(box(.05, .05, .95, w - .05, .95, 1.15, str(p, "c2"), { mat: "fabric" }));
		return r;
	},
	surfaces: (p) => [{
		id: "top",
		x: .1,
		y: .05,
		w: num$1(p, "w") - .2,
		d: .85,
		z: 1.15,
		maxH: .7,
		cell: .05
	}],
	seats: (p) => [{
		id: "s1",
		pose: "sit",
		x: num$1(p, "w") / 2,
		y: .55,
		z: 1.15
	}]
});
def({
	id: "floorLamp",
	shadow: "round",
	cat: "light",
	name: {
		ko: "스탠드 조명",
		en: "Floor lamp"
	},
	place: "floor",
	defaults: { c: "butter" },
	size: () => ({
		w: .8,
		d: .8,
		h: 3.4
	}),
	recipe: (p) => [
		cyl(.4, .4, 0, .08, .3, .27, "charcoal", { mat: "metal" }),
		cyl(.4, .4, .08, 2.7, .035, .035, "brass", { mat: "metal" }),
		cyl(.4, .4, 2.6, 3.4, .39, .25, str(p, "c"), { mat: "fabric" })
	]
});
def({
	id: "plantBig",
	shadow: "round",
	cat: "plant",
	name: {
		ko: "큰 화분",
		en: "Big plant"
	},
	place: "floor",
	defaults: {
		pot: "terracotta",
		leaf: "leaf",
		kind: "bush",
		seed: 1
	},
	size: (p) => ({
		w: 1,
		d: 1,
		h: str(p, "kind") === "tall" ? 2.6 : 2.3
	}),
	recipe(p) {
		const pot = str(p, "pot"), leaf = str(p, "leaf"), kind = str(p, "kind");
		const r = [cyl(.5, .5, 0, .62, .28, .36, pot, { mat: "ceramic" }), cyl(.5, .5, .58, .72, .39, .39, pot, {
			mat: "ceramic",
			top: "choc"
		})];
		if (kind === "fern" || kind === "monstera") for (let i = 0; i < 8; i++) {
			const a = i / 8 * Math.PI * 2, rr = kind === "fern" ? .48 : .28, tip = [
				.5 + Math.cos(a) * rr,
				.5 + Math.sin(a) * rr,
				kind === "fern" ? 1.3 + i % 2 * .3 : 1.5 + i % 3 * .3
			];
			if (kind === "fern") {
				const pts = [
					[
						.5,
						.5,
						.72
					],
					[
						(.5 + tip[0]) / 2 - Math.sin(a) * .08,
						(.5 + tip[1]) / 2 + Math.cos(a) * .08,
						tip[2] + .25
					],
					tip,
					[
						(.5 + tip[0]) / 2 + Math.sin(a) * .08,
						(.5 + tip[1]) / 2 - Math.cos(a) * .08,
						tip[2] + .25
					]
				];
				r.push(poly(pts, i % 2 ? leaf : "leafLight", { mat: "plant" }));
			} else {
				r.push(line([[
					.5,
					.5,
					.72
				], [
					tip[0],
					tip[1],
					tip[2] - .2
				]], "stem", 2));
				r.push(ell(tip[0], tip[1], tip[2], .2, .2, .18, i % 2 ? "leafDark" : leaf, { mat: "plant" }));
			}
		}
		else if (kind === "tall") {
			const R = rng(num$1(p, "seed"));
			for (let i = 0; i < 9; i++) {
				const ang = i / 9 * Math.PI * 2 + R() * .4, lean = .1 + R() * .12, top = 1.7 + R() * .85;
				const bx = .5 + Math.cos(ang) * .08, by = .5 + Math.sin(ang) * .08;
				const tx = .5 + Math.cos(ang) * lean * 1.6, ty = .5 + Math.sin(ang) * lean * 1.6;
				const px = -Math.sin(ang) * .07, py = Math.cos(ang) * .07;
				r.push(poly([
					[
						bx - px,
						by - py,
						.7
					],
					[
						bx + px,
						by + py,
						.7
					],
					[
						(bx + tx) / 2 + px * 1.3,
						(by + ty) / 2 + py * 1.3,
						(.7 + top) / 2
					],
					[
						tx,
						ty,
						top
					],
					[
						(bx + tx) / 2 - px * 1.3,
						(by + ty) / 2 - py * 1.3,
						(.7 + top) / 2
					]
				], i % 3 === 0 ? "leafDark" : i % 3 === 1 ? leaf : "leafLight"));
			}
		} else {
			const blobs = [
				[
					.5,
					.42,
					1.2,
					.36,
					"leafDark"
				],
				[
					.32,
					.5,
					1.5,
					.22,
					leaf
				],
				[
					.68,
					.44,
					1.62,
					.24,
					leaf
				],
				[
					.5,
					.64,
					1.25,
					.3,
					leaf
				],
				[
					.46,
					.38,
					1.9,
					.22,
					"leafLight"
				],
				[
					.62,
					.62,
					1.78,
					.2,
					"leafLight"
				],
				[
					.36,
					.66,
					1.72,
					.18,
					leaf
				]
			];
			for (const [x, y, z, s, c] of blobs) r.push(ell(x, y, z, s, s, s * 1.15, c, { mat: "plant" }));
		}
		return r;
	}
});
def({
	id: "plantSmall",
	cat: "plant",
	name: {
		ko: "작은 화분",
		en: "Small plant"
	},
	place: "surface",
	defaults: {
		pot: "white",
		leaf: "leaf",
		kind: "round"
	},
	size: (p) => ({
		w: .5,
		d: .5,
		h: str(p, "kind") === "cactus" ? .7 : .62
	}),
	recipe(p) {
		const pot = str(p, "pot"), leaf = str(p, "leaf"), kind = str(p, "kind");
		const r = [cyl(.25, .25, 0, .26, .14, .18, pot, {
			mat: "ceramic",
			top: "choc"
		})];
		if (kind === "cactus") {
			r.push(cyl(.25, .25, .26, .55, .1, .1, "green", { mat: "plant" }), ell(.25, .25, .56, .1, .1, .12, "green", { mat: "plant" }));
			r.push(ell(.25, .25, .68, .04, .04, .02, "pink", { noLine: true }));
		} else if (kind === "flower") {
			for (const [x, y, z, c] of [
				[
					.18,
					.2,
					.52,
					"coral"
				],
				[
					.32,
					.24,
					.55,
					"butter"
				],
				[
					.24,
					.33,
					.5,
					"pink"
				]
			]) {
				r.push(line([[
					.25,
					.25,
					.26
				], [
					x,
					y,
					z - .04
				]], "stem", 1.2));
				r.push(ell(x, y, z, .06, .06, .06, c));
			}
			r.push(ell(.25, .25, .3, .16, .16, .06, leaf, { mat: "plant" }));
		} else r.push(ell(.25, .25, .42, .2, .2, .18, leaf, { mat: "plant" }), ell(.2, .3, .5, .1, .1, .1, "leafLight", { mat: "plant" }));
		return r;
	}
});
def({
	id: "books",
	cat: "small",
	name: {
		ko: "책 한 줄",
		en: "Books"
	},
	place: "surface",
	defaults: {
		w: 1,
		seed: 3,
		cols: "coral,navy,butter,teal,cream,plum,sage"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: .5,
		h: .78
	}),
	recipe(p) {
		const w = num$1(p, "w"), R = rng(num$1(p, "seed")), cols = str(p, "cols").split(",");
		const r = [];
		let x = .03, i = 0;
		while (x + .08 <= w - .03) {
			const bw = .08 + R() * .05, bh = .5 + R() * .28, dep = .34 + R() * .1;
			if (x + bw > w - .03) break;
			const c = cols[i++ % cols.length];
			r.push(box(x, .05, 0, x + bw, .05 + dep, bh, c, { mat: "paper" }));
			r.push(line([[
				x + .015,
				.05 + dep,
				bh - .08
			], [
				x + bw - .015,
				.05 + dep,
				bh - .08
			]], "#ffffffaa", 1));
			x += bw + .005;
		}
		return r;
	}
});
def({
	id: "bookStack",
	cat: "small",
	name: {
		ko: "쌓인 책",
		en: "Book stack"
	},
	place: "surface",
	defaults: {
		a: "teal",
		b: "butter",
		c: "coral",
		kind: "books"
	},
	size: () => ({
		w: .5,
		d: .5,
		h: .27
	}),
	recipe: (p) => [
		box(.05, .08, 0, .45, .42, .09, str(p, "a"), { mat: "paper" }),
		box(.08, .05, .09, .42, .4, .18, str(p, "b"), { mat: "paper" }),
		box(.07, .1, .18, .44, .45, .27, str(p, "c"), { mat: "paper" }),
		...str(p, "kind") === "notebooks" ? [
			line([[
				.09,
				.45,
				.2
			], [
				.09,
				.45,
				.26
			]], "steel", 1.5),
			line([[
				.2,
				.451,
				.2
			], [
				.2,
				.451,
				.26
			]], "steel", 1.5),
			line([[
				.31,
				.451,
				.2
			], [
				.31,
				.451,
				.26
			]], "steel", 1.5),
			ell(.44, .3, .225, .01, .04, .03, "brass", { noLine: true })
		] : []
	]
});
def({
	id: "deskLamp",
	cat: "light",
	name: {
		ko: "책상 조명",
		en: "Desk lamp"
	},
	place: "surface",
	defaults: { c: "coral" },
	size: () => ({
		w: .5,
		d: .5,
		h: .8
	}),
	recipe: (p) => [
		cyl(.25, .25, 0, .05, .15, .14, str(p, "c"), { mat: "metal" }),
		box(.235, .235, .05, .265, .265, .52, "steel", { mat: "metal" }),
		cyl(.25, .25, .5, .8, .23, .11, str(p, "c"), { mat: "fabric" })
	]
});
def({
	id: "mug",
	cat: "small",
	name: {
		ko: "머그컵",
		en: "Mug"
	},
	place: "surface",
	defaults: { c: "white" },
	size: () => ({
		w: .25,
		d: .25,
		h: .17
	}),
	recipe: (p) => [box(.19, .105, .04, .24, .145, .13, str(p, "c")), cyl(.12, .125, 0, .17, .085, .09, str(p, "c"), {
		mat: "ceramic",
		top: "choc"
	})]
});
def({
	id: "teapot",
	cat: "small",
	name: {
		ko: "찻주전자",
		en: "Teapot"
	},
	place: "surface",
	defaults: { c: "sky" },
	size: () => ({
		w: .5,
		d: .5,
		h: .42
	}),
	recipe: (p) => [
		box(.03, .22, .1, .08, .28, .26, str(p, "c")),
		ell(.25, .25, .16, .17, .17, .15, str(p, "c"), { mat: "ceramic" }),
		box(.39, .22, .1, .48, .28, .17, str(p, "c")),
		ell(.25, .25, .31, .09, .09, .04, str(p, "c"), { mat: "ceramic" }),
		ell(.25, .25, .38, .035, .035, .035, "white")
	]
});
def({
	id: "fruitBowl",
	cat: "small",
	name: {
		ko: "과일 그릇",
		en: "Fruit bowl"
	},
	place: "surface",
	defaults: { c: "cream" },
	size: () => ({
		w: .5,
		d: .5,
		h: .3
	}),
	recipe: (p) => [
		cyl(.25, .25, 0, .13, .12, .22, str(p, "c"), {
			mat: "ceramic",
			top: "clay"
		}),
		ell(.2, .22, .16, .08, .08, .08, "red"),
		ell(.3, .2, .17, .07, .07, .07, "mustard"),
		ell(.31, .31, .16, .08, .08, .08, "green"),
		ell(.2, .32, .17, .07, .07, .07, "coral"),
		ell(.26, .26, .23, .07, .07, .07, "butter")
	]
});
def({
	id: "vase",
	cat: "small",
	name: {
		ko: "꽃병",
		en: "Vase"
	},
	place: "surface",
	defaults: {
		c: "teal",
		f1: "pink",
		f2: "butter",
		f3: "coral"
	},
	size: () => ({
		w: .4,
		d: .4,
		h: .86
	}),
	recipe: (p) => [
		cyl(.2, .2, 0, .38, .11, .07, str(p, "c"), {
			mat: "ceramic",
			top: "stem"
		}),
		line([[
			.2,
			.2,
			.38
		], [
			.11,
			.15,
			.66
		]], "stem", 1.3),
		line([[
			.2,
			.2,
			.38
		], [
			.28,
			.24,
			.74
		]], "stem", 1.3),
		line([[
			.2,
			.2,
			.38
		], [
			.2,
			.3,
			.62
		]], "stem", 1.3),
		ell(.12, .15, .7, .07, .07, .06, str(p, "f1")),
		ell(.28, .24, .79, .07, .07, .06, str(p, "f2")),
		ell(.2, .3, .66, .06, .06, .05, str(p, "f3"))
	]
});
def({
	id: "radio",
	cat: "small",
	name: {
		ko: "라디오",
		en: "Radio"
	},
	place: "surface",
	defaults: { c: "mint" },
	size: () => ({
		w: .6,
		d: .5,
		h: .5
	}),
	recipe: (p) => [
		box(.04, .12, 0, .56, .4, .32, str(p, "c"), { mat: "paint" }),
		disc("y", .2, .401, .16, .1, "charcoal"),
		ell(.42, .405, .2, .035, .01, .035, "cream", { noLine: true }),
		ell(.42, .405, .1, .035, .01, .035, "cream", { noLine: true }),
		line([[
			.48,
			.2,
			.32
		], [
			.56,
			.16,
			.5
		]], "steel", 1.2)
	]
});
def({
	id: "photoFrame",
	cat: "small",
	name: {
		ko: "사진 액자",
		en: "Photo frame"
	},
	place: "surface",
	defaults: {
		c: "walnut",
		art: "sky"
	},
	size: () => ({
		w: .5,
		d: .5,
		h: .42
	}),
	recipe: (p) => [
		box(.08, .2, 0, .42, .27, .4, str(p, "c"), { mat: "wood" }),
		poly([
			[
				.12,
				.271,
				.05
			],
			[
				.38,
				.271,
				.05
			],
			[
				.38,
				.271,
				.36
			],
			[
				.12,
				.271,
				.36
			]
		], str(p, "art"), { noLine: true }),
		poly([
			[
				.12,
				.272,
				.05
			],
			[
				.38,
				.272,
				.05
			],
			[
				.32,
				.272,
				.17
			],
			[
				.22,
				.272,
				.12
			]
		], "sage", { noLine: true })
	]
});
def({
	id: "pencilCup",
	cat: "small",
	name: {
		ko: "연필꽂이",
		en: "Pencil cup"
	},
	place: "surface",
	defaults: { c: "navy" },
	size: () => ({
		w: .25,
		d: .25,
		h: .36
	}),
	recipe: (p) => [
		box(.08, .09, .08, .1, .11, .34, "butter"),
		box(.13, .08, .08, .15, .1, .36, "coral"),
		box(.11, .13, .08, .13, .15, .31, "teal"),
		cyl(.125, .125, 0, .18, .08, .08, str(p, "c"), {
			mat: "ceramic",
			top: "charcoal"
		})
	]
});
def({
	id: "pillow",
	cat: "small",
	name: {
		ko: "쿠션",
		en: "Pillow"
	},
	place: "surface",
	defaults: { c: "coral" },
	size: () => ({
		w: .5,
		d: .3,
		h: .5
	}),
	recipe: (p) => [ell(.25, .15, .25, .24, .13, .24, str(p, "c"), { mat: "fabric" })]
});
def({
	id: "blocks",
	cat: "toy",
	name: {
		ko: "쌓기 블록",
		en: "Blocks"
	},
	place: "surface",
	defaults: {},
	size: () => ({
		w: .5,
		d: .5,
		h: .34
	}),
	recipe: () => [
		box(.05, .05, 0, .22, .22, .17, "red", { mat: "paint" }),
		box(.26, .07, 0, .43, .24, .17, "butter", { mat: "paint" }),
		box(.1, .27, 0, .27, .44, .17, "blue", { mat: "paint" }),
		box(.15, .12, .17, .32, .29, .34, "green", { mat: "paint" })
	]
});
def({
	id: "ball",
	shadow: "round",
	cat: "toy",
	name: {
		ko: "공",
		en: "Ball"
	},
	place: "surface",
	defaults: { c: "coral" },
	size: () => ({
		w: .5,
		d: .5,
		h: .4
	}),
	recipe: (p) => [ell(.25, .25, .2, .2, .2, .2, str(p, "c"))]
});
def({
	id: "movingBox",
	cat: "box",
	name: {
		ko: "이삿짐 상자",
		en: "Moving box"
	},
	place: "floor",
	defaults: { s: 1 },
	size: (p) => ({
		w: num$1(p, "s"),
		d: num$1(p, "s"),
		h: num$1(p, "s") * .78
	}),
	recipe(p) {
		const s = num$1(p, "s"), h = s * .78, m = s * .04;
		return [
			box(m, m, 0, s - m, s - m, h, "card", { mat: "card" }),
			poly([
				[
					s * .43,
					m,
					h
				],
				[
					s * .57,
					m,
					h
				],
				[
					s * .57,
					s - m,
					h
				],
				[
					s * .43,
					s - m,
					h
				]
			], "tape", { noLine: true }),
			poly([
				[
					s * .43,
					s - m,
					h
				],
				[
					s * .57,
					s - m,
					h
				],
				[
					s * .57,
					s - m,
					h * .72
				],
				[
					s * .43,
					s - m,
					h * .72
				]
			], "tape", { noLine: true }),
			poly([
				[
					s - m,
					s * .25,
					h * .6
				],
				[
					s - m,
					s * .7,
					h * .6
				],
				[
					s - m,
					s * .7,
					h * .3
				],
				[
					s - m,
					s * .25,
					h * .3
				]
			], "white", { noLine: true }),
			line([[
				s - m,
				s * .33,
				h * .5
			], [
				s - m,
				s * .6,
				h * .5
			]], "charcoal", 1),
			line([[
				s - m,
				s * .33,
				h * .4
			], [
				s - m,
				s * .52,
				h * .4
			]], "charcoal", 1)
		];
	},
	surfaces: (p) => [{
		id: "top",
		x: .05,
		y: .05,
		w: num$1(p, "s") - .1,
		d: num$1(p, "s") - .1,
		z: num$1(p, "s") * .78,
		maxH: 1,
		cell: .05
	}]
});
def({
	id: "frame",
	cat: "wall",
	name: {
		ko: "그림 액자",
		en: "Picture"
	},
	place: "wall",
	defaults: {
		w: 1,
		h: 1.2,
		c: "walnut",
		art: "hills",
		shape: "rect"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: .1,
		h: num$1(p, "h")
	}),
	recipe(p) {
		const w = num$1(p, "w"), h = num$1(p, "h"), m = .1, y = .081, y2 = .082;
		const at = (u, v, yy = y2) => [
			m + (w - 2 * m) * u,
			yy,
			m + (h - 2 * m) * v
		];
		const round = str(p, "shape") === "round";
		const oval = (rx, ry, yy) => Array.from({ length: 28 }, (_, i) => {
			const t = i / 28 * Math.PI * 2;
			return [
				w / 2 + Math.cos(t) * rx,
				yy,
				h / 2 + Math.sin(t) * ry
			];
		});
		const r = round ? [poly(oval(w / 2, h / 2, .06), str(p, "c"), { mat: "wood" }), poly(oval(w / 2 - m, h / 2 - m, y), "cream", { noLine: true })] : [box(0, 0, 0, w, .08, h, str(p, "c"), { mat: "wood" }), poly([
			at(0, 0, y),
			at(1, 0, y),
			at(1, 1, y),
			at(0, 1, y)
		], "cream", { noLine: true })];
		const art = str(p, "art");
		if (frameArt(r, art, at, w, h, y2)) return r;
		if (art === "hills") {
			r.push(poly([
				at(0, 0),
				at(1, 0),
				at(1, .4),
				at(.7, .55),
				at(.4, .35),
				at(0, .5)
			], "sage", { noLine: true }));
			r.push(poly([
				at(0, 0),
				at(1, 0),
				at(1, .22),
				at(.5, .3),
				at(0, .18)
			], "green", { noLine: true }));
			r.push(disc("y", m + (w - 2 * m) * .72, y2, m + (h - 2 * m) * .75, Math.min(w, h) * .1, "butter", { noLine: true }));
		} else if (art === "tree") {
			r.push(poly([
				at(.45, 0),
				at(.55, 0),
				at(.55, .4),
				at(.45, .4)
			], "walnut", { noLine: true }));
			r.push(disc("y", m + (w - 2 * m) * .5, y2, m + (h - 2 * m) * .6, Math.min(w, h) * .28, "green", { noLine: true }));
		} else if (art === "stripes") for (let i = 0; i < 4; i++) r.push(poly([
			at(0, i / 4),
			at(1, i / 4),
			at(1, i / 4 + .12),
			at(0, i / 4 + .12)
		], [
			"coral",
			"butter",
			"teal",
			"pink"
		][i], { noLine: true }));
		else {
			r.push(disc("y", m + (w - 2 * m) * .5, y2, m + (h - 2 * m) * .5, Math.min(w, h) * .26, "coral", { noLine: true }));
			r.push(disc("y", m + (w - 2 * m) * .5, .083, m + (h - 2 * m) * .5, Math.min(w, h) * .13, "butter", { noLine: true }));
		}
		return r;
	}
});
def({
	id: "clock",
	cat: "wall",
	name: {
		ko: "벽시계",
		en: "Clock"
	},
	place: "wall",
	defaults: { c: "coral" },
	size: () => ({
		w: .7,
		d: .12,
		h: .7
	}),
	recipe: (p) => [
		disc("y", .35, .09, .35, .34, str(p, "c")),
		disc("y", .35, .1, .35, .27, "white", { noLine: true }),
		line([[
			.35,
			.11,
			.35
		], [
			.35,
			.11,
			.55
		]], "charcoal", 1.6),
		line([[
			.35,
			.11,
			.35
		], [
			.5,
			.11,
			.3
		]], "charcoal", 1.6),
		ell(.35, .115, .35, .03, .005, .03, "coral", { noLine: true })
	]
});
/** 액자 그림(예전 사이트 액자 그림 18 + 팝아웃 고양이·무지개를 새 그림체로, 5단계 H5). 그렸으면 true */
function frameArt(r, art, at, w, h, y2) {
	const P = (pts, c) => r.push(poly(pts.map(([u, v]) => at(u, v)), c, { noLine: true }));
	const D = (u, v, s, c) => r.push(disc("y", at(u, 0)[0], y2 + .001, at(0, v)[2], Math.min(w, h) * s, c, { noLine: true }));
	const sky = (c) => P([
		[0, 0],
		[1, 0],
		[1, 1],
		[0, 1]
	], c);
	switch (art) {
		case "sea":
			sky("sky");
			P([
				[0, 0],
				[1, 0],
				[1, .35],
				[0, .35]
			], "blue");
			P([
				[.3, .38],
				[.7, .38],
				[.62, .28],
				[.38, .28]
			], "walnut");
			P([
				[.5, .4],
				[.5, .85],
				[.75, .42]
			], "white");
			return true;
		case "rainbow":
			sky("sky");
			[
				"coral",
				"butter",
				"mint",
				"blue"
			].forEach((c, i) => P(Array.from({ length: 13 }, (_, k) => {
				const t = Math.PI - k / 12 * Math.PI, rr = .42 - i * .07;
				return [.5 + Math.cos(t) * rr, .2 + Math.sin(t) * rr * 1.2];
			}).concat(Array.from({ length: 13 }, (_, k) => {
				const t = k / 12 * Math.PI, rr = .35 - i * .07;
				return [.5 + Math.cos(t) * rr, .2 + Math.sin(t) * rr * 1.2];
			})), c));
			return true;
		case "space":
			sky("navy");
			D(.35, .6, .16, "coral");
			D(.7, .3, .1, "sky");
			for (const [u, v] of [
				[.2, .2],
				[.8, .8],
				[.6, .7]
			]) D(u, v, .025, "butter");
			return true;
		case "flowers":
			sky("mint");
			for (const [u, c] of [
				[.2, "coral"],
				[.45, "butter"],
				[.7, "pink"]
			]) {
				P([
					[u - .01, 0],
					[u + .01, 0],
					[u + .01, .5],
					[u - .01, .5]
				], "green");
				D(u, .55, .09, c);
			}
			return true;
		case "koala":
			sky("sky");
			P([
				[.62, 0],
				[.72, 0],
				[.72, 1],
				[.62, 1]
			], "walnut");
			D(.48, .55, .16, "fur");
			D(.38, .72, .08, "fur");
			D(.58, .72, .08, "fur");
			D(.48, .52, .04, "nose");
			return true;
		case "night":
			sky("navy");
			D(.7, .72, .13, "butter");
			D(.76, .76, .11, "navy");
			for (const [u, v] of [
				[.2, .7],
				[.35, .4],
				[.6, .3],
				[.15, .25]
			]) D(u, v, .03, "butter");
			return true;
		case "beach":
			sky("sky");
			P([
				[0, 0],
				[1, 0],
				[1, .3],
				[0, .25]
			], "sand");
			P([
				[.62, .22],
				[.66, .22],
				[.7, .7],
				[.66, .7]
			], "walnut");
			for (const dx of [
				-.18,
				0,
				.18
			]) P([
				[.68, .72],
				[.68 + dx, .6],
				[.68 + dx * 1.2, .85]
			], "green");
			return true;
		case "castle":
			sky("sky");
			P([
				[.2, 0],
				[.8, 0],
				[.8, .45],
				[.2, .45]
			], "lilac");
			for (const u of [.2, .65]) {
				P([
					[u, 0],
					[u + .15, 0],
					[u + .15, .7],
					[u, .7]
				], "lilac");
				P([
					[u - .02, .7],
					[u + .17, .7],
					[u + .075, .9]
				], "coral");
			}
			P([
				[.43, 0],
				[.57, 0],
				[.57, .25],
				[.43, .25]
			], "walnut");
			return true;
		case "butterfly":
			sky("mint");
			D(.4, .6, .14, "lilac");
			D(.6, .6, .14, "lilac");
			D(.42, .38, .1, "pink");
			D(.58, .38, .1, "pink");
			P([
				[.49, .25],
				[.51, .25],
				[.51, .75],
				[.49, .75]
			], "black");
			return true;
		case "puppy":
			sky("butter");
			D(.5, .5, .22, "cream");
			D(.33, .55, .09, "walnut");
			D(.67, .55, .09, "walnut");
			D(.43, .55, .03, "black");
			D(.57, .55, .03, "black");
			D(.5, .45, .04, "black");
			return true;
		case "kitten":
		case "cat":
			sky("pink");
			D(.5, .45, .2, "mustard");
			P([
				[.33, .55],
				[.4, .58],
				[.35, .78]
			], "mustard");
			P([
				[.67, .55],
				[.6, .58],
				[.65, .78]
			], "mustard");
			P([
				[.42, .5],
				[.46, .5],
				[.44, .47]
			], "black");
			P([
				[.54, .5],
				[.58, .5],
				[.56, .47]
			], "black");
			return true;
		case "mountain":
			sky("sky");
			P([
				[0, 0],
				[1, 0],
				[.55, .8]
			], "slate");
			P([
				[.44, .6],
				[.66, .6],
				[.55, .8]
			], "white");
			P([
				[0, 0],
				[.5, 0],
				[.2, .5]
			], "sage");
			return true;
		case "dino":
			sky("butter");
			P([
				[.15, .2],
				[.65, .2],
				[.75, .45],
				[.85, .7],
				[.75, .75],
				[.6, .5],
				[.3, .45]
			], "green");
			P([
				[.15, .2],
				[.05, .35],
				[.25, .32]
			], "green");
			D(.78, .68, .02, "black");
			return true;
		case "balloons":
			sky("sky");
			for (const [u, v, c] of [
				[
					.3,
					.6,
					"red"
				],
				[
					.5,
					.72,
					"butter"
				],
				[
					.7,
					.58,
					"blue"
				]
			]) {
				P([
					[u - .005, .05],
					[u + .005, .05],
					[u + .005, v - .1],
					[u - .005, v - .1]
				], "grey");
				D(u, v, .12, c);
			}
			return true;
		case "rocket":
			sky("navy");
			P([
				[.45, .2],
				[.55, .2],
				[.55, .65],
				[.5, .8],
				[.45, .65]
			], "white");
			P([
				[.45, .2],
				[.38, .12],
				[.45, .32]
			], "coral");
			P([
				[.55, .2],
				[.62, .12],
				[.55, .32]
			], "coral");
			P([
				[.46, .2],
				[.54, .2],
				[.5, .05]
			], "butter");
			return true;
		case "fish":
			sky("blue");
			P([
				[.25, .5],
				[.5, .65],
				[.7, .5],
				[.5, .35]
			], "mustard");
			P([
				[.7, .5],
				[.82, .62],
				[.82, .38]
			], "mustard");
			D(.35, .52, .02, "black");
			return true;
		case "cake":
			sky("pink");
			P([
				[.25, .1],
				[.75, .1],
				[.75, .45],
				[.25, .45]
			], "cream");
			P([
				[.25, .4],
				[.75, .4],
				[.75, .48],
				[.25, .48]
			], "coral");
			P([
				[.49, .48],
				[.51, .48],
				[.51, .65],
				[.49, .65]
			], "sky");
			D(.5, .7, .04, "butter");
			return true;
		case "snowman":
			sky("sky");
			P([
				[0, 0],
				[1, 0],
				[1, .15],
				[0, .15]
			], "white");
			D(.5, .3, .17, "white");
			D(.5, .58, .12, "white");
			P([
				[.5, .58],
				[.62, .56],
				[.5, .55]
			], "coral");
			P([
				[.4, .68],
				[.6, .68],
				[.58, .82],
				[.42, .82]
			], "black");
			return true;
	}
	return false;
}
def({
	id: "bunting",
	cat: "wall",
	name: {
		ko: "깃발 장식",
		en: "Bunting"
	},
	place: "wall",
	defaults: {
		w: 2.8,
		cols: "coral,butter,teal,pink,sky",
		shape: "flag"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: .08,
		h: .6
	}),
	recipe(p) {
		const w = num$1(p, "w"), cols = str(p, "cols").split(","), y = .06, shape = str(p, "shape");
		const sag = (x) => .55 - .12 * Math.sin(Math.PI * x / w);
		const pts = [];
		for (let i = 0; i <= 12; i++) pts.push([
			w * i / 12,
			y,
			sag(w * i / 12)
		]);
		const r = [line(pts, "choc", 1)];
		const n = Math.floor(w / .35);
		for (let i = 0; i < n; i++) {
			const x = w * (i + .5) / n, z = sag(x), c = cols[i % cols.length];
			if (shape === "heart") r.push(poly(Array.from({ length: 20 }, (_, k) => {
				const t = k / 20 * Math.PI * 2, hx = 16 * Math.sin(t) ** 3, hz = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
				return [
					x + hx * .008,
					y,
					z - .14 + hz * .008
				];
			}), c));
			else if (shape === "star") r.push(poly(Array.from({ length: 10 }, (_, k) => {
				const a = Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? .05 : .13;
				return [
					x + Math.cos(a) * rr,
					y,
					z - .15 + Math.sin(a) * rr
				];
			}), c));
			else if (shape === "chain") r.push(ell(x, y, z - .04, .14, .02, .07, c, { noLine: true }));
			else if (shape === "leaf") r.push(ell(x, y, z - .12, .07, .02, .13, [
				"green",
				"leafLight",
				"sage"
			][i % 3]));
			else if (shape === "pom") r.push(ell(x, y, z - .1, .09, .02, .09, c, { mat: "knit" }));
			else if (shape === "ribbon") r.push(poly([
				[
					x - .05,
					y,
					z
				],
				[
					x + .05,
					y,
					z
				],
				[
					x + .08,
					y,
					z - .38
				],
				[
					x,
					y,
					z - .3
				],
				[
					x - .08,
					y,
					z - .38
				]
			], c));
			else if (shape === "snow") for (let k = 0; k < 3; k++) {
				const a = k / 3 * Math.PI;
				r.push(line([[
					x - Math.cos(a) * .12,
					y,
					z - .15 - Math.sin(a) * .12
				], [
					x + Math.cos(a) * .12,
					y,
					z - .15 + Math.sin(a) * .12
				]], i % 2 ? "#7fc4e8" : "#4f8fc4", 3));
			}
			else r.push(poly([
				[
					x - .12,
					y,
					z
				],
				[
					x + .12,
					y,
					z
				],
				[
					x,
					y,
					z - .3
				]
			], c));
		}
		return r;
	}
});
def({
	id: "wallShelf",
	cat: "wall",
	name: {
		ko: "벽 선반",
		en: "Wall shelf"
	},
	place: "wall",
	defaults: {
		w: 2,
		c: "walnut"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: .6,
		h: .38
	}),
	recipe(p) {
		const w = num$1(p, "w"), c = str(p, "c");
		return [
			poly([
				[
					.25,
					0,
					.3
				],
				[
					.25,
					.5,
					.3
				],
				[
					.25,
					0,
					.02
				]
			], "charcoal"),
			poly([
				[
					w - .25,
					0,
					.3
				],
				[
					w - .25,
					.5,
					.3
				],
				[
					w - .25,
					0,
					.02
				]
			], "charcoal"),
			box(0, 0, .3, w, .6, .38, c, { mat: "wood" })
		];
	},
	surfaces: (p) => [{
		id: "top",
		x: 0,
		y: 0,
		w: num$1(p, "w"),
		d: .6,
		z: .38,
		maxH: 1,
		cell: .05
	}]
});
def({
	id: "rugRect",
	cat: "rug",
	name: {
		ko: "네모 깔개",
		en: "Rug"
	},
	place: "decal",
	defaults: {
		w: 6,
		d: 4,
		c: "cream",
		c2: "coral",
		c3: "teal",
		pattern: "border"
	},
	size: (p) => ({
		w: num$1(p, "w"),
		d: num$1(p, "d"),
		h: .04
	}),
	recipe(p) {
		const w = num$1(p, "w"), d = num$1(p, "d"), z = .031, pat = str(p, "pattern");
		const q = (x0, y0, x1, y1) => [
			[
				x0,
				y0,
				z
			],
			[
				x1,
				y0,
				z
			],
			[
				x1,
				y1,
				z
			],
			[
				x0,
				y1,
				z
			]
		];
		const r = [box(0, 0, 0, w, d, .03, str(p, "c"), { mat: "knit" })];
		if (pat === "rainbow" || pat === "stripes") {
			const cols = pat === "rainbow" ? [
				"coral",
				"mustard",
				"butter",
				"mint",
				"sky",
				"lilac"
			] : [str(p, "c2"), str(p, "c")];
			const n = pat === "rainbow" ? 6 : Math.max(4, Math.round(w / .6));
			for (let i = 0; i < n; i++) if (pat === "rainbow" || i % 2 === 0) r.push(poly(q(w / n * i, 0, w / n * (i + 1), d), cols[i % cols.length], { noLine: true }));
			return r;
		}
		r.push(poly(q(.25, .25, w - .25, .45), str(p, "c2"), { noLine: true }), poly(q(.25, d - .45, w - .25, d - .25), str(p, "c2"), { noLine: true }));
		r.push(poly(q(.25, .45, .45, d - .45), str(p, "c2"), { noLine: true }), poly(q(w - .45, .45, w - .25, d - .45), str(p, "c2"), { noLine: true }));
		for (let x = 1; x < w - .6; x += 1) {
			const cx = x + .1, cy = d / 2;
			r.push(poly([
				[
					cx,
					cy - .45,
					z
				],
				[
					cx + .3,
					cy,
					z
				],
				[
					cx,
					cy + .45,
					z
				],
				[
					cx - .3,
					cy,
					z
				]
			], str(p, "c3"), { noLine: true }));
		}
		return r;
	}
});
def({
	id: "rugRound",
	cat: "rug",
	name: {
		ko: "둥근 깔개",
		en: "Round rug"
	},
	place: "decal",
	defaults: {
		r: 1.7,
		c: "sage",
		c2: "cream",
		c3: "mustard"
	},
	size: (p) => ({
		w: num$1(p, "r") * 2,
		d: num$1(p, "r") * 2,
		h: .04
	}),
	recipe(p) {
		const r = num$1(p, "r");
		return [
			cyl(r, r, 0, .03, r, r, str(p, "c"), { mat: "knit" }),
			disc("z", r, r, .031, r * .78, str(p, "c2"), { noLine: true }),
			disc("z", r, r, .032, r * .62, str(p, "c"), { noLine: true }),
			disc("z", r, r, .033, r * .3, str(p, "c3"), { noLine: true })
		];
	}
});
for (const t of EXTRA) def(t);
for (const t of H5) def(t);
var TEMPLATES = Object.fromEntries(T.map((t) => [t.id, t]));
function tpl(id) {
	const t = TEMPLATES[id];
	if (!t) throw new Error(`unknown template ${id}`);
	return t;
}
// src/data/items.ts
/** 정해진 태그 목록(plan 4.8) */
/** exclusive = 미션 보상 전용(상점에 없고 되팔 수 없음) */
var TAGS = [
	"cozy",
	"study",
	"nature",
	"play",
	"kitchen",
	"bath",
	"outdoor",
	"retro",
	"modern",
	"seasonal",
	"exclusive"
];
var ROOM_KINDS = [
	"living",
	"bedroom",
	"study",
	"kitchen",
	"bath",
	"yard"
];
var DRAFT_KEY = "kh2:admin:draft";
function load() {
	const base = items_default;
	try {
		if (typeof location !== "undefined" && new URLSearchParams(location.search).get("items") === "draft") {
			const d = localStorage.getItem(DRAFT_KEY);
			if (d) return JSON.parse(d);
		}
	} catch {}
	return base;
}
var FILE = load();
new Map(FILE.items.map((i) => [i.id, i]));
var bundledItems = () => items_default;
/**
* 5단계 H8-3 그림 물건: 관리자가 그림을 올릴 수 있는 납작한 틀과 그 그림이 들어가는 면(틀의 그림 칸).
* 물건 값 p.img(그림 주소)가 있으면 그 면에 그림을 비스듬히 입힌다(엔진 BoxShape.pic). 모양 깔개(별·하트 등)는 네모 그림이 밖으로 나가 빼둠
*/
var FLAT_TPLS = [
	"frame",
	"poster",
	"rugRect"
];
var isFlatTpl = (id) => FLAT_TPLS.includes(id);
/** 그림 주소: 사이트 R2(서버 S12) 또는 개발·시험의 data:image/webp */
var PIC_URL_RE = /^(\/api\/items\/image\/house3d\/[a-z0-9-]+\.webp|data:image\/webp;base64,[A-Za-z0-9+/=]+)$/;
function picArea(tplId, pp, w, d, h) {
	if (tplId === "frame") return {
		x0: .1,
		y0: .082,
		z0: .1,
		x1: w - .1,
		y1: .0835,
		z1: h - .1,
		picN: [
			0,
			1,
			0
		]
	};
	if (tplId === "poster") return {
		x0: .08,
		y0: .031,
		z0: .08,
		x1: 1.22,
		y1: .0325,
		z1: .92,
		picN: [
			0,
			1,
			0
		]
	};
	if (tplId === "rugRect") return {
		x0: .1,
		y0: .1,
		z0: .031,
		x1: w - .1,
		y1: d - .1,
		z1: .0325,
		picN: [
			0,
			0,
			1
		]
	};
	return null;
}
function geomOf(tplId, p, g) {
	const t = tpl(tplId);
	const { img, ...rest } = p;
	const pp = {
		...t.defaults,
		...rest
	};
	const s = g?.size ?? t.size(pp);
	const off = g?.offset ?? [
		0,
		0,
		0
	];
	let recipe = t.recipe(pp);
	if (typeof img === "string" && isFlatTpl(tplId)) {
		const a = picArea(tplId, pp, s.w, s.d, s.h);
		if (a) recipe = [...recipe, {
			t: "box",
			c: "white",
			pic: img,
			...a
		}];
	}
	if (off[0] || off[1] || off[2]) recipe = recipe.map((sh) => translateShape(sh, off[0], off[1], off[2]));
	return {
		w: s.w,
		d: s.d,
		h: s.h,
		recipe,
		surfaces: g?.surfaces ?? t.surfaces?.(pp) ?? [],
		seats: g?.seats ?? t.seats?.(pp) ?? []
	};
}
/** 템플릿 기본값과 등록된 아이템에서 규격을 만든다(템플릿에 schema가 없을 때) */
function schemaOf(t) {
	const out = {};
	for (const [k, v] of Object.entries(t.defaults)) if (typeof v === "number") out[k] = {
		type: "number",
		min: k === "seed" ? 1 : +(v * .5).toFixed(2),
		max: k === "seed" ? 99 : v === 0 ? 10 : +(v * 2).toFixed(2),
		step: k === "seed" ? 1 : v === 0 ? 1 : .05
	};
	else if (PALETTE[v] !== void 0 && k !== "art" && k !== "kind") out[k] = { type: "color" };
	else {
		const opts = /* @__PURE__ */ new Set([v]);
		for (const it of FILE.items) if (it.tpl === t.id && typeof it.p[k] === "string") opts.add(String(it.p[k]));
		out[k] = {
			type: "enum",
			options: [...opts]
		};
	}
	return out;
}
var ID_RE$1 = /^[a-z0-9][a-z0-9-]*$/;
function validateItem(it, all = FILE.items) {
	const errors = [], warnings = [];
	const out = [
		[],
		[],
		[],
		[]
	];
	if (!ID_RE$1.test(it.id)) errors.push("id는 영문 소문자·숫자·하이픈만 쓸 수 있어요");
	if (all.filter((x) => x.id === it.id).length > 1) errors.push("id가 겹쳐요");
	const t = TEMPLATES[it.tpl];
	if (!t) {
		errors.push(`없는 템플릿: ${it.tpl}`);
		return {
			errors,
			warnings,
			outside: out
		};
	}
	if (!it.name.ko.trim()) errors.push("한국어 이름이 없어요");
	if (!it.name.en.trim()) warnings.push("영어 이름이 없어요");
	if (!(it.price >= 0)) errors.push("가격은 0 이상이어야 해요");
	for (const tag of it.tags) if (!TAGS.includes(tag)) errors.push(`정해진 목록에 없는 태그: ${tag}`);
	if (it.rooms !== "any") {
		for (const r of it.rooms) if (!ROOM_KINDS.includes(r)) errors.push(`없는 방 종류: ${r}`);
	}
	const spec = schemaOf(t);
	for (const [k, v] of Object.entries(it.p)) {
		const sp = spec[k];
		if (k === "img") {
			if (!isFlatTpl(t.id)) errors.push("그림은 납작한 물건(액자·포스터·깔개)에만 올릴 수 있어요");
			else if (typeof v !== "string" || !PIC_URL_RE.test(v)) errors.push("그림 주소가 올바르지 않아요");
			continue;
		}
		if (!sp) {
			errors.push(`템플릿에 없는 값: ${k}`);
			continue;
		}
		if (typeof v === "string" && v.startsWith("#")) errors.push(`색은 팔레트 이름으로 저장해요: ${k}`);
		if (sp.type === "number" && (typeof v !== "number" || v < sp.min - 1e-9 || v > sp.max + 1e-9)) errors.push(`${k} 값이 범위(${sp.min}~${sp.max}) 밖이에요`);
		if (sp.type === "color" && (typeof v !== "string" || PALETTE[v] === void 0)) errors.push(`${k}: 팔레트에 없는 색`);
	}
	let g;
	try {
		g = geomOf(it.tpl, it.p, it.geom);
	} catch (e) {
		errors.push(`그림을 만들 수 없어요: ${e.message}`);
		return {
			errors,
			warnings,
			outside: out
		};
	}
	if (!(g.w > 0 && g.d > 0 && g.h > 0)) errors.push("크기는 0보다 커야 해요");
	for (const s of g.surfaces) {
		if (s.x < -1e-6 || s.y < -1e-6 || s.x + s.w > g.w + 1e-6 || s.y + s.d > g.d + 1e-6) errors.push(`올려놓기 칸 ${s.id}이(가) 발자국 밖이에요`);
		if (s.z > g.h + 1e-6) errors.push(`올려놓기 칸 ${s.id}이(가) 높이보다 위예요`);
	}
	for (const s of g.seats) if (s.x < 0 || s.y < 0 || s.x > g.w || s.y > g.d || s.z > g.h + 1e-6) errors.push(`좌석 ${s.id}이(가) 발자국 밖이에요`);
	for (const rot of [
		0,
		1,
		2,
		3
	]) {
		const [rw, rd] = rotSize(g.w, g.d, rot);
		const box = {
			x0: 0,
			y0: 0,
			z0: 0,
			x1: rw,
			y1: rd,
			z1: g.h
		};
		const rr = g.recipe.map((s) => rotateShape(s, g.w, g.d, rot));
		const bad = new Set(outside(rr, box));
		rr.forEach((s, i) => {
			if (bad.has(s)) out[rot].push(i);
		});
	}
	if (out[0].length) warnings.push(`그림이 발자국 밖으로 나가요 (도형 ${out[0].length}개)`);
	if ((t.version ?? 1) !== it.tplVersion) warnings.push(`템플릿 버전이 바뀌었어요 (${it.tplVersion} → ${t.version ?? 1}) 다시 확인해 주세요`);
	return {
		errors,
		warnings,
		outside: out
	};
}
[
	["apple", "noun"],
	["bread", "noun"],
	["run", "verb"],
	["happy", "adj"],
	["book", "noun"],
	["read", "verb"],
	["quickly", "adv"],
	["tooth", "noun"],
	["wash", "verb"],
	["hammer", "noun"],
	["kick", "verb"],
	["sad", "adj"],
	["story", "noun"],
	["milk", "noun"],
	["jump", "verb"],
	["brave", "adj"]
].map(([w, pos], i) => ({
	id: `w${i + 1}`,
	word: w,
	level: 1 + i % 3,
	pos
}));
[
	..."apple 사과,bag 가방,ball 공,bear 곰,bed 침대,bird 새,boat 배,book 책,box 상자,bread 빵,bus 버스,cake 케이크,car 자동차,cat 고양이,chair 의자,cloud 구름,cow 소,cup 컵,desk 책상,dog 개,door 문,duck 오리,egg 달걀,eye 눈,fish 물고기,flower 꽃,frog 개구리,hat 모자,horse 말,house 집,juice 주스,key 열쇠,kite 연,lamp 등,leg 다리,lion 사자,milk 우유,moon 달,mouse 쥐,nose 코,pen 펜,pig 돼지,rain 비,ring 반지,school 학교,shoe 신발,star 별,sun 해,tree 나무,water 물".split(",").map((s, i) => {
		const [w, ko] = s.split(" ");
		return {
			id: `n1-${i + 1}`,
			word: w,
			level: 1,
			pos: "noun",
			meaning: { ko }
		};
	}),
	...[["verb", 30], ["adj", 25]].flatMap(([pos, n]) => Array.from({ length: n }, (_, i) => ({
		id: `${pos}1-${i + 1}`,
		word: `${pos}-${i + 1}`,
		level: 1,
		pos,
		meaning: { ko: `뜻 ${i + 1}` }
	}))),
	...[
		2,
		3,
		4
	].flatMap((lv) => [["noun", 50], ["verb", 30]].flatMap(([pos, n]) => Array.from({ length: n }, (_, i) => ({
		id: `${pos}${lv}-${i + 1}`,
		word: `${pos}-${lv}-${i + 1}`,
		level: lv,
		pos,
		meaning: { ko: `뜻 ${i + 1}` }
	}))))
];
// src/game/festival.ts
var prize = (id, ko, en) => ({
	item: `fest-${id}`,
	name: {
		ko,
		en
	}
});
var FESTIVAL_PRIZES = {
	spring: [
		prize("spring-bunting", "봄 축제 깃발", "Spring fair bunting"),
		prize("spring-lantern", "봄 꽃등", "Spring flower lantern"),
		prize("spring-kite", "봄 연", "Spring kite")
	],
	summer: [
		prize("summer-bunting", "여름 축제 깃발", "Summer fair bunting"),
		prize("summer-lantern", "여름 바다등", "Summer sea lantern"),
		prize("summer-kite", "여름 연", "Summer kite")
	],
	autumn: [
		prize("autumn-bunting", "가을 축제 깃발", "Autumn fair bunting"),
		prize("autumn-lantern", "가을 단풍등", "Autumn leaf lantern"),
		prize("autumn-kite", "가을 연", "Autumn kite")
	],
	winter: [
		prize("winter-bunting", "겨울 축제 깃발", "Winter fair bunting"),
		prize("winter-lantern", "겨울 별등", "Winter star lantern"),
		prize("winter-kite", "겨울 연", "Winter kite")
	]
};
// src/game/requests.ts
/** 주민 목록. 이름·숫자·선물은 설정이 덮어쓴다(setResidentOverrides) — 부탁을 고르는 규칙(ask)은 코드 */
var RESIDENTS = [
	{
		id: "postie",
		name: {
			en: "Pip the postie",
			ko: "우체부 핍"
		},
		ask: (r) => r.wrong.length ? { kind: "rewrite" } : null,
		gift: "req-postie"
	},
	{
		id: "clock",
		name: {
			en: "Tick the clockmaker",
			ko: "시계방 틱"
		},
		n: 20,
		need: {
			mode: "tt",
			what: {
				ko: "구구단 문제",
				en: "times-table questions"
			}
		},
		ask() {
			return {
				kind: "mode",
				mode: "tt",
				n: this.n
			};
		},
		gift: "req-clock"
	},
	{
		id: "library",
		name: {
			en: "Mo the librarian",
			ko: "도서관 모"
		},
		n: 15,
		need: {
			mode: "quiz",
			what: {
				ko: "퀴즈 문제",
				en: "quiz questions"
			}
		},
		ask() {
			return {
				kind: "mode",
				mode: "quiz",
				n: this.n
			};
		},
		gift: "req-library"
	},
	{
		id: "bakery",
		name: {
			en: "Bun the baker",
			ko: "빵집 번"
		},
		n: 5,
		need: {
			topic: "food",
			what: {
				ko: "음식 단어",
				en: "food words"
			}
		},
		ask(r) {
			return r.catalog?.some((w) => w.topic === "food") ? {
				kind: "topic",
				topic: "food",
				n: this.n
			} : null;
		},
		gift: "req-bakery"
	}
];
/** 코드 기본값(설정이 덮어쓰기 전) — 관리자 화면이 '기본과 같으면 덮어쓰지 않음'에 씀 */
var RESIDENT_DEFAULTS = Object.freeze(RESIDENTS.map((r) => ({
	id: r.id,
	name: { ...r.name },
	gift: r.gift,
	...r.n !== void 0 ? { n: r.n } : {},
	...r.need ? { need: r.need } : {}
})));
[
	[
		"koala",
		"코알라",
		"Koala"
	],
	[
		"wombat",
		"웜뱃",
		"Wombat"
	],
	[
		"kangaroo",
		"캥거루",
		"Kangaroo"
	],
	[
		"platypus",
		"오리너구리",
		"Platypus"
	],
	[
		"kookaburra",
		"물총새",
		"Kookaburra"
	],
	[
		"echidna",
		"가시두더지",
		"Echidna"
	],
	[
		"wattle",
		"와틀 꽃",
		"Wattle"
	],
	[
		"waratah",
		"와라타",
		"Waratah"
	],
	[
		"gum",
		"유칼립투스",
		"Gum leaf"
	],
	[
		"reef",
		"산호초",
		"Coral reef"
	],
	[
		"uluru",
		"울루루",
		"Uluru"
	],
	[
		"opera",
		"오페라 하우스",
		"Opera House"
	]
].map(([id, ko, en]) => ({
	id,
	name: {
		ko,
		en
	}
}));
// src/game/config.ts
var clone = (x) => JSON.parse(JSON.stringify(x));
/** 기본값 = 지금 코드 상수(prices.ts·festival.ts·garden.ts·사이트 REWARD_CONFIG v262·app.js) */
var DEFAULT_CONFIG = Object.freeze(clone({
	version: 0,
	channel: "live",
	prices: {
		room: { ...PRICES.room },
		garden: PRICES.garden.each,
		lot: PRICES.lot.each,
		garage: PRICES.garage,
		exterior: {
			mat: { ...PRICES.look.mat },
			roofKind: { ...PRICES.look.roofKind },
			fenceKind: { ...PRICES.look.fenceKind },
			path: { ...PRICES.look.path },
			color: PRICES.look.color
		},
		asmrToy: {
			mochiSquish: 15,
			slimeSquish: 20,
			tofuSquish: 15,
			jellySquish: 20,
			clickPen: 10,
			keySwitch: 20,
			fidgetCube: 25,
			clickerBtn: 15,
			bubbleWrap: 10,
			pushPop: 15,
			popBoba: 20,
			waterBeads: 20,
			kineticSand: 25,
			soapCut: 20,
			iceCrunch: 20,
			scratchPad: 15
		},
		asmrBox: 60,
		roomDecor: PRICES.roomDecor
	},
	rewards: {
		quest: REWARDS.quest,
		walk: REWARDS.walk,
		site: {
			learning: {
				correctPerReward: 10,
				dailyRewardsPerMode: 3,
				bonusRounds: 3,
				bonusCoins: 5
			},
			learningByMode: {
				tt: {
					correctPerReward: 50,
					dailyRewardsPerMode: 2,
					bonusRounds: 2,
					bonusCoins: 5
				},
				typing: {
					correctPerReward: 50,
					dailyRewardsPerMode: 2,
					bonusRounds: 2,
					bonusCoins: 5
				}
			},
			coins: {
				quiz: 15,
				spelling: 15,
				flashcards: 15,
				timesTable: 15,
				typing: 15,
				review: 25,
				dailyMission: 50,
				missionRetry: 10
			},
			mission: {
				goal: 15,
				retryMaxFree: 3
			},
			badge: 50
		}
	},
	items: [],
	seasons: [{
		id: "christmas",
		name: {
			en: "Christmas",
			ko: "크리스마스"
		},
		from: "12-01",
		to: "01-06"
	}, {
		id: "summer",
		name: {
			en: "Summer",
			ko: "여름"
		},
		from: "12-01",
		to: "02-28"
	}],
	missions: {
		festivalGoal: 180,
		gardenGrow: 7,
		rules: {
			letterWords: 3,
			letterStampsPerGift: 3,
			stampEvery: 5,
			roomWords: 15
		},
		letters: {
			body: {
				en: "These words were a little tricky lately. Write them again and they'll stick!",
				ko: "요즘 조금 헷갈렸던 단어들이야. 다시 써 보면 금방 익숙해질 거야!"
			},
			praise: {
				en: "You haven't missed a single word lately. Amazing work — keep it up!",
				ko: "요즘 틀린 단어가 하나도 없네! 정말 대단해. 이대로 쭉 가 보자!"
			}
		},
		requests: RESIDENTS.map((r) => ({
			id: r.id,
			hidden: false
		})),
		festivals: Object.fromEntries(Object.entries(FESTIVAL_PRIZES).map(([k, v]) => [k, v.map((p) => p.item)]))
	},
	switches: {
		HOUSE3D: "off",
		MOVE: "off",
		trialAccounts: []
	},
	limits: {
		roundMax: {
			guest: 30,
			free: 100,
			paid: 200
		},
		dailyMax: {
			guest: 30,
			free: 100
		},
		guestRounds: 1,
		freeWordTrial: 10,
		freeWrong: 10,
		photoDaily: 30
	}
}));
/** 입력 범위(관리자 화면·서버·앱 모두 같음) */
var RANGES = {
	item: [0, 200],
	room: [0, 600],
	plot: [0, 500],
	exterior: [0, 300],
	asmrToy: [0, 100],
	asmrBox: [0, 150],
	houseReward: [0, 50],
	modeCoins: [0, 50],
	dailyRewards: [0, 10],
	bigReward: [0, 200],
	guestDaily: [10, 100],
	freeDaily: [30, 300],
	paidRound: [50, 500],
	festivalGoal: [45, 1e3],
	gardenGrow: [1, 30],
	text: 200,
	name: 40,
	letterWords: [1, 10],
	stampsPerGift: [1, 10],
	stampEvery: [2, 20],
	roomWords: [5, 50],
	reqN: [1, 100]
};
var isObj$1 = (x) => !!x && typeof x === "object" && !Array.isArray(x);
/** 정수 n이 범위 안이면 그 값, 아니면 기본값(+ 문제 기록) */
function num(v, def, [lo, hi], path, issues) {
	if (v === void 0) return def;
	if (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi) return Math.round(v);
	issues.push(path);
	return def;
}
function text(v, def, path, issues, max = RANGES.text) {
	if (v === void 0) return def;
	if (isObj$1(v) && typeof v.en === "string" && typeof v.ko === "string" && v.en.trim() && v.ko.trim() && v.en.length <= max && v.ko.length <= max) return {
		en: v.en,
		ko: v.ko
	};
	issues.push(path);
	return def;
}
/** 값 표(이름 → 값): 기본값에 있는 이름만, 칸마다 범위 확인 */
function table(v, def, range, path, issues) {
	if (v === void 0) return { ...def };
	if (!isObj$1(v)) {
		issues.push(path);
		return { ...def };
	}
	const out = {};
	for (const k of Object.keys(def)) out[k] = num(v[k], def[k], range, `${path}.${k}`, issues);
	return out;
}
function learnRule(v, d, path, issues) {
	return {
		correctPerReward: num(v?.correctPerReward, d.correctPerReward, [1, 100], `${path}.correctPerReward`, issues),
		dailyRewardsPerMode: num(v?.dailyRewardsPerMode, d.dailyRewardsPerMode, RANGES.dailyRewards, `${path}.dailyRewardsPerMode`, issues),
		bonusRounds: num(v?.bonusRounds, d.bonusRounds, RANGES.dailyRewards, `${path}.bonusRounds`, issues),
		bonusCoins: num(v?.bonusCoins, d.bonusCoins, RANGES.modeCoins, `${path}.bonusCoins`, issues)
	};
}
var DAY_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
var ID_RE = /^[a-z0-9][a-z0-9-]*$/;
function validItemPatch(v, i, base, seasons, issues) {
	const path = `items[${i}]`;
	if (!isObj$1(v) || typeof v.id !== "string" || !ID_RE.test(v.id)) {
		issues.push(path);
		return null;
	}
	const out = { id: v.id };
	if (v.add === true) {
		const it = v.item;
		if (base.has(v.id) || !isObj$1(it) || it.id !== v.id || typeof it.tpl !== "string" || !TEMPLATES[it.tpl]) {
			issues.push(path);
			return null;
		}
		const full = {
			tier: "free",
			tags: [],
			rooms: "any",
			tplVersion: 1,
			...it,
			price: num(it.price, 0, RANGES.item, `${path}.item.price`, issues)
		};
		if (validateItem(full, [...base.values()]).errors.length) {
			issues.push(`${path}.item`);
			return null;
		}
		out.add = true;
		out.item = full;
		return out;
	}
	if (!base.has(v.id)) {
		issues.push(`${path}.id`);
		return null;
	}
	if (v.price !== void 0) {
		const p = num(v.price, -1, RANGES.item, `${path}.price`, issues);
		if (p >= 0) out.price = p;
	}
	if (v.hidden !== void 0) {
		if (typeof v.hidden === "boolean") out.hidden = v.hidden;
		else issues.push(`${path}.hidden`);
	}
	if (v.name !== void 0) {
		const n = text(v.name, {
			en: "",
			ko: ""
		}, `${path}.name`, issues, RANGES.name);
		if (n.en) out.name = n;
	}
	if (v.cat !== void 0) {
		if (typeof v.cat === "string" && v.cat.length <= 40) out.cat = v.cat;
		else issues.push(`${path}.cat`);
	}
	if (v.season !== void 0) {
		if (v.season === null || typeof v.season === "string" && seasons.has(v.season)) out.season = v.season;
		else issues.push(`${path}.season`);
	}
	if (v.badge !== void 0) {
		if (v.badge === null || typeof v.badge === "string" && ID_RE.test(v.badge)) out.badge = v.badge;
		else issues.push(`${path}.badge`);
	}
	return out;
}
/**
* 받은 설정 검증: 모르는 칸은 무시, 칸마다 모양·범위가 틀리면 그 칸만 기본값. issues = 기본값으로 바꾼 칸(관리자 화면 이유·bridge.report '설정 오류').
* 모양이 아예 틀리면(객체가 아님) 전부 기본값.
*/
function validateConfig(raw) {
	const d = DEFAULT_CONFIG, issues = [];
	if (!isObj$1(raw)) return {
		config: clone(d),
		issues: raw === void 0 || raw === null ? [] : ["(shape)"]
	};
	const o = (x, k, path) => {
		const v = isObj$1(x) ? x[k] : void 0;
		if (v === void 0) return void 0;
		if (!isObj$1(v)) {
			issues.push(`${path}${k}`);
			return;
		}
		return v;
	};
	const P = o(raw, "prices", ""), R = o(raw, "rewards", ""), M = o(raw, "missions", ""), S = o(raw, "switches", ""), L = o(raw, "limits", "");
	const room = o(P, "room", "prices."), ext = o(P, "exterior", "prices."), site = o(R, "site", "rewards.");
	const sl = o(site, "learning", "rewards.site."), lbm = o(site, "learningByMode", "rewards.site."), sc = o(site, "coins", "rewards.site."), sm = o(site, "mission", "rewards.site.");
	const letters = o(M, "letters", "missions."), rm = o(L, "roundMax", "limits."), dm = o(L, "dailyMax", "limits.");
	let seasons = clone(d.seasons);
	if (raw.seasons !== void 0) {
		if (!Array.isArray(raw.seasons)) issues.push("seasons");
		else seasons = raw.seasons.filter((s, i) => {
			const good = isObj$1(s) && typeof s.id === "string" && ID_RE.test(s.id) && typeof s.from === "string" && DAY_RE.test(s.from) && typeof s.to === "string" && DAY_RE.test(s.to) && isObj$1(s.name);
			if (!good) issues.push(`seasons[${i}]`);
			return good;
		}).map((s, i) => ({
			id: s.id,
			from: s.from,
			to: s.to,
			name: text(s.name, {
				en: s.id,
				ko: s.id
			}, `seasons[${i}].name`, issues, RANGES.name)
		}));
	}
	const seasonIds = new Set(seasons.map((s) => s.id));
	const base = new Map(bundledItems().items.map((i) => [i.id, i]));
	const itemPatches = [];
	if (raw.items !== void 0) {
		if (!Array.isArray(raw.items)) issues.push("items");
		else {
			const seen = /* @__PURE__ */ new Set();
			raw.items.forEach((v, i) => {
				const p = validItemPatch(v, i, base, seasonIds, issues);
				if (p && !seen.has(p.id)) {
					seen.add(p.id);
					itemPatches.push(p);
				} else if (p) issues.push(`items[${i}].id`);
			});
		}
	}
	let requests = clone(d.missions.requests);
	if (M?.requests !== void 0) {
		if (!Array.isArray(M.requests)) issues.push("missions.requests");
		else for (const [i, v] of M.requests.entries()) {
			const r = isObj$1(v) ? requests.find((x) => x.id === v.id) : void 0;
			if (r && typeof v.hidden === "boolean") r.hidden = v.hidden;
			else {
				issues.push(`missions.requests[${i}]`);
				continue;
			}
			const vv = v;
			if (vv.n !== void 0) {
				const n = num(vv.n, -1, RANGES.reqN, `missions.requests.${i}.n`, issues);
				if (n > 0) r.n = n;
			}
			if (vv.name !== void 0) {
				const n = text(vv.name, {
					en: "",
					ko: ""
				}, `missions.requests.${i}.name`, issues, RANGES.name);
				if (n.en) r.name = n;
			}
			if (vv.gift !== void 0) {
				const g = typeof vv.gift === "string" ? base.get(vv.gift) : void 0;
				if (g && g.tags.includes("exclusive")) r.gift = g.id;
				else issues.push(`missions.requests.${i}.gift`);
			}
		}
	}
	const festivals = clone(d.missions.festivals);
	const fv = o(M, "festivals", "missions.");
	if (fv) for (const s of Object.keys(festivals)) {
		const v = fv[s];
		if (v === void 0) continue;
		if (Array.isArray(v) && v.length && v.every((x) => typeof x === "string" && base.has(x))) festivals[s] = v;
		else issues.push(`missions.festivals.${s}`);
	}
	const pick = (v, opts, def, path) => v === void 0 ? def : opts.includes(v) ? v : (issues.push(path), def);
	const trial = S?.trialAccounts === void 0 ? [] : Array.isArray(S.trialAccounts) && S.trialAccounts.every((x) => typeof x === "string" && x.length <= 80) ? S.trialAccounts : (issues.push("switches.trialAccounts"), []);
	return {
		config: {
			version: num(raw.version, 0, [0, 1e9], "version", issues),
			channel: pick(raw.channel, ["live", "draft"], "live", "channel"),
			prices: {
				room: {
					small: num(room?.small, d.prices.room.small, RANGES.room, "prices.room.small", issues),
					medium: num(room?.medium, d.prices.room.medium, RANGES.room, "prices.room.medium", issues),
					large: num(room?.large, d.prices.room.large, RANGES.room, "prices.room.large", issues)
				},
				garden: num(P?.garden, d.prices.garden, RANGES.plot, "prices.garden", issues),
				lot: num(P?.lot, d.prices.lot, RANGES.plot, "prices.lot", issues),
				garage: num(P?.garage, d.prices.garage, RANGES.plot, "prices.garage", issues),
				exterior: {
					mat: table(ext?.mat, d.prices.exterior.mat, RANGES.exterior, "prices.exterior.mat", issues),
					roofKind: table(ext?.roofKind, d.prices.exterior.roofKind, RANGES.exterior, "prices.exterior.roofKind", issues),
					fenceKind: table(ext?.fenceKind, d.prices.exterior.fenceKind, RANGES.exterior, "prices.exterior.fenceKind", issues),
					path: table(ext?.path, d.prices.exterior.path, RANGES.exterior, "prices.exterior.path", issues),
					color: num(ext?.color, d.prices.exterior.color, RANGES.exterior, "prices.exterior.color", issues)
				},
				asmrToy: table(P?.asmrToy, d.prices.asmrToy, RANGES.asmrToy, "prices.asmrToy", issues),
				asmrBox: num(P?.asmrBox, d.prices.asmrBox, RANGES.asmrBox, "prices.asmrBox", issues),
				roomDecor: num(P?.roomDecor, d.prices.roomDecor, RANGES.exterior, "prices.roomDecor", issues)
			},
			rewards: {
				quest: num(R?.quest, d.rewards.quest, RANGES.houseReward, "rewards.quest", issues),
				walk: num(R?.walk, d.rewards.walk, RANGES.houseReward, "rewards.walk", issues),
				site: {
					learning: learnRule(sl, d.rewards.site.learning, "rewards.site.learning", issues),
					learningByMode: {
						tt: learnRule(o(lbm, "tt", "rewards.site.learningByMode."), d.rewards.site.learningByMode.tt, "rewards.site.learningByMode.tt", issues),
						typing: learnRule(o(lbm, "typing", "rewards.site.learningByMode."), d.rewards.site.learningByMode.typing, "rewards.site.learningByMode.typing", issues)
					},
					coins: {
						quiz: num(sc?.quiz, d.rewards.site.coins.quiz, RANGES.modeCoins, "rewards.site.coins.quiz", issues),
						spelling: num(sc?.spelling, d.rewards.site.coins.spelling, RANGES.modeCoins, "rewards.site.coins.spelling", issues),
						flashcards: num(sc?.flashcards, d.rewards.site.coins.flashcards, RANGES.modeCoins, "rewards.site.coins.flashcards", issues),
						timesTable: num(sc?.timesTable, d.rewards.site.coins.timesTable, RANGES.modeCoins, "rewards.site.coins.timesTable", issues),
						typing: num(sc?.typing, d.rewards.site.coins.typing, RANGES.modeCoins, "rewards.site.coins.typing", issues),
						review: num(sc?.review, d.rewards.site.coins.review, RANGES.bigReward, "rewards.site.coins.review", issues),
						dailyMission: num(sc?.dailyMission, d.rewards.site.coins.dailyMission, RANGES.bigReward, "rewards.site.coins.dailyMission", issues),
						missionRetry: num(sc?.missionRetry, d.rewards.site.coins.missionRetry, RANGES.bigReward, "rewards.site.coins.missionRetry", issues)
					},
					mission: {
						goal: num(sm?.goal, d.rewards.site.mission.goal, [5, 100], "rewards.site.mission.goal", issues),
						retryMaxFree: num(sm?.retryMaxFree, d.rewards.site.mission.retryMaxFree, RANGES.dailyRewards, "rewards.site.mission.retryMaxFree", issues)
					},
					badge: num(site?.badge, d.rewards.site.badge, RANGES.bigReward, "rewards.site.badge", issues)
				}
			},
			items: itemPatches,
			seasons,
			missions: {
				festivalGoal: num(M?.festivalGoal, d.missions.festivalGoal, RANGES.festivalGoal, "missions.festivalGoal", issues),
				gardenGrow: num(M?.gardenGrow, d.missions.gardenGrow, RANGES.gardenGrow, "missions.gardenGrow", issues),
				rules: ((ru) => ({
					letterWords: num(ru?.letterWords, d.missions.rules.letterWords, RANGES.letterWords, "missions.rules.letterWords", issues),
					letterStampsPerGift: num(ru?.letterStampsPerGift, d.missions.rules.letterStampsPerGift, RANGES.stampsPerGift, "missions.rules.letterStampsPerGift", issues),
					stampEvery: num(ru?.stampEvery, d.missions.rules.stampEvery, RANGES.stampEvery, "missions.rules.stampEvery", issues),
					roomWords: num(ru?.roomWords, d.missions.rules.roomWords, RANGES.roomWords, "missions.rules.roomWords", issues)
				}))(o(M, "rules", "missions.")),
				letters: {
					body: text(letters?.body, d.missions.letters.body, "missions.letters.body", issues),
					praise: text(letters?.praise, d.missions.letters.praise, "missions.letters.praise", issues)
				},
				requests,
				festivals
			},
			switches: {
				HOUSE3D: pick(S?.HOUSE3D, [
					"off",
					"admin",
					"trial",
					"all"
				], d.switches.HOUSE3D, "switches.HOUSE3D"),
				MOVE: pick(S?.MOVE, ["off", "on"], d.switches.MOVE, "switches.MOVE"),
				trialAccounts: trial
			},
			limits: {
				roundMax: {
					guest: num(rm?.guest, d.limits.roundMax.guest, RANGES.guestDaily, "limits.roundMax.guest", issues),
					free: num(rm?.free, d.limits.roundMax.free, RANGES.freeDaily, "limits.roundMax.free", issues),
					paid: num(rm?.paid, d.limits.roundMax.paid, RANGES.paidRound, "limits.roundMax.paid", issues)
				},
				dailyMax: {
					guest: num(dm?.guest, d.limits.dailyMax.guest, RANGES.guestDaily, "limits.dailyMax.guest", issues),
					free: num(dm?.free, d.limits.dailyMax.free, RANGES.freeDaily, "limits.dailyMax.free", issues)
				},
				guestRounds: num(L?.guestRounds, d.limits.guestRounds, [0, 10], "limits.guestRounds", issues),
				freeWordTrial: num(L?.freeWordTrial, d.limits.freeWordTrial, [0, 100], "limits.freeWordTrial", issues),
				freeWrong: num(L?.freeWrong, d.limits.freeWrong, [0, 100], "limits.freeWrong", issues),
				photoDaily: num(L?.photoDaily, d.limits.photoDaily, [0, 200], "limits.photoDaily", issues)
			}
		},
		issues
	};
}
/** 관리자 화면 '크게 바뀌어요' 확인: 숫자 칸 중 기존 값의 ±50%를 넘게 바뀐 칸(막지는 않음) */
function bigChanges(before, after) {
	const out = [];
	const walk = (a, b, path) => {
		if (typeof a === "number" && typeof b === "number") {
			if (a === 0 ? b !== 0 : Math.abs(b - a) / a > .5) out.push(path);
			return;
		}
		if (isObj$1(a) && isObj$1(b)) for (const k of Object.keys(a)) walk(a[k], b[k], path ? `${path}.${k}` : k);
	};
	walk(before.prices, after.prices, "prices");
	walk(before.rewards, after.rewards, "rewards");
	walk(before.limits, after.limits, "limits");
	walk({
		festivalGoal: before.missions.festivalGoal,
		gardenGrow: before.missions.gardenGrow,
		rules: before.missions.rules
	}, {
		festivalGoal: after.missions.festivalGoal,
		gardenGrow: after.missions.gardenGrow,
		rules: after.missions.rules
	}, "missions");
	const bp = new Map(before.items.map((p) => [p.id, p.price])), base = new Map(bundledItems().items.map((i) => [i.id, i.price]));
	for (const p of after.items) if (p.price !== void 0) {
		const a = bp.get(p.id) ?? base.get(p.id);
		if (a !== void 0 && (a === 0 ? p.price !== 0 : Math.abs(p.price - a) / a > .5)) out.push(`items.${p.id}.price`);
	}
	return out;
}
/**
* 5단계 H8-4 비회원 하루 제한: 하루에 셀 수 있는 최대(사이트 limits.dailyMax.guest). 플래시카드·타이핑은 하루 guestRounds판 × 한 판 최대(roundMax.guest)라
* 그 모드는 둘 중 작은 값
*/
function guestDayCap(cfg, mode) {
	const d = cfg.limits.dailyMax.guest;
	return mode === "flash" || mode === "typing" ? Math.min(d, cfg.limits.roundMax.guest * cfg.limits.guestRounds) : d;
}
/**
* 끝낼 수 있는 숫자인지(H8-4): 주민 부탁 숫자·방 테마 단어 수·축제 하루 몫(한 주 목표 ÷ 7일)이 비회원 하루 제한 안이어야 한다.
* 넘으면 그 칸 경로·필요한 수·최대. 관리자 화면은 '고칠 칸'으로 막고, 서버도 같은 검사(S12). 사이트가 하루 제한을 낮출 때도 같은 검사(S13)
*/
function guestLimitIssues(cfg) {
	const out = [], cap = guestDayCap(cfg);
	for (const d of RESIDENT_DEFAULTS) {
		if (d.n === void 0) continue;
		const n = cfg.missions.requests.find((x) => x.id === d.id)?.n ?? d.n, max = guestDayCap(cfg, d.need?.mode);
		if (n > max) out.push({
			path: `missions.requests.${d.id}.n`,
			need: n,
			max
		});
	}
	if (cfg.missions.rules.roomWords > cap) out.push({
		path: "missions.rules.roomWords",
		need: cfg.missions.rules.roomWords,
		max: cap
	});
	const share = Math.ceil(cfg.missions.festivalGoal / 7);
	if (share > cap) out.push({
		path: "missions.festivalGoal",
		need: share,
		max: cap
	});
	return out;
}
clone(DEFAULT_CONFIG);
// src/hadmin/diff.ts
var isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
/** 물건 덮어쓰기에서 기록하는 칸(add 물건은 H8-3에서 따로) */
var ITEM_KEYS = [
	"price",
	"hidden",
	"cat",
	"season",
	"badge"
];
/** a → b에서 바뀐 칸. 숫자·글자·참거짓 칸만(이름 영어·한국어는 .en·.ko로, 목록은 JSON 글자), 물건은 items.<id>.<칸>, 공개 스위치는 switches.<칸>(사이트 System 탭이 바꾸고 같은 기록에 남김) */
function diffConfig(a, b) {
	const out = [];
	const walk = (x, y, path) => {
		if (isObj(x) || isObj(y)) {
			const keys = /* @__PURE__ */ new Set([...Object.keys(isObj(x) ? x : {}), ...Object.keys(isObj(y) ? y : {})]);
			for (const k of keys) walk(isObj(x) ? x[k] : void 0, isObj(y) ? y[k] : void 0, `${path}.${k}`);
			return;
		}
		if (Array.isArray(x) || Array.isArray(y)) {
			if (JSON.stringify(x) !== JSON.stringify(y)) out.push({
				path,
				before: JSON.stringify(x ?? null),
				after: JSON.stringify(y ?? null)
			});
			return;
		}
		if (x !== y) out.push({
			path,
			before: x ?? null,
			after: y ?? null
		});
	};
	for (const k of [
		"prices",
		"rewards",
		"limits",
		"switches"
	]) walk(a[k], b[k], k);
	const { requests: ra, ...ma } = a.missions, { requests: rb, ...mb } = b.missions;
	walk(ma, mb, "missions");
	for (const id of /* @__PURE__ */ new Set([...ra.map((r) => r.id), ...rb.map((r) => r.id)])) {
		const x = ra.find((r) => r.id === id), y = rb.find((r) => r.id === id);
		for (const k of [
			"hidden",
			"n",
			"gift"
		]) if ((x?.[k] ?? null) !== (y?.[k] ?? null)) out.push({
			path: `missions.requests.${id}.${k}`,
			before: x?.[k] ?? null,
			after: y?.[k] ?? null
		});
		for (const l of ["en", "ko"]) if ((x?.name?.[l] ?? null) !== (y?.name?.[l] ?? null)) out.push({
			path: `missions.requests.${id}.name.${l}`,
			before: x?.name?.[l] ?? null,
			after: y?.name?.[l] ?? null
		});
	}
	const canon = (ss) => JSON.stringify(ss.map((x) => ({
		id: x.id,
		name: {
			en: x.name.en,
			ko: x.name.ko
		},
		from: x.from,
		to: x.to
	})));
	if (canon(a.seasons) !== canon(b.seasons)) out.push({
		path: "seasons",
		before: canon(a.seasons),
		after: canon(b.seasons)
	});
	const pa = new Map(a.items.map((p) => [p.id, p])), pb = new Map(b.items.map((p) => [p.id, p]));
	for (const id of /* @__PURE__ */ new Set([...pa.keys(), ...pb.keys()])) {
		const x = pa.get(id), y = pb.get(id);
		for (const k of ITEM_KEYS) if ((x?.[k] ?? null) !== (y?.[k] ?? null)) out.push({
			path: `items.${id}.${k}`,
			before: x?.[k] ?? null,
			after: y?.[k] ?? null
		});
		for (const l of ["en", "ko"]) if ((x?.name?.[l] ?? null) !== (y?.name?.[l] ?? null)) out.push({
			path: `items.${id}.name.${l}`,
			before: x?.name?.[l] ?? null,
			after: y?.name?.[l] ?? null
		});
		if (x?.add || y?.add) {
			const xa = x?.add ? JSON.stringify(x.item) : null, ya = y?.add ? JSON.stringify(y.item) : null;
			if (xa !== ya) out.push({
				path: `items.${id}.add`,
				before: xa,
				after: ya
			});
		}
	}
	return out;
}
export { DEFAULT_CONFIG, bigChanges, bundledItems, diffConfig, guestLimitIssues, validateConfig };
