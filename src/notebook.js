import { run, check, stopAll } from './engine.js';
import { createEditor } from './editor.js';
import { renderStepper } from './stepper.js';
import { renderMarkdown, escapeHtml } from './md.js';
import { load, save, remove } from './store.js';

function h(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

const ICON = {
  stop: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  run: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  step: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 5.5v13l8-6.5z" fill="currentColor"/><path d="M17 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  reset:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.7 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function persisted(key, initial) {
  return load(key, initial) ?? initial;
}

function debounce(fn, ms) {
  let id;
  return (...a) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...a), ms);
  };
}

/** Render the outcome of engine.run() into `box`. */
function renderResult(box, r, { loadOnly = false } = {}) {
  box.innerHTML = '';
  box.hidden = false;
  box.className = 'out';
  const parts = [];

  if (r.output)
    parts.push(
      `<div class="out-label">output</div><pre class="stdout">${escapeHtml(r.output)}</pre>`,
    );

  if (loadOnly && r.warnings?.length)
    parts.push(
      r.warnings
        .map((w) => `<div class="warn"><strong>Warning</strong><span>${escapeHtml(w)}</span></div>`)
        .join(''),
    );

  if (r.error) {
    const where = r.phase === 'program' ? 'Problem in the program' : 'Error';
    parts.push(
      `<div class="err"><strong>${where}</strong><span>${escapeHtml(r.error)}</span></div>`,
    );
  } else if (loadOnly) {
    parts.push('<div class="ok-line"><span class="dot"></span>Program loaded: no errors.</div>');
  } else if (r.answers.length === 0) {
    parts.push(
      '<div class="answer false"><code>false</code><span class="hint">no (more) solutions</span></div>',
    );
  } else {
    const rows = r.answers
      .map((a, i) => `<li><span class="n">${i + 1}</span><code>${escapeHtml(a)}</code></li>`)
      .join('');
    parts.push(
      `<ol class="answers ${r.answers.length === 1 ? 'single' : ''}">${rows}</ol>` +
        (r.limited
          ? '<div class="more">The search stopped after many steps, it probably goes on forever looking for more solutions. These are the ones found so far.</div>'
          : r.more
            ? '<div class="more">…and more. Showing the first ' + r.answers.length + '.</div>'
            : ''),
    );
  }
  parts.push(`<div class="meta">${r.ms} ms</div>`);
  box.innerHTML = parts.join('');
  if (r.error) box.classList.add('has-error');
}

/**
 * @param {{id:string, blocks:object[]}} lesson
 * @param {HTMLElement} root
 * @param {{storagePrefix?:string, playground?:{onChange:()=>void, onDelete:(i:number)=>void}}} [opts]
 *   In playground mode the blocks themselves hold the (persisted) code.
 */
