import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Plugin } from 'vite';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import { jwtVerify, SignJWT } from 'jose';

const SESSION_COOKIE = 'webdev_app_session';
const OAUTH_STATE_COOKIE = 'pawgress_oauth_state';
const PROFILE_TABLE = 'pawgress_profiles';
const MAX_BODY_BYTES = 1_000_000;

type UserIdentity = {
  openId: string;
  name?: string;
  email?: string;
};

export type PawgressProfile = {
  nickname: string;
  completed: number[];
  notes: Record<number, string>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    link: string;
    category: string;
    status: 'Idea' | 'In progress' | 'Shipped';
  }>;
  updatedAt?: string;
};

type ProfileRow = RowDataPacket & {
  nickname: string;
  completed_json: string;
  notes_json: string;
  projects_json: string;
  updated_at: Date;
};

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function json(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function redirect(res: ServerResponse, location: string, cookies: string[] = []) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end();
}

function parseCookies(header: string | undefined) {
  return Object.fromEntries((header ?? '').split(';').map((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return ['', ''];
    return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
  }).filter(([key]) => key));
}

function cookie(name: string, value: string, options: string) {
  return `${name}=${encodeURIComponent(value)}; ${options}`;
}

function secretKey() {
  const value = process.env.MANUS_JWT_SECRET;
  if (!value) throw new Error('MANUS_JWT_SECRET is not configured');
  return new TextEncoder().encode(value);
}

function publicOrigin(req: IncomingMessage) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] ?? 'http').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:3000').split(',')[0].trim();
  return `${forwardedProto}://${forwardedHost}`;
}

async function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  if (!pool) {
    pool = createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 5,
      waitForConnections: true,
      enableKeepAlive: true,
    });
  }
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS ${PROFILE_TABLE} (
        user_id VARCHAR(191) NOT NULL PRIMARY KEY,
        nickname VARCHAR(64) NOT NULL DEFAULT '',
        completed_json LONGTEXT NOT NULL,
        notes_json LONGTEXT NOT NULL,
        projects_json LONGTEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
  return pool;
}

