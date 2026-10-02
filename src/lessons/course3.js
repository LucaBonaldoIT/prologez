// Lessons on cons/nil lists and built-in syntax, built-in math, full relationality, performance and
// immutability, and searching the solution space.
import { md, program, query, exercise, lesson } from './dsl.js';

export const listscons = lesson({
  id: 'listscons',
  part: 'Data & computation',
  title: 'Lists from scratch',
  summary:
    'Lists as cons/nil terms, the built-in [H|T] syntax, and member, find, position, concat and count.',
  blocks: [
    md(`
### Lists in Prolog

Lists are defined via **two constructors**:

- **\`nil\`**, the empty list, containing no elements;
- **\`cons\`**, the constructor taking an element \`H\` and a list \`T\`, and generating the list \`cons(H, T)\`.

For instance \`cons(a, cons(b, cons(c, nil)))\` represents the list *a, b, c*. Lists are typical **recursive data structures**, used to represent sequences of any sort.

#### Prolog lists

In Prolog, lists are defined via two analogous constructors:

- **\`[]\`** represents the empty list, containing no elements (a constant);
- **\`.\`** stands for \`cons\`: it takes an element \`H\` and a list \`T\`, and generates the list \`.(H, T)\` (a functor of arity 2).

The **sequence notation** simplifies writing lists: \`.(H, T)\` can be written as \`[H|T]\`, and \`.(H, .(H', T'))\` as \`[H, H'|T']\`. There, the empty list can be omitted. For example \`[a, b, c]\` represents the list *a, b, c* in Prolog, where \`a\` is the **head** of the list and \`[b, c]\` is the **tail**:

\`mgu([a, b, c], [H|T]) = {H/a, T/[b, c]}\`
`),
    query('[a, b, c] = [H|T]', { expect: ['H = a, T = [b, c]'] }),
    query('[a, b, c] = [H, H2|T]', { expect: ['H = a, H2 = b, T = [c]'] }),
    md(`
> [!note] **A SWI-Prolog detail.** Since version 7, SWI-Prolog does not build lists with \`'.'/2\`: its list constructor is a different functor, \`'[|]'/2\`, and \`'.'\` is reserved for dicts. Everything about the \`[H|T]\` *syntax* stays the same, only the name of the hidden functor differs from other systems.
`),
    query("append('.'(a, '.'(b, [])), '.'(c, []), '.'(a, '.'(b, '.'(c, []))))", {
      expect: ['false'],
    }),
    query("append('[|]'(a, '[|]'(b, [])), '[|]'(c, []), L)", { expect: ['L = [a, b, c]'] }),
    md(`
### Built-in list syntax

Libraries have list functions that assume you actually use these functors, and the **ad-hoc syntax avoids the verbose right-associative construction**: write \`[H1, H2, ..., Hn|T]\` instead of \`'.'(H1, '.'(H2, ..., '.'(Hn, T)...))\`, and \`[H1, H2, ..., Hn]\` instead of \`[H1, H2, ..., Hn|[]]\`. The forms \`[H|T]\`, \`[]\`, \`[E1, E2]\`, \`[_|T]\` and \`[E1, _|_]\` are special cases. **This is standard syntax we should always use!**

Other list predicates exist in the Prolog library: \`member(Element, List)\` (similar to our find/element), \`reverse(List, ReversedList)\`, and many others. Since \`append/3\` is a relation, it also tells you about the *shape* of its result (file \`list-syntax.pl\`):
`),
    query('append([a, b], [c], L)', { expect: ['L = [a, b, c]'] }),
    query('append([a, b], [c], [H | T])', { expect: ['H = a, T = [b, c]'] }),
    query('append([a, b], [c], [_ | _])', { expect: ['true'] }),
    query('append([a, b], [c], [_, _, _])', { expect: ['true'] }),
    query('append([a, b], [c], [_, _, _, _])', { expect: ['false'] }),
    query('append([a, b], [c], [_, _, E])', { expect: ['E = c'] }),
    query('append([a, b], [c], [_, _ | T])', { expect: ['T = [c]'] }),
    query('append([a, b], [c], [_, _, _ | T])', { expect: ['T = []'] }),
    md(`
### Computing with lists: recursion

Being recursive data structures, lists are typically handled by **recursive rules**, which incidentally is also the **only way** to handle repeated operations over sequences in Prolog, where there is nothing like a cycle programming construct.

The recursion scheme: since Prolog's search strategy is depth-first, in particular with clauses used orderly, top-down, **termination is handled with a fact**, typically coming *before* the recursive rule, as already seen for \`nat/1\` and \`sum/3\`.

### Typical example: member

File \`lists-member.pl\`. \`member/2\` checks whether the first argument is a term that is a member of the list in the second argument:
`),
    program(
      `member(X, [X|_]).
member(X, [_|T]) :- member(X, T).`,
      { fresh: true, title: 'lists-member.pl' },
    ),
    query('member(b, [a, b, c])', { expect: ['true'] }),
    query('member(b, [a, b, b])', { expect: ['true', 'true'] }),
    query('member(X, [a, b, c])', { expect: ['X = a', 'X = b', 'X = c'] }),
    query('member(blue(X), [red(a), blue(b), red(c), blue(d)])', { expect: ['X = b', 'X = d'] }),
    query('member(z, X)', { max: 4 }),
    md(`
Remarks:

- the **search strategy** is left to right through the list;
- it finds out **all the members** of the list (\`member(X, [a, b, c])\`);
- **conditional membership**: given a certain computed substitution (\`blue(X)\` only selects the \`blue\` elements);
- **generation of lists**: \`member(z, X)\` enumerates every list that has \`z\` in it, with the position of \`z\` growing one by one.

### Lists with cons and nil

File \`element.pl\`. Now the same ideas with the **\`cons/nil\` construction**: functors \`cons/2\` (with head and tail as arguments) and \`nil/0\` for the empty list, e.g. \`cons(a, nil)\` and \`cons(a, cons(b, nil))\`. Note that they are trees. Functions and predicates are generally implemented by **matching**, through different clauses: recursive functions have their base cases as facts, followed by the recursive rules.
`),
    program(
      `% relates an element E with a list that contains it
element(E, cons(E, _)).
element(E, cons(_, T)) :- element(E, T).`,
      { fresh: true, title: 'element.pl' },
    ),
    md(`
How to read the specification in the **relational interpretation**: *E is found in a list with head E*; *E is found in a list with tail T provided E is found in T*.
`),
    query('element(b, cons(a, cons(b, cons(c, nil))))', { expect: ['true'] }),
    query('element(a, cons(a, cons(b, cons(c, nil))))', { expect: ['true'] }),
    query('element(40, cons(a, cons(b, cons(c, nil))))', { expect: ['false'] }),
    md(`
The resolution tree of \`element(b, cons(a, cons(b, cons(c, nil))))\`:

\`\`\`
element(b, cons(a, cons(b, cons(c, nil))))
└── element(b, cons(b, cons(c, nil)))
    ├── Yes
    └── element(b, cons(c, nil))
        └── element(b, nil)
            └── No
\`\`\`

The first branch gives the solution; the exploration then continues (backtracking) and ends in a failure at \`nil\`.

### Programming find, position, concat and count

File \`lists.pl\`:
`),
    program(
      `% relates a list with one of its elements
find(cons(E, _), E).
find(cons(_, T), E) :- find(T, E).

% relates a list with one of its elements
% and its Peano position
position(cons(E, _), zero, E).
position(cons(_, T), s(N), E) :- position(T, N, E).

% relates two lists with their concatenation
% (similar to append)
concat(nil, L, L).
concat(cons(H, T), L, cons(H, M)) :- concat(T, L, M).

% relates a list and an element with occurrences
count(nil, _, zero).
count(cons(E, L), E, s(N)) :- count(L, E, N).
count(cons(E, L), E2, N) :- E \\= E2, count(L, E2, N).`,
      { fresh: true, title: 'lists.pl' },
    ),
    query('find(cons(a, cons(b, cons(c, nil))), b)', { expect: ['true'] }),
    query('find(cons(a, cons(b, cons(c, nil))), d)', { expect: ['false'] }),
    query('position(cons(a, cons(b, cons(c, nil))), zero, a)', { expect: ['true'] }),
    query('position(cons(a, cons(b, cons(c, nil))), s(zero), b)', { expect: ['true'] }),
    query('position(cons(a, cons(b, cons(b, nil))), P, b)', {
      expect: ['P = s(zero)', 'P = s(s(zero))'],
    }),
    query('concat(cons(a, cons(b, cons(c, nil))), cons(d, nil), L)', {
      expect: ['L = cons(a, cons(b, cons(c, cons(d, nil))))'],
    }),
    query('count(cons(a, cons(a, cons(b, cons(a, nil)))), a, N)', {
      expect: ['N = s(s(s(zero)))'],
    }),
    md(`
**Expressiveness so far.** The language is now *conceptually complete*: we can implement a variety of algorithms to search, clone and modify algebraic-like data structures. The next features to add: more convenient ways to work with numbers (primitive values) and with lists, library functions to manipulate terms, and library functions to tweak resolution.

### The same predicates over [H|T] lists

File \`find-position.pl\`. With the standard syntax, \`find\`, \`position\` and \`join\` read much better. (\`join\` is similar to \`append\`.)
`),
    program(
      `% relates a list with one of its elements
find([E|_], E).
find([_|T], E) :- find(T, E).

% relates a list with one of its elements
% and its Peano position
position([E|_], zero, E).
position([_|T], s(N), E) :- position(T, N, E).

% relates two lists with their concatenation
% (similar to append)
join([], L, L).
join([H|T], L, [H|M]) :- join(T, L, M).`,
      { fresh: true, title: 'find-position.pl' },
    ),
    query('find([a, b, c], b)', { expect: ['true'] }),
    query('find([a, b, c], 40)', { expect: ['false'] }),
    query('position([a, b, c], zero, a)', { expect: ['true'] }),
    query('position([a, b, c], s(zero), b)', { expect: ['true'] }),
    query('position([a, b, b], P, b)', { expect: ['P = s(zero)', 'P = s(s(zero))'] }),
    query('join([a, b], [c], L)', { expect: ['L = [a, b, c]'] }),
    exercise({
      title: 'The last element',
      prompt: `
Write \`last_of(List, X)\`: \`X\` is the **last** element of a non-empty list written with \`[H|T]\`. For example \`last_of([a, b, c], X)\` gives \`X = c\`. There must be **exactly one** answer.
`,
      starter: '% last_of(List, X) :- ...\n',
      hint: 'Two clauses: a list with just one element `[X]`, and a longer list `[_|T]` whose last element is the last of `T`.',
      solution: `last_of([X], X).
last_of([_, H|T], X) :- last_of([H|T], X).`,
      tests: [
        { q: 'last_of([a, b, c], X)', expect: ['X = c'] },
        { q: 'last_of([a], X)', expect: ['X = a'] },
        { q: 'last_of([], X)', expect: ['false'] },
        { q: 'last_of([1, 2], 2)', expect: ['true'] },
      ],
    }),
  ],
});

