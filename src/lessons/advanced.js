import { md, program, query, exercise, lesson } from './dsl.js';

export const dcg = lesson({
  id: 'dcg',
  part: 'Advanced',
  title: 'Grammars with DCGs',
  summary: 'Parse and generate language with Definite Clause Grammars.',
  blocks: [
    md(`
Prolog was born for natural-language processing, and it has built-in syntax for it: **Definite Clause Grammars**. A grammar rule uses \`-->\` instead of \`:-\`:

\`\`\`
greeting --> [hello], name.
\`\`\`

Read it as "a greeting is the word *hello* followed by a name". Terminals, actual words, go in **square brackets**; non-terminals are other rules.
`),
    program(
      `greeting --> [hello], name.
name --> [world].
name --> [prolog].`,
      { fresh: true, title: 'greeting.pl' },
    ),
    md('Run a grammar with \\`phrase(Rule, List)\\`: does the list match the rule?'),
    query('phrase(greeting, [hello, world])', { expect: ['true'] }),
    query('phrase(greeting, [hello, there])', { expect: ['false'] }),
    md(
      'Like everything in Prolog it runs backwards too, leave the list open and Prolog *generates* sentences:',
    ),
    query('phrase(greeting, Words)', {
      expect: ['Words = [hello, world]', 'Words = [hello, prolog]'],
    }),
    query('phrase(greeting, [hello, Who])', { expect: ['Who = world', 'Who = prolog'] }),
    md(`
#### What \`-->\` really is

A DCG rule is *syntactic sugar*. Each non-terminal gets two extra arguments, a list of words **before** and **after**, and each rule describes how it consumes words from the front of the list. \`listing\` shows the translation:
`),
    query('listing(greeting/2), listing(name/2)'),
    md(`
Because of the two hidden arguments you can even call the rule directly: \`greeting([hello, world], [])\` means "greeting consumes \`[hello, world]\`, leaving nothing".

#### A bigger grammar
`),
    program(
      `sentence    --> noun_phrase, verb_phrase.
noun_phrase --> determiner, noun.
verb_phrase --> verb, noun_phrase.

determiner --> [the] ; [a].
noun       --> [cat] ; [dog] ; [robot].
verb       --> [sees] ; [chases].`,
      { fresh: true, title: 'sentences.pl' },
    ),
    query('phrase(sentence, [the, cat, chases, a, robot])', { expect: ['true'] }),
    query('phrase(sentence, [cat, the, chases, a, robot])', { expect: ['false'] }),
    query('aggregate_all(count, phrase(sentence, _), N)', { expect: ['N = 72'] }),
    md(`
That grammar accepts exactly 72 sentences (2 determiners × 3 nouns × 2 verbs × 2 × 3).

#### Building a parse tree: extra arguments

Non-terminals can carry arguments, so a parser can return *structure*:
`),
    program(
      `s(s(NP, VP))     --> np(NP), vp(VP).
np(np(D, N))     --> det(D), n(N).
vp(vp(V, NP))    --> v(V), np(NP).

det(det(the)) --> [the].
det(det(a))   --> [a].
n(n(cat))     --> [cat].
n(n(dog))     --> [dog].
v(v(sees))    --> [sees].
v(v(chases))  --> [chases].`,
      { fresh: true, title: 'tree.pl' },
    ),
    query('phrase(s(Tree), [the, cat, sees, a, dog])', {
      expect: ['Tree = s(np(det(the), n(cat)), vp(v(sees), np(det(a), n(dog))))'],
    }),
    md(`
#### Curly braces: ordinary Prolog inside a rule

\`{ Goal }\` runs plain Prolog without consuming input. That's how you do arithmetic or type checks, here, reading numbers out of text. Text is a list of **character codes**; backquotes make such a list: \`\\\`123\\\`\`.
`),
    program(
      `digits([D|T]) --> digit(D), digits(T).
digits([D])   --> digit(D).
digit(D)      --> [D], { code_type(D, digit) }.

number(N) --> digits(Ds), { number_codes(N, Ds) }.`,
      { fresh: true, title: 'numbers.pl' },
    ),
    query('phrase(number(N), `1234`)', { expect: ['N = 1234'] }),
    query("atom_codes('2024', Codes), phrase(number(N), Codes)", {
      expect: ['Codes = [50, 48, 50, 52], N = 2024'],
    }),
    md(`
#### A calculator in 15 lines

Put it together: a grammar for \`+\`, \`-\`, \`*\`, and parentheses that also **evaluates** as it parses. Note the structure, \`*\` binds tighter than \`+\` because it lives lower in the grammar, and the use of loops (\`..._rest\`) rather than left recursion, which would never terminate.
`),
    program(
      `expr(V)  --> term(T), expr_rest(T, V).
expr_rest(Acc, V) --> "+", term(T), { Acc1 is Acc + T }, expr_rest(Acc1, V).
expr_rest(Acc, V) --> "-", term(T), { Acc1 is Acc - T }, expr_rest(Acc1, V).
expr_rest(V, V)   --> [].

term(V)  --> factor(F), term_rest(F, V).
term_rest(Acc, V) --> "*", factor(F), { Acc1 is Acc * F }, term_rest(Acc1, V).
term_rest(V, V)   --> [].

factor(V) --> number(V).
factor(V) --> "(", expr(V), ")".

calc(Text, Value) :- string_codes(Text, Codes), phrase(expr(Value), Codes).`,
      { title: 'calc.pl' },
    ),
    query('calc("2+3*4", V)', { expect: ['V = 14'] }),
    query('calc("(2+3)*4", V)', { expect: ['V = 20'] }),
    query('calc("10-4-3", V)', { expect: ['V = 3'] }),
    query('calc("2+", V)', { expect: ['false'] }),
    md(`
> [!tip] **Strings in DCG bodies**: in SWI-Prolog a double-quoted string inside a DCG rule body is read as a list of character codes, which is exactly what \`phrase/2\` consumes when you give it \`string_codes/2\` output.
`),
    exercise({
      title: 'The language aⁿbⁿ',
      prompt: `
Write a grammar rule \`anbn\` that accepts lists made of some number of \`a\`s followed by **the same number** of \`b\`s: \`[]\`, \`[a,b]\`, \`[a,a,b,b]\`, … but not \`[a,b,b]\` or \`[b,a]\`.
`,
      starter: '% anbn --> ...\n',
      hint: 'Two rules: the empty case `anbn --> [].` and a recursive case that wraps an inner `anbn` in an `a` and a `b`.',
      solution: `anbn --> [].
anbn --> [a], anbn, [b].`,
      tests: [
        { q: 'phrase(anbn, [])', expect: ['true'] },
        { q: 'phrase(anbn, [a, b])', expect: ['true'] },
        { q: 'phrase(anbn, [a, a, a, b, b, b])', expect: ['true'] },
        { q: 'phrase(anbn, [a, b, b])', expect: ['false'] },
        { q: 'phrase(anbn, [b, a])', expect: ['false'] },
      ],
    }),
  ],
});

