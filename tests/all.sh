#!/bin/sh
# every suite against PAGE/SERVER (default: the published pair), one line a suite and the full logs in tests/logs/: sh tests/all.sh [prefix]
# SUITES="relay online" picks some; PORT_T is the port of the online ones; the old-server suites need SERVER=<an old server.js> and are not in the list
cd "$(dirname "$0")/.." && mkdir -p tests/logs
for t in ${SUITES:-smoke-sight infantry squads field bases world relay online world-online bases-online heli heli-arms heli-ai heli-relay heli-online loadout loadout-online soak}; do
  [ -f tests/$t.js ] || continue
  s=$(date +%s); node tests/$t.js > tests/logs/$1$t.log 2>&1; rc=$?
  echo "$t rc=$rc $(( $(date +%s) - s ))s $(tail -1 tests/logs/$1$t.log)"
done
