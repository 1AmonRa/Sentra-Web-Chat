require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const SENTRA_API_BASE = process.env.SENTRA_API_BASE;
const SENTRA_API_KEY = process.env.SENTRA_API_KEY;
const SENTRA_MODEL = process.env.SENTRA_MODEL;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_DAYS = Number(process.env.SESSION_DAYS) || 30;

if (!SENTRA_API_BASE || !SENTRA_API_KEY || !SENTRA_MODEL) {
  console.error('Hata: SENTRA_API_BASE, SENTRA_API_KEY ve SENTRA_MODEL .env dosyasında tanımlanmalı.');
  process.exit(1);
}

// ============== Data layer ==============
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
ensureDir(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');

function userDir(userId) { return path.join(DATA_DIR, userId); }
function ensureUserDir(userId) { ensureDir(userDir(userId)); ensureDir(path.join(userDir(userId), 'memory')); ensureDir(path.join(userDir(userId), 'prompts')); }

function fileJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) { return fallback; }
}

async function readJson(p, fallback) {
  try {
    const raw = await fsp.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch (_) { return fallback; }
}

async function writeJson(p, data) {
  // Parent dizini otomatik oluştur — writeJson her yerde güvenle çağrılabilsin
  const parent = path.dirname(p);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
  await fsp.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
}

function readUsers() {
  const list = fileJson(USERS_FILE, []);
  // Migration: eski kullanıcılara varsayılanları ata (sessizce, diske yazmadan — lazy migration)
  for (const u of list) {
    if (typeof u.role !== 'string') u.role = 'user';
    if (typeof u.approved !== 'boolean') u.approved = true;
  }
  return list;
}
async function writeUsers(list) { await writeJson(USERS_FILE, list); }

const uid = (prefix = 'x') => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function sanitizeUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role || 'user',
    approved: u.approved !== false,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt || null
  };
}

function emailValid(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// .env'deki ADMIN_BOOTSTRAP_EMAILS listesini oku; sunucu başlangıcında otomatik admin yapar
function applyBootstrapAdmins() {
  const raw = process.env.ADMIN_BOOTSTRAP_EMAILS || '';
  const emails = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) return;
  const list = readUsers();
  let changed = false;
  for (const u of list) {
    if (emails.includes(u.email.toLowerCase()) && (u.role !== 'admin' || u.approved !== true)) {
      u.role = 'admin';
      u.approved = true;
      changed = true;
      console.log(`[bootstrap] admin rolü verildi: ${u.email}`);
    }
  }
  if (changed) writeJson(USERS_FILE, list);
}

// ============== Middleware ==============
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (_) {
    res.status(401).json({ error: 'Geçersiz oturum' });
  }
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 86400 * 1000,
    path: '/'
  });
}

// Admin kontrolü: giriş yapmış + role='admin' + approved=true
async function requireAdmin(req, res, next) {
  const users = readUsers();
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Bu işlem yönetici yetkisi gerektirir' });
  if (user.approved === false) return res.status(403).json({ error: 'Hesabınız onaylanmamış' });
  req.adminUser = user;
  next();
}

