import { test, expect } from 'claude-code/testing'
import { stampBlock, formatTime, trailer, offTrailer, parseSwitch, promptReminder, hasText } from './stamp'

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

test('formats offset', () => {
  expect(formatTime(0)).toMatch(/^\d\d:\d\d:\d\d [+-]\d\d:\d\d$/)
})

test('prompt reminder and switch parsing', () => {
  expect(promptReminder(T)).toBe(`<system-reminder>\nThe time is ${T}.\n</system-reminder>`)
  expect(hasText([{ type: 'image' }])).toBe(false)
  expect(parseSwitch('', false)).toBe(true)
  expect(parseSwitch(' OFF ', true)).toBe(false)
  expect(parseSwitch('maybe', true)).toBe(null)
})
