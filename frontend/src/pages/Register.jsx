import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as authService from '../services/authService'
import toast from 'react-hot-toast'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.name || !form.email || !form.password) {
       toast.error('All initialization fields required')
       return
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Credential mismatch: Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Policy violation: Password too short')
      return
    }

    setLoading(true)
    const loadToast = toast.loading('Initializing secure account...')
    try {
      await authService.register(form.name, form.email, form.password)
      toast.success('Registration successful! Please login with your credentials.', { id: loadToast })
      navigate('/login')
    } catch (err) {
      console.error('Registration Protocol Error:', err);
      console.error('Error Details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      const data = err.response?.data
      const apiMessage = typeof data === 'object'
        ? data?.message || Object.values(data?.errors ?? {})[0]
        : data
      toast.error(apiMessage || 'System rejection: Registration failed', { id: loadToast })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-800 to-primary-950 flex items-center justify-center p-6 animate-in fade-in duration-1000">
      <div className="w-full max-w-xl">
        <div className="glass-card-dark rounded-[4rem] p-12 sm:p-20 relative overflow-hidden group">
          {/* Decorative Elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
          
          <div className="flex flex-col items-center text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-accent-purple rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-500/20 rotate-6 mb-8 group-hover:rotate-12 transition-transform duration-500">
              <span className="text-4xl font-black text-white italic">R</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Initialize</h1>
            <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.4em]">Create System Identity</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10" noValidate>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-6" htmlFor="name">Full Identity Name</label>
              <input
                id="name"
                name="name"
                type="text"
                className="w-full px-8 py-5 rounded-4xl bg-white/5 border-2 border-white/10 text-white outline-none focus:border-primary-500 focus:bg-white/10 transition-all font-bold placeholder:text-slate-600"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-6" htmlFor="email">Email Identifier</label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full px-8 py-5 rounded-4xl bg-white/5 border-2 border-white/10 text-white outline-none focus:border-primary-500 focus:bg-white/10 transition-all font-bold placeholder:text-slate-600"
                placeholder="identity@organization.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-6" htmlFor="password">Passcode</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="w-full px-8 py-5 rounded-4xl bg-white/5 border-2 border-white/10 text-white outline-none focus:border-primary-500 focus:bg-white/10 transition-all font-bold placeholder:text-slate-600"
                  placeholder="Min. 6"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-6" htmlFor="confirmPassword">Verify</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="w-full px-8 py-5 rounded-4xl bg-white/5 border-2 border-white/10 text-white outline-none focus:border-primary-500 focus:bg-white/10 transition-all font-bold placeholder:text-slate-600"
                  placeholder="••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-vibrant w-full py-8 !text-sm shadow-2xl shadow-primary-900/40" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Initializing...</span>
                </div>
              ) : 'Execute Initialization'}
            </button>
          </form>

          <div className="mt-12 text-center relative border-t border-white/5 pt-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Existing Account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-500 transition-colors">
                Return to Authorization
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

