'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'

// Seletor de semanas (segunda a domingo) de um mês: "Semana 44 · 26 out – 1 nov".
// Clicar no nome do mês abre uma grelha para escolher mês e ano.
// Clicar numa semana chama onChange com a segunda-feira dessa semana ("AAAA-MM-DD").

const DIA_MS = 24 * 60 * 60 * 1000
const iso = (d: Date) => d.toISOString().slice(0, 10)
const utc = (s: string) => new Date(s + 'T00:00:00Z')

/** Segunda-feira da semana de uma data. */
export function segundaDaSemana(data: string): string {
  const d = utc(data)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return iso(d)
}

/** Número da semana ISO 8601 (a semana 1 é a que tem a primeira quinta-feira do ano). */
export function numeroSemana(segunda: string): number {
  const quinta = new Date(utc(segunda).getTime() + 3 * DIA_MS)
  const inicioAno = Date.UTC(quinta.getUTCFullYear(), 0, 1)
  return Math.floor((quinta.getTime() - inicioAno) / DIA_MS / 7) + 1
}

/** "26 out – 1 nov" */
export function intervaloSemana(segunda: string, locale: string): string {
  // Montado à mão: em pt-PT o formato curto do Intl dá "26/10" em vez de "26 out"
  const mesCurto = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
  const fmt = (d: Date) => `${d.getUTCDate()} ${mesCurto.format(d).replace('.', '')}`
  const inicio = utc(segunda)
  return `${fmt(inicio)} – ${fmt(new Date(inicio.getTime() + 6 * DIA_MS))}`
}

interface Props {
  value: string
  onChange: (segunda: string) => void
  locale: string
  semanasGuardadas?: Set<string>
  reservasPorSemana?: Record<string, number> // segunda-feira -> nº de reservas
  desativado?: boolean
  textos: {
    week: string
    saved: string
    today: string
    prevMonth: string
    nextMonth: string
    prevYear: string
    nextYear: string
    open: string
    generate: string
    reservations: string // "{n} reservas"
  }
}

export default function SeletorSemanas({ value, onChange, locale, semanasGuardadas, reservasPorSemana, desativado, textos }: Props) {
  // Mês mostrado (1.º dia do mês); começa no mês da semana escolhida (a quinta-feira decide o mês)
  const mesDaSemana = (segunda: string) => {
    const q = new Date(utc(segunda).getTime() + 3 * DIA_MS)
    return iso(new Date(Date.UTC(q.getUTCFullYear(), q.getUTCMonth(), 1)))
  }
  const [mes, setMes] = useState(() => mesDaSemana(value))
  useEffect(() => setMes(mesDaSemana(value)), [value])

  // Grelha de meses (abre ao clicar no nome do mês)
  const [grelhaAberta, setGrelhaAberta] = useState(false)
  const [anoGrelha, setAnoGrelha] = useState(() => utc(mes).getUTCFullYear())
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!grelhaAberta) return
    const fechar = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setGrelhaAberta(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setGrelhaAberta(false) }
    document.addEventListener('mousedown', fechar)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fechar); document.removeEventListener('keydown', esc) }
  }, [grelhaAberta])

  const semanaAtual = segundaDaSemana(iso(new Date()))
  const hoje = new Date()

  // Semanas cuja quinta-feira cai neste mês (assim cada semana aparece num só mês)
  const semanas = useMemo(() => {
    const inicio = utc(mes)
    const lista: string[] = []
    let s = utc(segundaDaSemana(mes))
    for (let i = 0; i < 6; i++) {
      const quinta = new Date(s.getTime() + 3 * DIA_MS)
      if (quinta.getUTCMonth() === inicio.getUTCMonth()) lista.push(iso(s))
      s = new Date(s.getTime() + 7 * DIA_MS)
    }
    return lista
  }, [mes])

  const mudarMes = (delta: number) => {
    const d = utc(mes)
    setMes(iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1))))
  }
  const nomeMes = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utc(mes))
  const mesesCurtos = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i, 1))).replace('.', '')
  )
  const mesAtualIdx = utc(mes).getUTCMonth()
  const anoAtual = utc(mes).getUTCFullYear()

  return (
    <div>
      <div ref={caixa} className="relative flex items-center justify-between mb-3">
        <button type="button" onClick={() => mudarMes(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label={textos.prevMonth}>
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => { setAnoGrelha(anoAtual); setGrelhaAberta(a => !a) }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-gray-800 capitalize hover:bg-park-50 hover:text-park-700"
          aria-expanded={grelhaAberta}
        >
          {nomeMes}
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${grelhaAberta ? 'rotate-180' : ''}`} />
        </button>

        <button type="button" onClick={() => mudarMes(1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label={textos.nextMonth}>
          <ChevronRightIcon className="w-5 h-5" />
        </button>

        {/* Grelha de meses e ano */}
        {grelhaAberta && (
          <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => setAnoGrelha(a => a - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" aria-label={textos.prevYear}>
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-lg font-bold text-gray-900">{anoGrelha}</span>
              <button type="button" onClick={() => setAnoGrelha(a => a + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" aria-label={textos.nextYear}>
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {mesesCurtos.map((m, i) => {
                const escolhido = anoGrelha === anoAtual && i === mesAtualIdx
                const deHoje = anoGrelha === hoje.getFullYear() && i === hoje.getMonth()
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setMes(iso(new Date(Date.UTC(anoGrelha, i, 1)))); setGrelhaAberta(false) }}
                    className={`py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                      escolhido
                        ? 'bg-park-600 text-white'
                        : deHoje
                          ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                          : 'text-gray-700 hover:bg-park-50'
                    }`}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {semanas.map(s => {
          const ativa = s === value
          const guardada = semanasGuardadas?.has(s)
          const nReservas = reservasPorSemana?.[s] ?? 0
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              disabled={desativado}
              className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors disabled:opacity-60 disabled:cursor-wait ${
                ativa ? 'bg-park-600 border-park-600 text-white shadow' : 'bg-white border-gray-200 hover:border-park-300 hover:bg-park-50'
              }`}
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`font-bold whitespace-nowrap ${ativa ? 'text-white' : 'text-gray-900'}`}>
                    {textos.week} {numeroSemana(s)}
                  </span>
                  <span className={`text-sm ${ativa ? 'text-park-50' : 'text-gray-500'}`}>{intervaloSemana(s, locale)}</span>
                  {s === semanaAtual && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${ativa ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                      {textos.today}
                    </span>
                  )}
                </p>
                {nReservas > 0 && (
                  <p className={`text-xs mt-0.5 ${ativa ? 'text-park-50' : 'text-gray-400'}`}>
                    {textos.reservations.replace('{n}', String(nReservas))}
                  </p>
                )}
              </div>

              {/* O que acontece ao clicar: abrir o horário guardado ou gerar um novo */}
              <span
                className={`ml-auto shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  guardada
                    ? ativa ? 'bg-white/20 text-white' : 'bg-park-50 text-park-700'
                    : ativa ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-park-100 group-hover:text-park-800'
                }`}
              >
                {guardada ? <CheckCircleIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                {guardada ? textos.open : textos.generate}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
