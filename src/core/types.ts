export type ParserConfig<T> = {
  parse: (value: string) => T | null
  serialize: (value: T) => string
  eq?: (a: T, b: T) => boolean
}

export type Parser<T> = ParserConfig<T> & {
  default: <D extends T>(value: D) => ParserWithDefault<T, D>
}

export type ParserWithDefault<T, D extends T = T> = Parser<T> & {
  readonly defaultValue: D
}

export type RouteStateSource = 'query' | 'params'

export type RouteStateOptions = {
  history: 'push' | 'replace'
  clearOnDefault: boolean
  source: RouteStateSource
}

export type ParserMap = Record<string, Parser<any> | ParserWithDefault<any, any>>

export type UrlKeys<T extends ParserMap> = Partial<{ [K in keyof T]: string }>

export type Sources<T extends ParserMap> = Partial<{ [K in keyof T]: RouteStateSource }>

export type MultiRouteStateOptions<T extends ParserMap> = Partial<RouteStateOptions> & {
  urlKeys?: UrlKeys<T>
  sources?: Sources<T>
}

export type InferParserType<T>
  = T extends ParserWithDefault<infer V, any> ? V
    : T extends Parser<infer V> ? V | null
      : never

export type InferParserMapType<T extends ParserMap> = {
  [K in keyof T]: InferParserType<T[K]>
}