// ============== Auth ==============
// Yeni kayıtlar admin onayı bekler (env REGISTER_REQUIRES_APPROVAL=true ise; varsayılan true)
const REGISTER_REQUIRES_APPROVAL = process.env.REGISTER_REQUIRES_APPROVAL !== 'false';

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!emailValid(email)) return res.status(400).json({ error: 'Geçerli bir e-posta girin.' });
  if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Ad gerekli.' });

  const users = readUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.trim().toLowerCase();
  // Bootstrap admin listesinde mi? otomatik admin yap
  const isBootstrapAdmin = (process.env.ADMIN_BOOTSTRAP_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).includes(normalizedEmail);

  const user = {
    id: uid('u'),
    email: normalizedEmail,
    name: name.trim().slice(0, 60),
    passwordHash,
    role: isBootstrapAdmin ? 'admin' : 'user',
    approved: isBootstrapAdmin ? true : !REGISTER_REQUIRES_APPROVAL,
    createdAt: Date.now(),
    lastLoginAt: null
  };
  users.push(user);
  await writeUsers(users);
  ensureUserDir(user.id);

  if (user.approved) {
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
    setAuthCookie(res, token);
    return res.json({ user: sanitizeUser(user) });
  }
  // Onay bekliyor: oturum açma
  return res.status(202).json({
    pendingApproval: true,
    message: 'Kayıt alındı. Yönetici onayından sonra giriş yapabilirsiniz.'
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'E-posta ve şifre gerekli.' });

  const users = readUsers();
  const user = users.find((u) => u.email === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });

  if (user.approved === false) {
    return res.status(403).json({
      error: 'Hesabınız henüz yönetici tarafından onaylanmamış. Onay verildikten sonra tekrar deneyin.',
      code: 'NOT_APPROVED'
    });
  }

  user.lastLoginAt = Date.now();
  await writeUsers(users);

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
  setAuthCookie(res, token);
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const users = readUsers();
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
  res.json({ user: sanitizeUser(user) });
});

// ============== Admin ==============
// Liste: tüm kullanıcılar (admin hariç, sadece diğer kullanıcılar)
app.get('/api/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  const users = readUsers();
  res.json(users.map(sanitizeUser).sort((a, b) => a.createdAt - b.createdAt));
});

// Kullanıcı güncelle (ad, e-posta, rol, onay)
app.patch('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const target = req.params.id;
  if (target === req.userId) {
    return res.status(400).json({ error: 'Kendi hesabınızı bu şekilde değiştiremezsiniz' });
  }
  const users = readUsers();
  const user = users.find((u) => u.id === target);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  const { name, email, role, approved } = req.body || {};
  if (typeof name === 'string' && name.trim()) user.name = name.trim().slice(0, 60);
  if (typeof email === 'string' && emailValid(email)) {
    const normalized = email.trim().toLowerCase();
    if (users.some((u) => u.id !== target && u.email.toLowerCase() === normalized)) {
      return res.status(409).json({ error: 'Bu e-posta başka bir kullanıcıda kayıtlı' });
    }
    user.email = normalized;
  }
  if (role === 'admin' || role === 'user') user.role = role;
  if (typeof approved === 'boolean') user.approved = approved;
  user.updatedAt = Date.now();

  await writeUsers(users);
  res.json(sanitizeUser(user));
});

// Şifre sıfırlama (admin tarafından)
app.post('/api/admin/users/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  const target = req.params.id;
  const users = readUsers();
  const user = users.find((u) => u.id === target);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  const { newPassword } = req.body || {};
  let pw = typeof newPassword === 'string' ? newPassword : '';
  if (!pw || pw.length < 6) {
    // Otomatik rastgele şifre üret
    pw = crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 10);
  }
  user.passwordHash = await bcrypt.hash(pw, 10);
  user.updatedAt = Date.now();
  await writeUsers(users);
  res.json({ ok: true, temporaryPassword: pw });
});

// Kullanıcı sil
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const target = req.params.id;
  if (target === req.userId) {
    return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
  }
  const users = readUsers();
  const user = users.find((u) => u.id === target);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  const remaining = users.filter((u) => u.id !== target);
  await writeUsers(remaining);

  // Kullanıcı verilerini de sil
  try { await fsp.rm(userDir(target), { recursive: true, force: true }); } catch (_) {}

  res.json({ ok: true });
});

// ============== Per-user helpers ==============
async function listDir(dir, ext) {
  try {
    const files = await fsp.readdir(dir);
    const out = [];
    for (const f of files) {
      if (ext && !f.endsWith(ext)) continue;
      const p = path.join(dir, f);
      const stat = await fsp.stat(p);
      if (!stat.isFile()) continue;
      out.push(p);
    }
    return out;
  } catch (_) { return []; }
}

// ============== Conversations ==============
app.get('/api/conversations', requireAuth, async (req, res) => {
  const p = path.join(userDir(req.userId), 'conversations.json');
  const list = await readJson(p, []);
  res.json(list.sort((a, b) => b.updatedAt - a.updatedAt));
});

