import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as complianceService from '../services/complianceService'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import {
  STATUS_OPTIONS, PRIORITY_OPTIONS, formatDateForInput,
} from '../utils/helpers'

const EMPTY = { title: '', status: 'PENDING', dueDate: '', priority: 'MEDIUM', description: '' }

function validate(form) {
  const errs = {}
  if (!form.title.trim())   errs.title    = 'Title is required.'
  if (!form.status)         errs.status   = 'Status is required.'
  if (!form.priority)       errs.priority = 'Priority is required.'
  if (!form.dueDate) {
    errs.dueDate = 'Due date is required.'
  } else {
    const d = new Date(form.dueDate)
    if (isNaN(d.getTime())) errs.dueDate = 'Enter a valid date.'
  }
  return errs
}

export default function ComplianceForm() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const isEdit    = Boolean(id)

  const [form, setForm]       = useState(EMPTY)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [apiError, setApiError] = useState('')

  // Load existing record when editing
  useEffect(() => {
    if (!isEdit) return
    setFetching(true)
    complianceService.getById(id)
      .then(r => {
        const d = r.data
        setForm({
          title:       d.title       ?? '',
          status:      d.status      ?? 'PENDING',
          dueDate:     formatDateForInput(d.dueDate),
          priority:    d.priority    ?? 'MEDIUM',
          description: d.description ?? '',
        })
      })
      .catch(() => setApiError('Failed to load record.'))
      .finally(() => setFetching(false))
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { 
      setErrors(errs)
      toast.error('Please fix the errors in the form.')
      return 
    }

    setLoading(true)
    setApiError('')
    
    const submitPromise = isEdit 
      ? complianceService.update(id, form) 
      : complianceService.create(form)
    
    toast.promise(submitPromise, {
      loading: isEdit ? 'Updating record...' : 'Creating record...',
      success: isEdit ? 'Record updated successfully' : 'Record created successfully',
      error: (err) => err.response?.data?.message || 'Submission failed',
    })

    try {
      await submitPromise
      navigate('/compliance')
    } catch (err) {
      setApiError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="page-shell max-w-2xl mx-auto">
        <LoadingSkeleton type="form" />
      </div>
    )
  }

  if (apiError && !form.title && isEdit) {
    return (
      <div className="page-shell max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <EmptyState 
          title="Failed to load record"
          message={apiError}
          icon={
            <svg className="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          action={{ label: "Go Back", onClick: () => navigate('/compliance') }}
        />
      </div>
    )
  }

  return (
    <div className="page-shell max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/compliance')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">{isEdit ? 'Edit Record' : 'Create Record'}</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{isEdit ? 'Update existing documentation' : 'Add new compliance entry'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">

          {/* Title */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block" htmlFor="title">
              Record Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className={`form-input py-4 px-5 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-semibold ${errors.title ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
              placeholder="e.g. GDPR Data Privacy Audit"
              value={form.title}
              onChange={handleChange}
            />
            {errors.title && (
              <p className="form-error mt-2 flex items-center gap-1.5 text-red-500 font-bold text-[10px] uppercase tracking-widest">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block" htmlFor="description">Executive Summary</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="form-input py-4 px-5 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-semibold resize-none"
              placeholder="Provide a detailed overview of this compliance item..."
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block" htmlFor="status">
                Current Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                name="status"
                className={`form-select py-4 px-5 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-semibold ${errors.status ? 'border-red-400' : ''}`}
                value={form.status}
                onChange={handleChange}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block" htmlFor="priority">
                Criticality Level <span className="text-red-500">*</span>
              </label>
              <select
                id="priority"
                name="priority"
                className={`form-select py-4 px-5 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-semibold ${errors.priority ? 'border-red-400' : ''}`}
                value={form.priority}
                onChange={handleChange}
              >
                {PRIORITY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block" htmlFor="dueDate">
              Deadline <span className="text-red-500">*</span>
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              className={`form-input py-4 px-5 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white transition-all text-sm font-semibold ${errors.dueDate ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
              value={form.dueDate}
              onChange={handleChange}
            />
            {errors.dueDate && <p className="form-error mt-2 font-bold text-[10px] uppercase tracking-widest text-red-500">{errors.dueDate}</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button type="submit" className="btn-primary w-full sm:flex-1 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-violet-100 hover:scale-[1.02] active:scale-95 transition-all" disabled={loading}>
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing
                </div>
              ) : (
                isEdit ? 'Update Record' : 'Confirm & Create'
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/compliance')}
              className="btn-secondary w-full sm:w-auto px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
