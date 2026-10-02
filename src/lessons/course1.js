// Lessons on syntax, the parent/child examples, terms and unification, and resolution.
import { md, program, query, exercise, lesson } from './dsl.js';

export const syntax = lesson({
  id: 'syntax',
  part: 'Foundations',
  title: 'Syntax and execution model',
  summary: 'Terms, atoms, clauses, goals, SLD resolution and backtracking, precisely.',
  blocks: [
    md(`
This lesson fixes the vocabulary used by logic programming, and then describes in one place how a Prolog computation proceeds.

### Prolog terms

- **Variables** are alphanumeric strings starting with an **uppercase letter** or an **underscore**. The underscore alone, \`_\`, is the **anonymous variable**, a sort of *don't care* variable. An underscore followed by a string, like \`_Tmp\`, is a normal variable during resolution, but it does not need to be exposed in the computed substitution.
- **Functors** are alphanumeric strings starting with a **lowercase letter**. This holds for both proper functors (\`f(a)\`) and **constants** (\`a\`).
- **Terms** are built recursively out of functors and variables, as in logic programming.

So \`term\`, \`Var\`, \`f(X)\` and \`p(Y, f(a))\` are Prolog terms, while \`term\`, \`var\`, \`f(a)\` and \`p(x, y)\` are Prolog **ground** terms (terms with no variables).
`),
    query('T = p(Y, f(a)), ground(T)', { expect: ['false'] }),
    query('T = p(x, f(a)), ground(T)', { expect: ['T = p(x, f(a))'] }),
    query('var(_), var(Anything), nonvar(f(a)), nonvar(term)'),
    md(`
### Prolog atoms

In logic programming the word **atom** has a precise meaning: an *atom* (or *atomic formula*) is built by applying a **predicate** to terms. Predicates are alphanumeric strings starting with a lowercase letter, exactly like functors.

So \`predicate\`, \`f(X)\` and \`p(Y, f(a))\` are atoms in this sense, and \`predicate\`, \`f(a)\` and \`p(x, y)\` are **ground atoms**.

> [!note] **Two meanings of "atom".** The rest of this notebook follows the Prolog standard and uses *atom* for a constant name like \`alice\` or \`'Hello World'\`, which is a functor of arity 0 in the vocabulary above. The *logic-programming* meaning of the word, "a predicate applied to terms", is the one used here and in the resolution lessons.

#### Towards meta-programming

\`parent(lino, joey)\`, taken out of context, could represent either a ground atom or a ground term. Is that an issue, or a feature? It is a feature: it paves the way towards **meta-programming**, where programs treat other programs as data.
`),
    md(`
### Prolog clauses

A **clause** is a Horn clause of the form \`A :- B1, ..., Bn.\` where \`A, B1, ..., Bn\` are Prolog atoms.

- \`A\` is the **head** of the clause, and \`B1, ..., Bn\` is its **body**;
- \`:-\` denotes logic **implication**, and \`.\` is the **terminator**.

There are three kinds of clause:

| kind | shape | notes |
| --- | --- | --- |
| **fact** | \`A.\` | a clause with no body (n = 0) |
| **rule** | \`A :- B1, ..., Bn.\` | a clause with at least one atom in the body (n > 0) |
| **goal** | \`:- B1, ..., Bn.\` | a clause with no head and at least one atom in the body (n > 0), often written \`?- B1, ..., Bn.\` |

A **program** is a sequence of Prolog clauses, interpreted as a conjunction of clauses. It constitutes a **logic theory** made of Horn clauses written according to the Prolog syntax.
`),
    program(
      `parent(joey, luca).                       % a fact
parent(lino, joey).                       % a fact
grandparent(G, N) :- parent(G, P), parent(P, N).   % a rule`,
      { fresh: true, title: 'kinds of clause' },
    ),
    query('grandparent(lino, Who)', { expect: ['Who = luca'] }),
    md(`
In the notebook, the cell above is the **program** (facts and rules) and each query cell is a **goal**.

### Prolog execution

#### What a computation is

Given a Prolog program \`P\` and the goal \`?- p(t1, t2, ..., tm)\` (also called a **query**), let \`X1, X2, ..., Xn\` be the variables in the terms \`t1, ..., tm\`. The meaning of the goal is to query \`P\` and find whether there are values for \`X1, ..., Xn\` that make \`p(t1, ..., tm)\` true.

So the aim of a Prolog computation is to find a **substitution** \`σ = {X1/s1, ..., Xn/sn}\` such that \`P ⊨ p(t1, t2, ..., tm)σ\`. That substitution is what Prolog prints as an answer.

#### The search strategy

As a logic programming language, Prolog adopts **SLD resolution**. As a search strategy, Prolog applies resolution in a strictly **linear** fashion:

- goals are replaced **left to right**, sequentially;
- clauses are considered in **top-to-bottom** order;
- subgoals are considered immediately once set up.

The result is a **depth-first** search strategy.

#### Backtracking

To achieve completeness, Prolog saves a **choicepoint** for every alternative still to be explored, and goes back to the nearest choicepoint available in case of failure. This is **automatic backtracking**.
`),
    program(
      `colour(red).
colour(green).
colour(blue).`,
      { fresh: true, title: 'choicepoints.pl' },
    ),
    query('colour(C)', { expect: ['C = red', 'C = green', 'C = blue'] }),
    query('colour(C), C \\= red, !', { expect: ['C = green'] }),
    md(`
Each answer above comes from a different choicepoint of \`colour/1\`: Prolog commits to the first clause, and returns to the saved choice when you ask for more.

### Prolog implementations

This notebook runs **SWI-Prolog**, compiled to WebAssembly, in your browser. Other systems exist too.

**SWI-Prolog** is the framework used by this notebook. Home: [swi-prolog.org](https://www.swi-prolog.org), GitHub: [github.com/SWI-Prolog](https://github.com/SWI-Prolog), online: [SWISH](https://swish.swi-prolog.org). In SWISH you write the program on the left, the goal at the bottom right, and press Ctrl-Enter.

The other free implementation is [GNU Prolog](http://www.gprolog.org), and a commercial one is [SICStus Prolog](https://sicstus.sics.se).

`),
    exercise({
      title: 'Facts, rules and goals',
      prompt: `
Write a program with **two facts** \`likes(mia, tea)\` and \`likes(zoe, tea)\`, and **one rule** \`pair(A, B)\` that holds when \`A\` and \`B\` like the same thing and are **different** people.
`,
      starter: '% two facts, then pair(A, B) :- ...\n',
      hint: 'A rule body is a conjunction: `likes(A, X), likes(B, X), A \\= B`.',
      solution: `likes(mia, tea).
likes(zoe, tea).
pair(A, B) :- likes(A, X), likes(B, X), A \\= B.`,
      tests: [
        { q: 'likes(mia, tea)', expect: ['true'] },
        { q: 'pair(mia, zoe)', expect: ['true'] },
        { q: 'pair(mia, mia)', expect: ['false'] },
        { q: 'pair(A, B)', expect: ['A = mia, B = zoe', 'A = zoe, B = mia'], unordered: true },
      ],
    }),
  ],
});

