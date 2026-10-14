import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, ApiError, errorMessage } from './api';
import { Footer, Icon, Message, Wordmark } from './components';

export function AuthPage() {
  const { pathname } = useLocation();
  const registering = pathname.replace(/\/$/, '') === '/register';
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const submitText = registering ? 'Create account' : 'Log in';

  useEffect(() => {
    document.title = `${registering ? 'Make yourself at home' : 'Welcome back'} · Commonplace`;
    document.body.className = registering ? 'register-page' : '';
    setMessage('');
    setSuccess(false);
    setPasswordVisible(false);
    const controller = new AbortController();
    async function checkSession() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const token = hash.get('confirmation_token');
      if (token) {
        window.history.replaceState(null, '', window.location.pathname);
        setBusy(true);
        setConfirming(true);
        try {
          await api('confirm', { token });
          if (!controller.signal.aborted) window.location.replace('/home');
        } catch (error) {
          if (!controller.signal.aborted) setMessage(errorMessage(error, 'Unable to confirm your email. Please try again.'));
        } finally {
          if (!controller.signal.aborted) {
            setBusy(false);
            setConfirming(false);
          }
        }
        return;
      }
      if (hash.has('error_description')) {
        window.history.replaceState(null, '', window.location.pathname);
        setMessage('This email link is invalid or has expired. Please try logging in.');
      }
      try {
        await api('session', undefined, controller.signal);
        if (!controller.signal.aborted) window.location.replace('/home');
      } catch (error) {
        if (!controller.signal.aborted && (!(error instanceof ApiError) || error.status !== 401)) {
          setMessage(errorMessage(error, 'Unable to connect. Please try again.'));
        }
      }
    }
    void checkSession();
    return () => controller.abort();
  }, [registering]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage('');
    setSuccess(false);
    setBusy(true);
    try {
      const result = await api(registering ? 'register' : 'login', Object.fromEntries(new FormData(form)));
      form.reset();
      if ('needsConfirmation' in result && result.needsConfirmation) {
        setSuccess(true);
        setMessage('You’re almost home! Check your email and follow the confirmation link, then log in.');
        setBusy(false);
      } else {
        window.location.replace('/home');
      }
    } catch (error) {
      setMessage(errorMessage(error, 'Please check your connection and try again.'));
      setBusy(false);
    }
  }

  return <div className="auth-layout">
    <aside className="story-panel">
      <Wordmark />
      <div className="story-content">
        <span className="eyebrow"><span className="tiny-line"/> A PLACE TO CALL YOURS</span>
        <h1>A little space.<br/>A fresh start.<br/><em>All yours.</em></h1>
        <p>Good things begin with a simple hello.<br/>Make yourself at home.</p>
        <div className="door-art" aria-hidden="true"><div className="sun-disc"/><div className="arch-shadow"/><div className="door-frame"><div className="door-inset"><div className="door-line"/><span className="door-handle"/></div></div><div className="floor-line"/><div className="plant"><span/><span/><span/><span/><i/></div><div className="step step-one"/><div className="step step-two"/></div>
      </div>
      <div className="story-footer"><span>A SMALL BEGINNING. ENDLESS POSSIBILITIES.</span><span aria-hidden="true">✳</span></div>
    </aside>
    <main className="form-panel" id="main-content">
      <div className="top-note"><span>{registering ? 'Already at home here?' : 'New around here?'}</span> <Link to={registering ? '/login' : '/register'}>{registering ? 'Log in' : 'Create an account'} <span aria-hidden="true">↗</span></Link></div>
      <section className="form-wrap">
        <div className="welcome-icon" aria-hidden="true"><Icon kind="home"/></div>
        <span className="eyebrow form-eyebrow">{registering ? 'YOUR NEXT CHAPTER STARTS HERE' : 'YOUR SPACE IS WAITING'}</span>
        <h2>{registering ? 'Make yourself at home.' : 'Welcome back.'}</h2>
        <p className="form-intro">{registering ? 'A few details, and a little space to call your own.' : 'A familiar place, a new day. Log in to get started.'}</p>
        <nav className="auth-tabs" aria-label="Account access"><Link to="/login" className={!registering ? 'active' : ''} aria-current={!registering ? 'page' : undefined}>Log in</Link><Link to="/register" className={registering ? 'active' : ''} aria-current={registering ? 'page' : undefined}>Create account</Link></nav>
        {message && <Message success={success}>{message}</Message>}
        <form key={pathname} id="auth-form" onSubmit={handleSubmit} aria-busy={busy}>
          {registering && <>
            <div className="register-field"><label htmlFor="name">Full name</label><div className="input-wrap"><Icon kind="person"/><input id="name" name="name" autoComplete="name" placeholder="Your full name" maxLength={80} required disabled={busy}/></div></div>
            <div className="register-field"><label htmlFor="username">Username</label><div className="input-wrap"><span className="input-at" aria-hidden="true">@</span><input id="username" name="username" autoComplete="username" placeholder="Choose a username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" title="3–24 letters, numbers, or underscores" spellCheck={false} autoCapitalize="none" required disabled={busy}/></div></div>
          </>}
          <div><label htmlFor="email">Email address</label><div className="input-wrap"><Icon kind="email"/><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required autoCapitalize="none" spellCheck={false} disabled={busy}/></div></div>
          <div><label htmlFor="password">Password</label><div className="input-wrap"><Icon kind="lock"/><input id="password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'Create your password' : 'Enter your password'} minLength={registering ? 12 : undefined} maxLength={128} aria-describedby={registering ? 'password-help' : undefined} required disabled={busy}/><button type="button" className="password-toggle" aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(!passwordVisible)}><Icon kind="eye"/></button></div>{registering && <p id="password-help" className="field-help">At least 12 characters. Make it uniquely yours.</p>}</div>
          <button className="primary-button" type="submit" disabled={busy} aria-busy={busy}><span>{confirming ? 'Confirming your email…' : busy ? registering ? 'Creating your space…' : 'Logging in…' : submitText}</span><span aria-hidden="true">↗</span></button>
        </form>
        <div className="form-bottom"><span>{registering ? 'Already part of the neighborhood?' : 'Not part of the neighborhood yet?'}</span> <Link to={registering ? '/login' : '/register'}>{registering ? 'Log in' : 'Join us'}</Link></div>
        <div className="security-note"><Icon kind="shield"/><span>Your details stay safe. Your space stays yours.</span></div>
      </section>
      <Footer className="page-footer"/>
    </main>
  </div>;
}
