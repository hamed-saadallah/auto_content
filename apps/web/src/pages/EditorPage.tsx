import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError, assetUrl } from '../api';
import { useAuth } from '../auth';
import { ArticlePreview } from '../components/ArticlePreview';
import { LinkedInCard } from '../components/LinkedInCard';
import { Shell } from '../components/Shell';
import type { Content } from '../types';

export function EditorPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [content, setContent] = useState<Content | null>(null);
  const [body, setBody] = useState('');
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    api
      .get(token, id)
      .then((item) => {
        setContent(item);
        setBody(item.body);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Load failed'));
  }, [token, id]);

  async function run(label: string, action: () => Promise<Content>) {
    setBusy(label);
    setError(null);
    try {
      const next = await action();
      setContent(next);
      setBody(next.body);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  if (!content || !token || !id) {
    return (
      <Shell>
        <p className="muted">{error || 'Loading…'}</p>
      </Shell>
    );
  }

  const linkedin = content.type === 'LINKEDIN';
  const cover = assetUrl(content.coverUrl);

  return (
    <Shell>
      <div className="page-head">
        <div>
          <p className="eyebrow">{content.type.toLowerCase()} · {content.slug}</p>
          <h1>{content.sujet}</h1>
        </div>
        <span className={`pill pill-${content.status.toLowerCase()}`}>{content.status.toLowerCase()}</span>
      </div>
      <div className="editor">
        <section className="panel">
          <label>
            Body
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={22} />
          </label>
          {linkedin && content.linkedinErrors.length > 0 ? (
            <ul className="warn-list">
              {content.linkedinErrors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <div className="actions">
            <button
              type="button"
              className="ghost"
              disabled={Boolean(busy)}
              onClick={() => run('save', () => api.update(token, id, { body }))}
            >
              Save
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => run('generate', () => api.generate(token, id))}>
              Generate
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || !instruction.trim()}
              onClick={() => run('revise', () => api.revise(token, id, instruction))}
            >
              Revise
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => run('approve', () => api.approve(token, id))}>
              Approve
            </button>
          </div>
          <label>
            Revision instruction
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Fewer emojis, tighter lede…"
            />
          </label>
          {content.status === 'APPROVED' || content.status === 'PUBLISHED' || content.status === 'FAILED' ? (
            <div className="actions">
              {content.type !== 'LINKEDIN' ? (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => run('wordpress', async () => (await api.publish(token, id, 'WORDPRESS')).content)}
                >
                  Publish to WordPress
                </button>
              ) : null}
              {content.type === 'LINKEDIN' ? (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => run('linkedin', async () => (await api.publish(token, id, 'LINKEDIN')).content)}
                >
                  Publish to LinkedIn
                </button>
              ) : null}
            </div>
          ) : null}
          {busy ? <p className="muted">{busy}…</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {content.seoTitle ? (
            <dl className="seo">
              <dt>SEO title</dt>
              <dd>{content.seoTitle}</dd>
              <dt>Meta</dt>
              <dd>{content.metaDescription}</dd>
              <dt>Keyword</dt>
              <dd>{content.focusKeyword}</dd>
            </dl>
          ) : null}
          {content.wordpressUrl ? (
            <p>
              WordPress: <a href={content.wordpressUrl}>{content.wordpressUrl}</a>
            </p>
          ) : null}
          {content.linkedinPostId ? <p>LinkedIn id: {content.linkedinPostId}</p> : null}
        </section>
        <aside>
          {linkedin ? (
            <LinkedInCard body={body} coverUrl={cover} imageAlt={content.imageAlt} />
          ) : (
            <ArticlePreview body={body} />
          )}
        </aside>
      </div>
    </Shell>
  );
}
