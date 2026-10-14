import type { EngineInterface, Register } from 'claude-code'
import {
  NOTE, OFF_TEXT, TOOL, formatTime, hasText, offTrailer, parseSwitch, promptReminder, reminder, stampBlock, trailer,
} from './stamp'

const REF = { plugin: 'date-time', key: 'timestamps' } as const

async function read($: EngineInterface) {
  return (await $.state.get(REF)).value ?? { isOn: false, isOffPending: false }
}

// Whether timestamps were on when each tool call started, by tool_use_id: a toggle
// made mid-batch then changes only calls that start after it.
const startedOn = new Map<string, boolean>()

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: TOOL,
      description:
        'Turn harness timestamps on or off. When on, each tool result ends with its local time and each user prompt is followed by the current time. Off by default; turn on when the time matters, off when it does not.',
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
    startedOn.set(e.tool_use_id, isOn)
    return { result: isOn ? 'Timestamps are on.' : OFF_TEXT }
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool !== 'mcp__date-time__timestamps') startedOn.set(e.tool_use_id, (await read($)).isOn)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'timestamps' }, async ($, e) => {
    const cur = await read($)
    const isOn = parseSwitch(e.args, cur.isOn)
    if (isOn === null) return { text: 'Usage: /timestamps [on|off]' }
    await $.state.set(REF, { isOn, isOffPending: !isOn && cur.isOn })
    return { text: `Timestamps ${isOn ? 'on' : 'off'}.` }
  })

  on('session.append', { door: 'tool-result' }, async ($, e, next) => {
    const s = await read($)
    let line: string | null = null
    const lineFor = async (id: unknown) => {
      const wasOn = typeof id === 'string' ? startedOn.get(id) ?? s.isOn : s.isOn
      if (typeof id === 'string') startedOn.delete(id)
      if (wasOn) return (line ??= trailer(formatTime(await $.clock.now())))
      if (s.isOffPending && !s.isOn) return offTrailer
      return null
    }
    let isNoticeUsed = false
    const content = []
    for (const b of e.message.content) {
      const l = b.type === 'tool_result' ? await lineFor(b.tool_use_id) : null
      if (l === offTrailer) isNoticeUsed = true
      content.push(l === null ? b : stampBlock(b, l))
    }
    if (isNoticeUsed) await $.state.set(REF, { isOn: false, isOffPending: false })
    return next({ ...e, message: { ...e.message, content } })
  }).catch(($, e, next) => next(e))

  on('session.append', { door: 'prompt' }, async ($, e, next) => {
    const stored = await next(e)
    if (!hasText(e.message.content)) return stored
    const s = await read($)
    let text: string | null = null
    if (s.isOn) text = promptReminder(formatTime(await $.clock.now()))
    else if (s.isOffPending) {
      text = reminder(OFF_TEXT)
      await $.state.set(REF, { isOn: false, isOffPending: false })
    }
    if (text !== null) {
      await $.session.append({ message: { type: 'user', content: [{ type: 'text', text }] }, agentId: e.agentId })
    }
    return stored
  }).catch(($, e, next) => next(e))

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return { sections: [...r.sections, { id: `${$.plugin.name}:time`, text: NOTE, scope: 'session' }] }
  }).catch(($, e, next) => next(e))
}
