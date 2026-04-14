import React from 'react'
import type { ConnectionStatus } from '../hooks/useWallet'
import logo from '../assets/logo.png'

interface Props {
  status: ConnectionStatus
}

export function TitleBar({ status }: Props) {
  const statusColor = {
    connecting: '#fbbf24',
    connected:  '#34d399',
    error:      '#f87171',
  }[status]

  const statusLabel = {
    connecting: 'Connecting…',
    connected:  'Connected',
    error:      'Disconnected',
  }[status]

  return (
    <div style={{
      height: 'var(--titlebar-h)',
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      WebkitAppRegion: 'drag' as any,
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Left: Logo + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src={logo}
          alt="ZERC"
          style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }}
        />
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: '0.1em',
          color: 'var(--text-primary)',
        }}>
          ZERC<span style={{ color: 'var(--accent-light)', fontWeight: 400 }}>WALLET</span>
        </span>
      </div>

      {/* Center: Status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: 'var(--text-secondary)',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: statusColor,
          boxShadow: `0 0 6px ${statusColor}`,
          animation: status === 'connecting' ? 'pulse-glow 1.2s ease infinite' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{statusLabel}</span>
      </div>

      {/* Right: Window controls */}
      <div style={{
        display: 'flex', gap: 6,
        WebkitAppRegion: 'no-drag' as any,
      }}>
        {[
          { action: 'minimize', label: '−', color: '#fbbf24' },
          { action: 'maximize', label: '□', color: '#34d399' },
          { action: 'close',    label: '×', color: '#f87171' },
        ].map(btn => (
          <button
            key={btn.action}
            onClick={() => (window.zerc as any)[btn.action]()}
            style={{
              width: 22, height: 22, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-muted)',
              borderRadius: 4, fontSize: 13, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all var(--t-fast)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = btn.color + '22'
              ;(e.currentTarget as HTMLButtonElement).style.color = btn.color
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
