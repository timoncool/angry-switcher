<div align="center">

# Prompt Layer

**An invisible layer for Claude Code that turns what you type into the prompt Claude should get.**

[![License](https://img.shields.io/github/license/timoncool/prompt-layer?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/timoncool/prompt-layer?style=flat-square)](https://github.com/timoncool/prompt-layer/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/timoncool/prompt-layer?style=flat-square)](https://github.com/timoncool/prompt-layer/commits)

**[English](README.md)** · **[Русский](README_RU.md)**

</div>

Prompt Layer is a Claude Code plugin that rewrites every prompt with Claude Sonnet 5.5 at low effort before the main model reads it: typos, translit, the wrong keyboard layout, swearing and CAPS are cleaned, the goal goes first, and every path, identifier and number stays character for character. Works in the Claude Code terminal and the Code tab of Claude Desktop, uses your Claude login, no API key.

## Features

- **True replacement** — Claude reads only the rewrite, not your original plus a copy (built on the `prompt.submit` function hook)
- **Fast** — a local check sends short or already precise prompts straight through; only messy ones go to the model
- **Cleans the surface** — typos, translit (`pochini test`), wrong layout (`ghbdtn` → `привет`), swearing, CAPS, filler
- **Keeps the meaning** — paths, identifiers, numbers and quotes must survive or the original is sent; code fences and pasted blocks never reach the model
- **Learns your style** — your own rules plus approved examples, picked by task type
- **Shows what changed** — a "you typed / sent" card in the transcript; `raw:` sends a message as typed
- **Counts its cost** — tokens from the API, dollars from the session's `/cost` ledger, its share of the session, your plan's limit windows
- **Built-in A/B** — send half the prompts as typed or in English and compare what happened next

## Quick Start

Paste this into Claude Code:

```text
Install the Claude Code plugin Prompt Layer from https://github.com/timoncool/prompt-layer: run /plugin marketplace add timoncool/prompt-layer, then /plugin install prompt-layer@prompt-layer, then run /layer and show me its status. Remind me to restart Claude Code if the /layer command does not appear.
```

Or by hand:

```text
/plugin marketplace add timoncool/prompt-layer
/plugin install prompt-layer@prompt-layer
```

## Usage

| Command | What it does |
|---|---|
| `/layer` | status, model, today's spend |
| `/layer on` / `off` | turn the layer on or off |
| `/layer card on` / `off` | before/after card in the transcript |
| `/layer lang keep` / `en` | keep your language or send prompts in English (answers stay in yours) |
| `/layer style <rules>` | your own rewrite rules |
| `/layer good` / `fix <text>` | save the last rewrite, or your corrected version, as an example |
| `/layer examples` / `forget <n>` | list or delete saved examples |
| `/layer ab raw` / `en` / `off` | A/B: half the prompts go as typed (or in English), all logged |
| `/layer report` | A/B comparison |
| `/layer cost` | what the layer spent: tokens, dollars, share of the session, limit windows |
| `/layer export` | the log as JSONL |
| `/layer replay <file>` | test room: run prompts from a JSONL file through the layer without sending anything |
| `raw:` at the start | send the message exactly as typed |

## How it works

1. A local check (no tokens) decides whether the prompt needs work: noise of any length, or a long vague prompt.
2. Code fences and pasted blocks are swapped for placeholders.
3. Sonnet 5.5 (low effort) rewrites the prompt with rules written to Anthropic's current prompting guide: reasons instead of bare "never", XML structure, diverse examples.
4. The rewrite is sent only if every placeholder and protected detail came back; otherwise your original goes out with a notice.
5. After three failures in a row the layer pauses for ten minutes instead of slowing you down.

## Acknowledgements

- [Prompt Forge](https://github.com/tomikng/prompt-forge) by tomikng — the `prompt.submit` rewrite core this plugin grew from (MIT)
- [claude-prompt-improver](https://github.com/GaZmagik/claude-prompt-improver), [prompt-preflight](https://github.com/AnotherSamWithADream/prompt-preflight), [claude-code-prompt-optimizer](https://github.com/0-to-1-Labs/claude-code-prompt-optimizer), [claude-code-prompt-improver](https://github.com/severity1/claude-code-prompt-improver) — ideas for task types, examples, the failure breaker and injection hardening

## Other Projects by [@timoncool](https://github.com/timoncool)

| Project | Description |
|---------|-------------|
| [telegram-api-mcp](https://github.com/timoncool/telegram-api-mcp) | Full Telegram Bot API as MCP server |
| [civitai-mcp-ultimate](https://github.com/timoncool/civitai-mcp-ultimate) | Civitai API as MCP server |
| [trail-spec](https://github.com/timoncool/trail-spec) | TRAIL — cross-MCP content tracking protocol |
| [ACE-Step Studio](https://github.com/timoncool/ACE-Step-Studio) | AI music studio — songs, vocals, covers, videos |
| [VideoSOS](https://github.com/timoncool/videosos) | AI video production in the browser |

## Authors

- **Nerual Dreming** — [Telegram](https://t.me/nerual_dreming) | [neuro-cartel.com](https://neuro-cartel.com) | [ArtGeneration.me](https://artgeneration.me)

## Support the Author

I build open-source software and do AI research. Most of what I create is free and available to everyone. Your donations help me keep creating without worrying about where the next meal comes from =)

**[All donation methods](https://github.com/timoncool/ACE-Step-Studio/blob/master/DONATE.md)** | **[dalink.to/nerual_dreming](https://dalink.to/nerual_dreming)** | **[boosty.to/neuro_art](https://boosty.to/neuro_art)**

- **BTC:** `1E7dHL22RpyhJGVpcvKdbyZgksSYkYeEBC`
- **ETH (ERC20):** `0xb5db65adf478983186d4897ba92fe2c25c594a0c`
- **USDT (TRC20):** `TQST9Lp2TjK6FiVkn4fwfGUee7NmkxEE7C`

## Star History

<a href="https://github.com/timoncool/prompt-layer/stargazers">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="docs/stars-dark.svg" />
   <source media="(prefers-color-scheme: light)" srcset="docs/stars-light.svg" />
   <img alt="Star History Chart" src="docs/stars-light.svg" />
 </picture>
</a>

## License

MIT. Portions copyright tomikng (Prompt Forge).
