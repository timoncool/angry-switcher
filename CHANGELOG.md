# Changelog

## 0.2.1 — 2026-10-09

- The layer calls `claude-haiku-5-5` by its exact id instead of the `haiku` alias, which maps to Haiku 4.5 on Bedrock, Vertex and Foundry.

## 0.2.0 — 2026-10-09

- Tested on 40 real prompts with `/layer replay`; fixed what it showed:
- No conversation context for the rewriter: it was pulling requirements from Claude's last message and presenting them as the user's. Claude sees the conversation anyway.
- Stricter rules: every request and question kept, nothing added, questions stay questions, no invented "Important"/"Done when" lines, first person only.
- Wrong keyboard layout is decoded locally (`ghbdtn` → `привет`) and handed to Haiku, instead of Haiku timing out trying to decode it.
- Second guard: a rewrite that invents a path, file, number or identifier is not sent.
- `/layer replay <file>`: test room that runs prompts through the layer without sending anything.

## 0.1.0 — 2026-10-09

- First release: prompt rewrite through Haiku 5.5 on `prompt.submit`, noise detection (swearing, CAPS, translit, wrong layout), task-type hints, shielded code and pasted blocks, fidelity guard, personal style and examples, before/after card, failure breaker, cost tracking from the session ledger, A/B log.
