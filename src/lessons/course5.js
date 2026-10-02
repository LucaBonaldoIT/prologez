// Lessons on metaprogramming: everything is a term,
// operators and DSLs, and the predicates for solving goals.
import { md, program, query, exercise, lesson } from './dsl.js';

export const dsl = lesson({
  id: 'dsl',
  part: 'Advanced',
  title: 'Everything is a term: operators and DSLs',
  summary:
    'Surface syntax that denotes plain terms, op/3, and Prolog as the host of a small language.',
  blocks: [
    md(`
### Metaprogramming

> *Metaprogramming* is a programming technique in which computer programs have the ability to **treat other programs as their data**.

Accordingly it is possible to **read and reason about** programs, to **update or synthesise** programs, and to **execute** programs, possibly in different conditions.

- In Java, *reflection* is a way of inspecting certain parts of a program, even at run-time; other libraries allow for so-called "code instrumentation".
- Scala has advanced techniques to manipulate and execute Scala programs ([documentation](https://docs.scala-lang.org/scala3/reference/metaprogramming/index.html)).

#### Metaprogramming in Prolog

Very powerful, simple and direct: the **clauses of a program are actually terms**, even syntactically, and this paves the way for supporting virtually any metaprogramming technique. Especially, this is used in AI to tweak Prolog into a component of *symbolic reasoning*.

The ingredients of this and the next lessons:

1. **"everything is a term"**;
2. libraries to **"call"** terms;
3. **dynamic theories**;
4. **metainterpretation**.

### Everything is a term

File \`surface-syntax.pl\`. Surface syntax that actually denotes **standard terms**:

1. goals have the same syntax as terms;
2. **binary infix operators**, e.g. \`X = 1\` denotes \`'='(X, 1)\`. There are dozens: \`+\`, \`-\`, \`*\`, \`/\`, \`:-\`, \`==\`, \`;\`, ...;
3. **unary prefix operators**, e.g. \`-X\` denotes \`'-'(X)\`: \`+\`, \`-\`, \`$\`, ...;
4. **list syntax**: \`[A,B,C]\` is \`'.'(A,'.'(B,'.'(C,'[]')))\`, and \`[A,B,C|T]\` is \`'.'(A,'.'(B,'.'(C,T)))\`;
5. **comma syntax** (when used without functor or predicate): \`(A,B,C,D)\` is \`','(A,','(B,','(C,D)))\`, and \`(A)\` is \`A\`;
6. **braces**: \`{A,B,C,D}\` is \`'{}'(','(A,','(B,','(C,D))))\`, and \`{p(X)}\` is \`'{}'(p(X))\`.
`),
    query('G = (X = 1), G =.. L', { expect: ['G = (X=1), L = [=, X, 1]'] }),
    query('T = (a + b * c), T =.. L', { expect: ['T = a+b*c, L = [+, a, b*c]'] }),
    query('T = -X, T =.. L', { expect: ['T = -X, L = [-, X]'] }),
    query("(A, B, C) = ','(1, ','(2, 3))", { expect: ['A = 1, B = 2, C = 3'] }),
    query('(a) == a', { expect: ['true'] }),
    query("{p(X)} = '{}'(p(X))", { expect: ['true'] }),
    query("{0, 1, 2+3} = '{}'(A), A =.. L", {
      expect: ["A = (0, 1, 2+3), L = [',', 0, (1, 2+3)]"],
    }),
    query("[a, b|T] = '[|]'(a, '[|]'(b, T))", { expect: ['true'] }),
    md(`
The goal \`{0,1,2+3} = '{}'(A), A =.. L\`, gives \`A = (0,1,2+3)\` and \`L = [',', 0, (1, 2+3)]\`: the braces wrap a **comma term**, whose functor is \`','\`, with two arguments, \`0\` and the comma term \`(1, 2+3)\`.

> [!note] Other systems write the list constructor as \`'.'\`. SWI-Prolog uses \`'[|]'\` instead (see the lesson on lists from scratch), so the last query above uses that name.

### Operators

File \`operators.pl\`. An **operator** is a predicate or functor that is declared to have a different *syntax*, that is, infix if 2-ary or prefix if 1-ary. It can also be a symbol without the need for quotes.

It must be defined by the predicate \`op/3\`, **executed before it is used**:

- the first argument is a number, describing the **priority** with respect to other operators (lower binds tighter);
- the second is a literal describing the **syntax**: \`xfy\`, \`yfx\`, \`xfx\` for infix, \`fx\` (and \`fy\`) for prefix, where \`f\` is the operator and \`x\`, \`y\` the arguments (\`x\`: strictly lower priority, \`y\`: lower or equal);
- the third is the operator itself.

An operator **as a predicate**, here approximate equality of numbers:
`),
    program(
      `% use as predicate
:- op(100, xfx, '~').
N1 ~ N2 :- N1 > N2, !, Delta is N1 - N2, Delta < 0.1.
N1 ~ N2 :- N2 ~ N1.

% use as functor
:- op(100, xfy, '::').
to_list(A :: B, [A | B2]) :- to_list(B, B2).
to_list(nil, []).`,
      { fresh: true, title: 'operators.pl' },
    ),
    query('10 ~ 10.01', { expect: ['true'] }),
    query('to_list(10 :: 20 :: 30 :: nil, L)', { expect: ['L = [10, 20, 30]'] }),
    query('X = (10 :: 20 :: nil), X =.. L', { expect: ['X = 10::20::nil, L = [::, 10, 20::nil]'] }),
    md(`
- \`~\` is used **as a predicate**: \`10 ~ 10.01\` is a goal.
- \`::\` is used **as a functor**: \`10 :: 20 :: 30 :: nil\` is a term, a list-like structure, and because \`::\` is \`xfy\` it nests to the right, exactly like the list constructor.

> [!warn] \`10 ~ 10\` loops forever: neither \`>\` holds, so the second clause swaps the arguments back and forth.

### Prolog as host for a DSL

File \`dsl.pl\`. Prefix operators let Prolog host a small **domain-specific language** for describing a person:
`),
    program(
      `% use as DSL
:- op(100, fx, person).
:- op(100, fx, name).
:- op(100, fx, age).
:- op(100, fx, nationality).
:- op(100, fx, married).

person {
    name 'Rossi Marco',
    age 30,
    nationality italy,
    married false
}.`,
      { fresh: true, title: 'dsl.pl' },
    ),
    query('person { name NM, age A, nationality N, married M }', {
      expect: ["NM = 'Rossi Marco', A = 30, N = italy, M = false"],
    }),
    md(`
The fact is an ordinary Prolog clause: \`person\` is a prefix operator applied to a braces term holding comma-separated \`name ...\`, \`age ...\` entries. The goal uses variables in the same syntax, so unification extracts every field. Note the **space** in \`person {\`: written without it, a name followed by braces is read by SWI-Prolog as a *dict*.

`),
    exercise({
      title: 'Your own operator',
      prompt: `
Declare an infix operator \`likes\` (priority 700, type \`xfx\`) and add the facts \`mia likes tea\` and \`zoe likes coffee\` written with it. Then \`mia likes X\` must give \`X = tea\`.
`,
      starter: '% :- op(...).\n% facts written with the operator\n',
      hint: 'The directive is `:- op(700, xfx, likes).`, and then facts like `mia likes tea.`',
      solution: `:- op(700, xfx, likes).
mia likes tea.
zoe likes coffee.`,
      tests: [
        { q: 'mia likes X', expect: ['X = tea'] },
        { q: 'Who likes coffee', expect: ['Who = zoe'] },
        { q: 'mia likes coffee', expect: ['false'] },
      ],
    }),
  ],
});

