import type { Parser, ParserConfig, ParserWithDefault } from './types'

function buildParser<T>(config: ParserConfig<T>): Parser<T> {
  return {
    parse: config.parse,
    serialize: config.serialize,
    eq: config.eq,

    default<D extends T>(value: D): ParserWithDefault<T, D> {
      const p = buildParser<T>(config) as ParserWithDefault<T, D>
      Object.defineProperty(p, 'defaultValue', { value, writable: false, enumerable: true })
      return p
    },
  }
}

export function createParser<T>(config: ParserConfig<T>): Parser<T> {
  return buildParser(config)
}

export const parseAsString = createParser<string>({
  parse: v => v,
  serialize: v => v,
})

export const parseAsInteger = createParser<number>({
  parse: (v) => {
    const n = Number.parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  },
  serialize: v => Math.round(v).toString(),
})

export const parseAsFloat = createParser<number>({
  parse: (v) => {
    const n = Number.parseFloat(v)
    return Number.isNaN(n) ? null : n
  },
  serialize: v => v.toString(),
})

export const parseAsIndex = createParser<number>({
  parse: (v) => {
    const n = Number.parseInt(v, 10)
    return Number.isNaN(n) ? null : n - 1
  },
  serialize: v => (v + 1).toString(),
})

export const parseAsBoolean = createParser<boolean>({
  parse: v => (v === 'true' ? true : v === 'false' ? false : null),
  serialize: v => (v ? 'true' : 'false'),
})

export function parseAsStringLiteral<const T extends readonly string[]>(validValues: T): Parser<T[number]> {
  return createParser<T[number]>({
    parse: v => (validValues.includes(v) ? v as T[number] : null),
    serialize: v => v,
  })
}

export function parseAsNumberLiteral<const T extends readonly number[]>(validValues: T): Parser<T[number]> {
  return createParser<T[number]>({
    parse: (v) => {
      const n = Number.parseFloat(v)
      return validValues.includes(n) ? n as T[number] : null
    },
    serialize: v => v.toString(),
  })
}

export function parseAsStringEnum<T extends string>(validValues: T[]): Parser<T> {
  return parseAsStringLiteral(validValues as unknown as readonly string[]) as unknown as Parser<T>
}

const dateConfig: ParserConfig<Date> = {
  parse: (v) => {
    const d = new Date(v.includes('T') ? v : `${v}T00:00:00.000Z`)
    return Number.isNaN(d.getTime()) ? null : d
  },
  serialize: v => v.toISOString().slice(0, 10),
  eq: (a, b) => a.getTime() === b.getTime(),
}

const isoConfig: ParserConfig<Date> = {
  parse: (v) => {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  },
  serialize: v => v.toISOString(),
  eq: (a, b) => a.getTime() === b.getTime(),
}

const timestampConfig: ParserConfig<Date> = {
  parse: (v) => {
    const n = Number.parseInt(v, 10)
    if (Number.isNaN(n))
      return null
    const d = new Date(n)
    return Number.isNaN(d.getTime()) ? null : d
  },
  serialize: v => v.getTime().toString(),
  eq: (a, b) => a.getTime() === b.getTime(),
}

/**
 * Date parser — defaults to YYYY-MM-DD format.
 *
 * parseAsDate                → YYYY-MM-DD
 * parseAsDate.iso()          → Full ISO 8601 datetime
 * parseAsDate.timestamp()    → Unix milliseconds
 */
export const parseAsDate: Parser<Date> & {
  iso: () => Parser<Date>
  timestamp: () => Parser<Date>
} = Object.assign(createParser(dateConfig), {
  iso: () => createParser(isoConfig),
  timestamp: () => createParser(timestampConfig),
})

export function parseAsArrayOf<T>(itemParser: Parser<T>, separator = ','): Parser<T[]> {
  return createParser<T[]>({
    parse: (v) => {
      if (v === '')
        return []
      const items = v.split(separator)
      const result: T[] = []
      for (const item of items) {
        const parsed = itemParser.parse(item)
        if (parsed === null)
          return null
        result.push(parsed)
      }
      return result
    },
    serialize: v => v.map(item => itemParser.serialize(item)).join(separator),
    eq: (a, b) => {
      if (a.length !== b.length)
        return false
      const eq = itemParser.eq ?? ((x, y) => x === y)
      return a.every((val, i) => eq(val, b[i]!))
    },
  })
}

export function parseAsJson<T>(): Parser<T> {
  return createParser<T>({
    parse: (v) => {
      try {
        return JSON.parse(v) as T
      }
      catch {
        return null
      }
    },
    serialize: v => JSON.stringify(v),
  })
}
