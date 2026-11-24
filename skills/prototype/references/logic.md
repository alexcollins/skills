# Logic prototype

One HTML file that lets anyone — a designer, a domain expert, you next week — push a state model
through the cases that look fine on paper and feel wrong in practice. Nothing to install; it opens
by double-click and survives being sent around.

## 1. The question, visible

One paragraph at the top of the page, not in a comment: what model, what question. A prototype
that answers the wrong question is pure waste, and this is how it gets checked later.

## 2. The logic as a pure module

Put the part that answers the question in one `<script>` block, written so it could be lifted into
the real codebase unchanged. Pick the shape the question needs, not the one easiest to wire up:

- a reducer, `(state, action) => state`, for discrete events on one value;
- a state machine, when "which actions are legal now" is part of the question;
- a few pure functions over a plain type, when there's no current state;
- a small class, when the logic really owns ongoing state.

No DOM in it. The page calls into the module; nothing reaches back out.

## 3. The page

Plain HTML, CSS and JS, all inline. No framework, bundler or server. Every label in the domain's
words, not the code's. Top to bottom:

1. **Title** and one line on what you can explore.
2. **Current state** as a readable panel — labelled fields, not a JSON dump — re-rendered after
   every click, with what just changed called out.
3. **Free play**: one button per action, always available.
4. **Walkthroughs**: one tab per scenario. Each has a short description of what it sets up and what
   to watch, then its steps as real buttons in order. Starting one resets to a known state. Cover
   the happy path, an awkward edge, and an attempt at something that should be impossible.

Restrained styling: clean type, generous spacing, one accent, no animation.

## 4. Hand it over

Send the file or open it. The valuable moments are "wait, that shouldn't be allowed" and "I assumed
X would happen" — those are bugs in the idea. Add actions and scenarios as they ask.

## 5. Keep the module

The validated reducer, machine or functions move into the real code. The HTML shell goes to the
`prototype/<name>` branch, where it stays runnable.
