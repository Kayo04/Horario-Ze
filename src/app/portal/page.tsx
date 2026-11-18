'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import {
  UsersIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChartBarSquareIcon,
  PlusCircleIcon,
  CheckBadgeIcon,
  TableCellsIcon,
  BanknotesIcon,
  CircleStackIcon,
  BriefcaseIcon,
  CurrencyEuroIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import { HREF, GRUPOS, quadradosVisiveis, normalizarRole, type Quadrado } from '@/lib/permissoes'

type Chave = keyof (typeof translations)['pt']
type Icone = ComponentType<SVGProps<SVGSVGElement>>

interface Cartao {
  href: string
  icon: Icone
  title: Chave
  desc: Chave
}

// Aspeto de cada quadrado (quem pode ver o quê está em src/lib/permissoes.ts)
const VISUAL: Record<Quadrado, { icon: Icone; title: Chave; desc: Chave }> = {
  reservas: { icon: UsersIcon, title: 'manage_reservations', desc: 'manage_reservations_desc' },
  checkin: { icon: CheckBadgeIcon, title: 'checkin_daily', desc: 'checkin_daily_desc' },
  funcionarios: { icon: UserGroupIcon, title: 'manage_employees', desc: 'manage_employees_desc' },
  adminpanel: { icon: ChartBarSquareIcon, title: 'admin_panel', desc: 'admin_panel_desc' },
  disponibilidade: { icon: ClockIcon, title: 'my_availability', desc: 'my_availability_desc' },
  horario: { icon: TableCellsIcon, title: 'horario_card', desc: 'horario_card_desc' },
  clientes: { icon: CircleStackIcon, title: 'database', desc: 'database_desc' },
  horas: { icon: BanknotesIcon, title: 'hm_card', desc: 'hm_card_desc' },
  criarHorarios: { icon: PlusCircleIcon, title: 'create_schedules', desc: 'create_schedules_desc' },
}
const cartao = (q: Quadrado): Cartao => ({ href: HREF[q], ...VISUAL[q] })

// Admins: 3 secções grandes, cada uma com os seus botões
type Secao = 'rh' | 'financeira' | 'administracao'
const SECOES: { id: Secao; icon: Icone; title: Chave; desc: Chave; cartoes: Cartao[] }[] = [
  {
    id: 'rh',
    icon: BriefcaseIcon,
    title: 'sec_rh',
    desc: 'sec_rh_desc',
    cartoes: GRUPOS.rh.map(cartao),
  },
  { id: 'financeira', icon: CurrencyEuroIcon, title: 'sec_finance', desc: 'sec_finance_desc', cartoes: [] }, // em construção
  {
    id: 'administracao',
    icon: ShieldCheckIcon,
    title: 'sec_admin',
    desc: 'sec_admin_desc',
    cartoes: GRUPOS.administracao.map(cartao),
  },
]

