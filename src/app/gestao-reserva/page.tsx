'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link' // <-- IMPORTAR O LINK

type PlanoItem = {
  etapa: string
  start: string
  durationMin: number
  groupsPlaying?: string[]
  groupsPlank?: string[]
  groupsCarnaval?: string[]
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
  const [people, setPeople] = useState<number | ''>('')
  const [startTime, setStartTime] = useState<string>('14:30')
  const [carnival, setCarnival] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [plan, setPlan] = useState<PlanoItem[]>([])
  const [groups, setGroups] = useState<Grupo[]>([])
  const [summary, setSummary] = useState<PlanSummary | null>(null) 
  const [showResult, setShowResult] = useState(false)

  const generateHalfHourOptions = () => {
    const out: string[] = []
    for (let h = 10; h <= 20; h++) {
      out.push(`${String(h).padStart(2, '0')}:00`)
      if (h < 20) out.push(`${String(h).padStart(2, '0')}:30`)
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
      arr.push({ name: `Grupo ${i + 1}`, size })
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

    // Chegada e explicação + vídeo
    result.push({ etapa: 'Chegada e explicação rápida', start: fromMinutes(current), durationMin: 5 })
    current += 5
    result.push({ etapa: 'Vídeo introdutório', start: fromMinutes(current), durationMin: 3 })
    current += 3

    // Estado de cada grupo
    const state = groups.map(g => ({
      name: g.name,
      size: g.size,
      needsPlay: true,
      needsPlank: true,
    }))

    // --- FASE 1: Loop de Jogo Principal (e Plank em paralelo) ---
    while (state.some(s => s.needsPlay)) {
      // 1. Escolher até 3 para jogar
      const toPlay = state.filter(s => s.needsPlay).slice(0, 3)
      if (toPlay.length === 0) break

      // 2. Simular o Plank nas 2 estações durante os 30 min de Jogo
      const groupsForThisPlankBlock: string[] = []
      let station1TimeUsed = 0
      let station2TimeUsed = 0
      const PLANK_WINDOW = 30 
      const PLANK_TRANSITION = TRANSITION_TIME 

      // Obter lista de candidatos a plank, com prioridade
      const waitingToPlank = state.filter(s =>
        s.needsPlank && s.needsPlay && !toPlay.find(p => p.name === s.name)
      )
      const finishedPlayToPlank = state.filter(s => s.needsPlank && !s.needsPlay)
      const plankCandidates = [...waitingToPlank, ...finishedPlayToPlank]

      // Iterar pelos candidatos e tentar encaixá-los nas estações
      for (const candidate of plankCandidates) {
        const sessionCost = candidate.size + PLANK_TRANSITION 
        
        if (station1TimeUsed + sessionCost <= PLANK_WINDOW) {
          station1TimeUsed += sessionCost
          groupsForThisPlankBlock.push(candidate.name)
          const s = state.find(x => x.name === candidate.name)!
          s.needsPlank = false
        }
        else if (station2TimeUsed + sessionCost <= PLANK_WINDOW) {
          station2TimeUsed += sessionCost
          groupsForThisPlankBlock.push(candidate.name)
          const s = state.find(x => x.name === candidate.name)!
          s.needsPlank = false
        }
      }
      
      result.push({
        etapa: `Jogo principal (${toPlay.map(g => g.name).join(', ')})`,
        start: fromMinutes(current),
        durationMin: 30,
        groupsPlaying: toPlay.map(g => g.name),
        groupsPlank: groupsForThisPlankBlock, 
      })

      for (const g of toPlay) {
        const s = state.find(x => x.name === g.name)!
        s.needsPlay = false
      }

      current += 30 

      if (state.some(s => s.needsPlay)) {
        result.push({ etapa: 'Transição entre grupos', start: fromMinutes(current), durationMin: TRANSITION_TIME }) 
        current += TRANSITION_TIME 
      }
    }

    // --- FASE 2: Plank Cleanup ---
    while (state.some(s => s.needsPlank)) {
      if (result.at(-1)?.etapa.includes('Transição') === false) {
         result.push({ etapa: 'Transição para Plank', start: fromMinutes(current), durationMin: TRANSITION_TIME }) 
         current += TRANSITION_TIME 
      }

      const toPlank = state.filter(s => s.needsPlank).slice(0, 2)
      if (toPlank.length === 0) break

      const plankDur = Math.max(...toPlank.map(g => g.size)) 

      result.push({
        etapa: `Plank (Restantes) (${toPlank.map(g => g.name).join(', ')})`,
        start: fromMinutes(current),
        durationMin: plankDur,
        groupsPlank: toPlank.map(g => g.name),
      })

      for (const g of toPlank) {
        const s = state.find(x => x.name === g.name)!
        s.needsPlank = false
      }
      current += plankDur

      if (state.some(s => s.needsPlank)) {
         result.push({ etapa: 'Transição Plank', start: fromMinutes(current), durationMin: TRANSITION_TIME }) 
         current += TRANSITION_TIME 
      }
    }


    // --- FASE 3: Carnaval (Se aplicável) ---
    if (carnival) {
      if (result.at(-1)?.etapa.includes('Transição') === false) {
         result.push({ etapa: 'Transição para Carnaval', start: fromMinutes(current), durationMin: TRANSITION_TIME }) 
         current += TRANSITION_TIME 
      }
      
      const totalBatches = Math.ceil(nPeople / 4)
      const numRondasCarnaval = Math.ceil(totalBatches / 3) // 3 estações
      let batchCounter = 1

      for (let i = 0; i < numRondasCarnaval; i++) {
        const rondaNum = i + 1
        const groupsInThisRonda: string[] = []
        
        for (let j = 0; j < 3; j++) {
          if (batchCounter <= totalBatches) {
            groupsInThisRonda.push(`Grupo C${batchCounter}`)
            batchCounter++
          }
        }
        
        result.push({
          etapa: `Carnaval (Ronda ${rondaNum}/${numRondasCarnaval})`,
          start: fromMinutes(current),
          durationMin: 10,
          groupsCarnaval: groupsInThisRonda, 
        })
        current += 10 

        if (rondaNum < numRondasCarnaval) {
          result.push({ etapa: 'Transição Carnaval', start: fromMinutes(current), durationMin: TRANSITION_TIME })
          current += TRANSITION_TIME
        }
      }
    }

    // --- FASE 4: Final ---
    result.push({ etapa: 'Troca final e recolha dos óculos', start: fromMinutes(current), durationMin: 5 })
    current += 5

    return result
  }


  const handleGenerate = () => {
    if (!people || people <= 0) {
      alert('Coloca o número válido de pessoas (≥1).')
      return
    }
    if (!startTime) {
      alert('Escolhe uma hora de início.')
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
        
        const lastItem = computedPlan[computedPlan.length - 1];
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
    <div className="min-h-screen p-8 bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8"> {/* <-- MUDANÇA AQUI: Removido flex e justify-between */}
          
          {/* --- BOTÃO DE VOLTAR ADICIONADO --- */}
          <div className="mb-4">
            <Link href="/" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Voltar à página principal
            </Link>
          </div>
          {/* --- FIM DO BOTÃO DE VOLTAR --- */}

          <div>
            <h1 className="text-3xl font-semibold">Gestão da Reserva</h1>
            <p className="text-sm text-gray-600 mt-1">Gera o cronograma e distribui grupos automaticamente.</p>
          </div>
        </header>

        {/* Controlo */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Número de pessoas</label>
              <input
                type="number"
                min={1}
                value={people}
                onChange={(e) => setPeople(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
                placeholder="Ex: 50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Hora de início</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
              >
                {generateHalfHourOptions().map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Vão fazer carnaval?</label>
              <select
                value={carnival ? 'sim' : 'nao'}
                onChange={(e) => setCarnival(e.target.value === 'sim')} 
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none"
              >
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-60"
              >
                {loading ? 'A gerar plano...' : 'Gerar Plano'}
              </button>
            </div>
          </div>

          {loading && (
            <div className="mt-4">
              <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-gradient-to-r from-indigo-400 via-indigo-600 to-indigo-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">A calcular plano — {progress}%</div>
            </div>
          )}
        </div>

        {/* --- BLOCO DE SUMÁRIO --- */}
        {showResult && summary && (
          <div className={`bg-white shadow-md rounded-lg p-6 mb-8 transform transition-all duration-500 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-xl font-semibold mb-4 text-indigo-700">Resumo da Experiência</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
              {/* Bloco 1: Hora Início */}
              <div>
                <div className="text-sm font-medium text-gray-500">Início</div>
                <div className="text-2xl font-bold text-gray-800">{summary.startTime}</div>
              </div>
              {/* Bloco 2: Hora Fim */}
              <div>
                <div className="text-sm font-medium text-gray-500">Fim Previsto</div>
                <div className="text-2xl font-bold text-gray-800">{summary.endTime}</div>
              </div>
              {/* Bloco 3: Duração Total */}
              <div>
                <div className="text-sm font-medium text-gray-500">Duração Total</div>
                <div className="text-2xl font-bold text-gray-800">{formatDuration(summary.totalDurationMin)}</div>
              </div>
              {/* Bloco 4: Pessoas */}
              <div>
                <div className="text-sm font-medium text-gray-500">Total Pessoas</div>
                <div className="text-2xl font-bold text-gray-800">{summary.totalPeople}</div>
              </div>
              {/* Bloco 5: Grupos G */}
              <div>
                <div className="text-sm font-medium text-gray-500">Grupos (Jogo/Plank)</div>
                <div className="text-2xl font-bold text-gray-800">{summary.totalGroups}</div>
              </div>
              {/* Bloco 6: Grupos C (Condicional) */}
              {summary.totalCarnivalGroups && (
                <div>
                  <div className="text-sm font-medium text-gray-500">Grupos (Carnaval)</div>
                  <div className="text-2xl font-bold text-gray-800">{summary.totalCarnivalGroups}</div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* --- FIM DO BLOCO DE SUMÁRIO --- */}


        {/* Resultado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cronograma com Grupos */}
          <div className={`transform transition-all duration-500 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-3">Cronograma com Distribuição de Grupos</h2>
              {plan.length === 0 ? (
                <p className="text-gray-500">Sem plano gerado ainda.</p>
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

                      {/* Grupos a Jogar */}
                      {p.groupsPlaying && p.groupsPlaying.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium text-green-700 mb-1">🎮 Grupos a Jogar:</div>
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

                      {/* Grupos a Fazer Plank */}
                      {p.groupsPlank && p.groupsPlank.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium text-orange-700 mb-1">💪 Grupos a Fazer Plank:</div>
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

                      {/* Grupos em Carnaval */}
                      {p.groupsCarnaval && p.groupsCarnaval.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium text-purple-700 mb-1">🎉 Grupos em Carnaval:</div>
                          <div className="flex flex-wrap gap-1">
                            {p.groupsCarnaval.map(groupName => (
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
              <h2 className="text-xl font-semibold mb-3">Distribuição de Grupos</h2>
              {groups.length === 0 ? (
                <p className="text-gray-500">Os grupos serão mostrados aqui quando o plano for gerado.</p>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                    <p className="text-gray-700 font-medium">
                      Total de grupos (Jogo/Plank): <span className="text-indigo-600 font-semibold">{groups.length}</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Cada round: máximo 18 pessoas • Plank: 1 min por pessoa • Transição: 5 min
                    </p>
                  </div>
                  <div className="space-y-3">
                    {groups.map((g, idx) => (
                      <div key={g.name} className="border border-gray-100 rounded-md p-3 hover:shadow-sm transition">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">{g.name}</div>
                          <div className="text-sm text-gray-600">{g.size} pessoa{g.size !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legenda */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Legenda:</h3>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></div>
                        <span>Grupo a jogar</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded-full"></div>
                        <span>Grupo a fazer plank</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded-full"></div>
                        <span>Grupo em carnaval</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-10 text-sm text-gray-500 text-center">
          Plano gerado localmente — sem ligação a base de dados.
        </footer>
      </div>
    </div>
  )
}