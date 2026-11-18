'use client'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

// Seletor de semanas (segunda a domingo) de um mês: "Semana 44 · 26 out – 1 nov".
// value / onChange: a segunda-feira da semana em "AAAA-MM-DD".

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
  textos: { week: string; saved: string; today: string; prevMonth: string; nextMonth: string }
}

export default function SeletorSemanas({ value, onChange, locale, semanasGuardadas, textos }: Props) {
  // Mês mostrado (1.º dia do mês); começa no mês da semana escolhida (a quinta-feira decide o mês)
  const mesDaSemana = (segunda: string) => {
    const q = new Date(utc(segunda).getTime() + 3 * DIA_MS)
    return iso(new Date(Date.UTC(q.getUTCFullYear(), q.getUTCMonth(), 1)))
  }
  const [mes, setMes] = useState(() => mesDaSemana(value))
  useEffect(() => setMes(mesDaSemana(value)), [value])

  const semanaAtual = segundaDaSemana(iso(new Date()))

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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => mudarMes(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label={textos.prevMonth}>
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <span className="font-bold text-gray-800 capitalize">{nomeMes}</span>
        <button type="button" onClick={() => mudarMes(1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label={textos.nextMonth}>
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        {semanas.map(s => {
          const ativa = s === value
          const guardada = semanasGuardadas?.has(s)
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                ativa ? 'bg-park-600 border-park-600 text-white shadow' : 'bg-white border-gray-200 hover:border-park-300 hover:bg-park-50'
              }`}
            >
              <span className={`font-bold whitespace-nowrap ${ativa ? 'text-white' : 'text-gray-900'}`}>
                {textos.week} {numeroSemana(s)}
              </span>
              <span className={`text-sm ${ativa ? 'text-park-50' : 'text-gray-500'}`}>{intervaloSemana(s, locale)}</span>
              <span className="ml-auto flex items-center gap-2">
                {s === semanaAtual && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${ativa ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                    {textos.today}
                  </span>
                )}
                {guardada && (
                  <span className={`flex items-center gap-1 text-xs ${ativa ? 'text-white' : 'text-park-700'}`} title={textos.saved}>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{textos.saved}</span>
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
