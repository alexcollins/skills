#!/usr/bin/env bash
# Human-in-the-loop repro. Copy it, edit the steps between the markers, run it.
# The agent runs the script; the person follows the prompts in the terminal.
#
#   step "<instruction>"        show an instruction, wait for Enter
#   capture VAR "<question>"    ask a question, store the answer in VAR
#
# Captured values print as KEY=VALUE at the end for the agent to read back.
# Answers are echoed to the terminal, so capture observations only — never
# ask for a password or token; make signing in a `step`.

set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  read -r -p "    [Enter when done] " _
}

capture() {
  local var="$1" question="$2" answer
  printf '\n>>> %s\n' "$question"
  read -r -p "    > " answer
  printf -v "$var" '%s' "$answer"
}

# --- edit below ---------------------------------------------------------

step "Open the app at http://localhost:3000 and sign in."
capture ERRORED "Click Export. Did it throw an error? (y/n)"
capture ERROR_MSG "Paste the error message, or 'none':"

# --- edit above ---------------------------------------------------------

printf '\n--- captured ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"
