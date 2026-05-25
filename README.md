# qpick

<!-- automd:badges color=F0DB4F bundlephobia -->

[![npm version](https://img.shields.io/npm/v/qpick?color=F0DB4F)](https://npmjs.com/package/qpick)
[![bundle size](https://img.shields.io/bundlephobia/minzip/qpick?color=F0DB4F)](https://bundlephobia.com/package/qpick)

<!-- /automd -->

> Type-safe, reactive URL state management for Vue.

**qpick** — query + pick. Cherry-pick parameters from the URL as reactive state.

## Introduction

`qpick` is a Vue composable built on `vue-router` that turns URL parameters into writable computed refs. Instead of manually reading `route.query`, watching for changes, and navigating back — the URL becomes the source of truth with a declarative config.

- Works with query strings and path parameters
- Full type inference from parser definitions
- Supports `v-model` directly
- Single or batch parameter updates
- No plugin required — optional global defaults via `defineQPick`

## Installation

```bash
pnpm add qpick
```

## Quick Start

```html
<script setup lang="ts">
import { useRouteState } from 'qpick'

// string | null — reads from ?q=...
const search = useRouteState({ key: 'q' })
</script>

<template>
  <input
    :value="search ?? ''"
    placeholder="Search..."
    @input="search = ($event.target as HTMLInputElement).value || null"
  >
</template>
```

Setting `search.value = 'headphones'` navigates to `/?q=headphones`. Setting it to `null` removes the parameter.

> **Tip:** `parseAsString.default('')` eliminates `null` handling and enables direct `v-model`:
>
> ```ts
> import { parseAsString, useRouteState } from 'qpick'
>
> const search = useRouteState({ key: 'q', parser: parseAsString.default('') })
> // search.value is string — never null
> ```
>
> ```html
> <input v-model="search" placeholder="Search...">
> ```

## Parsers

URL parameters are strings. Parsers handle bidirectional conversion between the URL string and the typed value. Each parser defines `parse` (string → value | null) and `serialize` (value → string).

### Using a Parser

```ts
import { parseAsInteger, useRouteState } from 'qpick'

const page = useRouteState({ key: 'page', parser: parseAsInteger })
// page.value is number | null
```

### Default Values

The `.default()` method guarantees a non-null value and enables `clearOnDefault` behavior:

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger.default(1) })
// page.value is number — never null
// Setting page.value = 1 removes ?page from the URL
```

### Built-in Parsers

| Parser | Type | URL Example | Description |
|---|---|---|---|
| `parseAsString` | `string` | `?q=headphones` | Raw string value |
| `parseAsInteger` | `number` | `?page=2` | `parseInt` base 10 |
| `parseAsFloat` | `number` | `?lat=41.015` | `parseFloat` |
| `parseAsBoolean` | `boolean` | `?inStock=true` | Accepts `"true"` / `"false"` |
| `parseAsIndex` | `number` | `?step=1` → `0` | 1-based in URL, 0-based in code |
| `parseAsStringLiteral([...])` | Union | `?sort=price` | Validates against allowed values |
| `parseAsNumberLiteral([...])` | Union | `?rating=5` | Validates against allowed numbers |
| `parseAsStringEnum(values)` | Enum | `?status=ACTIVE` | For TypeScript string enums |
| `parseAsDate` | `Date` | `?from=2024-01-15` | YYYY-MM-DD format |
| `parseAsDate.iso()` | `Date` | `?from=2024-01-15T10:30:00.000Z` | Full ISO 8601 |
| `parseAsDate.timestamp()` | `Date` | `?t=1705312200000` | Unix milliseconds |
| `parseAsArrayOf(parser)` | `T[]` | `?tags=vue,ts` | Comma-separated (configurable) |
| `parseAsJson<T>()` | `T` | `?config={"k":"v"}` | JSON-encoded values |

### String Literals and Enums

```ts
const sort = useRouteState({
  key: 'sort',
  parser: parseAsStringLiteral(['price', 'name', 'rating']).default('price'),
})
// sort.value is 'price' | 'name' | 'rating'
```

For TypeScript string enums:

```ts
enum OrderStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

const status = useRouteState({
  key: 'status',
  parser: parseAsStringEnum<OrderStatus>(Object.values(OrderStatus)),
})
```

### Arrays

```ts
const categories = useRouteState({
  key: 'categories',
  parser: parseAsArrayOf(parseAsString).default([]),
})
// ?categories=electronics,clothing → ['electronics', 'clothing']

// Custom separator
const prices = useRouteState({
  key: 'prices',
  parser: parseAsArrayOf(parseAsInteger, ';').default([]),
})
// ?prices=100;500;1000 → [100, 500, 1000]
```

### Custom Parsers

```ts
import { defineParser, useRouteState } from 'qpick'

// Single-expression parsers work well as arrow functions
type HexColor = number // 0x000000–0xFFFFFF

const parseAsHexColor = defineParser<HexColor>({
  parse: v => Number.isNaN(Number.parseInt(v, 16)) ? null : Number.parseInt(v, 16),
  serialize: v => v.toString(16).padStart(6, '0'),
})
// ?color=ff5733 → 16734003

// Method shorthand works the same way
interface PriceRange {
  min: number
  max: number
}

const parseAsPriceRange = defineParser<PriceRange>({
  parse(value) {
    const parts = value.split('-')
    if (parts.length !== 2)
      return null
    const min = Number(parts[0])
    const max = Number(parts[1])
    if (Number.isNaN(min) || Number.isNaN(max))
      return null
    return { min, max }
  },
  serialize: v => `${v.min}-${v.max}`,
})

const priceRange = useRouteState({
  key: 'price',
  parser: parseAsPriceRange.default({ min: 0, max: 1000 }),
})
// ?price=50-200 → { min: 50, max: 200 }
```

## Multiple Parameters

`useRouteState` also accepts an array of configs to manage related parameters together:

```html
<script setup lang="ts">
import { parseAsInteger, parseAsString, parseAsStringLiteral, useRouteState } from 'qpick'

const filters = useRouteState([
  { key: 'q', parser: parseAsString.default('') },
  { key: 'page', parser: parseAsInteger.default(1) },
  { key: 'sort', parser: parseAsStringLiteral(['price', 'name', 'rating']).default('price') },
])
</script>

<template>
  <input v-model="filters.q.value" placeholder="Search...">
  <select v-model="filters.sort.value">
    <option value="price">Price</option>
    <option value="name">Name</option>
    <option value="rating">Rating</option>
  </select>
  <button @click="filters.page.value++">Next page</button>
</template>
```

> **Note:** In single config mode, `useRouteState` returns a ref directly — Vue auto-unwraps it in templates. In array mode, each property is a ref, so `v-model` requires `.value` (e.g. `v-model="filters.q.value"`).

### Batch Updates with `set()`

`set()` updates multiple parameters in a single navigation:

```ts
function onSearch(term: string) {
  filters.set({ q: term, page: 1 })
}

// Override history mode for this call
filters.set({ q: term, page: 1 }, { history: 'replace' })
```

### `reset()`

Restores all parameters to defaults in a single navigation:

```ts
filters.reset()
filters.reset({ history: 'replace' })
```

### `toObject()`

Returns current values as a plain object:

```ts
watch(() => filters.toObject(), (params) => {
  fetchProducts(params)
})
```

### URL Key Remapping

The `urlKey` option maps a code-friendly property name to a different URL parameter name:

```ts
const filters = useRouteState([
  { key: 'search', parser: parseAsString.default(''), urlKey: 'q' },
  { key: 'sortOrder', parser: parseAsStringLiteral(['asc', 'desc']).default('asc'), urlKey: 'dir' },
])
// Code: filters.search.value, filters.sortOrder.value
// URL:  ?q=headphones&dir=desc
```

## Path Parameters

### Automatic Detection

When a key matches a named route parameter, `qpick` reads from path params automatically:

```ts
// Route: /products/:id
const id = useRouteState({ key: 'id', parser: parseAsInteger })
```

### Explicit Source

```ts
const id = useRouteState({ key: 'id', parser: parseAsInteger, source: 'params' })
```

### Mixing Sources

```ts
// Route: /users/:id
const state = useRouteState([
  { key: 'userId', parser: parseAsInteger, source: 'params', urlKey: 'id' },
  { key: 'tab', parser: parseAsStringLiteral(['profile', 'orders', 'settings']).default('profile'), source: 'query' },
  { key: 'page', parser: parseAsInteger.default(1), source: 'query' },
])
```

> **Note:** Each `key` in the config array must be unique — it becomes the property name on the returned object. Duplicate keys are not detected at runtime; the last config silently overwrites earlier ones. When the same URL parameter name exists in both path and query, different keys with the same `urlKey` distinguish them:

```ts
// Route: /brands/:id?id=456
// A brand page that highlights a specific product
const state = useRouteState([
  { key: 'brandId', parser: parseAsInteger, source: 'params', urlKey: 'id' },
  { key: 'productId', parser: parseAsInteger, source: 'query', urlKey: 'id' },
])
// state.brandId.value   → route.params.id
// state.productId.value → route.query.id
```

## Options

### `history`

Controls whether changes push a new history entry or replace the current one. Default: `'push'`.

```ts
const search = useRouteState({ key: 'q', parser: parseAsString.default(''), history: 'replace' })
```

`'replace'` updates the URL without adding a new history entry. This is useful in scenarios where the parameter changes frequently — such as a search input updating on every keystroke or a range slider adjusting continuously.

#### History Resolution in Batch Operations

When `set()` or `reset()` involves configs with different history modes:

1. **Call-site override wins** — `{ history }` passed to `set()`/`reset()` is used unconditionally.
2. **Push wins** — If any config in the batch has `history: 'push'`, the navigation uses push.
3. **Replace as fallback** — Only when all configs specify `'replace'`.

```ts
const state = useRouteState([
  { key: 'q', parser: parseAsString.default(''), history: 'replace' },
  { key: 'page', parser: parseAsInteger.default(1), history: 'push' },
])

state.set({ q: 'vue', page: 2 }) // push wins
state.set({ q: 'react' }) // only q → replace
state.set({ q: 'vue', page: 2 }, { history: 'replace' }) // override → replace
```

### `clearOnDefault`

Removes the parameter from the URL when its value equals the default. Enabled by default.

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger.default(1), clearOnDefault: false })
// ?page=1 stays in the URL
```

## Reusable Configs

`defineRouteStateOptions()` provides type inference for configs defined outside of `useRouteState`:

```ts
// composables/states.ts
import { defineRouteStateOptions, parseAsInteger, parseAsString } from 'qpick'

export const searchState = defineRouteStateOptions({
  key: 'search',
  parser: parseAsString.default(''),
  urlKey: 'q',
})

export const pageState = defineRouteStateOptions({
  key: 'page',
  parser: parseAsInteger.default(1),
})
```

Shared configs keep components in sync — they read from and write to the same URL:

```html
<!-- ProductList.vue -->
<script setup lang="ts">
import { useRouteState } from 'qpick'
import { pageState, searchState } from '@/composables/states'

const filters = useRouteState([searchState, pageState])
</script>
```

```html
<!-- Pagination.vue -->
<script setup lang="ts">
import { useRouteState } from 'qpick'
import { pageState } from '@/composables/states'

const page = useRouteState(pageState)
</script>

<template>
  <button :disabled="page <= 1" @click="page--">Previous</button>
  <span>Page {{ page }}</span>
  <button @click="page++">Next</button>
</template>
```

## Plugin Setup (Optional)

`useRouteState` works without any plugin. `defineQPick` is only needed to override global defaults:

```ts
import { defineQPick } from 'qpick'

app.use(defineQPick({
  defaults: {
    history: 'push', // 'push' | 'replace' — default: 'push'
    clearOnDefault: true, // default: true
  },
}))
```

Without the plugin, built-in defaults (`history: 'push'`, `clearOnDefault: true`) are used.

## Type Inference

All types are inferred from parser definitions:

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger })
// WritableComputedRef<number | null>

const page = useRouteState({ key: 'page', parser: parseAsInteger.default(1) })
// WritableComputedRef<number>
```

The `InferParserType` utility extracts the value type from a parser:

```ts
import type { InferParserType } from 'qpick'

type PageValue = InferParserType<typeof parseAsInteger>
// number | null
```

## License

[MIT](./LICENSE)