export const paradigms = lesson({
  id: 'paradigms',
  part: 'Foundations',
  title: 'Logic vs. imperative programming',
  summary: 'The same problem, permutations, in Java, in Prolog and in Scala.',
  blocks: [
    md(`
### Programming with logic

Literally: using mathematical logic for computer programming. Logic is used as a **declarative representation language**, and as a **theorem prover** (for problem solving).

- Logic languages like Prolog are **Turing-complete**, and are typically used for planning, searches, rules and symbolic reasoning.
- Logic programming is **declarative** programming, and modern functional languages borrow some techniques from it.
- To achieve efficiency and pragmatism, some **non-declarative** mechanisms are used to control program execution, for example the **cut** operator in Prolog, which avoids backtracking.

#### Basic mechanisms of logic programming

1. Computation is about establishing **in how many ways a goal can be solved** (actually a *stream* of solutions), with an intrinsic trial-and-error exploration of a search space.
2. A goal is a **relation** (0-ary, 1-ary, binary, ternary, ...) over data elements, which are essentially *untyped trees with holes*.

### Permutations in imperative programming

In idiomatic imperative programming (Java à la C), at each call the input is **updated in place**. The next permutation of an array is computed like this (\`NextPerm.java\`):

\`\`\`java
/**
 * works: permutes the input array in-place
 * ends: when no further permutation exists
 */
static boolean nextperm(int[] a) {
  int i, k;
  for (i = a.length - 2; i >= 0 && a[i] > a[i + 1]; i--);
  if (i < 0) {
    return false;
  }
  for (k = a.length - 1; a[i] > a[k]; k--);
  swap(a, i, k);
  k = 0;
  for (int j = i + 1; j < (a.length + i) / 2 + 1; j++) {
    swap(a, j, a.length - k - 1);
    k++;
  }
  return true;
}

/* e.g. */
int[] a = {1, 2, 3, 4};
do {
  System.out.println(Arrays.toString(a));
} while (nextperm(a));
\`\`\`

To try it you need a JDK. In a terminal, \`jshell\`, then \`/open NextPerm.java\`, \`int[] a = {1, 2, 3, 4}\`, \`NextPerm.nextperm(a)\` and \`a\`; \`NextPerm.main(null)\` runs it whole, and \`java NextPerm.java\` does the same outside \`jshell\`.

It needs the input array to be in strictly ascending order, and returns \`true\` if the next permutation exists. It prints 24 lines, from \`[1, 2, 3, 4]\` to \`[4, 3, 2, 1]\`.

### Permutations in logic programming

In idiomatic logic programming (\`permutation.pl\`) the goal is to **seek any permutation of a list**.

- \`member/3\` relates a list with any element in it, and the rest of the list;
- \`permutation/2\` relates a list with any permutation of it;
- the empty list is a permutation of the empty list;
- given a list \`L\`, let \`H\` be any element of it, \`T\` the rest, and \`TP\` any permutation of \`T\`: then \`L\` has as permutation a list starting with \`H\` and having tail \`TP\`.
`),
    program(
      `member([H|T], H, T).
member([H|T], E, [H|T2]) :- member(T, E, T2).

permutation([], []).
permutation(L, [H | TP]) :-
    member(L, H, T),
    permutation(T, TP).`,
      { fresh: true, title: 'permutation.pl' },
    ),
    query('member([a, b, c], E, Rest)', {
      expect: ['E = a, Rest = [b, c]', 'E = b, Rest = [a, c]', 'E = c, Rest = [a, b]'],
    }),
    query('permutation([1, 2, 3], P)', {
      expect: [
        'P = [1, 2, 3]',
        'P = [1, 3, 2]',
        'P = [2, 1, 3]',
        'P = [2, 3, 1]',
        'P = [3, 1, 2]',
        'P = [3, 2, 1]',
      ],
    }),
    query(
      'findall(P, permutation([1, 2, 3, 4], P), _Ps), length(_Ps, N), _Ps = [First|_], last(_Ps, Last)',
      {
        expect: ['N = 24, First = [1, 2, 3, 4], Last = [4, 3, 2, 1]'],
      },
    ),
    md(`
The same 24 permutations, from \`[1, 2, 3, 4]\` to \`[4, 3, 2, 1]\`, with no array, no swapping, no loop, and **no notion of "next"**: the program only says what a permutation *is*. Prolog explores the alternatives, and the whole set of results is a stream of solutions.

### Permutations in functional programming

The Scala version (\`permutation.scala\`) produces a **stream** of permutations. It is highly inspired by idiomatic logic programming: \`member\` plays the role of \`member/3\`. Note that logic programming somewhat inherently deals with streams of results.

\`\`\`scala
def member[A](l: List[A]): List[(A, List[A])] = l match
  case Nil => Nil
  case a :: t =>
    (a, t) :: (for (a2, l2) <- member(t) yield (a2, a :: l2))

def permutations[A](l: List[A]): Iterable[List[A]] = l match
  case Nil => Iterable(List())
  case _ =>
    for
      (a, l2) <- member(l)
      p <- permutations(l2)
    yield a :: p
\`\`\`

To try it you need Scala 3: \`scala repl permutation.scala\` loads the file, then ask for \`permutations(List(1, 2, 3))\`, and \`:quit\` leaves.

### Prolog is concise

Prolog solves some problems better than Java or C.

- **Pros.** If you master Prolog, you can directly and simply capture desired non-trivial behaviour. Prolog syntax and semantics are succinct. (Even though a new paradigm means new computational patterns!)
- **Cons.** If you do not understand it well, it is a problem. There is no recent, true school of clean coding for Prolog, and tooling is very viscous. Debugging is difficult, and **incrementality is key** to controlling programs.

### Learning Prolog: steps

- **Core Prolog:** two main mechanisms, **resolution** and **unification**; basic goal-resolution examples; programming with lists.
- **Full Prolog:** additional non-core mechanisms and additional programming techniques.

#### Mechanism I: resolution

Computing in Prolog means finding one or more positive solutions to a goal (or list of goals): start from the first goal \`G\`, find the rules in the program whose head matches \`G\`, and for each try to solve the body \`B\` of the rule, by solving each goal in \`B\` in the same way, recursively. This is the so-called **procedural interpretation** of Prolog. Since many rules can match, at each step there is a choice that opens alternatives, all to be explored via **backtracking**.

#### Mechanism II: unification

A goal expresses a relation (0-ary, 1-ary, 2-ary, ...) between first-order terms. **Terms** are the data values processed by Prolog: basically *untyped trees* with functors as nodes, and either constants or variables as leaves. A match between terms is done by the **unification** algorithm, and returns a **substitution** that is incrementally refined during resolution. The result of the computation is actually a substitution, in case of success.
`),
    exercise({
      title: 'member/3, from scratch',
      prompt: `
Write \`member/3\`: \`member(List, Element, Rest)\` relates a list with any element in it and the list **without that element**. For example \`member([a, b, c], E, R)\` gives \`E = a, R = [b, c]\`, then \`E = b, R = [a, c]\`, then \`E = c, R = [a, b]\`.
`,
      starter: '% member(List, Element, Rest) :- ...\n',
      hint: 'One fact for the head of the list, and one rule that keeps the head and recurses on the tail: `member([H|T], E, [H|T2]) :- member(T, E, T2).`',
      solution: `member([H|T], H, T).
member([H|T], E, [H|T2]) :- member(T, E, T2).`,
      tests: [
        { q: 'member([a, b, c], b, R)', expect: ['R = [a, c]'] },
        { q: 'member([a], E, R)', expect: ['E = a, R = []'] },
        { q: 'member([], E, R)', expect: ['false'] },
        {
          q: 'member([a, b, c], E, R)',
          expect: ['E = a, R = [b, c]', 'E = b, R = [a, c]', 'E = c, R = [a, b]'],
        },
      ],
    }),
  ],
});

