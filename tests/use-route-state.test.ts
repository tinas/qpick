import { describe, expect, it } from 'vitest'
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from '../src/core/parsers'
import { useRouteState } from '../src/vue/use-route-state'
import { withSetup } from './test-utils'

const flushNavigation = () => new Promise(resolve => setTimeout(resolve, 0))

describe('useRouteState (single key, no parser)', () => {
  it('returns null when query param is absent', async () => {
    const { result } = await withSetup(() => useRouteState('q'))
    expect(result.value).toBeNull()
  })

  it('reads string value from query', async () => {
    const { result } = await withSetup(
      () => useRouteState('q'),
      { initialRoute: '/?q=hello' },
    )
    expect(result.value).toBe('hello')
  })

  it('writes value to URL', async () => {
    const { result, router } = await withSetup(() => useRouteState('q'))

    result.value = 'test'
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBe('test')
  })

  it('removes param when set to null', async () => {
    const { result, router } = await withSetup(
      () => useRouteState('q'),
      { initialRoute: '/?q=hello' },
    )

    result.value = null
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBeUndefined()
  })
})

describe('useRouteState (single key, with parser)', () => {
  it('parses integer from query', async () => {
    const { result } = await withSetup(
      () => useRouteState('page', parseAsInteger),
      { initialRoute: '/?page=3' },
    )
    expect(result.value).toBe(3)
  })

  it('returns null for invalid parser input', async () => {
    const { result } = await withSetup(
      () => useRouteState('page', parseAsInteger),
      { initialRoute: '/?page=abc' },
    )
    expect(result.value).toBeNull()
  })

  it('serializes typed value to URL', async () => {
    const { result, router } = await withSetup(
      () => useRouteState('page', parseAsInteger),
    )

    result.value = 5
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBe('5')
  })

  it('parses boolean from query', async () => {
    const { result } = await withSetup(
      () => useRouteState('open', parseAsBoolean),
      { initialRoute: '/?open=true' },
    )
    expect(result.value).toBe(true)
  })
})

describe('useRouteState (single key, with default)', () => {
  it('returns default when param is absent', async () => {
    const { result } = await withSetup(
      () => useRouteState('page', parseAsInteger.default(1)),
    )
    expect(result.value).toBe(1)
  })

  it('returns default for invalid parser input', async () => {
    const { result } = await withSetup(
      () => useRouteState('page', parseAsInteger.default(1)),
      { initialRoute: '/?page=abc' },
    )
    expect(result.value).toBe(1)
  })

  it('clears param from URL when set to default value', async () => {
    const { result, router } = await withSetup(
      () => useRouteState('page', parseAsInteger.default(1)),
      { initialRoute: '/?page=3' },
    )

    result.value = 1
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBeUndefined()
  })

  it('keeps param in URL when clearOnDefault is false', async () => {
    const { result, router } = await withSetup(
      () => useRouteState('page', parseAsInteger.default(1), { clearOnDefault: false }),
      { initialRoute: '/?page=3' },
    )

    result.value = 1
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBe('1')
  })

  it('returns default when set to null', async () => {
    const { result } = await withSetup(
      () => useRouteState('page', parseAsInteger.default(1)),
      { initialRoute: '/?page=5' },
    )

    result.value = null as any
    await flushNavigation()

    expect(result.value).toBe(1)
  })
})

describe('useRouteState (single key, path params)', () => {
  it('auto-detects path param', async () => {
    const { result } = await withSetup(
      () => useRouteState('id', parseAsInteger),
      { initialRoute: '/users/42' },
    )
    expect(result.value).toBe(42)
  })

  it('reads from params with explicit source', async () => {
    const { result } = await withSetup(
      () => useRouteState('id', parseAsInteger, { source: 'params' }),
      { initialRoute: '/users/42' },
    )
    expect(result.value).toBe(42)
  })
})

describe('useRouteState (single key, history mode)', () => {
  it('navigates on write', async () => {
    const { result, router } = await withSetup(
      () => useRouteState('q', parseAsString),
    )

    result.value = 'test'
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBe('test')
  })
})

describe('useRouteState (single key, reactivity)', () => {
  it('updates ref when URL changes externally', async () => {
    const { result, router } = await withSetup(
      () => useRouteState('q', parseAsString),
    )

    expect(result.value).toBeNull()

    await router.push('/?q=external')

    expect(result.value).toBe('external')
  })
})

