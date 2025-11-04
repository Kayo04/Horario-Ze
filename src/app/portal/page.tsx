'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  CalendarDaysIcon,
  UsersIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon, // Ícone para Sair
} from '@heroicons/react/24/outline' // Ícones de exemplo

export default function PortalPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-12 bg-white p-6 rounded-xl shadow-lg">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              Bem-vindo, {session?.user?.name}!
            </h1>
            <p className="text-lg text-gray-600 mt-1">O seu painel de controlo está aqui.</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Sair
          </button>
        </header>

        {/* Menu Principal */}
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 border-b pb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Botão 1 - Gerir Horários (SÓ PARA ADMINS) */}
            {session?.user?.role === 'admin' && (
              <Link
                href="/scheduler"
                className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
              >
                <CalendarDaysIcon className="h-12 w-12 mb-3 text-blue-200 group-hover:text-white transition-colors duration-300" />
                <span className="text-lg font-semibold">Gerir Horários</span>
                <span className="text-sm text-blue-100 group-hover:text-blue-50 mt-1">
                  Atribuição de staff e eventos
                </span>
              </Link>
            )}

            {/* Botão 2 - Gerir Reservas */}
            <Link
              href="/gestao-reserva"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
            >
              <UsersIcon className="h-12 w-12 mb-3 text-green-200 group-hover:text-white transition-colors duration-300" />
              <span className="text-lg font-semibold">Gerir Reservas</span>
              <span className="text-sm text-green-100 group-hover:text-green-50 mt-1">
                Visualizar e alterar eventos
              </span>
            </Link>

            {/* Botão 3 - Gerir Funcionários (SÓ PARA ADMINS) */}
            {session?.user?.role === 'admin' && (
              <Link
                href="/funcionarios"
                className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
              >
                <UserGroupIcon className="h-12 w-12 mb-3 text-indigo-200 group-hover:text-white transition-colors duration-300" />
                <span className="text-lg font-semibold">Gerir Funcionários</span>
                <span className="text-sm text-indigo-100 group-hover:text-indigo-50 mt-1">
                  Dados e gestão de equipa
                </span>
              </Link>
            )}

            {/* Botão 4 - Gerir Minha Disponibilidade (PARA TODOS) */}
            <Link
              href="/disponibilidade"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
            >
              <ClockIcon className="h-12 w-12 mb-3 text-purple-200 group-hover:text-white transition-colors duration-300" />
              <span className="text-lg font-semibold">Minha Disponibilidade</span>
              <span className="text-sm text-purple-100 group-hover:text-purple-50 mt-1">
                Definir horários de trabalho
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}