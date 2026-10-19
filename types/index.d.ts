import type { Shown } from '../hooks/stamp'

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
