import crypto from 'node:crypto';
import fs from 'node:fs';
import { config, paths } from './config.js';

const COOKIE = 'cv_session';
const SESSION_DAYS = 400; // the phone should stay logged in

function serverSecret() {
  try {
    const s = fs.readFileSync(paths.secret, 'utf8').trim();
    if (s.length >= 32) return s;
  } catch {}
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(paths.secret, s, { mode: 0o600 });
  return s;
}

let key = null;
function signingKey() {
  if (!key) {
    // Changing WEB_TOKEN logs every device out.
    key = crypto.createHmac('sha256', serverSecret()).update(config.webToken).digest();
  }
  return key;
}

function sign(payload) {
  return crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

export function makeSessionCookie() {
  const expires = Date.now() + SESSION_DAYS * 86400 * 1000;
  const payload = String(expires);
  return { name: COOKIE, value: `${payload}.${sign(payload)}`, expires: new Date(expires) };
}

export function isValidSession(cookieHeader) {
  if (!cookieHeader) return false;
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(cookieHeader);
  if (!m) return false;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (expected.length !== sig.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  return Number(payload) > Date.now();
}

export function passwordMatches(given) {
  if (!config.webToken || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(config.webToken);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Simple login throttle: after 5 wrong tries from one address, wait a minute.
const attempts = new Map();
export function loginAllowed(ip) {
  const a = attempts.get(ip);
  if (!a) return true;
  if (Date.now() - a.last > 60_000) { attempts.delete(ip); return true; }
  return a.count < 5;
}
export function recordFailure(ip) {
  const a = attempts.get(ip) || { count: 0, last: 0 };
  a.count++;
  a.last = Date.now();
  attempts.set(ip, a);
}
export function clearFailures(ip) { attempts.delete(ip); }

export function setSessionCookie(res) {
  const c = makeSessionCookie();
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${c.name}=${c.value}; Path=/; Expires=${c.expires.toUTCString()}; HttpOnly; SameSite=Lax${secure}`);
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`);
}

export function requireAuth(req, res, next) {
  if (isValidSession(req.headers.cookie)) return next();
  res.status(401).json({ error: 'Please log in.' });
}
