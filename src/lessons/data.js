import { md, program, query, exercise, lesson } from './dsl.js';

export const arithmetic = lesson({
  id: 'arithmetic',
  part: 'Data & computation',
  title: 'Arithmetic',
  summary: 'Why `X = 1 + 2` is not 3, and how `is` fixes it.',
  blocks: [
    md(`
Prolog terms are just structures, \`1 + 2\` is the term \`+(1, 2)\`, not the number 3. Unification won't compute it:
`),
    query('X = 1 + 2', { expect: ['X = 1+2'] }),
    md(`
To **evaluate** arithmetic you use \`is/2\`. The right-hand side is evaluated; the result is unified with the left-hand side.
`),
    query('X is 1 + 2', { expect: ['X = 3'] }),
    query('X is 7 / 2', { expect: ['X = 3.5'] }),
    query('X is 8 / 2', { expect: ['X = 4'] }),
    query('X is 7 // 2, Y is 7 mod 2, Z is -7 // 2', { expect: ['X = 3, Y = 1, Z = -3'] }),
    query('X is 2 ** 10, Y is 2 ^ 100'),
    query('X is max(3, 9) + abs(-4) * 2', { expect: ['X = 17'] }),
    query('X is sqrt(16), Y is pi, Z is truncate(3.99), W is round(2.5)'),
    md(`
#### Big integers for free

SWI-Prolog integers are unbounded. Overflow isn't a thing:
`),
    query('X is 2 ** 200'),
    md(`
#### Comparison

Arithmetic comparison evaluates **both** sides:

| goal | meaning |
| --- | --- |
| \`A =:= B\` | equal as numbers |
| \`A =\\= B\` | not equal as numbers |
| \`A < B\`, \`A > B\` | less / greater |
| \`A =< B\`, \`A >= B\` | less-or-equal / greater-or-equal (note: **\`=<\`**, not \`<=\`) |
`),
    query('3 + 4 =:= 2 * 3 + 1', { expect: ['true'] }),
    query('1 =:= 1.0', { expect: ['true'] }),
    query('1 == 1.0', { expect: ['false'] }),
    query('5 =< 5', { expect: ['true'] }),
    md(`
#### The classic mistake

\`is\` needs its right side **fully known**. Using an unbound variable is an error, not a failed query, an *error*:
`),
    query('X is Y + 1', { error: true }),
    query('Y = 4, X is Y + 1', { expect: ['Y = 4, X = 5'] }),
    md(`
That's why Prolog arithmetic is not "reversible" like most relations: \`X is 3 + 4\` works, but \`7 is X + 4\` does not. (Constraint logic programming, a later lesson, fixes this.)

#### Counting and ranges

\`between(Low, High, X)\` generates integers; \`succ(A, B)\` relates consecutive integers; \`numlist/3\` builds a list.
`),
    query('between(1, 5, X)'),
    query('findall(S, (between(1, 5, X), S is X * X), Squares)', {
      expect: ['Squares = [1, 4, 9, 16, 25]'],
    }),
    query('succ(X, 5)', { expect: ['X = 4'] }),
    query('numlist(1, 5, L), sum_list(L, S)', { expect: ['L = [1, 2, 3, 4, 5], S = 15'] }),
    md(`
#### Arithmetic in your own predicates

Put \`is\` in the **body**, after the variables it needs have been bound:
`),
    program(
      `area(circle(R), A) :- A is pi * R * R.
area(rect(W, H), A)  :- A is W * H.

% Fahrenheit from Celsius
fahrenheit(C, F) :- F is C * 9 / 5 + 32.`,
      { fresh: true, title: 'geometry.pl' },
    ),
    query('area(rect(3, 4), A)', { expect: ['A = 12'] }),
    query('area(circle(1), A)'),
    query('fahrenheit(100, F)', { expect: ['F = 212'] }),
    exercise({
      title: 'Even numbers and the larger of two',
      prompt: `
Define two predicates:

1. \`is_even(N)\`: true when the integer \`N\` is even.
2. \`max_of(X, Y, Max)\`: \`Max\` is the larger of \`X\` and \`Y\` (don't use the built-in \`max\`). There must be **exactly one** answer, even when \`X\` and \`Y\` are equal.
`,
      starter: '% is_even(N) :- ...\n% max_of(X, Y, Max) :- ...\n',
      hint: 'For `is_even`, test `N mod 2 =:= 0`. For `max_of`, use two clauses with conditions that cannot both be true: `X >= Y` and `X < Y`.',
      solution: `is_even(N) :- N mod 2 =:= 0.

max_of(X, Y, X) :- X >= Y.
max_of(X, Y, Y) :- X < Y.`,
      tests: [
        { q: 'is_even(10)', expect: ['true'] },
        { q: 'is_even(7)', expect: ['false'] },
        { q: 'is_even(0)', expect: ['true'] },
        { q: 'max_of(3, 9, M)', expect: ['M = 9'] },
        { q: 'max_of(9, 3, M)', expect: ['M = 9'] },
        { q: 'max_of(5, 5, M)', expect: ['M = 5'] },
      ],
    }),
  ],
});

