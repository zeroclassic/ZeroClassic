import { useState, useEffect, useCallback, useRef } from 'react'
import type { WalletBalance, ZercAddress, Transaction, NodeInfo } from '@shared/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'error'

export interface WalletState {
  status: ConnectionStatus
  errorMsg: string | null
  nodeInfo: NodeInfo | null
  balance: WalletBalance | null
  addresses: ZercAddress[]
  transactions: Transaction[]
  loading: boolean
  refresh: () => Promise<void>
}

const RPC_DELAY    = 500
const POLL_INTERVAL = 120_000 // 2 minutes

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export function useWallet(): WalletState {
  const [status, setStatus]             = useState<ConnectionStatus>('connecting')
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)
  const [nodeInfo, setNodeInfo]         = useState<NodeInfo | null>(null)
  const [balance, setBalance]           = useState<WalletBalance | null>(null)
  const [addresses, setAddresses]       = useState<ZercAddress[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const isRefreshing                    = useRef(false)
  const lastBlockCount                  = useRef<number>(0)

  const refresh = useCallback(async (force = false) => {
    if (isRefreshing.current) return
    isRefreshing.current = true
    try {
      // 1. Node info
      let currentBlocks = 0
      try {
        const info = await window.zerc.getNodeInfo()
        setNodeInfo(info)
        setStatus('connected')
        setErrorMsg(null)
        currentBlocks = info.blocks
      } catch (err: any) {
        setStatus('error')
        setErrorMsg(err.message ?? 'Cannot connect to node')
        setLoading(false)
        return
      }

      // Détecte si un nouveau bloc est arrivé
      const newBlock = currentBlocks > lastBlockCount.current
      if (!force && !newBlock && lastBlockCount.current > 0) {
        // Pas de nouveau bloc — pas besoin de rafraîchir les tx
        setLoading(false)
        return
      }
      lastBlockCount.current = currentBlocks

      await sleep(RPC_DELAY)

      // 2. Balance
      try {
        const bal = await window.zerc.getBalance()
        setBalance(bal)
      } catch { /* non bloquant */ }

      await sleep(RPC_DELAY)

      // 3. Addresses
      try {
        const addrs = await window.zerc.getAddresses()
        setAddresses(addrs)
      } catch { /* non bloquant */ }

      await sleep(RPC_DELAY)

      // 4. Transactions — seulement si nouveau bloc ou forçé
      try {
        const txs = await window.zerc.getTransactions()
        setTransactions([...txs])
      } catch (err: any) {
        console.warn('[Wallet] Transactions timeout:', err.message)
      }

    } finally {
      setLoading(false)
      isRefreshing.current = false
    }
  }, [])

  // Refresh forcé au démarrage
  useEffect(() => {
    refresh(true)
    const interval = setInterval(() => refresh(false), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [refresh])

  // Expose refresh forcé
  const forceRefresh = useCallback(() => refresh(true), [refresh])

  return { status, errorMsg, nodeInfo, balance, addresses, transactions, loading, refresh: forceRefresh }
}
