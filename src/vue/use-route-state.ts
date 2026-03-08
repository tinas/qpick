import type { WritableComputedRef } from 'vue'
import type {
  HistoryMode,
  Parser,
  ParserWithDefault,
  RouteStateOptions,
  RouteStatePerKeyOptions,
  RouteStateSource,
} from '../core/types'
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parseAsString } from '../core/parsers'
import { DEFAULT_OPTIONS, QPICK_INJECTION_KEY } from './plugin'

type AnyConfigInput = { key: string, parser?: Parser<any> } & RouteStatePerKeyOptions

type InferConfigValue<C>
  = C extends { parser: ParserWithDefault<infer T, any> } ? T
    : C extends { parser: Parser<infer T> } ? T | null
      : string | null

type InferConfigKey<C> = C extends { key: infer K extends string } ? K : never

type MultiRouteStateValues<C extends readonly any[]> = {
  [K in C[number] as InferConfigKey<K>]: InferConfigValue<K>
}

type BatchOptions = {
  history?: HistoryMode
}

type MultiRouteStateReturn<C extends readonly any[]> = {
  [K in C[number] as InferConfigKey<K>]: WritableComputedRef<InferConfigValue<K>>
} & {
  set: (values: Partial<MultiRouteStateValues<C>>, options?: BatchOptions) => void
  reset: (options?: BatchOptions) => void
  toObject: () => MultiRouteStateValues<C>
}

type ResolvedConfig = {
  parser: Parser<any>
  urlKey: string
  source: RouteStateSource
  clearOnDefault: boolean
  method: HistoryMode
}

function getDefault<T>(parser: Parser<T>): T | null {
  return 'defaultValue' in parser ? (parser as ParserWithDefault<T, T>).defaultValue : null
}

function detectSource(key: string, route: ReturnType<typeof useRoute>): RouteStateSource {
  return key in route.params ? 'params' : 'query'
}

function readValue<T>(
  key: string,
  source: RouteStateSource,
  parser: Parser<T>,
  route: ReturnType<typeof useRoute>,
): T | null {
  const raw = source === 'params' ? route.params[key] : route.query[key]
  if (typeof raw !== 'string')
    return getDefault(parser)
  return parser.parse(raw) ?? getDefault(parser)
}

function shouldClear<T>(parser: Parser<T>, value: T, clearOnDefault: boolean): boolean {
  if (!clearOnDefault || !('defaultValue' in parser))
    return false
  const def = (parser as ParserWithDefault<T, T>).defaultValue
  const eq = parser.eq ?? ((a: T, b: T) => a === b)
  return eq(value, def)
}

function toSerialized<T>(
  value: T | null,
  parser: Parser<T>,
  clearOnDefault: boolean,
): string | null {
  if (value === null)
    return null
  if (shouldClear(parser, value, clearOnDefault))
    return null
  return parser.serialize(value)
}

function navigate(
  router: ReturnType<typeof useRouter>,
  route: ReturnType<typeof useRoute>,
  queryUpdates: Record<string, string | null>,
  paramUpdates: Record<string, string | null>,
  method: HistoryMode,
): void {
  const newQuery = { ...route.query }
  for (const [k, v] of Object.entries(queryUpdates)) {
    if (v === null)
      delete newQuery[k]
    else newQuery[k] = v
  }

  const newParams = { ...route.params }
  for (const [k, v] of Object.entries(paramUpdates)) {
    if (v === null)
      delete newParams[k]
    else newParams[k] = v
  }

  router[method]({
    name: route.name ?? undefined,
    params: newParams,
    query: newQuery,
  })
}

function resolveConfig(
  config: AnyConfigInput,
  defaults: Partial<RouteStateOptions>,
  route: ReturnType<typeof useRoute>,
): ResolvedConfig {
  const parser = config.parser ?? parseAsString
  const urlKey = config.urlKey ?? config.key
  const source = config.source ?? defaults.source ?? detectSource(urlKey, route)
  const clearOnDefault = config.clearOnDefault ?? defaults.clearOnDefault ?? true
  const method = config.history ?? defaults.history ?? 'push'
  return { parser, urlKey, source, clearOnDefault, method }
}

