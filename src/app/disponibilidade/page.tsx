'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface TimeSlot {
  date: string // YYYY-MM-DD
  startTime: string
  endTime: string
  type: 'unavailable' | 'available'
  allDay?: boolean
}

// Gerar opções de tempo de 15 em 15 minutos (10:00 - 20:00)
const generateTimeOptions = () => {
  const options = []
  for (let hour = 10; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour < 20 || (hour === 20 && minute === 0)) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
  }
  return options
}

const timeOptions = generateTimeOptions()

export default function DisponibilidadePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('17:00')
  const [allDay, setAllDay] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Debug da sessão
  useEffect(() => {
    console.log('🔍 SESSÃO NO COMPONENTE:', {
      temSessao: !!session,
      user: session?.user,
      email: session?.user?.email,
      id: session?.user?.id,
      role: session?.user?.role
    })
  }, [session])


  // Lógica de autenticação e carregamento de dados
  useEffect(() => {
    if (status === 'loading') {
      return
    }
    if (status === 'unauthenticated') {
      router.replace('/')
      return
    }
    if (status === 'authenticated') {
      loadUnavailableSlots()
    }
  }, [status, session, router])


  // Carregar slots da base de dados
  const loadUnavailableSlots = async () => {
    try {
      console.log('🔄 Iniciando carregamento de indisponibilidades...')
      const response = await fetch('/api/employees/unavailable')
      
      console.log('📥 Resposta do GET:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Dados carregados:', data)
        
        if (data.unavailable && Array.isArray(data.unavailable)) {
          const slots: TimeSlot[] = data.unavailable.map((slot: any) => ({
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: 'unavailable',
            allDay: slot.allDay || false
          }))
          
          console.log(`📊 ${slots.length} slots convertidos`)
          setTimeSlots(slots)
        } else {
          console.log('📭 Nenhuma indisponibilidade encontrada')
          setTimeSlots([])
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Erro na resposta GET:', errorText)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar indisponibilidades:', error)
    }
  }

  // Guardar indisponibilidades na base de dados
  const saveUnavailableSlots = async (slots: TimeSlot[]): Promise<boolean> => {
    if (!session) {
      console.log('❌ Sem sessão para guardar')
      return false
    }
    
    setIsSaving(true)
    try {
      console.log('💾 INICIANDO GUARDAR NA BD...')
      
      const specificDates = slots.map(slot => ({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        allDay: slot.allDay || false,
        type: 'unavailable' as const
      }))

      console.log('📤 Enviando para API...')

      const response = await fetch('/api/employees/unavailable', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          specificDates: specificDates
        })
      })

      if (!response.ok) {
        const responseText = await response.text()
        console.error('❌ Erro na resposta PUT:', responseText)
        throw new Error(`API error: ${response.status} - ${responseText}`)
      }

      const result = await response.json()
      console.log('✅ RESPOSTA DA API (JSON):', result)
      
      if (result.success) {
        console.log('🎉 Dados guardados com sucesso!')
        return true
      } else {
        console.error('❌ API retornou success: false', result)
        return false
      }
        
    } catch (error) {
      console.error('❌ Erro ao guardar:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Gerar dias do mês para a grelha (COM PADDING)
  const getCalendarGrid = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDayOfMonth = new Date(year, month, 1)
    const startDayOfWeek = firstDayOfMonth.getDay() // 0=Dom, 1=Seg, ..., 6=Sáb
    const gridStartIndex = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const gridDays: (Date | null)[] = []
    for (let i = 0; i < gridStartIndex; i++) {
      gridDays.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      gridDays.push(new Date(year, month, day))
    }
    return gridDays
  }

  const calendarGridDays = getCalendarGrid(currentMonth)

  // Navegação entre meses
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Formatar data para exibição
  const formatDate = (date: Date) => {
    // Adiciona T12:00:00 para garantir que a data seja interpretada localmente
    // e evitar problemas de fuso horário que mudem o dia.
    const stableDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    return stableDate.toLocaleDateString('pt-PT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  }

  // Verificar se um dia tem indisponibilidade
  const getUnavailableSlotsForDate = (date: string) => {
    return timeSlots.filter(slot => 
      slot.date === date && slot.type === 'unavailable'
    )
  }

  // Verificar se um dia está marcado como dia todo
  const hasAllDayUnavailability = (date: string) => {
    return timeSlots.some(slot => 
      slot.date === date && slot.type === 'unavailable' && slot.allDay
    )
  }
  
  // Lidar com cliques múltiplos
  const handleDayClick = (dateString: string) => {
    setSelectedDates(prevDates => {
      if (prevDates.includes(dateString)) {
        return prevDates.filter(d => d !== dateString)
      }
      return [...prevDates, dateString]
    })
  }

  // Adicionar indisponibilidade (para múltiplos dias)
  const addUnavailability = async () => {
    if (selectedDates.length === 0) {
      console.log('❌ Nenhuma data selecionada')
      return
    }

    console.log(`🟡 INICIANDO ADD para ${selectedDates.length} dias...`, {
      selectedDates,
      startTime,
      endTime,
      allDay,
      email: session?.user?.email
    })

    setIsLoading(true)
    
    try {
      let updatedSlots = [...timeSlots]

      for (const date of selectedDates) {
        const newSlot: TimeSlot = {
          date: date,
          startTime: allDay ? '10:00' : startTime,
          endTime: allDay ? '20:00' : endTime,
          type: 'unavailable',
          allDay: allDay
        }

        if (allDay) {
          // Remove slots parciais se o dia todo for marcado
          updatedSlots = updatedSlots.filter(slot => slot.date !== date)
        } else {
          // Remove o "dia todo" se um slot parcial for adicionado
          updatedSlots = updatedSlots.filter(slot => !(slot.date === date && slot.allDay));
        }
        
        updatedSlots.push(newSlot)
      }
      
      // Remover duplicados (embora a lógica acima deva prevenir a maioria)
      const uniqueSlots = Array.from(new Map(updatedSlots.map(slot => 
        [`${slot.date}-${slot.startTime}-${slot.endTime}-${slot.allDay}`, slot]
      )).values());

      console.log('📊 Slots atualizados (antes de guardar):', uniqueSlots.length)
      
      setTimeSlots(uniqueSlots)
      
      const success = await saveUnavailableSlots(uniqueSlots)
      if (!success) {
        throw new Error('Erro ao guardar na base de dados')
      }
      
      console.log('✅ Sucesso - resetando formulário')
      setStartTime('10:00')
      setEndTime('17:00')
      setAllDay(false)
      setSelectedDates([])
      
      alert(`Indisponibilidade adicionada para ${selectedDates.length} dia(s) com sucesso!`)
    } catch (error) {
      console.error('❌ Erro ao adicionar indisponibilidade:', error)
      alert('Erro ao adicionar indisponibilidade: ' + (error as Error).message)
      loadUnavailableSlots() // Recarregar dados para garantir consistência
    } finally {
      setIsLoading(false)
    }
  }

  // Remover indisponibilidade
  const removeUnavailability = async (slotToRemove: TimeSlot) => {
    const updatedSlots = timeSlots.filter(slot => 
      !(slot.date === slotToRemove.date && 
        slot.startTime === slotToRemove.startTime && 
        slot.endTime === slotToRemove.endTime)
    )
    
    setTimeSlots(updatedSlots)
      setSelectedDates(prev => prev.filter(date => date !== slotToRemove.date))
    
    const success = await saveUnavailableSlots(updatedSlots)
    if (!success) {
      alert('Erro ao remover indisponibilidade')
      loadUnavailableSlots() // Recarregar se falhar
    }
  }

  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  // ⬇️ ALTERAÇÃO: Filtrar os slots apenas para o mês atual ⬇️
  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth(); // 0 (Jan) - 11 (Dez)

  const slotsForThisMonth = timeSlots.filter(slot => {
    // Adiciona T12:00 (meio-dia local) para evitar que o fuso horário
    // mude a data para o dia anterior ou seguinte.
    const slotDate = new Date(slot.date + 'T12:00:00'); 
    
    return slotDate.getFullYear() === currentYear && slotDate.getMonth() === currentMonthIndex;
  });
  // ⬆️ FIM DA ALTERAÇÃO ⬆️


  // Ecrã de loading enquanto a sessão é verificada
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">A verificar sessão...</p>
        </div>
      </div>
    )
  }

  // Renderiza a página principal SE estiver autenticado
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Gerir Minha Disponibilidade
            </h1>
            <p className="text-gray-600 mt-2">
              Marque os horários em que não está disponível para trabalhar
            </p>
            {isSaving && (
              <p className="text-sm text-blue-600 mt-1">💾 A guardar na base de dados...</p>
            )}
          </div>
          <button
            onClick={() => router.push('/portal')}
            className="hidden sm:inline-block px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Voltar
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Calendário */}
          <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                ←
              </button>
              <h2 className="text-xl font-semibold">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                →
              </button>
            </div>

            {/* Contador de dias selecionados - NOVO */}
            {selectedDates.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-800 font-medium">
                      {selectedDates.length} {selectedDates.length === 1 ? 'dia selecionado' : 'dias selecionados'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDates([])}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Limpar seleção
                  </button>
                </div>
              </div>
            )}

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
              {weekdays.map(day => (
                <div key={day} className="text-center font-semibold text-gray-500 text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarGridDays.map((day, index) => {
                
                if (!day) {
                  return <div key={`pad-${index}`} className="min-h-[4.5rem] sm:min-h-20 border border-transparent"></div>
                }
                
                const dateString = day.toISOString().split('T')[0]
                const unavailableSlots = getUnavailableSlotsForDate(dateString)
                const isSelected = selectedDates.includes(dateString)
                const isAllDay = hasAllDayUnavailability(dateString)
                
                return (
                  <button
                    key={dateString}
                    onClick={() => handleDayClick(dateString)}
                    className={`
                      p-1 sm:p-3 rounded-lg border text-left min-h-[4.5rem] sm:min-h-20 transition-all duration-200 flex flex-col justify-start relative
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-100 shadow-md ring-2 ring-blue-300 transform scale-105' 
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                      ${isAllDay ? 'bg-red-100 border-red-300' : ''}
                      ${unavailableSlots.length > 0 && !isAllDay ? 'bg-red-50 border-red-200' : ''}
                      ${isSelected && isAllDay ? 'border-blue-500 bg-gradient-to-br from-blue-100 to-red-100' : ''}
                      ${isSelected && unavailableSlots.length > 0 && !isAllDay ? 'border-blue-500 bg-gradient-to-br from-blue-100 to-red-50' : ''}
                    `} 
                  >
                    {/* Indicador de seleção - NOVO */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                    )}
                    
                    <div className={`font-semibold text-sm ${isSelected ? 'text-blue-800' : ''}`}>
                      {day.getDate()}
                    </div>
                    
                    {isAllDay && (
                      <div className="hidden sm:block text-[10px] sm:text-xs text-red-700 mt-0.5 sm:mt-1 font-medium">
                        Dia Todo
                      </div>
                    )}
                    {unavailableSlots.length > 0 && !isAllDay && (
                      <div className="hidden sm:block text-[10px] sm:text-xs text-red-600 mt-0.5 sm:mt-1">
                        {unavailableSlots.length} horário(s)
                      </div>
                    )}
                    
                    {/* Indicador mobile para dias selecionados - NOVO */}
                    
                  </button>
                )
              })}
            </div>

            {/* Legenda - NOVO */}
            <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-100 border-2 border-blue-500 rounded"></div>
                <span>Dia selecionado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-100 border-2 border-red-300 rounded"></div>
                <span>Indisponível</span>
              </div>
            </div>
          </div>

          {/* Painel de gestão */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">
              {selectedDates.length === 0 && 'Selecione um ou mais dias'}
              {selectedDates.length === 1 && `Gestão para ${formatDate(new Date(selectedDates[0] + 'T12:00:00'))}`}
              {selectedDates.length > 1 && `Gestão para ${selectedDates.length} dias selecionados`}
            </h3>

            {selectedDates.length > 0 && (
              <div className="space-y-4">
                {/* Lista de dias selecionados - NOVO */}
                {selectedDates.length > 1 && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2 text-sm">Dias selecionados:</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {selectedDates.map(date => (
                        <div key={date} className="flex items-center justify-between py-1 text-sm">
                          <span>{new Date(date + 'T12:00:00').toLocaleDateString('pt-PT')}</span>
                          <button
                            onClick={() => setSelectedDates(prev => prev.filter(d => d !== date))}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opção Dia Todo */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
                    Não posso trabalhar o dia todo
                  </label>
                </div>

                {!allDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horário Indisponível
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Início</label>
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          {timeOptions.map(time => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fim</label>
                        <select
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          {timeOptions.map(time => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Horário de trabalho: 10:00 - 20:00
                    </p>
                  </div>
                )}

                <button
                  onClick={addUnavailability}
                  disabled={isLoading || (!allDay && startTime >= endTime)}
                  className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'A adicionar...' : allDay ? 'Marcar Dia Todo como Indisponível' : 'Marcar como Indisponível'}
                </button>

                {selectedDates.length === 1 && getUnavailableSlotsForDate(selectedDates[0]).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 text-gray-800">Horários Indisponíveis:</h4>
                    <div className="space-y-2">
                      {getUnavailableSlotsForDate(selectedDates[0]).map((slot, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200"
                        >
                          <div>
                            <span className="font-medium">
                              {slot.allDay ? 'Dia Todo' : `${slot.startTime} - ${slot.endTime}`}
                            </span>
                            {slot.allDay && (
                              <span className="text-xs text-red-600 ml-2">(10:00 - 20:00)</span>
                            )}
                          </div>
                          <button
                            onClick={() => removeUnavailability(slot)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedDates.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                Selecione um ou mais dias no calendário para gerir a disponibilidade.
              </p>
            )}
          </div>
        </div>

        {/* Resumo do mês */}
        <div className="mt-8 bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Resumo do Mês</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {/* ⬇️ ALTERAÇÃO: Usar 'slotsForThisMonth' ⬇️ */}
                {calendarGridDays.filter(d => d).length - new Set(slotsForThisMonth.map(s => s.date)).size}
              </div>
              <div className="text-sm text-green-600">Dias Disponíveis</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {/* ⬇️ ALTERAÇÃO: Usar 'slotsForThisMonth' ⬇️ */}
                {new Set(slotsForThisMonth.map(s => s.date)).size}
              </div>
              <div className="text-sm text-red-600">Dias com Indisponibilidade</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {/* ⬇️ ALTERAÇÃO: Usar 'slotsForThisMonth' ⬇️ */}
                {slotsForThisMonth.filter(slot => !slot.allDay).length}
              </div>
              <div className="text-sm text-blue-600">Horários Indisponíveis</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {/* ⬇️ ALTERAÇÃO: Usar 'slotsForThisMonth' ⬇️ */}
                {slotsForThisMonth.filter(slot => slot.allDay).length}
              </div>
              <div className="text-sm text-orange-600">Dias Completos</div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center sm:hidden">
            <button
              onClick={() => router.push('/portal')}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Voltar ao Portal
            </button>
        </div>

      </div>
    </div>
  )
}