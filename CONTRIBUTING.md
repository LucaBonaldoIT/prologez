# Contributing

Thanks for helping make Prolog easier to learn! The most valuable contributions are **lesson
fixes and new exercises**, followed by UI and engine improvements.

## Setup

```sh
git clone https://github.com/LucaBonaldoIT/prologez.git
cd prologez
npm install
npm run dev
```

Node 20+ is required (`.nvmrc` pins 22).

## Before opening a pull request

```sh
npm run verify   # every lesson query/exercise is executed against real SWI-Prolog
npm run format   # Prettier
npm run build    # production build must succeed
```

`npm run verify` is the test suite. It fails if a query errors unexpectedly, an `expect` doesn't
match, an exercise's `solution` doesn't pass its own tests, or its `starter` already passes.

## Writing or editing lessons

See [docs/writing-lessons.md](docs/writing-lessons.md). Guidelines:

- One idea per section, short paragraphs, run-it-yourself examples over long prose.
- Every example must be correct on **SWI-Prolog 9**. Prefer standard predicates and say so when
  you use an SWI-specific one.
- Give exercises tests that reject plausible wrong answers, including edge cases (empty list,
  duplicate answers, extra solutions).
- Keep cells fast: a query should finish in well under a second.

## Commits and pull requests

- Small, focused PRs. Describe _what_ and _why_.
- Use present-tense, imperative commit messages ("Add tabling example").
- UI changes: include a screenshot (desktop and a ~390 px mobile width).

## Reporting bugs

Use the issue templates. For a wrong or confusing lesson, include the lesson id and the cell.
