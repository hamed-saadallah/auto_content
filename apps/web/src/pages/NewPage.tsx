import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { Shell } from '../components/Shell';
import type { ContentType } from '../types';

const TYPES: Array<{ id: ContentType; label: string; hint: string }> = [
  { id: 'BLOG', label: 'Blog', hint: 'English long-form → WordPress' },
  { id: 'TUTORIAL', label: 'Tutorial', hint: 'English how-to → WordPress' },
  { id: 'LINKEDIN', label: 'LinkedIn', hint: 'French post → LinkedIn API' },
];

export function NewPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<ContentType>('BLOG');
  const [sujet, setSujet] = useState('');
  const [audience, setAudience] = useState('');
  const [objectif, setObjectif] = useState('');
  const [generate, setGenerate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.create(token, {
        type,
        sujet,
        audience: audience || undefined,
        objectif: objectif || undefined,
        generate,
      });
      navigate(`/c/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create draft');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <p className="eyebrow">Create</p>
      <h1>New draft</h1>
      <form className="panel form" onSubmit={onSubmit}>
        <div className="type-grid">
          {TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={type === item.id ? 'type-card active' : 'type-card'}
              onClick={() => setType(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </button>
          ))}
        </div>
        <label>
          Subject
          <input value={sujet} onChange={(e) => setSujet(e.target.value)} minLength={3} required />
        </label>
        <label>
          Audience (optional)
          <input value={audience} onChange={(e) => setAudience(e.target.value)} />
        </label>
        <label>
          Goal (optional)
          <input value={objectif} onChange={(e) => setObjectif(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={generate} onChange={(e) => setGenerate(e.target.checked)} />
          Generate with Mistral now (same skill prompts)
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : generate ? 'Generate draft' : 'Create empty draft'}
        </button>
      </form>
    </Shell>
  );
}
