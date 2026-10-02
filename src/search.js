import { lessons } from './lessons/index.js';
import { escapeHtml } from './md.js';

// Full-text search across all lessons: titles, summaries, explanations, programs, queries and
// exercise prompts (never solutions or hints). Results link to the lesson and the matching block.

const KIND_LABEL = { text: 'Text', program: 'Program', query: 'Query', exercise: 'Exercise' };
const MAX_LESSONS = 8;
const MAX_HITS = 3;

const plain = (md) =>
  md
    .replace(/```[a-z]*\n?/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[!\w+\]/g, ' ')
    .replace(/[`*]/g, '')
    .replace(/^\s*(#{1,6}|>)\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

let index = null;

function buildIndex() {
  index = [];
  lessons.forEach((lesson) => {
    index.push({
      lesson,
      block: -1,
      kind: 'title',
      text: `${lesson.title}. ${lesson.summary}`,
      lower: `${lesson.title}. ${lesson.summary}`.toLowerCase(),
    });
    lesson.blocks.forEach((b, i) => {
      let text = '';
      let kind = 'text';
      if (b.t === 'md') text = plain(b.text);
      else if (b.t === 'program')
        ((kind = 'program'), (text = [b.title, b.code].filter(Boolean).join('\n')));
      else if (b.t === 'query') ((kind = 'query'), (text = b.code));
      else if (b.t === 'exercise') ((kind = 'exercise'), (text = `${b.title}. ${plain(b.prompt)}`));
      text = text.replace(/\s+/g, ' ').trim();
      if (text) index.push({ lesson, block: i, kind, text, lower: text.toLowerCase() });
    });
  });
}

export function search(q) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!index) buildIndex();
  if (!tokens.length || q.trim().length < 2) return [];
  const byLesson = new Map();
  for (const e of index) {
    if (!tokens.every((t) => e.lower.includes(t))) continue;
    let score = 1;
    if (e.kind === 'title')
      score = 40 + (tokens.every((t) => e.lesson.title.toLowerCase().includes(t)) ? 40 : 0);
    else if (e.kind === 'exercise') score = 3;
    else if (e.kind === 'text') score = 2;
    const pos = Math.min(...tokens.map((t) => e.lower.indexOf(t)));
    let r = byLesson.get(e.lesson.id);
    if (!r) byLesson.set(e.lesson.id, (r = { lesson: e.lesson, score: 0, hits: [] }));
    r.score += score;
    r.hits.push({ ...e, pos, score });
  }
  return [...byLesson.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LESSONS)
    .map((r) => ({
      lesson: r.lesson,
      hits: r.hits
        .filter((h) => h.kind !== 'title' || r.hits.length === 1)
        .sort((a, b) => b.score - a.score || a.pos - b.pos)
        .slice(0, MAX_HITS)
        .sort((a, b) => a.block - b.block),
    }));
}

function snippet(text, tokens) {
  const lower = text.toLowerCase();
  const pos = Math.min(...tokens.map((t) => lower.indexOf(t)).filter((p) => p >= 0));
  const start = Math.max(0, pos - 50);
  let s = text.slice(start, start + 140);
  if (start > 0) s = '…' + s;
  if (start + 140 < text.length) s += '…';
  const esc = (t) => escapeHtml(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escapeHtml(s).replace(
    new RegExp(`(${tokens.map(esc).join('|')})`, 'gi'),
    '<mark>$1</mark>',
  );
}

/**
 * Mounts the search box into `host`. `onPick({ id, block })` is called when a result is chosen.
 */
export function mountSearch(host, onPick) {
  host.classList.add('search');
  host.setAttribute('role', 'search');
  host.innerHTML = `
    <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    <input class="search-input" type="search" placeholder="Search lessons" aria-label="Search all lessons" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list" />
    <kbd class="search-kbd" aria-hidden="true">/</kbd>
    <div class="search-results" id="search-results" role="listbox" hidden></div>`;
  const input = host.querySelector('input');
  const box = host.querySelector('.search-results');
  let items = []; // flat list of {id, block}
  let active = -1;

  const close = () => {
    box.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    active = -1;
  };
  const setActive = (i) => {
    active = i;
    box.querySelectorAll('.search-item').forEach((el, k) => {
      el.classList.toggle('active', k === i);
      el.setAttribute('aria-selected', String(k === i));
      if (k === i) el.scrollIntoView({ block: 'nearest' });
    });
  };
  const pick = (i) => {
    const it = items[i];
    if (!it) return;
    close();
    input.blur();
    onPick(it);
  };

  function render() {
    const q = input.value;
    const results = search(q);
    items = [];
    if (q.trim().length < 2) return close();
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!results.length) {
      box.innerHTML = `<div class="search-empty">No lesson matches “${escapeHtml(q.trim())}”.</div>`;
    } else {
      box.innerHTML = results
        .map((r) => {
          const head = items.length;
          items.push({ id: r.lesson.id, block: -1 });
          const rows = r.hits
            .filter((h) => h.kind !== 'title')
            .map((h) => {
              const i = items.length;
              items.push({ id: r.lesson.id, block: h.block });
              return `<button type="button" class="search-item hit" role="option" data-i="${i}"><span class="search-kind k-${h.kind}">${KIND_LABEL[h.kind]}</span><span class="search-snip">${snippet(h.text, tokens)}</span></button>`;
            })
            .join('');
          return `<div class="search-group"><button type="button" class="search-item lesson" role="option" data-i="${head}"><strong>${escapeHtml(r.lesson.title)}</strong><span class="search-part">${escapeHtml(r.lesson.part)}</span></button>${rows}</div>`;
        })
        .join('');
    }
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(items.length ? 0 : -1);
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', () => input.value.trim().length >= 2 && render());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (box.hidden) render();
      if (!items.length) return;
      e.preventDefault();
      setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    } else if (e.key === 'Enter') {
      if (active >= 0) {
        e.preventDefault();
        pick(active);
      }
    } else if (e.key === 'Escape') {
      if (!box.hidden) e.stopPropagation();
      if (!box.hidden) close();
      else input.blur();
    }
  });
  box.addEventListener('mousedown', (e) => {
    const el = e.target.closest('.search-item');
    if (!el) return;
    e.preventDefault();
    pick(Number(el.dataset.i));
  });
  box.addEventListener('mousemove', (e) => {
    const el = e.target.closest('.search-item');
    if (el && Number(el.dataset.i) !== active) setActive(Number(el.dataset.i));
  });
  document.addEventListener('mousedown', (e) => {
    if (!host.contains(e.target)) close();
  });
  // "/" or Ctrl/Cmd+K focus the search from anywhere
  document.addEventListener('keydown', (e) => {
    const typing =
      /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) ||
      e.target.isContentEditable ||
      e.target.closest?.('.cm-editor');
    if (
      (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) ||
      ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
    ) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}
