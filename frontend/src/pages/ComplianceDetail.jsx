import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as complianceService from '../services/complianceService'
import { StatusBadge, PriorityBadge } from '../components/StatusBadge'
import { formatDate, isOverdue } from '../utils/helpers'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'

// ── Typing effect hook ────────────────────────────────────────────────────────
function useTypingEffect(text, speed = 12) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) { setDisplayed(''); setDone(false); return }
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(interval); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return { displayed, done }
}

// ── Parse AI text into structured sections ────────────────────────────────────
function parseAiSections(text) {
  if (!text) return []
  const lines = text.split('\n').filter(l => l.trim())
  const sections = []
  let current = null

  for (const line of lines) {
    const trimmed = line.trim()
    // Detect numbered headings like "1) Risk assessment" or "1. Risk"
    const headingMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/)
    if (headingMatch) {
      if (current) sections.push(current)
      current = { heading: headingMatch[2], bullets: [] }
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      if (!current) current = { heading: 'Analysis', bullets: [] }
      current.bullets.push(trimmed.replace(/^[•\-*]\s*/, ''))
    } else if (trimmed.length > 0) {
      if (!current) current = { heading: 'Analysis', bullets: [] }
      current.bullets.push(trimmed)
    }
  }
  if (current) sections.push(current)
  return sections.length > 0 ? sections : [{ heading: 'AI Analysis', bullets: [text] }]
}

