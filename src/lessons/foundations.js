import { md, program, query, exercise, lesson } from './dsl.js';

export const hello = lesson({
  id: 'hello',
  part: 'Foundations',
  title: 'Hello, logic',
  summary: 'Facts, queries, and what “false” really means.',
  blocks: [
    md(`
Most languages tell the computer **how** to do something, step by step. Prolog works differently: you describe **what is true**, then ask questions. The engine figures out the steps.

A Prolog program is a collection of **facts** (and, later, **rules**). Below is a tiny knowledge base. Each line states one fact: *alice likes pizza*, *bob likes sushi*, and so on. Every fact ends with a full stop.
`),
    program(
      `% facts: things we declare to be true
likes(alice, pizza).
likes(bob, sushi).
likes(carol, pizza).
likes(alice, tea).`,
      { title: 'likes.pl' },
    ),
    md(`
Press **Load** to load the program. Then ask questions with **queries**, the prompt \`?-\` means "is it true that…?". Queries run against every program cell above them.
`),
    query('likes(alice, pizza)', { expect: ['true'] }),
    query('likes(bob, pizza)', { expect: ['false'] }),
    md(`
Notice \`false\`. Prolog didn't prove that *bob doesn't like pizza*, it only failed to prove that he **does**. Anything not stated or derivable is treated as false. This is the **closed-world assumption**, and it runs through all of Prolog.

#### Asking with variables

Names starting with an **uppercase letter** are *variables*. A query with a variable asks: "for which values is this true?"
`),
    query('likes(alice, What)', { expect: ['What = pizza', 'What = tea'] }),
    query('likes(Who, pizza)', { expect: ['Who = alice', 'Who = carol'] }),
    query('likes(Who, What)'),
    md(`
When there are several answers, Prolog lists them in the order the facts appear. You can think of it as searching the program top to bottom.

> [!try] Edit the program above, add \`likes(bob, pizza).\`, press **Load**, then re-run the second query. Your edits are saved in your browser; the circular arrow resets a cell.

> [!note] Atoms like \`alice\` and \`pizza\` start with a **lowercase** letter. Variables like \`Who\` start with an **Uppercase** letter (or an underscore). This is the single most common beginner trip-up.
`),
    exercise({
      title: 'Teach Prolog two new facts',
      prompt: `
Extend the knowledge base so that **bob likes tea** and **dave likes pizza**. Then *Check* your work.
`,
      starter: `likes(alice, pizza).
likes(alice, tea).

% add your facts below
`,
      hint: 'Each fact is `likes(person, thing).`, lowercase, comma-separated, ending with a full stop.',
      solution: `likes(alice, pizza).
likes(alice, tea).
likes(bob, tea).
likes(dave, pizza).`,
      tests: [
        { q: 'likes(bob, tea)', expect: ['true'] },
        { q: 'likes(dave, pizza)', expect: ['true'] },
        { q: 'likes(dave, tea)', expect: ['false'] },
        { q: 'likes(Who, tea)', expect: ['Who = alice', 'Who = bob'], unordered: true },
      ],
    }),
  ],
});

