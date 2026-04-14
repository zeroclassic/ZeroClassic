import React, { useState, useEffect } from 'react'
import type { ZercAddress } from '@shared/types'

interface Props {
  addresses: ZercAddress[]
  onRefresh: () => Promise<void>
}

type Tab = 'shield' | 'merge' | 'info'

export function Tools({ addresses, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>('shield')

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }} className="animate-fadeIn">
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Tools</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        Advanced wallet utilities — shield mined coins, merge UTXOs and check wallet health.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        {([
          { id: 'shield', label: '🛡 Shield Coinbase' },
          { id: 'merge',  label: '⚡ Merge UTXOs' },
          { id: 'info',   label: '📊 Wallet Info' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px',
            background: 'transparent', border: 'none',
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

      {tab === 'shield' && <ShieldTab addresses={addresses} onRefresh={onRefresh} />}
      {tab === 'merge'  && <MergeTab  addresses={addresses} onRefresh={onRefresh} />}
      {tab === 'info'   && <InfoTab />}
    </div>
  )
}

// ─── Shield Coinbase ──────────────────────────────────────────────────────────

function ShieldTab({ addresses, onRefresh }: { addresses: ZercAddress[]; onRefresh: () => Promise<void> }) {
  const tAddrs = addresses.filter(a => a.type === 'transparent' && a.balance > 0)
  const zAddrs = addresses.filter(a => a.type === 'shielded')

  const [fromAddr, setFromAddr] = useState('')
  const [toAddr, setToAddr]     = useState(zAddrs[0]?.address ?? '')
  const [fee, setFee]           = useState('0.0001')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<any>(null)
  const [error, setError]       = useState('')

  const selected = tAddrs.find(a => a.address === fromAddr)

  async function handleShield() {
    if (!fromAddr || !toAddr) return
    setLoading(true); setError(''); setResult(null)
    try {
      // limit=0 → prend TOUS les UTXOs de l'adresse
      const res = await (window.zerc as any).shieldCoinbase(fromAddr, toAddr, parseFloat(fee), 0)
      setResult(res)
      await onRefresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: 'rgba(107,79,216,0.06)', border: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
      }}>
        Shields <strong style={{ color: 'var(--text-primary)' }}>all coinbase UTXOs</strong> from
        a transparent address to a Z-address in one operation.
        Equivalent to: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontSize: 10 }}>
          z_shieldcoinbase &lt;t-addr&gt; &lt;z-addr&gt; 0.0001 0
        </code>
      </div>

      {/* From T-addr */}
      <Field label="From — Transparent address (source)">
        <select value={fromAddr} onChange={e => setFromAddr(e.target.value)} style={selectStyle}>
          <option value="">Select a T-address…</option>
          {tAddrs.map(a => (
            <option key={a.address} value={a.address}>
              {a.address} — {a.balance.toFixed(4)} ZERC
            </option>
          ))}
        </select>
        {selected && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            Will shield all coinbase UTXOs from this address —{' '}
            <span style={{ color: 'var(--accent-light)', fontFamily: 'var(--font-mono)' }}>
              {selected.balance.toFixed(8)} ZERC
            </span>
          </div>
        )}
      </Field>

      {/* To Z-addr */}
      <Field label="To — Shielded address (destination)">
        <select value={toAddr} onChange={e => setToAddr(e.target.value)} style={selectStyle}>
          <option value="">Select a Z-address…</option>
          {zAddrs.map(a => (
            <option key={a.address} value={a.address}>
              {a.address.slice(0, 40)}… — {a.balance.toFixed(4)} ZERC
            </option>
          ))}
        </select>
        {zAddrs.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6 }}>
            ⚠ No Z-addresses found. Generate one in the Addresses page first.
          </div>
        )}
      </Field>

      {/* Fee */}
      <Field label="Fee (ZERC)">
        <input type="text" value={fee}
          onChange={e => setFee(e.target.value.replace(',', '.'))}
          style={{ ...inputStyle, maxWidth: 160 }} className="selectable" />
      </Field>

      {/* Preview */}
      {fromAddr && toAddr && selected && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8,
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontWeight: 600, marginBottom: 6, fontSize: 11 }}>
            PREVIEW
          </div>
          <div>{fromAddr.slice(0, 20)}…</div>
          <div style={{ color: 'var(--accent-light)' }}>↓ {selected.balance.toFixed(8)} ZERC (all UTXOs, limit=0)</div>
          <div>{toAddr.slice(0, 30)}…</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>fee: {fee} ZERC</div>
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      {result && (
        <div style={{
          padding: '14px 16px', borderRadius: 8,
          background: 'var(--green-glow)', border: '1px solid rgba(52,211,153,0.3)',
          fontSize: 12, lineHeight: 1.8,
        }}>
          <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 6 }}>✓ Shield operation started!</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Shielding <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {result.shieldingValue?.toFixed(8) ?? '?'} ZERC
            </span> across <span style={{ color: 'var(--text-primary)' }}>{result.shieldingUTXOs ?? '?'} UTXOs</span>
          </div>
          {result.opid && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 6, wordBreak: 'break-all' }}>
              opid: {result.opid}
            </div>
          )}
          {result.remainingUTXOs > 0 && (
            <div style={{ color: 'var(--gold)', marginTop: 6, fontSize: 11 }}>
              ⚠ {result.remainingUTXOs} UTXOs remaining — run again to shield them all.
            </div>
          )}
        </div>
      )}

      <button onClick={handleShield} disabled={!fromAddr || !toAddr || loading} style={{
        ...actionBtn,
        opacity: (!fromAddr || !toAddr) ? 0.5 : 1,
        cursor: (!fromAddr || !toAddr) ? 'not-allowed' : 'pointer',
      }}>
        {loading ? '⟳ Shielding…' : '🛡 Shield all coinbase UTXOs'}
      </button>
    </div>
  )
}

