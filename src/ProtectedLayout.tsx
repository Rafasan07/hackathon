import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api, ApiError, errorMessage } from './api';
import type { Profile } from './api';
import { Footer, Message, Wordmark } from './components';

interface SessionState {
  path: string;
  user: Profile | null;
  error: string;
}

export function ProtectedLayout() {
  const { pathname } = useLocation();
  const [session, setSession] = useState<SessionState>({ path: '', user: null, error: '' });
  const [retry, setRetry] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const user = session.path === pathname ? session.user : null;
  const sessionError = session.path === pathname ? session.error : '';

  useEffect(() => {
    document.body.className = 'home-page';
    const controller = new AbortController();
    let checking = false;
    async function validateSession(hideContent = false) {
      if (checking) return;
      checking = true;
      if (hideContent) setSession({ path: pathname, user: null, error: '' });
      try {
        const result = await api('session', undefined, controller.signal);
        if (!controller.signal.aborted) setSession({ path: pathname, user: result.user, error: '' });
      } catch (error) {
        if (controller.signal.aborted) return;
        setSession({ path: pathname, user: null, error: errorMessage(error, 'Unable to load your account. Please try again.') });
        if (error instanceof ApiError && error.status === 401) window.location.replace('/login');
      } finally {
        checking = false;
      }
    }
    void validateSession(true);
    function handleVisibility() {
      if (document.visibilityState === 'visible') void validateSession(true);
    }
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setSession({ path: pathname, user: null, error: '' });
        window.location.reload();
      }
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void validateSession();
    }, 240000);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [pathname, retry]);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await api('logout', {});
      setSession({ path: pathname, user: null, error: '' });
      window.location.replace('/login');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSession({ path: pathname, user: null, error: '' });
        window.location.replace('/login');
        return;
      }
      setLogoutError(errorMessage(error, 'Unable to log out. Please try again.'));
      setLoggingOut(false);
    }
  }

  return <>
    <header className="home-header">
      <Wordmark home="/home"/>
      <nav className="page-nav" aria-label="Main navigation">
        <NavLink to="/home">Home</NavLink><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/about">About</NavLink>
      </nav>
      <button className="logout-button" type="button" onClick={handleLogout} disabled={loggingOut} aria-busy={loggingOut}>{loggingOut ? 'Logging out…' : 'Log out'} <span aria-hidden="true">↗</span></button>
    </header>
    {logoutError && <div className="route-message"><Message>{logoutError}</Message></div>}
    {user ? <Outlet context={user}/> : <main className="home-main" aria-busy={!sessionError}>
      {sessionError ? <><h1>Let’s try that again.</h1><Message>{sessionError}</Message><button className="logout-button retry-button" type="button" onClick={() => setRetry(retry + 1)}>Try again</button></> : <><span className="home-badge"><span/> YOUR PERSONAL SPACE</span><h1 className="skeleton" aria-label="Loading your page">&nbsp;</h1><p className="home-intro" role="status">Checking your session…</p></>}
    </main>}
    <Footer className="home-footer"/>
  </>;
}
