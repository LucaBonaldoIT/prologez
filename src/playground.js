import { program, query } from './lessons/dsl.js';

export const examples = [
  {
    name: 'Family tree',
    blocks: () => [
      program(
        `parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).

ancestor(A, D) :- parent(A, D).
ancestor(A, D) :- parent(A, X), ancestor(X, D).`,
        { title: 'family.pl' },
      ),
      query('ancestor(tom, Who)'),
    ],
  },
  {
    name: 'Lists',
    blocks: () => [
      program(
        `% my own list predicates
my_length([], 0).
my_length([_|T], N) :- my_length(T, M), N is M + 1.

my_reverse(L, R) :- rev(L, [], R).
rev([], Acc, Acc).
rev([H|T], Acc, R) :- rev(T, [H|Acc], R).`,
        { title: 'lists.pl' },
      ),
      query('my_reverse([a,b,c,d], R)'),
      query('my_length(L, 2)'),
    ],
  },
  {
    name: 'Puzzle',
    blocks: () => [
      program(
        `% Three friends own a cat, a dog and a fish.
% Ann doesn't own the cat. Bo owns neither the dog nor the cat.
solve(Pairs) :-
    Pairs = [ann-A, bo-B, cy-C],
    permutation([cat, dog, fish], [A, B, C]),
    A \\= cat,
    B \\= dog, B \\= cat.`,
        { title: 'puzzle.pl' },
      ),
      query('solve(P)'),
    ],
  },
  {
    name: 'Grammar (DCG)',
    blocks: () => [
      program(
        `sentence --> noun_phrase, verb_phrase.
noun_phrase --> [the], noun.
verb_phrase --> verb, noun_phrase.
noun --> [cat] ; [dog] ; [bird].
verb --> [sees] ; [chases].`,
        { title: 'grammar.pl' },
      ),
      query('phrase(sentence, [the, cat, chases, the, dog])'),
      query('phrase(sentence, S)', { max: 6 }),
    ],
  },
  {
    name: 'CLP(FD)',
    blocks: () => [
      program(
        `:- use_module(library(clpfd)).

% SEND + MORE = MONEY
puzzle([S,E,N,D] + [M,O,R,E] = [M,O,N,E,Y]) :-
    Vars = [S,E,N,D,M,O,R,Y],
    Vars ins 0..9,
    all_different(Vars),
    S*1000 + E*100 + N*10 + D + M*1000 + O*100 + R*10 + E #=
    M*10000 + O*1000 + N*100 + E*10 + Y,
    M #\\= 0, S #\\= 0,
    label(Vars).`,
        { title: 'money.pl' },
      ),
      query('puzzle(P)'),
    ],
  },
  {
    name: 'Blank',
    blocks: () => [program('% write your program here\n', { title: 'scratch.pl' }), query('')],
  },
];
