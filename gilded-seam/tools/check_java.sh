#!/usr/bin/env bash
# Structural check for the Java sources, runnable without a Minecraft jar.
#
# There is no Minecraft on this machine, so every reference to a net.minecraft
# type reports "cannot find symbol" and is meaningless here. What javac still
# tells us is whether the file *parses*: unbalanced braces, a bad splice, a
# duplicate variable, a truncated generated block. Those are exactly the
# failures the generators can introduce, and catching them here costs a second
# instead of a CI round trip.
set -u
cd "$(dirname "$0")/.."
find src -name "*.java" > /tmp/gs-java-files.txt
javac -proc:none -d /tmp/gs-java-out -nowarn @/tmp/gs-java-files.txt 2>&1 \
  | grep -E "error:" \
  | grep -viE "does not exist|cannot find symbol|symbol:|location:" \
  > /tmp/gs-java-structural.txt
# javac drops a javac.<timestamp>.args beside itself when it re-execs with an
# argument file. Harmless, but it litters the repo root, so sweep it.
rm -f javac.*.args
count=$(wc -l < /tmp/gs-java-structural.txt)
echo "$(wc -l < /tmp/gs-java-files.txt) files, $count structural errors"
[ "$count" -gt 0 ] && cat /tmp/gs-java-structural.txt

# The filter above throws away every "cannot find symbol", which is right
# without a Minecraft jar and wrong for the one case that matters: a class used
# and never imported looks identical to a class that only resolves in CI. This
# tells the two apart. It is the check that would have caught `Player` in
# SeamMob before it cost a build.
python3 "$(dirname "$0")/check_imports.py"
exit 0