export const builtins = lesson({
  id: 'builtins',
  part: 'Data & computation',
  title: 'Built-in operators and math',
  summary:
    'Operators as predicates, evaluation with is/2, comparison, and the resolution of sum/2.',
  blocks: [
    md(`
### Ad-hoc math in Prolog

A Prolog **operator** is a binary predicate that can be used in **infix notation**. For example \`=/2\` can be used to unify two terms, and \`\\=/2\` to check non-unification.

**Values and operators:**

- you can use \`10\`, \`-20.1\`, \`1.3e-4\` as ground terms;
- the operators \`=:=\`, \`=\\=\`, \`>=\`, \`=<\` (note: **not \`<=\`**!), \`>\`, \`<\` are modelled as 2-ary predicates working on numbers as expected. They are **not relational**: both arguments must be ground;
- you can build terms using \`+\`, \`-\`, \`*\`, \`/\` as 2-ary functors, also possibly in infix notation. Such terms are actually an **abstract syntax tree** of a math expression;
- the operator \`is/2\` can be used to **evaluate** its second argument to a number, unified with the first argument;
- watch out: **do not use \`is/2\` to unify terms**, it is not idiomatic.

Very often, predicates doing math are **not relational**.

#### Operators at work

File \`operators.pl\`:
`),
    query("'='(p(1, 2), p(X, Y))", { expect: ['X = 1, Y = 2'] }),
    query('p(1, 2) = p(X, Y)', { expect: ['X = 1, Y = 2'] }),
    query('p(1, 2) = p(_, 3)', { expect: ['false'] }),
    query("'>'(20, 10)", { expect: ['true'] }),
    query('20 > 10', { expect: ['true'] }),
    query('10 > 20', { expect: ['false'] }),
    query('10 =:= 20', { expect: ['false'] }),
    query('10 =\\= 20', { expect: ['true'] }),
    query('X = 10 + 20', { expect: ['X = 10+20'] }),
    query("is(X, '+'(10, 20))", { expect: ['X = 30'] }),
    query('X is 10 + 20', { expect: ['X = 30'] }),
    query('30 is 10 + 20', { expect: ['true'] }),
    query('10 is p(20)', { error: true }),
    query('10 is X + 5', { error: true }),
    md(`
- \`X = 10 + 20\` binds \`X\` to the term \`'+'(10, 20)\`: **\`+\` is just a functor**, nothing is computed;
- the last two goals raise exceptions (a type error and an instantiation error). They abort the computation with an *exception*. Here they are shown in red.

### Working with math: sum/2

File \`sum.pl\`. The sum of a list of numbers:
`),
    program(
      `% relates a list with the sum of its elements
sum([], 0).
sum([H|T], S) :- sum(T, N), S is H + N.`,
      { fresh: true, title: 'sum.pl' },
    ),
    query('sum([10, 20, 30], S)', { expect: ['S = 60'] }),
    query('sum([], S)', { expect: ['S = 0'] }),
    query('sum([10, 20, 30], 60)', { expect: ['true'] }),
    md(`
The resolution of \`sum([10, 20, 30], S)\`:

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

Notice that the additions only happen **after** the recursion has reached the empty list: \`is/2\` needs its right-hand side fully known.

### Wrap-up on terminology

File \`terminology.pl\`. Take the program for \`element/2\` and the goal below:
`),
    program(
      `element(E, cons(E, _)).
element(E, cons(_, T)) :- element(E, T).`,
      { fresh: true, title: 'terminology.pl' },
    ),
    query('element(b, cons(a, cons(b, cons(c, nil))))', { expect: ['true'] }),
    md(`
Use this to review all the vocabulary:

- **terms**: \`E\` is a *variable*; \`_\` is the *wildcard variable*; \`a\` is an *atom*; \`cons\` is a *functor name*; \`cons(E, _)\` is a *compound non-ground term*; \`cons(a, nil)\` is a *compound ground term*;
- **program**: lines 1 and 2 are *clauses*; line 1 is a *fact*, line 2 is a *rule*; the part before \`:-\` is the *head*, the part after is the *body*; \`element\` is a *predicate*;
- **resolution**: the part after \`?-\` is the *resolvent*, a list of *goals*; the tree's *root* is the initial resolvent, an *arc* is a *resolution step*; "yes" is a *solution*, "no" is a *failure*; traversing from a node to one at a higher level in the tree is *backtracking*.
`),
    exercise({
      title: 'Product of a list',
      prompt: `
Write \`product(List, P)\`: \`P\` is the product of the numbers of the list, written like \`sum/2\` above. The product of the empty list is \`1\`. For example \`product([2, 3, 4], P)\` gives \`P = 24\`.
`,
      starter: '% product(List, P) :- ...\n',
      hint: 'The base case is `product([], 1)`. The recursive case multiplies the head by the product of the tail, with `is/2` placed **after** the recursive call.',
      solution: `product([], 1).
product([H|T], P) :- product(T, P0), P is H * P0.`,
      tests: [
        { q: 'product([2, 3, 4], P)', expect: ['P = 24'] },
        { q: 'product([], P)', expect: ['P = 1'] },
        { q: 'product([5], P)', expect: ['P = 5'] },
        { q: 'product([2, 3, 4], 24)', expect: ['true'] },
      ],
    }),
  ],
});