// ── Section icons ─────────────────────────────────────────────────────────────
const SECTION_ICONS = {
  0: { bg: 'bg-red-50',     icon: 'text-red-500',     path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  1: { bg: 'bg-blue-50',    icon: 'text-blue-500',    path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  2: { bg: 'bg-emerald-50', icon: 'text-emerald-500', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  3: { bg: 'bg-amber-50',   icon: 'text-amber-500',   path: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
}

// ── AI Structured Output ──────────────────────────────────────────────────────
function AiStructuredOutput({ text }) {
  const { displayed, done } = useTypingEffect(text, 8)
  const sections = parseAiSections(displayed)

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const style = SECTION_ICONS[idx] ?? SECTION_ICONS[3]
        return (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                <svg className={`w-4 h-4 ${style.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={style.path} />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-slate-800">{section.heading}</h4>
            </div>
            <ul className="space-y-1.5">
              {section.bullets.map((bullet, bi) => (
                <li key={bi} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B4F8A] flex-shrink-0 mt-1.5" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {!done && (
        <div className="flex items-center gap-1.5 px-2 py-1">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#1B4F8A] animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-4 border-b border-slate-50 last:border-0 group transition-colors">
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest sm:w-40 flex-shrink-0 pt-1 group-hover:text-slate-500 transition-colors">
        {label}
      </span>
      <div className="flex-1 text-sm font-semibold text-slate-800 leading-relaxed">{children}</div>
    </div>
  )
}

// ── AI Status indicator ───────────────────────────────────────────────────────
function AiStatusBadge({ status }) {
  if (!status) return null
  const map = {
    success:  { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Live AI' },
    fallback: { cls: 'bg-amber-50 text-amber-700 ring-amber-200',       label: 'Fallback Mode' },
    offline:  { cls: 'bg-slate-100 text-slate-600 ring-slate-200',      label: 'Offline Mode' },
  }
  const s = map[status] ?? map.offline
  return (
    <span className={`badge text-[10px] ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ComplianceDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [record,    setRecord]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [deleting,  setDeleting]  = useState(false)

  const [aiText,    setAiText]    = useState('')
  const [aiStatus,  setAiStatus]  = useState(null)   // 'success' | 'fallback' | 'offline'
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError,   setAiError]   = useState('')
  const [aiAsked,   setAiAsked]   = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const aiRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    complianceService.getById(id)
      .then(r => setRecord(r.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load record.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${record?.title}"?\nThis cannot be undone.`)) return
    
    setDeleting(true)
    const deletePromise = complianceService.remove(id)
    
    toast.promise(deletePromise, {
      loading: 'Deleting record...',
      success: 'Record deleted successfully',
      error: (err) => err.response?.data?.message || 'Delete failed',
    })

    try {
      await deletePromise
      navigate('/compliance')
    } catch (err) {
      setDeleting(false)
    }
  }

  const handleAskAi = async () => {
    setAiAsked(true)
    setAiLoading(true)
    setAiError('')
    setAiText('')
    setAiStatus(null)
    // Scroll to AI panel
    setTimeout(() => aiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    try {
      const res = await complianceService.getAiAnalysis(id)
      const data = res.data
      setAiText(data?.analysis ?? data?.result ?? data?.description ?? JSON.stringify(data, null, 2))
      setAiStatus(data?.status ?? 'success')
      setRetryCount(0)
    } catch (err) {
      const msg = err.response?.data?.message || 'AI analysis failed. Please try again.'
      setAiError(msg)
      setRetryCount(c => c + 1)
    } finally {
      setAiLoading(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="page-shell max-w-4xl mx-auto">
        <LoadingSkeleton type="detail" />
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="page-shell max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <EmptyState 
          title="Record not found"
          message={error}
          icon={
            <svg className="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          action={{ label: "Back to List", onClick: () => navigate('/compliance') }}
        />
      </div>
    )
  }

  const overdue = isOverdue(record.dueDate) && record.status !== 'COMPLIANT'

  return (
    <div className="page-shell max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between border-b border-slate-100 pb-8">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/compliance')} className="p-3 bg-white border border-slate-200 rounded-2xl text-[#1B4F8A] hover:bg-slate-50 transition-all shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight truncate">{record.title}</h1>
              <StatusBadge status={record.status} size="lg" />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
              <span>Record ID: #{record.id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <PriorityBadge priority={record.priority} />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/compliance/${id}/edit`)} className="btn-secondary px-6 !py-3 shadow-sm">
            <svg className="w-4 h-4 mr-2 text-[#1B4F8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Record
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger px-6 !py-3 shadow-lg shadow-red-100">
            {deleting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Standard Information
            </h2>
            <div className="space-y-1">
              <DetailRow label="Title">{record.title}</DetailRow>
              <DetailRow label="Due Date">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-black ${overdue ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatDate(record.dueDate)}
                  </span>
                  {overdue && <span className="bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest animate-pulse border border-red-100">Overdue Task</span>}
                </div>
              </DetailRow>
              <DetailRow label="Description">
                <p className="text-slate-600 leading-relaxed font-medium">
                  {record.description || "No description provided for this compliance record."}
                </p>
              </DetailRow>
              <DetailRow label="Meta Information">
                <div className="flex flex-col gap-2 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-2">Created on {formatDate(record.createdAt)}</span>
                  <span className="flex items-center gap-2">Last updated {formatDate(record.updatedAt)}</span>
                </div>
              </DetailRow>
            </div>
          </div>

          {/* AI Analysis Integration */}
          <div ref={aiRef} className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm border-l-4 border-l-[#1B4F8A]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4F8A] flex items-center justify-center shadow-lg shadow-[#1B4F8A]/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Expert AI Analysis</h2>
                    <AiStatusBadge status={aiStatus} />
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Neural Analysis Engine</p>
                </div>
              </div>

              {!aiLoading && (
                <button
                  onClick={handleAskAi}
                  className="btn-primary px-6 !py-3 shadow-lg shadow-[#1B4F8A]/10"
                >
                  {aiAsked ? 'Regenerate' : 'Run Analysis'}
                </button>
              )}
            </div>

            {aiLoading ? (
              <div className="space-y-6">
                <div className="bg-violet-50 p-6 rounded-2xl border border-violet-100 flex items-center gap-4 animate-pulse">
                  <div className="flex gap-1.5">
                    {[0,1,2].map(i => <div key={i} className="w-3 h-3 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: `${i*200}ms`}} />)}
                  </div>
                  <span className="text-violet-700 font-black uppercase tracking-widest text-xs">AI is processing record...</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-50 rounded-2xl animate-pulse" />)}
                </div>
              </div>
            ) : aiError ? (
              <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center">
                <p className="text-red-700 font-bold mb-4">{aiError}</p>
                <button onClick={handleAskAi} className="btn-secondary border-red-200 text-red-700">↻ Retry Analysis</button>
              </div>
            ) : aiText ? (
              <AiStructuredOutput text={aiText} />
            ) : (
              <div className="bg-slate-50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
                <p className="text-slate-500 font-semibold mb-2">Needs analysis? We're ready.</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Click the button above to generate a deep-dive analysis of risk levels, action items, and score predictions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Score & Priority */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm text-center">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Compliance Score</h2>
            <div className="relative inline-flex items-center justify-center mb-6">
               <svg className="w-32 h-32 transform -rotate-90">
                 <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                 <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" 
                    strokeDasharray={364.4}
                    strokeDashoffset={364.4 - (364.4 * (record.score || 0)) / 100}
                    className={`${(record.score || 0) >= 80 ? 'text-emerald-500' : (record.score || 0) >= 50 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                    strokeLinecap="round"
                 />
               </svg>
               <div className="absolute flex flex-col">
                  <span className="text-4xl font-black text-slate-800 tracking-tighter">{record.score || 0}%</span>
               </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Confidence Rating</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Execution Priority</h2>
            <div className="space-y-4">
              {['HIGH', 'MEDIUM', 'LOW'].map(p => (
                <div key={p} className={`p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${record.priority === p ? 'bg-slate-800 border-slate-800 shadow-xl shadow-slate-200' : 'bg-white border-slate-50 opacity-40'}`}>
                  <span className={`text-xs font-black tracking-widest ${record.priority === p ? 'text-white' : 'text-slate-400'}`}>{p}</span>
                  {record.priority === p && (
                    <div className="w-2 h-2 rounded-full bg-[#1B4F8A] shadow-lg shadow-[#1B4F8A]/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
