import { randomBytes, scrypt } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import type { User } from '@netlify/identity';

export class InputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function validateCredentials(body: Record<string, unknown>, registering = false) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new InputError('Enter a valid email address.');
  }
  if (!password || password.length > 128) {
    throw new InputError('Enter a password of no more than 128 characters.');
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  if (registering) {
    if (!name || name.length > 80) throw new InputError('Enter your name (up to 80 characters).');
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      throw new InputError('Use 3–24 letters, numbers, or underscores for your username.');
    }
    if (password.length < 12) throw new InputError('Choose a password with at least 12 characters.');
  }
  return { email, password, name, username };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(32).toString('hex');
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
  return `scrypt$32768$8$3$${salt}$${derived.toString('hex')}`;
}

export async function profileFor(user: User) {
  const db = getDatabase();
  if (user.confirmedAt && user.email) {
    await db.sql`
      UPDATE users SET identity_id = ${user.id}
      WHERE identity_id IS NULL AND email = ${user.email.toLowerCase()}
    `;
  }
  const [profile] = await db.sql`
    SELECT name, email, username, created_at FROM users WHERE identity_id = ${user.id}
  `;
  if (!profile) throw new InputError('Your profile is unavailable. Please contact the site administrator.', 409);
  return profile;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' },
  });
}