export default function PortalPage() {
  const { data: session, status } = useSession()
  const { language } = useLanguage()
  const t = translations[language]

  const isAdmin = normalizarRole(session?.user?.role) === 'admin'
  // Host/Manager: os 4 de sempre + os quadrados extra que o admin lhes deu
  const cartoesFuncionario = quadradosVisiveis(session?.user?.role, session?.user?.permissions).map(cartao)

  // Secção aberta (só admins). Fica no endereço (#rh, #financeira, #administracao) para o
  // botão "voltar" do browser/telemóvel fechar a secção em vez de sair do portal.
  const [secaoAberta, setSecaoAberta] = useState<Secao | null>(null)
  const abriuAqui = useRef(false)
  useEffect(() => {
    const ler = () => {
      const h = window.location.hash.slice(1)
      setSecaoAberta(SECOES.some(s => s.id === h) ? (h as Secao) : null)
    }
    ler()
    window.addEventListener('hashchange', ler)
    return () => window.removeEventListener('hashchange', ler)
  }, [])

  const abrirSecao = (id: Secao) => {
    abriuAqui.current = true
    window.location.hash = id
  }
  const voltar = () => {
    if (abriuAqui.current) {
      abriuAqui.current = false
      window.history.back()
    } else {
      window.history.replaceState(null, '', window.location.pathname)
      setSecaoAberta(null)
    }
  }

  const secao = isAdmin ? SECOES.find(s => s.id === secaoAberta) : undefined

  // Enquanto a sessão carrega ainda não se sabe se é admin: mostrar só o "a carregar"
  // (senão um admin via por instantes os botões de funcionário normal)
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-park-50 via-white to-park-100">
        <div className="w-10 h-10 border-4 border-park-200 border-t-park-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-park-50 via-white to-park-100 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho com a cor do The Park */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-park-600 text-white p-6 sm:p-8 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {/* Logótipo (o PNG tem cantos brancos: o rounded-full recorta-o em círculo) */}
            <Image
              src="/the-park-logo.png"
              alt="The Park"
              width={80}
              height={80}
              priority
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full ring-4 ring-white/30 shadow-md shrink-0"
            />
            <div>
              <p className="text-xs font-bold tracking-[0.3em] text-park-100 uppercase">The Park · VR Porto</p>
              <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight mt-1 break-words">
                {t.welcome.replace('{name}', session?.user?.name || '')}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <LanguageSwitcher variant="dark" />

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/40 text-white font-semibold rounded-lg hover:bg-white hover:text-park-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              {t.logout}
            </button>
          </div>
        </header>

        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg">
          {!isAdmin ? (
            // ---------- Host/Manager: lista simples, como antes (+ quadrados extra) ----------
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 sm:mb-8 border-b border-park-100 pb-4">{t.quick_actions}</h2>
              <GrelhaCartoes cartoes={cartoesFuncionario} t={t} />
            </>
          ) : !secao ? (
            // ---------- Admins: os 3 botões grandes ----------
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 sm:mb-8 border-b border-park-100 pb-4">{t.quick_actions}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {SECOES.map(({ id, icon: Icon, title, desc, cartoes }) => {
                  const emConstrucao = cartoes.length === 0
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => abrirSecao(id)}
                      className="group relative text-left flex md:flex-col items-center md:items-start gap-4 md:gap-6 p-5 sm:p-8 rounded-2xl border-2 border-park-100 bg-gradient-to-br from-white to-park-50 hover:from-park-600 hover:to-park-700 hover:border-park-600 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="h-14 w-14 sm:h-20 sm:w-20 shrink-0 rounded-2xl bg-park-600 group-hover:bg-white/20 flex items-center justify-center shadow-md transition-colors duration-300">
                        <Icon className="h-7 w-7 sm:h-10 sm:w-10 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-xl sm:text-2xl font-extrabold text-gray-900 group-hover:text-white transition-colors duration-300">
                          {t[title]}
                        </span>
                        <span className="block text-sm text-gray-500 group-hover:text-park-50 mt-1 transition-colors duration-300">
                          {t[desc]}
                        </span>
                        <span
                          className={`inline-block mt-3 text-xs font-bold px-2.5 py-1 rounded-full transition-colors duration-300 ${
                            emConstrucao
                              ? 'bg-amber-100 text-amber-800 group-hover:bg-white/20 group-hover:text-white'
                              : 'bg-park-100 text-park-800 group-hover:bg-white/20 group-hover:text-white'
                          }`}
                        >
                          {emConstrucao ? t.sec_under_construction : t.sec_options.replace('{n}', String(cartoes.length))}
                        </span>
                      </div>
                      <ArrowRightIcon className="h-6 w-6 shrink-0 text-park-600 group-hover:text-white md:absolute md:top-8 md:right-8 transition-colors duration-300" />
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            // ---------- Admins: dentro de uma secção ----------
            <>
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-park-100 pb-4">
                <button
                  type="button"
                  onClick={voltar}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition shrink-0"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">{t.sec_back}</span>
                </button>
                <div className="h-10 w-10 rounded-xl bg-park-600 flex items-center justify-center shrink-0">
                  <secao.icon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">{t[secao.title]}</h2>
              </div>

              {secao.cartoes.length > 0 ? (
                <GrelhaCartoes cartoes={secao.cartoes} t={t} />
              ) : (
                <div className="flex flex-col items-center text-center py-12 sm:py-16 px-4">
                  <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center mb-5">
                    <WrenchScrewdriverIcon className="h-10 w-10 text-amber-500" />
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{t.sec_under_construction}</p>
                  <p className="text-gray-500 mt-2 max-w-md">{t.sec_under_construction_desc}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Grelha de cartões pequenos (os botões de sempre).
// flex-wrap centrado: as filas incompletas ficam ao centro. Telemóvel/tablet: 2 por fila; ecrãs grandes: 4 por fila.
function GrelhaCartoes({ cartoes, t }: { cartoes: Cartao[]; t: (typeof translations)['pt'] | (typeof translations)['en'] }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
      {cartoes.map(({ href, icon: Icon, title, desc }) => (
        <Link
          key={href}
          href={href}
          className="group w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] flex flex-col items-center text-center p-4 sm:p-6 bg-white border border-park-100 rounded-2xl shadow-sm hover:shadow-xl hover:bg-park-600 hover:border-park-600 hover:-translate-y-1 transition-all duration-300"
        >
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-park-50 group-hover:bg-white/20 flex items-center justify-center mb-4 transition-colors duration-300">
            <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-park-600 group-hover:text-white transition-colors duration-300" />
          </div>
          <span className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-white transition-colors duration-300">
            {t[title]}
          </span>
          <span className="text-xs sm:text-sm text-gray-500 group-hover:text-park-50 mt-1 transition-colors duration-300">
            {t[desc]}
          </span>
        </Link>
      ))}
    </div>
  )
}
