'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'
import {
  CalendarDaysIcon,
  UsersIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
  ChartBarSquareIcon,
  PlusCircleIcon,
  CheckBadgeIcon,
  TableCellsIcon,
  BanknotesIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

type Chave = keyof (typeof translations)['pt']

interface Cartao {
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: Chave
  desc: Chave
  adminOnly?: boolean
}

// Botões do portal, pela ordem em que aparecem.
// adminOnly = só aparece a administradores (o middleware também bloqueia as páginas).
const CARTOES: Cartao[] = [
  { href: '/scheduler', icon: CalendarDaysIcon, title: 'manage_schedules', desc: 'manage_schedules_desc', adminOnly: true },
  { href: '/gestao-reserva', icon: UsersIcon, title: 'manage_reservations', desc: 'manage_reservations_desc' },
  { href: '/portal/checkin', icon: CheckBadgeIcon, title: 'checkin_daily', desc: 'checkin_daily_desc' },
  { href: '/funcionarios', icon: UserGroupIcon, title: 'manage_employees', desc: 'manage_employees_desc', adminOnly: true },
  { href: '/adminpanel', icon: ChartBarSquareIcon, title: 'admin_panel', desc: 'admin_panel_desc', adminOnly: true },
  { href: '/disponibilidade', icon: ClockIcon, title: 'my_availability', desc: 'my_availability_desc' },
  { href: '/horario', icon: TableCellsIcon, title: 'horario_card', desc: 'horario_card_desc' },
  { href: '/portal/clientes', icon: CircleStackIcon, title: 'database', desc: 'database_desc', adminOnly: true },
  { href: '/gestao-horas', icon: BanknotesIcon, title: 'hm_card', desc: 'hm_card_desc', adminOnly: true },
  { href: '/criar-horarios', icon: PlusCircleIcon, title: 'create_schedules', desc: 'create_schedules_desc', adminOnly: true },
]

export default function PortalPage() {
  const { data: session } = useSession()
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  // O uso de 'any' evita erros de TypeScript se o campo role não estiver definido no tipo
  const isAdmin = (session?.user as any)?.role === 'admin'
  const cartoes = CARTOES.filter(c => !c.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-gradient-to-br from-park-50 via-white to-park-100 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho com a cor do The Park */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-park-600 text-white p-6 sm:p-8 rounded-2xl shadow-lg">
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold tracking-[0.3em] text-park-100 uppercase">The Park · VR Porto</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mt-1">
              {t.welcome.replace('{name}', session?.user?.name || '')}
            </h1>
            <p className="text-lg text-park-50/90 mt-1">{t.dashboard_subtitle}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <LanguageSwitcher variant="dark" />
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/40 text-white font-semibold rounded-lg hover:bg-white hover:text-park-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              {t.logout}
            </button>
          </div>
        </header>

        {/* Menu Principal */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 border-b border-park-100 pb-4">{t.quick_actions}</h2>

          {/* flex-wrap centrado: as filas incompletas ficam ao centro em vez de um cartão sozinho à esquerda.
              Em ecrãs grandes cabem 5 por fila (10 cartões de admin = 2 filas certas). */}
          <div className="flex flex-wrap justify-center gap-6">
            {cartoes.map(({ href, icon: Icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className="group w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(20%-1.2rem)] flex flex-col items-center text-center p-6 bg-white border border-park-100 rounded-2xl shadow-sm hover:shadow-xl hover:bg-park-600 hover:border-park-600 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-16 w-16 rounded-full bg-park-50 group-hover:bg-white/20 flex items-center justify-center mb-4 transition-colors duration-300">
                  <Icon className="h-8 w-8 text-park-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="text-base font-semibold text-gray-900 group-hover:text-white transition-colors duration-300">
                  {t[title]}
                </span>
                <span className="text-sm text-gray-500 group-hover:text-park-50 mt-1 transition-colors duration-300">
                  {t[desc]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
