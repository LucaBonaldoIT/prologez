// Lessons on performance and
// immutability, searching the solution space, inspecting terms, and algorithms on other ADTs.
import { md, program, query, exercise, lesson } from './dsl.js';

export const algorithms = lesson({
  id: 'algorithms',
  part: 'Data & computation',
  title: 'Performance, tail recursion and immutability',
  summary: 'Counting resolution steps, tail and non-tail recursion, and how terms are shared.',
  blocks: [
    md(`
### On building algorithms

Items to discuss: **performance aspects**, tail and non-tail recursion, **immutability and sharing**, and generating combinations and searching the space of solutions. We start with lists, then generalise to other data types, meanwhile presenting libraries and introducing some non-relational constructs.

#### Performance considerations

Traditionally, Prolog is known for **not being "as fast as" C**, though professional implementations are actually rather fast.

Recall our approach to performance:

- address the problem **only if we have requirements that are not met**;
- still, we have to know the **implications of our programming choices**, and choose slower implementations only if they have other good properties, e.g. simplicity or clarity.

How can we characterise the performance of a predicate? First of all, in terms of the **number of resolution steps**. Each step requires a search for a matching rule, the computation of an MGU, and an update of the resolvent under the new substitution. We might assume that a step costs a constant, but it actually depends on the number of rules, of variables, of goals, and so on.

### Tail recursion in Prolog

A recursion is **tail** if the recursive call is the *last operation* executed before returning. Nothing is left to be done when the base case is reached, hence computation is done *before* that, namely **while recursing**. So an optimisation can (at least in principle) avoid the cost of creating activation records for the nested calls. Often (not always), tail recursions are obtained by putting **extra arguments** in the call, modelling the state evolution during recursion.

In Prolog, tail-recursive calls are characterised by rules where the head predicate occurs **only as the last goal** in the body. The resolution "chain" is such that computation is done in arguments or substitutions, until the base case is reached. Note that non-tail recursions are often more idiomatic. And Prolog supports **tail-recursive foldright-like list construction**, which functional programming cannot do!

### Non-tail recursion with sum/2 (foldleft-like)

File \`sum-nontail.pl\`:
`),
    program(
      `% sum(List, Sum)
% relate a List of numbers with the sum of its elements
sum([], 0).
sum([H|T], N) :- sum(T, N2), N is H + N2.`,
      { fresh: true, title: 'sum-nontail.pl' },
    ),
    query('sum([10, 20, 30], S)', { expect: ['S = 60'] }),
    query('sum([], S)', { expect: ['S = 0'] }),
    query('sum([10, 20, 30], 60)', { expect: ['true'] }),
    md(`
\`\`\`
sum([10,20,30], S)
sum([20,30], S'), S is 10 + S'
sum([30], S''), S' is 20 + S'', S is 10 + S'
sum([], S'''), S'' is 30 + S''', S' is 20 + S'', S is 10 + S'
S'' is 30 + 0, S' is 20 + S'', S is 10 + S'
S' is 20 + 30, S is 10 + S'
S is 10 + 50
{S/60}
\`\`\`

Notes: the program is **quite idiomatic**; the computation occurs *as the recursion is over*; the resolvent can become quite big; many resolution steps are needed (about 2 · n).

### Tail recursion with sum/2

File \`sum-tail.pl\`. The relation \`sum/2\` is defined through an **accumulator** in \`sum/3\`:
`),
    program(
      `% sum(List, Sum)
% relate a List of numbers with the sum of its elements
sum(L, S) :- sum(L, 0, S).
sum([], S, S).
sum([H|T], N, S) :- N2 is H + N, sum(T, N2, S).`,
      { fresh: true, title: 'sum-tail.pl' },
    ),
    query('sum([10, 20, 30], S)', { expect: ['S = 60'] }),
    query('sum([], S)', { expect: ['S = 0'] }),
    query('sum([10, 20, 30], 60)', { expect: ['true'] }),
    md(`
\`\`\`
sum([10,20,30], S)
sum([10,20,30], 0, S)
N2' is 0+10, sum([20,30], N2', S)
sum([20,30], 10, S)
N2'' is 10+20, sum([30], N2'', S)
sum([30], 30, S)
N2''' is 30+30, sum([], N2''', S)
\`\`\`

Notes: the program is rather **less direct**; the computation occurs *during* the recursion; the resolvents are **much simpler**.

The two versions side by side. On a list of 100 000 numbers both take about 2 · n resolution steps (the *inferences* reported by \`time/1\`): the difference is **not** in the number of steps but in the *size of the resolvent*, hence in memory. With three million numbers the non-tail version runs out of stack, while the tail-recursive one runs in constant stack space:
`),
    program(
      `sum_nt([], 0).
sum_nt([H|T], N) :- sum_nt(T, N2), N is H + N2.

sum_t(L, S) :- sum_t(L, 0, S).
sum_t([], S, S).
sum_t([H|T], N, S) :- N2 is H + N, sum_t(T, N2, S).`,
      { title: 'both versions' },
    ),
    query('numlist(1, 100000, _L), time(sum_nt(_L, S))', { expect: ['S = 5000050000'] }),
    query('numlist(1, 100000, _L), time(sum_t(_L, S))', { expect: ['S = 5000050000'] }),
    query('numlist(1, 3000000, _L), sum_nt(_L, S)', { error: true }),
    query('numlist(1, 3000000, _L), sum_t(_L, S)', { expect: ['S = 4500001500000'] }),
    md(`
### Tail recursion with join/3 (foldright-like)

File \`join-tail.pl\`:
`),
    program(
      `% join(List1, List2, List)
% relate List1 and List2 with their concatenation
join([], L, L).
join([H | T], L, [H | T2]) :- join(T, L, T2).`,
      { fresh: true, title: 'join-tail.pl' },
    ),
    query('join([10, 20], [30, 40, 50], L)', { expect: ['L = [10, 20, 30, 40, 50]'] }),
    md(`
\`\`\`
join([10,20],[30,40,50],L)
join([20],[30,40,50],T2')    : {L/[10|T2']}
join([],[30,40,50],T2'')     : {L/[10|T2'], T2'/[20|T2'']}
{L/[10|T2'], T2'/[20|T2''], T2''/[30,40,50]} ≡ {L/[10,20,30,40,50]}
\`\`\`

Notes: **foldright-like functions are very easily expressed**, and the corresponding recursion is **tail**! The output list is constructed by the \`[H|T2]\` unification *during* the recursion. This is not achieved by functional programming with immutable structures.

### Immutability and sharing: update/4

File \`update.pl\`:
`),
    program(
      `% update(List1, E1, E2, List2)
% relate List1 with a List2 where first occurrence
% of E1 is updated with E2
update([], _, _, []).
update([E1 | T], E1, E2, [E2 | T]).
update([H1 | T1], E1, E2, [H1 | T2]) :-
    update(T1, E1, E2, T2).`,
      { fresh: true, title: 'update.pl' },
    ),
    query('update([10, 20, 30, 40], 20, 21, L)', {
      expect: ['L = [10, 21, 30, 40]', 'L = [10, 20, 30, 40]'],
    }),
    md(`
\`\`\`
update([10,20,30,40],20,21,L)
update([20,30,40],20,21,T2')  : {L/[10|T2']}
{L/[10|T2'], T2'/[21|[30,40]]} ≡ {L/[10,21,30,40]}
\`\`\`

How is the output list related to the input one? **Prolog has immutability of data**: terms get unified, never modified. The output list actually **shares** \`[30, 40]\` with the input list. Hence Prolog has *intrinsic immutability and sharing of structures*. SWI-Prolog can check the sharing: \`same_term/2\` is true when two arguments are the very same object in memory.
`),
    query(
      'Tail = [30, 40], update([10, 20|Tail], 20, 21, [_, _|Shared]), same_term(Tail, Shared)',
      {
        expect: ['Tail = [30, 40], Shared = [30, 40]'],
      },
    ),
    md(`
> [!note] **A second answer.** The first answer is the expected one. The program has another one, \`L = [10, 20, 30, 40]\`: the third clause also applies where the second does, and the first clause closes the recursion on an empty list. The comment says *first occurrence*, which only holds for the first answer. The exercise below fixes that.

#### Immutability of Prolog terms

Computation happens **only by resolution and unification**. Hence data values, which are terms, have *no concept of mutability*. Terms are just manipulated by unification of the terms in the resolvent and of the terms occurring in cloned copies of applied rules.

Computationally, a term is an entity that **never changes**; its subparts can be shared with other terms. A "declarative" form of side effect is achieved by unification: a non-ground term could at some point have a variable be "bound" to an actual term.
`),
    exercise({
      title: 'Update only the first occurrence',
      prompt: `
Write \`update_first(List1, E1, E2, List2)\`: \`List2\` is \`List1\` where **only the first** occurrence of \`E1\` is replaced by \`E2\`. If \`E1\` does not occur, \`List2\` is the same list. There must be exactly **one** answer.
`,
      starter: '% update_first(List1, E1, E2, List2) :- ...\n',
      hint: 'Same shape as `update/4`, but add a cut after matching the head `E1`, and give the empty-list case its own clause. Make the third clause apply only when the head differs from `E1`.',
      solution: `update_first([], _, _, []).
update_first([E1|T], E1, E2, [E2|T]) :- !.
update_first([H|T1], E1, E2, [H|T2]) :- update_first(T1, E1, E2, T2).`,
      tests: [
        { q: 'update_first([10, 20, 30, 20], 20, 21, L)', expect: ['L = [10, 21, 30, 20]'] },
        { q: 'update_first([a, b], z, y, L)', expect: ['L = [a, b]'] },
        { q: 'update_first([], a, b, L)', expect: ['L = []'] },
      ],
    }),
  ],
});

