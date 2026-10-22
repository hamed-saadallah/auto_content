import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

import {
  LINKEDIN_COMMENTARY_MAX_LENGTH,
  escapeLinkedInCommentary,
  imageContentType,
} from './publish-to-linkedin.mjs';

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;
export const DEFAULT_SLIDE_COUNT = 9;
export const MIN_SLIDES = 2;
export const MAX_SLIDES = 20;
export const MAX_SLIDE_TITLE_CHARS = 80;
export const MAX_SLIDE_BODY_CHARS = 400;
export const MAX_BULLETS_PER_SLIDE = 5;
export const MAX_BULLET_CHARS = 100;
export const MAX_SLIDE_WORDS = 90;

export const DEFAULT_THEME = {
  bg: '#f6f1e8',
  ink: '#191919',
  accent: '#b4532a',
  font: 'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif',
  primary: '#b4532a',
  secondary: '#191919',
};

function pickThemeColor(theme, keys, fallback) {
  for (const key of keys) {
    if (typeof theme?.[key] === 'string' && theme[key].trim()) {
      return theme[key].trim();
    }
  }
  return fallback;
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function normalizeTheme(theme = {}) {
  const bg = pickThemeColor(theme, ['bg'], DEFAULT_THEME.bg);
  const ink = pickThemeColor(theme, ['ink', 'secondary'], DEFAULT_THEME.ink);
  const accent = pickThemeColor(theme, ['accent', 'primary'], DEFAULT_THEME.accent);
  const font = typeof theme.font === 'string' && theme.font.trim() ? theme.font.trim() : DEFAULT_THEME.font;

  return {
    bg,
    ink,
    accent,
    font,
    primary: accent,
    secondary: ink,
  };
}

export function formatSlideIndex(index, total) {
  const current = String((Number(index) || 0) + 1).padStart(2, '0');
  const count = String(Math.max(Number(total) || 1, 1)).padStart(2, '0');
  return `${current} / ${count}`;
}

export function loadCarouselDraft(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }

  const { data, content } = matter(fs.readFileSync(abs, 'utf-8'));
  const frontmatter = data || {};
  const slides = Array.isArray(frontmatter.slides) ? frontmatter.slides : [];

  return {
    path: abs,
    frontmatter: {
      ...frontmatter,
      slides,
      theme: normalizeTheme(frontmatter.theme),
    },
    body: normalizeNewlines(content.trim()),
  };
}

export function resolveAssetPath(carousel, relativePath) {
  const asset = typeof relativePath === 'string' ? relativePath.trim() : '';
  if (!asset) return null;
  if (path.isAbsolute(asset)) return asset;
  const mdDir = carousel.path ? path.dirname(path.resolve(carousel.path)) : process.cwd();
  return path.resolve(mdDir, asset);
}

export function resolveSlideBackgroundPath(carousel, slide) {
  return resolveAssetPath(carousel, slide?.background);
}

export function resolveDocumentPath(carousel) {
  return resolveAssetPath(carousel, carousel.frontmatter.document);
}

