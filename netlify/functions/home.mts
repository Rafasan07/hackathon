import { getUser, refreshSession } from '@netlify/identity';
import type { Config, Context } from '@netlify/functions';
import { profileFor } from '../../lib/accounts.mts';

export default async (request: Request, context: Context) => {
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
    const page = await context.rewrite(new URL('/index.html', request.url));
    const responseHeaders = new Headers(page.headers);
    for (const [name, value] of Object.entries(headers)) responseHeaders.set(name, value);
    return new Response(request.method === 'HEAD' ? null : page.body, {
      status: page.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response('Your page is temporarily unavailable. Please reload and try again.', { status: 503, headers });
  }
};

export const config: Config = {
  path: ['/home', '/home/', '/about', '/about/', '/dashboard', '/dashboard/'],
};
