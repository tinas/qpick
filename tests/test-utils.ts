import type { Router, RouteRecordRaw } from 'vue-router'
import type { RouteStateOptions } from '../src/core/types'
import { createApp, defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineQPick } from '../src/vue/plugin'

export function createTestRouter(routes: RouteRecordRaw[] = []): Router {
  const defaultRoutes: RouteRecordRaw[] = routes.length > 0
    ? routes
    : [
        { name: 'home', path: '/', component: defineComponent({ render: () => h('div') }) },
        { name: 'user', path: '/users/:id', component: defineComponent({ render: () => h('div') }) },
      ]

  return createRouter({
    history: createMemoryHistory(),
    routes: defaultRoutes,
  })
}

export function withSetup<T>(
  composable: () => T,
  options?: {
    routes?: RouteRecordRaw[]
    initialRoute?: string
    pluginDefaults?: Partial<RouteStateOptions>
  },
): Promise<{ result: T, router: Router }> {
  return (async () => {
    const router = createTestRouter(options?.routes)
    const plugin = defineQPick({
      defaults: options?.pluginDefaults,
    })

    let result: T

    const App = defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      },
    })

    const app = createApp(App)
    app.use(router)
    app.use(plugin)

    await router.push(options?.initialRoute ?? '/')
    await router.isReady()

    app.mount(document.createElement('div'))

    return { result: result!, router }
  })()
}
