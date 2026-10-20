import type { EngineInterface, Register } from 'claude-code'
import { NOTE, OFF_TEXT, TOOL, formatStamp, hasText, parseSwitch, reminder, timeReminder } from './stamp'

const REF = { plugin: 'date-time', key: 'timestamps' } as const

async function read($: EngineInterface) {
  return (await $.state.get(REF)).value ?? { isOn: false, isOffPending: false }
}

/** The current time for a stamp in one conversation, recording the date and offset it shows. */
async function stamp($: EngineInterface, agentId: string | undefined) {
  const s = await read($)
  const key = agentId ?? ''
  const { text, shown } = formatStamp(await $.clock.now(), s.shown?.[key])
  await $.state.set(REF, { ...s, shown: { ...s.shown, [key]: shown } })
  return text
}

/** Appends the time, or the one-time off notice, as a hidden row the model reads. */
async function remind($: EngineInterface, agentId: string | undefined) {
  const s = await read($)
  let text: string | null = null
  if (s.isOn) text = timeReminder(await stamp($, agentId))
  else if (s.isOffPending) {
    text = reminder(OFF_TEXT)
    await $.state.set(REF, { isOn: false, isOffPending: false })
  }
  if (text !== null) await $.session.append({ message: { type: 'user', content: [{ type: 'text', text }] }, agentId })
}

// The tool calls of each conversation's latest model response, by agentId ('' for main).
// The reminder goes after the batch's last result, never between two: the API wants a
// request's tool_result blocks before any text, and consecutive user rows are merged.
type Batch = { ids: Set<string>; done: Set<string>; isStreamed: boolean; isReminded: boolean }
const batches = new Map<string, Batch>()

async function settle($: EngineInterface, agentId: string | undefined, b: Batch) {
  if (!b.isStreamed || b.isReminded || b.ids.size === 0) return
  for (const id of b.ids) if (!b.done.has(id)) return
  b.isReminded = true
  await remind($, agentId)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: TOOL,
      description:
        'Turn harness timestamps on or off. When on, the current local time follows each user prompt and each batch of tool results. Off by default; turn on when the time matters, off when it does not.',
      inputSchema: {
        type: 'object',
        properties: { enabled: { type: 'boolean', description: 'true to add timestamps, false to stop' } },
        required: ['enabled'],
      },
      isDeferred: false,
    })
    await $.command.register({ name: TOOL, description: 'Turn timestamps on or off (on, off, or no argument to flip)' })
    return next(e)
  })

  on('tool.call', { tool: 'mcp__date-time__timestamps' }, async ($, e) => {
    const isOn = (e as unknown as { enabled?: unknown }).enabled === true
    await $.state.set(REF, { isOn, isOffPending: false })
    return { result: isOn ? 'Timestamps are on.' : OFF_TEXT }
  })

  on('command.run', { command: 'timestamps' }, async ($, e) => {
    const cur = await read($)
    const isOn = parseSwitch(e.args, cur.isOn)
    if (isOn === null) return { text: 'Usage: /timestamps [on|off]' }
    await $.state.set(REF, { isOn, isOffPending: !isOn && cur.isOn })
    return { text: `Timestamps ${isOn ? 'on' : 'off'}.` }
  })

  // Collects the response's tool call ids as they stream. Results can be stored before
  // the stream ends, so whichever of the two comes last appends the reminder.
  on('turn.step', async function* ($, e, next) {
    const b: Batch = { ids: new Set(), done: new Set(), isStreamed: false, isReminded: false }
    batches.set(e.agentId ?? '', b)
    for await (const c of next(e)) {
      if (c.kind === 'tool') b.ids.add(c.id)
      yield c
    }
    b.isStreamed = true
    try {
      await settle($, e.agentId, b)
    } catch {}
  })

  // No .catch here or on the prompt door: retrying next(e) would store the row twice.
  on('session.append', { door: 'tool-result' }, async ($, e, next) => {
    const stored = await next(e)
    try {
      const b = batches.get(e.agentId ?? '')
      if (b) {
        for (const c of e.message.content) if (c.type === 'tool_result' && typeof c.tool_use_id === 'string') b.done.add(c.tool_use_id)
        await settle($, e.agentId, b)
      }
    } catch {}
    return stored
  })

  on('session.append', { door: 'prompt' }, async ($, e, next) => {
    const stored = await next(e)
    try {
      if (hasText(e.message.content)) await remind($, e.agentId)
    } catch {}
    return stored
  })

  // A summary may drop the last full stamp, so the next stamp after a compaction is full.
  // No .catch: retrying next(e) would compact twice.
  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (r.skip !== undefined || e.trigger === 'precompute') return r
    try {
      const s = await read($)
      const { [e.agentId ?? '']: _, ...shown } = s.shown ?? {}
      await $.state.set(REF, { ...s, shown })
    } catch {}
    return r
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return { sections: [...r.sections, { id: `${$.plugin.name}:time`, text: NOTE, scope: 'session' }] }
  }).catch(($, e, next) => next(e))
}