app.post('/api/conversations', requireAuth, async (req, res) => {
  const { title, messages, systemPromptId, activeMemoryIds } = req.body || {};
  const conv = {
    id: uid('c'),
    title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : 'Yeni rapor',
    messages: Array.isArray(messages) ? messages : [],
    systemPromptId: systemPromptId || null,
    activeMemoryIds: Array.isArray(activeMemoryIds) ? activeMemoryIds : null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const p = path.join(userDir(req.userId), 'conversations.json');
  const list = await readJson(p, []);
  list.unshift(conv);
  await writeJson(p, list);
  res.json(conv);
});

app.put('/api/conversations/:id', requireAuth, async (req, res) => {
  const p = path.join(userDir(req.userId), 'conversations.json');
  const list = await readJson(p, []);
  const idx = list.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Konuşma bulunamadı' });

  const allowed = ['title', 'messages', 'systemPromptId', 'activeMemoryIds'];
  for (const k of allowed) {
    if (k in (req.body || {})) list[idx][k] = req.body[k];
  }
  list[idx].updatedAt = Date.now();
  await writeJson(p, list);
  res.json(list[idx]);
});

app.delete('/api/conversations/:id', requireAuth, async (req, res) => {
  const p = path.join(userDir(req.userId), 'conversations.json');
  const list = await readJson(p, []);
  const next = list.filter((c) => c.id !== req.params.id);
  await writeJson(p, next);
  res.json({ ok: true });
});

// ============== Memory ==============
async function listMemory(userId) {
  const dir = path.join(userDir(userId), 'memory');
  const files = await listDir(dir, '.json');
  const out = [];
  for (const f of files) {
    const data = await readJson(f, null);
    if (data) out.push(data);
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

app.get('/api/memory', requireAuth, async (req, res) => {
  res.json(await listMemory(req.userId));
});

app.post('/api/memory', requireAuth, async (req, res) => {
  const { title, content, active } = req.body || {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'Başlık gerekli.' });
  const item = {
    id: uid('m'),
    title: title.trim().slice(0, 100),
    content: typeof content === 'string' ? content : '',
    active: active !== false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  ensureUserDir(req.userId);
  await writeJson(path.join(userDir(req.userId), 'memory', item.id + '.json'), item);
  res.json(item);
});

app.put('/api/memory/:id', requireAuth, async (req, res) => {
  const p = path.join(userDir(req.userId), 'memory', req.params.id + '.json');
  const item = await readJson(p, null);
  if (!item) return res.status(404).json({ error: 'Bulunamadı' });
  const { title, content, active } = req.body || {};
  if (typeof title === 'string' && title.trim()) item.title = title.trim().slice(0, 100);
  if (typeof content === 'string') item.content = content;
  if (typeof active === 'boolean') item.active = active;
  item.updatedAt = Date.now();
  await writeJson(p, item);
  res.json(item);
});

app.delete('/api/memory/:id', requireAuth, async (req, res) => {
  const p = path.join(userDir(req.userId), 'memory', req.params.id + '.json');
  try { await fsp.unlink(p); } catch (_) {}
  res.json({ ok: true });
});

// ============== Prompts ==============
async function listPrompts(userId) {
  const dir = path.join(userDir(userId), 'prompts');
  const files = await listDir(dir, '.json');
  const out = [];
  for (const f of files) {
    const data = await readJson(f, null);
    if (data) out.push(data);
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

app.get('/api/prompts', requireAuth, async (req, res) => {
  res.json(await listPrompts(req.userId));
});

app.post('/api/prompts', requireAuth, async (req, res) => {
  const { name, content, active } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'İsim gerekli.' });
  const item = {
    id: uid('p'),
    name: name.trim().slice(0, 60),
    content: typeof content === 'string' ? content : '',
    active: active === true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  ensureUserDir(req.userId);
  await writeJson(path.join(userDir(req.userId), 'prompts', item.id + '.json'), item);
  res.json(item);
});

app.put('/api/prompts/:id', requireAuth, async (req, res) => {
  const p = path.join(userDir(req.userId), 'prompts', req.params.id + '.json');
  const item = await readJson(p, null);
  if (!item) return res.status(404).json({ error: 'Bulunamadı' });
  const { name, content, active } = req.body || {};
  if (typeof name === 'string' && name.trim()) item.name = name.trim().slice(0, 60);
  if (typeof content === 'string') item.content = content;
  if (typeof active === 'boolean') {
    // Enforce single active: clear others
    if (active) {
      const dir = path.dirname(p);
      const files = await listDir(dir, '.json');
      for (const f of files) {
        const other = await readJson(f, null);
        if (other && other.id !== item.id && other.active) {
          other.active = false;
          other.updatedAt = Date.now();
          await writeJson(f, other);
        }
      }
    }
    item.active = active;
  }
  item.updatedAt = Date.now();
  await writeJson(p, item);
  res.json(item);
});

app.delete('/api/prompts/:id', requireAuth, async (req, res) => {
  const p = path.join(userDir(req.userId), 'prompts', req.params.id + '.json');
  try { await fsp.unlink(p); } catch (_) {}
  res.json({ ok: true });
});

// ============== Settings ==============
app.get('/api/settings', requireAuth, async (req, res) => {
  const p = path.join(userDir(req.userId), 'settings.json');
  const defaults = { temperature: 0.4, deepAnalysis: true };
  const s = await readJson(p, defaults);
  res.json({ ...defaults, ...s });
});

app.put('/api/settings', requireAuth, async (req, res) => {
  const p = path.join(userDir(req.userId), 'settings.json');
  const cur = await readJson(p, {});
  const next = { ...cur, ...(req.body || {}) };
  await writeJson(p, next);
  res.json(next);
});

// ============== Chat (builds context from memory + active prompt + deep analysis) ==============
app.post('/api/chat', requireAuth, async (req, res) => {
  const { messages, temperature, topP, systemPromptId, activeMemoryIds } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages alanı zorunlu ve boş olmamalı.' });
  }

  // Accept content as string OR array (for vision: [{type:'text'|'image_url', ...}])
  const cleaned = messages
    .filter((m) => m && typeof m.role === 'string' && (typeof m.content === 'string' || Array.isArray(m.content)))
    .map((m) => {
      // String content'i olduğu gibi geçir (görsel mesajlar için sorun yok, sadece URL'leri kabul et)
      if (typeof m.content === 'string') return { role: m.role, content: m.content };
      // Array content: validate parts
      const parts = m.content.filter((p) => p && (p.type === 'text' || p.type === 'image_url'));
      return { role: m.role, content: parts };
    })
    .filter((m) => {
      if (typeof m.content === 'string') return m.content.trim().length > 0;
      return m.content.length > 0;
    });
  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'Geçerli mesaj bulunamadı.' });
  }

  // Build system context
  const settings = await readJson(path.join(userDir(req.userId), 'settings.json'), { temperature: 0.4, deepAnalysis: true });
  const memoryList = await listMemory(req.userId);
  const promptList = await listPrompts(req.userId);

  const activeMem = activeMemoryIds == null
    ? memoryList.filter((m) => m.active !== false)
    : memoryList.filter((m) => Array.isArray(activeMemoryIds) && activeMemoryIds.includes(m.id));

  const activePrompt = systemPromptId
    ? promptList.find((p) => p.id === systemPromptId)
    : promptList.find((p) => p.active);

  const sysMessages = [];
  if (activePrompt && activePrompt.content && activePrompt.content.trim()) {
    sysMessages.push({ role: 'system', content: activePrompt.content });
  }
  if (settings.deepAnalysis) {
    sysMessages.push({ role: 'system', content: DEEP_SYSTEM_PROMPT });
  }
  if (activeMem.length > 0) {
    const memContent = activeMem
      .map((m) => `### ${m.title}\n${m.content}`)
      .join('\n\n---\n\n');
    sysMessages.push({
      role: 'system',
      content: `Kullanıcının uzun süreli hafıza dosyaları (bilgi tabanı). Bu bilgileri kullanıcı hakkında, şirketi/sektörü/konuyu daha iyi anlamak ve kişiselleştirilmiş yanıt vermek için referans al:\n\n${memContent}`
    });
  }

  const finalMessages = sysMessages.concat(cleaned);
  const finalTemp = typeof temperature === 'number' ? temperature : settings.temperature;

  // Auto-fetch: kullanıcının son mesajındaki URL'leri çek, bağlama ekle
  const fetchResults = [];
  const lastUserMsg = [...finalMessages].reverse().find((m) => m.role === "user");
  if (lastUserMsg) {
    // Extract text content (string or array of parts)
    const lastUserText = typeof lastUserMsg.content === 'string'
      ? lastUserMsg.content
      : (lastUserMsg.content || []).filter((p) => p.type === 'text').map((p) => p.text).join(' ');
    const urls = extractUrls(lastUserText).slice(0, 3);
    if (urls.length > 0) {
      for (const url of urls) {
        fetchResults.push(await fetchUrlSafe(url));
      }
      const toolContext = {
        role: "system",
        content: [
          "📡 Kullanıcının paylaştığı URL'lerden otomatik olarak veri çekildi.",
          "Aşağıdaki verileri kullanıcının isteğine göre analiz et, tablola, yorumla.",
          "Veri kaynağını belirt. Çekilemeyen URL varsa kullanıcıya bildir.",
          "",
          ...fetchResults.map((r) => r.ok
            ? `### ✅ ${r.url}\n- Format: ${r.format}, Boyut: ${r.size} bytes, HTTP: ${r.status}\n\`\`\`\n${truncate(r.content, 20000)}\n\`\`\``
            : `### ❌ ${r.url}\nHata: ${r.error}`
          )
        ].join("\n\n")
      };
      // Insert after the last user message
      const userIdx = finalMessages.lastIndexOf(lastUserMsg);
      finalMessages.splice(userIdx + 1, 0, toolContext);
    }
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const writeSse = (event, data) => {
    if (res.writableEnded) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_) { /* ignore */ }
  };
  const safeEnd = () => {
    if (res.writableEnded) return;
    try { res.end(); } catch (_) { /* ignore */ }
  };

  writeSse('open', {
    model: SENTRA_MODEL,
    context: {
      memory: activeMem.length,
      prompt: activePrompt?.id || null,
      deep: !!settings.deepAnalysis,
      fetched: fetchResults.map((r) => ({ url: r.url, ok: r.ok, format: r.format, size: r.size, error: r.error }))
    }
  });

  try {
    const upstream = await fetch(`${SENTRA_API_BASE.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENTRA_API_KEY}`
      },
      body: JSON.stringify({
        model: SENTRA_MODEL,
        messages: finalMessages,
        stream: true,
        ...(typeof finalTemp === 'number' ? { temperature: finalTemp } : {}),
        ...(typeof topP === 'number' ? { top_p: topP } : {})
      })
    });

    if (!upstream.ok) {
      let detail = '';
      try { detail = await upstream.text(); } catch (_) { /* ignore */ }
      writeSse('error', {
        message: `Upstream hata: ${upstream.status} ${upstream.statusText}`,
        detail: detail.slice(0, 2000)
      });
      return safeEnd();
    }

    const ctype = upstream.headers.get('content-type') || '';
    const isStream = ctype.includes('text/event-stream');

    if (!isStream || !upstream.body) {
      const text = await upstream.text();
      try {
        const payload = JSON.parse(text);
        const msgContent = payload?.choices?.[0]?.message?.content;
        if (typeof msgContent === 'string' && msgContent.length > 0) {
          writeSse('token', { delta: msgContent });
        } else {
          writeSse('error', { message: 'Upstream beklenmeyen yanıt formatı', detail: text.slice(0, 2000) });
        }
      } catch (_) {
        writeSse('error', { message: 'Upstream yanıtı ayrıştırılamadı', detail: text.slice(0, 2000) });
      }
      writeSse('done', { content: '' });
      return safeEnd();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let totalContent = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const rawLine = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        if (!rawLine) continue;
        const line = rawLine.startsWith('data:') ? rawLine.slice(5).trim() : rawLine;
        if (!line) continue;
        if (line === '[DONE]') {
          writeSse('done', { content: totalContent });
          return safeEnd();
        }
        let payload;
        try { payload = JSON.parse(line); } catch (_) { continue; }
        const delta = payload?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length > 0) {
          totalContent += delta;
          writeSse('token', { delta });
        }
        const finishReason = payload?.choices?.[0]?.finish_reason;
        if (finishReason) writeSse('finish', { reason: finishReason });
      }
    }
    writeSse('done', { content: totalContent });
    safeEnd();
  } catch (err) {
    const msg = (err && err.message) || 'Bilinmeyen hata';
    writeSse('error', { message: `Sunucu hatası: ${msg}` });
    safeEnd();
  }
});

