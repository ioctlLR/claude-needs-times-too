import { test, expect } from 'claude-code/testing'
import { stampBlock, formatStamp, trailer, offTrailer, parseSwitch, promptReminder, hasText } from './stamp'

const T = '10:00:00 +00:00'

test('stamps string and block-array tool results once', () => {
  expect(stampBlock({ type: 'tool_result', tool_use_id: 'a', content: 'ok' }, trailer(T))).toEqual({
    type: 'tool_result', tool_use_id: 'a', content: `ok\n${trailer(T)}`,
  })
  const arr = stampBlock({ type: 'tool_result', tool_use_id: 'b', content: [{ type: 'text', text: 'x' }] }, trailer(T))
  expect(arr.content).toEqual([{ type: 'text', text: 'x' }, { type: 'text', text: trailer(T) }])
  expect(stampBlock(arr, offTrailer)).toBe(arr)
  expect(stampBlock({ type: 'text', text: 'hi' }, trailer(T))).toEqual({ type: 'text', text: 'hi' })
})

test('shows date and offset first, then only when they change', () => {
  const noon = new Date(2026, 9, 19, 12).getTime()
  const first = formatStamp(noon)
  expect(first.text).toMatch(/^2026-10-19 12:00:00 [+-]\d\d:\d\d$/)
  expect(formatStamp(noon + 1000, first.shown).text).toBe('12:00:01')
  expect(formatStamp(new Date(2026, 9, 20, 0, 0, 5).getTime(), first.shown).text).toBe('2026-10-20 00:00:05')
  const moved = formatStamp(noon, { ...first.shown, offset: '+99:00' })
  expect(moved.text).toBe(`12:00:00 ${first.shown.offset}`)
})

test('prompt reminder and switch parsing', () => {
  expect(promptReminder(T)).toBe(`<system-reminder>\nThe time is ${T}.\n</system-reminder>`)
  expect(hasText([{ type: 'image' }])).toBe(false)
  expect(parseSwitch('', false)).toBe(true)
  expect(parseSwitch(' OFF ', true)).toBe(false)
  expect(parseSwitch('maybe', true)).toBe(null)
})
