# Changelog

## 0.5.2 — 2026-10-09

- `/ask-ds` sends a system prompt for direct, complete answers with no filler, which never swaps the answer for an official line or a safer topic. `/angry ask-system <text>` replaces it, `reset` brings it back, `off` sends the question alone.

## 0.5.1 — 2026-10-09

- `/ask` is now `/ask-ds` (DeepSeek): short, and it does not clash with other plugins' `/ask`.
- The project page tells about the DeepSeek mode and `/ask-ds`.

## 0.5.0 — 2026-10-09

- `/angry model deepseek` cleans through DeepSeek V4.1 Flash on your own key (set once with `claude plugin configure`, kept in Claude Code's secure storage), so the swearing never reaches Anthropic; `/angry model sonnet` goes back to the subscription. Low reasoning effort: without reasoning DeepSeek kept threats and guessed words.
- `/ask <question>`: a question straight to DeepSeek, past Claude.
- The part of the cleaning prompt that varies by task now comes last, so the fixed part is served from the cache.
- `/angry` shows whether a DeepSeek key is set; its last line reads `все команды: /angry help`.
- The `replay` tool takes an optional model, to compare models on the same prompts.

## 0.4.2 — 2026-10-09

- The cleaned prompt goes back inside `<rewritten>` tags, read leniently: the last block counts, a missing closing tag is fine, and a reply with no tags is taken whole. Without the tags the cleaning model sometimes wrote its own reasoning into the prompt.

## 0.4.1 — 2026-10-09

- The cleaning model answers with the cleaned prompt as plain text, no wrapper tags; the masked `<original>` copy follows it when there was swearing. A prompt no longer goes out as typed because the answer missed a tag.
- The cleaned prompt carries no notes from the cleaning model, not even about a word it could not make out: such a word stays as typed.

## 0.4.0 — 2026-10-09

- Renamed from Prompt Layer to **Angry Switcher**: it was born out of its author swearing at Claude Code. The command is now `/angry`, the repository `timoncool/angry-switcher` (old links redirect).
- Your original rides along: a cleaned prompt now ends with an `<original>` block holding your own words with the swearing masked by the cleaning model (`б***`), and Claude is told that where the two differ in meaning, the original is what you meant. `/angry original off` sends the rewrite alone. Costs about a hundred tokens a message against a context of hundreds of thousands.
- Grammatical gender is never guessed: an ambiguous typo keeps the form you typed.
- Demo GIFs in both READMEs, made with HyperFrames from real rewrites.

## 0.3.1 — 2026-10-09

- Rewrite as a minimal copy-edit: every word of the rewrite is one of the user's words, corrected. Tested on 91 real prompts from live chats: meaning kept in 98–100% against 80% for 0.3.0.
- Kept as written: questions stay questions of the same kind, statements stay statements, requests stay requests, conditions stay conditions, "это" points where the user points, a short reply stays short.
- A prompt about its own words ("я сейчас пишу ..., ты получил это?") goes out as typed.
- Swearing with no reason given is dropped with nothing invented in its place; insults phrased as questions ("ты идиот?") are dropped too; filler ("ну так вот") is dropped; an opinion about a thing stays in plain words.
- Built-in examples no longer turn questions into statements or invent complaints.
- More slang: Serena, Cloudflare, Vercel, KV, "русским языком" as "plainly".
- The log records the model of every call.
- `replay` tool: Claude runs the test room itself, the same code as `/layer replay`.

## 0.3.0 — 2026-10-09

- Default model is now `claude-sonnet-5-5` at low effort: on the 40-prompt replay Haiku 5.5 at low effort misread slang and garbled text (screenshots read as commits, WebRTC missed).
- Slang glossary (Haiku, Sonnet, MCP, screenshots, WebRTC and others) and a stricter typo rule: fix a word only when it is obvious, keep product and model names.
- Reply quotes (`<!-- reply -->` and `> ` lines) are hidden from the model like code and pasted text.

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
