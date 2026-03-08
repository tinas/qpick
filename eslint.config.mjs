import antfu from '@antfu/eslint-config'

export default antfu({
  pnpm: true,
  type: 'lib',
  rules: {
    '@typescript-eslint/consistent-type-definitions': 'off',
  },
})