export const lists = lesson({
  id: 'lists',
  part: 'Data & computation',
  title: 'Lists',
  summary: 'The workhorse data structure: [Head|Tail] patterns and the standard library.',
  blocks: [
    md(`
A **list** is a sequence of terms in square brackets: \`[a, b, c]\`. The empty list is \`[]\`. Internally a list is either empty or a **head** and a **tail** (itself a list), and Prolog's pattern \`[H|T]\` splits it:
`),
    query('[H|T] = [a, b, c]', { expect: ['H = a, T = [b, c]'] }),
    query('[A, B|Rest] = [1, 2, 3, 4]', { expect: ['A = 1, B = 2, Rest = [3, 4]'] }),
    query('[X] = [a]', { expect: ['X = a'] }),
    query('[_|_] = []', { expect: ['false'] }),
    md(`
Lists can hold anything, including lists: \`[1, [a, b], foo(x)]\`.

#### The essentials

Most list work uses ready-made predicates from the standard library:
`),
    query('member(X, [a, b, c])', { expect: ['X = a', 'X = b', 'X = c'] }),
    query('member(b, [a, b, c])', { expect: ['true'] }),
    query('length([a, b, c], N)', { expect: ['N = 3'] }),
    query('nth0(1, [a, b, c], X), nth1(1, [a, b, c], Y)', { expect: ['X = b, Y = a'] }),
    query('last([1, 2, 3], X)', { expect: ['X = 3'] }),
    query('reverse([1, 2, 3], R)', { expect: ['R = [3, 2, 1]'] }),
    query('sum_list([1, 2, 3], S), max_list([4, 9, 2], M)', { expect: ['S = 6, M = 9'] }),
    query('msort([c, a, b, a], L), sort([c, a, b, a], S)', {
      expect: ['L = [a, a, b, c], S = [a, b, c]'],
    }),
    query('sort(0, @>=, [3, 1, 2, 3], L)', { expect: ['L = [3, 3, 2, 1]'] }),
    md(`
\`sort/2\` removes duplicates; \`msort/2\` keeps them.

#### \`append/3\`: a relation, not a function

\`append(A, B, C)\` means "C is A followed by B". Because it's a relation, it runs in every direction:
`),
    query('append([1, 2], [3, 4], L)', { expect: ['L = [1, 2, 3, 4]'] }),
    query('append(X, [3, 4], [1, 2, 3, 4])', { expect: ['X = [1, 2]'] }),
    query('append(Before, [c|After], [a, b, c, d, e])', {
      expect: ['Before = [a, b], After = [d, e]'],
    }),
    query('append(X, Y, [1, 2, 3])', { max: 10 }),
    md(`
That last query enumerates every way to split a list in two. You will see this "run it backwards" trick throughout Prolog.

#### Building and filtering

\`length/2\` can also *generate* lists; \`numlist/3\` makes ranges; \`exclude/3\`, \`include/3\` and \`maplist/3\` (covered in the higher-order lesson) transform them.
`),
    query('length(L, 3)', { expect: ['L = [_, _, _]'] }),
    query('numlist(1, 10, L), include([X]>>(X mod 2 =:= 0), L, Evens)'),
    query('delete([a, b, a, c], a, L), subtract([1, 2, 3, 4], [2, 4], S)', {
      expect: ['L = [b, c], S = [1, 3]'],
    }),
    query('list_to_set([a, b, a, c, b], S)', { expect: ['S = [a, b, c]'] }),
    query('sumlist([1, 2], S), nextto(X, Y, [1, 2, 3])', { max: 3 }),
    md(`
> [!note] Strictly, \`member/2\` and friends are ordinary Prolog predicates, you could write them yourself with the pattern \`[H|T]\`. That's exactly what the next lesson does.
`),
    exercise({
      title: 'Swap the first two',
      prompt: `
Write \`swap_first_two(List, Swapped)\` so that the first two elements of the list trade places and the rest is unchanged. Lists with fewer than two elements have no solution.
`,
      starter: '% swap_first_two(List, Swapped) :- ...\n',
      hint: 'Use a pattern with two head elements and a tail: `[A, B | Rest]`. One clause is enough.',
      solution: 'swap_first_two([A, B | T], [B, A | T]).',
      tests: [
        { q: 'swap_first_two([1, 2, 3, 4], S)', expect: ['S = [2, 1, 3, 4]'] },
        { q: 'swap_first_two([a, b], S)', expect: ['S = [b, a]'] },
        { q: 'swap_first_two([a], S)', expect: ['false'] },
        { q: 'swap_first_two([], S)', expect: ['false'] },
      ],
    }),
  ],
});

