/** The date and UTC offset a stamp showed, as `formatStamp` in hooks/stamp.ts makes them. */
export type Shown = { date: string; offset: string }

/**
 * `shown` is the date and offset last stamped in each conversation, by agentId ('' for main).
 * Switching clears all of it and compacting clears that conversation's, so the next stamp is full.
 */
export type Timestamps = { isOn: boolean; isOffPending: boolean; shown?: Record<string, Shown> }

declare module 'claude-code' {
  interface PluginState {
    'date-time': { timestamps: Timestamps }
  }
}