export const kb = lesson({
  id: 'kb',
  part: 'Foundations',
  title: 'The parent/child knowledge base',
  summary: 'Four ground facts, then rules for grandparents and siblings, and what they can answer.',
  blocks: [
    md(`
### Example 1: the parent/child knowledge base

Program file: \`parent.pl\`.

A simple logic program with **four ground facts** representing one sort of relation between elements of the domain of discourse. Is there anything we can do with this program? Can we compute anything?
`),
    program(
      `parent(joey, luca).
parent(joey, simone).
parent(lino, joey).
parent(mirella, joey).`,
      { fresh: true, title: 'parent.pl' },
    ),
    md(`
- \`joey\`, \`luca\`, \`simone\`, \`lino\` and \`mirella\` are **constants** used in the program as ground terms to denote the elements of the domain of discourse. (Is there a *pre-interpretation*? Yes: we decide that they stand for people.)
- \`parent\` is the **predicate** used in the program to talk about the domain of discourse. \`parent/2\` says that \`parent\` is the predicate symbol with arity 2.

Since the only predicate in the program is \`parent/2\`, we cannot prove anything else, in principle, except for tautologies or built-in predicates. The possible goals are:
`),
    query('parent(joey, luca)', { expect: ['true'] }),
    query('parent(joey, lino)', { expect: ['false'] }),
    query('parent(joey, Child)', { expect: ['Child = luca', 'Child = simone'] }),
    query('parent(Parent, joey)', { expect: ['Parent = lino', 'Parent = mirella'] }),
    query('parent(Parent, Child)', {
      expect: [
        'Parent = joey, Child = luca',
        'Parent = joey, Child = simone',
        'Parent = lino, Child = joey',
        'Parent = mirella, Child = joey',
      ],
    }),
    query('parent(Grandparent, Parent), parent(Parent, Child)', {
      expect: [
        'Grandparent = lino, Parent = joey, Child = luca',
        'Grandparent = lino, Parent = joey, Child = simone',
        'Grandparent = mirella, Parent = joey, Child = luca',
        'Grandparent = mirella, Parent = joey, Child = simone',
      ],
    }),
    md(`
#### Remarks on interaction

Interacting with a Prolog system, you can observe several things:

1. **success**: the goal can be proved (\`true\`);
2. **failure**: it cannot (\`false\`);
3. **computed substitution**: the values found for the variables of the goal;
4. **unification**: goal and clause heads are matched, not compared;
5. **backtracking**: more answers come from the alternatives left behind;
6. **clause order**: answers appear in the order of the clauses;
7. **no input/output parameters**: no direction is required for arguments in principle, thanks to unification. \`parent(joey, Child)\` and \`parent(Parent, joey)\` use the *same* predicate.

### Example 2: a rule to infer grandparents

Program file: \`grandparent.pl\`. The same facts, plus a rule.
`),
    program(
      `parent(joey, luca).
parent(joey, simone).
parent(lino, joey).
parent(mirella, joey).

grandparent(G, N) :-
    parent(G, P),
    parent(P, N).`,
      { fresh: true, title: 'grandparent.pl' },
    ),
    md(`
The rule \`grandparent(G, N) :- parent(G, P), parent(P, N).\` is **added to the knowledge base**. Now the logic program is a collection of facts *and rules*. It is a so-called **universal rule**, meaning that the rule holds for **any possible value of the variables**.

Test the program with the following queries, and discuss all the results:
`),
    query('grandparent(lino, luca)', { expect: ['true'] }),
    query('grandparent(lino, joey)', { expect: ['false'] }),
    query('grandparent(lino, Nephew)', { expect: ['Nephew = luca', 'Nephew = simone'] }),
    query('grandparent(Grandparent, simone)', {
      expect: ['Grandparent = lino', 'Grandparent = mirella'],
    }),
    query('grandparent(Grandparent, Nephew)', {
      expect: [
        'Grandparent = lino, Nephew = luca',
        'Grandparent = lino, Nephew = simone',
        'Grandparent = mirella, Nephew = luca',
        'Grandparent = mirella, Nephew = simone',
      ],
    }),
    md(`
### Example 2 again: a rule to infer siblings

Program file: \`sibling.pl\`. A *different* rule is added to the same facts.
`),
    program(
      `parent(joey, luca).
parent(joey, simone).
parent(lino, joey).
parent(mirella, joey).

sibling(S1, S2) :-
    parent(P, S1),
    parent(P, S2),
    S1 \\= S2.`,
      { fresh: true, title: 'sibling.pl' },
    ),
    md(`
All the previous theorems are still true: all previous computations are the same, and we are just **adding new theorems** based on a new rule.

The operator \`\\=/2\` represents an **explicit computation over terms**: it succeeds when the two arguments are terms that **do not unify**. All the other computations over terms until now were implicitly driven by goal unification.

Test the program with the following queries, and discuss all the results:
`),
    query('sibling(simone, luca)', { expect: ['true'] }),
    query('sibling(lino, joey)', { expect: ['false'] }),
    query('sibling(luca, Sibling)', { expect: ['Sibling = simone'] }),
    query('sibling(Sibling, luca)', { expect: ['Sibling = simone'] }),
    query('sibling(joey, Sibling)', { expect: ['false'] }),
    query('sibling(Sibling1, Sibling2)', {
      expect: ['Sibling1 = luca, Sibling2 = simone', 'Sibling1 = simone, Sibling2 = luca'],
    }),
    md(`
Why does \`sibling(joey, Sibling)\` fail? Because \`joey\`'s only parents are \`lino\` and \`mirella\`, and each of them has **only** \`joey\` as a child, so the only candidate sibling is \`joey\` himself, which \`S1 \\= S2\` rejects.
`),
    exercise({
      title: 'Great-grandparents',
      prompt: `
The \`parent/2\` facts of the example are loaded. Write a rule \`greatgrandparent(G, N)\` for a person \`G\` who is a parent of a parent of a parent of \`N\`. (With these facts nobody qualifies yet, but your rule should work on any family.)
`,
      setup: `parent(joey, luca).
parent(joey, simone).
parent(lino, joey).
parent(mirella, joey).
parent(nonno, lino).`,
      starter: '% greatgrandparent(G, N) :- ...\n',
      hint: 'Three `parent` goals chained: `parent(G, A), parent(A, B), parent(B, N)`.',
      solution: 'greatgrandparent(G, N) :- parent(G, A), parent(A, B), parent(B, N).',
      tests: [
        { q: 'greatgrandparent(nonno, luca)', expect: ['true'] },
        { q: 'greatgrandparent(lino, luca)', expect: ['false'] },
        { q: 'greatgrandparent(nonno, Who)', expect: ['Who = luca', 'Who = simone'] },
      ],
    }),
  ],
});

