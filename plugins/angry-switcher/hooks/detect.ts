import type { Genre } from '../types'

const RU_ROUGH_STEMS = [
  'ху[йеёяюи]', 'пизд', 'еба', 'ебл', 'ебу', 'ебн', 'ёба', 'ёбн', 'заеб', 'заёб', 'наеб', 'наёб', 'выеб', 'уеб', 'уёб',
  'проеб', 'проёб', 'доеб', 'доёб', 'отъеб', 'съеб', 'въеб', 'разъеб', 'долбо[её]б', 'долбан', 'бля', 'сука', 'суки', 'суку',
  'сучк', 'сучар', 'мудак', 'мудил', 'мудозвон', 'гандон', 'гондон', 'залуп', 'шлюх', 'пидор', 'пидар', 'пидр', 'нахуй',
  'нахуя', 'нихуя', 'охуе', 'охуи', 'ахуе', 'нахер', 'похуй', 'похер', 'херн', 'херов', 'хера', 'хрен', 'дерьм', 'говн', 'жоп', 'сран', 'срать', 'ублюд',
  'дебил', 'идиот', 'придур', 'кретин', 'тупица', 'тупой', 'тупая', 'тупорыл', 'дятел', 'урод', 'бездар', 'имбецил',
]
const EN_ROUGH = [
  'fuck\\w*', 'motherfuck\\w*', 'shit\\w*', 'bullshit', 'wtf', 'damn\\w*', 'crap\\w*', 'asshole\\w*', 'bitch\\w*', 'bastard\\w*',
  'dick\\w*', 'piss\\w*', 'idiot\\w*', 'stupid', 'moron\\w*', 'dumb\\w*', 'useless', 'retard\\w*', 'imbecile',
]
const RU_ROUGH = new RegExp(`(?:^|[^а-яёa-z0-9_])(?:${RU_ROUGH_STEMS.join('|')})`, 'iu')
const EN_ROUGH_RE = new RegExp(`\\b(?:${EN_ROUGH.join('|')})\\b`, 'i')