function createComputedRef(
  resolved: ResolvedConfig,
  router: ReturnType<typeof useRouter>,
  route: ReturnType<typeof useRoute>,
): WritableComputedRef<any> {
  return computed({
    get() {
      return readValue(resolved.urlKey, resolved.source, resolved.parser, route)
    },
    set(newValue: any) {
      const serialized = toSerialized(newValue, resolved.parser, resolved.clearOnDefault)
      const queryUpdates = resolved.source === 'query' ? { [resolved.urlKey]: serialized } : {}
      const paramUpdates = resolved.source === 'params' ? { [resolved.urlKey]: serialized } : {}
      navigate(router, route, queryUpdates, paramUpdates, resolved.method)
    },
  })
}

export function useRouteState<K extends string, T>(
  config: { key: K, parser: ParserWithDefault<T, any> } & RouteStatePerKeyOptions,
): WritableComputedRef<T>

export function useRouteState<K extends string, T>(
  config: { key: K, parser: Parser<T> } & RouteStatePerKeyOptions,
): WritableComputedRef<T | null>

export function useRouteState<K extends string>(
  config: { key: K } & RouteStatePerKeyOptions,
): WritableComputedRef<string | null>

export function useRouteState<const C extends readonly AnyConfigInput[]>(
  configs: [...C],
): MultiRouteStateReturn<C>

export function useRouteState(
  configOrConfigs: AnyConfigInput | readonly AnyConfigInput[],
): any {
  const defaults = inject(QPICK_INJECTION_KEY)?.defaults ?? DEFAULT_OPTIONS
  const route = useRoute()
  const router = useRouter()

  if (Array.isArray(configOrConfigs)) {
    const configs = configOrConfigs as AnyConfigInput[]
    const refs: Record<string, WritableComputedRef<any>> = {}
    const meta: Record<string, ResolvedConfig> = {}

    for (const config of configs) {
      const resolved = resolveConfig(config, defaults, route)
      meta[config.key] = resolved
      refs[config.key] = createComputedRef(resolved, router, route)
    }

    function resolveBatchMethod(keys: string[], override?: HistoryMode): HistoryMode {
      if (override)
        return override
      for (const key of keys) {
        if (meta[key]?.method === 'push')
          return 'push'
      }
      return 'replace'
    }

    function set(values: Record<string, any>, options?: BatchOptions): void {
      const queryUpdates: Record<string, string | null> = {}
      const paramUpdates: Record<string, string | null> = {}

      for (const [key, value] of Object.entries(values)) {
        const m = meta[key]
        if (!m)
          continue

        const serialized = toSerialized(value, m.parser, m.clearOnDefault)
        if (m.source === 'query')
          queryUpdates[m.urlKey] = serialized
        else
          paramUpdates[m.urlKey] = serialized
      }

      const method = resolveBatchMethod(Object.keys(values), options?.history)
      navigate(router, route, queryUpdates, paramUpdates, method)
    }

    function reset(options?: BatchOptions): void {
      const queryUpdates: Record<string, string | null> = {}
      const paramUpdates: Record<string, string | null> = {}

      for (const m of Object.values(meta)) {
        const serialized = toSerialized(getDefault(m.parser), m.parser, m.clearOnDefault)
        if (m.source === 'query')
          queryUpdates[m.urlKey] = serialized
        else
          paramUpdates[m.urlKey] = serialized
      }

      const method = resolveBatchMethod(Object.keys(meta), options?.history)
      navigate(router, route, queryUpdates, paramUpdates, method)
    }

    function toObject(): Record<string, any> {
      const result: Record<string, any> = {}
      for (const [key, r] of Object.entries(refs)) {
        result[key] = r.value
      }
      return result
    }

    return {
      ...refs,
      set,
      reset,
      toObject,
    }
  }

  return createComputedRef(resolveConfig(configOrConfigs as AnyConfigInput, defaults, route), router, route)
}
