// app/portal/page.tsx
'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function PortalPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800">
            Olá, {session?.user?.name}!
          </h1>
          <button
            onClick={() => signOut({ callbackUrl: '/' })} // Ao sair, volta para o login
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Sair
          </button>
        </header>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-6">Menu Principal</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Botão 1 - Gerir Horários (O teu SchedulerPrototype) */}
            <Link
              href="/scheduler" // ASSUMO que esta é a página do teu 'SchedulerPrototype'
              className="p-6 bg-blue-500 text-white rounded-lg text-center font-medium hover:bg-blue-600 transition-colors"
            >
              Gerir Horários
            </Link>

            {/* Botão 2 - Gerir Reservas (O teu Gerador de Planos) */}
            <Link
              href="/gestao-reserva" // A página que fizemos primeiro
              className="p-6 bg-green-500 text-white rounded-lg text-center font-medium hover:bg-green-600 transition-colors"
            >
              Gerir Reservas
            </Link>

            {/* Botão 3 - Gerir Funcionários (SÓ PARA ADMINS) */}
            {session?.user?.role === 'admin' && (
              <Link
                href="/funcionarios" // A página de admin
                className="p-6 bg-indigo-500 text-white rounded-lg text-center font-medium hover:bg-indigo-600 transition-colors"
              >
                Gerir Funcionários
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}