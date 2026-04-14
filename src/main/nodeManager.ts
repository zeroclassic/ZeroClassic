import { spawn, ChildProcess, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { EventEmitter } from 'events'

function getZerodPaths(): string[] {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'win32') {
    const appData = process.env['APPDATA'] ?? ''
    const localAppData = process.env['LOCALAPPDATA'] ?? ''
    const programFiles = process.env['PROGRAMFILES'] ?? 'C:\\Program Files'
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)'
    return [
      path.join(appData, 'ZeroClassic', 'zerod.exe'),
      path.join(localAppData, 'ZeroClassic', 'zerod.exe'),
      path.join(programFiles, 'ZeroClassic', 'zerod.exe'),
      path.join(programFilesX86, 'ZeroClassic', 'zerod.exe'),
      'C:\\ZeroClassic\\zerod.exe',
      'D:\\ZeroClassic\\zerod.exe',
      path.join(home, 'ZeroClassic', 'zerod.exe'),
    ]
  }

  if (platform === 'linux') {
    return [
      path.join(home, '.zeroclassic', 'zerod'),
      path.join(home, '.zeroclassic', 'src', 'zerod'),
      path.join(home, 'ZeroClassic', 'zerod'),
      path.join(home, 'ZeroClassic', 'src', 'zerod'),
      path.join(home, 'zerc', 'zerod'),
      '/usr/local/bin/zerod',
      '/usr/bin/zerod',
      path.join(home, '.local', 'bin', 'zerod'),
      '/opt/zeroclassic/zerod',
    ]
  }

  if (platform === 'darwin') {
    return [
      path.join(home, '.zeroclassic', 'zerod'),
      '/usr/local/bin/zerod',
      '/opt/homebrew/bin/zerod',
      path.join(home, 'ZeroClassic', 'zerod'),
    ]
  }

  return []
}

export function findZerod(): string | null {
  for (const p of getZerodPaths()) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function isZerodRunning(): boolean {
  try {
    if (process.platform === 'win32') {
      const out = execSync('tasklist /FI "IMAGENAME eq zerod.exe" /NH', { timeout: 3000 }).toString()
      return out.toLowerCase().includes('zerod.exe')
    } else {
      // pgrep -x matches exact process name only — avoids matching "grep zerod"
      // We use two separate calls: first exact match, then fallback
      try {
        const out = execSync('pgrep -x zerod', { timeout: 3000 }).toString()
        return out.trim().length > 0
      } catch {
        // pgrep returns exit code 1 if no process found — that's normal
        return false
      }
    }
  } catch {
    return false
  }
}

// Parse node log line into a clean user-friendly message
function parseNodeLog(line: string): string | null {
  if (!line.trim()) return null

  // Filter out noisy/irrelevant lines
  const ignore = ['keypool', 'tor:', 'Using BerkeleyDB', 'Loaded best chain']
  if (ignore.some(s => line.includes(s))) return null

  // Extract meaningful part after timestamp and log level
  // Format: "Apr 11 12:42:58.606  INFO main: message"
  const match = line.match(/\s+(INFO|WARN|ERROR)\s+\w+:\s+(.+)/)
  if (match) {
    const level = match[1]
    const msg = match[2].trim()

    // Map common messages to friendly versions
    if (msg.includes('UpdateTip')) {
      const heightMatch = msg.match(/height=(\d+)/)
      const progressMatch = msg.match(/progress=([\d.]+)/)
      if (heightMatch && progressMatch) {
        const pct = Math.round(parseFloat(progressMatch[1]) * 100)
        return `Syncing blockchain… block ${parseInt(heightMatch[1]).toLocaleString()} (${pct}%)`
      }
    }
    if (msg.includes('Verifying')) return `Verifying blockchain…`
    if (msg.includes('Loading block index')) return `Loading block index…`
    if (msg.includes('Loading wallet')) return `Loading wallet…`
    if (msg.includes('Rescanning')) return `Rescanning wallet…`
    if (msg.includes('Bound to')) return `Network ready`
    if (msg.includes('init message')) {
      const m = msg.match(/init message: (.+)/)
      if (m) return m[1]
    }
    if (level === 'ERROR') return `⚠ ${msg}`

    return msg.length < 80 ? msg : null
  }

  return null
}

export class NodeManager extends EventEmitter {
  private process: ChildProcess | null = null
  private zerodPath: string | null = null
  private started = false
  private logs: string[] = []

  constructor() {
    super()
    this.zerodPath = findZerod()
  }

  isAvailable(): boolean { return this.zerodPath !== null }
  getPath(): string | null { return this.zerodPath }
  setPath(p: string) { this.zerodPath = p }
  getLogs(): string[] { return this.logs.slice(-50) }

  isRunning(): boolean {
    if (this.process !== null && !this.process.killed) return true
    return isZerodRunning()
  }

  wasStartedByUs(): boolean {
    return this.started && this.process !== null && !this.process.killed
  }

  start(): { ok: boolean; error?: string } {
    if (isZerodRunning()) return { ok: true }
    if (!this.zerodPath) return { ok: false, error: 'zerod not found. Please set the path in Settings.' }
    if (!fs.existsSync(this.zerodPath)) return { ok: false, error: `zerod not found at: ${this.zerodPath}` }

    try {
      this.logs = []
      this.process = spawn(this.zerodPath, [], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'], // capture stdout + stderr
      })

      // Capture and parse stdout
      this.process.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n')
        for (const line of lines) {
          const msg = parseNodeLog(line)
          if (msg) {
            this.logs.push(msg)
            if (this.logs.length > 100) this.logs.shift()
            this.emit('log', msg)
          }
        }
      })

      // Capture stderr too (zerod logs to stderr on some builds)
      this.process.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n')
        for (const line of lines) {
          const msg = parseNodeLog(line)
          if (msg) {
            this.logs.push(msg)
            if (this.logs.length > 100) this.logs.shift()
            this.emit('log', msg)
          }
        }
      })

      this.process.on('error', (err) => {
        console.error('[NodeManager] Failed to start zerod:', err.message)
        this.emit('log', `Error: ${err.message}`)
        this.process = null
        this.started = false
      })

      this.process.on('exit', (code) => {
        console.log(`[NodeManager] zerod exited with code ${code}`)
        this.emit('stopped', code)
        this.process = null
        this.started = false
      })

      this.started = true
      this.emit('log', `Starting zerod from: ${this.zerodPath}`)
      console.log(`[NodeManager] Started zerod from: ${this.zerodPath}`)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  stop() {
    if (this.process && this.started) {
      this.process.kill()
      this.process = null
      this.started = false
      console.log('[NodeManager] Stopped zerod')
    }
  }
}

export const nodeManager = new NodeManager()
