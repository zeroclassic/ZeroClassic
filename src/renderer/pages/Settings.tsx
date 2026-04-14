import React, { useState, useEffect } from 'react'

import type { RPCConfig } from '@shared/types'

const DEFAULT_RPC_CONFIG: RPCConfig = {
  host: '127.0.0.1',
  port: 8545,
  username: 'zerc',
  password: '',
}

interface Props {
  onRefresh: () => Promise<void>
}

export function Settings({ onRefresh }: Props) {
  const [config, setConfig]   = useState<RPCConfig>(DEFAULT_RPC_CONFIG)
  const [saved, setSaved]     = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const [caps, setCaps] = React.useState<{ addressIndex: boolean } | null>(null)

  useEffect(() => {
    ;(window.zerc as any).getCapabilities?.().then((c: any) => setCaps(c)).catch(() => {})
    window.zerc.getConfig().then(c => {
      setConfig(c.rpc)
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    await window.zerc.setConfig({ rpc: config })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    await onRefresh()
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      // Temporarily apply & test
      await window.zerc.setConfig({ rpc: config })
      const info = await window.zerc.getNodeInfo()
      setTestResult({ ok: true, msg: `Connected! Node ${info.version} · Block ${info.blocks.toLocaleString()}` })
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message })
    } finally {
      setTesting(false)
    }
  }

  function reset() {
    setConfig(DEFAULT_RPC_CONFIG)
    setTestResult(null)
  }

  if (loading) return null

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }} className="animate-fadeIn">
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Settings</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
        Configure the connection to your local ZeroClassic node.
      </p>

      <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* RPC Config */}
        <Section title="Node RPC connection">
          <Field label="Host">
            <input
              value={config.host}
              onChange={e => setConfig(c => ({ ...c, host: e.target.value }))}
              placeholder="127.0.0.1"
              style={inputStyle}
              className="selectable"
            />
          </Field>

          <Field label="Port">
            <input
              type="number"
              value={config.port}
              onChange={e => setConfig(c => ({ ...c, port: parseInt(e.target.value) || 8545 }))}
              placeholder="8545"
              style={inputStyle}
              className="selectable"
            />
          </Field>

          <Field label="RPC Username">
            <input
              value={config.username}
              onChange={e => setConfig(c => ({ ...c, username: e.target.value }))}
              placeholder="zerc"
              style={inputStyle}
              className="selectable"
            />
          </Field>

          <Field label="RPC Password">
            <input
              type="password"
              value={config.password}
              onChange={e => setConfig(c => ({ ...c, password: e.target.value }))}
              placeholder="From zero.conf"
              style={inputStyle}
            />
          </Field>

          {/* Test result */}
          {testResult && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: testResult.ok ? 'var(--green-glow)' : 'var(--red-glow)',
              border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: testResult.ok ? 'var(--green)' : 'var(--red)',
              fontSize: 12, fontFamily: 'var(--font-mono)',
            }}>
              {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleTest} disabled={testing} style={btnStyle('var(--violet)')}>
              {testing ? '⟳ Testing…' : '⬡ Test connection'}
            </button>
            <button onClick={handleSave} style={btnStyle(saved ? 'var(--green)' : 'var(--accent)')}>
              {saved ? '✓ Saved!' : '⊙ Save'}
            </button>
            <button onClick={reset} style={btnStyle('var(--text-muted)')}>
              ↺ Reset defaults
            </button>
          </div>
        </Section>

        {/* Info */}
        <Section title="Configuration file">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            ZercWallet saves its config to <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontSize: 11 }}>~/.zerc-wallet/config.json</code>.<br />
            Your RPC credentials should match the values in <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontSize: 11 }}>zero.conf</code>:
          </p>
          <div style={{
            marginTop: 12, padding: '12px 16px',
            background: 'var(--bg-base)', borderRadius: 8,
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-secondary)', lineHeight: 2,
          }} className="selectable">
            <span style={{ color: 'var(--text-muted)' }}># zero.conf</span><br />
            <span style={{ color: 'var(--violet)' }}>rpcuser</span>=<span style={{ color: 'var(--gold)' }}>{config.username || 'zerc'}</span><br />
            <span style={{ color: 'var(--violet)' }}>rpcpassword</span>=<span style={{ color: 'var(--gold)' }}>{'<your-password>'}</span><br />
            <span style={{ color: 'var(--violet)' }}>rpcport</span>=<span style={{ color: 'var(--gold)' }}>{config.port}</span><br />
            <span style={{ color: 'var(--violet)' }}>rpcbind</span>=<span style={{ color: 'var(--gold)' }}>{config.host}</span><br />
            <span style={{ color: 'var(--violet)' }}>rpcallowip</span>=<span style={{ color: 'var(--gold)' }}>127.0.0.1</span>
          </div>
        </Section>

        {/* Node process */}
        <Section title="Node process (zerod)">
          <NodeControl />
        </Section>

        {/* About */}
        <Section title="About">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <AboutRow label="ZercWallet" value={`v${__APP_VERSION__}`} />
            {caps && (
              <AboutRow
                label="Address index"
                value={caps.addressIndex ? '✓ Enabled (fast mode)' : '✗ Disabled (standard mode)'}
              />
            )}
            <AboutRow label="Target node" value={__TARGET_NODE__} />
            <AboutRow label="License" value="MIT" />
          </div>
          <button
            onClick={() => window.zerc.openExternal('https://zeroclassic.org')}
            style={{ ...btnStyle('var(--accent)'), marginTop: 12 }}
          >
            ↗ zeroclassic.org
          </button>
        </Section>

      </div>
    </div>
  )
}

