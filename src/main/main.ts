import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { nodeManager } from './nodeManager'
import path from 'path'
import { RpcClient } from './rpc'
import { ConfigManager } from './config'
import { IPC } from '../shared/types'
import type { RPCConfig, SendTxParams } from '../shared/types'

const isDev = process.env.NODE_ENV === 'development'
  || !require('fs').existsSync(require('path').join(__dirname, '..', 'renderer', 'index.html'))

let mainWindow: BrowserWindow | null = null
let rpc: RpcClient
let hasAddressIndex = false // détecté au démarrage

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 720, minWidth: 900, minHeight: 600,
    frame: false, titleBarStyle: 'hidden',
    backgroundColor: '#0d0b14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../resources/icon.png'),
  })
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  let config = ConfigManager.load()
  const configPath = path.join(require('os').homedir(), '.zerc-wallet', 'config.json')
  if (!require('fs').existsSync(configPath)) {
    const detected = ConfigManager.detectNodeConfig()
    if (Object.keys(detected).length > 0) {
      config = { rpc: { ...config.rpc, ...detected } }
      ConfigManager.save(config)
    }
  }
  rpc = new RpcClient(config.rpc)

  // Auto-start zerod if not already running
  const isReachable = await rpc.isReachable()
  if (!isReachable) {
    if (nodeManager.isAvailable()) {
      console.log('[Main] Node unreachable — attempting to start zerod automatically')
      const result = nodeManager.start()
      if (result.ok) {
        // Wait up to 30s for the node to be ready
        console.log('[Main] zerod started, waiting for RPC...')
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000))
          if (await rpc.isReachable()) {
            console.log('[Main] Node is ready!')
            break
          }
        }
      } else {
        console.warn('[Main] Could not start zerod:', result.error)
      }
    } else {
      console.log('[Main] zerod not found — user must start it manually')
    }
  } else {
    console.log('[Main] Node already running')
  }

  // Détecte si addressindex est activé sur ce node
  try {
    // Prend une adresse depuis listaddressgroupings (plus fiable)
    const groups: any[][] = await rpc.call('listaddressgroupings').catch(() => [])
    const testAddr = groups.flat()?.[0]?.[0] ?? null
    if (testAddr) {
      await rpc.call('getaddressbalance', [{ addresses: [testAddr] }])
      hasAddressIndex = true
      console.log('[Main] addressindex detected — using fast indexed queries')
    }
  } catch {
    hasAddressIndex = false
    console.log('[Main] addressindex not available — using listtransactions')
  }

  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  // Stop zerod only if we started it
  if (nodeManager.wasStartedByUs()) {
    nodeManager.stop()
  }
  if (process.platform !== 'darwin') app.quit()
})

// ─── Node log streaming ──────────────────────────────────────────────────────
nodeManager.on('log', (msg: string) => {
  mainWindow?.webContents.send('node:log', msg)
})
nodeManager.on('stopped', (code: number) => {
  mainWindow?.webContents.send('node:stopped', code)
})

// ─── Node management ─────────────────────────────────────────────────────────
ipcMain.handle('node:status', () => ({
  available: nodeManager.isAvailable(),
  running: nodeManager.isRunning(),
  startedByUs: nodeManager.wasStartedByUs(),
  path: nodeManager.getPath(),
  platform: process.platform,
  placeholder: process.platform === 'win32'
    ? 'e.g. C:\\ZeroClassic\\zerod.exe'
    : 'e.g. /usr/local/bin/zerod',
  logs: nodeManager.getLogs(),
}))

ipcMain.handle('node:start', async () => {
  const result = nodeManager.start()
  if (result.ok) {
    // Wait up to 30s
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000))
      if (await rpc.isReachable()) return { ok: true }
    }
    return { ok: false, error: 'Node started but RPC not responding after 30s' }
  }
  return result
})

ipcMain.handle('node:stop', () => {
  nodeManager.stop()
  return { ok: true }
})

ipcMain.handle('node:setPath', (_, p: string) => {
  nodeManager.setPath(p)
  return { ok: true }
})

// ─── Node info ────────────────────────────────────────────────────────────────
ipcMain.handle(IPC.GET_NODE_INFO, async () => {
  try {
    const [info, blockchainInfo] = await Promise.all([
      rpc.call('getinfo'),
      rpc.call('getblockchaininfo').catch(() => null),
    ])
    return {
      version: info.build ?? `v${Math.floor(info.version/1000000)}.${Math.floor((info.version%1000000)/10000)}.${Math.floor((info.version%10000)/100)}`,
      protocolversion: info.protocolversion,
      blocks: info.blocks,
      connections: info.connections,
      difficulty: info.difficulty,
      testnet: info.testnet ?? false,
      syncing: blockchainInfo ? (blockchainInfo.headers - blockchainInfo.blocks) > 10 : false,
      syncProgress: blockchainInfo?.verificationprogress,
    }
  } catch (err: any) {
    throw new Error(`Cannot connect to ZERC node: ${err.message}`)
  }
})

