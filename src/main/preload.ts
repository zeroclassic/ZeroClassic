import { contextBridge, ipcRenderer } from 'electron'

const IPC = {
  GET_NODE_INFO:          'wallet:getNodeInfo',
  GET_BALANCE:            'wallet:getBalance',
  GET_ADDRESSES:          'wallet:getAddresses',
  GET_TRANSACTIONS:       'wallet:getTransactions',
  NEW_ADDRESS:            'wallet:newAddress',
  SEND_TX:                'wallet:sendTransaction',
  DUMP_PRIVKEY:           'keys:dumpPrivkey',
  Z_EXPORT_KEY:           'keys:zExportKey',
  Z_EXPORT_VIEWING_KEY:   'keys:zExportViewingKey',
  IMPORT_PRIVKEY:         'keys:importPrivkey',
  Z_IMPORT_KEY:           'keys:zImportKey',
  Z_IMPORT_VIEWING_KEY:   'keys:zImportViewingKey',
  BACKUP_WALLET:          'keys:backupWallet',
  GET_CONFIG:             'config:get',
  SET_CONFIG:             'config:set',
  OPEN_EXTERNAL:          'app:openExternal',
} as const

contextBridge.exposeInMainWorld('zerc', {
  // Node
  getNodeInfo:        () => ipcRenderer.invoke(IPC.GET_NODE_INFO),
  // Wallet
  getBalance:         () => ipcRenderer.invoke(IPC.GET_BALANCE),
  getAddresses:       () => ipcRenderer.invoke(IPC.GET_ADDRESSES),
  getTransactions:    () => ipcRenderer.invoke(IPC.GET_TRANSACTIONS),
  newAddress:         (type: 'transparent' | 'shielded') => ipcRenderer.invoke(IPC.NEW_ADDRESS, type),
  sendTransaction:    (params: unknown) => ipcRenderer.invoke(IPC.SEND_TX, params),
  // Keys & Backup
  dumpPrivkey:        (address: string) => ipcRenderer.invoke(IPC.DUMP_PRIVKEY, address),
  zExportKey:         (address: string) => ipcRenderer.invoke(IPC.Z_EXPORT_KEY, address),
  zExportViewingKey:  (address: string) => ipcRenderer.invoke(IPC.Z_EXPORT_VIEWING_KEY, address),
  importPrivkey:      (key: string, label: string, rescan: boolean) => ipcRenderer.invoke(IPC.IMPORT_PRIVKEY, key, label, rescan),
  zImportKey:         (key: string, rescan: string) => ipcRenderer.invoke(IPC.Z_IMPORT_KEY, key, rescan),
  zImportViewingKey:  (key: string, rescan: string) => ipcRenderer.invoke(IPC.Z_IMPORT_VIEWING_KEY, key, rescan),
  backupWallet:       (destination: string) => ipcRenderer.invoke(IPC.BACKUP_WALLET, destination),
  // Node log streaming
  onNodeLog:     (cb: (msg: string) => void) => ipcRenderer.on('node:log', (_, msg) => cb(msg)),
  onNodeStopped: (cb: (code: number) => void) => ipcRenderer.on('node:stopped', (_, code) => cb(code)),
  offNodeLog:    () => ipcRenderer.removeAllListeners('node:log'),

  // Node management
  getNodeStatus:  () => ipcRenderer.invoke('node:status'),
  startNode:      () => ipcRenderer.invoke('node:start'),
  stopNode:       () => ipcRenderer.invoke('node:stop'),
  setNodePath:    (p: string) => ipcRenderer.invoke('node:setPath', p),

  // Node capabilities
  getCapabilities: () => ipcRenderer.invoke('node:capabilities'),

  // Operation status
  getOperationStatus: (opid: string) => ipcRenderer.invoke('wallet:getOperationStatus', opid),

  // Tools
  shieldCoinbase:   (from: string, to: string, fee: number) => ipcRenderer.invoke('tools:shieldCoinbase', from, to, fee),
  mergeToAddress:   (fromAddrs: string[], to: string, fee: number, tLimit: number, zLimit: number) => ipcRenderer.invoke('tools:mergeToAddress', fromAddrs, to, fee, tLimit, zLimit),
  getWalletInfo:    () => ipcRenderer.invoke('tools:getWalletInfo'),

  // Config
  getConfig:          () => ipcRenderer.invoke(IPC.GET_CONFIG),
  setConfig:          (config: unknown) => ipcRenderer.invoke(IPC.SET_CONFIG, config),
  // Misc
  openExternal:       (url: string) => ipcRenderer.invoke(IPC.OPEN_EXTERNAL, url),
  // Window
  minimize:           () => ipcRenderer.send('window:minimize'),
  maximize:           () => ipcRenderer.send('window:maximize'),
  close:              () => ipcRenderer.send('window:close'),
})
