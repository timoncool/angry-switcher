import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Arm, Card, Entry, Example, Verdict } from '../types'
import { addedTokens, decodeLayout, genreOf, isClearEnough, missingTokens, noise, shield, unshield, wrongLayout } from './detect'
import type { Shielded } from './detect'
import { buildSystem, parseReply, pickExamples } from './rules'

export { addedTokens, decodeLayout, genreOf, isClearEnough, missingTokens, noise, parseReply, buildSystem, pickExamples, shield, unshield, wrongLayout }

const cardsA = atom({ plugin: 'prompt-layer', key: 'cards' } as const, [])
const openA = atom({ plugin: 'prompt-layer', key: 'open' } as const, null)

const RAW = /^raw:\s*/i
const MIN_WORDS = 5
const MAX_CHARS = 2500
const MAX_LOG = 500
const MAX_EXAMPLES = 30
const DEFAULT_MODEL = 'claude-sonnet-5-5'
const TIMEOUT_MS = 8_000
const MAX_TOKENS = 4000
const BREAKER_FAILS = 3
const BREAKER_PAUSE_MS = 10 * 60_000
const PERSON = new Set(['composer', 'bridge', 'sdk'])
const ROLLBACK = /(?:^|[^а-яё])(?:откат|откати|верни|вернуть|отмени)|\b(?:revert|undo|roll ?back)\b/iu
const CORRECTION = /(?:^|[^а-яё])(?:не то|неправильно|неверно|опять|снова|переделай|не работает|сломал)|\b(?:wrong|not what|again|broke|redo)\b/iu

export function wantsLayer(text: string, noisy: boolean): boolean {
  const t = text.trim()
  if (!t || t.startsWith('/') || RAW.test(t) || t.length > MAX_CHARS) return false
  if (noisy) return true
  return t.split(/\s+/).length >= MIN_WORDS && !isClearEnough(t)
}

export type Layered = { verdict: Verdict; sent: string; layered: string | null; note: string | null }

/**
 * What goes out, given Haiku's reply or why there was none: a rewrite only when it is well formed,
 * puts every shielded block back exactly once and lost no protected detail.
 */
