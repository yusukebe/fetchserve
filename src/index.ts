import { Command } from 'commander'
import { createAdaptorServer } from '@hono/node-server'
import { resolve } from 'node:path'

const program = new Command()

program.option('-p, --port <number>').argument('<string>')
program.parse()

const options = program.opts()
const filename = program.args[0]

type ServeOption = {
  port: number
}

const serveWithFilename = async (filename: string, options: ServeOption) => {
  const fullPath = resolve(process.cwd(), filename)
  const module = await import(fullPath)
  const app = module['default']
  const server = createAdaptorServer({
    fetch: app.fetch
  })
  server.listen(options.port, () => {
    console.log(`Listening on http://localhost:${options.port.toString()}`)
  })
}

serveWithFilename(filename, {
  port: !!options.port ? Number(options.port) : 3000
})
