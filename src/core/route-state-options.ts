import type { Parser, ParserWithDefault, RouteStatePerKeyOptions } from './types'

export function defineRouteStateOptions<K extends string, T, D extends T>(
  config: { key: K, parser: ParserWithDefault<T, D> } & RouteStatePerKeyOptions,
): { key: K, parser: ParserWithDefault<T, D> } & RouteStatePerKeyOptions

export function defineRouteStateOptions<K extends string, T>(
  config: { key: K, parser: Parser<T> } & RouteStatePerKeyOptions,
): { key: K, parser: Parser<T> } & RouteStatePerKeyOptions

export function defineRouteStateOptions<K extends string>(
  config: { key: K } & RouteStatePerKeyOptions,
): { key: K } & RouteStatePerKeyOptions

export function defineRouteStateOptions(
  config: { key: string, parser?: Parser<any> } & RouteStatePerKeyOptions,
): typeof config {
  return config
}
