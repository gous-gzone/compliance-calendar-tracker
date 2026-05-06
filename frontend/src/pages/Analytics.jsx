import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import * as complianceService from '../services/complianceService'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'

const STATUS_COLORS  = { COMPLIANT: '#10b981', NON_COMPLIANT: '#ef4444', PENDING: '#f59e0b', IN_PROGRESS: '#1B4F8A' }
const STATUS_LABELS   = { COMPLIANT: 'Compliant', NON_COMPLIANT: 'Non-Compliant', PENDING: 'Pending', IN_PROGRESS: 'Active' }

const CATEGORY_COLORS = {
  Privacy: '#8b5cf6',
  Finance: '#ec4899',
  HR: '#f97316',
  Security: '#06b6d4',
  General: '#64748b'
}

function getCategory(title = '') {
  const t = title.toLowerCase()
  if (t.includes('data') || t.includes('gdpr') || t.includes('privacy')) return 'Privacy'
  if (t.includes('tax') || t.includes('finance') || t.includes('audit')) return 'Finance'
  if (t.includes('hr') || t.includes('employee') || t.includes('train')) return 'HR'
  if (t.includes('security') || t.includes('iso') || t.includes('soc')) return 'Security'
  return 'General'
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl px-5 py-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <p className="font-black text-white uppercase tracking-widest text-[10px] mb-3 border-b border-slate-800 pb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-3 mb-1.5 last:mb-0">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <p className="font-bold flex items-center justify-between w-full min-w-[120px]">
            <span className="text-slate-400 text-xs font-medium mr-4">{p.name}</span>
            <span className="text-violet-100 text-base">{p.value}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl px-5 py-4 text-sm animate-in fade-in zoom-in duration-200">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
        <p className="font-black text-white uppercase tracking-widest text-[10px]">{payload[0].name}</p>
      </div>
      <p className="text-2xl font-black text-violet-100 leading-none">{payload[0].value} <span className="text-[10px] font-medium text-slate-500">RECORDS</span></p>
    </div>
  )
}

