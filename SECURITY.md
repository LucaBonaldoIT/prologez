C# Security policy

PrologEZ is a static site; all Prolog code runs inside the visitor's own browser (WebAssembly,
in a Web Worker) and nothing is sent to a server.

If you find a vulnerability (for example a way to break out of the worker sandbox, or an XSS in
lesson rendering), please report it privately through
[GitHub security advisories](https://github.com/LucaBonaldoIT/prologez/security/advisories/new)
instead of a public issue. Expect a reply within a few days.
