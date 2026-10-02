// Prolog-side runner, loaded once into SWI-Prolog (WASM). It plays the role of a tiny
// toplevel: consults a program into a throw-away module, runs one query, and returns
// everything (answers, printed output, errors, warnings) as a JSON string.
export const HARNESS = String.raw`
:- module(nb, [run/4]).
:- use_module(library(lists)).
:- use_module(library(apply)).

:- dynamic collecting/0.
:- dynamic msg/2.

:- multifile user:message_hook/3.
:- dynamic user:message_hook/3.
user:message_hook(_Term, Kind, Lines) :-
    nb:collecting,
    memberchk(Kind, [error, warning]),
    nb:lines_string(Lines, S),
    assertz(nb:msg(Kind, S)).

lines_string(Lines, S) :-
    with_output_to(string(S0), print_message_lines(current_output, '', Lines)),
    split_string(S0, "", "\n ", [S]).

error_string(error(resource_error(R), _), S) :-
    !,
    (   R == stack
    ->  S = "Stack limit exceeded: the recursion is too deep or never ends. Check that every recursive call makes progress and that the base case comes first."
    ;   format(string(S), "Resource error: ~w exhausted.", [R])
    ).
error_string(E, S) :-
    (   catch('$messages':translate_message(E, Lines, []), _, fail)
    ->  lines_string(Lines, S)
    ;   format(string(S), "~q", [E])
    ).

%% run(+Program, +Query, +Max, -Json)
run(Prog, Query, Max, Json) :-
    flag(nb_counter, N, N+1),
    format(atom(Mod), 'nb_~d', [N]),
    load_program(Mod, Prog, LoadOut),
    findall(K-M, retract(msg(K, M)), Msgs),
    (   string_length(Query, 0)
    ->  Out = LoadOut, Status = loaded, Answers = [], More = false
    ;   exec_query(Mod, Query, Max, QOut, Status, Answers, More),
        string_concat(LoadOut, QOut, Out)
    ),
    json_result(Status, Out, Answers, More, Msgs, Json).

load_program(Mod, Prog, Out) :-
    (   string_length(Prog, 0)
    ->  Out = ""
    ;   assertz(collecting),
        catch(unload_file(program), _, true),
        with_output_to(string(Out),
            catch(( open_string(Prog, S),
                    setup_call_cleanup(true,
                        Mod:load_files(program, [stream(S), silent(true)]),
                        close(S)) ),
                  E, ( error_string(E, ES), assertz(msg(error, ES)) ))),
        retractall(collecting)
    ).

exec_query(Mod, Text, Max, Out, Status, Answers, More) :-
    (   catch(term_string(Goal, Text, [variable_names(Bs), module(Mod)]), E,
              ( error_string(E, ES), Status = syntax(ES) ))
    ->  true
    ;   Status = syntax("Could not read the query.")
    ),
    (   nonvar(Status)
    ->  Out = "", Answers = [], More = false
    ;   Max1 is Max + 1,
        nb_setval(nb_sols, []),
        nb_setval(nb_cnt, 0),
        with_output_to(string(Out),
            catch(( call_with_inference_limit(nb:collect(Max1, Bs, Mod:Goal), 12000000, R),
                    (   R == inference_limit_exceeded -> Status = limit ; Status = ok ) ),
                  E2, Status = error(E2))),
        nb_getval(nb_sols, Rev),
        reverse(Rev, Sols1),
        length(Sols1, Len),
        (   Len > Max -> More = true, length(Keep, Max), append(Keep, _, Sols1) ; More = false, Keep = Sols1 ),
        maplist(fmt_solution(Mod), Keep, Answers)
    ).

%  Failure-driven loop: record each solution as it is found, so that answers found
%  before an infinite loop (or the inference limit) are still reported.
collect(Max1, Bs, G) :-
    call(G),
    copy_term(Bs, Bs1, Gs),
    nb_getval(nb_sols, L0),
    nb_setval(nb_sols, [s(Bs1, Gs)|L0]),
    nb_getval(nb_cnt, C0), C is C0 + 1, nb_setval(nb_cnt, C),
    C >= Max1,
    !.
collect(_, _, _).

%%  Format one solution the way the SWI-Prolog toplevel does (roughly).
fmt_solution(Mod, Sol, Str) :-
    findall(S, fmt_solution_(Mod, Sol, S), [Str]),
    !.
fmt_solution(_, _, "true").

fmt_solution_(Mod, s(Bs1, Gs0), Str) :-
    exclude(hidden_binding, Bs1, Vis),
    partition(var_binding, Vis, VarBs, ValBs),
    group_aliases(VarBs, Groups),
    findall(L, ( member(G, Groups), G = [_,_|_], alias_chain(G, L) ), AliasLines),
    maplist(name_var, VarBs),
    term_variables(ValBs-Gs0, Rest),
    name_anonymous(Rest, ValBs-Gs0),
    findall(L, ( member(N=V, ValBs), fmt_binding(Mod, N, V, L) ), BLines),
    findall(L, ( member(G0, Gs0), strip_module(G0, _, G), fmt_term(Mod, G, 999, L) ), GLines),
    append([AliasLines, BLines, GLines], Lines),
    (   Lines == [] -> Str = "true" ; atomic_list_concat(Lines, ', ', A), atom_string(A, Str) ).

hidden_binding(N=_) :- sub_atom(N, 0, 1, _, '_').
var_binding(_=V) :- var(V).

group_aliases([], []).
group_aliases([N=V|T], [[N|Ns]|Gs]) :-
    partition(same_var(V), T, Same, Other),
    maplist(binding_name, Same, Ns),
    group_aliases(Other, Gs).

same_var(V, _=V2) :- V2 == V.
binding_name(N=_, N).

alias_chain(Names, Line) :-
    findall(S, ( append(_, [A,B|_], Names), format(string(S), "~w = ~w", [A, B]) ), Parts),
    atomic_list_concat(Parts, ', ', A1), atom_string(A1, Line).

name_var(N=V) :- ( var(V) -> V = '$VAR'(N) ; true ).

name_anonymous(Vars, Term) :-
    nb_count(Vars, Term, 0).

nb_count([], _, _).
nb_count([V|Vs], Term, I) :-
    occurrences_of_var(V, Term, Cnt),
    (   Cnt =:= 1
    ->  V = '$VAR'('_'), I1 = I
    ;   var_label(I, Label), atom_concat('_', Label, Name), V = '$VAR'(Name), I1 is I + 1
    ),
    nb_count(Vs, Term, I1).

var_label(I, L) :-
    C is 0'A + I mod 26, Rep is I // 26,
    char_code(Ch, C),
    (   Rep =:= 0 -> L = Ch ; atom_concat(Ch, Rep, L) ).

fmt_binding(Mod, N, V, Line) :-
    fmt_term(Mod, V, 699, VS),
    format(string(Line), "~w = ~w", [N, VS]).

fmt_term(Mod, T, Prio, S) :-
    with_output_to(string(S0),
        write_term(T, [quoted(true), numbervars(true), portray(true), spacing(next_argument),
                       priority(Prio), max_depth(100), module(Mod)])),
    S = S0.

%% JSON encoding (no library available in the WASM image)
json_result(Status, Out, Answers, More, Msgs, Json) :-
    status_error(Status, Kind, Err),
    maplist(json_str, Answers, AJ), atomic_list_concat(AJ, ',', AS),
    findall(MJ, ( member(K-M, Msgs), json_str(M, MS), format(atom(MJ), '{"kind":"~w","text":~w}', [K, MS]) ), MJs),
    atomic_list_concat(MJs, ',', MsgS),
    json_str(Out, OutS), json_str(Err, ErrS),
    format(string(Json), '{"status":"~w","error":~w,"output":~w,"answers":[~w],"more":~w,"messages":[~w]}',
           [Kind, ErrS, OutS, AS, More, MsgS]),
    Kind = Kind.

status_error(loaded, loaded, "").
status_error(ok, ok, "").
status_error(limit, limit, "").
status_error(syntax(S), syntax, S).
status_error(error(E), error, S) :- error_string(E, S).

json_str(S0, J) :-
    (   string(S0) -> S = S0 ; format(string(S), "~w", [S0]) ),
    string_codes(S, Cs),
    phrase(json_chars(Cs), Out),
    string_codes(Body, Out),
    string_concat("\"", Body, T1), string_concat(T1, "\"", J).

json_chars([]) --> [].
json_chars([C|T]) --> json_char(C), json_chars(T).
json_char(0'") --> !, "\\\"".
json_char(0'\\) --> !, "\\\\".
json_char(10) --> !, "\\n".
json_char(13) --> !, "\\r".
json_char(9) --> !, "\\t".
json_char(C) --> { C < 32 }, !, { H1 is C // 16, H2 is C mod 16, code_type(D1, xdigit(H1)), code_type(D2, xdigit(H2)) },
    [0'\\, 0'u, 0'0, 0'0, D1, D2].
json_char(C) --> [C].
`;
