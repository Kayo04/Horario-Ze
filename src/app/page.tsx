// app/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()

  // Se o utilizador já está logado, o middleware.ts (que vamos criar)
  // já o deve ter redirecionado. Mas isto é uma segurança extra.
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/portal') // Envia para o novo dashboard
    }
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false, // Vamos tratar do redirect manualmente
        name: name,
        password: password,
      })

      if (result?.error) {
        setError('Nome ou password inválidos.')
        setLoading(false)
      } else if (result?.ok) {
        // Sucesso! Enviar para o novo portal.
        router.push('/portal') 
      }
    } catch (err) {
      setError('Erro ao tentar fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  // Não mostrar o formulário de login a quem já está logado
  if (status === 'loading' || status === 'authenticated') {
    return <div className="min-h-screen flex items-center justify-center">A carregar...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !name || !password}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}