// ─── Balance ──────────────────────────────────────────────────────────────────
ipcMain.handle(IPC.GET_BALANCE, async () => {
  const transparent = await rpc.call<number>('getbalance')
  const zTotal = await rpc.call<{ transparent: string; private: string; total: string }>('z_gettotalbalance').catch(() => null)
  const private_bal = zTotal ? parseFloat(zTotal.private) : 0
  return { transparent, private: private_bal, total: transparent + private_bal }
})

// ─── Addresses ────────────────────────────────────────────────────────────────
ipcMain.handle(IPC.GET_ADDRESSES, async () => {
  const groups: any[][] = await rpc.call('listaddressgroupings').catch(() => [])
  const tAddressMap = new Map<string, { balance: number; label: string }>()
  for (const group of groups) {
    for (const entry of group) {
      const addr: string = entry[0]
      const balance: number = entry[1] ?? 0
      const label: string = entry[2] ?? ''
      if (!tAddressMap.has(addr) || balance > (tAddressMap.get(addr)?.balance ?? 0)) {
        tAddressMap.set(addr, { balance, label })
      }
    }
  }
  const allTAddrs: string[] = await rpc.call('getaddressesbyaccount', ['']).catch(() => [])
  for (const addr of allTAddrs) {
    if (!tAddressMap.has(addr)) tAddressMap.set(addr, { balance: 0, label: '' })
  }
  const tBalances = Array.from(tAddressMap.entries()).map(([address, { balance, label }]) => ({
    address, type: 'transparent' as const, balance, label,
  }))
  const zAddrs: string[] = await rpc.call('z_listaddresses').catch(() => [])
  const zBalances = await Promise.all(
    zAddrs.map(async addr => {
      const balance = await rpc.call<number>('z_getbalance', [addr]).catch(() => 0)
      return { address: addr, type: 'shielded' as const, balance, label: '' }
    })
  )
  return [...tBalances, ...zBalances]
})

// ─── Transactions ─────────────────────────────────────────────────────────────

async function getWalletAddresses(): Promise<Set<string>> {
  const [tAddrs, zAddrs] = await Promise.all([
    rpc.call('getaddressesbyaccount', ['']).catch(() => [] as string[]),
    rpc.call('z_listaddresses').catch(() => [] as string[]),
  ])
  return new Set([...tAddrs, ...zAddrs])
}

async function resolveFromAddress(txid: string, vout: number): Promise<string | null> {
  try {
    const prevTx = await rpc.call('getrawtransaction', [txid, 1])
    return prevTx?.vout?.[vout]?.scriptPubKey?.addresses?.[0] ?? null
  } catch { return null }
}

