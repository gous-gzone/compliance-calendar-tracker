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
    <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-8 animate-in fade-in duration-700">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl p-10 sm:p-16 border border-slate-200 shadow-xl shadow-slate-200/50">
          
          <div className="flex flex-col items-center text-center mb-12">
            <div className="w-16 h-16 bg-[#1B4F8A] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1B4F8A]/20 mb-6">
              <span className="text-3xl font-black text-white italic">C</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Request Access</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Initialize your enterprise identity</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1" htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input !py-4 !px-6 !rounded-2xl"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1" htmlFor="email">Work Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input !py-4 !px-6 !rounded-2xl"
                placeholder="identity@organization.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1" htmlFor="password">Passcode</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-input !py-4 !px-6 !rounded-2xl"
                  placeholder="Min. 6"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1" htmlFor="confirmPassword">Verify</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="form-input !py-4 !px-6 !rounded-2xl"
                  placeholder="••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full !py-4 !rounded-2xl !text-sm uppercase tracking-widest mt-4" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : 'Execute Initialization'}
            </button>
          </form>

          <div className="mt-10 text-center border-t border-slate-100 pt-8">
            <p className="text-xs font-bold text-slate-500">
              Existing Account?{' '}
              <Link to="/login" className="text-[#1B4F8A] hover:underline transition-all">
                Return to Authorization
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