export const solving = lesson({
  id: 'solving',
  part: 'Advanced',
  title: 'Solving goals as terms',
  summary:
    'call, once and not, building goals with univ, findall, filter and the disjunction operator.',
  blocks: [
    md(`
### Solving goals

The basic predicates:

| predicate | meaning |
| --- | --- |
| \`call(+G)\` | solves the goal |
| \`once(+G)\` | solves the goal with **at most one** solution |
| \`not(+G)\` | solves the goal and gives the **opposite result**, without binding |
| \`true\` | always succeeds |
| \`fail\` | always fails |

Note that \`G\` above is actually a **term**, with all the possible syntax: if \`G\` is \`(G1, ..., Gn)\` it is handled as a *resolvent*. An example application: **higher-order predicates**, achieved by passing a predicate *name*.
`),
    query('G = member(X, [a, b]), call(G)', {
      expect: ['G = member(a, [a, b]), X = a', 'G = member(b, [a, b]), X = b'],
    }),
    query('G = (member(X, [1, 2, 3]), X > 1), once(G)', {
      expect: ['G = (member(2, [1, 2, 3]), 2>1), X = 2'],
    }),
    query('not(member(z, [a, b]))', { expect: ['true'] }),
    query('not(member(X, [a, b]))', { expect: ['false'] }),
    md(`
Notice that \`not(member(X, [a, b]))\` fails: \`not/1\` succeeds only if the goal has **no** solution, and it never binds variables.

### map/3 with =.. and once/1

File \`map.pl\`. A **higher-order** predicate: \`map(+L, +P, LO)\` applies the predicate *named* \`P\` to every element. The goal is **built with \`=..\`** and solved with \`once\`:
`),
    program(
      `% map(+L, +P, LO)
map([], _, []).
map([H|T], P, [H2|T2]) :-
    G =.. [P, H, H2], once(G), map(T, P, T2).

inc(N, N2) :- N2 is N+1.`,
      { fresh: true, title: 'map.pl' },
    ),
    query('map([10, 20, 30], inc, L)', { expect: ['L = [11, 21, 31]'] }),
    md(`
\`G =.. [P, H, H2]\` turns the name \`inc\` and the two arguments into the goal \`inc(10, H2)\`; \`once(G)\` solves it. The same predicate can also be written with \`call/N\`:
`),
    program(
      `map2([], _, []).
map2([H|T], P, [H2|T2]) :-
    once(call(P, H, H2)), map2(T, P, T2).`,
      { title: 'map with call/N' },
    ),
    query('map2([10, 20, 30], inc, L)', { expect: ['L = [11, 21, 31]'] }),
    md(`
### Gathering solutions in lists: findall/3

File \`findall-filter.pl\`. \`findall(+Res, +Goal, -List)\` solves the goal **many times** and gathers the results in a list. (\`bagof\` and \`setof\` are variations, less used.) It often simplifies the definition of certain algorithms, and sometimes you need to get all results upfront, to have a broad view on them.
`),
    query('findall([X, Y], (member(X, [1, 2, 3]), member(Y, [1, 2, 3])), L)', {
      expect: ['L = [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3]]'],
    }),
    md(`
Note the use of \`X\` and \`P\` in the next predicate as a sort of **lambda**: \`X\` is the variable that the goal \`P\` talks about.
`),
    program(
      `% filter(+L, X, P, LO)
filter(L, X, P, LO) :- findall(X, (member(X, L), once(P)), LO).`,
      { fresh: true, title: 'findall-filter.pl' },
    ),
    query('filter([10, 21, 30, 40, 50], X, X > 25, LO)', { expect: ['LO = [30, 40, 50]'] }),
    query('filter([a, 1, b, 2], X, integer(X), LO)', { expect: ['LO = [1, 2]'] }),
    md(`
### The operator ";"

File \`disjunction.pl\`. **Disjunction of two goals**: at any point of a rule's body, you can indicate a disjunction between two goals (or resolvents):

\`\`\`
H :- G1, G2, ..., Gk, (G ; G'), G1', ..., Gk'
\`\`\`

Informal meaning: "either \`G\` or \`G'\` (or both)" should be solvable. The "formal" semantics: extract two new clauses \`C(X1,..,Xn) :- G\` and \`C(X1,..,Xn) :- G'\`, where \`X1,..,Xn\` are all the variables used in \`G\` and \`G'\`, and replace \`(G ; G')\` with \`C(X1,..,Xn)\`. Hence note that \`;\` may introduce a **branch**.
`),
    program(
      `neighbour(X, Y1, X, Y2) :- Y1 is Y2+1 ; Y1 is Y2-1.
neighbour(X1, Y, X2, Y) :- X1 is X2+1 ; X1 is X2-1.`,
      { fresh: true, title: 'disjunction.pl' },
    ),
    query('neighbour(X, Y, 5, 5)', {
      expect: ['X = 5, Y = 6', 'X = 5, Y = 4', 'X = 6, Y = 5', 'X = 4, Y = 5'],
    }),
    md(`
Each clause body is a disjunction of two arithmetic goals, so each clause yields two answers, four in total: the neighbours of the cell \`(5, 5)\` on the four sides.

> [!note] **Other control predicates**: \`->\`, \`repeat\`, and so on. They are *a step too far* for most programs: use them only if you know their exact semantics.
`),
    exercise({
      title: 'Apply a named predicate to a pair',
      prompt: `
Write \`apply_twice(P, X, Z)\` where \`P\` is the **name** of a predicate of arity 2 (like \`inc\`, given). It must apply \`P\` to \`X\` and then apply \`P\` again to the result: \`apply_twice(inc, 1, Z)\` gives \`Z = 3\`. Build the goals with \`=..\`.
`,
      setup: 'inc(N, N2) :- N2 is N + 1.',
      starter: '% apply_twice(P, X, Z) :- ...\n',
      hint: 'Build `G1 =.. [P, X, Y]`, call it, then `G2 =.. [P, Y, Z]` and call it.',
      solution: `apply_twice(P, X, Z) :-
    G1 =.. [P, X, Y], once(G1),
    G2 =.. [P, Y, Z], once(G2).`,
      tests: [
        { q: 'apply_twice(inc, 1, Z)', expect: ['Z = 3'] },
        { q: 'apply_twice(inc, 10, Z)', expect: ['Z = 12'] },
        { q: 'apply_twice(inc, 0, 2)', expect: ['true'] },
      ],
    }),
  ],
});
