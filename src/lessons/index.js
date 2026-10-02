import * as foundations from './foundations.js';
import * as data from './data.js';
import * as control from './control.js';
import * as advanced from './advanced.js';
import * as course1 from './course1.js';
import * as course2 from './course2.js';
import * as course3 from './course3.js';
import * as course4 from './course4.js';
import * as course5 from './course5.js';
import * as course6 from './course6.js';

export const lessons = [
  foundations.hello,
  foundations.terms,
  course1.syntax,
  course1.paradigms,
  foundations.rules,
  course1.kb,
  foundations.unification,
  course1.mgu,
  foundations.search,
  course1.resolution,
  course2.naturals,
  course2.peano,
  course2.booleans,
  course2.dbpatterns,
  data.arithmetic,
  course3.builtins,
  data.lists,
  course3.listscons,
  course3.relationality,
  data.recursion,
  course4.algorithms,
  course4.searching,
  data.structures,
  course4.adts,
  course4.inspect,
  data.text,
  control.cut,
  control.negation,
  control.findall,
  control.database,
  control.higher,
  control.exceptions,
  advanced.dcg,
  advanced.difflists,
  advanced.puzzles,
  advanced.clpfd,
  course6.clplab,
  advanced.graphs,
  course5.dsl,
  course5.solving,
  advanced.metainterp,
  advanced.symbolic,
  advanced.capstone,
];

export const parts = [...new Set(lessons.map((l) => l.part))].map((name) => ({
  name,
  lessons: lessons.filter((l) => l.part === name),
}));
