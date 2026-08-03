// ④リセット画面：活動記録の履歴（カレンダー・連続ストリークを含む）を消去する。
(function () {
  function render(container, state) {
    container.innerHTML = `
      <div class="screen-panel reset-panel">
        <h2 class="screen-title">④ リセット</h2>
        <p class="screen-desc">
          これまでの活動記録の履歴をすべて消去します。連続ストリークとカレンダーの記録も同時にリセットされます。<br />
          この操作は取り消せません。
        </p>
        <div class="reset-panel-spacer"></div>
        <button type="button" class="danger-btn" id="reset-history-btn">活動記録の履歴をリセットする</button>
      </div>
    `;

    document.getElementById("reset-history-btn").addEventListener("click", () => {
      openConfirm(state, () => render(container, state));
    });
  }

  function openConfirm(state, onDone) {
    const overlay = document.getElementById("reset-confirm-overlay");
    const box = document.getElementById("reset-confirm-box");

    box.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">本当にリセットしますか？</h3>
        <button type="button" class="modal-close-btn" id="reset-confirm-close">✕</button>
      </div>
      <p>活動記録の履歴・連続ストリーク・カレンダーの記録がすべて消去されます。この操作は取り消せません。</p>
      <div class="modal-actions">
        <button type="button" class="secondary-btn" id="reset-confirm-cancel">キャンセル</button>
        <button type="button" class="danger-btn" id="reset-confirm-ok">リセットする</button>
      </div>
    `;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    document.getElementById("reset-confirm-close").addEventListener("click", close);
    document.getElementById("reset-confirm-cancel").addEventListener("click", close);
    document.getElementById("reset-confirm-ok").addEventListener("click", () => {
      resetHistory(state);
      close();
      onDone();
    });

    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  function resetHistory(state) {
    state.history = [];
    state.character.streak = 0;
    state.character.longestStreak = 0;
    state.character.lastLogDate = null;

    window.App.persist();
    window.App.rerenderSidebar();
  }

  window.ResetScreen = { render };
})();
