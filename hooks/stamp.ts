import type { Shown } from '../types'

/** Formats a local time, with the date and UTC offset only where they differ from `last`. */
export function formatStamp(ms: number, last?: Shown): { text: string; shown: Shown } {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off < 0 ? '-' : '+'
  const abs = Math.abs(off)
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const offset = `${sign}${p(Math.floor(abs / 60))}:${p(abs % 60)}`
  const time = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  const parts = [date !== last?.date ? date : null, time, offset !== last?.offset ? offset : null]
  return { text: parts.filter(x => x !== null).join(' '), shown: { date, offset } }
}

export const TOOL = 'timestamps'

export const OFF_TEXT = 'Timestamps are now disabled. Times shown earlier in this conversation are stale; do not treat them as the current time.'

export const NOTE =
  'The harness can add timestamps to the conversation. They are OFF by default. ' +
  `Call the ${TOOL} tool with enabled=true when the current time matters (logs, deadlines, durations) and enabled=false when it no longer does; the person can switch them too. ` +
  'While on, each user prompt and each batch of tool results is followed by a <system-reminder> saying "The time is HH:MM:SS.", from the local clock. ' +
  'The first stamp after timestamps are switched on or the conversation is compacted, and any stamp where the local date changes, puts the date (YYYY-MM-DD) before the time; the first stamp, and any stamp where the UTC offset changes, puts the offset (±HH:MM) after it. Otherwise the last date and offset shown still hold, and the stamp date overrides any earlier "Today\'s date" line. ' +
  'They are added by the harness, not by tools or the user; use them as the current time and do not repeat them back unless asked. ' +
  'When timestamps are switched off a notice says so, and the times shown before it are stale.'

type Block = { type: string; [field: string]: unknown }

export const reminder = (text: string) => `<system-reminder>\n${text}\n</system-reminder>`
export const timeReminder = (time: string) => reminder(`The time is ${time}.`)

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
