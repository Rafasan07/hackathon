# Commonplace

A responsive React and TypeScript account experience with registration, email confirmation, login, logout, and protected Home, Dashboard, and About pages. Vite handles frontend development and production bundling, and React Router manages browser navigation.

## Authentication and storage

Netlify Identity manages credentials, email verification, signed sessions, and logout through `@netlify/identity`. The application uses server-side authentication endpoints and full-page navigation after authentication so the browser sends session cookies to the protected routes. Direct requests to `/home`, `/dashboard`, and `/about` (including trailing-slash variants) pass through a server function that validates the session before serving the React entry page. Unauthenticated visitors are redirected to `/login`; account data is only returned after the server validates the session.

The React protected layout also checks the server session before rendering protected content, including navigation between protected pages. Each protected page shares navigation and a working Log out button. Logout calls the server endpoint to invalidate the Identity session and clear its cookies, removes the current profile from the UI, and returns to `/login`. Logout failures are displayed with an option to try again rather than silently pretending that the session ended.

Netlify Database stores each user's name, normalized email, unique normalized username, Identity identifier, creation time, and independently salted scrypt password hash. Plaintext passwords and password hashes are never returned to the browser. Identity remains the credential authority; the application does not implement a second password-login system. The database hash records the registration password, and future password-changing features must update it alongside Identity.

The schema is defined in `netlify/database/migrations/20261014130000_create_users.sql` and is applied by Netlify during deployment. No external database or additional database connection configuration is required. The Identity activation marker is included in `.netlify/features/netlify-identity`.

## Development

Install dependencies with `npm install`, then run `npm run dev` with the Netlify CLI available. Open the site on port 8889 so authentication endpoints and protected server routes are available. Netlify Dev starts the Vite development server on port 5173 automatically and proxies it through port 8889. In the hosted development environment, use `/opt/buildhome/node-deps/node_modules/.bin/netlify dev --port 8889` if the CLI is not on your path.

All application code is authored in TypeScript: React components and browser helpers live in `src`, while server functions and shared server utilities use `.mts` files in `netlify/functions` and `lib`. Run `npm run check` to strictly type-check the React frontend, Vite configuration, and server code without generating files.

Netlify runs `npm run build` to type-check the application and bundle it into `dist`, the published directory. The root `index.html` is the React entry document; `public` contains the existing stylesheet and favicon. Generated output is ignored by Git. The protected page function rewrites authenticated page requests to the React entry document, so the same code works with the Vite development server and production assets without maintaining a separate HTML template.

## Registration behavior

Registration requires a name, email, username of 3–24 letters/numbers/underscores, and a password of 12–128 characters. Email and username uniqueness are enforced by database constraints. By default, Netlify Identity sends an email confirmation link; the login page handles that link and opens the user's home after verification. If Identity autoconfirm is enabled in the project settings, registration opens the home immediately instead. Open registration must remain enabled in the project's Identity settings.

## Security

Authentication mutations require a same-origin request. Endpoint-level rate limits, parameterized SQL, explicit profile field selection, non-cacheable authenticated responses, accessible error/loading states, and security headers are included. All protected pages recheck the session when restored or revisited, and refresh active sessions periodically. Expired sessions return to login, and protected content stays hidden until session validation succeeds. There are no browser-stored application passwords or custom authentication tokens.
