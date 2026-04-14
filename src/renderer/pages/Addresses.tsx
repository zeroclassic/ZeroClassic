import React, { useState } from 'react'
import type { ZercAddress } from '@shared/types'

interface Props {
  addresses: ZercAddress[]
  onRefresh: () => Promise<void>
  onNavigate: (page: 'receive' | 'send') => void
}

export function Addresses({ addresses, onRefresh, onNavigate }: Props) {
  const [creating, setCreating] = useState(false)
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null)

  const tAddrs = addresses.filter(a => a.type === 'transparent')
  const zAddrs = addresses.filter(a => a.type === 'shielded')

  async function createAddress(type: 'transparent' | 'shielded') {
    setCreating(true)
    try {
      await window.zerc.newAddress(type)
      await onRefresh()
    } finally {
      setCreating(false)
    }
  }

  function copyAddr(addr: string) {
    navigator.clipboard.writeText(addr)
    setCopiedAddr(addr)
    setTimeout(() => setCopiedAddr(null), 1800)
  }

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }} className="animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Addresses</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {addresses.length} address{addresses.length !== 1 ? 'es' : ''} — {tAddrs.length} transparent · {zAddrs.length} shielded
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <NewBtn
            label="+ T-addr"
            color="var(--accent-light)"
            disabled={creating}
            onClick={() => createAddress('transparent')}
          />
          <NewBtn
            label="+ Z-addr"
            color="var(--violet)"
            disabled={creating}
            onClick={() => createAddress('shielded')}
          />
        </div>
      </div>

      {/* Transparent */}
      <AddrSection
        title="Transparent addresses"
        subtitle="Visible on the blockchain — faster but not private"
        color="var(--accent-light)"
        addrs={tAddrs}
        copiedAddr={copiedAddr}
        onCopy={copyAddr}
        onSend={() => onNavigate('send')}
        onReceive={() => onNavigate('receive')}
      />

      <div style={{ height: 24 }} />

      {/* Shielded */}
      <AddrSection
        title="Shielded addresses (Z-addr)"
        subtitle="Private transactions via zk-SNARKs — recommended"
        color="var(--violet)"
        addrs={zAddrs}
        copiedAddr={copiedAddr}
        onCopy={copyAddr}
        onSend={() => onNavigate('send')}
        onReceive={() => onNavigate('receive')}
      />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function NewBtn({ label, color, disabled, onClick }: {
  label: string; color: string; disabled: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        background: `${color}14`,
        border: `1px solid ${color}40`,
        borderRadius: 8, cursor: disabled ? 'wait' : 'pointer',
        color, fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 12,
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--t-fast)',
      }}
    >
      {label}
    </button>
  )
}

function AddrSection({ title, subtitle, color, addrs, copiedAddr, onCopy, onSend, onReceive }: {
  title: string; subtitle: string; color: string
  addrs: ZercAddress[]; copiedAddr: string | null
  onCopy: (a: string) => void; onSend: () => void; onReceive: () => void
}) {
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 2 }}>{title}</h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>

      {addrs.length === 0 ? (
        <div style={{
          padding: '24px', textAlign: 'center',
          background: 'var(--bg-surface)', borderRadius: 10,
          border: '1px dashed var(--border)',
          color: 'var(--text-muted)', fontSize: 12,
        }}>
          No {title.toLowerCase()} yet. Click "+ {color === 'var(--accent)' ? 'T' : 'Z'}-addr" to generate one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {addrs.map(addr => (
            <AddressRow
              key={addr.address}
              addr={addr}
              color={color}
              isCopied={copiedAddr === addr.address}
              onCopy={onCopy}
              onSend={onSend}
              onReceive={onReceive}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AddressRow({ addr, color, isCopied, onCopy, onSend, onReceive }: {
  addr: ZercAddress; color: string; isCopied: boolean
  onCopy: (a: string) => void; onSend: () => void; onReceive: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px',
        background: hovered ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        borderRadius: 10,
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
        transition: 'all var(--t-fast)',
      }}
    >
      {/* Color dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0,
        boxShadow: `0 0 6px ${color}`,
      }} />

      {/* Address */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} className="selectable">
          {addr.address}
        </div>
        {addr.label && (
          <div style={{ fontSize: 10, color: 'var(--accent-light)', marginTop: 2, fontStyle: 'italic' }}>
            {addr.label}
          </div>
        )}
      </div>

      {/* Balance */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
        color: addr.balance > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
        flexShrink: 0,
      }}>
        {addr.balance.toFixed(4)} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>ZERC</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, opacity: hovered ? 1 : 0, transition: 'opacity var(--t-fast)' }}>
        <IconBtn title="Copy" onClick={() => onCopy(addr.address)}>
          {isCopied ? '✓' : '⎘'}
        </IconBtn>
        <IconBtn title="Receive" onClick={onReceive}>↓</IconBtn>
        <IconBtn title="Send from" onClick={onSend}>↑</IconBtn>
      </div>
    </div>
  )
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 28, height: 28,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid var(--border)',
        borderRadius: 6, cursor: 'pointer',
        color: 'var(--text-secondary)', fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all var(--t-fast)',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'}
    >
      {children}
    </button>
  )
}
