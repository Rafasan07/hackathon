class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
function requiredElement(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`Missing required element: ${selector}`);
    return element;
}
function errorMessage(error, fallback) {
    return error instanceof Error ? error.message || fallback : fallback;
}
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
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string' ? result.error : undefined;
        throw new ApiError(message || (response.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'Unable to connect. Please try again.'), response.status);
    }
    return result;
}
function showMessage(text, success = false) {
    const message = requiredElement('#message');
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
    const form = requiredElement('#auth-form');
    const submit = requiredElement('#submit-button');
    const submitText = registering ? 'Create account' : 'Log in';
    if (registering) {
        document.title = 'Make yourself at home · Commonplace';
        requiredElement('#form-title').textContent = 'Make yourself at home.';
        requiredElement('#form-eyebrow').textContent = 'YOUR NEXT CHAPTER STARTS HERE';
        requiredElement('#form-intro').textContent = 'A few details, and a little space to call your own.';
        requiredElement('#top-prompt').textContent = 'Already at home here?';
        requiredElement('#top-link').textContent = 'Log in ↗';
        requiredElement('#top-link').href = '/login';
        requiredElement('#bottom-prompt').textContent = 'Already part of the neighborhood?';
        requiredElement('#bottom-link').textContent = 'Log in';
        requiredElement('#bottom-link').href = '/login';
        requiredElement('#login-tab').classList.remove('active');
        requiredElement('#login-tab').removeAttribute('aria-current');
        requiredElement('#register-tab').classList.add('active');
        requiredElement('#register-tab').setAttribute('aria-current', 'page');
        document.querySelectorAll('.register-field').forEach((field) => {
            field.hidden = false;
            const input = field.querySelector('input');
            if (input)
                input.required = true;
        });
        requiredElement('#password').minLength = 12;
        requiredElement('#password').autocomplete = 'new-password';
        requiredElement('#password').setAttribute('aria-describedby', 'password-help');
        requiredElement('#password-help').hidden = false;
        requiredElement('#submit-label').textContent = submitText;
        document.body.classList.add('register-page');
    }
    const passwordToggle = requiredElement('#toggle-password');
    passwordToggle.addEventListener('click', () => {
        const password = requiredElement('#password');
        const visible = password.type === 'password';
        password.type = visible ? 'text' : 'password';
        passwordToggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
        passwordToggle.setAttribute('aria-pressed', String(visible));
    });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        requiredElement('#message').hidden = true;
        setBusy(submit, true, registering ? 'Creating your space…' : 'Logging in…');
        try {
            const data = Object.fromEntries(new FormData(form));
            const result = await api(registering ? 'register' : 'login', data);
            form.reset();
            if ('needsConfirmation' in result && result.needsConfirmation) {
                showMessage('You’re almost home! Check your email and follow the confirmation link, then log in.', true);
                setBusy(submit, false, submitText);
            }
            else {
                window.location.replace('/home');
            }
        }
        catch (error) {
            showMessage(errorMessage(error, 'Please check your connection and try again.'));
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
        }
        catch (error) {
            showMessage(errorMessage(error, 'Unable to confirm your email. Please try again.'));
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
    }
    catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401)
            showMessage(errorMessage(error, 'Unable to connect. Please try again.'));
    }
}
async function loadHome() {
    try {
        const { user } = await api('session');
        requiredElement('#welcome-name').textContent = user.name;
        requiredElement('#profile-name').textContent = user.name;
        requiredElement('#profile-username').textContent = `@${user.username}`;
        requiredElement('#profile-email').textContent = user.email;
        requiredElement('#profile-avatar').textContent = Array.from(user.name)[0].toUpperCase();
        document.querySelectorAll('.skeleton').forEach((element) => element.classList.remove('skeleton'));
        requiredElement('#home-main').setAttribute('aria-busy', 'false');
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            window.location.replace('/login');
            return;
        }
        showMessage(errorMessage(error, 'Unable to load your account. Please reload to try again.'));
        requiredElement('#home-main').setAttribute('aria-busy', 'false');
    }
}
document.querySelectorAll('.current-year').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
});
if (document.querySelector('#auth-form')) {
    startAuth();
}
else if (document.querySelector('#home-main')) {
    loadHome();
    const logoutButton = requiredElement('#logout-button');
    logoutButton.addEventListener('click', async () => {
        setBusy(logoutButton, true, 'Logging out…');
        try {
            await api('logout', {});
            window.location.replace('/login');
        }
        catch (error) {
            showMessage(errorMessage(error, 'Unable to log out. Please try again.'));
            setBusy(logoutButton, false, 'Log out ↗');
        }
    });
    window.addEventListener('pageshow', (event) => {
        if (event.persisted)
            window.location.reload();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible')
            loadHome();
    });
    window.setInterval(() => {
        if (document.visibilityState === 'visible')
            loadHome();
    }, 240000);
}
export {};
