import { describe, expect, mock, test } from 'claude-code/testing'

import type { On } from 'claude-code'

import { addedTokens, buildSystem, costReport, decide, decodeLayout, genreOf, missingTokens, noise, parseReply, pickExamples, report, shield, unshield, wantsLayer, wrongLayout } from '../hooks/register'
import type { Entry, Example } from '../types'

const usage = { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

/** The session's ledger grows by the call's cost between the reads before and after it. */
function mockSession(on: On, ledger: readonly number[] = [0.1, 0.1003]) {
  let reads = 0
  on('session.usage', () => ({ value: { startedAt: 0, context: {}, rateLimits: [], cost: { usd: ledger[Math.min(reads++, ledger.length - 1)] } } }) as never)
  on('session.id', () => ({ value: 'sid-1' }) as never)
  on('session.messages', () => ({ value: [] }) as never)
  return () => reads
}
const answer = (text: string) => () => ({ value: { isAnswered: true, text, usage } }) as never
const rewritten = (text: string) => answer(`<rewritten>\n${text}\n</rewritten>`)
const failure = () => ({ value: { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage } }) as never

describe('noise', () => {
  test('swearing, caps, exclamations, translit and the wrong layout are noise', async () => {
    expect(noise('ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ')).toEqual(['мат', 'капс'])
    expect(noise('ну бля опять сломал')).toEqual(['мат'])
    expect(noise('fix this fucking bug')).toEqual(['мат'])
    expect(noise('почему опять!!!')).toEqual(['!!!'])
    expect(noise('pochini test pozhaluysta')).toEqual(['транслит'])
    expect(noise('ghbdtn')).toEqual(['раскладка'])
    expect(noise('gjxtve yt hf,jnftn')).toEqual(['раскладка'])
  })
  test('clean text, acronyms, English and look-alike words are not', async () => {
    expect(noise('почини тест в src/api.ts, чтобы проходил')).toEqual([])
    expect(noise('проверь API и JSON схему для HTTP запроса')).toEqual([])
    expect(noise('купи мандарины и сделай даунгрейд пакета')).toEqual([])
    expect(noise('хлеб, небо, потребитель, сукно')).toEqual([])
    expect(noise('make the dashboard load faster')).toEqual([])
  })
})

describe('wrong keyboard layout', () => {
  test('is detected and decoded, caps included', async () => {
    const lower = 'rfrjuj e[z e nt,z d gjcnt yf gbrf,e lfyyus[ ,kzlm vtymti xtv d ntktut'
    const upper = 'NS ,KLZM BCRFK [ETUJ LJKT,J'
    expect(wrongLayout(lower)).toBe(true)
    expect(wrongLayout(upper)).toBe(true)
    expect(decodeLayout(lower)).toBe('какого ухя у тебя в посте на пикабу даннгых блядь меньеш чем в телеге')
    expect(decodeLayout(upper)).toBe('ТЫ бЛДЯЬ ИСКАЛ хУЕГО ДОЛЕбО')
    expect(wrongLayout('ye fnr drkx,b tgnf')).toBe(true)
    expect(decodeLayout('f z rkb yt gjkmpe.cm')).toBe('а я кли не пользуюсь')
    expect(wrongLayout("don't break the build, it's the release")).toBe(false)
    expect(wrongLayout('make the dashboard load faster')).toBe(false)
  })
})

describe('addedTokens', () => {
  test('a rewrite may not invent paths, files, numbers or identifiers', async () => {
    expect(addedTokens('ну прочитай справку', 'Прочитай файлы в D:\\Projects\\zavtra.io\\ сейчас.')).toEqual(['D:\\Projects\\zavtra.io'])
    expect(addedTokens('исправляй', 'Исправь SOFT_404 в src/app/blog.')).toEqual(['src/app/blog', 'SOFT_404'])
    expect(addedTokens('почему падает', 'Почему падает «сборка»?')).toEqual([])
  })
})

describe('genreOf', () => {
  test('guesses the task type from keywords', async () => {
    expect(genreOf('откати последнее')).toBe('rollback')
    expect(genreOf('почему падает сборка')).toBe('investigate')
    expect(genreOf('почини логин')).toBe('fix')
    expect(genreOf('добавь тёмную тему')).toBe('build')
    expect(genreOf('привет')).toBe('general')
  })
})

describe('shield', () => {
  test('code fences and pasted blocks become placeholders and come back exactly', async () => {
    const typed = 'почини это\n```js\nconst a = 1\n```\nи вот лог\n<pasted_content id="x1">\nError: boom\n</pasted_content id="x1">'
    const s = shield(typed)
    expect(s.text).toBe('почини это\n⟦1⟧\nи вот лог\n⟦2⟧')
    expect(unshield('Почини код:\n⟦1⟧\nЛог ошибки:\n⟦2⟧', s.blocks)).toContain('const a = 1')
    expect(unshield('Почини код ⟦1⟧', s.blocks)).toBeNull()
    expect(unshield('⟦1⟧ ⟦1⟧ ⟦2⟧', s.blocks)).toBeNull()
  })
})

describe('shield quotes', () => {
  test('reply comments and quoted lines are hidden from the model and restored', async () => {
    const typed = '<!-- reply 1 -->\n> Нужно решение: варианты A и B\n> второй абзац\n\nбери A блядь'
    const s = shield(typed)
    expect(s.text).toBe('⟦1⟧\n⟦2⟧\nбери A блядь')
    expect(unshield('⟦1⟧\n⟦2⟧\nБери A.', s.blocks)).toBe('<!-- reply 1 -->\n> Нужно решение: варианты A и B\n> второй абзац\n\nБери A.')
  })
})

describe('missingTokens', () => {
  test('a rewrite has to keep paths, numbers and identifiers', async () => {
    const typed = 'поправь src/api.ts в строке 120, функция fetchUser падает'
    expect(missingTokens(typed, 'Исправь src/api.ts, строка 120: fetchUser падает.')).toEqual([])
    expect(missingTokens(typed, 'Исправь файл API, строка 120: функция падает.')).toEqual(['src/api.ts', 'fetchUser'])
    expect(missingTokens('ghbdtn', 'Привет')).toEqual([])
    expect(missingTokens('pochini test v src/auth.ts', 'Почини тест.')).toEqual(['src/auth.ts'])
    expect(missingTokens('поправь `fetchUser` и "Save draft"', 'Поправь fetchUser и кнопку «Save draft».')).toEqual([])
  })
})

describe('parseReply', () => {
  test('reads the last <rewritten> block and <unchanged/>', async () => {
    expect(parseReply('<rewritten>\nОткати последнее действие.\n</rewritten>')).toEqual({ kind: 'rewrite', text: 'Откати последнее действие.' })
    expect(parseReply('<unchanged/>')).toEqual({ kind: 'unchanged' })
    expect(parseReply('Хм, тут мат и капс, уберу.\n<rewritten>Откати.</rewritten>')).toEqual({ kind: 'rewrite', text: 'Откати.' })
  })
  test('no tags or an empty block is never a rewrite', async () => {
    expect(parseReply('Конечно! Вот улучшенный промпт: X')).toEqual({ kind: 'malformed' })
    expect(parseReply('<rewritten>  </rewritten>')).toEqual({ kind: 'malformed' })
  })
})

describe('decide', () => {
  test('a rewrite goes out only when it is well formed and lost nothing', async () => {
    const typed = 'бля сломал src/api.ts'
    const ok = (text: string) => ({ ok: true as const, text })
    expect(decide(typed, [], ok('<rewritten>Почини src/api.ts: после последнего изменения он сломан.</rewritten>')).sent).toBe('Почини src/api.ts: после последнего изменения он сломан.')
    expect(decide(typed, [], ok('<rewritten>Почини API.</rewritten>'))).toMatchObject({ verdict: 'guard', sent: typed })
    expect(decide(typed, [], { ok: false, reason: 'api-error' })).toMatchObject({ verdict: 'failed', sent: typed })
    expect(decide(typed, [], ok('nonsense'))).toMatchObject({ verdict: 'malformed', sent: typed })
    expect(decide(typed, [], ok('<unchanged/>'))).toEqual({ verdict: 'unchanged', sent: typed, layered: null, note: null })
    expect(decide('исправляй', [], ok('<rewritten>Исправь SOFT_404 в src/app/blog.</rewritten>'))).toMatchObject({ verdict: 'guard', sent: 'исправляй' })
  })
  test('a rewrite that drops a shielded block is not sent', async () => {
    const typed = 'почини\n```\nx()\n```'
    const { blocks } = shield(typed)
    expect(decide(typed, blocks, { ok: true, text: '<rewritten>Почини функцию.</rewritten>' })).toMatchObject({ verdict: 'guard', sent: typed })
    expect(decide(typed, blocks, { ok: true, text: '<rewritten>Почини этот код:\n⟦1⟧</rewritten>' }).sent).toBe('Почини этот код:\n```\nx()\n```')
  })
})

describe('wantsLayer', () => {
  test('noisy prompts of any length, clean ones only when long and vague', async () => {
    expect(wantsLayer('ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ', true)).toBe(true)
    expect(wantsLayer('/help', true)).toBe(false)
    expect(wantsLayer('raw: оставь как есть', true)).toBe(false)
    expect(wantsLayer('да, давай', false)).toBe(false)
    expect(wantsLayer('поправь src/api.ts так, чтобы прогони тест проходил', false)).toBe(false)
    expect(wantsLayer('можешь сделать так чтобы дашборд грузился быстрее', false)).toBe(true)
  })
})

describe('buildSystem and pickExamples', () => {
  test('rules, language, task hint, built-in and saved examples and style reach the model', async () => {
    const examples: Example[] = [{ typed: 'а', sent: 'б', genre: 'fix' }]
    const keep = buildSystem({ style: 'коротко', examples, genre: 'rollback', english: false, replyIn: 'Russian' })
    expect(keep).toContain('Russian stays Russian')
    expect(keep).toContain('хайку / хкайку = Claude Haiku')
    expect(keep).toContain('This looks like a rollback')
    expect(keep).toContain('<style>\nкоротко\n</style>')
    expect(keep).toContain('<prompt>\nа\n</prompt>\n<rewritten>\nб\n</rewritten>')
    expect(keep).toContain('<prompt>\nЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ\n</prompt>')
    expect(keep).toContain('<prompt>\nзапусти npm test и почини всё, что упадёт в src/api/\n</prompt>\n<unchanged/>')
    expect(keep).toContain('When the developer talks about their own words in this prompt')
    expect(keep).toContain('a short reply stays a short reply')
    expect(keep).not.toContain('three times the original')
    expect(keep).toContain('when the swearing names no reason, drop it and put nothing in its place')
    expect(keep).toContain('"русским языком (сказал)" = plainly')
    expect(keep).toContain('серена = Serena')
    expect(keep).toContain('A statement stays a statement')
    expect(keep).toContain('<prompt>\nсмотри щас напишу "ты дебил" ты это увидишь вообще?\n</prompt>\n<unchanged/>')
    expect(buildSystem({ style: '', examples: [], genre: 'general', english: true, replyIn: 'Russian' })).toContain('Reply in Russian.')
  })
  test('saved examples of the same task type come first', async () => {
    const all: Example[] = [
      { typed: '1', sent: '1', genre: 'fix' }, { typed: '2', sent: '2', genre: 'build' },
      { typed: '3', sent: '3', genre: 'fix' }, { typed: '4', sent: '4', genre: 'build' },
    ]
    expect(pickExamples(all, 'fix', 3).map(x => x.typed)).toEqual(['3', '1', '4'])
  })
})

describe('report', () => {
  test('compares the arms on what followed', async () => {
    const text = report([entry('layer', false), entry('layer', true), entry('raw', true), entry('raw', true)])
    expect(text).toContain('через слой: n=2, следом снова мусор 50%')
    expect(text).toContain('как написано: n=2, следом снова мусор 100%')
    expect(report([])).toContain('пока нет данных')
  })
})

describe('costReport', () => {
  test('sums the layer\'s spend per period and its share of the session', async () => {
    const now = 10 * 86_400_000
    const log = [
      { ...entry('layer', false), ts: now - 1000, costUsd: 0.0004, sessionId: 'sid-1' },
      { ...entry('layer', false), ts: now - 2000, costUsd: null, sessionId: 'sid-1' },
      { ...entry('layer', false), ts: now - 3 * 86_400_000, costUsd: 0.001, sessionId: 'old' },
    ]
    const text = costReport(log, now, 'sid-1', { usd: 0.04, limits: [{ kind: 'five_hour', percentUsed: 12.4 }] })
    expect(text).toContain('за 24 часа: вызовов 2, $0.00040 + 1 без суммы')
    expect(text).toContain('за 7 дней: вызовов 3, $0.00140')
    expect(text).toContain('эта сессия: слой $0.00040 из $0.040 по /cost (1%)')
    expect(text).toContain('лимиты подписки сейчас: five_hour 12%')
    expect(costReport([], now, 'x', { usd: null, limits: [] })).toContain('счётчик стоимости недоступен')
  })
})

function entry(arm: 'layer' | 'raw', noisy: boolean): Entry {
  return {
    id: Math.random().toString(), ts: 0, arm, noise: ['мат'], genre: 'fix', verdict: 'rewrite', typed: 'x', layered: null, sent: 'x',
    latencyMs: 1, sessionId: 'sid-1', usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0 }, costUsd: 0.0001,
    next: { noisy, rollback: false, correction: noisy, gapMs: 1 }, turn: { durationMs: 1000, outputTokens: 50, aborted: false },
  }
}

