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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-800 to-primary-950 flex items-center justify-center p-6 animate-in fade-in duration-1000">
      <div className="w-full max-w-xl">
        <div className="glass-card-dark rounded-[4rem] p-12 sm:p-20 relative overflow-hidden group">
          {/* Decorative Elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
          
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-accent-purple rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-500/20 rotate-6 mb-8 group-hover:rotate-12 transition-transform duration-500">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Compliance</h1>
            <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.4em]">v4.2 Production Portal</p>
          </div>

        <form onSubmit={handleSubmit} className="mt-12 space-y-10 relative z-10" noValidate>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-6" htmlFor="email">Identity Identifier</label>
            <input
              id="email"
              type="email"
              className="w-full px-8 py-6 rounded-4xl bg-white/5 border-2 border-white/10 text-white outline-none focus:border-primary-500 focus:bg-white/10 transition-all font-bold placeholder:text-slate-600"
              placeholder="operator@system.node"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-6" htmlFor="password">Security Protocol</label>
            <input
              id="password"
              type="password"
              className="w-full px-8 py-6 rounded-4xl bg-white/5 border-2 border-white/10 text-white outline-none focus:border-primary-500 focus:bg-white/10 transition-all font-bold placeholder:text-slate-600"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-vibrant w-full py-8 !text-sm shadow-2xl shadow-primary-900/40" disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </div>
            ) : 'Initiate Session'}
          </button>
        </form>

        <div className="mt-12 text-center relative border-t border-slate-50 pt-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Awaiting credentials?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 transition-colors">
              Initialize Account
            </Link>
          </p>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-10 flex items-center justify-center gap-8 opacity-40">
        {['Security Node 1', 'SSL Encrypted', 'Auth v4.0'].map(inf => (
          <span key={inf} className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{inf}</span>
        ))}
      </div>
    </div>
  </div>
  )
}
