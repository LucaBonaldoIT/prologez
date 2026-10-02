# Architecture

```
┌────────────── main thread ──────────────┐        ┌──────── Web Worker ────────┐
│ main.js      router, sidebar, progress  │        │ engine.worker.js           │
│ notebook.js  cells, outputs, exercises  │ ─run──▶│  └ prolog/core.js          │
│ editor.js    CodeMirror 6 + tokenizer   │        │     └ swipl-wasm (SWI 9)   │
│ engine.js    worker client + watchdog   │ ◀─json─│        └ prolog/harness.js │
└─────────────────────────────────────────┘        └────────────────────────────┘
```

## Engine

`swipl-wasm` provides SWI-Prolog 9 as WebAssembly. `src/prolog/harness.js` is a Prolog module
(`nb`) loaded once at boot. For each request it:

1. creates a throw-away module `nb_N` and consults the program text into it
   (clauses, `:- dynamic`, `:- use_module(library(clpfd))` etc. all stay local to the module);
2. collects load-time errors and warnings with a `message_hook`;
3. parses the query with the module's operators, runs it under `call_with_inference_limit/3`,
   recording each solution as it appears (so answers found before an infinite loop are kept);
4. formats each solution the way the toplevel does and returns one JSON string
   (`{status, error, output, answers, more, messages}`).

`src/prolog/stepper.js` is a second Prolog module: an explicit resolution machine (goal stack, choicepoint
stack, cut barriers) that solves a query one step at a time and records, for each step, the selected goal,
the clause used (variables renamed), the unifier, the new resolvent and the substitution. User predicates are
resolved clause by clause; built-ins and library predicates run in one atomic step. `run({ ..., trace: true })`
returns those steps, and `src/stepper.js` renders them behind the _Step_ button of each query cell.
`scripts/prerender.mjs` runs after `vite build` and bakes a static page per route (see the README).
`npm run verify:stepper` runs it over every lesson query and compares the number of solutions with the engine.

`src/prolog/core.js` wraps this as `createRunner(SWIPL).run({ program, query, maxSolutions })`
and `checkWith(run, program, tests)` for exercises. It has no browser dependencies, so the Node
test script (`scripts/verify.mjs`) uses the exact same code with the Node build of `swipl-wasm`.

## Resource limits

| mechanism         | where     | limit                                                  |
| ----------------- | --------- | ------------------------------------------------------ |
| inference limit   | harness   | 12 M inferences → "too many steps"                     |
| stack limit       | core.js   | 256 MB → resource error                                |
| watchdog          | engine.js | 10 s without a reply → worker terminated and restarted |
| `halt/0`, crashes | worker    | instance recreated automatically                       |

## UI

Plain DOM + CSS, no framework. Lessons are data (`src/lessons/*`); `notebook.js` renders blocks
into cells. Edits and exercise status persist in `localStorage` under the `plnb:` prefix.
Syntax highlighting is a small custom CodeMirror stream tokenizer (`editor.js`), there is no
Prolog mode in the CM6 legacy-modes package.

## Why SWI-Prolog and not a JS Prolog?

An earlier prototype used Tau Prolog. It lacked many SWI predicates, had a DCG translation bug,
and exhausted memory on moderately sized recursions (e.g. `fib(20)`). SWI-Prolog's WASM build
gives identical behaviour to what learners will use locally, plus CLP(FD), tabling and strings.
