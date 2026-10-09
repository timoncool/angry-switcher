import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Arm, Card, Entry, Example, Verdict } from '../types'
import { addedTokens, decodeLayout, genreOf, isClearEnough, missingTokens, noise, shield, unshield, wrongLayout } from './detect'
import type { Shielded } from './detect'
import { buildSystem, parseReply, pickExamples } from './rules'

export { ORIGINAL_NOTE }
export { addedTokens, decodeLayout, genreOf, isClearEnough, missingTokens, noise, parseReply, buildSystem, pickExamples, shield, unshield, wrongLayout }

const cardsA = atom({ plugin: 'angry-switcher', key: 'cards' } as const, [])
const openA = atom({ plugin: 'angry-switcher', key: 'open' } as const, null)

const RAW = /^raw:\s*/i
const MIN_WORDS = 5
const MAX_CHARS = 2500
const MAX_LOG = 500
const MAX_EXAMPLES = 30
const DEFAULT_MODEL = 'claude-sonnet-5-5'
const MODEL_ALIASES: Record<string, string> = { sonnet: DEFAULT_MODEL, deepseek: 'deepseek-flash' }
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const NO_DEEPSEEK_KEY = 'нет ключа DeepSeek: задай его в терминале командой claude plugin configure angry-switcher@angry-switcher'
const ASK_MAX_TOKENS = 8000
const TIMEOUT_MS = 8_000
const MAX_TOKENS = 4000
const BREAKER_FAILS = 3
const BREAKER_PAUSE_MS = 10 * 60_000
const PERSON = new Set(['composer', 'bridge', 'sdk'])
const ORIGINAL_NOTE = 'Angry Switcher cleans the user\'s prompts before you read them: typos, swearing, caps and the wrong keyboard layout are fixed by a smaller model. A cleaned prompt ends with an <original> block holding the user\'s own words, swear words cut to their first letter. The cleaned text is the easier read; where it and the original differ in meaning, the original is what the user meant.'
const ROLLBACK = /(?:^|[^а-яё])(?:откат|откати|верни|вернуть|отмени)|\b(?:revert|undo|roll ?back)\b/iu
const CORRECTION = /(?:^|[^а-яё])(?:не то|неправильно|неверно|опять|снова|переделай|не работает|сломал)|\b(?:wrong|not what|again|broke|redo)\b/iu

export function wantsLayer(text: string, noisy: boolean): boolean {
  const t = text.trim()
  if (!t || t.startsWith('/') || RAW.test(t) || t.length > MAX_CHARS) return false
  if (noisy) return true
  return t.split(/\s+/).length >= MIN_WORDS && !isClearEnough(t)
}

export type Layered = { verdict: Verdict; sent: string; layered: string | null; note: string | null; masked?: string | null }

/**
 * What goes out, given the model's reply or why there was none: a rewrite only when it is not empty,
 * puts every shielded block back exactly once and lost no protected detail.
 */
export function decide(typed: string, blocks: readonly string[], reply: { ok: true; text: string } | { ok: false; reason: string }, reference = typed): Layered {
  if (!reply.ok) return { verdict: 'failed', sent: typed, layered: null, note: `модель не ответила (${reply.reason}); ушло как написано.` }
  const out = parseReply(reply.text)
  if (out.kind === 'empty') return { verdict: 'malformed', sent: typed, layered: null, note: 'модель вернула пустой ответ; ушло как написано.' }
  const restored = unshield(out.text, blocks)
  if (restored === null) return { verdict: 'guard', sent: typed, layered: out.text, note: 'переписывание потеряло код или вставленный текст; ушло как написано.' }
  if (restored === typed.trim()) return { verdict: 'unchanged', sent: typed, layered: null, note: null }
  const missing = missingTokens(typed, restored)
  if (missing.length) return { verdict: 'guard', sent: typed, layered: restored, note: `переписывание потеряло ${missing.slice(0, 3).join(', ')}; ушло как написано.` }
  const added = addedTokens(reference, restored)
  if (added.length) return { verdict: 'guard', sent: typed, layered: restored, note: `переписывание добавило ${added.slice(0, 3).join(', ')}, которых не было; ушло как написано.` }
  return { verdict: 'rewrite', sent: restored, layered: restored, note: null, masked: out.masked }
}

