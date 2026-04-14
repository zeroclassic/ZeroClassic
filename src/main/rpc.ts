import axios, { AxiosInstance } from 'axios'
import type { RPCConfig, RPCResponse } from '../shared/types'

// Timeouts par type d'appel
const TIMEOUT_FAST = 60_000   // getinfo, getbalance, getaddresses
const TIMEOUT_SLOW = 1_800_000 // rescan/import (peut prendre 10-30min sur gros node)

export class RpcClient {
  private client: AxiosInstance
  private slowClient: AxiosInstance
  private config: RPCConfig
  private requestId = 0

  constructor(config: RPCConfig) {
    this.config = config
    this.client     = this.buildClient(config, TIMEOUT_FAST)
    this.slowClient = this.buildClient(config, TIMEOUT_SLOW)
  }

  private buildClient(config: RPCConfig, timeout: number): AxiosInstance {
    return axios.create({
      baseURL: `http://${config.host}:${config.port}`,
      auth: config.username
        ? { username: config.username, password: config.password }
        : undefined,
      headers: { 'Content-Type': 'application/json' },
      timeout,
    })
  }

  updateConfig(config: RPCConfig) {
    this.config     = config
    this.client     = this.buildClient(config, TIMEOUT_FAST)
    this.slowClient = this.buildClient(config, TIMEOUT_SLOW)
  }

  async call<T = any>(method: string, params: unknown[] = [], slow = false): Promise<T> {
    const id     = ++this.requestId
    const client = slow ? this.slowClient : this.client
    try {
      const response = await client.post<RPCResponse<T>>('/', {
        jsonrpc: '1.0',
        id,
        method,
        params,
      })

      const data = response.data
      if (data.error) {
        throw new Error(`RPC Error [${data.error.code}]: ${data.error.message}`)
      }
      if (data.result === null && data.error === null) {
        return null as T
      }
      return data.result as T
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        throw new Error(
          `Cannot connect to ZERC node at ${this.config.host}:${this.config.port}. ` +
          `Make sure zerod is running.`
        )
      }
      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
        throw new Error(`RPC timeout on '${method}'. The node may be busy or syncing.`)
      }
      throw err
    }
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.call('getinfo')
      return true
    } catch {
      return false
    }
  }
}
