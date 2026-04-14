import React, { useEffect, useState, useRef } from 'react'
import logo from '../assets/logo.png'

export function LoadingScreen() {
  const [dots, setDots]         = useState('.')
  const [logs, setLogs]         = useState<string[]>([])
  const [lastLog, setLastLog]   = useState('')
  const logsEndRef              = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Animate dots
    const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 500)

    // Listen to node logs
    const zerc = (window as any).zerc
    if (zerc?.onNodeLog) {
      zerc.onNodeLog((msg: string) => {
        setLastLog(msg)
        setLogs(prev => {
          const next = [...prev, msg]
          return next.slice(-20) // keep last 20
        })
      })
    }

    // Load existing logs (node started before window)
    zerc?.getNodeStatus?.().then((s: any) => {
      if (s?.logs?.length) {
        setLogs(s.logs.slice(-20))
        setLastLog(s.logs[s.logs.length - 1])
      }
    }).catch(() => {})

    return () => {
      clearInterval(t)
      zerc?.offNodeLog?.()
    }
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px', gap: 24,
    }}>
      {/* Spinning ring around logo */}
      <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
        <svg width={88} height={88} viewBox="0 0 88 88" fill="none"
          style={{ position: 'absolute', inset: 0, animation: 'spin 2.5s linear infinite' }}>
          <circle cx="44" cy="44" r="40" stroke="rgba(107,79,216,0.15)" strokeWidth="2"/>
          <circle cx="44" cy="44" r="40" stroke="url(#purpleGrad)" strokeWidth="2.5"
            strokeDasharray="251" strokeDashoffset="190" strokeLinecap="round"/>
          <defs>
            <linearGradient id="purpleGrad" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#44318d"/>
              <stop offset="100%" stopColor="#8b6ef5"/>
            </linearGradient>
          </defs>
        </svg>
        <img src={logo} alt="ZERC" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 52, height: 52, borderRadius: 10,
        }} />
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8 }}>
          ZERC<span style={{ color: 'var(--accent-light)', fontWeight: 400 }}>WALLET</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          {lastLog || `Connecting to node${dots}`}
        </div>
      </div>

      {/* Node logs panel — shows only if we have logs */}
      {logs.length > 0 && (
        <div style={{
          width: '100%', maxWidth: 560,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '6px 14px',
            borderBottom: '1px solid var(--border)',
            fontSize: 10, fontWeight: 600,
            color: 'var(--accent-light)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Node startup log</span>
            <span style={{ color: 'var(--text-muted)' }}>zerod</span>
          </div>
          <div style={{
            maxHeight: 180, overflowY: 'auto',
            padding: '8px 0',
          }}>
            {logs.map((log, i) => (
              <div key={i} style={{
                padding: '3px 14px',
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: log.startsWith('⚠') ? 'var(--gold)' : log.startsWith('Error') ? 'var(--red)' : 'var(--text-secondary)',
                lineHeight: 1.6,
                borderLeft: i === logs.length - 1 ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Please wait hint */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        Please wait while the node initializes…
      </div>
    </div>
  )
}
