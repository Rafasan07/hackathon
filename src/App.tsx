import { useEffect } from 'react';
import { Link, Route, Routes, useOutletContext } from 'react-router-dom';
import type { Profile } from './api';
import { AuthPage } from './AuthPage';
import { ProtectedLayout } from './ProtectedLayout';

function HomePage() {
  const user = useOutletContext<Profile>();
  useEffect(() => { document.title = 'Your home · Commonplace'; }, []);
  return <main className="home-main">
    <span className="home-badge"><span/> YOUR PERSONAL SPACE</span>
    <h1>Welcome home,<br/><em>{user.name}</em><span className="welcome-dot">.</span></h1>
    <p className="home-intro">Take a breath. Settle in. It’s good to have you here.</p>
    <section className="profile-card" aria-labelledby="profile-title">
      <div className="profile-card-heading"><span className="profile-avatar" aria-hidden="true">{Array.from(user.name)[0]?.toUpperCase() || 'C'}</span><div><span className="eyebrow">A LITTLE ABOUT YOU</span><h2 id="profile-title">Your account</h2></div><span className="verified-label"><span aria-hidden="true">✓</span> Email verified</span></div>
      <dl><div><dt>Full name</dt><dd>{user.name}</dd></div><div><dt>Username</dt><dd>@{user.username}</dd></div><div><dt>Email address</dt><dd>{user.email}</dd></div></dl>
      <div className="profile-card-footer"><span className="status-dot"/> You’re safely logged in. Make yourself at home.</div>
    </section>
    <p className="home-signoff">Every good thing starts somewhere.<span>Welcome to your somewhere.</span></p>
  </main>;
}

function SimplePage({ page }: { page: 'about' | 'dashboard' }) {
  const dashboard = page === 'dashboard';
  useEffect(() => { document.title = `${dashboard ? 'Dashboard' : 'About'} · Commonplace`; }, [dashboard]);
  return <main className="home-main simple-page">
    <span className="home-badge"><span/> {dashboard ? 'YOUR EVERYDAY OVERVIEW' : 'A LITTLE ABOUT THIS SPACE'}</span>
    <h1>{dashboard ? 'Your dashboard' : 'About Commonplace'}<span className="welcome-dot">.</span></h1>
    <p className="home-intro">{dashboard ? 'A quiet place to start your day. You’re logged in and ready to go.' : 'A little space to call your own. Commonplace keeps your account simple, personal, and secure.'}</p>
    <section className="profile-card simple-card" aria-labelledby="page-heading">
      <span className="eyebrow">{dashboard ? 'MAKE YOURSELF AT HOME' : 'BUILT AROUND YOU'}</span>
      <h2 id="page-heading">{dashboard ? 'Everything starts here.' : 'Your space. Your peace of mind.'}</h2>
      <p>{dashboard ? 'Your dashboard is ready. Visit your home to see your account details, or learn more about your space.' : 'This is a private, members-only space. Only signed-in members can visit Home, Dashboard, and About. You can safely log out from any page.'}</p>
      <Link className="page-link" to={dashboard ? '/home' : '/dashboard'}>{dashboard ? 'Visit your home' : 'Go to your dashboard'} <span aria-hidden="true">↗</span></Link>
    </section>
  </main>;
}

function NotFound() {
  useEffect(() => { document.title = 'Page not found · Commonplace'; }, []);
  return <main className="home-main"><h1>A little off the path.</h1><p className="home-intro">This page doesn’t exist.</p><Link className="page-link" to="/">Back to Commonplace ↗</Link></main>;
}

export function App() {
  return <Routes>
    <Route path="/" element={<AuthPage/>}/>
    <Route path="/login" element={<AuthPage/>}/>
    <Route path="/register" element={<AuthPage/>}/>
    <Route element={<ProtectedLayout/>}>
      <Route path="/home" element={<HomePage/>}/>
      <Route path="/about" element={<SimplePage page="about"/>}/>
      <Route path="/dashboard" element={<SimplePage page="dashboard"/>}/>
    </Route>
    <Route path="*" element={<NotFound/>}/>
  </Routes>;
}
