import type { WritableComputedRef } from 'vue'
import type {
  InferParserMapType,
  MultiRouteStateOptions,
  Parser,
  ParserMap,
  ParserWithDefault,
  RouteStateOptions,
  RouteStateSource,
} from '../core/types'
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parseAsString } from '../core/parsers'
import { DEFAULT_OPTIONS, QPICK_INJECTION_KEY } from './plugin'

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
  method: 'push' | 'replace',
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

export function useRouteState(
  key: string,
  options?: Partial<RouteStateOptions>,
): WritableComputedRef<string | null>

export function useRouteState<T, D extends T>(
  key: string,
  parser: ParserWithDefault<T, D>,
  options?: Partial<RouteStateOptions>,
): WritableComputedRef<T>

export function useRouteState<T>(
  key: string,
  parser: Parser<T>,
  options?: Partial<RouteStateOptions>,
): WritableComputedRef<T | null>

export function useRouteState<T extends ParserMap>(
  parsers: T,
  options?: MultiRouteStateOptions<T>,
): {
  [K in keyof T]: T[K] extends ParserWithDefault<infer V, any>
    ? WritableComputedRef<V>
    : T[K] extends Parser<infer V>
      ? WritableComputedRef<V | null>
      : never
} & {
  set: (values: Partial<InferParserMapType<T>>) => void
  reset: () => void
  toObject: () => InferParserMapType<T>
}

export function useRouteState(
  keyOrParsers: string | ParserMap,
  parserOrOptions?: Parser<any> | MultiRouteStateOptions<any> | Partial<RouteStateOptions>,
  singleOptions?: Partial<RouteStateOptions>,
): any {
  const defaults = inject(QPICK_INJECTION_KEY)?.defaults ?? DEFAULT_OPTIONS
  const route = useRoute()
  const router = useRouter()

  if (typeof keyOrParsers === 'string') {
    const key = keyOrParsers
    let parser: Parser<any>
    let opts: Partial<RouteStateOptions>

    if (parserOrOptions && 'parse' in parserOrOptions) {
      parser = parserOrOptions
      opts = { ...defaults, ...singleOptions }
    }
    else {
      parser = parseAsString
      opts = { ...defaults, ...parserOrOptions }
    }

    const source = opts.source ?? detectSource(key, route)
    const clearOnDefault = opts.clearOnDefault !== false
    const method = opts.history ?? 'push'

    return computed({
      get() {
        return readValue(key, source, parser, route)
      },
      set(newValue: any) {
        const serialized = toSerialized(newValue, parser, clearOnDefault)
        const queryUpdates = source === 'query' ? { [key]: serialized } : {}
        const paramUpdates = source === 'params' ? { [key]: serialized } : {}
        navigate(router, route, queryUpdates, paramUpdates, method)
      },
    })
  }

  const parsers = keyOrParsers
  const options = (parserOrOptions ?? {}) as MultiRouteStateOptions<any>
  const urlKeys = options.urlKeys ?? {}
  const sourcesMap = options.sources ?? {}
  const opts = { ...defaults, ...options }
  const clearOnDefault = opts.clearOnDefault !== false
  const method = opts.history ?? 'push'

  const refs: Record<string, WritableComputedRef<any>> = {}
  const meta: Record<string, { parser: Parser<any>, source: RouteStateSource, urlKey: string }> = {}

  for (const [key, parser] of Object.entries(parsers)) {
    const urlKey = urlKeys[key] ?? key
    const source = sourcesMap[key] ?? detectSource(urlKey, route)
    meta[key] = { parser, source, urlKey }

    refs[key] = computed({
      get() { return readValue(urlKey, source, parser, route) },
      set(newValue: any) {
        const serialized = toSerialized(newValue, parser, clearOnDefault)
        const queryUpdates = source === 'query' ? { [urlKey]: serialized } : {}
        const paramUpdates = source === 'params' ? { [urlKey]: serialized } : {}
        navigate(router, route, queryUpdates, paramUpdates, method)
      },
    })
  }

  function set(values: Record<string, any>): void {
    const queryUpdates: Record<string, string | null> = {}
    const paramUpdates: Record<string, string | null> = {}

    for (const [key, value] of Object.entries(values)) {
      const m = meta[key]
      if (!m)
        continue

      const serialized = toSerialized(value, m.parser, clearOnDefault)
      if (m.source === 'query')
        queryUpdates[m.urlKey] = serialized
      else
        paramUpdates[m.urlKey] = serialized
    }

    navigate(router, route, queryUpdates, paramUpdates, method)
  }

  function reset(): void {
    const queryUpdates: Record<string, string | null> = {}
    const paramUpdates: Record<string, string | null> = {}

    for (const [_, m] of Object.entries(meta)) {
      const serialized = toSerialized(getDefault(m.parser), m.parser, clearOnDefault)
      if (m.source === 'query')
        queryUpdates[m.urlKey] = serialized
      else paramUpdates[m.urlKey] = serialized
    }

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