export const mgu = lesson({
  id: 'mgu',
  part: 'Foundations',
  title: 'Terms, substitutions and the MGU',
  summary: 'Terms as trees, substitutions, most general unifiers, and the unification algorithm.',
  blocks: [
    md(`
Resolution needs a richer notion of **goal**. In the *Empowering resolution* picture:

- goals are 0-ary, 1-ary, 2-ary, ... **relations between terms**;
- terms are the values of the Prolog language, and are (finite) **trees**; they can have logic **variables** in the leaves;
- goal matching is done by so-called **unification**: essentially a substitution of variables by terms that makes two goals identical;
- unification could also provide a **declarative form of side effect**;
- computation goes on by evolving a **resolvent** and the **substitution** collected so far. The substitution is the computed result.

### Prolog terms

The syntax of goals and terms (\`terms.pl\`):

\`\`\`
Goal ::= Predicate | Predicate ( Term1, ..., Termn )
Term ::= Variable | Number | Functor | Functor ( Term1, ..., Termn )
\`\`\`

- predicate and functor names are literals starting with lower case, variables start with upper case;
- predicates and functors are said to have **arity** 0, 1, 2, ..., n;
- the syntax of goals is a **subset** of that of terms;
- a term with no variables in it is called **ground**.

Three unrelated programs in one listing show what a lower-case name is in each position:
`),
    program(
      `father(abraham, isaac).
father(terach, abraham).
grandfather(GF, GS) :- father(GF, F), father(F, GS).

pred(cons(H, nil), H).             % cons/nil as functors
pred(cons(_, T), L) :- pred(T, L). % what does pred define?

odd(1).          % 1 is odd
odd(3).          % 3 is odd
sum(2, 3, 5).    % 2,3,5 are in the sum relation`,
      { fresh: true, title: 'terms.pl' },
    ),
    md(`
What does \`pred\` define? Ask it: it relates a \`cons/nil\` list with its **last** element.
`),
    query('pred(cons(a, cons(b, cons(c, nil))), L)', { expect: ['L = c'] }),
    query('grandfather(terach, Who)', { expect: ['Who = isaac'] }),
    query('odd(X), sum(2, 3, Y)', { expect: ['X = 1, Y = 5', 'X = 3, Y = 5'] }),
    md(`
### Interpretations of Prolog programs

**Logic interpretation** (the classical one): a program is a logic *theory*, and computing is *proving* that a goal is a theorem under that theory. To prove that \`GF\` is the grandfather of \`GS\`, first prove that ...

**Relational interpretation** (the idiomatic one, which we shall use): a program is a set of *predicates over terms*, and computing is *querying for a relation*. For example, \`10\` is in the \`element\` relation with \`cons(10, nil)\`.

**Procedural interpretation** (the operational one): a program is a set of *procedures*, and computing is *calling predicates*. The call \`element(10, cons(20, nil))\` causes the call \`element(10, nil)\`.

### Terms as trees

A term is a **tree** of atoms, with atoms, numbers and variables in the leaves:

- \`a\` is an atom, \`21\` is a number, \`X\` is a variable;
- \`cons(10, cons(20, cons(30, nil)))\` is a compound (ground) term;
- \`student(mario, rossi, 1990)\` is a compound (ground) term;
- \`student(X, Y, Z)\` is a compound (non-ground) term.

\`\`\`
cons                          student                    student
├── 10                        ├── mario                  ├── X
└── cons                      ├── rossi                  ├── Y
    ├── 20                    └── 1990                   └── Z
    └── cons
        ├── 30
        └── nil
\`\`\`
`),
    query('T = cons(10, cons(20, cons(30, nil))), T =.. [Functor|Args], ground(T)'),
    query('student(mario, rossi, 1990) = student(X, Y, Z)', {
      expect: ['X = mario, Y = rossi, Z = 1990'],
    }),
    md(`
### Substitutions

A **substitution** \`θ = {X1/T1, ..., Xn/Tn}\` maps variables to terms, where the terms \`Tj\` should contain no variable \`Xk\`.

- valid: \`{}\`, \`{Y/10}\`, \`{X/a(1,Z), Y/10, W/Z}\`;
- invalid: \`{X/a(1,Z), Y/10, Z/W}\` (it should be rewritten as \`{X/a(1,Z), Y/10, W/Z}\`).

Related concepts:

- **application** to terms: \`p(X,a){X/10}\` is \`p(10,a)\`; \`p(X,a){Y/X}\` is \`p(X,a)\` (equivalent to \`p(Y,a)\` under that substitution);
- **equivalence** of substitutions: \`{X/Y, Z/10} ≡ {Y/X, Z/10}\`;
- **generality**: \`{X/10}\` is more general than \`{X/10, Y/2}\`;
- **composition** of substitutions: \`{X/10}{Y/X} ≡ {X/10, Y/10}\`, while \`{X/10}{X/5}\` is impossible;
- **instance**: \`p(10, b)\` is an instance of \`p(X, b)\`;
- **term cloning**: \`clone(p(10,X,X,Y)) = p(10,X2,X2,Y2)\`, with \`X2\` and \`Y2\` fresh (this is **variable renaming**).

Prolog lets you try all of these:
`),
    query('X = 10, T = p(X, a)', { expect: ['X = 10, T = p(10, a)'] }),
    query('Y = X, X = 10', { expect: ['Y = 10, X = 10'] }),
    query('X = 10, X = 5', { expect: ['false'] }),
    query('copy_term(p(10, X, X, Y), Clone)', { expect: ['Clone = p(10, _A, _A, _)'] }),
    md(`
### Most General Unifier (MGU)

\`mgu(T1, T2)\` is any substitution \`θ\` such that

- it is a **unifier** of \`T1\` and \`T2\`, namely \`θT1 = θT2\`;
- it is the **most general** one: out of many unifiers, we exclude the less general ones.

An MGU might not exist, and if many MGUs seem to exist, they are actually all equivalent substitutions. Unification is a **symmetrical pattern matching** mechanism: it binds variables to non-variable terms, and puts some other variables into groups.

Some examples, tried with \`=/2\`:

- \`mgu(a(1,2), a(X,Y)) = {X/1, Y/2}\`
- \`mgu(a(1,2), a(X,X)) = ⊥\`
- \`mgu(a(1,b(X)), a(Y,b(Z))) = {X/Z, Y/1}\`
- \`mgu(a(X,Y,A,b(W)), a(Z,Z,B,b(1))) = {X/Z, Y/Z, W/1, A/B}\`: \`W/1\`, and the groups \`(X, Y, Z)\` and \`(A, B)\`
`),
    query('a(1, 2) = a(X, Y)', { expect: ['X = 1, Y = 2'] }),
    query('a(1, 2) = a(X, X)', { expect: ['false'] }),
    query('a(1, b(X)) = a(Y, b(Z))', { expect: ['X = Z, Y = 1'] }),
    query('a(X, Y, A, b(W)) = a(Z, Z, B, b(1))'),
    query('p(X, 1) = p(2, Y)', { expect: ['X = 2, Y = 1'] }),
    query('p(X, 1) \\= p(2, Y)', { expect: ['false'] }),
    md(`
The last two lines are a quick test: \`?- p(X,1) = p(2,Y).\` answers yes with \`X/2, Y/1\`, and the *opposite* test \`?- p(X,1) \\= p(2,Y).\` answers no.

### The unification algorithm

The algorithm of **Martelli and Montanari** (1982) works by transformation rules on a set \`G\` of term equations:

| rule | transformation |
| --- | --- |
| **delete** | \`G ∪ {t ≐ t}\` ⇒ \`G\` |
| **decompose** | \`G ∪ {f(s0,...,sk) ≐ f(t0,...,tk)}\` ⇒ \`G ∪ {s0 ≐ t0, ..., sk ≐ tk}\` |
| **conflict** | \`G ∪ {f(s0,...,sk) ≐ g(t0,...,tm)}\` ⇒ ⊥ if \`f ≠ g\` or \`k ≠ m\` |
| **swap** | \`G ∪ {f(s0,...,sk) ≐ x}\` ⇒ \`G ∪ {x ≐ f(s0,...,sk)}\` |
| **eliminate** | \`G ∪ {x ≐ t}\` ⇒ \`G{x ↦ t} ∪ {x ≐ t}\` if \`x ∉ vars(t)\` and \`x ∈ vars(G)\` |
| **check** | \`G ∪ {x ≐ f(s0,...,sk)}\` ⇒ ⊥ if \`x ∈ vars(f(s0,...,sk))\` |

The **check** rule is the *occurs check*: \`X\` cannot be unified with a term that contains \`X\`. Most Prolog systems skip it for speed in \`=/2\`, but \`unify_with_occurs_check/2\` implements it.
`),
    query('f(X, g(Y)) = f(a, Z)', { expect: ['X = a, Z = g(Y)'] }),
    query('f(a, b) = f(a)', { expect: ['false'] }),
    query('unify_with_occurs_check(X, f(X))', { expect: ['false'] }),
    query('unify_with_occurs_check(X, f(Y))', { expect: ['X = f(Y)'] }),
    exercise({
      title: 'Would these unify?',
      prompt: `
Write \`unifiable_terms(A, B)\`: it is true when \`A\` and \`B\` **can** be unified, but it must **leave the variables of both terms unbound** (a pure test, with no side effect).
`,
      starter: '% unifiable_terms(A, B) :- ...\n',
      hint: 'You met `\\=` ("cannot be unified"). Negating it, `\\+ A \\= B`, holds exactly when they *can* unify, and negation never keeps bindings.',
      solution: 'unifiable_terms(A, B) :- \\+ A \\= B.',
      tests: [
        { q: 'unifiable_terms(a(1, b(X)), a(Y, b(Z)))', expect: ['true'] },
        { q: 'unifiable_terms(a(1, 2), a(X, X))', expect: ['false'] },
        { q: 'unifiable_terms(f(X, b), f(a, Y)), var(X), var(Y)', expect: ['true'] },
      ],
    }),
  ],
});

