import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  StreamLanguage,
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  indentOnInput,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';

const BUILTINS = new Set(
  (
    'is write writeln print nl format findall bagof setof aggregate_all forall assert asserta assertz retract retractall ' +
    'member append length reverse msort sort predsort nth0 nth1 last sum_list max_list min_list numlist between succ plus ' +
    'atom_chars atom_codes atom_length atom_concat sub_atom atom_number number_codes char_code upcase_atom ' +
    'maplist foldl include exclude partition call once ignore catch throw functor arg copy_term var nonvar atom number ' +
    'integer float atomic compound callable is_list ground phrase clause listing dynamic discontiguous use_module ' +
    'initialization table op halt true fail false not select permutation delete subtract exclude string_concat ' +
    'string_chars string_codes string_to_atom split_string sumlist list_to_set nb_setval nb_getval tab'
  ).split(' '),
);

/** A compact Prolog tokenizer for CodeMirror's StreamLanguage. */
const prolog = {
  name: 'prolog',
  startState: () => ({ block: false }),
  token(stream, state) {
    if (state.block) {
      if (stream.match(/^.*?\*\//)) state.block = false;
      else stream.skipToEnd();
      return 'comment';
    }
    if (stream.eatSpace()) return null;
    if (stream.match('/*')) {
      state.block = true;
      if (stream.match(/^.*?\*\//)) state.block = false;
      else stream.skipToEnd();
      return 'comment';
    }
    if (stream.peek() === '%') {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string';
    if (stream.match(/^'(?:[^'\\]|\\.)*'?/)) return 'atom';
    if (
      stream.match(/^0'(?:\\.|.)/) ||
      stream.match(/^0x[0-9a-fA-F]+/) ||
      stream.match(/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/)
    )
      return 'number';
    if (stream.match(/^[A-Z_][A-Za-z0-9_]*/)) return 'variableName';
    if (stream.match(/^[a-z][A-Za-z0-9_]*/)) {
      const w = stream.current();
      return BUILTINS.has(w) && stream.peek() !== ':' ? 'keyword' : 'atom';
    }
    if (
      stream.match(
        /^(?::-|-->|\?-|->|\*->|=\.\.|\\\+|\\==|\\=@=|=@=|=:=|=\\=|==|\\=|=<|>=|@<|@>|@=<|@>=|>>|\*\*|[-+*\/<>=^~#@&|;!]+)/,
      )
    )
      return 'operator';
    stream.next();
    return 'punctuation';
  },
  languageData: { commentTokens: { line: '%', block: { open: '/*', close: '*/' } } },
  tokenTable: {
    comment: t.comment,
    string: t.string,
    atom: t.atom,
    number: t.number,
    variableName: t.variableName,
    keyword: t.standard(t.variableName),
    operator: t.operator,
    punctuation: t.punctuation,
  },
};

const highlight = HighlightStyle.define([
  { tag: t.comment, color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: t.variableName, color: 'var(--syn-var)' },
  { tag: t.atom, color: 'var(--syn-atom)' },
  { tag: t.number, color: 'var(--syn-number)' },
  { tag: t.string, color: 'var(--syn-string)' },
  { tag: t.operator, color: 'var(--syn-op)' },
  {
    tag: [t.standard(t.variableName), t.special(t.variableName), t.meta],
    color: 'var(--syn-builtin)',
  },
  { tag: t.bracket, color: 'var(--syn-bracket)' },
]);

const theme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--ink)', fontSize: '14px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': {
    fontFamily: 'var(--mono)',
    padding: '10px 0',
    caretColor: 'var(--accent)',
  },
  '.cm-line': { padding: '0 14px' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6', overflowX: 'auto' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--muted)',
    border: 'none',
    paddingLeft: '4px',
  },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--accent-soft) !important',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--accent-soft)',
    outline: '1px solid var(--accent)',
  },
  '.cm-placeholder': { color: 'var(--muted)' },
});

/**
 * @param {HTMLElement} parent
 * @param {{doc:string,onChange?:(s:string)=>void,onRun?:()=>void,numbers?:boolean,placeholder?:string,enterRuns?:boolean}} o
 */
export function createEditor(parent, o) {
  const run = () => {
    o.onRun?.();
    return true;
  };
  const keys = [{ key: 'Mod-Enter', run }];
  if (o.enterRuns) keys.push({ key: 'Enter', run });
  const extensions = [
    keymap.of(keys),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    StreamLanguage.define(prolog),
    syntaxHighlighting(highlight),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({
      autocapitalize: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      'aria-label': o.label || 'Prolog code',
    }),
    theme,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) o.onChange?.(u.state.doc.toString());
    }),
  ];
  if (o.numbers) extensions.push(lineNumbers());
  if (o.placeholder) extensions.push(cmPlaceholder(o.placeholder));
  const view = new EditorView({ parent, state: EditorState.create({ doc: o.doc, extensions }) });
  return {
    view,
    get: () => view.state.doc.toString(),
    set: (text) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
    focus: () => view.focus(),
  };
}
