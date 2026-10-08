import '@lucabonaldo/design/fonts.css';
import '@lucabonaldo/design/tokens.css';
import './style.css';
import {
  getStoredTheme,
  initTheme,
  isDark,
  onThemeChange,
  setTheme,
  toggleTheme,
} from '@lucabonaldo/design';
import { lessons, parts } from './lessons/index.js';
import { mountSearch } from './search.js';
import { NOTES } from './about.js';
import { pageMeta, applyMeta, lessonPath } from './seo.js';
import { renderLesson } from './notebook.js';
import { renderMarkdown } from './md.js';
import { load, save, removeAll } from './store.js';
import { warmUp } from './engine.js';
import { examples } from './playground.js';
import { program, query } from './lessons/dsl.js';

const $ = (sel, root = document) => root.querySelector(sel);
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ICONS = {
  menu: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  github:
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.9.83.09-.64.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>',
  arrowLeft:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/* ---------- progress ---------- */
let done = new Set(load('done', []));
const saveDone = () => save('done', [...done]);
const lessonIndex = (id) => lessons.findIndex((l) => l.id === id);

/* ---------- shell ---------- */
const app = $('#app');
app.innerHTML = `
  <header class="topbar">
    <button class="icon-btn menu-btn" aria-label="Open lessons menu" aria-controls="sidebar" aria-expanded="false">${ICONS.menu}</button>
    <a class="brand" href="/"><span class="logo" aria-hidden="true">?-</span><span class="brand-text">Prolog<span class="brand-ez">EZ</span></span></a>
    <div class="spacer"></div>
    <div class="search-host"></div>
    <a class="icon-btn gh-btn" href="https://github.com/LucaBonaldoIT/prologez" target="_blank" rel="noopener noreferrer" aria-label="PrologEZ on GitHub" title="PrologEZ on GitHub">${ICONS.github}</a>
    <button class="icon-btn theme-btn" aria-label="Toggle dark mode"></button>
  </header>
  <div class="layout">
    <nav class="sidebar" id="sidebar" aria-label="Lessons"></nav>
    <div class="scrim"></div>
    <main id="main" tabindex="-1"><div id="view"></div></main>
  </div>`;

let pendingHit = null;
mountSearch($('.search-host'), ({ id, block }) => {
  pendingHit = { id, block };
  navigate(lessonPath(id));
});
/** After a search pick: scroll to the matching block and flash it. */
function applyPendingHit() {
  const hit = pendingHit;
  pendingHit = null;
  if (!hit || hit.block < 0) return;
  const el = $('#notebook')?.children[hit.block];
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  el.classList.add('search-hit');
  setTimeout(() => el.classList.remove('search-hit'), 2200);
}

const sidebar = $('#sidebar');
const view = $('#view');
const menuBtn = $('.menu-btn');

function setNav(open) {
  document.body.classList.toggle('nav-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
}
menuBtn.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
$('.scrim').addEventListener('click', () => setNav(false));
document.addEventListener('keydown', (e) => e.key === 'Escape' && setNav(false));

/* theme: state, persistence and theme-color come from the design system */
// carry over a choice saved before the shared theme cookie existed
try {
  const legacy = localStorage.getItem('plnb:theme');
  if (legacy === 'light' || legacy === 'dark') {
    if (!getStoredTheme()) setTheme(legacy);
    localStorage.removeItem('plnb:theme');
  }
} catch {
  /* ignore */
}
const themeBtn = $('.theme-btn');
function paintThemeBtn() {
  themeBtn.innerHTML = isDark() ? ICONS.sun : ICONS.moon;
  themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
}
themeBtn.addEventListener('click', toggleTheme);
onThemeChange(paintThemeBtn);
initTheme();
paintThemeBtn();

/* ---------- sidebar ---------- */
function renderSidebar(activeId) {
  const total = lessons.length;
  const count = lessons.filter((l) => done.has(l.id)).length;
  let n = 0;
  sidebar.innerHTML = `
    <div class="progress" aria-label="Progress">
      <div class="progress-text"><strong>${count}</strong> of ${total} lessons complete</div>
      <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${count}"><span style="width:${(count / total) * 100}%"></span></div>
    </div>
    ${parts
      .map(
        (p) => `
      <div class="nav-group">
        <div class="nav-part">${esc(p.name)}</div>
        <ul>${p.lessons
          .map((l) => {
            n++;
            return `<li><a href="${lessonPath(l.id)}" class="${l.id === activeId ? 'active' : ''}" ${l.id === activeId ? 'aria-current="page"' : ''}>
              <span class="nav-num ${done.has(l.id) ? 'is-done' : ''}">${done.has(l.id) ? ICONS.check : n}</span>
              <span class="nav-title">${esc(l.title)}</span></a></li>`;
          })
          .join('')}</ul>
      </div>`,
      )
      .join('')}
    <div class="nav-group">
      <div class="nav-part">Tools</div>
      <ul>
        <li><a href="/playground/" class="${activeId === 'playground' ? 'active' : ''}"><span class="nav-num alt">›_</span><span class="nav-title">Playground</span></a></li>
        <li><a href="/about/" class="${activeId === 'about' ? 'active' : ''}"><span class="nav-num alt">i</span><span class="nav-title">About this notebook</span></a></li>
      </ul>
    </div>
    <p class="credit">Made by <a href="https://lucabonaldo.dev/" target="_blank" rel="author noopener">Luca Bonaldo</a></p>`;
}

/* ---------- views ---------- */
function nextLesson() {
  return lessons.find((l) => !done.has(l.id)) || lessons[0];
}

function viewHome() {
  const next = nextLesson();
  const started = done.size > 0;
  let n = 0;
  view.innerHTML = `
    <section class="hero">
      <div class="hero-kicker">An interactive course</div>
      <h1>Learn Prolog by <span class="hl">running it</span>.</h1>
      <p class="hero-lede">A notebook for logic programming. Start with facts and queries, finish with grammars, puzzles and meta-interpreters. Every idea comes with live code you can edit and execute in your browser, real SWI-Prolog, no install.</p>
      <div class="hero-cta">
        <a class="btn btn-primary btn-lg" href="${lessonPath(next.id)}">${started ? 'Continue' : 'Start learning'} ${ICONS.arrow}</a>
        <a class="btn btn-lg" href="/playground/">Open the playground</a>
      </div>
      <ul class="hero-points">
        <li><strong>Read</strong> a short explanation</li>
        <li><strong>Run</strong> the example, then change it</li>
        <li><strong>Practice</strong> with auto-checked exercises</li>
      </ul>
      <pre class="hero-code" aria-hidden="true"><span class="c">% a taste</span>
<span class="a">parent</span>(tom, bob).   <span class="a">parent</span>(bob, ann).
<span class="a">grandparent</span>(G, C) <span class="o">:-</span> <span class="a">parent</span>(G, P), <span class="a">parent</span>(P, C).

<span class="o">?-</span> grandparent(tom, Who).
<span class="r">Who = ann.</span></pre>
    </section>
    ${parts
      .map(
        (p) => `
      <section class="curriculum" id="${slug(p.name)}">
        <h2>${esc(p.name)}</h2>
        <div class="cards">${p.lessons
          .map((l) => {
            n++;
            return `<a class="card ${done.has(l.id) ? 'is-done' : ''}" href="${lessonPath(l.id)}">
              <span class="card-num">${done.has(l.id) ? ICONS.check : n}</span>
              <span class="card-body"><span class="card-title">${esc(l.title)}</span><span class="card-sum">${esc(l.summary)}</span></span></a>`;
          })
          .join('')}</div>
      </section>`,
      )
      .join('')}`;
}

function viewLesson(id) {
  const i = lessonIndex(id);
  if (i < 0) return viewHome();
  const lesson = lessons[i];
  const prev = lessons[i - 1];
  const next = lessons[i + 1];
  view.innerHTML = `
    <article class="lesson">
      <header class="lesson-head">
        <div class="eyebrow">${esc(lesson.part)} · Lesson ${i + 1} of ${lessons.length}</div>
        <h1>${esc(lesson.title)}</h1>
        <p class="lede">${esc(lesson.summary)}</p>
        <div class="lesson-tools">
          <button class="btn btn-sm" data-act="runall">Run all cells</button>
          <button class="btn btn-sm btn-ghost" data-act="reset">Reset lesson</button>
        </div>
      </header>
      <div class="notebook" id="notebook"></div>
      <footer class="lesson-foot">
        <div class="pager">
          ${prev ? `<a class="btn" href="${lessonPath(prev.id)}">${ICONS.arrowLeft}<span>${esc(prev.title)}</span></a>` : '<span></span>'}
          ${next ? `<a class="btn btn-primary" data-act="next" href="${lessonPath(next.id)}"><span>${esc(next.title)}</span>${ICONS.arrow}</a>` : `<a class="btn btn-primary" data-act="next" href="/playground/"><span>Go to the playground</span>${ICONS.arrow}</a>`}
        </div>
      </footer>
    </article>`;
  const nb = renderLesson(lesson, $('#notebook'), {
    onSolved: () => {
      if (nb.allSolved() && !done.has(id)) {
        done.add(id);
        saveDone();
        renderSidebar(id);
      }
    },
  });
  view.addEventListener(
    'click',
    async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      if (act === 'runall') {
        const btn = e.target.closest('button');
        btn.disabled = true;
        await nb.runAll();
        btn.disabled = false;
      } else if (act === 'reset') {
        if (confirm('Discard your edits and exercise progress in this lesson?')) {
          removeAll(`lesson:${id}:`);
          done.delete(id);
          saveDone();
          renderSidebar(id);
          viewLesson(id);
        }
      } else if (act === 'next') {
        // moving on to the next lesson marks this one as complete
        done.add(id);
        saveDone();
        renderSidebar(id);
      }
    },
    { signal: routeAbort.signal },
  );
}

function viewPlayground() {
  const KEY = 'playground:blocks';
  let blocks = load(KEY, null);
  if (!Array.isArray(blocks) || !blocks.length) blocks = examples[0].blocks();
  const persist = () => save(KEY, blocks);

  view.innerHTML = `
    <article class="lesson">
      <header class="lesson-head">
        <div class="eyebrow">Tools</div>
        <h1>Playground</h1>
        <p class="lede">A free notebook. Add program and query cells, or start from an example. Everything is saved in your browser.</p>
        <div class="chips" role="group" aria-label="Examples">${examples
          .map((e, i) => `<button class="chip" data-ex="${i}">${esc(e.name)}</button>`)
          .join('')}</div>
      </header>
      <div class="notebook" id="notebook"></div>
      <div class="add-row">
        <button class="btn" data-add="program">+ Program cell</button>
        <button class="btn" data-add="query">+ Query cell</button>
        <button class="btn btn-ghost" data-act="runall">Run all</button>
      </div>
    </article>`;

  let nb;
  const draw = () => {
    nb = renderLesson({ id: 'playground', blocks }, $('#notebook'), {
      playground: {
        onChange: persist,
        onDelete: (i) => {
          blocks.splice(i, 1);
          persist();
          draw();
        },
      },
    });
  };
  draw();
  view.addEventListener(
    'click',
    async (e) => {
      const ex = e.target.closest('[data-ex]');
      const add = e.target.closest('[data-add]');
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (ex) {
        if (
          blocks.every((b) => !b.code?.trim()) ||
          confirm('Replace the current notebook with this example?')
        ) {
          blocks = examples[+ex.dataset.ex].blocks();
          persist();
          draw();
        }
      } else if (add) {
        blocks.push(add.dataset.add === 'program' ? program('% new program\n') : query(''));
        persist();
        draw();
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      } else if (act === 'runall') {
        await nb.runAll();
      }
    },
    { signal: routeAbort.signal },
  );
}

function viewNotes() {
  view.innerHTML = `<article class="lesson"><header class="lesson-head"><div class="eyebrow">About</div><h1>About this notebook</h1></header><div class="prose">${renderMarkdown(NOTES)}</div></article>`;
}

/* ---------- router ---------- */
// Real paths (/, /lesson/<id>/, /playground/, /about/) so that every page can be indexed. Every
// path also exists as a pre-rendered static page (see scripts/prerender.mjs).
let routeAbort = new AbortController();

function parseRoute() {
  const [name, arg] = location.pathname.split('/').filter(Boolean);
  if (!name) return { name: 'home' };
  if (name === 'lesson' && lessonIndex(arg) >= 0) return { name: 'lesson', id: arg };
  if (name === 'playground') return { name: 'playground' };
  if (name === 'about') return { name: 'about' };
  return { name: 'notfound' };
}

function navigate(path) {
  if (path !== location.pathname + location.search) history.pushState({}, '', path);
  route();
}

function viewNotFound() {
  view.innerHTML = `<article class="lesson"><header class="lesson-head"><div class="eyebrow">404</div><h1>Page not found</h1><p class="lede">There is nothing at this address. Try the <a href="/">lesson list</a> or the <a href="/playground/">playground</a>.</p></header></article>`;
}

function route() {
  routeAbort.abort();
  routeAbort = new AbortController();
  const r = parseRoute();
  let activeId = null;
  if (r.name === 'lesson') {
    activeId = r.id;
    viewLesson(r.id);
  } else if (r.name === 'playground') {
    activeId = 'playground';
    viewPlayground();
  } else if (r.name === 'about') {
    activeId = 'about';
    viewNotes();
  } else if (r.name === 'notfound') {
    viewNotFound();
  } else {
    viewHome();
  }
  applyMeta(pageMeta(r, lessons));
  renderSidebar(activeId);
  setNav(false);
  window.scrollTo(0, 0);
  $('#main').focus({ preventScroll: true });
  applyPendingHit();
}

// Old hash links (#/lesson/x, #/playground, #/notes) keep working.
(function upgradeLegacyHash() {
  const m = /^#\/?(lesson\/([\w-]+)|playground|notes)?\/?$/.exec(location.hash);
  if (!m || !location.hash) return;
  const target = m[2]
    ? lessonPath(m[2])
    : m[1] === 'playground'
      ? '/playground/'
      : m[1] === 'notes'
        ? '/about/'
        : '/';
  history.replaceState({}, '', target);
})();

// Internal links navigate without reloading the page.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return;
  const a = e.target.closest('a[href]');
  if (!a || a.target || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (!href.startsWith('/') || href.startsWith('//')) return;
  e.preventDefault();
  navigate(href);
});
window.addEventListener('popstate', route);
route();

// Start loading Prolog right away so the first Run is instant.
(window.requestIdleCallback || ((f) => setTimeout(f, 300)))(() => warmUp());
