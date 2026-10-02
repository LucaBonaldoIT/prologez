import { md, program, query, exercise, lesson } from './dsl.js';

export const cut = lesson({
  id: 'cut',
  part: 'Control & the database',
  title: 'Cut & if-then-else',
  summary: 'Controlling backtracking: !, once/1 and ( If -> Then ; Else ).',
  blocks: [
    md(`
Backtracking explores alternatives, but sometimes you *know* there's only one right answer and want Prolog to stop looking. That's the **cut**, written \`!\`.

When Prolog executes \`!\` it **commits**: it throws away every choice made since the clause was entered, including the choice of *this clause* over the ones below it.
`),
    program(
      `% max/3 using a cut
max(X, Y, X) :- X >= Y, !.
max(_, Y, Y).`,
      { fresh: true, title: 'max.pl' },
    ),
    query('max(3, 7, M)', { expect: ['M = 7'] }),
    query('max(9, 2, M)', { expect: ['M = 9'] }),
    md(`
If \`X >= Y\` succeeds, the cut commits and the second clause is never tried. Without the cut, \`max(9, 2, M)\` would answer \`9\` and then, on backtracking, also \`2\`.

#### A red cut: when removing it changes the meaning

The cut in \`max/3\` is subtly wrong. Ask it a question where the answer is **given** instead of asked for:
`),
    query('max(3, 2, 2)', { expect: ['true'] }),
    md(`
\`max(3, 2, 2)\` says "the larger of 3 and 2 is 2", and Prolog agrees! The first clause's head \`max(X, Y, X)\` doesn't unify with \`max(3, 2, 2)\` (3 ≠ 2), so the cut is never reached and the permissive second clause fires. This is a **red cut**: the program is only correct *because* of the cut, and it breaks for other modes of use.

The fix is to delay the output unification until after the cut:
`),
    program(
      `max2(X, Y, Z) :- X >= Y, !, Z = X.
max2(_, Y, Y).`,
      { title: 'max2' },
    ),
    query('max2(3, 2, 2)', { expect: ['false'] }),
    query('max2(3, 2, M)', { expect: ['M = 3'] }),
    md(`
> [!tip] **Green cuts** only prune solutions that would fail anyway, removing them doesn't change the answers, only the efficiency. **Red cuts** change meaning. Prefer green; when you need a red one, comment it.

#### If-then-else

Most uses of cut are really "if … then … else". Prolog has syntax for that:

\`\`\`
( Condition -> Then ; Else )
\`\`\`

It evaluates \`Condition\` (at most once), and runs \`Then\` if it succeeded, otherwise \`Else\`. It's clearer than a cut and harder to get wrong.
`),
    program(
      `grade(Score, Letter) :-
    (   Score >= 90 -> Letter = a
    ;   Score >= 80 -> Letter = b
    ;   Score >= 70 -> Letter = c
    ;   Letter = f
    ).`,
      { title: 'grade.pl' },
    ),
    query('grade(95, G)', { expect: ['G = a'] }),
    query('grade(82, G)', { expect: ['G = b'] }),
    query('grade(12, G)', { expect: ['G = f'] }),
    md(`
Leave out the \`; Else\` and a failing condition makes the whole thing fail.

#### \`once/1\` and committing to a first answer

\`once(Goal)\` runs \`Goal\` and keeps only its **first** solution:
`),
    query('member(X, [a, b, c])', { expect: ['X = a', 'X = b', 'X = c'] }),
    query('once(member(X, [a, b, c]))', { expect: ['X = a'] }),
    query('member(X, [1, 2, 3, 4]), X > 2, !', { expect: ['X = 3'] }),
    md(`
> [!warn] A cut inside the *body of a query* only affects that query. In a clause it cuts the clause's choices **and all the choices of the goals called before it in that clause**.
`),
    md(`
#### Why a cut? The limits of resolution

The pervasive branching nature of Prolog resolution, along with backtracking, is considered one of the "features" of Prolog. But in certain situations it is "a bug": certain predicates have **spurious solutions** one wants to discard, and handling branching situations in certain predicates violates DRY (don't repeat yourself) and can cause performance issues.

So Prolog offers **extra-relational predicates** to control "how many" or "which" solutions one wants to extract from a goal. A very important, primitive one is the **cut**, performed by the 0-ary predicate symbol \`!\`. Its usage is very frequent, and must be well mastered.

#### Cut motivation: dropping spurious solutions

\`merge/3\` merges two *sorted* lists. Here is the version **without** cut:
`),
    program(
      `% merge(List1, List2, OutList)
% merge two sorted lists
merge(Xs, [], Xs).
merge([], Ys, Ys).
merge([X|Xs], [Y|Ys], [X|Zs]) :-
    X < Y, merge(Xs, [Y | Ys], Zs).
merge([X|Xs], [Y|Ys], [Y|Zs]) :-
    X >= Y, merge([X | Xs], Ys, Zs).`,
      { fresh: true, title: 'merge.pl' },
    ),
    query('merge([], [], L)', { expect: ['L = []', 'L = []'] }),
    query('merge([10, 20], [5, 35], L)', { expect: ['L = [5, 10, 20, 35]'] }),
    md(`
The first goal gives **two equivalent solutions** (both facts match the pair of empty lists). The second finds its one answer, but then Prolog **keeps checking** the remaining alternatives and ends in a spurious, costly *no*. In general, checking unnecessary conditions can lead to useless (possibly long) computations: when one of the tests succeeds, we do not need to check any of the others. We may want to **prune the resolution tree**.

#### The cut predicate: details

**Syntax:** simply a 0-ary \`!\` predicate, defined at the library level, to be used as one of the goals in the body of a rule.

**Intended meaning:** it causes certain *local* pending branches to be discarded: those of **successive matching clauses**, and the pending solutions of the **goals to the left of \`!\`** in the current body.

**Precise semantics:** it is always positively executed, causing a side effect on the part of the resolution tree yet to be explored: all pending branches **below the node that first generated the executed cut** are pruned (erased away).

#### What cut prunes

Take this program, where the cut occurs in the second clause of \`p\`:

\`\`\`
go :- p, a.
go :- ...
r.
r.
p :- q.
p :- r, !, t, u.
p :- v.
p :- z.
\`\`\`

\`\`\`
go
├── p, a
│   ├── q, a                 ... (as usual)
│   ├── r, !, t, u, a
│   │   ├── !, t, u, a   ← the cut runs here
│   │   │   └── t, u, a  ... (as usual)
│   │   └── !, t, u, a       ← pruned: the second \`r\` (a goal to the left of the cut)
│   ├── v, a                 ← pruned: the next clauses of \`p\`
│   └── z, a                 ← pruned
└── ...                      ← pruned: the next clause of \`go\`
\`\`\`

Once \`!\` is executed, the **red** alternatives (pending solutions of goals to the left of the cut) and the **green** ones (the successive matching clauses) disappear. The execution of the resolvent after the cut goes on as usual.

#### Cut motivation: the solution of merge/3

File \`merge-cut.pl\`:
`),
    program(
      `% merge(+List1, +List2, -OutList)
% merge two sorted lists
merge(Xs, [], Xs) :- !.
merge([], Ys, Ys).
merge([X|Xs], [Y|Ys], [X|Zs]) :-
    X < Y, !, merge(Xs, [Y|Ys], Zs).
merge([X|Xs], [Y|Ys], [Y|Zs]) :-
    merge([X|Xs], Ys, Zs).`,
      { fresh: true, title: 'merge-cut.pl' },
    ),
    query('merge([], [], L)', { expect: ['L = []'] }),
    query('merge([10, 20], [5, 35], L)', { expect: ['L = [5, 10, 20, 35]'] }),
    md(`
Now there is a **single** answer for the first goal. The first cut prunes the pending branch of the second fact; the second cut prunes the pending branch of the second rule. Note that in the last rule we do **not** need to check \`X >= Y\` again: if the cut after \`X < Y\` was not reached, then \`X >= Y\` must hold.

#### Applications: a single result in first_index_of/3

File \`first-index-of.pl\`:
`),
    program(
      `first_index_of([E|_], E, 0) :- !.
first_index_of([_|T], E, N) :-
    first_index_of(T, E, N2), N is N2 + 1.`,
      { fresh: true, title: 'first-index-of.pl' },
    ),
    query('first_index_of([a, b, b, c], b, N)', { expect: ['N = 1'] }),
    md(`
\`\`\`
first_index_of([a,b,b,c], b, N)
first_index_of([b,b,c], b, N'), N is N' + 1
!, N' is 0 + 1  ...  (pruned)
N is 0 + 1
{N/1}
\`\`\`

As soon as \`!, N is 0 + 1\` moves on to \`N is 0 + 1\`, all pending branches below the \`first_index_of([b,b,c], ...)\` node are pruned: the activation of the second clause is **excluded**.

#### Applications: an alternative approach, with the cut after the call

File \`index-of.pl\`. Here \`index_of/3\` returns *all* indexes, and \`first_index_of2/3\` cuts **after the call**:
`),
    program(
      `index_of([E|_], E, 0).
index_of([_|T], E, N) :- index_of(T, E, N2), N is N2 + 1.

first_index_of2(L, E, N) :- index_of(L, E, N), !.`,
      { fresh: true, title: 'index-of.pl' },
    ),
    query('index_of([a, b, b, c], b, N)', { expect: ['N = 1', 'N = 2'] }),
    query('first_index_of2([a, b, b, c], b, N)', { expect: ['N = 1'] }),
    md(`
As soon as \`!:{N/1}\` moves on to \`{N/1}\`, all pending branches below the \`index_of([b,b,c], ...)\` node are pruned, so the **additional solutions** of \`index_of([a,b,b,c], b, N)\` are excluded. Compare the two approaches: the cut *inside* the definition changes what the predicate means; the cut *after the call* keeps \`index_of/3\` pure and commits only where it is used.

#### Another example: quicksort

File \`quicksort.pl\`. The cut in \`partition/4\` makes the two clauses exclusive:
`),
    program(
      `% quicksort(Ilist, Olist)
quicksort([], []).
quicksort([X | Xs], Ys) :-
    partition(Xs, X, Ls, Bs),
    quicksort(Ls, LOs),
    quicksort(Bs, BOs),
    append(LOs, [X | BOs], Ys).

% partition(Ilist, Pivot, Littles, Bigs)
partition([], _, [], []).
partition([X | Xs], Y, [X | Ls], Bs) :-
    X < Y, !, partition(Xs, Y, Ls, Bs).
partition([X | Xs], Y, Ls, [X | Bs]) :-
    partition(Xs, Y, Ls, Bs).`,
      { fresh: true, title: 'quicksort.pl' },
    ),
    query('partition([10, 3, 20, 5, 30, 9, 40], 10, L1, L2)', {
      expect: ['L1 = [3, 5, 9], L2 = [10, 20, 30, 40]'],
    }),
    query('quicksort([60, 10, 20, 50, 30, 40], L)', { expect: ['L = [10, 20, 30, 40, 50, 60]'] }),
    md(`
> [!note] Other control predicates, such as \`repeat\`, are best used only when you know their **exact semantics**. The cut, instead, must be well mastered.
`),
    exercise({
      title: 'Insert into a sorted list',
      prompt: `
Write \`insert_sorted(X, Sorted, Result)\`: insert \`X\` into the ascending list \`Sorted\`, keeping it ascending. Use a cut so that each goal has **exactly one** answer.
`,
      starter: '% insert_sorted(X, Sorted, Result) :- ...\n',
      hint: 'Base case: the empty list. Then compare `X` with the head: if `X =< H`, put it in front and cut; otherwise keep the head and recurse.',
      solution: `insert_sorted(X, [], [X]).
insert_sorted(X, [H|T], [X, H|T]) :- X =< H, !.
insert_sorted(X, [H|T], [H|R]) :- insert_sorted(X, T, R).`,
      tests: [
        { q: 'insert_sorted(5, [1, 3, 7, 9], L)', expect: ['L = [1, 3, 5, 7, 9]'] },
        { q: 'insert_sorted(0, [1, 2], L)', expect: ['L = [0, 1, 2]'] },
        { q: 'insert_sorted(9, [1, 2], L)', expect: ['L = [1, 2, 9]'] },
        { q: 'insert_sorted(1, [], L)', expect: ['L = [1]'] },
      ],
    }),
    exercise({
      title: 'Classify a number',
      prompt: `
Write \`classify(N, Class)\` where \`Class\` is one of \`negative\`, \`zero\`, \`positive\`. Use if-then-else (or cuts). Each query must give **exactly one** answer.
`,
      starter: '% classify(N, Class) :- ...\n',
      hint: 'Chain conditions: `( N < 0 -> Class = negative ; N =:= 0 -> Class = zero ; Class = positive )`.',
      solution: `classify(N, Class) :-
    (   N < 0 -> Class = negative
    ;   N =:= 0 -> Class = zero
    ;   Class = positive
    ).`,
      tests: [
        { q: 'classify(-5, C)', expect: ['C = negative'] },
        { q: 'classify(0, C)', expect: ['C = zero'] },
        { q: 'classify(7, C)', expect: ['C = positive'] },
        { q: 'classify(0.0, C)', expect: ['C = zero'] },
      ],
    }),
  ],
});

