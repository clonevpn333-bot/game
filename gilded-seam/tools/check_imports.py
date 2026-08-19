#!/usr/bin/env python3
"""Catch the one compile error the structural gate cannot: a missing import.

`check_java.sh` throws away every "cannot find symbol", because without a
Minecraft jar on this machine *every* reference to a net.minecraft type is one.
That filter has a hole in it exactly the shape of the bug it keeps letting
through: a class used but never imported looks identical to a class that only
resolves in CI, so it sails past the gate and costs a five-minute round trip to
find out about. It has now done that twice.

This closes the hole without a jar. For each source file, collect the simple
type names it *uses* in positions where a type is unambiguous - declarations,
`new X(...)`, `X.staticCall()`, `catch (X e)`, `extends`/`implements`,
`instanceof` - and check each one is accounted for by:

  * an explicit import,
  * a wildcard import (then it is unknowable, so it counts),
  * something declared in the same file,
  * another file in the same package,
  * java.lang.

Anything left over is a name that cannot possibly resolve, whatever version of
Minecraft is on the classpath. That is a real error, and it is reported here in
a second instead of in CI in five minutes.

    python3 tools/check_imports.py [src-root ...]
"""

from __future__ import annotations

import os
import re
import sys

# Enough of java.lang to matter. A name missing from here is reported, checked
# once by a human and added; a name wrongly present would hide a real error, so
# this stays conservative and short.
JAVA_LANG = {
    "Object", "String", "Integer", "Long", "Double", "Float", "Boolean", "Byte",
    "Short", "Character", "Number", "Math", "System", "Thread", "Runnable",
    "Comparable", "Iterable", "Class", "Enum", "Exception", "RuntimeException",
    "IllegalArgumentException", "IllegalStateException", "NullPointerException",
    "UnsupportedOperationException", "Error", "Throwable", "StringBuilder",
    "CharSequence", "Override", "Deprecated", "SuppressWarnings",
    "FunctionalInterface", "SafeVarargs", "Record", "Void", "Cloneable",
    "AutoCloseable", "ArithmeticException", "ClassCastException", "Iterable",
    "IndexOutOfBoundsException", "NumberFormatException", "StringBuffer",
}

# Nested types reached through inheritance rather than through an import. A
# subclass of `Item` can write `Properties` bare because it is `Item.Properties`
# and the superclass brings it into scope - true of every item and block in the
# mod. Without the jar there is no way to know a superclass has a nested type,
# so the handful that exist are listed.
INHERITED = {"Properties"}

# Primitives and keywords that show up where a type name would.
NOT_TYPES = {
    "int", "long", "double", "float", "boolean", "byte", "short", "char",
    "void", "var", "this", "super", "return", "new", "if", "else", "for",
    "while", "switch", "case", "default", "break", "continue", "try", "catch",
    "finally", "throw", "throws", "class", "interface", "enum", "record",
    "extends", "implements", "public", "private", "protected", "static",
    "final", "abstract", "synchronized", "native", "transient", "volatile",
    "instanceof", "package", "import", "true", "false", "null", "assert",
    "do", "goto", "const", "strictfp", "yield", "sealed", "permits", "non",
}

# Where a capitalised name is certainly a type.
PATTERNS = [
    re.compile(r"\bnew\s+([A-Z]\w*)"),
    re.compile(r"\bcatch\s*\(\s*(?:final\s+)?([A-Z]\w*)"),
    re.compile(r"\b(?:extends|implements)\s+([A-Z]\w*)"),
    re.compile(r"\binstanceof\s+([A-Z]\w*)"),
    # A declaration: `Foo bar =`, `Foo bar;`, `(Foo bar)`, `Foo<...> bar`.
    re.compile(r"(?:^|[(,;{}]|\s)([A-Z]\w*)(?:<[^;=(){}]*>)?\s+\w+\s*[=;,)]"),
    # A static call or constant: `Foo.bar(`, `Foo.BAZ`.
    re.compile(r"(?:^|[^\w.$])([A-Z]\w*)\s*\.\s*[A-Za-z_]"),
]

DECLARED = re.compile(r"\b(?:class|interface|enum|record|@interface)\s+(\w+)")
STRINGS = re.compile(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'')
BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT = re.compile(r"//[^\n]*")
ANNOTATION = re.compile(r"@([A-Z]\w*)")


def strip(text: str) -> str:
    text = BLOCK_COMMENT.sub(" ", text)
    text = LINE_COMMENT.sub(" ", text)
    return STRINGS.sub('""', text)


def scan(roots: list[str]) -> int:
    files: list[str] = []
    for root in roots:
        for base, _dirs, names in os.walk(root):
            files.extend(os.path.join(base, n) for n in names if n.endswith(".java"))

    # Which simple names each package defines, so a sibling class needs no
    # import - the commonest legitimate reason a name has none.
    by_package: dict[str, set[str]] = {}
    parsed: dict[str, tuple[str, str]] = {}
    for path in files:
        with open(path, encoding="utf-8", errors="replace") as fh:
            raw = fh.read()
        pkg_match = re.search(r"^\s*package\s+([\w.]+)\s*;", raw, re.M)
        pkg = pkg_match.group(1) if pkg_match else ""
        parsed[path] = (pkg, raw)
        by_package.setdefault(pkg, set()).add(
            os.path.basename(path)[:-len(".java")])

    problems = 0
    for path, (pkg, raw) in sorted(parsed.items()):
        body = strip(raw)
        known = set(JAVA_LANG) | by_package.get(pkg, set())
        wildcard = False
        for line in re.findall(r"^\s*import\s+(?:static\s+)?([\w.*]+)\s*;", raw, re.M):
            if line.endswith(".*"):
                wildcard = True
            else:
                known.add(line.rsplit(".", 1)[-1])
        if wildcard:
            continue
        known |= set(DECLARED.findall(body))
        # Generic parameters (`<T>`, `<T extends Foo>`) are types too.
        for params in re.findall(r"<([A-Z]\w*(?:\s*,\s*[A-Z]\w*)*)>", body):
            known |= {p.strip() for p in params.split(",")}

        used: set[str] = set()
        for pattern in PATTERNS:
            used |= set(pattern.findall(body))
        used |= set(ANNOTATION.findall(body))
        # A fully-qualified use carries its own package and needs no import.
        for qualified in re.findall(r"\b(?:[a-z]\w*\.)+([A-Z]\w*)", body):
            used.discard(qualified)

        # An ALL_CAPS name is a constant, not a type - `LOGGER.info(...)` and
        # `state.getValue(ACTIVE)` both look like a static call on a class.
        missing = sorted(n for n in used
                         if n not in known and n not in NOT_TYPES
                         and n not in INHERITED and n != n.upper())
        for name in missing:
            line_no = next((i + 1 for i, l in enumerate(raw.splitlines())
                            if re.search(rf"\b{re.escape(name)}\b", l)
                            and not l.strip().startswith("import")), 1)
            print(f"{path}:{line_no}: no import for '{name}'")
            problems += 1
    return problems


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    targets = sys.argv[1:] or [os.path.join(here, "..", "src")]
    count = scan([os.path.normpath(t) for t in targets])
    print(f"{count} unresolvable name(s)")
    sys.exit(1 if count else 0)