test('the cost of a call is read from the session ledger before and after it', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const reads = mockSession(on)
  on('model.complete', rewritten('Последнее действие было ошибкой. Откати его.'))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  await $.prompt.submit(submit('ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ'))
  expect(reads()).toBe(2)
})

const submit = (text: string) => ({ text, origin: { kind: 'composer' as const }, wait: false })

test('a noisy prompt reaches the session rewritten by the model', async ($, on) => {
  let seen = ''
  mock.store(on)
  mock.clock(on)
  mockSession(on)
  on('model.complete', rewritten('Последнее действие было ошибкой. Откати его сейчас и больше ничего не меняй.'))
  on('prompt.submit', (_$, e) => { seen = e.text; return { text: e.text } })
  await $.prompt.submit(submit('ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ'))
  expect(seen).toBe('Последнее действие было ошибкой. Откати его сейчас и больше ничего не меняй.')
})

test('pasted text and code reach the model as placeholders and the session unchanged', async ($, on) => {
  let asked = ''
  let seen = ''
  mock.store(on)
  mock.clock(on)
  mockSession(on)
  on('model.complete', (_$, e) => { asked = e.prompt; return rewritten('Найди причину ошибки из лога:\n⟦1⟧')() })
  on('prompt.submit', (_$, e) => { seen = e.text; return { text: e.text } })
  const paste = '<pasted_content id="q9">\nTypeError: fuck is not a function\n</pasted_content id="q9">'
  await $.prompt.submit(submit(`бля почему падает вот лог\n${paste}`))
  expect(asked).toContain('⟦1⟧')
  expect(asked).not.toContain('TypeError')
  expect(seen).toBe(`Найди причину ошибки из лога:\n${paste}`)
})