export const resolution = lesson({
  id: 'resolution',
  part: 'Foundations',
  title: 'Resolution, step by step',
  summary: 'Resolvents, resolution trees, and resolution with unification and substitutions.',
  blocks: [
    md(`
### Resolution without matching

The core abstract syntax of the resolution system:

\`\`\`
Clause  ::= Goal :- Goal1, ..., Goaln      (n ≥ 0)
Program ::= Clause1 ... Clausek            (k > 0)
\`\`\`

A **list of goals** is called a **resolvent**. A clause has the form \`head :- body\`; clauses with an empty body are called **facts** (\`G.\`), and clauses with a non-empty body are called **rules** (\`G :- G1,..,Gn.\`).

#### Semantics: the transition relation

Start with an initial input resolvent \`R0 = G1, G2, ..., Gn\`. A valid computation step (**resolution**) is a transition \`R → R'\`, defined as follows: if the clause \`G' :- G1', ..., Gm'\` is defined in the program, and \`G' = G1\`, then

\`\`\`
G1, G2, ..., Gn  →  G1', ..., Gm', G2, ..., Gn
\`\`\`

Note that, given an \`R\`, there can be **many** \`R'\`.

For example, with the clauses \`a.\` and \`a :- b, c.\`, and the resolvent \`a, c, d\`, there are only two valid resolutions in one step:

- \`a, c, d → c, d\`: here the list of goals was **reduced**;
- \`a, c, d → b, c, c, d\`: here the list of goals was **expanded**.

#### Resolution trees

For each resolvent, its first goal can match the head of many clauses (always considered from top to bottom), hence several child resolvents could be generated. A resolution is **successful** if there is a leaf with an **empty resolvent**. Generally we have a (potentially unbounded) tree of resolvents, where solutions are searched left to right (depth first). The process of bringing exploration back up in the tree to find a (new) solution is called **backtracking**.

### An example program, and its resolution trees

File \`resolution-trees.pl\`: facts, rules and recursion. Everything here is **propositional**: every goal is a 0-ary predicate.
`),
    program(
      `a.        % a clause with empty body is a fact
b.        % multiple copies of rules/facts can occur
b.
b :- z.   % b is the rule "head", z is the body
c.        % different clauses can have same head
c :- a, c. % a sort of recursive rule
c :- b.
d :- d.   % .. recall the order of clauses is relevant`,
      { fresh: true, title: 'resolution-trees.pl' },
    ),
    md(`
Here are the resolution trees of \`a\`, \`b\`, \`c\` and \`d\`:

\`\`\`
a          b                    c                       d
.          ├── .                ├── .                   d
           ├── .                ├── a,c                 └── d
           └── z                │   ├── c                   └── ...
                                │   │   └── ...
                                │   └── ...
                                └── b
                                    ├── .
                                    ├── .
                                    └── z
\`\`\`

(\`.\` stands for the empty resolvent, a success.) This program is **meant to misbehave**, to show exactly that:
`),
    query('a', { expect: ['true'] }),
    query('b', { expect: ['true', 'true'], error: true }),
    query('c', { max: 4 }),
    query('d', { error: true }),
    md(`
- \`a\` succeeds once.
- \`b\` answers **twice** (the two facts), and then the third clause raises *Unknown procedure: z/0*, since \`z\` is not defined at all (a Prolog system with the closed-world assumption would simply fail; SWI-Prolog complains about the undefined predicate).
- \`c\` has **infinitely many** solutions (we asked for 4): the clause \`c :- a, c.\` regenerates \`c\` over and over.
- \`d\` **does not terminate**: \`d :- d.\` only ever replaces \`d\` by \`d\`. The notebook stops it after a bounded number of steps.

#### Outcomes of resolution: what can we ask?

- **Predicative:** can we find at least one solution (reaching an empty leaf)? We do not care after the first one.
- **Stream-like:** how many solutions?
- **Loop-aware:** will the computation terminate? (Seemingly undecidable.)
- **Output-oriented:** what is the output of a solution? Is it related to the sequence of resolvents? What is the order of results?
`),
    md(`
### Inference and knowledge with resolution

File \`inference-rules.pl\`.

**Facts**, though atomic, can be used to state knowledge we take as true, e.g. an *axiom*, similarly to propositional symbols in propositional logic.

A **rule**: by a resolvent, we check a composition of goals as a sort of higher-level knowledge. A rule is a way of giving such a composition a *name* (the head) and a *definition* (the body). Essentially: **name-based abstraction**, with the key possibility of recursion.
`),
    program(
      `father_abraham_isaac.
father_terach_abraham.
grandfather_terach_isaac :-
    father_abraham_isaac, father_terach_abraham.`,
      { fresh: true, title: 'inference-rules.pl' },
    ),
    query('grandfather_terach_isaac', { expect: ['true'] }),
    md(`
#### Shortcomings

Propositional resolution is not enough:

- goals might have a **structure**, not just be atomic symbols;
- goals seem to express a **relationship between elements**;
- we might want to express the grandfather relation in the **general case**;
- we might want an explicit notion of **result** (who is Abraham's father?);
- we need to express computations in a Turing-complete way.

#### Roadmap

- give a concrete, **structured syntax** to goals;
- provide an advanced mechanism of **goal-rule matching** (unification);
- add information to the status of computation beyond mere resolvents (the **substitution**).

This extends resolution analogously to the transition from propositional logic to first-order logic.

### Resolution with unification: the core semantics

Use a tree of pairs \`⟨resolvent : substitution⟩\` as computation state. Start with an initial configuration \`C = ⟨R0 : {}⟩\`. A valid computation step is a transition \`C → C'\`, defined as follows: if \`G' :- G1', ..., Gm'\` is a **clone** (a renamed copy) of a clause in the program, and \`θ' = mgu(G', G1)\` exists, then

\`\`\`
⟨G1, G2, ..., Gn : θ⟩  →  ⟨(G1', ..., Gm', G2, ..., Gn)θ' : θθ'⟩
\`\`\`

For simplicity, only the part of \`θ\` that mentions variables of the resolvent and of the input resolvent is needed. The transition relation induces, as usual, a possibly infinite tree. A **solution** is the substitution \`θ\` we have in a leaf with an empty resolvent.

File \`grandfather.pl\`:
`),
    program(
      `father(abraham, isaac).
father(terach, abraham).
grandfather(GF, GS) :- father(GF, F), father(F, GS).`,
      { fresh: true, title: 'grandfather.pl' },
    ),
    md(`
#### Example 1

\`\`\`
C1:  father(terach, X) : {}
-->
C2:  yes : {X/abraham}
\`\`\`

The cloned fact \`father(terach, abraham).\` matches the goal with \`θ' = {X/abraham}\`, and the new resolvent is **empty** (*yes*).
`),
    query('father(terach, X)', { expect: ['X = abraham'] }),
    md(`
#### Example 2

\`\`\`
C1:  father(terach, X), father(X, Y) : {}
-->
C2:  father(abraham, Y) : {X/abraham}
\`\`\`

The cloned fact \`father(terach, abraham).\` matches with \`θ' = {X/abraham}\`; the new resolvent is \`father(X, Y)\`, which after applying \`θ'\` becomes \`father(abraham, Y)\`. Here \`θ'\` **must be preserved**, since \`X\` is used in the goal.
`),
    query('father(terach, X), father(X, Y)', { expect: ['X = abraham, Y = isaac'] }),
    md(`
#### Example 3

\`\`\`
C1:  grandfather(terach, X) : {}
-->
C2:  father(terach, F'), father(F', X) : {}
\`\`\`

The cloned rule is \`grandfather(GF', GS') :- father(GF', F'), father(F', GS').\` with \`θ' = {GF'/terach, GS'/X}\`. The new resolvent is \`father(GF', F'), father(F', GS')\`, and after applying \`θ'\` it is \`father(terach, F'), father(F', X)\`. No part of \`θ'\` must be recalled for subsequent steps: the bindings concern only the **fresh** variables of the clone.
`),
    query('grandfather(terach, X)', { expect: ['X = isaac'] }),
    exercise({
      title: 'Trace by hand, check by machine',
      prompt: `
With the \`father/2\` facts loaded, write the **goal as a rule**: \`who_is_grandfather_of(GS, GF)\` should relate a grandson to his grandfather by using \`father/2\` twice, so that \`who_is_grandfather_of(isaac, GF)\` gives \`GF = terach\`.
`,
      setup: `father(abraham, isaac).
father(terach, abraham).`,
      starter: '% who_is_grandfather_of(GS, GF) :- ...\n',
      hint: 'The grandson is the child in the *second* `father` goal: `father(GF, F), father(F, GS)`.',
      solution: 'who_is_grandfather_of(GS, GF) :- father(GF, F), father(F, GS).',
      tests: [
        { q: 'who_is_grandfather_of(isaac, GF)', expect: ['GF = terach'] },
        { q: 'who_is_grandfather_of(abraham, GF)', expect: ['false'] },
        { q: 'who_is_grandfather_of(GS, terach)', expect: ['GS = isaac'] },
      ],
    }),
  ],
});
