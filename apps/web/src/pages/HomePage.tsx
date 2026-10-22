import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { Shell } from '../components/Shell';
import type { Content, ContentType, IntegrationStatus } from '../types';

const FILTERS: Array<{ id: ContentType | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'BLOG', label: 'Blog' },
  { id: 'TUTORIAL', label: 'Tutorials' },
  { id: 'LINKEDIN', label: 'LinkedIn' },
];

function statusClass(status: string): string {
  return `pill pill-${status.toLowerCase()}`;
}

export function HomePage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Content[]>([]);
  const [filter, setFilter] = useState<ContentType | 'ALL'>('ALL');
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const type = filter === 'ALL' ? undefined : filter;
    api.list(token, type).then(setItems).catch((err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not load drafts');
    });
    api.integrations(token).then(setIntegrations).catch(() => setIntegrations(null));
  }, [token, filter]);

  return (
    <Shell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Drafts</h1>
        </div>
        <Link to="/new" className="button">
          New draft
        </Link>
      </div>
      {integrations ? (
        <ul className="chips">
          <li className={integrations.mistral ? 'ok' : 'off'}>Mistral {integrations.mistral ? 'ready' : 'missing'}</li>
          <li className={integrations.wordpress ? 'ok' : 'off'}>WordPress {integrations.wordpress ? 'ready' : 'missing'}</li>
          <li className={integrations.linkedin ? 'ok' : 'off'}>LinkedIn {integrations.linkedin ? 'ready' : 'missing'}</li>
        </ul>
      ) : null}
      <div className="filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? 'chip active' : 'chip'}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {items.length === 0 ? (
        <p className="muted">No drafts yet. Create one to generate with the same prompts as the Cursor skills.</p>
      ) : (
        <ul className="cards">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/c/${item.id}`} className="card">
                <div className="card-meta">
                  <span>{item.type.toLowerCase()}</span>
                  <span className={statusClass(item.status)}>{item.status.toLowerCase()}</span>
                </div>
                <h2>{item.sujet}</h2>
                <p>{item.body.slice(0, 140) || 'Empty body'}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
