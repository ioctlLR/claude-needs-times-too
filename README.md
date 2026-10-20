# claude-needs-times-too

Claude Code gets a date, but not a time. This mod fixes that, a little cheekily.

When timestamps are on:

- every user prompt, and every batch of tool results, is followed by a hidden `<system-reminder>`
  saying `The time is HH:MM:SS.`

So the model has the time whenever it is about to answer or call a tool. The first stamp after switching on, or after a compaction, is full,
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

- Each reminder is a separate meta row (`$.session.append`), so the TUI doesn't show it as something
  you typed, and tool results are never modified.
- After a prompt: `session.append` on the `prompt` door appends the row once the prompt is stored.
- After tool results: a `turn.step` hook collects the tool call ids of each model response as it
  streams, and `session.append` on the `tool-result` door appends the row once the last of them
  has its result. Only after the last: a request's `tool_result` blocks must come before any text,
  and consecutive user rows are merged, so a reminder between two results would be refused.
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

- Hooks on `session.append`, `turn.step` and `prompt.compose` do not run in an installed plugin where an
  organization manages Claude Code; only a plugin the organization lists runs them.
- Tests: `claude plugin test .`