export const searching = lesson({
  id: 'searching',
  part: 'Data & computation',
  title: 'Generating combinations and searching',
  summary:
    'Exploration as a generator: join, permutation, combinations of solutions, and grid links.',
  blocks: [
    md(`
### Full relationality and space-searching

Even if we design a predicate with an implicit idea of **input arguments** and **output arguments**, a goal could use variables in any place. So in general we may expect that, by resolution, Prolog attempts to find *all substitutions of variables* satisfying the relation. This could be obtained automatically in simple cases, or must be explicitly programmed in others.

Either way, Prolog is a language with an inherent ability to capture well the algorithms that need to **search solutions in tree-like spaces**.

### Searching solutions with join/3

File \`join-search.pl\`:
`),
    program(
      `% join(List1, List2, List)
% relate List1 and List2 with their concatenation
join([], L, L).
join([H | T], L, [H | T2]) :- join(T, L, T2).`,
      { fresh: true, title: 'join-search.pl' },
    ),
    query('join(L1, L2, [a, b, c])', {
      expect: [
        'L1 = [], L2 = [a, b, c]',
        'L1 = [a], L2 = [b, c]',
        'L1 = [a, b], L2 = [c]',
        'L1 = [a, b, c], L2 = []',
      ],
    }),
    md(`
\`\`\`
join(L1, L2, [a,b,c])
├── {L1/[], L2/[a,b,c]}
└── join(T', L2, [b,c]) : {L1/[a|T']}
    ├── {L1/[a], L2/[b,c]}
    └── join(T'', L2, [c]) : {L1/[a,b|T'']}
        ├── {L1/[a,b], L2/[c]}
        └── join(T''', L2, []) : {L1/[a,b,c|T'']}
            └── {L1/[a,b,c], L2/[]}
\`\`\`

We know Prolog will "explore", since the goal matches multiple rules. And thanks to **tail recursion**, solutions are created *while exploring*.

### Searching solutions: permutation/2

File \`permutation.pl\`:
`),
    program(
      `% member2(List, Elem, ListWithoutElem)
member2([X | Xs], X, Xs).
member2([X | Xs], E, [X|Ys]) :- member2(Xs, E, Ys).

% permutation(Ilist, Olist)
permutation([], []).
permutation(Xs, [X | Ys]) :-
    member2(Xs, X, Zs), permutation(Zs, Ys).`,
      { fresh: true, title: 'permutation.pl' },
    ),
    query('permutation([a, b, c], L)', {
      expect: [
        'L = [a, b, c]',
        'L = [a, c, b]',
        'L = [b, a, c]',
        'L = [b, c, a]',
        'L = [c, a, b]',
        'L = [c, b, a]',
      ],
    }),
    md(`
The resolution tree of \`p([a,b,c], L)\` (with \`m2\` for \`member2\` and \`p\` for \`permutation\`):

\`\`\`
p([a,b,c], L)
└── m2([a,b,c], X', Zs'), p(Zs', Ys') : {L/[X'|Ys']}
    ├── p([b,c], Ys')  : {L/[a|Ys']}
    │   ├── p([c], Ys'')  : {L/[a,b|Ys'']}  → p([], Ys''')  ...  {L/[a,b,c]}
    │   └── p([b], Ys'')  : {L/[a,c|Ys'']}  ...  [a,c,b]
    ├── p([a,c], Ys')  : {L/[b|Ys']}   ...  [b,a,c]; [b,c,a]
    └── p([a,b], Ys')  : {L/[c|Ys']}   ...  [c,a,b]; [c,b,a]
\`\`\`

### Full relationality pitfalls: permutation(L, [a,b])?

File \`perm-pitfall.pl\`. The same program, **asked the other way round**. The first answer is found, and then the search goes on forever:
`),
    query('permutation(L, [a, b])', { expect: ['L = [a, b]'], error: true }),
    md(`
\`\`\`
p(L, [a,b])
└── m2(L, a, Zs'), p(Zs', [b])  : {L/...}
    ├── p(Zs', [b]) : {L/[a|Zs']}
    │   ├── m2(Zs', b, Zs''), p(Zs'', [])  ...
    │   │   ├── p(Zs'', []) : {L/[a,b|Zs'']}  →  {L/[a,b]}
    │   │   └── m2(Xs', b, Ys''), p([X'|Ys''], [])  : {L/[a,X',b|Ys'']}  ...
    │   │           └── ...  (to infinity)
\`\`\`

Why? With \`L\` unbound, \`member2\` can produce lists of **any length** (it inserts \`a\` in an open list), while \`permutation\` only stops on the empty list. The notebook stops the runaway search with a stack error.

#### Pitfalls in searching

- Sometimes building fully relational predicates is **not very easy**, especially with possibly infinite solutions: it is not generally easy to enumerate them all. This is typically the case when enumeration is *not strictly directional*.
- Example: *checking* if a list has the elements 10, 20 and 30 is much easier than *enumerating all the lists* having 10, 20 and 30.
- Possible solution in principle: in certain applications it would still be possible to iteratively extract what is needed. Essentially, the idea would be to navigate the resolution tree **breadth-first** instead of depth-first. All solutions would be eventually found, though at very high memory and time costs.

### Exploiting exploration to generate combinations

File \`combinations.pl\`. A general pattern in Prolog: consider a resolvent \`G1, G2, ..., Gn\`. If \`Gi\` gives \`ki\` solutions, and they do not constrain the execution of the successive goals, then overall we get **∏ ki** solutions, obtained by *all combinations* of the solutions of each \`Gi\`.
`),
    query('member(X, [10, 20, 30]), member(Y, [1, 2]), Res is X + Y', {
      expect: [
        'X = 10, Y = 1, Res = 11',
        'X = 10, Y = 2, Res = 12',
        'X = 20, Y = 1, Res = 21',
        'X = 20, Y = 2, Res = 22',
        'X = 30, Y = 1, Res = 31',
        'X = 30, Y = 2, Res = 32',
      ],
    }),
    md(`
The composition of goals works as a sort of **for-comprehension**: it recalls very much what \`for\`-comprehension and \`flatMap\` are about, what is also called a *monadic computation*. So in a sense, Prolog computations are always potentially sorts of for-comprehensions. Here \`3 × 2 = 6\` solutions.

### Generating combinations: links in a grid

File \`gridlink.pl\`:
`),
    program(
      `interval(A, _, A).
interval(A, B, X) :- A2 is A+1, A2 < B, interval(A2, B, X).

neighbour(A, B, A, B2) :- B2 is B+1.
neighbour(A, B, A, B2) :- B2 is B-1.
neighbour(A, B, A2, B) :- A2 is A+1.
neighbour(A, B, A2, B) :- A2 is A-1.

gridlink(N, M, link(X, Y, X2, Y2)) :-
    interval(0, N, X),
    interval(0, M, Y),
    neighbour(X, Y, X2, Y2),
    X2 >= 0, Y2 >= 0, X2 < N, Y2 < M.`,
      { fresh: true, title: 'gridlink.pl' },
    ),
    query('gridlink(3, 3, L)', { max: 3 }),
    query('aggregate_all(count, gridlink(3, 3, _), N)', { expect: ['N = 24'] }),
    query('findall(L, gridlink(3, 3, L), _Ls), last(_Ls, Last)', {
      expect: ['Last = link(2, 2, 1, 2)'],
    }),
    md(`
\`gridlink(3, 3, L)\` gives, in order, \`link(0,0,0,1)\`, \`link(0,0,1,0)\`, ..., \`link(2,2,2,1)\`, \`link(2,2,1,2)\`: **24 links** of the 3 × 3 grid. The generators \`interval\` produce all cells, \`neighbour\` produces the four candidate neighbours of a cell, and the tests discard those outside the grid.
`),
    exercise({
      title: 'Dice',
      prompt: `
Write \`dice(A, B, S)\`: the sum \`S\` of two six-sided dice \`A\` and \`B\` (each between 1 and 6) **where \`A =< B\`** (so \`1+2\` and \`2+1\` count once). Generate with \`between/3\` and test.
`,
      starter: '% dice(A, B, S) :- ...\n',
      hint: 'Two nested `between/3` calls, a comparison, then `S is A + B`.',
      solution: `dice(A, B, S) :-
    between(1, 6, A),
    between(1, 6, B),
    A =< B,
    S is A + B.`,
      tests: [
        { q: 'aggregate_all(count, dice(_, _, _), N)', expect: ['N = 21'] },
        { q: 'dice(6, 6, S)', expect: ['S = 12'] },
        { q: 'dice(3, 2, S)', expect: ['false'] },
        { q: 'aggregate_all(count, dice(_, _, 7), N)', expect: ['N = 3'] },
      ],
    }),
  ],
});

