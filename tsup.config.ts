import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/parser/parser.ts',
    'src/dom/index.ts',
    'src/traversal/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  noExternal: ['parse5'],
  treeshake: true,
  minify: false,
  target: 'node18',
  outDir: 'dist',
})
