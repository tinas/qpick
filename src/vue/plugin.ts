import type { App, InjectionKey, Plugin } from 'vue'
import type { RouteStateOptions } from '../core/types'

export type QPickPluginContext = {
  defaults: Partial<RouteStateOptions>
}

export type QPickOptions = {
  defaults?: Partial<RouteStateOptions>
}

export type QPickPlugin = Plugin & QPickPluginContext

export const QPICK_INJECTION_KEY: InjectionKey<QPickPluginContext> = Symbol('qpick')

export const DEFAULT_OPTIONS: Partial<RouteStateOptions> = {
  history: 'push',
  clearOnDefault: true,
}

export function createQPick(options?: QPickOptions): QPickPlugin {
  const defaults: Partial<RouteStateOptions> = {
    ...DEFAULT_OPTIONS,
    ...options?.defaults,
  }

  const context: QPickPluginContext = {
    defaults,
  }

  return {
    install(app: App) {
      app.provide(QPICK_INJECTION_KEY, context)
    },
    ...context,
  }
}
