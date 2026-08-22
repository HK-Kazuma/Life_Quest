// 集中モードUI：クエストボードの「⚔ ラウンドに分解する」「🏃 出撃する」から開く。
// ラウンド分解 → 集中モード（実行中） → チェックポイント → （一時中断） → FINISH、の画面遷移を持つ。
// 実行中は他の情報を一切出さず「今やっているラウンド」だけに意識を向けさせる。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function formatSeconds(totalSecRaw) {
    const totalSec = Math.max(0, Math.floor(totalSecRaw));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function open(state, entry, goalText, questType) {
    const overlay = document.getElementById("focus-mode-overlay");
    const box = document.getElementById("focus-mode-box");
    if (!overlay || !box) return;

    let tickTimer = null;
    let draftRounds = null;

    function stopTicking() {
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
    }

    function close() {
      stopTicking();
      overlay.classList.add("hidden");
      overlay.onclick = null;
      box.classList.remove("is-racing");
      // クエストボード／集中モードは背後の①活動記録タブを自動更新しないため、
      // 閉じるタイミングでクリア状態などが反映されるよう明示的に再描画する。
      window.App.refreshActiveScreen();
    }

    function progress() {
      return window.FocusMode.getProgress(entry, goalText);
    }

    function render() {
      box.classList.remove("is-racing");
      const p = progress();
      if (!p || p.status === "planned") {
        renderBreakdown(p);
      } else if (p.status === "done") {
        renderFinish(p);
      } else {
        const session = state.focus.session;
        const isThisQuest = session && session.date === entry.date && session.goalText === goalText;
        if (isThisQuest && session.roundStartedAt) {
          renderRunning();
        } else if (isThisQuest) {
          renderPausedIdle();
        } else {
          window.FocusMode.enterSession(state, entry, goalText, questType);
          renderRunning();
        }
      }
    }

    // ===== ① ラウンド分解 =====
    function renderBreakdown(existingProgress) {
      stopTicking();
      if (!draftRounds) {
        draftRounds = existingProgress
          ? existingProgress.rounds.map((r) => ({ title: r.title, targetMinutes: r.targetMinutes }))
          : [
              { title: "", targetMinutes: 10 },
              { title: "", targetMinutes: 10 },
            ];
      }
      paintBreakdown();
    }

    function paintBreakdown() {
      const min = window.FocusMode.MIN_ROUNDS;
      const max = window.FocusMode.MAX_ROUNDS;
      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">⚔ ラウンド分解</h3>
          <button type="button" class="modal-close-btn" id="focus-close">✕</button>
        </div>
        <p class="screen-desc">「${escapeHtml(goalText)}」を${min}〜${max}個の小さなラウンドに分けて挑もう。</p>
        <div class="focus-round-form" id="focus-round-form"></div>
        ${
          draftRounds.length < max
            ? `<button type="button" class="secondary-btn" id="focus-add-round">＋ ラウンドを追加</button>`
            : ""
        }
        <p class="focus-form-hint" id="focus-form-hint"></p>
        <button type="button" class="primary-btn" id="focus-start-btn">START</button>
      `;

      document.getElementById("focus-close").addEventListener("click", close);
      document.getElementById("focus-start-btn").addEventListener("click", onStart);
      const addBtn = document.getElementById("focus-add-round");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          if (draftRounds.length >= max) return;
          draftRounds.push({ title: "", targetMinutes: 10 });
          paintBreakdown();
        });
      }
      paintRoundRows();
    }

    function paintRoundRows() {
      const form = document.getElementById("focus-round-form");
      if (!form) return;
      const min = window.FocusMode.MIN_ROUNDS;
      form.innerHTML = draftRounds
        .map(
          (r, idx) => `
        <div class="focus-round-row" data-idx="${idx}">
          <span class="focus-round-num">ROUND${idx + 1}</span>
          <input type="text" class="focus-round-title" data-idx="${idx}" placeholder="やること（例：論文を読む）" value="${escapeHtml(
            r.title
          )}" maxlength="40" />
          <input type="number" class="focus-round-minutes" data-idx="${idx}" min="1" max="180" value="${r.targetMinutes}" />
          <span class="focus-round-min-label">分</span>
          ${
            draftRounds.length > min
              ? `<button type="button" class="remove-draft-btn focus-round-remove" data-idx="${idx}">×</button>`
              : ""
          }
        </div>`
        )
        .join("");

      form.querySelectorAll(".focus-round-title").forEach((input) => {
        input.addEventListener("input", () => {
          draftRounds[Number(input.dataset.idx)].title = input.value;
        });
      });
      form.querySelectorAll(".focus-round-minutes").forEach((input) => {
        input.addEventListener("input", () => {
          draftRounds[Number(input.dataset.idx)].targetMinutes = Number(input.value) || 1;
        });
      });
      form.querySelectorAll(".focus-round-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          draftRounds.splice(Number(btn.dataset.idx), 1);
          paintBreakdown();
        });
      });
    }

    function onStart() {
      const saved = window.FocusMode.saveRounds(entry, goalText, draftRounds);
      if (!saved) {
        document.getElementById("focus-form-hint").textContent =
          `すべてのラウンドに名前を入力してください（${window.FocusMode.MIN_ROUNDS}個以上必要です）。`;
        return;
      }
      draftRounds = null;
      window.FocusMode.enterSession(state, entry, goalText, questType);
      window.App.rerenderSidebar();
      renderRunning();
    }

    // ===== ② 集中モード（実行中） =====
    function renderRunning() {
      box.classList.add("is-racing");
      const round = window.FocusMode.getCurrentRound(state);
      const p = progress();
      if (!round || !p) {
        close();
        return;
      }
      const session = state.focus.session;
      const roundNum = session.roundIndex + 1;
      const totalRounds = p.rounds.length;
      const targetSeconds = round.targetMinutes * 60;
      const elapsed = window.FocusMode.getElapsedSeconds(state);
      const pct = targetSeconds > 0 ? Math.min(100, Math.round((elapsed / targetSeconds) * 100)) : 0;

      box.innerHTML = `
        <div class="focus-race-hud">
          <div class="focus-flag-strip"></div>
          <div class="focus-race-title">🏇 集中モード</div>
          <div class="focus-race-round">ROUND ${roundNum} / ${totalRounds}</div>
          <div class="focus-race-task">${escapeHtml(round.title)}</div>
          <div class="focus-timer" id="focus-timer">${formatSeconds(elapsed)}</div>
          <div class="focus-track">
            <div class="focus-track-fill" id="focus-track-fill" style="width:${pct}%;"></div>
            <div class="focus-track-car" id="focus-track-car" style="left:${pct}%;">🏃</div>
          </div>
          <div class="focus-exp-chip">目安 ${round.targetMinutes}分 ／ 完了で +${window.FocusMode.roundExp(round)}EXP</div>
          <div class="focus-no-notif">他の情報は表示されません。今はこれだけ。</div>
        </div>
        <div class="footer-area focus-running-actions">
          <button type="button" class="primary-btn" id="focus-complete-btn">ラウンド完了</button>
          <button type="button" class="danger-btn" id="focus-interrupt-btn">一時中断する</button>
        </div>
      `;

      document.getElementById("focus-complete-btn").addEventListener("click", onCompleteRound);
      document.getElementById("focus-interrupt-btn").addEventListener("click", onInterrupt);

      stopTicking();
      tickTimer = setInterval(tickRunning, 1000);
    }

    function tickRunning() {
      const round = window.FocusMode.getCurrentRound(state);
      const timerEl = document.getElementById("focus-timer");
      if (!round || !timerEl) {
        stopTicking();
        return;
      }
      const targetSeconds = round.targetMinutes * 60;
      const elapsed = window.FocusMode.getElapsedSeconds(state);
      timerEl.textContent = formatSeconds(elapsed);
      const pct = targetSeconds > 0 ? Math.min(100, Math.round((elapsed / targetSeconds) * 100)) : 0;
      const fill = document.getElementById("focus-track-fill");
      const car = document.getElementById("focus-track-car");
      if (fill) fill.style.width = pct + "%";
      if (car) car.style.left = pct + "%";
    }

    function onCompleteRound() {
      const p = progress();
      const roundNum = state.focus.session.roundIndex + 1;
      const totalRounds = p.rounds.length;
      const result = window.FocusMode.completeRound(state);
      if (!result) return;
      if (result.isLast) {
        if (result.leveledUp) window.App.showLevelUp(state.character.level);
        renderFinish(progress());
      } else {
        if (result.leveledUp) window.App.showLevelUp(state.character.level);
        renderCheckpoint(result.owedExp, roundNum, totalRounds);
      }
    }

    // ===== ③ チェックポイント =====
    function renderCheckpoint(expGained, clearedRoundNum, totalRounds) {
      stopTicking();
      box.classList.remove("is-racing");
      const pct = Math.round((clearedRoundNum / totalRounds) * 100);
      box.innerHTML = `
        <div class="banner-wrap">
          <div class="banner-title">CHECKPOINT CLEAR!</div>
          <div class="banner-sub">ROUND ${clearedRoundNum} 完了</div>
          <div class="exp-float">+${expGained} EXP</div>
          <div class="mini-progress"><div class="mini-progress-fill" style="width:${pct}%;"></div></div>
          <div class="banner-sub">全体進捗 ${clearedRoundNum} / ${totalRounds} ラウンド</div>
        </div>
        <div class="footer-area">
          <button type="button" class="primary-btn" id="focus-next-round-btn">次のラウンドへ</button>
        </div>
      `;
      document.getElementById("focus-next-round-btn").addEventListener("click", () => {
        window.FocusMode.startRoundClock(state);
        renderRunning();
      });
    }

    // ===== 一時中断 =====
    function onInterrupt() {
      const result = window.FocusMode.interruptRound(state);
      if (result.leveledUp) window.App.showLevelUp(state.character.level);
      renderPaused(result);
    }

    function renderPaused(result) {
      stopTicking();
      box.classList.remove("is-racing");
      const round = window.FocusMode.getCurrentRound(state);
      const pct = result.targetSeconds > 0 ? Math.min(100, Math.round((result.elapsedSeconds / result.targetSeconds) * 100)) : 0;
      box.innerHTML = `
        <div class="banner-wrap">
          <div class="banner-title focus-paused-title">クエスト中断</div>
          <div class="banner-sub">「${escapeHtml(round ? round.title : "")}」の続きはいつでも再開できます</div>
          <div class="exp-float focus-paused-exp">+${result.owedExp} EXP 確定</div>
          <div class="mini-progress"><div class="mini-progress-fill" style="width:${pct}%;"></div></div>
          <div class="banner-sub">このラウンドの進捗 ${pct}%</div>
        </div>
        <div class="footer-area">
          <button type="button" class="primary-btn" id="focus-resume-btn">続きから再開</button>
          <button type="button" class="secondary-btn" id="focus-abandon-btn">宿屋にもどる</button>
        </div>
      `;
      document.getElementById("focus-resume-btn").addEventListener("click", () => {
        window.FocusMode.startRoundClock(state);
        renderRunning();
      });
      document.getElementById("focus-abandon-btn").addEventListener("click", () => {
        window.FocusMode.abandonSession(state);
        close();
      });
    }

    // セッションはあるが一時停止中の状態でモーダルを開き直したときの画面（進捗確認のみ、再開ボタンあり）。
    function renderPausedIdle() {
      stopTicking();
      box.classList.remove("is-racing");
      const round = window.FocusMode.getCurrentRound(state);
      if (!round) {
        close();
        return;
      }
      const targetSeconds = round.targetMinutes * 60;
      const elapsed = window.FocusMode.getElapsedSeconds(state);
      const pct = targetSeconds > 0 ? Math.min(100, Math.round((elapsed / targetSeconds) * 100)) : 0;
      box.innerHTML = `
        <div class="banner-wrap">
          <div class="banner-title focus-paused-title">一時停止中</div>
          <div class="banner-sub">「${escapeHtml(round.title)}」</div>
          <div class="mini-progress"><div class="mini-progress-fill" style="width:${pct}%;"></div></div>
          <div class="banner-sub">このラウンドの進捗 ${pct}%（${formatSeconds(elapsed)}）</div>
        </div>
        <div class="footer-area">
          <button type="button" class="primary-btn" id="focus-resume-btn">続きから再開</button>
          <button type="button" class="secondary-btn" id="focus-abandon-btn">宿屋にもどる</button>
        </div>
      `;
      document.getElementById("focus-resume-btn").addEventListener("click", () => {
        window.FocusMode.startRoundClock(state);
        renderRunning();
      });
      document.getElementById("focus-abandon-btn").addEventListener("click", () => {
        window.FocusMode.abandonSession(state);
        close();
      });
    }

    // ===== ④ FINISH =====
    function renderFinish(p) {
      stopTicking();
      box.classList.remove("is-racing");
      box.innerHTML = `
        <div class="banner-wrap">
          <div class="banner-title">🏁 FINISH!</div>
          <div class="banner-sub">「${escapeHtml(goalText)}」クリア</div>
          <div class="exp-float">合計 +${p ? p.totalExpAwarded : 0} EXP</div>
        </div>
        <div class="footer-area">
          <button type="button" class="primary-btn" id="focus-finish-close-btn">閉じる</button>
        </div>
      `;
      document.getElementById("focus-finish-close-btn").addEventListener("click", close);
    }

    render();
    overlay.classList.remove("hidden");
    overlay.onclick = null;
  }

  window.FocusModeModal = { open };
})();
