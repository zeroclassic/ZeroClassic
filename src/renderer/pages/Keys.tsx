import React, { useState } from 'react'
import type { ZercAddress } from '@shared/types'

interface Props {
  addresses: ZercAddress[]
  onRefresh: () => Promise<void>
}

type Tab = 'export' | 'import' | 'backup'
type ExportType = 'privkey' | 'zkey' | 'viewingkey'
type ImportType = 'privkey' | 'zkey' | 'viewingkey'

export function Keys({ addresses, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>('export')

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }} className="animate-fadeIn">
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Keys & Backup</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        Export or import private keys and backup your wallet. Keep your keys safe and never share them.
      </p>

      {/* Warning banner */}
      <div style={{
        padding: '12px 16px', marginBottom: 24,
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.3)',
        borderRadius: 10,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
        <div style={{ fontSize: 12, color: 'var(--gold)', lineHeight: 1.6 }}>
          <strong>Security warning</strong> — Private keys give full access to your funds.
          Never share them, never paste them in untrusted applications.
          Store them offline in a secure location.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {([
          { id: 'export', label: '↑ Export keys' },
          { id: 'import', label: '↓ Import keys' },
          { id: 'backup', label: '⊙ Backup wallet' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--accent-light)' : '2px solid transparent',
            cursor: 'pointer',
            color: tab === t.id ? 'var(--accent-light)' : 'var(--text-muted)',
            fontFamily: 'var(--font-ui)', fontWeight: tab === t.id ? 600 : 400,
            fontSize: 13, marginBottom: -1,
            transition: 'all var(--t-fast)',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'export' && <ExportTab addresses={addresses} />}
      {tab === 'import' && <ImportTab onRefresh={onRefresh} />}
      {tab === 'backup' && <BackupTab />}
    </div>
  )
}

// ─── Export Tab ───────────────────────────────────────────────────────────────

function ExportTab({ addresses }: { addresses: ZercAddress[] }) {
  const [selectedAddr, setSelectedAddr] = useState('')
  const [exportType, setExportType]     = useState<ExportType>('privkey')
  const [result, setResult]             = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [copied, setCopied]             = useState(false)

  const selected = addresses.find(a => a.address === selectedAddr)
  const isShielded = selected?.type === 'shielded'

  // Adjust export type when switching address type
  function selectAddress(addr: string) {
    setSelectedAddr(addr)
    setResult('')
    setError('')
    const a = addresses.find(x => x.address === addr)
    if (a?.type === 'transparent') setExportType('privkey')
    else setExportType('zkey')
  }

  async function handleExport() {
    if (!selectedAddr) return
    setLoading(true); setResult(''); setError('')
    try {
      let key = ''
      if (exportType === 'privkey')    key = await window.zerc.dumpPrivkey(selectedAddr)
      if (exportType === 'zkey')       key = await window.zerc.zExportKey(selectedAddr)
      if (exportType === 'viewingkey') key = await window.zerc.zExportViewingKey(selectedAddr)
      setResult(key)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function copy() {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Address selector */}
      <Field label="Select address">
        <select value={selectedAddr} onChange={e => selectAddress(e.target.value)} style={selectStyle}>
          <option value="">Choose an address…</option>
          <optgroup label="Transparent (T-addr)">
            {addresses.filter(a => a.type === 'transparent').map(a => (
              <option key={a.address} value={a.address}>
                {a.address.slice(0, 22)}… — {a.balance.toFixed(4)} ZERC
              </option>
            ))}
          </optgroup>
          <optgroup label="Shielded (Z-addr)">
            {addresses.filter(a => a.type === 'shielded').map(a => (
              <option key={a.address} value={a.address}>
                {a.address.slice(0, 22)}… — {a.balance.toFixed(4)} ZERC
              </option>
            ))}
          </optgroup>
        </select>
      </Field>

      {/* Export type */}
      {selectedAddr && (
        <Field label="Key type">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isShielded && (
              <TypeBtn label="Private key" active={exportType === 'privkey'} onClick={() => setExportType('privkey')} />
            )}
            {isShielded && (
              <TypeBtn label="Spending key" active={exportType === 'zkey'} onClick={() => setExportType('zkey')} />
            )}
            {isShielded && (
              <TypeBtn label="Viewing key (read-only)" active={exportType === 'viewingkey'} onClick={() => setExportType('viewingkey')} />
            )}
          </div>
        </Field>
      )}

      {error && <ErrorBox msg={error} />}

      <button onClick={handleExport} disabled={!selectedAddr || loading} style={actionBtn}>
        {loading ? '⟳ Exporting…' : '↑ Export key'}
      </button>

      {/* Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {exportType === 'viewingkey' ? 'Viewing key' : 'Private key'} — copy and store securely
          </div>
          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-base)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 8,
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--gold)',
            wordBreak: 'break-all', lineHeight: 1.7,
          }} className="selectable">
            {result}
          </div>
          <button onClick={copy} style={{
            ...actionBtn,
            background: copied ? 'var(--green-glow)' : 'rgba(107,79,216,0.1)',
            color: copied ? 'var(--green)' : 'var(--text-primary)',
            border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
          }}>
            {copied ? '✓ Copied!' : '⎘ Copy to clipboard'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Import Tab ───────────────────────────────────────────────────────────────

function ImportTab({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [importType, setImportType] = useState<ImportType>('privkey')
  const [key, setKey]               = useState('')
  const [label, setLabel]           = useState('')
  const [rescan, setRescan]         = useState(false)
  const [importing, setImportStatus] = useState<'idle'|'running'|'done'>('idle')
  const [loading, setLoading]       = useState(false)
  const [success, setSuccess]       = useState(false)
  const [error, setError]           = useState('')

  async function handleImport() {
    if (!key.trim()) return
    setLoading(true); setError(''); setSuccess(false); setImportStatus(rescan ? 'running' : 'idle')
    try {
      if (importType === 'privkey')    await window.zerc.importPrivkey(key.trim(), label, rescan)
      if (importType === 'zkey')       await window.zerc.zImportKey(key.trim(), rescan ? 'yes' : 'no')
      if (importType === 'viewingkey') await window.zerc.zImportViewingKey(key.trim(), rescan ? 'yes' : 'no')
      setSuccess(true)
      setImportStatus('done')
      setKey(''); setLabel('')
      await onRefresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setImportStatus('idle')
    }
  }

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Import type */}
      <Field label="Key type to import">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <TypeBtn label="T-addr private key" active={importType === 'privkey'}    onClick={() => setImportType('privkey')} />
          <TypeBtn label="Z-addr spending key" active={importType === 'zkey'}      onClick={() => setImportType('zkey')} />
          <TypeBtn label="Z-addr viewing key"  active={importType === 'viewingkey'} onClick={() => setImportType('viewingkey')} />
        </div>
      </Field>

      {/* Key input */}
      <Field label="Private key">
        <textarea
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder={
            importType === 'privkey'    ? 'Paste your WIF private key (starts with 5, K or L)…' :
            importType === 'zkey'       ? 'Paste your z-addr spending key (starts with secret-extended-key)…' :
                                          'Paste your z-addr viewing key…'
          }
          rows={3}
          style={{ ...inputStyle, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
          className="selectable"
        />
      </Field>

      {/* Label (T-addr only) */}
      {importType === 'privkey' && (
        <Field label="Label (optional)">
          <input
            type="text" value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="My imported address"
            style={inputStyle} className="selectable"
          />
        </Field>
      )}

      {/* Rescan */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={rescan}
          onChange={e => setRescan(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)', marginTop: 2, flexShrink: 0 }}
        />
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Rescan blockchain</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.6 }}>
            Required to see existing transactions for this key.<br/>
            <span style={{ color: 'var(--gold)' }}>
              ⚠ On a node with 2M+ blocks this can take <strong>10 to 30 minutes</strong>.
              The node will be unresponsive during rescan. Leave unchecked if the address is new.
            </span>
          </div>
        </div>
      </label>

      {error   && <ErrorBox msg={error} />}
      {success && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'var(--green-glow)', border: '1px solid rgba(52,211,153,0.3)',
          color: 'var(--green)', fontSize: 13,
        }}>
          ✓ Key imported successfully!{rescan ? ' Blockchain rescan started.' : ''}
        </div>
      )}

      <button onClick={handleImport} disabled={!key.trim() || loading} style={actionBtn}>
        {loading && rescan ? '⟳ Rescanning blockchain… (this can take 10-30 min)' : loading ? '⟳ Importing…' : '↓ Import key'}
      </button>
    </div>
  )
}

