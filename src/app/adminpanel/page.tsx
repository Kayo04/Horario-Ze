'use client'
import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  CalendarDaysIcon, ClockIcon, ChartBarIcon, 
  CalendarIcon, UserGroupIcon,
} from '@heroicons/react/24/outline'

// --- INTERFACES ---
interface TimeSlot {
  date: string; startTime: string; endTime: string; type: 'unavailable' | 'available'; allDay?: boolean;
}
interface WorkShift {
  _id: string; date: string; startTime: string; endTime: string; totalHours: number;
}
interface Employee {
  id: string; name: string; email: string; code: string; 
}

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// --- HELPERS ---
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const getCalendarGrid = (date: Date) => {
  const year = date.getFullYear(); const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const gridStart = (startDay === 0) ? 6 : startDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[] = [];
  for(let i=0; i<gridStart; i++) grid.push(null);
  for(let d=1; d<=daysInMonth; d++) grid.push(new Date(year, month, d));
  return grid;
}

const sumHours = (shifts: WorkShift[]) => shifts.reduce((acc, s) => acc + s.totalHours, 0);

const getWeekRange = (dateStr: string) => {
  const d = new Date(dateStr); const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d); monday.setDate(diff); monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
  return { start: monday, end: sunday };
}

export default function AdminPanelPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('')
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string>('')
  
  // 🆕 ABAS: 'availability' | 'performance'
  const [activeTab, setActiveTab] = useState<'availability' | 'performance'>('performance')

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]) // Disponibilidade
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]) // Performance
  const [isLoading, setIsLoading] = useState(false)

  // 1. AUTH
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated' || (status === 'authenticated' && session.user.role !== 'admin')) {
      router.replace('/portal')
    }
  }, [session, status, router])

  // 2. CARREGAR FUNCIONÁRIOS
  useEffect(() => {
    if (status === 'authenticated' && session.user.role === 'admin') {
      const fetchEmployees = async () => {
        setIsLoadingEmployees(true)
        try {
          const response = await fetch('/api/employees') // A tua API
          if (response.ok) {
            const data = await response.json()
            // Garante que existe 'code'
            const list = Array.isArray(data) ? data : (data.employees || []);
            const safeEmployees = list.map((emp: any) => ({
                id: emp._id || emp.id,
                name: emp.name,
                email: emp.email,
                code: emp.code || getInitials(emp.name)
            }));
            setEmployees(safeEmployees)
          }
        } catch (error) { console.error(error) }
        setIsLoadingEmployees(false)
      }
      fetchEmployees()
    }
  }, [session, status])

  // 3. CARREGAR DADOS (BASEADO NA ABA)
  useEffect(() => {
    if (!selectedEmployeeId) { setTimeSlots([]); setWorkShifts([]); setSelectedDate(null); return; }
    
    setIsLoading(true)
    setSelectedDate(null)

    if (activeTab === 'availability') {
        fetch(`/api/admin/unavailable/${selectedEmployeeId}`)
          .then(res => res.json())
          .then(data => {
             setTimeSlots(data.unavailable ? data.unavailable.map((s:any) => ({...s, type: 'unavailable'})) : []);
             setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
    } else {
        if (selectedEmployeeCode) {
            fetch(`/api/admin/shifts/${selectedEmployeeCode}`)
              .then(res => res.json())
              .then(data => {
                 setWorkShifts(data.shifts || []);
                 setIsLoading(false);
              })
              .catch(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }
  }, [selectedEmployeeId, activeTab, selectedEmployeeCode])

  // --- HELPERS ---
  const calendarGridDays = getCalendarGrid(currentMonth)
  const previousMonth = () => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); setSelectedDate(null); }
  const nextMonth = () => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); setSelectedDate(null); }

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value
    const selectedEmp = employees.find(emp => emp.id === newId)
    setSelectedEmployeeId(newId)
    setSelectedEmployeeName(selectedEmp?.name || '')
    setSelectedEmployeeCode(selectedEmp?.code || '')
  }

  const formatDetailDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00')
    return date.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const getUnavailableSlotsForDate = (date: string) => timeSlots.filter(slot => slot.date === date && slot.type === 'unavailable')
  const hasAllDayUnavailability = (date: string) => timeSlots.some(slot => slot.date === date && slot.type === 'unavailable' && slot.allDay)

  const stats = useMemo(() => {
    const baseDateStr = selectedDate || new Date().toISOString().split('T')[0]
    const baseDate = new Date(baseDateStr)
    
    const today = workShifts.filter(s => s.date === baseDateStr)
    const { start, end } = getWeekRange(baseDateStr)
    const week = workShifts.filter(s => { const d = new Date(s.date); return d >= start && d <= end })
    const month = workShifts.filter(s => { const d = new Date(s.date); return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear() })
    const year = workShifts.filter(s => new Date(s.date).getFullYear() === currentMonth.getFullYear())

    return { 
        hoursToday: sumHours(today), 
        hoursWeek: sumHours(week), 
        hoursMonth: sumHours(month), 
        hoursYear: sumHours(year) 
    }
  }, [selectedDate, workShifts, currentMonth])

  if (status === 'loading' || !session || session.user.role !== 'admin') return <div className="p-10 text-center">A carregar...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-bold text-gray-800">Painel de Admin</h1><p className="text-gray-600 mt-2">Gestão de Equipas e Horários</p></div>
            <button onClick={() => router.push('/portal')} className="px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50">Voltar</button>
        </header>

        <div className="mb-6 max-w-lg">
          <label className="block text-lg font-medium text-gray-700 mb-2">Selecionar Funcionário</label>
          <select value={selectedEmployeeId} onChange={handleEmployeeChange} className="w-full p-3 border rounded shadow-sm focus:ring-2 focus:ring-indigo-500" disabled={isLoadingEmployees}>
            <option value="" disabled>{isLoadingEmployees ? 'A carregar...' : 'Selecione...'}</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>)}
          </select>
        </div>

        {selectedEmployeeId && (
            <div className="flex space-x-4 mb-8 border-b border-gray-200">
                <button onClick={() => setActiveTab('availability')} className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'availability' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}><UserGroupIcon className="w-5 h-5"/> Gerir Disponibilidade</button>
                <button onClick={() => setActiveTab('performance')} className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'performance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}><ChartBarIcon className="w-5 h-5"/> Ver Performance (Horas)</button>
            </div>
        )}
        
        {isLoading && <div className="text-center p-10">A carregar dados...</div>}

        {/* --- ABA 1: DISPONIBILIDADE --- */}
        {selectedEmployeeId && activeTab === 'availability' && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
            <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-6">
                <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded">←</button>
                <h3 className="text-xl font-semibold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">→</button>
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
                {weekdays.map(d => <div key={d} className="text-center font-semibold text-gray-500 text-sm py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarGridDays.map((day, index) => {
                  if (!day) return <div key={`pad-${index}`} className="min-h-[4.5rem] sm:min-h-20"></div>
                  const dateString = day.toISOString().split('T')[0]
                  const unavailableSlots = getUnavailableSlotsForDate(dateString)
                  const isAllDay = hasAllDayUnavailability(dateString)
                  return (
                    <button key={dateString} onClick={() => setSelectedDate(dateString)} className={`p-1 sm:p-3 rounded-lg border text-left min-h-[4.5rem] sm:min-h-20 flex flex-col justify-start transition-colors ${selectedDate === dateString ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${isAllDay ? 'bg-red-100 border-red-300' : ''} ${unavailableSlots.length > 0 && !isAllDay ? 'bg-red-50 border-red-200' : ''} ${unavailableSlots.length === 0 && selectedDate !== dateString ? 'bg-white' : ''} ${unavailableSlots.length === 0 && selectedDate === dateString ? '' : 'hover:bg-gray-50'}`}>
                      <div className="font-semibold text-sm">{day.getDate()}</div>
                      {isAllDay && <div className="hidden sm:block text-[10px] sm:text-xs text-red-700 mt-0.5 font-medium">Indisponível</div>}
                      {unavailableSlots.length > 0 && !isAllDay && <div className="hidden sm:block text-[10px] sm:text-xs text-red-600 mt-0.5">{unavailableSlots.length} indisp.</div>}
                      {unavailableSlots.length === 0 && <div className="hidden sm:block text-[10px] sm:text-xs text-green-600 mt-0.5">Livre</div>}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="lg:col-span-1 flex flex-col gap-8">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">{selectedDate ? `Detalhes: ${formatDetailDate(selectedDate)}` : "Detalhes do Dia"}</h3>
                    {!selectedDate && <p className="text-gray-500 text-center py-8">Clique num dia.</p>}
                    {selectedDate && (
                        <div className="space-y-2">
                        {getUnavailableSlotsForDate(selectedDate).length === 0 ? (
                            <div className="p-3 bg-green-50 rounded border border-green-200 text-green-700 font-medium">Disponível o dia todo.</div>
                        ) : (
                            getUnavailableSlotsForDate(selectedDate).map((slot, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
                                <span className="font-medium text-red-800">{slot.allDay ? 'Indisponível (Dia Todo)' : `${slot.startTime} - ${slot.endTime}`}</span>
                            </div>
                            ))
                        )}
                        </div>
                    )}
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Resumo do Mês</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded border border-green-200">
                            <div className="text-xl font-bold text-green-600">{calendarGridDays.filter(d => d).length - new Set(timeSlots.map(s => s.date)).size}</div>
                            <div className="text-xs text-green-600">Dias Livres</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded border border-red-200">
                            <div className="text-xl font-bold text-red-600">{new Set(timeSlots.map(s => s.date)).size}</div>
                            <div className="text-xs text-red-600">Dias Indisp.</div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* --- ABA 2: PERFORMANCE (COM HORAS DO MONGODB) --- */}
        {selectedEmployeeId && activeTab === 'performance' && !isLoading && (
            <div className="space-y-8 animate-in fade-in">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`bg-white p-5 rounded-xl border ${selectedDate ? 'border-indigo-500 bg-indigo-50' : ''}`}>
                        <div className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-2"><ClockIcon className="w-4 h-4"/> {selectedDate ? 'Dia Selecionado' : 'Hoje'}</div>
                        <div className="text-3xl font-bold text-gray-800">{stats.hoursToday}h</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border">
                        <div className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-2"><CalendarDaysIcon className="w-4 h-4"/> Esta Semana</div>
                        <div className="text-3xl font-bold text-gray-800">{stats.hoursWeek}h</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border">
                        <div className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> Mês Atual</div>
                        <div className="text-3xl font-bold text-gray-800">{stats.hoursMonth}h</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border">
                        <div className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-2"><ChartBarIcon className="w-4 h-4"/> Ano {currentMonth.getFullYear()}</div>
                        <div className="text-3xl font-bold text-gray-800">{stats.hoursYear}h</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow border">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded">←</button>
                            <h3 className="text-lg font-bold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">→</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                            {weekdays.map(d => <div key={d} className="text-center text-xs font-bold text-gray-400">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                            {calendarGridDays.map((day, idx) => {
                                if (!day) return <div key={idx} className="h-20"></div>
                                const dStr = day.toISOString().split('T')[0]
                                const shifts = workShifts.filter(s => s.date === dStr)
                                const isSelected = selectedDate === dStr
                                return (
                                    <button key={dStr} onClick={() => setSelectedDate(dStr)} 
                                        className={`h-20 sm:h-24 p-1 border rounded flex flex-col items-start justify-between transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'hover:bg-gray-50 border-gray-100'} ${shifts.length > 0 ? 'bg-blue-50/30' : 'bg-white'}`}>
                                        <span className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>{day.getDate()}</span>
                                        <div className="w-full flex flex-col gap-1">
                                            {shifts.map((s, i) => (
                                                <span key={i} className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold w-full text-left truncate">{s.startTime}-{s.endTime}</span>
                                            ))}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow border h-fit">
                        <h3 className="font-bold border-b pb-2 mb-4 text-lg">{selectedDate ? formatDetailDate(selectedDate) : 'Detalhes do Turno'}</h3>
                        {selectedDate && (
                            <div>
                                {workShifts.filter(s => s.date === selectedDate).length === 0 ? 
                                    <p className="text-gray-400 text-center py-8">Sem turnos registados.</p> : 
                                workShifts.filter(s => s.date === selectedDate).map((s, i) => (
                                    <div key={i} className="bg-blue-50 p-4 rounded-lg mb-3 border border-blue-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Turno</span>
                                            <span className="bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded shadow-sm">{s.totalHours}h</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-blue-900 font-bold text-lg"><ClockIcon className="w-5 h-5"/> {s.startTime} - {s.endTime}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!selectedDate && <p className="text-gray-500 text-center py-10">Selecione um dia.</p>}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}