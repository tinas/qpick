import { describe, expect, it, vi } from 'vitest'
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from '../src/core/parsers'
import { routeStateOptions } from '../src/core/route-state-options'
import { useRouteState } from '../src/vue/use-route-state'
import { withSetup } from './test-utils'

const flushNavigation = () => new Promise(resolve => setTimeout(resolve, 0))

describe('useRouteState (single config, no parser)', () => {
  it('returns null when query param is absent', async () => {
    const { result } = await withSetup(() => useRouteState({ key: 'q' }))
    expect(result.value).toBeNull()
  })

  it('reads string value from query', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'q' }),
      { initialRoute: '/?q=hello' },
    )
    expect(result.value).toBe('hello')
  })

  it('writes value to URL', async () => {
    const { result, router } = await withSetup(() => useRouteState({ key: 'q' }))

    result.value = 'test'
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBe('test')
  })

  it('removes param when set to null', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'q' }),
      { initialRoute: '/?q=hello' },
    )

    result.value = null
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBeUndefined()
  })
})

describe('useRouteState (single config, with parser)', () => {
  it('parses integer from query', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger }),
      { initialRoute: '/?page=3' },
    )
    expect(result.value).toBe(3)
  })

  it('returns null for invalid parser input', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger }),
      { initialRoute: '/?page=abc' },
    )
    expect(result.value).toBeNull()
  })

  it('serializes typed value to URL', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger }),
    )

    result.value = 5
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBe('5')
  })

  it('parses boolean from query', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'open', parser: parseAsBoolean }),
      { initialRoute: '/?open=true' },
    )
    expect(result.value).toBe(true)
  })
})

describe('useRouteState (single config, with default)', () => {
  it('returns default when param is absent', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger.default(1) }),
    )
    expect(result.value).toBe(1)
  })

  it('returns default for invalid parser input', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger.default(1) }),
      { initialRoute: '/?page=abc' },
    )
    expect(result.value).toBe(1)
  })

  it('clears param from URL when set to default value', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger.default(1) }),
      { initialRoute: '/?page=3' },
    )

    result.value = 1
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBeUndefined()
  })

  it('keeps param in URL when clearOnDefault is false', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger.default(1), clearOnDefault: false }),
      { initialRoute: '/?page=3' },
    )

    result.value = 1
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBe('1')
  })

  it('returns default when set to null', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger.default(1) }),
      { initialRoute: '/?page=5' },
    )

    result.value = null as any
    await flushNavigation()

    expect(result.value).toBe(1)
  })
})

describe('useRouteState (single config, path params)', () => {
  it('auto-detects path param', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'id', parser: parseAsInteger }),
      { initialRoute: '/users/42' },
    )
    expect(result.value).toBe(42)
  })

  it('reads from params with explicit source', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'id', parser: parseAsInteger, source: 'params' }),
      { initialRoute: '/users/42' },
    )
    expect(result.value).toBe(42)
  })
})

describe('useRouteState (single config, history mode)', () => {
  it('navigates on write', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'q', parser: parseAsString }),
    )

    result.value = 'test'
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBe('test')
  })
})

describe('useRouteState (single config, urlKey)', () => {
  it('reads from remapped URL key', async () => {
    const { result } = await withSetup(
      () => useRouteState({ key: 'search', parser: parseAsString.default(''), urlKey: 'q' }),
      { initialRoute: '/?q=vue' },
    )
    expect(result.value).toBe('vue')
  })

  it('writes to remapped URL key', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'search', parser: parseAsString.default(''), urlKey: 'q' }),
    )

    result.value = 'test'
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBe('test')
    expect(router.currentRoute.value.query.search).toBeUndefined()
  })
})

describe('useRouteState (single config, reactivity)', () => {
  it('updates ref when URL changes externally', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'q', parser: parseAsString }),
    )

    expect(result.value).toBeNull()

    await router.push('/?q=external')

    expect(result.value).toBe('external')
  })
})

describe('useRouteState (array mode)', () => {
  it('reads multiple params', async () => {
    const { result } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString.default('') },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
      { initialRoute: '/?q=hello&page=3' },
    )

    expect(result.q.value).toBe('hello')
    expect(result.page.value).toBe(3)
  })

  it('returns defaults when params are absent', async () => {
    const { result } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString.default('') },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
    )

    expect(result.q.value).toBe('')
    expect(result.page.value).toBe(1)
  })

  it('updates individual param via ref', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString.default('') },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
    )

    result.page.value = 5
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBe('5')
  })

  it('updates multiple params with set()', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString.default('') },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
    )

    result.set({ q: 'vue', page: 2 })
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBe('vue')
    expect(router.currentRoute.value.query.page).toBe('2')
  })

  it('resets all params to defaults', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString.default('') },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
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
      () => useRouteState([
        { key: 'q', parser: parseAsString.default('') },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
      { initialRoute: '/?q=hello&page=3' },
    )

    expect(result.toObject()).toEqual({ q: 'hello', page: 3 })
  })

  it('updates refs when URL changes externally', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString.default('') },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
    )

    expect(result.q.value).toBe('')
    expect(result.page.value).toBe(1)

    await router.push('/?q=external&page=5')

    expect(result.q.value).toBe('external')
    expect(result.page.value).toBe(5)
  })

  it('sets individual ref to null', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
      { initialRoute: '/?q=hello&page=3' },
    )

    result.q.value = null
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBeUndefined()
    expect(result.q.value).toBeNull()
  })
})

