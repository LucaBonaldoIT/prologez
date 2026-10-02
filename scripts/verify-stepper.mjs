// Runs the stepper over every query of every lesson and reports crashes or empty traces.
//   node scripts/verify-stepper.mjs [lesson-id]
import SWIPL from 'swipl-wasm';
import { createRunner } from '../src/prolog/core.js';
import { lessons } from '../src/lessons/index.js';

const runner = await createRunner(SWIPL);
const only = process.argv[2];
let problems = 0;
let total = 0;
for (const lesson of lessons) {
  if (only && lesson.id !== only) continue;
  const progs = [];
  for (const b of lesson.blocks) {
    if (b.t === 'program') {
      if (b.fresh) progs.length = 0;
      progs.push(b.code);
    } else if (b.t === 'query') {
      total++;
      let r;
      try {
        r = runner.run({
          program: progs.join('\n'),
          query: b.code,
          trace: true,
          maxSolutions: b.max || 5,
          maxSteps: 150,
        });
      } catch (e) {
        problems++;
        console.log(`✗ ${lesson.id}: ${b.code}\n    threw ${e.message}`);
        continue;
      }
      if (r.error && !b.error) {
        problems++;
        console.log(`✗ ${lesson.id}: ${b.code}\n    error: ${r.error.slice(0, 160)}`);
      } else if (!r.error && !r.truncated && !b.error && !b.limited) {
        // the stepper must find the same number of solutions as the real engine
        const max = b.max || 5;
        const real = runner.run({ program: progs.join('\n'), query: b.code, maxSolutions: max });
        const sols = r.steps.filter((s) => s.kind === 'solution').length;
        const hadError = r.steps.some((s) => s.kind === 'error');
        if (
          !real.error &&
          !hadError &&
          sols !== Math.min(real.answers.length, max) &&
          !(real.more && sols === max)
        ) {
          problems++;
          console.log(
            `✗ ${lesson.id}: ${b.code}\n    stepper found ${sols} solutions, engine ${real.answers.length}${real.more ? '+' : ''}`,
          );
        }
      }
      if (!r.error && r.steps.length === 0) {
        problems++;
        console.log(`✗ ${lesson.id}: ${b.code}\n    no steps`);
      }
    }
  }
}
console.log(
  problems ? `\n${problems} problem(s) in ${total} queries` : `\nall good (${total} queries)`,
);
process.exit(problems ? 1 : 0);