export const difflists = lesson({
  id: 'difflists',
  part: 'Advanced',
  title: 'Difference lists',
  summary: 'Lists with an open end: constant-time append and queues.',
  blocks: [
    md(`
Appending to a normal list costs time proportional to its length: \`append/3\` has to walk to the end. A **difference list** keeps a pointer to the end, so appending takes *constant* time.

The idea: represent a list as a pair \`Front-Back\` where \`Back\` is an **unbound variable** at the end of \`Front\`. \`[1,2,3|T]-T\` represents the list \`[1,2,3]\`: "the elements are whatever you get from the front up to \`T\`".
`),
    program(
      `% append two difference lists: just connect the end of the first to the start of the second
dl_append(A-B, B-C, A-C).`,
      { fresh: true, title: 'dl.pl' },
    ),
    query('dl_append([1, 2|T1]-T1, [3, 4|T2]-T2, Result)', {
      expect: ['T1 = [3, 4|T2], Result = [1, 2, 3, 4|T2]-T2'],
    }),
    md(`
A single fact, no recursion, no traversal. The "open" tail \`T2\` is still unbound. To get a plain list, **close** it with \`[]\`:
`),
    query('dl_append([1, 2|T1]-T1, [3, 4|T2]-T2, Result-[])', {
      expect: ['T1 = [3, 4], T2 = [], Result = [1, 2, 3, 4]'],
    }),
    md(`
It works because Prolog variables can be bound *later*: the \`T1\` hole in the first list is filled by the front of the second.

#### A queue

Difference lists make an efficient queue, add at the back, remove from the front, both constant time:
`),
    program(
      `empty_queue(Q-Q).

enqueue(X, Front-[X|NewBack], Front-NewBack).

dequeue(X, [X|Front]-Back, Front-Back).`,
      { title: 'queue.pl' },
    ),
    query(
      'empty_queue(_Q0), enqueue(a, _Q0, _Q1), enqueue(b, _Q1, _Q2), enqueue(c, _Q2, _Q3), dequeue(X, _Q3, _Q4), dequeue(Y, _Q4, _)',
      { expect: ['X = a, Y = b'] },
    ),
    md(
      '(Variables starting with an underscore, like \\`_Q0\\`, are not printed, handy for intermediate values.)',
    ),
    md(`
#### The connection to DCGs

A DCG rule \`a --> b, c.\` is translated into \`a(S0, S) :- b(S0, S1), c(S1, S).\`, each non-terminal takes a list and returns what's *left over*, exactly like a difference list \`S0-S\`. That's why DCG parsing is efficient: concatenation costs nothing.

The \`reverse/3\` accumulator idiom you saw in the recursion lesson is a cousin of the same idea: build the answer by passing the "unfinished" part along.
`),
    exercise({
      title: 'Flatten with a difference list',
      prompt: `
Write \`flatten_dl(Tree, List)\` that collects the leaves of a nested list in order, using a difference-list helper so no \`append\` is needed. Provide the helper \`flat(Tree, List, Tail)\`:

- an empty list \`[]\` adds nothing;
- a list \`[H|T]\` flattens \`H\` then \`T\`;
- anything else is a leaf, added to the front.

For example \`flatten_dl([1, [2, [3, 4]], 5], L)\` gives \`L = [1, 2, 3, 4, 5]\`.
`,
      starter: `flatten_dl(Tree, List) :- flat(Tree, List, []).

% flat(Tree, List, Tail) :- ...
`,
      hint: 'Clauses: `flat([], L, L).`, `flat([H|T], L, Tail) :- flat(H, L, Mid), flat(T, Mid, Tail).`, and a leaf clause guarded with `\\+ is_list(X)`.',
      solution: `flatten_dl(Tree, List) :- flat(Tree, List, []).

flat([], L, L).
flat([H|T], L, Tail) :- flat(H, L, Mid), flat(T, Mid, Tail).
flat(X, [X|Tail], Tail) :- X \\= [], X \\= [_|_].`,
      tests: [
        { q: 'flatten_dl([1, [2, [3, 4]], 5], L)', expect: ['L = [1, 2, 3, 4, 5]'] },
        { q: 'flatten_dl([], L)', expect: ['L = []'] },
        { q: 'flatten_dl([[a], [[b]], c], L)', expect: ['L = [a, b, c]'] },
        { q: 'flatten_dl(x, L)', expect: ['L = [x]'] },
      ],
    }),
  ],
});