export const relationality = lesson({
  id: 'relationality',
  part: 'Data & computation',
  title: 'Full relationality',
  summary: 'One predicate, many functions: variables anywhere, and the pitfalls of enumeration.',
  blocks: [
    md(`
### What full relationality is

Informally, a Prolog predicate is said to be **fully relational** if **all its arguments can be handled as either input or output**. More specifically, when called with a variable in an argument, resolution successfully attempts to iterate over all the inputs that would satisfy the predicate. Often this behaviour can also be obtained for **groups** of arguments, or for all arguments. Often, however, this property **cannot** be achieved, especially for complex algorithms.

When achieved, the property really lets you obtain *many functions with a single predicate*: \`find\` can be used to find in lists, to iterate lists, or to generate lists.

### Full relationality of find/2 at work

File \`relationality.pl\`. The programs below repeat \`find/2\`, \`position/3\` and \`join/3\` from the previous lessons, plus \`sum/3\` and \`mul/3\` on Peano numbers.
`),
    program(
      `% find, position and join, over [H|T] lists
find([E|_], E).
find([_|T], E) :- find(T, E).

position([E|_], zero, E).
position([_|T], s(N), E) :- position(T, N, E).

join([], L, L).
join([H|T], L, [H|M]) :- join(T, L, M).

% sum/3 and mul/3, repeated from the Peano program
sum(X, zero, X).
sum(X, s(Y), s(Z)) :- sum(X, Y, Z).

mul(_, zero, zero).
mul(X, s(Y), Z) :- mul(X, Y, W), sum(W, X, Z).`,
      { fresh: true, title: 'relationality.pl' },
    ),
    query('find([a, b, c], E)', { expect: ['E = a', 'E = b', 'E = c'] }),
    query('find(L, a)', { max: 4 }),
    query('position([a, b, c], N, E)', {
      expect: ['N = zero, E = a', 'N = s(zero), E = b', 'N = s(s(zero)), E = c'],
    }),
    query('join(L, M, [a, b, c])', {
      expect: [
        'L = [], M = [a, b, c]',
        'L = [a], M = [b, c]',
        'L = [a, b], M = [c]',
        'L = [a, b, c], M = []',
      ],
    }),
    query('sum(N1, N2, s(s(s(zero))))', { max: 10 }),
    query('mul(N1, N2, s(s(s(s(zero)))))', { max: 10, limited: true }),
    md(`
The answers are:

- \`find([a,b,c], E)\` iterates the list: \`E = a\`, \`b\`, \`c\`;
- \`find(L, a)\` **generates lists**: \`L = [a|_]\`, then \`[_, a|_]\`, then \`[_, _, a|_]\`, ... infinitely many;
- \`position([a,b,c], N, E)\` enumerates indexed elements;
- \`join(L, M, [a,b,c])\` enumerates **all ways to split** a list in two;
- \`sum(N1, N2, 3)\` gives the four ways to write 3 as a sum, and \`mul(N1, N2, 4)\` the products giving 4 (\`4·1\` and \`2·2\`), after which the search goes on without finding any further answer.

The resolution trees show \`find\` running on a list and generating one:

\`\`\`
find([a,b,c], E)                      find(L, a)
├── {E/a}                             ├── {L/[a|_]}
└── find([b,c], E)                    └── find(T', E) : {L/[_|T']}
    ├── {E/b}                             ├── {L/[_, a|_]}
    └── find([c], E)                      └── find(T'', E) : {L/[_, _|T'']}
        ├── {E/c}                             ├── {L/[_, _, a|_]}
        └── find([], E)  → No                 └── ...
\`\`\`

### I/O notation

When *documenting* a predicate for a programmer, one uses a notation that is **not Prolog syntax** to describe the input/output character of each argument:

| mark | meaning |
| --- | --- |
| \`-\` | output element |
| \`+\` | input element (of any sort) |
| \`@\` | input element that should be ground |
| \`?\` | input/output element |

It is not very clear how to handle multi-modalities. Examples from the library:

\`\`\`
member(?E, ?L).
permutation(+LI, -LO).
append(?L1, ?L2, ?L).
is(-O, @Expression).
\`\`\`
`),
    exercise({
      title: 'Prefix of a list',
      prompt: `
Write the fully relational \`list_prefix(P, L)\`: \`P\` is a prefix of the list \`L\` (possibly empty, possibly the whole list). It must work with \`L\` given and \`P\` unknown, and with both given.
`,
      starter: '% list_prefix(P, L) :- ...\n',
      hint: 'The empty list is a prefix of everything. Otherwise both lists start with the same element and the tails are in the same relation.',
      solution: `list_prefix([], _).
list_prefix([H|T], [H|L]) :- list_prefix(T, L).`,
      tests: [
        {
          q: 'list_prefix(P, [a, b])',
          expect: ['P = []', 'P = [a]', 'P = [a, b]'],
        },
        { q: 'list_prefix([a, b], [a, b, c])', expect: ['true'] },
        { q: 'list_prefix([b], [a, b])', expect: ['false'] },
      ],
    }),
  ],
});
