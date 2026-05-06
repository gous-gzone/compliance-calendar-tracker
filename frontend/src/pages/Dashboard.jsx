import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import * as complianceService from '../services/complianceService'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate, isOverdue } from '../utils/helpers'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, loading }) {
  return (
    <div className="glass-card rounded-4xl p-8 group hover:-translate-y-2 transition-all duration-500 overflow-hidden relative animate-in fade-in zoom-in">
      <div className={`absolute -top-10 -right-10 w-32 h-32 ${color.split(' ')[0]} opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform`} />
      <div className="flex items-center gap-6 relative z-10">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${color} shadow-lg group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div>
          {loading
            ? <div className="h-10 w-24 bg-slate-50 rounded-xl animate-pulse" />
            : <p className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{value ?? 0}</p>
          }
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl px-5 py-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <p className="font-black text-white uppercase tracking-widest text-[10px] mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-violet-400" />
        <p className="text-violet-100 font-bold text-lg leading-none">{payload[0].value} <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Records</span></p>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const BAR_COLORS = {
  COMPLIANT:     '#10b981',
  NON_COMPLIANT: '#ef4444',
  PENDING:       '#f59e0b',
  IN_PROGRESS:   '#1B4F8A',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats]       = useState(null)
  const [recent, setRecent]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [recLoading, setRecLoading] = useState(true)

  useEffect(() => {
    complianceService.getStats()
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))

    complianceService.getAll({ page: 0, size: 5, sortBy: 'dueDate', sortDir: 'asc' })
      .then(r => {
        const data = r.data?.content ?? (Array.isArray(r.data) ? r.data : [])
        setRecent(data)
      })
      .catch(() => setRecent([]))
      .finally(() => setRecLoading(false))
  }, [])

  const kpis = [
    {
      label: 'Total Records',
      value: stats?.total,
      color: 'bg-slate-50 text-[#1B4F8A]',
      icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    },
    {
      label: 'Compliant',
      value: stats?.compliant,
      color: 'bg-emerald-50 text-emerald-600',
      icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: 'Pending Tasks',
      value: stats?.pending,
      color: 'bg-amber-50 text-amber-600',
      icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: 'Critical Overdue',
      value: stats?.overdue,
      color: 'bg-red-50 text-red-600',
      icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    },
  ]

  const chartData = stats?.byStatus
    ? Object.entries(stats.byStatus).map(([name, count]) => ({ name, count }))
    : [
        { name: 'COMPLIANT',     count: stats?.compliant ?? 0 },
        { name: 'NON_COMPLIANT', count: stats?.nonCompliant ?? 0 },
        { name: 'PENDING',       count: stats?.pending ?? 0 },
        { name: 'IN_PROGRESS',   count: stats?.inProgress ?? 0 },
      ]

  const chartLabels = {
    COMPLIANT: 'Compliant', NON_COMPLIANT: 'Failed',
    PENDING: 'Pending', IN_PROGRESS: 'Active',
  }

  if (loading && recLoading && recent.length === 0) {
    return (
      <div className="page-shell space-y-8">
        <div className="h-10 bg-slate-200 rounded-xl w-48 animate-pulse" />
        <LoadingSkeleton type="grid" />
        <LoadingSkeleton type="list" />
      </div>
    )
  }

  return (
    <div className="page-shell space-y-12 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1B4F8A] animate-pulse" />
            <span className="text-[10px] font-black text-[#1B4F8A] uppercase tracking-widest">Node Active: Production</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Command Center</h1>
          <p className="text-sm sm:text-base font-semibold text-slate-500">Unified view of regulatory performance and corporate risk vectors.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           <button onClick={() => navigate('/ai')} className="btn-secondary flex-1 sm:flex-none gap-2 group">
             <svg className="w-5 h-5 group-hover:rotate-12 transition-transform text-[#1B4F8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             <span className="uppercase tracking-widest">AI Agent</span>
           </button>
           <button onClick={() => navigate('/compliance/new')} className="btn-primary flex-1 sm:flex-none whitespace-nowrap">
             + New Document
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpis.map(k => (
          <KpiCard key={k.label} {...k} loading={loading} />
        ))}
      </div>

      {/* Grid: Chart + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Status Distribution */}
        <div className="lg:col-span-2 glass-card rounded-[3rem] p-10 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Status Distribution</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Categorical record breakdown</p>
            </div>
            <div className="flex gap-2">
               {['COMPLIANT', 'PENDING', 'NON_COMPLIANT'].map(s => (
                 <div key={s} className="flex items-center gap-2 px-4 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BAR_COLORS[s] }} />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{chartLabels[s] || s}</span>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-0"> {/* Fixed: min-h-0 for ResponsiveContainer */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={64} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="12 12" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickFormatter={n => chartLabels[n] ?? n}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }}
                  axisLine={false}
                  tickLine={false}
                  dy={15}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 24 }} />
                <Bar dataKey="count" radius={[24, 24, 8, 8]} animationDuration={2000}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={BAR_COLORS[entry.name] ?? '#818cf8'}
                      className="transition-all hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progress Card */}
        <div className="glass-card rounded-[3rem] p-10 shadow-sm flex flex-col justify-between h-[500px]">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Compliance Health</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Relative performance index</p>
          </div>

          <div className="space-y-10 my-10">
            {[
              { label: 'Audit Accuracy', value: stats?.compliant ?? 0,    total: stats?.total ?? 1, color: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-100' },
              { label: 'Backlog Load',      value: stats?.pending ?? 0,      total: stats?.total ?? 1, color: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-100'   },
              { label: 'Critical Risk',   value: stats?.nonCompliant ?? 0, total: stats?.total ?? 1, color: 'from-rose-500 to-rose-700', shadow: 'shadow-rose-100'     },
            ].map(({ label, value, total, color, shadow }) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0
              return (
                <div key={label} className="group">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{label}</span>
                    <span className="text-2xl font-black text-slate-900 leading-none">{pct}%</span>
                  </div>
                  <div className="h-5 bg-slate-50 rounded-2xl p-1 border border-slate-100">
                    <div
                      className={`h-full rounded-xl bg-gradient-to-r transition-all duration-1000 ease-out ${color} ${shadow} shadow-lg`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => navigate('/compliance')}
            className="btn-primary w-full"
          >
            Review Audit Logs
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Recent Activity</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Latest system updates</p>
          </div>
          <button
            onClick={() => navigate('/compliance')}
            className="group px-6 py-3 rounded-2xl bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:bg-slate-100 hover:text-slate-800 transition-all"
          >
            Explore Library <span className="inline-block transition-transform group-hover:translate-x-1 ml-1">→</span>
          </button>
        </div>
        
        <div className="block md:hidden divide-y divide-slate-50">
          {recent.map((rec, idx) => {
            const overdue = isOverdue(rec.dueDate) && rec.status !== 'COMPLIANT'
            return (
              <div 
                key={rec.id} 
                onClick={() => navigate(`/compliance/${rec.id}`)}
                className="p-6 space-y-4 active:bg-slate-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-mono text-[10px]">#{rec.id}</div>
                    <p className="font-black text-slate-800 tracking-tight leading-tight">{rec.title}</p>
                  </div>
                  <StatusBadge status={rec.status} size="sm" />
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <div className="flex flex-col gap-1">
                    <span>Deadline</span>
                    <span className={overdue ? 'text-red-500' : 'text-slate-600'}>{formatDate(rec.dueDate)}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span>Priority</span>
                    <span className={rec.priority === 'HIGH' ? 'text-red-500' : 'text-slate-600'}>{rec.priority}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
          {recent.length === 0 && !recLoading ? (
            <div className="py-20">
              <EmptyState 
                title="No recent activity"
                message="You haven't added any compliance records yet. Your latest activity will appear here."
                action={{ label: "Add Your First Record", onClick: () => navigate('/compliance/new') }}
              />
            </div>
          ) : (
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50/50">
                <tr>
                  {['Compliance Item', 'Status', 'Execution Date', 'Criticality'].map(h => (
                    <th key={h} className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recent.map((rec, idx) => {
                  const overdue = isOverdue(rec.dueDate) && rec.status !== 'COMPLIANT'
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => navigate(`/compliance/${rec.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-all group animate-in fade-in slide-in-from-left duration-500"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-mono text-xs group-hover:bg-white transition-colors">
                             #{rec.id}
                           </div>
                           <p className="text-base font-black text-slate-800 tracking-tight group-hover:text-primary-600 transition-colors truncate max-w-[300px]">{rec.title}</p>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <StatusBadge status={rec.status} />
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex flex-col">
                           <span className={`text-sm font-bold ${overdue ? 'text-red-500' : 'text-slate-600'}`}>
                             {formatDate(rec.dueDate)}
                           </span>
                           {overdue && <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-1">Critical Overdue</span>}
                        </div>
                      </td>
                      <td className="px-10 py-7">
                         <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${rec.priority === 'HIGH' ? 'bg-red-500' : rec.priority === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{rec.priority ?? 'STANDARD'}</span>
                         </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