export function imageToDataUri(filePath) {
  const buffer = fs.readFileSync(filePath);
  const mime = imageContentType(filePath) || 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function slideWordCount(slide) {
  const title = typeof slide.title === 'string' ? slide.title : '';
  const body = typeof slide.body === 'string' ? slide.body : '';
  const bullets = Array.isArray(slide.bullets) ? slide.bullets.join(' ') : '';
  return `${title} ${body} ${bullets}`.trim().split(/\s+/).filter(Boolean).length;
}

export function validateCarousel(carousel) {
  const errors = [];
  const { frontmatter, body } = carousel;

  if (!frontmatter.sujet) {
    errors.push('Missing frontmatter: sujet');
  }
  if (!frontmatter.date) {
    errors.push('Missing frontmatter: date');
  }
  if (frontmatter.platform && frontmatter.platform !== 'linkedin-carousel') {
    errors.push(`Unexpected platform: ${frontmatter.platform} (expected linkedin-carousel)`);
  }
  if (!body) {
    errors.push('Commentary body is empty');
  }

  const commentaryLength = body ? escapeLinkedInCommentary(body).length : 0;
  if (commentaryLength > LINKEDIN_COMMENTARY_MAX_LENGTH) {
    errors.push(
      `Commentary exceeds LinkedIn limit (${commentaryLength}/${LINKEDIN_COMMENTARY_MAX_LENGTH} characters)`
    );
  }

  const markdownPatterns = [
    { pattern: /\*\*[^*]+\*\*/, message: 'Markdown bold (**text**) is not rendered on LinkedIn' },
    { pattern: /^#{1,6}\s/m, message: 'Markdown headings (#) are not rendered on LinkedIn' },
    { pattern: /\[([^\]]+)\]\(([^)]+)\)/, message: 'Markdown links ([text](url)) are not rendered on LinkedIn' },
  ];

  for (const { pattern, message } of markdownPatterns) {
    if (body && pattern.test(body)) {
      errors.push(message);
    }
  }

  const slides = Array.isArray(frontmatter.slides) ? frontmatter.slides : [];
  if (slides.length < MIN_SLIDES) {
    errors.push(`At least ${MIN_SLIDES} slides are required`);
  }
  if (slides.length > MAX_SLIDES) {
    errors.push(`At most ${MAX_SLIDES} slides are allowed`);
  }

  slides.forEach((slide, index) => {
    const label = `Slide ${index + 1}`;
    if (!slide?.title || !String(slide.title).trim()) {
      errors.push(`${label}: missing title`);
    } else if (String(slide.title).length > MAX_SLIDE_TITLE_CHARS) {
      errors.push(`${label}: title exceeds ${MAX_SLIDE_TITLE_CHARS} characters`);
    }

    const hasBody = typeof slide.body === 'string' && slide.body.trim().length > 0;
    const bullets = Array.isArray(slide.bullets) ? slide.bullets.filter(Boolean) : [];
    if (!hasBody && bullets.length === 0) {
      errors.push(`${label}: needs body or bullets`);
    }
    if (hasBody && String(slide.body).length > MAX_SLIDE_BODY_CHARS) {
      errors.push(`${label}: body exceeds ${MAX_SLIDE_BODY_CHARS} characters`);
    }
    if (bullets.length > MAX_BULLETS_PER_SLIDE) {
      errors.push(`${label}: at most ${MAX_BULLETS_PER_SLIDE} bullets allowed`);
    }
    bullets.forEach((bullet, bulletIndex) => {
      if (String(bullet).length > MAX_BULLET_CHARS) {
        errors.push(`${label}, bullet ${bulletIndex + 1}: exceeds ${MAX_BULLET_CHARS} characters`);
      }
    });
    if (slideWordCount(slide) > MAX_SLIDE_WORDS) {
      errors.push(`${label}: keep slide copy under ~${MAX_SLIDE_WORDS} words`);
    }

    const background = typeof slide.background === 'string' ? slide.background.trim() : '';
    if (background) {
      const resolved = resolveSlideBackgroundPath(carousel, slide);
      if (!resolved || !fs.existsSync(resolved)) {
        errors.push(`${label}: background file not found (${background})`);
      }
    }
  });

  const documentRef = typeof frontmatter.document === 'string' ? frontmatter.document.trim() : '';
  if (documentRef) {
    const resolved = resolveDocumentPath(carousel);
    if (!resolved || !fs.existsSync(resolved)) {
      errors.push(`Document PDF not found: ${documentRef}`);
    } else if (path.extname(resolved).toLowerCase() !== '.pdf') {
      errors.push(`Document must be a PDF (${documentRef})`);
    }
  }

  const documentTitle =
    typeof frontmatter.document_title === 'string' ? frontmatter.document_title.trim() : '';
  if (documentRef && !documentTitle) {
    errors.push('Missing frontmatter: document_title (required when document is set)');
  }

  return errors;
}

function resolveSlideImageUrl(backgroundPath, inlineBackground) {
  if (!backgroundPath || !fs.existsSync(backgroundPath)) {
    return '';
  }
  return inlineBackground ? imageToDataUri(backgroundPath) : pathToFileUrl(backgroundPath);
}