ipcMain.handle(IPC.GET_TRANSACTIONS, async () => {
  const allTxs: any[] = []
  const walletAddrs = await getWalletAddresses()

  if (hasAddressIndex) {
    // ── Mode rapide : addressindex disponible ────────────────────────────────
    // Récupère les txids des 100 dernières tx via getaddresstxids par adresse
    try {
      const info = await rpc.call('getinfo')
      const startBlock = Math.max(0, info.blocks - 2000)
      const tAddrs = Array.from(walletAddrs).filter(a => !a.startsWith('z'))

      if (tAddrs.length > 0) {
        const txids: string[] = await rpc.call('getaddresstxids', [{
          addresses: tAddrs,
          start: startBlock,
          end: info.blocks,
        }]).catch(() => [])

        const seen = new Set<string>()
        // Prend les 100 derniers txids
        for (const txid of txids.slice(-100).reverse()) {
          if (seen.has(txid)) continue
          seen.add(txid)
          try {
            const tx = await rpc.call('gettransaction', [txid])
            for (const d of (tx.details ?? [])) {
              allTxs.push({
                txid: tx.txid, amount: d.amount, fee: tx.fee,
                confirmations: tx.confirmations,
                blocktime: tx.blocktime ?? tx.time,
                address: d.address, fromAddress: null, toAddress: null,
                memo: undefined, type: d.amount < 0 ? 'send' : 'receive',
                category: d.category, isShielded: (d.address ?? '').startsWith('z'),
              })
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      console.warn('[TX] addressindex query failed:', e.message)
    }
  } else {
    // ── Mode standard : listtransactions ────────────────────────────────────
    try {
      // Récupère 500 entrées et trie par blocktime pour avoir les vraiment récentes
      const txList = await rpc.call('listtransactions', ['*', 500, 0], true)
      const sorted = (txList ?? []).sort((a: any, b: any) =>
        (b.blocktime ?? b.time ?? 0) - (a.blocktime ?? a.time ?? 0)
      )
      const seen = new Set<string>()
      for (const tx of sorted) {
        const key = tx.txid + (tx.address ?? '') + tx.category
        if (seen.has(key)) continue
        seen.add(key)
        allTxs.push({
          txid: tx.txid, amount: tx.amount, fee: tx.fee,
          confirmations: tx.confirmations, blocktime: tx.blocktime ?? tx.time,
          address: tx.address, fromAddress: null, toAddress: null,
          memo: tx.memo, type: tx.amount < 0 ? 'send' : 'receive',
          category: tx.category, isShielded: (tx.address ?? '').startsWith('z'),
        })
        if (allTxs.length >= 100) break // Limite à 100 après tri
      }
    } catch (e: any) {
      console.warn('[TX] listtransactions failed:', e.message)
      // Fallback : listsinceblock
      try {
        const info = await rpc.call('getinfo')
        const recentHeight = Math.max(0, info.blocks - 1000)
        const blockHash = await rpc.call('getblockhash', [recentHeight])
        const result = await rpc.call('listsinceblock', [blockHash, 1], true)
        const seen = new Set<string>()
        for (const tx of (result.transactions ?? [])) {
          const key = tx.txid + (tx.address ?? '') + tx.category
          if (seen.has(key)) continue
          seen.add(key)
          allTxs.push({
            txid: tx.txid, amount: tx.amount, fee: tx.fee,
            confirmations: tx.confirmations, blocktime: tx.blocktime ?? tx.time,
            address: tx.address, fromAddress: null, toAddress: null,
            memo: tx.memo, type: tx.amount < 0 ? 'send' : 'receive',
            category: tx.category, isShielded: (tx.address ?? '').startsWith('z'),
          })
        }
      } catch { /* ignore */ }
    }
  }

  // Z-addresses via z_listreceivedbyaddress
  try {
    const zAddrs: string[] = await rpc.call('z_listaddresses').catch(() => [])
    for (const zaddr of zAddrs) {
      try {
        const zReceived = await rpc.call('z_listreceivedbyaddress', [zaddr, 0], true)
        for (const r of (zReceived ?? []).slice(-20)) {
          // Evite les doublons avec listtransactions
          if (allTxs.some(t => t.txid === r.txid && t.address === zaddr)) continue
          allTxs.push({
            txid: r.txid, amount: r.amount, fee: undefined,
            confirmations: 1, blocktime: undefined,
            address: zaddr, fromAddress: null, toAddress: null,
            memo: r.memo, type: 'receive', category: 'receive', isShielded: true,
          })
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  // Déduplique et trie
  const seen2 = new Set<string>()
  const deduped = allTxs
    .filter(tx => {
      const key = tx.txid + (tx.address ?? '') + tx.type
      if (seen2.has(key)) return false
      seen2.add(key)
      return true
    })
    .sort((a, b) => (b.blocktime ?? 0) - (a.blocktime ?? 0))
    .slice(0, 100)

  // Résout from/to
  for (const tx of deduped) {
    if (tx.isShielded) {
      tx.fromAddress = tx.type === 'receive' ? 'Shielded address' : tx.address
      tx.toAddress   = tx.type === 'receive' ? tx.address : 'Shielded address'
      continue
    }
    if (tx.category === 'generate') {
      tx.fromAddress = 'Coinbase (mining reward)'
      tx.toAddress   = tx.address
      continue
    }
    try {
      const raw = await rpc.call('getrawtransaction', [tx.txid, 1]).catch(() => null)
      if (!raw) { tx.fromAddress = '—'; tx.toAddress = tx.address; continue }
      if (tx.type === 'receive') {
        const vin = raw.vin?.[0]
        tx.fromAddress = vin?.txid ? await resolveFromAddress(vin.txid, vin.vout) : '—'
        tx.toAddress   = tx.address
      } else {
        tx.fromAddress = tx.address
        const ext = raw.vout?.filter((v: any) => {
          const a = v.scriptPubKey?.addresses?.[0]
          return a && !walletAddrs.has(a)
        }) ?? []
        tx.toAddress = ext.length > 0 ? ext[0].scriptPubKey.addresses[0] : tx.address
      }
    } catch { tx.fromAddress = '—'; tx.toAddress = tx.address }
  }

  return deduped
})

// ─── New address ──────────────────────────────────────────────────────────────
ipcMain.handle(IPC.NEW_ADDRESS, async (_, type: 'transparent' | 'shielded') => {
  if (type === 'shielded') return rpc.call('z_getnewaddress')
  return rpc.call('getnewaddress')
})

// ─── Send transaction ─────────────────────────────────────────────────────────
ipcMain.handle(IPC.SEND_TX, async (_, params: SendTxParams) => {
  const { fromAddress, toAddress, memo } = params
  const amount = typeof params.amount === 'string'
    ? parseFloat((params.amount as string).replace(',', '.'))
    : params.amount
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount')
  const isShielded = fromAddress.startsWith('z') || toAddress.startsWith('z')
  try {
    const recipients: any[] = [{ address: toAddress, amount }]
    if (memo) recipients[0].memo = memo
    const opid = await rpc.call('z_sendmany', [fromAddress, recipients, 1])
    return { opid, type: isShielded ? 'shielded' : 'transparent' }
  } catch (err: any) {
    const msg = err?.message ?? 'Transaction failed'
    const rpcMatch = msg.match(/RPC Error \[-?\d+\]: (.+)/)
    throw new Error(rpcMatch ? rpcMatch[1] : msg)
  }
})

// ─── Operation status ─────────────────────────────────────────────────────────
ipcMain.handle('wallet:getOperationStatus', async (_, opid: string) => {
  const results = await rpc.call('z_getoperationresult', [[opid]]).catch(() => [])
  if (results?.length > 0) return results[0]
  const status = await rpc.call('z_getoperationstatus', [[opid]]).catch(() => [])
  if (status?.length > 0) return status[0]
  return null
})

// ─── Tools ────────────────────────────────────────────────────────────────────
ipcMain.handle('tools:shieldCoinbase', async (_, fromAddress: string, toAddress: string, fee: number, limit: number) => {
  return rpc.call('z_shieldcoinbase', [fromAddress, toAddress, fee, limit ?? 0])
})

ipcMain.handle('tools:mergeToAddress', async (_, fromAddresses: string[], toAddress: string, fee: number, tLimit: number, zLimit: number) => {
  return rpc.call('z_mergetoaddress', [fromAddresses, toAddress, fee, tLimit, zLimit], true)
})

ipcMain.handle('tools:getWalletInfo', async () => {
  const info = await rpc.call('getwalletinfo')
  const [utxos, notes] = await Promise.all([
    rpc.call('listunspent', [0, 9999999]).then((u: any[]) => u.length).catch(() => 0),
    rpc.call('z_listunspent', [0]).then((u: any[]) => u.length).catch(() => 0),
  ])
  return { ...info, utxoCount: utxos, noteCount: notes }
})

// ─── Keys & Backup ────────────────────────────────────────────────────────────
ipcMain.handle(IPC.DUMP_PRIVKEY,         async (_, address: string) => rpc.call('dumpprivkey', [address]))
ipcMain.handle(IPC.Z_EXPORT_KEY,         async (_, address: string) => rpc.call('z_exportkey', [address]))
ipcMain.handle(IPC.Z_EXPORT_VIEWING_KEY, async (_, address: string) => rpc.call('z_exportviewingkey', [address]))
ipcMain.handle(IPC.IMPORT_PRIVKEY,       async (_, key: string, label: string, rescan: boolean) => {
  await rpc.call('importprivkey', [key, label, rescan], rescan)
  return { ok: true }
})
ipcMain.handle(IPC.Z_IMPORT_KEY,         async (_, key: string, rescan: string) => {
  await rpc.call('z_importkey', [key, rescan], rescan === 'yes')
  return { ok: true }
})
ipcMain.handle(IPC.Z_IMPORT_VIEWING_KEY, async (_, key: string, rescan: string) => {
  await rpc.call('z_importviewingkey', [key, rescan], rescan === 'yes')
  return { ok: true }
})
ipcMain.handle(IPC.BACKUP_WALLET, async (_, destination: string) => {
  await rpc.call('backupwallet', [destination])
  return { ok: true }
})

// Node capabilities
ipcMain.handle('node:capabilities', () => ({
  addressIndex: hasAddressIndex,
}))

// ─── Config ───────────────────────────────────────────────────────────────────
ipcMain.handle(IPC.GET_CONFIG, () => ConfigManager.load())
ipcMain.handle(IPC.SET_CONFIG, (_, config: { rpc: RPCConfig }) => {
  ConfigManager.save(config)
  rpc = new RpcClient(config.rpc)
  return { ok: true }
})
ipcMain.handle(IPC.OPEN_EXTERNAL, (_, url: string) => shell.openExternal(url))

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.on('window:close', () => mainWindow?.close())
