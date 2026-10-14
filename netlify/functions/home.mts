import { readFile } from 'node:fs/promises';
import { getUser, refreshSession } from '@netlify/identity';
import type { Config } from '@netlify/functions';
import { profileFor } from '../../lib/accounts.mts';

export default async (request: Request) => {
  const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
  }
  try {
    await refreshSession();
    const user = await getUser();
    if (!user || !user.confirmedAt) {
      return new Response(null, { status: 302, headers: { ...headers, Location: '/login' } });
    }
    await profileFor(user);
    const html = await readFile('templates/home.html', 'utf8');
    return new Response(request.method === 'HEAD' ? null : html, {
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new Response('Your home is temporarily unavailable. Please reload and try again.', { status: 503, headers });
  }
};

export const config: Config = { path: ['/home', '/home/'] };
