// Helpers for writing lessons as plain data (usable in the browser and in Node tests).
export const md = (text) => ({ t: 'md', text });

/** A program (knowledge base) cell. `fresh: true` starts a new program, ignoring earlier cells. */
export const program = (code, opts = {}) => ({ t: 'program', code, ...opts });

/** A query cell, run against all program cells above it. `error: true` = an error is expected. */
export const query = (code, opts = {}) => ({ t: 'query', code, ...opts });

/**
 * An exercise: the learner edits `starter`; `tests` run against setup + their code.
 * test = { q, expect: [formatted answers], unordered?, hidden? }
 */
export const exercise = (o) => ({ t: 'exercise', ...o });

export const lesson = (o) => o;
