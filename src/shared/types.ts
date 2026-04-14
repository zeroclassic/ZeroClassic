// ─── RPC Config ────────────────────────────────────────────────────────────────

export interface RPCConfig {
  host: string
  port: number
  username: string
  password: string
}

export const DEFAULT_RPC_CONFIG: RPCConfig = {
  host: '127.0.0.1',
  port: 8545,
  username: 'zerc',
  password: '',
}

// ─── Wallet Data ────────────────────────────────────────────────────────────────

export interface WalletBalance {
  transparent: number
  private: number
  total: number
}

export interface ZercAddress {
  address: string
  type: 'transparent' | 'shielded'
  balance: number
  label?: string
}

export interface Transaction {
  txid: string
  amount: number
  fee?: number
  confirmations: number
  blocktime?: number
  address?: string
  fromAddress?: string | null
  toAddress?: string | null
  memo?: string
  type: 'send' | 'receive' | 'shielded'
  category: string
  isShielded?: boolean
}

export interface NodeInfo {
  version: string
  protocolversion: number
  blocks: number
  connections: number
  difficulty: number
  testnet: boolean
  syncing: boolean
  syncProgress?: number
}

// ─── IPC Channels ─────────────────────────────────────────────────────────────

export const IPC = {
  // Node
  GET_NODE_INFO:          'wallet:getNodeInfo',
  // Wallet
  GET_BALANCE:            'wallet:getBalance',
  GET_ADDRESSES:          'wallet:getAddresses',
  GET_TRANSACTIONS:       'wallet:getTransactions',
  NEW_ADDRESS:            'wallet:newAddress',
  SEND_TX:                'wallet:sendTransaction',
  // Keys & Backup
  DUMP_PRIVKEY:           'keys:dumpPrivkey',
  Z_EXPORT_KEY:           'keys:zExportKey',
  Z_EXPORT_VIEWING_KEY:   'keys:zExportViewingKey',
  IMPORT_PRIVKEY:         'keys:importPrivkey',
  Z_IMPORT_KEY:           'keys:zImportKey',
  Z_IMPORT_VIEWING_KEY:   'keys:zImportViewingKey',
  BACKUP_WALLET:          'keys:backupWallet',
  // Config
  GET_CONFIG:             'config:get',
  SET_CONFIG:             'config:set',
  // App
  OPEN_EXTERNAL:          'app:openExternal',
} as const

// ─── API Response types ────────────────────────────────────────────────────────

export interface RPCResponse<T = unknown> {
  result: T | null
  error: { code: number; message: string } | null
  id: string | number
}

export interface SendTxParams {
  fromAddress: string
  toAddress: string
  amount: number
  fee?: number
  memo?: string
}
