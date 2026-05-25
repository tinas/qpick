import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { defineQPick } from '../src/vue/plugin'
import { createTestRouter } from './test-utils'

describe('defineQPick', () => {
  it('provides context to child components', async () => {
    const router = createTestRouter()
    const plugin = defineQPick()

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
    const plugin = defineQPick({
      defaults: { history: 'replace', clearOnDefault: false },
    })

    expect(plugin.defaults.history).toBe('replace')
    expect(plugin.defaults.clearOnDefault).toBe(false)
  })

  it('uses push as default history mode', async () => {
    const plugin = defineQPick()

    expect(plugin.defaults.history).toBe('push')
  })
})
