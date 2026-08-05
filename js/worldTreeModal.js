// 世界樹UI：サイドバーの世界樹をクリックすると開く。
// 一覧（苗木＝目標のカード）→ ルート表示（根本〜頂点までのマイルストーン）→ 目標作成フォーム、の3画面を持つ。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  // 進捗(0-100)に応じて世界樹の画像を下(根本)から上(頂点)へ少しずつ見せる。
  // 0%でも根本のわずかな芽は見えるよう表示上の下限を設ける。
  function treeIconHtml(percent) {
    const displayPercent = Math.max(percent, 6);
    return `
      <div class="wt-tree-icon">
        <img src="assets/image_open.png" alt="" class="wt-tree-icon-img" style="--wt-progress:${displayPercent}" />
      </div>
    `;
  }

  function open(state) {
    const overlay = document.getElementById("world-tree-app-overlay");
    const box = document.getElementById("world-tree-app-box");
    if (!overlay || !box) return;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    function renderList() {
      const goals = window.WorldTree.getGoals(state);

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">世界樹 〜目標のルート〜</h3>
          <button type="button" class="modal-close-btn" id="wt-close">✕</button>
        </div>
        <p class="screen-desc">大きな目標を1本の木として育てよう。目標ごとに根本から頂点までの専用ルートを設定できます。</p>
        <div class="wt-goal-grid">
          ${goals
            .map((g) => {
              const p = window.WorldTree.progress(g);
              const stage = window.WorldTree.stageFor(p.percent);
              return `
              <button type="button" class="wt-goal-card" data-goal-id="${g.id}">
                ${treeIconHtml(p.percent)}
                <div class="wt-goal-card-title">${escapeHtml(g.title)}</div>
                <div class="wt-goal-card-stage">${escapeHtml(stage.label)}</div>
                <div class="wt-goal-progress-bar"><div class="wt-goal-progress-fill" style="width:${p.percent}%"></div></div>
                <div class="wt-goal-progress-text">${p.done} / ${p.total}（${p.percent}%）</div>
              </button>
            `;
            })
            .join("")}
          <button type="button" class="wt-goal-card wt-goal-card-add" id="wt-new-goal-btn">
            <div class="wt-add-icon">＋</div>
            <div>新しい目標を植える</div>
          </button>
        </div>
      `;

      document.getElementById("wt-close").addEventListener("click", close);
      document.getElementById("wt-new-goal-btn").addEventListener("click", renderCreateForm);
      document.querySelectorAll(".wt-goal-card[data-goal-id]").forEach((btn) => {
        btn.addEventListener("click", () => renderRoute(btn.dataset.goalId));
      });
    }

    function milestoneRowHtml(idx, value) {
      return `
        <div class="wt-milestone-input-row" data-row="${idx}">
          <span class="wt-milestone-input-index">${idx + 1}</span>
          <input type="text" class="wt-milestone-input" placeholder="小さな目標 ${idx + 1}" value="${escapeHtml(
            value || ""
          )}" />
        </div>
      `;
    }

    function renderCreateForm() {
      const minCount = window.WorldTree.MIN_MILESTONES;
      let rowCount = minCount;

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">新しい目標を植える</h3>
          <button type="button" class="modal-close-btn" id="wt-close">✕</button>
        </div>
        <button type="button" class="secondary-btn" id="wt-back-to-list">← 一覧に戻る</button>
        <div class="wt-create-form">
          <label class="wt-form-label" for="wt-goal-title-input">大きな目標（頂点のゴール）</label>
          <input type="text" id="wt-goal-title-input" placeholder="例：LLM応用講座 修了" />

          <label class="wt-form-label">ゴールから逆算した小さな目標（根本から順に・${minCount}つ以上）</label>
          <div id="wt-milestone-rows">
            ${Array.from({ length: rowCount }, (_, i) => milestoneRowHtml(i)).join("")}
          </div>
          <button type="button" class="secondary-btn" id="wt-add-row-btn">＋ 小さな目標を増やす</button>

          <button type="button" class="primary-btn wt-create-submit-btn" id="wt-create-submit-btn">この目標を植える</button>
          <p class="wt-form-hint" id="wt-form-hint"></p>
        </div>
      `;

      document.getElementById("wt-close").addEventListener("click", close);
      document.getElementById("wt-back-to-list").addEventListener("click", renderList);
      document.getElementById("wt-add-row-btn").addEventListener("click", () => {
        document.getElementById("wt-milestone-rows").insertAdjacentHTML(
          "beforeend",
          milestoneRowHtml(rowCount)
        );
        rowCount += 1;
      });

      document.getElementById("wt-create-submit-btn").addEventListener("click", () => {
        const title = document.getElementById("wt-goal-title-input").value;
        const milestoneTitles = Array.from(document.querySelectorAll(".wt-milestone-input")).map(
          (input) => input.value
        );
        const hint = document.getElementById("wt-form-hint");

        if (!title.trim()) {
          hint.textContent = "大きな目標を入力してください。";
          return;
        }
        const filledCount = milestoneTitles.filter((t) => t.trim()).length;
        if (filledCount < minCount) {
          hint.textContent = `小さな目標は${minCount}つ以上入力してください（現在${filledCount}つ）。`;
          return;
        }

        const goal = window.WorldTree.createGoal(state, title, milestoneTitles);
        if (!goal) {
          hint.textContent = "入力内容を確認してください。";
          return;
        }
        window.App.persist();
        renderRoute(goal.id);
      });
    }

    function routeNodeHtml(node) {
      if (node.type === "goal") {
        const cls = node.complete ? "wt-route-node--done" : "wt-route-node--locked";
        return `
          <li class="wt-route-node wt-route-node--goal ${cls}">
            <span class="wt-route-node-icon">${node.complete ? "🏆" : "🌟"}</span>
            <span class="wt-route-node-label">ゴール：${escapeHtml(node.title)}</span>
          </li>
        `;
      }
      if (node.type === "root") {
        return `
          <li class="wt-route-node wt-route-node--root">
            <span class="wt-route-node-icon">🌱</span>
            <span class="wt-route-node-label">現在地（スタート）</span>
          </li>
        `;
      }
      const stateCls =
        node.status === "done"
          ? "wt-route-node--done"
          : node.status === "current"
          ? "wt-route-node--current"
          : "wt-route-node--locked";
      const icon = node.status === "done" ? "✔" : node.status === "current" ? "▶" : "🔒";
      const clickable = node.clickable ? " wt-route-node--clickable" : "";
      return `
        <li class="wt-route-node ${stateCls}${clickable}" data-milestone-id="${node.clickable ? node.id : ""}">
          <span class="wt-route-node-icon">${icon}</span>
          <span class="wt-route-node-label">${escapeHtml(node.title)}</span>
        </li>
      `;
    }

    function renderRoute(goalId) {
      const goal = window.WorldTree.getGoal(state, goalId);
      if (!goal) {
        renderList();
        return;
      }
      const p = window.WorldTree.progress(goal);
      const nextIdx = window.WorldTree.nextIndex(goal);
      const lastDoneIdx = window.WorldTree.lastDoneIndex(goal);

      const milestoneNodes = goal.milestones.map((m, idx) => ({
        type: "milestone",
        id: m.id,
        title: m.title,
        status: m.done ? "done" : idx === nextIdx ? "current" : "locked",
        // クリック可能なのは「次に完了できる未完了」か「取り消せる最後の完了」だけ。
        clickable: (!m.done && idx === nextIdx) || (m.done && idx === lastDoneIdx),
      }));
      // 表示は頂点(ゴール)が上、根本(スタート)が下になるよう並べる。
      const orderedNodes = [
        { type: "goal", title: goal.title, complete: p.complete },
        ...milestoneNodes.slice().reverse(),
        { type: "root" },
      ];

      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${escapeHtml(goal.title)}</h3>
          <button type="button" class="modal-close-btn" id="wt-close">✕</button>
        </div>
        <button type="button" class="secondary-btn" id="wt-back-to-list">← 一覧に戻る</button>
        <div class="wt-route-layout">
          <div class="wt-route-tree-bg">
            <img src="assets/image_open.png" alt="" class="wt-tree-icon-img" style="--wt-progress:${Math.max(
              p.percent,
              6
            )}" />
          </div>
          <ol class="wt-route-path">
            ${orderedNodes.map(routeNodeHtml).join("")}
          </ol>
        </div>
        <div class="wt-route-footer">
          <div class="wt-route-progress-text">${p.done} / ${p.total} 達成（${p.percent}%）</div>
          <div class="wt-route-footer-actions">
            <button type="button" class="secondary-btn" id="wt-add-milestone-btn">＋ 小さな目標を追加</button>
            <button type="button" class="danger-btn" id="wt-delete-goal-btn">この目標を削除</button>
          </div>
        </div>
      `;

      document.getElementById("wt-close").addEventListener("click", close);
      document.getElementById("wt-back-to-list").addEventListener("click", renderList);

      document.querySelectorAll(".wt-route-node--clickable").forEach((li) => {
        li.addEventListener("click", () => {
          const milestoneId = li.dataset.milestoneId;
          if (!milestoneId) return;
          if (window.WorldTree.toggleMilestone(goal, milestoneId)) {
            window.App.persist();
            renderRoute(goalId);
          }
        });
      });

      document.getElementById("wt-add-milestone-btn").addEventListener("click", () => {
        const title = prompt("追加する小さな目標を入力してください（ゴールの直前に追加されます）");
        if (title === null) return;
        if (window.WorldTree.addMilestone(goal, title)) {
          window.App.persist();
          renderRoute(goalId);
        }
      });

      document.getElementById("wt-delete-goal-btn").addEventListener("click", () => {
        openDeleteConfirm(goal);
      });
    }

    // 目標削除の注意書きはブラウザ標準のconfirm()ではなく、専用ポップアップで表示する。
    function openDeleteConfirm(goal) {
      const confirmOverlay = document.getElementById("wt-delete-confirm-overlay");
      const confirmBox = document.getElementById("wt-delete-confirm-box");
      if (!confirmOverlay || !confirmBox) return;

      confirmBox.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">この目標を削除しますか？</h3>
          <button type="button" class="modal-close-btn" id="wt-delete-confirm-close">✕</button>
        </div>
        <p>「${escapeHtml(goal.title)}」と、設定した小さな目標（${
        goal.milestones.length
      }件）・進捗がすべて削除されます。この操作は取り消せません。</p>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="wt-delete-confirm-cancel">キャンセル</button>
          <button type="button" class="danger-btn" id="wt-delete-confirm-ok">削除する</button>
        </div>
      `;

      function closeConfirm() {
        confirmOverlay.classList.add("hidden");
        confirmOverlay.onclick = null;
      }

      document.getElementById("wt-delete-confirm-close").addEventListener("click", closeConfirm);
      document.getElementById("wt-delete-confirm-cancel").addEventListener("click", closeConfirm);
      document.getElementById("wt-delete-confirm-ok").addEventListener("click", () => {
        window.WorldTree.deleteGoal(state, goal.id);
        window.App.persist();
        closeConfirm();
        renderList();
      });

      confirmOverlay.classList.remove("hidden");
      confirmOverlay.onclick = (e) => {
        if (e.target === confirmOverlay) closeConfirm();
      };
    }

    renderList();
    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  }

  window.WorldTreeApp = { open };
})();
