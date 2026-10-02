# Writing lessons

Lessons are plain JavaScript modules in `src/lessons/`, built from four helpers in
`src/lessons/dsl.js`. They run in Node too, which is how `npm run verify` tests them.

```js
import { md, program, query, exercise, lesson } from './dsl.js';

export const demo = lesson({
  id: 'demo', // URL slug: #/lesson/demo
  part: 'Foundations', // sidebar group (lessons with the same part are grouped)
  title: 'Demo',
  summary: 'One line shown on the home page.',
  blocks: [
    md('Markdown…'),
    program('likes(alice, tea).', { title: 'likes.pl' }),
    query('likes(alice, X)', { expect: ['X = tea'] }),
  ],
});
```

Register the lesson in `src/lessons/index.js` (order there is the course order).

## Blocks

### `md(text)`

A small Markdown subset: paragraphs, `###`/`####` headings, `-` and `1.` lists, fenced code,
tables, `**bold**`, `*italic*`, `` `code` ``, `[links](url)`, and callouts:

```
> [!tip] text      > [!note] text      > [!warn] text      > [!try] text
```

### `program(code, opts)`

An editable knowledge base. Query cells run against **all program cells above them**.

- `fresh: true`: discard earlier program cells (start a new program).
- `title`: shown as a file name.

### `query(code, opts)`

An editable query.

- `expect: [...]`: answers `npm run verify` must see, in order (whitespace-insensitive).
  Use `['true']` / `['false']` for yes/no queries.
- `error: true`: the query is _supposed_ to raise an error (shown red in the notebook).
- `max: n`: number of solutions to display (default 10).
- `limited: true`: the query is expected to hit the step limit after producing its answers
  (an endless search that has solutions before it, like `sum(X, s(s(z)), Y), sum(X, Y, ...)`).
- Variables starting with `_` are not printed; use them to hide bulky intermediate values.

### `exercise(opts)`

```js
exercise({
  title: 'Swap a pair',
  prompt: 'Markdown shown above the editor.',
  setup: 'code loaded silently before the learner’s code (optional)',
  starter: '% initial editor content',
  hint: 'Markdown revealed by the Hint button.',
  solution: 'swap(pair(A, B), pair(B, A)).',
  tests: [
    { q: 'swap(pair(1, 2), X)', expect: ['X = pair(2, 1)'] },
    { q: 'swap(a, X)', expect: ['false'] },
  ],
});
```

Test options: `unordered: true` (compare answers as a set), `hidden: true` (don't reveal the
query on failure). Tests collect **all** solutions (up to 50), so an exercise whose answer should
be unique will fail if a solution leaves a spurious extra answer, usually a good thing to test.

## Behaviour to know about

- Every run loads the program into a fresh module, so `assert` does not persist between runs.
- Answers use SWI-Prolog's toplevel format (`X = [1, 2]`, `X = Y`, `X in 1..3`).
- Output from `write/format` is shown above the answers.
- A query that runs ~12 M inferences is stopped; a hang is killed after 10 s.
- Avoid examples that make SWI-Prolog's WASM build slow on _branching_ infinite searches
  (cycles with several outgoing edges): they take seconds to hit a limit. A two-node cycle is
  fine for demonstrating non-termination.

## Checking your work

```sh
npm run verify            # everything
node scripts/verify.mjs -v demo   # one lesson, printing every answer
node scripts/probe.mjs 'p(1). p(2).' 'p(X)'   # try a program/query pair quickly
```