export function decide(typed: string, blocks: readonly string[], reply: { ok: true; text: string } | { ok: false; reason: string }, reference = typed): Layered {
  if (!reply.ok) return { verdict: 'failed', sent: typed, layered: null, note: `модель не ответила (${reply.reason}); ушло как написано.` }
  const out = parseReply(reply.text)
  if (out.kind !== 'rewrite') {
    return out.kind === 'unchanged'
      ? { verdict: 'unchanged', sent: typed, layered: null, note: null }
      : { verdict: 'malformed', sent: typed, layered: null, note: 'ответ модели не по формату; ушло как написано.' }
  }
  const restored = unshield(out.text, blocks)
  if (restored === null) return { verdict: 'guard', sent: typed, layered: out.text, note: 'переписывание потеряло код или вставленный текст; ушло как написано.' }
  const missing = missingTokens(typed, restored)
  if (missing.length) return { verdict: 'guard', sent: typed, layered: restored, note: `переписывание потеряло ${missing.slice(0, 3).join(', ')}; ушло как написано.` }
  const added = addedTokens(reference, restored)
  if (added.length) return { verdict: 'guard', sent: typed, layered: restored, note: `переписывание добавило ${added.slice(0, 3).join(', ')}, которых не было; ушло как написано.` }
  return { verdict: 'rewrite', sent: restored, layered: restored, note: null }
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
  '/layer                  статус',
  '/layer on | off         включить или выключить слой',
  '/layer card on | off    карточка «ты написал / ушло» в переписке',
  '/layer lang keep | en   оставлять язык или переводить промпт на английский (ответ остаётся на твоём языке)',
  '/layer ab raw | en | off  A/B: половина промптов уходит как написано (raw) или на английском (en); всё в лог',
  '/layer model <id>       модель слоя (по умолчанию claude-sonnet-5-5)',
  '/layer style <текст>    твои правила стиля; /layer style — показать, /layer style clear — стереть',
  '/layer good             сохранить последнее переписывание как образец',
  '/layer fix <текст>      исправить последнее переписывание и сохранить как образец',
  '/layer examples         образцы; /layer forget <n> — удалить образец',
  '/layer report           сравнение A/B',
  '/layer cost             сколько слой потратил: токены, деньги по /cost, доля в сессии, лимиты подписки',
  '/layer export           выгрузить лог в JSONL в папку плагина',
  '/layer replay <файл>    тестовая комната: прогнать промпты из JSONL через слой, ничего не отправляя',
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

type Asked = { result: Layered; usage: Entry['usage'] }

async function rewrite($: EngineInterface, typed: string, own: Shielded, english: boolean): Promise<Asked> {
  const genre = genreOf(own.text)
  const examples = pickExamples(await get<Example[]>($, 'examples', []), genre)
  const decoded = wrongLayout(own.text) ? decodeLayout(own.text) : null
  const system = buildSystem({ style: await get($, 'style', ''), examples, genre, english, replyIn: replyLanguage(decoded ?? own.text) })
  try {
    const r = await $.model.complete({
      model: await get($, 'model', DEFAULT_MODEL),
      system: [{ text: system, cache: true }],
      prompt: [`<prompt>\n${own.text}\n</prompt>`, decoded && `<decoded_layout>\n${decoded}\n</decoded_layout>`].filter(Boolean).join('\n\n'),
      maxTokens: MAX_TOKENS,
      effort: 'low',
      timeoutMs: TIMEOUT_MS,
    })
    const usage = { input: r.usage.input_tokens, output: r.usage.output_tokens, cacheRead: r.usage.cache_read_input_tokens, cacheWrite: r.usage.cache_creation_input_tokens }
    return { result: decide(typed, own.blocks, r.isAnswered ? { ok: true, text: r.text } : { ok: false, reason: r.reason }, decoded ? `${typed}\n${decoded}` : typed), usage }
  } catch (err) {
    return { result: decide(typed, own.blocks, { ok: false, reason: String(err) }), usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }
  }
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const replyLanguage = (text: string) => (/[а-яё]/i.test(text) ? 'Russian' : 'the language of the conversation')

export const register: Register = on => {
  let failStreak = 0
  let pausedUntil = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'layer', description: 'Prompt Layer: /layer help, команды невидимого слоя' })
    return next(e)
  })

  on('command.run', { command: 'layer' }, async ($, e) => {
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
    if (sub === 'model' && tail) await $.store.set('model', tail)
    if (sub === 'style') {
      if (flag === 'clear') await $.store.set('style', '')
      else if (tail) await $.store.set('style', tail)
      const style = await get($, 'style', '')
      return { text: style ? `Твой стиль:\n${style}` : 'Стиль не задан: /layer style <правила>.' }
    }
    if (sub === 'good' || sub === 'fix') {
      if (!last) return { text: 'Нет последнего переписывания, которое можно сохранить.' }
      const sent = sub === 'fix' ? tail : last.sent
      if (!sent) return { text: 'Напиши исправленный вариант: /layer fix <текст>.' }
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
      return { text: examples.length ? examples.map((x, i) => `${i + 1}. [${x.genre}] ${clip(norm(x.typed), 80)}\n   -> ${clip(norm(x.sent), 120)}`).join('\n') : 'Образцов нет: /layer good или /layer fix <текст>.' }
    }
    if (sub === 'replay') {
      if (!tail) return { text: 'Укажи файл: /layer replay <путь к JSONL с полями typed и context>' }
      const items = (await $.fs.read(tail)).split('\n').filter(l => l.trim()).map(l => JSON.parse(l) as { typed: string })
      const out: string[] = []
      for (const [i, it] of items.entries()) {
        $.ui.status(`Prompt Layer: replay ${i + 1}/${items.length}`)
        const own = shield(it.typed)
        const t0 = await $.clock.now()
        const { result, usage } = await rewrite($, it.typed, own, (await get($, 'lang', 'keep')) === 'en')
        out.push(JSON.stringify({ ...it, noise: noise(own.text), genre: genreOf(own.text), ...result, ms: (await $.clock.now()) - t0, usage }))
      }
      $.ui.status(undefined)
      const path = `${tail.replace(/\.jsonl$/, '')}.out.jsonl`
      await $.fs.write(path, out.join('\n') + '\n')
      return { text: `[OK] ${items.length} промптов прогнано, ничего не отправлено: ${path}` }
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
        `Prompt Layer: ${enabled ? 'ВКЛ' : 'ВЫКЛ'}${pausedUntil > now ? `, на паузе ещё ${Math.ceil((pausedUntil - now) / 60_000)} мин после сбоев Haiku` : ''}`,
        `модель: ${await get($, 'model', DEFAULT_MODEL)}, язык: ${await get($, 'lang', 'keep')}, A/B: ${await get($, 'ab', 'off')}`,
        `карточка: ${(await get($, 'card', true)) ? 'да' : 'нет'}, стиль: ${(await get($, 'style', '')) ? 'задан' : 'нет'}, образцов: ${(await get<Example[]>($, 'examples', [])).length}, записей в логе: ${log.length}`,
        `последний источник промпта: ${await get($, 'lastOrigin', '-')}`,
        spendLine(log, now - DAY_MS, 'траты слоя за 24 часа'),
        '/layer help: все команды',
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
    $.ui.status('Prompt Layer: переписываю…')
    let asked: Asked
    try {
      asked = await rewrite($, typed, own, arm === 'en')
    } finally {
      $.ui.status(undefined)
    }
    const { result, usage } = asked

    const done = await $.clock.now()
    const ledgerAfter = alone ? await ledger($) : null
    const delta = ledgerBefore !== null && ledgerAfter !== null ? ledgerAfter - ledgerBefore : null
    const costUsd = delta !== null && delta > 0 ? delta : null
    if (result.verdict === 'failed') {
      failStreak++
      if (failStreak >= BREAKER_FAILS) {
        pausedUntil = done + BREAKER_PAUSE_MS
        failStreak = 0
        $.ui.toast(`Prompt Layer: модель ${BREAKER_FAILS} раза подряд не ответила, слой на паузе 10 минут; /layer on снимет паузу.`)
      }
    } else {
      failStreak = 0
    }

    const sent = arm === 'raw' ? typed : result.sent
    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`
    await appendLog($, { id, ts: now, arm, noise: found, genre, verdict: result.verdict, typed: clip(typed, 1000), layered: result.layered && clip(result.layered, 1000), sent: clip(sent, 1000), latencyMs: done - now, sessionId: await sessionId($), usage, costUsd })
    await update($, openA, () => id)

    const blind = ab !== 'off'
    if (result.note && !blind) $.ui.toast(`Prompt Layer: ${result.note}`)
    if (!blind && norm(sent) !== norm(typed) && (await get($, 'card', true)) !== false) {
      const card: Card = { typed, sent, noise: found, genre, english: arm === 'en' }
      await update($, cardsA, list => [...list, card].slice(-50))
    }
    return norm(sent) === norm(typed) ? next(e) : next({ ...e, text: sent })
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
        <Text bold color="cyan">Prompt Layer переписал промпт</Text>
        <Text dimColor>ты написал: {clip(hit.typed, 400)}</Text>
        <Text>ушло: {hit.sent}</Text>
        {why ? <Text color="green">{why}</Text> : null}
      </Box>
    )
  })
}