const FREQUENT_RU = new Set([
  'что', 'как', 'это', 'надо', 'нужно', 'сделай', 'почини', 'исправь', 'поправь', 'почему', 'зачем', 'когда', 'где', 'давай',
  'нет', 'да', 'ещё', 'еще', 'все', 'всё', 'только', 'если', 'или', 'тоже', 'теперь', 'опять', 'снова', 'файл', 'тест', 'тесты',
  'запусти', 'проверь', 'откати', 'верни', 'убери', 'добавь', 'удали', 'найди', 'покажи', 'работает', 'ошибка', 'привет',
  'спасибо', 'пожалуйста', 'сейчас', 'щас', 'ну', 'так', 'вот', 'же', 'бы', 'уже', 'мы', 'вы', 'он', 'она', 'они', 'кто', 'чем', 'на', 'потом', 'быстро', 'нормально', 'сделать', 'код', 'проект', 'не', 'ты', 'мне', 'там', 'тут',
])
const TRANSLIT_RU = new Set([
  'chto', 'shto', 'kak', 'eto', 'nado', 'nuzhno', 'sdelay', 'sdelai', 'pochini', 'ispravi', 'isprav', 'poprav', 'popravi',
  'pochemu', 'zachem', 'kogda', 'gde', 'davay', 'davai', 'eshe', 'eshche', 'esche', 'vse', 'vsyo', 'tolko', 'esli', 'ili',
  'tozhe', 'teper', 'opyat', 'snova', 'fayl', 'zapusti', 'prover', 'proverь', 'otkati', 'verni', 'uberi', 'dobav', 'udali',
  'naydi', 'naidi', 'pokazhi', 'rabotaet', 'oshibka', 'privet', 'spasibo', 'pozhaluysta', 'pozhalusta', 'seychas', 'sejchas',
  'potom', 'bystro', 'normalno', 'sdelat', 'proekt', 'mne', 'tam', 'tut', 'ne',
])
const LAYOUT: Record<string, string> = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з', '[': 'х', ']': 'ъ',
  a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л', l: 'д', ';': 'ж', "'": 'э',
  z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь', ',': 'б', '.': 'ю', '`': 'ё',
}

const LETTER_WORD = /[A-Za-zА-Яа-яЁё]{3,}/g
const LATIN_ACRONYM = /^[A-Z]{2,4}$/
const isCaps = (w: string) => w === w.toUpperCase() && w !== w.toLowerCase()

const ENGLISH_STOP = new Set(['the', 'a', 'an', 'to', 'is', 'are', 'and', 'or', 'of', 'in', 'on', 'it', 'you', 'for', 'with', 'this', 'that', 'be', 'not', 'do', 'what', 'how', 'why', 'can', 'i', 'my', 'me', 'we', 'so', 'if', 'but', 'no', 'yes', 'just', 'all', 'from', 'at', 'as', 'by', 'have', 'has', 'was', 'please', 'fix', 'add', 'make', 'run', 'test', 'file', 'code'])

export function decodeLayout(text: string): string {
  return [...text].map(ch => {
    const low = ch.toLowerCase()
    const mapped = LAYOUT[low]
    if (!mapped) return ch
    return ch !== low ? mapped.toUpperCase() : mapped
  }).join('')
}

export function wrongLayout(text: string): boolean {
  if (/[а-яё]/i.test(text)) return false
  const words = text.toLowerCase().split(/\s+/).filter(w => /^[a-z;'[\],.`]{2,}$/.test(w))
  if (!words.length) return false
  const english = words.filter(w => ENGLISH_STOP.has(w.replace(/[^a-z]/g, ''))).length
  if (english / words.length >= 0.15) return false
  const hits = words.filter(w => FREQUENT_RU.has(decodeLayout(w).replace(/[б,ю.]$/, m => (w.length > 2 ? '' : m)))).length
  const glued = words.filter(w => /[a-z][[\];',.`][a-z]/.test(w)).length
  return hits + glued >= 2 || (words.length <= 2 && hits + glued >= 1)
}

export function translit(text: string): boolean {
  if (/[а-яё]/i.test(text)) return false
  const words = text.toLowerCase().match(/[a-z]+/g) ?? []
  return words.filter(w => TRANSLIT_RU.has(w)).length >= 2
}

/**
 * Cheap local signs that a prompt needs cleaning even when it is short: rough words, shouting,
 * a run of exclamation marks, translit, the wrong keyboard layout. Only decides whether to call
 * the model; the cleaning itself is the model's.
 */
export function noise(text: string): string[] {
  const out: string[] = []
  if (RU_ROUGH.test(text) || EN_ROUGH_RE.test(text)) out.push('мат')
  const words = text.match(LETTER_WORD) ?? []
  const caps = words.filter(isCaps)
  if (caps.filter(w => !LATIN_ACRONYM.test(w)).length >= 2 || (caps.length >= 2 && caps.length / words.length >= 0.6)) out.push('капс')
  if (/!{3,}|[!?]{4,}/.test(text)) out.push('!!!')
  if (translit(text)) out.push('транслит')
  else if (wrongLayout(text)) out.push('раскладка')
  return out
}

const FILE_EXT = 'jsx?|tsx?|mjs|cjs|py|rb|go|rs|java|kt|swift|c|cc|cpp|h|hpp|cs|php|vue|svelte|css|scss|html|json|jsonl|ya?ml|toml|md|sql|sh|ps1|bat|cmd|txt|csv|log|env|lock|ini|cfg|xml|gguf|safetensors|wav|flac|mp3|mp4|png|jpg|webp'
const PROTECTED: RegExp[] = [
  /`[^`\n]+`/g,
  /https?:\/\/[^\s)>\]"']+/g,
  new RegExp(`[\\w.-]+\\.(?:${FILE_EXT})\\b`, 'gi'),
  /(?:[A-Za-z]:[\\/]|~[\\/]|\.{1,2}[\\/])?(?:[\w.-]+[\\/])+[\w.-]+/g,
  /\b[a-z]+[A-Z][A-Za-z0-9]*\b/g,
  /\b[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+\b/g,
  /\b\d[\d.,:]*\d\b/g,
  /"[^"\n]{2,120}"|«[^»\n]{2,120}»/g,
  /(?:^|\s)[#@][\w-]{2,}/g,
]

export function protectedTokens(text: string): string[] {
  if (wrongLayout(text)) return []
  const found = new Set<string>()
  for (const re of PROTECTED) {
    for (const m of text.matchAll(re)) {
      const token = m[0].trim().replace(/[.,;:!?)]+$/, '').replace(/^[`"«]+|[`"»]+$/g, '')
      if (token.length < 2) continue
      if (/[\\/]/.test(token) && !/^(?:[A-Za-z]:|~|\.)/.test(token) && !/\./.test(token) && (token.match(/[\\/]/g) ?? []).length < 2) continue
      found.add(token)
    }
  }
  const all = [...found]
  return all.filter(t => !all.some(other => other !== t && other.includes(t)))
}