export const puzzles = lesson({
  id: 'puzzles',
  part: 'Advanced',
  title: 'Generate & test: puzzles',
  summary: 'Solving puzzles by describing them, and making the search smarter.',
  blocks: [
    md(`
Many puzzles have the shape: *there are some unknowns, each from a small set, and some rules they must obey.* In Prolog you write exactly that: **generate** candidate values, **test** the rules. Backtracking does the rest.

#### Map colouring

Colour six Australian regions with three colours so that neighbours differ:
`),
    program(
      `colour(red).
colour(green).
colour(blue).

% Regions: WA, NT, SA, Q, NSW, V
colouring([WA, NT, SA, Q, NSW, V]) :-
    maplist(colour, [WA, NT, SA, Q, NSW, V]),          % generate: every region gets some colour
    WA \\= NT,  WA \\= SA,  NT \\= SA,  NT \\= Q,          % test: neighbours differ
    SA \\= Q,   SA \\= NSW, SA \\= V,   Q \\= NSW,  NSW \\= V.`,
      { fresh: true, title: 'colouring.pl' },
    ),
    query('colouring(Regions)', { max: 3 }),
    query('aggregate_all(count, colouring(_), N)', { expect: ['N = 6'] }),
    md(`
Six different colourings, \`SA\` touches everything, so once it has a colour the others alternate between the remaining two. This version tries all 3⁶ = 729 colour combinations *then* tests each. Interleaving the tests with the generation prunes the search far earlier:
`),
    program(
      `colouring2([WA, NT, SA, Q, NSW, V]) :-
    colour(WA), colour(NT), WA \\= NT,
    colour(SA), WA \\= SA, NT \\= SA,
    colour(Q),  NT \\= Q,  SA \\= Q,
    colour(NSW), SA \\= NSW, Q \\= NSW,
    colour(V),  SA \\= V,  NSW \\= V.`,
      { title: 'colouring2' },
    ),
    query('time(aggregate_all(count, colouring(_), _))'),
    query('time(aggregate_all(count, colouring2(_), _))'),
    md(`
Compare the *inferences* reported by \`time/1\`. Same answers, a fraction of the work: **test as early as you can**.

#### A logic puzzle with permutations

*Three friends, Ann, Bo and Cy, own a cat, a dog and a fish (one each). Ann doesn't own the cat. Bo owns neither the dog nor the cat. Who owns what?*
`),
    program(
      `solve(Owners) :-
    Owners = [ann-A, bo-B, cy-C],
    permutation([cat, dog, fish], [A, B, C]),     % generate every assignment
    A \\== cat,                                    % test the clues
    B \\== dog, B \\== cat.`,
      { fresh: true, title: 'pets.pl' },
    ),
    query('solve(Owners)', { expect: ['Owners = [ann-dog, bo-fish, cy-cat]'] }),
    md(`
#### N-queens

Place N queens on an N×N board so none attack each other. Represent a solution as a list of row numbers, one per column. A queen attacks along rows and diagonals:
`),
    program(
      `% generate every permutation, then test
queens(N, Qs) :-
    numlist(1, N, Rows),
    permutation(Rows, Qs),
    safe(Qs).

safe([]).
safe([Q|Qs]) :- no_attack(Q, Qs, 1), safe(Qs).

no_attack(_, [], _).
no_attack(Q, [Q1|Qs], D) :-
    Q =\\= Q1 + D, Q =\\= Q1 - D,
    D1 is D + 1,
    no_attack(Q, Qs, D1).

% place queens one at a time, checking as we go
queens2(N, Qs) :- numlist(1, N, Rows), place(Rows, [], Qs).

place([], Qs, Qs).
place(Unplaced, Safe, Qs) :-
    select(Q, Unplaced, Rest),
    no_attack(Q, Safe, 1),
    place(Rest, [Q|Safe], Qs).`,
      { fresh: true, title: 'queens.pl' },
    ),
    query('queens(6, Qs)', { max: 2 }),
    query('aggregate_all(count, queens(6, _), N)', { expect: ['N = 4'] }),
    query('time(queens(8, Qs))'),
    query('time(queens2(8, Qs))'),
    md(`
The second version prunes as it goes, so it explores a tiny fraction of the 8! = 40,320 permutations. For *larger* puzzles even smart generate-and-test runs out of steam, the next lesson shows constraint solving, which prunes automatically.
`),
    exercise({
      title: 'Pythagorean triples',
      prompt: `
Write \`triple(A, B, C)\` for all integers \`1 ≤ A < B < C ≤ 20\` with \`A² + B² = C²\`. Generate with \`between/3\` and test.
`,
      starter: '% triple(A, B, C) :- ...\n',
      hint: 'Nest three `between` calls (let B start at A and C at B), then test `A < B`, `B < C` and the Pythagorean equation.',
      solution: `triple(A, B, C) :-
    between(1, 20, A),
    between(A, 20, B), A < B,
    between(B, 20, C), B < C,
    A*A + B*B =:= C*C.`,
      tests: [
        {
          q: 'findall(A-B-C, triple(A, B, C), L)',
          expect: ['L = [3-4-5, 5-12-13, 6-8-10, 8-15-17, 9-12-15, 12-16-20]'],
        },
        { q: 'triple(3, 4, 5)', expect: ['true'] },
        { q: 'triple(4, 3, 5)', expect: ['false'] },
      ],
    }),
  ],
});

export const clpfd = lesson({
  id: 'clpfd',
  part: 'Advanced',
  title: 'Constraints: CLP(FD)',
  summary: 'Arithmetic that runs backwards, and puzzles that solve themselves.',
  blocks: [
    md(`
Plain Prolog arithmetic has a limitation you met earlier: \`is/2\` only works left-to-right with everything known. **Constraint Logic Programming over Finite Domains**, \`library(clpfd)\`, gives you arithmetic *relations*.

Load the library and the operators with \`#\` become available:
`),
    program(':- use_module(library(clpfd)).', { fresh: true, title: 'setup' }),
    query('X #= 3 + 4', { expect: ['X = 7'] }),
    query('7 #= X + 4', { expect: ['X = 3'] }),
    query('7 #= 3 + Y', { expect: ['Y = 4'] }),
    md(`
The same equation, three directions. Constraints can also be **partial**: the solver narrows each variable's domain and reports what's left:
`),
    query('X #> 3, X #< 8', { expect: ['X in 4..7'] }),
    query('X in 1..10, X mod 3 #= 0', { expect: ['X in 3..9, X mod 3 #= 0'] }),
    md(`
To actually enumerate values, ask for **labelling**:
`),
    query('X #> 3, X #< 8, label([X])', { expect: ['X = 4', 'X = 5', 'X = 6', 'X = 7'] }),
    query('[X, Y] ins 1..3, X #< Y, label([X, Y])', {
      expect: ['X = 1, Y = 2', 'X = 1, Y = 3', 'X = 2, Y = 3'],
    }),
    md(`
The pattern for every CLP(FD) program is:

1. declare **domains** (\`ins\`, \`in\`);
2. post **constraints** (\`#=\`, \`#\\=\`, \`#<\`, \`all_different/1\`, …);
3. **label** the variables to search.

#### SEND + MORE = MONEY

The classic cryptarithm: each letter is a distinct digit, and the sum must work out.

\`\`\`
    S E N D
  + M O R E
  ---------
  M O N E Y
\`\`\`
`),
    program(
      `puzzle([S, E, N, D] + [M, O, R, E] = [M, O, N, E, Y]) :-
    Vars = [S, E, N, D, M, O, R, Y],
    Vars ins 0..9,
    all_different(Vars),
    S*1000 + E*100 + N*10 + D + M*1000 + O*100 + R*10 + E #=
    M*10000 + O*1000 + N*100 + E*10 + Y,
    M #\\= 0, S #\\= 0,
    label(Vars).`,
      { title: 'money.pl' },
    ),
    query('puzzle(P)', { expect: ['P = ([9, 5, 6, 7]+[1, 0, 8, 5]=[1, 0, 6, 5, 2])'] }),
    md(`
Declarative, short, and instant, generate-and-test would try 10⁸ combinations.

#### N-queens, constrained

Compare with the previous lesson. Declare the board, post "no two attack each other", and label with the first-fail strategy \`ff\`:
`),
    program(
      `n_queens(N, Qs) :-
    length(Qs, N),
    Qs ins 1..N,
    safe_queens(Qs).

safe_queens([]).
safe_queens([Q|Qs]) :- safe_queens(Qs, Q, 1), safe_queens(Qs).

safe_queens([], _, _).
safe_queens([Q|Qs], Q0, D0) :-
    Q0 #\\= Q,
    abs(Q0 - Q) #\\= D0,
    D1 #= D0 + 1,
    safe_queens(Qs, Q0, D1).`,
      { title: 'queens_clp.pl' },
    ),
    query('once((n_queens(8, Qs), labeling([ff], Qs)))', {
      expect: ['Qs = [1, 5, 8, 6, 3, 7, 2, 4]'],
    }),
    query('once((n_queens(20, Qs), labeling([ff], Qs)))'),
    md(`
Twenty queens, solved in a blink. The constraints prune impossible rows *before* any guessing.

> [!tip] \`labeling([ff], Vars)\` picks the variable with the smallest remaining domain first. Other options: \`min\`, \`max\`, \`bisect\`. For optimisation: \`labeling([max(Expr)], Vars)\`.
`),
    exercise({
      title: 'Two numbers',
      prompt: `
Two whole numbers between 0 and 10 add up to 10, and their difference is 4. Write \`solve(X, Y)\` with CLP(FD) (the library is already imported) to find them.
`,
      starter: `:- use_module(library(clpfd)).

% solve(X, Y) :- ...
`,
      hint: 'Declare `[X, Y] ins 0..10`, post `X + Y #= 10` and `X - Y #= 4`, then `label([X, Y])`.',
      solution: `:- use_module(library(clpfd)).

solve(X, Y) :-
    [X, Y] ins 0..10,
    X + Y #= 10,
    X - Y #= 4,
    label([X, Y]).`,
      tests: [
        { q: 'solve(X, Y)', expect: ['X = 7, Y = 3'] },
        { q: 'solve(7, 3)', expect: ['true'] },
        { q: 'solve(3, 7)', expect: ['false'] },
      ],
    }),
  ],
});

