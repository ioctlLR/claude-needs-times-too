# claude-needs-times-too

Claude Code gets a date, but not a time. This mod fixes that, a little cheekily.

When timestamps are on:

- every tool result ends with `[tool result recorded at HH:MM:SS]`
- every user prompt is followed by a hidden `<system-reminder>` saying `The time is HH:MM:SS.`

Both come from the same local clock. The first stamp after switching on, or after a compaction, is full,
`2026-10-19 14:05:09 -05:00`; after that the date appears only when the local date changes (past
midnight) and the offset only when it changes (DST, or a new system time zone). They are off by default, so a session that doesn't need
the time pays nothing for it.

## Switching

- **The model:** calls the `timestamps` tool with `enabled: true` or `false`. A static section
  added to the system prompt tells it the tool exists and what the stamps mean.
- **You:** `/timestamps` flips it, `/timestamps on` and `/timestamps off` set it.

Turning timestamps off leaves a one-time note saying the earlier times are stale, so the model
does not keep treating the last one as the current time.

## How it works

- `session.append` on the `tool-result` door appends the trailer to each `tool_result`. Whether a
  result is stamped is decided when its call *started*, so a toggle in the same parallel batch
  doesn't change calls that began earlier.
- `session.append` on the `prompt` door appends a separate meta row (`$.session.append`) with the
  reminder, so the TUI doesn't show it as something you typed.
- `prompt.compose` adds one static, session-scoped section, so the prompt cache is unaffected.
- Nothing already in the conversation is rewritten; stamps accumulate as stored rows.

The engine's own `Today's date is …` reminder is left alone: engine rows can't be refused.

## Install

At the prompt of a terminal session:

```
/plugin install date-time --marketplace ioctlLR/claude-needs-times-too
```

From a shell:

```
claude plugin install date-time --marketplace ioctlLR/claude-needs-times-too
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins,
Add marketplace with `ioctlLR/claude-needs-times-too`, then Add plugin.

## Notes

- Hooks on `session.append` and `prompt.compose` do not run in an installed plugin where an
  organization manages Claude Code; only a plugin the organization lists runs them.
- Tests: `claude plugin test .`