export function missingTokens(original: string, rewritten: string): string[] {
  return protectedTokens(original).filter(t => !rewritten.includes(t))
}

export function addedTokens(original: string, rewritten: string): string[] {
  return protectedTokens(rewritten).filter(t => /[\\/._@#\d]|[a-z][A-Z]/.test(t) && !original.includes(t))
}

const ANCHOR = [
  /(?:^|[\s`'"(])[\w.-]+\/[\w./-]+/,
  new RegExp(`\\b[\\w-]+\\.(?:${FILE_EXT})\\b`, 'i'),
  /`[^`\n]+`/,
  /\b[a-z]+[A-Z]\w*\b|\b[a-z]+_[a-z_]+\b/,
]
const FINISH = /\b(?:npm (?:run )?test|pnpm test|yarn test|pytest|cargo test|go test|make test|tests? (?:should |must )?pass|run (?:the )?tests?|make sure|should|must|until|so that|verify|check that|expect(?:ed)?|returns?)\b|(?:^|[^а-яё])(?:прогони тест|тесты проход|убедись|проверь, что|должн[оаы]|чтобы|пока не|ожида)/iu
const VAGUE = /^(?:it|that|this|those|these|the same|same)\b|\b(?:like before|as before|the other one)\b|^(?:это|то|оно|его|её|их)(?:$|[^а-яё])|(?:как раньше|как было|тот другой|то же самое)/iu

export function isClearEnough(text: string): boolean {
  const t = text.trim()
  return ANCHOR.some(re => re.test(t)) && FINISH.test(t) && !VAGUE.test(t)
}

const SHIELDED = /<pasted_content\b[^>]*>[\s\S]*?<\/pasted_content\b[^>]*>|```[\s\S]*?```|<!--[\s\S]*?-->|(?:^>.*(?:\n|$))+/gm

export type Shielded = { text: string; blocks: string[] }

export function shield(text: string): Shielded {
  const blocks: string[] = []
  const masked = text.replace(SHIELDED, m => {
    blocks.push(m)
    return `⟦${blocks.length}⟧`
  })
  return { text: masked, blocks }
}

export function unshield(text: string, blocks: readonly string[]): string | null {
  const seen: string[] = text.match(/⟦\d+⟧/g) ?? []
  if (seen.length !== blocks.length || new Set(seen).size !== blocks.length) return null
  if (blocks.some((_, i) => !seen.includes(`⟦${i + 1}⟧`))) return null
  return text.replace(/⟦(\d+)⟧/g, (_, n: string) => blocks[Number(n) - 1]!)
}

const GENRES: readonly [Genre, RegExp][] = [
  ['rollback', /(?:^|[^а-яё])(?:откат|откати|верни|вернуть|отмени)|\b(?:revert|undo|roll ?back)\b/iu],
  ['investigate', /(?:^|[^а-яё])(?:почему|разберись|выясни|найди причину|в чём дело|в чем дело)|\b(?:why|investigate|debug|root cause|figure out)\b/iu],
  ['fix', /(?:^|[^а-яё])(?:почини|исправь|поправь|баг|ошибк|падает|не работает|сломал|сломан)|\b(?:fix|bug|broken|crash|error|fails?|failing)\b/iu],
  ['research', /(?:^|[^а-яё])(?:поищи|найди|сравни|исследуй|погугли|ресёрч|ресерч)|\b(?:research|compare|look up|search)\b/iu],
  ['build', /(?:^|[^а-яё])(?:добавь|сделай|реализуй|создай|напиши|сгенерируй|собери)|\b(?:add|implement|create|build|write|make)\b/iu],
]

export function genreOf(text: string): Genre {
  return GENRES.find(([, re]) => re.test(text))?.[0] ?? 'general'
}
