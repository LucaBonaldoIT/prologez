// Text of the About page (shared with the static prerenderer).
export const NOTES = `
### What is covered

Besides the core language, the lessons cover logic programming in depth: the **syntax and execution model**, **resolution and unification** (resolvents, substitutions, most general unifiers), **Peano arithmetic** and data types programmed from scratch, **full relationality**, **tail recursion and immutability**, **searching the solution space**, **cut**, **term inspection**, **operators and DSLs**, **dynamic theories** and every **metainterpreter** variant (resolution, vanilla, built-ins and control, reverse order, tracing with a size bound), and a hands-on **constraint programming** lesson. Programs whose names clash with built-ins of other systems may differ slightly from other environments; the lessons say so where it matters.

### About the author

PrologEZ is created by **Luca Bonaldo**. Find more of his work, projects and writing on his website, [lucabonaldo.dev](https://lucabonaldo.dev/), and on [GitHub](https://github.com/LucaBonaldoIT). The source code, issues and contributions for PrologEZ live in the [GitHub repository](https://github.com/LucaBonaldoIT/prologez).

### What runs your code

Every cell executes on **SWI-Prolog 9**, compiled to WebAssembly and running in a background thread of your browser. Nothing is sent to a server. The first run takes a moment while the engine loads (about 4 MB, cached afterwards).

### How cells work

- A **program** cell adds clauses to a knowledge base. Press **Load** to check it for errors.
- A **query** cell runs against *all program cells above it* in the lesson. Use **Ctrl/⌘ + Enter** to run, or **Enter** in a query box.
- Every run starts from a clean slate: the program is loaded fresh, the query runs once, and anything it asserted is forgotten afterwards.
- Up to ten solutions are shown per query. Ask for more specific ones, or use \`findall/3\`.
- Runaway queries (infinite loops, endless recursion) are stopped automatically, or press **Stop**.
- Your edits, exercise solutions and progress are stored in this browser only (localStorage). Use *Reset lesson* to start a lesson over.

### Differences from the interactive toplevel

- There is no keyboard input: \`read/1\` just hits end-of-file.
- Answers are printed all at once instead of one by one with \`;\`.
- \`halt/0\` stops the engine; it restarts on the next run.
- Output of \`write\`, \`format\` and friends appears above the answers.

### Going further

When you're comfortable, install [SWI-Prolog](https://www.swi-prolog.org/) locally and read the [manual](https://www.swi-prolog.org/pldoc/doc_for?object=manual). Everything in this notebook runs there unchanged.
`;
