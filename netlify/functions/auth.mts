import { randomUUID } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import {
  AuthError, MissingIdentityError, confirmEmail, getUser, login, logout,
  refreshSession, signup, verifyRequestOrigin,
} from '@netlify/identity';
import type { Config, Context } from '@netlify/functions';
import { hashPassword, InputError, json, profileFor, validateCredentials } from '../../lib/accounts.mts';

export default async (request: Request, context: Context) => {
  const action = context.params.action;
  try {
    if (request.method === 'GET' && action === 'session') {
      await refreshSession();
      const user = await getUser();
      if (!user || !user.confirmedAt) return json({ error: 'Please log in to continue.' }, 401);
      return json({ user: await profileFor(user) });
    }
    if (!['login', 'register', 'logout', 'confirm'].includes(action)) {
      return json({ error: 'Not found.' }, 404);
    }
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
    }
    verifyRequestOrigin(request);
    if (action === 'logout') {
      await logout();
      return json({ ok: true });
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return json({ error: 'Send an application/json request.' }, 415);
    }
    const raw = await request.text();
    if (raw.length > 8192) return json({ error: 'The request is too large.' }, 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
      if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    } catch {
      return json({ error: 'The request could not be read.' }, 400);
    }
    if (action === 'confirm') {
      if (typeof body.token !== 'string' || !body.token || body.token.length > 2048) {
        throw new InputError('The confirmation link is invalid.');
      }
      const user = await confirmEmail(body.token);
      return json({ user: await profileFor(user) });
    }
    const credentials = validateCredentials(body, action === 'register');
    if (action === 'login') {
      const user = await login(credentials.email, credentials.password);
      return json({ user: await profileFor(user) });
    }
    const db = getDatabase();
    const reservationId = randomUUID();
    const passwordHash = await hashPassword(credentials.password);
    try {
      await db.sql`
        INSERT INTO users (id, name, email, username, password_hash)
        VALUES (${reservationId}, ${credentials.name}, ${credentials.email}, ${credentials.username}, ${passwordHash})
      `;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        return json({ error: 'That email or username is already in use. Try logging in or choose another.' }, 409);
      }
      throw error;
    }
    let user;
    try {
      user = await signup(credentials.email, credentials.password, {
        full_name: credentials.name,
        username: credentials.username,
      });
    } catch (error) {
      await db.sql`DELETE FROM users WHERE id = ${reservationId} AND identity_id IS NULL`;
      throw error;
    }
    await db.sql`UPDATE users SET identity_id = ${user.id} WHERE id = ${reservationId}`;
    return json({ needsConfirmation: !user.confirmedAt }, 201);
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, error.status);
    if (error instanceof MissingIdentityError) return json({ error: 'Authentication is temporarily unavailable. Please try again shortly.' }, 503);
    if (error instanceof AuthError) {
      const status = error.status ?? 400;
      if (status === 403) return json({ error: 'This request is not allowed.' }, 403);
      if (action === 'login') {
        return json({ error: 'Unable to log in. Check your email and password, and confirm your email first.' }, status === 429 ? 429 : 401);
      }
      if (action === 'confirm') return json({ error: 'This confirmation link is invalid or has expired. Please try logging in or request a new confirmation email from the site administrator.' }, 400);
      return json({ error: status === 429 ? 'Too many attempts. Please wait a moment and try again.' : 'Unable to complete your request. Please try again or log in if you already have an account.' }, status >= 400 && status < 500 ? status : 503);
    }
    return json({ error: 'Something went wrong. Please try again shortly.' }, 500);
  }
};

export const config: Config = {
  path: '/api/auth/:action',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
