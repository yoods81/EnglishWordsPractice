// Koala Study Mate — My Koala House (3D): screens and interaction.
//   KoalaHouse.mount(el, opts)          the floor plan + room editor, inside the page
//   KoalaHouse.mountWardrobe(el, opts)  the 3D koala wardrobe (the Character tab's 3D view)
// opts: { L(en, ko), coins(), unlimited, spend(n, why) -> bool, subs? }
//   subs: { list(kind) -> [{id, name:[ko,en], cost, owned, group}], limit(kind, group), buy(id) -> bool }
(function () {
  "use strict";
  const H = window.KoalaHouse;
  if (!H) return;
  const NS = "http://www.w3.org/2000/svg";

  // The 3D-style koala is a stack of pictures sharing one 680x1024 canvas.
  const KBOX = Object.assign({ base: [64, 222, 617, 968], hoodie: [122, 528, 562, 819], backpack: [131, 545, 560, 832], scarf: [185, 531, 497, 780], glasses: [162, 362, 520, 500], bushhat: [108, 188, 574, 441], partyhat: [259, 100, 422, 290], crown: [249, 190, 433, 295] }, {"bluecap": [151, 180, 530, 403], "gradhat": [135, 133, 546, 400], "flowercrown": [139, 198, 540, 415], "wizardhat": [189, 22, 492, 345], "santahat": [70, 111, 589, 376], "beanie": [150, 89, 534, 419], "cowboyhat": [76, 123, 607, 327], "chefhat": [171, 42, 514, 297], "bunnyears": [166, 66, 508, 362]}, {"sunglasses": [151, 369, 531, 495], "starglasses": [151, 344, 541, 507], "heartglasses": [187, 364, 494, 509], "cateye": [142, 352, 540, 499], "goggles": [142, 352, 540, 493], "eyepatch": [228, 269, 536, 485], "moustache": [250, 462, 436, 528], "freckles": [176, 456, 506, 517], "monocle": [356, 362, 499, 503]}, {"pearlnecklace": [233, 546, 451, 633], "goldchain": [233, 551, 448, 653], "heartpendant": [276, 555, 409, 664], "starpendant": [271, 560, 409, 662], "diamondpendant": [270, 556, 412, 662], "bowtie": [240, 528, 443, 631], "rubybrooch": [352, 572, 439, 694], "goldmedal": [246, 552, 430, 765]}, {"tshirt": [148, 539, 537, 821], "stripeshirt": [104, 543, 579, 815], "pinkdress": [117, 544, 566, 848], "labcoat": [119, 538, 564, 866], "overalls": [149, 549, 536, 935], "jersey": [131, 548, 560, 826]}, {"herocape": [146, 705, 539, 875], "angelwings": [68, 281, 616, 642], "butterflywings": [73, 432, 607, 790], "surfboard": [243, 32, 564, 584]}, {"sneakers": [214, 867, 470, 965], "rainboots": [198, 832, 488, 978], "cowboyboots": [189, 815, 493, 978], "balletshoes": [199, 850, 485, 987], "bunnyslippers": [185, 837, 497, 978], "soccercleats": [192, 882, 490, 975], "sandals": [199, 875, 485, 970], "rollerskates": [183, 845, 500, 1030]}, {"jeans": [181, 703, 502, 895], "khakishorts": [180, 680, 505, 894], "plaidskirt": [151, 609, 530, 861], "tutu": [97, 659, 588, 862], "cargopants": [178, 698, 505, 895], "sweatpants": [180, 648, 504, 895], "denimskirt": [153, 652, 524, 863], "flowerskirt": [137, 649, 549, 872]});
  const K3 = {"base":[52,20,1051,1361],"backpack":[52,320,1013,1201],"herocape":[104,643,983,1276],"angelwings":[29,333,1103,1361],"butterflywings":[162,331,1008,1361],"surfboard":[80,7,1058,1359],"bushhat":[97,17,1046,493],"partyhat":[190,1,763,512],"crown":[189,34,769,466],"bluecap":[190,32,896,507],"gradhat":[189,27,1054,472],"flowercrown":[189,122,956,480],"wizardhat":[59,1,1059,780],"santahat":[114,9,893,617],"beanie":[188,2,1052,545],"cowboyhat":[187,17,1042,478],"chefhat":[81,0,1024,734],"bunnyears":[80,0,982,691]}; // 3/4-back sitting pictures: [x0,y0,x1,y1] in source pixels
  const KISO = {"angelwings":[105.7,252.2,578.3,670.8],"backpack":[205.2,469.2,485.8,907.8],"balletshoes":[244.6,870.0,398.4,976.0],"beanie":[162.5,114.9,508.8,480.9],"bluecap":[123.3,184.7,503.3,407.0],"bowtie":[258.2,516.8,424.8,642.2],"bunnyears":[187.6,123.0,487.0,461.2],"bunnyslippers":[244.6,885.6,398.4,976.0],"bushhat":[94.7,187.7,588.5,426.4],"butterflywings":[173.9,323.2,506.1,898.8],"cargopants":[196.0,794.0,457.0,924.0],"cateye":[167.3,341.3,514.7,509.7],"chefhat":[190.1,139.3,509.3,413.3],"cowboyboots":[244.6,849.1,398.4,976.0],"cowboyhat":[105.5,177.4,579.8,405.8],"crown":[262.4,173.1,429.4,288.7],"denimskirt":[200.0,799.0,457.0,949.0],"diamondpendant":[283.4,543.7,398.6,674.3],"eyepatch":[232.7,265.6,531.3,488.4],"flowercrown":[146.9,190.9,528.7,418.9],"flowerskirt":[197.0,802.0,468.0,945.0],"freckles":[215.9,446.3,466.1,526.7],"glasses":[170.1,358.7,511.9,503.3],"goggles":[177.5,336.7,504.5,508.3],"goldchain":[259.3,534.5,421.7,669.5],"goldmedal":[242.6,555.8,433.4,761.2],"gradhat":[130.3,183.9,564.9,436.5],"heartglasses":[181.4,366.6,499.6,506.4],"heartpendant":[278.7,552.7,406.3,666.3],"herocape":[242.8,622.4,442.2,957.6],"hoodie":[109.0,565.0,552.0,840.0],"jeans":[214.0,799.0,445.0,949.0],"jersey":[138.0,569.0,498.0,852.0],"khakishorts":[200.0,795.0,450.0,932.0],"labcoat":[154.0,551.0,499.0,857.0],"monocle":[363.3,354.0,491.7,511.0],"moustache":[264.7,455.8,421.3,534.2],"overalls":[162.0,588.0,471.0,958.0],"partyhat":[251.0,194.3,409.3,390.0],"pearlnecklace":[264.1,528.7,419.9,650.3],"pinkdress":[166.0,581.0,486.0,854.0],"plaidskirt":[194.0,796.0,467.0,933.0],"rainboots":[244.6,842.9,398.4,976.0],"rollerskates":[244.6,868.0,398.4,976.0],"rubybrooch":[357.8,562.7,433.2,703.3],"sandals":[244.6,905.7,398.4,976.0],"santahat":[134.7,133.1,583.4,439.5],"scarf":[200.0,596.0,400.0,788.4],"sneakers":[244.6,872.0,398.4,976.0],"soccercleats":[244.6,907.4,398.4,976.0],"starglasses":[158.1,340.9,533.9,510.1],"starpendant":[290.1,540.5,389.9,681.5],"stripeshirt":[83.0,591.0,562.0,834.0],"sunglasses":[174.8,360.0,507.2,504.0],"surfboard":[244.7,29.1,562.3,586.9],"sweatpants":[216.0,799.0,440.0,950.0],"tshirt":[148.0,592.0,523.0,842.0],"tutu":[170.0,803.0,495.0,943.0],"wizardhat":[182.1,105.2,503.3,410.0]};   // 3/4-view item pictures (img/koala/<item>_iso.webp) for the iso body: [x0,y0,x1,y1] in KBOX units (made by scripts/cut-iso-items.py)
  const KISOB = {"bushhat":[227.8,187.9,452.2,345.0],"partyhat":[283.3,186.9,406.7,345.0],"crown":[275.1,224.1,414.9,322.0],"bluecap":[259.9,236.1,420.1,335.0],"gradhat":[185.0,129.0,485.0,308],"wizardhat":[188.1,25.7,481.9,308],"santahat":[185.0,74.9,485.0,308],"chefhat":[185.0,72.2,485.0,308],"bunnyears":[185.0,48.6,485.0,308],"scarf":[257.0,596.0,457.0,838.1],"hoodie":[116.0,590.0,528.0,841.0],"tshirt":[124.0,585.0,507.0,840.0],"stripeshirt":[93.0,597.0,556.0,833.0],"pinkdress":[108.0,560.0,538.0,843.0],"labcoat":[153.0,593.0,508.0,845.0],"overalls":[171.0,591.0,499.0,921.0],"jersey":[120.0,589.0,520.0,842.0],"jeans":[224.0,802.0,443.0,954.0],"khakishorts":[211.0,804.0,448.0,944.0],"cargopants":[206.0,801.0,448.0,946.0],"sweatpants":[227.0,798.0,432.0,949.0],"plaidskirt":[187.0,794.0,474.0,923.0],"denimskirt":[195.0,796.0,464.0,944.0],"flowerskirt":[187.0,797.0,469.0,932.0],"tutu":[156.0,799.0,506.0,926.0],"sneakers":[252.1,884.5,399.9,976.0],"rainboots":[252.1,845.7,399.9,976.0],"cowboyboots":[252.1,829.3,399.9,976.0],"balletshoes":[252.1,893.1,399.9,976.0],"bunnyslippers":[252.1,872.3,399.9,976.0],"soccercleats":[252.1,882.5,399.9,976.0],"sandals":[252.1,893.0,399.9,976.0],"rollerskates":[252.1,839.6,399.9,976.0],"backpack":[189.3,519.8,499.2,856.5],"herocape":[237.9,653.4,445.5,926.1],"angelwings":[76.0,302.8,606.5,618.8]};   // item pictures for the iso BACK body (img/koala/<item>_isob.webp), [x0,y0,x1,y1] in KBOX units (scripts/cut-view-items.py)
  const KISOL = {"bushhat":[80,37,459,337],"partyhat":[103,3,391,279],"crown":[60,1,628,398],"bluecap":[127,58,459,339],"gradhat":[60,1,628,398],"flowercrown":[78,53,583,398],"wizardhat":[64,3,628,398],"santahat":[67,12,585,398],"beanie":[87,12,454,380],"cowboyhat":[60,1,457,398],"chefhat":[60,1,324,297],"bunnyears":[60,1,560,398],"sunglasses":[150,150,508,459],"starglasses":[152,150,526,445],"heartglasses":[155,150,497,450],"cateye":[150,162,441,369],"goggles":[157,150,511,418],"eyepatch":[150,150,483,317],"moustache":[333,229,515,405],"goldchain":[371,279,628,504],"starpendant":[504,297,599,455],"bowtie":[382,277,599,482],"rubybrooch":[515,340,632,434],"goldmedal":[405,292,621,479],"hoodie":[360,247,926,628],"tshirt":[373,270,802,612],"stripeshirt":[373,272,808,606],"pinkdress":[360,254,887,628],"labcoat":[380,265,822,628],"overalls":[369,254,968,628],"jersey":[439,261,890,547],"cargopants":[657,328,1088,689],"sweatpants":[655,331,1090,689],"plaidskirt":[648,310,1088,698],"denimskirt":[651,331,1088,689],"flowerskirt":[630,312,964,694],"tutu":[630,310,982,696],"rainboots":[750,326,1088,685],"cowboyboots":[750,306,1079,689],"balletshoes":[777,319,1079,691],"bunnyslippers":[750,297,1081,646],"soccercleats":[782,317,1088,685],"sandals":[770,317,1088,700],"rollerskates":[768,319,1115,707],"glasses":[160.5,58.0,583.5,482.0],"freckles":[212.5,122.0,591.5,502.0],"monocle":[306.6,97.2,546.6,336.2],"pearlnecklace":[389.3,273.7,602.3,478.7],"scarf":[362.7,306.5,628.7,614.5],"heartpendant":[405.3,306.1,609.3,525.1],"diamondpendant":[412.2,310.3,597.2,519.3]};   // item pictures for the LYING picture (img/koala/<item>_isol.webp), [x0,y0,x1,y1] in iso_lie.webp pixels (scripts/cut-view-items.py)
  const KBEHIND = ["herocape", "angelwings", "butterflywings", "surfboard", "backpack"];   // drawn under the body in the front views (from behind they are over it)
  const kordered = (worn) => { const w = Object.values(worn || {}); return KBEHIND.filter((n) => w.includes(n)).concat(["base"], KORDER.filter((n) => w.includes(n))); };
  const KORDER = ["backpack", "hoodie", "tshirt", "stripeshirt", "pinkdress", "labcoat", "overalls", "jersey", "jeans", "khakishorts", "cargopants", "sweatpants", "plaidskirt", "denimskirt", "flowerskirt", "tutu", "sneakers", "rainboots", "cowboyboots", "balletshoes", "bunnyslippers", "soccercleats", "sandals", "rollerskates", "scarf", "pearlnecklace", "goldchain", "heartpendant", "starpendant", "diamondpendant", "bowtie", "rubybrooch", "goldmedal", "glasses", "bushhat", "partyhat", "crown", "bluecap", "gradhat", "flowercrown", "wizardhat", "santahat", "beanie", "cowboyhat", "chefhat", "bunnyears", "sunglasses", "starglasses", "heartglasses", "cateye", "goggles", "eyepatch", "moustache", "freckles", "monocle"];
  const KSLOT = { hat: ["bushhat", "partyhat", "crown", "bluecap", "gradhat", "flowercrown", "wizardhat", "santahat", "beanie", "cowboyhat", "chefhat", "bunnyears"], face: ["glasses", "sunglasses", "starglasses", "heartglasses", "cateye", "goggles", "eyepatch", "moustache", "freckles", "monocle"], neck: ["scarf", "pearlnecklace", "goldchain", "heartpendant", "starpendant", "diamondpendant", "bowtie", "rubybrooch", "goldmedal"], body: ["hoodie", "tshirt", "stripeshirt", "pinkdress", "labcoat", "overalls", "jersey"], legs: ["jeans", "khakishorts", "cargopants", "sweatpants", "plaidskirt", "denimskirt", "flowerskirt", "tutu"], back: ["backpack", "herocape", "angelwings", "butterflywings", "surfboard"], feet: ["sneakers", "rainboots", "cowboyboots", "balletshoes", "bunnyslippers", "soccercleats", "sandals", "rollerskates"] };
  const KNAME = { bushhat: ["부시햇", "Bush Hat"], partyhat: ["파티 모자", "Party Hat"], crown: ["왕관", "Crown"], bluecap: ["파란 모자", "Blue Cap"], gradhat: ["졸업 모자", "Graduation Hat"], flowercrown: ["꽃 왕관", "Flower Crown"], wizardhat: ["마법사 모자", "Wizard Hat"], santahat: ["산타 모자", "Santa Hat"], beanie: ["털모자", "Winter Beanie"], cowboyhat: ["카우보이 모자", "Cowboy Hat"], chefhat: ["요리사 모자", "Chef Hat"], bunnyears: ["토끼 귀", "Bunny Ears"], glasses: ["안경", "Glasses"], sunglasses: ["선글라스", "Sunglasses"], starglasses: ["별 안경", "Star Glasses"], heartglasses: ["하트 안경", "Heart Glasses"], cateye: ["캣아이 안경", "Cat-eye Glasses"], goggles: ["수영 고글", "Swim Goggles"], eyepatch: ["안대", "Eye Patch"], moustache: ["콧수염", "Moustache"], freckles: ["주근깨", "Freckles"], monocle: ["외알 안경", "Monocle"], scarf: ["목도리", "Scarf"], pearlnecklace: ["진주 목걸이", "Pearl Necklace"], goldchain: ["금 목걸이", "Gold Chain"], heartpendant: ["하트 펜던트", "Heart Pendant"], starpendant: ["별 펜던트", "Star Pendant"], diamondpendant: ["다이아 펜던트", "Diamond Pendant"], bowtie: ["나비넥타이", "Bow Tie"], rubybrooch: ["루비 브로치", "Ruby Brooch"], goldmedal: ["금메달", "Gold Medal"], hoodie: ["후드티", "Hoodie"], tshirt: ["빨간 티셔츠", "Red T-shirt"], stripeshirt: ["줄무늬 셔츠", "Striped Shirt"], pinkdress: ["분홍 원피스", "Pink Dress"], labcoat: ["과학자 가운", "Lab Coat"], overalls: ["멜빵바지", "Overalls"], jersey: ["축구 유니폼", "Soccer Jersey"], backpack: ["배낭", "Backpack"], herocape: ["영웅 망토", "Hero Cape"], angelwings: ["천사 날개", "Angel Wings"], butterflywings: ["나비 날개", "Butterfly Wings"], surfboard: ["서핑보드", "Surfboard"], sneakers: ["운동화", "Sneakers"], rainboots: ["노란 장화", "Rain Boots"], cowboyboots: ["카우보이 부츠", "Cowboy Boots"], balletshoes: ["발레 슈즈", "Ballet Shoes"], bunnyslippers: ["토끼 슬리퍼", "Bunny Slippers"], soccercleats: ["축구화", "Soccer Cleats"], sandals: ["샌들", "Sandals"], rollerskates: ["롤러스케이트", "Roller Skates"], jeans: ["청바지", "Jeans"], khakishorts: ["카키 반바지", "Khaki Shorts"], cargopants: ["카고 바지", "Cargo Pants"], sweatpants: ["남색 조거팬츠", "Jogger Pants"], plaidskirt: ["체크 치마", "Plaid Skirt"], denimskirt: ["청치마", "Denim Skirt"], flowerskirt: ["꽃무늬 치마", "Flower Skirt"], tutu: ["튀튀 치마", "Tutu"] };
  // Admin-added clothing: id -> { src, box:[x0,y0,x1,y1] }. Their picture lives on the server and
  // their place on the koala is the admin's saved "fit" (see syncCustomWard / koala-admin-items.js).
  const CUSTOM_WARD = {};
  const kimg = (n) => (CUSTOM_WARD[n] ? CUSTOM_WARD[n].src : `/img/koala/${n}.webp`);
  const kthumb = (n) => (CUSTOM_WARD[n] ? CUSTOM_WARD[n].src : `/img/koala/th/${n}.webp`);   // clean product-style picture for the shop grids

  let ses = null;           // the house session
  let curOpts = null;       // opts of whatever is mounted (for T)
  let memo = { screen: "plan", roomId: null };   // where the player was, to come back to after the page redraws
  let extraImg = {};        // optional koala pictures from the manifest: { back, sit }

  /* ------------------------------ small helpers ------------------------------ */
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const T = (ko, en) => curOpts.L(en, ko);
  const nm = (d) => T(d.name[0], d.name[1]);
  const COIN = '<span class="kh-coin" aria-hidden="true"></span>';
  // line icons (24 x 24, drawn with the text colour) used by every button
  const ICONS = {
    rotl: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    rot: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    chevL: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5" stroke-width="3"/>',
    right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    up: '<path d="M14 9 9 4 4 9"/><path d="M20 20h-7a4 4 0 0 1-4-4V4"/>',
    sit: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
    lie: '<path d="M2 18h20"/><path d="M2 18v-6h13a4 4 0 0 1 4 4v2"/><circle cx="6.5" cy="8.5" r="2.2"/>',
    stand: '<circle cx="12" cy="5" r="2"/><path d="M12 7v7"/><path d="M8 11h8"/><path d="m9 22 3-8 3 8"/>',
    inside: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  };
  const ic = (n) => `<svg class="kh-i" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[n] || ""}</svg>`;

  const roomDef = (id) => H.roomOf(ses.S, id);
  const roomState = (id) => H.stateOf(ses.S, id);
  const curRoom = () => roomDef(ses.roomId);
  const curState = () => roomState(ses.roomId);
  const roomLabel = (r) => T(r.label[0], r.label[1]);
  const save = () => H.persist(ses.S);
  const ownedItem = (d) => d.price === 0 || !!ses.S.owned[d.id];

  const coinsText = () => (curOpts.unlimited ? "∞" : Number(curOpts.coins()).toLocaleString());
  function refreshCoins() { if (ses) ses.root.querySelectorAll("[data-kh-coins]").forEach((e) => { e.textContent = coinsText(); }); }
  let wardHost = null, modalEl = null;   // the 3D wardrobe has no room session: its popups hang off its own root
  function toast(msg, bad) {
    if (!ses) { if (wardHost) { wardMsg = bad ? msg : ""; } return; }
    const t = ses.root.querySelector(".kh-toast");
    if (!t) return;
    t.textContent = msg; t.className = "kh-toast on" + (bad ? " bad" : "");
    clearTimeout(ses.toastT);
    ses.toastT = setTimeout(() => { t.className = "kh-toast"; }, 2200);
  }

  /* ------------------------------ mount / close ------------------------------ */
  function mount(root, opts) {
    if (ses) destroy();
    curOpts = opts;
    const S = H.load();
    ses = { opts, S, root, screen: "plan", roomId: null, edit: true, sel: null, tab: "furniture", drag: null, zoom: 1, full: false,
      koala: { c: 2, r: 3, dir: 1, pose: "stand", z: 0, seat: null, exit: null, path: [], wait: 1.2, bob: 0, sitT: 0, after: null } };
    root.className = "kh-app kh-embed";
    fit(root);
    root.setAttribute("aria-label", T("내 집", "My House"));
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    ses.last = performance.now();
    ses.raf = requestAnimationFrame(loop);
    const back = memo.roomId && memo.screen === "room" ? roomDef(memo.roomId) : null;
    if (back) openRoom(memo.roomId); else renderPlan();
    Promise.all([
      fetch("/img/house/manifest.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      // Admin-added House items' pictures (migrations/0014_koala_items.sql),
      // reshaped server-side into this same manifest format — merged in, not
      // replacing a single hand-placed AI picture above. H.loadCatalog() fills
      // in D (the catalog itself) in parallel so both land before the redraw.
      fetch("/api/items/manifest?kind=house").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      H.loadCatalog ? H.loadCatalog() : Promise.resolve(),
    ]).then(([m, custom]) => {
      const merged = Object.assign({}, m, custom);
      if (!ses || !Object.keys(merged).length) return;
      H.setManifest(merged);
      extraImg = { back: merged["koala:back"] && merged["koala:back"].src, sit: merged["koala:sit"] && merged["koala:sit"].src, sitback: merged["koala:sitback"] && merged["koala:sitback"].src, read: merged["koala:read"] && merged["koala:read"].src,
        // pictures drawn along the room's own diagonal (3/4 views): stand / sit, facing front-left and back-left (the right-hand ones are the mirror), and lying
        isoStandF: merged["koala:iso_stand_f"] && merged["koala:iso_stand_f"].src, isoStandB: merged["koala:iso_stand_b"] && merged["koala:iso_stand_b"].src, isoSitF: merged["koala:iso_sit_f"] && merged["koala:iso_sit_f"].src, isoSitB: merged["koala:iso_sit_b"] && merged["koala:iso_sit_b"].src, isoLie: merged["koala:iso_lie"] && merged["koala:iso_lie"].src };
      if (ses.screen === "room") drawScene(); else renderPlan();
    }).catch(() => {});
  }
  // an admin just added an item: fetch the pictures again so it is not stuck as a grey box until a reload
  async function reloadManifest() {
    const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    const [m, custom] = await Promise.all([get("/img/house/manifest.json"), get("/api/items/manifest?kind=house")]);
    H.setManifest(Object.assign({}, m, custom));
  }
  function destroy() {
    if (!ses) return;
    cancelAnimationFrame(ses.raf);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    if (ses.drag) { window.removeEventListener("pointermove", ses.drag.mv); window.removeEventListener("pointerup", ses.drag.up); window.removeEventListener("pointercancel", ses.drag.cn); if (ses.drag.ghostEl) ses.drag.ghostEl.remove(); }
    document.body.classList.remove("kh-open");
    ses.root.classList.remove("kh-full", "kh-planmode");
    memo = { screen: ses.screen, roomId: ses.screen === "room" ? ses.roomId : null };
    ses = null;
  }
  function toggleFull() {
    ses.full = !ses.full;
    ses.root.classList.toggle("kh-full", ses.full);
    document.body.classList.toggle("kh-open", ses.full);
    fit(ses.root); // the full-screen box is as wide as the window: side-by-side again on a big screen
    const b = ses.root.querySelector("[data-full]"); if (b) { b.innerHTML = ic(ses.full ? "minimize" : "maximize"); b.setAttribute("aria-label", ses.full ? T("작게 보기", "Exit full screen") : T("크게 보기", "Full screen")); }
    if (ses.screen === "plan") placeMarker(false); else showMenu();
  }
  function onKey(e) {
    if (!ses) return;
    if (!ses.root.isConnected) { destroy(); return; }
    if (e.key === "Escape") { if (ses.modal) closeModal(); else if (ses.full) toggleFull(); else if (ses.screen === "room") backToPlan(); return; }
    if ((e.key === "r" || e.key === "R") && ses.screen === "room" && ses.sel && !ses.modal && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) menuAct(e.shiftKey ? "rotl" : "rot");
  }
  // a narrow box (a phone, or a small window) stacks the picture above the shop panel
  const fit = (r) => r.classList.toggle("kh-narrow", r.clientWidth > 0 && r.clientWidth < 820);
  function onResize() { if (!ses) return; fit(ses.root); if (ses.screen === "plan") placeMarker(false); }

  /* ------------------------------ modal ------------------------------ */
  function closeModal() { if (modalEl) { if (modalEl._asmrOff) { modalEl._asmrOff(); if (window.ASMR) ASMR.stop(); } modalEl.remove(); modalEl = null; } if (ses) ses.modal = null; document.removeEventListener("keydown", modalKey, true); }
  // Esc closes any popup; Left / Right arrows step to the neighbouring card when the popup has arrow buttons
  function modalKey(e) {
    if (!modalEl) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeModal(); return; }
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && modalEl._nav) { e.preventDefault(); e.stopImmediatePropagation(); modalEl._nav(e.key === "ArrowLeft" ? -1 : 1); }
  }
  // the shop card that was just tapped (so its popup can step to the cards next to it)
  let lastCard = null, lastCardAt = 0;
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest(".kh-items-grid > button.kh-item, .kh-subgrid > button.kh-subitem") : null;
    if (b) { lastCard = b; lastCardAt = performance.now(); }
  }, true);
  function cardNeighbours() {
    const c = lastCard;
    if (!c || !c.isConnected || performance.now() - lastCardAt > 600) return null;
    const list = Array.from(c.parentElement.children).filter((x) => x.tagName === "BUTTON" && !x.disabled);
    return list.length > 1 ? { list, i: list.indexOf(c) } : null;
  }
  function modal(html, wire) {
    closeModal();
    const m = el("div", "kh-modal", `<div class="kh-sheet" role="alertdialog" aria-modal="true">${html}</div>`);
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(); });
    const host = (ses && ses.root) || wardHost;
    if (!host) return;
    host.appendChild(m);
    modalEl = m; if (ses) ses.modal = m;
    document.addEventListener("keydown", modalKey, true);
    if (wire) wire(m);
    const b = m.querySelector("[data-primary]"); if (b) b.focus();
  }
  // Detail popup for a shop card: a big picture, then Place / Wear + Cancel for what you own, or Buy + Close for what you don't.
  // Buying only unlocks the thing (the card stops being faded); it is placed / worn the next time you tap it.
  //   o: { title, pic, price, own, go: "Place" label, onGo(), spendWhy, onBuy(): runs after the coins were taken, spendFn, note }
  function detail(o) {
    const coinsNow = () => (curOpts && curOpts.coins ? curOpts.coins() : Infinity), afford = o.afford != null ? o.afford : o.price === 0 || (curOpts && curOpts.unlimited) || coinsNow() >= o.price;
    const priceHtml = o.own ? "" : `<p class="kh-buy-price">${COIN} <b>${o.price}</b></p><p class="kh-buy-note">${afford ? T("코인으로 살까요? 사도 바로 놓이지 않아요.", "Buy it with your coins? It won't be placed yet.") : T(`코인이 ${o.price - coinsNow()}개 모자라요. 공부하고 코인을 모아 봐요!`, `You need ${o.price - coinsNow()} more coins. Keep studying to earn them!`)}</p>`;
    const note = o.own && o.note ? `<p class="kh-buy-note">${esc(o.note)}</p>` : "";
    const sellBtn = o.own && o.sell ? `<button type="button" class="kh-btn sell" data-sell>${T("되팔기", "Sell back")}${o.sell.back ? ` <small>+${o.sell.back}</small>` : ""}</button>` : "";
    const btns = o.own
      ? `<button type="button" class="kh-btn" data-primary data-go>${esc(o.go)}</button><button type="button" class="kh-btn alt" data-no>${T("취소", "Cancel")}</button>${sellBtn}`
      : `<button type="button" class="kh-btn" data-primary data-yes ${afford ? "" : "disabled"}>${T("살래요", "Buy")}</button><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button>`;
    const nb = cardNeighbours();
    const playBtn = o.sound && window.ASMR && ASMR.has(o.sound) ? `<button type="button" class="kh-btn kh-play" data-play aria-pressed="false"><span class="kh-play-ic" aria-hidden="true">▶</span> <span class="kh-play-tx">${T("소리 듣기", "Listen")}</span></button>` : "";
    modal(`<h2>${esc(o.title)}</h2><div class="kh-buy-pic kh-detail-pic${o.own ? "" : " is-locked"}">${o.pic}</div>${playBtn}${playBtn ? `<p class="kh-asmr-note" data-asmr-note role="status" hidden>${T("구매하신 후 ASMR상자에 넣고 재생시켜 주세요", "Buy it, put it in the ASMR Box, then play it from the box.")}</p>` : ""}${priceHtml}${note}<div class="kh-btns">${btns}</div>${o.adminEdit ? `<button type="button" class="kh-btn alt" data-admin-edit>${T("✏️ 관리자: 아이템 수정", "✏️ Admin: edit item")}</button>` : ""}${o.adminDel ? `<button type="button" class="kh-btn alt kh-admin-del" data-admin-del>${T("🗑 관리자: 아이템 삭제", "🗑 Admin: delete item")}</button>` : ""}`, (m) => {
      const ade = m.querySelector("[data-admin-edit]");
      if (ade) ade.onclick = o.adminEdit;
      const adb = m.querySelector("[data-admin-del]");
      if (adb) adb.onclick = o.adminDel;
      const pb = m.querySelector("[data-play]");
      if (pb) {   // a ▶ button: plays the toy's ASMR sound, tap again to stop. The picture wiggles while it plays.
        const pic = m.querySelector(".kh-detail-pic"), asmrNote = m.querySelector("[data-asmr-note]");
        const sync = (id) => { const on = id === o.sound; pb.setAttribute("aria-pressed", on); pb.classList.toggle("is-on", on); pic.classList.toggle("is-playing", on); pb.querySelector(".kh-play-ic").textContent = on ? "■" : "▶"; pb.querySelector(".kh-play-tx").textContent = on ? T("멈추기", "Stop") : T("소리 듣기", "Listen"); };
        const off = ASMR.onChange(sync);
        m._asmrOff = off;
        // Only a bought toy that is inside an ASMR box, opened from that box's list (o.canPlay), may play. Anything else shows the note inside the card.
        pb.onclick = () => {
          if (!o.canPlay) { ASMR.stop(); sync(null); if (asmrNote) asmrNote.hidden = false; return; }
          if (asmrNote) asmrNote.hidden = true;
          if (!ASMR.toggle(o.sound)) sync(null);
        };
      }
      if (nb) { // arrow buttons: open the previous / next card of the same list (cards that only show a message are skipped)
        const step = (dir) => {
          for (let k = 1; k < nb.list.length; k++) {
            const cand = nb.list[(nb.i + dir * k + nb.list.length * k) % nb.list.length], before = modalEl;
            cand.click();
            if (modalEl && modalEl !== before) return;
          }
        };
        m._nav = step;
        const sheet = m.querySelector(".kh-sheet");
        [[-1, "prev", T("이전 아이템", "Previous item"), "m14.5 5.5-6.5 6.5 6.5 6.5"], [1, "next", T("다음 아이템", "Next item"), "m9.5 5.5 6.5 6.5-6.5 6.5"]].forEach(([dir, cls, label, d]) => {
          const bt = el("button", "kh-navbtn " + cls, `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`);
          bt.type = "button"; bt.setAttribute("aria-label", label); bt.onclick = () => step(dir); sheet.appendChild(bt);
        });
      }
      m.querySelector("[data-no]").onclick = closeModal;
      const sl = m.querySelector("[data-sell]"); if (sl) sl.onclick = () => sellConfirm(o);
      const go = m.querySelector("[data-go]"); if (go) go.onclick = () => { if (!o.keep) closeModal(); o.onGo(); };
      const yes = m.querySelector("[data-yes]");
      if (yes) yes.onclick = () => {
        const ok = o.spendFn ? o.spendFn(o.price, o.spendWhy) : curOpts.spend(o.price, o.spendWhy);
        if (!ok) { toast(T("코인이 모자라요", "Not enough coins"), true); closeModal(); return; }
        refreshCoins(); o.onBuy();   // the popup stays open: it now offers the thing to place / wear
        if (o.go && o.onGo) detail(Object.assign({}, o, { own: true, price: 0, sell: null })); else closeModal();
      };
    });
  }
  // Sell back: 80% of the price returns to the wallet (a 20% fee). o.sell = { paid, back, onSell() -> bool }
  function sellConfirm(o) {
    const sl = o.sell, free = !!(curOpts && curOpts.unlimited), back = free ? 0 : sl.back, fee = free ? 0 : sl.paid - sl.back;
    const goBtn = o.go && o.onGo ? `<button type="button" class="spp-btn teal" data-primary data-go>${esc(o.go)}</button>` : "";
    modal(`<div class="spp-card"><div class="spp-head"><button type="button" class="spp-close" data-no><svg class="spp-x" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg> ${T("닫기", "Close")}</button></div>
      <div class="spp-stage">${o.pic}</div><div class="spp-name">${esc(o.title)}</div>
      <div class="spp-rows"><div class="spp-row"><span>${SP_ICONS.coin} ${T("산 가격", "Price you paid")}</span><b>${SP_ICONS.coin} ${sl.paid}</b></div><div class="spp-row"><span>${SP_ICONS.gear} ${T("수수료 (20%)", "Fee (20%)")}</span><b>− ${fee}</b></div><div class="spp-row total"><span>${SP_ICONS.wallet} ${T("지갑으로 돌아와요", "Back to your wallet")}</span><b>+ ${back}</b></div></div>
      ${sl.note ? `<p class="spp-note">${esc(sl.note)}</p>` : ""}
      ${free ? `<p class="spp-note">${T("관리자는 코인이 무제한이라 환불은 없어요.", "Admin has unlimited coins, so nothing comes back.")}</p>` : ""}
      <div class="spp-btns">${goBtn}<button type="button" class="spp-btn orange" data-yes><span aria-hidden="true">💰</span> ${T("되팔기", "Sell")}</button></div></div>`, (m) => {
      const sheet = m.querySelector(".kh-sheet"); if (sheet) sheet.classList.add("spp-sheet");
      const go = m.querySelector("[data-go]"); if (go) go.onclick = () => { if (!o.keep) closeModal(); o.onGo(); };
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelector("[data-yes]").onclick = () => {
        const ok = sl.onSell();
        closeModal();
        if (ok !== false) { refreshCoins(); toast(free ? T("정리했어요", "Removed") : T(`되팔았어요! +${back}코인`, `Sold back! +${back} coins`)); }
      };
    });
  }
  // buy something: cb() runs after the coins were taken. spendFn(price, why) overrides the default spending.
  function buy(title, picHtml, price, why, cb, spendFn) {
    const afford = curOpts.unlimited || curOpts.coins() >= price;
    modal(`<h2>${esc(title)}</h2><div class="kh-buy-pic">${picHtml}</div><p class="kh-buy-price">${COIN} <b>${price}</b></p>
      <p class="kh-buy-note">${afford ? T("코인으로 살까요?", "Buy it with your coins?") : T(`코인이 ${price - curOpts.coins()}개 모자라요. 공부하고 코인을 모아 봐요!`, `You need ${price - curOpts.coins()} more coins. Keep studying to earn them!`)}</p>
      <div class="kh-btns"><button type="button" class="kh-btn" data-primary data-yes ${afford ? "" : "disabled"}>${T("살래요", "Buy")}</button><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelector("[data-yes]").onclick = () => {
        const ok = spendFn ? spendFn(price, why) : curOpts.spend(price, why);
        if (!ok) { toast(T("코인이 모자라요", "Not enough coins"), true); closeModal(); return; }
        closeModal(); refreshCoins(); cb(true);
      };
    });
  }

  // The shop panel is built like the 2D one: a row of category chips on top, the items of the chosen category below.
  function chipsHtml(tabs, cur) { // tabs: [id, icon, label]
    const adminAddCat = curOpts && curOpts.isAdmin ? `<button type="button" role="tab" class="kh-cat kh-admin-add-cat" data-kh-admin-add-cat aria-label="${T("카테고리 추가", "Add category")}">+</button>` : "";
    return `<div class="kh-cats-wrap"><button type="button" class="kh-cats-nav prev" data-cnav="-1" aria-label="${T("왼쪽으로", "Scroll left")}" hidden>‹</button><div class="kh-cats" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="kh-cat${t[0] === cur ? " on" : ""}" data-tab="${t[0]}" aria-selected="${t[0] === cur}">${t[1] && /\.webp$/.test(t[1]) ? `<img class="kh-cat-ic" src="${t[1]}" alt="" draggable="false">` : ""}<span>${esc(t[2])}</span></button>`).join("")}${adminAddCat}</div><button type="button" class="kh-cats-nav next" data-cnav="1" aria-label="${T("오른쪽으로", "Scroll right")}" hidden>›</button></div>`;
  }
  // arrows + edge fade on the category row; centres the chosen chip
  function initCats(root) {
    const wrap = root.querySelector(".kh-cats-wrap"); if (!wrap) return;
    const strip = wrap.querySelector(".kh-cats"), pv = wrap.querySelector(".kh-cats-nav.prev"), nx = wrap.querySelector(".kh-cats-nav.next");
    const upd = () => { const mx = strip.scrollWidth - strip.clientWidth, l = strip.scrollLeft > 2, r = strip.scrollLeft < mx - 2; pv.hidden = !l; nx.hidden = !r; wrap.classList.toggle("can-left", l); wrap.classList.toggle("can-right", r); };
    strip.addEventListener("scroll", upd, { passive: true });
    wrap.querySelectorAll("[data-cnav]").forEach((b) => { b.onclick = () => strip.scrollBy({ left: Number(b.dataset.cnav) * Math.max(120, strip.clientWidth * 0.7), behavior: "smooth" }); });
    const cur = strip.querySelector(".kh-cat.on"); if (cur) strip.scrollLeft = cur.offsetLeft - (strip.clientWidth - cur.offsetWidth) / 2;
    upd(); requestAnimationFrame(upd);
  }

  const shelfHead = (title, count) => `<div class="kh-shelf-head"><span class="kh-shelf-title">${esc(title)}${count ? ` <small>${count}</small>` : ""}</span></div>`;
  const press = (node, fn) => { node.onclick = fn; node.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } }; };

  /* ------------------------------ floor plan ------------------------------ */
  function topBar(title) {
    return `<div class="kh-top"><h2 class="kh-title">${title}</h2><span class="kh-sp"></span><span class="kh-coins">${COIN}<b data-kh-coins>${coinsText()}</b></span><button type="button" class="kh-ibtn" data-full aria-label="${T("크게 보기", "Full screen")}">${ic("maximize")}</button></div>`;
  }
  function renderPlan() {
    ses.screen = "plan"; ses.sel = null; ses.koala.pose = "stand"; ses.koala.z = 0;
    ses.root.classList.add("kh-planmode"); fit(ses.root);
    const S = ses.S, built = Object.keys(S.slots).length;
    const house = H.planSvg(S, { name: (r) => roomLabel(r), empty: T("방 짓기", "Build a room"), fresh: ses.justBuilt, title: T("우리 집 평면도", "Our house floor plan") });
    ses.root.innerHTML = `<div class="kh-plan-screen">
      <div class="kh-planmain">${topBar("🏠 " + T("내 집", "My House"))}
        <p class="kh-hint">${ses.manage ? T("방을 끌어서 다른 칸으로 옮기거나, 방을 눌러서 되팔 수 있어요.", "Drag a room to another plot, or tap a room to sell it.") : T("방을 누르면 코알라가 들어가요. 방을 꾹 누른 채 끌면 위치를 바꿀 수 있어요.", "Tap a room to walk in. Press and drag a room to move it.")}
          <button type="button" class="kh-managebtn${ses.manage ? " on" : ""}" data-manage aria-pressed="${!!ses.manage}">${ses.manage ? T("✔ 끝내기", "✔ Done") : T("🏠 방 옮기기·되팔기", "🏠 Move / sell rooms")}</button></p>
        <div class="kh-plan" id="kh-plan">${house}
          <button type="button" class="kh-entrance" data-room="yard" aria-label="${T("집 외관 및 정원 꾸미기", "House & Garden Decor")}"><img class="kh-door-ic" src="/img/cat/house.webp" alt="" draggable="false"><span class="kh-card-name">${T("집 외관 및 정원 꾸미기", "House & Garden Decor")}</span><svg class="kh-door-go" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <img class="kh-marker" id="kh-marker" src="${kimg("base")}" alt="${T("코알라", "Koala")}" draggable="false"></div></div>
      <aside class="kh-panel" id="kh-panel" aria-label="${T("방 상점", "Room shop")}">
        ${chipsHtml([["rooms", "/img/cat/home.webp", T("방", "Rooms")]], "rooms")}
        <div class="kh-grid">${shelfHead(T("방 상점", "Room shop"), `${built}/${H.SLOTS.length}`)}<p class="kh-subnote">${T("방 카드를 평면도 위로 끌어다 놓으면 살 수 있어요. 이미 지은 방의 카드를 누르면 팔 수 있어요.", "Drag a room card onto the floor plan to buy it. Tap a card of a room you already built to sell it.")}</p><div class="kh-items-grid kh-rooms">${H.ROOM_ORDER.map((t) => roomShopCard(t)).join("")}</div></div></aside></div><div class="kh-toast" role="status"></div>`;
    ses.justBuilt = null;
    ses.root.querySelector("[data-full]").onclick = toggleFull;
    ses.root.querySelectorAll("[data-room]").forEach((b) => { press(b, () => { if (performance.now() < (ses.noTapUntil || 0)) return; if (ses.manage && b.dataset.room !== "yard") sellRoom(b.dataset.room); else pickRoom(b.dataset.room); }); });
    const mg = ses.root.querySelector("[data-manage]"); if (mg) mg.onclick = () => { ses.manage = !ses.manage; renderPlan(); };
    wirePlanDrag();
    ses.root.querySelectorAll("[data-empty]").forEach((b) => { press(b, () => chooseRoomType(b.dataset.empty)); });
    ses.root.querySelectorAll(".kh-panel [data-buyroom]").forEach((b) => { b.onclick = () => { if (performance.now() < (ses.noTapUntil || 0)) return; roomPopup(b.dataset.buyroom); }; });
    wireShopDrag();
    requestAnimationFrame(() => placeMarker(false));
    ses.root.querySelector("#kh-marker").addEventListener("load", () => placeMarker(false));
  }
  /* ---- moving and selling rooms on the floor plan ---- */
  // Press and drag a room (a mouse drags at once, a finger after a short hold) onto an empty plot to move it, or onto another room to swap the two.
  function wirePlanDrag() {
    const svg = ses.root.querySelector(".kh-plan-svg");
    if (!svg) return;
    let d = null;
    const findTarget = (x, y, skip) => {
      for (const e of document.elementsFromPoint(x, y)) { const g = e.closest && e.closest("[data-room],[data-empty]"); if (g && g !== skip && g.dataset.room !== "yard" && svg.contains(g)) return g; }
      return null;
    };
    const slotOf = (g) => g.dataset.room || g.dataset.empty;
    const offset = (ev) => { const m = svg.getScreenCTM(); return m ? [(ev.clientX - d.x0) / m.a, (ev.clientY - d.y0) / m.d] : [0, 0]; };
    const begin = () => { d.on = true; d.g.classList.add("dragging"); svg.classList.add("kh-dragging"); const a = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(d.base || ""); d.bx = a ? +a[1] : 0; d.by = a ? +a[2] : 0; };
    const end = (commit) => {
      if (!d) return;
      clearTimeout(d.timer);
      const cur = d; d = null;
      svg.querySelectorAll(".drop").forEach((x) => x.classList.remove("drop"));
      svg.classList.remove("kh-dragging");
      if (!cur.on) return;
      ses.noTapUntil = performance.now() + 400;   // the click that ends a drag must not open the room
      cur.g.classList.remove("dragging");
      if (cur.base != null) cur.g.setAttribute("transform", cur.base);
      const tg = commit ? cur.tgt : null;
      if (!tg) return;
      const a = cur.sl, b = slotOf(tg), S = ses.S;
      if (a === b) return;
      const mine = S.slots[a];
      if (S.slots[b]) S.slots[a] = S.slots[b]; else delete S.slots[a];
      S.slots[b] = mine;
      if (S.cur === a) S.cur = b; else if (S.cur === b) S.cur = a;
      ses.justBuilt = b; save(); renderPlan(); toast(T("방을 옮겼어요!", "Room moved!"));
    };
    svg.querySelectorAll("[data-room]").forEach((g) => {
      g.addEventListener("pointerdown", (ev) => {
        if (ev.button > 0 || d) return;
        d = { g, sl: g.dataset.room, x0: ev.clientX, y0: ev.clientY, on: false, base: g.getAttribute("transform"), tgt: null, timer: 0 };
        try { g.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
        if (ev.pointerType === "touch") d.timer = setTimeout(() => { if (d && !d.on) begin(); }, 380);
      });
      g.addEventListener("pointermove", (ev) => {
        if (!d || d.g !== g) return;
        const dist = Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0);
        if (!d.on) {
          if (ev.pointerType === "touch") { if (dist > 10) { clearTimeout(d.timer); d = null; } return; }   // a finger that moves before the hold is scrolling
          if (dist < 7) return;
          begin();
        }
        const [ux, uy] = offset(ev);
        g.setAttribute("transform", `translate(${(d.bx + ux).toFixed(1)} ${(d.by + uy).toFixed(1)})`);
        const tg = findTarget(ev.clientX, ev.clientY, g);
        if (tg !== d.tgt) { svg.querySelectorAll(".drop").forEach((x) => x.classList.remove("drop")); if (tg) tg.classList.add("drop"); d.tgt = tg; }
      });
      g.addEventListener("pointerup", () => end(true));
      g.addEventListener("pointercancel", () => end(false));
    });
    svg.addEventListener("touchmove", (e) => { if (d && d.on) e.preventDefault(); }, { passive: false });
  }
  const ownedRooms = (type) => H.SLOTS.filter((sl) => ses.S.slots[sl] && ses.S.slots[sl].type === type);
  // put a room back on the market (the popup already told its refund): 80% of the price returns, what stood in it stays in your things
  function doSellRoom(sl) {
    const S = ses.S, st = S.slots[sl];
    if (!st) return;
    const t = H.ROOMS[st.type], give = t.price > 0, free = !!(curOpts && curOpts.unlimited), back = free ? 0 : Math.floor(t.price * 0.8);
    delete S.slots[sl];
    if (S.cur === sl) S.cur = H.SLOTS.find((x) => S.slots[x]) || "yard";
    if (give && curOpts.refund) curOpts.refund(back, "roomsell:" + st.type);
    save(); renderPlan(); refreshCoins(); toast(free || !give ? T("방을 팔았어요", "Room sold") : T(`방을 팔았어요! +${back}코인`, `Room sold! +${back} coins`));
  }
  // tapping a built room while "Move / sell rooms" is on: confirm, then sell
  function sellRoom(sl) {
    const S = ses.S, st = S.slots[sl];
    if (!st) return;
    const t = H.ROOMS[st.type], n = (st.items || []).length, give = t.price > 0, free = !!(curOpts && curOpts.unlimited);
    const back = free ? 0 : Math.floor(t.price * 0.8), fee = free ? 0 : t.price - back;
    const note = (give ? "" : T("처음부터 있던(무료) 방이라 돌려받는 코인은 없어요. ", "This room was free, so no coins come back. ")) + (n ? T(`방 안에 놓인 아이템 ${n}개는 치워져요. (아이템은 내 것으로 남아요)`, `The ${n} item(s) placed inside are put away (you keep them).`) : "");
    modal(`<h2>${esc(roomLabel(H.roomOf(S, sl)))}</h2><div class="kh-buy-pic">${roomPic(st.type)}</div>
      <div class="kh-sellmath"><div><span>${T("산 가격", "Price you paid")}</span><b>${COIN} ${t.price}</b></div><div><span>${T("수수료 (20%)", "Fee (20%)")}</span><b>− ${fee}</b></div><div class="total"><span>${T("지갑으로 돌아와요", "Back to your wallet")}</span><b>${COIN} +${back}</b></div></div>
      ${note ? `<p class="kh-buy-note">${esc(note)}</p>` : ""}
      <div class="kh-btns"><button type="button" class="kh-btn sell" data-primary data-yes>${T("팔래요", "Sell")}</button><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelector("[data-yes]").onclick = () => { closeModal(); doSellRoom(sl); };
    });
  }
  // drag a room card from the shop onto the floor plan: on an empty plot (or anywhere on the plan) it opens the usual "Buy" popup
  function wireShopDrag() {
    const plan = ses.root.querySelector("#kh-plan"), svg = ses.root.querySelector(".kh-plan-svg");
    if (!plan || !svg) return;
    let d = null;
    const slotAt = (x, y) => { for (const e of document.elementsFromPoint(x, y)) { const g = e.closest && e.closest("[data-empty]"); if (g && svg.contains(g)) return g; } return null; };
    const overPlan = (x, y) => { const r = plan.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
    const begin = () => {
      d.on = true; svg.classList.add("kh-dragging");
      d.ghost = el("div", "kh-ghostcard", d.card.querySelector(".kh-roomic") ? d.card.querySelector(".kh-roomic").innerHTML : "");
      document.body.appendChild(d.ghost);
    };
    const place = (ev) => { if (d.ghost) { d.ghost.style.left = ev.clientX + "px"; d.ghost.style.top = ev.clientY + "px"; } };
    const end = (commit, ev) => {
      if (!d) return;
      clearTimeout(d.timer);
      const cur = d; d = null;
      svg.querySelectorAll(".drop").forEach((x) => x.classList.remove("drop"));
      svg.classList.remove("kh-dragging");
      if (cur.ghost) cur.ghost.remove();
      if (!cur.on) return;
      ses.noTapUntil = performance.now() + 400;
      if (!commit || !ev || !overPlan(ev.clientX, ev.clientY)) return;
      const g = slotAt(ev.clientX, ev.clientY);
      buildRoom(cur.type, g ? g.dataset.empty : undefined);
    };
    ses.root.querySelectorAll(".kh-panel [data-buyroom]").forEach((card) => {
      card.addEventListener("pointerdown", (ev) => {
        if (ev.button > 0 || d) return;
        d = { card, type: card.dataset.buyroom, x0: ev.clientX, y0: ev.clientY, on: false, ghost: null, timer: 0 };
        try { card.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
        if (ev.pointerType === "touch") d.timer = setTimeout(() => { if (d && !d.on) { begin(); place({ clientX: d.x0, clientY: d.y0 }); } }, 380);
      });
      card.addEventListener("pointermove", (ev) => {
        if (!d || d.card !== card) return;
        const dist = Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0);
        if (!d.on) {
          if (ev.pointerType === "touch") { if (dist > 10) { clearTimeout(d.timer); d = null; } return; }
          if (dist < 7) return;
          begin();
        }
        place(ev);
        const g = slotAt(ev.clientX, ev.clientY);
        svg.querySelectorAll(".drop").forEach((x) => x.classList.remove("drop"));
        if (g) g.classList.add("drop");
      });
      card.addEventListener("pointerup", (ev) => end(true, ev));
      card.addEventListener("pointercancel", () => end(false));
    });
    ses.root.querySelector(".kh-panel").addEventListener("touchmove", (e) => { if (d && d.on) e.preventDefault(); }, { passive: false });
  }
  function roomShopCard(t) {
    const r = H.ROOMS[t], have = Object.values(ses.S.slots).filter((x) => x.type === t).length;
    return `<button type="button" class="kh-item kh-roomitem" data-buyroom="${t}" aria-label="${esc(T(r.ko, r.en))}, ${r.price}"><span class="kh-roomic" aria-hidden="true">${roomImg(r)}</span><span class="kh-nm">${esc(T(r.ko, r.en))}</span><span class="kh-subtxt">${r.C}×${r.R}${have ? " · " + T(`${have}개`, `${have} built`) : ""}</span>${r.price ? `<span class="kh-pr">${COIN}${r.price}</span>` : `<span class="kh-pr">${T("무료", "Free")}</span>`}</button>`;
  }
  function placeMarker(animate, toId) {
    if (!ses) return;
    const m = ses.root.querySelector("#kh-marker"), plan = ses.root.querySelector("#kh-plan");
    if (!m || !plan) return;
    const id = toId || ses.roomId || ses.S.cur;
    const c = plan.querySelector(`[data-room="${id}"] .kh-hit`) || plan.querySelector(`[data-room="${id}"]`) || plan.querySelector('[data-room="yard"]');
    if (!c) return;
    const pr = plan.getBoundingClientRect(), cr = c.getBoundingClientRect(), onFloor = c.classList.contains("kh-hit");
    const place = (x, y) => { m.style.left = x + "px"; m.style.top = y + "px"; };
    const dest = [cr.left - pr.left + (onFloor ? cr.width * 0.5 : Math.min(36, cr.width * 0.2)), cr.top - pr.top + (onFloor ? cr.height * 0.5 : 4)];
    clearTimeout(ses.walkT); ses.walkT = null;
    const from = ses.markerAt;
    ses.markerAt = id;
    // between two rooms the koala walks out of the room, along the corridors, and into the other room
    const svg = plan.querySelector(".kh-plan-svg");
    if (animate && !reduced() && svg && from && from !== id && from !== "yard" && id !== "yard" && svg.getScreenCTM) {
      const path = H.planPath(ses.S, from, id), ctm = svg.getScreenCTM();
      if (path.length > 1 && ctm) {
        const pts = path.map(([x, y]) => { const q = H.proj(x, y, 0), p0 = svg.createSVGPoint(); p0.x = q[0]; p0.y = q[1]; const s = p0.matrixTransform(ctm); return [s.x - pr.left, s.y - pr.top]; });
        pts[pts.length - 1] = dest;
        let i = 0;
        const step = () => {
          if (!ses || i >= pts.length) { if (m) { m.classList.remove("walk"); } return; }
          const q = pts[i], p0 = i ? pts[i - 1] : [parseFloat(m.style.left) || q[0], parseFloat(m.style.top) || q[1]], len = Math.hypot(q[0] - p0[0], q[1] - p0[1]), ms = Math.max(120, Math.min(650, len * 3.2));
          m.style.transition = `left ${ms}ms linear, top ${ms}ms linear`; m.classList.add("walk"); place(q[0], q[1]); i++;
          ses.walkT = setTimeout(step, ms);
        };
        step();
        ses.walkMs = pts.reduce((t, q, k) => t + (k ? Math.max(120, Math.min(650, Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]) * 3.2)) : 0), 150);
        return;
      }
    }
    ses.walkMs = animate && !reduced() ? 700 : 0;
    m.style.transition = animate && !reduced() ? "left .7s ease-in-out, top .7s ease-in-out" : "none";
    // on a room the koala stands in the middle; at the yard button he stands on its top edge so the label stays readable
    place(dest[0], dest[1]);
    m.classList.toggle("walk", !!animate && !reduced());
  }
  function pickRoom(id) {
    placeMarker(true, id);
    // a room opens straight into the full-screen editor (one step less than before)
    setTimeout(() => { if (ses && ses.screen === "plan") { openRoom(id); if (ses.screen === "room" && !ses.full) toggleFull(); } }, reduced() ? 0 : (ses.walkMs || 700) + 60);
  }
  // the floor-plan button goes straight back to the inline plan card (leaves full screen on the way)
  function backToPlan() {
    if (ses.full) { ses.full = false; ses.root.classList.remove("kh-full"); document.body.classList.remove("kh-open"); }
    renderPlan();
  }

  /* ---- buying rooms: the shop sells kinds of rooms, and you choose the plot ---- */
  const roomImg = (r) => (r.id ? `<img class="kh-roomimg" src="img/rooms/${r.id}.webp" alt="" draggable="false">` : esc(r.ic || ""));
  function roomPic(t) { const r = H.ROOMS[t]; return `<span class="kh-card-pic">${H.roomSvg(Object.assign({}, r, { uid: "shop" + t }), { wall: r.wall, floor: r.floor, items: [] }, {})}</span>`; }
  function chooseRoomType(slot) {
    modal(`<h2>${T("어떤 방을 지을까요?", "Which room?")}</h2><div class="kh-items-grid kh-rooms">${H.ROOM_ORDER.map((t) => roomShopCard(t)).join("")}</div><div class="kh-btns"><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelectorAll("[data-buyroom]").forEach((b) => { b.onclick = () => buildRoom(b.dataset.buyroom, slot); });
    });
  }
  // One popup for a room card: what the room is, its price, "Buy", and "Sell" for every room of that kind you already built. (No mini floor plan: a new room goes to the plot you dropped it on, else the first empty one.)
  const ROOM_DESC = {
    study: ["책상과 책장이 있는 공부방이에요. 숙제와 책 읽기에 딱!", "A desk and a bookshelf: perfect for homework and reading."],
    bedroom: ["포근하게 잠드는 침실이에요.", "A cosy bedroom for a good night's sleep."],
    master: ["넓은 침대와 옷장이 있는 큰 방이에요.", "A big room with a large bed and a wardrobe."],
    living: ["소파와 TV로 쉬는 거실이에요.", "A living room with a sofa and a TV."],
    kitchen: ["요리하고 밥 먹는 주방이에요.", "A kitchen for cooking and eating."],
    playroom: ["장난감과 ASMR 장난감을 놓고 노는 방이에요.", "A room for toys and ASMR toys."],
    cinema: ["영화를 보는 시네마룸이에요.", "A cinema room for movie time."],
    bath: ["씻고 노는 화장실이에요.", "A bathroom for washing and splashing."],
    garage: ["자동차와 공구를 두는 차고예요.", "A garage for cars and tools."],
  };
  function roomPopup(type, forcedSlot) {
    const S = ses.S, t = H.ROOMS[type], free = !!(curOpts && curOpts.unlimited), empties = H.SLOTS.filter((sl) => !S.slots[sl]);
    const mine = ownedRooms(type), target = forcedSlot && !S.slots[forcedSlot] ? forcedSlot : empties[0];
    const afford = free || t.price === 0 || curOpts.coins() >= t.price;
    const back = free ? 0 : Math.floor(t.price * 0.8);
    const desc = ROOM_DESC[type] ? T(ROOM_DESC[type][0], ROOM_DESC[type][1]) : "";
    const sellRow = (sl) => { const st = S.slots[sl], n = (st.items || []).length; return `<div class="kh-roomrow"><span class="kh-roomrow-nm">${esc(roomLabel(H.roomOf(S, sl)))}<small>${T(`가구 ${n}개`, `${n} item(s)`)}</small></span><button type="button" class="kh-btn sell" data-sellroom="${sl}">${T("팔래요", "Sell")}${back ? ` <small>+${back}</small>` : ""}</button></div>`; };
    const note = !target ? T("빈 칸이 없어서 지금은 지을 수 없어요. 방을 팔거나 비워 주세요.", "No empty plot left, so you can't build one right now.") : !afford ? T(`코인이 ${t.price - curOpts.coins()}개 모자라요. 공부하고 코인을 모아 봐요!`, `You need ${t.price - curOpts.coins()} more coins. Keep studying to earn them!`) : "";
    modal(`<h2>${esc(T(t.ko, t.en))}</h2><div class="kh-buy-pic kh-detail-pic">${roomPic(type)}</div>
      <p class="kh-roomdesc">${esc(desc)}</p>
      <p class="kh-roomfacts">${T(`크기 ${t.C}×${t.R}칸`, `${t.C}×${t.R} tiles`)} · ${mine.length ? T(`지은 방 ${mine.length}개`, `${mine.length} built`) : T("아직 없어요", "none yet")}</p>
      <p class="kh-buy-price">${COIN} <b>${t.price}</b>${t.price ? "" : ` <small>${T("무료", "Free")}</small>`}</p>${note ? `<p class="kh-buy-note">${esc(note)}</p>` : ""}
      ${mine.length ? `<div class="kh-roomrows"><h3>${T("이미 지은 방", "Rooms you have")}</h3>${mine.map(sellRow).join("")}</div>` : ""}
      <div class="kh-btns"><button type="button" class="kh-btn" data-primary data-yes ${target && afford ? "" : "disabled"}>${T("살래요", "Buy")}</button><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelector("[data-yes]").onclick = () => {
        if (!target || S.slots[target]) return;
        if (t.price > 0 && !curOpts.spend(t.price, "room:" + type)) { toast(T("코인이 모자라요", "Not enough coins"), true); closeModal(); return; }
        S.slots[target] = { type, wall: t.wall, floor: t.floor, items: [] }; ses.justBuilt = target;
        closeModal(); save(); renderPlan(); refreshCoins(); toast(T("새 방이 생겼어요!", "A new room!"));
      };
      m.querySelectorAll("[data-sellroom]").forEach((b) => { b.onclick = () => { closeModal(); doSellRoom(b.dataset.sellroom); }; });
    });
  }
  const buildRoom = (type, slot) => roomPopup(type, slot);

  /* ------------------------------ room screen ------------------------------ */
  const roomType = () => (ses.roomId === "yard" ? "yard" : (ses.S.slots[ses.roomId] || {}).type);
  const fitsHere = (d, yard) => (d.where === "both" || d.where === (yard ? "out" : "in")) && (!d.only || d.only === roomType());
  // Admin-added House categories (migrations/0014_koala_items.sql) are appended
  // after the built-in tabs — never inserted among them, so nothing shifts.
  function customTabs() {
    return H.customCategories ? H.customCategories().map((c) => [c.id, c.icon, T(c.label.ko, c.label.en)]) : [];
  }
  function tabsFor(yard) {
    // Admin-added categories are indoor-room categories only for now (a new
    // category's meaning in the yard's very different tab set — house
    // style, garden layout — isn't well defined), so they're appended here
    // only, never in the yard or garage tab sets.
    if (!yard && roomType() === "garage") return [["garage", "/img/house/carCompactRed.webp", T("차고", "Garage")], ["furniture", "/img/cat/furniture.webp", T("가구", "Furniture")], ["toys", "/img/cat/toy.webp", T("장난감", "Toys")], ["plant", "/img/cat/plant.webp", T("식물", "Plants")], ["small", "/img/cat/small.webp", T("소품", "Props")], ["wall", "/img/cat/poster.webp", T("벽장식", "Wall")], ["style", "/img/cat/wallpaper.webp", T("벽·바닥", "Style")]];
    return yard
      ? [["outdoor", "/img/cat/outdoor.webp", T("정원 물건", "Garden")], ["plant", "/img/cat/plant.webp", T("식물", "Plants")], ["house", "/img/cat/home.webp", T("집 외관", "House")], ["garden", "/img/cat/garden.webp", T("정원 형태", "Layout")]]
      : [["furniture", "/img/cat/furniture.webp", T("가구", "Furniture")], ["toys", "/img/cat/toy.webp", T("장난감", "Toys")], ["rug", "/img/cat/rug.webp", T("러그", "Rugs")], ["plant", "/img/cat/plant.webp", T("식물", "Plants")], ["small", "/img/cat/small.webp", T("소품", "Props")], ["wall", "/img/cat/poster.webp", T("벽장식", "Wall")], ["style", "/img/cat/wallpaper.webp", T("벽·바닥", "Style")]].concat(customTabs());
  }
  function openRoom(id) {
    if (!roomDef(id)) { renderPlan(); return; }
    ses.screen = "room"; ses.roomId = id; ses.S.cur = id; ses.sel = null; ses.edit = true; ses.zoom = 1;
    ses.root.classList.remove("kh-planmode"); fit(ses.root); ses.subOf = null;
    const yard = id === "yard";
    ses.tab = yard ? "outdoor" : roomType() === "garage" ? "garage" : "furniture";
    save();
    ses.root.innerHTML = `<div class="kh-room-screen">
      <div class="kh-stage" id="kh-stage">
        <div class="kh-scene" id="kh-scene"></div>
        <div class="kh-top over"><button type="button" class="kh-ibtn kh-planbtn" data-back aria-label="${T("평면도", "Floor plan")}" title="${T("평면도", "Floor plan")}">${ic("chevL")}<span class="kh-planic"><img src="/img/cat/floorplan.webp" alt="" draggable="false"></span></button>
          <span class="kh-sp"></span><h2 class="kh-title kh-roomtitle"><img class="kh-roomtitle-ic" src="${ses.roomId !== "yard" && ses.S.slots[ses.roomId] ? "/img/rooms/" + ses.S.slots[ses.roomId].type + ".webp" : "/img/cat/outdoor.webp"}" alt="" draggable="false"><span>${esc(roomLabel(curRoom()))}</span></h2><span class="kh-sp"></span>
          <span class="kh-coins">${COIN}<b data-kh-coins>${coinsText()}</b></span><i class="kh-vr" aria-hidden="true"></i>
          <button type="button" class="kh-ibtn" data-zoom="out" aria-label="${T("작게", "Zoom out")}">${ic("minus")}</button><button type="button" class="kh-ibtn" data-zoom="in" aria-label="${T("크게", "Zoom in")}">${ic("plus")}</button>
          <button type="button" class="kh-ibtn" data-full aria-label="${T("크게 보기", "Full screen")}">${ic("maximize")}</button>
          <i class="kh-vr" aria-hidden="true"></i><button type="button" class="kh-pillbtn done" data-edit aria-pressed="true" aria-label="${T("꾸미기 끝내기", "Finish decorating")}">${ic("check")}<span>${T("완료", "Done")}</span></button></div>
        <div class="kh-menu" id="kh-menu" hidden></div><p class="kh-toast" role="status"></p></div>
      <aside class="kh-panel" id="kh-panel" aria-label="${T("아이템", "Items")}"></aside></div>`;
    const q = (s) => ses.root.querySelector(s);
    q("[data-back]").onclick = backToPlan;
    q("[data-edit]").onclick = toggleEdit;
    q("[data-full]").onclick = toggleFull;
    q('[data-zoom="in"]').onclick = () => setZoom(ses.zoom + 0.5);
    q('[data-zoom="out"]').onclick = () => setZoom(ses.zoom - 0.5);
    if (yard && ses.root.clientWidth < 720) ses.zoom = 1.5;
    attachStage();
    placeKoalaFree();
    drawScene();
    drawPanel();
  }
  function setZoom(z) {
    ses.zoom = Math.max(1, Math.min(3, z));
    const svg = ses.root.querySelector(".kh-room-svg");
    if (svg) { svg.style.width = `calc((100% - 16px) * ${ses.zoom})`; svg.style.height = `calc((100% - 64px) * ${ses.zoom})`; }
    const sc = ses.root.querySelector("#kh-scene");
    if (sc) { sc.classList.toggle("zoomed", ses.zoom > 1); sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2; sc.scrollTop = (sc.scrollHeight - sc.clientHeight) / 2; }
    showMenu();
  }
  function toggleEdit() {
    ses.edit = !ses.edit; ses.sel = null;
    const b = ses.root.querySelector("[data-edit]");
    b.innerHTML = ses.edit ? ic("check") + `<span>${T("완료", "Done")}</span>` : ic("pencil") + `<span>${T("꾸미기", "Decorate")}</span>`; b.setAttribute("aria-pressed", String(ses.edit));
    b.setAttribute("aria-label", ses.edit ? T("꾸미기 끝내기", "Finish decorating") : T("꾸미기", "Decorate"));
    ses.root.querySelector(".kh-room-screen").classList.toggle("viewing", !ses.edit);
    hideMenu();
    if (ses.edit) { standUp(true); ses.koala.path = []; placeKoalaFree(); } else ses.koala.wait = 0.6;
    drawScene();
  }

  /* ---- koala ---- */
  const wornNames = () => kordered(ses.S.worn);
  function koalaMarkup() {
    const imgs = wornNames().map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
    const one = (src) => { const b = KBOX.base; return `<image href="${src}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; };
    const stand = `<svg class="kh-kstand" x="-27" y="-89.8" width="54" height="99.85" viewBox="64 20 553 1020" overflow="hidden">${imgs}</svg>`;
    const back = extraImg.back ? `<svg class="kh-kback" x="-27" y="-89.8" width="54" height="92.8" viewBox="64 20 553 948" overflow="hidden" display="none">${one(extraImg.back)}</svg>` : "";
    // sitting / reading koalas are pictures of their own (img/koala/*.webp; "koala:sit", "koala:sitback", "koala:read" in the manifest override them)
    const own = (cls, src, w, h, bottom) => `<image class="${cls}" href="${src}" x="${-w / 2}" y="${(bottom - h).toFixed(1)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet" display="none"/>`;
    // worn items on the sitting pictures: the sitting koala is the standing one at 1.281x (front) / 1.29x (from behind), so the same layers can be placed by a transform
    const worn = ses.S.worn, tr = (t) => `<g transform="${t}">`, cv = (n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; };
    const cvIso = (n) => { const b = KISO[n]; return b && !CUSTOM_WARD[n] ? `<image href="/img/koala/${n}_iso.webp" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>` : cv(n); };   // 3/4-view picture of an item for the iso bodies (the front one when there is none)
    const isHat = (n) => KSLOT.hat.includes(n);
    // seen from behind and turned towards the desk (3/4 view): its own picture and its own item renders (img/koala/*_3q.webp), placed by pixel boxes of the 1136x1408 source
    const sitBack3q = (w, hat) => {
      if (extraImg.sitback) return own("kh-ksitback", extraImg.sitback, 38, 45.5, 0);
      const u = 0.03376, names = kordered(w).filter((n) => n !== "base" && K3[n] && (hat(n) || KSLOT.back.includes(n)));
      const im = (n) => { const b = K3[n]; return `<image href="${kimg(n === "base" ? "sit3q" : n + "_3q")}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; };
      return `<g class="kh-ksitback" display="none" transform="scale(${u}) translate(-551 -1358)">${im("base")}${names.map(im).join("")}</g>`;
    };
    const sitSvg = (cls, src, w, h, iw, ih, T, pick, allFront, pic = cv, TH = null) => {   // TH: where the head items go on a sitting picture whose head is not the standing one scaled (hats, glasses)
      const names = kordered(worn).filter((n) => n === "base" ? false : pick(n)), behind = allFront ? [] : names.filter((n) => KBEHIND.includes(n)), front0 = allFront ? names : names.filter((n) => !KBEHIND.includes(n)), isHeadIt = (n) => KSLOT.hat.includes(n) || KSLOT.face.includes(n), front = TH ? front0.filter((n) => !isHeadIt(n)) : front0, headFront = TH ? front0.filter(isHeadIt) : [];
      return `<svg class="${cls}" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" viewBox="0 0 ${iw} ${ih}" overflow="visible" display="none">${tr(T)}${behind.map(pic).join("")}</g><image href="${src}" x="0" y="0" width="${iw}" height="${ih}"/>${tr(T)}${front.map(pic).join("")}</g>${TH ? tr(TH.hat) + headFront.filter((n) => KSLOT.hat.includes(n)).map(pic).join("") + "</g>" + tr(TH.face) + headFront.filter((n) => KSLOT.face.includes(n)).map(pic).join("") + "</g>" : ""}</svg>`;
    };
    const sit = sitSvg("kh-ksit", extraImg.sit || kimg("sit"), 40, 49.1, 720, 883, "translate(5.5 9.2) scale(1.281) translate(-64 -222)", (n) => !KSLOT.feet.includes(n) && !KSLOT.legs.includes(n)) + sitBack3q(worn, isHat);
    const readImg = own("kh-kreadimg", extraImg.read || kimg("read"), 40, 62.5, 3);   // the reading koala is as big as the standing one (0.8x: the same head as the sitting koala)
    const pose = (cls, src) => (src ? `<svg class="${cls}" x="-21.6" y="-71.2" width="43.2" height="74.2" viewBox="64 20 553 948" overflow="hidden" display="none">${one(src)}</svg>` : "");
    const book = `<g class="kh-kread" display="none"><path d="M-13 -35 0 -31.5 13 -35 13 -21 0 -17.5 -13 -21Z" fill="#e0674f" stroke="#b44a37" stroke-width="1.2" stroke-linejoin="round"/><path d="M-11 -33.6 0 -30.4V-19.4L-11 -22.6Z" fill="#fffaf0"/><path d="M11 -33.6 0 -30.4V-19.4L11 -22.6Z" fill="#f6efe0"/><path d="M-8.5 -29.5 -3 -27.9M-8.5 -26 -3 -24.4M8.5 -29.5 3 -27.9M8.5 -26 3 -24.4" stroke="#cdbb9a" stroke-width="1" stroke-linecap="round"/><path d="M0 -30.4V-19.4" stroke="#b44a37" stroke-width="1.2"/>
      <path d="M4 -31 9 -33.2 9 -22 4 -19.8Z" fill="#fffaf0" opacity="0"><animate attributeName="opacity" values="0;0.95;0" dur="3.2s" repeatCount="indefinite"/></path></g>`;
    const can = `<g class="kh-kwater" display="none"><g><animateTransform attributeName="transform" type="rotate" values="0 17 -30;-20 17 -30;-20 17 -30;0 17 -30" keyTimes="0;.3;.8;1" dur="2.6s" repeatCount="indefinite"/>
      <path d="M10 -37q-8 1-7 9" fill="none" stroke="#3b86b8" stroke-width="2.2" stroke-linecap="round"/><rect x="9" y="-38" width="16" height="12" rx="3" fill="#7cc4ee" stroke="#3b86b8" stroke-width="1.3"/><path d="M24 -32 33 -40" stroke="#3b86b8" stroke-width="2.6" stroke-linecap="round"/><path d="M31 -44 37 -40.5 32 -37Z" fill="#3b86b8"/><rect x="11" y="-36" width="4" height="8" rx="1.5" fill="#fff" opacity=".45"/></g>
      <g fill="#8fd3f5"><circle cx="38" cy="-32" r="1.6"><animate attributeName="cy" values="-36;-14" dur=".9s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur=".9s" repeatCount="indefinite"/></circle><circle cx="34" cy="-33" r="1.4"><animate attributeName="cy" values="-36;-14" dur=".9s" begin=".3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur=".9s" begin=".3s" repeatCount="indefinite"/></circle><circle cx="41" cy="-33" r="1.4"><animate attributeName="cy" values="-36;-14" dur=".9s" begin=".6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur=".9s" begin=".6s" repeatCount="indefinite"/></circle></g></g>`;
    // standing and turned away: there is no standing back picture, so the 3/4-back picture is used (a bit larger, feet on the floor)
    const standBack = `<g class="kh-kstandback" display="none" transform="translate(0 3) scale(1.38)">${sitBack3q(worn, isHat).replace("kh-ksitback", "").replace('display="none"', 'display="inline"')}</g>`;
    // lying: the standing koala turned onto its back (angle set by the facing, see updateKoala)
    // iso pictures (when supplied): the body picture is swapped, whatever is worn is laid over it as before
    const wornIso = wornNames().filter((n) => n !== "base"), wornOver = wornIso.filter((n) => !KBEHIND.includes(n)).map(cvIso).join(""), wornUnder = wornIso.filter((n) => KBEHIND.includes(n)).map(cvIso).join("");
    // front views carry what is worn; back views show only the picture (the front-facing item pictures do not fit a back)
    const backPic = (n) => { const b = KISOB[n]; return b ? `<image href="/img/koala/${n}_isob.webp" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>` : ""; };   // back view: only items that have a back picture (the front ones do not fit a back)
    const isoStand = (cls, src, items, back) => (src ? `<svg class="${cls}" x="-21.6" y="-69.8" width="43.2" height="79.9" viewBox="64 20 553 1020" overflow="hidden" display="none">${items ? wornUnder : ""}${one(src)}${items ? wornOver : back ? wornIso.filter((n) => KBEHIND.includes(n) && !CUSTOM_WARD[n]).concat(wornIso.filter((n) => !KBEHIND.includes(n) && !CUSTOM_WARD[n])).map(backPic).join("") : ""}</svg>` : "");
    const isoSit = (cls, src, items, back) => (src ? (items ? sitSvg(cls, src, 40, 49.1, 720, 883, "translate(5.5 9.2) scale(1.281) translate(-64 -222)", (n) => !KSLOT.feet.includes(n) && !KSLOT.legs.includes(n), false, cvIso, { hat: "translate(-33.2 -279) scale(1.25)", face: "translate(-71.6 -333) scale(1.374)" }) : `<svg class="${cls}" x="-20" y="-49.1" width="40" height="49.1" viewBox="0 0 720 883" overflow="${back ? "visible" : "hidden"}" display="none"><image href="${src}" x="0" y="0" width="720" height="883"/>${back ? `<g transform="translate(-139.5 -357.2) scale(1.606)">${wornIso.filter((n) => !CUSTOM_WARD[n] && (KSLOT.body.includes(n) || n === "scarf" || KSLOT.back.includes(n))).map(backPic).join("")}</g><g transform="translate(-139.5 -302) scale(1.606)">${wornIso.filter((n) => !CUSTOM_WARD[n] && KSLOT.hat.includes(n)).map(backPic).join("")}</g>` : ""}</svg>`) : "");   // sitting from behind: the standing-back item pictures, moved so the head lines up (hats, tops, scarf, back items)
    const lieItems = wornIso.filter((n) => KISOL[n] && !CUSTOM_WARD[n]).sort((a, b) => kordered(ses.S.worn).indexOf(a) - kordered(ses.S.worn).indexOf(b)).map((n) => { const b = KISOL[n]; return `<image href="/img/koala/${n}_isol.webp" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
    const lieIso = extraImg.isoLie ? `<g class="kh-klieiso"><svg x="-30" y="-17" width="60" height="38.1" viewBox="0 0 1076 683" overflow="visible"><image href="${extraImg.isoLie}" x="0" y="0" width="1076" height="683"/>${lieItems}</svg></g>` : "";   // the lying picture with the worn items that have a lying picture (the others are left off)
    const lie = `<g class="kh-klie" display="none">${lieIso}<g class="kh-klieturn" display="${extraImg.isoLie ? "none" : "inline"}" transform="translate(0 -12) rotate(0) translate(0 40)">${stand.replace("kh-kstand", "kh-klstand")}</g></g>`;   // its own class: ".kh-kstand" must only ever find the real standing picture (the copy used to be found first, so the front picture never switched off and was drawn over the back / sitting ones)
    return `<g class="kh-koala" data-k="0"><ellipse class="kh-kshadow" cx="0" cy="2" rx="24" ry="8" fill="#000" opacity=".16"/><g class="kh-kbody">${lie}<g class="kh-kflip">${stand}${isoStand("kh-kisosf", extraImg.isoStandF, true)}${isoStand("kh-kisosb", extraImg.isoStandB, false, true)}${isoSit("kh-kisotf", extraImg.isoSitF, true)}${isoSit("kh-kisotb", extraImg.isoSitB, false, true)}${back}${standBack}${sit}${readImg}${pose("kh-kwaterimg", extraImg.water)}${book}${can}</g></g></g>`;
  }
  // how far the sitting koala sinks into a seat (the seat pictures are not drawn at the geometric seat height, so the koala looked as if it hovered over them)
  const SIT_DROP = { stool: 10, chair: 10, sofa: 14, bench: 8 }; window.KoalaHouse.sitDrop = SIT_DROP;
  const FLIP = [-1, 1, 1, -1]; // facing 0 (+r, left-down) 1 (+c, right-down) 2 (-r, right-up) 3 (-c, left-up)
  function koalaCellFree(c, r) {
    const room = curRoom(), st = curState();
    if (c < 0 || r < 0 || c >= room.C || r >= room.R) return false;
    return !H.occ(room, st)[c + "," + r];
  }
  function placeKoalaFree() {
    const k = ses.koala, room = curRoom();
    if (k.pose === "sit" && k.seat && H.seatAt(curState(), Math.round(k.c), Math.round(k.r))) return;
    if ((k.pose === "read" || k.pose === "water") && curState().items.some((i) => i.uid === k.act)) return;
    if (k.pose === "lie" && bedAt(Math.round(k.c), Math.round(k.r))) return;
    standUp(true);
    if (koalaCellFree(Math.round(k.c), Math.round(k.r))) return;
    const cells = H.freeCells(room, curState());
    if (!cells.length) return;
    cells.sort((a, b) => Math.hypot(a[0] - k.c, a[1] - k.r) - Math.hypot(b[0] - k.c, b[1] - k.r));
    k.c = cells[0][0]; k.r = cells[0][1]; k.path = [];
  }
  function updateKoala() {
    const g = ses.root.querySelector(".kh-koala");
    if (!g) return;
    const k = ses.koala, stoolSit = k.pose === "sit" && k.seat && /^stool/.test((curState().items.find((i) => i.uid === k.seat) || {}).id || ""), seatIt = k.pose === "sit" && k.seat && curState().items.find((i) => i.uid === k.seat), tk = seatIt ? H.tuckOf(seatIt.id, seatIt.m).map((v, i) => v + (/^stool/.test(seatIt.id) ? { 2: [0.5, 0.2], 3: [0.2, 0.5] }[((seatIt.m | 0) % 4 + 4) % 4] || [0, 0] : [0, 0])[i]) : [0, 0], [x, y] = H.proj(k.c + 0.5 + tk[0], k.r + 0.5 + tk[1], (k.z || 0) - (stoolSit ? 3 : 0));
    g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const sit = k.pose === "sit", lie = k.pose === "lie", rd = k.pose === "read", wt = k.pose === "water", away = k.dir === 2 || k.dir === 3, hasBack = !!g.querySelector(".kh-kback");
    const hasRd = true, hasWt = !!g.querySelector(".kh-kwaterimg");
    const show = (sel, on) => { const e = g.querySelector(sel); if (e) e.setAttribute("display", on ? "inline" : "none"); };
    const isoS = (k.pose === "stand" && (away ? g.querySelector(".kh-kisosb") : g.querySelector(".kh-kisosf"))) || null, isoT = (sit && (away ? g.querySelector(".kh-kisotb") : g.querySelector(".kh-kisotf"))) || null;
    const backPic = k.pose === "stand" && away;   // standing, turned away: the back picture (a made-up one from the 3/4-back art when there is no real standing back)
    ["kisosf", "kisosb", "kisotf", "kisotb"].forEach((c) => show("." + "kh-" + c, false));
    if (isoS) isoS.setAttribute("display", "inline"); if (isoT) isoT.setAttribute("display", "inline");
    show(".kh-kstand", !sit && !(rd && hasRd) && !(wt && hasWt) && !backPic && !isoS); show(".kh-kback", backPic && hasBack && !isoS); show(".kh-kstandback", backPic && !hasBack && !isoS);
    show(".kh-klie", lie); { const kf = g.querySelector(".kh-kflip"); if (kf) kf.setAttribute("display", lie ? "none" : "inline"); }
    { const lt = g.querySelector(".kh-klieturn"); if (lt) lt.setAttribute("transform", `translate(0 ${k.z ? -6 : -12}) rotate(${[-135, 135, 45, -45][k.dir]}) translate(0 40)`); } show(".kh-ksit", sit && !away && !isoT); show(".kh-ksitback", sit && away && !isoT);
    show(".kh-kreadimg", rd); show(".kh-kwaterimg", wt); show(".kh-kread", false); show(".kh-kwater", wt && !hasWt);
    g.querySelector(".kh-kbody").setAttribute("transform", `translate(0 ${(-Math.abs(Math.sin(k.bob)) * (k.pose === "stand" ? 4 : 1.2)).toFixed(1)})`);
    g.querySelector(".kh-kflip").setAttribute("transform", (isoS || isoT) ? `scale(${[1, -1, -1, 1][k.dir]} 1)` : `scale(${FLIP[k.dir]} 1) skewY(${k.dir < 2 ? 12 : -12})`);   // iso pictures face the lower-left (front) / upper-left (back) and are mirrored for the right-hand turns
    { const li = g.querySelector(".kh-klieiso"); if (li) li.setAttribute("transform", `translate(0 ${k.z ? -2 : -6}) ` + ["scale(-1 1) rotate(190)", "rotate(190)", "scale(-1 1) rotate(10)", "rotate(10)"][k.dir]); }   // a lean as well as the mirror, so the four quarter turns all look different
    g.querySelector(".kh-kshadow").setAttribute("opacity", (k.z ? 0 : 0.16));
    let key = k.c + k.r + 2.02;
    if (k.pose === "lie" && k.bed) { const bd = curState().items.find((i) => i.uid === k.bed); if (bd) key = Math.max(key, H.depthKey(bd) + 0.05); }
    if (seatIt && !/^(stool|chair)/.test(seatIt.id)) key = Math.max(key, H.depthKey(seatIt) + 0.05);   // a sofa / bench spans several cells: its far end sorts after the koala, so it was drawn over it
    g.dataset.k = key;
    const layer = ses.root.querySelector(".kh-items");
    let before = null;
    for (const ch of layer.children) { if (ch === g) continue; if (parseFloat(ch.dataset.k) > key) { before = ch; break; } }
    if (g.nextSibling !== before || g.parentNode !== layer) layer.insertBefore(g, before);
    // seen from behind, a chair's backrest is between us and the koala: draw the backrest again over it (cloned, clipped to the backrest) so it sits IN the chair
    layer.querySelectorAll(".kh-kfront").forEach((e) => e.remove());
    const chairIt = false && stoolSit && away && curState().items.find((i) => i.uid === k.seat), src = chairIt && layer.querySelector(`.kh-it[data-uid="${chairIt.uid}"]`);
    if (src) {
      const bx = k.dir === 3 ? [0.8, 0.9, 0.1, 0.9] : [0.1, 0.9, 0.8, 0.9], pts = [];
      for (const x of [bx[0], bx[1]]) for (const y of [bx[2], bx[3]]) for (const z of [23, 52]) pts.push(H.proj(k.c + x + tk[0], k.r + y + tk[1], z));
      pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
      for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (const q of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
      const hull = lo.slice(0, -1).concat(up.slice(0, -1)).map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
      const cl = src.cloneNode(true); cl.classList.remove("kh-sel"); cl.classList.add("kh-kfront"); cl.removeAttribute("data-uid"); cl.dataset.k = String(key + 0.001); cl.style.pointerEvents = "none";
      const wrap = document.createElementNS("http://www.w3.org/2000/svg", "g"), cp = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      cp.id = "khfrontclip"; cp.innerHTML = `<polygon points="${hull}"/>`;
      wrap.setAttribute("class", "kh-kfront"); wrap.dataset.k = String(key + 0.001); wrap.setAttribute("clip-path", "url(#khfrontclip)"); wrap.style.pointerEvents = "none";
      cl.classList.remove("kh-kfront"); wrap.appendChild(cp); wrap.appendChild(cl); g.after(wrap);
    }
  }
  function bfs(from, to) {
    const room = curRoom(), key = (c, r) => c + "," + r, seen = { [key(from[0], from[1])]: null }, q = [from];
    while (q.length) {
      const [c, r] = q.shift();
      if (c === to[0] && r === to[1]) { const p = []; let k = key(c, r); while (seen[k] !== null) { const [a, b] = k.split(",").map(Number); p.unshift([a, b]); k = seen[k]; } return p; }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
        const nc = c + dc, nr = r + dr, nk = key(nc, nr);
        if (nc < 0 || nr < 0 || nc >= room.C || nr >= room.R || nk in seen || !koalaCellFree(nc, nr)) return;
        seen[nk] = key(c, r); q.push([nc, nr]);
      });
    }
    return null;
  }
  // sit down: on a seat piece (chair / sofa / bench), or on the floor
  // a chair with a desk or table right beside it: the koala sits facing it (so you see its back)
  function deskDir(cell) {
    const st = curState();
    for (const [dc, dr, dir] of [[0, -1, 2], [-1, 0, 3], [1, 0, 1], [0, 1, 0]]) {
      const hit = (st.items || []).find((i) => /desk|table/i.test(i.id) && H.cellsOf(i).includes((cell[0] + dc) + "," + (cell[1] + dr)));
      if (hit) return dir;
    }
    return null;
  }
  function sitOn(seatItem, cell, exitCell) {
    const k = ses.koala;
    k.pose = "sit"; k.path = []; k.after = null; k.sitT = 4 + Math.random() * 5;
    if (seatItem) { const d = H.D[seatItem.id]; k.c = cell[0]; k.r = cell[1]; k.z = d.seat - (SIT_DROP[(seatItem.id.match(/^(stool|chair|sofa|bench)/) || [])[1]] || 0); k.seat = seatItem.uid; k.dir = H.seatFacing(seatItem); if (!(seatItem.m | 0)) { const dk = deskDir(cell); if (dk != null) { k.dir = dk; if (/^stool/.test(seatItem.id)) { seatItem.m = dk; H.persist(ses.S); drawScene(); } } } k.exit = exitCell || null; }
    else { k.z = 0; k.seat = null; k.exit = null; }
  }
  // what the koala can lie on: a bed, or a seat piece that is longer than one cell (sofa, bench)
  const bedAt = (c, r) => (curState().items || []).find((i) => { const d = H.D[i.id]; return d && (/^bed/i.test(i.id) || (d.seat && /^(sofa|bench)/.test(i.id))) && H.cellsOf(i).includes(c + "," + r); }) || null;
  // lie down: on the bed under the koala when there is one (then it lies along the bed), otherwise on the floor
  function lieDown() {
    const k = ses.koala;
    const small = k.pose === "sit" && k.seat && curState().items.find((i) => i.uid === k.seat);   // a one-cell chair / stool is too small to lie on: step off to the floor beside it
    if (small && /^(stool|chair)/.test(small.id)) {
      if (!(k.exit && koalaCellFree(k.exit[0], k.exit[1]))) { toast(T("누울 자리가 없어요", "No room to lie down"), true); return; }
      k.c = k.exit[0]; k.r = k.exit[1];
    }
    const c = Math.round(k.c), r = Math.round(k.r), bed = bedAt(c, r);
    k.pose = "lie"; k.path = []; k.after = null; k.seat = null; k.exit = null; k.act = null; k.sitT = 1e9;
    k.z = bed ? Math.max(0, (/^bed/i.test(bed.id) ? (H.D[bed.id].topH || 40) - 6 : (H.D[bed.id].seat || 24) + (/^bench/.test(bed.id) ? 4 : -4))) : 0; k.bed = bed ? bed.uid : null;
    if (bed) { const o = H.orient(H.D[bed.id], bed.m), alongC = o.w >= o.d; if (alongC ? (k.dir !== 1 && k.dir !== 3) : (k.dir !== 0 && k.dir !== 2)) k.dir = alongC ? 3 : 2; }
  }
  function standUp(quiet) {
    const k = ses.koala;
    if (k.pose === "stand") return;
    if (k.seat && k.exit && koalaCellFree(k.exit[0], k.exit[1])) { k.c = k.exit[0]; k.r = k.exit[1]; }
    else if (k.bed && !koalaCellFree(Math.round(k.c), Math.round(k.r))) {   // lying on a bed / sofa: step down to the nearest free cell beside it
      const bd = curState().items.find((i) => i.uid === k.bed);
      if (bd) { let best = null; H.cellsOf(bd).forEach((s) => { const [bc, br] = s.split(",").map(Number); neighbourFree(bc, br).forEach((n) => { const dist = Math.hypot(n[0] - k.c, n[1] - k.r); if (!best || dist < best.dist) best = { n, dist }; }); }); if (best) { k.c = best.n[0]; k.r = best.n[1]; } }
    }
    k.pose = "stand"; k.z = 0; k.seat = null; k.exit = null; k.act = null; k.bed = null;
    if (!quiet) k.wait = 0.8;
  }
  // doing something at a piece: reading at a shelf, tending a plant. The koala stands next to it, facing it.
  const actAt = (st, c, r) => (st.items || []).find((i) => { const d = H.D[i.id]; return d && d.act && H.cellsOf(i).includes(c + "," + r); }) || null;
  function doAct(item, cell) {
    const k = ses.koala, d = H.D[item.id], dc = cell[0] - k.c, dr = cell[1] - k.r;
    k.pose = d.act; k.act = item.uid; k.z = 0; k.seat = null; k.exit = null; k.path = []; k.after = null; k.sitT = 6 + Math.random() * 4; k.bob = 0;
    if (Math.abs(dc) >= Math.abs(dr)) k.dir = dc > 0 ? 1 : 3; else k.dir = dr > 0 ? 0 : 2;
  }
  function startAct(item) { // drag the koala onto the piece: it steps to a free tile beside it
    const k = ses.koala, cells = H.cellsOf(item).map((x) => x.split(",").map(Number)), from = [Math.round(k.c), Math.round(k.r)];
    let best = null;
    cells.forEach((cell) => neighbourFree(cell[0], cell[1]).forEach((n) => { const dist = Math.hypot(n[0] - from[0], n[1] - from[1]); if (!best || dist < best.dist) best = { n, cell, dist }; }));
    if (!best) { toast(T("옆에 설 자리가 없어요", "No free spot beside it"), true); return false; }
    standUp(true); k.c = best.n[0]; k.r = best.n[1]; doAct(item, best.cell);
    return true;
  }
  const neighbourFree = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [c + a, r + b]).filter((p) => koalaCellFree(p[0], p[1]));
  function koalaThink(dt) {
    const k = ses.koala, st = curState();
    if (k.pose === "lie") { updateKoala(); return; }
    if (k.pose === "sit") {
      if (k.seat && !st.items.some((i) => i.uid === k.seat)) { standUp(); return; }
      k.sitT -= dt; k.bob = 0;
      if (k.sitT <= 0) standUp();
      updateKoala(); return;
    }
    if (k.pose === "read" || k.pose === "water") {
      if (!st.items.some((i) => i.uid === k.act)) { standUp(); return; }
      k.sitT -= dt; k.bob += dt * 2.4;
      if (k.sitT <= 0) standUp();
      updateKoala(); return;
    }
    if (k.path.length) {
      const [tc, tr] = k.path[0], dc = tc - k.c, dr = tr - k.r, d = Math.hypot(dc, dr), step = 1.7 * dt;
      k.bob += dt * 11;
      if (d <= step) {
        k.c = tc; k.r = tr; k.path.shift();
        if (!k.path.length) {
          if (k.after) { const a = k.after; k.after = null; const piece = st.items.find((i) => i.uid === a.uid); if (piece) { if (a.kind === "act") doAct(piece, a.cell); else sitOn(piece, a.cell, [tc, tr]); } }
          else k.wait = 1.5 + Math.random() * 3;
        }
      } else { k.c += (dc / d) * step; k.r += (dr / d) * step; }
      if (Math.abs(dc) >= Math.abs(dr)) { if (dc) k.dir = dc > 0 ? 1 : 3; } else if (dr) k.dir = dr > 0 ? 0 : 2;
      updateKoala(); return;
    }
    k.wait -= dt; k.bob = 0;
    if (k.wait <= 0) {
      const room = curRoom(), cells = H.freeCells(room, st), from = [Math.round(k.c), Math.round(k.r)], roll = Math.random();
      const seats = st.items.filter((i) => H.D[i.id] && H.D[i.id].seat), acts = st.items.filter((i) => H.D[i.id] && H.D[i.id].act);
      const goTo = (piece, kind) => { // walk to a free tile beside the piece, then sit / read / water there
        for (const cell of H.cellsOf(piece).map((x) => x.split(",").map(Number))) {
          const adj = neighbourFree(cell[0], cell[1]).sort((a, b) => Math.hypot(a[0] - from[0], a[1] - from[1]) - Math.hypot(b[0] - from[0], b[1] - from[1]))[0];
          if (!adj) continue;
          const p = adj[0] === from[0] && adj[1] === from[1] ? [] : bfs(from, adj);
          if (p) { if (p.length) { k.path = p; k.after = { uid: piece.uid, cell, kind }; } else if (kind === "act") doAct(piece, cell); else sitOn(piece, cell, adj); return; }
        }
      };
      if (roll < 0.25 && seats.length) goTo(seats[Math.floor(Math.random() * seats.length)], "seat");
      else if (roll < 0.5 && acts.length) goTo(acts[Math.floor(Math.random() * acts.length)], "act");
      else if (roll < 0.6) sitOn(null);
      else for (let i = 0; i < 6 && !k.path.length && cells.length; i++) { const t = cells[Math.floor(Math.random() * cells.length)]; if (t[0] !== from[0] || t[1] !== from[1]) { const p = bfs(from, t); if (p && p.length) k.path = p; } }
      k.wait = 1;
    }
    updateKoala();
  }
  function loop(ts) {
    if (!ses) return;
    if (!ses.root.isConnected) { destroy(); return; }
    const dt = Math.min(0.05, (ts - ses.last) / 1000); ses.last = ts;
    if (ses.screen === "room" && !ses.edit && !ses.drag && !reduced()) koalaThink(dt);
    ses.raf = requestAnimationFrame(loop);
  }

  /* ---- scene drawing ---- */
  function drawScene() {
    H.setOpen(ses.subOf);
    const room = curRoom(), st = curState();
    ses.root.querySelector("#kh-scene").innerHTML = H.roomSvg(room, st, { label: roomLabel(room), extra: '<g class="kh-ghost"></g>' });
    const svg = ses.root.querySelector(".kh-room-svg");
    const layer = svg.querySelector(".kh-items");
    const tmp = document.createElementNS(NS, "svg"); tmp.innerHTML = koalaMarkup();
    layer.appendChild(tmp.firstChild);
    updateKoala();
    applySel();
    if (ses.zoom > 1) setZoom(ses.zoom);
  }
  function selEl() {
    if (!ses.sel) return null;
    if (ses.sel === "koala") return ses.root.querySelector(".kh-koala");
    if (ses.sel === "house") return ses.root.querySelector(".kh-house");
    return ses.root.querySelector(`.kh-it[data-uid="${ses.sel}"]`);
  }
  function applySel() {
    if (ses.subOf && ses.sel !== ses.subOf) { ses.subOf = null; drawScene(); drawPanel(); }   // looking at something else: close it again
    ses.root.querySelectorAll(".kh-sel").forEach((e) => e.classList.remove("kh-sel"));
    const e = selEl(); if (e) e.classList.add("kh-sel");
  }

  /* ---- coordinates ---- */
  function toScene(ev) {
    const svg = ses.root.querySelector(".kh-room-svg"), pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  const cellOf = (sx, sy) => ({ c: (sx / H.TW * 2 + sy / H.TH * 2) / 2, r: (sy / H.TH * 2 - sx / H.TW * 2) / 2 });

  /* ---- wall pieces ---- */
  const wallLen = (room, side) => (side === "L" ? room.R : room.C);
  function wallOverlap(st, piece, skipUid) {
    const d = H.D[piece.id];
    return st.items.some((o) => {
      const od = H.D[o.id];
      if (!od || !od.wall || o.uid === skipUid || o.side !== piece.side) return false;
      return piece.u < o.u + od.uw - 0.01 && o.u < piece.u + d.uw - 0.01 && piece.h < (o.h || od.defH) + od.vh - 1 && (o.h || od.defH) < piece.h + d.vh - 1;
    });
  }
  function wallTarget(sx, sy, d, room) {
    const side = sx < 0 ? "L" : "R", u = Math.abs(sx) / 32, floorY = 16 * u, hh = floorY - sy;
    let uu = Math.round((u - d.uw / 2) * 4) / 4, h = Math.round((hh - d.vh / 2) / 4) * 4;
    const len = wallLen(room, side);
    uu = Math.max(0, Math.min(len - d.uw, uu)); h = Math.max(4, Math.min(H.WALL_H - d.vh - 6, h));
    return { side, u: uu, h };
  }

  /* ---- placing / moving ---- */
  function recalcZ(st) {
    const room = curRoom();
    st.items.forEach((i) => {
      const d = H.D[i.id]; if (!d || !d.stack) return;
      const occ = H.occ(room, st, i.uid)[H.cellsOf(i)[0]] || [];
      const top = occ.find((o) => H.D[o.id].topH && !H.D[o.id].stack);
      i.z = top ? H.D[top.id].topH : 0;
    });
  }
  function autoPlace(id) {
    const room = curRoom(), st = curState(), d = H.D[id];
    if (d.wall) {
      const cands = [];
      ["R", "L"].forEach((side) => { for (let u = 0.5; u <= wallLen(room, side) - d.uw + 1e-6; u += 0.5) cands.push({ side, u, h: d.defH }); });
      cands.sort((a, b) => Math.abs(a.u + d.uw / 2 - wallLen(room, a.side) / 2) - Math.abs(b.u + d.uw / 2 - wallLen(room, b.side) / 2));
      const p = cands.find((c) => !wallOverlap(st, Object.assign({ id }, c)));
      return p ? Object.assign({ uid: H.newUid(), id }, p) : null;
    }
    const cells = [];
    for (let c = 0; c < room.C; c++) for (let r = 0; r < room.R; r++) cells.push([c, r]);
    const mid = room.kind === "yard" ? [room.C / 2, room.R * 0.7] : [room.C / 2, room.R / 2];
    cells.sort((a, b) => Math.hypot(a[0] - mid[0], a[1] - mid[1]) - Math.hypot(b[0] - mid[0], b[1] - mid[1]));
    let best = null;
    for (const m of [0, 1]) {
      for (const [c, r] of cells) {
        const piece = { uid: H.newUid(), id, c, r, m, z: 0 }, res = H.canPlace(room, st, piece);
        if (res.ok) { piece.z = res.z; if (d.stack) { if (res.z === 0) return piece; } if (!best) best = piece; }
      }
      if (best && !d.stack) break;
    }
    return best;
  }
  function placeNew(id, piece) {
    const st = curState();
    if (!piece) piece = autoPlace(id);
    if (!piece) { toast(T("자리가 없어요. 아이템을 치워 보세요.", "No room left. Remove something first."), true); return null; }
    st.items.push(piece); recalcZ(st); leaveSubs();
    ses.sel = piece.uid; save(); drawScene(); showMenu();
    return piece;
  }

  /* ---- selection menu ---- */
  function hideMenu() { const m = ses.root.querySelector("#kh-menu"); if (m) m.hidden = true; }
  function showMenu() {
    const m = ses.root.querySelector("#kh-menu");
    if (!m) return;
    const target = selEl();
    if (!ses.sel || !ses.edit || !target) { m.hidden = true; return; }
    let name, btns;
    const b = (act, icon, label, cls) => `<button type="button" class="kh-mbtn${cls ? " " + cls : ""}" data-act="${act}" aria-label="${esc(label)}">${ic(icon)}<span>${esc(label)}</span></button>`;
    const turn = b("rotl", "rotl", T("왼쪽", "Left")) + b("rot", "rot", T("오른쪽", "Right"));
    if (ses.sel === "koala") {
      const ps = ses.koala.pose;   // one button that goes round: stand -> sit -> lie -> stand
      name = T("코알라", "Koala");
      btns = turn + (ps === "sit" ? b("sit", "lie", T("눕기", "Lie down")) : ps === "lie" ? b("sit", "stand", T("일어서기", "Stand")) : b("sit", "sit", T("앉기", "Sit")));
    } else if (ses.sel === "house") {
      name = T("집", "House");
      btns = b("hl", "left", T("왼쪽 이동", "Move left")) + b("hr", "right", T("오른쪽 이동", "Move right")) + turn;
    } else {
      const it = curState().items.find((x) => x.uid === ses.sel);
      if (!it) { m.hidden = true; return; }
      const d = H.D[it.id];
      name = nm(d);
      btns = (d.wall ? "" : turn) + "" + b("del", "trash", T("치우기", "Remove"), "danger");
    }
    m.innerHTML = `<div class="kh-mhead"><b>${esc(name)}</b><button type="button" class="kh-mclose" data-act="x" aria-label="${T("닫기", "Close")}">${ic("x")}</button></div><div class="kh-mrow">${btns}</div>`;
    m.hidden = false;
    const sr = ses.root.querySelector("#kh-stage").getBoundingClientRect(), tr = target.getBoundingClientRect();
    const w = m.offsetWidth, h = m.offsetHeight;
    let x = tr.left + tr.width / 2 - sr.left - w / 2, y = tr.top - sr.top - h - 8;
    if (y < 56) y = tr.bottom - sr.top + 8;
    x = Math.max(6, Math.min(sr.width - w - 6, x)); y = Math.max(56, Math.min(sr.height - h - 6, y));
    m.style.left = x + "px"; m.style.top = y + "px";
    m.querySelectorAll("[data-act]").forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); menuAct(bt.dataset.act); }; });
  }
  function yardValid(y) { // does everything standing in the yard still fit after a change?
    const dm = H.yardDims(y), rc = H.houseRect(y), virt = H.occ(Object.assign({ kind: "yard" }, dm), Object.assign({}, y, { items: [] }));
    return y.items.every((i) => {
      const d = H.D[i.id]; if (!d || d.wall) return true;
      const f = H.footprint(i);
      if (i.c < 0 || i.r < 0 || i.c + f.w > dm.C || i.r + f.d > dm.R) return false;
      return H.cellsOf(i).every((k) => { const [c, r] = k.split(",").map(Number); return !(c >= rc.c0 && c < rc.c1 && r >= rc.r0 && r < rc.r1) && (d.flat || !virt[k]); });
    });
  }
  function menuAct(act) {
    const st = curState();
    if (act === "x") { ses.sel = null; applySel(); hideMenu(); return; }
    if (ses.sel === "koala") {
      const k = ses.koala;
      if (act === "rot" || act === "rotl") { k.dir = (k.dir + (act === "rot" ? 1 : 3)) % 4; updateKoala(); }
      else if (act === "sit") { if (k.pose === "lie") standUp(true); else if (k.pose === "sit") { lieDown(); } else { const s = H.seatAt(st, Math.round(k.c), Math.round(k.r)); sitOn(s || null, [Math.round(k.c), Math.round(k.r)]); } updateKoala(); showMenu(); }
      return;
    }
    if (ses.sel === "house") {
      const y = JSON.parse(JSON.stringify(ses.S.yard)); y.house = y.house || {};
      if (act === "rot" || act === "rotl") { y.house.rot = y.house.rot ? 0 : 1; y.house.shift = 0; }
      else if (act === "hl" || act === "hr") y.house.shift = (y.house.shift || 0) + (act === "hr" ? 1 : -1) * (y.house.rot ? -1 : 1);   // turned, the house slides along the other axis: keep "right" on the right of the screen
      const before = H.houseRect(ses.S.yard), after = H.houseRect(y);
      if (before.c0 === after.c0 && before.r0 === after.r0 && before.rot === after.rot) { toast(T("더 못 움직여요", "It can't go further"), true); return; }
      if (!yardValid(y)) { toast(T("집 자리에 있는 물건을 먼저 치워요", "Move the things in the way first"), true); return; }
      ses.S.yard = y; save(); drawScene(); placeKoalaFree(); updateKoala(); showMenu(); return;
    }
    const it = st.items.find((x) => x.uid === ses.sel);
    if (!it) return;
    if (act === "del") { leaveSubs(); st.items = st.items.filter((x) => x.uid !== it.uid); ses.sel = null; recalcZ(st); save(); drawScene(); hideMenu(); placeKoalaFree(); updateKoala(); return; }
    if (act === "subs") { ses.subOf = it.uid; hideMenu(); drawScene(); applySel(); drawPanel(); return; }
    if (act === "rot" || act === "rotl") {
      const room = curRoom(), want = Object.assign({}, it, { m: ((it.m | 0) + (act === "rot" ? 1 : 3)) % 4 });
      let ok = null;
      for (const [dc, dr] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1], [1, 1], [-2, 0], [0, -2]]) {
        const p = Object.assign({}, want, { c: want.c + dc, r: want.r + dr }), res = H.canPlace(room, st, p, it.uid);
        if (res.ok) { p.z = res.z; ok = p; break; }
      }
      if (!ok) { toast(T("여기선 돌릴 수 없어요", "No space to turn it here"), true); return; }
      const riders = (H.D[it.id].topH && !H.D[it.id].stack) ? st.items.filter((o) => o.uid !== it.uid && H.D[o.id].stack && H.cellsOf(it).includes(H.cellsOf(o)[0])) : [];
      riders.forEach((o) => { o.c = ok.c; o.r = ok.r; });
      Object.assign(it, ok); recalcZ(st); save(); drawScene(); showMenu();
    }
  }

  /* ---- what is inside furniture (sub-items): shown in the right-hand / lower panel, like opening a folder ---- */
  function leaveSubs() { if (ses.subOf) { ses.subOf = null; drawScene(); drawPanel(); } }
  // the wardrobe: every piece of Koala clothing in the shop; what you own can be put in (it shows inside the open wardrobe), the rest stays faded until bought
  const CLOTH_SLOTS = ["body", "legs", "feet", "hat", "neck", "face", "back"];
  function clothesPanel(panel, it) {
    const d = H.D[it.id], cat = (tabsFor(ses.roomId === "yard").find((t) => t[0] === d.cat) || [0, 0, T("가구", "Furniture")])[2];
    const slotName = { hat: T("머리", "Head"), face: T("얼굴", "Face"), neck: T("목", "Neck"), body: T("상의", "Tops"), legs: T("하의", "Bottoms"), back: T("등", "Back"), feet: T("신발", "Shoes") };
    const stOf = (n) => { const st = wardApi ? wardApi.status(id2d(n)) : { state: "owned" }; return st || { state: "owned" }; };
    const cur = it.sub || [];
    const grp = CLOTH_SLOTS.filter((sl) => KSLOT[sl]).map((sl) => `<h3>${slotName[sl]}</h3><div class="kh-subgrid">${KSLOT[sl].map((n) => {
      const st = stOf(n), own = st.state === "owned", on = cur.includes(n);
      return `<button type="button" class="kh-subitem${on ? " on" : ""}${own ? "" : " locked"}" data-cl="${n}" aria-pressed="${on}"><img class="kh-clth" src="${kthumb(n)}" alt="" draggable="false"><span class="kh-nm">${esc(T(KNAME[n][0], KNAME[n][1]))}</span>${own ? (on ? `<span class="kh-pr kh-ok">${ic("check")}</span>` : "") : `<span class="kh-pr">${st.state === "buyable" ? COIN + (st.cost || 0) : "🔒"}</span>`}</button>`;
    }).join("")}</div>`).join("");
    panel.innerHTML = `<nav class="kh-crumbs" aria-label="${T("현재 위치", "You are here")}"><button type="button" class="kh-up" data-up aria-label="${T("상위로", "Up one level")}">${ic("up")}</button>
      <button type="button" class="kh-crumb" data-up>${esc(cat)}</button><span class="kh-sep">${ic("chev")}</span><span class="kh-crumb cur">${esc(nm(d))}</span></nav>
      <div class="kh-grid" id="kh-grid">${shelfHead(T("옷장 속 옷", "Clothes inside"), `${cur.length}/12`)}<p class="kh-subnote">${T("산 옷을 눌러 옷장에 넣고 빼요. 못 산 옷은 흐리게 보여요.", "Tap clothes you own to put them in or take them out. Clothes you haven't bought are faded.")}</p>${grp}</div>`;
    panel.querySelectorAll("[data-up]").forEach((x) => { x.onclick = () => { ses.subOf = null; drawScene(); applySel(); drawPanel(); }; });
    panel.querySelectorAll("[data-cl]").forEach((bt) => {
      bt.onclick = () => {
        const n = bt.dataset.cl, st = stOf(n), nmN = T(KNAME[n][0], KNAME[n][1]), pic = `<img src="${kthumb(n)}" alt="" draggable="false">`;
        const toggle = () => {
          const sub = (it.sub || []).slice(), at = sub.indexOf(n);
          if (at >= 0) sub.splice(at, 1); else { if (sub.length >= 12) { toast(T("옷장이 가득 찼어요", "The wardrobe is full"), true); return; } sub.push(n); }
          it.sub = sub; save(); drawScene(); applySel(); drawPanel();
        };
        if (st.state === "owned") { detail({ title: nmN, pic, price: 0, own: true, go: (it.sub || []).includes(n) ? T("옷장에서 빼기", "Take out") : T("옷장에 넣기", "Put in"), onGo: toggle,
          sell: clothSell(n, () => {
            const S2 = ses.S;
            Object.keys(S2.slots).forEach((k) => (S2.slots[k].items || []).forEach((i) => { if (i.sub && i.sub.includes(n)) { i.sub = i.sub.filter((x) => x !== n); if (!i.sub.length) delete i.sub; } }));
            (S2.yard.items || []).forEach((i) => { if (i.sub && i.sub.includes(n)) { i.sub = i.sub.filter((x) => x !== n); if (!i.sub.length) delete i.sub; } });
            Object.keys(S2.worn || {}).forEach((k) => { if (S2.worn[k] === n) delete S2.worn[k]; });
            save(); drawScene(); applySel(); drawPanel(); window.dispatchEvent(new CustomEvent("kh-worn"));
          }) }); return; }
        if (st.state === "buyable") { detail({ title: nmN, pic, price: st.cost || 0, own: false, afford: true, spendFn: () => true, spendWhy: "", onBuy: () => { if (!wardApi.buy(id2d(n))) { toast(T("코인이 모자라요", "Not enough coins"), true); return; } refreshCoins(); drawPanel(); toast(T("샀어요! 다시 눌러서 넣어 봐요.", "Bought! Tap it again to put it in.")); } }); return; }
        toast(st.cost ? T("코인이 모자라요: ", "Not enough coins: ") + st.cost : st.hint ? T("잠겨 있어요: ", "Locked: ") + st.hint : T("아직 열 수 없어요.", "Not available yet."), true);
      };
    });
  }
  function subsPanel(panel, it) {
    if (H.D[it.id].subKind === "clothes") { clothesPanel(panel, it); return; }
    const d = H.D[it.id], kind = d.subKind, api = curOpts.subs, list = api.list(kind), grp = {}; list.forEach((e) => { grp[e.id] = e.group; });
    const cur = it.sub || [], tabs = tabsFor(ses.roomId === "yard"), cat = (tabs.find((t) => t[0] === d.cat) || [0, 0, T("가구", "Furniture")])[2];
    const BOOKIC = { koalaBook: "🐨", abcBook: "🔤", spaceBook: "🪐", dinoBook: "🦖", fairyBook: "🧚", mathBook: "➕", oceanBook: "🐳", jokeBook: "😄", atlasBook: "🗺️", artBook: "🎨", animalBook: "🦘", songBook: "🎵" };
    const icon = (e) => { const v = H.subVis(e.id), im = H.subImg(e.id); if (kind === "asmr" && !im && window.KoalaArt) return `<span class="kh-subic kh-subimg kh-asmric" aria-hidden="true">${window.KoalaArt.subIcon(e.id)}</span>`; if (!im && !v && BOOKIC[e.id]) return `<span class="kh-subic kh-bookic" style="background:${H.bookColor(e.id)}" aria-hidden="true">${BOOKIC[e.id]}</span>`; if (im) return `<span class="kh-subic kh-subimg" aria-hidden="true"><img src="${im}" alt=""></span>`; return v ? `<span class="kh-subic" style="background:${v[1]}" aria-hidden="true">${v[0]}</span>` : `<span class="kh-subic" style="background:${H.bookColor(e.id)}" aria-hidden="true">📖</span>`; };
    const groups = Array.from(new Set(list.map((e) => e.group))), gname = { main: "", top: T("책상 위", "On top"), drawer: T("서랍 속", "In the drawer"), food: T("음식", "Food"), drink: T("음료", "Drinks"), squishy: T("💧 말랑이", "💧 Squishies"), clicky: T("👆 딸깍이", "👆 Clickers"), popit: T("💥 뽁뽁이", "💥 Poppers"), crunch: T("🧂 사각사각", "🧂 Crunchy") };
    const title = { tools: T("공구함 속 공구", "Tools in the box"), shoes: T("신발장 위 신발", "Shoes on the cabinet"), books: T("책장 속 책", "Books on the shelf"), desk: T("책상 위·서랍", "On the desk"), frame: T("액자 그림", "Picture"), toys: T("장난감 상자", "Toys"), sink: T("세면대 위 물건", "On the sink"), fridge: T("냉장고 속 음식", "In the fridge"), asmr: T("ASMR 장난감", "ASMR toys") }[kind] || nm(d);
    const note = kind === "books" && !it.sub ? T("지금은 기본 책이 꽂혀 있어요. 골라 넣으면 바뀌어요.", "Default books for now — pick some to replace them.") : kind === "asmr" ? T("산 장난감을 눌러 상자에 넣은 뒤, 카드를 눌러 ▶ 버튼으로 들어 봐요. 상자 밖 장난감은 소리가 나지 않아요! (이어폰으로 들으면 더 좋아요)", "Buy a toy and put it in the box, then tap its card and press ▶. Toys outside the box stay silent! (Earphones sound best.)") : T("눌러서 넣고 빼요. 코인으로 새 물건도 살 수 있어요.", "Tap to put in or take out. New things cost coins.");
    panel.innerHTML = `<nav class="kh-crumbs" aria-label="${T("현재 위치", "You are here")}"><button type="button" class="kh-up" data-up aria-label="${T("상위로", "Up one level")}">${ic("up")}</button>
      <button type="button" class="kh-crumb" data-up>${esc(cat)}</button><span class="kh-sep">${ic("chev")}</span><span class="kh-crumb cur">${esc(nm(d))}</span></nav>
      <div class="kh-grid" id="kh-grid">${shelfHead(title)}<p class="kh-subnote">${note}</p>${groups.map((g) => `${gname[g] ? `<h3>${gname[g]}</h3>` : ""}<div class="kh-subgrid">${list.filter((e) => e.group === g).map((e) => { const on = cur.includes(e.id); return `<button type="button" class="kh-subitem${on ? " on" : ""}${e.owned ? "" : " locked"}" data-sub="${e.id}" aria-pressed="${on}">${icon(e)}<span class="kh-nm">${esc(T(e.name[0], e.name[1]))}</span>${e.owned ? (on ? `<span class="kh-pr kh-ok">${ic("check")}</span>` : "") : `<span class="kh-pr">${COIN}${e.cost}</span>`}</button>`; }).join("")}</div>`).join("")}
      ${it.sub && kind === "books" ? `<button type="button" class="kh-btn alt kh-clear" data-reset>${T("기본 책으로", "Default books")}</button>` : ""}</div>`;
    panel.querySelectorAll("[data-up]").forEach((x) => { x.onclick = () => { ses.subOf = null; drawScene(); applySel(); drawPanel(); }; });
    const rs = panel.querySelector("[data-reset]"); if (rs) rs.onclick = () => { delete it.sub; save(); drawScene(); drawPanel(); };
    panel.querySelectorAll("[data-sub]").forEach((bt) => {
      wireCardDrag(bt, kind, list.find((x) => x.id === bt.dataset.sub), api);
      bt.onclick = () => {
        const e = list.find((x) => x.id === bt.dataset.sub), on = (it.sub || []).includes(e.id);
        const toggle = () => {
          let sub = (it.sub || []).slice();
          const at = sub.indexOf(e.id);
          if (at >= 0) sub.splice(at, 1);
          else {
            if (kind === "frame") sub = [];
            const same = sub.filter((x) => grp[x] === e.group), lim = api.limit(kind, e.group) || 99;
            if (same.length >= lim) sub.splice(sub.indexOf(same[0]), 1);
            sub.push(e.id);
          }
          it.sub = sub; save(); drawScene(); drawPanel();
        };
        detail({ sound: kind === "asmr" ? e.id : null, canPlay: kind === "asmr" && !!e.owned && on, title: T(e.name[0], e.name[1]), pic: icon(e), price: e.cost, own: e.owned, sell: e.owned && e.cost > 0 && api.sell ? { paid: e.cost, back: Math.floor(e.cost * 0.8), onSell: () => { const ok = api.sell(e.id); if (ok) { e.owned = false; Object.keys(ses.S.slots).forEach((k) => (ses.S.slots[k].items || []).forEach((i) => { if (i.sub) { i.sub = i.sub.filter((x) => x !== e.id); if (!i.sub.length) delete i.sub; } })); (ses.S.yard.items || []).forEach((i) => { if (i.sub) i.sub = i.sub.filter((x) => x !== e.id); }); save(); drawScene(); drawPanel(); } return ok; } } : null, go: on ? T("빼기", "Take out") : kind === "frame" ? T("걸기", "Hang it") : T("넣기", "Put in"), spendWhy: "sub:" + e.id, spendFn: () => api.buy(e.id), onGo: toggle,
          onBuy: () => { e.owned = true; drawPanel(); toast(T("샀어요! 다시 눌러서 넣어 봐요.", "Bought! Tap it again to put it in.")); } });
      };
    });
  }

  /* ---- dragging a sub-item card (a toy, a book...) onto the piece that holds it ---- */
  // Put a bought sub-item inside a placed piece (same rules as tapping "Put in": a frame holds one picture, a group has a limit).
  function putSubIn(it, kind, e, api) {
    const grp = {}; api.list(kind).forEach((x) => { grp[x.id] = x.group; });
    let sub = (it.sub || []).slice();
    if (sub.includes(e.id)) { toast(T("이미 안에 들어 있어요", "Already inside"), true); return false; }
    if (kind === "frame") sub = [];
    const same = sub.filter((x) => grp[x] === e.group), lim = api.limit(kind, e.group) || 99;
    if (same.length >= lim) sub.splice(sub.indexOf(same[0]), 1);
    sub.push(e.id); it.sub = sub; save(); drawScene(); applySel(); drawPanel();
    toast(T(`${nm(H.D[it.id])} 안에 넣었어요!`, `Put inside the ${nm(H.D[it.id])}!`));
    return true;
  }
  // Mouse / pen: press a card you own, drag it over a matching piece in the room (it lights up) and let go to put it inside.
  // A plain click still opens the card as before.
  function wireCardDrag(card, kind, e, api) {
    if (!e || !e.owned) return;
    card.addEventListener("dragstart", (ev) => ev.preventDefault());   // the browser's own picture drag would swallow the pointer events
    card.querySelectorAll("img").forEach((im) => { im.draggable = false; });
    card.addEventListener("click", (ev) => { if (card._dragged) { card._dragged = false; ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
    card.addEventListener("pointerdown", (ev) => {
      if (ev.button > 0 || ev.pointerType === "touch" || !ses || ses.drag) return;
      const x0 = ev.clientX, y0 = ev.clientY, src = card.querySelector(".kh-subic");
      let ghost = null, lit = null;
      const target = (cx, cy) => {
        const st = curState();
        for (const n of document.elementsFromPoint(cx, cy)) {
          const g = n.closest && n.closest(".kh-it[data-uid]"); if (!g) continue;
          const it = st.items.find((x) => x.uid === g.dataset.uid);
          if (it && H.D[it.id] && H.D[it.id].subKind === kind) return { it, g };
        }
        return null;
      };
      const mv = (m) => {
        if (!ghost) {
          if (Math.hypot(m.clientX - x0, m.clientY - y0) < 7) return;
          card._dragged = true;
          ghost = el("div", "kh-subghost", src ? src.outerHTML : ""); document.body.appendChild(ghost);
          document.body.classList.add("kh-carddrag");
        }
        ghost.style.left = m.clientX + "px"; ghost.style.top = m.clientY + "px";
        const t = target(m.clientX, m.clientY), g = t ? t.g : null;
        if (g !== lit) { if (lit) lit.classList.remove("kh-drop-ok"); if (g) g.classList.add("kh-drop-ok"); lit = g; }
      };
      const done = (u, cancel) => {
        window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cn);
        if (lit) lit.classList.remove("kh-drop-ok");
        document.body.classList.remove("kh-carddrag");
        if (!ghost) return;
        ghost.remove();
        if (cancel || !ses) return;
        const t = target(u.clientX, u.clientY), stage = ses.root.querySelector("#kh-stage"), r = stage && stage.getBoundingClientRect();
        if (t) putSubIn(t.it, kind, e, api);
        else if (r && u.clientX >= r.left && u.clientX <= r.right && u.clientY >= r.top && u.clientY <= r.bottom) toast(T("넣을 수 있는 가구 위에 놓아 주세요", "Drop it onto a piece that can hold it"), true);
      };
      const up = (u) => done(u, false), cn = (u) => done(u, true);
      window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cn);
    });
  }

  /* ---- dragging ---- */
  function ghostFor(drag) {
    const p = drag.piece, d = H.D[p.id];
    if (d && d.wall) return H.wallItemSvg(p);
    const f = H.footprint(p), sm = !!(d && d.stack) || !!drag.koala, c0 = sm ? p.c : Math.round(p.c), r0 = sm ? p.r : Math.round(p.r), fw = sm ? 0.5 : f.w, fd = sm ? 0.5 : f.d, zq = sm ? (p.z || 0) : 0;
    const quad = [H.proj(c0 + (sm ? 0.25 : 0), r0 + (sm ? 0.25 : 0), zq), H.proj(c0 + (sm ? 0.25 : 0) + fw, r0 + (sm ? 0.25 : 0), zq), H.proj(c0 + (sm ? 0.25 : 0) + fw, r0 + (sm ? 0.25 : 0) + fd, zq), H.proj(c0 + (sm ? 0.25 : 0), r0 + (sm ? 0.25 : 0) + fd, zq)].map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
    const poly = `<polygon class="kh-foot ${drag.valid ? "ok" : "bad"}" points="${quad}"/>`;
    if (drag.koala) return poly;
    const q = Object.assign({}, p, { c: c0, r: r0 });
    return poly + H.floorItemSvg(q) + (drag.riders || []).map((rd) => H.floorItemSvg(Object.assign({}, rd.it, { c: c0 + rd.dc, r: r0 + rd.dr }))).join("");
  }
  function itemUnder(ev, st) { // a placed piece the koala can act on, seen under the pointer (its drawn body, not just its floor tile)
    const els = document.elementsFromPoint(ev.clientX, ev.clientY);
    for (const el of els) { const g = el.closest && el.closest(".kh-it[data-uid]"); if (g) { const it = st.items.find((x) => x.uid === g.dataset.uid); if (it && H.D[it.id] && H.D[it.id].act) return it; } }
    return null;
  }
  function updateDrag(ev) {
    const drag = ses.drag, room = curRoom(), st = curState(), p = toScene(ev);
    drag.under = drag.koala ? itemUnder(ev, st) : null;
    if (drag.house) { drag.overStage = true; return; }
    const d = H.D[drag.piece.id];
    if (d && d.wall) {
      Object.assign(drag.piece, wallTarget(p.x, p.y, d, room));
      drag.valid = !wallOverlap(st, drag.piece, drag.uid);
    } else {
      const f = H.footprint(drag.piece);
      const aim = (lift) => {   // the cell under the pointer when the pointer is on a surface `lift` high
        const g = cellOf(p.x, p.y + lift + (drag.fromPanel ? 20 : 0));
        const gc = drag.fromPanel ? g.c - f.w / 2 : g.c - drag.grab.c, gr = drag.fromPanel ? g.r - f.d / 2 : g.r - drag.grab.r, free = (d && d.stack) || drag.koala;   // small things and the koala go exactly where the finger / pointer is (no grid)
        drag.piece.c = free ? Math.max(-0.49, Math.min(room.C - 0.51, Math.round(gc * 64) / 64)) : Math.round(gc);   // small things may sit right at the wall side of a desk / shelf top: keep them inside the room
        drag.piece.r = free ? Math.max(-0.49, Math.min(room.R - 0.51, Math.round(gr * 64) / 64)) : Math.round(gr);
      };
      aim(0);
      if (drag.koala) { const c = Math.round(drag.piece.c), r = Math.round(drag.piece.r); drag.valid = koalaCellFree(c, r) || !!bedAt(c, r) || !!H.seatAt(st, c, r) || !!actAt(st, c, r) || !!drag.under; }
      else {
        let res = null;
        if (d && d.stack) {   // small things: first look for a table / desk / shelf board under the pointer (its top is above the floor)
          const lifts = [];
          st.items.forEach((o) => { const od = H.D[o.id]; if (o.uid !== drag.uid && od && od.topH && !od.stack) (od.tiers || [od.topH]).forEach((z) => { if (!lifts.includes(z)) lifts.push(z); }); });
          lifts.sort((a, b) => b - a);
          for (const z of lifts) { aim(z - 6); drag.piece.zHint = z; const r2 = H.canPlace(room, st, drag.piece, drag.uid); if (r2.ok && r2.z > 0) { res = r2; break; } }
        }
        if (!res && d && d.seat && /^(stool|chair)/.test(d.id)) {   // a chair dragged onto a desk / table (the picture under the pointer): it is pushed in under it, on the desk cell nearest to where it was aimed
          const under = document.elementsFromPoint(ev.clientX, ev.clientY).map((e2) => e2.closest && e2.closest(".kh-it[data-uid]")).filter(Boolean).map((g2) => st.items.find((o) => o.uid === g2.dataset.uid)).find((o) => o && o.uid !== drag.uid && /desk|table/i.test(o.id));
          if (under) {
            aim(0);
            const cells = H.cellsOf(under).map((q) => q.split(",").map(Number)).sort((a, b) => Math.hypot(a[0] - drag.piece.c, a[1] - drag.piece.r) - Math.hypot(b[0] - drag.piece.c, b[1] - drag.piece.r));
            drag.piece.c = cells[0][0]; drag.piece.r = cells[0][1]; drag.piece.zHint = 0;
            const r2 = H.canPlace(room, st, drag.piece, drag.uid); if (r2.ok) res = r2;
          }
        }
        if (!res) { aim(0); drag.piece.zHint = 0; res = H.canPlace(room, st, drag.piece, drag.uid); }
        drag.valid = res.ok; if (res.ok) drag.piece.z = res.z;
      }
    }
    const gh = ses.root.querySelector(".kh-ghost");
    if (gh) gh.innerHTML = ghostFor(drag);
    const sr = ses.root.querySelector("#kh-stage").getBoundingClientRect();
    drag.overStage = ev.clientX >= sr.left && ev.clientX <= sr.right && ev.clientY >= sr.top && ev.clientY <= sr.bottom;
    ses.root.classList.toggle("kh-trash", !!drag.uid && !drag.overStage);
  }
  function endDrag(ev, cancel) {
    const drag = ses.drag; if (!drag) return;
    window.removeEventListener("pointermove", drag.mv); window.removeEventListener("pointerup", drag.up); window.removeEventListener("pointercancel", drag.cn);
    ses.drag = null; ses.root.classList.remove("kh-trash");
    const gh = ses.root.querySelector(".kh-ghost"); if (gh) gh.innerHTML = "";
    if (drag.ghostEl) drag.ghostEl.remove();
    ses.root.querySelectorAll(".kh-dim").forEach((e) => e.classList.remove("kh-dim"));
    const st = curState();
    if (cancel) { drawScene(); return; }
    if (!drag.moved) { // a tap
      if (drag.uid || drag.koala || drag.house) {
        ses.sel = drag.uid || (drag.koala ? "koala" : "house"); applySel(); showMenu();
        const tp = drag.uid && curState().items.find((x) => x.uid === drag.uid);
        if (tp && H.D[tp.id].subKind && curOpts.subs && ses.subOf !== tp.uid) { ses.subOf = tp.uid; drawScene(); applySel(); drawPanel(); } // tapping a wardrobe / toy box / desk opens it
        if (drag.koala) { const g = ses.root.querySelector(".kh-kbody"); if (g) { g.classList.remove("hop"); void g.getBoundingClientRect(); g.classList.add("hop"); } }
      }
      return;
    }
    if (drag.house) return;
    if (drag.koala) {
      const c = Math.round(drag.piece.c), r = Math.round(drag.piece.r), k = ses.koala;
      if (drag.overStage) {
        const seat = H.seatAt(st, c, r), act = seat ? null : (drag.under || actAt(st, c, r));
        if (seat) sitOn(seat, [c, r], neighbourFree(c, r)[0] || null);
        else if (act) startAct(act);
        else if (bedAt(c, r)) { standUp(true); k.c = drag.piece.c; k.r = drag.piece.r; k.path = []; lieDown(); }   // dropped on a bed: it lies down there
        else if (koalaCellFree(c, r)) { const keep = k.pose === "lie"; standUp(true); k.c = drag.piece.c; k.r = drag.piece.r; k.path = []; if (keep) lieDown(); }
      }
      ses.sel = "koala"; drawScene(); showMenu(); return;
    }
    if (drag.uid) { // moving a placed piece
      if (!drag.overStage) { st.items = st.items.filter((x) => x.uid !== drag.uid); (drag.riders || []).forEach((rd) => { const it = st.items.find((x) => x.uid === rd.it.uid); if (it) it.z = 0; }); ses.sel = null; recalcZ(st); save(); drawScene(); hideMenu(); placeKoalaFree(); toast(T("치웠어요", "Put away")); return; }
      if (!drag.valid) { toast(T("여기엔 놓을 수 없어요", "Can't go there"), true); drawScene(); showMenu(); return; }
      const it = st.items.find((x) => x.uid === drag.uid);
      const stk = !!H.D[it.id].stack, pc = stk ? drag.piece.c : Math.round(drag.piece.c), pr = stk ? drag.piece.r : Math.round(drag.piece.r);
      if (H.D[it.id].wall) Object.assign(it, { side: drag.piece.side, u: drag.piece.u, h: drag.piece.h });
      else { it.c = pc; it.r = pr; it.z = drag.piece.z || 0; (drag.riders || []).forEach((rd) => { const r2 = st.items.find((x) => x.uid === rd.it.uid); if (r2) { r2.c = pc + rd.dc; r2.r = pr + rd.dr; } }); }
      recalcZ(st); save(); drawScene(); showMenu(); placeKoalaFree(); updateKoala();
      return;
    }
    // new piece dropped from the panel
    if (!drag.overStage) return;
    if (!drag.valid) { toast(T("여기엔 놓을 수 없어요", "Can't go there"), true); return; }
    const piece = Object.assign({ uid: H.newUid() }, drag.piece);
    if (!H.D[piece.id].wall && !H.D[piece.id].stack) { piece.c = Math.round(piece.c); piece.r = Math.round(piece.r); }
    placeNew(piece.id, piece); placeKoalaFree(); updateKoala();
  }
  function beginDrag(ev, init) {
    if (ses.drag) return;
    const drag = Object.assign({ moved: false, valid: true, pid: ev.pointerId, sx: ev.clientX, sy: ev.clientY }, init);
    ses.drag = drag;
    drag.mv = (e) => {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      if (!drag.moved) { drag.moved = true; if (drag.uid) ses.root.querySelectorAll(`.kh-it[data-uid="${drag.uid}"]`).forEach((x) => x.classList.add("kh-dim")); (drag.riders || []).forEach((rd) => ses.root.querySelectorAll(`.kh-it[data-uid="${rd.it.uid}"]`).forEach((x) => x.classList.add("kh-dim"))); if (drag.koala) { const k = ses.root.querySelector(".kh-koala"); if (k) k.classList.add("kh-dim"); } hideMenu(); }
      if (drag.fromPanel && !drag.ghostEl) { drag.ghostEl = el("div", "kh-ghost-card", H.thumbSvg(drag.piece.id)); document.body.appendChild(drag.ghostEl); }
      if (drag.ghostEl) { drag.ghostEl.style.left = e.clientX + "px"; drag.ghostEl.style.top = e.clientY + "px"; drag.ghostEl.style.opacity = drag.overStage ? "0" : "0.9"; }
      updateDrag(e);
    };
    drag.up = (e) => endDrag(e, false);
    drag.cn = (e) => endDrag(e, true);
    window.addEventListener("pointermove", drag.mv); window.addEventListener("pointerup", drag.up); window.addEventListener("pointercancel", drag.cn);
  }
  function attachStage() {
    const stage = ses.root.querySelector("#kh-stage");
    stage.addEventListener("pointerdown", (ev) => {
      if (!ses.edit || ev.button > 0 || ev.target.closest(".kh-menu,.kh-top")) return;
      let g = ev.target.closest && ev.target.closest(".kh-it:not(.kh-fixed),.kh-koala,.kh-house");
      {   // small props are tiny and often hidden behind bigger pieces: a press near one of them grabs it first
        const reach = ev.pointerType === "touch" ? 26 : 16, stc = curState();
        let best = null, bd = reach;
        ses.root.querySelectorAll(".kh-it[data-uid]").forEach((el2) => {
          const it2 = stc.items.find((x) => x.uid === el2.dataset.uid); if (!it2 || !H.D[it2.id] || !H.D[it2.id].stack) return;
          const r = el2.getBoundingClientRect(), dd = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height * 0.6));
          if (dd < bd) { bd = dd; best = el2; }
        });
        if (best && !(g && g.dataset && g.dataset.uid === best.dataset.uid)) g = best;
        // the koala standing behind / beside a big piece (bed, shelf): the piece is drawn over part of it and used to take the press. A press on the koala's own body always takes the koala.
        const ke = ses.root.querySelector(".kh-koala");
        if (ke && !best && !(g && g.classList.contains("kh-koala"))) {
          const kr = ke.getBoundingClientRect(), mx = kr.width * 0.2, my = kr.height * 0.08;
          if (ev.clientX > kr.left + mx && ev.clientX < kr.right - mx && ev.clientY > kr.top + my && ev.clientY < kr.bottom - my) g = ke;
        }
      }
      if (!g) {
        if (ses.sel) { ses.sel = null; applySel(); hideMenu(); }
        leaveSubs();
        if (ses.zoom > 1) { // drag the background to look around
          const sc = ses.root.querySelector("#kh-scene"), x0 = ev.clientX, y0 = ev.clientY, l0 = sc.scrollLeft, t0 = sc.scrollTop;
          const mv = (e) => { sc.scrollLeft = l0 - (e.clientX - x0); sc.scrollTop = t0 - (e.clientY - y0); };
          const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
          window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
        }
        return;
      }
      ev.preventDefault();
      const st = curState(), p = toScene(ev);
      if (g.classList.contains("kh-koala")) {
        const k = ses.koala, gc = cellOf(p.x, p.y);
        beginDrag(ev, { koala: true, piece: { id: "stoolBlue", c: Math.round(k.c), r: Math.round(k.r), m: 0, z: 0 }, grab: { c: gc.c - k.c, r: gc.r - k.r } });
        return;
      }
      if (g.classList.contains("kh-house")) { beginDrag(ev, { house: true, piece: { id: "stoolBlue", c: 0, r: 0, m: 0 } }); return; }
      const it = st.items.find((x) => x.uid === g.dataset.uid);
      if (!it) return;
      const d = H.D[it.id];
      if (ses.sel !== it.uid) { ses.sel = it.uid; applySel(); hideMenu(); if (ses.subOf !== it.uid) leaveSubs(); }
      const init = { uid: it.uid, piece: Object.assign({}, it) };
      if (!d.wall) {
        const gc = cellOf(p.x, p.y); init.grab = { c: gc.c - it.c, r: gc.r - it.r };
        if (d.topH && !d.stack) { // things sitting on a table travel with it
          const cells = H.cellsOf(it);
          init.riders = st.items.filter((o) => o.uid !== it.uid && H.D[o.id].stack && cells.includes(H.cellsOf(o)[0])).map((o) => ({ it: o, dc: o.c - it.c, dr: o.r - it.r }));
        }
      }
      beginDrag(ev, init);
    });
  }

  /* ------------------------------ right-hand panel ------------------------------ */
  function drawPanel() {
    const yard = ses.roomId === "yard", tabs = tabsFor(yard), panel = ses.root.querySelector("#kh-panel");
    if (!tabs.some((t) => t[0] === ses.tab)) ses.tab = tabs[0][0];
    const subIt = ses.subOf && curState().items.find((i) => i.uid === ses.subOf);
    if (ses.subOf && !(subIt && H.D[subIt.id] && H.D[subIt.id].subKind && curOpts.subs)) ses.subOf = null;
    if (ses.subOf) { subsPanel(panel, subIt); return; }
    panel.innerHTML = `${chipsHtml([["__own", "/img/cat/items.webp", T("내 아이템", "My items")]].concat(tabs), roomOwned ? "__own" : ses.tab)}<div class="kh-grid" id="kh-grid">${gridHtml(yard)}</div>`;
    panel.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => {
      if (b.dataset.tab === "__own") { roomOwned = true; drawPanel(); return; }   // first chip: everything I own, in one list
      ses.tab = b.dataset.tab; if (roomOwned) { roomOwned = false; window.dispatchEvent(new CustomEvent("kh-owned-off")); } drawPanel();
    }; });
    initCats(panel);
    wireGrid(panel.querySelector("#kh-grid"), yard);
    const addCatBtn = panel.querySelector("[data-kh-admin-add-cat]");
    if (addCatBtn && window.KoalaAdminItems) {
      addCatBtn.onclick = () => KoalaAdminItems.openCategoryForm({
        kind: "house", lang: curOpts.L("en", "ko"),
        onSaved: async () => { await H.loadCatalog(true); drawPanel(); },
      });
    }
    const delCatBtn = panel.querySelector("[data-kh-admin-del-cat]");
    if (delCatBtn && window.KoalaAdminItems) {
      delCatBtn.onclick = () => {
        const cid = delCatBtn.dataset.khAdminDelCat, c = H.customCategories().find((x) => x.id === cid);
        KoalaAdminItems.deleteCategory({
          kind: "house", id: cid, label: c ? T(c.label.ko, c.label.en) : cid, lang: curOpts.L("en", "ko"),
          onDeleted: async () => { await H.loadCatalog(true); ses.tab = tabsFor(yard)[0][0]; drawPanel(); },
        });
      };
    }
    const addItemBtn = panel.querySelector("[data-kh-admin-add-item]");
    if (addItemBtn && window.KoalaAdminItems) {
      addItemBtn.onclick = () => KoalaAdminItems.openItemForm({
        kind: "house", cat: addItemBtn.dataset.khAdminAddItem,
        cats: tabsFor(yard).map((t) => ({ id: t[0], label: t[2] })),
        lang: curOpts.L("en", "ko"),
        onSaved: async () => { await H.loadCatalog(true); await reloadManifest(); drawScene(); drawPanel(); },
      });
    }
  }
  function swatch(kind, key, def, own, on) {
    return `<button type="button" class="kh-sw${on ? " on" : ""}${own ? "" : " locked"}" data-sw="${kind}:${key}" aria-label="${esc(T(def.n[0], def.n[1]))}" aria-pressed="${on}"><span class="kh-sw-c" style="${kind === "floor" && H.floorImg(key) ? `background:url(${H.floorImg(key)}) center/cover;box-shadow:inset 0 0 0 2px rgba(255,255,255,.7)` : `background:${def.c};box-shadow:inset 0 0 0 5px ${def.a}`}"></span><span class="kh-sw-n">${esc(T(def.n[0], def.n[1]))}</span>${own ? "" : `<span class="kh-pr">${COIN}${def.p}</span>`}</button>`;
  }
  const HOUSE_IC = { cottage: "🏡", villa: "🏘️", twoStory: "🏠", modern: "🏢", cabin: "🛖", castle: "🏰" };
  const uiIc = (k, fb) => { const u = H.uiImg(k); return u ? `<img src="${u}" alt="">` : fb; };
  const optBtn = (attr, key, on, ic, label, price, own) => `<button type="button" class="kh-sw kh-opt${on ? " on" : ""}${own === false ? " locked" : ""}" ${attr}="${key}" aria-pressed="${on}"><span class="kh-optic" aria-hidden="true">${ic}</span><span class="kh-sw-n">${esc(label)}</span>${own === false ? `<span class="kh-pr">${COIN}${price}</span>` : ""}</button>`;
  let roomOwned = false;
  window.KoalaHouse.setRoomOwned = (v) => { roomOwned = !!v; try { if (ses && ses.root && ses.root.querySelector("#kh-panel")) drawPanel(); } catch (e) { /* not mounted yet */ } };
  function gridHtml(yard) {
    const st = curState(), S = ses.S;
    if (roomOwned) { // "My items": only what you own that fits here
      const mine = Object.values(H.D).filter((d) => !d.virtual && fitsHere(d, yard) && ownedItem(d) && d.price > 0).sort((a, b) => a.price - b.price);
      return `${shelfHead(T("내 아이템", "My items"), `${mine.length}`)}${mine.length ? `<div class="kh-items-grid">${mine.map((d) => `<button type="button" class="kh-item" data-item="${d.id}" aria-label="${esc(nm(d))}">${H.thumbSvg(d.id)}<span class="kh-nm">${esc(nm(d))}</span></button>`).join("")}</div>` : `<p class="kh-empty">${T("아직 산 아이템이 없어요.", "You have not bought any items yet.")}</p>`}`;
    }
    if (ses.tab === "style") {
      return `<h3>${T("벽지", "Wallpaper")}</h3><div class="kh-sws">${Object.keys(H.WALLS).map((k) => swatch("wall", k, H.WALLS[k], H.WALLS[k].p === 0 || !!S.walls[k], st.wall === k)).join("")}</div><h3>${T("바닥", "Floor")}</h3><div class="kh-sws">${Object.keys(H.FLOORS).filter((k) => !H.FLOORS[k].yard).map((k) => swatch("floor", k, H.FLOORS[k], H.FLOORS[k].p === 0 || !!S.floors[k], st.floor === k)).join("")}</div>`;
    }
    if (ses.tab === "house") {
      const h = st.house || {};
      const grp = (title, kind, set) => `<h3>${title}</h3><div class="kh-sws">${Object.keys(set).map((k) => `<button type="button" class="kh-sw${h[kind] === k ? " on" : ""}" data-house="${kind}:${k}" aria-pressed="${h[kind] === k}" aria-label="${esc(T(set[k][0], set[k][1]))}"><span class="kh-sw-c" style="background:${set[k][2]}"></span><span class="kh-sw-n">${esc(T(set[k][0], set[k][1]))}</span></button>`).join("")}</div>`;
      return `<h3>${T("집 모양", "House style")}</h3><div class="kh-sws">${Object.keys(H.HOUSE_STYLES).map((k) => { const d = H.HOUSE_STYLES[k]; return optBtn("data-hstyle", k, h.style === k, H.houseThumb(k, st), T(d.n[0], d.n[1]), d.p, d.p === 0 || !!S.houseStyles[k]); }).join("")}</div>
        <p class="kh-subnote">${T("집을 옮기거나 돌리려면 왼쪽 그림에서 집을 눌러요.", "To move or turn the house, tap it in the picture.")}</p>
        ${H.housePic(h.style) ? "" : grp(T("외벽", "Walls"), "wall", H.HOUSE_WALLS) + grp(T("지붕", "Roof"), "roof", H.HOUSE_ROOFS) + grp(T("현관문", "Door"), "door", H.HOUSE_DOORS)}`;
    }
    if (ses.tab === "garden") {
      const own = (kind, key, p) => !p || !!(S[kind] && S[kind][key]);
      return `<h3>${T("정원 모양 (한 번에 바꾸기)", "Garden looks")}</h3><div class="kh-sws">${Object.keys(H.GARDEN_PRESETS).map((k) => { const g = H.GARDEN_PRESETS[k], fl = H.FLOORS[g.floor]; return `<button type="button" class="kh-sw kh-opt${st.floor === g.floor && st.border === g.border && st.path === g.path && st.size === g.size ? " on" : ""}" data-gpreset="${k}">${H.uiImg("g_" + k) ? `<span class="kh-optic" aria-hidden="true"><img src="${H.uiImg("g_" + k)}" alt=""></span>` : `<span class="kh-sw-c" style="background:${fl.c};box-shadow:inset 0 0 0 5px ${fl.a}"></span>`}<span class="kh-sw-n">${esc(T(g.n[0], g.n[1]))}</span></button>`; }).join("")}</div>
        <h3>${T("땅", "Ground")}</h3><div class="kh-sws">${Object.keys(H.FLOORS).filter((k) => H.FLOORS[k].yard).map((k) => swatch("floor", k, H.FLOORS[k], H.FLOORS[k].p === 0 || !!S.floors[k], st.floor === k)).join("")}</div>
        <h3>${T("울타리", "Border")}</h3><div class="kh-sws">${Object.keys(H.BORDERS).map((k) => optBtn("data-gborder", k, (st.border || "none") === k, uiIc("b_" + k, { none: "∅", fence: "🚧", hedge: "🌿", stone: "🧱" }[k]), T(H.BORDERS[k][0], H.BORDERS[k][1]))).join("")}</div>
        <h3>${T("길", "Path")}</h3><div class="kh-sws">${Object.keys(H.PATHS).map((k) => optBtn("data-gpath", k, (st.path || "none") === k, uiIc("p_" + k, { none: "∅", stones: "⛰️", brick: "🟫", plank: "📏" }[k]), T(H.PATHS[k][0], H.PATHS[k][1]))).join("")}</div>
        <h3>${T("마당 크기", "Yard size")}</h3><div class="kh-sws">${Object.keys(H.YARD_SIZES).map((k) => { const z = H.YARD_SIZES[k]; return optBtn("data-gsize", k, (st.size || "normal") === k, `${z.C}×${z.R}`, T(z.n[0], z.n[1]), z.p, own("yardSizes", k, z.p)); }).join("")}</div>`;
    }
    const list = Object.values(H.D).filter((d) => !d.virtual && d.cat === ses.tab && fitsHere(d, yard)).sort((a, b) => a.price - b.price);
    const haveN = list.filter(ownedItem).length, tabName = (tabsFor(yard).find((t) => t[0] === ses.tab) || [0, 0, ""])[2];
    const adminAdd = curOpts && curOpts.isAdmin
      ? `<button type="button" class="kh-admin-add-item" data-kh-admin-add-item="${ses.tab}"><span class="add-ic" aria-hidden="true">+</span>${T("아이템 추가", "Add item")}</button>${H.customCategories().some((c) => c.id === ses.tab) ? `<button type="button" class="kh-btn alt kh-admin-del" data-kh-admin-del-cat="${ses.tab}">${T("🗑 카테고리 삭제", "🗑 Delete category")}</button>` : ""}` : "";
    return `${shelfHead(tabName, `${haveN}/${list.length}`)}${adminAdd}<div class="kh-items-grid">${list.map((d) => { const own = ownedItem(d); return `<button type="button" class="kh-item${own ? "" : " locked"}" data-item="${d.id}" aria-label="${esc(nm(d))}${own ? "" : ", " + d.price}">${H.thumbSvg(d.id)}<span class="kh-nm">${esc(nm(d))}</span>${own ? "" : `<span class="kh-pr">${COIN}${d.price}</span>`}</button>`; }).join("")}</div>${ses.tab === "toys" && !yard ? asmrToysHtml() : ""}`;
  }
  // The ASMR toys are part of the Toys category: they are bought here, but they only make their sound from inside an ASMR box (tap the box in the room to open its list).
  // the picture of an ASMR toy: the supplied 3D image (manifest "@sub:<id>") when there is one, otherwise the drawn SVG
  function asmrPic(id) { const im = H.subImg(id); return im ? `<img src="${im}" alt="" draggable="false">` : (window.KoalaArt ? window.KoalaArt.subIcon(id) : ""); }
  function asmrToysHtml() {
    const api = curOpts && curOpts.subs; if (!api) return "";
    const list = api.list("asmr"); if (!list.length) return "";
    const groups = [["squishy", T("💧 말랑이", "💧 Squishies")], ["clicky", T("👆 딸깍이", "👆 Clickers")], ["popit", T("💥 뽁뽁이", "💥 Poppers")], ["crunch", T("🧂 사각사각", "🧂 Crunchy")]];
    const card = (e) => `<button type="button" class="kh-item${e.owned ? "" : " locked"}" data-asmr="${e.id}" aria-label="${esc(T(e.name[0], e.name[1]))}${e.owned ? "" : ", " + e.cost}"><span class="kh-thumb kh-asmrthumb"><span class="kh-subic kh-subimg kh-asmric" aria-hidden="true">${asmrPic(e.id)}</span></span><span class="kh-nm">${esc(T(e.name[0], e.name[1]))}</span>${e.owned ? "" : `<span class="kh-pr">${COIN}${e.cost}</span>`}</button>`;
    return `${shelfHead(T("ASMR 장난감", "ASMR toys"), `${list.filter((e) => e.owned).length}/${list.length}`)}<p class="kh-subnote">${T("산 뒤에 ASMR 상자에 넣고, 상자를 눌러서 들어 봐요.", "Buy a toy, put it in an ASMR Box, then tap the box to listen.")}</p>${groups.map(([g, label]) => { const l = list.filter((e) => e.group === g); return l.length ? `<h3>${label}</h3><div class="kh-items-grid">${l.map(card).join("")}</div>` : ""; }).join("")}`;
  }
  // every placed ASMR box (this room's first), so a toy picked in the shop can be put into one
  function asmrBoxes() {
    const out = [], cur = curState();
    (cur.items || []).forEach((i) => { if (i.id === "asmrBox") out.push(i); });
    Object.keys(ses.S.slots).forEach((k) => { const st = ses.S.slots[k]; if (st !== cur) (st.items || []).forEach((i) => { if (i.id === "asmrBox") out.push(i); }); });
    return out;
  }
  // change the yard; may cost coins (a new size / ground / house style)
  function planYard(patch, price, why, label) {
    const y = JSON.parse(JSON.stringify(ses.S.yard));
    const house = patch.house; const rest = Object.assign({}, patch); delete rest.house;
    if (house) y.house = Object.assign(y.house || {}, house);
    Object.assign(y, rest);
    if (!yardValid(y)) { toast(T("마당 밖·집 자리에 있는 물건을 먼저 치워 주세요", "Move the things that would be in the way first"), true); return null; }
    return { y, price, why, label };
  }
  function runYard(plan, mark) {
    if (!plan) return;
    const apply = () => { if (mark) mark(); ses.S.yard = plan.y; save(); drawScene(); drawPanel(); placeKoalaFree(); updateKoala(); };
    if (plan.price > 0) buy(plan.label, `<span class="kh-buy-thumb">🏡</span>`, plan.price, plan.why, apply); else apply();
  }
  // Anything can be sold back. Things that cost coins return 80%; the free ones (price 0, or the starter furniture the house came with) return nothing.
  const houseRefundable = (id) => !!H.D[id] && H.D[id].price > 0 && !H.STARTER_OWNED.includes(id);
  // sell a piece of furniture: every copy placed in any room / the yard goes with it
  function sellHouseItem(id) {
    const S = ses.S, d = H.D[id];
    if (!d || !S.owned[id]) return false;
    delete S.owned[id];
    Object.keys(S.slots).forEach((k) => { S.slots[k].items = (S.slots[k].items || []).filter((i) => i.id !== id); });
    if (S.yard) S.yard.items = (S.yard.items || []).filter((i) => i.id !== id);
    const give = houseRefundable(id);
    if (give && curOpts.refund) curOpts.refund(Math.floor(d.price * 0.8), "housesell:" + id);
    ses.sel = null; save(); recalcZ(curState()); drawScene(); drawPanel(); hideMenu();
    return true;
  }
  function wireGrid(grid, yard) {
    const S = ses.S;
    grid.querySelectorAll("[data-item]").forEach((b) => {
      b.addEventListener("pointerdown", (ev) => {
        if (ev.button > 0) return;
        const id = b.dataset.item, d = H.D[id];
        if (!ownedItem(d) || ev.pointerType === "touch") return; // locked: tap buys; touch: tap places, then drag it in the room
        ev.preventDefault();
        b._dragged = false;
        beginDrag(ev, { fromPanel: true, piece: { id, c: 0, r: 0, m: 0, z: 0, side: "R", u: 0, h: d.defH }, valid: false });
        const o = ses.drag.up; ses.drag.up = (e) => { b._dragged = ses.drag ? ses.drag.moved : false; o(e); };
      });
      b.addEventListener("click", () => {
        if (b._dragged) { b._dragged = false; return; }
        const id = b.dataset.item, d = H.D[id];
        const give = houseRefundable(id), paid = give ? d.price : 0;
        detail({ title: nm(d), pic: H.thumbSvg(id), price: d.price, own: ownedItem(d), go: T("배치하기", "Place"), spendWhy: "house:" + id,
          adminDel: curOpts && curOpts.isAdmin && d.custom && window.KoalaAdminItems ? () => KoalaAdminItems.deleteItem({
            id, name: { ko: d.name[0], en: d.name[1] }, lang: curOpts.L("en", "ko"),
            onDeleted: () => {
              const S = ses.S;   // gone for everyone: take it out of this house too, no refund
              delete S.owned[id];
              Object.keys(S.slots).forEach((k) => { S.slots[k].items = (S.slots[k].items || []).filter((i) => i.id !== id); });
              if (S.yard) S.yard.items = (S.yard.items || []).filter((i) => i.id !== id);
              delete H.D[id]; ses.sel = null; closeModal(); save(); recalcZ(curState()); drawScene(); drawPanel(); hideMenu();
            },
          }) : null,
          sell: ownedItem(d) ? { paid, back: Math.floor(paid * 0.8), note: (give ? "" : T("무료로 받은 아이템이라 돌려받는 코인은 없어요. ", "This one was free, so no coins come back. ")) + T("방에 놓아 둔 것도 모두 치워져요.", "Every copy placed in your rooms is removed too."), onSell: () => sellHouseItem(id) } : null,
          onGo: () => { placeNew(id); placeKoalaFree(); updateKoala(); },
          onBuy: () => { S.owned[id] = 1; save(); drawPanel(); toast(T("샀어요! 다시 눌러서 놓아 봐요.", "Bought! Tap it again to place it.")); } });
      });
    });
    grid.querySelectorAll("[data-asmr]").forEach((b) => {
      if (curOpts.subs) wireCardDrag(b, "asmr", curOpts.subs.list("asmr").find((x) => x.id === b.dataset.asmr), curOpts.subs);
      b.addEventListener("click", () => {
        const api = curOpts.subs, e = api && api.list("asmr").find((x) => x.id === b.dataset.asmr); if (!e) return;
        const boxes = asmrBoxes(), host = boxes.find((i) => (i.sub || []).includes(e.id)), pic = `<span class="kh-subic kh-subimg kh-asmric" aria-hidden="true">${asmrPic(e.id)}</span>`;
        const toggle = () => {   // put it into an ASMR box (this room's first), or take it out of the box it is in
          if (host) { host.sub = (host.sub || []).filter((x) => x !== e.id); if (!host.sub.length) delete host.sub; save(); drawScene(); drawPanel(); toast(T("상자에서 뺐어요", "Taken out of the box")); return; }
          const box = boxes[0];
          if (!box) { toast(T("ASMR 상자를 먼저 방에 놓아 주세요", "Place an ASMR Box in a room first"), true); return; }
          let sub = (box.sub || []).slice();
          const same = sub.filter((x) => { const f = api.list("asmr").find((y) => y.id === x); return f && f.group === e.group; }), lim = api.limit("asmr", e.group) || 99;
          if (same.length >= lim) sub.splice(sub.indexOf(same[0]), 1);
          sub.push(e.id); box.sub = sub; save(); drawScene(); drawPanel();
          toast(T("ASMR 상자에 넣었어요! 상자를 눌러서 들어 봐요.", "Put in the ASMR Box! Tap the box to listen."));
        };
        detail({ sound: e.id, canPlay: false, title: T(e.name[0], e.name[1]), pic, price: e.cost, own: e.owned,
          go: host ? T("빼기", "Take out") : T("넣기", "Put in"), spendWhy: "sub:" + e.id, spendFn: () => api.buy(e.id), onGo: toggle,
          sell: e.owned && e.cost > 0 && api.sell ? { paid: e.cost, back: Math.floor(e.cost * 0.8), onSell: () => { const ok = api.sell(e.id); if (ok) { Object.keys(ses.S.slots).forEach((k) => (ses.S.slots[k].items || []).forEach((i) => { if (i.sub) { i.sub = i.sub.filter((x) => x !== e.id); if (!i.sub.length) delete i.sub; } })); save(); drawScene(); drawPanel(); } return ok; } } : null,
          onBuy: () => { drawPanel(); toast(T("샀어요! ASMR 상자에 넣어 봐요.", "Bought! Put it in an ASMR Box.")); } });
      });
    });
    grid.querySelectorAll("[data-sw]").forEach((b) => {
      b.onclick = () => {
        const [kind, key] = b.dataset.sw.split(":"), def = (kind === "wall" ? H.WALLS : H.FLOORS)[key], store = kind === "wall" ? S.walls : S.floors, own = def.p === 0 || !!store[key];
        if (yard && kind === "floor") { runYard(planYard({ floor: key }, own ? 0 : def.p, "floor:" + key, T(def.n[0], def.n[1])), () => { store[key] = 1; }); return; }
        const apply = () => { curState()[kind] = key; save(); drawScene(); drawPanel(); };
        const sellSw = own && def.p > 0 && store[key] ? { paid: def.p, back: Math.floor(def.p * 0.8), note: T("지금 쓰고 있는 방은 기본 색으로 바뀌어요.", "Rooms using it switch back to a plain default."), onSell: () => {
          delete store[key];
          const tbl = kind === "wall" ? H.WALLS : H.FLOORS, base = Object.keys(tbl).find((k) => tbl[k].p === 0 && !tbl[k].yard);
          Object.keys(S.slots).forEach((sl) => { if (S.slots[sl][kind] === key) S.slots[sl][kind] = base; });
          if (curOpts.refund) curOpts.refund(Math.floor(def.p * 0.8), "housesell:" + kind + ":" + key);
          save(); drawScene(); drawPanel(); return true;
        } } : null;
        detail({ title: T(def.n[0], def.n[1]), pic: `<span class="kh-sw-c big" style="background:${def.c};box-shadow:inset 0 0 0 8px ${def.a}"></span>`, price: def.p, own, sell: sellSw, go: T("바꾸기", "Apply"), spendWhy: kind + ":" + key,
          onGo: apply, onBuy: () => { store[key] = 1; save(); drawPanel(); toast(T("샀어요! 다시 눌러서 써 봐요.", "Bought! Tap it again to use it.")); } });
      };
    });
    grid.querySelectorAll("[data-house]").forEach((b) => { b.onclick = () => { const [kind, key] = b.dataset.house.split(":"); const st = curState(); st.house = st.house || {}; st.house[kind] = key; save(); drawScene(); drawPanel(); }; });
    grid.querySelectorAll(".kh-hthumb").forEach((sv) => { try { const bb = sv.firstChild.getBBox(), pad = 4; sv.setAttribute("viewBox", `${bb.x - pad} ${bb.y - pad} ${bb.width + pad * 2} ${bb.height + pad * 2}`); } catch (e) { /* not laid out yet */ } });
    grid.querySelectorAll("[data-hstyle]").forEach((b) => {
      b.onclick = () => { const k = b.dataset.hstyle, d = H.HOUSE_STYLES[k], own = d.p === 0 || !!S.houseStyles[k]; runYard(planYard({ house: { style: k, shift: 0 } }, own ? 0 : d.p, "house:" + k, T(d.n[0], d.n[1])), () => { S.houseStyles[k] = 1; }); };
    });
    grid.querySelectorAll("[data-hctl]").forEach((b) => { b.onclick = () => { ses.sel = "house"; menuAct(b.dataset.hctl); ses.sel = null; applySel(); hideMenu(); }; });
    grid.querySelectorAll("[data-gborder]").forEach((b) => { b.onclick = () => runYard(planYard({ border: b.dataset.gborder }, 0, "", ""), null); });
    grid.querySelectorAll("[data-gpath]").forEach((b) => { b.onclick = () => runYard(planYard({ path: b.dataset.gpath }, 0, "", ""), null); });
    grid.querySelectorAll("[data-gsize]").forEach((b) => {
      b.onclick = () => { const k = b.dataset.gsize, z = H.YARD_SIZES[k], own = z.p === 0 || !!S.yardSizes[k]; runYard(planYard({ size: k }, own ? 0 : z.p, "yard:" + k, T(z.n[0], z.n[1])), () => { S.yardSizes[k] = 1; }); };
    });
    grid.querySelectorAll("[data-gpreset]").forEach((b) => {
      b.onclick = () => {
        const g = H.GARDEN_PRESETS[b.dataset.gpreset], fl = H.FLOORS[g.floor], z = H.YARD_SIZES[g.size];
        const cost = (fl.p && !S.floors[g.floor] ? fl.p : 0) + (z.p && !S.yardSizes[g.size] ? z.p : 0);
        runYard(planYard({ floor: g.floor, border: g.border, path: g.path, size: g.size }, cost, "garden:" + b.dataset.gpreset, T(g.n[0], g.n[1])), () => { S.floors[g.floor] = 1; S.yardSizes[g.size] = 1; });
      };
    });
  }

  /* ------------------------------ 3D wardrobe (Character tab) ------------------------------ */
  // The 3D koala as a small picture (the Character tab's status card uses it). worn: { slot: name } (default: what is saved).
  function koala3d(worn, cls, view) {
    const w = worn || (H.load().worn || {});
    const names = kordered(w);
    const imgs = names.map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
    return `<svg class="${cls || "kh-k3d"}" viewBox="${view || "64 130 553 910"}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="3D Koala" focusable="false">${imgs}</svg>`;
  }
  // wall + floor behind the 3D koala: the same room backdrop the 2D koala stands in
  function wardBackdrop() {
    if (!window.KoalaArt || !KoalaArt.room) return "";
    return KoalaArt.room({}, {}, { bare: true }).replace('class="koala-room-svg"', 'class="kh-ward-bg" preserveAspectRatio="xMidYMax slice"');
  }
  let wardSlot = "hat";
  let wardOwned = false, wardApi = null, wardMsg = "", wardSit = false;
  const ID2D_OVR = { glasses: "roundGlasses", scarf: "redScarf", bunnyslippers: "slippers", soccercleats: "soccerBoots", cateye: "catEyeGlasses" };
  const id2d = (n) => ID2D_OVR[n] || (window.KoalaCore ? (KoalaCore.ITEMS.find((i) => i.id.toLowerCase() === n) || {}).id : n) || n;
  // sell a 3D outfit piece back (it is the same purchase as the Sticker one). Returns the "sell" part of a detail popup, or null.
  function clothSell(n, after) {
    if (!wardApi || !wardApi.sell || !curOpts) return null;
    const st = wardApi.status(id2d(n));
    if (!st || st.state !== "owned" || !(st.paid > 0 || curOpts.unlimited)) return null;
    const paid = st.paid || 0;
    return { paid, back: Math.floor(paid * 0.8), onSell: () => { const ok = wardApi.sell(id2d(n)); if (ok && after) after(); return ok; } };
  }
  window.KoalaHouse.setWardApi = (a) => { wardApi = a || null; };
  window.KoalaHouse.setWardOwned = (v) => { wardOwned = !!v; };
  // 3D wardrobe slot <-> the 2D (Sticker) slot an admin-added item is filed under
  const WARD_TO_2D = { hat: "headwear", face: "face", neck: "jewelry", body: "clothing", legs: "bottoms", back: "accessory", feet: "shoes" };
  // Fold the admin-added clothing that has a 3D picture AND a saved fit into the wardrobe tables
  // (KSLOT = which slot, KNAME = label, KBOX = where it sits, KORDER/KBEHIND = layering).
  function syncCustomWard() {
    if (!window.KoalaCore || !KoalaCore.customFit) return;
    const to3d = {}; Object.keys(WARD_TO_2D).forEach((k) => { to3d[WARD_TO_2D[k]] = k; });
    KoalaCore.ITEMS.forEach((it) => {
      const n = it.id.toLowerCase(), sl = it.custom && to3d[it.slot], src = it.custom && KoalaCore.customImg3d(it.id), f = it.custom && KoalaCore.customFit(it.id);
      if (!sl || !src || !f) return;
      CUSTOM_WARD[n] = { src, box: [f.x, f.y, f.x + f.w, f.y + f.h] };
      KBOX[n] = CUSTOM_WARD[n].box;
      KNAME[n] = [it.name.ko, it.name.en];
      if (!KSLOT[sl].includes(n)) {
        KSLOT[sl].push(n);
        if (sl === "back") KBEHIND.push(n);
        else if (sl === "body" || sl === "legs" || sl === "feet") KORDER.splice(KORDER.indexOf("scarf"), 0, n);
        else KORDER.push(n);
      }
    });
  }
  function mountWardrobe(root, opts) {
    if (ses) destroy();
    syncCustomWard();
    curOpts = opts;
    wardHost = root;
    const S = H.load();
    S.worn = S.worn || {};
    const slotName = { hat: T("머리", "Head"), face: T("얼굴", "Face"), neck: T("목", "Neck"), body: T("상의", "Tops"), legs: T("하의", "Bottoms"), back: T("등", "Back"), feet: T("신발", "Shoes") };
    const slotIcon = { hat: "🎩", face: "👓", neck: "🧣", body: "👕", legs: "👖", back: "🎒", feet: "👟" };
    const chipName = (sl) => `${slotIcon[sl] || ""} ${slotName[sl]}`;
    const slots = Object.keys(KSLOT);
    const wardCats = () => slots.map((sl) => ({ id: WARD_TO_2D[sl], label: slotName[sl] }));
    if (!KSLOT[wardSlot]) wardSlot = slots[0];
    const stOf = (n) => { const st = wardApi ? wardApi.status(id2d(n)) : { state: "owned" }; return st || { state: "owned" }; };
    const hasIt = (n) => stOf(n).state === "owned";
    const itemBtn = (sl, n) => {
      const st = stOf(n), on = S.worn[sl] === n, own = st.state === "owned";
      const tag = own ? (on ? T("입는 중", "Wearing") : T("입기", "Wear")) : st.state === "buyable" ? (st.cost ? `💰 ${st.cost}` : T("받기", "Get")) : (st.cost ? `💰 ${st.cost}` : `🔒 ${st.hint || ""}`);
      return `<button type="button" class="kh-item kh-kitem${on ? " on" : ""}${own ? "" : st.state === "buyable" || st.cost ? " kh-buy" : " kh-locked"}" data-wear="${sl}:${n}" aria-pressed="${on}"><img src="${kthumb(n)}" alt="" draggable="false"><span class="kh-nm">${esc(T(KNAME[n][0], KNAME[n][1]))}</span><span class="kh-pr kh-state">${tag}</span></button>`;
    };
    // admin-added clothing: edit / delete from its detail popup (same tools as the Sticker tab)
    const adminBtns = (n) => {
      const it = window.KoalaCore && CUSTOM_WARD[n] && KoalaCore.itemById(id2d(n));
      if (!opts.isAdmin || !it || !it.custom || !window.KoalaAdminItems) return {};
      const refresh = async (gone) => {
        const i = KoalaCore.ITEMS.findIndex((x) => x.id === it.id); if (i >= 0) KoalaCore.ITEMS.splice(i, 1);
        if (gone) {
          delete CUSTOM_WARD[n]; delete KBOX[n];
          Object.keys(KSLOT).forEach((k) => { const j = KSLOT[k].indexOf(n); if (j >= 0) KSLOT[k].splice(j, 1); });
          [KORDER, KBEHIND].forEach((a) => { const j = a.indexOf(n); if (j >= 0) a.splice(j, 1); });
          Object.keys(S.worn).forEach((k) => { if (S.worn[k] === n) delete S.worn[k]; });
          H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn"));
        }
        if (window.loadKoalaItemCatalog) await window.loadKoalaItemCatalog(); else await KoalaCore.loadItems(true);
        syncCustomWard(); closeModal(); draw();
      };
      return {
        adminEdit: () => KoalaAdminItems.openItemForm({ kind: "character", dim: "3d", cats: wardCats(), lang: opts.L("en", "ko"), onSaved: () => refresh(false),
          item: { id: it.id, cat: it.slot, name: it.name, unlock: it.unlock.coins != null ? { type: "coins", value: it.unlock.coins } : { type: "free" }, active: true, img3dUrl: KoalaCore.customImg3d(it.id), fit: KoalaCore.customFit(it.id) } }),
        adminDel: () => KoalaAdminItems.deleteItem({ id: it.id, name: it.name, lang: opts.L("en", "ko"), onDeleted: () => refresh(true) }),
      };
    };
    const clearBtn = `<button type="button" class="kh-btn alt kh-clear" data-clear>${T("모두 벗기기", "Take Off All")}</button>`;
    const ownedHtml = () => {
      const all = []; slots.forEach((sl) => KSLOT[sl].forEach((n) => { if (hasIt(n)) all.push([sl, n]); }));
      return `<div class="kh-grid">${shelfHead(T("내 아이템", "My items"), `${all.length}`)}${all.length ? `<div class="kh-items-grid">${all.map(([sl, n]) => itemBtn(sl, n)).join("")}</div>${slots.some((sl) => S.worn[sl]) ? clearBtn : ""}` : `<p class="kh-empty">${T("아직 구매한 아이템이 없어요.", "You haven't bought any items yet.")}</p>`}</div>`;
    };
    const draw = () => {
      const names = kordered(S.worn);
      const imgs = names.map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
      const wornN = slots.filter((sl) => S.worn[sl]).length;
      root.className = "kh-app kh-embed kh-ward";
      fit(root);
      const sitT = "translate(5.5 9.2) scale(1.281) translate(-64 -222)", cvw = (n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; };
      const sitNames = names.filter((n) => n !== "base" && !KSLOT.feet.includes(n) && !KSLOT.legs.includes(n));
      const sitSvgW = `<svg class="kh-ward-koala kh-ward-sit" viewBox="0 0 720 883" role="img" aria-label="${T("앉은 3D 코알라", "Sitting 3D Koala")}"><ellipse cx="360" cy="860" rx="250" ry="24" fill="#000" opacity=".16"/><g class="kh-wbody"><g transform="${sitT}">${sitNames.filter((n) => KBEHIND.includes(n)).map(cvw).join("")}</g><image href="${extraImg.sit || kimg("sit")}" x="0" y="0" width="720" height="883"/><g transform="${sitT}">${sitNames.filter((n) => !KBEHIND.includes(n)).map(cvw).join("")}</g></g></svg>`;
      root.innerHTML = `<div class="kh-ward-stage${wardSit ? " is-sit" : ""}" id="kh-wstage">${wardBackdrop()}${sitSvgW}<svg class="kh-ward-koala kh-ward-stand" viewBox="64 20 553 1020" role="img" aria-label="${T("3D 코알라", "3D Koala")}"><ellipse cx="340" cy="962" rx="205" ry="22" fill="#000" opacity=".16"/><g class="kh-wbody">${imgs}</g></svg><p class="kh-ward-tip">${T("코알라를 눌러 보세요!", "Tap the koala!")}</p></div>
        <aside class="kh-panel">${chipsHtml(slots.map((sl) => [sl, `/img/cat/${sl}.webp`, slotName[sl]]), wardOwned ? "" : wardSlot)}
        ${wardOwned ? ownedHtml() : `<div class="kh-grid">${shelfHead(slotName[wardSlot], `${S.worn[wardSlot] ? 1 : 0}/${KSLOT[wardSlot].length}`)}${opts.isAdmin ? `<button type="button" class="kh-admin-add-item" data-kh-admin-add-item="${wardSlot}"><span class="add-ic" aria-hidden="true">+</span>${T("아이템 추가", "Add item")}</button>` : ""}<div class="kh-items-grid">${KSLOT[wardSlot].map((n) => itemBtn(wardSlot, n)).join("")}</div>
        ${wornN ? clearBtn : ""}${wardMsg ? `<p class="kh-empty">${esc(wardMsg)}</p>` : ""}</div>`}</aside>`;
      root.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => { wardSlot = b.dataset.tab; if (wardOwned) { wardOwned = false; window.dispatchEvent(new CustomEvent("kh-owned-off")); } draw(); }; });
      initCats(root);
      const wardSaved = async () => { await H.loadCatalog(true); if (window.KoalaCore) await KoalaCore.loadItems(true); syncCustomWard(); draw(); };
      const wAddCat = root.querySelector("[data-kh-admin-add-cat]");
      if (wAddCat && window.KoalaAdminItems) wAddCat.onclick = () => KoalaAdminItems.openCategoryForm({ kind: "character", lang: curOpts.L("en", "ko"), onSaved: wardSaved });
      const wAddItem = root.querySelector("[data-kh-admin-add-item]");
      if (wAddItem && window.KoalaAdminItems) wAddItem.onclick = () => KoalaAdminItems.openItemForm({ kind: "character", dim: "3d", cat: WARD_TO_2D[wardSlot], cats: wardCats(), lang: curOpts.L("en", "ko"), onSaved: wardSaved });
      root.querySelectorAll("[data-wear]").forEach((b) => { b.onclick = () => {
        const [slot, n] = b.dataset.wear.split(":"); const st = stOf(n), nmN = T(KNAME[n][0], KNAME[n][1]), pic = `<img src="${kthumb(n)}" alt="" draggable="false">`;
        const adm = adminBtns(n);
        const wearIt = () => { if (S.worn[slot] === n) delete S.worn[slot]; else S.worn[slot] = n; H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); };
        if (st.state === "owned") { detail({ title: nmN, pic, price: 0, own: true, go: S.worn[slot] === n ? T("벗기", "Take off") : T("입기", "Wear"), onGo: wearIt, ...adm,
          sell: clothSell(n, () => { Object.keys(S.worn).forEach((k) => { if (S.worn[k] === n) delete S.worn[k]; }); H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); }) }); return; }
        if (st.state === "buyable") { detail({ title: nmN, pic, price: st.cost || 0, own: false, afford: true, ...adm, spendFn: () => true, spendWhy: "", onBuy: () => { if (!wardApi.buy(id2d(n))) { toast(T("코인이 모자라요", "Not enough coins"), true); draw(); return; } wardMsg = ""; draw(); toast(T("샀어요! 다시 눌러서 입어 봐요.", "Bought! Tap it again to wear it.")); } }); return; }
        wardMsg = st.cost ? T("코인이 모자라요: ", "Not enough coins: ") + st.cost : st.hint ? T("잠겨 있어요: ", "Locked: ") + st.hint : T("아직 열 수 없어요.", "Not available yet."); draw();
      }; });
      const clr = root.querySelector("[data-clear]"); if (clr) clr.onclick = () => { S.worn = {}; H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); };
      const wst = root.querySelector("#kh-wstage");
      wst.onclick = () => { wardSit = !wardSit; wst.classList.toggle("is-sit", wardSit); const kb = wst.querySelector(wardSit ? ".kh-ward-sit .kh-wbody" : ".kh-ward-stand .kh-wbody"); if (kb) { kb.classList.remove("hop"); void kb.getBoundingClientRect(); kb.classList.add("hop"); } };
    };
    if (wardApi) { let ch = false; slots.forEach((sl) => { if (S.worn[sl] && !hasIt(S.worn[sl])) { delete S.worn[sl]; ch = true; } }); if (ch) H.persist(S); }
    draw();
  }

  window.KoalaHouse.mount = mount;
  window.KoalaHouse.unmount = destroy;
  window.KoalaHouse.mountWardrobe = mountWardrobe;
  window.KoalaHouse.koala3d = koala3d;
})();
