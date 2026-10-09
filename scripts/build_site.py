"""Builds the project page (docs/index.html in English, docs/ru.html in Russian) and its SEO files from one template.

Run from the repository root: python scripts/build_site.py
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')
SITE = 'https://timoncool.github.io/angry-switcher/'
REPO = 'https://github.com/timoncool/angry-switcher'
VERSION = '0.4.0'
UPDATED = '2026-10-09'

E = html.escape

T = {
    'en': {
        'file': 'index.html', 'locale': 'en_US', 'other': 'ru', 'other_file': 'ru.html', 'other_name': 'Русский',
        'title': 'Angry Switcher: Claude Code reads the clean version',
        'desc': 'A Claude Code plugin that cleans every prompt before Claude reads it: typos, translit, wrong keyboard layout, swearing and caps go, the meaning stays.',
        'og_alt': 'Swear at Claude Code all you like. It reads the clean version.',
        'nav': [('how', 'How it works'), ('numbers', 'Numbers'), ('install', 'Install'), ('faq', 'FAQ')],
        'h1a': 'Swear at Claude Code all you like.', 'h1b': 'It reads the clean version.',
        'lead': 'A plugin that rewrites each prompt before Claude reads it. Typos, wrong layout, swearing and caps go. Your meaning stays.',
        'cta': 'Install', 'star': 'Star on GitHub',
        'video_alt': 'Angry Switcher in Claude Code: an angry, misspelled prompt is typed, and Claude reads a clean one.',
        'story_h': 'How it started',
        'story': [
            'On October 8, 2026 Anthropic updated its usage policy: repeated, pointless cruelty toward its models is now against the rules. Ordinary frustration is not covered, but where the line runs is decided by Anthropic\'s own moderation.',
            'Plenty of people swear at Claude Code, not to hurt anyone but because it feels like it works. We checked the research: tone barely changes how well a model answers. A rant carries no diagnostics, and Claude still has to guess what broke.',
            'So now a small, fast model sits between the keyboard and Claude. Swear all you like: Claude gets a clean task with every request, path and number intact.',
        ],
        'story_src': ('Source: TechCrunch, October 8, 2026', 'https://techcrunch.com/2026/10/08/anthropic-changes-usage-policy-to-ban-model-abuse-and-election-interference/'),
        'analogy': 'Think Grammarly for your prompts, except it fixes what you meant, not just the spelling.',
        'fix_h': 'What it fixes',
        'fix_sub': 'Every rewrite below is real output of the plugin, not a mock-up.',
        'fix': [
            ('Swearing', 'bullshit results. you suck!!!', 'The results are bad.'),
            ('Caps', 'STOP WHEN I SAY STOP AND WHEN I CLICK STOP.', 'Stop when I say stop and when I click stop.'),
            ('Typos', 'fix teh loign bug its brokn agian after the refactr', "Fix the login bug, it's broken again after the refactor."),
            ('An insult instead of a reason', 'reverse all (you are a token waster)', 'Reverse all.'),
            ('Russian typed on the English layout', 'ghjdthm xnj ,bkl ghjitk', 'Проверь, что билд прошёл.'),
            ('Translit', 'pochini test v src/auth.ts on padaet posle refresh tokena', 'Почини тест в src/auth.ts: он падает после refresh-токена.'),
        ],
        'typed': 'you typed', 'reads': 'Claude reads',
        'how_h': 'How it works',
        'how': [
            ('A local check first', 'Short or already clear prompts go straight through, without a model call or a single token.'),
            ('Code and quotes are set aside', 'Code blocks, pasted text and quoted replies are swapped for placeholders, so the model never touches them.'),
            ('A minimal copy-edit', 'Claude Sonnet 5.5 at low effort fixes the surface and changes as little as it can. Questions stay questions, requests stay requests.'),
            ('A guard', 'Every path, identifier, number and placeholder has to come back. If one is lost or invented, your original goes out as typed.'),
            ('Your original rides along', 'The clean text comes first and your own words follow in an <original> block, swear words cut to their first letter. Claude is told to trust the original where the two differ.'),
        ],
        'num_h': 'What we measured',
        'num_sub': 'Scored by hand on real prompts: each rewrite gets the share of its meaning that survived.',
        'stats': [
            ('97-100%', 'meaning kept on 51 real messages from two live chats'),
            ('96-98%', 'on 40 older prompts from the same author'),
            ('1.4 s', 'median time to clean one message'),
            ('$0.0015', 'per cleaned message at API prices; a 91-prompt test run cost about $0.13'),
        ],
        'models_h': 'Why Sonnet and not Haiku',
        'models_sub': '40 real prompts, each scored 0, 1 or 2, so 80 is perfect.',
        'models_cols': ('Model', 'Score', 'Time for 40', 'Meaning errors'),
        'models': [('Haiku 5.5, low effort', '70 / 80', '81 s', '1'), ('Sonnet 5.5, low effort', '74 / 80', '40 s', '0'), ('Haiku 5.5, xhigh effort', '74 / 80', '252 s', '0')],
        'num_note': 'The same prompt can come out slightly differently from run to run, so swings of 1-2% between runs are noise, not progress.',
        'sub_h': 'On a subscription it costs nothing extra',
        'sub': 'Angry Switcher runs on your own Claude login. On a Pro or Max plan there is nothing to pay on top: its calls count against the same plan, and Sonnet at low effort is cheap enough that you will not notice them. Attaching your original adds about a hundred tokens to a message, while one answer of the main model reads hundreds of thousands.',
        'pc_h': 'Good and not so good',
        'pros_h': 'Good', 'cons_h': 'Not so good',
        'pros': [
            'Typos, wrong layout, translit, swearing and caps are cleaned before Claude reads them.',
            'Paths, identifiers, numbers, code and quotes stay character for character, or the original goes out.',
            'Your original rides along with the swearing masked, so Claude itself catches a misread without reading the rant.',
            'Learns your style from rewrites you approve.',
            'Counts its own tokens, dollars and limit share; has an A/B mode and a test room for old prompts.',
        ],
        'cons': [
            'About 1.4 s is added to each message it cleans.',
            'Garbled typos are still misread now and then. The original underneath lets Claude correct it.',
            'The swearing in the original is masked by the cleaning model itself; a word it misses reaches Claude as typed.',
            'Works in Claude Code: the terminal and the Code tab of Claude Desktop. Not in the claude.ai chat.',
            'Nobody has shown that swearing makes Claude worse. The win is clarity, not politeness.',
        ],
        'res_h': 'What the research says',
        'res': [
            ('Tone barely changes accuracy on average; per-question effects are real but unpredictable.', 'arXiv 2508.00614', 'https://arxiv.org/abs/2508.00614'),
            ('Tone effects show up only in the humanities, about 2-3%, and not in STEM.', 'arXiv 2512.12812', 'https://arxiv.org/abs/2512.12812'),
            ('Rewriting can hurt: minimal rewrites damaged 23.6% of good queries, aggressive ones 42.4%. That is why this plugin copy-edits instead of rephrasing.', 'arXiv 2603.13301', 'https://arxiv.org/abs/2603.13301'),
        ],
        'inst_h': 'Install',
        'inst': [
            ('Add the marketplace in Claude Code', '/plugin marketplace add timoncool/angry-switcher'),
            ('Install the plugin', '/plugin install angry-switcher@angry-switcher'),
            ('Restart Claude Code and check the status', '/angry'),
            ('Type as usual. To send one message untouched, start it with raw:', 'raw: your message'),
        ],
        'copy': 'Copy', 'copied': 'Copied',
        'cmd_h': 'Commands',
        'cmds': [
            ('/angry', 'status, model, today\'s spend'),
            ('/angry on | off', 'turn it on or off'),
            ('/angry original on | off', 'attach your original to the clean text'),
            ('/angry card on | off', 'the "you typed / sent" card in the transcript'),
            ('/angry lang keep | en', 'keep your language or send prompts in English'),
            ('/angry style <rules>', 'your own rewrite rules'),
            ('/angry good | fix <text>', 'save the last rewrite, or your fix, as an example'),
            ('/angry cost', 'tokens, dollars, share of the session, plan limits'),
            ('/angry ab raw | en | off', 'A/B test against prompts sent as typed'),
            ('/angry replay <file>', 'run old prompts through it, sending nothing'),
        ],
        'faq_h': 'Questions',
        'faq': [
            ('Do I pay extra on a Claude subscription?', 'No. The plugin uses your own Claude login, so on Pro or Max its calls come out of the same plan. At low effort Sonnet costs about $0.0015 per cleaned message at API prices, too little to notice next to the main model.'),
            ('Does Claude still see my swearing?', 'No. Your original rides along under the clean text with every swear word cut to its first letter, so Claude sees your typos and word order but not the swearing. /angry original off leaves the original out entirely.'),
            ('What if it gets my meaning wrong?', 'It happens in a few percent of messages, mostly with badly garbled typos. Two things protect you: a guard sends your original if a path, number or identifier is lost, and the original rides along so Claude can see what you actually typed.'),
            ('Which languages does it handle?', 'Whatever Claude reads. It was tested on Russian and English, including Russian typed on the English keyboard layout and Russian in Latin letters. It keeps your language unless you ask for English with /angry lang en.'),
            ('Does my text go anywhere else?', 'No. The rewrite is one call through the same Claude login Claude Code already uses. No other server, no API key, no telemetry.'),
            ('Does swearing make Claude worse?', 'The studies we read found almost no effect of tone on answer quality. The point of the plugin is that a rant carries no diagnostics; a clean prompt does.'),
        ],
        'author_h': 'Who made this',
        'author': 'Nerual Dreming. Artist, founder of ArtGeneration.me and the Neuro-Cartel community, author of ACE-Step Studio, YuE2 Studio and MiniMax Music3 Studio.',
        'support': 'Support the project',
        'foot': [('MIT license', REPO + '/blob/main/LICENSE'), ('What changed', REPO + '/blob/main/CHANGELOG.md'), ('Report an issue', REPO + '/issues')],
        'updated': 'Updated',
    },
    'ru': {
        'file': 'ru.html', 'locale': 'ru_RU', 'other': 'en', 'other_file': 'index.html', 'other_name': 'English',
        'title': 'Angry Switcher: Claude Code читает чистый текст',
        'desc': 'Плагин для Claude Code: чистит каждый промпт до того, как его прочитает Claude. Опечатки, транслит, раскладка, мат и капс уходят, смысл остаётся.',
        'og_alt': 'Матерись на Claude Code сколько хочешь. Он прочитает чистый текст.',
        'nav': [('how', 'Как работает'), ('numbers', 'Замеры'), ('install', 'Установка'), ('faq', 'Вопросы')],
        'h1a': 'Матерись на Claude Code сколько хочешь.', 'h1b': 'Он прочитает чистый текст.',
        'lead': 'Плагин переписывает каждый промпт до того, как его прочитает Claude. Опечатки, раскладка, мат и капс уходят, смысл остаётся.',
        'cta': 'Установить', 'star': 'Звезда на GitHub',
        'video_alt': 'Angry Switcher в Claude Code: набирается злой промпт с опечатками, а Claude читает чистый.',
        'story_h': 'С чего всё началось',
        'story': [
            '8 октября 2026 года Anthropic обновила правила использования: систематическая бессмысленная жестокость к её моделям теперь под запретом. Обычное раздражение под правило не попадает, но где проходит граница, решает модерация самой Anthropic.',
            'Многие матерятся на Claude Code не чтобы кого-то задеть, а потому что кажется, что так работает лучше. Мы проверили исследования: тон почти не влияет на качество ответа. В ругани нет диагностики, Claude всё равно гадает, что сломалось.',
            'Поэтому между клавиатурой и Claude теперь стоит маленькая быстрая модель. Матерись сколько хочешь: Claude получит чистую задачу, где сохранены все просьбы, пути и числа.',
        ],
        'story_src': ('Источник: TechCrunch, 8 октября 2026', 'https://techcrunch.com/2026/10/08/anthropic-changes-usage-policy-to-ban-model-abuse-and-election-interference/'),
        'analogy': 'Как Punto Switcher для промптов, только умнее: он исправляет не раскладку, а всё сообщение.',
        'fix_h': 'Что исправляет',
        'fix_sub': 'Каждый пример ниже это настоящий ответ плагина, а не макет.',
        'fix': [
            ('Мат и капс', 'ЕБАНЫЙ ТЫ ДЯТЕЛ ЗАЧЕМ ТЫ УДАЛИЛ МИГРАЦИИ???', 'Зачем ты удалил миграции?'),
            ('Мат вместо задачи', 'сука опять тест красный почини уже наконец бля', 'Тест опять падает, почини.'),
            ('Капс и восклицания', 'НЕ ТРОГАЙ ПРОД!!! сначала на стенде проверь', 'Сначала проверь на стенде.\nВажно: прод не трогай.'),
            ('Не та раскладка', 'ghjdthm xnj ,bkl ghjitk', 'Проверь, что билд прошёл.'),
            ('Транслит', 'pochini test v src/auth.ts on padaet posle refresh tokena', 'Почини тест в src/auth.ts: он падает после refresh-токена.'),
            ('Опечатки, по-английски', 'fix teh loign bug its brokn agian after the refactr', "Fix the login bug, it's broken again after the refactor."),
        ],
        'typed': 'ты набрал', 'reads': 'Claude читает',
        'how_h': 'Как работает',
        'how': [
            ('Сначала локальная проверка', 'Короткие и уже понятные промпты уходят сразу, без вызова модели и без единого токена.'),
            ('Код и цитаты откладываются', 'Блоки кода, вставленный текст и цитаты ответов заменяются метками, модель их не трогает.'),
            ('Минимальная правка', 'Claude Sonnet 5.5 на низком уровне размышлений чистит поверхность и меняет как можно меньше. Вопрос остаётся вопросом, просьба просьбой.'),
            ('Защита', 'Каждый путь, идентификатор, число и метка обязаны вернуться. Если что-то потерялось или выдумалось, уходит твой оригинал.'),
            ('Оригинал рядом', 'Сначала идёт чистый текст, ниже твои слова в блоке <original>, мат в них закрыт звёздочками. Claude знает, что при расхождении верить нужно оригиналу.'),
        ],
        'num_h': 'Что мы замерили',
        'num_sub': 'Вручную, на настоящих сообщениях: каждому переписыванию ставилась доля смысла, которая дошла.',
        'stats': [
            ('97-100%', 'смысла сохранено на 51 настоящем сообщении из двух живых чатов'),
            ('96-98%', 'на 40 более старых сообщениях того же автора'),
            ('1,4 с', 'медианное время чистки одного сообщения'),
            ('$0.0015', 'за одно сообщение по ценам API; прогон 91 сообщения обошёлся примерно в $0.13'),
        ],
        'models_h': 'Почему Sonnet, а не Haiku',
        'models_sub': '40 настоящих промптов, за каждый 0, 1 или 2 балла, максимум 80.',
        'models_cols': ('Модель', 'Оценка', 'Время на 40', 'Искажений смысла'),
        'models': [('Haiku 5.5, low', '70 / 80', '81 с', '1'), ('Sonnet 5.5, low', '74 / 80', '40 с', '0'), ('Haiku 5.5, xhigh', '74 / 80', '252 с', '0')],
        'num_note': 'Один и тот же промпт от прогона к прогону выходит чуть по-разному, поэтому колебания на 1-2% между прогонами это шум, а не прогресс.',
        'sub_h': 'На подписке никаких доплат',
        'sub': 'Angry Switcher работает через твой логин Claude. На Pro или Max доплачивать ничего не нужно: его вызовы идут из той же подписки, а Sonnet на низком уровне размышлений настолько дешёвый, что это даже не ощущается. Оригинал рядом добавляет к сообщению около сотни токенов, а один ответ основной модели читает сотни тысяч.',
        'pc_h': 'Плюсы и минусы',
        'pros_h': 'Плюсы', 'cons_h': 'Минусы',
        'pros': [
            'Опечатки, раскладка, транслит, мат и капс чистятся до того, как Claude их прочитает.',
            'Пути, идентификаторы, числа, код и цитаты сохраняются символ в символ, иначе уходит оригинал.',
            'Оригинал идёт рядом с мат под звёздочками, и ошибку чистки ловит сам Claude, не читая ругани.',
            'Учится твоему стилю на одобренных тобой примерах.',
            'Считает свои токены, деньги и долю лимитов; есть A/B и тестовая комната для старых промптов.',
        ],
        'cons': [
            'К каждому очищенному сообщению добавляется около 1,4 с.',
            'Сильно искажённые опечатки он иногда читает неверно. Оригинал рядом позволяет Claude это поправить.',
            'Мат в оригинале закрывает сама модель-чистильщик; пропущенное ею слово дойдёт до Claude как есть.',
            'Работает в Claude Code: в терминале и во вкладке Code в Claude Desktop. В чате claude.ai нет.',
            'Никто не доказал, что мат ухудшает ответы Claude. Выигрыш в ясности, а не в вежливости.',
        ],
        'res_h': 'Что говорят исследования',
        'res': [
            ('В среднем тон почти не влияет на точность; на отдельных вопросах эффект есть, но непредсказуемый.', 'arXiv 2508.00614', 'https://arxiv.org/abs/2508.00614'),
            ('Эффект тона нашли только в гуманитарных задачах, около 2-3%, в STEM его нет.', 'arXiv 2512.12812', 'https://arxiv.org/abs/2512.12812'),
            ('Переписывание может навредить: минимальные правки испортили 23,6% хороших запросов, агрессивные 42,4%. Поэтому плагин правит, а не пересказывает.', 'arXiv 2603.13301', 'https://arxiv.org/abs/2603.13301'),
        ],
        'inst_h': 'Установка',
        'inst': [
            ('Добавь marketplace в Claude Code', '/plugin marketplace add timoncool/angry-switcher'),
            ('Установи плагин', '/plugin install angry-switcher@angry-switcher'),
            ('Перезапусти Claude Code и проверь статус', '/angry'),
            ('Пиши как обычно. Чтобы отправить сообщение как есть, начни его с raw:', 'raw: твоё сообщение'),
        ],
        'copy': 'Копировать', 'copied': 'Скопировано',
        'cmd_h': 'Команды',
        'cmds': [
            ('/angry', 'статус, модель, траты за сутки'),
            ('/angry on | off', 'включить или выключить'),
            ('/angry original on | off', 'прикладывать оригинал к чистому тексту'),
            ('/angry card on | off', 'карточка «ты написал / ушло» в переписке'),
            ('/angry lang keep | en', 'оставлять язык или отправлять на английском'),
            ('/angry style <правила>', 'твои правила переписывания'),
            ('/angry good | fix <текст>', 'сохранить последнее переписывание или свою правку как образец'),
            ('/angry cost', 'токены, деньги, доля в сессии, лимиты подписки'),
            ('/angry ab raw | en | off', 'A/B против промптов как написано'),
            ('/angry replay <файл>', 'прогнать старые промпты, ничего не отправляя'),
        ],
        'faq_h': 'Вопросы',
        'faq': [
            ('Нужно ли доплачивать на подписке Claude?', 'Нет. Плагин работает через твой логин Claude, поэтому на Pro или Max его вызовы идут из той же подписки. Sonnet на низком уровне размышлений стоит около $0.0015 за сообщение по ценам API, на фоне основной модели это незаметно.'),
            ('Claude всё равно видит мой мат?', 'Нет. Оригинал идёт под чистым текстом, но мат в нём закрыт звёздочками, так что Claude видит твои опечатки и порядок слов, а не ругань. /angry original off убирает оригинал совсем.'),
            ('А если он исказит смысл?', 'Такое бывает в нескольких процентах сообщений, чаще всего на сильно искажённых опечатках. Защищают две вещи: если потерялся путь, число или идентификатор, уходит оригинал, а сам оригинал всегда идёт рядом, и Claude видит, что ты набрал на самом деле.'),
            ('Какие языки он понимает?', 'Любые, которые понимает Claude. Проверен на русском и английском, включая русский в английской раскладке и русский латиницей. Язык он сохраняет, если не попросить английский командой /angry lang en.'),
            ('Мой текст куда-то ещё уходит?', 'Нет. Переписывание это один вызов через тот же логин Claude, что уже использует Claude Code. Ни другого сервера, ни API-ключа, ни телеметрии.'),
            ('Мат делает Claude хуже?', 'Исследования, которые мы читали, почти не нашли влияния тона на качество ответа. Смысл плагина в другом: в ругани нет диагностики, а в чистом промпте есть.'),
        ],
        'author_h': 'Кто сделал',
        'author': 'Nerual Dreming. Художник, основатель ArtGeneration.me и сообщества Нейро-Картель, автор ACE-Step Studio, YuE2 Studio и MiniMax Music3 Studio.',
        'support': 'Поддержать проект',
        'foot': [('Лицензия MIT', REPO + '/blob/main/LICENSE'), ('Что изменилось', REPO + '/blob/main/CHANGELOG.md'), ('Сообщить о проблеме', REPO + '/issues')],
        'updated': 'Обновлено',
    },
}

LINKS = [('GitHub', 'https://github.com/timoncool'), ('Telegram @nerual_dreming', 'https://t.me/nerual_dreming'), ('Telegram @neuroport', 'https://t.me/neuroport'), ('ArtGeneration.me', 'https://artgeneration.me')]
DONATE = 'https://github.com/timoncool/ACE-Step-Studio/blob/master/DONATE.md'
STARS = 'https://img.shields.io/github/stars/timoncool/angry-switcher?style=flat&amp;label=%E2%98%85&amp;color=262b34'

CSS = """
@font-face { font-family: 'Cascadia Mono'; src: url('site/fonts/cascadia-mono.woff2') format('woff2'); font-weight: 200 700; font-display: swap; }
:root { --bg: #0c0e12; --panel: #13161c; --panel-2: #181c23; --line: #262b34; --text: #e7e9ee; --muted: #9aa3b2; --red: #e5838a; --cyan: #4fc1e9; --r: 10px; color-scheme: dark; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 76px; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body { margin: 0; background: var(--bg); color: var(--text); font: 400 16px/1.65 'Cascadia Mono', ui-monospace, Menlo, Consolas, monospace; -webkit-font-smoothing: antialiased; }
a { color: var(--cyan); text-underline-offset: 3px; }
a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; border-radius: 4px; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
header { position: sticky; top: 0; z-index: 10; background: rgba(12,14,18,.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.bar { display: flex; align-items: center; gap: 22px; height: 60px; }
.brand { display: flex; align-items: center; gap: 10px; color: var(--text); text-decoration: none; font-weight: 600; white-space: nowrap; }
.brand img { width: 26px; height: 26px; }
.bar nav { display: flex; gap: 20px; margin-left: auto; }
.bar nav a { color: var(--muted); text-decoration: none; font-size: 14px; white-space: nowrap; }
.bar nav a:hover { color: var(--text); }
.lang { color: var(--muted); font-size: 14px; text-decoration: none; border: 1px solid var(--line); border-radius: 6px; padding: 3px 9px; }
.lang:hover { color: var(--text); border-color: var(--muted); }
.gh { display: flex; align-items: center; gap: 8px; color: var(--text); text-decoration: none; font-size: 14px; }
.gh img { display: block; }
.hero { padding: 56px 0 72px; }
.hero-grid { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 7fr); gap: 48px; align-items: start; margin-top: 36px; }
h1 { margin: 0; font-size: clamp(28px, 3.3vw, 46px); line-height: 1.16; letter-spacing: -0.02em; font-weight: 700; }
h1 .after { display: block; margin-top: 6px; color: var(--cyan); }
h1 .after::after { content: ""; display: inline-block; width: .5em; height: .9em; margin-left: .12em; vertical-align: -.08em; background: var(--cyan); animation: blink 1.1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { h1 .after::after { animation: none; } }
.lead { margin: 0; color: var(--muted); font-size: 17px; max-width: 40ch; }
.cta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
.btn { display: inline-flex; align-items: center; gap: 10px; height: 46px; padding: 0 20px; border-radius: var(--r); font: inherit; font-weight: 600; text-decoration: none; white-space: nowrap; border: 1px solid var(--line); color: var(--text); background: var(--panel); cursor: pointer; transition: transform .12s ease, border-color .12s ease; }
.btn:hover { border-color: var(--muted); }
.btn:active { transform: translateY(1px); }
.btn.primary { background: var(--cyan); border-color: var(--cyan); color: #0c0e12; }
.window { margin: 0; border-radius: 14px; overflow: hidden; }
.window video { display: block; width: 100%; height: auto; aspect-ratio: 1060 / 540; background: var(--bg); }
section { padding: 72px 0; border-top: 1px solid var(--line); }
h2 { margin: 0 0 14px; font-size: 26px; line-height: 1.25; letter-spacing: -0.01em; font-weight: 700; }
.sub { margin: 0 0 32px; color: var(--muted); max-width: 70ch; }
.story { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 4fr); gap: 56px; align-items: end; }
.story p { margin: 0 0 16px; max-width: 64ch; }
.story .src { font-size: 14px; }
.analogy { margin: 0; padding: 22px 24px; border-left: 3px solid var(--cyan); background: var(--panel); border-radius: 0 var(--r) var(--r) 0; font-size: 18px; line-height: 1.5; }
.diffs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.diff { margin: 0; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); overflow: hidden; }
.diff figcaption { padding: 10px 16px; font-size: 13px; color: var(--muted); border-bottom: 1px solid var(--line); background: var(--panel-2); }
.diff pre { margin: 0; padding: 14px 16px; font: inherit; font-size: 15px; white-space: pre-wrap; word-break: break-word; }
.diff .m { color: var(--red); }
.diff .p { color: var(--text); }
.diff .k { color: var(--muted); user-select: none; }
.flow { list-style: none; margin: 0; padding: 0; counter-reset: s; max-width: 820px; }
.flow li { position: relative; padding: 0 0 28px 64px; counter-increment: s; }
.flow li::before { content: counter(s); position: absolute; left: 0; top: 0; width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 50%; color: var(--cyan); font-weight: 700; background: var(--panel); }
.flow li::after { content: ""; position: absolute; left: 19px; top: 42px; bottom: 6px; width: 1px; background: var(--line); }
.flow li:last-child::after { display: none; }
.flow b { display: block; font-size: 17px; margin: 6px 0 4px; }
.flow span { color: var(--muted); }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; }
.stat { padding: 22px 20px; background: var(--panel); }
.stat + .stat { border-left: 1px solid var(--line); }
.stat b { display: block; font-size: 30px; line-height: 1.1; color: var(--cyan); font-weight: 700; }
.stat span { display: block; margin-top: 10px; font-size: 14px; color: var(--muted); }
.models { margin-top: 44px; display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 7fr); gap: 40px; align-items: start; }
.models h3 { margin: 0 0 8px; font-size: 19px; }
.models p { margin: 0; color: var(--muted); }
table { width: 100%; border-collapse: collapse; font-size: 15px; }
th, td { text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--line); }
th { color: var(--muted); font-weight: 400; font-size: 13px; }
tr.win td { color: var(--cyan); }
.note { margin: 22px 0 0; color: var(--muted); font-size: 14px; max-width: 80ch; }
.pay { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 7fr); gap: 40px; align-items: start; }
.pay p { margin: 0; font-size: 17px; max-width: 66ch; }
.pc { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 40px; }
.pc h3 { margin: 0 0 14px; font-size: 18px; }
.pc ul { list-style: none; margin: 0; padding: 0; }
.pc li { position: relative; padding: 0 0 14px 26px; }
.pc li::before { position: absolute; left: 0; font-weight: 700; }
.pros li::before { content: "+"; color: var(--cyan); }
.cons li::before { content: "-"; color: var(--red); }
.res { display: grid; gap: 0; border-top: 1px solid var(--line); }
.res a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; padding: 16px 0; border-bottom: 1px solid var(--line); color: var(--text); text-decoration: none; }
.res a span:last-child { color: var(--cyan); white-space: nowrap; }
.res a:hover span:first-child { color: #fff; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; max-width: 820px; counter-reset: i; }
.steps li { counter-increment: i; }
.steps p { margin: 0 0 8px; }
.steps p::before { content: counter(i) ". "; color: var(--cyan); font-weight: 700; }
.cmd { display: flex; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); padding: 10px 10px 10px 16px; }
.cmd code { flex: 1; font: inherit; overflow-x: auto; white-space: nowrap; }
.cmd code::before { content: "> "; color: var(--red); }
.cmd button { flex: none; height: 32px; padding: 0 12px; border-radius: 7px; border: 1px solid var(--line); background: var(--panel-2); color: var(--muted); font: inherit; font-size: 13px; cursor: pointer; }
.cmd button:hover { color: var(--text); border-color: var(--muted); }
.cmds { margin-top: 48px; }
.cmds h3 { margin: 0 0 16px; font-size: 18px; }
.cmds dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 32px; margin: 0; }
.cmds div { display: grid; grid-template-columns: minmax(0, 13em) minmax(0, 1fr); gap: 14px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.cmds dt { color: var(--cyan); font-size: 14px; }
.cmds dd { margin: 0; color: var(--muted); font-size: 14px; }
details { border-bottom: 1px solid var(--line); max-width: 880px; }
summary { cursor: pointer; padding: 18px 0; font-weight: 600; list-style: none; display: flex; justify-content: space-between; gap: 16px; }
summary::-webkit-details-marker { display: none; }
summary::after { content: "+"; color: var(--cyan); font-weight: 700; }
details[open] summary::after { content: "-"; }
details p { margin: 0 0 20px; color: var(--muted); max-width: 72ch; }
.author { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 4fr); gap: 40px; align-items: start; }
.author p { margin: 0; max-width: 60ch; }
.author ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
footer { border-top: 1px solid var(--line); padding: 28px 0 40px; color: var(--muted); font-size: 14px; }
footer .wrap { display: flex; flex-wrap: wrap; gap: 22px; }
footer a { color: var(--muted); }
footer span { margin-left: auto; }
@media (max-width: 900px) {
  .bar nav { display: none; }
  .bar .lang { margin-left: auto; }
  .hero-grid, .story, .models, .pay, .pc, .author { grid-template-columns: 1fr; gap: 32px; }
  .hero { padding: 40px 0 56px; }
  .diffs, .cmds dl { grid-template-columns: 1fr; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stat:nth-child(3) { border-left: 0; }
  .stat:nth-child(n+3) { border-top: 1px solid var(--line); }
  section { padding: 56px 0; }
}
@media (max-width: 520px) {
  .wrap { padding: 0 16px; }
  .gh { display: none; }
  .stats { grid-template-columns: 1fr; }
  .stat + .stat { border-left: 0; border-top: 1px solid var(--line); }
  .cmds div { grid-template-columns: 1fr; gap: 2px; }
  .res a { grid-template-columns: 1fr; gap: 6px; }
  footer span { margin-left: 0; }
}
"""

SCRIPT = """
document.querySelectorAll('.cmd button').forEach(function (b) {
  b.addEventListener('click', function () {
    var text = b.parentNode.querySelector('code').textContent;
    navigator.clipboard.writeText(text).then(function () {
      var label = b.textContent;
      b.textContent = b.dataset.done;
      setTimeout(function () { b.textContent = label; }, 1400);
    });
  });
});
var v = document.querySelector('.window video');
if (v && !matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('controls'); v.play().catch(function () { v.setAttribute('controls', ''); }); }
"""


def diff_block(label, typed, sent):
    minus = '\n'.join(f'<span class="k">- </span><span class="m">{E(line)}</span>' for line in typed.split('\n'))
    plus = '\n'.join(f'<span class="k">+ </span><span class="p">{E(line)}</span>' for line in sent.split('\n'))
    return f'<figure class="diff"><figcaption>{E(label)}</figcaption><pre>{minus}\n{plus}</pre></figure>'


def json_ld(lang, t):
    url = SITE if lang == 'en' else SITE + t['file']
    graph = [
        {'@type': 'SoftwareApplication', '@id': SITE + '#app', 'name': 'Angry Switcher', 'url': url, 'inLanguage': lang,
         'description': t['desc'], 'applicationCategory': 'DeveloperApplication', 'applicationSubCategory': 'Claude Code plugin',
         'operatingSystem': 'Windows, macOS, Linux', 'softwareVersion': VERSION, 'isAccessibleForFree': True,
         'license': 'https://opensource.org/licenses/MIT', 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'},
         'image': SITE + f'og-{lang}.jpg', 'codeRepository': REPO, 'sameAs': [REPO], 'downloadUrl': REPO,
         'author': {'@id': 'https://github.com/timoncool#person'}, 'dateModified': UPDATED},
        {'@type': 'Person', '@id': 'https://github.com/timoncool#person', 'name': 'Nerual Dreming', 'url': 'https://github.com/timoncool',
         'sameAs': ['https://github.com/timoncool', 'https://t.me/nerual_dreming', 'https://artgeneration.me']},
        {'@type': 'FAQPage', 'inLanguage': lang, 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in t['faq']]},
    ]
    return json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False)


def page(lang):
    t = T[lang]
    url = SITE if lang == 'en' else SITE + t['file']
    other_url = SITE if t['other'] == 'en' else SITE + t['other_file']
    og_locale_alt = T[t['other']]['locale']
    nav = ''.join(f'<a href="#{i}">{E(n)}</a>' for i, n in t['nav'])
    fixes = ''.join(diff_block(*f) for f in t['fix'])
    flow = ''.join(f'<li><b>{E(h)}</b><span>{E(b)}</span></li>' for h, b in t['how'])
    stats = ''.join(f'<div class="stat"><b>{E(v)}</b><span>{E(l)}</span></div>' for v, l in t['stats'])
    cols = ''.join(f'<th scope="col">{E(c)}</th>' for c in t['models_cols'])
    rows = ''.join(('<tr class="win">' if i == 1 else '<tr>') + ''.join(f'<td>{E(c)}</td>' for c in r) + '</tr>' for i, r in enumerate(t['models']))
    pros = ''.join(f'<li>{E(x)}</li>' for x in t['pros'])
    cons = ''.join(f'<li>{E(x)}</li>' for x in t['cons'])
    res = ''.join(f'<a href="{u}" rel="noopener"><span>{E(s)}</span><span>{E(src)}</span></a>' for s, src, u in t['res'])
    steps = ''.join(f'<li><p>{E(h)}</p><div class="cmd"><code>{E(c)}</code><button type="button" data-done="{E(t["copied"])}">{E(t["copy"])}</button></div></li>' for h, c in t['inst'])
    cmds = ''.join(f'<div><dt>{E(c)}</dt><dd>{E(d)}</dd></div>' for c, d in t['cmds'])
    faq = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in t['faq'])
    links = ''.join(f'<li><a href="{u}" rel="me noopener">{E(n)}</a></li>' for n, u in LINKS) + f'<li><a href="{DONATE}" rel="noopener">{E(t["support"])}</a></li>'
    foot = ''.join(f'<a href="{u}">{E(n)}</a>' for n, u in t['foot'])
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{E(t['title'])}</title>
<meta name="description" content="{E(t['desc'])}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="author" content="Nerual Dreming" />
<meta name="theme-color" content="#0c0e12" />
<meta name="color-scheme" content="dark" />
<link rel="canonical" href="{url}" />
<link rel="alternate" hreflang="en" href="{SITE}" />
<link rel="alternate" hreflang="ru" href="{SITE}ru.html" />
<link rel="alternate" hreflang="x-default" href="{SITE}" />
<link rel="icon" href="favicon.ico" sizes="16x16 32x32 48x48" />
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
<link rel="manifest" href="site.webmanifest" />
<link rel="preload" href="site/fonts/cascadia-mono.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" as="image" href="demo-{lang}.jpg" fetchpriority="high" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Angry Switcher" />
<meta property="og:title" content="{E(t['title'])}" />
<meta property="og:description" content="{E(t['desc'])}" />
<meta property="og:url" content="{url}" />
<meta property="og:locale" content="{t['locale']}" />
<meta property="og:locale:alternate" content="{og_locale_alt}" />
<meta property="og:image" content="{SITE}og-{lang}.jpg" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="{E(t['og_alt'])}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{E(t['title'])}" />
<meta name="twitter:description" content="{E(t['desc'])}" />
<meta name="twitter:image" content="{SITE}og-{lang}.jpg" />
<meta name="twitter:image:alt" content="{E(t['og_alt'])}" />
<script type="application/ld+json">{json_ld(lang, t)}</script>
<style>{CSS}</style>
</head>
<body>
<header>
  <div class="wrap bar">
    <a class="brand" href="{t['file']}"><img src="icon-64.png" alt="" width="26" height="26" />Angry Switcher</a>
    <nav aria-label="{E(t['nav'][0][1])}">{nav}</nav>
    <a class="lang" href="{t['other_file']}" hreflang="{t['other']}" lang="{t['other']}">{E(t['other_name'])}</a>
    <a class="gh" href="{REPO}"><span>GitHub</span><img src="{STARS}" alt="GitHub stars" height="20" /></a>
  </div>
</header>
<main class="wrap">
  <div class="hero">
    <h1>{E(t['h1a'])}<span class="after">{E(t['h1b'])}</span></h1>
    <div class="hero-grid">
    <div>
      <p class="lead">{E(t['lead'])}</p>
      <div class="cta"><a class="btn primary" href="#install">{E(t['cta'])}</a><a class="btn" href="{REPO}">{E(t['star'])}<img src="{STARS}" alt="" height="20" /></a></div>
    </div>
    <figure class="window">
      <video src="demo-{lang}.mp4" poster="demo-{lang}.jpg" muted loop playsinline controls preload="metadata" width="1060" height="540" aria-label="{E(t['video_alt'])}"></video>
    </figure>
    </div>
  </div>

  <section id="why">
    <div class="story">
      <div><h2>{E(t['story_h'])}</h2>{''.join(f'<p>{E(p)}</p>' for p in t['story'])}<p class="src"><a href="{t['story_src'][1]}" rel="noopener">{E(t['story_src'][0])}</a></p></div>
      <p class="analogy">{E(t['analogy'])}</p>
    </div>
  </section>

  <section id="fixes">
    <h2>{E(t['fix_h'])}</h2>
    <p class="sub">{E(t['fix_sub'])}</p>
    <div class="diffs">{fixes}</div>
  </section>

  <section id="how">
    <h2>{E(t['how_h'])}</h2>
    <ol class="flow">{flow}</ol>
  </section>

  <section id="numbers">
    <h2>{E(t['num_h'])}</h2>
    <p class="sub">{E(t['num_sub'])}</p>
    <div class="stats">{stats}</div>
    <div class="models">
      <div><h3>{E(t['models_h'])}</h3><p>{E(t['models_sub'])}</p></div>
      <table><thead><tr>{cols}</tr></thead><tbody>{rows}</tbody></table>
    </div>
    <p class="note">{E(t['num_note'])}</p>
  </section>

  <section id="cost">
    <div class="pay"><h2>{E(t['sub_h'])}</h2><p>{E(t['sub'])}</p></div>
  </section>

  <section id="tradeoffs">
    <h2>{E(t['pc_h'])}</h2>
    <div class="pc">
      <div class="pros"><h3>{E(t['pros_h'])}</h3><ul>{pros}</ul></div>
      <div class="cons"><h3>{E(t['cons_h'])}</h3><ul>{cons}</ul></div>
    </div>
  </section>

  <section id="research">
    <h2>{E(t['res_h'])}</h2>
    <div class="res">{res}</div>
  </section>

  <section id="install">
    <h2>{E(t['inst_h'])}</h2>
    <ol class="steps">{steps}</ol>
    <div class="cmds"><h3>{E(t['cmd_h'])}</h3><dl>{cmds}</dl></div>
  </section>

  <section id="faq">
    <h2>{E(t['faq_h'])}</h2>
    {faq}
  </section>

  <section id="author">
    <div class="author"><div><h2>{E(t['author_h'])}</h2><p>{E(t['author'])}</p></div><ul>{links}</ul></div>
  </section>
</main>
<footer><div class="wrap">{foot}<span>{E(t['updated'])} {UPDATED}</span></div></footer>
<script>{SCRIPT}</script>
</body>
</html>
'''


def write(name, text):
    with open(os.path.join(DOCS, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def main():
    for lang in T:
        write(T[lang]['file'], page(lang))
    write('sitemap.xml', f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>{SITE}</loc><lastmod>{UPDATED}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="{SITE}" /><xhtml:link rel="alternate" hreflang="ru" href="{SITE}ru.html" /><xhtml:link rel="alternate" hreflang="x-default" href="{SITE}" /></url>
  <url><loc>{SITE}ru.html</loc><lastmod>{UPDATED}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="{SITE}" /><xhtml:link rel="alternate" hreflang="ru" href="{SITE}ru.html" /><xhtml:link rel="alternate" hreflang="x-default" href="{SITE}" /></url>
</urlset>
''')
    write('robots.txt', f'User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n')
    write('site.webmanifest', json.dumps({'name': 'Angry Switcher', 'short_name': 'Angry Switcher', 'start_url': './', 'display': 'browser',
                                          'background_color': '#0c0e12', 'theme_color': '#0c0e12',
                                          'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'}]}, indent=2) + '\n')
    en = T['en']
    write('llms.txt', f'''# Angry Switcher

> {en['desc']}

Angry Switcher is a Claude Code plugin. On every prompt it runs a local check, sets code and quotes aside, has Claude Sonnet 5.5 at low effort copy-edit the text with as few changes as possible, verifies that every path, identifier and number survived, and sends the clean text with the user's original attached in an <original> block.

- Install: `/plugin marketplace add timoncool/angry-switcher`, then `/plugin install angry-switcher@angry-switcher`, then `/angry`.
- Cost: about $0.0015 per cleaned message at API prices; nothing extra on a Claude subscription.
- Measured: 97-100% of meaning kept on real messages, 1.4 s median per cleaned message.

## Links

- [Repository]({REPO})
- [Page in English]({SITE})
- [Page in Russian]({SITE}ru.html)
- [Changelog]({REPO}/blob/main/CHANGELOG.md)
''')
    print('[OK] docs: index.html, ru.html, sitemap.xml, robots.txt, site.webmanifest, llms.txt')


if __name__ == '__main__':
    main()