export const terms = lesson({
  id: 'terms',
  part: 'Foundations',
  title: 'Terms: the building blocks',
  summary: 'Atoms, numbers, variables and compound terms.',
  blocks: [
    md(`
Everything in Prolog, data, facts, rules, even whole programs, is made of **terms**. There are four kinds:

- **Atoms**: \`alice\`, \`pizza\`, \`'Hello World'\`, \`[]\`. Lowercase-first names, or anything in single quotes.
- **Numbers**: \`42\`, \`-7\`, \`3.14\`.
- **Variables**: \`X\`, \`Name\`, \`_tmp\`. Uppercase-first or underscore-first.
- **Compound terms**: a name (the *functor*) with arguments in parentheses: \`author(frank_herbert)\`, \`point(3, 4)\`.

Facts like \`likes(alice, pizza)\` are themselves compound terms with the functor \`likes\` and two arguments. The number of arguments is the **arity**, and a predicate is identified by name **and** arity: \`likes/2\`.
`),
    program(
      `% book(Title, Author, Year)
book(dune, author(frank_herbert), 1965).
book(emma, author(jane_austen), 1815).
book(neuromancer, author(william_gibson), 1984).`,
      { fresh: true, title: 'books.pl' },
    ),
    md('Compound terms can nest. Ask for pieces by putting variables where you want answers:'),
    query('book(dune, author(Who), Year)', { expect: ['Who = frank_herbert, Year = 1965'] }),
    query('book(Title, author(jane_austen), _)', { expect: ['Title = emma'] }),
    md(`
The bare underscore \`_\` is the **anonymous variable**: "something goes here, but I don't care what". Every \`_\` is a fresh, independent variable.

#### Inspecting terms

Prolog can look at terms too. These **type-checking predicates** ask what kind of thing you have:
`),
    query('atom(pizza)', { expect: ['true'] }),
    query('atom(42)', { expect: ['false'] }),
    query('number(3.14), \\+ number(pizza)', { expect: ['true'] }),
    query("atom('Hello World')", { expect: ['true'] }),
    query('compound(author(frank_herbert))', { expect: ['true'] }),
    query('functor(book(dune, author(x), 1965), Name, Arity)', {
      expect: ['Name = book, Arity = 3'],
    }),
    query('var(X)', { expect: ['true'] }),
    md(`
> [!tip] \`\\+\` means "not provable", we meet it properly in a later lesson. Here \`\\+ number(pizza)\` just reads "pizza is not a number".

> [!note] Single quotes make any text an atom: \`'Hello World'\`, \`'42 is a number'\`. Double quotes are different: \`"abc"\` is a *string* object. We cover text in its own lesson.
`),
    exercise({
      title: 'Model a family',
      prompt: `
Write \`parent/2\` facts (\`parent(Parent, Child).\`) for this family:

- tom is a parent of bob and of liz
- bob is a parent of ann and of pat
`,
      starter: '% parent(Parent, Child).\n',
      hint: 'Four facts in total. The parent comes first.',
      solution: `parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).`,
      tests: [
        { q: 'parent(tom, bob)', expect: ['true'] },
        { q: 'parent(bob, pat)', expect: ['true'] },
        { q: 'parent(ann, _)', expect: ['false'] },
        { q: 'parent(tom, Kid)', expect: ['Kid = bob', 'Kid = liz'], unordered: true },
        { q: 'parent(bob, Kid)', expect: ['Kid = ann', 'Kid = pat'], unordered: true },
      ],
    }),
  ],
});

export const rules = lesson({
  id: 'rules',
  part: 'Foundations',
  title: 'Rules',
  summary: 'Deriving new knowledge with :- (if), commas (and) and semicolons (or).',
  blocks: [
    md(`
Facts are things we state. **Rules** let Prolog *derive* new facts. A rule has a **head** and a **body**, separated by \`:-\` which you read as **"if"**:

\`\`\`
head :- condition1, condition2, ... .
\`\`\`

The comma means **and**. Here is a family database, and a rule defining \`grandparent/2\`:
`),
    program(
      `parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).
parent(pat, jim).

male(tom). male(bob). male(jim).
female(liz). female(ann). female(pat).

% G is a grandparent of C if G is a parent of some P, and P is a parent of C.
grandparent(G, C) :- parent(G, P), parent(P, C).`,
      { fresh: true, title: 'family.pl' },
    ),
    query('grandparent(tom, Who)', { expect: ['Who = ann', 'Who = pat'] }),
    query('grandparent(Who, jim)', { expect: ['Who = bob'] }),
    md(`
Variables in a rule are **local to that rule**. \`P\` above links the two conditions: whatever person makes \`parent(G, P)\` true must also be the one in \`parent(P, C)\`. Prolog searches for a value of \`P\` that satisfies both.

#### More rules, and a new operator

\`A \\= B\` means "A and B cannot be made equal", handy to say "two *different* people".
`),
    program(
      `sibling(A, B) :- parent(P, A), parent(P, B), A \\= B.
father(F, C) :- parent(F, C), male(F).
mother(M, C) :- parent(M, C), female(M).`,
      { title: 'more rules' },
    ),
    query('sibling(ann, Who)', { expect: ['Who = pat'] }),
    query('father(Who, ann)', { expect: ['Who = bob'] }),
    query('mother(Who, Kid)', { expect: ['Who = pat, Kid = jim'] }),
    md(`
That last query asked for *every* mother–child pair. \`liz\` has no children in this data, so only \`pat\` (mother of \`jim\`) qualifies.

#### "Or": several clauses, or a semicolon

Writing several rules with the same head gives you **or**: Prolog tries each in turn.
`),
    program(
      `person(X) :- male(X).
person(X) :- female(X).

% a semicolon inside one body also means "or"
related(X, Y) :- parent(X, Y) ; parent(Y, X).`,
      { title: 'or' },
    ),
    query('person(X)'),
    query('related(bob, Who)'),
    md(`
> [!tip] Read a rule aloud as a sentence: "*C has grandparent G if G is a parent of P and P is a parent of C.*" If you can't say it in words, it will be hard to get right in code.
`),
    exercise({
      title: 'Define an aunt',
      prompt: `
The family facts and \`sibling/2\` are already loaded for you. Write a rule **\`aunt(A, N)\`**: \`A\` is an aunt of \`N\` if \`A\` is female and a sibling of one of \`N\`'s parents.
`,
      setup: `parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).
parent(pat, jim).
female(liz). female(ann). female(pat).
sibling(A, B) :- parent(P, A), parent(P, B), A \\= B.`,
      starter: '% aunt(A, N) :- ...\n',
      hint: 'Find a parent `P` of `N`, then a sibling of `P`. Do not forget the female check.',
      solution: 'aunt(A, N) :- parent(P, N), sibling(P, A), female(A).',
      tests: [
        { q: 'aunt(liz, ann)', expect: ['true'] },
        { q: 'aunt(liz, jim)', expect: ['false'] },
        { q: 'aunt(Who, pat)', expect: ['Who = liz'] },
        { q: 'aunt(Who, jim)', expect: ['Who = ann'] },
        { q: 'aunt(ann, ann)', expect: ['false'] },
      ],
    }),
  ],
});