type Stat = { n: number; noisy: number; rollback: number; correction: number; turnMs: number[]; outTok: number[] }

const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2)
}
const pct = (k: number, n: number) => (n ? `${Math.round((100 * k) / n)}%` : '-')
const ARM_TITLE: Record<Arm, string> = { layer: 'через слой', raw: 'как написано', en: 'через слой на английском' }

export function report(log: readonly Entry[]): string {
  const rows: string[] = []
  for (const [title, subset] of [['все', log], ['только с мусором (мат, капс, транслит...)', log.filter(e => e.noise.length > 0)]] as const) {
    const by = new Map<Arm, Stat>()
    for (const e of subset) {
      if (!e.next) continue
      const s = by.get(e.arm) ?? { n: 0, noisy: 0, rollback: 0, correction: 0, turnMs: [], outTok: [] }
      s.n++
      if (e.next.noisy) s.noisy++
      if (e.next.rollback) s.rollback++
      if (e.next.correction) s.correction++
      if (e.turn) s.turnMs.push(e.turn.durationMs)
      if (e.turn?.outputTokens != null) s.outTok.push(e.turn.outputTokens)
      by.set(e.arm, s)
    }
    rows.push(`[${title}]`)
    if (!by.size) rows.push('  пока нет данных')
    for (const arm of ['layer', 'raw', 'en'] as const) {
      const s = by.get(arm)
      if (!s) continue
      rows.push(`  ${ARM_TITLE[arm]}: n=${s.n}, следом снова мусор ${pct(s.noisy, s.n)}, откат ${pct(s.rollback, s.n)}, исправление ${pct(s.correction, s.n)}, медиана хода ${median(s.turnMs) ?? '-'} мс, медиана токенов ответа ${median(s.outTok) ?? '-'}`)
    }
  }
  return rows.join('\n')
}

export type SessionSpend = { usd: number | null; limits: readonly { kind: string; percentUsed: number; resetsAt?: string }[] }

const DAY_MS = 86_400_000
const money = (usd: number) => `$${usd < 0.01 ? usd.toFixed(5) : usd.toFixed(3)}`

const usdOf = (xs: readonly Entry[]) => xs.reduce((a, e) => a + (e.costUsd ?? 0), 0)

export function spendLine(log: readonly Entry[], from: number, title: string): string {
  const xs = log.filter(e => e.ts >= from)
  const sum = (k: keyof Entry['usage']) => xs.reduce((a, e) => a + e.usage[k], 0)
  const unknown = xs.filter(e => e.costUsd === null).length
  return `${title}: вызовов ${xs.length}, ${money(usdOf(xs))}${unknown ? ` + ${unknown} без суммы (шли во время хода)` : ''}; токены: вход ${sum('input')}, выход ${sum('output')}, кэш ${sum('cacheRead')} чтение / ${sum('cacheWrite')} запись`
}

export function costReport(log: readonly Entry[], now: number, sessionId: string, session: SessionSpend): string {
  const rows = [
    spendLine(log, now - DAY_MS, 'за 24 часа'),
    spendLine(log, now - 7 * DAY_MS, 'за 7 дней'),
    spendLine(log, 0, 'за всё время'),
  ]
  const mine = usdOf(log.filter(e => e.sessionId === sessionId))
  rows.push(session.usd === null
    ? 'эта сессия: счётчик стоимости недоступен'
    : `эта сессия: слой ${money(mine)} из ${money(session.usd)} по /cost (${session.usd > 0 ? Math.round((100 * mine) / session.usd) : 0}%)`)
  rows.push(session.limits.length
    ? `лимиты подписки сейчас: ${session.limits.map(l => `${l.kind} ${Math.round(l.percentUsed)}%${l.resetsAt ? ` (сброс ${l.resetsAt})` : ''}`).join(', ')}`
    : 'лимиты подписки: нет данных (не подписка или ещё не было ответа API)')
  return rows.join('\n')
}

