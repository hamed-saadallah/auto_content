import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import type { ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  const { email, logout } = useAuth();
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Content Studio
        </Link>
        <nav>
          <Link to="/new">New draft</Link>
          <span className="muted">{email}</span>
          <button type="button" className="ghost" onClick={logout}>
            Log out
          </button>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
