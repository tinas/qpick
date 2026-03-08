# qpick

> Type-safe, reactive URL state management for Vue.

## Name

The name **qpick** is derived from **query + pick**, inspired by the concept of **cherry-picking** — extracting only the specific parameters needed from the URL.

- **q** refers to URL query parameters
- **pick** refers to selecting specific values

qpick is pronounced **"q-pick"**.

## Introduction

`qpick` is a Vue plugin built on top of `vue-router` that provides a declarative API for selecting and synchronizing URL search parameters as reactive state. Rather than accessing `route.query` directly, watching for changes, and mapping values manually, `qpick` enables specific parameters to be picked from the URL and used as writable computed refs.

`qpick` relies on `vue-router` internally, integrating with existing routing logic without additional configuration. It exposes a single composable — `useRouteState` — that synchronizes URL query strings and path parameters with Vue's reactivity system. The URL serves as the source of truth, and each value is a writable computed ref that supports `v-model`, remains in sync with browser navigation, and has its type fully inferred from the parser definition.

## Installation

```bash
npm install qpick
```

```bash
pnpm add qpick
```

## Quick Start

### Plugin Setup (Optional)

The plugin can be registered in the application entry point to configure global defaults. If the plugin is not installed, `useRouteState` uses built-in defaults:

- `history` — `'push'`
- `clearOnDefault` — `true`

```ts
import { createQPick } from 'qpick'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { name: 'products', path: '/products', component: () => import('./views/ProductList.vue') },
    { name: 'product', path: '/products/:id', component: () => import('./views/ProductDetail.vue') },
  ],
})

const app = createApp(App)
app.use(router)
app.use(createQPick()) // optional — only needed to override defaults
app.mount('#app')
```

To override the defaults globally:

```ts
app.use(createQPick({
  defaults: {
    history: 'push', // 'push' | 'replace' — default: 'push'
    clearOnDefault: true, // remove param from URL when value equals default — default: true
  },
}))
```

### Basic Usage

The minimal usage requires a key name. When no parser is provided, the value is treated as a raw string:

```html
<!-- SearchBar.vue -->
<script setup lang="ts">
import { useRouteState } from 'qpick'

// search.value is string | null
// URL: /?q=headphones → search.value === 'headphones'
// URL: /              → search.value === null
const search = useRouteState('q')
</script>

<template>
  <input
    :value="search ?? ''"
    placeholder="Search products..."
    @input="search = ($event.target as HTMLInputElement).value || null"
  >
  <button v-if="search" @click="search = null">
    Clear
  </button>
</template>
```

`useRouteState` returns a writable computed ref that integrates with Vue's reactivity system. Setting `search.value = 'headphones'` navigates to `/?q=headphones`. Setting it to `null` removes the parameter from the URL.

> **Note:** When binding a nullable string to an input, `parseAsString.default('')` eliminates `null` handling and enables direct `v-model` binding:
>
> ```ts
> import { parseAsString, useRouteState } from 'qpick'
>
> const search = useRouteState('q', parseAsString.default(''))
> // search.value is string — never null
> // Setting search.value = '' removes ?q from the URL
> ```
>
> ```html
> <template>
>   <input v-model="search" placeholder="Search products...">
> </template>
> ```

## Parsers

Values obtained from URL search parameters are represented as strings. Parsers handle the conversion between the string representation in the URL and the typed value in the application. Each parser defines two functions: `parse` (string → typed value) and `serialize` (typed value → string).

### Using a Parser

Pass a parser as the second argument to `useRouteState`:

```ts
import { parseAsInteger, useRouteState } from 'qpick'

const page = useRouteState('page', parseAsInteger)
// page.value is number | null
```

When the URL contains `?page=3`, `page.value` returns `3` as a number. When the parameter is absent or contains an invalid value such as `?page=abc`, `page.value` returns `null`.

### Default Values

In typical applications, a guaranteed non-null value is preferable. The `.default()` method provides this:

```ts
const page = useRouteState('page', parseAsInteger.default(1))
// page.value is number — never null
```

This changes two behaviors:

1. The return type becomes non-nullable (`number` instead of `number | null`).
2. When the current value equals the default, the parameter is removed from the URL (controlled by the `clearOnDefault` option).

### Built-in Parsers

| Parser | Type | URL Example | Description |
|---|---|---|---|
| `parseAsString` | `string` | `?q=headphones` | Returns the raw string value |
| `parseAsInteger` | `number` | `?page=2` | Parses with `parseInt`, base 10 |
| `parseAsFloat` | `number` | `?lat=41.015` | Parses with `parseFloat` |
| `parseAsBoolean` | `boolean` | `?inStock=true` | Accepts `"true"` and `"false"` |
| `parseAsIndex` | `number` | `?step=1` → `0` | 1-based in URL, 0-based in code |
| `parseAsStringLiteral([...])` | Union | `?sort=price` | Validates against allowed values |
| `parseAsNumberLiteral([...])` | Union | `?rating=5` | Validates against allowed numeric values |
| `parseAsStringEnum(values)` | Enum | `?status=ACTIVE` | For TypeScript string enums |
| `parseAsDate` | `Date` | `?from=2024-01-15` | Accepts YYYY-MM-DD or full datetime, serializes as YYYY-MM-DD |
| `parseAsDate.iso()` | `Date` | `?from=2024-01-15T10:30:00.000Z` | Full ISO 8601 datetime |
| `parseAsDate.timestamp()` | `Date` | `?t=1705312200000` | Unix milliseconds |
| `parseAsArrayOf(parser)` | `T[]` | `?tags=vue,ts` | Comma-separated (configurable separator) |
| `parseAsJson<T>()` | `T` | `?config={"k":"v"}` | JSON-encoded values |

