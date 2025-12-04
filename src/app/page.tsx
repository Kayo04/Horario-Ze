'use client'
import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  // Redireciona se já estiver logado
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/portal')
    }
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false,
        name: name,
        password: password,
      })

      if (result?.error) {
        setError(t.login_error)
        setLoading(false)
      } else if (result?.ok) {
        router.push('/portal') 
      }
    } catch (err) {
      setError(t.login_error_generic)
      setLoading(false)
    }
  }

  // Ecrã de loading enquanto verifica a sessão
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  // Se não está logado, mostra o formulário de login
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans relative">
      
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <button 
          onClick={() => setLanguage('pt')} 
          className={`text-2xl hover:scale-110 transition-transform ${language === 'pt' ? 'opacity-100' : 'opacity-50'}`}
          title="Português"
        >
          🇵🇹
        </button>
        <button 
          onClick={() => setLanguage('en')} 
          className={`text-2xl hover:scale-110 transition-transform ${language === 'en' ? 'opacity-100' : 'opacity-50'}`}
          title="English"
        >
          🇬🇧
        </button>
      </div>

      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
        
        {/* Cabeçalho com Ícone */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-100 p-4 rounded-full mb-4">
            <LockClosedIcon className="h-10 w-10 text-indigo-600" />
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
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              placeholder={t.login_password_placeholder}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !name || !password}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-70 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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