export const graphs = lesson({
  id: 'graphs',
  part: 'Advanced',
  title: 'Graphs & search',
  summary: 'Paths, cycles, shortest routes, and breadth-first search.',
  blocks: [
    md(`
Graphs fit Prolog naturally: facts are edges, and *finding a path* is just a query. Here is a small directed graph, with a cycle (\`e → a\`) to keep us honest:
`),
    program(
      `edge(a, b).
edge(a, c).
edge(b, d).
edge(c, d).
edge(d, e).
edge(e, a).`,
      { fresh: true, title: 'graph.pl' },
    ),
    md(`
#### Reachability: and why a naive version loops

The obvious definition of "is there a path from X to Y" is:
`),
    program(
      `naive(X, Y) :- edge(X, Y).
naive(X, Y) :- edge(X, Z), naive(Z, Y).

% a separate little loop, to see the problem: p and q point at each other
edge(p, q).
edge(q, p).`,
      { title: 'naive' },
    ),
    query('once(naive(a, d))', { expect: ['true'] }),
    query('naive(p, r)', { error: true }),
    md(`
\`naive(a, d)\` is found at once. But a goal with *no* answer, \`naive(p, r)\`, where \`r\` can't be reached, chases the cycle \`p → q → p → …\` for ever. In any graph with cycles, the fix is to remember **where we've been**.

#### Paths with a visited list
`),
    program(
      `% path(From, To, Path): Path is a cycle-free route
path(X, Y, Path) :-
    walk(X, Y, [X], Rev),
    reverse(Rev, Path).

walk(X, X, Visited, Visited).
walk(X, Y, Visited, Path) :-
    edge(X, Z),
    \\+ memberchk(Z, Visited),
    walk(Z, Y, [Z|Visited], Path).`,
      { title: 'path.pl' },
    ),
    query('path(a, e, P)', { expect: ['P = [a, b, d, e]', 'P = [a, c, d, e]'] }),
    query('findall(P, path(a, e, P), Paths), length(Paths, N)', {
      expect: ['Paths = [[a, b, d, e], [a, c, d, e]], N = 2'],
    }),
    query('setof(Y, P^path(a, Y, P), Reachable)', { expect: ['Reachable = [a, b, c, d, e]'] }),
    md(`
Every recursive step adds the new node to \`Visited\` and refuses to revisit one. The cycle can no longer trap us.

#### Shortest path

With all paths available as a list, "shortest" is just a minimum:
`),
    query('aggregate_all(min(L, P), (path(a, e, P), length(P, L)), min(Len, Best))', {
      expect: ['Len = 4, Best = [a, b, d, e]'],
    }),
    md(`
That enumerates every path, which explodes on big graphs. **Breadth-first search** explores in layers and stops at the first hit, so it finds a shortest path directly. Keep a queue of partial paths:
`),
    program(
      `bfs(Start, Goal, Path) :-
    bfs_([[Start]], Goal, [Start], Rev),
    reverse(Rev, Path).

bfs_([[Goal|Rest]|_], Goal, _, [Goal|Rest]).
bfs_([[Node|Rest]|Queue], Goal, Seen, Path) :-
    findall([Next, Node|Rest],
            ( edge(Node, Next), \\+ memberchk(Next, Seen) ),
            Extended),
    findall(Next, member([Next|_], Extended), Nexts),
    append(Seen, Nexts, Seen1),
    append(Queue, Extended, Queue1),
    bfs_(Queue1, Goal, Seen1, Path).`,
      { title: 'bfs.pl' },
    ),
    query('bfs(a, e, P)', { expect: ['P = [a, b, d, e]'] }),
    md(`
#### Weighted edges

Add a cost to each edge and accumulate it along the way:
`),
    program(
      `road(a, b, 4).  road(a, c, 1).
road(c, b, 2).  road(b, d, 5).
road(c, d, 8).

route(X, Y, Cost, Path) :- travel(X, Y, [X], 0, Cost, Rev), reverse(Rev, Path).

travel(X, X, V, C, C, V).
travel(X, Y, V, C0, C, P) :-
    road(X, Z, W), \\+ memberchk(Z, V),
    C1 is C0 + W,
    travel(Z, Y, [Z|V], C1, C, P).`,
      { fresh: true, title: 'roads.pl' },
    ),
    query('findall(C-P, route(a, d, C, P), Routes), keysort(Routes, Sorted)'),
    query('aggregate_all(min(C, P), route(a, d, C, P), min(Cost, Best))', {
      expect: ['Cost = 8, Best = [a, c, b, d]'],
    }),
    md(`
> [!note] For large graphs you'd use a priority queue (Dijkstra) or heuristics (A*). The shape is the same: a *frontier* of partial paths, expanded in some order.
`),
    exercise({
      title: 'Reachable, safely',
      prompt: `
The graph \`edge(a,b). edge(b,c). edge(c,a). edge(c,d).\` is loaded (it has a cycle). Write \`reachable(X, Y)\`: there is a path of **one or more** edges from \`X\` to \`Y\`. It must terminate for every query, keep a visited list.
`,
      setup: 'edge(a, b).\nedge(b, c).\nedge(c, a).\nedge(c, d).',
      starter: '% reachable(X, Y) :- ...\n',
      hint: 'Write `reachable(X, Y) :- reach(X, Y, [X]).` then `reach(X, Y, _) :- edge(X, Y).` and a recursive clause that refuses nodes already in the visited list.',
      solution: `reachable(X, Y) :- reach(X, Y, [X]).

reach(X, Y, _) :- edge(X, Y).
reach(X, Y, Visited) :-
    edge(X, Z),
    \\+ memberchk(Z, Visited),
    reach(Z, Y, [Z|Visited]).`,
      tests: [
        { q: 'once(reachable(a, d))', expect: ['true'] },
        { q: 'once(reachable(d, a))', expect: ['false'] },
        { q: 'once(reachable(a, a))', expect: ['true'] },
        { q: 'setof(Y, reachable(b, Y), L)', expect: ['L = [a, b, c, d]'] },
      ],
    }),
  ],
});