test('wrong-layout text reaches the model decoded', async ($, on) => {
  let asked = ''
  let seen = ''
  mock.store(on)
  mock.clock(on)
  mockSession(on)
  on('model.complete', (_$, e) => { asked = e.prompt; return rewritten('Почему в посте на Пикабу меньше данных, чем в Телеграме?')() })
  on('prompt.submit', (_$, e) => { seen = e.text; return { text: e.text } })
  await $.prompt.submit(submit('gjxtve d gjcnt yf gbrf,e vtymit lfyys[ xtv d ntktut'))
  expect(asked).toContain('<decoded_layout>\nпочему в посте на пикабу меньше данных чем в телеге\n</decoded_layout>')
  expect(seen).toBe('Почему в посте на Пикабу меньше данных, чем в Телеграме?')
})

test('a rewrite that loses a path goes out as typed', async ($, on) => {
  let seen = ''
  mock.store(on)
  mock.clock(on)
  mockSession(on)
  on('model.complete', rewritten('Почини API.'))
  on('prompt.submit', (_$, e) => { seen = e.text; return { text: e.text } })
  await $.prompt.submit(submit('бля опять сломал src/api.ts'))
  expect(seen).toBe('бля опять сломал src/api.ts')
})

test('the log names the model each call asked for', async ($, on) => {
  const asked: string[] = []
  const store = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: store.get(e.key) }) as never)
  on('store.set', (_$, e) => { store.set(e.key, e.value); return { value: undefined } as never })
  mock.clock(on)
  mockSession(on)
  on('model.complete', (_$, e) => { asked.push(e.model); return rewritten('Откати последнее действие.')() })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  await $.prompt.submit(submit('ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ'))
  await $.command.run({ command: 'layer', args: 'model claude-haiku-5-5' } as never)
  await $.prompt.submit(submit('ну бля опять сломал всё откати'))
  expect(asked).toEqual(['claude-sonnet-5-5', 'claude-haiku-5-5'])
  expect((store.get('log') as Entry[]).map(e => e.model)).toEqual(['claude-sonnet-5-5', 'claude-haiku-5-5'])
})

