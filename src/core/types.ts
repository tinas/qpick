/**
 * @see https://url.spec.whatwg.org/#dom-urlsearchparams-get — null return convention
 * @see https://url.spec.whatwg.org/#goals — idempotency guarantee
 */
export type ParserConfig<T> = {
  parse: (value: string) => T | null
  serialize: (value: T) => string
}

export type Parser<T> = ParserConfig<T> & {
  default: <D extends T>(value: D) => ParserWithDefault<T, D>
}

export type ParserWithDefault<T, D extends T = T> = Parser<T> & {
  readonly defaultValue: D
}

export type RouteStateSource = 'query' | 'params'

export type HistoryMode = 'push' | 'replace'

export type RouteStateOptions = {
  history: HistoryMode
  clearOnDefault: boolean
  source: RouteStateSource
}

export type RouteStatePerKeyOptions = {
  urlKey?: string
  clearOnDefault?: boolean
  history?: HistoryMode
  source?: RouteStateSource
}

export type RouteStateConfig<K extends string = string, T = any> = {
  key: K
  parser: Parser<T> | ParserWithDefault<T, T>
} & RouteStatePerKeyOptions

export type RouteStateConfigInput<K extends string = string, T = any> = {
  key: K
  parser?: Parser<T> | ParserWithDefault<T, T>
} & RouteStatePerKeyOptions

export type InferParserType<T>
  = T extends ParserWithDefault<infer V, any> ? V
    : T extends Parser<infer V> ? V | null
      : never
