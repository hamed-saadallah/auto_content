import Markdown from 'react-markdown';

export function ArticlePreview({ body }: { body: string }) {
  return (
    <article className="md-preview">
      <Markdown>{body || '*Empty draft*'}</Markdown>
    </article>
  );
}
