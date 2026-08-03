// ③履歴閲覧画面：過去の記録を日付ごとに一覧表示する。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function render(container, state) {
    const sorted = [...state.history].sort((a, b) => (a.date < b.date ? 1 : -1));

    container.innerHTML = `
      <div class="screen-panel">
        <h2 class="screen-title">③ 冒険の記録</h2>
        <div class="history-list" id="history-list"></div>
      </div>
    `;

    const list = document.getElementById("history-list");
    if (sorted.length === 0) {
      list.innerHTML = `<p class="empty-hint">まだ記録がありません</p>`;
      return;
    }

    list.innerHTML = sorted
      .map(
        (entry, idx) => `
        <details class="history-entry" ${idx === 0 ? "open" : ""}>
          <summary>
            <span class="history-date">${entry.date}</span>
            <span class="history-exp">+${entry.expGained || 0} EXP</span>
          </summary>
          <div class="history-body">
            ${
              entry.goals && entry.goals.length
                ? `<div class="history-section">
                    <div class="history-section-title">目標</div>
                    <ul>${entry.goals.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>
                   </div>`
                : ""
            }
            ${
              entry.logs && entry.logs.length
                ? `<div class="history-section">
                    <div class="history-section-title">活動</div>
                    <ul>${entry.logs
                      .map(
                        (log) =>
                          `<li><strong>${escapeHtml(log.activity)}</strong>${
                            log.detail ? ` - ${escapeHtml(log.detail)}` : ""
                          }</li>`
                      )
                      .join("")}</ul>
                   </div>`
                : ""
            }
            ${
              entry.notice
                ? `<div class="history-section">
                    <div class="history-section-title">気づき</div>
                    <p>${escapeHtml(entry.notice)}</p>
                   </div>`
                : ""
            }
            ${
              !entry.goals?.length && !entry.logs?.length && !entry.notice
                ? `<p class="empty-hint">この日の記録はまだありません</p>`
                : ""
            }
          </div>
        </details>`
      )
      .join("");
  }

  window.HistoryScreen = { render };
})();
