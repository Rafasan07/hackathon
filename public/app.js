async function api(action, data) {
  const response = await fetch(`/api/auth/${action}`, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || (response.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'Unable to connect. Please try again.'));
    error.status = response.status;
    throw error;
  }
  return result;
}

function showMessage(text, success = false) {
  const message = document.querySelector('#message');
  message.textContent = text;
  message.classList.toggle('success', success);
  message.hidden = false;
  message.setAttribute('role', success ? 'status' : 'alert');
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  const target = button.querySelector('#submit-label') || button;
  target.textContent = label;
}

async function startAuth() {
  const registering = window.location.pathname.replace(/\/$/, '') === '/register';
  const form = document.querySelector('#auth-form');
  const submit = document.querySelector('#submit-button');
  const submitText = registering ? 'Create account' : 'Log in';
  if (registering) {
    document.title = 'Make yourself at home · Commonplace';
    document.querySelector('#form-title').textContent = 'Make yourself at home.';
    document.querySelector('#form-eyebrow').textContent = 'YOUR NEXT CHAPTER STARTS HERE';
    document.querySelector('#form-intro').textContent = 'A few details, and a little space to call your own.';
    document.querySelector('#top-prompt').textContent = 'Already at home here?';
    document.querySelector('#top-link').textContent = 'Log in ↗';
    document.querySelector('#top-link').href = '/login';
    document.querySelector('#bottom-prompt').textContent = 'Already part of the neighborhood?';
    document.querySelector('#bottom-link').textContent = 'Log in';
    document.querySelector('#bottom-link').href = '/login';
    document.querySelector('#login-tab').classList.remove('active');
    document.querySelector('#login-tab').removeAttribute('aria-current');
    document.querySelector('#register-tab').classList.add('active');
    document.querySelector('#register-tab').setAttribute('aria-current', 'page');
    document.querySelectorAll('.register-field').forEach((field) => {
      field.hidden = false;
      field.querySelector('input').required = true;
    });
    document.querySelector('#password').minLength = 12;
    document.querySelector('#password').autocomplete = 'new-password';
    document.querySelector('#password').setAttribute('aria-describedby', 'password-help');
    document.querySelector('#password-help').hidden = false;
    document.querySelector('#submit-label').textContent = submitText;
    document.body.classList.add('register-page');
  }
  document.querySelector('#toggle-password').addEventListener('click', (event) => {
    const password = document.querySelector('#password');
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    event.currentTarget.setAttribute('aria-pressed', String(visible));
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    document.querySelector('#message').hidden = true;
    setBusy(submit, true, registering ? 'Creating your space…' : 'Logging in…');
    try {
      const data = Object.fromEntries(new FormData(form));
      const result = await api(registering ? 'register' : 'login', data);
      form.reset();
      if (result.needsConfirmation) {
        showMessage('You’re almost home! Check your email and follow the confirmation link, then log in.', true);
        setBusy(submit, false, submitText);
      } else {
        window.location.replace('/home');
      }
    } catch (error) {
      showMessage(error.message || 'Please check your connection and try again.');
      setBusy(submit, false, submitText);
    }
  });
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const token = hash.get('confirmation_token');
  if (token) {
    window.history.replaceState(null, '', window.location.pathname);
    setBusy(submit, true, 'Confirming your email…');
    try {
      await api('confirm', { token });
      window.location.replace('/home');
    } catch (error) {
      showMessage(error.message);
      setBusy(submit, false, submitText);
    }
    return;
  }
  if (hash.has('error_description')) {
    window.history.replaceState(null, '', window.location.pathname);
    showMessage('This email link is invalid or has expired. Please try logging in.');
  }
  try {
    await api('session');
    window.location.replace('/home');
  } catch (error) {
    if (error.status !== 401) showMessage(error.message || 'Unable to connect. Please try again.');
  }
}

async function loadHome() {
  try {
    const { user } = await api('session');
    document.querySelector('#welcome-name').textContent = user.name;
    document.querySelector('#profile-name').textContent = user.name;
    document.querySelector('#profile-username').textContent = `@${user.username}`;
    document.querySelector('#profile-email').textContent = user.email;
    document.querySelector('#profile-avatar').textContent = Array.from(user.name)[0].toUpperCase();
    document.querySelectorAll('.skeleton').forEach((element) => element.classList.remove('skeleton'));
    document.querySelector('#home-main').setAttribute('aria-busy', 'false');
  } catch (error) {
    if (error.status === 401) {
      window.location.replace('/login');
      return;
    }
    showMessage(error.message || 'Unable to load your account. Please reload to try again.');
    document.querySelector('#home-main').setAttribute('aria-busy', 'false');
  }
}

document.querySelectorAll('.current-year').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

if (document.querySelector('#auth-form')) {
  startAuth();
} else if (document.querySelector('#home-main')) {
  loadHome();
  const logoutButton = document.querySelector('#logout-button');
  logoutButton.addEventListener('click', async () => {
    setBusy(logoutButton, true, 'Logging out…');
    try {
      await api('logout', {});
      window.location.replace('/login');
    } catch (error) {
      showMessage(error.message || 'Unable to log out. Please try again.');
      setBusy(logoutButton, false, 'Log out ↗');
    }
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadHome();
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') loadHome();
  }, 240000);
}
