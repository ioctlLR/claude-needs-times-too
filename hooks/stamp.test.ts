import { test, expect } from 'claude-code/testing'
import { formatStamp, parseSwitch, timeReminder, hasText } from './stamp'

const T = '10:00:00 +00:00'

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
  expect(timeReminder(T)).toBe(`<system-reminder>\nThe time is ${T}.\n</system-reminder>`)
  expect(hasText([{ type: 'image' }])).toBe(false)
  expect(parseSwitch('', false)).toBe(true)
  expect(parseSwitch(' OFF ', true)).toBe(false)
  expect(parseSwitch('maybe', true)).toBe(null)
})