async function ledger($: EngineInterface): Promise<number | null> {
  try {
    return (await $.session.usage()).cost?.usd ?? null
  } catch {
    return null
  }
}

const HELP = [
  '/angry                  статус',
  '/angry on | off         включить или выключить слой',
  '/angry card on | off    карточка «ты написал / ушло» в переписке',
  '/angry lang keep | en   оставлять язык или переводить промпт на английский (ответ остаётся на твоём языке)',
  '/angry original on | off  прикладывать к переписанному промпту твой оригинал (по умолчанию да)',
  '/angry ab raw | en | off  A/B: половина промптов уходит как написано (raw) или на английском (en); всё в лог',
  '/angry model sonnet | deepseek  модель слоя: Sonnet по подписке (по умолчанию) или DeepSeek по своему ключу; можно и точный id',
  '/ask-ds <вопрос>        спросить DeepSeek напрямую, мимо Claude (нужен ключ DeepSeek)',
  '/angry style <текст>    твои правила стиля; /angry style — показать, /angry style clear — стереть',
  '/angry good             сохранить последнее переписывание как образец',
  '/angry fix <текст>      исправить последнее переписывание и сохранить как образец',
  '/angry examples         образцы; /angry forget <n> — удалить образец',
  '/angry report           сравнение A/B',
  '/angry cost             сколько слой потратил: токены, деньги по /cost, доля в сессии, лимиты подписки',
  '/angry export           выгрузить лог в JSONL в папку плагина',
  '/angry replay <файл>    тестовая комната: прогнать промпты из JSONL через слой, ничего не отправляя (то же умеет инструмент replay для модели)',
  'raw: в начале — отправить как есть',
].join('\n')

async function get<T>($: EngineInterface, key: string, fallback: T): Promise<T> {
  const v = await $.store.get(key)
  return v === undefined ? fallback : (v as T)
}

async function appendLog($: EngineInterface, entry: Entry) {
  const log = await get<Entry[]>($, 'log', [])
  await $.store.set('log', [...log, entry].slice(-MAX_LOG))
}

async function patchEntry($: EngineInterface, id: string, patch: (e: Entry) => Entry) {
  const log = await get<Entry[]>($, 'log', [])
  const i = log.findIndex(e => e.id === id)
  if (i < 0) return
  const next = [...log]
  next[i] = patch(log[i]!)
  await $.store.set('log', next)
}


async function sessionId($: EngineInterface) {
  try {
    return await $.session.id()
  } catch {
    return ''
  }
}

type DeepSeekAsk = { model: string; system?: string; prompt: string; maxTokens: number; timeoutMs?: number }
type DeepSeekReply = { ok: true; text: string; usage: Entry['usage'] } | { ok: false; reason: string }
type DeepSeekBody = { choices?: { message?: { content?: string } }[]; usage?: { completion_tokens?: number; prompt_cache_hit_tokens?: number; prompt_cache_miss_tokens?: number } }

/** One chat completion at low reasoning effort (without reasoning it keeps threats and guesses words); `timeoutMs` bounds the wait, since the host's fetch takes no signal. */
async function deepseek($: EngineInterface, key: string, ask: DeepSeekAsk): Promise<DeepSeekReply> {
  if (!key) return { ok: false, reason: NO_DEEPSEEK_KEY }
  const call = $.http.fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: ask.model,
      messages: [...(ask.system ? [{ role: 'system', content: ask.system }] : []), { role: 'user', content: ask.prompt }],
      max_tokens: ask.maxTokens,
      thinking: { type: 'enabled' },
      reasoning_effort: 'low',
      stream: false,
    }),
  })
  const stop = new AbortController()
  const r = ask.timeoutMs ? await Promise.race([call, $.clock.sleep(ask.timeoutMs, { signal: stop.signal }).then(() => null, () => null)]) : await call
  stop.abort()
  if (!r) return { ok: false, reason: `DeepSeek не уложился в ${ask.timeoutMs} мс` }
  if (!r.ok) return { ok: false, reason: `DeepSeek HTTP ${r.status}: ${clip(r.text, 200)}` }
  const body = JSON.parse(r.text) as DeepSeekBody
  const text = body.choices?.[0]?.message?.content ?? ''
  if (!text.trim()) return { ok: false, reason: 'DeepSeek вернул пустой ответ' }
  const u = body.usage
  return { ok: true, text, usage: { input: u?.prompt_cache_miss_tokens ?? 0, output: u?.completion_tokens ?? 0, cacheRead: u?.prompt_cache_hit_tokens ?? 0, cacheWrite: 0 } }
}

