export function formatTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off < 0 ? '-' : '+'
  const abs = Math.abs(off)
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${sign}${p(Math.floor(abs / 60))}:${p(abs % 60)}`
}

export const TOOL = 'timestamps'

export const trailer = (time: string) => `[tool result recorded at ${time}]`
export const offTrailer = '[timestamps disabled: earlier times in this conversation are stale]'
export const OFF_TEXT = 'Timestamps are now disabled. Times shown earlier in this conversation are stale; do not treat them as the current time.'

export const NOTE =
  'The harness can add timestamps to the conversation. They are OFF by default. ' +
  `Call the ${TOOL} tool with enabled=true when the current time matters (logs, deadlines, durations) and enabled=false when it no longer does; the person can switch them too. ` +
  'While on, each tool result ends with a trailer "[tool result recorded at HH:MM:SS ±HH:MM]" and each user prompt is followed by a <system-reminder> saying "The time is HH:MM:SS ±HH:MM.", both from the same local clock. ' +
  'They are added by the harness, not by tools or the user; use them as the current time and do not repeat them back unless asked. ' +
  'When timestamps are switched off a notice says so, and the times shown before it are stale.'

type Block = { type: string; [field: string]: unknown }

const MARKS = ['[tool result recorded at ', '[timestamps disabled']

/** Appends a trailer line to a tool_result block's content, once. */
export function stampBlock(b: Block, line: string): Block {
  if (b.type !== 'tool_result') return b
  const c = b.content
  const hasMark = (t: unknown) => typeof t === 'string' && MARKS.some(m => t.includes(m))
  if (c === undefined || c === null || c === '') return { ...b, content: line }
  if (typeof c === 'string') return hasMark(c) ? b : { ...b, content: `${c}\n${line}` }
  if (Array.isArray(c)) {
    if (c.some(x => x && x.type === 'text' && hasMark(x.text))) return b
    return { ...b, content: [...c, { type: 'text', text: line }] }
  }
  return b
}

export const reminder = (text: string) => `<system-reminder>\n${text}\n</system-reminder>`
export const promptReminder = (time: string) => reminder(`The time is ${time}.`)

/** True when a user row holds typed text, so it earns a reminder. */
export const hasText = (content: readonly Block[]): boolean => content.some(b => b.type === 'text')

/** Parses `/timestamps` arguments: on, off, or empty to flip. */
export function parseSwitch(args: string, current: boolean): boolean | null {
  const a = args.trim().toLowerCase()
  if (a === '') return !current
  if (['on', 'true', 'enable', 'enabled', '1'].includes(a)) return true
  if (['off', 'false', 'disable', 'disabled', '0'].includes(a)) return false
  return null
}