export const recursion = lesson({
  id: 'recursion',
  part: 'Data & computation',
  title: 'Recursion',
  summary: 'Base case, recursive case, and accumulators for speed.',
  blocks: [
    md(`
Prolog has no loops. Repetition is **recursion**: a predicate defined in terms of itself, on a smaller problem. Every recursive definition needs two kinds of clause:

- a **base case** that stops the recursion;
- a **recursive case** that does a little work and calls itself on something smaller.

Here is \`length\`, written from scratch:
`),
    program(
      `% my_length(List, N): N is the number of elements of List
my_length([], 0).                         % base case: the empty list has length 0
my_length([_|T], N) :-                    % recursive case:
    my_length(T, M),                      %   the tail has length M
    N is M + 1.                           %   so the whole list has M + 1`,
      { fresh: true, title: 'length.pl' },
    ),
    query('my_length([a, b, c, d], N)', { expect: ['N = 4'] }),
    md(`
The same pattern computes sums, maxima, copies, filters…
`),
    program(
      `my_sum([], 0).
my_sum([H|T], S) :- my_sum(T, S0), S is S0 + H.

fact(0, 1).
fact(N, F) :- N > 0, N1 is N - 1, fact(N1, F1), F is N * F1.

countdown(0) :- write(liftoff), nl.
countdown(N) :- N > 0, write(N), nl, N1 is N - 1, countdown(N1).`,
      { title: 'more recursion' },
    ),
    query('my_sum([1, 2, 3, 4], S)', { expect: ['S = 10'] }),
    query('fact(10, F)', { expect: ['F = 3628800'] }),
    query('fact(30, F)', { expect: ['F = 265252859812191058636308480000000'] }),
    query('countdown(3)'),
    md(`
> [!warn] Notice the guard \`N > 0\` in \`fact\` and \`countdown\`. Without it, asking for more solutions would let the second clause match \`N = 0\` too and recurse into negative numbers forever.

#### Accumulators: carrying the answer along

\`my_sum\` has to remember a pending addition at each level. An **accumulator** passes the running total *down* instead, so that the recursive call is the last thing that happens. That's a **tail call**, and Prolog optimises it into a loop that uses constant stack space.
`),
    program(
      `% sum_acc(List, Acc, Sum)
sum_acc([], Acc, Acc).
sum_acc([H|T], Acc, Sum) :- Acc1 is Acc + H, sum_acc(T, Acc1, Sum).
my_sum2(List, Sum) :- sum_acc(List, 0, Sum).

% counting to a million without growing the stack
count(N, N) :- !.
count(I, N) :- I1 is I + 1, count(I1, N).`,
      { title: 'accumulators' },
    ),
    query('my_sum2([1, 2, 3, 4], S)', { expect: ['S = 10'] }),
    query('count(0, 1000000)'),
    md(`
#### Why accumulators matter: reversing a list

The obvious \`reverse\` appends one element at a time, which re-copies the list at every step, quadratic time. With an accumulator you build the answer in one pass:
`),
    program(
      `slow_reverse([], []).
slow_reverse([H|T], R) :- slow_reverse(T, RT), append(RT, [H], R).

fast_reverse(L, R) :- rev(L, [], R).
rev([], Acc, Acc).
rev([H|T], Acc, R) :- rev(T, [H|Acc], R).`,
      { title: 'reverse.pl' },
    ),
    query('fast_reverse([1, 2, 3, 4], R)', { expect: ['R = [4, 3, 2, 1]'] }),
    query('numlist(1, 3000, _L), slow_reverse(_L, [First|_])', { expect: ['First = 3000'] }),
    query('numlist(1, 3000, _L), fast_reverse(_L, [First|_])', { expect: ['First = 3000'] }),
    md(`
Compare the timings shown at the bottom right of each result.

#### Two recursive calls: Fibonacci

Some definitions call themselves more than once. The naive Fibonacci recomputes the same values over and over:
`),
    program(
      `fib(0, 0).
fib(1, 1).
fib(N, F) :-
    N > 1,
    A is N - 1, B is N - 2,
    fib(A, FA), fib(B, FB),
    F is FA + FB.`,
      { title: 'fib.pl' },
    ),
    query('fib(10, F)', { expect: ['F = 55'] }),
    query('fib(24, F)', { expect: ['F = 46368'] }),
    md(`
Try \`fib(27, F)\` and watch the time climb. The cure is **memoisation**, remembering answers, which you'll meet in the database lesson.
`),
    exercise({
      title: 'Sum to N',
      prompt: `
Write \`sum_to(N, S)\`: \`S\` is \`1 + 2 + … + N\`. Make \`sum_to(0, S)\` give \`0\`, and make sure each query has **exactly one** answer.
`,
      starter: '% sum_to(N, S) :- ...\n',
      hint: 'Base case N = 0. Otherwise S is N plus the sum to N-1. Guard the recursive clause with N > 0.',
      solution: `sum_to(0, 0).
sum_to(N, S) :- N > 0, N1 is N - 1, sum_to(N1, S1), S is S1 + N.`,
      tests: [
        { q: 'sum_to(0, S)', expect: ['S = 0'] },
        { q: 'sum_to(1, S)', expect: ['S = 1'] },
        { q: 'sum_to(10, S)', expect: ['S = 55'] },
        { q: 'sum_to(100, S)', expect: ['S = 5050'] },
      ],
    }),
    exercise({
      title: 'Count occurrences',
      prompt: `
Write \`count(X, List, N)\`: \`N\` is how many times \`X\` appears in \`List\`. For example \`count(a, [a, b, a, c, a], N)\` gives \`N = 3\`.
`,
      starter: '% count(X, List, N) :- ...\n',
      hint: 'Three clauses: empty list; head equals X (count 1 more); head differs from X (`H \\= X`).',
      solution: `count(_, [], 0).
count(X, [X|T], N) :- count(X, T, M), N is M + 1.
count(X, [H|T], N) :- H \\= X, count(X, T, N).`,
      tests: [
        { q: 'count(a, [a, b, a, c, a], N)', expect: ['N = 3'] },
        { q: 'count(z, [a, b], N)', expect: ['N = 0'] },
        { q: 'count(a, [], N)', expect: ['N = 0'] },
        { q: 'count(1, [1, 2, 1], N)', expect: ['N = 2'] },
      ],
    }),
  ],
});

