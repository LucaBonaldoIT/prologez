// Prolog-side stepper: an explicit resolution machine written in Prolog. It solves a query one
// resolution step at a time (selected goal, clause used, unifier, new resolvent, substitution) and
// records every step, including cuts, failures and backtracking, as JSON for the UI.
//
// User predicates are resolved clause by clause. Built-ins and library predicates are solved in
// one atomic step; control constructs (, ; -> \+ ! call/N once/1) are handled by the machine.
export const STEPPER = String.raw`
:- module(nbstep, [trace_run/5]).
:- use_module(library(lists)).
:- use_module(library(apply)).

%% trace_run(+Program, +Query, +MaxSolutions, +MaxSteps, -Json)
trace_run(Prog, Text, MaxSols, MaxSteps, Json) :-
    flag(nb_counter, N, N+1),
    format(atom(Mod), 'nbs_~d', [N]),
    nb:load_program(Mod, Prog, _),
    findall(K-M, retract(nb:msg(K, M)), Msgs),
    (   memberchk(error-LoadErr, Msgs)
    ->  result_json(error, LoadErr, [], false, Json)
    ;   catch(term_string(Goal, Text, [variable_names(Bs), module(Mod)]), E,
              ( nb:error_string(E, ES), Err = syntax(ES) )),
        (   nonvar(Err)
        ->  Err = syntax(Msg), result_json(syntax, Msg, [], false, Json)
        ;   nonvar(Goal)
        ->  run_machine(Mod, Goal, Bs, MaxSols, MaxSteps, Json)
        ;   result_json(syntax, "Could not read the query.", [], false, Json)
        )
    ).

run_machine(Mod, Goal, Bs, MaxSols, MaxSteps, Json) :-
    nb_setval(nbs_steps, []),
    nb_setval(nbs_n, 0),
    nb_setval(nbs_vc, 0),
    nb_setval(nbs_trunc, false),
    nb_setval(nbs_lim, false),
    nb_setval(nbs_max, MaxSteps),
    query_names(Bs, Ns0),
    Ctx = ctx(Mod, MaxSols, MaxSteps),
    catch(
        call_with_inference_limit(
            catch(loop(st([Goal], Bs, Ns0), [], Ctx, 0), done, true), 4000000, R),
        Err, ( step_error(Err, Ctx, Bs, Ns0) )),
    (   R == inference_limit_exceeded
    ->  nb_setval(nbs_trunc, true)
    ;   true
    ),
    nb_getval(nbs_steps, Rev), reverse(Rev, Steps),
    nb_getval(nbs_trunc, Trunc),
    result_json(ok, "", Steps, Trunc, Json).

query_names([], []).
query_names([N=V|T], Ns) :-
    query_names(T, Ns1),
    (   var(V), \+ memberchk_eq(V-_, Ns1) -> Ns = [V-N|Ns1] ; Ns = Ns1 ).

step_error(Err, _Ctx, Bs, Ns) :-
    nb:error_string(Err, S),
    emit(st([], Bs, Ns), error, S, '', '', '', ''),
    true.

%% ---------------------------------------------------------------- the machine

loop(st([], Qs, Ns), Stack, Ctx, Sols) :-
    !,
    Sols1 is Sols + 1,
    Ctx = ctx(_, MaxSols, _),
    emit(st([], Qs, Ns), solution, "Solution found: the resolvent is empty.", '', '', '', ''),
    (   Sols1 >= MaxSols
    ->  true
    ;   backtrack(Stack, Ctx, Sols1)
    ).
loop(st([G|Rest], Qs, Ns), Stack, Ctx, Sols) :-
    step(G, Rest, Qs, Ns, Stack, Ctx, Sols).

step(G, Rest, Qs, Ns, Stack, Ctx, Sols) :-
    var(G), !,
    emit(st([G|Rest], Qs, Ns), error,
         "A variable used as a goal is an instantiation error.", '', '', '', ''),
    throw(done), Stack = Stack, Ctx = Ctx, Sols = Sols.
step(true, Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    loop(st(Rest, Qs, Ns), Stack, Ctx, Sols).
step((A, B), Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    loop(st([A, B|Rest], Qs, Ns), Stack, Ctx, Sols).
step('$cut'(H), Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    cut_to(H, Stack, Stack1, Removed),
    St1 = st(Rest, Qs, Ns),
    (   Removed > 0
    ->  format(string(T), "Cut: the ~d pending choicepoint(s) are discarded, so those alternatives will never be tried.", [Removed]),
        emit(St1, cut, T, '', '', '', '')
    ;   emit(St1, cut, "Cut: there was nothing left to discard, the computation continues.", '', '', '', '')
    ),
    loop(St1, Stack1, Ctx, Sols).
step(!, Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    step('$cut'(0), Rest, Qs, Ns, Stack, Ctx, Sols).
step((C -> T ; E), Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    ite(C, T, E, "If-then-else: try the condition first. If it succeeds, commit to it and run the then-branch; otherwise the else-branch runs.",
        Rest, Qs, Ns, Stack, Ctx, Sols).
step((C -> T), Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    ite(C, T, fail, "If-then (no else): try the condition; if it succeeds, commit to it and run the then-branch, otherwise the goal fails.",
        Rest, Qs, Ns, Stack, Ctx, Sols).
step((A ; B), Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    Alt = st([B|Rest], Qs, Ns),
    copy_term(Alt, AltC),
    St1 = st([A|Rest], Qs, Ns),
    emit(St1, control, "Disjunction: try the left branch first; the right branch is saved as a choicepoint.", '', '', '', ''),
    loop(St1, [cp(AltC, goals, [])|Stack], Ctx, Sols).
step(\+ G, Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    ite(G, fail, true, "Negation as failure: try the goal. If it succeeds, \\+ fails; if it fails, \\+ succeeds (and no bindings are kept).",
        Rest, Qs, Ns, Stack, Ctx, Sols).
step(once(G), Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    ite(G, true, fail, "once/1: solve the goal and keep only its first solution (an implicit cut).",
        Rest, Qs, Ns, Stack, Ctx, Sols).
step(ignore(G), Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    ite(G, true, true, "ignore/1: solve the goal once; whether it succeeds or fails, ignore/1 succeeds.",
        Rest, Qs, Ns, Stack, Ctx, Sols).
step(G, Rest, Qs, Ns, Stack, Ctx, Sols) :-
    compound(G), G =.. [call, G0|Extra], !,
    (   Extra == []
    ->  G1 = G0
    ;   (   callable(G0)
        ->  G0 =.. L0, append(L0, Extra, L1), G1 =.. L1
        ;   G1 = G0
        )
    ),
    length(Stack, H),
    (   callable(G1) -> cut_body(G1, H, G2) ; G2 = G1 ),
    loop(st([G2|Rest], Qs, Ns), Stack, Ctx, Sols).
step(G, Rest, Qs, Ns, Stack, Ctx, Sols) :-
    compound(G), G = _:_, !,
    builtin_step(G, Rest, Qs, Ns, Stack, Ctx, Sols).
step(G, Rest, Qs, Ns, Stack, Ctx, Sols) :-
    Ctx = ctx(Mod, _, _),
    user_defined(Mod, G), !,
    functor(G, Nm, Ar), functor(H0, Nm, Ar),
    findall(H0-B, clause(Mod:H0, B), Cands),
    try_clauses(G, Cands, Rest, Qs, Ns, Stack, Ctx, Sols).
step(G, Rest, Qs, Ns, Stack, Ctx, Sols) :-
    callable(G), functor(G, Nm, Ar), functor(H0, Nm, Ar),
    findall(H0-B, lib(H0, B), Cands),
    Cands \== [], !,
    try_clauses(G, Cands, Rest, Qs, Ns, Stack, Ctx, Sols).
step(G, Rest, Qs, Ns, Stack, Ctx, Sols) :-
    builtin_step(G, Rest, Qs, Ns, Stack, Ctx, Sols).

user_defined(Mod, G) :-
    callable(G),
    \+ predicate_property(Mod:G, built_in),
    predicate_property(Mod:G, defined),
    \+ predicate_property(Mod:G, imported_from(_)),
    (   predicate_property(Mod:G, number_of_clauses(_))
    ;   predicate_property(Mod:G, dynamic)
    ), !.

ite(C, T, E, Title, Rest, Qs, Ns, Stack, Ctx, Sols) :-
    length(Stack, H),
    Else = st([E|Rest], Qs, Ns),
    copy_term(Else, ElseC),
    St1 = st([C, '$cut'(H), T|Rest], Qs, Ns),
    emit(St1, control, Title, '', '', '', ''),
    loop(St1, [cp(ElseC, goals, [])|Stack], Ctx, Sols).

%% a few list predicates, defined as plain clauses so that the stepper can go inside them
%% (a program that defines its own version of one of them takes precedence)
lib(member(X, [X|_]), true).
lib(member(X, [_|T]), member(X, T)).
lib(append([], L, L), true).
lib(append([H|T], L, [H|R]), append(T, L, R)).
lib(select(X, [X|T], T), true).
lib(select(X, [H|T], [H|R]), select(X, T, R)).
lib(reverse(L, R), reverse_(L, [], R)).
lib(reverse_([], A, A), true).
lib(reverse_([H|T], A, R), reverse_(T, [H|A], R)).
lib(permutation([], []), true).
lib(permutation(L, [H|T]), (select(H, L, R), permutation(R, T))).
lib(maplist(_, []), true).
lib(maplist(G, [X|Xs]), (call(G, X), maplist(G, Xs))).
lib(maplist(_, [], []), true).
lib(maplist(G, [X|Xs], [Y|Ys]), (call(G, X, Y), maplist(G, Xs, Ys))).
lib(maplist(_, [], [], []), true).
lib(maplist(G, [X|Xs], [Y|Ys], [Z|Zs]), (call(G, X, Y, Z), maplist(G, Xs, Ys, Zs))).

%% ---- user predicates: one clause per step

try_clauses(G, [], Rest, Qs, Ns, Stack, Ctx, Sols) :- !,
    show(G, Ns, GS),
    format(string(T), "No clause head unifies with ~w: this goal fails.", [GS]),
    emit(st([G|Rest], Qs, Ns), fail, T, GS, '', '', ''),
    backtrack(Stack, Ctx, Sols).
try_clauses(G, [H-B|More], Rest, Qs, Ns, Stack, Ctx, Sols) :-
    (   unifiable(G, H, U)
    ->  include(can_unify(G), More, Alts),
        length(Stack, Hbar),
        (   Alts == []
        ->  Stack1 = Stack
        ;   copy_term(st([G|Rest], Qs, Ns)-Alts, StC-AltsC),
            Stack1 = [cp(StC, clauses, AltsC)|Stack]
        ),
        name_new(H-B, Ns, Ns1),
        show(G, Ns1, GS),
        show_clause(H, B, Ns1, CS),
        show_unifier(U, Ns1, US),
        G = H,
        cut_body(B, Hbar, B1),
        body_goals(B1, Gs),
        append(Gs, Rest, Goals),
        St1 = st(Goals, Qs, Ns1),
        (   Alts == []
        ->  Note = ""
        ;   length(Alts, NA),
            format(string(Note), " ~d other matching clause(s) are saved as a choicepoint.", [NA])
        ),
        format(string(T), "Resolve ~w with a clause whose head unifies with it.~w", [GS, Note]),
        emit(St1, call, T, GS, CS, US, ''),
        loop(St1, Stack1, Ctx, Sols)
    ;   try_clauses(G, More, Rest, Qs, Ns, Stack, Ctx, Sols)
    ).

can_unify(G, H-_) :- unifiable(G, H, _).

%% ---- built-ins and library predicates: one atomic step

builtin_step(G, Rest, Qs, Ns, Stack, Ctx, Sols) :-
    Ctx = ctx(Mod, _, _),
    show(G, Ns, GS),
    catch(
        ( with_output_to(string(Out), once(findnsols(20, G, Mod:G, SolsL))) ),
        E,
        ( nb:error_string(E, ES),
          format(string(T), "Error while solving ~w: ~w", [GS, ES]),
          emit(st([G|Rest], Qs, Ns), error, T, GS, '', '', ''),
          throw(done) )),
    (   SolsL == []
    ->  format(string(T), "The built-in ~w fails.", [GS]),
        emit(st([G|Rest], Qs, Ns), fail, T, GS, '', '', Out),
        backtrack(Stack, Ctx, Sols)
    ;   SolsL = [Sol|More],
        unifiable(G, Sol, U),
        (   More == []
        ->  Stack1 = Stack
        ;   copy_term(st([G|Rest], Qs, Ns)-More, StC-MoreC),
            Stack1 = [cp(StC, solutions, MoreC)|Stack]
        ),
        show_unifier(U, Ns, US),
        G = Sol,
        St1 = st(Rest, Qs, Ns),
        (   More == []
        ->  Note = ""
        ;   length(More, NM),
            format(string(Note), " ~d more solution(s) are saved as a choicepoint.", [NM])
        ),
        (   length(SolsL, 20) -> LimNote = " Only the first 20 solutions are tracked.", nb_setval(nbs_lim, true) ; LimNote = "" ),
        format(string(T), "Solve the built-in ~w in a single step.~w~w", [GS, Note, LimNote]),
        emit(St1, builtin, T, GS, '', US, Out),
        loop(St1, Stack1, Ctx, Sols)
    ).

%% ---- backtracking

backtrack([], _, _) :-
    (   nb_getval(nbs_lim, true)
    ->  T = "End of the trace: nothing is left to backtrack to. (A built-in with more than 20 solutions was cut short here, so solutions beyond those may exist.)"
    ;   T = "No more solutions: there is nothing left to backtrack to."
    ),
    emit(st([], [], []), end, T, '', '', '', ''),
    !.
backtrack([cp(St0, Kind, Alts)|Stack], Ctx, Sols) :-
    St0 = st(Goals, Qs, Ns),
    Goals = [G|Rest],
    (   Kind == goals
    ->  show(G, Ns, GS),
        format(string(T), "Backtrack to the last choicepoint and take the saved alternative: ~w.", [GS]),
        emit(St0, backtrack, T, GS, '', '', ''),
        loop(St0, Stack, Ctx, Sols)
    ;   Kind == clauses
    ->  show(G, Ns, GS),
        format(string(T), "Backtrack to the last choicepoint and retry ~w with the next clause.", [GS]),
        emit(St0, backtrack, T, GS, '', '', ''),
        try_clauses(G, Alts, Rest, Qs, Ns, Stack, Ctx, Sols)
    ;   Alts = [Sol|More],
        show(G, Ns, GS),
        format(string(T), "Backtrack to the last choicepoint and take the next solution of ~w.", [GS]),
        emit(St0, backtrack, T, GS, '', '', ''),
        unifiable(G, Sol, U),
        show_unifier(U, Ns, US),
        (   More == []
        ->  Stack1 = Stack
        ;   copy_term(st(Goals, Qs, Ns)-More, StC-MoreC),
            Stack1 = [cp(StC, solutions, MoreC)|Stack]
        ),
        G = Sol,
        St1 = st(Rest, Qs, Ns),
        format(string(T2), "Solve the built-in ~w with its next solution.", [GS]),
        emit(St1, builtin, T2, GS, '', US, ''),
        loop(St1, Stack1, Ctx, Sols)
    ).

cut_to(H, Stack, Stack1, Removed) :-
    length(Stack, L),
    (   L =< H
    ->  Stack1 = Stack, Removed = 0
    ;   Removed is L - H,
        length(Drop, Removed),
        append(Drop, Stack1, Stack)
    ).

%% cut inside a clause body cuts back to the height of the stack at clause entry
cut_body(V, _, V) :- var(V), !.
cut_body(!, H, '$cut'(H)) :- !.
cut_body((A, B), H, (A1, B1)) :- !, cut_body(A, H, A1), cut_body(B, H, B1).
cut_body((A ; B), H, (A1 ; B1)) :- !, cut_body(A, H, A1), cut_body(B, H, B1).
cut_body((A -> B), H, (A1 -> B1)) :- !, cut_body(A, H, A1), cut_body(B, H, B1).
cut_body(G, _, G).

body_goals(true, []) :- !.
body_goals((A, B), Gs) :- !, body_goals(A, GA), body_goals(B, GB), append(GA, GB, Gs).
body_goals(G, [G]).

%% ---------------------------------------------------------------- naming and printing

%% give every variable of Term that has no name yet a fresh name _1, _2, ...
name_new(Term, Ns0, Ns) :-
    term_variables(Term, Vs),
    foldl(name_one, Vs, Ns0, Ns).
name_one(V, Ns, Ns) :- memberchk_eq(V-_, Ns), !.
name_one(V, Ns, Ns1) :-
    nb_getval(nbs_vc, C), C1 is C + 1, nb_setval(nbs_vc, C1),
    format(atom(Name), '_~d', [C1]),
    append(Ns, [V-Name], Ns1).

memberchk_eq(V-N, [V0-N0|T]) :-
    (   V == V0 -> N = N0 ; memberchk_eq(V-N, T) ).

bind_names([]).
bind_names([V-N|T]) :- ( var(V) -> V = '$VAR'(N) ; true ), bind_names(T).

bind_rest(T) :-
    term_variables(T, Vs),
    bind_rest_(Vs, 0).
bind_rest_([], _).
bind_rest_([V|Vs], I) :-
    nb:var_label(I, L), atom_concat('_', L, Name), V = '$VAR'(Name),
    I1 is I + 1, bind_rest_(Vs, I1).

display_goal(G0, G) :-
    (   nonvar(G0), G0 = '$cut'(_) -> G = ! ; G = G0 ).

show(T0, Ns, S) :-
    display_goal(T0, T),
    with_output_to(string(S),
        \+ \+ ( bind_names(Ns), bind_rest(T),
                write_term(T, [quoted(true), numbervars(true), spacing(next_argument),
                               priority(999), max_depth(40)]) )).

show_n(Ns, G, S) :- show(G, Ns, S).

show_clause(H, true, Ns, S) :- !, show(H, Ns, S).
show_clause(H, B, Ns, S) :-
    show(H, Ns, HS),
    body_goals(B, Gs),
    maplist(show_n(Ns), Gs, GSs),
    atomic_list_concat(GSs, ', ', BS),
    format(string(S), "~w :- ~w", [HS, BS]).

show_unifier(U, Ns, S) :-
    maplist(show_binding(Ns), U, Parts),
    (   Parts == []
    ->  S = "{}"
    ;   atomic_list_concat(Parts, ', ', Inner), format(string(S), "{~w}", [Inner])
    ).
show_binding(Ns, V=T, S) :-
    show(V, Ns, VS), show(T, Ns, TS),
    format(string(S), "~w/~w", [VS, TS]).

%% ---------------------------------------------------------------- recording steps

emit(st(Goals, Qs, Ns), Kind, Title, GoalS, ClauseS, UnifS, Out) :-
    nb_getval(nbs_n, N0), N is N0 + 1, nb_setval(nbs_n, N),
    maplist(show_n(Ns), Goals, Resolvent),
    subst_strings(Qs, Ns, Subst),
    to_str(Title, TitleS), to_str(GoalS, GoalStr), to_str(ClauseS, ClauseStr),
    to_str(UnifS, UnifStr), to_str(Out, OutStr),
    nb_getval(nbs_steps, L0),
    nb_setval(nbs_steps, [step(N, Kind, TitleS, GoalStr, ClauseStr, UnifStr, Resolvent, Subst, OutStr)|L0]),
    step_limit(N).

step_limit(N) :-
    (   nb_getval(nbs_max, Max), N >= Max
    ->  nb_setval(nbs_trunc, true), throw(done)
    ;   true
    ).

to_str(X, S) :- ( string(X) -> S = X ; atom(X) -> atom_string(X, S) ; format(string(S), "~w", [X]) ).

subst_strings(Qs, Ns, Subst) :-
    findall(N-VS, ( member(N=V, Qs), var_value(N, V, Ns, VS) ), Subst).
var_value(N, V, Ns, VS) :-
    (   var(V)
    ->  show(V, Ns, S),
        (   atom_string(N, S) -> VS = "" ; VS = S )
    ;   show(V, Ns, VS)
    ).

%% ---------------------------------------------------------------- JSON

result_json(Status, Err, Steps, Trunc, Json) :-
    nb:json_str(Err, ErrS),
    maplist(step_json, Steps, SJs), atomic_list_concat(SJs, ',', StepsS),
    format(string(Json), '{"status":"~w","error":~w,"steps":[~w],"truncated":~w}',
           [Status, ErrS, StepsS, Trunc]).

step_json(step(N, Kind, Title, Goal, Clause, Unif, Resolvent, Subst, Out), J) :-
    nb:json_str(Title, TS), nb:json_str(Goal, GS), nb:json_str(Clause, CS),
    nb:json_str(Unif, US), nb:json_str(Out, OS),
    maplist(nb:json_str, Resolvent, RJs), atomic_list_concat(RJs, ',', RS),
    findall(P, ( member(Nm-Val, Subst), nb:json_str(Nm, NS), nb:json_str(Val, VS),
                 format(string(P), '[~w,~w]', [NS, VS]) ), Ps),
    atomic_list_concat(Ps, ',', SS),
    format(string(J),
        '{"n":~d,"kind":"~w","title":~w,"goal":~w,"clause":~w,"unifier":~w,"resolvent":[~w],"subst":[~w],"out":~w}',
        [N, Kind, TS, GS, CS, US, RS, SS, OS]).
`;