export function renderLesson(
  lesson,
  root,
  { storagePrefix = `lesson:${lesson.id}`, playground = null, onSolved = null } = {},
) {
  const exerciseKeys = [];
  const cells = []; // {kind, fresh?, getCode, run, reset}
  let editorCount = 0;

  const programTextUpTo = (idx) => {
    const progs = [];
    for (let i = 0; i <= idx; i++) {
      const c = cells[i];
      if (c.kind !== 'program') continue;
      if (c.fresh) progs.length = 0;
      progs.push(c.getCode());
    }
    return progs.join('\n');
  };

  function actionButton(label, icon, cls = '') {
    const b = h('button', `btn ${cls}`, `${icon}<span>${label}</span>`);
    b.type = 'button';
    return b;
  }

  function codeCell(block, idx) {
    const kind = block.t;
    const key = `${storagePrefix}:${idx}`;
    const isQuery = kind === 'query';
    const initial = block.code.replace(/\n$/, '');
    const section = h('section', `cell cell-${kind}`);
    const head = h('div', isQuery ? 'query-row' : 'cell-head');
    if (isQuery) {
      head.innerHTML = '<span class="prompt" aria-hidden="true">?-</span>';
    } else {
      head.innerHTML = `<div class="cell-label"><span class="cell-kind">Program</span>${block.title ? `<span class="cell-title">${escapeHtml(block.title)}</span>` : ''}</div>`;
    }
    const actions = h('div', 'cell-actions');
    const resetBtn = h('button', 'icon-btn', ICON.reset);
    resetBtn.type = 'button';
    resetBtn.title = 'Reset to original';
    resetBtn.setAttribute('aria-label', 'Reset cell to original');
    resetBtn.hidden = true;
    const runBtn = actionButton(isQuery ? 'Run' : 'Load', ICON.run, 'btn-primary');
    const stepBtn = actionButton('Step', ICON.step, 'btn-step');
    stepBtn.title = 'Step through the interpreter: resolution, unification and substitutions';
    if (isQuery) actions.append(resetBtn, stepBtn, runBtn);
    else actions.append(resetBtn, runBtn);
    const editorHost = h('div', 'editor');
    const out = h('div', 'out');
    out.hidden = true;
    out.setAttribute('aria-live', 'polite');
    const stepHost = h('div', 'stepper');
    stepHost.hidden = true;
    if (isQuery) {
      head.append(editorHost, actions);
      section.append(head, out, stepHost);
    } else {
      head.append(actions);
      section.append(head, editorHost, out);
    }

    const saved = playground ? initial : persisted(key, initial);
    const persist = playground
      ? debounce((value) => {
          block.code = value;
          playground.onChange();
        }, 300)
      : debounce((value) => {
          if (value === initial) remove(key);
          else save(key, value);
        }, 300);

    const ed = createEditor(editorHost, {
      doc: saved,
      numbers: !isQuery,
      enterRuns: isQuery,
      label: isQuery ? 'Prolog query' : 'Prolog program',
      placeholder: isQuery ? 'Type a query, e.g. member(X, [a,b,c])' : '',
      onChange: (value) => {
        persist(value);
        resetBtn.hidden = playground ? true : value === initial;
      },
      onRun: () => cell.run(),
    });
    resetBtn.hidden = playground ? true : saved === initial;
    editorCount++;
    if (playground) {
      const del = h('button', 'icon-btn', ICON.trash);
      del.type = 'button';
      del.title = 'Delete cell';
      del.setAttribute('aria-label', 'Delete cell');
      del.addEventListener('click', () => playground.onDelete(idx));
      actions.prepend(del);
    }

    let running = false;
    const setRunLabel = (busy) => {
      runBtn.innerHTML = busy
        ? `${ICON.stop}<span>Stop</span>`
        : `${ICON.run}<span>${isQuery ? 'Run' : 'Load'}</span>`;
      runBtn.classList.toggle('busy', busy);
    };
    const cell = {
      kind,
      fresh: !!block.fresh,
      getCode: () => ed.get(),
      async run() {
        if (running) return;
        running = true;
        setRunLabel(true);
        try {
          const program = programTextUpTo(isQuery ? idx - 1 : idx);
          const r = await run(
            isQuery
              ? { program, query: ed.get(), maxSolutions: block.max || 10 }
              : { program, query: null },
          );
          renderResult(out, r, { loadOnly: !isQuery });
        } finally {
          running = false;
          setRunLabel(false);
        }
      },
    };
    runBtn.addEventListener('click', () => {
      if (running) stopAll();
      else cell.run();
    });
    let stepping = false;
    const closeStepper = () => {
      stepHost.hidden = true;
      stepHost.innerHTML = '';
      stepBtn.classList.remove('active');
      stepBtn.focus({ preventScroll: true });
    };
    stepBtn.addEventListener('click', async () => {
      if (!stepHost.hidden) return closeStepper();
      if (stepping || running) return;
      stepping = true;
      stepBtn.classList.add('busy');
      try {
        const query = ed.get();
        const r = await run({
          program: programTextUpTo(idx - 1),
          query,
          maxSolutions: block.max || 5,
          trace: true,
        });
        stepBtn.classList.add('active');
        renderStepper(stepHost, r, query, closeStepper);
      } finally {
        stepping = false;
        stepBtn.classList.remove('busy');
      }
    });
    resetBtn.addEventListener('click', () => {
      ed.set(initial);
      remove(key);
      out.hidden = true;
    });
    return { cell, node: section };
  }

  function exerciseCell(block, idx) {
    const ex = block;
    const key = `${storagePrefix}:${idx}`;
    const doneKey = `${key}:done`;
    exerciseKeys.push(doneKey);
    const section = h('section', 'cell cell-exercise');
    const head = h('div', 'cell-head');
    head.innerHTML =
      '<div class="cell-label"><span class="cell-kind exercise">Exercise</span>' +
      `<span class="cell-title">${escapeHtml(ex.title || '')}</span></div>`;
    const badge = h('span', 'badge-done', '✓ Solved');
    badge.hidden = !load(doneKey, false);
    head.append(badge);
    const prompt = h('div', 'exercise-prompt prose', renderMarkdown(ex.prompt));
    const editorHost = h('div', 'editor');
    const bar = h('div', 'exercise-bar');
    const checkBtn = actionButton('Check', ICON.run, 'btn-primary');
    const hintBtn = h('button', 'btn btn-ghost', 'Hint');
    const solBtn = h('button', 'btn btn-ghost', 'Show solution');
    const resetBtn = h('button', 'btn btn-ghost', 'Reset');
    [hintBtn, solBtn, resetBtn].forEach((b) => (b.type = 'button'));
    checkBtn.type = 'button';
    bar.append(checkBtn, hintBtn, solBtn, resetBtn);
    const hintBox = h('div', 'callout callout-tip exercise-hint');
    hintBox.hidden = true;
    hintBox.innerHTML = `<span class="callout-label">Hint</span>${renderMarkdown(ex.hint || 'Think about the base case first.')}`;
    const solBox = h('div', 'exercise-solution');
    solBox.hidden = true;
    const out = h('div', 'out');
    out.hidden = true;
    out.setAttribute('aria-live', 'polite');
    section.append(head, prompt, editorHost, bar, hintBox, solBox, out);

    const initial = ex.starter.replace(/\n$/, '');
    const saved = persisted(key, initial);
    const persist = debounce((v) => (v === initial ? remove(key) : save(key, v)), 300);
    const ed = createEditor(editorHost, {
      doc: saved,
      numbers: true,
      label: 'Exercise solution',
      onChange: persist,
      onRun: () => runCheck(),
    });
    editorCount++;

    async function runCheck() {
      checkBtn.disabled = true;
      try {
        const program = (ex.setup ? ex.setup + '\n' : '') + ed.get();
        const results = await check(program, ex.tests);
        const passed = results.every((r) => r.pass);
        out.hidden = false;
        if (results.programError) {
          out.className = 'out some-fail';
          out.innerHTML =
            '<div class="test-summary fail">Your program has an error, so no tests were run</div>' +
            `<pre class="test-detail">${escapeHtml(results.programError)}</pre>`;
          return;
        }
        out.className = 'out ' + (passed ? 'all-pass' : 'some-fail');
        out.innerHTML =
          `<div class="test-summary ${passed ? 'pass' : 'fail'}">${
            passed
              ? 'All tests pass, nicely done!'
              : `${results.filter((r) => r.pass).length} of ${results.length} tests pass`
          }</div><ul class="tests">` +
          results
            .map((r) => {
              const detail = r.pass
                ? ''
                : r.hidden
                  ? '<div class="test-detail">A hidden edge case failed.</div>'
                  : `<div class="test-detail">expected <code>${escapeHtml(r.expected.join('  |  '))}</code><br/>got <code>${escapeHtml(r.got.join('  |  '))}</code></div>`;
              return `<li class="${r.pass ? 'pass' : 'fail'}"><span class="mark">${r.pass ? '✓' : '✗'}</span><div><code>?- ${escapeHtml(r.hidden && !r.pass ? '(hidden test)' : r.query)}</code>${detail}</div></li>`;
            })
            .join('') +
          '</ul>';
        if (passed) {
          badge.hidden = false;
          save(doneKey, true);
          onSolved?.();
        }
      } finally {
        checkBtn.disabled = false;
      }
    }
    checkBtn.addEventListener('click', runCheck);
    hintBtn.addEventListener('click', () => (hintBox.hidden = !hintBox.hidden));
    solBtn.addEventListener('click', () => {
      if (solBox.hidden) {
        solBox.innerHTML = '<div class="out-label">One possible solution</div>';
        const host = h('div', 'editor');
        solBox.append(host);
        createEditor(host, {
          doc: ex.solution.replace(/\n$/, ''),
          numbers: true,
          label: 'Solution',
        });
        solBox.hidden = false;
        solBtn.textContent = 'Hide solution';
      } else {
        solBox.hidden = true;
        solBtn.textContent = 'Show solution';
      }
    });
    resetBtn.addEventListener('click', () => {
      ed.set(initial);
      remove(key);
      out.hidden = true;
    });
    return { cell: { kind: 'exercise', getCode: () => ed.get() }, node: section };
  }

  root.innerHTML = '';
  lesson.blocks.forEach((block, idx) => {
    let made;
    if (block.t === 'md') {
      const div = h('div', 'prose', renderMarkdown(block.text));
      cells.push({ kind: 'md' });
      root.append(div);
      return;
    }
    if (block.t === 'exercise') made = exerciseCell(block, idx);
    else made = codeCell(block, idx);
    cells.push(made.cell);
    root.append(made.node);
  });

  return {
    async runAll() {
      for (const c of cells) if (c.kind === 'program' || c.kind === 'query') await c.run();
    },
    allSolved: () => exerciseKeys.length > 0 && exerciseKeys.every((k) => load(k, false)),
    hasRunnable: cells.some((c) => c.kind === 'program' || c.kind === 'query'),
    editorCount,
  };
}
