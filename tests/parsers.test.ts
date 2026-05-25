import { describe, expect, it } from 'vitest'
import {
  defineParser,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsDate,
  parseAsFloat,
  parseAsIndex,
  parseAsInteger,
  parseAsJson,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringEnum,
  parseAsStringLiteral,
} from '../src/core/parsers'

describe('defineParser', () => {
  it('creates a parser with parse and serialize', () => {
    const parser = defineParser<number>({
      parse: v => Number(v) || null,
      serialize: v => String(v),
    })

    expect(parser.parse('42')).toBe(42)
    expect(parser.serialize(42)).toBe('42')
    expect(parser.parse('abc')).toBeNull()
  })

  it('supports .default()', () => {
    const parser = defineParser<number>({
      parse: v => Number(v) || null,
      serialize: v => String(v),
    }).default(0)

    expect(parser.defaultValue).toBe(0)
  })
})

describe('parseAsString', () => {
  it('parses any string value', () => {
    expect(parseAsString.parse('hello')).toBe('hello')
    expect(parseAsString.parse('')).toBe('')
  })

  it('serializes string value', () => {
    expect(parseAsString.serialize('hello')).toBe('hello')
  })

  it('supports .default()', () => {
    const parser = parseAsString.default('')

    expect(parser.defaultValue).toBe('')
  })
})

describe('parseAsInteger', () => {
  it('parses valid integers', () => {
    expect(parseAsInteger.parse('42')).toBe(42)
    expect(parseAsInteger.parse('-7')).toBe(-7)
    expect(parseAsInteger.parse('0')).toBe(0)
  })

  it('returns null for invalid values', () => {
    expect(parseAsInteger.parse('abc')).toBeNull()
    expect(parseAsInteger.parse('')).toBeNull()
    expect(parseAsInteger.parse('3.14')).toBe(3) // parseInt truncates
  })

  it('serializes by truncating', () => {
    expect(parseAsInteger.serialize(42)).toBe('42')
    expect(parseAsInteger.serialize(3.7)).toBe('3')
  })
})

describe('parseAsFloat', () => {
  it('parses valid floats', () => {
    expect(parseAsFloat.parse('3.14')).toBe(3.14)
    expect(parseAsFloat.parse('-0.5')).toBe(-0.5)
    expect(parseAsFloat.parse('42')).toBe(42)
  })

  it('returns null for invalid values', () => {
    expect(parseAsFloat.parse('abc')).toBeNull()
    expect(parseAsFloat.parse('')).toBeNull()
  })

  it('serializes float to string', () => {
    expect(parseAsFloat.serialize(3.14)).toBe('3.14')
  })
})

describe('parseAsBoolean', () => {
  it('parses true and false', () => {
    expect(parseAsBoolean.parse('true')).toBe(true)
    expect(parseAsBoolean.parse('false')).toBe(false)
  })

  it('returns null for other values', () => {
    expect(parseAsBoolean.parse('1')).toBeNull()
    expect(parseAsBoolean.parse('yes')).toBeNull()
    expect(parseAsBoolean.parse('')).toBeNull()
  })

  it('serializes boolean to string', () => {
    expect(parseAsBoolean.serialize(true)).toBe('true')
    expect(parseAsBoolean.serialize(false)).toBe('false')
  })
})

describe('parseAsIndex', () => {
  it('parses with -1 offset (URL is 1-based, code is 0-based)', () => {
    expect(parseAsIndex.parse('1')).toBe(0)
    expect(parseAsIndex.parse('5')).toBe(4)
  })

  it('serializes with +1 offset', () => {
    expect(parseAsIndex.serialize(0)).toBe('1')
    expect(parseAsIndex.serialize(4)).toBe('5')
  })

  it('returns null for invalid values', () => {
    expect(parseAsIndex.parse('abc')).toBeNull()
  })
})

describe('parseAsStringLiteral', () => {
  const parser = parseAsStringLiteral(['asc', 'desc'])

  it('parses valid literal values', () => {
    expect(parser.parse('asc')).toBe('asc')
    expect(parser.parse('desc')).toBe('desc')
  })

  it('returns null for invalid values', () => {
    expect(parser.parse('up')).toBeNull()
    expect(parser.parse('')).toBeNull()
  })

  it('serializes literal value', () => {
    expect(parser.serialize('asc')).toBe('asc')
  })
})

describe('parseAsNumberLiteral', () => {
  const parser = parseAsNumberLiteral([1, 2, 3])

  it('parses valid number literals', () => {
    expect(parser.parse('1')).toBe(1)
    expect(parser.parse('3')).toBe(3)
  })

  it('returns null for invalid values', () => {
    expect(parser.parse('4')).toBeNull()
    expect(parser.parse('abc')).toBeNull()
  })
})

describe('parseAsStringEnum', () => {
  enum Direction {
    Up = 'UP',
    Down = 'DOWN',
  }

  const parser = parseAsStringEnum<Direction>(Object.values(Direction))

  it('parses valid enum values', () => {
    expect(parser.parse('UP')).toBe(Direction.Up)
    expect(parser.parse('DOWN')).toBe(Direction.Down)
  })

  it('returns null for invalid values', () => {
    expect(parser.parse('LEFT')).toBeNull()
  })
})