export const metainterp = lesson({
  id: 'metainterp',
  part: 'Advanced',
  title: 'Meta-interpreters',
  summary: 'Write Prolog in Prolog: inspect, trace and extend the language itself.',
  blocks: [
    md(`
Because programs are data (clauses are terms), you can write a Prolog interpreter *in* Prolog in four lines. This is not just a curiosity: meta-interpreters are how people build debuggers, explanation facilities, alternative search strategies, and new logic languages.

The built-in \`clause(Head, Body)\` retrieves the clauses of a predicate. Here is a database to interpret:
`),
    program(
      `parent(tom, bob).
parent(bob, ann).
parent(bob, pat).

ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).`,
      { fresh: true, title: 'family.pl' },
    ),
    query('clause(ancestor(A, B), Body)', {
      expect: ['Body = parent(A, B)', 'Body = (parent(A, _A), ancestor(_A, B))'],
    }),
    md(`
\`clause/2\` returns each rule's body, here a fact has body \`true\`, and a conjunction is the term \`(A, B)\`.

#### The vanilla meta-interpreter

\`solve(Goal)\` proves a goal by looking at its shape:
`),
    program(
      `solve(true) :- !.
solve((A, B)) :- !, solve(A), solve(B).
solve(G) :- predicate_property(G, built_in), !, call(G).     % arithmetic, comparison, ...
solve(G) :- clause(G, Body), solve(Body).                      % user-defined: resolve against a clause`,
      { title: 'solve.pl' },
    ),
    query('solve(ancestor(tom, Who))', { expect: ['Who = bob', 'Who = ann', 'Who = pat'] }),
    query('solve((parent(X, Y), Y \\= ann))', { expect: ['X = tom, Y = bob', 'X = bob, Y = pat'] }),
    md(`
It behaves exactly like the real thing. The point is that now **we control** how goals are proven. Let's exploit that.

> [!note] In its barest form (the *vanilla* metainterpreter, three clauses, shown below) a metainterpreter cannot deal with **built-in library predicates**, which are not defined by clauses, and control predicates must be "re-implemented" in it if needed. That might be considered a *feature*, since it lets you pick explicitly what to use. The clause with \`predicate_property(G, built_in)\` above is how this version lets built-ins through.

#### Adding a proof tree

A proof is: for a fact, the fact; for a rule, the head together with the proofs of its body. Add one argument to build it:
`),
    program(
      `prove(true, true) :- !.
prove((A, B), (PA, PB)) :- !, prove(A, PA), prove(B, PB).
prove(G, built_in(G)) :- predicate_property(G, built_in), !, call(G).
prove(G, G-Proof) :- clause(G, Body), prove(Body, Proof).`,
      { title: 'prove.pl' },
    ),
    query('prove(ancestor(tom, ann), Proof)', {
      expect: [
        'Proof = ancestor(tom, ann)-(parent(tom, bob)-true, ancestor(bob, ann)-(parent(bob, ann)-true))',
      ],
    }),
    md(`
That *is* the explanation of why \`ancestor(tom, ann)\` holds: tom is a parent of bob, and bob is an ancestor of ann because bob is a parent of ann. Expert systems use this to answer "why?".

#### Controlling the search: depth limits

Left recursion makes ordinary Prolog diverge. An interpreter can count depth and cut off:
`),
    program(
      `% solve_depth(Goal, MaxDepth): prove Goal using proofs at most MaxDepth calls deep
solve_depth(true, _) :- !.
solve_depth((A, B), D) :- !, solve_depth(A, D), solve_depth(B, D).
solve_depth(G, _) :- predicate_property(G, built_in), !, call(G).
solve_depth(G, D) :- D > 0, D1 is D - 1, clause(G, Body), solve_depth(Body, D1).

% a bad, left-recursive definition
reach(X, Y) :- reach(X, Z), parent(Z, Y).
reach(X, Y) :- parent(X, Y).`,
      { title: 'depth.pl' },
    ),
    query('solve_depth(reach(tom, Y), 5)', { max: 10 }),
    md(`
Where plain Prolog would loop forever, the bounded interpreter returns every answer within the depth bound (some more than once, because it explores the branches multiple times). With **iterative deepening**, retry with depth 1, 2, 3…, you get a *complete* search strategy.

> [!tip] Meta-interpretation is the doorway to more exotic systems: tabling, constraint solvers, probabilistic logic programs, and teaching tools are all implemented this way.
`),
    md(`
### Metainterpreters

An **interpreter** is a program that reads and executes another program. A **metainterpreter** is an interpreter written in the **same language** as the program to be interpreted: typically, you do so to be able to enact some change on the *interpretation strategy*. In Prolog this is actually somewhat easy, since programs are just terms (data), and it is easy to perform "resolution"-like mechanisms that substitute heads with bodies.

Applications: for Prolog programmers, **debugging, profiling and changing the resolution strategy**; in AI planning and similar, to perform ad-hoc "space exploration" on your DSL.

#### A preliminary step: simulating resolution

File \`resolution.pl\`. The program is represented as **\`rule/2\` facts**: the head, and the list of body goals. We use unification when calling \`rule/2\`, we branch because calling \`rule/2\` branches, and \`append\` performs the head/body substitution:
`),
    program(
      `rule(a, []).                          % means:              a.
rule(b, []).                          % means:              b.
rule(d, []).                          % means:              d.
rule(d, []).                          % means:              d.
rule(c, []).                          % means:              c.
rule(c, [c]).                         % means:              c :- c.

solve([]).
solve([Goal | Rest]) :-
    rule(Goal, Body),
    append(Body, Rest, NewGoals),
    solve(NewGoals).`,
      { fresh: true, title: 'resolution.pl' },
    ),
    query('solve([a])', { expect: ['true'] }),
    query('solve([d])', { expect: ['true', 'true'] }),
    query('solve([e])', { expect: ['false'] }),
    query('solve([c])', { max: 4 }),
    md(`
\`solve([a])\` succeeds once, \`solve([d])\` twice (two facts), \`solve([e])\` fails, and \`solve([c])\` has **infinitely many** answers (\`yes; yes; yes; ...\`), through the recursive rule \`c :- c\`.

#### It is actual "full resolution"!

File \`full-resolution.pl\`. The very same \`solve/1\`, with a \`search/2\` predicate added **as \`rule/2\` facts**:
`),
    program(
      `rule(a, []).
rule(b, []).
rule(d, []).
rule(d, []).
rule(c, []).
rule(c, [c]).

solve([]).
solve([Goal | Rest]) :-
    rule(Goal, Body),
    append(Body, Rest, NewGoals),
    solve(NewGoals).

rule(search(E, [E|_]), []).
rule(search(E, [_|T]), [search(E, T)]).`,
      { fresh: true, title: 'full-resolution.pl' },
    ),
    query('solve([search(X, [10, 20, 30])])', { expect: ['X = 10', 'X = 20', 'X = 30'] }),
    md(`
It works! A real search predicate, with *real* unification and backtracking, in about five lines. We just now need to **digest standard Prolog clauses**. (Loading this file prints a harmless warning: the clauses of \`rule/2\` are not together, since the \`search\` rules come after \`solve/1\`.)

#### The vanilla metainterpreter

File \`vanilla.pl\`. It reads the program's *own* clauses through \`clause/2\`: \`clause(G, B)\` gives, for a goal \`G\`, the body \`B\` of a matching clause (\`true\` for a fact):
`),
    program(
      `solveV(true) :- !.
solveV((A, B)) :- !, solveV(A), solveV(B).
solveV(G) :- clause(G, B), solveV(B).

search(E, [E|_]).
search(E, [_|T]) :- search(E, T).`,
      { fresh: true, title: 'vanilla.pl' },
    ),
    query('solveV(search(X, [10, 20, 30]))', { expect: ['X = 10', 'X = 20', 'X = 30'] }),
    md(`
Defects... or features? It **cannot deal with built-in library predicates** (not defined by clauses), and control predicates must be "re-implemented" in the metainterpreter if needed. This might be considered a feature, since it allows you to pick what to use explicitly.

#### Metainterpretation with built-ins and control

File \`builtins-control.pl\`. \`solveB\` handles **built-ins one by one** (each is called as such) and one **control predicate** at a time (\`once/1\`, \`not/1\`):
`),
    program(
      `solveB(true) :- !.
solveB((A, B)) :- !, solveB(A), solveB(B).
solveB(X is E) :- !, X is E.           % built-ins, one by one
solveB(X = Y) :- !, X = Y.
solveB(X \\= Y) :- !, X \\= Y.
solveB(X == Y) :- !, X == Y.            % possibly more
solveB(once(G)) :- !, once(solveB(G)).  % handling once/1
solveB(not(G)) :- !, not(solveB(G)).    % handling not/1
solveB(G) :- clause(G, B), solveB(B).

sum([], 0).
sum([H|T], N) :- sum(T, N2), N is N2 + H.`,
      { fresh: true, title: 'builtins-control.pl' },
    ),
    query('solveB(sum([10, 20, 30], S))', { expect: ['S = 60'] }),
    query('solveB(not(sum([10, 20, 30], 50)))', { expect: ['true'] }),
    query('solveB(not(sum([10, 20, 30], 60)))', { expect: ['false'] }),
    md(`
Notes: rules 3 to 6 deal with **built-ins**, each called as such; rules 7 and 8 deal with **one control predicate at a time**. **Challenge for you: how to implement the cut?**

#### Altering the order of solutions

File \`reverse-order.pl\`. \`solveI\` collects **all the matching clauses** with \`findall\`, *reverses* them, and then tries them: solutions come in reverse order.
`),
    program(
      `solveI(true) :- !.
solveI((A, B)) :- !, solveI(A), solveI(B).
solveI(G) :-
    findall(c(G, B), clause(G, B), L),
    reverse(L, L2),                % inverting solutions!!
    member(c(G, B), L2),
    solveI(B).

% search/2 is repeated from vanilla.pl
search(E, [E|_]).
search(E, [_|T]) :- search(E, T).`,
      { fresh: true, title: 'reverse-order.pl' },
    ),
    query('solveI(search(X, [10, 20, 30]))', { expect: ['X = 30', 'X = 20', 'X = 10'] }),
    md(`
This general approach can be used to **collect "branches", analyse them, and decide what to prioritise and/or discard**.

#### Tracking and constraining computations

File \`trace-bound.pl\`. \`solveT(+Goal, -Trace, -SizeBound)\` returns the solution **along with the whole computation trace**, and refuses to go deeper than the **size bound**: useful for debugging, or for constraining computations, e.g. pruning long computations.
`),
    program(
      `% solveT(+Goal, -Trace, -SizeBound)
solveT(G, T, B) :- solveT(G, T, B, _).
solveT(true, [], N, N) :- !.
solveT((A, B), L, IN, ON) :- !,
    solveT(A, LA, IN, ON1),
    findall((X, B), member(X, LA), LL),
    solveT(B, LB, ON1, ON),
    append(LL, LB, L).
solveT(G, [G|T], I, O) :-
    I > 0, !, clause(G, B), I2 is I-1, solveT(B, T, I2, O).

% search/2 is repeated from vanilla.pl
search(E, [E|_]).
search(E, [_|T]) :- search(E, T).`,
      { fresh: true, title: 'trace-bound.pl' },
    ),
    query('solveT(search(X, [10, 20, 30]), T, 2)', {
      expect: [
        'X = 10, T = [search(10, [10, 20, 30])]',
        'X = 20, T = [search(20, [10, 20, 30]), search(20, [20, 30])]',
      ],
    }),
    md(`
With a bound of 2, only the solutions found within **two** resolution steps are produced: \`10\` after one, \`20\` after two; \`30\` would need three, so it is cut off, and the query ends with *no*. Each answer carries its **trace**: the sequence of goals that were resolved.
`),
    exercise({
      title: 'Count the steps',
      prompt: `
Complete the interpreter \`solve(Goal, N)\` so that \`N\` is the number of **user-defined clauses** used in the proof (built-ins are free). The \`true\` and built-in cases are given, mind the order of clauses. The family program is loaded.

Examples: \`solve(parent(tom, bob), N)\` gives \`N = 1\`; \`solve(ancestor(tom, ann), N)\` gives \`N = 4\`.
`,
      setup: `parent(tom, bob).
parent(bob, ann).
parent(bob, pat).
ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).`,
      starter: `solve(true, 0) :- !.
% conjunction:   solve((A, B), N) :- ...
solve(G, 0) :- predicate_property(G, built_in), !, call(G).
% user-defined:  solve(G, N) :- ...
`,
      hint: 'Conjunction (it must come *before* the built-in clause, a comma is itself a built-in): solve both parts and add their counts. User clause: use `clause(G, Body)`, solve the body, and add 1.',
      solution: `solve(true, 0) :- !.
solve((A, B), N) :- !, solve(A, NA), solve(B, NB), N is NA + NB.
solve(G, 0) :- predicate_property(G, built_in), !, call(G).
solve(G, N) :- clause(G, Body), solve(Body, N0), N is N0 + 1.`,
      tests: [
        { q: 'solve(parent(tom, bob), N)', expect: ['N = 1'] },
        { q: 'solve(ancestor(tom, ann), N)', expect: ['N = 4'] },
        { q: 'solve(ancestor(tom, tom), N)', expect: ['false'] },
        { q: 'solve((parent(tom, B), parent(B, ann)), N)', expect: ['B = bob, N = 2'] },
      ],
    }),
  ],
});

