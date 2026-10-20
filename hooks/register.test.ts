import { test, expect, mock } from 'claude-code/testing'

const ts = (args: string) => ({ command: 'timestamps', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const STEP = { turnId: 't', index: 0, model: 'm', messageCount: 1 }

const result = (id: string) => ({
  door: 'tool-result' as const,
  origin: { kind: 'tool' as const, tool: 'Read' },
  uuid: `row-${id}`,
  message: { type: 'user' as const, role: 'user' as const, content: [{ type: 'tool_result' as const, tool_use_id: id, content: 'ok' }] },
})

const notes = (rows: readonly { door: string; message: { content: readonly { type: string; text?: unknown }[] } }[]) =>
  rows.filter(r => r.door === 'note').map(r => String(r.message.content[0]?.text))

test('one reminder after the last result of a batch', async ($, on) => {
  mock.clock(on, { now: new Date(2026, 9, 20, 6, 49, 26).getTime() })
  const session = mock.session(on)
  on('turn.step', async function* (_, e) {
    yield { kind: 'tool', index: 0, id: 'a', name: 'Read' }
    yield { kind: 'tool', index: 1, id: 'b', name: 'Read' }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use', usage: null }
  })
  await $.command.run(ts('on'))
  for await (const _ of $.turn.step(STEP));
  await $.session.append(result('b'))
  expect(notes(session.appended())).toEqual([])
  await $.session.append(result('a'))
  const n = notes(session.appended())
  expect(n.length).toBe(1)
  expect(n[0]).toMatch(/^<system-reminder>\nThe time is 2026-10-20 06:49:26 [+-]\d\d:\d\d\.\n<\/system-reminder>$/)
  const doors = session.appended().map(r => r.door)
  expect(doors).toEqual(['tool-result', 'tool-result', 'note'])
})

test('results stored before the stream ends still get one reminder, after them', async ($, on) => {
  mock.clock(on)
  const session = mock.session(on)
  on('turn.step', async function* (_, e) {
    yield { kind: 'tool', index: 0, id: 'a', name: 'Read' }
    await $.session.append(result('a'))
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use', usage: null }
  })
  await $.command.run(ts('on'))
  for await (const _ of $.turn.step(STEP));
  expect(session.appended().map(r => r.door)).toEqual(['tool-result', 'note'])
})

test('nothing while off; the off notice once', async ($, on) => {
  mock.clock(on)
  const session = mock.session(on)
  on('turn.step', async function* (_, e) {
    yield { kind: 'tool', index: 0, id: 'a', name: 'Read' }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use', usage: null }
  })
  await $.command.run(ts('on'))
  await $.command.run(ts('off'))
  for await (const _ of $.turn.step(STEP));
  await $.session.append(result('a'))
  for await (const _ of $.turn.step({ ...STEP, index: 1 }));
  await $.session.append(result('a'))
  expect(notes(session.appended()).map(t => t.includes('disabled'))).toEqual([true])
})
