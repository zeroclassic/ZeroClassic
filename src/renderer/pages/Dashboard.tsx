import React from 'react'
import type { WalletBalance, Transaction, NodeInfo } from '@shared/types'

interface Props {
  balance: WalletBalance | null
  transactions: Transaction[]
  nodeInfo: NodeInfo | null
  onNavigate: (p: 'send' | 'receive' | 'transactions') => void
}

export function Dashboard({ balance, transactions, nodeInfo, onNavigate }: Props) {
  const recentTxs = transactions.slice(0, 10)
  const fmt = (n: number) => n.toFixed(8)

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }}>

      {/* Balance hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-elevated) 0%, rgba(68,49,141,0.15) 100%)',
        border: '1px solid rgba(100,70,180,0.35)',
        borderRadius: 16,
        padding: '32px 36px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 180, height: 180,
          background: 'radial-gradient(circle, rgba(107,79,216,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
          Total Balance
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 38,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: 6,
        }}>
          {balance ? fmt(balance.total) : '—'}
          <span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400 }}>ZERC</span>
        </div>

        {/* Split transparent / shielded */}
        {balance && (
          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            <BalancePill label="Transparent" value={fmt(balance.transparent)} color="var(--accent-light)" />
            <BalancePill label="Shielded (z)" value={fmt(balance.private)} color="var(--violet)" />
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <ActionBtn label="↑ Send" accent="var(--accent-light)" onClick={() => onNavigate('send')} />
          <ActionBtn label="↓ Receive" accent="var(--violet)" onClick={() => onNavigate('receive')} />
        </div>
      </div>

      {/* Stats row */}
      {nodeInfo && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Block Height" value={nodeInfo.blocks.toLocaleString()} icon="⛏" />
          <StatCard label="Connections" value={String(nodeInfo.connections)} icon="⬡" />
          <StatCard
            label={nodeInfo.syncing ? 'Syncing…' : 'Fully Synced'}
            value={nodeInfo.syncing ? `${Math.round((nodeInfo.syncProgress ?? 0) * 100)}%` : '✓'}
            icon="⟳"
            accent={nodeInfo.syncing ? 'var(--gold)' : 'var(--green)'}
          />
        </div>
      )}

      {/* Recent transactions */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 12,
        }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Recent Activity
          </h2>
          <button
            onClick={() => onNavigate('transactions')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--accent-light)',
              fontFamily: 'var(--font-ui)', padding: '2px 6px',
            }}
          >
            View all →
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 13,
            background: 'var(--bg-surface)',
            borderRadius: 10, border: '1px solid var(--border)',
          }}>
            No transactions yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentTxs.map(tx => (
              <TxRow key={tx.txid} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BalancePill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '8px 14px',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: 8,
      border: `1px solid ${color}40`,
    }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color }}>{value} ZERC</span>
    </div>
  )
}

function ActionBtn({ label, accent, onClick }: { label: string; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 22px',
        background: `${accent}18`,
        border: `1px solid ${accent}40`,
        borderRadius: 8, cursor: 'pointer',
        color: accent,
        fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13,
        letterSpacing: '0.04em',
        transition: 'all var(--t-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = `${accent}30`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = `${accent}18`
      }}
    >
      {label}
    </button>
  )
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: string }) {
  return (
    <div style={{
      padding: '16px 18px',
      background: 'var(--bg-surface)',
      borderRadius: 10,
      border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 20, color: accent ?? 'var(--text-muted)' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: accent ?? 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  )
}

const EXPLORER_URL = 'https://explorer.zeroclassic.org/tx/'

function TxRow({ tx }: { tx: Transaction }) {
  const isSend = tx.type === 'send'
  const color   = isSend ? 'var(--red)' : 'var(--green)'
  const sign    = isSend ? '−' : '+'
  const date    = tx.blocktime ? new Date(tx.blocktime * 1000).toLocaleDateString('en-GB') : 'Pending'

  function openExplorer(e: React.MouseEvent) {
    e.stopPropagation()
    window.zerc.openExternal(EXPLORER_URL + tx.txid)
  }

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--bg-surface)',
      borderRadius: 10, border: '1px solid var(--border)',
      transition: 'border-color var(--t-fast)',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: isSend ? 'var(--red-glow)' : 'var(--green-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color, flexShrink: 0,
          }}>
            {isSend ? '↑' : '↓'}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>
              {isSend ? 'Sent' : 'Received'}
              {tx.category === 'generate' && <span style={{ color: 'var(--gold)', marginLeft: 6, fontSize: 9 }}>⛏ Mining</span>}
              {tx.isShielded && <span style={{ color: 'var(--violet)', marginLeft: 6, fontSize: 9 }}>🔒 Shielded</span>}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{date}</div>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color, fontWeight: 700 }}>
          {sign}{Math.abs(tx.amount).toFixed(4)} ZERC
        </div>
      </div>
      {/* From / To */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
        {tx.fromAddress && (
          <div style={{ fontSize: 10, display: 'flex', gap: 4 }}>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>From</span>
            <span style={{
              fontFamily: tx.fromAddress.includes(' ') ? 'var(--font-ui)' : 'var(--font-mono)',
              color: tx.fromAddress.includes(' ') ? 'var(--violet)' : 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontStyle: tx.fromAddress.includes(' ') ? 'italic' : 'normal',
            }} className="selectable">{tx.fromAddress}</span>
          </div>
        )}
        {tx.toAddress && (
          <div style={{ fontSize: 10, display: 'flex', gap: 4 }}>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>To</span>
            <span style={{
              fontFamily: tx.toAddress.includes(' ') ? 'var(--font-ui)' : 'var(--font-mono)',
              color: tx.toAddress.includes(' ') ? 'var(--violet)' : 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontStyle: tx.toAddress.includes(' ') ? 'italic' : 'normal',
            }} className="selectable">{tx.toAddress}</span>
          </div>
        )}
      </div>
      {/* TxID + Explorer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }} className="selectable">{tx.txid}</span>
        <button onClick={openExplorer} style={{
          background: 'rgba(107,79,216,0.1)', border: '1px solid rgba(107,79,216,0.3)',
          borderRadius: 4, cursor: 'pointer', padding: '2px 6px',
          color: 'var(--accent-light)', fontSize: 9, fontFamily: 'var(--font-ui)', fontWeight: 600, flexShrink: 0,
        }}>↗ Explorer</button>
      </div>
    </div>
  )
}