export const symbolic = lesson({
  id: 'symbolic',
  part: 'Advanced',
  title: 'Symbolic computation',
  summary: 'Differentiate and simplify expressions, programs as algebra.',
  blocks: [
    md(`
Prolog treats expressions as plain data, so symbolic math falls out almost for free. An expression like \`x^3 + 2*x\` is just a term; \`x\` is an atom (not a variable!). We write rules mapping an expression to its derivative.
`),
    program(
      `% d(Expr, Var, Derivative)
d(N, _, 0)          :- number(N).
d(X, X, 1)          :- atom(X).
d(Y, X, 0)          :- atom(Y), Y \\== X.

d(U + V, X, DU + DV)   :- d(U, X, DU), d(V, X, DV).
d(U - V, X, DU - DV)   :- d(U, X, DU), d(V, X, DV).
d(U * V, X, U*DV + DU*V) :- d(U, X, DU), d(V, X, DV).
d(U ^ N, X, N * U^N1 * DU) :- integer(N), N1 is N - 1, d(U, X, DU).

d(sin(U), X, cos(U) * DU)      :- d(U, X, DU).
d(cos(U), X, -(sin(U)) * DU)   :- d(U, X, DU).
d(exp(U), X, exp(U) * DU)      :- d(U, X, DU).`,
      { fresh: true, title: 'diff.pl' },
    ),
    query('d(x^2, x, D)', { expect: ['D = 2*x^1*1'] }),
    query('d(3*x + 5, x, D)', { expect: ['D = 3*1+0*x+0'] }),
    query('d(sin(x*x), x, D)', { expect: ['D = cos(x*x)*(x*1+1*x)'] }),
    md(`
Correct, but ugly: \`2*x^1*1\`. A second pass **simplifies**, removing \`+ 0\`, \`* 1\`, \`* 0\`, and evaluating constants:
`),
    program(
      `simplify(E, E) :- atomic(E), !.
simplify(E, S) :-
    E =.. [Op, A, B], !,
    simplify(A, SA), simplify(B, SB),
    simp(Op, SA, SB, S).
simplify(E, S) :-
    E =.. [F, A],
    simplify(A, SA),
    S =.. [F, SA].

simp(+, 0, X, X) :- !.
simp(+, X, 0, X) :- !.
simp(-, X, 0, X) :- !.
simp(*, 0, _, 0) :- !.
simp(*, _, 0, 0) :- !.
simp(*, 1, X, X) :- !.
simp(*, X, 1, X) :- !.
simp(^, X, 1, X) :- !.
simp(Op, A, B, V) :- number(A), number(B), !, E =.. [Op, A, B], V is E.
simp(Op, A, B, E) :- E =.. [Op, A, B].

derivative(Expr, Var, Simple) :- d(Expr, Var, D), simplify(D, Simple).`,
      { title: 'simplify.pl' },
    ),
    query('derivative(x^2, x, D)', { expect: ['D = 2*x'] }),
    query('derivative(x^3 + 2*x + 1, x, D)', { expect: ['D = 3*x^2+2'] }),
    query('derivative(sin(x*x), x, D)', { expect: ['D = cos(x*x)*(x+x)'] }),
    query('derivative(exp(2*x), x, D)', { expect: ['D = exp(2*x)*2'] }),
    md(`
Run \`derivative(x^4, x, D)\` and then differentiate the *result* by feeding it back in, you get the second derivative. The rules are tiny because each one follows the **shape of the expression**.

#### Defining your own operators

Prolog's syntax is extensible. \`op(Priority, Type, Name)\` teaches the reader a new operator. Lower priority binds tighter; \`xfx\` means "infix, non-associative". This is only notation, the term underneath is the same:
`),
    program(
      `:- op(700, xfx, ===>).
:- op(200, xfy, and).

rewrite(X and true ===> X).
rewrite(X and false ===> false).`,
      { fresh: true, title: 'ops.pl' },
    ),
    query('rewrite(foo and true ===> Result)', { expect: ['Result = foo'] }),
    query('X = (a ===> b), X =.. Parts', { expect: ['X = (a===>b), Parts = [===>, a, b]'] }),
    query('X = (a and b and c), X = (First and Rest)', {
      expect: ['X = a and b and c, First = a, Rest = b and c'],
    }),
    md(`
That's how Prolog can express DSLs: rules for a type checker, a rewrite engine, a configuration language, written directly in the host syntax.
`),
    exercise({
      title: 'Derivative of a logarithm',
      prompt: `
The differentiation rules (without \`simplify\`) are loaded. Add a rule for the natural logarithm: the derivative of \`log(U)\` is \`DU / U\`, where \`DU\` is the derivative of \`U\`.
`,
      setup: `d(N, _, 0)          :- number(N).
d(X, X, 1)          :- atom(X).
d(Y, X, 0)          :- atom(Y), Y \\== X.
d(U + V, X, DU + DV)   :- d(U, X, DU), d(V, X, DV).
d(U * V, X, U*DV + DU*V) :- d(U, X, DU), d(V, X, DV).
d(U ^ N, X, N * U^N1 * DU) :- integer(N), N1 is N - 1, d(U, X, DU).`,
      starter: '% d(log(U), X, ...) :- ...\n',
      hint: 'Mirror the `sin` rule: `d(log(U), X, DU / U) :- d(U, X, DU).`',
      solution: 'd(log(U), X, DU / U) :- d(U, X, DU).',
      tests: [
        { q: 'd(log(x), x, D)', expect: ['D = 1/x'] },
        { q: 'd(log(x*x), x, D)', expect: ['D = (x*1+1*x)/(x*x)'] },
        { q: 'd(log(5), x, D)', expect: ['D = 0/5'] },
      ],
    }),
  ],
});

