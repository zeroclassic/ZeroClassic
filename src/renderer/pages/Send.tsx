import React, { useState } from 'react'
import type { ZercAddress, WalletBalance } from '@shared/types'

interface Props {
  addresses: ZercAddress[]
  balance: WalletBalance | null
  onRefresh: () => Promise<void>
}

type SendStatus = 'idle' | 'sending' | 'waiting' | 'success' | 'error'

export function Send({ addresses, balance, onRefresh }: Props) {
  const [fromAddress, setFromAddress] = useState('')
  const [toAddress, setToAddress]     = useState('')
  const [amount, setAmount]           = useState('')
  const [memo, setMemo]               = useState('')
  const [status, setStatus]           = useState<SendStatus>('idle')
  const [resultTxid, setResultTxid]   = useState('')
  const [errMsg, setErrMsg]           = useState('')
  const [opStatus, setOpStatus]       = useState('')

  const selected = addresses.find(a => a.address === fromAddress)

  // Poll the operation status until success or failure
  async function pollOpStatus(opid: string) {
    setStatus('waiting')
    setOpStatus('Processing…')
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const res = await (window.zerc as any).getOperationStatus(opid)
        if (!res) continue
        if (res.status === 'success') {
          setResultTxid(res.result?.txid ?? opid)
          setStatus('success')
          await onRefresh()
          return
        }
        if (res.status === 'failed') {
          const errDetail = res.error?.message ?? JSON.stringify(res.error) ?? 'Operation failed'
          setErrMsg(errDetail)
          setStatus('error')
          return
        }
        setOpStatus(`Processing… (${res.status})`)
      } catch { /* continue polling */ }
    }
    // Timeout after 5min — show opid anyway
    setResultTxid(opid)
    setStatus('success')
  }

  async function handleSend() {
    if (!fromAddress || !toAddress || !amount) return
    setStatus('sending')
    setErrMsg(''); setOpStatus('')
    try {
      const result = await window.zerc.sendTransaction({
        fromAddress, toAddress,
        amount: parseFloat(amount.replace(',', '.')),
        memo: memo || undefined,
      })
      const opid = result.txid ?? result.opid ?? ''
      setResultTxid(opid)
      await pollOpStatus(opid)
    } catch (err: any) {
      setErrMsg(err.message)
      setStatus('error')
    }
  }

  function reset() {
    setFromAddress(''); setToAddress(''); setAmount(''); setMemo('')
    setStatus('idle'); setResultTxid(''); setErrMsg(''); setOpStatus('')
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }} className="animate-fadeIn">
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>Transaction Confirmed!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
          Your transaction has been successfully processed by the node.
        </p>
        <div style={{ width: '100%', maxWidth: 440, marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Transaction ID
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--accent-light)',
            background: 'var(--bg-elevated)',
            padding: '10px 14px', borderRadius: 8,
            wordBreak: 'break-all',
          }} className="selectable">
            {resultTxid}
          </div>
        </div>
        <button onClick={reset} style={btnStyle('var(--accent-light)')}>Send another</button>
      </div>
    )
  }

  // ── Waiting screen (polling opid) ────────────────────────────────────────────
  if (status === 'waiting') {
    return (
      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }} className="animate-fadeIn">
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          border: '3px solid rgba(107,79,216,0.2)',
          borderTop: '3px solid var(--accent-light)',
          animation: 'spin 1s linear infinite',
          marginBottom: 24,
        }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Processing transaction…</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
          Waiting for the node to confirm the operation. This may take up to a minute.
        </p>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--text-muted)',
          background: 'var(--bg-elevated)',
          padding: '8px 14px', borderRadius: 8,
          marginBottom: 8,
        }}>
          {opStatus}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-muted)', wordBreak: 'break-all',
          maxWidth: 440, textAlign: 'center', marginTop: 8,
        }} className="selectable">
          opid: {resultTxid}
        </div>
      </div>
    )
  }

  // ── Main send form ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }} className="animate-fadeIn">
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Send ZERC</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
        Send transparent or shielded (z-addr) transactions.
      </p>

      <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* From */}
        <Field label="From address">
          <select
            value={fromAddress}
            onChange={e => setFromAddress(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select an address…</option>
            {addresses.map(a => (
              <option key={a.address} value={a.address}>
                [{a.type === 'shielded' ? 'z' : 't'}] {a.address.slice(0, 20)}…{a.address.slice(-10)} — {a.balance.toFixed(4)} ZERC
              </option>
            ))}
          </select>
          {selected && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              Available: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {selected.balance.toFixed(8)} ZERC
              </span>
            </div>
          )}
        </Field>

        {/* To */}
        <Field label="Recipient address">
          <input
            type="text"
            value={toAddress}
            onChange={e => setToAddress(e.target.value)}
            placeholder="t1… or zs1…"
            style={inputStyle}
            className="selectable"
          />
        </Field>

        {/* Amount */}
        <Field label="Amount (ZERC)">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(',', '.'))}
              placeholder="0.00000000"
              style={{ ...inputStyle, paddingRight: 80 }}
              className="selectable"
            />
            {selected && (
              <button
                onClick={() => {
                  const fee = 0.0001
                  const max = Math.max(0, selected.balance - fee)
                  setAmount(max.toFixed(8))
                }}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 10, color: 'var(--accent-light)', fontFamily: 'var(--font-ui)',
                  letterSpacing: '0.06em',
                }}
              >
                MAX
              </button>
            )}
          </div>
          {selected && amount && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
              After fee (0.0001): <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {Math.max(0, selected.balance - parseFloat(amount || '0') - 0.0001).toFixed(8)} ZERC remaining
              </span>
            </div>
          )}
        </Field>

        {/* Memo (z-addr only) */}
        {(fromAddress.startsWith('z') || toAddress.startsWith('z')) && (
          <Field label="Memo (optional — shielded only)">
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="Encrypted message…"
              style={inputStyle}
              className="selectable"
            />
          </Field>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: 'var(--red-glow)',
            border: '1px solid rgba(248,113,113,0.3)',
            color: 'var(--red)', fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}>
            ✗ {errMsg}
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!fromAddress || !toAddress || !amount || status === 'sending'}
          style={{
            ...btnStyle('var(--accent-light)'),
            opacity: (!fromAddress || !toAddress || !amount) ? 0.5 : 1,
            cursor: (!fromAddress || !toAddress || !amount) ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'sending' ? '⟳ Submitting…' : '↑ Send Transaction'}
        </button>
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
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </label>
      {children}
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
  transition: 'border-color var(--t-fast)',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%235a4d7a\' d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 36,
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: '12px 24px',
    background: `${color}22`,
    border: `1px solid ${color}60`,
    borderRadius: 8, cursor: 'pointer',
    color,
    fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14,
    letterSpacing: '0.04em',
    transition: 'all var(--t-fast)',
    alignSelf: 'flex-start',
  }
}
