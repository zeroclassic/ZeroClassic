import React, { useState } from 'react'
import logo from '../assets/logo.png'

interface Props {
  message: string
  onRetry: () => Promise<void>
  onSettings: () => void
}

export function ErrorScreen({ message, onRetry, onSettings }: Props) {
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    setRetrying(true)
    await onRetry()
    setRetrying(false)
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 48, textAlign: 'center',
    }} className="animate-fadeIn">

      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--red-glow)',
        border: '2px solid rgba(248,113,113,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        animation: 'pulse-glow 2s ease infinite',
        position: 'relative',
      }}>
        <img src={logo} alt="ZERC" style={{ width: 40, height: 40, borderRadius: 8, opacity: 0.5 }} />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>
        Node unreachable
      </h2>

      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.7, marginBottom: 12 }}>
        Cannot connect to the ZeroClassic node. Make sure{' '}
        <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontSize: 12 }}>zerod</code>{' '}
        is running and the RPC settings are correct.
      </p>

      <div style={{
        padding: '10px 18px', borderRadius: 8,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--red)', maxWidth: 480,
        wordBreak: 'break-word', marginBottom: 28, lineHeight: 1.5,
      }}>
        {message}
      </div>

      <div style={{
        padding: '16px 20px', borderRadius: 10,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        textAlign: 'left', maxWidth: 400, marginBottom: 28, width: '100%',
      }}>
        <div style={{ fontSize: 11, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>
          Quick checklist
        </div>
        {[
          'zerod is started and fully loaded',
          'rpcuser and rpcpassword are set in zero.conf',
          'rpcport matches the setting in Settings',
          'rpcallowip includes your IP address',
        ].map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{i + 1}.</span>
            {tip}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleRetry} disabled={retrying} style={{
          padding: '10px 22px',
          background: 'rgba(107,79,216,0.18)',
          border: '1px solid rgba(107,79,216,0.4)',
          borderRadius: 8, cursor: retrying ? 'wait' : 'pointer',
          color: 'var(--accent-light)',
          fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13,
        }}>
          {retrying ? '⟳ Retrying…' : '⟳ Retry'}
        </button>
        <button onClick={onSettings} style={{
          padding: '10px 22px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: 8, cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13,
        }}>
          ⚙ Settings
        </button>
      </div>
    </div>
  )
}