export const inspect = lesson({
  id: 'inspect',
  part: 'Data & computation',
  title: 'Inspecting and managing terms',
  summary:
    'Type checks, comparison, copy_term, terms as strings, univ, functor, arg, and console output.',
  blocks: [
    md(`
### Library predicates to deal with terms

So far unification is our **only means** to manage terms: it has been used to *inspect* terms (to process "input") and to *create* new terms (to produce "output"). Often additional expressiveness is needed, though somewhat **extra-relational**, like the cut.

The usual predicates and operators:

| purpose | predicates |
| --- | --- |
| inspect the shape of a term | \`var/1\`, \`nonvar/1\`, \`number/1\`, \`float/1\`, \`integer/1\`, \`atom/1\`, \`compound/1\`, \`ground/1\` |
| comparison | \`=/2\`, \`\\=/2\`, \`==/2\`, \`\\==/2\`, \`copy_term/2\` |
| terms as strings | \`atom_chars/2\`, \`atom_codes/2\`, \`atom_concat/3\`, \`char_code/2\`, \`number_chars/2\`, \`number_codes/2\` |
| term structure | \`=../2\`, \`functor/3\`, \`arg/3\` |
| I/O over file and console | \`write/1\`, \`nl/0\`, ... |

### Inspecting terms

File \`inspecting-terms.pl\`. Typically used to **check the correctness of inputs**.
`),
    query('atom(a)', { expect: ['true'] }),
    query('atom(10)', { expect: ['false'] }),
    query('atom(a(1))', { expect: ['false'] }),
    query('var(X)', { expect: ['true'] }),
    query('var(a)', { expect: ['false'] }),
    query('nonvar(X)', { expect: ['false'] }),
    query('number(10)', { expect: ['true'] }),
    query('float(10.1)', { expect: ['true'] }),
    query('integer(10.1)', { expect: ['false'] }),
    query('compound(10)', { expect: ['false'] }),
    query('compound(a)', { expect: ['false'] }),
    query('compound(a(10, 20))', { expect: ['true'] }),
    query('ground(a(10, 20))', { expect: ['true'] }),
    query('ground(a(10, X))', { expect: ['false'] }),
    md(`
### Term comparison

File \`term-comparison.pl\`. Typically used to **handle and compare inputs more flexibly**.

- \`=/2\` **unifies**; \`\\=/2\` is the non-unification test and *never binds*;
- \`==/2\` is **equality** (no binding): two terms are equal if they are structurally identical, so a variable is equal only to itself; \`\\==/2\` is the inequality;
- \`copy_term/2\` **clones** a term, giving the copy fresh variables.
`),
    query('a(10, b) = a(10, b)', { expect: ['true'] }),
    query('a(X, b) = a(10, b)', { expect: ['X = 10'] }),
    query('a(X, b) = a(Y, c)', { expect: ['false'] }),
    query('a(10, b) \\= a(10, b)', { expect: ['false'] }),
    query('a(X, b) \\= a(10, b)', { expect: ['false'] }),
    query('a(X, b) \\= a(Y, c)', { expect: ['true'] }),
    query('a(10, b) == a(10, b)', { expect: ['true'] }),
    query('a(X, b) == a(10, b)', { expect: ['false'] }),
    query('a(X, b) == a(X, b)', { expect: ['true'] }),
    query('a(10, b) \\== a(10, b)', { expect: ['false'] }),
    query('a(X, b) \\== a(10, b)', { expect: ['true'] }),
    query('a(X, b) \\== a(X, b)', { expect: ['false'] }),
    query('copy_term(a(10, X), Y)', { expect: ['Y = a(10, _)'] }),
    query('copy_term(a(10, X), a(10, Y))', { expect: ['true'] }),
    query('copy_term(a(10, X), a(10, X))', { expect: ['true'] }),
    query('copy_term(a(10, X), a(11, X))', { expect: ['false'] }),
    md(`
Notice that \`copy_term(a(10, X), Y)\` answers \`Y = a(10, _)\`: the copy has a **fresh** variable, not \`X\` itself. Check it with \`==\`:
`),
    query('copy_term(a(10, X), Y), Y == a(10, X)', { expect: ['false'] }),
    md(`
### Terms as strings

File \`terms-as-strings.pl\`. Typically used to **manipulate numbers, atoms and strings computationally**.
`),
    query('atom_chars(hello, L)', { expect: ['L = [h, e, l, l, o]'] }),
    query('atom_chars(X, [h, e, l, l, o])', { expect: ['X = hello'] }),
    query('atom_codes(hello, L)', { expect: ['L = [104, 101, 108, 108, 111]'] }),
    query('atom_codes(X, [95, 48, 32, 49])', { expect: ["X = '_0 1'"] }),
    query("atom('_0 1')", { expect: ['true'] }),
    query('atom_concat(aa, bb, X)', { expect: ['X = aabb'] }),
    query('number_chars(100, X)', { expect: ["X = ['1', '0', '0']"] }),
    query('number_codes(100, X)', { expect: ['X = [49, 48, 48]'] }),
    query("char_code(C, 0'a)", { expect: ['C = a'] }),
    md(`
The pair \`atom_chars\` / \`atom_codes\` converts an atom to and from a sequence of **one-character atoms** or of **ASCII codes**. Note that \`atom_codes(X, [95, 48, 32, 49])\` gives the atom \`'_0 1'\`: any text can be an atom.

### Compound terms: (de)structuring

File \`term-structure.pl\`. Typically used to **manipulate compound terms computationally**.
`),
    query('p(10, q(20)) =.. L', { expect: ['L = [p, 10, q(20)]'] }),
    query('X =.. [p, 10, q(20)]', { expect: ['X = p(10, q(20))'] }),
    query('functor(p(10, 20, 30), X, Y)', { expect: ['X = p, Y = 3'] }),
    query('functor(T, p, 3)', { expect: ['T = p(_, _, _)'] }),
    query('arg(2, p(10, 20, 30), Y)', { expect: ['Y = 20'] }),
    md(`
- \`=..\` ("univ") converts a compound term to a list (**functor first**, then the arguments) and back;
- \`functor/3\` extracts, or constructs, the functor name and the arity;
- \`arg/3\` gives the N-th argument of a compound term, **directly**.

### I/O over the console

File \`console-io.pl\`. We can redirect standard input/output (it is the console by default), and there are predicates to write terms as strings (\`write/1\`, \`nl/0\`) and to read. We only see the usage for **debugging by logging strings**: the program below prints the partial sums while the recursion unwinds.
`),
    program(
      `sum([], 0).
sum([H|T], N) :- sum(T, N2), write(N2), nl, N is H + N2.`,
      { fresh: true, title: 'console-io.pl' },
    ),
    query("write('start'), nl, sum([10, 20, 30], N)", { expect: ['N = 60'] }),
    md(`
The console shows \`start\`, then \`0\`, \`30\`, \`50\`: the sums of the tails, computed from the last element backwards. Here the printed text appears **above the answers**.

### A few examples

File \`few-examples.pl\`:

- \`all(+Term, +List)\`: are all the elements of \`List\` of the kind \`Term\`? It uses \`copy_term/2\` to compare an element with a fresh copy of the pattern;
- a **fully relational** \`size/2\`, which counts the length of a list when the list is given, and **generates** a list of the given length when it is not.
`),
    program(
      `% all(+Term, +List): are all elements in List of kind Term?
all(_, []).
all(X, [Y | T]) :- copy_term(X, Y), all(X, T).

% fully-relational size
size(L, N) :- var(L), !, generate(L, N).
size(L, N) :- length(L, N).

generate([], 0) :- !.
generate([_|T], N) :- N2 is N-1, generate(T, N2).`,
      { fresh: true, title: 'few-examples.pl' },
    ),
    query('all(p(X), [p(a), p(b), p(a)])', { expect: ['true'] }),
    query('all(p(X), [p(a), q(b)])', { expect: ['false'] }),
    query('size([10, 20, 30], N)', { expect: ['N = 3'] }),
    query('size(L, 3)', { expect: ['L = [_, _, _]'] }),
    md(`
> [!note] The \`size/2\` above relies on the built-in \`length/2\` for its second clause. Defining your own \`length/2\` would be refused: SWI-Prolog does not allow redefining built-ins.

\`all\` works because \`copy_term(p(X), Y)\` gives a *fresh* \`p(_)\`, which then unifies with the element, whatever its argument: \`p(a)\`, \`p(b)\` and so on, while \`q(b)\` does not match the kind.
`),
    exercise({
      title: 'What kind of term?',
      prompt: `
Write \`kind(T, K)\` where \`K\` is one of \`variable\`, \`number\`, \`atom\` or \`compound\`, according to the term \`T\`. Use the type-checking predicates (watch the order: a variable must be recognised **before** anything else, and \`kind\` must give exactly one answer).
`,
      starter: '% kind(T, K) :- ...\n',
      hint: 'Chain the checks with `( var(T) -> K = variable ; number(T) -> K = number ; atom(T) -> K = atom ; K = compound )`.',
      solution: `kind(T, K) :-
    (   var(T) -> K = variable
    ;   number(T) -> K = number
    ;   atom(T) -> K = atom
    ;   K = compound
    ).`,
      tests: [
        { q: 'kind(_, K)', expect: ['K = variable'] },
        { q: 'kind(42, K)', expect: ['K = number'] },
        { q: 'kind(foo, K)', expect: ['K = atom'] },
        { q: 'kind(f(x), K)', expect: ['K = compound'] },
        { q: 'kind([a], K)', expect: ['K = compound'] },
      ],
    }),
  ],
});

