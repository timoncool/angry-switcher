export type Genre = 'fix' | 'rollback' | 'investigate' | 'build' | 'research' | 'general'

/** A pair the person approved or corrected, shown to the model as an example of their manner. */
export type Example = { typed: string; sent: string; genre: Genre }

/** One rewritten prompt, kept for the before/after card in the transcript: `sent` is the whole text that went out (with the original attached), `shown` the rewrite alone. */
export type Card = { typed: string; sent: string; shown: string; noise: string[]; genre: Genre; english: boolean }

export type Verdict = 'rewrite' | 'unchanged' | 'malformed' | 'guard' | 'failed'

/** Which version of a prompt went out: the layer's, the typed one, or the layer's in English. */
export type Arm = 'layer' | 'raw' | 'en'

/** One prompt the layer handled, with what followed it: the A/B log. */
export type Entry = {
  id: string
  ts: number
  arm: Arm
  noise: string[]
  genre: Genre
  verdict: Verdict
  typed: string
  layered: string | null
  sent: string
  latencyMs: number
  sessionId: string
  /** The model the layer asked for this call; absent in entries written before 0.3.1. */
  model?: string
  /** The model's tokens for this call, as the API reported them. */
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number }
  /** The session cost ledger's growth over the call (the /cost figure); null when another request could have landed in between. */
  costUsd: number | null
  next?: { noisy: boolean; rollback: boolean; correction: boolean; gapMs: number }
  turn?: { durationMs: number; outputTokens: number | null; aborted: boolean }
}

declare module 'claude-code' {
  interface PluginState {
    'prompt-layer': { cards: Card[]; open: string | null }
  }
}
