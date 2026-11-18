'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { signIn, getSession, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import WelcomeAnimation from '@/app/components/WelcomeAnimation'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [welcomeName, setWelcomeName] = useState<string | null>(null)
  // Marca que o login foi feito agora nesta página, para o redirect automático não saltar a animação
  const loggingInRef = useRef(false)
  const router = useRouter()
  const { data: session, status } = useSession()
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  // Redireciona se já estiver logado (exceto enquanto a animação de boas-vindas está a correr)
  useEffect(() => {
    if (status === 'authenticated' && welcomeName === null && !loggingInRef.current) {
      router.push('/portal')
    }
  }, [status, router, welcomeName])

  // Em desenvolvimento: abrir /?welcome=Nome para pré-visualizar a animação sem fazer login
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const preview = new URLSearchParams(window.location.search).get('welcome')
    if (preview) setWelcomeName(preview)
  }, [])

  const goToPortal = useCallback(() => router.push('/portal'), [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    loggingInRef.current = true

    try {
      const result = await signIn('credentials', {
        redirect: false,
        name: name,
        password: password,
      })

      if (result?.error) {
        setError(t.login_error)
        setLoading(false)
        loggingInRef.current = false
      } else if (result?.ok) {
        const newSession = await getSession()
        setWelcomeName(newSession?.user?.name || name)
      }
    } catch (err) {
      setError(t.login_error_generic)
      setLoading(false)
      loggingInRef.current = false
    }
  }

  if (welcomeName !== null) {
    return <WelcomeAnimation name={welcomeName} onFinish={goToPortal} />
  }

  // Ecrã de loading enquanto verifica a sessão
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-park-50 to-park-100">
        <div className="w-10 h-10 border-4 border-park-200 border-t-park-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  // Se não está logado, mostra o formulário de login
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-park-50 to-park-100 p-4 font-sans relative">
      
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <LanguageSwitcher />
      </div>

      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
        
        {/* Cabeçalho com Ícone */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-park-100 p-4 rounded-full mb-4">
            <LockClosedIcon className="h-10 w-10 text-park-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 text-center">{t.login_title}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t.login_subtitle}</p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.login_name_label}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-park-500 focus:border-park-500 transition-all duration-200"
              placeholder={t.login_name_placeholder}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.login_password_label}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-park-500 focus:border-park-500 transition-all duration-200"
              placeholder={t.login_password_placeholder}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !name || !password}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-park-600 to-park-600 text-white font-semibold rounded-lg shadow-lg hover:from-park-700 hover:to-park-700 disabled:opacity-70 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-park-500 focus:ring-offset-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t.login_loading}</span>
              </>
            ) : (
              <>
                <span>{t.login_button}</span>
                <ArrowRightIcon className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
} 