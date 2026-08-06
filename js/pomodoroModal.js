// 集中タイマーUI：サイドバーの「集中」コマンドから開く。
// プリセット一覧（出発）→ 実行中（探索/休憩＋残り時間）→ プリセット追加フォーム、の3画面を持つ。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  let currentRefresh = null;

  function open(state) {
    const overlay = document.getElementById("pomodoro-overlay");
    const box = document.getElementById("pomodoro-box");
    if (!overlay || !box) return;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
      currentRefresh = null;
    }

    function render() {
      if (window.Pomodoro.getSession(state)) {
        renderRunning();
      } else {
        renderHome();
      }
    }

    function renderHome() {
      const presets = window.Pomodoro.getPresets(state);

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">⏳ 集中タイマー</h3>
          <button type="button" class="modal-close-btn" id="pomo-close">✕</button>
        </div>
        <p class="screen-desc">時間を決めて冒険に出発しよう。終わったら休憩をとって帰還します。</p>
        <div class="pomo-grid">
          ${presets
            .map(
              (p) => `
            <div class="pomo-card">
              ${
                !p.isDefault
                  ? `<button type="button" class="pomo-card-delete" data-preset-id="${p.id}" title="このプリセットを削除">✕</button>`
                  : ""
              }
              <div class="pomo-card-label">${escapeHtml(p.label)}</div>
              <div class="pomo-card-detail">集中 ${p.workMinutes}分 ／ 休憩 ${p.breakMinutes}分</div>
              <button type="button" class="primary-btn pomo-start-btn" data-preset-id="${p.id}">出発する</button>
            </div>
          `
            )
            .join("")}
          <button type="button" class="pomo-card pomo-card-add" id="pomo-add-btn">
            <div class="pomo-add-icon">＋</div>
            <div>プリセットを追加</div>
          </button>
        </div>
      `;

      document.getElementById("pomo-close").addEventListener("click", close);
      document.getElementById("pomo-add-btn").addEventListener("click", renderAddForm);

      box.querySelectorAll(".pomo-start-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const preset = presets.find((p) => p.id === btn.dataset.presetId);
          if (!preset) return;
          window.Pomodoro.startSession(state, preset);
          render();
        });
      });

      box.querySelectorAll(".pomo-card-delete").forEach((btn) => {
        btn.addEventListener("click", () => {
          const preset = presets.find((p) => p.id === btn.dataset.presetId);
          if (!confirm(`プリセット「${preset ? preset.label : ""}」を削除しますか？`)) return;
          window.Pomodoro.deletePreset(state, btn.dataset.presetId);
          renderHome();
        });
      });
    }

    function renderAddForm() {
      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">プリセットを追加</h3>
          <button type="button" class="modal-close-btn" id="pomo-close">✕</button>
        </div>
        <button type="button" class="secondary-btn" id="pomo-back">← 一覧に戻る</button>
        <div class="ad-form">
          <label class="wt-form-label" for="pomo-label-input">名前</label>
          <input type="text" id="pomo-label-input" placeholder="例：45分深堀り探索" maxlength="20" />
          <label class="wt-form-label" for="pomo-work-input">集中時間（分）</label>
          <input type="number" id="pomo-work-input" min="1" max="180" value="15" />
          <label class="wt-form-label" for="pomo-break-input">休憩時間（分）</label>
          <input type="number" id="pomo-break-input" min="0" max="60" value="5" />
          <button type="button" class="primary-btn" id="pomo-save-btn">追加する</button>
          <p class="wt-form-hint" id="pomo-form-hint"></p>
        </div>
      `;

      document.getElementById("pomo-close").addEventListener("click", close);
      document.getElementById("pomo-back").addEventListener("click", renderHome);
      document.getElementById("pomo-save-btn").addEventListener("click", () => {
        const label = document.getElementById("pomo-label-input").value;
        const work = document.getElementById("pomo-work-input").value;
        const brk = document.getElementById("pomo-break-input").value;
        const hint = document.getElementById("pomo-form-hint");

        const preset = window.Pomodoro.addPreset(state, label, work, brk);
        if (!preset) {
          hint.textContent = "名前と時間（集中1分以上・休憩0分以上）を正しく入力してください。";
          return;
        }
        renderHome();
      });
    }

    function phaseInfo(session) {
      return session.phase === "work"
        ? { title: "🚶 探索中（集中）", cls: "work" }
        : { title: "🏕️ 休憩中（帰還）", cls: "break" };
    }

    function renderRunning() {
      const session = window.Pomodoro.getSession(state);
      if (!session) {
        renderHome();
        return;
      }
      const info = phaseInfo(session);
      const totalMs = (session.phase === "work" ? session.workMinutes : session.breakMinutes) * 60000;
      const remainingMs = window.Pomodoro.getRemainingMs(session);
      const pct = totalMs > 0 ? Math.min(100, Math.round(((totalMs - remainingMs) / totalMs) * 100)) : 0;

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">🗺️ ${escapeHtml(session.label)}</h3>
          <button type="button" class="modal-close-btn" id="pomo-close">✕</button>
        </div>
        <div class="pomo-running pomo-running-${info.cls}">
          <div class="pomo-phase-title">${info.title}</div>
          <div class="pomo-timer" id="pomo-timer">${window.Pomodoro.formatMs(remainingMs)}</div>
          <div class="pomo-progress-bar"><div class="pomo-progress-fill" id="pomo-progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="modal-actions pomo-running-actions">
          <button type="button" class="secondary-btn" id="pomo-pause-btn">${session.paused ? "再開する" : "一時停止"}</button>
          <button type="button" class="danger-btn" id="pomo-abandon-btn">中断して戻る</button>
        </div>
      `;

      document.getElementById("pomo-close").addEventListener("click", close);
      document.getElementById("pomo-pause-btn").addEventListener("click", () => {
        if (session.paused) window.Pomodoro.resumeSession(state);
        else window.Pomodoro.pauseSession(state);
        renderRunning();
      });
      document.getElementById("pomo-abandon-btn").addEventListener("click", () => {
        if (!confirm("冒険を中断して戻りますか？")) return;
        window.Pomodoro.abandonSession(state);
        renderHome();
      });
    }

    // 1秒ごとの外部tickから呼ばれる軽量更新。フェーズが切り替わった／終了した瞬間だけ画面を作り直し、
    // それ以外は残り時間の表示だけを更新して再描画によるちらつきを避ける。
    function refresh(event) {
      if (event && (event.type === "workDone" || event.type === "cycleDone")) {
        render();
        return;
      }
      const session = window.Pomodoro.getSession(state);
      const timerEl = document.getElementById("pomo-timer");
      if (!session || !timerEl) return;
      const totalMs = (session.phase === "work" ? session.workMinutes : session.breakMinutes) * 60000;
      const remainingMs = window.Pomodoro.getRemainingMs(session);
      timerEl.textContent = window.Pomodoro.formatMs(remainingMs);
      const fill = document.getElementById("pomo-progress-fill");
      if (fill) {
        const pct = totalMs > 0 ? Math.min(100, Math.round(((totalMs - remainingMs) / totalMs) * 100)) : 0;
        fill.style.width = pct + "%";
      }
    }

    render();
    currentRefresh = refresh;
    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  window.PomodoroModal = {
    open,
    // モーダルが閉じている間は何もしない（軽量な早期リターン）。
    refresh: (event) => {
      if (currentRefresh) currentRefresh(event);
    },
  };
})();
