import { escapeHtml } from './md.js';

// The stepper panel: walks through the recorded steps of the interpreter (see
// src/prolog/stepper.js) one at a time: selected goal, clause used, unifier, resolvent, substitution.

const KINDS = {
  start: 'Start',
  call: 'Resolve',
  builtin: 'Built-in',
  control: 'Control',
  fail: 'Fail',
  backtrack: 'Backtrack',
  cut: 'Cut',
  solution: 'Solution',
  end: 'End',
  error: 'Error',
};

const ICON = {
  first:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 5v14M19 5.5v13l-9-6.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  prev: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M17 5.5v13l-10-6.5z" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 5.5v13l10-6.5z" fill="currentColor"/></svg>',
  last: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M18 5v14M5 5.5v13l9-6.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

function btn(cls, html, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.innerHTML = html;
  b.title = label;
  b.setAttribute('aria-label', label);
  return b;
}

/**
 * @param {HTMLElement} host   container to fill (cleared first)
 * @param {{steps:object[], truncated:boolean, error?:string}} r   result of run({trace:true})
 * @param {string} queryText   the query as typed
 * @param {() => void} onClose
 */
export function renderStepper(host, r, queryText, onClose) {
  host.innerHTML = '';
  host.hidden = false;
  host.className = 'stepper';

  if (r.error) {
    host.innerHTML = `<div class="st-bar"><strong class="st-title">Step through the interpreter</strong></div><div class="err"><strong>Error</strong><span>${escapeHtml(r.error)}</span></div>`;
    const close = btn('icon-btn st-close', ICON.close, 'Close the stepper');
    close.addEventListener('click', onClose);
    host.querySelector('.st-bar').append(close);
    return;
  }

  const first = r.steps[0];
  const start = {
    n: 0,
    kind: 'start',
    title:
      'The query is the initial resolvent. The substitution is empty: no variable has a value yet.',
    goal: '',
    clause: '',
    unifier: '',
    resolvent: [queryText.trim().replace(/\.\s*$/, '')],
    subst: (first?.subst || []).map(([n]) => [n, '']),
    out: '',
  };
  const steps = [start, ...r.steps];
  let idx = 0;

  const bar = document.createElement('div');
  bar.className = 'st-bar';
  const title = document.createElement('strong');
  title.className = 'st-title';
  title.textContent = 'Step through the interpreter';
  const count = document.createElement('span');
  count.className = 'st-count';
  count.setAttribute('aria-live', 'polite');
  const ctl = document.createElement('div');
  ctl.className = 'st-ctl';
  const bFirst = btn('icon-btn', ICON.first, 'First step');
  const bPrev = btn('icon-btn', ICON.prev, 'Previous step');
  const bNext = btn('btn btn-sm btn-primary st-next', `${ICON.next}<span>Next</span>`, 'Next step');
  const bLast = btn('icon-btn', ICON.last, 'Last step');
  const bClose = btn('icon-btn', ICON.close, 'Close the stepper');
  ctl.append(bFirst, bPrev, bNext, bLast, bClose);
  bar.append(title, count, ctl);

  const track = document.createElement('div');
  track.className = 'st-track';
  track.setAttribute('role', 'tablist');
  const dots = steps.map((s, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = `st-dot k-${s.kind}`;
    d.title = `Step ${i}: ${KINDS[s.kind] || s.kind}`;
    d.setAttribute('aria-label', d.title);
    d.addEventListener('click', () => go(i));
    track.append(d);
    return d;
  });

  const body = document.createElement('div');
  body.className = 'st-body';
  host.append(bar, track, body);
  if (r.truncated) {
    const note = document.createElement('p');
    note.className = 'st-foot';
    note.innerHTML =
      '<strong>The trace was cut off after a bounded number of steps: the computation probably goes on for a long time.</strong>';
    host.append(note);
  }

  const row = (label, html) =>
    html ? `<div class="st-row"><dt>${label}</dt><dd>${html}</dd></div>` : '';
  const code = (s) => (s ? `<code>${escapeHtml(s)}</code>` : '');

  function render() {
    const s = steps[idx];
    count.textContent = `Step ${idx} of ${steps.length - 1}`;
    bFirst.disabled = bPrev.disabled = idx === 0;
    bNext.disabled = bLast.disabled = idx === steps.length - 1;
    dots.forEach((d, i) => {
      d.classList.toggle('on', i === idx);
      d.classList.toggle('past', i < idx);
      if (i === idx) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    });
    const resolvent =
      s.kind === 'end'
        ? ''
        : s.resolvent.length
          ? `<code>?- ${escapeHtml(s.resolvent.join(',  '))}</code>`
          : '<span class="st-empty">empty resolvent: every goal has been solved</span>';
    const subst = s.subst.length
      ? `<ul class="st-subst">${s.subst
          .map(([n, v]) =>
            v
              ? `<li><code>${escapeHtml(n)} = ${escapeHtml(v)}</code></li>`
              : `<li class="unbound"><code>${escapeHtml(n)}</code> <span>not bound yet</span></li>`,
          )
          .join('')}</ul>`
      : s.kind === 'end' || s.kind === 'error'
        ? ''
        : '<span class="st-empty">the query has no variables</span>';
    body.className = `st-body k-${s.kind}`;
    body.innerHTML =
      `<p class="st-what"><span class="st-chip">${KINDS[s.kind] || s.kind}</span><span>${escapeHtml(s.title)}</span></p>` +
      `<dl class="st-grid">` +
      row('Selected goal', code(s.goal)) +
      row('Clause used (variables renamed)', code(s.clause)) +
      row('Unifier θ', code(s.unifier)) +
      row('Resolvent', resolvent) +
      row('Substitution', subst) +
      (s.out
        ? `<div class="st-row"><dt>Output</dt><dd><pre class="stdout">${escapeHtml(s.out)}</pre></dd></div>`
        : '') +
      `</dl>`;
  }

  function go(i) {
    idx = Math.max(0, Math.min(steps.length - 1, i));
    render();
  }

  bFirst.addEventListener('click', () => go(0));
  bPrev.addEventListener('click', () => go(idx - 1));
  bNext.addEventListener('click', () => go(idx + 1));
  bLast.addEventListener('click', () => go(steps.length - 1));
  bClose.addEventListener('click', onClose);
  host.tabIndex = 0;
  host.addEventListener('keydown', (e) => {
    if (e.target.closest('button') && e.key === 'Enter') return;
    if (e.key === 'ArrowRight') {
      go(idx + 1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      go(idx - 1);
      e.preventDefault();
    } else if (e.key === 'Home') {
      go(0);
      e.preventDefault();
    } else if (e.key === 'End') {
      go(steps.length - 1);
      e.preventDefault();
    } else if (e.key === 'Escape') onClose();
  });
  render();
  bNext.focus({ preventScroll: true });
}
