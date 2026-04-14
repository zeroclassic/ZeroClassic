import fs from 'fs'
import path from 'path'
import os from 'os'
import type { RPCConfig } from '../shared/types'
import { DEFAULT_RPC_CONFIG } from '../shared/types'

interface AppConfig {
  rpc: RPCConfig
}

const CONFIG_DIR = path.join(os.homedir(), '.zerc-wallet')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

export class ConfigManager {
  static load(): AppConfig {
    try {
      if (!fs.existsSync(CONFIG_FILE)) {
        return ConfigManager.defaults()
      }
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppConfig>
      return {
        rpc: { ...DEFAULT_RPC_CONFIG, ...parsed.rpc },
      }
    } catch {
      return ConfigManager.defaults()
    }
  }

  static save(config: AppConfig): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  }

  static defaults(): AppConfig {
    return { rpc: { ...DEFAULT_RPC_CONFIG } }
  }

  // Auto-détection du fichier de config du node
  static detectNodeConfig(): Partial<RPCConfig> {
    const appData = process.env['APPDATA'] ?? ''
    const localAppData = process.env['LOCALAPPDATA'] ?? ''

    const locations = [
      // Windows — %APPDATA%\ZeroClassic\zero.conf (emplacement confirmé)
      path.join(appData, 'ZeroClassic', 'zero.conf'),
      path.join(appData, 'ZeroClassic', 'zero.conf'),
      path.join(localAppData, 'ZeroClassic', 'zero.conf'),
      // Linux / macOS
      path.join(os.homedir(), '.zeroclassic', 'zero.conf'),
      path.join(os.homedir(), '.zeroclassic', 'zero.conf'),
      path.join(os.homedir(), '.zero', 'zero.conf'),
    ]

    for (const loc of locations) {
      if (!loc || !fs.existsSync(loc)) continue
      try {
        const content = fs.readFileSync(loc, 'utf-8')
        const config: Partial<RPCConfig> = {}
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim()
          if (!line || line.startsWith('#')) continue
          const eqIdx = line.indexOf('=')
          if (eqIdx === -1) continue
          const key = line.slice(0, eqIdx).trim()
          const val = line.slice(eqIdx + 1).trim()
          if (key === 'rpcport')     config.port     = parseInt(val)
          if (key === 'rpcuser')     config.username = val
          if (key === 'rpcpassword') config.password = val
          if (key === 'rpcbind')     config.host     = val
        }
        console.log(`[Config] Auto-detected node config from: ${loc}`)
        return config
      } catch { /* ignore */ }
    }
    return {}
  }
}