// ─── Merge UTXOs ──────────────────────────────────────────────────────────────

function MergeTab({ addresses, onRefresh }: { addresses: ZercAddress[]; onRefresh: () => Promise<void> }) {
  const allAddrs = addresses.filter(a => a.balance > 0)

  const [selectedAddr, setSelectedAddr] = useState('')
  const [fee, setFee]                   = useState('0.0001')
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<any>(null)
  const [error, setError]               = useState('')

  const selected = allAddrs.find(a => a.address === selectedAddr)

  async function handleMerge() {
    if (!selectedAddr) return
    setLoading(true); setError(''); setResult(null)
    try {
      // Merge tous les UTXOs de l'adresse vers elle-même
      // tLimit=500, zLimit=10 → max possible
      const res = await (window.zerc as any).mergeToAddress(
        [selectedAddr],
        selectedAddr,
        parseFloat(fee),
        500,
        10,
      )
      setResult(res)
      await onRefresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: 'rgba(107,79,216,0.06)', border: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
      }}>
        Merges <strong style={{ color: 'var(--text-primary)' }}>all UTXOs</strong> of an address
        back into itself — reducing UTXO count and speeding up future transactions.
        Uses <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontSize: 10 }}>
          z_mergetoaddress [addr] addr fee 500 10
        </code>
      </div>

      {/* Address selector */}
      <Field label="Address to consolidate (source = destination)">
        <select value={selectedAddr} onChange={e => setSelectedAddr(e.target.value)} style={selectStyle}>
          <option value="">Select an address…</option>
          <optgroup label="Transparent">
            {addresses.filter(a => a.type === 'transparent' && a.balance > 0).map(a => (
              <option key={a.address} value={a.address}>
                [t] {a.address} — {a.balance.toFixed(4)} ZERC
              </option>
            ))}
          </optgroup>
          <optgroup label="Shielded">
            {addresses.filter(a => a.type === 'shielded' && a.balance > 0).map(a => (
              <option key={a.address} value={a.address}>
                [z] {a.address.slice(0, 40)}… — {a.balance.toFixed(4)} ZERC
              </option>
            ))}
          </optgroup>
        </select>
      </Field>

      {/* Fee */}
      <Field label="Fee (ZERC)">
        <input type="text" value={fee}
          onChange={e => setFee(e.target.value.replace(',', '.'))}
          style={{ ...inputStyle, maxWidth: 160 }} className="selectable" />
      </Field>

      {/* Preview */}
      {selected && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          fontSize: 12, lineHeight: 1.8,
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontWeight: 600, marginBottom: 6, fontSize: 11 }}>
            PREVIEW
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            [{selected.type === 'shielded' ? 'z' : 't'}] {selectedAddr.length > 40 ? selectedAddr.slice(0, 40) + '…' : selectedAddr}
          </div>
          <div style={{ color: 'var(--accent-light)' }}>
            ↻ Merge all UTXOs → same address
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            balance: {selected.balance.toFixed(8)} ZERC · fee: {fee} ZERC · limit: 500 T / 10 Z
          </div>
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      {result && (
        <div style={{
          padding: '14px 16px', borderRadius: 8,
          background: 'var(--green-glow)', border: '1px solid rgba(52,211,153,0.3)',
          fontSize: 12, lineHeight: 1.8,
        }}>
          <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 6 }}>✓ Merge operation started!</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Merging{' '}
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {(result.mergingUTXOs ?? 0) + (result.mergingNotes ?? 0)} inputs
            </span>
            {' '}→{' '}
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {result.mergingValue?.toFixed(8) ?? '?'} ZERC
            </span>
          </div>
          {((result.remainingUTXOs ?? 0) + (result.remainingNotes ?? 0)) > 0 ? (
            <div style={{ color: 'var(--gold)', fontSize: 11, marginTop: 4 }}>
              ⚠ {(result.remainingUTXOs ?? 0) + (result.remainingNotes ?? 0)} inputs remaining — run again when this operation completes.
            </div>
          ) : (
            <div style={{ color: 'var(--green)', fontSize: 11, marginTop: 4 }}>
              ✓ All inputs included in this operation.
            </div>
          )}
          {result.opid && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 6, wordBreak: 'break-all' }}>
              opid: {result.opid}
            </div>
          )}
        </div>
      )}

      <button onClick={handleMerge} disabled={!selectedAddr || loading} style={{
        ...actionBtn,
        opacity: !selectedAddr ? 0.5 : 1,
        cursor: !selectedAddr ? 'not-allowed' : 'pointer',
      }}>
        {loading ? '⟳ Merging…' : '⚡ Merge all UTXOs'}
      </button>
    </div>
  )
}