export const negation = lesson({
  id: 'negation',
  part: 'Control & the database',
  title: 'Negation as failure',
  summary: 'What `\\+` really means, and why goal order matters.',
  blocks: [
    md(`
Prolog's \`\\+ Goal\` ("not provable") succeeds when \`Goal\` **fails**, and fails when \`Goal\` succeeds. It's **negation as failure**: Prolog doesn't *know* the goal is false, it just can't prove it. This only makes sense under the closed-world assumption you met in lesson one.
`),
    program(
      `male(tom). male(bob). male(carl).
female(liz).
married(tom). married(liz).

% a bachelor is a male who is not married
bachelor(X) :- male(X), \\+ married(X).`,
      { fresh: true, title: 'people.pl' },
    ),
    query('\\+ married(bob)', { expect: ['true'] }),
    query('\\+ married(tom)', { expect: ['false'] }),
    query('bachelor(X)', { expect: ['X = bob', 'X = carl'] }),
    md(`
#### Order matters: negate only when things are bound

\`\\+\` can't *generate* values, it only **tests**. If the variable is still unbound when \`\\+\` runs, the result is probably not what you meant. Swap the two goals:
`),
    program(`bad_bachelor(X) :- \\+ married(X), male(X).`, { title: 'wrong order' }),
    query('bad_bachelor(X)', { expect: ['false'] }),
    md(`
Why \`false\`? With \`X\` unbound, \`\\+ married(X)\` asks "is there *no* \`X\` that is married?", there is (tom), so the negation fails before \`male(X)\` gets a chance.

**Rule: put the generating goals first, the negated test last.**

#### Not-equal has the same trap

\`X \\= Y\` is also a test ("these can't be unified") and behaves badly with unbound variables:
`),
    query('X \\= a, X = b', { expect: ['false'] }),
    query('X = b, X \\= a', { expect: ['X = b'] }),
    md(`
SWI-Prolog's \`dif/2\` is the order-independent alternative: it *delays* the check until both sides are known well enough.
`),
    query('dif(X, a), X = b', { expect: ['X = b'] }),
    query('dif(X, a), X = a', { expect: ['false'] }),
    query('dif(X, a)', { expect: ['dif(X, a)'] }),
    md(`
#### Negation and "everything not listed"

\`\\+\` is how you write "for all except…" and "no such thing exists" queries:
`),
    program(
      `parent(tom, bob).
parent(bob, ann).
parent(bob, pat).

has_children(X) :- parent(X, _).
childless(P) :- member(P, [tom, bob, ann, pat]), \\+ has_children(P).`,
      { title: 'childless' },
    ),
    query('childless(P)', { expect: ['P = ann', 'P = pat'] }),
    md(`
> [!note] Because \`\\+\` can't bind variables, \`\\+ \\+ Goal\` is a trick for "run Goal, but undo its bindings".
`),
    exercise({
      title: 'Only children',
      prompt: `
The family facts are loaded. Define \`only_child(C)\`: \`C\` has a parent, and that parent has no other child. Remember, generate first, test last.
`,
      setup: `parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).
parent(pat, jim).`,
      starter: '% only_child(C) :- ...\n',
      hint: 'Find `parent(P, C)`, then check `\\+ ( parent(P, S), S \\= C )`, no sibling S different from C.',
      solution: 'only_child(C) :- parent(P, C), \\+ ( parent(P, S), S \\= C ).',
      tests: [
        { q: 'only_child(jim)', expect: ['true'] },
        { q: 'only_child(ann)', expect: ['false'] },
        { q: 'only_child(tom)', expect: ['false'] },
        { q: 'only_child(X)', expect: ['X = jim'] },
      ],
    }),
  ],
});

