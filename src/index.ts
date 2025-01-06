import { createAdaptorServer } from '@hono/node-server'
import arg from 'arg'
import * as esbuild from 'esbuild'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'

const argv = arg(
  {
    '--port': Number,
    '-p': '--port',
  },
  {
    argv: process.argv,
  },
)

const filename = argv['_'][2]
const port = argv['--port'] ?? 3000

type ServeOption = {
  port: number
}

const serveWithFilename = async (filename: string, options: ServeOption) => {
  const fullPath = resolve(process.cwd(), filename)
  const tempFile = join(tmpdir(), `fetchserve-${Date.now()}.mjs`)

  const esbuildOption: esbuild.BuildOptions = {
    entryPoints: [fullPath],
    outfile: tempFile,
    format: 'esm',
  }

  await esbuild.build(esbuildOption)

  const module = await import(tempFile)

  const ctx = await esbuild.context(esbuildOption)
  await ctx.watch()

  const app = module['default']
  const server = createAdaptorServer({
    fetch: app.fetch,
  })

  server.listen(options.port, () => {
    console.log(`Listening on http://localhost:${options.port}`)
  })
}

serveWithFilename(filename, {
  port,
})