### String Literals and Enums

When a parameter should accept one of a fixed set of values, `parseAsStringLiteral` provides both runtime validation and type narrowing:

```ts
const sort = useRouteState(
  'sort',
  parseAsStringLiteral(['price', 'name', 'rating', 'newest']).default('newest'),
)
// sort.value is 'price' | 'name' | 'rating' | 'newest'
// ?sort=invalid falls back to 'newest'
```

For TypeScript string enums, use `parseAsStringEnum`:

```ts
enum OrderStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

const status = useRouteState(
  'status',
  parseAsStringEnum<OrderStatus>(Object.values(OrderStatus)),
)
// status.value is OrderStatus | null
```

### Arrays

Any parser can be composed with `parseAsArrayOf` to handle comma-separated values in the URL:

```ts
const categories = useRouteState(
  'categories',
  parseAsArrayOf(parseAsString).default([]),
)
// ?categories=electronics,clothing,books → ['electronics', 'clothing', 'books']

const priceRanges = useRouteState(
  'prices',
  parseAsArrayOf(parseAsInteger, ';').default([]),
)
// ?prices=100;500;1000 → [100, 500, 1000]
```

### Custom Parsers

When the built-in parsers are insufficient, define a custom parser with `createParser`:

```ts
import { createParser, useRouteState } from 'qpick'

interface PriceRange {
  min: number
  max: number
}

const parseAsPriceRange = createParser<PriceRange>({
  parse(value) {
    const [min, max] = value.split('-').map(Number)
    if (min === undefined || max === undefined || Number.isNaN(min) || Number.isNaN(max))
      return null
    return { min, max }
  },
  serialize(value) {
    return `${value.min}-${value.max}`
  },
  eq(a, b) {
    return a.min === b.min && a.max === b.max
  },
})

const priceRange = useRouteState(
  'price',
  parseAsPriceRange.default({ min: 0, max: 1000 }),
)
// ?price=50-200 → { min: 50, max: 200 }
```

The `eq` function is required for types that cannot be compared with `===`. It is used by the `clearOnDefault` option to determine whether the current value matches the default.

## Multiple Parameters

When working with several related URL parameters, pass an object of parsers instead of a single key:

```html
<!-- ProductList.vue -->
<script setup lang="ts">
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useRouteState,
} from 'qpick'

const filters = useRouteState({
  q: parseAsString.default(''),
  page: parseAsInteger.default(1),
  sort: parseAsStringLiteral(['price', 'name', 'rating']).default('price'),
  categories: parseAsArrayOf(parseAsString).default([]),
})
</script>

<template>
  <input v-model="filters.q.value" placeholder="Search products...">

  <select v-model="filters.sort.value">
    <option value="price">
      Price
    </option>
    <option value="name">
      Name
    </option>
    <option value="rating">
      Rating
    </option>
  </select>

  <div>
    Page {{ filters.page.value }}
    <button @click="filters.page.value++">
      Next
    </button>
  </div>
</template>
```

Each key in the returned object is a writable computed ref, consistent with the single-key form.

### Batch Updates with `set()`

When multiple parameters must change simultaneously — for example, resetting to page 1 when the search query changes — use `set()` to perform a single navigation:

```ts
function onSearch(term: string) {
  filters.set({ q: term, page: 1 })
}
```

Without `set()`, assigning `filters.q.value` and `filters.page.value` separately triggers two router navigations. `set()` combines them into one.

### Resetting to Defaults

The `reset()` method restores all parameters to their default values in a single navigation:

```ts
function clearAllFilters() {
  filters.reset()
}
```

This removes all defaulted parameters from the URL and returns each value to its default.

### Reading as a Plain Object

The `toObject()` method returns all current values as a plain object, suitable for API calls or watchers:

```ts
import { watch } from 'vue'

watch(() => filters.toObject(), (params) => {
  // params: { q: string, page: number, sort: string, categories: string[] }
  fetchProducts(params)
})
```

### URL Key Remapping

Property names in code do not have to match the parameter names in the URL. The `urlKeys` option maps property names to different URL keys:

```ts
const filters = useRouteState({
  search: parseAsString.default(''),
  page: parseAsInteger.default(1),
  sortOrder: parseAsStringLiteral(['asc', 'desc']).default('asc'),
}, {
  urlKeys: {
    search: 'q',
    sortOrder: 'dir',
  },
})

// In code:  filters.search.value, filters.sortOrder.value
// In URL:   ?q=headphones&dir=desc
```