export const findall = lesson({
  id: 'findall',
  part: 'Control & the database',
  title: 'Collecting all solutions',
  summary: 'findall, bagof, setof, aggregate_all and forall.',
  blocks: [
    md(`
So far each answer arrives separately. To work with *all* answers at once, count them, sum them, sort them, you need the **all-solutions predicates**.

Here is a small employee database:
`),
    program(
      `% emp(Name, Department, Salary)
emp(ann,   eng,   100).
emp(bob,   eng,    80).
emp(carla, ops,    70).
emp(dave,  ops,    70).
emp(erin,  sales,  90).`,
      { fresh: true, title: 'employees.pl' },
    ),
    md(`
#### \`findall(Template, Goal, List)\`

Run \`Goal\` to exhaustion; collect a copy of \`Template\` for every solution. It never fails, if there are no solutions you get \`[]\`.
`),
    query('findall(Name, emp(Name, _, _), Names)', {
      expect: ['Names = [ann, bob, carla, dave, erin]'],
    }),
    query('findall(Name-Salary, (emp(Name, _, Salary), Salary >= 80), L)', {
      expect: ['L = [ann-100, bob-80, erin-90]'],
    }),
    query('findall(S, emp(_, _, S), Ss), sum_list(Ss, Total), length(Ss, N)', {
      expect: ['Ss = [100, 80, 70, 70, 90], Total = 410, N = 5'],
    }),
    query('findall(X, emp(X, hr, _), L)', { expect: ['L = []'] }),
    md(`
#### \`setof\` and \`bagof\`

\`bagof\` is like \`findall\` but **fails on no solutions** and **groups by free variables**. \`setof\` additionally sorts and removes duplicates. A variable in the goal that doesn't appear in the template is "free" and splits the results into groups, one answer per value:
`),
    query('bagof(Name, Salary^emp(Name, Dept, Salary), L)', {
      expect: [
        'Dept = eng, L = [ann, bob]',
        'Dept = ops, L = [carla, dave]',
        'Dept = sales, L = [erin]',
      ],
    }),
    query('setof(Salary, N^D^emp(N, D, Salary), L)', { expect: ['L = [70, 80, 90, 100]'] }),
    md(`
The \`Var^Goal\` syntax says "I don't care about this variable, don't group on it". Without it, \`bagof\`/\`setof\` would return one answer per distinct value of *every* free variable. Watch out: even an anonymous \`_\` counts, so \`bagof(Name, emp(Name, Dept, _), L)\` would split \`eng\` into two groups (salary 100 and salary 80).

#### \`aggregate_all/3\`

For counting and arithmetic summaries there's a shortcut:
`),
    query('aggregate_all(count, emp(_, _, _), N)', { expect: ['N = 5'] }),
    query('aggregate_all(sum(S), emp(_, ops, S), Total)', { expect: ['Total = 140'] }),
    query('aggregate_all(max(S), emp(_, _, S), Max)', { expect: ['Max = 100'] }),
    query('aggregate_all(max(S, Name), emp(Name, _, S), Best)', {
      expect: ['Best = max(100, ann)'],
    }),
    query('aggregate_all(bag(D), emp(_, D, _), Ds), aggregate_all(set(D), emp(_, D, _), Set)', {
      expect: ['Ds = [eng, eng, ops, ops, sales], Set = [eng, ops, sales]'],
    }),
    md(`
#### \`forall/2\`: "for every … holds …"

\`forall(Cond, Action)\` succeeds if \`Action\` holds for **every** solution of \`Cond\`. With side effects it's also the idiomatic loop:
`),
    query('forall(emp(_, _, S), S >= 70)', { expect: ['true'] }),
    query('forall(emp(_, _, S), S >= 80)', { expect: ['false'] }),
    query('forall(emp(N, D, S), format("~w works in ~w and earns ~d~n", [N, D, S]))'),
    md(`
> [!note] \`forall(C, A)\` is just \`\\+ (C, \\+ A)\`: "there is no case where C holds and A doesn't".
`),
    exercise({
      title: 'Department payroll',
      prompt: `
The \`emp/3\` facts above are loaded. Write \`total_salary(Dept, Total)\` giving the sum of salaries in a department. An unknown department should give a total of \`0\`.
`,
      setup: `emp(ann,   eng,   100).
emp(bob,   eng,    80).
emp(carla, ops,    70).
emp(dave,  ops,    70).
emp(erin,  sales,  90).`,
      starter: '% total_salary(Dept, Total) :- ...\n',
      hint: 'Collect the salaries of that department with `findall`, then `sum_list`.',
      solution: `total_salary(Dept, Total) :-
    findall(S, emp(_, Dept, S), Salaries),
    sum_list(Salaries, Total).`,
      tests: [
        { q: 'total_salary(eng, T)', expect: ['T = 180'] },
        { q: 'total_salary(ops, T)', expect: ['T = 140'] },
        { q: 'total_salary(hr, T)', expect: ['T = 0'] },
        { q: 'total_salary(sales, 90)', expect: ['true'] },
      ],
    }),
  ],
});

