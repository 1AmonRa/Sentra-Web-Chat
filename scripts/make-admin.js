#!/usr/bin/env node
// Kullanım: node scripts/make-admin.js <email> [yeni-sifre]
// Kullanıcıyı admin yapar ve onaylar. Yoksa oluşturur.
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');

const email = String(process.argv[2] || '').trim().toLowerCase();
const newPassword = process.argv[3] || null;

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Kullanım: node scripts/make-admin.js <email> [yeni-sifre]');
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
let user = users.find((u) => u.email === email);

async function main() {
if (!user) {
  const tempPw = newPassword || crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 10);
  const passwordHash = await bcrypt.hash(tempPw, 10);
  user = {
    id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    email,
    name: email.split('@')[0].slice(0, 60),
    passwordHash,
    role: 'admin',
    approved: true,
    createdAt: Date.now(),
    lastLoginAt: null
  };
  users.push(user);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  console.log(`[OK] Yeni admin oluşturuldu: ${email}`);
  console.log(`     Şifre: ${tempPw}`);
  process.exit(0);
}

user.role = 'admin';
user.approved = true;
if (newPassword) {
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  console.log(`[OK] ${email} admin yapıldı ve şifresi sıfırlandı: ${newPassword}`);
} else {
  console.log(`[OK] ${email} admin yapıldı (şifre değişmedi)`);
}
fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

main().catch((err) => { console.error(err); process.exit(1); });
