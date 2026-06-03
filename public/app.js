(function () {
  "use strict";

  // ============== DOM refs ==============
  const $ = (id) => document.getElementById(id);
  const authView = $("authView");
  const appEl = $("app");
  const authForm = $("authForm");
  const authTitle = $("authTitle");
  const authSub = $("authSub");
  const authError = $("authError");
  const authSubmit = $("authSubmit");
  const authSwitchBtn = $("authSwitchBtn");
  const authSwitchText = $("authSwitchText");
  const nameField = $("nameField");
  const sidebarEl = $("sidebar");
  const menuBtn = $("menuBtn");
  const closeSidebarBtn = $("closeSidebarBtn");
  const backdrop = $("backdrop");
  const newChatBtn = $("newChatBtn");
  const convListEl = $("conversations");
  const contentEl = $("content");
  const composerEl = $("composer");
  const inputEl = $("input");
  const sendBtn = $("sendBtn");
  const modelTag = $("modelTag");
  const statusDot = $("statusDot");
  const deepCheckbox = $("deepCheckbox");
  const deepToggle = $("deepToggle");
  const exportBtn = $("exportBtn");
  const settingsBtn = $("settingsBtn");
  const settingsModal = $("settingsModal");
  const tempRange = $("tempRange");
  const tempVal = $("tempVal");
  const saveSettingsBtn = $("saveSettingsBtn");
  const clearAllBtn = $("clearAllBtn");
  const settingsAccount = $("settingsAccount");
  const ctxPill = $("ctxPill");
  const ctxSummary = $("ctxSummary");
  const jumpBottom = $("jumpBottom");
  const jumpBadge = $("jumpBadge");

  const openLibraryBtn = $("openLibraryBtn");
  const libraryModal = $("libraryModal");
  const libraryCount = $("libraryCount");
  const memCount = $("memCount");
  const prmCount = $("prmCount");
  const libNewBtn = $("libNewBtn");
  const libNewLabel = $("libNewLabel");
  const libraryBody = $("libraryBody");

  const pdfBtn = $("pdfBtn");
  const attachBtn = $("attachBtn");
  const fileInput = $("fileInput");
  const imageBtn = $("imageBtn");
  const imageInput = $("imageInput");
  const attachmentChips = $("attachmentChips");

  const editorModal = $("editorModal");
  const editorTitle = $("editorTitle");
  const editorNameLabel = $("editorNameLabel");
  const editorName = $("editorName");
  const editorContentLabel = $("editorContentLabel");
  const editorContent = $("editorContent");
  const editorHint = $("editorHint");
  const editorActiveField = $("editorActiveField");
  const editorActive = $("editorActive");
  const editorSaveBtn = $("editorSaveBtn");
  const editorDeleteBtn = $("editorDeleteBtn");

  const userAvatar = $("userAvatar");
  const userName = $("userName");
  const userPlan = $("userPlan");
  const logoutBtn = $("logoutBtn");

  // ============== State ==============
  const state = {
    user: null,
    conversations: [],
    activeId: null,
    memory: [],
    prompts: [],
    settings: { temperature: 0.4, deepAnalysis: true },
    libraryTab: "memory",
    editor: null, // {type:'memory'|'prompts', id?:string}
    sending: false,
    abort: null,
    authMode: "login", // 'login' | 'register'
    pendingNewCount: 0,
    atBottom: true,
    attachments: [], // [{name, size, content, type}]
    images: [] // [{name, size, mime, dataUrl, url, serverUrl}]
  };

  const QUICK_ACTIONS = [
    { title: "Şirket Analizi", desc: "Bir şirketin finansal, stratejik ve operasyonel durumunu derinlemesine incele.", prompt: "Seçtiğim bir şirket için kapsamlı bir analiz raporu hazırla. Şirket: ", icon: "building" },
    { title: "Sektör Raporu", desc: "Bir sektörün mevcut durumu, trendleri, oyuncuları ve geleceği hakkında rapor.", prompt: "Şu sektör için detaylı bir pazar ve sektör raporu hazırla: ", icon: "chart" },
    { title: "Rakip Karşılaştırma", desc: "Şirketleri güçlü/zayıf yönleriyle karşılaştır, konumlandırma analizi yap.", prompt: "Bu şirketleri güçlü ve zayıf yönleri ile karşılaştıran bir rakip analizi hazırla: ", icon: "versus" },
    { title: "SWOT Analizi", desc: "Güçlü yönler, zayıf yönlar, fırsatlar ve tehditleri yapılandırılmış şekilde çıkar.", prompt: "Şunun için detaylı bir SWOT analizi hazırla: ", icon: "grid" }
  ];

  // Featured personas for welcome state (subset)
  const FEATURED_PERSONAS = ["p-ceo", "p-cfo", "p-cmo", "p-cto", "p-report-cfo", "p-report-investment"];

  const ICONS = {
    building: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M8 11h.01M12 11h.01M16 11h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>',
    chart: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 14l3-3 3 3 5-6"/></svg>',
    versus: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M3 8h12l-3-3M21 16H9l3 3"/></svg>',
    grid: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M9 9h10v10H9zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14"/></svg>',
    alert: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>'
  };

  // ============== Helpers ==============
  const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function fmtDateGroup(ts) {
    const today = startOfDay(Date.now());
    const day = startOfDay(ts);
    const diffDays = Math.floor((today - day) / 86400000);
    if (diffDays === 0) return "Bugün";
    if (diffDays === 1) return "Dün";
    if (diffDays < 7) return "Bu hafta";
    if (diffDays < 30) return "Bu ay";
    return "Daha önce";
  }
  function fmtTime(ms) { return ms < 1000 ? ms + "ms" : (ms / 1000).toFixed(1) + "s"; }
  function deriveTitle(text) { const t = text.trim().replace(/\s+/g, " "); return t.length > 48 ? t.slice(0, 48) + "…" : t; }
  function initials(name) { return (name || "K").trim().slice(0, 1).toUpperCase(); }

  // ============== API ==============
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const msg = (data && data.error) || `Hata (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  // ============== Auth ==============
  function showAuth() {
    authView.classList.remove("hidden");
    appEl.classList.add("hidden");
    updateAuthMode();
  }
  function showApp() {
    authView.classList.add("hidden");
    appEl.classList.remove("hidden");
  }
  function updateAuthMode() {
    if (state.authMode === "register") {
      authTitle.textContent = "Hesap Oluştur";
      authSub.textContent = "Şirketler ve sektörler hakkında derinlemesine analiz için kayıt olun.";
      nameField.classList.remove("hidden");
      authSubmit.textContent = "Kayıt Ol";
      authSwitchText.textContent = "Zaten hesabınız var mı?";
      authSwitchBtn.textContent = "Giriş yapın";
    } else {
      authTitle.textContent = "Sentra Report Agent'e Hoş Geldiniz";
      authSub.textContent = "Şirketler ve sektörler hakkında derinlemesine analiz için giriş yapın.";
      nameField.classList.add("hidden");
      authSubmit.textContent = "Giriş Yap";
      authSwitchText.textContent = "Hesabınız yok mu?";
      authSwitchBtn.textContent = "Kayıt olun";
    }
    authError.hidden = true;
  }
  function showAuthError(msg) {
    authError.textContent = msg;
    authError.hidden = false;
  }

  authSwitchBtn.addEventListener("click", () => {
    state.authMode = state.authMode === "login" ? "register" : "login";
    updateAuthMode();
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(authForm);
    const body = { email: fd.get("email"), password: fd.get("password") };
    if (state.authMode === "register") body.name = fd.get("name");
    authSubmit.disabled = true;
    authSubmit.textContent = state.authMode === "register" ? "Kayıt yapılıyor…" : "Giriş yapılıyor…";
    try {
      const data = await api("/api/auth/" + (state.authMode === "register" ? "register" : "login"), {
        method: "POST", body: JSON.stringify(body)
      });
      state.user = data.user;
      showApp();
      await bootApp();
    } catch (err) {
      showAuthError(err.message);
    } finally {
      authSubmit.disabled = false;
      updateAuthMode();
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch (_) {}
    state.user = null;
    state.conversations = [];
    state.activeId = null;
    state.memory = [];
    state.prompts = [];
    showAuth();
    closeSidebar();
  });

  async function checkSession() {
    try {
      const data = await api("/api/auth/me");
      state.user = data.user;
      showApp();
      await bootApp();
    } catch (_) {
      showAuth();
    }
  }

  // ============== App boot ==============
  async function bootApp() {
    if (state.user) {
      userName.textContent = state.user.name;
      userAvatar.textContent = initials(state.user.name);
      userPlan.textContent = state.user.email;
    }
    await Promise.all([loadConversations(), loadMemory(), loadPrompts(), loadSettings()]);
    renderAll();
    autoResize();

    // Otomatik devam: aktif konuşmada yarıda kalmış asistan mesajı varsa
    // sayfa yenilendiğinde otomatik olarak stream'e devam et
    const conv = getActive();
    if (conv && conv.messages && conv.messages.length > 0) {
      const last = conv.messages[conv.messages.length - 1];
      if (last && last.role === "assistant" && last.meta?.completed === false && (last.content || "").length > 0) {
        const lastIdx = conv.messages.length - 1;
        // Küçük gecikme: kullanıcı önce "Yarıda kesildi" durumunu görsün, sonra stream başlasın
        setTimeout(() => {
          if (!state.sending && getActive()?.id === conv.id) {
            sendMessage(null, false, lastIdx);
            toast("Önceki yanıt kaldığı yerden devam ediyor…");
          }
        }, 600);
      }
    }

    inputEl.focus();
    fetch("/api/health").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d && d.model) {
        modelTag.textContent = d.model + " · Report";
        setStatus("ok");
      } else setStatus("err");
    }).catch(() => setStatus("err"));
  }

  async function loadConversations() {
    try { state.conversations = await api("/api/conversations"); }
    catch (_) { state.conversations = []; }
    if (!state.activeId && state.conversations[0]) {
      state.activeId = state.conversations[0].id;
    }
  }
  async function loadMemory() {
    try { state.memory = await api("/api/memory"); } catch (_) { state.memory = []; }
  }
  async function loadPrompts() {
    try { state.prompts = await api("/api/prompts"); } catch (_) { state.prompts = []; }
  }
  async function loadSettings() {
    try {
      const s = await api("/api/settings");
      state.settings = { ...state.settings, ...s };
      tempRange.value = state.settings.temperature;
      tempVal.textContent = Number(state.settings.temperature).toFixed(2);
      deepCheckbox.checked = state.settings.deepAnalysis !== false;
    } catch (_) {}
  }

  async function saveSettingsRemote() {
    try { await api("/api/settings", { method: "PUT", body: JSON.stringify(state.settings) }); } catch (_) {}
  }

  // ============== Conversations ==============
  function getActive() { return state.conversations.find((c) => c.id === state.activeId) || null; }

  async function newConversation() {
    if (state.sending) stopGeneration();
    try {
      const conv = await api("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "Yeni rapor", messages: [] })
      });
      state.conversations.unshift(conv);
      state.activeId = conv.id;
      renderAll();
      inputEl.focus();
      closeSidebar();
    } catch (err) { toast(err.message, true); }
  }

  async function switchTo(id) {
    if (state.sending) return;
    if (state.activeId === id) { closeSidebar(); return; }
    state.activeId = id;
    renderAll();
    closeSidebar();
  }

  async function deleteConv(id, e) {
    if (e) e.stopPropagation();
    if (!confirm("Bu konuşma silinsin mi?")) return;
    try {
      await api("/api/conversations/" + id, { method: "DELETE" });
      state.conversations = state.conversations.filter((c) => c.id !== id);
      if (state.activeId === id) state.activeId = state.conversations[0]?.id || null;
      renderAll();
      toast("Konuşma silindi");
    } catch (err) { toast(err.message, true); }
  }

  async function renameConv(id, e) {
    if (e) e.stopPropagation();
    const conv = state.conversations.find((c) => c.id === id);
    if (!conv) return;
    const next = prompt("Rapor başlığı", conv.title);
    if (!next || !next.trim()) return;
    try {
      const updated = await api("/api/conversations/" + id, {
        method: "PUT", body: JSON.stringify({ title: next.trim().slice(0, 80) })
      });
      Object.assign(conv, updated);
      renderSidebar();
    } catch (err) { toast(err.message, true); }
  }

  // ============== Rendering ==============
  function renderAll() { renderSidebar(); renderContent(); updateCtxPill(); }

  function renderSidebar() {
    const list = state.conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (list.length === 0) {
      convListEl.innerHTML = '<div class="nav-empty">Henüz rapor yok.<br/>"Yeni Rapor" ile başlayın.</div>';
    } else {
      const groups = {};
      list.forEach((c) => { const g = fmtDateGroup(c.updatedAt); (groups[g] = groups[g] || []).push(c); });
      const order = ["Bugün", "Dün", "Bu hafta", "Bu ay", "Daha önce"];
      convListEl.innerHTML = order.filter((g) => groups[g]?.length).map((g) => {
        const items = groups[g].map((c) => {
          const isActive = c.id === state.activeId;
          return `<div class="nav-item ${isActive ? "active" : ""}" data-id="${c.id}">
            <span class="title">${escHtml(c.title)}</span>
            <button class="del" data-del="${c.id}" title="Sil" aria-label="Sil">${ICONS.trash}</button>
          </div>`;
        }).join("");
        return `<div class="nav-group">${g}</div>${items}`;
      }).join("");
    }
    const total = state.memory.filter((m) => m.active !== false).length + state.prompts.length;
    libraryCount.textContent = total;
  }

  function renderContent() {
    const conv = getActive();
    if (!conv) { renderWelcome(); return; }
    if (!conv.messages || conv.messages.length === 0) { renderWelcome(); return; }
    renderMessages(conv);
  }

  function renderWelcome() {
    const cards = QUICK_ACTIONS.map((q) => `
      <button class="quick-card" data-prompt="${escHtml(q.prompt)}" type="button">
        <div class="qc-title">${ICONS[q.icon]}<span>${escHtml(q.title)}</span></div>
        <div class="qc-desc">${escHtml(q.desc)}</div>
      </button>
    `).join("");

    // Featured personas
    const T = (window.SENTRA_TEMPLATES && window.SENTRA_TEMPLATES.personas) || [];
    const personas = FEATURED_PERSONAS.map((id) => T.find((p) => p.id === id)).filter(Boolean);
    const personaCards = personas.map((p) => `
      <button class="persona-card" data-persona="${p.id}" type="button">
        <div class="persona-icon">${escHtml(p.icon)}</div>
        <div class="persona-body">
          <div class="persona-name">${escHtml(p.name)}</div>
          <div class="persona-desc">${escHtml(p.desc)}</div>
        </div>
        <svg class="persona-arrow" viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 5l7 7-7 7"/></svg>
      </button>
    `).join("");

    const hasActive = state.prompts.some((p) => p.active);
    const activePrompt = state.prompts.find((p) => p.active);
    const memCount = state.memory.filter((m) => m.active !== false).length;
    const convCount = state.conversations.length;

    contentEl.innerHTML = `
      <div class="welcome">
        <div class="welcome-orb">S</div>
        <h1>Sentra Report Agent</h1>
        <p>Şirketler, sektörler ve rakipler hakkında profesyonel, yapılandırılmış ve veri odaklı raporlar üretin.</p>

        <div class="welcome-stats">
          <div class="stat">
            <div class="stat-value">${convCount}</div>
            <div class="stat-label">rapor</div>
          </div>
          <div class="stat">
            <div class="stat-value">${memCount}</div>
            <div class="stat-label">aktif hafıza</div>
          </div>
          <div class="stat">
            <div class="stat-value">${state.prompts.length}</div>
            <div class="stat-label">yönerge</div>
          </div>
          <div class="stat">
            <div class="stat-value">${hasActive ? "✓" : "—"}</div>
            <div class="stat-label">${hasActive ? escHtml(activePrompt.name) : "aktif yönerge yok"}</div>
          </div>
        </div>

        <div class="welcome-section">
          <div class="welcome-section-head">
            <h2>Persona ile başla</h2>
            <button class="link-btn" id="openLibraryFromWelcome" type="button">Tüm şablonlar →</button>
          </div>
          <div class="persona-grid">${personaCards}</div>
        </div>

        <div class="welcome-section">
          <div class="welcome-section-head">
            <h2>Hızlı analiz şablonları</h2>
          </div>
          <div class="quick-grid">${cards}</div>
        </div>
      </div>
    `;
  }

  function renderMessages(conv) {
    const html = conv.messages.map((m, i) => renderMessageHTML(m, i)).join("");
    contentEl.innerHTML = `<div class="messages">${html}</div>`;
    wireMessageActions();
    state.atBottom = true;
    jumpToBottom(true);
    updateJumpButton();
  }

  // Content (string or vision array) → render edilebilir HTML
  function renderMessageContentHTML(content) {
    if (typeof content === "string") {
      return escHtml(content).replace(/\n/g, "<br/>");
    }
    if (Array.isArray(content)) {
      const out = [];
      const images = [];
      for (const p of content) {
        if (p.type === "text") {
          out.push(`<div class="content-text">${escHtml(p.text || "").replace(/\n/g, "<br/>")}</div>`);
        } else if (p.type === "image_url") {
          const url = p.image_url?.url || "";
          if (url) images.push(`<img class="msg-image" src="${escHtml(url)}" alt="eklenen görsel" loading="lazy" />`);
        }
      }
      if (images.length > 0) out.push(`<div class="msg-images">${images.join("")}</div>`);
      return out.join("");
    }
    return "";
  }

  function renderMessageHTML(msg, idx) {
    if (msg.role === "user") {
      const contentHTML = renderMessageContentHTML(msg.content);
      return `<div class="msg user" data-idx="${idx}">
        <div class="avatar user">${escHtml(initials(state.user?.name))}</div>
        <div class="msg-body">
          <div class="bubble">${contentHTML}</div>
          <div class="msg-actions user-actions">
            <button class="msg-action" data-action="copy" data-idx="${idx}" title="Kopyala" aria-label="Kopyala">${ICONS.copy}<span>Kopyala</span></button>
          </div>
        </div>
      </div>`;
    }
    const meta = msg.meta || {};
    const isCompleted = meta.completed !== false; // default: tamamlandı sayılır
    const isPartial = !isCompleted && (msg.content || "").length > 0;
    const isEmpty = !msg.content;

    const timeStr = meta.elapsedMs ? fmtTime(meta.elapsedMs) : "";
    const ttfbStr = meta.ttfbMs ? " · TTFB " + fmtTime(meta.ttfbMs) : "";
    const metaLine = timeStr ? `<div class="msg-meta">${timeStr}${ttfbStr}</div>` : "";

    let actionsHTML = "";
    if (isEmpty) {
      // Henüz yanıt yok
      actionsHTML = '';
    } else if (isPartial) {
      actionsHTML = `
        <button class="msg-action primary" data-action="resume" data-idx="${idx}" title="Yanıtı devam ettir">
          <svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          <span>Devam et</span>
        </button>
        <button class="msg-action" data-action="copy" data-idx="${idx}" title="Mevcut yanıtı kopyala">${ICONS.copy}<span>Kopyala</span></button>
        <button class="msg-action" data-action="regen" data-idx="${idx}" title="Yeniden üret">${ICONS.refresh}<span>Yeniden dene</span></button>
      `;
    } else {
      actionsHTML = `
        <button class="msg-action" data-action="copy" data-idx="${idx}" title="Kopyala">${ICONS.copy}<span>Kopyala</span></button>
        <button class="msg-action" data-action="regen" data-idx="${idx}" title="Yeniden üret">${ICONS.refresh}<span>Yenile</span></button>
      `;
    }

    const partialBadge = isPartial ? `<span class="partial-badge" title="Yanıt yarıda kesildi">Yarıda kesildi</span>` : "";

    return `<div class="msg assistant${isPartial ? " partial" : ""}" data-idx="${idx}">
      <div class="avatar assistant">S</div>
      <div class="bubble">
        <div class="content">${renderMarkdown(msg.content)}${isPartial ? '<span class="streaming-cursor"></span>' : ''}</div>
        ${actionsHTML ? `<div class="msg-actions">${actionsHTML}</div>` : ""}
        ${partialBadge}
        ${metaLine}
      </div>
    </div>`;
  }

  function renderMarkdown(text) {
    if (!text) return "";
    if (window.marked && window.DOMPurify) {
      try {
        const raw = window.marked.parse(text, { gfm: true, breaks: true, async: false });
        const clean = window.DOMPurify.sanitize(raw, { ADD_ATTR: ["target", "rel"] });
        return processCodeBlocks(clean);
      } catch (_) {}
    }
    return escHtml(text);
  }
  function processCodeBlocks(html) {
    return html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (m, attrs, code) => {
      const langMatch = attrs.match(/class="?language-([\w+-]+)"?/);
      const lang = langMatch ? langMatch[1] : '';
      const langLabel = lang ? lang.toUpperCase() : 'KOD';
      return `<div class="code-block" data-lang="${escHtml(lang)}">
        <div class="code-header">
          <span class="code-lang">${escHtml(langLabel)}</span>
          <button class="copy-code" type="button" aria-label="Kodu kopyala">
            <svg viewBox="0 0 24 24" width="13" height="13"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M9 9h10v10H9zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"/></svg>
            <span>Kopyala</span>
          </button>
        </div>
        <pre><code${attrs}>${code}</code></pre>
      </div>`;
    });
  }

  function ensureMessagesContainer() {
    let msgs = contentEl.querySelector(".messages");
    if (!msgs) {
      contentEl.innerHTML = '<div class="messages"></div>';
      msgs = contentEl.querySelector(".messages");
    }
    return msgs;
  }

  function appendUserMessageNode(content, idx) {
    const msgs = ensureMessagesContainer();
    const wrap = document.createElement("div");
    wrap.className = "msg user";
    wrap.dataset.idx = idx != null ? idx : "";
    wrap.innerHTML = `
      <div class="avatar user">${escHtml(initials(state.user?.name))}</div>
      <div class="msg-body">
        <div class="bubble">${renderMessageContentHTML(content)}</div>
        <div class="msg-actions user-actions">
          <button class="msg-action" data-action="copy" title="Kopyala" aria-label="Kopyala">${ICONS.copy}<span>Kopyala</span></button>
        </div>
      </div>`;
    msgs.appendChild(wrap);
    autoScroll();
    return wrap;
  }
  function appendAssistantPlaceholder() {
    const msgs = ensureMessagesContainer();
    const wrap = document.createElement("div");
    wrap.className = "msg assistant streaming";
    wrap.innerHTML = `
      <div class="avatar assistant thinking"></div>
      <div class="bubble">
        <div class="content"><div class="thinking-dots"><span></span><span></span><span></span></div></div>
      </div>
    `;
    msgs.appendChild(wrap);
    autoScroll();
    return wrap;
  }
  function updateAssistantContent(wrap, text) {
    const avatar = wrap.querySelector(".avatar");
    if (avatar) avatar.classList.remove("thinking");
    const content = wrap.querySelector(".content");
    if (content) content.innerHTML = renderMarkdown(text) + '<span class="streaming-cursor"></span>';
    autoScroll();
  }
  function finalizeAssistant(wrap, text, meta) {
    const avatar = wrap.querySelector(".avatar");
    if (avatar) avatar.classList.remove("thinking");
    const content = wrap.querySelector(".content");
    if (content) content.innerHTML = renderMarkdown(text);
    wrap.classList.remove("streaming");
    const actions = wrap.querySelector(".msg-actions");
    if (actions) actions.querySelectorAll("button").forEach((b) => b.disabled = false);
    const bubble = wrap.querySelector(".bubble");
    if (bubble && meta) {
      const timeStr = meta.elapsedMs ? fmtTime(meta.elapsedMs) : "";
      const ttfbStr = meta.ttfbMs ? " · TTFB " + fmtTime(meta.ttfbMs) : "";
      if (timeStr) {
        const metaEl = document.createElement("div");
        metaEl.className = "msg-meta";
        metaEl.textContent = timeStr + ttfbStr;
        bubble.appendChild(metaEl);
      }
    }
    autoScroll();
  }
  function appendErrorNode(text) {
    const msgs = ensureMessagesContainer();
    const wrap = document.createElement("div");
    wrap.className = "msg assistant";
    wrap.innerHTML = `
      <div class="avatar assistant" style="background: var(--danger); box-shadow: 0 4px 12px rgba(239,68,68,0.3);">!</div>
      <div class="bubble"><div class="error-card">${ICONS.alert}<div>${escHtml(text)}</div></div></div>
    `;
    msgs.appendChild(wrap);
    autoScroll();
  }

  // ============== Smart scroll ==============
  function isAtBottom(threshold = 80) {
    return contentEl.scrollHeight - contentEl.scrollTop - contentEl.clientHeight < threshold;
  }
  function jumpToBottom(instant) {
    const msgs = contentEl.querySelector(".messages");
    if (!msgs) return;
    if (instant) {
      contentEl.scrollTop = contentEl.scrollHeight;
    } else {
      msgs.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }
  function autoScroll() {
    if (state.atBottom) {
      jumpToBottom(false);
      state.pendingNewCount = 0;
      updateJumpButton();
    } else {
      state.pendingNewCount++;
      updateJumpButton();
    }
  }
  function updateJumpButton() {
    if (state.atBottom) {
      jumpBottom.hidden = true;
      state.pendingNewCount = 0;
      jumpBadge.hidden = true;
    } else {
      jumpBottom.hidden = false;
      if (state.pendingNewCount > 0) {
        jumpBadge.hidden = false;
        jumpBadge.textContent = state.pendingNewCount > 99 ? "99+" : String(state.pendingNewCount);
      } else {
        jumpBadge.hidden = true;
      }
    }
  }

  contentEl.addEventListener("scroll", () => {
    const atBot = isAtBottom(80);
    if (atBot !== state.atBottom) {
      state.atBottom = atBot;
      if (atBot) { state.pendingNewCount = 0; }
      updateJumpButton();
    }
  });
  jumpBottom.addEventListener("click", () => {
    state.atBottom = true;
    state.pendingNewCount = 0;
    jumpToBottom(true);
    updateJumpButton();
  });

  // ============== Message actions ==============
  function wireMessageActions() {
    contentEl.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", onMessageAction));
    contentEl.querySelectorAll(".copy-code").forEach((btn) => btn.addEventListener("click", onCopyCode));
    applyHighlight();
  }
  function applyHighlight() {
    if (window.hljs) {
      contentEl.querySelectorAll(".code-block pre code").forEach((block) => {
        if (block.dataset.highlighted) return;
        try { window.hljs.highlightElement(block); block.dataset.highlighted = "1"; } catch (_) {}
      });
    }
  }
  async function onMessageAction(e) {
    const btn = e.currentTarget;
    const idx = Number(btn.dataset.idx);
    const action = btn.dataset.action;
    const conv = getActive();
    if (!conv) return;
    const msg = conv.messages[idx];
    if (!msg) return;
    if (action === "copy") {
      try {
        // String content'i direkt kopyala, array content'den sadece text kısımlarını al
        let text = "";
        if (typeof msg.content === "string") text = msg.content;
        else if (Array.isArray(msg.content)) {
          text = msg.content.filter((p) => p.type === "text").map((p) => p.text).join("\n");
        }
        await navigator.clipboard.writeText(text);
        const span = btn.querySelector("span");
        const orig = span?.textContent;
        btn.classList.add("copied");
        if (span) span.textContent = "Kopyalandı";
        setTimeout(() => { btn.classList.remove("copied"); if (span) span.textContent = orig || "Kopyala"; }, 1500);
      } catch (_) { toast("Kopyalanamadı", true); }
    } else if (action === "regen") {
      if (state.sending) return;
      // Yenile: kendisi dahil son user mesajına kadar sil, yeniden gönder
      let userText = null;
      if (idx > 0 && conv.messages[idx - 1]?.role === "user") {
        userText = conv.messages[idx - 1].content;
        conv.messages.splice(idx - 1, 2);
      } else if (msg.role === "assistant") {
        conv.messages.pop();
        if (conv.messages.length > 0 && conv.messages[conv.messages.length - 1].role === "user") {
          userText = conv.messages[conv.messages.length - 1].content;
          conv.messages.pop();
        }
      }
      if (userText) {
        await persistConversation(conv);
        renderMessages(conv);
        sendMessage(userText, true);
      }
    } else if (action === "resume") {
      if (state.sending) return;
      // Kaldığı yerden devam: mevcut partial içeriği koru, modele tüm geçmişi + partial'ı gönder
      sendMessage(null, false, idx);
    }
  }
  async function onCopyCode(e) {
    const btn = e.currentTarget;
    const block = btn.closest(".code-block");
    const code = block?.querySelector("code");
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent || "");
      const span = btn.querySelector("span");
      const origSpan = span?.textContent;
      const origSvg = btn.innerHTML;
      btn.classList.add("copied");
      if (span) span.textContent = "Kopyalandı";
      setTimeout(() => {
        btn.classList.remove("copied");
        if (span) span.textContent = origSpan || "Kopyala";
      }, 1400);
    } catch (_) {}
  }

  // ============== Sending ==============
  async function persistConversation(conv) {
    try {
      const updated = await api("/api/conversations/" + conv.id, {
        method: "PUT",
        body: JSON.stringify({
          title: conv.title,
          messages: conv.messages
        })
      });
      conv.updatedAt = updated.updatedAt;
    } catch (err) { toast(err.message, true); }
  }

  // Debounced partial-save: her token'da çağrılır, 500ms sessizlikten sonra sunucuya yazar
  let partialSaveTimer = null;
  let partialSaveConv = null;
  function schedulePartialSave(conv) {
    partialSaveConv = conv;
    if (partialSaveTimer) return;
    partialSaveTimer = setTimeout(async () => {
      partialSaveTimer = null;
      const c = partialSaveConv;
      partialSaveConv = null;
      if (!c) return;
      try {
        await api("/api/conversations/" + c.id, {
          method: "PUT",
          body: JSON.stringify({ title: c.title, messages: c.messages })
        });
      } catch (_) { /* sessiz — UI tekrar deneyecek */ }
    }, 500);
  }
  // Tab gizlenirken veya kapanırken son bir save yap (keepalive: fetch tab kapatılsa bile yaşar)
  function flushPartialSaveSync() {
    if (!partialSaveTimer || !partialSaveConv) return;
    clearTimeout(partialSaveTimer);
    partialSaveTimer = null;
    const c = partialSaveConv;
    partialSaveConv = null;
    try {
      fetch("/api/conversations/" + c.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: c.title, messages: c.messages }),
        keepalive: true
      });
    } catch (_) { /* yut */ }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPartialSaveSync();
  });
  window.addEventListener("pagehide", flushPartialSaveSync);

  async function sendMessage(text, isRegen, resumeFromIdx) {
    if (state.sending) return;
    const content = (text || "").trim();
    if (!content && resumeFromIdx == null) return;

    let conv = getActive();
    if (!conv) {
      await newConversation();
      conv = getActive();
      if (!conv) return;
    }

    // Capture attachments, images and URL info for this send
    const attachments = state.attachments.slice();
    const images = state.images.slice();
    state.attachments = [];
    state.images = [];
    renderAttachmentChips();

    // Add user message only when starting fresh (not when resuming or regenerating)
    if (!isRegen && resumeFromIdx == null) {
      // Görsel varsa: content'i array (vision) formatında sakla — ekranda ve API'de aynı yapı
      // Sadece metin/dosya varsa: string content (geriye uyumlu)
      let storedContent;
      if (images.length > 0) {
        const parts = [];
        if (content) parts.push({ type: "text", text: content });
        attachments.forEach((a) => {
          const truncated = a.content.length > 50000 ? a.content.slice(0, 50000) + "\n... (kırpıldı)" : a.content;
          parts.push({ type: "text", text: `📎 **${a.name}** (${a.type}, ${humanSize(a.size)}):\n\`\`\`\n${truncated}\n\`\`\`` });
        });
        images.forEach((img) => {
          parts.push({ type: "image_url", image_url: { url: img.dataUrl } });
        });
        storedContent = parts;
      } else if (attachments.length > 0) {
        const attachText = attachments.map((a) => {
          const truncated = a.content.length > 50000 ? a.content.slice(0, 50000) + "\n... (kırpıldı)" : a.content;
          return `📎 **${a.name}** (${a.type}, ${humanSize(a.size)}):\n\`\`\`\n${truncated}\n\`\`\``;
        }).join("\n\n");
        storedContent = content + (content ? "\n\n" : "") + "Ekli dosyalar:\n\n" + attachText;
      } else {
        storedContent = content;
      }
      conv.messages.push({ role: "user", content: storedContent });
      const titleSeed = content || attachments[0]?.name || images[0]?.name || "Yeni rapor";
      if (conv.messages.length === 1) conv.title = deriveTitle(titleSeed);
      conv.updatedAt = Date.now();
      await persistConversation(conv);
      renderSidebar();
    }

    // If resuming, locate existing partial assistant message
    let assistantMsg = null;
    if (typeof resumeFromIdx === "number") {
      assistantMsg = conv.messages[resumeFromIdx];
      if (assistantMsg) {
        // Mevcut partial içeriği koru, sadece meta'yı sıfırla
        assistantMsg.meta = { ...(assistantMsg.meta || {}), completed: false, startedAt: Date.now(), ttfbMs: null, elapsedMs: null, partial: undefined };
      }
    }

    // Render: full re-render for first message, otherwise append
    if (conv.messages.length === 1 || !contentEl.querySelector(".messages")) {
      renderMessages(conv);
    } else if (!isRegen && resumeFromIdx == null) {
      appendUserMessageNode(conv.messages[conv.messages.length - 1].content, conv.messages.length - 2);
    } else if (resumeFromIdx != null) {
      // Resume: re-render so the partial state is consistent
      renderMessages(conv);
    }

    state.atBottom = true;
    jumpToBottom(true);

    // Streaming sırasında placeholder: ya yeni mesaj ya da mevcut partial
    let wrap;
    if (resumeFromIdx != null) {
      // Mevcut partial node'u bul, içeriğini güncelleyeceğiz
      const existing = contentEl.querySelector(`.msg.assistant[data-idx="${resumeFromIdx}"]`);
      if (existing) {
        wrap = existing;
        wrap.classList.add("streaming");
        wrap.classList.remove("partial");
        // Partial-specific öğeleri kaldır (badge, devam-et butonu)
        wrap.querySelectorAll(".partial-badge").forEach((el) => el.remove());
        // Actions'ı temizle, streaming sırasında gizli olacak
        const actions = wrap.querySelector(".msg-actions");
        if (actions) actions.innerHTML = "";
        // Mevcut içeriği koru, streaming cursor ekle
        const content = wrap.querySelector(".content");
        if (content) {
          const inner = renderMarkdown(assistantMsg.content) + '<span class="streaming-cursor"></span>';
          content.innerHTML = inner;
        }
        const avatar = wrap.querySelector(".avatar");
        if (avatar) avatar.classList.add("thinking");
        jumpToBottom(true);
      } else {
        wrap = appendAssistantPlaceholder();
      }
    } else {
      wrap = appendAssistantPlaceholder();
    }

    // Add new assistant message to conv (if not resuming)
    if (!assistantMsg) {
      assistantMsg = {
        role: "assistant",
        content: "",
        meta: { completed: false, startedAt: Date.now(), ttfbMs: null, elapsedMs: null }
      };
      conv.messages.push(assistantMsg);
    }

    let assistantText = assistantMsg.content || ""; // resume ise mevcut içerikten devam
    const startedAt = performance.now();
    let firstTokenAt = 0;

    state.sending = true;
    setStatus("busy");
    sendBtn.classList.add("sending");
    sendBtn.setAttribute("aria-label", "Durdur");

    const controller = new AbortController();
    state.abort = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conv.messages
            .filter((m) => m !== assistantMsg) // henüz tamamlanmamış kendi mesajını gönderme
            .map((m) => ({ role: m.role, content: m.content }))
            .concat([{ role: "assistant", content: assistantText }]), // mevcut partial'ı içerik olarak
          temperature: state.settings.temperature
        }),
        signal: controller.signal
      });
      if (!res.ok || !res.body) {
        let detail = ""; try { detail = await res.text(); } catch (_) {}
        throw new Error(`Sunucu hatası (${res.status}): ${detail.slice(0, 240)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "", currentEvent = "message", currentData = "";

      const flush = () => {
        if (!currentData) { currentEvent = "message"; return; }
        let payload;
        try { payload = JSON.parse(currentData); } catch (_) { currentEvent = "message"; currentData = ""; return; }
        if (currentEvent === "open") {
          if (payload?.model) modelTag.textContent = payload.model + " · Report";
          setStatus("ok");
          if (payload.context) updateCtxPillFromContext(payload.context);
          if (payload?.context?.fetched) {
            showFetchIndicator(payload.context.fetched);
          }
        } else if (currentEvent === "token") {
          if (!firstTokenAt) firstTokenAt = performance.now();
          assistantText += payload.delta || "";
          assistantMsg.content = assistantText;
          updateAssistantContent(wrap, assistantText);
          schedulePartialSave(conv);
        } else if (currentEvent === "done") {
          if (typeof payload.content === "string" && payload.content.length > assistantText.length) {
            assistantText = payload.content;
            assistantMsg.content = assistantText;
            updateAssistantContent(wrap, assistantText);
          }
        } else if (currentEvent === "error") {
          throw new Error(payload.message || "Bilinmeyen hata");
        }
        currentEvent = "message"; currentData = "";
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const raw = buffer.slice(0, nl).replace(/\r$/, "");
          buffer = buffer.slice(nl + 1);
          if (raw === "") { flush(); continue; }
          if (raw.startsWith("event:")) currentEvent = raw.slice(6).trim();
          else if (raw.startsWith("data:")) {
            const chunk = raw.slice(5).trim();
            currentData = currentData ? currentData + "\n" + chunk : chunk;
          }
        }
      }
      if (currentData) flush();

      // Success: mark as completed
      assistantMsg.content = assistantText;
      assistantMsg.meta = {
        ...(assistantMsg.meta || {}),
        completed: true,
        elapsedMs: Math.round(performance.now() - startedAt),
        ttfbMs: firstTokenAt ? Math.round(firstTokenAt - startedAt) : null,
        finishedAt: Date.now()
      };
      conv.updatedAt = Date.now();
      if (partialSaveTimer) { clearTimeout(partialSaveTimer); partialSaveTimer = null; }
      await persistConversation(conv);
      finalizeAssistant(wrap, assistantText, assistantMsg.meta);
      // Update node with completed actions
      updateAssistantNodeAfterComplete(wrap, assistantMsg, conv);
      renderSidebar();
      setStatus("ok");
    } catch (err) {
      const isAbort = err && err.name === "AbortError";
      // Mark as incomplete so user can resume
      assistantMsg.content = assistantText;
      assistantMsg.meta = {
        ...(assistantMsg.meta || {}),
        completed: false,
        partial: true,
        elapsedMs: Math.round(performance.now() - startedAt),
        ttfbMs: firstTokenAt ? Math.round(firstTokenAt - startedAt) : null,
        error: isAbort ? "cancelled" : (err.message || "bilinmeyen")
      };
      conv.updatedAt = Date.now();
      if (partialSaveTimer) { clearTimeout(partialSaveTimer); partialSaveTimer = null; }
      await persistConversation(conv);
      finalizePartialAssistant(wrap, assistantText, isAbort);
      updateAssistantNodeAfterComplete(wrap, assistantMsg, conv);
      renderSidebar();
      if (isAbort) {
        setStatus("ok");
        toast("Yanıt iptal edildi — Devam et ile kaldığı yerden sürdürebilirsin");
      } else {
        setStatus("err");
        toast("Hata: " + (err.message || "bilinmeyen"), true);
      }
    } finally {
      state.sending = false;
      state.abort = null;
      sendBtn.classList.remove("sending");
      sendBtn.setAttribute("aria-label", "Gönder");
      wireMessageActions();
      state.atBottom = true;
      updateJumpButton();
    }
  }

  function updateAssistantNodeAfterComplete(wrap, msg, conv) {
    // Re-render this single message's actions/badges based on completion state
    const idx = conv.messages.indexOf(msg);
    if (idx < 0) return;
    wrap.dataset.idx = idx;
    // Remove old actions/badge/meta
    wrap.querySelectorAll(".msg-actions, .partial-badge, .msg-meta").forEach((el) => el.remove());
    // Build new actions via same logic
    const isCompleted = msg.meta?.completed !== false;
    const isPartial = !isCompleted && (msg.content || "").length > 0;
    const bubble = wrap.querySelector(".bubble");
    if (!bubble) return;
    const contentEl = bubble.querySelector(".content");
    if (contentEl && !contentEl.querySelector(".streaming-cursor") && isCompleted) {
      contentEl.innerHTML = renderMarkdown(msg.content);
    }
    let actionsHTML = "";
    if (isPartial) {
      actionsHTML = `
        <button class="msg-action primary" data-action="resume" data-idx="${idx}">
          <svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          <span>Devam et</span>
        </button>
        <button class="msg-action" data-action="copy" data-idx="${idx}">${ICONS.copy}<span>Kopyala</span></button>
        <button class="msg-action" data-action="regen" data-idx="${idx}">${ICONS.refresh}<span>Yeniden dene</span></button>
      `;
    } else if ((msg.content || "").length > 0) {
      actionsHTML = `
        <button class="msg-action" data-action="copy" data-idx="${idx}">${ICONS.copy}<span>Kopyala</span></button>
        <button class="msg-action" data-action="regen" data-idx="${idx}">${ICONS.refresh}<span>Yenile</span></button>
      `;
    }
    if (actionsHTML) {
      const actions = document.createElement("div");
      actions.className = "msg-actions";
      actions.innerHTML = actionsHTML;
      bubble.appendChild(actions);
    }
    if (isPartial) {
      const badge = document.createElement("span");
      badge.className = "partial-badge";
      badge.title = "Yanıt yarıda kesildi";
      badge.textContent = "Yarıda kesildi";
      bubble.appendChild(badge);
    } else {
      const meta = msg.meta || {};
      const timeStr = meta.elapsedMs ? fmtTime(meta.elapsedMs) : "";
      const ttfbStr = meta.ttfbMs ? " · TTFB " + fmtTime(meta.ttfbMs) : "";
      if (timeStr) {
        const metaEl = document.createElement("div");
        metaEl.className = "msg-meta";
        metaEl.textContent = timeStr + ttfbStr;
        bubble.appendChild(metaEl);
      }
    }
    wrap.classList.toggle("partial", isPartial);
    wrap.classList.remove("streaming");
  }

  function finalizePartialAssistant(wrap, text, wasAbort) {
    const avatar = wrap.querySelector(".avatar");
    if (avatar) avatar.classList.remove("thinking");
    const content = wrap.querySelector(".content");
    if (content) {
      // Streaming cursor'ı kaldır ama partial göster
      const cursor = content.querySelector(".streaming-cursor");
      if (cursor) cursor.remove();
    }
  }

  function stopGeneration() { if (state.abort) state.abort.abort(); }

  // ============== Context pill ==============
  function updateCtxPill() {
    const memCount = state.memory.filter((m) => m.active !== false).length;
    const activePrompt = state.prompts.find((p) => p.active);
    const parts = [];
    if (memCount > 0) parts.push(memCount + " hafıza");
    if (activePrompt) parts.push("yönerge: " + activePrompt.name);
    if (state.settings.deepAnalysis) parts.push("derin analiz");
    ctxSummary.textContent = parts.length > 0 ? parts.join(" · ") : "bağlam hazırlanıyor";
  }
  function updateCtxPillFromContext(ctx) {
    const parts = [];
    if (ctx.memory) parts.push(ctx.memory + " hafıza");
    if (ctx.prompt) {
      const p = state.prompts.find((x) => x.id === ctx.prompt);
      parts.push("yönerge: " + (p?.name || "aktif"));
    }
    if (ctx.deep) parts.push("derin analiz");
    if (parts.length > 0) ctxSummary.textContent = parts.join(" · ");
  }

  // ============== Library ==============
  function openLibrary(tab) {
    state.libraryTab = tab || "memory";
    renderLibraryTabs();
    renderLibraryList();
    libraryModal.hidden = false;
    closeSidebar();
  }
  function closeLibrary() { libraryModal.hidden = true; }

  function renderLibraryTabs() {
    document.querySelectorAll(".lib-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === state.libraryTab);
    });
    const tab = state.libraryTab;
    const labels = { memory: "Yeni Hafıza", prompts: "Yeni Yönerge", templates: "Şablon Ekle" };
    libNewLabel.textContent = labels[tab] || "Yeni";
    memCount.textContent = state.memory.length;
    prmCount.textContent = state.prompts.length;
    // Hide "new" button on templates tab
    if (tab === "templates") {
      libNewBtn.style.display = "none";
    } else {
      libNewBtn.style.display = "";
    }
  }
  function renderLibraryList() {
    if (state.libraryTab === "memory") {
      if (state.memory.length === 0) {
        libraryBody.innerHTML = renderLibEmpty({
          ico: ICONS.building,
          title: "Henüz hafıza dosyası yok",
          desc: "Şirketler, sektörler veya kişisel bilgiler için hafıza dosyaları oluşturun. AI her yanıtta bunlara başvurur.",
          cta: "İlk hafızayı ekle",
          onClick: () => openEditor("memory")
        });
        wireLibEmpty();
        return;
      }
      const activeList = state.memory.filter((m) => m.active !== false);
      const inactiveList = state.memory.filter((m) => m.active === false);
      libraryBody.innerHTML = `
        ${activeList.length ? '<div class="lib-section-title active-section">Aktif · ' + activeList.length + '</div>' : ''}
        <div class="lib-list">${activeList.map(memoryCardHTML).join("")}</div>
        ${inactiveList.length ? '<div class="lib-section-title">Devre dışı · ' + inactiveList.length + '</div>' : ''}
        <div class="lib-list">${inactiveList.map(memoryCardHTML).join("")}</div>
      `;
    } else if (state.libraryTab === "prompts") {
      if (state.prompts.length === 0) {
        libraryBody.innerHTML = renderLibEmpty({
          ico: ICONS.versus,
          title: "Henüz özel yönerge yok",
          desc: "Örnek: \"CFO Bakış Açısı\", \"Sektör Uzmanı\", \"Teknik Analist\" gibi özelleştirilmiş sistem yönergeleri oluşturun. Her sohbette bir yönerge aktif olabilir.",
          cta: "İlk yönergeyi ekle",
          onClick: () => openEditor("prompts")
        });
        wireLibEmpty();
        return;
      }
      libraryBody.innerHTML = '<div class="lib-list">' + state.prompts.map(promptCardHTML).join("") + '</div>';
    } else if (state.libraryTab === "templates") {
      renderTemplatesGallery();
      return;
    }
    wireLibraryCards();
  }

  function renderLibEmpty(o) {
    return `<div class="lib-empty">
      <div class="ico">${o.ico}</div>
      <h3>${escHtml(o.title)}</h3>
      <p>${escHtml(o.desc)}</p>
      <button class="btn primary" id="libFirstAdd" type="button">${escHtml(o.cta)}</button>
    </div>`;
  }
  function wireLibEmpty() {
    const b = document.getElementById("libFirstAdd");
    if (!b) return;
    // delegate via closure; simplest: re-render with click hook
    b.addEventListener("click", () => {
      if (state.libraryTab === "memory") openEditor("memory");
      else if (state.libraryTab === "prompts") openEditor("prompts");
    });
  }

  function renderTemplatesGallery() {
    const T = window.SENTRA_TEMPLATES;
    if (!T) {
      libraryBody.innerHTML = '<div class="lib-empty"><div class="ico">⚠</div><h3>Şablonlar yüklenemedi</h3></div>';
      return;
    }

    // Persona templates grouped by category
    const personaCats = {};
    T.personas.forEach((p) => { (personaCats[p.category] = personaCats[p.category] || []).push(p); });
    const memCats = {};
    T.memory.forEach((m) => { (memCats[m.category] = memCats[m.category] || []).push(m); });

    const personaHTML = Object.entries(personaCats).map(([cat, items]) => `
      <div class="tpl-cat">
        <div class="tpl-cat-title">${escHtml(cat)}</div>
        <div class="tpl-grid">
          ${items.map(tplPersonaCardHTML).join("")}
        </div>
      </div>
    `).join("");

    const memHTML = Object.entries(memCats).map(([cat, items]) => `
      <div class="tpl-cat">
        <div class="tpl-cat-title">${escHtml(cat)}</div>
        <div class="tpl-grid">
          ${items.map(tplMemoryCardHTML).join("")}
        </div>
      </div>
    `).join("");

    libraryBody.innerHTML = `
      <div class="tpl-section">
        <div class="tpl-section-head">
          <h3>👑 Persona Yönergeleri</h3>
          <p>AI'ın yanıt vereceği uzmanlık perspektifini seçin. Tıkla → kütüphanenize eklenir → aktif yapabilirsiniz.</p>
        </div>
        ${personaHTML}
      </div>
      <div class="tpl-section">
        <div class="tpl-section-head">
          <h3>📚 Hafıza Şablonları</h3>
          <p>Şirket, pazar, finans ve operasyon bilgilerinizi yapılandırılmış şekilde tutmak için hazır çerçeveler.</p>
        </div>
        ${memHTML}
      </div>
    `;
    wireTemplateCards();
  }

  function tplPersonaCardHTML(p) {
    return `<button class="tpl-card" data-tpl-type="persona" data-tpl-id="${p.id}" type="button">
      <div class="tpl-emoji">${escHtml(p.icon || "✨")}</div>
      <div class="tpl-body">
        <div class="tpl-name">${escHtml(p.name)}</div>
        <div class="tpl-desc">${escHtml(p.desc)}</div>
      </div>
      <div class="tpl-cta">
        <svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
        Ekle
      </div>
    </button>`;
  }
  function tplMemoryCardHTML(m) {
    return `<button class="tpl-card" data-tpl-type="memory" data-tpl-id="${m.id}" type="button">
      <div class="tpl-emoji">📄</div>
      <div class="tpl-body">
        <div class="tpl-name">${escHtml(m.title)}</div>
        <div class="tpl-desc">${escHtml(m.desc)}</div>
      </div>
      <div class="tpl-cta">
        <svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
        Ekle
      </div>
    </button>`;
  }
  function wireTemplateCards() {
    libraryBody.querySelectorAll(".tpl-card").forEach((card) => {
      card.addEventListener("click", () => addTemplate(card.dataset.tplType, card.dataset.tplId));
    });
  }
  async function addTemplate(type, id) {
    const T = window.SENTRA_TEMPLATES;
    if (!T) return;
    if (type === "persona") {
      const p = T.personas.find((x) => x.id === id);
      if (!p) return;
      // Prevent duplicates
      if (state.prompts.some((x) => x.name === p.name)) {
        toast("Bu yönerge zaten mevcut");
        switchLibraryTab("prompts");
        return;
      }
      try {
        const saved = await api("/api/prompts", { method: "POST", body: JSON.stringify({ name: p.name, content: p.content, active: false }) });
        state.prompts.unshift(saved);
        switchLibraryTab("prompts");
        renderLibraryTabs();
        renderSidebar();
        updateCtxPill();
        toast("Yönerge eklendi — düzenleyebilir veya aktif edebilirsiniz");
      } catch (err) { toast(err.message, true); }
    } else if (type === "memory") {
      const m = T.memory.find((x) => x.id === id);
      if (!m) return;
      if (state.memory.some((x) => x.title === m.title)) {
        toast("Bu hafıza zaten mevcut");
        switchLibraryTab("memory");
        return;
      }
      try {
        const saved = await api("/api/memory", { method: "POST", body: JSON.stringify({ title: m.title, content: m.content, active: true }) });
        state.memory.unshift(saved);
        switchLibraryTab("memory");
        renderLibraryTabs();
        renderSidebar();
        updateCtxPill();
        toast("Hafıza eklendi — içeriği düzenleyebilirsiniz");
      } catch (err) { toast(err.message, true); }
    }
  }
  function switchLibraryTab(tab) {
    state.libraryTab = tab;
    renderLibraryTabs();
    renderLibraryList();
  }
  function memoryCardHTML(m) {
    const active = m.active !== false;
    return `<div class="lib-card" data-id="${m.id}">
      <div class="lib-toggle ${active ? "on" : ""}" data-toggle="${m.id}" title="${active ? "Devre dışı bırak" : "Etkinleştir"}"></div>
      <div class="lc-body">
        <div class="lc-title">
          <span>${escHtml(m.title)}</span>
          <span class="pill ${active ? "" : "off"}">${active ? "aktif" : "devre dışı"}</span>
        </div>
        <div class="lc-preview">${escHtml((m.content || "").slice(0, 220))}${(m.content || "").length > 220 ? "…" : ""}</div>
        <div class="lc-meta">${new Date(m.updatedAt).toLocaleString("tr-TR")}</div>
      </div>
    </div>`;
  }
  function promptCardHTML(p) {
    return `<div class="lib-card" data-id="${p.id}">
      <div class="lib-toggle ${p.active ? "on" : ""}" data-toggle="${p.id}" title="${p.active ? "Pasif yap" : "Aktif yap"}"></div>
      <div class="lc-body">
        <div class="lc-title">
          <span>${escHtml(p.name)}</span>
          ${p.active ? '<span class="pill">aktif</span>' : ""}
        </div>
        <div class="lc-preview">${escHtml((p.content || "").slice(0, 220))}${(p.content || "").length > 220 ? "…" : ""}</div>
        <div class="lc-meta">${new Date(p.updatedAt).toLocaleString("tr-TR")}</div>
      </div>
    </div>`;
  }
  function wireLibraryCards() {
    libraryBody.querySelectorAll(".lib-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".lib-toggle")) return;
        openEditor(state.libraryTab, card.dataset.id);
      });
    });
    libraryBody.querySelectorAll(".lib-toggle").forEach((tog) => {
      tog.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = tog.dataset.toggle;
        await toggleLibraryItem(id);
      });
    });
  }
  async function toggleLibraryItem(id) {
    if (state.libraryTab === "memory") {
      const m = state.memory.find((x) => x.id === id);
      if (!m) return;
      try {
        const updated = await api("/api/memory/" + id, {
          method: "PUT", body: JSON.stringify({ active: !(m.active !== false) })
        });
        Object.assign(m, updated);
        renderLibraryList();
        renderSidebar();
        updateCtxPill();
      } catch (err) { toast(err.message, true); }
    } else {
      const p = state.prompts.find((x) => x.id === id);
      if (!p) return;
      try {
        const updated = await api("/api/prompts/" + id, {
          method: "PUT", body: JSON.stringify({ active: !p.active })
        });
        Object.assign(p, updated);
        renderLibraryList();
        renderSidebar();
        updateCtxPill();
      } catch (err) { toast(err.message, true); }
    }
  }

  function openEditor(type, id) {
    state.editor = { type, id: id || null };
    const isMemory = type === "memory";
    const item = id
      ? (isMemory ? state.memory.find((x) => x.id === id) : state.prompts.find((x) => x.id === id))
      : null;
    editorTitle.textContent = id ? (isMemory ? "Hafızayı Düzenle" : "Yönergeyi Düzenle") : (isMemory ? "Yeni Hafıza" : "Yeni Yönerge");
    editorNameLabel.textContent = isMemory ? "Başlık" : "İsim";
    editorName.value = item?.title || item?.name || "";
    editorContentLabel.textContent = "İçerik";
    editorContent.value = item?.content || "";
    if (isMemory) {
      editorHint.textContent = "Markdown desteklenir. Bu bilgi tüm yanıtlara otomatik olarak eklenecek.";
      editorActiveField.style.display = "";
      editorActive.checked = item ? item.active !== false : true;
    } else {
      editorHint.textContent = "Bu yönerge sistem prompt'u olarak eklenecek. Aktif yönerge tüm yanıtlarda kullanılır.";
      editorActiveField.style.display = "";
      editorActive.checked = item ? !!item.active : true;
    }
    editorDeleteBtn.style.display = id ? "" : "none";
    editorModal.hidden = false;
  }
  function closeEditor() { editorModal.hidden = true; state.editor = null; }

  async function saveEditor() {
    if (!state.editor) return;
    const { type, id } = state.editor;
    const name = editorName.value.trim();
    const content = editorContent.value;
    const active = editorActive.checked;
    if (!name) { toast("İsim gerekli", true); return; }
    try {
      let saved;
      if (type === "memory") {
        if (id) {
          saved = await api("/api/memory/" + id, { method: "PUT", body: JSON.stringify({ title: name, content, active }) });
          const idx = state.memory.findIndex((x) => x.id === id);
          if (idx !== -1) state.memory[idx] = saved;
        } else {
          saved = await api("/api/memory", { method: "POST", body: JSON.stringify({ title: name, content, active }) });
          state.memory.unshift(saved);
        }
      } else {
        if (id) {
          saved = await api("/api/prompts/" + id, { method: "PUT", body: JSON.stringify({ name, content, active }) });
          const idx = state.prompts.findIndex((x) => x.id === id);
          if (idx !== -1) state.prompts[idx] = saved;
        } else {
          saved = await api("/api/prompts", { method: "POST", body: JSON.stringify({ name, content, active }) });
          state.prompts.unshift(saved);
        }
      }
      renderLibraryTabs();
      renderLibraryList();
      renderSidebar();
      updateCtxPill();
      closeEditor();
      toast(id ? "Güncellendi" : "Eklendi");
    } catch (err) { toast(err.message, true); }
  }

  async function deleteEditor() {
    if (!state.editor || !state.editor.id) return;
    if (!confirm("Bu öğe silinsin mi?")) return;
    const { type, id } = state.editor;
    try {
      await api("/api/" + (type === "memory" ? "memory" : "prompts") + "/" + id, { method: "DELETE" });
      if (type === "memory") state.memory = state.memory.filter((x) => x.id !== id);
      else state.prompts = state.prompts.filter((x) => x.id !== id);
      renderLibraryTabs();
      renderLibraryList();
      renderSidebar();
      updateCtxPill();
      closeEditor();
      toast("Silindi");
    } catch (err) { toast(err.message, true); }
  }

  document.querySelectorAll(".lib-tab").forEach((t) => {
    t.addEventListener("click", () => { state.libraryTab = t.dataset.tab; renderLibraryTabs(); renderLibraryList(); });
  });
  libNewBtn.addEventListener("click", () => openEditor(state.libraryTab));
  openLibraryBtn.addEventListener("click", openLibrary);
  editorSaveBtn.addEventListener("click", saveEditor);
  editorDeleteBtn.addEventListener("click", deleteEditor);
  document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener("click", (e) => {
    const m = e.target.closest(".modal");
    if (m) m.hidden = true;
  }));

  // ============== Settings ==============
  function openSettings() {
    tempRange.value = state.settings.temperature;
    tempVal.textContent = Number(state.settings.temperature).toFixed(2);
    deepCheckbox.checked = state.settings.deepAnalysis !== false;
    settingsAccount.textContent = state.user ? `${state.user.name} · ${state.user.email}` : "—";
    settingsModal.hidden = false;
  }
  function closeSettings() { settingsModal.hidden = true; }
  settingsBtn.addEventListener("click", () => { openSettings(); closeSidebar(); });

  tempRange.addEventListener("input", () => { tempVal.textContent = Number(tempRange.value).toFixed(2); });
  saveSettingsBtn.addEventListener("click", async () => {
    state.settings.temperature = Number(tempRange.value);
    state.settings.deepAnalysis = deepCheckbox.checked;
    await saveSettingsRemote();
    closeSettings();
    updateCtxPill();
    toast("Ayarlar kaydedildi");
  });

  clearAllBtn.addEventListener("click", async () => {
    if (!confirm("Tüm sohbetler silinecek. Emin misin?")) return;
    for (const c of state.conversations) {
      try { await api("/api/conversations/" + c.id, { method: "DELETE" }); } catch (_) {}
    }
    state.conversations = [];
    state.activeId = null;
    await newConversation();
    closeSettings();
    toast("Tüm sohbetler silindi");
  });

  // ============== Export ==============
  function exportActive() {
    const conv = getActive();
    if (!conv || !conv.messages || conv.messages.length === 0) { toast("Dışa aktarılacak rapor yok"); return; }
    const lines = [`# ${conv.title}`, "", `_Oluşturulma: ${new Date(conv.createdAt).toLocaleString("tr-TR")}_`, ""];
    conv.messages.forEach((m) => {
      const who = m.role === "user" ? "**Kullanıcı**" : "**Sentra**";
      lines.push(`## ${who}`, "", m.content, "");
    });
    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (conv.title || "rapor").replace(/[^\wçğıöşüÇĞİÖŞÜ\- ]/g, "").slice(0, 60) + ".md";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Markdown indirildi");
  }
  exportBtn.addEventListener("click", exportActive);

  // ============== PDF Export (print dialog) ==============
  function exportPDF() {
    const conv = getActive();
    if (!conv || !conv.messages || conv.messages.length === 0) {
      toast("PDF'e aktarılacak rapor yok");
      return;
    }
    setTimeout(() => {
      window.print();
    }, 100);
    toast("Yazdırma iletişim kutusunda 'PDF olarak kaydet' seçin");
  }
  pdfBtn.addEventListener("click", exportPDF);

  // ============== File Upload (Attachments) ==============
  function humanSize(bytes) {
    if (bytes < 1024) return bytes + "B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
    return (bytes / 1024 / 1024).toFixed(2) + "MB";
  }
  function renderAttachmentChips() {
    const items = [
      ...state.images.map((img, i) => ({ kind: "image", img, i, key: `i${i}` })),
      ...state.attachments.map((a, i) => ({ kind: "file", a, i, key: `f${i}` }))
    ];
    if (items.length === 0) {
      attachmentChips.innerHTML = "";
      return;
    }
    attachmentChips.innerHTML = items.map((it) => {
      if (it.kind === "image") {
        const img = it.img;
        return `
          <div class="attachment-chip image-chip" title="${escHtml(img.name)} (${humanSize(img.size)})">
            <span class="chip-thumb" style="background-image:url('${escHtml(img.dataUrl)}')"></span>
            <span class="chip-name">${escHtml(img.name)}</span>
            <span class="chip-size">${humanSize(img.size)}</span>
            <button class="chip-remove" data-rm-img="${it.i}" title="Kaldır" aria-label="Kaldır">
              <svg viewBox="0 0 24 24" width="11" height="11"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        `;
      }
      const a = it.a;
      return `
        <div class="attachment-chip" title="${escHtml(a.name)} (${humanSize(a.size)})">
          <span class="chip-name">${escHtml(a.name)}</span>
          <span class="chip-size">${humanSize(a.size)}</span>
          <button class="chip-remove" data-rm-file="${it.i}" title="Kaldır" aria-label="Kaldır">
            <svg viewBox="0 0 24 24" width="11" height="11"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
      `;
    }).join("");
    attachmentChips.querySelectorAll("[data-rm-img]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.images.splice(Number(btn.dataset.rmImg), 1);
        renderAttachmentChips();
      });
    });
    attachmentChips.querySelectorAll("[data-rm-file]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.attachments.splice(Number(btn.dataset.rmFile), 1);
        renderAttachmentChips();
      });
    });
  }
  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) { toast(`${f.name} çok büyük (max 5MB)`, true); continue; }
      try {
        const text = await f.text();
        const lower = f.name.toLowerCase();
        let processedContent = text;
        let type = "text";
        if (lower.endsWith(".json") || f.type === "application/json") {
          try {
            const parsed = JSON.parse(text);
            processedContent = JSON.stringify(parsed, null, 2);
            type = "json";
          } catch (_) { type = "json-invalid"; }
        } else if (lower.endsWith(".csv")) {
          type = "csv";
        } else if (lower.endsWith(".md")) {
          type = "markdown";
        }
        state.attachments.push({ name: f.name, size: f.size, content: processedContent, type });
        toast(`${f.name} eklendi`);
      } catch (err) {
        toast(`${f.name} okunamadı: ${err.message}`, true);
      }
    }
    fileInput.value = "";
    renderAttachmentChips();
    inputEl.focus();
  });

  // ============== Image Upload (Vision) ==============
  imageBtn.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) await processImageFile(f);
    imageInput.value = "";
    inputEl.focus();
  });

  async function processImageFile(file) {
    if (!file.type || !file.type.startsWith("image/")) {
      toast(`${file.name} bir görsel değil`, true);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast(`${file.name} çok büyük (max 8MB)`, true);
      return;
    }
    if (state.images.length >= 4) {
      toast("En fazla 4 görsel eklenebilir", true);
      return;
    }
    try {
      const dataUrl = await fileToDataURL(file);
      // Sunucuya yükle
      const res = await api("/api/upload", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, contentType: file.type, data: dataUrl })
      });
      state.images.push({
        name: file.name,
        size: file.size,
        mime: file.type,
        dataUrl,
        url: res.url
      });
      renderAttachmentChips();
      toast(`📎 ${file.name} eklendi`);
    } catch (err) {
      toast(`Görsel yüklenemedi: ${err.message}`, true);
    }
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("Dosya okunamadı"));
      r.readAsDataURL(file);
    });
  }

  // ============== Drag & Drop (sadece composer alanı) ==============
  function isFileDrag(e) {
    if (!e.dataTransfer) return false;
    const types = e.dataTransfer.types;
    if (!types) return false;
    for (let i = 0; i < types.length; i++) {
      if (types[i] === "Files") return true;
    }
    return false;
  }
  // Composer'a giren/çıkan dosya sürükleme olaylarını dinle
  let composerDragDepth = 0;
  composerEl.addEventListener("dragenter", (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    composerDragDepth++;
    composerEl.classList.add("drag-over");
  });
  composerEl.addEventListener("dragover", (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  composerEl.addEventListener("dragleave", (e) => {
    if (!isFileDrag(e)) return;
    composerDragDepth--;
    if (composerDragDepth <= 0) {
      composerDragDepth = 0;
      composerEl.classList.remove("drag-over");
    }
  });
  composerEl.addEventListener("drop", async (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    composerDragDepth = 0;
    composerEl.classList.remove("drag-over");
    const files = Array.from(e.dataTransfer.files || []);
    for (const f of files) {
      if (f.type && f.type.startsWith("image/")) {
        await processImageFile(f);
      } else {
        const dt = new DataTransfer();
        dt.items.add(f);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    inputEl.focus();
  });
  // Composer dışına bırakılan dosyaları yoksay (tarayıcının default davranışı dosyayı açar)
  window.addEventListener("dragover", (e) => { if (isFileDrag(e)) e.preventDefault(); });
  window.addEventListener("drop", (e) => { if (isFileDrag(e)) e.preventDefault(); });
  // Textarea'ya yapıştırılan görsel
  inputEl.addEventListener("paste", async (e) => {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items || []);
    for (const it of items) {
      if (it.kind === "file" && it.type && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) {
          e.preventDefault();
          await processImageFile(f);
        }
      }
    }
  });

  // ============== URL Detection in input ==============
  function detectUrlsInInput() {
    const text = inputEl.value;
    const re = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    return text.match(re) || [];
  }

  // ============== Fetch Indicator (URL otomatik çekildi bildirimi) ==============
  function showFetchIndicator(items) {
    if (!items || items.length === 0) return;
    const msgs = ensureMessagesContainer();
    // Streaming mesajın hemen altına, kendi user mesajının üstüne ekle
    // (mevcut streaming wrap'tan önce)
    const streaming = msgs.querySelector(".msg.assistant.streaming");
    items.forEach((it) => {
      const card = document.createElement("div");
      card.className = "fetch-card";
      if (it.ok) {
        card.innerHTML = `
          <span class="fetch-url">${escHtml(it.url)}</span>
          <span class="fetch-meta">${escHtml(it.format || "text")} · ${humanSize(it.size || 0)}</span>
        `;
      } else {
        card.classList.add("fetch-error");
        card.innerHTML = `
          <span class="fetch-url">${escHtml(it.url)}</span>
          <span class="fetch-meta">hata: ${escHtml(it.error || "bilinmeyen")}</span>
        `;
      }
      if (streaming) {
        msgs.insertBefore(card, streaming);
      } else {
        msgs.appendChild(card);
      }
    });
    autoScroll();
  }

  // ============== UI ==============
  function autoResize() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 240) + "px";
  }
  function setStatus(kind) { statusDot.classList.remove("ok", "err", "busy"); if (kind) statusDot.classList.add(kind); }
  function openSidebar() { sidebarEl.classList.add("open"); backdrop.hidden = false; }
  function closeSidebar() { sidebarEl.classList.remove("open"); backdrop.hidden = true; }
  function toast(msg, isErr) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.classList.toggle("err", !!isErr);
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  // ============== Wire up ==============
  composerEl.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.sending) { stopGeneration(); return; }
    sendMessage(inputEl.value);
    inputEl.value = ""; autoResize();
  });
  inputEl.addEventListener("input", autoResize);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (state.sending) { stopGeneration(); return; }
      sendMessage(inputEl.value);
      inputEl.value = ""; autoResize();
    }
  });
  newChatBtn.addEventListener("click", newConversation);
  menuBtn.addEventListener("click", openSidebar);
  closeSidebarBtn.addEventListener("click", closeSidebar);
  backdrop.addEventListener("click", closeSidebar);

  convListEl.addEventListener("click", (e) => {
    const delBtn = e.target.closest("[data-del]");
    if (delBtn) { deleteConv(delBtn.dataset.del, e); return; }
    const item = e.target.closest(".nav-item");
    if (item) switchTo(item.dataset.id);
  });
  convListEl.addEventListener("dblclick", (e) => {
    const item = e.target.closest(".nav-item");
    if (item) renameConv(item.dataset.id, e);
  });

  // Derin Analiz toggle: <label> input'u sarmaladığı için tarayıcı checkbox'ı
  // otomatik toggle eder. Sadece change event'ini dinle, manuel toggle yapma.
  deepCheckbox.addEventListener("change", () => {
    state.settings.deepAnalysis = deepCheckbox.checked;
    saveSettingsRemote();
    updateCtxPill();
  });

  contentEl.addEventListener("click", async (e) => {
    const card = e.target.closest(".quick-card");
    if (card) {
      const base = card.dataset.prompt || "";
      inputEl.value = base;
      inputEl.focus();
      autoResize();
      inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
      return;
    }
    // Persona card → add as prompt + activate + new chat
    const persona = e.target.closest(".persona-card");
    if (persona) {
      await activatePersona(persona.dataset.persona, false);
      return;
    }
    // "Tüm şablonlar" link
    const tplLink = e.target.closest("#openLibraryFromWelcome");
    if (tplLink) {
      openLibrary("templates");
      return;
    }
  });

  async function activatePersona(tplId, openAfter) {
    const T = window.SENTRA_TEMPLATES;
    if (!T) return;
    const p = T.personas.find((x) => x.id === tplId);
    if (!p) return;
    try {
      // If already exists, activate it
      const existing = state.prompts.find((x) => x.name === p.name);
      let saved;
      if (existing) {
        saved = await api("/api/prompts/" + existing.id, { method: "PUT", body: JSON.stringify({ active: true }) });
        Object.assign(existing, saved);
        for (const other of state.prompts) {
          if (other.id !== saved.id && other.active) {
            const updated = await api("/api/prompts/" + other.id, { method: "PUT", body: JSON.stringify({ active: false }) });
            Object.assign(other, updated);
          }
        }
      } else {
        for (const other of state.prompts) {
          if (other.active) {
            const updated = await api("/api/prompts/" + other.id, { method: "PUT", body: JSON.stringify({ active: false }) });
            Object.assign(other, updated);
          }
        }
        saved = await api("/api/prompts", { method: "POST", body: JSON.stringify({ name: p.name, content: p.content, active: true }) });
        state.prompts.unshift(saved);
      }
      updateCtxPill();
      renderSidebar();

      // Auto-start a new conversation if current is empty
      const conv = getActive();
      if (!conv || (conv.messages && conv.messages.length > 0)) {
        await newConversation();
      }
      toast(`${p.icon} ${p.name} yönergesi aktif — yeni rapor başlatıldı`);
      inputEl.focus();
      if (openAfter) openLibrary("prompts");
    } catch (err) { toast(err.message, true); }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!settingsModal.hidden) { settingsModal.hidden = true; return; }
      if (!editorModal.hidden) { editorModal.hidden = true; return; }
      if (!libraryModal.hidden) { libraryModal.hidden = true; return; }
      if (sidebarEl.classList.contains("open")) { closeSidebar(); return; }
      if (state.sending) stopGeneration();
    }
  });

  // ============== Init ==============
  checkSession();
})();