export const database = lesson({
  id: 'database',
  part: 'Control & the database',
  title: 'The dynamic database',
  summary: 'assert, retract, counters and memoisation.',
  blocks: [
    md(`
A Prolog program is also a **database** that can change while it runs. \`assertz(Clause)\` adds a clause at the end, \`asserta\` at the front, \`retract(Clause)\` removes one. Predicates you modify must be declared \`dynamic\`:
`),
    program(
      `:- dynamic stock/2.

stock(apple, 5).
stock(pear, 2).`,
      { fresh: true, title: 'stock.pl' },
    ),
    query('assertz(stock(plum, 9)), findall(I-N, stock(I, N), L)', {
      expect: ['L = [apple-5, pear-2, plum-9]'],
    }),
    query('retract(stock(apple, _)), findall(I, stock(I, _), L)', { expect: ['L = [pear]'] }),
    query('retractall(stock(_, _)), \\+ stock(_, _)', { expect: ['true'] }),
    md(`
\`listing/1\` prints the current clauses, which is a great way to see what happened:
`),
    query('assertz(stock(kiwi, 1)), listing(stock/2)'),
    md(`
> [!note] **Each Run in this notebook starts from a clean slate**, so assertions disappear after a query ends. Inside one query they persist, that's what the examples below rely on.

#### A counter

State changes are a retract followed by an assert. Here is a counter that hands out ticket numbers:
`),
    program(
      `:- dynamic counter/1.
counter(0).

next_ticket(N) :-
    retract(counter(Old)),
    N is Old + 1,
    assertz(counter(N)).`,
      { title: 'counter.pl' },
    ),
    query('next_ticket(A), next_ticket(B), next_ticket(C)', { expect: ['A = 1, B = 2, C = 3'] }),
    md(`
#### Memoisation: remember what you've computed

Remember the slow naive Fibonacci? Store each result the first time you compute it, and look it up afterwards:
`),
    program(
      `:- dynamic memo/2.

fib(N, F) :- memo(N, F), !.                % already known
fib(N, F) :- N < 2, !, F = N.
fib(N, F) :-
    A is N - 1, B is N - 2,
    fib(A, FA), fib(B, FB),
    F is FA + FB,
    assertz(memo(N, F)).                   % remember it`,
      { fresh: true, title: 'fib_memo.pl' },
    ),
    query('fib(30, F)', { expect: ['F = 832040'] }),
    query('fib(200, F)', { expect: ['F = 280571172992510140037611932413038677189525'] }),
    md(`
The naive version needs millions of calls for \`fib(30)\`; this one needs about sixty.

SWI-Prolog can do this for you with **tabling**: just declare \`:- table fib/2.\` and write the naive definition.
`),
    program(
      `:- table fib/2.
fib(0, 0).
fib(1, 1).
fib(N, F) :- N > 1, A is N - 1, B is N - 2, fib(A, FA), fib(B, FB), F is FA + FB.`,
      { fresh: true, title: 'fib_table.pl' },
    ),
    query('fib(300, F)', {
      expect: ['F = 222232244629420445529739893461909967206666939096499764990979600'],
    }),
    md(`
> [!warn] Mutable state makes programs harder to reason about and breaks the "run it backwards" magic. Use the dynamic database for caches, counters and genuine application state, not as a general substitute for variables.
`),
    md(`
#### The dynamic theory

A Prolog program is actually made of **two "theories"** (sets of predicates and clauses):

- the **static** one, typically provided at the beginning of the computation session: the one written in the IDE;
- a **dynamic** one, initially empty, where you can add and remove clauses while running. Clauses are terms, hence the API is straightforward.

Some Prologs have a single theory, and it is dynamic. Not surprisingly, a Prolog theory can be **inspected programmatically**.

#### The predicates for changing programs

| predicate | meaning |
| --- | --- |
| \`assert(+Clause)\` | adds a clause, always succeeds, never binds. E.g. \`assert(p(1))\`, \`assert((p(X) :- q(X)))\` |
| \`asserta\`, \`assertz\` | assert on top / at the bottom |
| \`retract(+Clause)\` | retracts a matching clause if one exists, and possibly binds |
| \`retractall(+Clause)\` | retracts all matching clauses, always succeeds, never binds |
| \`clause(?Head, ?Body)\` | queries for a clause (possibly with many solutions, and binds). \`Body\` is \`true\` for a fact, or \`(G1,...,Gn)\` in general |

Note the **double parentheses** in \`assert((p(X) :- q(X)))\`: the operator \`:-\` binds looser than an argument allows, so a rule being asserted must be wrapped in its own parentheses.
`),
    program(
      `:- dynamic p/1, q/1.
q(5).`,
      { fresh: true, title: 'dynamic clauses' },
    ),
    query('assert(p(1)), assert((p(X) :- q(X))), findall(Y, p(Y), L)', { expect: ['L = [1, 5]'] }),
    query('assert((p(X) :- q(X))), clause(p(A), Body)', { expect: ['Body = q(A)'] }),
    query('assert(p(1)), clause(p(1), Body)', { expect: ['Body = true'] }),
    query('asserta(p(0)), assertz(p(9)), findall(Y, p(Y), L)', { expect: ['L = [0, 9]'] }),
    md(`
#### Example: caching factorial in the theory

File \`factorial-cache.pl\`. \`withcache(P)\` first looks for \`P\` among the **cached** results; if it is not there, it solves \`P\` once and *asserts* the result. (\`withcache\` can be understood as a **metainterpreter** for single-result predicates, adding caching to the standard interpretation: more on that in the metainterpreter lesson.)

\`cached/1\` must be declared \`dynamic\`: in SWI-Prolog, calling an undefined predicate is an **error**, not a failure.
`),
    program(
      `:- dynamic cached/1.

factorial(0, 1).
factorial(X, Y) :- Xm is X-1, factorial(Xm, Y2), Y is Y2*X.

withcache(P) :- cached(P), !.
withcache(P) :- once(P), assert(cached(P)).`,
      { fresh: true, title: 'factorial-cache.pl' },
    ),
    query('cached(X)', { expect: ['false'] }),
    query('once(factorial(3, N))', { expect: ['N = 6'] }),
    md(`
Calling \`factorial(3, N)\` directly (here under \`once/1\`, see the warning below) caches nothing. Now a sequence of goals: because each run of this notebook starts from a clean slate, we ask them as **one conjunction**, in the same order (\`cached(X)\` first fails, \`withcache(factorial(3,N))\` fills the cache, and so on):
`),
    query(
      '\\+ cached(_), withcache(factorial(3, N)), cached(X), clause(cached(X2), B), withcache(factorial(4, N4)), findall(C, cached(C), L)',
      {
        expect: [
          'N = 6, X = factorial(3, 6), X2 = factorial(3, 6), B = true, N4 = 24, L = [factorial(3, 6), factorial(4, 24)]',
        ],
      },
    ),
    md(`
> [!warn] \`factorial(3, N)\` followed by \`;\` does not terminate: the second clause has no \`X > 0\` guard, so it recurses into negative numbers until the stack overflows. That is why \`withcache\` wraps the call in \`once/1\`: only the first answer is wanted.
`),
    exercise({
      title: 'A stack with assert',
      prompt: `
A stack is stored as dynamic facts \`item(X)\`. The declaration is provided. Write:

- \`push(X)\`: add \`X\` as the new top.
- \`pop(X)\`: remove the top item and return it (fail on an empty stack).

(Hint: \`asserta\` adds at the front.)
`,
      starter: `:- dynamic item/1.

% push(X) :- ...
% pop(X) :- ...
`,
      hint: '`push(X) :- asserta(item(X)).` For `pop`, retract the first matching fact: `pop(X) :- retract(item(X)), !.`',
      solution: `:- dynamic item/1.

push(X) :- asserta(item(X)).
pop(X) :- retract(item(X)), !.`,
      tests: [
        { q: 'push(a), push(b), pop(X)', expect: ['X = b'] },
        { q: 'push(a), push(b), pop(_), pop(X)', expect: ['X = a'] },
        { q: 'pop(X)', expect: ['false'] },
        { q: 'push(1), push(2), push(3), pop(A), pop(B)', expect: ['A = 3, B = 2'] },
      ],
    }),
  ],
});