export const capstone = lesson({
  id: 'capstone',
  part: 'Advanced',
  title: 'Capstone: solve a Sudoku',
  summary: 'Put it together: a 9×9 Sudoku solver in a dozen lines.',
  blocks: [
    md(`
A Sudoku is a perfect constraint problem: 81 cells, each 1–9, and *every row, column and 3×3 block must contain all-different digits*. With CLP(FD) you say exactly that, no algorithm for solving it is written down at all.

We represent the board as a list of 9 rows, each a list of 9 cells. Unknown cells are unbound variables.
`),
    program(
      `:- use_module(library(clpfd)).

sudoku(Rows) :-
    length(Rows, 9),
    maplist(same_length(Rows), Rows),          % 9 rows of 9 cells
    append(Rows, Vs), Vs ins 1..9,             % every cell is a digit
    maplist(all_distinct, Rows),               % rows
    transpose(Rows, Columns),
    maplist(all_distinct, Columns),            % columns
    Rows = [As, Bs, Cs, Ds, Es, Fs, Gs, Hs, Is],
    blocks(As, Bs, Cs),                        % 3x3 blocks
    blocks(Ds, Es, Fs),
    blocks(Gs, Hs, Is).

blocks([], [], []).
blocks([N1,N2,N3|Ns1], [N4,N5,N6|Ns2], [N7,N8,N9|Ns3]) :-
    all_distinct([N1,N2,N3,N4,N5,N6,N7,N8,N9]),
    blocks(Ns1, Ns2, Ns3).`,
      { fresh: true, title: 'sudoku.pl' },
    ),
    md('That is the whole solver. Now a puzzle (underscores are the blanks):'),
    program(
      `problem(1, [[_,_,_, _,_,_, _,_,_],
            [_,_,_, _,_,3, _,8,5],
            [_,_,1, _,2,_, _,_,_],

            [_,_,_, 5,_,7, _,_,_],
            [_,_,4, _,_,_, 1,_,_],
            [_,9,_, _,_,_, _,_,_],

            [5,_,_, _,_,_, _,7,3],
            [_,_,2, _,1,_, _,_,_],
            [_,_,_, _,4,_, _,_,9]]).

print_board([]).
print_board([Row|Rows]) :-
    format("~w ~w ~w | ~w ~w ~w | ~w ~w ~w~n", Row),
    print_board(Rows).`,
      { title: 'puzzle.pl' },
    ),
    query('problem(1, Rows), sudoku(Rows), print_board(Rows)'),
    md(`
No \`labeling\` call at all, and the board comes back **solved**: for this puzzle, propagation alone fills in every cell, because \`all_distinct/1\` propagates strongly enough that there is nothing left to guess. (The same program is in the *Constraints in practice* lesson, which also shows a harder grid.)

Not every puzzle is so kind. Here is a second one, for which propagation does **not** finish: \`sudoku(Rows)\` alone leaves residual constraints, and you must add labelling (\`ff\`: first the most constrained cell):
`),
    program(
      `problem(2, [[1,_,_, _,_,7, _,9,_],
            [_,3,_, _,2,_, _,_,8],
            [_,_,9, 6,_,_, 5,_,_],

            [_,_,5, 3,_,_, 9,_,_],
            [_,1,_, _,8,_, _,_,2],
            [6,_,_, _,_,4, _,_,_],

            [3,_,_, _,_,_, _,1,_],
            [_,4,_, _,_,_, _,_,7],
            [_,_,7, _,_,_, 3,_,_]]).`,
      { title: 'puzzle 2' },
    ),
    query('\\+ (problem(2, Rows), sudoku(Rows), ground(Rows))', { expect: ['true'] }),
    query('problem(2, Rows), sudoku(Rows), maplist(labeling([ff]), Rows), print_board(Rows)'),
    md(`
Constraint propagation does the bulk of the work, and a little search finishes the job.

#### What you've learned

You can now read and write the core of Prolog:

- **facts, rules, queries** and how unification and backtracking evaluate them;
- **recursion** over lists and trees, with accumulators;
- **control**: cut, if-then-else, negation, exceptions;
- **all-solutions** predicates and the dynamic database;
- **higher-order** programming with \`maplist\`, \`foldl\` and lambdas;
- **DCGs** for parsing, **difference lists**, **meta-interpreters**;
- **constraint solving** for puzzles and planning.

Where next? Install [SWI-Prolog](https://www.swi-prolog.org/) and read its manual. Try a project: a type checker, a scheduler, a rule-based assistant. The [99 Prolog problems](https://www.ic.unicamp.br/~meidanis/courses/mc336/2009s2/prolog/problemas/) are a great exercise set, and Markus Triska's [Power of Prolog](https://www.metalevel.at/prolog) goes far deeper.

The **Playground** in the sidebar is yours to experiment in.
`),
    exercise({
      title: 'A 4×4 mini Sudoku',
      prompt: `
Write \`mini(Rows)\`: a solver for 4×4 boards where each row, column **and** each of the four 2×2 blocks contains 1–4 exactly once. Use CLP(FD) as above. Remember \`transpose/2\` from \`library(clpfd)\`.
`,
      starter: `:- use_module(library(clpfd)).

mini(Rows) :-
    Rows = [[A1,A2,A3,A4], [B1,B2,B3,B4], [C1,C2,C3,C4], [D1,D2,D3,D4]],
    % domains, rows, columns, blocks ...
    true.
`,
      hint: 'Collect all 16 variables with `append(Rows, Vs), Vs ins 1..4`; `maplist(all_distinct, Rows)`; the same for `transpose(Rows, Cols)`; then `all_distinct([A1,A2,B1,B2])` and the other three blocks.',
      solution: `:- use_module(library(clpfd)).

mini(Rows) :-
    Rows = [[A1,A2,A3,A4], [B1,B2,B3,B4], [C1,C2,C3,C4], [D1,D2,D3,D4]],
    append(Rows, Vs), Vs ins 1..4,
    maplist(all_distinct, Rows),
    transpose(Rows, Cols), maplist(all_distinct, Cols),
    all_distinct([A1,A2,B1,B2]), all_distinct([A3,A4,B3,B4]),
    all_distinct([C1,C2,D1,D2]), all_distinct([C3,C4,D3,D4]).`,
      tests: [
        {
          q: '_Rows = [[1,2,3,4],[3,4,1,2],[2,1,4,3],[A,B,C,D]], mini(_Rows), label([A,B,C,D])',
          expect: ['A = 4, B = 3, C = 2, D = 1'],
        },
        { q: 'mini([[1,1,_,_],_,_,_])', expect: ['false'] },
        {
          q: 'aggregate_all(count, (mini(Rows), append(Rows, Vs), label(Vs)), N)',
          expect: ['N = 288'],
        },
      ],
    }),
  ],
});
