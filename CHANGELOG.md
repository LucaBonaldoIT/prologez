# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- 43 interactive lessons from facts and queries to DCGs, CLP(FD) and meta-interpreters, including the resolution and unification theory (substitutions, MGU, resolvents), Peano arithmetic, cons/nil lists, full relationality, tail recursion, term inspection, operators and DSLs, every metainterpreter variant, and a hands-on CLP(FD) lesson.
- Interpreter stepper (_Step_ button on every query): resolution, unification and substitutions one step at a time, written as an explicit resolution machine in Prolog.
- Notebook UI: editable program/query cells, auto-checked exercises, playground, progress tracking.
- SWI-Prolog 9 (WebAssembly) running in a Web Worker, with inference/stack limits and a watchdog.
- Responsive layout (desktop and mobile) and light/dark themes.
- `npm run verify`: executes every lesson query and exercise against SWI-Prolog.