type Asked = { result: Layered; usage: Entry['usage']; model: string }

async function rewrite($: EngineInterface, typed: string, own: Shielded, english: boolean, deepseekKey: string, modelOverride?: string): Promise<Asked> {
  const genre = genreOf(own.text)
  const examples = pickExamples(await get<Example[]>($, 'examples', []), genre)
  const decoded = wrongLayout(own.text) ? decodeLayout(own.text) : null
  const system = buildSystem({ style: await get($, 'style', ''), examples, genre, english, replyIn: replyLanguage(decoded ?? own.text) })
  const model = modelOverride ?? (await get($, 'model', DEFAULT_MODEL))
  const prompt = [`<prompt>\n${own.text}\n</prompt>`, decoded && `<decoded_layout>\n${decoded}\n</decoded_layout>`].filter(Boolean).join('\n\n')
  const reference = decoded ? `${typed}\n${decoded}` : typed
  try {
    if (model.startsWith('deepseek')) {
      const r = await deepseek($, deepseekKey, { model, system, prompt, maxTokens: MAX_TOKENS, timeoutMs: TIMEOUT_MS })
      return { result: decide(typed, own.blocks, r.ok ? { ok: true, text: r.text } : { ok: false, reason: r.reason }, reference), usage: r.ok ? r.usage : { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, model }
    }
    const r = await $.model.complete({
      model,
      system: [{ text: system, cache: true }],
      prompt,
      maxTokens: MAX_TOKENS,
      effort: 'low',
      timeoutMs: TIMEOUT_MS,
    })
    const usage = { input: r.usage.input_tokens, output: r.usage.output_tokens, cacheRead: r.usage.cache_read_input_tokens, cacheWrite: r.usage.cache_creation_input_tokens }
    return { result: decide(typed, own.blocks, r.isAnswered ? { ok: true, text: r.text } : { ok: false, reason: r.reason }, reference), usage, model }
  } catch (err) {
    return { result: decide(typed, own.blocks, { ok: false, reason: String(err) }), usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, model }
  }
}

/** The test room: every prompt of a JSONL file through the layer, one call each, nothing sent; results beside the file. */
async function replay($: EngineInterface, file: string, deepseekKey: string, model?: string): Promise<string> {
  const items = (await $.fs.read(file)).split('\n').filter(l => l.trim()).map(l => JSON.parse(l) as { typed: string })
  const out: string[] = []
  for (const [i, it] of items.entries()) {
    $.ui.status(`Angry Switcher: replay ${i + 1}/${items.length}`)
    const own = shield(it.typed)
    const t0 = await $.clock.now()
    const asked = await rewrite($, it.typed, own, (await get($, 'lang', 'keep')) === 'en', deepseekKey, model)
    out.push(JSON.stringify({ ...it, noise: noise(own.text), genre: genreOf(own.text), ...asked.result, ms: (await $.clock.now()) - t0, model: asked.model, usage: asked.usage }))
  }
  $.ui.status(undefined)
  const path = `${file.replace(/\.jsonl$/, '')}.out.jsonl`
  await $.fs.write(path, out.join('\n') + '\n')
  return `[OK] ${items.length} промптов прогнано, ничего не отправлено: ${path}`
}

const bare = (s: string) => s.replace(/⟦\d+⟧/g, '').replace(/\n{3,}/g, '\n\n').trim()

/**
 * The rewrite followed by the user's own words, so the main model can catch a meaning the rewrite lost; code, pastes and
 * quotes are already verbatim in the rewrite. `masked` is the rewriting model's copy with the swearing cut, absent when
 * there was none.
 */
export function withOriginal(rewrite: string, own: string, masked: string | null = null): string {
  const original = bare(masked ?? own)
  return original ? `${rewrite}\n\n<original>\n${original}\n</original>` : rewrite
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const replyLanguage = (text: string) => (/[а-яё]/i.test(text) ? 'Russian' : 'the language of the conversation')

export const register: Register = (on, options) => {
  const deepseekKey = typeof options.deepseek_api_key === 'string' ? options.deepseek_api_key.trim() : ''
  let failStreak = 0
  let pausedUntil = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'angry', description: 'Angry Switcher: /angry help, команды невидимого слоя' })
    await $.command.register({ name: 'ask-ds', description: 'Angry Switcher: спросить DeepSeek напрямую, мимо Claude', argumentHint: '<вопрос>' })
    await $.tool.register({
      name: 'replay',
      description: 'Angry Switcher test room: rewrites every prompt of a JSONL file (one object per line with a "typed" field) through the layer with its current rules and model, one call per prompt, sends nothing, and writes the results to <file>.out.jsonl.',
      inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Absolute path of the JSONL file' }, model: { type: 'string', description: 'Model to run instead of the layer\'s current one: sonnet, deepseek or an exact id' } }, required: ['path'] },
    })
    return next(e)
  })

  on('tool.call', { tool: 'mcp__angry-switcher__replay' }, async ($, e) => {
    const { path, model } = e as { path?: unknown; model?: unknown }
    if (typeof path !== 'string' || !path.trim()) return { deny: 'path: absolute path of a JSONL file with a "typed" field per line' }
    const chosen = typeof model === 'string' && model.trim() ? (MODEL_ALIASES[model.trim().toLowerCase()] ?? model.trim()) : undefined
    return { result: await replay($, path.trim(), deepseekKey, chosen) }
  })

  on('command.run', { command: 'ask-ds' }, async ($, e) => {
    const question = e.args.trim()
    if (!question) return { text: 'Напиши вопрос: /ask-ds <вопрос>. Ответит DeepSeek, Claude в этом не участвует.' }
    $.ui.status('Angry Switcher: спрашиваю DeepSeek…')
    try {
      const r = await deepseek($, deepseekKey, { model: MODEL_ALIASES.deepseek!, prompt: question, maxTokens: ASK_MAX_TOKENS })
      return { text: r.ok ? r.text : `DeepSeek не ответил: ${r.reason}.` }
    } finally {
      $.ui.status(undefined)
    }
  })

  on('command.run', { command: 'angry' }, async ($, e) => {
    const args = e.args.trim()
    const [head = ''] = args.split(/\s+/)
    const sub = head.toLowerCase()
    const tail = args.slice(head.length).trim()
    const flag = tail.toLowerCase()
    const log = await get<Entry[]>($, 'log', [])
    const last = log.findLast(x => x.verdict === 'rewrite' && x.arm !== 'raw')

    if (sub === 'help') return { text: HELP }
    if (sub === 'on' || sub === 'off') {
      await $.store.set('enabled', sub === 'on')
      if (sub === 'on') pausedUntil = 0
    }
    if (sub === 'card' && (flag === 'on' || flag === 'off')) await $.store.set('card', flag === 'on')
    if (sub === 'lang' && (flag === 'keep' || flag === 'en')) await $.store.set('lang', flag)
    if (sub === 'ab' && (flag === 'raw' || flag === 'en' || flag === 'off')) await $.store.set('ab', flag)
    if (sub === 'original' && (flag === 'on' || flag === 'off')) await $.store.set('original', flag === 'on')
    if (sub === 'model' && tail) {
      const model = MODEL_ALIASES[flag] ?? tail
      if (model.startsWith('deepseek') && !deepseekKey) return { text: `Модель не переключена: ${NO_DEEPSEEK_KEY}.` }
      await $.store.set('model', model)
    }
    if (sub === 'style') {
      if (flag === 'clear') await $.store.set('style', '')
      else if (tail) await $.store.set('style', tail)
      const style = await get($, 'style', '')
      return { text: style ? `Твой стиль:\n${style}` : 'Стиль не задан: /angry style <правила>.' }
    }
    if (sub === 'good' || sub === 'fix') {
      if (!last) return { text: 'Нет последнего переписывания, которое можно сохранить.' }
      const sent = sub === 'fix' ? tail : last.sent
      if (!sent) return { text: 'Напиши исправленный вариант: /angry fix <текст>.' }
      const examples = await get<Example[]>($, 'examples', [])
      const saved = [...examples, { typed: last.typed, sent, genre: last.genre }].slice(-MAX_EXAMPLES)
      await $.store.set('examples', saved)
      return { text: `Образец сохранён (${saved.length} из ${MAX_EXAMPLES}).` }
    }
    if (sub === 'examples' || sub === 'forget') {
      const examples = await get<Example[]>($, 'examples', [])
      if (sub === 'forget') {
        const n = Number(flag)
        if (!Number.isInteger(n) || n < 1 || n > examples.length) return { text: `Номер от 1 до ${examples.length}.` }
        examples.splice(n - 1, 1)
        await $.store.set('examples', examples)
      }
      return { text: examples.length ? examples.map((x, i) => `${i + 1}. [${x.genre}] ${clip(norm(x.typed), 80)}\n   -> ${clip(norm(x.sent), 120)}`).join('\n') : 'Образцов нет: /angry good или /angry fix <текст>.' }
    }
    if (sub === 'replay') {
      if (!tail) return { text: 'Укажи файл: /angry replay <путь к JSONL с полем typed>' }
      return { text: await replay($, tail, deepseekKey) }
    }
    if (sub === 'report') return { text: report(log) }
    if (sub === 'cost') {
      const u = await $.session.usage()
      return { text: costReport(log, await $.clock.now(), await sessionId($), { usd: u.cost?.usd ?? null, limits: u.rateLimits }) }
    }
    if (sub === 'export') {
      const path = `${$.plugin.root}/data/log-${await $.clock.now()}.jsonl`
      await $.fs.write(path, log.map(x => JSON.stringify(x)).join('\n') + '\n')
      return { text: `[OK] ${log.length} записей: ${path}` }
    }

    const enabled = (await get($, 'enabled', true)) !== false
    const now = await $.clock.now()
    return {
      text: [
        `Angry Switcher: ${enabled ? 'ВКЛ' : 'ВЫКЛ'}${pausedUntil > now ? `, на паузе ещё ${Math.ceil((pausedUntil - now) / 60_000)} мин после сбоев модели` : ''}`,
        `модель: ${await get($, 'model', DEFAULT_MODEL)}, ключ DeepSeek: ${deepseekKey ? 'есть' : 'нет'}, язык: ${await get($, 'lang', 'keep')}, A/B: ${await get($, 'ab', 'off')}, оригинал рядом: ${(await get($, 'original', true)) !== false ? 'да' : 'нет'}`,
        `карточка: ${(await get($, 'card', true)) ? 'да' : 'нет'}, стиль: ${(await get($, 'style', '')) ? 'задан' : 'нет'}, образцов: ${(await get<Example[]>($, 'examples', [])).length}, записей в логе: ${log.length}`,
        `последний источник промпта: ${await get($, 'lastOrigin', '-')}`,
        spendLine(log, now - DAY_MS, 'траты слоя за 24 часа'),
        'все команды: /angry help',
      ].join('\n'),
    }
  })

  on('prompt.submit', async ($, e, next) => {
    await $.store.set('lastOrigin', e.origin.kind)
    if (!PERSON.has(e.origin.kind)) return next(e)
    const typed = e.text.trim()
    if (typed.startsWith('/')) return next(e)

    const now = await $.clock.now()
    const own = shield(typed)
    const openId = await read($, openA)
    if (openId) {
      await patchEntry($, openId, x => x.next ? x : { ...x, next: { noisy: noise(own.text).length > 0, rollback: ROLLBACK.test(own.text), correction: CORRECTION.test(own.text), gapMs: now - x.ts } })
      await update($, openA, () => null)
    }

    if (RAW.test(typed)) return next({ ...e, text: typed.replace(RAW, '') })
    if ((await get($, 'enabled', true)) === false || pausedUntil > now) return next(e)
    const found = noise(own.text)
    if (!wantsLayer(own.text, found.length > 0)) return next(e)

    const ab = await get<'off' | 'raw' | 'en'>($, 'ab', 'off')
    const lang = await get<'keep' | 'en'>($, 'lang', 'keep')
    const coin = Math.random() < 0.5
    const arm: Arm = ab === 'raw' ? (coin ? 'raw' : 'layer') : ab === 'en' ? (coin ? 'en' : 'layer') : lang === 'en' ? 'en' : 'layer'
    const genre = genreOf(own.text)
    const alone = e.turnId === undefined
    const ledgerBefore = alone ? await ledger($) : null
    $.ui.status('Angry Switcher: переписываю…')
    let asked: Asked
    try {
      asked = await rewrite($, typed, own, arm === 'en', deepseekKey)
    } finally {
      $.ui.status(undefined)
    }
    const { result, usage, model } = asked

    const done = await $.clock.now()
    const ledgerAfter = alone ? await ledger($) : null
    const delta = ledgerBefore !== null && ledgerAfter !== null ? ledgerAfter - ledgerBefore : null
    const costUsd = delta !== null && delta > 0 ? delta : null
    if (result.verdict === 'failed') {
      failStreak++
      if (failStreak >= BREAKER_FAILS) {
        pausedUntil = done + BREAKER_PAUSE_MS
        failStreak = 0
        $.ui.toast(`Angry Switcher: модель ${BREAKER_FAILS} раза подряд не ответила, слой на паузе 10 минут; /angry on снимет паузу.`)
      }
    } else {
      failStreak = 0
    }

    const original = (await get($, 'original', true)) !== false
    const sent = arm === 'raw' ? typed : original && result.verdict === 'rewrite' ? withOriginal(result.sent, wrongLayout(own.text) ? decodeLayout(own.text) : own.text, result.masked ?? null) : result.sent
    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`
    await appendLog($, { id, ts: now, arm, noise: found, genre, verdict: result.verdict, typed: clip(typed, 1000), layered: result.layered && clip(result.layered, 1000), sent: clip(sent, 1000), latencyMs: done - now, sessionId: await sessionId($), model, usage, costUsd })
    await update($, openA, () => id)

    const blind = ab !== 'off'
    if (result.note && !blind) $.ui.toast(`Angry Switcher: ${result.note}`)
    if (!blind && norm(sent) !== norm(typed) && (await get($, 'card', true)) !== false) {
      const card: Card = { typed, sent, shown: result.sent, noise: found, genre, english: arm === 'en' }
      await update($, cardsA, list => [...list, card].slice(-50))
    }
    return norm(sent) === norm(typed) ? next(e) : next({ ...e, text: sent })
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if ((await get($, 'enabled', true)) === false || (await get($, 'original', true)) === false) return composed
    return { sections: [...composed.sections, { id: 'angry-switcher:original', text: ORIGINAL_NOTE, scope: 'session' as const }] }
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      const openId = await read($, openA)
      if (openId) {
        await patchEntry($, openId, x => x.turn ? x : { ...x, turn: { durationMs: e.durationMs, outputTokens: e.usage?.output_tokens ?? null, aborted: e.isAborted } })
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (e.props.isExpanded) return next(e)
    const list = await read($, cardsA)
    const hit = list.find(c => norm(c.sent) === norm(e.props.text))
    if (!hit) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const why = [
      hit.noise.length ? `почищено: ${hit.noise.join(', ')}` : null,
      hit.genre !== 'general' ? `тип: ${hit.genre}` : null,
      hit.english ? 'переведено на английский' : null,
    ].filter(Boolean).join(' · ')
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">Angry Switcher переписал промпт</Text>
        <Text dimColor>ты написал: {clip(hit.typed, 400)}</Text>
        <Text>ушло: {hit.shown}</Text>
        {why ? <Text color="green">{why}</Text> : null}
      </Box>
    )
  })
}