// ─── Backup Tab ───────────────────────────────────────────────────────────────

function BackupTab() {
  const [destination, setDestination] = useState('')
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')

  // Default path based on OS
  const defaultPath = `C:\\Users\\YourName\\Desktop\\zerc-wallet-backup-${new Date().toISOString().slice(0,10)}.dat`

  async function handleBackup() {
    const dest = destination.trim() || defaultPath
    setLoading(true); setError(''); setSuccess(false)
    try {
      await window.zerc.backupWallet(dest)
      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setImportStatus('idle')
    }
  }

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: 'rgba(107,79,216,0.06)', border: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
      }}>
        <strong style={{ color: 'var(--text-primary)' }}>Backup wallet</strong> copies your{' '}
        <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontSize: 11 }}>wallet.dat</code>{' '}
        file to the specified location. This file contains all your private keys.
        Back up regularly and store copies in multiple secure locations.
      </div>

      <Field label="Destination path">
        <input
          type="text"
          value={destination}
          onChange={e => setDestination(e.target.value)}
          placeholder={defaultPath}
          style={inputStyle}
          className="selectable"
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          Full path including filename. The directory must exist.
        </div>
      </Field>

      {error   && <ErrorBox msg={error} />}
      {success && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'var(--green-glow)', border: '1px solid rgba(52,211,153,0.3)',
          color: 'var(--green)', fontSize: 13,
        }}>
          ✓ Wallet backed up successfully to: <br />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{destination}</span>
        </div>
      )}

      <button onClick={handleBackup} disabled={loading} style={actionBtn}>
        {loading ? '⟳ Backing up…' : '⊙ Backup wallet.dat'}
      </button>

      {/* Info */}
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Good backup practices
        </div>
        {[
          'Back up after creating new addresses',
          'Store on an encrypted USB drive',
          'Keep copies in multiple physical locations',
          'Never store backups on cloud services unencrypted',
        ].map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span>
            {tip}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'var(--text-muted)', letterSpacing: '0.08em',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TypeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px',
      background: active ? 'rgba(107,79,216,0.18)' : 'transparent',
      border: `1px solid ${active ? 'rgba(139,110,245,0.5)' : 'var(--border)'}`,
      borderRadius: 7, cursor: 'pointer',
      color: active ? 'var(--accent-light)' : 'var(--text-muted)',
      fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: active ? 600 : 400,
      transition: 'all var(--t-fast)',
    }}>
      {label}
    </button>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      background: 'var(--red-glow)', border: '1px solid rgba(248,113,113,0.3)',
      color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-mono)',
    }}>
      {msg}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 8, outline: 'none',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)', fontSize: 13,
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer', appearance: 'none',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%235a4d7a\' d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  paddingRight: 36,
}

const actionBtn: React.CSSProperties = {
  padding: '11px 22px', alignSelf: 'flex-start',
  background: 'rgba(107,79,216,0.15)',
  border: '1px solid rgba(139,110,245,0.4)',
  borderRadius: 8, cursor: 'pointer',
  color: 'var(--accent-light)',
  fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13,
  letterSpacing: '0.04em', transition: 'all var(--t-fast)',
}
