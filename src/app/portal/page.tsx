'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  CalendarDaysIcon,
  UsersIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon, // Ícone para Sair
  ChartBarSquareIcon,
  PlusCircleIcon, // ⬅️ 1. ADICIONAR O ÍCONE NOVO
} from '@heroicons/react/24/outline' // Ícones de exemplo
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

export default function PortalPage() {
  const { data: session } = useSession()
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-12 bg-white p-6 rounded-xl shadow-lg">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              {t.welcome.replace('{name}', session?.user?.name || '')}
            </h1>
            <p className="text-lg text-gray-600 mt-1">{t.dashboard_subtitle}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
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

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              {t.logout}
            </button>
          </div>
        </header>

        {/* Menu Principal */}
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 border-b pb-4">{t.quick_actions}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Botão 1 - Gerir Horários (SÓ PARA ADMINS) */}
            {session?.user?.role === 'admin' && (
              <Link
                href="/scheduler"
                className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
              >
                <CalendarDaysIcon className="h-12 w-12 mb-3 text-blue-200 group-hover:text-white transition-colors duration-300" />
                <span className="text-lg font-semibold">{t.manage_schedules}</span>
                <span className="text-sm text-blue-100 group-hover:text-blue-50 mt-1">
                  {t.manage_schedules_desc}
                </span>
              </Link>
            )}

            {/* Botão 2 - Gerir Reservas */}
            <Link
              href="/gestao-reserva"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
            >
              <UsersIcon className="h-12 w-12 mb-3 text-green-200 group-hover:text-white transition-colors duration-300" />
              <span className="text-lg font-semibold">{t.manage_reservations}</span>
              <span className="text-sm text-green-100 group-hover:text-green-50 mt-1">
                {t.manage_reservations_desc}
              </span>
            </Link>

            {/* Botão 3 - Gerir Funcionários (SÓ PARA ADMINS) */}
            {session?.user?.role === 'admin' && (
              <Link
                href="/funcionarios"
                className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
              >
                <UserGroupIcon className="h-12 w-12 mb-3 text-indigo-200 group-hover:text-white transition-colors duration-300" />
                <span className="text-lg font-semibold">{t.manage_employees}</span>
                <span className="text-sm text-indigo-100 group-hover:text-indigo-50 mt-1">
                  {t.manage_employees_desc}
                </span>
              </Link>
            )}

            {/* ⬅️ 2. ADICIONAR O NOVO BOTÃO AQUI */}
            {/* Botão 5 - Painel de Admin (SÓ PARA ADMINS) */}
            {session?.user?.role === 'admin' && (
              <Link
                href="/adminpanel"
                className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
              >
                <ChartBarSquareIcon className="h-12 w-12 mb-3 text-orange-200 group-hover:text-white transition-colors duration-300" />
                <span className="text-lg font-semibold">{t.admin_panel}</span>
                <span className="text-sm text-orange-100 group-hover:text-orange-50 mt-1">
                  {t.admin_panel_desc}
                </span>
              </Link>
            )}

            {/* Botão 4 - Gerir Minha Disponibilidade (PARA TODOS) */}
            <Link
              href="/disponibilidade"
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
            >
              <ClockIcon className="h-12 w-12 mb-3 text-purple-200 group-hover:text-white transition-colors duration-300" />
              <span className="text-lg font-semibold">{t.my_availability}</span>
              <span className="text-sm text-purple-100 group-hover:text-purple-50 mt-1">
                {t.my_availability_desc}
              </span>
            </Link>
            {/* Botão - Criar Horários (SÓ PARA ADMINS) */}
{session?.user?.role === 'admin' && (
  <Link
    href="/criar-horarios"
    className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-pink-500 to-pink-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out group"
  >
    <PlusCircleIcon className="h-12 w-12 mb-3 text-pink-200 group-hover:text-white transition-colors duration-300" />
    <span className="text-lg font-semibold">{t.create_schedules}</span>
    <span className="text-sm text-pink-100 group-hover:text-pink-50 mt-1">
      {t.create_schedules_desc}
    </span>
  </Link>
)}

          </div>
        </div>
      </div>
    </div>
  )
}