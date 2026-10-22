#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadCarouselDraft, renderCarouselHtml } from './carousel-common.mjs';
import { openInBrowser } from './preview-linkedin.mjs';

export const DEFAULT_OUTPUT_PATH = path.join('.preview', 'carousel.html');

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

export function previewCarousel(filePath, options = {}) {
  const carousel = loadCarouselDraft(filePath);
  const rendered = renderCarouselHtml(carousel, { mode: 'preview', inlineBackground: true });
  const outPath = path.resolve(options.out || DEFAULT_OUTPUT_PATH);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rendered.html, 'utf-8');

  if (!options.noOpen) {
    openInBrowser(outPath);
  }

  return { outPath, ...rendered };
}

function printUsage() {
  console.log('Usage: node scripts/preview-carousel.mjs [--no-open] [--out <html>] <draft.md>');
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
    const result = previewCarousel(parsed.file, { noOpen: parsed.noOpen, out: parsed.out });
    console.log(`Preview written to ${path.relative(process.cwd(), result.outPath) || result.outPath}`);
    console.log(`Slides: ${result.slideCount}`);
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