describe('parseAsDate', () => {
  it('parses YYYY-MM-DD as UTC midnight', () => {
    const result = parseAsDate.parse('2024-01-15')

    expect(result).toBeInstanceOf(Date)
    expect(result!.toISOString()).toBe('2024-01-15T00:00:00.000Z')
  })

  it('serializes to YYYY-MM-DD', () => {
    const date = new Date('2024-01-15T00:00:00.000Z')

    expect(parseAsDate.serialize(date)).toBe('2024-01-15')
  })

  it('returns null for invalid dates', () => {
    expect(parseAsDate.parse('not-a-date')).toBeNull()
  })

  it('parses full ISO datetime and normalizes to date', () => {
    const result = parseAsDate.parse('2024-01-15T10:30:00Z')

    expect(result).toBeInstanceOf(Date)
    expect(parseAsDate.serialize(result!)).toBe('2024-01-15')
  })

  it('compares dates by serialized value (idempotent)', () => {
    const a = new Date('2024-01-15T00:00:00.000Z')
    const b = new Date('2024-01-15T00:00:00.000Z')
    const c = new Date('2024-01-16T00:00:00.000Z')

    expect(parseAsDate.serialize(a) === parseAsDate.serialize(b)).toBe(true)
    expect(parseAsDate.serialize(a) === parseAsDate.serialize(c)).toBe(false)
  })

  it('supports .default()', () => {
    const date = new Date('2024-01-01T00:00:00.000Z')
    const parser = parseAsDate.default(date)

    expect(parser.defaultValue).toBe(date)
  })
})

describe('parseAsDate.iso()', () => {
  const parser = parseAsDate.iso()

  it('parses full ISO datetime', () => {
    const result = parser.parse('2024-01-15T10:30:00.000Z')

    expect(result).toBeInstanceOf(Date)
    expect(result!.toISOString()).toBe('2024-01-15T10:30:00.000Z')
  })

  it('serializes to full ISO datetime', () => {
    const date = new Date('2024-01-15T10:30:00.000Z')

    expect(parser.serialize(date)).toBe('2024-01-15T10:30:00.000Z')
  })

  it('returns null for invalid dates', () => {
    expect(parser.parse('invalid')).toBeNull()
  })
})

describe('parseAsDate.timestamp()', () => {
  const parser = parseAsDate.timestamp()

  it('parses unix milliseconds', () => {
    const result = parser.parse('1705312200000')

    expect(result).toBeInstanceOf(Date)
    expect(result!.getTime()).toBe(1705312200000)
  })

  it('serializes to unix milliseconds string', () => {
    const date = new Date(1705312200000)

    expect(parser.serialize(date)).toBe('1705312200000')
  })

  it('returns null for invalid values', () => {
    expect(parser.parse('abc')).toBeNull()
  })
})

describe('parseAsArrayOf', () => {
  it('parses comma-separated strings', () => {
    const parser = parseAsArrayOf(parseAsString)

    expect(parser.parse('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('parses comma-separated integers', () => {
    const parser = parseAsArrayOf(parseAsInteger)

    expect(parser.parse('1,2,3')).toEqual([1, 2, 3])
  })

  it('returns null if any item fails to parse', () => {
    const parser = parseAsArrayOf(parseAsInteger)

    expect(parser.parse('1,abc,3')).toBeNull()
  })

  it('parses empty string as empty array', () => {
    const parser = parseAsArrayOf(parseAsString)

    expect(parser.parse('')).toEqual([])
  })

  it('supports custom separator', () => {
    const parser = parseAsArrayOf(parseAsInteger, ';')

    expect(parser.parse('1;2;3')).toEqual([1, 2, 3])
  })

  it('serializes array to separated string', () => {
    const parser = parseAsArrayOf(parseAsString)

    expect(parser.serialize(['a', 'b', 'c'])).toBe('a,b,c')
  })

  it('compares arrays by serialized value (idempotent)', () => {
    const parser = parseAsArrayOf(parseAsInteger)
    const a = parser.serialize([1, 2])
    const b = parser.serialize([1, 2])
    const c = parser.serialize([1, 3])
    const d = parser.serialize([1])

    expect(a === b).toBe(true)
    expect(a === c).toBe(false)
    expect(a === d).toBe(false)
  })

  it('supports .default()', () => {
    const parser = parseAsArrayOf(parseAsString).default([])

    expect(parser.defaultValue).toEqual([])
  })

  it('works with configured parsers like parseAsDate.iso()', () => {
    const parser = parseAsArrayOf(parseAsDate.iso())
    const result = parser.parse('2024-01-15T10:30:00.000Z,2024-02-20T08:00:00.000Z')

    expect(result).toEqual([
      new Date('2024-01-15T10:30:00.000Z'),
      new Date('2024-02-20T08:00:00.000Z'),
    ])
    expect(parser.serialize(result!)).toBe('2024-01-15T10:30:00.000Z,2024-02-20T08:00:00.000Z')
  })

  it('works with configured parsers like parseAsDate.timestamp()', () => {
    const parser = parseAsArrayOf(parseAsDate.timestamp())
    const result = parser.parse('1705312200000,1708416000000')

    expect(result).toEqual([
      new Date(1705312200000),
      new Date(1708416000000),
    ])
    expect(parser.serialize(result!)).toBe('1705312200000,1708416000000')
  })
})

describe('parseAsJson', () => {
  it('parses valid JSON', () => {
    const parser = parseAsJson<{ name: string }>()

    expect(parser.parse('{"name":"vue"}')).toEqual({ name: 'vue' })
  })

  it('returns null for invalid JSON', () => {
    const parser = parseAsJson()

    expect(parser.parse('not json')).toBeNull()
  })

  it('serializes object to JSON string', () => {
    const parser = parseAsJson<{ name: string }>()

    expect(parser.serialize({ name: 'vue' })).toBe('{"name":"vue"}')
  })
})
