/* Help centre: the FAQ list shown from the login/sign-up windows and from
   My Account → Help. Goal: let people find the answer themselves first; the
   small "Contact us" link at the bottom is the last resort. Loaded after
   support.js; uses its globals (rwL, escapeHtml) and window.koalaSupportUI. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const L = (en, ko) => rwL(en, ko);

  // [question en, question ko, answer en, answer ko]
  const FAQ = [
    ["I forgot my username or password.", "아이디나 비밀번호를 잊어버렸어요.",
     "Tap Log In, then \"Forgot your username or password?\" and enter the email address on your account. We'll email your username or a link to set a new password.",
     "로그인 창에서 '아이디 또는 비밀번호를 잊으셨나요?'를 누르고, 계정에 등록한 이메일을 입력해 주세요. 아이디 안내나 새 비밀번호 설정 링크를 이메일로 보내 드려요."],
    ["I didn't get the email.", "이메일이 오지 않아요.",
     "Wait a few minutes and check the Spam or Junk folder. Make sure the address was typed correctly — you can fix it in My Account → Email → Change email. Emails only go to an address you've added to your account.",
     "몇 분 기다린 뒤 스팸함(정크 메일함)도 확인해 주세요. 주소를 잘못 입력했다면 내 계정 → 이메일 → 이메일 변경에서 고칠 수 있어요. 이메일은 계정에 등록한 주소로만 발송돼요."],
    ["How do I confirm my email?", "이메일 인증은 어떻게 하나요?",
     "Open the email we sent after you signed up and tap the confirmation link. Until it's confirmed, some parts of the app stay locked. If you can't find it, open My Account to send a new one.",
     "가입 후 받은 이메일에서 인증 링크를 눌러 주세요. 인증 전에는 일부 기능이 잠겨 있어요. 메일을 찾을 수 없다면 내 계정에서 새로 보낼 수 있어요."],
    ["What's the difference between Free and Premium?", "무료와 프리미엄은 뭐가 다른가요?",
     "A Free account lets you start learning right away. Premium adds more questions and your own word list (Add Word), including adding words from a photo of a book page.",
     "무료 계정은 바로 학습을 시작할 수 있어요. 프리미엄은 더 많은 문제와 나만의 단어장(단어 추가)을 쓸 수 있고, 책 사진으로 단어를 추가하는 기능도 포함돼요."],
    ["How do I upgrade to Premium?", "프리미엄으로 업그레이드하려면 어떻게 하나요?",
     "Go to My Account and use the Upgrade card. Online payment is coming soon; for now you can join with a voucher code. If you asked for an upgrade, we'll send you a code and the card will tell you when it's ready.",
     "내 계정의 업그레이드 카드를 이용해 주세요. 온라인 결제는 곧 열릴 예정이고, 지금은 바우처 코드로 가입할 수 있어요. 업그레이드를 요청하셨다면 코드를 보내 드리고, 준비되면 카드에 알려 드려요."],
    ["Where do I enter a voucher code?", "바우처 코드는 어디에 입력하나요?",
     "Sign up (or log in) first, then open My Account and tap “Voucher code” on the Premium card.",
     "먼저 가입(또는 로그인)한 뒤, 내 계정의 프리미엄 카드에서 ‘바우처 코드’ 버튼을 눌러 입력해 주세요."],
    ["Is my progress saved?", "학습 기록은 저장되나요?",
     "Yes, in two parts. Your koala world — coins, items, room, streak, badges and study level — is saved to your account, so it is the same on any phone or computer. Which words you have already practised is remembered in this browser on this device (Premium remembers it on every device). If you're not signed in, everything stays in this browser only.",
     "네, 두 가지로 나뉘어요. 코알라 세계(코인, 아이템, 방, 연속 학습일, 배지, 학습 레벨)는 계정에 저장돼서 어느 기기에서든 똑같아요. 이미 푼 단어 기록은 이 기기의 이 브라우저에 기억돼요(프리미엄은 모든 기기에서 기억해요). 로그인하지 않으면 모든 기록이 이 브라우저에만 남아요."],
    ["Will my coins and items stay if I use another phone?", "다른 휴대폰에서 써도 코인과 아이템이 그대로인가요?",
     "Yes. Log in with your account and your coins, items, koala and room appear as you left them. Only the list of words you have already practised stays on the device where you practised (Premium follows you everywhere).",
     "네. 같은 계정으로 로그인하면 코인, 아이템, 코알라, 방이 그대로 나타나요. 이미 푼 단어 목록만 푼 기기에 남아요(프리미엄은 어디서나 따라와요)."],
    ["I saw a word I already did on another device. Why?", "다른 기기에서 이미 푼 단어가 또 나왔어요. 왜죠?",
     "Free accounts remember practised words only on the device used. On a new device (or after clearing browser data) the app can't tell which words you did. Use the same device and keep your browser data to avoid it, or try Premium.",
     "무료 계정은 푼 단어를 사용한 기기에만 기억해요. 새 기기이거나 브라우저 데이터를 지우면 어떤 단어를 풀었는지 알 수 없어요. 같은 기기를 쓰고 브라우저 데이터를 지우지 않으면 막을 수 있고, 프리미엄은 이런 걱정이 없어요."],
    ["Will I see the same words again today?", "오늘 같은 단어가 또 나오나요?",
     "No. Quiz, Spelling, Flashcards and the Typing Game give you words you haven't done yet today at your level. When they run out, you'll see a message instead — try another level or come back tomorrow. Premium members can also tap Review to practise older words on purpose.",
     "아니요. 퀴즈, 스펠링, 플래시카드, 타이핑 게임은 오늘 아직 안 한 단어를 내 레벨에서 골라 줘요. 다 끝나면 안내 메시지가 나와요. 다른 레벨을 하거나 내일 다시 오세요. 프리미엄은 '복습' 버튼으로 이전 단어를 일부러 다시 연습할 수 있어요."],
    ["What are Koala Coins?", "코알라 코인이 뭐예요?",
     "Coins are rewards you earn as you practise. Spend them in My Koala on items for your koala. Wrong answers never cost coins.",
     "연습하면서 모으는 보상이에요. '마이 코알라'에서 코알라를 꾸밀 아이템을 살 수 있어요. 틀려도 코인이 줄어들지 않아요."],
    ["How do I earn coins?", "코인은 어떻게 벌어요?",
     "Quiz, Spelling and Flashcards: every 10 correct answers earn 5 coins. Typing Game and Times Table: every 50 correct answers earn 5 coins. Today's Mission and Review pay extra (see below). Just opening or flipping through cards doesn't earn coins.",
     "퀴즈, 스펠링, 플래시카드는 정답 10개마다 5코인, 타이핑 게임과 구구단은 정답 50개마다 5코인이에요. 오늘의 미션과 복습은 추가로 코인을 줘요(아래 참고). 화면을 열거나 카드를 넘기기만 해서는 코인이 쌓이지 않아요."],
    ["How many coins can I earn in a day?", "하루에 코인을 얼마나 벌 수 있나요?",
     "Free accounts earn up to 3 full rewards a day in each of Quiz, Spelling and Flashcards (2 in the Typing Game and Times Table), then a few smaller bonus rewards. Premium has no daily limit. Coins build up gradually on purpose, so every item feels like a real achievement.",
     "무료 계정은 퀴즈, 스펠링, 플래시카드에서 하루 최대 3번(타이핑 게임과 구구단은 2번) 전체 보상을 받고, 그 뒤에는 작은 보너스 보상이 있어요. 프리미엄은 하루 제한이 없어요. 코인이 천천히 쌓이도록 만든 것이라 아이템 하나하나가 뿌듯한 성취가 돼요."],
    ["Why didn't flipping flashcards give me coins?", "플래시카드를 넘겼는데 왜 코인이 안 쌓이나요?",
     "Flashcards earn coins from the short quiz at the end of each round, based on the answers you get right. Flipping cards is for learning, so it doesn't pay on its own.",
     "플래시카드 코인은 라운드가 끝날 때 나오는 짧은 퀴즈에서 맞힌 정답 수로 받아요. 카드를 넘기는 건 공부 과정이라 그것만으로는 코인이 없어요."],
    ["What is Today's Mission?", "오늘의 미션은 뭐예요?",
     "Each day's mission is a few small tasks of 15 correct answers each. Finishing earns 5 coins. If you want another go, a retry earns 5 more (Free accounts can retry up to 3 times a day; Premium has no limit).",
     "미션은 정답 15개를 맞히는 작은 과제들로 이루어져 있어요. 완료하면 5코인을 받아요. 한 번 더 도전하면 재도전 보상으로 5코인을 더 받아요(무료 계정은 하루 3번까지, 프리미엄은 제한 없음)."],
    ["Do the Typing Game and Times Table pay less if I lock the speed?", "속도를 고정하면 타이핑 게임과 구구단 코인이 줄어드나요?",
     "Yes. If you lock the speed at level 1 to play at an easier pace, each round pays half the coins (rounded down). Playing at normal speed earns the full amount.",
     "네. 쉬운 속도로 하려고 속도를 1단계로 고정하면 라운드당 코인이 절반(소수점 버림)이에요. 기본 속도로 하면 전체 코인을 받아요."],
    ["What does Review pay?", "복습을 하면 코인을 얼마나 받나요?",
     "Review is a Premium feature. A review session of 10 questions or more, with at least half answered right on the first try, earns 10 coins. The first 2 sessions of the day pay coins; more are still great practice.",
     "복습은 프리미엄 기능이에요. 10문제 이상으로 하고 첫 시도에서 절반 이상 맞히면 10코인을 받아요. 하루 첫 2번의 복습에 코인이 지급되고, 그 뒤에도 연습은 계속 할 수 있어요."],
    ["How does my streak work?", "연속 학습일은 어떻게 쌓이나요?",
     "A day counts once you've answered 5 questions in total. Missing one day won't break your streak if your weekly rest day is still unused (one per week).",
     "하루에 문제를 합쳐서 5개 이상 풀면 그날이 인정돼요. 한 주에 한 번 쉬는 날이 남아 있다면 하루를 빠뜨려도 연속 기록이 이어져요."],
    ["How do I add my own words?", "내 단어는 어떻게 추가하나요?",
     "Add Word is a Premium feature. Open Add Word to type words in, paste a list, or take a photo of a book page and let the app pick out the words.",
     "단어 추가는 프리미엄 기능이에요. 단어 추가에서 직접 입력하거나 목록을 붙여넣거나, 책 사진을 찍어 단어를 자동으로 뽑을 수 있어요."],
    ["I can't hear the words being read aloud.", "단어 읽어주는 소리가 안 들려요.",
     "Check the device volume and that silent mode is off, then try the sound button in the activity. The voice comes from your device, so a different browser may sound different.",
     "기기 음량과 무음 모드를 확인한 뒤 활동 화면의 소리 버튼을 눌러 보세요. 목소리는 기기에서 나오기 때문에 브라우저에 따라 다르게 들릴 수 있어요."],
    ["Can I use the app in Korean?", "한국어로 쓸 수 있나요?",
     "Yes. Tap the language button at the top left to switch between English and 한국어. Each language remembers its own level.",
     "네. 왼쪽 위의 언어 버튼으로 English와 한국어를 바꿀 수 있어요. 언어마다 선택한 학년이 따로 기억돼요."],
    ["Is it safe for children?", "아이들이 써도 안전한가요?",
     "We only ask for a username and a parent's email — please don't use a child's full name as the username. We never show ads or let children chat with others.",
     "아이디와 보호자 이메일만 받아요. 아이디에 아이의 실명은 쓰지 말아 주세요. 광고나 다른 사용자와의 채팅은 없어요."],
    ["How do I change my username or delete my account?", "아이디 변경이나 계정 삭제는 어떻게 하나요?",
     "These need a hand from us — use Contact us below and tell us which one you need.",
     "저희가 직접 처리해 드려요. 아래 '문의하기'로 원하시는 내용을 알려 주세요."],
  ];

  function listHtml() {
    return FAQ.map(
      ([qe, qk, ae, ak]) =>
        `<details class="faq-item"><summary>${escapeHtml(L(qe, qk))}</summary><p>${escapeHtml(L(ae, ak))}</p></details>`
    ).join("");
  }

  function contactHtml() {
    return `<p class="faq-foot">${escapeHtml(L("Can't find your answer?", "답을 찾지 못하셨나요?"))} <button type="button" class="faq-contact-link" data-faq-contact>${escapeHtml(L("Contact us", "문의하기"))}</button></p>`;
  }

  /* ---------- overlay (from login / sign-up) ---------- */
  const overlay = $("faq-overlay");
  function renderOverlay() {
    $("faq-title").textContent = L("Help", "도움말");
    $("faq-lead").textContent = L("Most questions are answered here.", "궁금한 점은 대부분 여기서 해결돼요.");
    $("faq-body").innerHTML = listHtml() + contactHtml();
    $("faq-close-btn").textContent = L("Close", "닫기");
  }
  function open() {
    renderOverlay();
    overlay.hidden = false;
    $("faq-body").scrollTop = 0;
  }
  function close() {
    overlay.hidden = true;
  }
  $("faq-close-btn").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target.closest("[data-faq-contact]")) {
      close();
      window.koalaSupportUI && koalaSupportUI.openContact();
    }
  });

  /* ---------- My Account: Messages | Help tabs ---------- */
  const tabs = document.querySelectorAll("[data-acct-tab]");
  const msgPane = $("my-account-msg-pane");
  const faqPane = $("my-account-faq-pane");
  function setAcctTab(name) {
    tabs.forEach((b) => {
      const on = b.dataset.acctTab === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    msgPane.hidden = name !== "messages";
    faqPane.hidden = name !== "faq";
    if (name === "faq") faqPane.innerHTML = listHtml() + contactHtml();
  }
  tabs.forEach((b) => b.addEventListener("click", () => setAcctTab(b.dataset.acctTab)));
  faqPane.addEventListener("click", (e) => {
    if (e.target.closest("[data-faq-contact]")) window.koalaSupportUI && koalaSupportUI.openContact();
  });

  function localize() {
    const lbl = { messages: L("Messages", "내 메시지"), faq: L("FAQ", "자주 묻는 질문") };
    tabs.forEach((b) => (b.textContent = lbl[b.dataset.acctTab]));
    if (!faqPane.hidden) faqPane.innerHTML = listHtml() + contactHtml();
    if (!overlay.hidden) renderOverlay();
  }

  window.koalaFAQ = { open, close, localize };
  localize();
})();