export function renderSlideInnerHtml(slide, theme = DEFAULT_THEME, options = {}) {
  const title = escapeHtml(slide.title || '');
  const body = typeof slide.body === 'string' && slide.body.trim() ? escapeHtml(slide.body.trim()) : '';
  const bullets = Array.isArray(slide.bullets) ? slide.bullets.filter(Boolean) : [];
  const role = slide.role || 'content';
  const imageUrl = typeof options.imageUrl === 'string' ? options.imageUrl : '';
  const indexLabel = formatSlideIndex(options.index, options.total);

  const bulletsHtml = bullets.length
    ? `<ul class="slide-bullets">${bullets
        .map((bullet) => `<li>${escapeHtml(String(bullet))}</li>`)
        .join('')}</ul>`
    : '';

  const bodyHtml = body ? `<p class="slide-body">${body.replace(/\n/g, '<br>')}</p>` : '';
  const wellInner = imageUrl
    ? `<img class="slide-well-image" src="${imageUrl}" alt="" />`
    : '<div class="slide-well-fallback" aria-hidden="true"></div>';

  return `
    <div class="slide-card role-${escapeHtml(role)}" style="--bg:${theme.bg};--ink:${theme.ink};--accent:${theme.accent};--font:${theme.font};--primary:${theme.primary};--secondary:${theme.secondary};">
      <div class="slide-well${imageUrl ? ' has-image' : ''}">${wellInner}</div>
      <div class="slide-content">
        <p class="slide-index">${escapeHtml(indexLabel)}</p>
        <h2 class="slide-title">${title}</h2>
        ${bodyHtml}
        ${bulletsHtml}
      </div>
    </div>
  `.trim();
}

export function renderSlidePageHtml(slide, options = {}) {
  const theme = normalizeTheme(options.theme);
  const imageUrl = resolveSlideImageUrl(options.backgroundPath, options.inlineBackground !== false);

  return `
    <section class="slide-page" data-slide-id="${escapeHtml(String(slide.id ?? ''))}">
      <div class="slide-frame">
        ${renderSlideInnerHtml(slide, theme, {
          index: options.index ?? 0,
          total: options.total ?? 1,
          imageUrl,
        })}
      </div>
    </section>
  `.trim();
}

function pathToFileUrl(filePath) {
  const resolved = path.resolve(filePath).replace(/\\/g, '/');
  return `file://${resolved}`;
}

export function renderSlidesHtml(carousel, options = {}) {
  const theme = normalizeTheme(carousel.frontmatter.theme);
  const slides = carousel.frontmatter.slides || [];
  const inlineBackground = options.inlineBackground !== false;
  const total = slides.length;

  return slides
    .map((slide, index) => {
      const backgroundPath = resolveSlideBackgroundPath(carousel, slide);
      return renderSlidePageHtml(slide, { theme, backgroundPath, inlineBackground, index, total });
    })
    .join('\n');
}

