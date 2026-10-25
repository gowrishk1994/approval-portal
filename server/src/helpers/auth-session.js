import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { User } from '../models/index.js';

export const SESSION_COOKIE_NAME = 'approval_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const sessionSecret = process.env.SESSION_SECRET ?? randomBytes(32).toString('hex');
if (process.env.NODE_ENV === 'production'
  && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.');
}

function createSignature(value) {
  return createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

function createSessionToken(userId) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${createSignature(payload)}`;
}

function readSessionToken(token) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = Buffer.from(createSignature(payload));
  const suppliedSignature = Buffer.from(signature);
  if (expectedSignature.length !== suppliedSignature.length
    || !timingSafeEqual(expectedSignature, suppliedSignature)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof session.userId === 'string'
      && typeof session.expiresAt === 'number'
      && session.expiresAt > Date.now()
      ? session
      : null;
  } catch {
    return null;
  }
}

export function getSessionToken(request) {
  const cookieHeader = request.get('cookie') ?? '';
  const cookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  return cookie?.slice(SESSION_COOKIE_NAME.length + 1) ?? null;
}

export async function findSessionUser(token) {
  if (!token) return null;
  const session = readSessionToken(token);
  if (!session) return null;
  return User.findOne({
    where: { id: session.userId, isWorkspaceAccount: true },
    attributes: ['id', 'name', 'role'],
    raw: true,
  });
}

export function setSessionCookie(response, userId) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${createSessionToken(userId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SECONDS}${secure}`);
}

export function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}
