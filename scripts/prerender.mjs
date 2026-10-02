// Bakes a static, crawlable HTML page for every route into dist/ (after `vite build`):
//   dist/index.html, dist/lesson/<id>/index.html, dist/playground/index.html, dist/about/index.html
// each with its own <title>, meta description, canonical URL, Open Graph / Twitter tags, JSON-LD,
// and the lesson text itself inside #app (the app replaces it as soon as the JavaScript runs).
// It also writes sitemap.xml, robots.txt and a 404.html (the SPA shell, for static hosts).
//   SITE_URL=https://example.com node scripts/prerender.mjs   (default: see src/seo.js)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessons, parts } from '../src/lessons/index.js';
import { SITE, pageMeta, headTags, lessonPath } from '../src/seo.js';
import { renderMarkdown, escapeHtml as esc } from '../src/md.js';
import { NOTES } from '../src/about.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found: run `vite build` first.');
  process.exit(1);
}
const template = readFileSync(join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--SEO_HEAD-->') || !template.includes('<!--SEO_BODY-->'))
  throw new Error('index.html lost its SEO markers');

const write = (path, content) => {
  const file = join(dist, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

/* ---------- static page bodies ---------- */
const brand = `<a class="brand" href="/"><span class="logo" aria-hidden="true">?-</span><span class="brand-text">Prolog<span class="brand-ez">EZ</span></span></a>`;

function nav(activeId) {
  let n = 0;
  return `<nav class="sidebar" id="sidebar" aria-label="Lessons">${parts
    .map(
      (p) =>
        `<div class="nav-group"><div class="nav-part">${esc(p.name)}</div><ul>${p.lessons
          .map((l) => {
            n++;
            return `<li><a href="${lessonPath(l.id)}"${l.id === activeId ? ' aria-current="page"' : ''}><span class="nav-num">${n}</span><span class="nav-title">${esc(l.title)}</span></a></li>`;
          })
          .join('')}</ul></div>`,
    )
    .join(
      '',
    )}<div class="nav-group"><div class="nav-part">Tools</div><ul><li><a href="/playground/"><span class="nav-title">Playground</span></a></li><li><a href="/about/"><span class="nav-title">About this notebook</span></a></li></ul></div><p class="credit">Made by <a href="${SITE.author.url}" rel="author noopener">${esc(SITE.author.name)}</a></p></nav>`;
}

const shell = (activeId, main) =>
  `<header class="topbar">${brand}<div class="spacer"></div></header><div class="layout">${nav(activeId)}<div class="scrim"></div><main id="main" tabindex="-1"><div id="view">${main}</div></main></div>`;

function blockHtml(b) {
  if (b.t === 'md') return `<div class="prose">${renderMarkdown(b.text)}</div>`;
  if (b.t === 'program')
    return `<section class="cell cell-program"><pre class="static-code"><code>${esc(b.code)}</code></pre></section>`;
  if (b.t === 'query')
    return `<section class="cell cell-query"><pre class="static-code"><code>?- ${esc(b.code)}</code></pre></section>`;
  if (b.t === 'exercise')
    return `<section class="cell cell-exercise"><div class="prose"><h3>Exercise: ${esc(b.title || '')}</h3>${renderMarkdown(b.prompt)}</div></section>`;
  return '';
}

function lessonBody(l, i) {
  const prev = lessons[i - 1];
  const next = lessons[i + 1];
  return `<article class="lesson"><header class="lesson-head"><div class="eyebrow">${esc(l.part)} · Lesson ${i + 1} of ${lessons.length}</div><h1>${esc(l.title)}</h1><p class="lede">${esc(l.summary)}</p></header><div class="notebook">${l.blocks.map(blockHtml).join('')}</div><footer class="lesson-foot"><div class="pager">${prev ? `<a class="btn" href="${lessonPath(prev.id)}"><span>${esc(prev.title)}</span></a>` : '<span></span>'}${next ? `<a class="btn btn-primary" href="${lessonPath(next.id)}"><span>${esc(next.title)}</span></a>` : '<a class="btn btn-primary" href="/playground/"><span>Go to the playground</span></a>'}</div></footer></article>`;
}

const homeBody = () =>
  `<section class="hero"><div class="hero-kicker">An interactive course</div><h1>Learn Prolog by <span class="hl">running it</span>.</h1><p class="hero-lede">A notebook for logic programming. Start with facts and queries, finish with grammars, puzzles and meta-interpreters. Every idea comes with live code you can edit and execute in your browser, real SWI-Prolog, no install.</p><div class="hero-cta"><a class="btn btn-primary btn-lg" href="${lessonPath(lessons[0].id)}">Start learning</a><a class="btn btn-lg" href="/playground/">Open the playground</a></div></section>${parts
    .map(
      (p) =>
        `<section class="curriculum" id="${p.name.toLowerCase().replace(/[^a-z]+/g, '-')}"><h2>${esc(p.name)}</h2><div class="cards">${p.lessons
          .map(
            (l) =>
              `<a class="card" href="${lessonPath(l.id)}"><span class="card-body"><span class="card-title">${esc(l.title)}</span><span class="card-sum">${esc(l.summary)}</span></span></a>`,
          )
          .join('')}</div></section>`,
    )
    .join('')}`;

const playgroundBody = () =>
  `<article class="lesson"><header class="lesson-head"><div class="eyebrow">Tools</div><h1>Prolog playground</h1><p class="lede">A free online Prolog notebook. Add program and query cells, or start from an example, and run them with real SWI-Prolog in your browser. Everything is saved in your browser.</p></header><p class="prose">New to Prolog? Start with the <a href="${lessonPath(lessons[0].id)}">first lesson</a>.</p></article>`;

const aboutBody = () =>
  `<article class="lesson"><header class="lesson-head"><div class="eyebrow">About</div><h1>About this notebook</h1></header><div class="prose">${renderMarkdown(NOTES).replace(/ target="_blank" rel="noopener"/g, ' rel="noopener"')}</div></article>`;

/* ---------- pages ---------- */
function page(route, activeId, main) {
  const meta = pageMeta(route, lessons);
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace('<!--SEO_HEAD-->', headTags(meta))
    .replace('<!--SEO_BODY-->', shell(activeId, main));
  return { html, meta };
}

const pages = [];
const add = (route, activeId, main, file) => {
  const { html, meta } = page(route, activeId, main);
  write(file, html);
  pages.push(meta.path);
};

add({ name: 'home' }, null, homeBody(), 'index.html');
lessons.forEach((l, i) =>
  add({ name: 'lesson', id: l.id }, l.id, lessonBody(l, i), `lesson/${l.id}/index.html`),
);
add({ name: 'playground' }, null, playgroundBody(), 'playground/index.html');
add({ name: 'about' }, null, aboutBody(), 'about/index.html');

// SPA shell for unknown URLs (hosts that serve 404.html): not indexed.
write(
  '404.html',
  template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>Page not found | ${SITE.name}</title>`)
    .replace('<!--SEO_HEAD-->', headTags(pageMeta({ name: 'notfound' }, lessons)))
    .replace('<!--SEO_BODY-->', ''),
);

/* ---------- sitemap and robots ---------- */
const base = SITE.url.replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);
const priority = (p) => (p === '/' ? '1.0' : p.startsWith('/lesson/') ? '0.8' : '0.6');
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map(
      (p) =>
        `  <url><loc>${base}${p}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${priority(p)}</priority></url>`,
    )
    .join('\n')}\n</urlset>\n`,
);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);

console.log(
  `Pre-rendered ${pages.length} pages + 404.html, sitemap.xml and robots.txt for ${base}`,
);