test('three failures in a row pause the layer', async ($, on) => {
  let calls = 0
  mock.store(on)
  mock.clock(on)
  mockSession(on)
  on('model.complete', () => { calls++; return failure() })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  for (let i = 0; i < 4; i++) await $.prompt.submit(submit('можешь сделать так чтобы дашборд грузился быстрее'))
  expect(calls).toBe(3)
})

test('a short clean reply never calls the model', async ($, on) => {
  let calls = 0
  let seen = ''
  mock.store(on)
  mock.clock(on)
  mockSession(on)
  on('model.complete', () => { calls++; return answer('<unchanged/>')() })
  on('prompt.submit', (_$, e) => { seen = e.text; return { text: e.text } })
  await $.prompt.submit(submit('да, давай'))
  expect(calls).toBe(0)
  expect(seen).toBe('да, давай')
})

test('raw: goes out untouched with the prefix stripped', async ($, on) => {
  const seen: string[] = []
  let calls = 0
  mock.store(on)
  mock.clock(on)
  mockSession(on)
  on('model.complete', () => { calls++; return rewritten('X')() })
  on('prompt.submit', (_$, e) => { seen.push(e.text); return { text: e.text } })
  await $.prompt.submit(submit('raw: ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ'))
  expect(seen).toEqual(['ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ'])
  expect(calls).toBe(0)
})

