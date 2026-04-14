import React from 'react'
import type { NodeInfo } from '@shared/types'
import logo from '../assets/logo.png'

export type Page = 'dashboard' | 'send' | 'receive' | 'transactions' | 'addresses' | 'keys' | 'tools' | 'settings'

interface Props {
  current: Page
  onNavigate: (p: Page) => void
  nodeInfo: NodeInfo | null
}

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '◈' },
  { id: 'send',         label: 'Send',          icon: '↑' },
  { id: 'receive',      label: 'Receive',       icon: '↓' },
  { id: 'transactions', label: 'Transactions',  icon: '≡' },
  { id: 'addresses',    label: 'Addresses',     icon: '⊞' },
  { id: 'keys',         label: 'Keys & Backup',  icon: '🔑' },
  { id: 'tools',        label: 'Tools',          icon: '🔧' },
  { id: 'settings',     label: 'Settings',      icon: '⚙' },
]

export function Sidebar({ current, onNavigate, nodeInfo }: Props) {
  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo block */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <img src={logo} alt="ZERC" style={{ width: 32, height: 32, borderRadius: 6 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.08em', lineHeight: 1 }}>
            ZERC<span style={{ color: 'var(--accent-light)', fontWeight: 400 }}>WALLET</span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 3 }}>
            ZEROCLASSIC
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const active = current === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none', cursor: 'pointer',
                background: active ? 'rgba(107,79,216,0.18)' : 'transparent',
                color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-ui)',
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                letterSpacing: '0.02em',
                textAlign: 'left',
                transition: 'all var(--t-fast)',
                borderLeft: active ? '2px solid var(--accent-light)' : '2px solid transparent',
                width: '100%',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(107,79,216,0.08)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                }
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: 'center', lineHeight: 1 }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Node info */}
      {nodeInfo && (
        <div style={{
          margin: '0 10px 12px',
          padding: '10px 12px',
          background: 'rgba(107,79,216,0.06)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--accent-light)', marginBottom: 7, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
            Node
          </div>
          <InfoRow label="Version" value={nodeInfo.version} />
          <InfoRow label="Blocks"  value={nodeInfo.blocks.toLocaleString()} />
          <InfoRow label="Peers"   value={String(nodeInfo.connections)} />
          {nodeInfo.syncing && (
            <InfoRow label="Sync" value={`${Math.round((nodeInfo.syncProgress ?? 0) * 100)}%`} valueColor="var(--gold)" />
          )}
        </div>
      )}
    </aside>
  )
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 6 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{
        fontSize: 10, fontFamily: 'var(--font-mono)',
        color: valueColor ?? 'var(--text-secondary)',
        wordBreak: 'break-all', lineHeight: 1.4, marginTop: 1,
      }}>
        {value}
      </span>
    </div>
  )
}