export const unification = lesson({
  id: 'unification',
  part: 'Foundations',
  title: 'Unification',
  summary: 'The one mechanism behind pattern matching, assignment and parameter passing.',
  blocks: [
    md(`
The \`=\` operator does **not** assign. It asks Prolog to make two terms **identical** by choosing values for variables. This is **unification**, and it is how Prolog matches queries against facts and rule heads.

Rules of unification:

- Identical atoms and numbers unify.
- A variable unifies with anything (and becomes that thing).
- Two compound terms unify if they have the same functor and arity, and their arguments unify one by one.
`),
    query('X = hello', { expect: ['X = hello'] }),
    query('hello = hello', { expect: ['true'] }),
    query('hello = world', { expect: ['false'] }),
    query('f(X, b) = f(a, Y)', { expect: ['X = a, Y = b'] }),
    query('point(X, Y) = point(1, 2)', { expect: ['X = 1, Y = 2'] }),
    query('f(a) = g(a)', { expect: ['false'] }),
    query('f(a, b) = f(a)', { expect: ['false'] }),
    md(`
#### Once bound, always bound

Within one query a variable keeps its value. If the same variable appears twice, both places must agree:
`),
    query('f(X, X) = f(a, b)', { expect: ['false'] }),
    query('f(X, X) = f(a, Y)', { expect: ['X = a, Y = a'] }),
    query('X = Y, Y = 5', { expect: ['X = 5, Y = 5'] }),
    query('X = 1, X = 2', { expect: ['false'] }),
    md(`
That last query is why Prolog "variables" are not mutable boxes: you can't re-assign \`X\`. You can only learn more about it.

#### Matching inside structures

Unification looks *inside* terms, so you can pull things apart:
`),
    query('person(name(Given, Family), age(A)) = person(name(ada, lovelace), age(36))', {
      expect: ['Given = ada, Family = lovelace, A = 36'],
    }),
    query('[First | Rest] = [1, 2, 3]', { expect: ['First = 1, Rest = [2,3]'] }),
    md(`
The \`[First | Rest]\` pattern splits a list into its head and tail, you'll use it constantly.

#### Three kinds of "equal"

| goal | meaning |
| --- | --- |
| \`A = B\` | try to **unify** A and B (may bind variables) |
| \`A \\= B\` | succeed if A and B **cannot** unify |
| \`A == B\` | succeed if A and B are **already identical** (no binding) |
`),
    query('X == Y', { expect: ['false'] }),
    query('X = Y', { expect: ['X = Y'] }),
    query('a \\= b', { expect: ['true'] }),
    query('f(X) == f(X)', { expect: ['true'] }),
    md(`
#### Unification in rule heads

When Prolog calls a predicate it unifies the goal with each clause head. So heads are patterns. This one-line predicate says "two things are the same":
`),
    program('same(X, X).', { fresh: true, title: 'same.pl' }),
    query('same(a, a)', { expect: ['true'] }),
    query('same(a, b)', { expect: ['false'] }),
    query('same(f(Y), f(1))', { expect: ['Y = 1'] }),
    exercise({
      title: 'Swap a pair',
      prompt: `
Write a **single fact** \`swap/2\` that swaps the two components of a \`pair(A, B)\` term, so that \`swap(pair(1, 2), X)\` gives \`X = pair(2, 1)\`. No body needed, unification does the work.
`,
      starter: '% swap(pair(A, B), ...).\n',
      hint: 'Use the same two variables on both sides, in opposite order.',
      solution: 'swap(pair(A, B), pair(B, A)).',
      tests: [
        { q: 'swap(pair(1, 2), X)', expect: ['X = pair(2,1)'] },
        { q: 'swap(pair(a, b), pair(b, a))', expect: ['true'] },
        { q: 'swap(pair(a, b), pair(a, b))', expect: ['false'] },
        { q: 'swap(X, pair(x, y))', expect: ['X = pair(y,x)'] },
      ],
    }),
  ],
});

