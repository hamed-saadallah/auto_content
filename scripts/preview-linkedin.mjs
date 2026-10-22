#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import matter from 'gray-matter';

import {
  LINKEDIN_COMMENTARY_MAX_LENGTH,
  escapeLinkedInCommentary,
  imageContentType,
  resolvePostImagePath,
  validatePost,
} from './publish-to-linkedin.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TEMPLATE_PATH = path.join(SCRIPT_DIR, 'templates', 'linkedin-preview.html');
export const DEFAULT_OUTPUT_PATH = path.join('.preview', 'index.html');
export const SEE_MORE_CHAR_LIMIT = 210;
export const PREVIEW_AUTHOR = 'Vous';

/**
 * Parse CLI flags for the preview script.
 */
export function parsePreviewArgs(argv) {
  const files = [];
  let noOpen = false;
  let out = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--no-open') {
      noOpen = true;
      continue;
    }
    if (arg === '--out') {
      out = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    files.push(arg);
  }

  return { noOpen, out, file: files[0] || null };
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

/**
 * Collapse the hook window the way LinkedIn’s “voir plus” typically does.
 */
export function splitSeeMore(text, limit = SEE_MORE_CHAR_LIMIT) {
  const value = normalizeNewlines(typeof text === 'string' ? text : '');
  if (value.length <= limit) {
    return { collapsed: value, expanded: value, truncated: false };
  }

  const window = value.slice(0, limit);
  const breakAt = Math.max(window.lastIndexOf('\n'), window.lastIndexOf(' '));
  const cut = breakAt >= Math.floor(limit * 0.6) ? breakAt : limit;

  return {
    collapsed: value.slice(0, cut).trimEnd(),
    expanded: value,
    truncated: true,
  };
}

export function highlightHashtags(escapedText) {
  return escapedText.replace(/(^|[\s])(#[^\s#<]+)/g, '$1<span class="hashtag">$2</span>');
}

/**
 * Render plain-text LinkedIn commentary as paragraphs. No Markdown.
 */
export function bodyToHtml(text) {
  const escaped = highlightHashtags(escapeHtml(normalizeNewlines(text)));
  if (!escaped) {
    return '';
  }
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function imageToDataUri(filePath) {
  const buffer = fs.readFileSync(filePath);
  const mime = imageContentType(filePath) || 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export function commentaryCharCount(body) {
  return body ? escapeLinkedInCommentary(body).length : 0;
}

export function charCountState(count, limit = LINKEDIN_COMMENTARY_MAX_LENGTH) {
  if (count > limit) return 'over-limit';
  if (count >= limit * 0.9) return 'near-limit';
  return '';
}

export function loadDraft(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const { data, content } = matter(fs.readFileSync(abs, 'utf-8'));
  return {
    path: abs,
    frontmatter: data || {},
    body: normalizeNewlines(content.trim()),
  };
}

export function loadTemplate(templatePath = DEFAULT_TEMPLATE_PATH) {
  return fs.readFileSync(templatePath, 'utf-8');
}

function hiddenAttr(isHidden) {
  return isHidden ? 'hidden' : '';
}

function warningsToHtml(warnings) {
  if (!warnings.length) {
    return '';
  }
  const items = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('');
  return `<aside class="warnings"><strong>À corriger avant publication</strong><ul>${items}</ul></aside>`;
}

function imageBlockHtml(src, alt) {
  if (!src) {
    return '';
  }
  return `<figure class="cover"><img src="${src}" alt="${escapeHtml(alt)}" /></figure>`;
}

/**
 * Build the filled preview HTML for a parsed draft.
 */
export function renderPreviewHtml(post, template = loadTemplate()) {
  const normalized = {
    ...post,
    frontmatter: post.frontmatter || {},
    body: normalizeNewlines(post.body),
  };
  const warnings = validatePost(normalized);
  const split = splitSeeMore(normalized.body);
  const charCount = commentaryCharCount(normalized.body);
  const imagePath = resolvePostImagePath(normalized);
  const hasImageFile = Boolean(imagePath && fs.existsSync(imagePath));
  const imageSrc = hasImageFile ? imageToDataUri(imagePath) : '';
  const imageAlt = typeof normalized.frontmatter.image_alt === 'string' ? normalized.frontmatter.image_alt : '';
  const sujet = typeof normalized.frontmatter.sujet === 'string' ? normalized.frontmatter.sujet : 'Brouillon';

  const replacements = {
    '{{TITLE}}': escapeHtml(`Aperçu LinkedIn — ${sujet}`),
    '{{AUTHOR}}': escapeHtml(PREVIEW_AUTHOR),
    '{{BODY_COLLAPSED_HTML}}': bodyToHtml(split.collapsed),
    '{{BODY_FULL_HTML}}': bodyToHtml(split.expanded),
    '{{COLLAPSED_ATTR}}': hiddenAttr(!split.truncated),
    '{{EXPANDED_ATTR}}': hiddenAttr(split.truncated),
    '{{SEE_MORE_ATTR}}': hiddenAttr(!split.truncated),
    '{{SEE_LESS_ATTR}}': hiddenAttr(!split.truncated),
    '{{IMAGE_HTML}}': imageBlockHtml(imageSrc, imageAlt),
    '{{CHAR_COUNT}}': String(charCount),
    '{{CHAR_LIMIT}}': String(LINKEDIN_COMMENTARY_MAX_LENGTH),
    '{{CHAR_STATE}}': charCountState(charCount),
    '{{WARNINGS_HTML}}': warningsToHtml(warnings),
  };

  let html = template;
  for (const [token, value] of Object.entries(replacements)) {
    html = html.split(token).join(value);
  }

  return {
    html,
    warnings,
    truncated: split.truncated,
    charCount,
    hasImage: Boolean(imageSrc),
  };
}

export function openInBrowser(filePath) {
  const abs = path.resolve(filePath);
  const target = pathToFileURL(abs).href;

  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', target], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  if (process.platform === 'darwin') {
    spawn('open', [target], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  spawn('xdg-open', [target], { detached: true, stdio: 'ignore' }).unref();
}

/**
 * Write the preview HTML and optionally open it.
 */
export function previewDraft(filePath, options = {}) {
  const post = loadDraft(filePath);
  const rendered = renderPreviewHtml(post, options.template || loadTemplate());
  const outPath = path.resolve(options.out || DEFAULT_OUTPUT_PATH);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rendered.html, 'utf-8');

  if (!options.noOpen) {
    openInBrowser(outPath);
  }

  return { outPath, ...rendered };
}

function printUsage() {
  console.log('Usage: node scripts/preview-linkedin.mjs [--no-open] [--out <html>] <draft.md>');
}

export function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parsePreviewArgs(argv);
  } catch (error) {
    console.error(error.message);
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!parsed.file) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  try {
    const result = previewDraft(parsed.file, { noOpen: parsed.noOpen, out: parsed.out });
    console.log(`Preview written to ${path.relative(process.cwd(), result.outPath) || result.outPath}`);
    if (result.warnings.length > 0) {
      console.log('Warnings:');
      result.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }
    if (!parsed.noOpen) {
      console.log('Opening browser…');
    }
  } catch (error) {
    console.error(`Preview failed: ${error.message}`);
    process.exitCode = 1;
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
