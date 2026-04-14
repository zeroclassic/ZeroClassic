import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { ZercAddress } from '@shared/types'

interface Props {
  addresses: ZercAddress[]
  onRefresh: () => Promise<void>
}

export function Receive({ addresses, onRefresh }: Props) {
  const [selected, setSelected] = useState<ZercAddress | null>(
    addresses.find(a => a.type === 'transparent') ?? addresses[0] ?? null
  )
  const [copied, setCopied]     = useState(false)
  const [creating, setCreating] = useState(false)
  const [newAddrType, setNewAddrType] = useState<'transparent' | 'shielded'>('transparent')

  const tAddrs = addresses.filter(a => a.type === 'transparent')
  const zAddrs = addresses.filter(a => a.type === 'shielded')

  function copyAddress() {
    if (!selected) return
    navigator.clipboard.writeText(selected.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function createAddress() {
    setCreating(true)
    try {
      await window.zerc.newAddress(newAddrType)
      await onRefresh()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }} className="animate-fadeIn">
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Receive ZERC</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
        Share your address to receive funds. Z-addresses offer full privacy via zk-SNARKs.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 820 }}>

        {/* Left: address selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AddrGroup label="Transparent (T-addr)" color="var(--accent-light)" addrs={tAddrs} selected={selected} onSelect={setSelected} />
          <AddrGroup label="Shielded (Z-addr)"    color="var(--violet)"       addrs={zAddrs} selected={selected} onSelect={setSelected} />

          {/* New address */}
          <div style={{
            padding: '14px 16px', background: 'var(--bg-surface)',
            borderRadius: 10, border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
              Generate new address
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <TypeToggle label="T-addr" active={newAddrType === 'transparent'} onClick={() => setNewAddrType('transparent')} color="var(--accent-light)" />
              <TypeToggle label="Z-addr" active={newAddrType === 'shielded'}    onClick={() => setNewAddrType('shielded')}    color="var(--violet)" />
              <button onClick={createAddress} disabled={creating} style={{
                flex: 1, padding: '8px 14px',
                background: 'rgba(107,79,216,0.1)',
                border: '1px solid var(--border)',
                borderRadius: 7, cursor: creating ? 'wait' : 'pointer',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 12,
              }}>
                {creating ? '⟳ Creating…' : '+ New'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: selected address detail */}
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: '24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              {/* QR Code — vrai rendu via qrcode.react */}
              <div style={{
                background: '#fff', padding: 12, borderRadius: 10,
                display: 'inline-flex',
              }}>
                <QRCodeSVG
                  value={selected.address}
                  size={160}
                  level="M"
                  marginSize={0}
                />
              </div>

              {/* Address display */}
              <div style={{
                width: '100%', background: 'var(--bg-base)',
                borderRadius: 8, padding: '10px 14px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, fontWeight: 600 }}>
                  {selected.type === 'shielded' ? 'Shielded address' : 'Transparent address'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: selected.type === 'shielded' ? 'var(--violet)' : 'var(--accent-light)',
                  wordBreak: 'break-all', lineHeight: 1.7,
                }} className="selectable">
                  {selected.address}
                </div>
              </div>

              {/* Copy button */}
              <button onClick={copyAddress} style={{
                width: '100%', padding: '10px',
                background: copied ? 'var(--green-glow)' : 'rgba(107,79,216,0.1)',
                border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer',
                color: copied ? 'var(--green)' : 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13,
                transition: 'all var(--t-med)',
              }}>
                {copied ? '✓ Copied!' : '⎘ Copy address'}
              </button>
            </div>

            {/* Balance */}
            <div style={{
              padding: '12px 16px', background: 'var(--bg-surface)',
              borderRadius: 10, border: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Address balance</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>
                {selected.balance.toFixed(8)}{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>ZERC</span>
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 13,
            background: 'var(--bg-surface)', borderRadius: 12,
            border: '1px dashed var(--border)',
          }}>
            Select an address
          </div>
        )}
      </div>
    </div>
  )
}

function AddrGroup({ label, color, addrs, selected, onSelect }: {
  label: string; color: string
  addrs: ZercAddress[]; selected: ZercAddress | null
  onSelect: (a: ZercAddress) => void
}) {
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label} ({addrs.length})
      </div>
      {addrs.length === 0 ? (
        <div style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)' }}>No addresses yet</div>
      ) : (
        addrs.map(addr => {
          const active = selected?.address === addr.address
          return (
            <button key={addr.address} onClick={() => onSelect(addr)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '9px 14px',
              background: active ? `${color}12` : 'transparent',
              border: 'none', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', textAlign: 'left',
              transition: 'background var(--t-fast)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: active ? color : 'var(--text-secondary)' }}>
                {addr.address.slice(0, 14)}…{addr.address.slice(-8)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {addr.balance.toFixed(4)}
              </span>
            </button>
          )
        })
      )}
    </div>
  )
}

function TypeToggle({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 12px',
      background: active ? `${color}18` : 'transparent',
      border: `1px solid ${active ? color + '50' : 'var(--border)'}`,
      borderRadius: 7, cursor: 'pointer',
      color: active ? color : 'var(--text-muted)',
      fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
      transition: 'all var(--t-fast)',
    }}>
      {label}
    </button>
  )
}