// ─── Wallet Info ───────────────────────────────────────────────────────────────

function InfoTab() {
  const [info, setInfo]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    (window.zerc as any).getWalletInfo()
      .then((data: any) => { setInfo(data); setLoading(false) })
      .catch((e: any) => { setError(e.message); setLoading(false) })
  }, [])

  async function refresh() {
    setLoading(true); setError('')
    try {
      const data = await (window.zerc as any).getWalletInfo()
      setInfo(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>⟳ Loading wallet info…</div>
  )

  if (error) return <ErrorBox msg={error} />

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Note counts */}
      <InfoSection title="Notes & UTXOs">
        <InfoRow label="Unshielded UTXOs"    value={info?.utxoCount ?? '—'} />
        <InfoRow label="Shielded notes"       value={info?.noteCount ?? '—'} />
        <InfoRow label="Wallet version"       value={info?.walletversion ?? '—'} />
      </InfoSection>

      {/* Balances */}
      <InfoSection title="Balances">
        <InfoRow label="Confirmed balance"    value={`${info?.balance?.toFixed(8) ?? '—'} ZERC`} />
        <InfoRow label="Unconfirmed balance"  value={`${info?.unconfirmed_balance?.toFixed(8) ?? '—'} ZERC`} />
        <InfoRow label="Immature balance"     value={`${info?.immature_balance?.toFixed(8) ?? '—'} ZERC`} />
      </InfoSection>

      {/* Keypool */}
      <InfoSection title="Keypool">
        <InfoRow label="Keypool size"         value={info?.keypoolsize ?? '—'} />
        <InfoRow label="Oldest key"           value={info?.keypoololdest
          ? new Date(info.keypoololdest * 1000).toLocaleDateString()
          : '—'} />
        <InfoRow label="Pay tx fee"           value={`${info?.paytxfee ?? 0} ZERC/kB`} />
      </InfoSection>

      {/* Raw */}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
          Raw response
        </summary>
        <pre style={{
          marginTop: 8, padding: '12px 14px',
          background: 'var(--bg-base)', borderRadius: 8,
          border: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-secondary)', overflow: 'auto',
          maxHeight: 200,
        }} className="selectable">
          {JSON.stringify(info, null, 2)}
        </pre>
      </details>

      <button onClick={refresh} style={{ ...actionBtn, alignSelf: 'flex-start' }}>
        ⟳ Refresh
      </button>
    </div>
  )
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 10,
      border: '1px solid var(--border)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 14px', borderBottom: '1px solid var(--border)',
        fontSize: 10, fontWeight: 600, color: 'var(--accent-light)',
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        {title}
      </div>
      <div style={{ padding: '6px 0' }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
        {String(value)}
      </span>
    </div>
  )
}

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
  ...inputStyle, cursor: 'pointer', appearance: 'none',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%235a4d7a\' d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36,
}

const actionBtn: React.CSSProperties = {
  padding: '11px 22px',
  background: 'rgba(107,79,216,0.15)',
  border: '1px solid rgba(139,110,245,0.4)',
  borderRadius: 8, cursor: 'pointer',
  color: 'var(--accent-light)',
  fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13,
  letterSpacing: '0.04em', transition: 'all var(--t-fast)',
}