// ============== Public ==============
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: SENTRA_MODEL, apiBase: SENTRA_API_BASE });
});

// ============== URL / Web fetch (tool) ==============
function extractUrls(text) {
  if (!text) return [];
  const re = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const matches = text.match(re) || [];
  return [...new Set(matches)].filter((url) => {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (!/^https?:$/.test(u.protocol)) return false;
      if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0" || host === "169.254.169.254") return false;
      if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
      if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) return false;
      if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return false;
      return true;
    } catch (_) { return false; }
  });
}

function truncate(s, n) {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n) + "\n... (kırpıldı)";
}

async function fetchUrlSafe(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Sentra-Report-Agent/1.0", "Accept": "application/json,text/csv,text/html,text/plain,*/*" },
      redirect: "follow"
    });
    if (!response.ok) return { ok: false, url, error: `HTTP ${response.status} ${response.statusText}` };
    const ctype = response.headers.get("content-type") || "";
    let text = await response.text();
    if (text.length > 200000) text = truncate(text, 200000);

    let format = "text";
    if (ctype.includes("application/json") || url.endsWith(".json")) {
      try {
        const parsed = JSON.parse(text);
        text = JSON.stringify(parsed, null, 2);
        format = "json";
      } catch (_) { format = "text"; }
    } else if (ctype.includes("text/csv") || url.endsWith(".csv")) {
      format = "csv";
    } else if (ctype.includes("text/html") || url.endsWith(".html") || url.endsWith(".htm")) {
      format = "html";
      text = text
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } else if (ctype.includes("text/")) {
      format = ctype.split(";")[0].split("/")[1] || "text";
    }

    return {
      ok: true,
      url,
      finalUrl: response.url,
      status: response.status,
      contentType: ctype,
      format,
      size: text.length,
      content: text
    };
  } catch (err) {
    if (err.name === "AbortError") return { ok: false, url, error: "Zaman aşımı (15s)" };
    return { ok: false, url, error: err.message || "Bilinmeyen hata" };
  } finally {
    clearTimeout(timeout);
  }
}

app.post("/api/fetch", requireAuth, async (req, res) => {
  const { urls } = req.body || {};
  const list = Array.isArray(urls) ? urls : (typeof req.body?.url === "string" ? [req.body.url] : []);
  if (list.length === 0) return res.status(400).json({ error: "En az bir URL gerekli" });
  if (list.length > 5) return res.status(400).json({ error: "En fazla 5 URL" });

  const valid = extractUrls(list.join("\n"));
  if (valid.length === 0) return res.status(400).json({ error: "Geçerli URL bulunamadı (güvenlik: yerel adresler engelli)" });

  const results = [];
  for (const url of valid) {
    results.push(await fetchUrlSafe(url));
  }
  res.json({ results });
});

// ============== Image Upload (vision) ==============
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

function sanitizeFilename(name) {
  // Sadece alfanumerik, dash, dot, underscore kalsın
  const base = String(name || "image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  return base || "image";
}

app.post("/api/upload", requireAuth, async (req, res) => {
  const { filename, contentType, data } = req.body || {};
  if (!data || typeof data !== "string") {
    return res.status(400).json({ error: "data (base64) gerekli" });
  }
  // data: URL mi yoksa plain base64 mı?
  const m = String(data).match(/^data:([^;]+);base64,(.+)$/);
  let mime, b64;
  if (m) { mime = m[1]; b64 = m[2]; }
  else { mime = contentType || "image/png"; b64 = String(data); }

  if (!ALLOWED_IMAGE_TYPES.has(mime.toLowerCase())) {
    return res.status(400).json({ error: `Geçersiz içerik tipi: ${mime}. İzin verilenler: jpeg, png, gif, webp` });
  }

  let buffer;
  try { buffer = Buffer.from(b64, "base64"); }
  catch (_) { return res.status(400).json({ error: "Geçersiz base64 veri" }); }

  if (buffer.length > MAX_IMAGE_BYTES) {
    return res.status(400).json({ error: `Görsel çok büyük (${humanSize(buffer.length)}, max ${humanSize(MAX_IMAGE_BYTES)})` });
  }
  if (buffer.length < 50) {
    return res.status(400).json({ error: "Görsel verisi çok küçük / bozuk" });
  }

  // Uzantıyı MIME'den al
  const extMap = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp" };
  const ext = extMap[mime.toLowerCase()] || ".png";

  const userUploads = path.join(userDir(req.userId), "uploads");
  ensureDir(userUploads);
  const safeName = sanitizeFilename(filename) || ("image" + ext);
  const finalName = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6) + "_" + safeName.replace(/\.[^.]+$/, "") + ext;
  const fullPath = path.join(userUploads, finalName);

  try {
    await fsp.writeFile(fullPath, buffer);
  } catch (err) {
    return res.status(500).json({ error: "Dosya yazılamadı: " + err.message });
  }

  res.json({
    ok: true,
    url: `/uploads/${req.userId}/${finalName}`,
    mime,
    size: buffer.length,
    filename: safeName
  });
});

function humanSize(bytes) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / 1024 / 1024).toFixed(2) + "MB";
}

// Static serve for user uploads (auth-checked)
app.get("/uploads/:userId/:filename", requireAuth, (req, res) => {
  if (req.userId !== req.params.userId) return res.status(403).json({ error: "Yetkisiz" });
  // Path traversal koruması
  const safeName = path.basename(req.params.filename);
  const fullPath = path.join(userDir(req.userId), "uploads", safeName);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "Bulunamadı" });
  // MIME type'ı dosya uzantısından belirle
  const ext = path.extname(safeName).toLowerCase();
  const mimes = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp" };
  res.setHeader("Content-Type", mimes[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=3600");
  fs.createReadStream(fullPath).pipe(res);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Bulunamadı' });
});

const DEEP_SYSTEM_PROMPT = [
  "Sen deneyimli bir kurumsal analiz araştırmacısı ve stratejik rapor yazarısın.",
  "Kullanıcı bir şirket, sektör, rakip veya iş konusu sorduğunda:",
  "1) Yapılandırılmış, derinlemesine ve veri odaklı bir rapor üret.",
  "2) Net bölümler kullan: Yönetici Özeti, Genel Görünüm, Güçlü Yönler, Zayıf Yönler, Fırsatlar, Tehditler, Stratejik Öneriler, Sonuç.",
  "3) Mümkün olduğunca tablo, madde işaretleri ve alt başlıklar kullan.",
  "4) Sayısal veri, oran, pazar payı ve karşılaştırma ver.",
  "5) Sonuç bölümünde 3-5 maddelik uygulanabilir stratejik öneri sun.",
  "6) Yanıtın profesyonel, öz ve uygulanabilir olsun; gereksiz tekrar yapma.",
  "7) Yanıt her zaman Türkçe olsun."
].join("\n");

app.listen(PORT, () => {
  applyBootstrapAdmins();
  console.log(`Sentra Web Chat çalışıyor: http://localhost:${PORT}`);
  console.log(`Model: ${SENTRA_MODEL} | API: ${SENTRA_API_BASE}`);
  if (REGISTER_REQUIRES_APPROVAL) console.log('Yeni kayıtlar admin onayı bekliyor (REGISTER_REQUIRES_APPROVAL=true)');
});