## Path Parameters

In addition to query strings, `qpick` supports path parameters defined in Vue Router route definitions.

### Automatic Detection

When a key matches a named parameter in `route.params`, `qpick` reads from the path parameter automatically:

```ts
// Route definition: /products/:id
const id = useRouteState('id', parseAsInteger)
// Reads from route.params.id
```

### Explicit Source

In cases where the same key could exist in both query and params, the source can be specified explicitly:

```ts
const id = useRouteState('id', parseAsInteger, { source: 'params' })
```

### Mixing Query and Path Parameters

In multi-key mode, the `sources` option controls which parameters are read from the path:

```ts
// Route definition: /users/:id
const state = useRouteState({
  id: parseAsInteger,
  tab: parseAsStringLiteral(['profile', 'orders', 'settings']).default('profile'),
  page: parseAsInteger.default(1),
}, {
  sources: { id: 'params' },
})

// state.id.value    → from route.params.id
// state.tab.value   → from route.query.tab
// state.page.value  → from route.query.page
```

## Options

### `history`

Controls whether state changes push a new entry to the browser history or replace the current entry. The default is `'push'`, which allows navigation to previous states via the browser back button.

```ts
// Single key — replace mode
const search = useRouteState('q', parseAsString.default(''), { history: 'replace' })

// Multi key
const filters = useRouteState({ /* ... */ }, { history: 'replace' })
```

Use `'replace'` for high-frequency updates where individual state changes do not constitute meaningful history entries, such as live search input or range sliders.

### `clearOnDefault`

When enabled (the default), parameters are removed from the URL when their value equals the default. This keeps URLs clean — a page in its default state contains no unnecessary query parameters.

```ts
const page = useRouteState('page', parseAsInteger.default(1), { clearOnDefault: false })
// ?page=1 remains in the URL even though 1 is the default
```

Disable this option when the URL should always provide a complete and explicit snapshot of the current state, regardless of defaults.

## Reusable Composables

Parser definitions can be shared across components by wrapping `useRouteState` in a custom composable. All components that use the same composable remain in sync — they read from and write to the same URL:

```ts
// composables/useProductFilters.ts
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useRouteState,
} from 'qpick'

export function useProductFilters() {
  return useRouteState({
    search: parseAsString.default(''),
    page: parseAsInteger.default(1),
    sort: parseAsStringLiteral(['price', 'name', 'rating']).default('price'),
    categories: parseAsArrayOf(parseAsString).default([]),
  }, {
    urlKeys: { search: 'q' },
  })
}
```

```html
<!-- ProductList.vue -->
<script setup lang="ts">
import { watch } from 'vue'
import { useProductFilters } from '@/composables/useProductFilters'

const filters = useProductFilters()

watch(() => filters.toObject(), (params) => {
  fetchProducts(params)
})
</script>

<template>
  <input v-model="filters.search.value" placeholder="Search products...">
  <select v-model="filters.sort.value">
    <option value="price">
      Price
    </option>
    <option value="name">
      Name
    </option>
    <option value="rating">
      Rating
    </option>
  </select>
  <button @click="filters.reset()">
    Clear all filters
  </button>
</template>
```

```html
<!-- ProductPagination.vue -->
<script setup lang="ts">
import { useProductFilters } from '@/composables/useProductFilters'

const filters = useProductFilters()
</script>

<template>
  <span>Page {{ filters.page.value }}</span>
  <button :disabled="filters.page.value <= 1" @click="filters.page.value--">
    Previous
  </button>
  <button @click="filters.page.value++">
    Next
  </button>
</template>
```

Both components share the same URL state. A change to `filters.page` in `ProductPagination` is reflected in `ProductList` automatically, as both derive their state from the same reactive source: the URL.

## Type Inference

All types are inferred from parser definitions. Manual type annotations are not required:

```ts
const page = useRouteState('page', parseAsInteger)
// WritableComputedRef<number | null>

const page = useRouteState('page', parseAsInteger.default(1))
// WritableComputedRef<number>

const filters = useRouteState({
  q: parseAsString.default(''),
  page: parseAsInteger.default(1),
})
// filters.q    → WritableComputedRef<string>
// filters.page → WritableComputedRef<number>
```

The `InferParserType` utility type extracts the value type from any parser:

```ts
import type { InferParserType } from 'qpick'
import { parseAsInteger } from 'qpick'

type PageValue = InferParserType<typeof parseAsInteger>
// number | null
```

`InferParserMapType` extracts value types from an object of parsers:

```ts
import type { InferParserMapType } from 'qpick'
import { parseAsInteger, parseAsString } from 'qpick'

const parsers = {
  q: parseAsString.default(''),
  page: parseAsInteger.default(1),
}

type Filters = InferParserMapType<typeof parsers>
// { q: string; page: number }
```

## License

[MIT](./LICENSE)