export const structures = lesson({
  id: 'structures',
  part: 'Data & computation',
  title: 'Structures & trees',
  summary: 'Compound terms as records, and a binary search tree from scratch.',
  blocks: [
    md(`
Compound terms are Prolog's records. Pick a functor and put your fields in the arguments:

\`\`\`
person(name(ada, lovelace), born(1815), field(mathematics))
\`\`\`

There are no declarations, you just write the term. Unification pulls out the pieces you ask for:
`),
    program(
      `person(name(ada, lovelace), born(1815)).
person(name(alan, turing), born(1912)).
person(name(grace, hopper), born(1906)).`,
      { fresh: true, title: 'people.pl' },
    ),
    query('person(name(First, turing), born(Year))', { expect: ['First = alan, Year = 1912'] }),
    query('person(name(Given, _), born(Y)), Y < 1910'),
    md(`
#### Taking terms apart

Four built-in predicates inspect and build terms generically:
`),
    query('functor(point(3, 4), Name, Arity)', { expect: ['Name = point, Arity = 2'] }),
    query('arg(2, point(3, 4), X)', { expect: ['X = 4'] }),
    query('point(3, 4) =.. List', { expect: ['List = [point, 3, 4]'] }),
    query('T =.. [rect, 2, 5]', { expect: ['T = rect(2, 5)'] }),
    query('functor(T, pair, 2)', { expect: ['T = pair(_, _)'] }),
    query('copy_term(f(X, Y, X), Copy)', { expect: ['Copy = f(_A, _, _A)'] }),
    md(`
\`=..\` ("univ") converts between a term and a list \`[Functor | Arguments]\`. It lets a program *construct* goals and data at run time.

#### A binary search tree

Define a tree as either \`nil\` (empty) or \`t(Left, Value, Right)\`. Every value in the left subtree is smaller than the node, every value in the right is larger. Inserting walks down the tree:
`),
    program(
      `% insert(Tree, X, NewTree)
insert(nil, X, t(nil, X, nil)).
insert(t(L, V, R), X, t(L1, V, R)) :- X < V, insert(L, X, L1).
insert(t(L, V, R), X, t(L, V, R1)) :- X > V, insert(R, X, R1).
insert(t(L, V, R), V, t(L, V, R)).                     % already present

% in_order(Tree, Sorted)
in_order(nil, []).
in_order(t(L, V, R), Xs) :-
    in_order(L, Ls), in_order(R, Rs),
    append(Ls, [V|Rs], Xs).

% build a tree from a list
list_to_tree(List, Tree) :- foldl([X, T0, T]>>insert(T0, X, T), List, nil, Tree).`,
      { title: 'bst.pl' },
    ),
    query('insert(nil, 5, T1), insert(T1, 3, T2), insert(T2, 8, T3)', {
      expect: [
        'T1 = t(nil, 5, nil), T2 = t(t(nil, 3, nil), 5, nil), T3 = t(t(nil, 3, nil), 5, t(nil, 8, nil))',
      ],
    }),
    query('list_to_tree([5, 3, 8, 1, 4, 7, 9], T)'),
    query('list_to_tree([5, 3, 8, 1, 4, 7, 9, 3], T), in_order(T, Sorted)', {
      expect: [
        'T = t(t(t(nil, 1, nil), 3, t(nil, 4, nil)), 5, t(t(nil, 7, nil), 8, t(nil, 9, nil))), Sorted = [1, 3, 4, 5, 7, 8, 9]',
      ],
    }),
    md(`
Because \`in_order\` is a relation, you can also run it *backwards* and ask for a tree with a given traversal:
`),
    query('in_order(t(nil, 1, t(nil, 2, nil)), L)', { expect: ['L = [1, 2]'] }),
    md(`
> [!tip] Trees, expression terms, parse trees, JSON-like documents, all are just nested compound terms. The recursion in your predicates follows the shape of the data: one clause per constructor.
`),
    exercise({
      title: 'Size of a tree',
      prompt: `
Using the \`nil\` / \`t(Left, Value, Right)\` representation, write \`tree_size(Tree, N)\`: the number of values stored in the tree.
`,
      starter: '% tree_size(Tree, N) :- ...\n',
      hint: 'The empty tree has size 0. A node has size 1 plus the sizes of both subtrees.',
      solution: `tree_size(nil, 0).
tree_size(t(L, _, R), N) :-
    tree_size(L, NL), tree_size(R, NR),
    N is NL + NR + 1.`,
      tests: [
        { q: 'tree_size(nil, N)', expect: ['N = 0'] },
        { q: 'tree_size(t(nil, 5, nil), N)', expect: ['N = 1'] },
        { q: 'tree_size(t(t(nil, 1, nil), 2, t(nil, 3, t(nil, 4, nil))), N)', expect: ['N = 4'] },
      ],
    }),
  ],
});