function emptyProfile(): PawgressProfile {
  return { nickname: '', completed: [], notes: {}, projects: [] };
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function readProfile(openId: string) {
  const db = await database();
  const [rows] = await db.query<ProfileRow[]>(`SELECT nickname, completed_json, notes_json, projects_json, updated_at FROM ${PROFILE_TABLE} WHERE user_id = ? LIMIT 1`, [openId]);
  const row = rows[0];
  if (!row) return null;
  return {
    nickname: row.nickname,
    completed: safeJson<number[]>(row.completed_json, []),
    notes: safeJson<Record<number, string>>(row.notes_json, {}),
    projects: safeJson<PawgressProfile['projects']>(row.projects_json, []),
    updatedAt: row.updated_at.toISOString(),
  } satisfies PawgressProfile;
}

async function saveProfile(openId: string, profile: PawgressProfile) {
  const db = await database();
  const normalized: PawgressProfile = {
    nickname: profile.nickname.trim().slice(0, 24),
    completed: [...new Set(profile.completed.filter((day) => Number.isInteger(day) && day >= 1 && day <= 30))].sort((a, b) => a - b),
    notes: profile.notes,
    projects: profile.projects.slice(0, 100),
  };
  await db.query(`
    INSERT INTO ${PROFILE_TABLE} (user_id, nickname, completed_json, notes_json, projects_json)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE nickname = VALUES(nickname), completed_json = VALUES(completed_json), notes_json = VALUES(notes_json), projects_json = VALUES(projects_json)
  `, [openId, normalized.nickname, JSON.stringify(normalized.completed), JSON.stringify(normalized.notes), JSON.stringify(normalized.projects)]);
  return (await readProfile(openId)) ?? normalized;
}

async function authenticate(req: IncomingMessage): Promise<UserIdentity | null> {
  const headers = req.headers;
  const bearer = typeof headers.authorization === 'string' && headers.authorization.startsWith('Bearer ')
    ? headers.authorization.slice(7)
    : undefined;
  const token = bearer ?? parseCookies(headers.cookie)[SESSION_COOKIE];
  if (!token || !process.env.MANUS_PROJECT_ID) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    const appId = typeof payload.appId === 'string' ? payload.appId : typeof payload.aud === 'string' ? payload.aud : '';
    const openId = typeof payload.openId === 'string' ? payload.openId : typeof payload.sub === 'string' ? payload.sub : '';
    if (appId !== process.env.MANUS_PROJECT_ID || !openId) return null;
    return {
      openId,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('request_too_large');
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

function profileFromBody(body: Record<string, unknown>): PawgressProfile {
  const completed = Array.isArray(body.completed) ? body.completed.filter((day): day is number => typeof day === 'number') : [];
  const notes = body.notes && typeof body.notes === 'object' ? body.notes as Record<number, string> : {};
  const projects = Array.isArray(body.projects) ? body.projects as PawgressProfile['projects'] : [];
  return {
    nickname: typeof body.nickname === 'string' ? body.nickname : '',
    completed,
    notes,
    projects,
  };
}

async function exchangeCode(req: IncomingMessage, res: ServerResponse, code: string, state: string) {
  const cookies = parseCookies(req.headers.cookie);
  const storedNonce = cookies[OAUTH_STATE_COOKIE];
  let statePayload: { redirectUri: string; nonce: string };
  try {
    statePayload = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as { redirectUri: string; nonce: string };
  } catch {
    return json(res, 400, { error: 'invalid_oauth_state' });
  }
  if (!storedNonce || storedNonce !== statePayload.nonce || statePayload.redirectUri !== `${publicOrigin(req)}/api/auth/callback`) {
    return json(res, 400, { error: 'invalid_oauth_state' });
  }
  if (!process.env.MANUS_OAUTH_API_URL || !process.env.MANUS_PROJECT_ID) return json(res, 503, { error: 'oauth_not_configured' });
  const exchangeResponse = await fetch(`${process.env.MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/ExchangeToken`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: process.env.MANUS_PROJECT_ID, grantType: 'authorization_code', code, redirectUri: statePayload.redirectUri }),
  });
  if (!exchangeResponse.ok) return json(res, 401, { error: 'oauth_exchange_failed' });
  const exchange = await exchangeResponse.json() as { accessToken?: string };
  if (!exchange.accessToken) return json(res, 401, { error: 'oauth_identity_missing' });
  const infoResponse = await fetch(`${process.env.MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/GetUserInfo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: exchange.accessToken }),
  });
  if (!infoResponse.ok) return json(res, 401, { error: 'oauth_identity_failed' });
  const info = await infoResponse.json() as { openId?: string; name?: string; email?: string };
  if (!info.openId) return json(res, 401, { error: 'oauth_identity_missing' });
  const session = await new SignJWT({ openId: info.openId, name: info.name, email: info.email, appId: process.env.MANUS_PROJECT_ID })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secretKey());
  return redirect(res, '/', [
    cookie(SESSION_COOKIE, session, 'Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000'),
    cookie(OAUTH_STATE_COOKIE, '', 'Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0'),
  ]);
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', publicOrigin(req));
  try {
    if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true });
    if (url.pathname === '/api/auth/login' && req.method === 'GET') {
      if (!process.env.MANUS_OAUTH_PORTAL_URL || !process.env.MANUS_PROJECT_ID) return json(res, 503, { error: 'oauth_not_configured' });
      const nonce = randomUUID();
      const redirectUri = `${publicOrigin(req)}/api/auth/callback`;
      const state = Buffer.from(JSON.stringify({ redirectUri, nonce }), 'utf8').toString('base64url');
      const portal = new URL(`${process.env.MANUS_OAUTH_PORTAL_URL}/app-auth`);
      portal.searchParams.set('appId', process.env.MANUS_PROJECT_ID);
      portal.searchParams.set('redirectUri', redirectUri);
      portal.searchParams.set('state', state);
      portal.searchParams.set('responseType', 'code');
      return redirect(res, portal.toString(), [cookie(OAUTH_STATE_COOKIE, nonce, 'Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600')]);
    }
    if (url.pathname === '/api/auth/callback' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !state) return json(res, 400, { error: 'missing_oauth_parameters' });
      return await exchangeCode(req, res, code, state);
    }
    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, '', 'Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0'));
      return json(res, 200, { ok: true });
    }
    if (url.pathname === '/api/auth/session' && req.method === 'GET') {
      const user = await authenticate(req);
      if (!user) return json(res, 200, { authenticated: false });
      const profile = await readProfile(user.openId);
      return json(res, 200, { authenticated: true, user, profile, hasProfile: Boolean(profile) });
    }
    if (url.pathname === '/api/profile' && (req.method === 'GET' || req.method === 'PUT')) {
      const user = await authenticate(req);
      if (!user) return json(res, 401, { error: 'unauthorized' });
      if (req.method === 'GET') return json(res, 200, { profile: (await readProfile(user.openId)) ?? emptyProfile() });
      const body = await readBody(req);
      return json(res, 200, { profile: await saveProfile(user.openId, profileFromBody(body)) });
    }
    return json(res, 404, { error: 'not_found' });
  } catch (error) {
    console.error('[pawgress-api]', error);
    if (error instanceof Error && error.message === 'request_too_large') return json(res, 413, { error: 'request_too_large' });
    return json(res, 500, { error: 'server_error' });
  }
}

export function pawgressApiPlugin(): Plugin {
  return {
    name: 'pawgress-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        void handleApiRequest(req, res);
      });
    },
  };
}
