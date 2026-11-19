(() => {
  // Estado global de la aplicación
  const state = {
    lang: "es",
    setIndex: 0,
    timeLimit: 180,
    timeLeft: 180,
    timerId: null,
    items: [],
    currentIndex: 0,
    isPlaying: false,
    feedbackTimeout: null
  };

  // Referencias DOM
  const els = {
    setupScreen: document.getElementById("setup-screen"),
    gameScreen: document.getElementById("game-screen"),
    resultScreen: document.getElementById("result-screen"),
    gameHud: document.getElementById("game-hud"),
    previewRosco: document.getElementById("preview-rosco"),
    gameRosco: document.getElementById("game-rosco"),
    previewKicker: document.getElementById("preview-kicker"),
    previewBadge: document.getElementById("preview-badge"),
    timerBox: document.getElementById("timer-box"),
    timerDisplay: document.getElementById("timer-display"),
    hitsDisplay: document.getElementById("hits-display"),
    errorsDisplay: document.getElementById("errors-display"),
    clueRule: document.getElementById("clue-rule"),
    activeLetter: document.getElementById("active-letter-display"),
    letterProgress: document.getElementById("letter-progress"),
    clueCategory: document.getElementById("clue-category"),
    clueLangLabel: document.getElementById("clue-lang-label"),
    clueDefinition: document.getElementById("clue-definition"),
    feedbackBanner: document.getElementById("feedback-banner"),
    answerForm: document.getElementById("answer-form"),
    answerInput: document.getElementById("answer-input"),
    btnStart: document.getElementById("btn-start"),
    btnPass: document.getElementById("btn-pasapalabra"),
    btnQuit: document.getElementById("btn-quit"),
    btnReplay: document.getElementById("btn-replay"),
    btnMenu: document.getElementById("btn-menu"),
    reviewList: document.getElementById("review-list")
  };

  // Normaliza texto (sin tildes, minúsculas, espacios colapsados)
  function normalizeText(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9ñ\s-]/g, "")
      .trim()
      .replace(/\s+/g, " ");
  }

  // Renderiza el círculo de letras en un contenedor dado
  function renderRoscoRing(container, items, activeIdx = -1, isPreview = false) {
    container.innerHTML = "";
    const total = items.length;
    const radiusPercent = 43; // Porcentaje respecto al contenedor

    items.forEach((item, idx) => {
      const angleDeg = -90 + (360 / total) * idx;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = Math.cos(angleRad) * radiusPercent;
      const y = Math.sin(angleRad) * radiusPercent;

      const node = document.createElement("div");
      node.className = "letter-node";
      node.textContent = item.letter;

      // Posicionamiento relativo al centro (50%, 50%)
      const baseTransform = `translate(${x * 4.4}px, ${y * 4.4}px)`;
      node.style.left = `${50 + x}%`;
      node.style.top = `${50 + y}%`;
      node.style.setProperty("--base-transform", "translate(0, 0)");

      if (isPreview) {
        // Decoración visual similar al rosco de muestra
        if (idx === 2 || idx === 9 || idx === 15 || idx === 22) node.classList.add("correct");
        if (idx === 5) node.classList.add("wrong");
      } else {
        if (item.status === "correct") node.classList.add("correct");
        else if (item.status === "wrong") node.classList.add("wrong");
        else if (item.status === "passed") node.classList.add("passed");

        if (idx === activeIdx) node.classList.add("current");
      }

      container.appendChild(node);
    });
  }

  // Actualiza toda la interfaz según el idioma seleccionado
  function applyLanguageUI() {
    const langObj = GAME_DATA[state.lang];
    const ui = langObj.ui;

    document.documentElement.lang = state.lang;
    document.getElementById("ui-subtitle").textContent = ui.subtitle;
    els.previewKicker.textContent = ui.subtitle;
    els.previewBadge.textContent = ui.badge;

    document.getElementById("ui-cfg-lang").textContent = ui.cfgLang;
    document.getElementById("ui-cfg-rosco").textContent = ui.cfgRosco;
    document.getElementById("ui-cfg-time").textContent = ui.cfgTime;

    document.getElementById("ui-set-1").textContent = ui.set1;
    document.getElementById("ui-set-1-desc").textContent = ui.set1Desc;
    document.getElementById("ui-set-2").textContent = ui.set2;
    document.getElementById("ui-set-2-desc").textContent = ui.set2Desc;
    document.getElementById("ui-set-3").textContent = ui.set3;
    document.getElementById("ui-set-3-desc").textContent = ui.set3Desc;

    document.getElementById("ui-t-fast").textContent = ui.tFast;
    document.getElementById("ui-t-normal").textContent = ui.tNormal;
    document.getElementById("ui-t-relaxed").textContent = ui.tRelaxed;
    document.getElementById("ui-t-unlimited").textContent = ui.tUnlimited;

    document.getElementById("ui-btn-start").textContent = ui.btnStart;
    document.getElementById("ui-hud-time").textContent = ui.hudTime;
    document.getElementById("ui-hud-hits").textContent = ui.hudHits;
    document.getElementById("ui-hud-errors").textContent = ui.hudErrors;

    els.answerInput.placeholder = ui.placeholder;
    document.getElementById("btn-submit").textContent = ui.btnSubmit;
    els.btnPass.textContent = ui.btnPass;
    document.getElementById("ui-kbd-hint").innerHTML = ui.kbdHint;

    document.getElementById("ui-res-hits").textContent = ui.resHits;
    document.getElementById("ui-res-errors").textContent = ui.resErrors;
    document.getElementById("ui-res-pending").textContent = ui.resPending;
    document.getElementById("ui-res-time").textContent = ui.resTime;
    els.btnReplay.textContent = ui.btnReplay;
    els.btnMenu.textContent = ui.btnMenu;

    const previewSet = langObj.sets[state.setIndex];
    renderRoscoRing(els.previewRosco, previewSet, -1, true);
  }

  // Muestra un mensaje temporal de validación
  function showFeedback(text, type) {
    clearTimeout(state.feedbackTimeout);
    els.feedbackBanner.textContent = text;
    els.feedbackBanner.className = `feedback-banner visible ${type}`;
    state.feedbackTimeout = setTimeout(() => {
      els.feedbackBanner.classList.remove("visible");
    }, 2600);
  }

  // Inicia una nueva partida
  function startGame() {
    const langObj = GAME_DATA[state.lang];
    const sourceSet = langObj.sets[state.setIndex];

    state.items = sourceSet.map((q) => ({
      ...q,
      status: "pending", // pending | passed | correct | wrong
      userAnswer: ""
    }));

    state.currentIndex = 0;
    state.timeLeft = state.timeLimit;
    state.isPlaying = true;

    els.setupScreen.hidden = true;
    els.resultScreen.hidden = true;
    els.gameScreen.hidden = false;
    els.gameHud.hidden = false;
    els.feedbackBanner.className = "feedback-banner";

    updateHud();
    startTimer();
    renderCurrentTurn();
    els.answerInput.focus();
  }

  // Temporizador
  function startTimer() {
    clearInterval(state.timerId);
    els.timerBox.classList.remove("danger");

    if (state.timeLimit === 0) {
      els.timerDisplay.textContent = "∞";
      return;
    }

    els.timerDisplay.textContent = state.timeLeft;
    state.timerId = setInterval(() => {
      state.timeLeft--;
      els.timerDisplay.textContent = state.timeLeft;

      if (state.timeLeft <= 20) {
        els.timerBox.classList.add("danger");
      }

      if (state.timeLeft <= 0) {
        endGame(true);
      }
    }, 1000);
  }

  // Actualiza marcadores superiores
  function updateHud() {
    const hits = state.items.filter((i) => i.status === "correct").length;
    const errors = state.items.filter((i) => i.status === "wrong").length;
    els.hitsDisplay.textContent = hits;
    els.errorsDisplay.textContent = errors;
  }

  // Renderiza la letra y definición actuales
  function renderCurrentTurn() {
    const langObj = GAME_DATA[state.lang];
    const item = state.items[state.currentIndex];

    renderRoscoRing(els.gameRosco, state.items, state.currentIndex, false);

    els.clueRule.textContent = item.mode === "starts" ? langObj.ui.startsWith : langObj.ui.contains;
    els.activeLetter.textContent = item.letter;
    els.letterProgress.textContent = `${state.currentIndex + 1} / ${state.items.length}`;
    els.clueCategory.textContent = item.category;
    els.clueLangLabel.textContent = `${langObj.label} · ${langObj.ui["set" + (state.setIndex + 1)]}`;
    els.clueDefinition.textContent = item.clue;

    els.answerInput.value = "";
    els.answerInput.focus();
  }

  // Busca la siguiente letra disponible (pending o passed)
  function advanceToNextLetter() {
    const total = state.items.length;
    for (let offset = 1; offset <= total; offset++) {
      const candidateIdx = (state.currentIndex + offset) % total;
      const st = state.items[candidateIdx].status;
      if (st === "pending" || st === "passed") {
        state.currentIndex = candidateIdx;
        renderCurrentTurn();
        return;
      }
    }
    // Si no quedan letras pendientes, termina el juego
    endGame(false);
  }

  // Evalúa la respuesta escrita
  function handleAnswerSubmit(e) {
    e.preventDefault();
    if (!state.isPlaying) return;

    const raw = els.answerInput.value.trim();
    if (!raw) {
      handlePasapalabra();
      return;
    }

    const item = state.items[state.currentIndex];
    const normalizedInput = normalizeText(raw);
    const isCorrect = item.answer.some((ans) => normalizeText(ans) === normalizedInput);
    const ui = GAME_DATA[state.lang].ui;

    item.userAnswer = raw;

    if (isCorrect) {
      item.status = "correct";
      showFeedback(`${ui.hitMsg} (${item.answer[0].toUpperCase()})`, "hit");
    } else {
      item.status = "wrong";
      showFeedback(`${ui.errMsg} ${item.answer[0].toUpperCase()}`, "err");
    }

    updateHud();
    advanceToNextLetter();
  }

  // Acción Pasapalabra
  function handlePasapalabra() {
    if (!state.isPlaying) return;
    const item = state.items[state.currentIndex];
    const ui = GAME_DATA[state.lang].ui;

    item.status = "passed";
    showFeedback(ui.passMsg, "pass");
    advanceToNextLetter();
  }

  // Finaliza la partida y muestra resultados
  function endGame(byTimeout = false) {
    state.isPlaying = false;
    clearInterval(state.timerId);

    const ui = GAME_DATA[state.lang].ui;
    const hits = state.items.filter((i) => i.status === "correct").length;
    const errors = state.items.filter((i) => i.status === "wrong").length;
    const pending = state.items.length - hits - errors;

    els.gameScreen.hidden = true;
    els.gameHud.hidden = true;
    els.resultScreen.hidden = false;

    document.getElementById("result-title").textContent = byTimeout ? ui.resTitleTime : ui.resTitleWin;
    document.getElementById("result-subtitle").textContent = ui.resSubtitle;
    document.getElementById("res-hits").textContent = hits;
    document.getElementById("res-errors").textContent = errors;
    document.getElementById("res-pending").textContent = pending;
    document.getElementById("res-time").textContent = state.timeLimit === 0 ? "∞" : `${Math.max(0, state.timeLeft)}s`;

    // Lista de revisión detallada
    els.reviewList.innerHTML = "";
    state.items.forEach((item) => {
      const row = document.createElement("div");
      const stClass = item.status === "correct" ? "correct" : item.status === "wrong" ? "wrong" : "pending";
      row.className = `review-item ${stClass}`;
      row.innerHTML = `
        <span class="review-letter">${item.letter}</span>
        <span class="review-word">${item.answer[0].toUpperCase()}</span>
        <span class="review-def">${item.clue}</span>
      `;
      els.reviewList.appendChild(row);
    });
  }

  // Volver al menú principal
  function returnToMenu() {
    state.isPlaying = false;
    clearInterval(state.timerId);
    els.gameScreen.hidden = true;
    els.resultScreen.hidden = true;
    els.gameHud.hidden = true;
    els.setupScreen.hidden = false;
    applyLanguageUI();
  }

  // Eventos de selección en pantalla de configuración
  document.getElementById("lang-options").addEventListener("click", (e) => {
    const btn = e.target.closest(".option-btn");
    if (!btn) return;
    document.querySelectorAll("#lang-options .option-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.lang = btn.dataset.lang;
    applyLanguageUI();
  });

  document.getElementById("rosco-options").addEventListener("click", (e) => {
    const btn = e.target.closest(".option-btn");
    if (!btn) return;
    document.querySelectorAll("#rosco-options .option-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.setIndex = Number(btn.dataset.set);
    applyLanguageUI();
  });

  document.getElementById("time-options").addEventListener("click", (e) => {
    const btn = e.target.closest(".option-btn");
    if (!btn) return;
    document.querySelectorAll("#time-options .option-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.timeLimit = Number(btn.dataset.time);
  });

  // Atajo de barra espaciadora cuando el input está vacío -> Pasapalabra
  els.answerInput.addEventListener("keydown", (e) => {
    if (e.code === "Space" && els.answerInput.value.trim() === "") {
      e.preventDefault();
      handlePasapalabra();
    }
  });

  els.btnStart.addEventListener("click", startGame);
  els.answerForm.addEventListener("submit", handleAnswerSubmit);
  els.btnPass.addEventListener("click", handlePasapalabra);
  els.btnQuit.addEventListener("click", returnToMenu);
  els.btnReplay.addEventListener("click", startGame);
  els.btnMenu.addEventListener("click", returnToMenu);

  // Inicialización
  applyLanguageUI();
})();