export default function Analytics() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [period,  setPeriod]  = useState('30days') // 7days, 30days, all

  useEffect(() => {
    setLoading(true)
    complianceService.getAll({ size: 1000 }) // Fetch large batch for client-side analysis
      .then(r => {
        const data = r.data?.content ?? (Array.isArray(r.data) ? r.data : [])
        setRecords(data)
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load analytics data.'))
      .finally(() => setLoading(false))
  }, [])

  // Process Data based on Period
  const { filteredRecords, statusData, categoryData, trendData, summary } = useMemo(() => {
    let filtered = records
    const now = new Date()

    if (period === '7days') {
      const cutoff = new Date()
      cutoff.setDate(now.getDate() - 7)
      filtered = records.filter(r => new Date(r.createdAt || r.dueDate) >= cutoff)
    } else if (period === '30days') {
      const cutoff = new Date()
      cutoff.setDate(now.getDate() - 30)
      filtered = records.filter(r => new Date(r.createdAt || r.dueDate) >= cutoff)
    }

    // 1. Status Data (Pie Chart)
    const statusCounts = {}
    filtered.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
    })
    const statusData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
      name: label,
      value: statusCounts[key] || 0,
      fill: STATUS_COLORS[key]
    })).filter(d => d.value > 0)

    // 2. Category Data (Bar Chart)
    const categoryCounts = {}
    filtered.forEach(r => {
      const cat = getCategory(r.title)
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })
    const categoryData = Object.keys(CATEGORY_COLORS).map(cat => ({
      name: cat,
      count: categoryCounts[cat] || 0,
      fill: CATEGORY_COLORS[cat]
    })).filter(d => d.count > 0)
    
    categoryData.sort((a, b) => b.count - a.count)

    // 3. Trend Data
    const trendMap = {}
    filtered.forEach(r => {
      const dateStr = (r.createdAt || r.dueDate || '').split('T')[0]
      if (dateStr) {
        if (!trendMap[dateStr]) trendMap[dateStr] = { date: dateStr, count: 0, compliant: 0 }
        trendMap[dateStr].count += 1
        if (r.status === 'COMPLIANT') trendMap[dateStr].compliant += 1
      }
    })
    const trendData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date))

    // 4. Summary Stats
    const total = filtered.length
    const compliant = filtered.filter(r => r.status === 'COMPLIANT').length
    const nonCompliant = filtered.filter(r => r.status === 'NON_COMPLIANT').length
    const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0

    return { filteredRecords: filtered, statusData, categoryData, trendData, summary: { total, compliant, nonCompliant, complianceRate } }
  }, [records, period])

  if (loading && records.length === 0) {
    return (
      <div className="page-shell space-y-8">
        <LoadingSkeleton type="grid" />
        <LoadingSkeleton type="detail" />
      </div>
    )
  }

  return (
    <div className="page-shell space-y-12 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      {/* Header & Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-200 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-slate-100 text-[#1B4F8A] rounded-full text-[9px] font-black uppercase tracking-widest">Intelligence Node: Online</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Performance Hub</h1>
          <p className="text-sm sm:text-base font-semibold text-slate-500">Granular analysis of regulatory lifecycle and response metrics.</p>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {[
            { id: '7days', label: '7D' },
            { id: '30days', label: '30D' },
            { id: 'all', label: '∞' }
          ].map(p => (
            <button 
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${period === p.id ? 'bg-[#1B4F8A] text-white shadow-lg shadow-[#1B4F8A]/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl text-red-700 font-bold text-center">
          {error}
        </div>
      )}

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
        {[
          { label: 'Total Audits',    value: summary.total,       color: 'text-[#1B4F8A]', bg: 'bg-slate-50', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
          { label: 'Compliant',        value: summary.compliant,   color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Failing Items',    value: summary.nonCompliant, color: 'text-rose-600', bg: 'bg-rose-50', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
          { label: 'Health Score',  value: `${summary.complianceRate}%`, color: 'text-slate-700',  bg: 'bg-slate-100', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} className="glass-card rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 group hover:-translate-y-2 transition-all duration-500 overflow-hidden relative">
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${bg} opacity-20 rounded-full blur-3xl group-hover:scale-150 transition-transform`} />
            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${bg} ${color} flex items-center justify-center mb-4 sm:mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
              <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={icon} /></svg>
            </div>
            <p className={`text-3xl sm:text-5xl font-black tracking-tighter leading-none ${color}`}>{value ?? 0}</p>
            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 sm:mt-4">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Trend Over Time (Area Chart) */}
        <div className="lg:col-span-2 glass-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col h-[400px] sm:h-[550px]">
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Timeline Analysis</h2>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Daily registration & event volume metrics</p>
          </div>
          
          <div className="flex-1 min-h-0 w-full"> {/* Fixed: min-h-0 for ResponsiveContainer */}
            {trendData.length === 0 ? (
              <EmptyState title="No trend data" message="We need more historical data to generate this timeline visualization." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="8 8" stroke="#f8fafc" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 900 }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={15} 
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 900 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    name="Audit Volume" 
                    stroke="#1B4F8A" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#1B4F8A' }} 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Breakdown (Pie Chart) */}
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 p-6 sm:p-10 shadow-sm flex flex-col">
          <div className="mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Status Balance</h2>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Current state distribution</p>
          </div>
          
          <div className="flex-1 min-h-[250px] sm:min-h-[350px] flex items-center justify-center relative">
            {statusData.length === 0 ? (
               <EmptyState title="No status data" message="Current filter returned zero status records." />
            ) : (
              <>
                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{summary.total}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Items</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={85}
                      outerRadius={115}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                      animationBegin={500}
                      animationDuration={1500}
                    >
                      {statusData.map(entry => <Cell key={entry.name} fill={entry.fill} className="hover:opacity-80 transition-all cursor-pointer" />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-6">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest truncate">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown (Bar Chart) */}
        <div className="lg:col-span-3 bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 p-6 sm:p-10 shadow-sm flex flex-col">
          <div className="mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Domain Analysis</h2>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Thematic record distribution</p>
          </div>
          
          <div className="flex-1 min-h-[300px] sm:min-h-[400px]">
            {categoryData.length === 0 ? (
              <EmptyState title="No domains found" message="Add records with descriptive titles to see domain-based categorization." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barSize={64}>
                  <CartesianGrid strokeDasharray="8 8" stroke="#f8fafc" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={15} 
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 16 }} />
                  <Bar dataKey="count" name="Domain Strength" radius={[16, 16, 4, 4]} animationDuration={1800}>
                    {categoryData.map(entry => <Cell key={entry.name} fill={entry.fill} className="hover:scale-y-105 origin-bottom transition-transform" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
