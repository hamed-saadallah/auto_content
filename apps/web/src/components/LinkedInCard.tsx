type Props = {
  body: string;
  coverUrl?: string | null;
  imageAlt?: string | null;
  author?: string;
};

const SEE_MORE = 210;

function splitSeeMore(text: string): { collapsed: string; truncated: boolean } {
  const value = text.replace(/\r\n/g, '\n');
  if (value.length <= SEE_MORE) return { collapsed: value, truncated: false };
  const window = value.slice(0, SEE_MORE);
  const breakAt = Math.max(window.lastIndexOf('\n'), window.lastIndexOf(' '));
  const cut = breakAt >= Math.floor(SEE_MORE * 0.6) ? breakAt : SEE_MORE;
  return { collapsed: value.slice(0, cut).trimEnd(), truncated: true };
}

export function LinkedInCard({ body, coverUrl, imageAlt, author = 'Vous' }: Props) {
  const { collapsed, truncated } = splitSeeMore(body);
  const paragraphs = collapsed.split(/\n{2,}/).filter(Boolean);
  return (
    <article className="li-card">
      <header className="li-header">
        <div className="li-avatar">{author.slice(0, 1).toUpperCase()}</div>
        <div>
          <p className="li-name">{author}</p>
          <p className="li-sub">Aperçu local · Visible par tous</p>
        </div>
      </header>
      <div className="li-text">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
        {truncated ? <button type="button" className="li-more">…voir plus</button> : null}
      </div>
      {coverUrl ? <img className="li-cover" src={coverUrl} alt={imageAlt || ''} /> : null}
      <footer className="li-count">{body.length} / 3000</footer>
    </article>
  );
}
