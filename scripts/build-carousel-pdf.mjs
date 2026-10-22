#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  loadCarouselDraft,
  renderCarouselHtml,
  resolveDocumentPath,
  validateCarousel,
} from './carousel-common.mjs';

export function resolvePdfOutputPath(carousel, explicitOut = null) {
  if (explicitOut) {
    return path.resolve(explicitOut);
  }

  const documentRef = typeof carousel.frontmatter.document === 'string' ? carousel.frontmatter.document.trim() : '';
  if (documentRef) {
    return resolveDocumentPath(carousel);
  }

  throw new Error('Missing frontmatter.document and no --out path provided');
}

export async function buildCarouselPdf(filePath, options = {}) {
  const carousel = loadCarouselDraft(filePath);
  const errors = validateCarousel(carousel).filter((error) => !error.includes('Document PDF not found'));
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const outPath = resolvePdfOutputPath(carousel, options.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const { html } = renderCarouselHtml(carousel, {
    mode: 'print',
    inlineBackground: true,
    includeWarnings: false,
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carousel-pdf-'));
  const tempHtml = path.join(tempDir, 'carousel-print.html');
  fs.writeFileSync(tempHtml, html, 'utf-8');

  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error('puppeteer is required. Run npm install first.');
  }

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, deviceScaleFactor: 1 });
    await page.goto(`file://${tempHtml}`, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outPath,
      width: `${SLIDE_WIDTH}px`,
      height: `${SLIDE_HEIGHT}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return {
    outPath,
    slideCount: carousel.frontmatter.slides?.length || 0,
  };
}

function parseArgs(argv) {
  const files = [];
  let out = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
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

  return { out, file: files[0] || null };
}

function printUsage() {
  console.log('Usage: node scripts/build-carousel-pdf.mjs [--out <pdf>] <carousel.md>');
}

export async function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs(argv);
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
    const result = await buildCarouselPdf(parsed.file, { out: parsed.out });
    console.log(`PDF written to ${path.relative(process.cwd(), result.outPath) || result.outPath}`);
    console.log(`Slides: ${result.slideCount}`);
  } catch (error) {
    console.error(`PDF build failed: ${error.message}`);
    process.exitCode = 1;
  }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
