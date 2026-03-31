import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { findAppName, findBenchPath, getInstalledAppSites } from './utils.js'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function frappeTypes(options = {}) {
  let hasRun = false
  let command = 'build'

  async function runOnce(onError, onInfo) {
    if (hasRun) {
      return
    }

    hasRun = true

    let runner
    try {
      runner = await resolveRunnerOptions(options)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      onError(`DocType interface generation failed: ${message}`)
      return
    }

    if (!runner) {
      return
    }

    try {
      const result = await runGeneration(runner)
      const summary = formatGenerationSummary(result.stdout)
      if (summary) {
        onInfo(summary)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      onError(`DocType interface generation failed: ${message}`)
    }
  }

  return {
    name: 'frappeui-types-plugin',
    configResolved(resolvedConfig) {
      command = resolvedConfig.command
    },
    async configureServer(server) {
      if (command !== 'serve') {
        return
      }

      await runOnce((message) => {
        server.config.logger.error(message)
        server.close()
      }, (message) => {
        server.config.logger.info(message)
      })
    },
    async buildStart() {
      if (command !== 'build') {
        return
      }

      await runOnce((message) => {
        this.error(message)
      }, (message) => {
        console.log(message)
      })
    },
  }
}

async function resolveRunnerOptions(options) {
  if (options.backend === 'frappe') {
    return resolveFrappeRunnerOptions(options)
  }

  return resolveNodeRunnerOptions(options)
}

function resolveNodeRunnerOptions(options) {
  if (!(options && options.input)) {
    return null
  }

  return {
    command: 'node',
    args: [path.join(__dirname, 'generateTypes.js'), JSON.stringify(options)],
  }
}

async function resolveFrappeRunnerOptions(options) {
  const appName = options.app || findAppName()
  if (!appName) {
    throw new Error(
      'Could not determine the app name for frappe-backed type generation.',
    )
  }

  const benchPath = options.cwd || findBenchPath()
  if (!benchPath) {
    throw new Error(
      'Could not find the bench root for frappe-backed type generation.',
    )
  }

  let site = options.site
  if (!site) {
    const sites = await getInstalledAppSites(appName)
    if (sites.length === 1) {
      site = sites[0]
    } else if (sites.length === 0) {
      throw new Error(
        `No site was provided and no installed sites were found for app ${appName}.`,
      )
    } else {
      throw new Error(
        `Multiple sites were found for app ${appName}. Set frappeTypes.site explicitly.`,
      )
    }
  }

  return {
    command: 'bench',
    args: [
      '--site',
      site,
      'execute',
      'frappe.types.ts_interface_generator.run_configured_generators',
      '--app_name',
      appName,
    ],
    cwd: benchPath,
  }
}

function runGeneration({ command, args, cwd }) {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    const childProcess = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    childProcess.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    childProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    childProcess.on('error', (error) => {
      reject(error)
    })

    childProcess.on('exit', (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      const signalText = signal ? ` (signal: ${signal})` : ''
      const details = [stderr.trim(), stdout.trim()].filter(Boolean).join('\n')
      const suffix = details ? `\n${details}` : ''
      reject(new Error(`${command} exited with code ${code}${signalText}${suffix}`))
    })
  })
}

function formatGenerationSummary(stdout) {
  const trimmed = stdout.trim()
  if (!trimmed) {
    return ''
  }

  let payload
  try {
    payload = JSON.parse(trimmed)
  } catch {
    return `[ts-interface-generator]\n  ${trimmed.split('\n').join('\n  ')}`
  }

  const results = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
      ? payload
      : [payload]

  if (!results.length) {
    return ''
  }

  const lines = ['[ts-interface-generator]']

  for (const [index, result] of results.entries()) {
    if (results.length > 1) {
      lines.push(`  result ${index + 1}:`)
    }

    const prefix = results.length > 1 ? '    ' : '  '
    if (result.app) {
      lines.push(`${prefix}app: ${result.app}`)
    }
    lines.push(`${prefix}output: ${result.output}`)
    lines.push(`${prefix}mode: ${result.mode}`)
    lines.push(`${prefix}doctypes: ${result.doctypes}`)
    lines.push(`${prefix}regenerated: ${result.regenerated}`)
    lines.push(`${prefix}reused: ${result.reused}`)
    if (result.definition_errors) {
      lines.push(`${prefix}definition errors: ${result.definition_errors}`)
    }
    if (Array.isArray(result.errored_doctypes) && result.errored_doctypes.length) {
      lines.push(`${prefix}error details: ${result.errored_doctypes.join('; ')}`)
    }
  }

  return lines.join('\n')
}