export const higher = lesson({
  id: 'higher',
  part: 'Control & the database',
  title: 'Higher-order predicates',
  summary: 'call/N, maplist, foldl, filters, and lambdas.',
  blocks: [
    md(`
In Prolog, code is data. \`call/N\` takes a goal (or part of one) and **runs it**, adding extra arguments:
`),
    query('call(write, hello)'),
    query('G = format("~w and ~w~n"), call(G, [a, b])'),
    query('call(plus(1), 2, X)', { expect: ['X = 3'] }),
    md(`
\`plus(1)\` is a *partial* goal; \`call(plus(1), 2, X)\` appends the arguments and runs \`plus(1, 2, X)\`. This is **currying**, and it makes the list-processing predicates below possible.

#### \`maplist\`: apply a relation to every element
`),
    program(
      `double(X, Y) :- Y is X * 2.
even(X) :- 0 is X mod 2.
add(X, Acc0, Acc) :- Acc is Acc0 + X.`,
      { fresh: true, title: 'helpers.pl' },
    ),
    query('maplist(double, [1, 2, 3], L)', { expect: ['L = [2, 4, 6]'] }),
    query('maplist(double, L, [2, 4, 6])', { error: true }),
    query('maplist(succ, L, [2, 3, 4])', { expect: ['L = [1, 2, 3]'] }),
    query('maplist(atom, [a, b, c])', { expect: ['true'] }),
    query('maplist([X, Y, Z]>>(Z is X + Y), [1, 2, 3], [10, 20, 30], Sums)', {
      expect: ['Sums = [11, 22, 33]'],
    }),
    md(`
\`maplist/3\` also works backwards when the relation does (\`succ/2\` does; our \`double/2\`, built on \`is\`, can't, as the error above shows).

#### Filtering and folding
`),
    query('include(even, [1, 2, 3, 4, 5, 6], L)', { expect: ['L = [2, 4, 6]'] }),
    query('exclude(even, [1, 2, 3, 4, 5, 6], L)', { expect: ['L = [1, 3, 5]'] }),
    query('partition(even, [1, 2, 3, 4, 5], In, Out)', {
      expect: ['In = [2, 4], Out = [1, 3, 5]'],
    }),
    query('foldl(add, [1, 2, 3, 4], 0, Sum)', { expect: ['Sum = 10'] }),
    query('foldl([X, A0, A]>>(A is max(X, A0)), [3, 9, 2], 0, Max)', { expect: ['Max = 9'] }),
    md(`
\`foldl(Goal, List, Start, Result)\` threads an accumulator through the list: \`Goal\` is called as \`call(Goal, Element, AccBefore, AccAfter)\`.

#### Lambdas with \`>>\`

Writing a helper predicate for every tiny operation is tedious. The \`yall\` library lets you write anonymous predicates inline:

\`\`\`
[X1, X2, ...] >> Body
\`\`\`

Parameters are listed before \`>>\`. Variables from the surrounding clause are visible in the body, if they're already bound when the lambda runs:
`),
    program(
      `scale(K, List, Scaled) :- maplist([X, Y]>>(Y is X * K), List, Scaled).
only_big(Min, List, Big) :- include([X]>>(X >= Min), List, Big).`,
      { title: 'lambdas.pl' },
    ),
    query('scale(10, [1, 2, 3], L)', { expect: ['L = [10, 20, 30]'] }),
    query('only_big(5, [3, 8, 5, 1, 9], L)', { expect: ['L = [8, 5, 9]'] }),
    md(`
#### Building goals at run time

\`=..\` and \`call/1\` let a program assemble and execute goals dynamically:
`),
    query('Goal =.. [format, "~w squared is ~w~n", [4, 16]], call(Goal)'),
    query('forall(member(Op, [+, -, *]), (G =.. [Op, 6, 3], X is G, format("~w = ~w~n", [G, X])))'),
    exercise({
      title: 'Sum of squares',
      prompt: `
Write \`sum_of_squares(List, Sum)\` using \`maplist\` (with a lambda or helper) and \`sum_list\`. For example \`sum_of_squares([1, 2, 3], S)\` gives \`S = 14\`.
`,
      starter: '% sum_of_squares(List, Sum) :- ...\n',
      hint: 'First `maplist([X, Y]>>(Y is X * X), List, Squares)`, then `sum_list(Squares, Sum)`.',
      solution: `sum_of_squares(List, Sum) :-
    maplist([X, Y]>>(Y is X * X), List, Squares),
    sum_list(Squares, Sum).`,
      tests: [
        { q: 'sum_of_squares([1, 2, 3], S)', expect: ['S = 14'] },
        { q: 'sum_of_squares([], S)', expect: ['S = 0'] },
        { q: 'sum_of_squares([5], S)', expect: ['S = 25'] },
        { q: 'sum_of_squares([-2, 2], S)', expect: ['S = 8'] },
      ],
    }),
  ],
});

