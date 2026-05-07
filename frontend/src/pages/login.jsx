import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Identity credentials required')
      return
    }

    setLoading(true)
    const loadToast = toast.loading('Authenticating credentials...')
    try {
      await login(email, password)
      toast.success('Access granted', { id: loadToast })
      navigate('/dashboard')
    } catch (err) {
      console.error('Login Protocol Error:', err);
      console.error('Error Details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      const data = err.response?.data
      const apiMessage = typeof data === 'object'
        ? data?.message || Object.values(data?.errors ?? {})[0]
        : data
      toast.error(apiMessage || 'Protocol rejection: Invalid credentials', { id: loadToast })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-8 animate-in fade-in duration-700">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl p-10 sm:p-16 border border-slate-200 shadow-xl shadow-slate-200/50">
          
          <div className="flex flex-col items-center text-center mb-12">
            <div className="w-16 h-16 bg-[#1B4F8A] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1B4F8A]/20 mb-6">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Platform Access</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">v4.2 Secure Production Node</p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1" htmlFor="email">Work Identity</label>
            <input
              id="email"
              type="email"
              className="form-input !py-4 !px-6 !rounded-2xl"
              placeholder="e.g. operator@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1" htmlFor="password">Access Protocol</label>
            <input
              id="password"
              type="password"
              className="form-input !py-4 !px-6 !rounded-2xl"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary w-full !py-4 !rounded-2xl !text-sm uppercase tracking-widest mt-4" disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Validating...</span>
              </div>
            ) : 'Authenticate Credentials'}
          </button>
        </form>

        <div className="mt-10 text-center border-t border-slate-100 pt-8">
          <p className="text-xs font-bold text-slate-500">
            Unauthorized?{' '}
            <Link to="/register" className="text-[#1B4F8A] hover:underline transition-all">
              Request New Credentials
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6 opacity-60">
        {['SSL Secure', '256-bit AES', 'Node-Level Auth'].map(inf => (
          <span key={inf} className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{inf}</span>
        ))}
      </div>
    </div>
  </div>
  )
}