describe('useRouteState (array mode, per-config urlKey)', () => {
  it('reads from remapped URL keys', async () => {
    const { result } = await withSetup(
      () => useRouteState([
        { key: 'search', parser: parseAsString.default(''), urlKey: 'q' },
        { key: 'sortOrder', parser: parseAsStringLiteral(['asc', 'desc']).default('asc'), urlKey: 'dir' },
      ]),
      { initialRoute: '/?q=vue&dir=desc' },
    )

    expect(result.search.value).toBe('vue')
    expect(result.sortOrder.value).toBe('desc')
  })

  it('writes to remapped URL keys', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'search', parser: parseAsString.default(''), urlKey: 'q' },
      ]),
    )

    result.search.value = 'test'
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBe('test')
    expect(router.currentRoute.value.query.search).toBeUndefined()
  })
})

describe('useRouteState (array mode, per-config source)', () => {
  it('reads from both params and query', async () => {
    const { result } = await withSetup(
      () => useRouteState([
        { key: 'id', parser: parseAsInteger, source: 'params' },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
      { initialRoute: '/users/42?page=3' },
    )

    expect(result.id.value).toBe(42)
    expect(result.page.value).toBe(3)
  })
})

describe('useRouteState (array mode, complex parsers)', () => {
  it('handles string literals', async () => {
    const { result } = await withSetup(
      () => useRouteState([
        { key: 'sort', parser: parseAsStringLiteral(['date', 'name', 'price']).default('date') },
      ]),
      { initialRoute: '/?sort=name' },
    )

    expect(result.sort.value).toBe('name')
  })

  it('returns default for invalid literal value', async () => {
    const { result } = await withSetup(
      () => useRouteState([
        { key: 'sort', parser: parseAsStringLiteral(['date', 'name', 'price']).default('date') },
      ]),
      { initialRoute: '/?sort=invalid' },
    )

    expect(result.sort.value).toBe('date')
  })

  it('handles arrays', async () => {
    const { result } = await withSetup(
      () => useRouteState([
        { key: 'tags', parser: parseAsArrayOf(parseAsString).default([]) },
      ]),
      { initialRoute: '/?tags=vue,ts,router' },
    )

    expect(result.tags.value).toEqual(['vue', 'ts', 'router'])
  })
})

describe('routeStateOptions()', () => {
  it('returns config unchanged (identity function)', () => {
    const input = {
      key: 'page' as const,
      parser: parseAsInteger.default(1),
    }
    const config = routeStateOptions(input)

    expect(config).toBe(input)
    expect(config.key).toBe('page')
    expect(config.parser.parse('3')).toBe(3)
  })

  it('returns config unchanged when no parser given (identity)', () => {
    const input = { key: 'name' } as const
    const config = routeStateOptions(input)

    expect(config.key).toBe('name')
    expect(config).toBe(input)
  })

  it('preserves per-key options', () => {
    const config = routeStateOptions({
      key: 'page',
      parser: parseAsInteger.default(1),
      urlKey: 'p',
      clearOnDefault: false,
      history: 'replace',
      source: 'query',
    })

    expect(config.urlKey).toBe('p')
    expect(config.clearOnDefault).toBe(false)
    expect(config.history).toBe('replace')
    expect(config.source).toBe('query')
  })
})

describe('useRouteState (pre-defined configs via routeStateOptions)', () => {
  it('works with a single pre-defined config', async () => {
    const pageState = routeStateOptions({
      key: 'page',
      parser: parseAsInteger.default(1),
    })

    const { result } = await withSetup(
      () => useRouteState(pageState),
      { initialRoute: '/?page=5' },
    )

    expect(result.value).toBe(5)
  })

  it('works with array of pre-defined configs', async () => {
    const pageState = routeStateOptions({
      key: 'page',
      parser: parseAsInteger.default(1),
      urlKey: 'p',
    })
    const searchState = routeStateOptions({
      key: 'q',
      parser: parseAsString.default(''),
    })

    const { result } = await withSetup(
      () => useRouteState([pageState, searchState]),
      { initialRoute: '/?p=3&q=vue' },
    )

    expect(result.page.value).toBe(3)
    expect(result.q.value).toBe('vue')
  })

  it('works with mixed pre-defined and inline configs', async () => {
    const pageState = routeStateOptions({
      key: 'page',
      parser: parseAsInteger.default(1),
    })

    const { result } = await withSetup(
      () => useRouteState([
        pageState,
        { key: 'q', parser: parseAsString.default('') },
      ]),
      { initialRoute: '/?page=2&q=hello' },
    )

    expect(result.page.value).toBe(2)
    expect(result.q.value).toBe('hello')
  })

  it('shared config used in multiple useRouteState calls', async () => {
    const pageState = routeStateOptions({
      key: 'page',
      parser: parseAsInteger.default(1),
    })

    const { result: page, router } = await withSetup(
      () => useRouteState(pageState),
    )

    page.value = 3
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBe('3')
  })

  it('pre-defined config without parser defaults to string', async () => {
    const nameState = routeStateOptions({ key: 'name' })

    const { result } = await withSetup(
      () => useRouteState(nameState),
      { initialRoute: '/?name=alice' },
    )

    expect(result.value).toBe('alice')
  })
})

describe('useRouteState (per-config clearOnDefault)', () => {
  it('respects per-config clearOnDefault in array mode', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'page', parser: parseAsInteger.default(1), clearOnDefault: false },
        { key: 'q', parser: parseAsString.default('') },
      ]),
      { initialRoute: '/?page=3&q=hello' },
    )

    result.page.value = 1
    await flushNavigation()

    expect(router.currentRoute.value.query.page).toBe('1')

    result.q.value = ''
    await flushNavigation()

    expect(router.currentRoute.value.query.q).toBeUndefined()
  })
})

