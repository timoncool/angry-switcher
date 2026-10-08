<div align="center">

# Prompt Layer

**Невидимый слой для Claude Code: превращает то, что ты набрал, в промпт, который нужен Claude.**

[![License](https://img.shields.io/github/license/timoncool/prompt-layer?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/timoncool/prompt-layer?style=flat-square)](https://github.com/timoncool/prompt-layer/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/timoncool/prompt-layer?style=flat-square)](https://github.com/timoncool/prompt-layer/commits)

**[English](README.md)** · **[Русский](README_RU.md)**

</div>

Prompt Layer — плагин Claude Code, который переписывает каждый промпт через Claude Haiku 5.5 до того, как его прочитает основная модель: убирает опечатки, транслит, не ту раскладку, мат и капс, ставит цель первой и сохраняет все пути, идентификаторы и числа символ в символ. Работает в терминале Claude Code и во вкладке Code в Claude Desktop, через твой логин Claude, без API-ключа.

## Возможности

- **Настоящая подмена** — Claude читает только переписанный текст, а не оригинал плюс копию (хук-функция `prompt.submit`)
- **Быстро** — короткие и уже точные промпты уходят сразу по локальной проверке; в Haiku идут только «грязные», на низком уровне ризонинга
- **Чистит** — опечатки, транслит (`pochini test`), раскладку (`ghbdtn` → `привет`), мат, капс, воду
- **Не искажает** — пути, идентификаторы, числа и цитаты обязаны сохраниться, иначе уходит оригинал; код и вставленный текст до модели не доходят
- **Учится твоему стилю** — твои правила и одобренные образцы, подбор по типу задачи
- **Показывает изменения** — карточка «ты написал / ушло» в переписке; `raw:` отправляет как есть
- **Считает расходы** — токены из ответа API, деньги по счётчику `/cost` сессии, доля слоя в сессии, окна лимитов подписки
- **Встроенный A/B** — половина промптов уходит как написано или на английском, сравнение того, что было дальше

## Быстрый старт

Вставь в Claude Code:

```text
Install the Claude Code plugin Prompt Layer from https://github.com/timoncool/prompt-layer: run /plugin marketplace add timoncool/prompt-layer, then /plugin install prompt-layer@prompt-layer, then run /layer and show me its status. Remind me to restart Claude Code if the /layer command does not appear.
```

Или вручную:

```text
/plugin marketplace add timoncool/prompt-layer
/plugin install prompt-layer@prompt-layer
```

## Команды

| Команда | Что делает |
|---|---|
| `/layer` | статус, модель, траты за сутки |
| `/layer on` / `off` | включить или выключить |
| `/layer card on` / `off` | карточка «ты написал / ушло» |
| `/layer lang keep` / `en` | оставлять язык или отправлять на английском (ответ на твоём) |
| `/layer style <правила>` | твои правила переписывания |
| `/layer good` / `fix <текст>` | сохранить последнее переписывание или свой исправленный вариант как образец |
| `/layer examples` / `forget <n>` | список образцов, удалить образец |
| `/layer ab raw` / `en` / `off` | A/B: половина промптов уходит как написано (или на английском), всё в лог |
| `/layer report` | сравнение A/B |
| `/layer cost` | сколько потратил слой: токены, деньги, доля в сессии, лимиты |
| `/layer export` | лог в JSONL |
| `/layer replay <файл>` | тестовая комната: прогнать промпты из JSONL через слой, ничего не отправляя |
| `raw:` в начале | отправить ровно как написано |

## Как это работает

1. Локальная проверка без токенов решает, нужна ли работа: «мусор» любой длины или длинный размытый промпт.
2. Блоки кода и вставленный текст заменяются метками.
3. Haiku 5.5 переписывает по правилам, составленным по текущему гайду Anthropic: причины вместо голых «никогда», XML-структура, разнообразные образцы.
4. Переписанное уходит, только если вернулись все метки и защищённые детали; иначе уходит оригинал с уведомлением.
5. После трёх сбоев подряд слой встаёт на паузу на 10 минут, чтобы не тормозить работу.

## Благодарности

- [Prompt Forge](https://github.com/tomikng/prompt-forge) (tomikng) — ядро подмены через `prompt.submit`, из которого вырос плагин (MIT)
- [claude-prompt-improver](https://github.com/GaZmagik/claude-prompt-improver), [prompt-preflight](https://github.com/AnotherSamWithADream/prompt-preflight), [claude-code-prompt-optimizer](https://github.com/0-to-1-Labs/claude-code-prompt-optimizer), [claude-code-prompt-improver](https://github.com/severity1/claude-code-prompt-improver) — идеи типов задач, образцов, предохранителя и защиты от инъекций

## Другие проекты [@timoncool](https://github.com/timoncool)

| Проект | Описание |
|--------|----------|
| [telegram-api-mcp](https://github.com/timoncool/telegram-api-mcp) | Telegram Bot API как MCP-сервер |
| [civitai-mcp-ultimate](https://github.com/timoncool/civitai-mcp-ultimate) | Civitai API как MCP-сервер |
| [trail-spec](https://github.com/timoncool/trail-spec) | TRAIL — протокол трекинга контента |
| [ACE-Step Studio](https://github.com/timoncool/ACE-Step-Studio) | AI-студия музыки — песни, вокал, каверы, клипы |
| [VideoSOS](https://github.com/timoncool/videosos) | AI-видеопродакшн в браузере |

## Авторы

- **Nerual Dreming** — [Telegram](https://t.me/nerual_dreming) | [neuro-cartel.com](https://neuro-cartel.com) | [ArtGeneration.me](https://artgeneration.me)

## Поддержать автора

Я создаю опенсорс софт и занимаюсь исследованиями в области ИИ. Большая часть всего, что я делаю, находится в открытом доступе. Ваши пожертвования позволяют мне создавать и исследовать больше, не отвлекаясь на поиск еды для продолжения существования =)

**[Все способы поддержки](https://github.com/timoncool/ACE-Step-Studio/blob/master/DONATE.md)** | **[dalink.to/nerual_dreming](https://dalink.to/nerual_dreming)** | **[boosty.to/neuro_art](https://boosty.to/neuro_art)**

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

## Лицензия

MIT. Часть кода — tomikng (Prompt Forge).