export const exceptions = lesson({
  id: 'exceptions',
  part: 'Control & the database',
  title: 'Errors & exceptions',
  summary: 'catch/3, throw/1, and writing predicates that fail gracefully.',
  blocks: [
    md(`
Failure ("no") is a normal outcome in Prolog. An **exception** is different: something is wrong, and execution should abandon the current computation until a handler is found.

\`throw(Ball)\` raises an exception; \`catch(Goal, Pattern, Recovery)\` runs \`Goal\` and, if it throws a ball that unifies with \`Pattern\`, runs \`Recovery\` instead.
`),
    query('catch(throw(oops), Ball, true)', { expect: ['Ball = oops'] }),
    query('catch(X is 1 / 0, error(E, _), true)', {
      expect: ['E = evaluation_error(zero_divisor)'],
    }),
    query('catch(atom_length(X, _), error(Err, _), true)', {
      expect: ['Err = instantiation_error'],
    }),
    query('catch(atom_length(123456, 3.5), error(Err, _), true)'),
    md(`
Built-in predicates throw terms of the shape \`error(Formal, Context)\`, where \`Formal\` is one of the standard descriptions:

| \`Formal\` | meaning |
| --- | --- |
| \`instantiation_error\` | a variable was not bound enough |
| \`type_error(Type, Value)\` | wrong kind of value |
| \`domain_error(Domain, Value)\` | right type, unacceptable value |
| \`existence_error(Kind, Thing)\` | e.g. calling an unknown predicate |
| \`evaluation_error(What)\` | arithmetic trouble |

Uncaught exceptions are reported in red, as you have seen:
`),
    query('atom_length(X, 3)', { error: true }),
    query('foo(1, 2)', { error: true }),
    md(`
#### Throwing your own

Throw anything, but conventional \`error(...)\` terms integrate with Prolog's message system:
`),
    program(
      `withdraw(Balance, Amount, New) :-
    (   \\+ number(Amount)
    ->  throw(error(type_error(number, Amount), withdraw/3))
    ;   Amount > Balance
    ->  throw(insufficient_funds(Balance, Amount))
    ;   New is Balance - Amount
    ).

try(Goal) :-
    catch(Goal, Problem, (format("caught: ~q~n", [Problem]), fail)).`,
      { fresh: true, title: 'bank.pl' },
    ),
    query('withdraw(100, 30, New)', { expect: ['New = 70'] }),
    query('try(withdraw(100, 500, _))', { expect: ['false'] }),
    query('try(withdraw(100, ten, _))', { expect: ['false'] }),
    md(`
#### Check your inputs with \`must_be/2\`

\`must_be(Type, Value)\` throws the right standard error for you:
`),
    query('catch(must_be(positive_integer, -3), error(E, _), true)', {
      expect: ['E = type_error(positive_integer, -3)'],
    }),
    query('catch(must_be(integer, _), error(E, _), true)', { expect: ['E = instantiation_error'] }),
    md(`
#### Cleaning up

\`setup_call_cleanup(Setup, Goal, Cleanup)\` guarantees \`Cleanup\` runs, whether \`Goal\` succeeds, fails or throws. It's how you'd close a file you opened.
`),
    query(
      'catch(setup_call_cleanup(write(open), throw(boom), (write(" closed"), nl)), boom, write(recovered))',
    ),
    md(`
> [!tip] **Fail or throw?** If "no answer" is a legitimate result (\`member(z, [a,b])\`), fail. If the caller broke the contract (wrong type, unbound input), throw.
`),
    exercise({
      title: 'Safe division',
      prompt: `
Write \`safe_div(X, Y, Result)\` using integer division \`//\`. If the division throws an exception (e.g. division by zero), \`Result\` should be the atom \`undefined\` instead.
`,
      starter: '% safe_div(X, Y, Result) :- ...\n',
      hint: 'Wrap the arithmetic in `catch/3`: `catch(R is X // Y, _, R = undefined)`.',
      solution: `safe_div(X, Y, Result) :-
    catch(Result is X // Y, _, Result = undefined).`,
      tests: [
        { q: 'safe_div(10, 2, R)', expect: ['R = 5'] },
        { q: 'safe_div(7, 2, R)', expect: ['R = 3'] },
        { q: 'safe_div(1, 0, R)', expect: ['R = undefined'] },
        { q: 'safe_div(a, 2, R)', expect: ['R = undefined'] },
      ],
    }),
  ],
});