// ─── Node Control ────────────────────────────────────────────────────────────

function NodeControl() {
  const [status, setStatus]   = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg]         = React.useState('')
  const [customPath, setCustomPath] = React.useState('')

  React.useEffect(() => {
    refreshStatus()
    const t = setInterval(refreshStatus, 5000)
    return () => clearInterval(t)
  }, [])

  async function refreshStatus() {
    try {
      const s = await (window.zerc as any).getNodeStatus()
      setStatus(s)
      if (s?.path) setCustomPath(s.path)
    } catch { /* ignore */ }
  }

  async function handleStart() {
    setLoading(true); setMsg('')
    try {
      if (customPath && customPath !== status?.path) {
        await (window.zerc as any).setNodePath(customPath)
      }
      const r = await (window.zerc as any).startNode()
      setMsg(r.ok ? '✓ Node started successfully!' : `✗ ${r.error}`)
      await refreshStatus()
    } catch (e: any) { setMsg(`✗ ${e.message}`) }
    finally { setLoading(false) }
  }

  async function handleStop() {
    setLoading(true); setMsg('')
    try {
      await (window.zerc as any).stopNode()
      setMsg('✓ Node stopped.')
      await refreshStatus()
    } catch (e: any) { setMsg(`✗ ${e.message}`) }
    finally { setLoading(false) }
  }

  const isRunning = status?.running
  const canStop   = status?.startedByUs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: isRunning ? 'var(--green)' : 'var(--red)',
          boxShadow: `0 0 6px ${isRunning ? 'var(--green)' : 'var(--red)'}`,
        }} />
        <span style={{ fontSize: 13, color: isRunning ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
          {isRunning ? 'Node is running' : 'Node is not running'}
        </span>
        {status?.startedByUs && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            (started by ZercWallet)
          </span>
        )}
      </div>

      {/* zerod path */}
      <Field label="zerod executable path">
        <input
          type="text"
          value={customPath}
          onChange={e => setCustomPath(e.target.value)}
          placeholder={status?.placeholder ?? "e.g. /path/to/zerod"}
          style={inputStyle}
          className="selectable"
        />
        {status && !status.available && (
          <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 5 }}>
            ⚠ zerod not found automatically. Set the path manually above.
          </div>
        )}
      </Field>

      {msg && (
        <div style={{
          padding: '8px 12px', borderRadius: 7, fontSize: 12,
          background: msg.startsWith('✓') ? 'var(--green-glow)' : 'var(--red-glow)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
          color: msg.startsWith('✓') ? 'var(--green)' : 'var(--red)',
          fontFamily: 'var(--font-mono)',
        }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {!isRunning && (
          <button onClick={handleStart} disabled={loading} style={btnStyle('var(--green)')}>
            {loading ? '⟳ Starting…' : '▶ Start node'}
          </button>
        )}
        {isRunning && canStop && (
          <button onClick={handleStop} disabled={loading} style={btnStyle('var(--red)')}>
            {loading ? '⟳ Stopping…' : '■ Stop node'}
          </button>
        )}
        <button onClick={refreshStatus} style={btnStyle('var(--text-muted)')}>
          ⟳ Refresh
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
        paddingBottom: 8, borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'var(--text-muted)', letterSpacing: '0.08em',
        textTransform: 'uppercase', marginBottom: 7,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 8, outline: 'none',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)', fontSize: 12,
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: '9px 18px',
    background: `${color}14`,
    border: `1px solid ${color}40`,
    borderRadius: 8, cursor: 'pointer',
    color,
    fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 12,
    transition: 'all var(--t-fast)',
    letterSpacing: '0.04em',
  }
}
