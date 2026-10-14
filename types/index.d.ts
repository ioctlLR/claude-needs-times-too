export type Timestamps = { isOn: boolean; isOffPending: boolean }

declare module 'claude-code' {
  interface PluginState {
    'date-time': { timestamps: Timestamps }
  }
}