export const adts = lesson({
  id: 'adts',
  part: 'Data & computation',
  title: 'Algorithms on other data types',
  summary:
    'Database tables, binary and n-ary trees, bidirectional lists and lazily expanding lists.',
  blocks: [
    md(`
### DB-like structures

File \`db-tables.pl\`. The case of **DB table operations**: a table of a DB is simply modelled as a **list of compound terms**. \`select\`, \`insert\` and \`update\` are managed as expected (though of course performance can be an issue).
`),
    program(
      `% get_ids(+Table, -List)
% gets the List of ids from the Table
get_ids([], []).
get_ids([user(ID, _, _) | T], [ID | L]) :- get_ids(T, L).

% query(+Table, +Id, -Tuple)
% gets the Tuple with Id from the Table
query([user(ID, N, C) | _], ID, user(ID, N, C)).
query([_ | T], ID, Tuple) :- query(T, ID, Tuple).

% update(+Table, +Id, +NewTuple, -NewTable)
% updates the tuple with Id to NewTuple
update([user(ID, _, _) | T], ID, Tuple, [Tuple | T]).
update([H | T], ID, Tuple, [H | Table]) :-
    update(T, ID, Tuple, Table).`,
      { fresh: true, title: 'db-tables.pl' },
    ),
    query('get_ids([user(100, a, b), user(101, c, d)], Ids)', { expect: ['Ids = [100, 101]'] }),
    query('query([user(100, a, b), user(101, c, d)], 101, T)', { expect: ['T = user(101, c, d)'] }),
    query('update([user(100, a, b), user(101, c, d)], 101, user(101, c, e), DB)', {
      expect: ['DB = [user(100, a, b), user(101, c, e)]'],
    }),
    md(`
### Binary trees: searching elements

File \`bintree-search.pl\`. Again a natural modelling: the functors \`tree/3\` and \`nil/0\`, and (relational) operations to find elements. \`search(+Tree, +Elem)\` relates a tree with **any of its elements**.
`),
    program(
      `% search(+Tree, +Elem)
% relates a tree with any of its elements
search(tree(_, E, _), E).
search(tree(L, _, _), E) :- search(L, E).
search(tree(_, _, R), E) :- search(R, E).`,
      { fresh: true, title: 'bintree-search.pl' },
    ),
    query('search(tree(tree(nil, 10, nil), 20, tree(tree(nil, 30, nil), 40, nil)), E)', {
      expect: ['E = 20', 'E = 10', 'E = 40', 'E = 30'],
    }),
    md(`
The tree of the goal is:

\`\`\`
              20
            /    \\
          10      40
         /  \\    /  \\
       nil  nil 30   nil
               /  \\
             nil  nil
\`\`\`

The answers come in **pre-order**: the node, then the left subtree, then the right one.

### Binary trees: other operations

File \`bintree-ops.pl\`:
`),
    program(
      `% leaves(+Tree, -ListLeaves), returns the list of leaves
leaves(nil, []).                     % handling empty tree
leaves(tree(nil, E, nil), [E]) :- !. % handling a leaf
leaves(tree(L, _, R), O) :-          % general case
    leaves(L, OL),                   % OL are leaves on left
    leaves(R, OR),                   % OR are leaves on right
    append(OL, OR, O).               % O appends the two

% leftlist(+Tree, -List)
% returns the left-most branch as a list
leftlist(nil, []).
leftlist(tree(nil, E, _), [E]) :- !.
leftlist(tree(T, E, _), [E | L]) :- leftlist(T, L).`,
      { fresh: true, title: 'bintree-ops.pl' },
    ),
    query('leaves(tree(tree(nil, 10, nil), 20, tree(tree(nil, 30, nil), 40, nil)), L)', {
      expect: ['L = [10, 30]'],
    }),
    query('leftlist(tree(tree(nil, 10, nil), 20, tree(tree(nil, 30, nil), 40, nil)), L)', {
      expect: ['L = [20, 10]'],
    }),
    md(`
### N-ary trees with lists

File \`nary-lists.pl\`. Again a natural modelling: the functor \`tree/2\`, with the node in the first argument and the **list of children** in the second.
`),
    program(
      `% searchN(+Tree, ?Elem), search Elem in Tree
searchN(tree(E, _), E).
searchN(tree(_, L), E) :- member(T, L), searchN(T, E).`,
      { fresh: true, title: 'nary-lists.pl' },
    ),
    query('searchN(tree(20, [tree(10, []), tree(40, [tree(30, [])])]), E)', {
      expect: ['E = 20', 'E = 10', 'E = 40', 'E = 30'],
    }),
    md(`
### N-ary trees with variable arguments

File \`nary-univ.pl\`. A different modelling: the functors \`tree/1\`, \`tree/2\`, \`tree/3\`, ... with the node in the first argument and the others as children. The key is \`=..\`, which lets one predicate treat **any arity**.
`),
    program(
      `% searchV(+Tree, ?Elem), search Elem in Tree
searchV(T, E) :- T =.. [tree, E | _].
searchV(T, E) :-
    T =.. [tree, _ | L], member(T2, L), searchV(T2, E).`,
      { fresh: true, title: 'nary-univ.pl' },
    ),
    query('searchV(tree(20, tree(10), tree(40, tree(30))), E)', {
      expect: ['E = 20', 'E = 10', 'E = 40', 'E = 30'],
    }),
    md(`
### Bidirectional lists

The design sketch: **constant time** to move next/previous on the list. The idea: the list \`(1, 2, 3, 4, 5, 6)\` is modelled by the term \`bilist([1], [2,3,4,5,6])\`, that is **two lists**, one from the pointer to the left, one from the pointer to the right.

| operation | result |
| --- | --- |
| start | \`bilist([1], [2,3,4,5,6])\` |
| move right | \`bilist([2,1], [3,4,5,6])\` |
| move left | \`bilist([1], [2,3,4,5,6])\` |
| addleft(0) | \`bilist([0], [1,2,3,4,5,6])\` |
| addright(10) | \`bilist([0], [10,1,2,3,4,5,6])\` |

Here is one possible implementation of the four operations:
`),
    program(
      `% the pointer is at the head of the left list
move_right(bilist([X|L], [Y|R]), bilist([Y, X|L], R)).
move_left(bilist([X, Y|L], R), bilist([Y|L], [X|R])).
addleft(E, bilist([X|L], R), bilist([E|L], [X|R])).
addright(E, bilist(L, R), bilist(L, [E|R])).`,
      { fresh: true, title: 'bilist.pl (sketch implemented)' },
    ),
    query('move_right(bilist([1], [2, 3, 4, 5, 6]), B)', {
      expect: ['B = bilist([2, 1], [3, 4, 5, 6])'],
    }),
    query('move_left(bilist([2, 1], [3, 4, 5, 6]), B)', {
      expect: ['B = bilist([1], [2, 3, 4, 5, 6])'],
    }),
    query('addleft(0, bilist([1], [2, 3, 4, 5, 6]), B)', {
      expect: ['B = bilist([0], [1, 2, 3, 4, 5, 6])'],
    }),
    query('addleft(0, bilist([1], [2, 3, 4, 5, 6]), B), addright(10, B, B2)', {
      expect: ['B = bilist([0], [1, 2, 3, 4, 5, 6]), B2 = bilist([0], [10, 1, 2, 3, 4, 5, 6])'],
    }),
    md(`
### Dynamically expanding lists

**Lazy structures in Prolog:** non-ground compound terms can be seen as data structures **partially completed**. For example \`[1,2,3|_]\` is a list starting with 1, 2, 3, and which can be completed in several ways. As a concept, could it be used to model *lazy lists*?

An example application: an **expanding cache for factorials**. \`factorial(+N, -Out, ?Cache)\`: the cache is a *partial list* of known factorials "up to a point", e.g. \`[1,1,2,6,24|_]\`. Each call might expand the cache, which is both input and output. File \`factorial-cache.pl\`:
`),
    program(
      `% factorial(+N, -Out, ?Cache)
% cache is a partial list of factorials [1,1,2,6,24|_]
factorial(N, Out, Cache) :- factorial(N, Out, Cache, 0).
factorial(N, Res, [Res|_], N) :- !, nonvar(Res).
factorial(N, Out, [H, V | T], I) :-
    var(V), !, I2 is I + 1, V is H * I2,
    factorial(N, Out, [V | T], I2).
factorial(N, Out, [_, V | T], I) :-
    I2 is I + 1, factorial(N, Out, [V | T], I2).`,
      { fresh: true, title: 'factorial-cache.pl' },
    ),
    query('C = [1, 1, 2, 6|_], factorial(5, Res, C)', {
      expect: ['C = [1, 1, 2, 6, 24, 120|_], Res = 120'],
    }),
    md(`
The goal finds \`Res = 120\` and, in the same step, **extends the cache** from \`[1,1,2,6|_]\` to \`[1,1,2,6,24,120|_]\`: the open tail was filled in by unification.
`),
    exercise({
      title: 'Depth of a binary tree',
      prompt: `
Using the \`tree(Left, Elem, Right)\` / \`nil\` representation, write \`depth(Tree, D)\`: the depth of the tree, where \`nil\` has depth \`0\` and a node has depth \`1\` plus the larger depth of its subtrees.
`,
      starter: '% depth(Tree, D) :- ...\n',
      hint: 'Compute both subtree depths, then `D is 1 + max(DL, DR)`.',
      solution: `depth(nil, 0).
depth(tree(L, _, R), D) :- depth(L, DL), depth(R, DR), D is 1 + max(DL, DR).`,
      tests: [
        { q: 'depth(nil, D)', expect: ['D = 0'] },
        { q: 'depth(tree(nil, a, nil), D)', expect: ['D = 1'] },
        {
          q: 'depth(tree(tree(nil, 10, nil), 20, tree(tree(nil, 30, nil), 40, nil)), D)',
          expect: ['D = 3'],
        },
      ],
    }),
  ],
});
