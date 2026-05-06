import { useState, useRef, useEffect, useCallback } from 'react'
import * as aiService from '../services/aiService'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  return (
    <svg className={`${s} animate-spin text-[#1B4F8A]`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── Typing effect ─────────────────────────────────────────────────────────────
function TypingText({ text, speed = 12, onComplete }) {
  const [displayed, setDisplayed] = useState('')
  const idx = useRef(0)

  useEffect(() => {
    setDisplayed('')
    idx.current = 0
    if (!text) return
    const t = setInterval(() => {
      idx.current += 1
      setDisplayed(text.slice(0, idx.current))
      if (idx.current >= text.length) {
        clearInterval(t)
        if (onComplete) onComplete()
      }
    }, speed)
    return () => clearInterval(t)
  }, [text, speed, onComplete])

  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {displayed}
      {displayed.length < (text?.length || 0) && (
        <span className="inline-block w-2 h-4 bg-[#1B4F8A] ml-1 animate-pulse align-middle rounded-sm" />
      )}
    </span>
  )
}

// ── AI Response Card ──────────────────────────────────────────────────────────
function AIResponseCard({ data, onRetry, loading }) {
  if (loading) {
    return (
      <div className="mt-8">
         <LoadingSkeleton type="detail" />
      </div>
    )
  }

  if (!data && !loading) return null

  return (
    <div className="mt-12 glass-card rounded-5xl p-10 animate-in fade-in zoom-in duration-700 relative overflow-hidden group border-slate-200">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#1B4F8A]/10 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
      
      <div className="flex items-center justify-between mb-10 relative z-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#1B4F8A] flex items-center justify-center text-white shadow-xl shadow-[#1B4F8A]/20">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">AI Analysis</h3>
            {data.generated_at && (
              <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mt-1">Generated at {new Date(data.generated_at).toLocaleTimeString()}</p>
            )}
          </div>
        </div>
        <button onClick={onRetry} className="btn-secondary !py-2.5 !px-5 !text-[10px] uppercase tracking-widest">
          Refresh Node
        </button>
      </div>
      
      <div className="text-lg text-slate-700 leading-relaxed font-medium bg-white/40 backdrop-blur-sm rounded-4xl p-10 border border-white/60 shadow-inner relative z-10">
        <TypingText text={data.response || data.recommendations || ''} />
      </div>
    </div>
  )
}

// ── Error Alert ───────────────────────────────────────────────────────────────
function ErrorAlert({ message, onRetry }) {
  return (
    <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 p-6 flex items-start gap-4 animate-in shake duration-500">
      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center flex-shrink-0">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9S16.97 3 12 3z" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-black text-red-800 uppercase tracking-widest">Protocol Error</p>
        <p className="text-xs text-red-600 font-bold mt-1 opacity-80 leading-relaxed">{message}</p>
      </div>
      <button onClick={onRetry} className="px-5 py-2.5 rounded-xl bg-white text-red-600 text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
        Retry Sequence
      </button>
    </div>
  )
}

// ── Streaming Report ──────────────────────────────────────────────────────────
function StreamingReport() {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState('idle') // idle | pending | polling | done | error
  const [reportId, setReportId] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)
  const [progressLog, setProgressLog] = useState('')

  const stopPolling = () => { if (pollRef.current) clearInterval(pollRef.current) }

  const startPolling = useCallback((id) => {
    setStatus('polling')
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      setProgressLog(prev => prev + `\n> Pinging engine... [Attempt ${attempts}]`)
      try {
        const res = await aiService.getReport(id)
        const r = res.data
        if (r.status === 'DONE') {
          stopPolling()
          setProgressLog(prev => prev + `\n> Sequence complete. Outputting report...`)
          setTimeout(() => {
            setReportData(r.data)
            setStatus('done')
          }, 800)
        } else if (r.status === 'FAILED') {
          stopPolling()
          setError('Generation failed on backend.')
          setStatus('error')
        }
      } catch (e) {
        stopPolling()
        setError(e.response?.data?.error || 'Service unreachable.')
        setStatus('error')
      }
    }, 2500)
  }, [])

  useEffect(() => () => stopPolling(), [])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    stopPolling()
    setStatus('pending')
    setError(null)
    setReportData(null)
    setProgressLog('> Establishing handshake with compliance-ai-core-v2...\n> Encrypting request tokens...')
    try {
      const res = await aiService.generateReport(prompt)
      const { report_id } = res.data
      setReportId(report_id)
      setProgressLog(prev => prev + `\n> Handshake OK. Task ID: ${report_id}\n> Starting generative sequence...`)
      startPolling(report_id)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to initialize engine.')
      setStatus('error')
    }
  }

  const handleReset = () => {
    stopPolling()
    setStatus('idle')
    setReportData(null)
    setError(null)
    setReportId(null)
    setPrompt('')
    setProgressLog('')
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-bl-full opacity-50 -mr-10 -mt-10 transition-all group-hover:scale-110" />
        
        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Report Objectives</label>
        <textarea
          id="stream-prompt"
          rows={3}
          placeholder="e.g. Generate a comprehensive compliance summary for Q1 2025 detailing any outstanding tasks..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          disabled={status === 'pending' || status === 'polling'}
          className="w-full px-5 sm:px-8 py-5 sm:py-6 text-sm sm:text-base font-bold rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 bg-slate-50 outline-none focus:border-violet-400 focus:ring-8 focus:ring-violet-50 focus:bg-white transition-all resize-none disabled:opacity-60 mb-6 placeholder:text-slate-300"
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            id="generate-report-btn"
            onClick={handleGenerate}
            disabled={!prompt.trim() || status === 'pending' || status === 'polling'}
            className="flex-1 btn-primary !py-5 gap-3"
          >
            {(status === 'pending' || status === 'polling') ? <Spinner size="sm" /> : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {status === 'pending' ? 'Initializing…' : status === 'polling' ? 'Processing…' : 'Launch Report Engine'}
          </button>
          {status !== 'idle' && (
            <button onClick={handleReset} className="px-8 py-5 rounded-[1.5rem] border-2 border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all">
              Reset System
            </button>
          )}
        </div>
      </div>

      {/* Streaming Terminal UI */}
      {status !== 'idle' && (
        <div className="rounded-[3rem] border-4 border-slate-900 bg-[#0c1220] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-700">
          {/* Header */}
          <div className="bg-[#1a2236] px-8 py-5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-6">
              <div className="flex gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-lg shadow-rose-900/40" />
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-lg shadow-amber-900/40" />
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-900/40" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] font-mono">compliance-audit-session.log</span>
            </div>
            <div className="flex items-center gap-3">
              {(status === 'pending' || status === 'polling') && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Streaming
                </div>
              )}
            </div>
          </div>
          
          {/* Terminal Body */}
          <div className="p-6 sm:p-10 text-slate-300 font-mono text-xs sm:text-sm leading-relaxed min-h-[300px] max-h-[600px] overflow-y-auto custom-scrollbar">
            {/* Progress Log */}
            {(status === 'pending' || status === 'polling') && (
              <div className="text-emerald-500/80 mb-6 whitespace-pre-wrap">
                <TypingText text={progressLog} speed={15} />
              </div>
            )}
            
            {/* Error */}
            {status === 'error' && (
              <div className="text-rose-400 font-black p-6 bg-rose-500/10 rounded-2xl border border-rose-500/20 mt-4">
                {'>'} CRITICAL SYSTEM ERROR DETECTED<br/>
                {'>'} STATUS: {error}
              </div>
            )}
            
            {/* Result */}
            {status === 'done' && reportData && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="text-emerald-500/40 mb-8 border-b border-slate-800 pb-4">
                  {'>'} COMPILATION SUCCESSFUL<br/>
                  {'>'} RENDERING COMPLIANCE METADATA...
                </div>
                <div className="font-sans text-slate-100 bg-slate-800/20 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative">
                   <div className="absolute top-6 right-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Formal Output</div>
                   <TypingText 
                    text={typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2)} 
                    speed={5} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── CSV Export Section ────────────────────────────────────────────────────────
function CSVExportSection() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    setSuccess(false)
    try {
      const complianceService = await import('../services/complianceService')
      const res = await complianceService.exportCsv()
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `compliance-records-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (e) {
      setError(e.response?.data?.message || 'Export protocol failed.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="py-6">
      <p className="text-base font-bold text-slate-500 mb-8 max-w-xl">Generate a secure, formatted CSV export of your entire compliance ledger for external auditing or data persistence.</p>
      <button
        id="download-csv-btn"
        onClick={handleExport}
        disabled={exporting}
        className="group btn-primary !py-5 gap-4"
      >
        {exporting ? <Spinner size="sm" /> : (
          <svg className="w-5 h-5 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        {exporting ? 'Processing Export…' : 'Secure Data Export (CSV)'}
      </button>

      {success && (
        <div className="mt-8 flex items-center gap-3 text-sm text-emerald-600 font-black uppercase tracking-widest animate-in fade-in slide-in-from-left duration-500">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          Export Complete
        </div>
      )}
      {error && <ErrorAlert message={error} onRetry={handleExport} />}
    </div>
  )
}

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon, label, id }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${
        active
          ? 'bg-[#1B4F8A] text-white shadow-xl shadow-[#1B4F8A]/20 scale-105'
          : 'text-slate-400 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AIPanelPage() {
  const [tab, setTab] = useState('ask')        // ask | recommend | report | export
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [response, setResponse] = useState(null)
  const lastPrompt = useRef('')

  const handleAskAI = useCallback(async (overridePrompt) => {
    const text = overridePrompt ?? prompt
    if (!text.trim()) return
    lastPrompt.current = text
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const fn = tab === 'recommend' ? aiService.getRecommendations : aiService.askAI
      const res = await fn(text)
      setResponse(res.data)
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Cognitive service unreachable. Verify Flask runtime on port 5000.')
    } finally {
      setLoading(false)
    }
  }, [prompt, tab])

  const handleRetry = () => handleAskAI(lastPrompt.current)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAskAI()
  }

  const examplePrompts = {
    ask: [
      'GDPR compliance framework',
      'ISO 27001 key controls',
      'SOC 2 Type II summary',
    ],
    recommend: [
      'Remediation for 30-day overdue PENDING',
      'Financial compliance risk audit',
      'Efficiency roadmap: 60% to 95%',
    ],
  }

  return (
    <div className="page-shell space-y-10 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <span className="w-12 h-12 bg-[#1B4F8A] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#1B4F8A]/20">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </span>
            Cognitive Hub
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Intelligence-as-a-Service layer</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm shadow-emerald-50">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Neural Link Active</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-nowrap overflow-x-auto pb-4 sm:pb-0 gap-3 p-2 bg-slate-50 rounded-[2rem] sm:rounded-[2.5rem] w-full sm:w-fit border border-slate-100 no-scrollbar">
        <TabBtn id="tab-ask" active={tab === 'ask'} onClick={() => { setTab('ask'); setResponse(null); setError(null) }}
          label="Query Interface"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
        />
        <TabBtn id="tab-recommend" active={tab === 'recommend'} onClick={() => { setTab('recommend'); setResponse(null); setError(null) }}
          label="Optimization"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
        />
        <TabBtn id="tab-report" active={tab === 'report'} onClick={() => { setTab('report'); setResponse(null); setError(null) }}
          label="Report Stream"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <TabBtn id="tab-export" active={tab === 'export'} onClick={() => setTab('export')}
          label="Persistence"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
        />
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm min-h-[400px]">
        {/* Ask AI Tab */}
        {(tab === 'ask' || tab === 'recommend') && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
                {tab === 'ask' ? 'Neural Query' : 'System Optimization'}
              </h2>
              <p className="text-base font-bold text-slate-400">
                {tab === 'ask'
                  ? 'Input your compliance inquiries for deep-contextual analysis.'
                  : 'Identify performance bottlenecks and obtain mitigation strategies.'}
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-3 mb-8">
              {examplePrompts[tab].map(ex => (
                <button
                  key={ex}
                  onClick={() => { setPrompt(ex); setResponse(null); setError(null) }}
                  className="px-5 py-3 rounded-2xl border-2 border-violet-50 text-[10px] font-black uppercase tracking-widest text-violet-600 bg-violet-50/50 hover:bg-violet-100 transition-all hover:scale-105"
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="relative group">
              <textarea
                id="ai-prompt-input"
                rows={5}
                placeholder={tab === 'ask' ? 'Synthesizing query...' : 'Analyzing workload...'}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="w-full px-8 py-8 text-lg font-bold rounded-[2.5rem] border-2 border-slate-100 bg-slate-50 outline-none focus:border-[#1B4F8A] focus:ring-8 focus:ring-slate-100 focus:bg-white transition-all resize-none disabled:opacity-60 pr-24 placeholder:text-slate-300"
              />
              <div className="hidden sm:block absolute bottom-6 right-8 px-4 py-2 bg-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest select-none pointer-events-none group-focus-within:bg-violet-100 group-focus-within:text-violet-600 transition-colors">
                Ctrl + Enter
              </div>
            </div>

            <div className="flex items-center gap-6 mt-8">
              <button
                id="ask-ai-btn"
                onClick={() => handleAskAI()}
                disabled={!prompt.trim() || loading}
                className="btn-primary !py-5 gap-4"
              >
                {loading ? <Spinner size="sm" /> : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {loading ? 'Processing Protocol...' : tab === 'ask' ? 'Execute Query' : 'Run Diagnostics'}
              </button>
              {(response || error) && (
                <button onClick={() => { setResponse(null); setError(null); setPrompt('') }}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-800 transition-colors">
                  Clear Cache
                </button>
              )}
            </div>

            {error && <ErrorAlert message={error} onRetry={handleRetry} />}
            <AIResponseCard data={response} loading={loading} onRetry={handleRetry} />
          </div>
        )}

        {/* Report Tab */}
        {tab === 'report' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Generative Reporting</h2>
              <p className="text-base font-bold text-slate-400">Watch the compliance intelligence engine build your report in real-time.</p>
            </div>
            <StreamingReport />
          </div>
        )}

        {/* Export Tab */}
        {tab === 'export' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Data Persistence</h2>
              <p className="text-base font-bold text-slate-400">Offline synchronization of your compliance documentation.</p>
            </div>
            <CSVExportSection />
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {[
          { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Neural Latency', desc: 'Real-time processing via Groq optimized Llama models.', color: 'text-violet-600', bg: 'bg-violet-50' },
          { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Data Extraction', desc: 'Auto-categorization of complex audit logs and title analysis.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', title: 'Secure Protocol', desc: 'Enterprise-grade encryption for all AI-assisted data streams.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(c => (
          <div key={c.title} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm group hover:shadow-xl transition-all">
            <div className={`w-14 h-14 rounded-2xl ${c.bg} ${c.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={c.icon} /></svg>
            </div>
            <p className="text-lg font-black text-slate-800 tracking-tight">{c.title}</p>
            <p className="text-sm font-bold text-slate-400 mt-2 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