export const search = lesson({
  id: 'search',
  part: 'Foundations',
  title: 'Search & backtracking',
  summary: 'How Prolog actually finds answers: depth-first, left-to-right, with undo.',
  blocks: [
    md(`
Prolog answers a query by **searching**:

1. Take the goals **left to right**.
2. For each goal, try the matching clauses **top to bottom**.
3. If a goal fails, **backtrack**: undo the most recent choice and try the next alternative.

This is a depth-first search of a tree of possibilities. Let's watch it happen. Each \`pick/1\` clause announces itself before choosing:
`),
    program(
      `pick(X) :- write('trying red'),   nl, X = red.
pick(X) :- write('trying green'), nl, X = green.
pick(X) :- write('trying blue'),  nl, X = blue.`,
      { fresh: true, title: 'pick.pl' },
    ),
    query('pick(X)'),
    md(`
Asking for *all* solutions makes Prolog visit every clause. Now add a test that rejects some choices:
`),
    query('pick(X), X \\= red'),
    query('pick(X), X == blue'),
    md(`
Each time \`X \\= red\` fails, Prolog **backtracks** into \`pick/1\` and tries the next clause, you can see that in the output. Variable bindings made since that choice are undone.

#### Combinations come from nested backtracking

With two goals, the **later** goal cycles fastest, like an odometer:
`),
    program(
      `colour(red).
colour(green).
colour(blue).
size(small).
size(large).`,
      { title: 'combos' },
    ),
    query('colour(C), size(S)', { max: 10 }),
    md(`
#### Order matters

Because search is depth-first and left-to-right, the **order of clauses and goals** affects both the answers' order and whether the program terminates at all. Here are two definitions of "ancestor", one is broken:
`),
    program(
      `parent(tom, bob).
parent(bob, pat).
parent(pat, jim).

% BROKEN: the recursive call comes first, so it calls itself forever
bad_ancestor(X, Y) :- bad_ancestor(X, Z), parent(Z, Y).
bad_ancestor(X, Y) :- parent(X, Y).

% GOOD: do real work (parent) before recursing
ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).`,
      { fresh: true, title: 'ancestor.pl' },
    ),
    query('ancestor(tom, Who)', { expect: ['Who = bob', 'Who = pat', 'Who = jim'] }),
    query('bad_ancestor(tom, Who)', { error: true }),
    md(`
\`bad_ancestor\` is **left-recursive**: its first goal is a call to itself with exactly the same arguments, so it never makes progress. Prolog keeps stacking up pending calls until it runs out of memory, SWI-Prolog stops it with a *stack limit exceeded* error rather than crashing.

> [!tip] **Rule of thumb:** put the cheap, narrowing goals first and the recursive call last. Base case before recursive case.

> [!note] Prolog's search is *complete* in theory but its depth-first strategy isn't. A solution might exist and still never be found if the search dives down an infinite branch first.
`),
    exercise({
      title: 'A terminating ancestor',
      prompt: `
Write \`ancestor/2\` so that it **terminates** and finds every ancestor, however far up. The \`parent/2\` facts are loaded already.
`,
      setup: `parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).
parent(pat, jim).`,
      starter: `% ancestor(A, D): A is an ancestor of D
ancestor(A, D) :- parent(A, D).
`,
      hint: 'Add a second clause: A is an ancestor of D if A is a parent of some Z and Z is an ancestor of D.',
      solution: `ancestor(A, D) :- parent(A, D).
ancestor(A, D) :- parent(A, Z), ancestor(Z, D).`,
      tests: [
        { q: 'ancestor(tom, jim)', expect: ['true'] },
        { q: 'ancestor(jim, tom)', expect: ['false'] },
        {
          q: 'ancestor(Who, jim)',
          expect: ['Who = pat', 'Who = bob', 'Who = tom'],
          unordered: true,
        },
        {
          q: 'ancestor(bob, Who)',
          expect: ['Who = ann', 'Who = pat', 'Who = jim'],
          unordered: true,
        },
      ],
    }),
  ],
});
