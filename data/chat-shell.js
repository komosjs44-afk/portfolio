(function (global) {
  'use strict';

  // About/Career 페이지가 서로의 영역 질문을 받았을 때 안내할 문구·링크.
  // chat-engine.js의 runChatPipeline()이 반환하는 analysis.category를 그대로 사용한다.
  const CATEGORY_SCOPE = {
    general: {
      blockedCategories: ['project', 'award', 'paper', 'journey', 'startup'],
      text: '경력 관련 내용은 경력 중심 보기에서 더 자세히 확인할 수 있어요.',
      linkLabel: '경력 중심으로 보기 →',
      href: 'chat-career.html',
    },
    recruiter: {
      blockedCategories: ['preference', 'life'],
      text: '개인적인 취향은 나를 알아보기에서 확인할 수 있어요.',
      linkLabel: '나를 알아보기 →',
      href: 'chat-about.html',
    },
  };

  function initYionChatShell(config) {
    const chatPage = document.getElementById('chatPage');
    if (!chatPage) return;

    const chatLog = document.getElementById('chatLog');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const jumpBtn = document.getElementById('chatJumpLatest');
    const resetBtn = document.getElementById('chatResetBtn');
    const backBtn = document.getElementById('chatBackBtn');
    const heroMessage = document.getElementById('chatHeroMessage');
    const hintChip = document.getElementById('chatHintChip');
    const hintText = document.getElementById('chatHintText');

    const pageMode = config.pageMode === 'recruiter' ? 'recruiter' : 'general';
    const historyStorageKey = config.historyStorageKey || `yion_chat_${pageMode}_v1`;
    const heroLines = config.heroLines || [];
    const hintItems = config.hintItems || [];
    const scope = CATEGORY_SCOPE[pageMode];
    const MAX_HISTORY = 40;
    const HINT_ROTATE_MS = 4000;

    let history = [];
    let restoring = false;
    let hintIndex = 0;
    let hintTimer = null;
    let inputHasFocus = false;

    if (chatInput && config.placeholder) chatInput.placeholder = config.placeholder;

    // 이 페이지는 항상 하나의 고정된 모드만 사용한다(런타임 토글 없음).
    if (global.YIONChatEngine) global.YIONChatEngine.setVisitorMode(pageMode);

    // script.js의 ask()가 답변을 렌더링하기 직전에 호출하는 범위 필터 훅.
    global.applyChatScope = function (result, answer) {
      const category = result.analysis && result.analysis.category;
      if (!scope || !category || scope.blockedCategories.indexOf(category) === -1) return answer;
      return {
        text: scope.text,
        tag: answer.tag,
        followups: [],
        projectSlugs: [],
        scrollTo: null,
        redirectHref: scope.href,
        redirectLabel: scope.linkLabel,
      };
    };

    // ---- Hero 메시지 ----
    function renderHero({ animate = true } = {}) {
      if (!heroMessage) return;
      heroMessage.classList.remove('mode-switch-anim');
      if (animate) {
        void heroMessage.offsetWidth;
        heroMessage.classList.add('mode-switch-anim');
      }
      heroMessage.innerHTML = heroLines.map((line) => `<p>${line}</p>`).join('');
    }

    // ---- Hint Chip: 힌트 1개만, 은은하게 순환(여러 개를 동시에 보여주지 않는다) ----
    function applyHint(index, { animate = true } = {}) {
      if (!hintItems.length) return;
      const item = hintItems[index % hintItems.length];
      if (hintChip) {
        hintChip.classList.remove('mode-switch-anim');
        if (animate) {
          void hintChip.offsetWidth;
          hintChip.classList.add('mode-switch-anim');
        }
        hintChip.dataset.question = item.question;
      }
      if (hintText) hintText.textContent = `${item.label} 물어보기`;
      if (chatInput) chatInput.placeholder = item.placeholder;
    }

    function startHintRotation() {
      if (!hintItems.length) return;
      if (hintTimer) clearInterval(hintTimer);
      hintIndex = 0;
      applyHint(hintIndex, { animate: false });
      hintTimer = setInterval(() => {
        hintIndex += 1;
        applyHint(hintIndex);
      }, HINT_ROTATE_MS);
    }

    function setHintVisible(visible) {
      if (!hintChip) return;
      hintChip.classList.toggle('is-hidden', !visible);
    }

    if (hintChip) {
      hintChip.addEventListener('click', () => {
        if (hintChip.dataset.question && typeof global.askChatQuestion === 'function') {
          global.askChatQuestion(hintChip.dataset.question);
        }
      });
    }

    // 입력에 집중할 때는 Hint를 숨기고, 취소(빈 입력으로 blur)하면 다시 보여준다
    // (질문을 쓰는 도중에 힌트가 겹쳐 보여 헷갈리지 않도록).
    if (chatInput) {
      chatInput.addEventListener('focus', () => {
        inputHasFocus = true;
        setHintVisible(false);
      });
      chatInput.addEventListener('blur', () => {
        inputHasFocus = false;
        if (!chatInput.value.trim()) setHintVisible(true);
      });
      chatInput.addEventListener('input', () => {
        if (inputHasFocus) setHintVisible(false);
      });
    }

    // ---- 뒤로가기: 채팅 선택 페이지로 ----
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (global.history.length > 1) global.history.back();
        else global.location.href = 'chat.html';
      });
    }

    // ---- sessionStorage 저장/복원 (페이지별로 완전히 분리된 키) ----
    function loadHistory() {
      try {
        const raw = sessionStorage.getItem(historyStorageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        sessionStorage.removeItem(historyStorageKey);
        return [];
      }
    }

    function saveHistory() {
      try {
        sessionStorage.setItem(historyStorageKey, JSON.stringify(history.slice(-MAX_HISTORY)));
      } catch (e) {
        /* 저장 공간 제한(프라이빗 모드 등)은 무시하고 진행 */
      }
    }

    global.onChatMessageAdded = function (msg) {
      if (!restoring) {
        history.push(msg);
        saveHistory();
      }
    };

    // ---- 초기 로드 ----
    renderHero({ animate: false });
    startHintRotation();
    history = loadHistory();
    if (history.length && typeof global.renderChatMessage === 'function') {
      restoring = true;
      history.forEach((msg) => global.renderChatMessage(msg));
      restoring = false;
      if (typeof global.scrollChatToBottom === 'function') global.scrollChatToBottom(false);
    }

    // ---- 대화 초기화(이 페이지의 기록·엔진 상태만) ----
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        history = [];
        saveHistory();
        if (global.YIONChatEngine) {
          global.YIONChatEngine.setVisitorMode(pageMode);
          global.YIONChatEngine.resetConversationState();
        }
        chatLog.querySelectorAll('.message').forEach((m) => m.remove());
        if (jumpBtn) jumpBtn.hidden = true;
        renderHero();
      });
    }

    // ---- 최신 메시지로 이동 ----
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        if (typeof global.scrollChatToBottom === 'function') global.scrollChatToBottom(true);
      });
    }

    // ---- textarea 자동 높이 조절(최대 높이까지만) ----
    if (chatInput && chatInput.tagName === 'TEXTAREA') {
      const resizeInput = () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
      };
      chatInput.addEventListener('input', resizeInput);
      if (chatForm) {
        chatForm.addEventListener('submit', () => {
          setTimeout(resizeInput, 0);
        });
      }
    }

    // ---- URL ?q= 로 넘어온 질문 자동 실행 ----
    const params = new URLSearchParams(global.location.search);
    const initialQuestion = params.get('q');
    if (initialQuestion && typeof global.askChatQuestion === 'function') {
      setTimeout(() => global.askChatQuestion(initialQuestion), 300);
    }

    // ---- 모바일 키보드 대응: visualViewport 우선, innerHeight 폴백 ----
    // 데스크톱(≥900px)에서는 .chat-page가 CSS로 고정 높이의 가운데 정렬 패널이므로
    // 인라인 높이를 강제하지 않는다(강제하면 CSS의 desktop 높이 규칙을 덮어써 버림).
    const desktopQuery = global.matchMedia ? global.matchMedia('(min-width: 900px)') : null;

    function applyHeight(px) {
      if (desktopQuery && desktopQuery.matches) {
        chatPage.style.height = '';
        return;
      }
      chatPage.style.height = px + 'px';
    }

    function isChatLikelyNearBottomOnResize() {
      if (!chatLog) return false;
      return chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 160;
    }

    function handleViewportChange() {
      const vv = global.visualViewport;
      if (vv) {
        applyHeight(vv.height);
        const keyboardOpen = global.innerHeight - vv.height > 120;
        document.body.classList.toggle('keyboard-open', keyboardOpen);
      } else {
        applyHeight(global.innerHeight);
      }
      if (typeof global.scrollChatToBottom === 'function' && isChatLikelyNearBottomOnResize()) {
        global.scrollChatToBottom(false);
      }
    }

    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', handleViewportChange);
      global.visualViewport.addEventListener('scroll', handleViewportChange);
    } else {
      global.addEventListener('resize', handleViewportChange);
    }
    handleViewportChange();
  }

  global.initYionChatShell = initYionChatShell;
})(window);
