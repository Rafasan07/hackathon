# Commonplace

A responsive account experience with registration, email confirmation, login, logout, and a protected personal home page.

## Authentication and storage

Netlify Identity manages credentials, email verification, signed sessions, and logout through `@netlify/identity`. The application uses server-side authentication endpoints and full-page navigation after authentication so the browser sends the session cookies to the protected `/home` route. Unauthenticated visitors are redirected to `/login`; account data is only returned after the server validates the session.

Netlify Database stores each user's name, normalized email, unique normalized username, Identity identifier, creation time, and independently salted scrypt password hash. Plaintext passwords and password hashes are never returned to the browser. Identity remains the credential authority; the application does not implement a second password-login system. The database hash records the registration password, and future password-changing features must update it alongside Identity.

The schema is defined in `netlify/database/migrations/20261014130000_create_users.sql` and is applied by Netlify during deployment. No external database or additional database connection configuration is required. The Identity activation marker is included in `.netlify/features/netlify-identity`.

## Development

Install dependencies with `npm install`, then run `npm run dev` with the Netlify CLI available, or `/opt/buildhome/node-deps/node_modules/.bin/netlify dev --port 8889` in the hosted development environment. Open the local site on port 8889. The site publishes the `public` directory directly and does not require a frontend build step. `templates/home.html` is bundled only with the protected server function, not published as a public static file.

Run `npm run check` to check server-side TypeScript and browser JavaScript syntax.

## Registration behavior

Registration requires a name, email, username of 3–24 letters/numbers/underscores, and a password of 12–128 characters. Email and username uniqueness are enforced by database constraints. By default, Netlify Identity sends an email confirmation link; the login page handles that link and opens the user's home after verification. If Identity autoconfirm is enabled in the project settings, registration opens the home immediately instead. Open registration must remain enabled in the project's Identity settings.

## Security

Authentication mutations require a same-origin request. Endpoint-level rate limits, parameterized SQL, explicit profile field selection, non-cacheable authenticated responses, accessible error/loading states, and security headers are included. The home page rechecks the session when restored or revisited, and refreshes active sessions periodically. There are no browser-stored application passwords or custom authentication tokens.
