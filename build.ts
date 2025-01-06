import { build } from 'esbuild'

const b = () =>
  build({
    entryPoints: ['./src/index.ts'],
    banner: {
      js: '#!/usr/bin/env node',
    },
    platform: 'node',
    outfile: 'dist/cli.mjs',
    format: 'esm',
    target: 'node18',
    minify: false,
  })

Promise.all([b()])
