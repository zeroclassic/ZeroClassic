import React, { useState, useMemo } from 'react'
import type { Transaction } from '@shared/types'

interface Props {
  transactions: Transaction[]
}

type Filter = 'all' | 'send' | 'receive'

const EXPLORER_URL = 'https://explorer.zeroclassic.org/tx/'

export function Transactions({ transactions }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filter !== 'all' && tx.type !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        return tx.txid.toLowerCase().includes(q)
          || (tx.address ?? '').toLowerCase().includes(q)
          || (tx.fromAddress ?? '').toLowerCase().includes(q)
          || (tx.toAddress ?? '').toLowerCase().includes(q)
      }
      return true
    })
  }, [transactions, filter, search])

  const totalSent     = transactions.filter(t => t.type === 'send').reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalReceived = transactions.filter(t => t.type === 'receive').reduce((s, t) => s + t.amount, 0)

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', height: '100%' }} className="animate-fadeIn">
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Transactions</h1>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        <SummaryChip label="Total received" value={`+${totalReceived.toFixed(4)} ZERC`} color="var(--green)" />
        <SummaryChip label="Total sent"     value={`−${totalSent.toFixed(4)} ZERC`}     color="var(--red)" />
        <SummaryChip label="Transactions"   value={String(transactions.length)}           color="var(--accent-light)" />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        {(['all', 'receive', 'send'] as Filter[]).map(f => (
          <FilterBtn key={f}
            label={f === 'all' ? 'All' : f === 'receive' ? '↓ Received' : '↑ Sent'}
            active={filter === f} onClick={() => setFilter(f)}
            color={f === 'receive' ? 'var(--green)' : f === 'send' ? 'var(--red)' : 'var(--accent-light)'}
          />
        ))}
        <input
          type="text" placeholder="Search txid, address…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto', padding: '7px 12px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 7, outline: 'none',
            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11, width: 220,
          }}
          className="selectable"
        />
      </div>

      {/* Rows */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {search ? 'No matching transactions' : 'No transactions yet'}
          </div>
        ) : (
          filtered.map((tx, i) => <TxRow key={tx.txid + i} tx={tx} />)
        )}
      </div>
    </div>
  )
}

// ─── TxRow ────────────────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: Transaction }) {
  const [expanded, setExpanded] = useState(false)
  const isSend  = tx.type === 'send'
  const color   = isSend ? 'var(--red)' : 'var(--green)'
  const sign    = isSend ? '−' : '+'
  const date    = tx.blocktime
    ? new Date(tx.blocktime * 1000).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—'
  const confirmColor = tx.confirmations === 0 ? 'var(--gold)'
    : tx.confirmations < 6 ? 'var(--accent-light)' : 'var(--green)'

  function openExplorer(e: React.MouseEvent) {
    e.stopPropagation()
    window.zerc.openExternal(EXPLORER_URL + tx.txid)
  }

  return (
    <>
      <div
        onClick={() => setExpanded(x => !x)}
        style={{
          padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          transition: 'border-color var(--t-fast)',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Type badge */}
            <span style={{
              padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
              background: isSend ? 'var(--red-glow)' : 'var(--green-glow)',
              color, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {isSend ? '↑ Send' : '↓ Recv'}
            </span>
            {/* Category badge */}
            {tx.category === 'generate' && (
              <span style={{
                padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                background: 'rgba(251,191,36,0.12)', color: 'var(--gold)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Mining
              </span>
            )}
            {tx.isShielded && (
              <span style={{
                padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                background: 'rgba(167,139,250,0.12)', color: 'var(--violet)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                🔒 Shielded
              </span>
            )}
          </div>
          {/* Amount + date */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color }}>
              {sign}{Math.abs(tx.amount).toFixed(8)} ZERC
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{date}</div>
          </div>
        </div>

        {/* From / To */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tx.fromAddress && (
            <AddrLine label="From" addr={tx.fromAddress} color="var(--text-muted)" />
          )}
          {tx.toAddress && (
            <AddrLine label="To" addr={tx.toAddress} color="var(--text-muted)" />
          )}
        </div>

        {/* TxID + explorer link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }} className="selectable">
            {tx.txid}
          </span>
          <button onClick={openExplorer} style={{
            background: 'rgba(107,79,216,0.1)', border: '1px solid rgba(107,79,216,0.3)',
            borderRadius: 5, cursor: 'pointer', padding: '3px 8px',
            color: 'var(--accent-light)', fontSize: 10, fontFamily: 'var(--font-ui)',
            fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            ↗ Explorer
          </button>
          <span style={{ fontSize: 10, color: confirmColor, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {tx.confirmations === 0 ? 'Pending' : `${tx.confirmations} conf`}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          margin: '-2px 4px 4px',
          padding: '12px 16px',
          background: 'var(--bg-elevated)',
          borderRadius: '0 0 10px 10px', border: '1px solid var(--border)',
          borderTop: 'none', fontSize: 11,
          display: 'flex', flexDirection: 'column', gap: 6,
        }} className="animate-fadeIn selectable">
          <DetailRow label="TxID"         value={tx.txid} />
          <DetailRow label="From"         value={tx.fromAddress ?? '—'} />
          <DetailRow label="To"           value={tx.toAddress ?? '—'} />
          {tx.fee !== undefined && <DetailRow label="Fee" value={`${tx.fee} ZERC`} />}
          {tx.memo && <DetailRow label="Memo" value={tx.memo} />}
          <DetailRow label="Confirmations" value={String(tx.confirmations)} />
          {tx.blocktime && <DetailRow label="Date" value={new Date(tx.blocktime * 1000).toLocaleString()} />}
        </div>
      )}
    </>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function AddrLine({ label, addr, color }: { label: string; addr: string; color: string }) {
  const isShieldedText = addr === 'Shielded address' || addr === 'Coinbase (mining reward)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 28, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontFamily: isShieldedText ? 'var(--font-ui)' : 'var(--font-mono)',
        color: isShieldedText ? 'var(--violet)' : color,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontStyle: isShieldedText ? 'italic' : 'normal',
        fontSize: isShieldedText ? 11 : 10,
      }} className="selectable">
        {addr}
      </span>
    </div>
  )
}

function SummaryChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px 16px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function FilterBtn({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px',
      background: active ? `${color}18` : 'transparent',
      border: `1px solid ${active ? color + '50' : 'var(--border)'}`,
      borderRadius: 7, cursor: 'pointer',
      color: active ? color : 'var(--text-secondary)',
      fontFamily: 'var(--font-ui)', fontWeight: active ? 600 : 400, fontSize: 12,
      transition: 'all var(--t-fast)',
    }}>
      {label}
    </button>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 90, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}
