// 職業一覧モーダル：レベルごとの獲得可能職業（グレード）を閲覧し、解放済みのものは選択できる。
(function () {
  function open(level, onSelect) {
    const overlay = document.getElementById("job-browser-overlay");
    const box = document.getElementById("job-browser-box");

    box.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">職業一覧</h3>
        <button type="button" class="modal-close-btn" id="job-modal-close">✕</button>
      </div>
      <ul class="job-list">
        ${window.Jobs.JOBS.map((j, idx) => {
          const unlocked = level >= j.level;
          return `
            <li class="job-item ${unlocked ? "unlocked" : "locked"}" data-name="${j.name}" title="${
              unlocked ? "" : `Lv.${j.level} で解放`
            }">
              <div class="job-item-header">
                <span class="job-grade">Grade ${idx + 1}</span>
                <span class="job-name">${j.name}</span>
                <span class="job-level">Lv.${j.level}</span>
              </div>
              <div class="job-desc">
                <div class="job-desc-line"><span class="job-desc-key">現実での状態:</span> ${j.state}</div>
                <div class="job-desc-line"><span class="job-desc-key">特徴:</span> ${j.trait}</div>
              </div>
            </li>`;
        }).join("")}
      </ul>
    `;

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    document.getElementById("job-modal-close").addEventListener("click", close);
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    box.querySelectorAll(".job-item.unlocked").forEach((li) => {
      li.addEventListener("click", () => {
        onSelect(li.dataset.name);
        close();
      });
    });

    overlay.classList.remove("hidden");
  }

  window.JobModal = { open };
})();
