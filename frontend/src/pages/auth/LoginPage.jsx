import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const ADMIN_CONTACT = {
  email: 'admin@luckysupermarket.com',
  phone: '+66 81-234-5678',
}

const LoginPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const contactRef = useRef(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contactRef.current && !contactRef.current.contains(e.target)) {
        setShowContact(false)
      }
    }
    if (showContact) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showContact])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login({ username, password })
      toast.success(`Welcome back, ${user.name}!`)
      if (user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/staff/dashboard')
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #7f0000 0%, #b91c1c 40%, #dc2626 70%, #991b1b 100%)' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 60%)' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 mb-4">
            <img src="/lucky-logo.png" alt="Lucky Supermarket" className="w-28 h-28 object-contain drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow">Job Assign</h1>
          <p className="text-red-200 mt-1 text-sm tracking-wide">Management System</p>
        </div>

        <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-red-100 mb-1.5">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 03593"
                required
                autoComplete="username"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/25 rounded-lg text-white placeholder-red-300/60 focus:outline-none focus:ring-2 focus:ring-white/60 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-red-100 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/25 rounded-lg text-white placeholder-red-300/60 focus:outline-none focus:ring-2 focus:ring-white/60 focus:border-transparent text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-white hover:bg-red-50 disabled:opacity-60 text-red-700 font-semibold py-2.5 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1 shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/15 text-center">
            <p className="text-xs text-red-200/70">
              Forgot password? Please contact to{' '}
              <span className="relative inline-block" ref={contactRef}>
                <button
                  type="button"
                  onClick={() => setShowContact((v) => !v)}
                  className="text-white font-medium underline underline-offset-2 decoration-white/40 hover:decoration-white transition-all focus:outline-none"
                >
                  Administrator
                </button>

                {showContact && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    {/* Arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white/20 border-r border-b border-white/30 backdrop-blur-md" />
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-4 shadow-2xl text-left">
                      <p className="text-white font-semibold text-xs mb-3 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin Contact
                      </p>
                      <div className="space-y-2">
                        <a
                          href={`mailto:${ADMIN_CONTACT.email}`}
                          className="flex items-center gap-2.5 text-white/90 hover:text-white transition-colors group"
                        >
                          <span className="flex-shrink-0 w-6 h-6 bg-white/15 group-hover:bg-white/25 rounded-md flex items-center justify-center transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <span className="text-xs truncate">{ADMIN_CONTACT.email}</span>
                        </a>
                        <a
                          href={`tel:${ADMIN_CONTACT.phone}`}
                          className="flex items-center gap-2.5 text-white/90 hover:text-white transition-colors group"
                        >
                          <span className="flex-shrink-0 w-6 h-6 bg-white/15 group-hover:bg-white/25 rounded-md flex items-center justify-center transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </span>
                          <span className="text-xs">{ADMIN_CONTACT.phone}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