test('/layer off sends prompts as typed', async ($, on) => {
  let seen = ''
  mock.store(on, { enabled: false })
  mock.clock(on)
  mockSession(on)
  on('prompt.submit', (_$, e) => { seen = e.text; return { text: e.text } })
  await $.prompt.submit(submit('ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ'))
  expect(seen).toBe('ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ')
})

test('lang en asks the model for English with a reply line', async ($, on) => {
  let system = ''
  mock.store(on, { lang: 'en' })
  mock.clock(on)
  mockSession(on)
  on('model.complete', (_$, e) => { system = e.system ?? ''; return rewritten('Make the dashboard load faster.\nReply in Russian.')() })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  await $.prompt.submit(submit('можешь сделать так чтобы дашборд грузился быстрее'))
  expect(system).toContain('write the rewrite in English')
  expect(system).toContain('Reply in Russian.')
})

test('the transcript row shows what was typed and what was sent', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  mockSession(on)
  const sent = 'Последнее действие было ошибкой. Откати его сейчас.'
  on('model.complete', rewritten(sent))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  await $.prompt.submit(submit('ЕБАННЫЙ МУДИЛА БЫСТРО ОТКАТИЛ'))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'prompt-layer', surface, component: 'UserMessage',
      props: { text: sent, origin: { kind: 'composer' }, isExpanded: false },
    } as never)
    expect(await ui.find({ type: 'Text', text: /Prompt Layer переписал промпт/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /ты написал: ЕБАННЫЙ МУДИЛА/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /почищено: мат, капс/ })).toBeDefined()
    await ui.unmount()
  }
})