describe('useRouteState (array mode, history resolution)', () => {
  it('set() uses push when any config wants push (push wins)', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'page', parser: parseAsInteger.default(1), history: 'replace' },
        { key: 'q', parser: parseAsString.default(''), history: 'push' },
      ]),
    )

    const pushSpy = vi.spyOn(router, 'push')
    const replaceSpy = vi.spyOn(router, 'replace')

    result.set({ page: 2, q: 'vue' })
    await flushNavigation()

    expect(pushSpy).toHaveBeenCalledOnce()
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('set() uses replace when all configs want replace', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'page', parser: parseAsInteger.default(1), history: 'replace' },
        { key: 'q', parser: parseAsString.default(''), history: 'replace' },
      ]),
    )

    const pushSpy = vi.spyOn(router, 'push')
    const replaceSpy = vi.spyOn(router, 'replace')

    result.set({ page: 2, q: 'vue' })
    await flushNavigation()

    expect(replaceSpy).toHaveBeenCalledOnce()
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('set() history override takes precedence over per-config history', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'page', parser: parseAsInteger.default(1), history: 'push' },
        { key: 'q', parser: parseAsString.default(''), history: 'push' },
      ]),
    )

    const pushSpy = vi.spyOn(router, 'push')
    const replaceSpy = vi.spyOn(router, 'replace')

    result.set({ page: 2, q: 'vue' }, { history: 'replace' })
    await flushNavigation()

    expect(replaceSpy).toHaveBeenCalledOnce()
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('set() only considers configs being updated for push-wins resolution', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'page', parser: parseAsInteger.default(1), history: 'replace' },
        { key: 'q', parser: parseAsString.default(''), history: 'push' },
      ]),
    )

    const pushSpy = vi.spyOn(router, 'push')
    const replaceSpy = vi.spyOn(router, 'replace')

    // Only updating 'page' which wants 'replace'
    result.set({ page: 2 })
    await flushNavigation()

    expect(replaceSpy).toHaveBeenCalledOnce()
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('individual ref setter uses per-config history mode', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'page', parser: parseAsInteger.default(1), history: 'replace' },
        { key: 'q', parser: parseAsString.default(''), history: 'push' },
      ]),
    )

    const replaceSpy = vi.spyOn(router, 'replace')
    result.page.value = 5
    await flushNavigation()

    expect(replaceSpy).toHaveBeenCalledOnce()

    replaceSpy.mockClear()
    const pushSpy = vi.spyOn(router, 'push')

    result.q.value = 'test'
    await flushNavigation()

    expect(pushSpy).toHaveBeenCalledOnce()
  })

  it('reset() uses push when any config wants push', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'page', parser: parseAsInteger.default(1), history: 'replace' },
        { key: 'q', parser: parseAsString.default(''), history: 'push' },
      ]),
      { initialRoute: '/?page=3&q=hello' },
    )

    const pushSpy = vi.spyOn(router, 'push')
    const replaceSpy = vi.spyOn(router, 'replace')

    result.reset()
    await flushNavigation()

    expect(pushSpy).toHaveBeenCalledOnce()
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('reset() accepts history override', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'page', parser: parseAsInteger.default(1), history: 'push' },
        { key: 'q', parser: parseAsString.default(''), history: 'push' },
      ]),
      { initialRoute: '/?page=3&q=hello' },
    )

    const pushSpy = vi.spyOn(router, 'push')
    const replaceSpy = vi.spyOn(router, 'replace')

    result.reset({ history: 'replace' })
    await flushNavigation()

    expect(replaceSpy).toHaveBeenCalledOnce()
    expect(pushSpy).not.toHaveBeenCalled()
  })
})