export function renderCarouselShellHtml({ title, sujet, slidesHtml, mode = 'preview', warnings = [] }) {
  const warningsHtml = warnings.length
    ? `<aside class="warnings"><strong>À corriger avant publication</strong><ul>${warnings
        .map((warning) => `<li>${escapeHtml(warning)}</li>`)
        .join('')}</ul></aside>`
    : '';

  const isPrint = mode === 'print';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title || `Carousel — ${sujet || 'Brouillon'}`)}</title>
  <style>
    :root {
      --slide-w: ${SLIDE_WIDTH}px;
      --slide-h: ${SLIDE_HEIGHT}px;
      --feed-bg: #f4f2ee;
      --card: #ffffff;
      --muted: #666666;
      --border: #e0dfdc;
      --warn-bg: #fef3c7;
      --warn-ink: #92400e;
      --warn-border: #f59e0b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #191919;
      background: ${isPrint ? '#ffffff' : 'var(--feed-bg)'};
    }
    .page {
      width: min(720px, 100% - 1.5rem);
      margin: 0 auto;
      padding: ${isPrint ? '0' : '1.5rem 0 2.5rem'};
    }
    .chrome { margin-bottom: 0.85rem; }
    .chrome h1 { margin: 0 0 0.25rem; font-size: 0.95rem; font-weight: 600; color: var(--muted); }
    .chrome p { margin: 0; font-size: 0.8rem; color: var(--muted); }
    .warnings {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--warn-border);
      background: var(--warn-bg);
      color: var(--warn-ink);
      font-size: 0.85rem;
    }
    .warnings ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
    .deck-shell {
      background: var(--card);
      border: ${isPrint ? 'none' : '1px solid var(--border)'};
      border-radius: ${isPrint ? '0' : '12px'};
      padding: ${isPrint ? '0' : '1rem'};
      box-shadow: ${isPrint ? 'none' : '0 8px 24px rgba(0,0,0,0.08)'};
    }
    .viewport {
      position: relative;
      width: 100%;
      max-width: var(--slide-w);
      margin: 0 auto;
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border-radius: ${isPrint ? '0' : '8px'};
      background: #f6f1e8;
    }
    .slides {
      display: flex;
      width: 100%;
      height: 100%;
      transition: transform 0.35s ease;
    }
    .slide-page {
      min-width: 100%;
      height: 100%;
    }
    .slide-frame {
      width: 100%;
      height: 100%;
      position: relative;
      background: #f6f1e8;
    }
    .slide-card {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      font-family: var(--font);
      color: var(--ink);
      background: var(--bg);
    }
    .slide-well {
      flex: 0 0 16%;
      position: relative;
      overflow: hidden;
      background-color: #efe6d6;
      background-image:
        radial-gradient(circle at 18% 28%, color-mix(in srgb, var(--accent) 34%, transparent), transparent 46%),
        radial-gradient(circle at 84% 78%, color-mix(in srgb, var(--ink) 12%, transparent), transparent 42%),
        repeating-linear-gradient(-18deg, transparent, transparent 10px, rgba(25, 25, 25, 0.045) 11px);
    }
    .slide-well.has-image {
      background: #d9d1c4;
    }
    .slide-well-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }
    .slide-well-fallback {
      position: absolute;
      inset: 0;
    }
    .slide-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding: 2.4rem 2.6rem 2.8rem;
      min-height: 0;
    }
    .slide-index {
      margin: 0 0 0.8rem;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 0.78rem;
      letter-spacing: 0.16em;
      font-weight: 600;
      color: var(--accent);
    }
    .slide-title {
      margin: 0 0 0.75rem;
      font-size: clamp(1.55rem, 3.8vw, 2.2rem);
      line-height: 1.1;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .slide-body {
      margin: 0 0 1rem;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: clamp(0.95rem, 2.3vw, 1.12rem);
      line-height: 1.45;
      max-width: 42ch;
      color: color-mix(in srgb, var(--ink) 86%, white);
    }
    .slide-bullets {
      margin: 0;
      padding: 0;
      list-style: none;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: clamp(0.9rem, 2.2vw, 1.05rem);
      line-height: 1.45;
    }
    .slide-bullets li {
      position: relative;
      margin: 0.45rem 0;
      padding-left: 1.15rem;
    }
    .slide-bullets li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.55em;
      width: 0.42rem;
      height: 0.42rem;
      border-radius: 999px;
      background: var(--accent);
    }
    .role-hook .slide-well { flex-basis: 20%; }
    .role-hook .slide-title { font-size: clamp(1.7rem, 4.2vw, 2.4rem); }
    .role-problem .slide-well,
    .role-why .slide-well { flex-basis: 16%; }
    .role-problem .slide-content,
    .role-why .slide-content {
      border-left: 6px solid var(--accent);
      padding-left: 2.1rem;
    }
    .role-value .slide-well { flex-basis: 14%; }
    .role-mistakes .slide-well { flex-basis: 14%; }
    .role-mistakes .slide-content {
      border-top: 4px solid var(--accent);
    }
    .role-cta .slide-well { flex-basis: 14%; }
    .role-cta .slide-content {
      justify-content: flex-start;
      align-items: center;
      text-align: center;
    }
    .role-cta .slide-body,
    .role-cta .slide-bullets { max-width: 42ch; }
    .controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 0.85rem;
    }
    .controls button {
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 999px;
      padding: 0.45rem 0.9rem;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .controls button:hover { border-color: #b4532a; color: #b4532a; }
    .dots { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: center; flex: 1; }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #cbd5e1;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    .dot.active { background: #b4532a; width: 18px; }
    .counter { font-size: 0.8rem; color: var(--muted); min-width: 4.5rem; text-align: right; }
    ${isPrint ? `
    @page { size: ${SLIDE_WIDTH}px ${SLIDE_HEIGHT}px; margin: 0; }
    .page, .deck-shell, .viewport, .slides, .slide-page, .slide-frame { width: var(--slide-w); height: var(--slide-h); max-width: none; aspect-ratio: auto; }
    .chrome, .controls, .warnings { display: none !important; }
    .deck-shell { padding: 0; border: none; }
    .viewport { overflow: visible; border-radius: 0; }
    .slides { display: block; transform: none !important; }
    .slide-page { page-break-after: always; break-after: page; }
    .slide-page:last-child { page-break-after: auto; break-after: auto; }
    ` : ''}
  </style>
</head>
<body>
  <div class="page">
    ${isPrint ? '' : `<header class="chrome"><h1>Aperçu carousel LinkedIn — ${escapeHtml(sujet || 'Brouillon')}</h1><p>Format 4:5 · swipe ou flèches · un PDF par slide à l’export</p></header>`}
    ${isPrint ? '' : warningsHtml}
    <div class="deck-shell">
      <div class="viewport" id="viewport">
        <div class="slides" id="slides">
          ${slidesHtml}
        </div>
      </div>
      ${isPrint ? '' : `<div class="controls">
        <button type="button" id="prev">← Préc.</button>
        <div class="dots" id="dots"></div>
        <span class="counter" id="counter">1 / 1</span>
        <button type="button" id="next">Suiv. →</button>
      </div>`}
    </div>
  </div>
  ${isPrint ? '' : `<script>
    (function () {
      var slides = document.getElementById('slides');
      var dots = document.getElementById('dots');
      var counter = document.getElementById('counter');
      var total = slides.children.length;
      var index = 0;
      function render() {
        slides.style.transform = 'translateX(-' + (index * 100) + '%)';
        counter.textContent = (index + 1) + ' / ' + total;
        Array.prototype.forEach.call(dots.children, function (dot, i) {
          dot.classList.toggle('active', i === index);
        });
      }
      for (var i = 0; i < total; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', function (j) { return function () { index = j; render(); }; }(i));
        dots.appendChild(dot);
      }
      document.getElementById('prev').addEventListener('click', function () {
        index = (index - 1 + total) % total;
        render();
      });
      document.getElementById('next').addEventListener('click', function () {
        index = (index + 1) % total;
        render();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft') { index = (index - 1 + total) % total; render(); }
        if (event.key === 'ArrowRight') { index = (index + 1) % total; render(); }
      });
      render();
    })();
  </script>`}
</body>
</html>`;
}

export function renderCarouselHtml(carousel, options = {}) {
  const warnings = options.includeWarnings === false ? [] : validateCarousel(carousel);
  const slidesHtml = renderSlidesHtml(carousel, options);
  const sujet = typeof carousel.frontmatter.sujet === 'string' ? carousel.frontmatter.sujet : 'Brouillon';

  const html = renderCarouselShellHtml({
    title: options.title || `Aperçu carousel — ${sujet}`,
    sujet,
    slidesHtml,
    mode: options.mode || 'preview',
    warnings,
  });

  return { html, warnings, slideCount: carousel.frontmatter.slides?.length || 0 };
}

export function buildLinkedInDocumentPostPayload(authorUrn, commentary, documentMedia) {
  return {
    author: authorUrn,
    commentary: escapeLinkedInCommentary(commentary),
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
    content: {
      media: {
        title: documentMedia.title,
        id: documentMedia.id,
      },
    },
  };
}
