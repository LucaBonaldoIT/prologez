// Lesson on constraints in Prolog: five CLP(FD) programs.
import { md, program, query, exercise, lesson } from './dsl.js';

export const clplab = lesson({
  id: 'clplab',
  part: 'Advanced',
  title: 'Constraints in practice: is vs #=, queens, sudoku, knapsack',
  summary:
    'Arithmetic that runs in any direction, residual constraints, labeling strategies, and optimisation.',
  blocks: [
    md(`
This lesson collects five programs on **constraints in Prolog**, all using \`library(clpfd)\`. Every one of them starts with

\`\`\`prolog
:- use_module(library(clpfd)).
\`\`\`

and that line is the whole installation.

> [!tip] **One thing to try first: ask the goal *without* labeling.** For several of these programs, the goal on its own neither fails nor answers with a solution: it answers with the **constraints that are left**, and the domains propagation has already cut down.

### Arithmetic twice: is/2 and #=/2

File \`arithmetic.pl\`. The same relation, written the two ways: \`is\` **evaluates** (its right side must be known), \`#=\` **relates** (neither side needs to be known).
`),
    program(
      `:- use_module(library(clpfd)).

%% The same relation, written the two ways

double_is(X, Y) :- Y is X * 2.    % evaluates: X must be bound
double_fd(X, Y) :- Y #= X * 2.    % relates: neither must be bound`,
      { fresh: true, title: 'arithmetic.pl (double)' },
    ),
    query('double_is(3, Y)', { expect: ['Y = 6'] }),
    query('double_is(X, 6)', { error: true }),
    query('double_fd(3, Y)', { expect: ['Y = 6'] }),
    query('double_fd(X, 6)', { expect: ['X = 3'] }),
    query('double_fd(X, Y)', { expect: ['X*2#=Y'] }),
    md(`
- \`double_is(3, Y)\` works, and \`double_is(X, 6)\` is an **error**: \`X\` is not instantiated.
- \`double_fd(X, 6)\` finds \`X = 3\`: the same definition runs **backwards**.
- \`double_fd(X, Y)\` has *no solution yet*: the answer is a **residual constraint**, \`X*2 #= Y\`, the relation itself, waiting for more information.

#### A factorial that runs in any direction

The factorial the CLP(FD) way: **one definition, any direction**. The example is the one in the \`library(clpfd)\` manual and in *The Power of Prolog*.
`),
    program(
      `:- use_module(library(clpfd)).

n_factorial(0, 1).
n_factorial(N, F) :-
    N #> 0,
    N1 #= N - 1,
    F #= N * F1,
    n_factorial(N1, F1).`,
      { fresh: true, title: 'arithmetic.pl (factorial)' },
    ),
    query('n_factorial(5, F)', { expect: ['F = 120'] }),
    query('n_factorial(N, 120)', { expect: ['N = 5'] }),
    query('n_factorial(N, F)', {
      max: 6,
      expect: [
        'N = 0, F = 1',
        'N = 1, F = 1',
        'N = 2, F = 2',
        'N = 3, F = 6',
        'N = 4, F = 24',
        'N = 5, F = 120',
      ],
    }),
    md(`
- \`n_factorial(5, F)\` computes \`120\`;
- \`n_factorial(N, 120)\` finds \`N = 5\`, and asking for more solutions then answers \`false\`: **the constraint bounds \`N\`**, so the search terminates (\`F #= N * F1\` bounds \`N\` backwards from 120);
- \`n_factorial(N, F)\` enumerates, on backtracking, one pair after another: \`0-1\`, \`1-1\`, \`2-2\`, \`3-6\`, \`4-24\`, ...

### SEND + MORE = MONEY

File \`send-more-money.pl\`. The cryptarithmetic puzzle: eight letters, eight distinct digits, one equation over them. The model is the one in the \`library(clpfd)\` manual. Note that this program does **not** label: the solving is left to the caller.
`),
    program(
      `:- use_module(library(clpfd)).

puzzle([S,E,N,D] + [M,O,R,E] = [M,O,N,E,Y]) :-
    Vars = [S,E,N,D,M,O,R,Y],
    Vars ins 0..9,
    all_different(Vars),
    S*1000 + E*100 + N*10 + D +
    M*1000 + O*100 + R*10 + E #=
    M*10000 + O*1000 + N*100 + E*10 + Y,
    M #\\= 0, S #\\= 0.`,
      { fresh: true, title: 'send-more-money.pl' },
    ),
    query('puzzle(As + Bs = Cs)'),
    query('puzzle([S, _, _, _] + [M, O, _, _] = _), S == 9, M == 1, O == 0', {
      expect: ['S = 9, M = 1, O = 0'],
    }),
    query('puzzle(As + Bs = Cs), label(As)', {
      expect: ['As = [9, 5, 6, 7], Bs = [1, 0, 8, 5], Cs = [1, 0, 6, 5, 2]'],
    }),
    query('findall(As, (puzzle(As + _ = _), label(As)), Solutions)', {
      expect: ['Solutions = [[9, 5, 6, 7]]'],
    }),
    md(`
The first answer is not a solution but the **residual constraints**: propagation alone has already fixed \`S = 9\`, \`M = 1\` and \`O = 0\` (the second query checks exactly that), and cut the other five domains down to four values or fewer. Only with \`label(As)\` do we get \`9567 + 1085 = 10652\`, and it is the **only solution**: collecting all of them with \`findall\` gives a single one.

### N queens

File \`queens.pl\`. \`Qs\` is a list of \`N\` variables, \`Qs[i]\` being the row of the queen in column \`i\`. The model is the one in the \`library(clpfd)\` manual.
`),
    program(
      `:- use_module(library(clpfd)).

n_queens(N, Qs) :-
    length(Qs, N),
    Qs ins 1..N,
    safe_queens(Qs).

safe_queens([]).
safe_queens([Q|Qs]) :-
    safe_queens(Qs, Q, 1),
    safe_queens(Qs).

safe_queens([], _, _).
safe_queens([Q|Qs], Q0, D0) :-
    Q0 #\\= Q,
    abs(Q0 - Q) #\\= D0,
    D1 #= D0 + 1,
    safe_queens(Qs, Q0, D1).`,
      { fresh: true, title: 'queens.pl' },
    ),
    query('once((n_queens(8, Qs), label(Qs)))', { expect: ['Qs = [1, 5, 8, 6, 3, 7, 2, 4]'] }),
    query('once((n_queens(8, Qs), labeling([ff], Qs)))', {
      expect: ['Qs = [1, 5, 8, 6, 3, 7, 2, 4]'],
    }),
    query('aggregate_all(count, (n_queens(6, Qs), label(Qs)), N)', { expect: ['N = 4'] }),
    md(`
There are **4 solutions** for the 6 × 6 board.

#### The labeling strategy is not a detail

Compare the two strategies on 20 queens, asking each for a first solution and looking at the *inferences* reported by \`time/1\`. The default \`label/1\` takes the variables in order and tries values in order; \`labeling([ff], Qs)\` (first-fail) always picks the variable with the **smallest remaining domain**:
`),
    query('time(once((n_queens(20, Qs), labeling([ff], Qs))))'),
    query('time(once((n_queens(20, Qs), label(Qs))))', { error: true }),
    md(`
With \`ff\` a few hundred thousand inferences at most are needed; with plain \`label\` the search is so much longer that this notebook stops it after its step budget (12 million inferences) without an answer. In measurements on SWI-Prolog 10.0.2, 24 queens took 5.2 s with \`label/1\` and 0.003 s with \`labeling([ff])\`, and \`ff\` still answers \`n = 100\` in 0.07 s.
`),
    query('once((n_queens(24, Qs), labeling([ff], Qs)))', {
      expect: [
        'Qs = [1, 3, 5, 23, 17, 4, 14, 7, 20, 13, 15, 18, 6, 22, 24, 21, 8, 2, 9, 12, 10, 16, 11, 19]',
      ],
    }),
    md(`
### Sudoku with all_distinct/1

File \`sudoku.pl\`. 27 \`all_distinct/1\` constraints (nine rows, nine columns, nine blocks) and nothing else. The model is the one in the \`library(clpfd)\` manual. Two puzzles are given: the first is solved by **propagation alone**, the second is not, and needs labeling.
`),
    program(
      `:- use_module(library(clpfd)).

sudoku(Rows) :-
    length(Rows, 9),
    maplist(same_length(Rows), Rows),
    append(Rows, Vs), Vs ins 1..9,
    maplist(all_distinct, Rows),
    transpose(Rows, Columns),
    maplist(all_distinct, Columns),
    Rows = [As,Bs,Cs,Ds,Es,Fs,Gs,Hs,Is],
    blocks(As, Bs, Cs),
    blocks(Ds, Es, Fs),
    blocks(Gs, Hs, Is).

blocks([], [], []).
blocks([N1,N2,N3|Ns1], [N4,N5,N6|Ns2], [N7,N8,N9|Ns3]) :-
    all_distinct([N1,N2,N3,N4,N5,N6,N7,N8,N9]),
    blocks(Ns1, Ns2, Ns3).

problem(1, [[_,_,_,_,_,_,_,_,_],
            [_,_,_,_,_,3,_,8,5],
            [_,_,1,_,2,_,_,_,_],
            [_,_,_,5,_,7,_,_,_],
            [_,_,4,_,_,_,1,_,_],
            [_,9,_,_,_,_,_,_,_],
            [5,_,_,_,_,_,_,7,3],
            [_,_,2,_,1,_,_,_,_],
            [_,_,_,_,4,_,_,_,9]]).

problem(2, [[1,_,_,_,_,7,_,9,_],
            [_,3,_,_,2,_,_,_,8],
            [_,_,9,6,_,_,5,_,_],
            [_,_,5,3,_,_,9,_,_],
            [_,1,_,_,8,_,_,_,2],
            [6,_,_,_,_,4,_,_,_],
            [3,_,_,_,_,_,_,1,_],
            [_,4,_,_,_,_,_,_,7],
            [_,_,7,_,_,_,3,_,_]]).`,
      { fresh: true, title: 'sudoku.pl' },
    ),
    query('problem(1, Rows), sudoku(Rows)', {
      expect: [
        'Rows = [[9, 8, 7, 6, 5, 4, 3, 2, 1], [2, 4, 6, 1, 7, 3, 9, 8, 5], [3, 5, 1, 9, 2, 8, 7, 4, 6], [1, 2, 8, 5, 3, 7, 6, 9, 4], [6, 3, 4, 8, 9, 2, 1, 5, 7], [7, 9, 5, 4, 6, 1, 8, 3, 2], [5, 1, 9, 2, 8, 6, 4, 7, 3], [4, 7, 2, 3, 1, 9, 5, 6, 8], [8, 6, 3, 7, 4, 5, 2, 1, 9]]',
      ],
    }),
    query('problem(1, Rows), sudoku(Rows), maplist(label, Rows), maplist(portray_clause, Rows)'),
    query('\\+ (problem(2, Rows), sudoku(Rows), ground(Rows))', { expect: ['true'] }),
    query(
      'problem(2, Rows), sudoku(Rows), maplist(labeling([ff]), Rows), maplist(portray_clause, Rows)',
    ),
    md(`
- \`problem(1, Rows), sudoku(Rows)\`: **no labeling at all, and the grid comes back solved**. \`all_distinct/1\` propagates strongly enough that there is no search to do. (The \`label\` and \`portray_clause\` version just prints it.)
- \`problem(2, Rows), sudoku(Rows)\`: this one propagation does **not** finish. The answer is residual constraints, and the grid is not ground, as the query negating \`ground(Rows)\` confirms. It needs \`labeling([ff])\` on every row.

#### A stronger propagator is not always faster

\`all_different/1\` is the weaker, cheaper cousin of \`all_distinct/1\`. Try both on the harder grid:
`),
    program(
      `% the same model, with the weaker propagator
sudoku_weak(Rows) :-
    length(Rows, 9),
    maplist(same_length(Rows), Rows),
    append(Rows, Vs), Vs ins 1..9,
    maplist(all_different, Rows),
    transpose(Rows, Columns),
    maplist(all_different, Columns),
    Rows = [As,Bs,Cs,Ds,Es,Fs,Gs,Hs,Is],
    blocks_weak(As, Bs, Cs),
    blocks_weak(Ds, Es, Fs),
    blocks_weak(Gs, Hs, Is).

blocks_weak([], [], []).
blocks_weak([N1,N2,N3|Ns1], [N4,N5,N6|Ns2], [N7,N8,N9|Ns3]) :-
    all_different([N1,N2,N3,N4,N5,N6,N7,N8,N9]),
    blocks_weak(Ns1, Ns2, Ns3).`,
      { title: 'all_different version' },
    ),
    query('time((problem(2, Rows), sudoku(Rows), maplist(labeling([ff]), Rows)))'),
    query('time((problem(2, Rows), sudoku_weak(Rows), maplist(labeling([ff]), Rows)))'),
    md(`
On the **hard** puzzle the cheaper \`all_different/1\` can be the faster one (0.065 s against 0.018 s in one measurement on SWI-Prolog 10.0.2), while on the **easy** one \`all_distinct/1\` costs nothing at all and \`all_different/1\` leaves a search to do that costs seconds. The honest summary: *a stronger propagator is not always faster*. Re-measure rather than copy numbers forward: they depend on the system and its version.

### Knapsack: optimisation, not just satisfaction

File \`knapsack.pl\`. A 0/1 knapsack. \`item(Name, Weight, Value)\` facts, one 0/1 variable per item (in the order \`item/3\` gives them), \`scalar_product/4\` for the totals, and \`labeling([max(V)], Take)\` for the **optimisation**.
`),
    program(
      `:- use_module(library(clpfd)).

%% item(Name, Weight, Value)

item(map,        9, 150).
item(compass,   13,  35).
item(water,    153, 200).
item(sandwich,  50, 160).
item(glucose,   15,  60).
item(banana,    27,  60).
item(suntan,   110,  70).
item(note,      22,  80).

%% Take is one 0/1 variable per item, in the order item/3 gives them.

knapsack(Capacity, Take, Weight, Value) :-
    findall(W-V, item(_, W, V), Pairs),
    pairs_keys_values(Pairs, Ws, Vs),
    same_length(Ws, Take),
    Take ins 0..1,
    scalar_product(Ws, Take, #=, Weight),
    scalar_product(Vs, Take, #=, Value),
    Weight #=< Capacity.

%% What was taken, by name

taken(Take, Names) :-
    findall(N, item(N, _, _), All),
    pairs_keys_values(Pairs, Take, All),
    findall(N, member(1-N, Pairs), Names).`,
      { fresh: true, title: 'knapsack.pl' },
    ),
    query('knapsack(200, T, W, V)'),
    query('once((knapsack(200, T, W, V), labeling([max(V)], T)))', {
      expect: ['T = [1, 1, 0, 1, 1, 1, 0, 1], W = 136, V = 545'],
    }),
    query('once((knapsack(200, T, W, V), labeling([max(V)], T), taken(T, Names)))', {
      expect: [
        'T = [1, 1, 0, 1, 1, 1, 0, 1], W = 136, V = 545, Names = [map, compass, sandwich, glucose, banana, note]',
      ],
    }),
    query('once((knapsack(100, T, W, V), labeling([max(V)], T), taken(T, Names)))', {
      expect: [
        'T = [1, 0, 0, 1, 1, 0, 0, 1], W = 96, V = 450, Names = [map, sandwich, glucose, note]',
      ],
    }),
    md(`
- \`knapsack(200, T, W, V)\` alone is a **residual constraint** again: the *model*, not yet a solution.
- With \`labeling([max(V)], T)\` the solutions come out **from best to worst value**, so the first one is the optimum. Here it takes the map, the compass, the sandwich, the glucose, the banana and the note (weight 136, value 545). (\`once/1\` keeps just that first one.)
- With capacity 100 the best choice changes: map, sandwich, glucose and note, for a value of 450.
`),
    exercise({
      title: 'Fewest coins',
      prompt: `
Write \`coins(Amount, [C1, C2, C5])\`: a way to pay \`Amount\` with \`C1\` coins of 1, \`C2\` coins of 2 and \`C5\` coins of 5 (non-negative numbers, at most 20 of each), **using as few coins as possible**. Use CLP(FD) (\`library(clpfd)\` is loaded for you) and \`labeling([min(Count)], ...)\` where \`Count\` is the total number of coins. The goal \`once(coins(11, Cs))\` should give the best payment first.
`,
      starter: `:- use_module(library(clpfd)).

% coins(Amount, [C1, C2, C5]) :- ...
`,
      hint: 'Declare `[C1, C2, C5] ins 0..20`, post `C1 + 2*C2 + 5*C5 #= Amount`, define `Count #= C1 + C2 + C5`, and finish with `labeling([min(Count)], [C1, C2, C5])`.',
      solution: `:- use_module(library(clpfd)).

coins(Amount, [C1, C2, C5]) :-
    [C1, C2, C5] ins 0..20,
    C1 + 2*C2 + 5*C5 #= Amount,
    Count #= C1 + C2 + C5,
    labeling([min(Count)], [C1, C2, C5]).`,
      tests: [
        { q: 'once(coins(11, Cs))', expect: ['Cs = [1, 0, 2]'] },
        { q: 'once(coins(7, Cs))', expect: ['Cs = [0, 1, 1]'] },
        { q: 'once(coins(4, Cs))', expect: ['Cs = [0, 2, 0]'] },
        { q: 'coins(11, [1, 0, 2])', expect: ['true'] },
      ],
    }),
  ],
});
