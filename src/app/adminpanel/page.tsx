'use client'
import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  ChartBarIcon, 
  CalendarIcon,
  UserGroupIcon,
  PencilSquareIcon, // Ícone Editar
  TrashIcon,        // Ícone Apagar
  XMarkIcon         // Ícone Fechar
} from '@heroicons/react/24/outline'

// --- INTERFACES ---
interface TimeSlot {
  date: string
  startTime: string
  endTime: string
  type: 'unavailable' | 'available'
  allDay?: boolean
}

interface WorkShift {
  _id: string // MongoDB usa _id
  date: string
  startTime: string
  endTime: string
  totalHours: number
}

interface Employee {
  id: string
  name: string
  email: string
  code: string 
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

const sumHours = (shifts: WorkShift[]) => {
  return shifts.reduce((acc, shift) => acc + shift.totalHours, 0)
}

const getWeekRange = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date)
  monday.setDate(diff); monday.setHours(0,0,0,0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999)
  return { start: monday, end: sunday }
}

export default function AdminPanelPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('')
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string>('')
  
  const [activeTab, setActiveTab] = useState<'availability' | 'performance'>('performance')

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  const [workShifts, setWorkShifts] = useState<WorkShift[]>([])
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false)

  // ESTADOS DE EDIÇÃO
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null)
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')

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
          const response = await fetch('/api/employees')
          if (response.ok) {
            const data = await response.json()
            const list = Array.isArray(data) ? data : (data.employees || []);
            const safeEmployees = list.map((emp: any) => ({
                id: emp._id || emp.id,
                name: emp.name,
                email: emp.email,
                code: emp.code || getInitials(emp.name)
            }));
            setEmployees(safeEmployees)
          }
        } catch (error) { console.error('Erro:', error) }
        setIsLoadingEmployees(false)
      }
      fetchEmployees()
    }
  }, [session, status])

  // 3. CARREGAR DADOS
  const loadData = () => {
    if (!selectedEmployeeId) { setTimeSlots([]); setWorkShifts([]); setSelectedDate(null); return; }
    
    // Não limpar selectedDate aqui para não perder o foco se estivermos a editar
    
    if (activeTab === 'availability') {
        setIsLoadingSlots(true);
        fetch(`/api/admin/unavailable/${selectedEmployeeId}`)
          .then(res => res.json())
          .then(data => {
             setTimeSlots(data.unavailable ? data.unavailable.map((s:any) => ({...s, type: 'unavailable'})) : []);
             setIsLoadingSlots(false);
          })
          .catch(() => setIsLoadingSlots(false));
    } else {
        if (selectedEmployeeCode) {
            setIsLoadingPerformance(true);
            fetch(`/api/admin/shifts/${selectedEmployeeCode}`)
              .then(res => res.json())
              .then(data => {
                 setWorkShifts(data.shifts || []);
                 setIsLoadingPerformance(false);
              })
              .catch(() => setIsLoadingPerformance(false));
        } else {
            setIsLoadingPerformance(false);
        }
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEmployeeId, activeTab, selectedEmployeeCode]);

  // --- AÇÕES DE EDIÇÃO E APAGAR ---

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Tem a certeza que quer apagar este turno?")) return;

    try {
        const res = await fetch('/api/admin/shift', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id })
        });
        if (res.ok) {
            // Atualizar localmente ou recarregar
            setWorkShifts(prev => prev.filter(s => s._id !== id));
            alert("Turno apagado.");
        } else {
            alert("Erro ao apagar.");
        }
    } catch (e) {
        alert("Erro de conexão.");
    }
  }

  const openEditModal = (shift: WorkShift) => {
    setEditingShift(shift);
    setEditStartTime(shift.startTime);
    setEditEndTime(shift.endTime);
  }

  const handleSaveEdit = async () => {
    if (!editingShift) return;

    try {
        const res = await fetch('/api/admin/shift', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                id: editingShift._id,
                startTime: editStartTime,
                endTime: editEndTime
            })
        });

        if (res.ok) {
            alert("Turno atualizado!");
            setEditingShift(null);
            loadData(); // Recarrega os dados para atualizar totais
        } else {
            alert("Erro ao atualizar.");
        }
    } catch (e) {
        alert("Erro de conexão.");
    }
  }


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
    
    const shiftsToday = workShifts.filter(s => s.date === baseDateStr)
    const { start, end } = getWeekRange(baseDateStr)
    const week = workShifts.filter(s => { const d = new Date(s.date); return d >= start && d <= end })
    const month = workShifts.filter(s => { const d = new Date(s.date); return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear() })
    const year = workShifts.filter(s => new Date(s.date).getFullYear() === currentMonth.getFullYear())

    return { 
        hoursToday: sumHours(shiftsToday), 
        hoursWeek: sumHours(week), 
        hoursMonth: sumHours(month), 
        hoursYear: sumHours(year) 
    }
  }, [selectedDate, workShifts, currentMonth])

  if (status === 'loading' || !session || session.user.role !== 'admin') return <div className="p-10 text-center">A carregar...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans text-gray-900 relative">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-bold text-gray-800">Painel de Admin</h1><p className="text-gray-600 mt-2">Gestão de Equipas e Horários</p></div>
            <button onClick={() => router.push('/portal')} className="px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50">Voltar ao Portal</button>
        </header>

        <div className="mb-6 max-w-lg">
          <label className="block text-lg font-medium text-gray-700 mb-2">Selecionar Funcionário</label>
          <select value={selectedEmployeeId} onChange={handleEmployeeChange} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500" disabled={isLoadingEmployees}>
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
        
        {(isLoadingSlots || isLoadingPerformance) && <div className="text-center p-10">A carregar dados...</div>}

        {/* ABA DISPONIBILIDADE (Mantida) */}
        {selectedEmployeeId && activeTab === 'availability' && !isLoadingSlots && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
            <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-6">
                <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded">←</button>
                <h3 className="text-xl font-semibold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">→</button>
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
                {weekdays.map(day => <div key={day} className="text-center font-semibold text-gray-500 text-sm py-2">{day}</div>)}
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
            </div>
          </div>
        )}

        {/* ABA PERFORMANCE */}
        {selectedEmployeeId && activeTab === 'performance' && !isLoadingPerformance && (
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

                    {/* DETALHES DA PERFORMANCE (COM EDITAR/APAGAR) */}
                    <div className="bg-white p-6 rounded-xl shadow border h-fit">
                        <h3 className="font-bold border-b pb-2 mb-4 text-lg">{selectedDate ? formatDetailDate(selectedDate) : 'Detalhes do Turno'}</h3>
                        {selectedDate && (
                            <div>
                                {workShifts.filter(s => s.date === selectedDate).length === 0 ? 
                                    <div className="text-center py-8 text-gray-400"><ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-20"/><p>Sem turnos registados.</p></div> 
                                : 
                                workShifts.filter(s => s.date === selectedDate).map((s, i) => (
                                    <div key={i} className="bg-blue-50 p-4 rounded-lg mb-3 border border-blue-100 shadow-sm relative group">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Turno</span>
                                            <span className="bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded shadow-sm">{s.totalHours} Horas</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-blue-900 font-bold text-lg"><ClockIcon className="w-5 h-5"/> {s.startTime} - {s.endTime}</div>
                                        
                                        {/* 🆕 BOTÕES DE AÇÃO */}
                                        <div className="mt-3 pt-2 border-t border-blue-100 flex justify-end gap-2">
                                            <button onClick={() => openEditModal(s)} className="p-1.5 bg-white text-blue-600 rounded hover:bg-blue-100" title="Editar"><PencilSquareIcon className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteShift(s._id)} className="p-1.5 bg-white text-red-600 rounded hover:bg-red-100" title="Apagar"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!selectedDate && <p className="text-gray-500 text-center py-10">Selecione um dia para ver as horas trabalhadas.</p>}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO */}
      {editingShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Editar Turno</h3>
                    <button onClick={() => setEditingShift(null)}><XMarkIcon className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                        <input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="w-full border rounded p-2"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                        <input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className="w-full border rounded p-2"/>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <button onClick={() => setEditingShift(null)} className="flex-1 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleSaveEdit} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}