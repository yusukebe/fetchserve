import { createAdaptorServer } from '@hono/node-server'
import arg from 'arg'
import * as esbuild from 'esbuild'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'

// Parse CLI arguments
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
  const tempDir = fs.mkdtempSync(join(tmpdir(), 'fetchserve-')) // Create a temporary directory
  const tempFile = join(tempDir, 'app.mjs')

  const esbuildOption: esbuild.BuildOptions = {
    entryPoints: [fullPath],
    outfile: tempFile,
    format: 'esm',
    bundle: true,
    metafile: true, // Generate metafile for dependency analysis
  }

  // Build the file
  const result = await esbuild.build(esbuildOption)

  // Extract dependencies from the metafile
  const dependencies = getDependenciesFromMetafile(result.metafile)
  if (dependencies.length > 0) {
    console.log('Installing dependencies:', dependencies)
    installDependencies(tempDir, dependencies) // Install dependencies in the temporary directory
  }

  // Dynamically import the built file
  const module = await import(`file://${tempFile}`)

  const app = module['default']
  const server = createAdaptorServer({
    fetch: app.fetch,
  })

  server.listen(options.port, () => {
    console.log(`Listening on http://localhost:${options.port}`)
  })
}

// Extract dependencies from the metafile
const getDependenciesFromMetafile = (
  metafile: esbuild.Metafile | undefined,
): string[] => {
  if (!metafile) {
    return []
  }

  const dependencies = Object.keys(metafile.inputs)
    .filter((input) => input.includes('node_modules/')) // Filter for node_modules dependencies
    .map((input) => input.split('node_modules/')[1].split('/')[0]) // Get package names

  return Array.from(new Set(dependencies)) // Remove duplicates
}

// Install dependencies in the temporary directory
const installDependencies = (tempDir: string, dependencies: string[]) => {
  try {
    // Create a minimal package.json
    const packageJsonPath = join(tempDir, 'package.json')
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify({ dependencies: {} }, null, 2),
    )

    // Run npm install with --prefix for temporary installation
    execSync(`npm install ${dependencies.join(' ')} --prefix ${tempDir}`, {
      stdio: 'inherit',
    })
  } catch (error) {
    console.error('Failed to install dependencies:', error)
  }
}

// Start the server
serveWithFilename(filename, {
  port,
})
