import type { Router } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { parseAsInteger, parseAsString } from '../src/core/parsers'
import { useRouteState } from '../src/vue/use-route-state'
import { withSetup } from './test-utils'

function flushNavigation(router: Router): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(async () => {
      await router.isReady()
      resolve()
    }, 0)
  })
}

function spyOnNavigation(router: Router) {
  const push = vi.spyOn(router, 'push')
  const replace = vi.spyOn(router, 'replace')
  return {
    push,
    replace,
    totalCalls: () => push.mock.calls.length + replace.mock.calls.length,
    reset: () => {
      push.mockClear()
      replace.mockClear()
    },
  }
}

describe('navigation count: single config mode', () => {
  it('single ref write (no default) triggers exactly 1 navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'q', parser: parseAsString }),
    )
    const nav = spyOnNavigation(router)

    result.value = 'hello'
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })

  it('single ref write (with default, value differs from default) triggers exactly 1 navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger.default(1) }),
    )
    const nav = spyOnNavigation(router)

    result.value = 5
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })

  it('single ref write (value equals default — clearOnDefault) triggers exactly 1 navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'page', parser: parseAsInteger.default(1) }),
      { initialRoute: '/?page=5' },
    )
    const nav = spyOnNavigation(router)

    result.value = 1
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })

  it('single ref write to null triggers exactly 1 navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'q', parser: parseAsString }),
      { initialRoute: '/?q=hello' },
    )
    const nav = spyOnNavigation(router)

    result.value = null
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })

  it('single ref write with history: push triggers exactly 1 push call, 0 replace calls', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'q', parser: parseAsString, history: 'push' }),
    )
    const nav = spyOnNavigation(router)

    result.value = 'test'
    await flushNavigation(router)

    expect(nav.push.mock.calls.length).toBe(1)
    expect(nav.replace.mock.calls.length).toBe(0)
  })

  it('single ref write with history: replace triggers exactly 0 push calls, 1 replace call', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'q', parser: parseAsString, history: 'replace' }),
    )
    const nav = spyOnNavigation(router)

    result.value = 'test'
    await flushNavigation(router)

    expect(nav.push.mock.calls.length).toBe(0)
    expect(nav.replace.mock.calls.length).toBe(1)
  })
})

describe('navigation count: array config mode — individual ref writes', () => {
  it('individual ref write in array mode triggers exactly 1 navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
    )
    const nav = spyOnNavigation(router)

    result.q.value = 'hello'
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })

  it('two sequential individual ref writes in array mode trigger 1 navigation each', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
    )
    const nav = spyOnNavigation(router)

    result.q.value = 'hello'
    await flushNavigation(router)
    nav.reset()

    result.page.value = 5
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })
})

describe('navigation count: array config mode — set() batch', () => {
  it('set() with single key triggers exactly 1 navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
    )
    const nav = spyOnNavigation(router)

    result.set({ q: 'hello' })
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })

  it('set() with multiple keys triggers exactly 1 navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
    )
    const nav = spyOnNavigation(router)

    result.set({ q: 'hello', page: 5 })
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })

  it('set() with all keys triggers exactly 1 navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString },
        { key: 'page', parser: parseAsInteger.default(1) },
        { key: 'sort', parser: parseAsString },
      ]),
    )
    const nav = spyOnNavigation(router)

    result.set({ q: 'hello', page: 5, sort: 'name' })
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })
})

describe('navigation count: array config mode — reset()', () => {
  it('reset() clears all params in single navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState([
        { key: 'q', parser: parseAsString },
        { key: 'page', parser: parseAsInteger.default(1) },
      ]),
      { initialRoute: '/?q=hello&page=5' },
    )
    const nav = spyOnNavigation(router)

    result.reset()
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })
})

describe('navigation count: multiple useRouteState instances', () => {
  it('writing to one instance does not trigger navigation from another', async () => {
    let refA: ReturnType<typeof useRouteState<'q', string>>
    let refB: ReturnType<typeof useRouteState<'page', number>>

    const { router } = await withSetup(() => {
      refA = useRouteState({ key: 'q', parser: parseAsString })
      refB = useRouteState({ key: 'page', parser: parseAsInteger })
      return { a: refA!, b: refB! }
    })
    const nav = spyOnNavigation(router)

    refA!.value = 'hello'
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })

  it('two instances with array mode — writing to one does not affect the other', async () => {
    let instanceA: any
    let instanceB: any

    const { router } = await withSetup(() => {
      instanceA = useRouteState([{ key: 'q', parser: parseAsString }])
      instanceB = useRouteState([{ key: 'page', parser: parseAsInteger }])
      return { a: instanceA, b: instanceB }
    })
    const nav = spyOnNavigation(router)

    instanceA.set({ q: 'hello' })
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })
})

describe('navigation count: path params', () => {
  it('writing to a path param triggers exactly 1 navigation', async () => {
    const { result, router } = await withSetup(
      () => useRouteState({ key: 'id', parser: parseAsInteger, source: 'params' }),
      { initialRoute: '/users/1' },
    )
    const nav = spyOnNavigation(router)

    result.value = 42
    await flushNavigation(router)

    expect(nav.totalCalls()).toBe(1)
  })
})