export const text = lesson({
  id: 'text',
  part: 'Data & computation',
  title: 'Text & output',
  summary: 'Atoms, strings, character lists, and printing with format/2.',
  blocks: [
    md(`
Prolog has three common ways to hold text:

| form | example | typical use |
| --- | --- | --- |
| **atom** | \`hello\`, \`'Hello World'\` | names, symbols, keys |
| **string** | \`"hello"\` | text you process or print |
| **code/char list** | \`[0'h, 0'i]\`, \`[h, i]\` | analysing text character by character |

Built-ins convert between them freely.
`),
    query("atom_length('Hello World', N)", { expect: ['N = 11'] }),
    query('atom_chars(hello, Chars)', { expect: ['Chars = [h, e, l, l, o]'] }),
    query('atom_codes(hi, Codes)', { expect: ['Codes = [104, 105]'] }),
    query('atom_chars(Atom, [p, r, o, l, o, g])', { expect: ['Atom = prolog'] }),
    query('upcase_atom(hello, Up)', { expect: ["Up = 'HELLO'"] }),
    query("atom_number('42', N), atom_number(A, 3.14)", { expect: ["N = 42, A = '3.14'"] }),
    md(`
#### Gluing and splitting

\`atom_concat/3\` works in several directions; \`sub_atom/5\` finds substrings; \`atomic_list_concat/3\` joins and splits on a separator.
`),
    query('atom_concat(foo, bar, X)', { expect: ['X = foobar'] }),
    query('atom_concat(X, Y, abc)', { max: 6 }),
    query('sub_atom(hello_world, Before, _, 0, world)', { expect: ['Before = 6'] }),
    query("atomic_list_concat([a, b, c], '-', Joined)", { expect: ["Joined = 'a-b-c'"] }),
    query("atomic_list_concat(Parts, ',', 'x,y,z')", { expect: ['Parts = [x, y, z]'] }),
    md(`
#### Strings

Double quotes create a string. The \`string_*\` predicates mirror the \`atom_*\` ones, and \`split_string/4\` is the handy splitter:
`),
    query('string_concat("Hello, ", "world", S)', { expect: ['S = "Hello, world"'] }),
    query('string_length("prolog", N)', { expect: ['N = 6'] }),
    query('split_string("a,b,,c", ",", "", Parts)', { expect: ['Parts = ["a", "b", "", "c"]'] }),
    query('split_string("  padded  ", "", " ", [Trimmed])', { expect: ['Trimmed = "padded"'] }),
    query('string_chars(S, [h, i]), string_to_atom(S, A)', { expect: ['S = "hi", A = hi'] }),
    query('term_to_atom(foo(1, bar), A)', { expect: ["A = 'foo(1,bar)'"] }),
    query("term_to_atom(T, 'point(3, 4)'), arg(1, T, X)", { expect: ['T = point(3, 4), X = 3'] }),
    md(`
#### Printing

\`write/1\` prints a term, \`print/1\` and \`writeq/1\` quote atoms when needed, \`nl/0\` ends a line. \`format/2\` is the powerful one, its directives:

| directive | prints |
| --- | --- |
| \`~w\` | any term, as \`write\` would |
| \`~q\` | the term, quoted so it could be read back |
| \`~a\` | an atom |
| \`~d\` | an integer (\`~2d\` inserts a decimal point) |
| \`~f\`, \`~2f\` | a float with the given digits |
| \`~s\` | a string given as a list of codes |
| \`~t\` \`~20|\` | pad / align to a column |
| \`~n\` | newline |
`),
    query("write('Hello World'), nl, writeq('Hello World'), nl, print([a, 'B', \"c\"])"),
    query('format("~w is ~d years old~n", [alice, 30])'),
    query(
      'format("~a~t~12|~a~t~8+~a~n", [name, age, city]), format("~a~t~12|~d~t~8+~a~n", [ada, 36, london])',
    ),
    query('format("pi is about ~4f~n", [3.14159265])'),
    query("format(\"~q and ~w~n\", ['it\\'s', 'it\\'s'])"),
    query('format(atom(A), "~w-~w", [x, y])', { expect: ["A = 'x-y'"] }),
    md(`
> [!tip] \`format(atom(A), …)\`, \`format(string(S), …)\` and \`with_output_to/2\` capture output as a value instead of printing it.

#### Turning text into a program's data

Because characters are just atoms of length one, you can recurse over text exactly as over lists:
`),
    program(
      `count_vowels(Atom, N) :-
    atom_chars(Atom, Chars),
    include([C]>>member(C, [a, e, i, o, u]), Chars, Vowels),
    length(Vowels, N).`,
      { fresh: true, title: 'vowels.pl' },
    ),
    query('count_vowels(prolog, N)', { expect: ['N = 2'] }),
    query('count_vowels(programming, N)', { expect: ['N = 3'] }),
    exercise({
      title: 'Palindromes',
      prompt: `
Write \`palindrome(Atom)\`: true if the atom reads the same forwards and backwards (\`level\`, \`racecar\`). Single letters count. There must be exactly one answer.
`,
      starter: '% palindrome(Atom) :- ...\n',
      hint: 'Turn the atom into a list of characters with `atom_chars/2`, then compare it with its `reverse/2`.',
      solution: 'palindrome(Atom) :- atom_chars(Atom, Cs), reverse(Cs, Cs).',
      tests: [
        { q: 'palindrome(level)', expect: ['true'] },
        { q: 'palindrome(racecar)', expect: ['true'] },
        { q: 'palindrome(a)', expect: ['true'] },
        { q: 'palindrome(prolog)', expect: ['false'] },
      ],
    }),
  ],
});
