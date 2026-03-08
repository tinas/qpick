import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { createQPick } from '../src/vue/plugin'
import { createTestRouter } from './test-utils'

describe('createQPick', () => {
  it('provides context to child components', async () => {
    const router = createTestRouter()
    const plugin = createQPick()

    const App = defineComponent({
      setup() {
        return () => h('div')
      },
    })

    const app = createApp(App)
    app.use(router)
    app.use(plugin)

    await router.push('/')
    await router.isReady()
    app.mount(document.createElement('div'))

    expect(plugin.defaults).toBeDefined()
  })

  it('applies default options', async () => {
    const plugin = createQPick({
      defaults: { history: 'replace', clearOnDefault: false },
    })

    expect(plugin.defaults.history).toBe('replace')
    expect(plugin.defaults.clearOnDefault).toBe(false)
  })

  it('uses push as default history mode', async () => {
    const plugin = createQPick()

    expect(plugin.defaults.history).toBe('push')
  })
})