describe('useRouteState (multi key)', () => {
  it('reads multiple params', async () => {
    const { result } = await withSetup(
      () => useRouteState({
        q: parseAsString.default(''),
        page: parseAsInteger.default(1),
      }),
      { initialRoute: '/?q=hello&page=3' },
    )

    expect(result.q.value).toBe('hello')
    expect(result.page.value).toBe(3)
  })

  it('returns defaults when params are absent', async () => {
    const { result } = await withSetup(
      () => useRouteState({
        q: parseAsString.default(''),
        page: parseAsInteger.default(1),
      }),
    )

    expect(result.q.value).toBe('')
    expect(result.page.value).toBe(1)
  })

  it('updates individual param via ref', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({
        q: parseAsString.default(''),
        page: parseAsInteger.default(1),
      }),
    )

    result.page.value = 5
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBe('5')
  })

  it('updates multiple params with set()', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({
        q: parseAsString.default(''),
        page: parseAsInteger.default(1),
      }),
    )

    result.set({ q: 'vue', page: 2 })
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBe('vue')
    expect(router.currentRoute.value.query.page).toBe('2')
  })

  it('resets all params to defaults', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({
        q: parseAsString.default(''),
        page: parseAsInteger.default(1),
      }),
      { initialRoute: '/?q=hello&page=5' },
    )

    result.reset()
    await flushNavigation()

    expect(result.q.value).toBe('')
    expect(result.page.value).toBe(1)
    expect(router.currentRoute.value.query.q).toBeUndefined()
    expect(router.currentRoute.value.query.page).toBeUndefined()
  })

  it('returns plain object from toObject()', async () => {
    const { result } = await withSetup(
      () => useRouteState({
        q: parseAsString.default(''),
        page: parseAsInteger.default(1),
      }),
      { initialRoute: '/?q=hello&page=3' },
    )

    expect(result.toObject()).toEqual({ q: 'hello', page: 3 })
  })
})

describe('useRouteState (multi key, urlKeys)', () => {
  it('reads from remapped URL keys', async () => {
    const { result } = await withSetup(
      () => useRouteState({
        search: parseAsString.default(''),
        sortOrder: parseAsStringLiteral(['asc', 'desc']).default('asc'),
      }, {
        urlKeys: { search: 'q', sortOrder: 'dir' },
      }),
      { initialRoute: '/?q=vue&dir=desc' },
    )

    expect(result.search.value).toBe('vue')
    expect(result.sortOrder.value).toBe('desc')
  })

  it('writes to remapped URL keys', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({
        search: parseAsString.default(''),
      }, {
        urlKeys: { search: 'q' },
      }),
    )

    result.search.value = 'test'
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBe('test')
    expect(router.currentRoute.value.query.search).toBeUndefined()
  })
})

describe('useRouteState (multi key, mixed sources)', () => {
  it('reads from both params and query', async () => {
    const { result } = await withSetup(
      () => useRouteState({
        id: parseAsInteger,
        page: parseAsInteger.default(1),
      }, {
        sources: { id: 'params' },
      }),
      { initialRoute: '/users/42?page=3' },
    )

    expect(result.id.value).toBe(42)
    expect(result.page.value).toBe(3)
  })
})

describe('useRouteState (multi key, complex parsers)', () => {
  it('handles string literals', async () => {
    const { result } = await withSetup(
      () => useRouteState({
        sort: parseAsStringLiteral(['date', 'name', 'price']).default('date'),
      }),
      { initialRoute: '/?sort=name' },
    )

    expect(result.sort.value).toBe('name')
  })

  it('returns default for invalid literal value', async () => {
    const { result } = await withSetup(
      () => useRouteState({
        sort: parseAsStringLiteral(['date', 'name', 'price']).default('date'),
      }),
      { initialRoute: '/?sort=invalid' },
    )

    expect(result.sort.value).toBe('date')
  })

  it('handles arrays', async () => {
    const { result } = await withSetup(
      () => useRouteState({
        tags: parseAsArrayOf(parseAsString).default([]),
      }),
      { initialRoute: '/?tags=vue,ts,router' },
    )

    expect(result.tags.value).toEqual(['vue', 'ts', 'router'])
  })
})
