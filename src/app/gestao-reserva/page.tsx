'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

type PlanoItem = {
  etapa: string
  start: string
  durationMin: number
  groupsPlaying?: string[]
  groupsPlank?: string[]
  groupsCarnival?: string[]
}

type Grupo = { name: string; size: number }

type PlanSummary = {
  startTime: string;
  endTime: string;
  totalDurationMin: number;
  totalPeople: number;
  totalGroups: number;
  totalCarnivalGroups?: number;
}

export default function GestaoReservaPage() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  const [people, setPeople] = useState<number | ''>('')
  const [startTime, setStartTime] = useState<string>('14:30')
  const [carnival, setCarnival] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [plan, setPlan] = useState<PlanoItem[]>([])
  const [groups, setGroups] = useState<Grupo[]>([])
  const [summary, setSummary] = useState<PlanSummary | null>(null)
  const [showResult, setShowResult] = useState(false)

  const generateFifteenMinuteOptions = () => {
    const out: string[] = []
    for (let h = 10; h <= 20; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 20 && m > 0) break 
        out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return out
  }

  const toMinutes = (time: string) => {
    const [hh, mm] = time.split(':').map(Number)
    return hh * 60 + mm
  }

  const fromMinutes = (mins: number) => {
    const hh = Math.floor(mins / 60) % 24
    const mm = mins % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hStr = h > 0 ? `${h}h` : '';
    const mStr = m > 0 ? `${m}min` : '';
    if (h > 0 && m > 0) return `${hStr} ${mStr}`;
    return hStr || mStr || '0min';
  };

  const buildGroups = (n: number) => {
    if (n <= 0) return []
    const groupCount = Math.ceil(n / 6)
    const base = Math.floor(n / groupCount)
    const extra = n % groupCount
    const arr: Grupo[] = []
    for (let i = 0; i < groupCount; i++) {
      const size = base + (i < extra ? 1 : 0)
      arr.push({ name: `${t.group} ${i + 1}`, size })
    }
    return arr
  }

  const computePlan = (
    nPeople: number,
    start: string,
    groups: Grupo[],
    carnival: boolean,
  ) => {
    const result: PlanoItem[] = []
    let current = toMinutes(start)
    
    const TRANSITION_TIME = 5

    const JOGO_DURATION = 30
    const PLANK_PER_PERSON = 2
    const CARNIVAL_DURATION = 10
    const MAX_JOGO_GROUPS = 3
    const MAX_PLANK_GROUPS = 2
    const MAX_CARNIVAL_GROUPS = 3

    // 1. Chegada e explicação + vídeo (10 min)
    result.push({
      etapa: t.arrival_explanation,
      start: fromMinutes(current),
      durationMin: 10
    })
    current += 10

    // Estado para controlar o progresso de cada grupo
    const groupState = groups.map(g => ({
      name: g.name,
      size: g.size,
      played: false,
      planked: false,
    }))

    // Estado para controlar quais grupos de Carnival JÁ FORAM FEITOS
    let carnivalGroupsDone: number[] = []
    let nextCarnivalGroup = 1

    let batchNumber = 1
    
    // NOVA LÓGICA OTIMIZADA: Se tiver 4 grupos ou mais
    if (groups.length >= 4) {
      const gruposPrincipais = groupState.slice(0, 3) // Grupos 1,2,3
      const gruposRestantes = groupState.slice(3)      // Grupos 4,5,6,7...

      // FASE 1: Grupos 1-3 jogam, grupos restantes fazem plank em paralelo
      const jogoStartTime = current

      result.push({
        etapa: `${t.main_game} - Batch ${batchNumber} (${gruposPrincipais.map(g => g.name).join(', ')})`,
        start: fromMinutes(jogoStartTime),
        durationMin: JOGO_DURATION, // Sempre 30 min
        groupsPlaying: gruposPrincipais.map(g => g.name),
      })
      // O tempo de fim de jogo dos grupos 1-3
      const gameEndTime = jogoStartTime + JOGO_DURATION // Sempre 30 min
      gruposPrincipais.forEach(g => g.played = true)
      
      // CARNIVAL: Se houver menos de 3 grupos a jogar, usar campos vazios para Carnival
      if (carnival && gruposPrincipais.length < MAX_JOGO_GROUPS) {
        const camposVazios = MAX_JOGO_GROUPS - gruposPrincipais.length
        const totalCarnivalGroups = Math.ceil(nPeople / 4)
        
        if (nextCarnivalGroup <= totalCarnivalGroups) {
          const gruposParaCarnival = Math.min(camposVazios, totalCarnivalGroups - nextCarnivalGroup + 1)
          
          if (gruposParaCarnival > 0) {
            const carnivalGroups = Array.from(
              { length: gruposParaCarnival },
              (_, i) => `Carnival ${nextCarnivalGroup + i}`
            )
            
            result.push({
              etapa: t.carnival_parallel,
              start: fromMinutes(jogoStartTime),
              durationMin: CARNIVAL_DURATION,
              groupsCarnival: carnivalGroups,
            })

            
            carnivalGroupsDone.push(...Array.from({ length: gruposParaCarnival }, (_, i) => nextCarnivalGroup + i))
            nextCarnivalGroup += gruposParaCarnival
          }
        }
      }

      // Grupos restantes fazem plank EM PARALELO com o jogo dos grupos 1-3
      let plankStartTime = current // Começam ao mesmo tempo que o jogo
      let plankBatchCount = 1
      const gruposParaPlank = [...gruposRestantes]
      
      while (gruposParaPlank.length > 0) {
        const plankBatch = gruposParaPlank.splice(0, MAX_PLANK_GROUPS)
        const plankDuration = Math.max(...plankBatch.map(g => g.size * PLANK_PER_PERSON))
        
        // Adicionar transição entre batches de plank (exceto o primeiro)
        if (plankBatchCount > 1) {
          result.push({
            etapa: t.transition_plank,
            start: fromMinutes(plankStartTime),
            durationMin: TRANSITION_TIME,
          })
          plankStartTime += TRANSITION_TIME
        }

        result.push({
          etapa: `${t.plank} - Batch ${plankBatchCount} (${plankBatch.map(g => g.name).join(', ')})`,
          start: fromMinutes(plankStartTime),
          durationMin: plankDuration,
          groupsPlank: plankBatch.map(g => g.name),
        })
        
        plankBatch.forEach(g => g.planked = true)
        plankStartTime += plankDuration
        plankBatchCount++
      }
      // plankStartTime agora guarda a hora a que a área de plank fica livre (fim do último grupo 4+)

      // FASE 2: Troca de Atividades
      let plankStartTimeGrupos1a3 = Math.max(gameEndTime, plankStartTime)

      result.push({
        etapa: t.transition_groups_plank,
        start: fromMinutes(plankStartTimeGrupos1a3),
        durationMin: TRANSITION_TIME,
      })
      plankStartTimeGrupos1a3 += TRANSITION_TIME

      const plankDurationGrupos1a3 = Math.max(...gruposPrincipais.map(g => g.size * PLANK_PER_PERSON))
      result.push({
        etapa: `${t.plank} - ${t.groups} 1-3 (${gruposPrincipais.map(g => g.name).join(', ')})`,
        start: fromMinutes(plankStartTimeGrupos1a3),
        durationMin: plankDurationGrupos1a3,
        groupsPlank: gruposPrincipais.map(g => g.name),
      })
      gruposPrincipais.forEach(g => g.planked = true)
      const plankEndTimeGrupos1a3 = plankStartTimeGrupos1a3 + plankDurationGrupos1a3

      // --- Timeline para Grupos 4+ (Irão Jogar) ---
      let jogoStartTimeRestantes = Math.max(gameEndTime, plankStartTime)
      
      batchNumber++
      const gruposParaJogar = [...gruposRestantes]
      
      if (gruposParaJogar.length > 0) {
        result.push({
          etapa: t.transition_groups_game,
          start: fromMinutes(jogoStartTimeRestantes),
          durationMin: TRANSITION_TIME,
        })
        jogoStartTimeRestantes += TRANSITION_TIME
      }

      while (gruposParaJogar.length > 0) {
        const jogoBatch = gruposParaJogar.splice(0, MAX_JOGO_GROUPS)
        
        if (batchNumber > 2) { 
          result.push({
            etapa: t.transition_game,
            start: fromMinutes(jogoStartTimeRestantes),
            durationMin: TRANSITION_TIME,
          })
          jogoStartTimeRestantes += TRANSITION_TIME
        }

        result.push({
          etapa: `${t.main_game} - Batch ${batchNumber} (${jogoBatch.map(g => g.name).join(', ')})`,
          start: fromMinutes(jogoStartTimeRestantes),
          durationMin: JOGO_DURATION,
          groupsPlaying: jogoBatch.map(g => g.name),
        })
        
        jogoBatch.forEach(g => g.played = true)

        // CARNIVAL: Se houver menos de 3 grupos a jogar, usar campos vazios para Carnival
        if (carnival && jogoBatch.length < MAX_JOGO_GROUPS) {
          const camposVazios = MAX_JOGO_GROUPS - jogoBatch.length
          const totalCarnivalGroups = Math.ceil(nPeople / 4)
          
          if (nextCarnivalGroup <= totalCarnivalGroups) {
            const gruposParaCarnival = Math.min(camposVazios, totalCarnivalGroups - nextCarnivalGroup + 1)
            
            if (gruposParaCarnival > 0) {
              const carnivalGroups = Array.from(
                { length: gruposParaCarnival },
                (_, i) => `Carnival ${nextCarnivalGroup + i}`
              )
              
              result.push({
                etapa: t.carnival_parallel,
                start: fromMinutes(jogoStartTimeRestantes),
                durationMin: CARNIVAL_DURATION,
                groupsCarnival: carnivalGroups,
              })
              
              carnivalGroupsDone.push(...Array.from({ length: gruposParaCarnival }, (_, i) => nextCarnivalGroup + i))
              nextCarnivalGroup += gruposParaCarnival
            }
          }
        }

        jogoStartTimeRestantes += JOGO_DURATION
        batchNumber++
      }
      current = Math.max(plankEndTimeGrupos1a3, jogoStartTimeRestantes)

    } else {
      // FLUXO ORIGINAL: 3 grupos ou menos
      let plankCurrent = current
      let plankBatchCount = 1
      const gruposParaPlank = [...groupState]
      
      while (gruposParaPlank.length > 0) {
        const plankBatch = gruposParaPlank.splice(0, MAX_PLANK_GROUPS)
        const plankDuration = Math.max(...plankBatch.map(g => g.size * PLANK_PER_PERSON))
        
        if (plankBatchCount > 1) {
          result.push({
            etapa: t.transition_plank,
            start: fromMinutes(plankCurrent),
            durationMin: TRANSITION_TIME,
          })
          plankCurrent += TRANSITION_TIME
        }

        result.push({
          etapa: `${t.plank} - Batch ${plankBatchCount} (${plankBatch.map(g => g.name).join(', ')})`,
          start: fromMinutes(plankCurrent),
          durationMin: plankDuration,
          groupsPlank: plankBatch.map(g => g.name),
        })
        
        plankBatch.forEach(g => g.planked = true)
        plankCurrent += plankDuration
        plankBatchCount++
      }

      current = plankCurrent

      result.push({
        etapa: t.transition_main_game,
        start: fromMinutes(current),
        durationMin: TRANSITION_TIME,
      })
      current += TRANSITION_TIME

      // FASE 2: TODOS jogam JOGO PRINCIPAL
      while (groupState.some(g => !g.played)) {
        const availableToPlay = groupState.filter(g => !g.played)

        if (batchNumber > 1) {
          result.push({
            etapa: t.transition_game,
            start: fromMinutes(current),
            durationMin: TRANSITION_TIME,
          })
          current += TRANSITION_TIME
        }

        const jogoBatch = availableToPlay.slice(0, MAX_JOGO_GROUPS)
        
        if (jogoBatch.length > 0) {
          result.push({
            etapa: `${t.main_game} - Batch ${batchNumber} (${jogoBatch.map(g => g.name).join(', ')})`,
            start: fromMinutes(current),
            durationMin: JOGO_DURATION,
            groupsPlaying: jogoBatch.map(g => g.name),
          })
          
          jogoBatch.forEach(g => g.played = true)

          // CARNIVAL: Se houver menos de 3 grupos a jogar, usar campos vazios para Carnival
          if (carnival && jogoBatch.length < MAX_JOGO_GROUPS) {
            const camposVazios = MAX_JOGO_GROUPS - jogoBatch.length
            const totalCarnivalGroups = Math.ceil(nPeople / 4)
            
            if (nextCarnivalGroup <= totalCarnivalGroups) {
              const gruposParaCarnival = Math.min(camposVazios, totalCarnivalGroups - nextCarnivalGroup + 1)
              
              if (gruposParaCarnival > 0) {
                const carnivalGroups = Array.from(
                  { length: gruposParaCarnival },
                  (_, i) => `Carnival ${nextCarnivalGroup + i}`
                )
                
                result.push({
                  etapa: t.carnival_parallel,
                  start: fromMinutes(current),
                  durationMin: CARNIVAL_DURATION,
                  groupsCarnival: carnivalGroups,
                })
                
                carnivalGroupsDone.push(...Array.from({ length: gruposParaCarnival }, (_, i) => nextCarnivalGroup + i))
                nextCarnivalGroup += gruposParaCarnival
              }
            }
          }
          
          current += JOGO_DURATION
          batchNumber++
        }
      }
    }

    // FASE 3: CARNIVAL FINAL (apenas para grupos que NÃO fizeram ainda)
    if (carnival) {
      const totalCarnivalGroups = Math.ceil(nPeople / 4)
      
      if (nextCarnivalGroup <= totalCarnivalGroups) {
        result.push({
          etapa: t.transition_carnival_final,
          start: fromMinutes(current),
          durationMin: TRANSITION_TIME,
        })
        current += TRANSITION_TIME

        let gruposProcessados = nextCarnivalGroup
        let carnivalRound = 1

        while (gruposProcessados <= totalCarnivalGroups) {
          const gruposThisRound = Math.min(MAX_CARNIVAL_GROUPS, totalCarnivalGroups - gruposProcessados + 1)
          const carnivalGroups = Array.from(
            { length: gruposThisRound },
            (_, i) => `Carnival ${gruposProcessados + i}`
          )
          
          result.push({
            etapa: `${t.carnival_final} (${carnivalRound})`,
            start: fromMinutes(current),
            durationMin: CARNIVAL_DURATION,
            groupsCarnival: carnivalGroups,
          })
          current += CARNIVAL_DURATION
          gruposProcessados += gruposThisRound
          carnivalRound++

          if (gruposProcessados <= totalCarnivalGroups) {
            result.push({
              etapa: t.transition_carnival,
              start: fromMinutes(current),
              durationMin: TRANSITION_TIME,
            })
            current += TRANSITION_TIME
          }
        }
      }
    }

    // Final
    result.push({
      etapa: t.final_swap,
      start: fromMinutes(current),
      durationMin: TRANSITION_TIME,
    })
    current += TRANSITION_TIME

    return result
  }

  const handleGenerate = () => {
    if (!people || people <= 0) {
      console.error('Coloca o número válido de pessoas (≥1).')
      return
    }
    if (!startTime) {
      console.error('Escolhe uma hora de início.')
      return
    }

    setShowResult(false)
    setPlan([])
    setGroups([])
    setSummary(null)
    setProgress(0)
    setLoading(true)

    const computedGroups = buildGroups(Number(people))

    let p = 0
    setProgress(0)
    const int = setInterval(() => {
      p += Math.max(1, Math.floor((100 - p) / 10))
      if (p >= 100) {
        p = 100
        setProgress(100)
        clearInterval(int)
        
        const computedPlan = computePlan(Number(people), startTime, computedGroups, carnival)
        
        const lastItem = computedPlan.at(-1)
        if (!lastItem) {
          setLoading(false);
          return;
        }
        
        const endTimeMin = toMinutes(lastItem.start) + lastItem.durationMin;
        const endTimeStr = fromMinutes(endTimeMin);
        const startTimeMin = toMinutes(startTime);
        const totalDuration = endTimeMin - startTimeMin;
        
        const summaryData: PlanSummary = {
          startTime: startTime,
          endTime: endTimeStr,
          totalDurationMin: totalDuration,
          totalPeople: Number(people),
          totalGroups: computedGroups.length,
        };
        
        if (carnival) {
          summaryData.totalCarnivalGroups = Math.ceil(Number(people) / 4);
        }
        
        setTimeout(() => {
          setPlan(computedPlan)
          setGroups(computedGroups)
          setSummary(summaryData)
          setLoading(false)
          setShowResult(true)
          setProgress(0)
        }, 350)
      } else {
        setProgress(p)
      }
    }, 40)
  }

  useEffect(() => {
    setShowResult(false)
    setSummary(null)
  }, [people, startTime, carnival])

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div className="flex flex-col">
            <div className="mb-4">
              <Link href="/portal" className="inline-flex items-center text-sm text-park-600 hover:text-park-800 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t.back_to_portal}
              </Link>
            </div>

            <div>
              <h1 className="text-3xl font-semibold">{t.reservation_title}</h1>
              <p className="text-sm text-gray-600 mt-1">{t.reservation_subtitle}</p>
            </div>
          </div>
          
          {/* Language Toggle */}
          <div className="flex space-x-2">
            <LanguageSwitcher />
          </div>
        </header>

        {/* Controlo */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.people_label}</label>
              <input
                type="number"
                min={1}
                value={people}
                onChange={(e) => setPeople(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-park-400 outline-none"
                placeholder="Ex: 50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.start_time}</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-park-400 outline-none"
              >
                {generateFifteenMinuteOptions().map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.carnival_label}</label>
              <select
                value={carnival ? 'sim' : 'nao'}
                onChange={(e) => setCarnival(e.target.value === 'sim')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-park-400 outline-none"
              >
                <option value="nao">{t.no}</option>
                <option value="sim">{t.yes}</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full px-5 py-2 bg-park-600 hover:bg-park-700 text-white rounded-md shadow-sm disabled:opacity-60 transition-colors"
              >
                {loading ? t.calculating : t.generate_plan}
              </button>
            </div>
          </div>

          {loading && (
            <div className="mt-4">
              <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-gradient-to-r from-park-400 via-park-600 to-park-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">{t.calculating} — {progress}%</div>
            </div>
          )}
        </div>

        {/* Sumário */}
        {showResult && summary && (
          <div className={`bg-white shadow-md rounded-lg p-6 mb-8 transform transition-all duration-500 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-xl font-semibold mb-4 text-park-700">{t.summary_title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500">{t.start}</div>
                <div className="text-2xl font-bold text-gray-800">{summary.startTime}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">{t.end_predicted}</div>
                <div className="text-2xl font-bold text-gray-800">{summary.endTime}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">{t.total_duration}</div>
                <div className="text-2xl font-bold text-gray-800">{formatDuration(summary.totalDurationMin)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">{t.total_people}</div>
                <div className="text-2xl font-bold text-gray-800">{summary.totalPeople}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">{t.total_groups}</div>
                <div className="text-2xl font-bold text-gray-800">{summary.totalGroups}</div>
              </div>
              {summary.totalCarnivalGroups && (
                <div>
                  <div className="text-sm font-medium text-gray-500">{t.carnival_groups}</div>
                  <div className="text-2xl font-bold text-gray-800">{summary.totalCarnivalGroups}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resultado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cronograma com Grupos */}
          <div className={`transform transition-all duration-500 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-3">{t.schedule_distribution}</h2>
              {plan.length === 0 ? (
                <p className="text-gray-500">{t.no_plan}</p>
              ) : (
                <div className="space-y-4">
                  {plan.map((p, i) => (
                    <div key={i} className="p-4 border border-gray-100 rounded-lg hover:shadow-sm transition">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{p.etapa}</div>
                          <div className="text-sm text-gray-500 mt-1">{p.durationMin} min</div>
                        </div>
                        <div className="text-sm text-gray-700 font-medium bg-gray-50 px-2 py-1 rounded">
                          {p.start}
                        </div>
                      </div>

                      {p.groupsPlaying && p.groupsPlaying.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium text-green-700 mb-1">🎮 {t.groups_playing}:</div>
                          <div className="flex flex-wrap gap-1">
                            {p.groupsPlaying.map(groupName => (
                              <span
                                key={groupName}
                                className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200"
                              >
                                {groupName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.groupsPlank && p.groupsPlank.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium text-orange-700 mb-1">💪 {t.groups_plank}:</div>
                          <div className="flex flex-wrap gap-1">
                            {p.groupsPlank.map(groupName => (
                              <span
                                key={groupName}
                                className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full border border-orange-200"
                              >
                                {groupName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.groupsCarnival && p.groupsCarnival.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium text-purple-700 mb-1">🎉 {t.groups_carnival}:</div>
                          <div className="flex flex-wrap gap-1">
                            {p.groupsCarnival.map(groupName => (
                              <span
                                key={groupName}
                                className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full border border-purple-200"
                              >
                                {groupName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Informação dos Grupos */}
          <div className={`transform transition-all duration-500 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-3">{t.groups_distribution}</h2>
              {groups.length === 0 ? (
                <p className="text-gray-500">{t.no_plan}</p>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-park-50 rounded-lg">
                    <p className="text-gray-700 font-medium">
                      {t.total_groups}: <span className="text-park-600 font-semibold">{groups.length}</span>
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {groups.map((g, idx) => (
  <div key={g.name} className="border border-gray-100 rounded-md p-3 hover:shadow-sm transition">
    <div className="flex justify-between items-center">
      <div className="font-medium">{g.name}</div>
      {/* CORREÇÃO AQUI EM BAIXO 👇 */}
      <div className="text-sm text-gray-600">
        {g.size} {
          g.size !== 1 
            ? (language === 'en' ? 'people' : 'pessoas') 
            : (language === 'en' ? 'person' : 'pessoa')
        }
      </div>
    </div>
  </div>
))}
                  </div>

                  {/* Legenda */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">{t.groups_legend}:</h3>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></div>
                        <span>{t.legend_playing}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded-full"></div>
                        <span>{t.legend_plank}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded-full"></div>
                        <span>{t.legend_carnival}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-10 text-sm text-gray-500 text-center">
          {t.local_plan_footer}
        </footer>
      </div>
    </div>
  )
}