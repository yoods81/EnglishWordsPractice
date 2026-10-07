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
     "Go to My Account and use the Upgrade card. Online payment is coming soon; for now you can join with a special code. If you asked for an upgrade, we'll send you a code and the card will tell you when it's ready.",
     "내 계정의 업그레이드 카드를 이용해 주세요. 온라인 결제는 곧 열릴 예정이고, 지금은 특별 코드로 가입할 수 있어요. 업그레이드를 요청하셨다면 코드를 보내 드리고, 준비되면 카드에 알려 드려요."],
    ["Where do I enter a special code?", "특별 코드는 어디에 입력하나요?",
     "When signing up, choose Premium and type the code in the Special code box. If you already have an account, use the code button on the Upgrade card in My Account.",
     "가입할 때 프리미엄을 선택하고 '특별 코드' 칸에 입력하세요. 이미 계정이 있다면 내 계정의 업그레이드 카드에 있는 코드 버튼을 이용해 주세요."],
    ["Is my progress saved?", "학습 기록은 저장되나요?",
     "When you're signed in, your progress is saved to your account, so you can pick up on another phone or computer. If you're not signed in, it's kept only in this browser on this device.",
     "로그인하면 학습 기록이 계정에 저장돼서 다른 휴대폰이나 컴퓨터에서도 이어서 할 수 있어요. 로그인하지 않으면 이 기기의 이 브라우저에만 저장돼요."],
    ["What are Koala Coins?", "코알라 코인이 뭐예요?",
     "Coins are rewards you earn as you practise. Spend them in My Koala on items for your koala.",
     "연습하면서 모으는 보상이에요. '마이 코알라'에서 코알라를 꾸밀 아이템을 살 수 있어요."],
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
