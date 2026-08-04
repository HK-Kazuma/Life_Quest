// ステータス編集モーダル：キャラクター情報・プロフィール数値をまとめて編集する。
(function () {
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
    );
  }

  function open(state) {
    const overlay = document.getElementById("status-edit-overlay");
    const box = document.getElementById("status-edit-box");
    const c = state.character;
    const p = state.profile;

    // 保存を押すまでは実データを書き換えない下書き。
    let draftJob = c.job;

    // 未保存の変更があるかを判定するための編集前スナップショット。
    const original = {
      job: c.job,
      name: c.name,
      gender: c.gender,
      sport: c.sport,
      specialty: c.specialty,
      age: String(p.age),
      height: String(p.height),
      weight: String(p.weight),
      booksPerYear: String(p.booksPerYear),
      avgSleepHours: String(p.avgSleepHours),
      bodyFatPercent: String(p.bodyFatPercent),
      toeic: String(p.toeic),
      nationalCerts: String(p.nationalCerts),
      municipalCerts: String(p.municipalCerts),
    };

    function isDirty() {
      return (
        draftJob !== original.job ||
        document.getElementById("edit-name").value !== original.name ||
        document.getElementById("edit-gender").value !== original.gender ||
        document.getElementById("edit-sport").value !== original.sport ||
        document.getElementById("edit-specialty").value !== original.specialty ||
        document.getElementById("edit-age").value !== original.age ||
        document.getElementById("edit-height").value !== original.height ||
        document.getElementById("edit-weight").value !== original.weight ||
        document.getElementById("edit-books").value !== original.booksPerYear ||
        document.getElementById("edit-sleep").value !== original.avgSleepHours ||
        document.getElementById("edit-bodyfat").value !== original.bodyFatPercent ||
        document.getElementById("edit-toeic").value !== original.toeic ||
        document.getElementById("edit-national").value !== original.nationalCerts ||
        document.getElementById("edit-municipal").value !== original.municipalCerts
      );
    }

    function requestClose() {
      if (isDirty()) {
        openDiscardConfirm();
        return;
      }
      close();
    }

    function openDiscardConfirm() {
      const confirmOverlay = document.getElementById("status-edit-confirm-overlay");
      const confirmBox = document.getElementById("status-edit-confirm-box");

      confirmBox.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">保存されていない変更があります</h3>
          <button type="button" class="modal-close-btn" id="status-edit-confirm-close">✕</button>
        </div>
        <p>保存されていない変更内容は失われます。よろしいですか？</p>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="status-edit-confirm-cancel">キャンセル</button>
          <button type="button" class="danger-btn" id="status-edit-confirm-ok">破棄する</button>
        </div>
      `;

      function closeConfirm() {
        confirmOverlay.classList.add("hidden");
        confirmOverlay.onclick = null;
      }

      document.getElementById("status-edit-confirm-close").addEventListener("click", closeConfirm);
      document.getElementById("status-edit-confirm-cancel").addEventListener("click", closeConfirm);
      document.getElementById("status-edit-confirm-ok").addEventListener("click", () => {
        closeConfirm();
        close();
      });

      confirmOverlay.classList.remove("hidden");
      confirmOverlay.onclick = (e) => {
        if (e.target === confirmOverlay) closeConfirm();
      };
    }

    function render() {
      box.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">ステータスを編集する</h3>
          <button type="button" class="modal-close-btn" id="status-edit-close">✕</button>
        </div>
        <div class="status-edit-form">
          <div class="form-row">
            <span class="form-label">職業</span>
            <button type="button" class="job-field-btn" id="job-field-btn">${escapeHtml(draftJob)} ＞</button>
          </div>
          <label class="form-row"><span class="form-label">名前</span><input type="text" id="edit-name" value="${escapeHtml(c.name)}" /></label>
          <label class="form-row"><span class="form-label">性別</span><input type="text" id="edit-gender" value="${escapeHtml(c.gender)}" /></label>
          <label class="form-row"><span class="form-label">スポーツ（部活）</span><input type="text" id="edit-sport" value="${escapeHtml(c.sport)}" /></label>
          <label class="form-row"><span class="form-label">専門</span><input type="text" id="edit-specialty" value="${escapeHtml(c.specialty)}" /></label>

          <div class="form-divider">フィジカル・詳細</div>

          <label class="form-row"><span class="form-label">年齢</span><input type="text" id="edit-age" value="${escapeHtml(String(p.age))}" /></label>
          <label class="form-row"><span class="form-label">身長 (cm)</span><input type="text" id="edit-height" value="${escapeHtml(String(p.height))}" /></label>
          <label class="form-row"><span class="form-label">体重 (kg)</span><input type="text" id="edit-weight" value="${escapeHtml(String(p.weight))}" /></label>
          <label class="form-row"><span class="form-label">年間読書数</span><input type="text" id="edit-books" value="${escapeHtml(String(p.booksPerYear))}" /></label>
          <label class="form-row"><span class="form-label">平均睡眠時間</span><input type="text" id="edit-sleep" value="${escapeHtml(String(p.avgSleepHours))}" /></label>
          <label class="form-row"><span class="form-label">体脂肪率</span><input type="text" id="edit-bodyfat" value="${escapeHtml(String(p.bodyFatPercent))}" /></label>
          <label class="form-row"><span class="form-label">TOEIC</span><input type="text" id="edit-toeic" value="${escapeHtml(String(p.toeic))}" /></label>
          <label class="form-row"><span class="form-label">国家資格保有数</span><input type="text" id="edit-national" value="${escapeHtml(String(p.nationalCerts))}" /></label>
          <label class="form-row"><span class="form-label">民間資格保有数</span><input type="text" id="edit-municipal" value="${escapeHtml(String(p.municipalCerts))}" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="status-edit-cancel">キャンセル</button>
          <button type="button" class="primary-btn" id="status-edit-save">保存する</button>
        </div>
      `;

      document.getElementById("status-edit-close").addEventListener("click", requestClose);
      document.getElementById("status-edit-cancel").addEventListener("click", requestClose);
      document.getElementById("status-edit-save").addEventListener("click", save);
      document.getElementById("job-field-btn").addEventListener("click", () => {
        window.JobModal.open(c.level, (jobName) => {
          draftJob = jobName;
          // フォーム全体を再描画すると他項目の未保存入力が消えるため、職業ボタンの表示だけ更新する。
          document.getElementById("job-field-btn").textContent = `${draftJob} ＞`;
        });
      });
    }

    function save() {
      c.job = draftJob;
      c.name = document.getElementById("edit-name").value.trim() || c.name;
      c.gender = document.getElementById("edit-gender").value.trim();
      c.sport = document.getElementById("edit-sport").value.trim();
      c.specialty = document.getElementById("edit-specialty").value.trim();
      p.age = document.getElementById("edit-age").value.trim();
      p.height = document.getElementById("edit-height").value.trim();
      p.weight = document.getElementById("edit-weight").value.trim();
      p.booksPerYear = document.getElementById("edit-books").value.trim();
      p.avgSleepHours = document.getElementById("edit-sleep").value.trim();
      p.bodyFatPercent = document.getElementById("edit-bodyfat").value.trim();
      p.toeic = document.getElementById("edit-toeic").value.trim();
      p.nationalCerts = document.getElementById("edit-national").value.trim();
      p.municipalCerts = document.getElementById("edit-municipal").value.trim();

      window.App.persist();
      window.App.rerenderSidebar();
      close();
    }

    function close() {
      overlay.classList.add("hidden");
      overlay.onclick = null;
    }

    render();
    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) requestClose();
    };
  }

  window.StatusEditModal = { open };
})();
