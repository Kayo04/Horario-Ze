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
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

// --- INTERFACES ---
interface TimeSlot {
  date: string
  startTime: string
  endTime: string
  type: 'unavailable' | 'available'
  allDay?: boolean
}

interface WorkShift {
  _id: string
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

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES_STEP = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

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
  return shifts.reduce((acc, shift) => acc + (shift.totalHours || 0), 0)
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

const cleanTimeFormat = (timeStr: string): string => {
    if (!timeStr) return '09:00';
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) return timeStr;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
    if (match) {
        let [_, h, m, period] = match;
        let hour = parseInt(h);
        if (period?.toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (period?.toUpperCase() === 'AM' && hour === 12) hour = 0;
        return `${hour.toString().padStart(2, '0')}:${m}`;
    }
    return timeStr;
}

export default function AdminPanelPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

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

  // SELEÇÃO MÚLTIPLA
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([])

  // ESTADOS DE EDIÇÃO
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null)
  const [editStartH, setEditStartH] = useState('09')
  const [editStartM, setEditStartM] = useState('00')
  const [editEndH, setEditEndH] = useState('18')
  const [editEndM, setEditEndM] = useState('00')

  // Dynamic Date Helpers
  const locale = language === 'pt' ? 'pt-PT' : 'en-US'
  
  const weekdays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    // Jan 1 2024 is Monday
    return Array.from({length: 7}, (_, i) => {
        const d = new Date(2024, 0, i + 1)
        return formatter.format(d).replace('.', '')
    })
  }, [locale])

  const monthNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long' })
    return Array.from({length: 12}, (_, i) => {
        const d = new Date(2024, i, 1)
        return formatter.format(d)
    })
  }, [locale])

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
    setSelectedShiftIds([]); // Limpar seleções ao mudar de dados
    if (!selectedEmployeeId) { setTimeSlots([]); setWorkShifts([]); setSelectedDate(null); return; }
    
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
                 const convertedShifts = data.shifts?.map((shift: any) => ({
                   ...shift,
                   startTime: cleanTimeFormat(shift.startTime),
                   endTime: cleanTimeFormat(shift.endTime)
                 })) || [];
                 setWorkShifts(convertedShifts);
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

  // --- LÓGICA DE SELEÇÃO MÚLTIPLA ---
  const toggleSelectShift = (id: string) => {
    setSelectedShiftIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  }

  const handleBulkDelete = async () => {
    if (selectedShiftIds.length === 0) return;
    if (!confirm(t.confirm_delete_bulk.replace('{count}', selectedShiftIds.length.toString()))) return;

    try {
        const idsString = selectedShiftIds.join(',');
        console.log(`Apagando em massa: ${idsString}`);
        
        const res = await fetch(`/api/admin/shifts?ids=${idsString}`, { method: 'DELETE' });
        
        const contentType = res.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        } else {
            const text = await res.text();
            throw new Error(`Erro ${res.status}: Servidor não respondeu JSON.`);
        }

        if (res.ok && data.success) {
            setWorkShifts(prev => prev.filter(s => !selectedShiftIds.includes(s._id)));
            setSelectedShiftIds([]);
            alert(t.success_delete_bulk);
        } else {
            alert(data.error || t.error_delete);
        }
    } catch (e: any) {
        alert(`${t.error_generic}: ${e.message}`);
    }
  }

  // --- AÇÕES INDIVIDUAIS ---

  const handleDeleteShift = async (id: string) => {
    if (!id) return;
    if (!confirm(t.confirm_delete_shift)) return;

    try {
        const res = await fetch(`/api/admin/shifts?id=${id}`, { method: 'DELETE' });
        
        const contentType = res.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        } else {
            throw new Error(`Erro ${res.status}`);
        }
        
        if (res.ok && data.success) {
            setWorkShifts(prev => prev.filter(s => s._id !== id));
        } else {
            alert(data.error || t.error_delete);
        }
    } catch (e: any) {
        alert(`${t.error_generic}: ${e.message}`);
    }
  }

  const openEditModal = (shift: WorkShift) => {
    setEditingShift(shift);
    const start = cleanTimeFormat(shift.startTime);
    const end = cleanTimeFormat(shift.endTime);
    const [sh, sm] = start.split(':');
    const [eh, em] = end.split(':');
    setEditStartH(sh || '09');
    setEditStartM(sm || '00');
    setEditEndH(eh || '18');
    setEditEndM(em || '00');
  }

  const handleSaveEdit = async () => {
    if (!editingShift || !editingShift._id) return;

    const finalStart = `${editStartH}:${editStartM}`;
    const finalEnd = `${editEndH}:${editEndM}`;

    try {
      const res = await fetch('/api/admin/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingShift._id,
          startTime: finalStart,
          endTime: finalEnd
        })
      });

      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
          data = await res.json();
      } else {
          throw new Error(`Erro ${res.status}`);
      }

      if (res.ok && data.success) {
        setEditingShift(null);
        alert(t.success_update_shift);
        loadData();
      } else {
        alert(data.error || t.error_update);
      }
    } catch (e: any) {
      alert(`${t.error_generic}: ${e.message}`);
    }
  }

  // --- RENDER ---
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
    return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
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

  if (status === 'loading' || !session || session.user.role !== 'admin') return <div className="p-10 text-center">{t.loading}</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans text-gray-900 relative">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
            <div><h1 className="text-3xl font-bold text-gray-800">{t.admin_title}</h1><p className="text-gray-600 mt-2">{t.admin_subtitle}</p></div>
            <div className="flex gap-4 items-center">
                {/* Language Toggle */}
                <div className="flex space-x-2">
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
                <button onClick={() => router.push('/portal')} className="px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50">{t.back_to_portal}</button>
            </div>
        </header>

        <div className="mb-6 max-w-lg">
          <label className="block text-lg font-medium text-gray-700 mb-2">{t.select_employee}</label>
          <select value={selectedEmployeeId} onChange={handleEmployeeChange} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-park-500" disabled={isLoadingEmployees}>
            <option value="" disabled>{isLoadingEmployees ? t.loading : t.select_placeholder}</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>)}
          </select>
        </div>

        {selectedEmployeeId && (
            <div className="flex space-x-4 mb-8 border-b border-gray-200">
                <button onClick={() => setActiveTab('availability')} className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'availability' ? 'border-park-600 text-park-600' : 'border-transparent text-gray-500'}`}><UserGroupIcon className="w-5 h-5"/> {t.manage_availability}</button>
                <button onClick={() => setActiveTab('performance')} className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'performance' ? 'border-park-600 text-park-600' : 'border-transparent text-gray-500'}`}><ChartBarIcon className="w-5 h-5"/> {t.view_performance}</button>
            </div>
        )}
        
        {(isLoadingSlots || isLoadingPerformance) && <div className="text-center p-10">{t.loading_data}</div>}

        {/* ABA DISPONIBILIDADE */}
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
                    <button key={dateString} onClick={() => setSelectedDate(dateString)} className={`p-1 sm:p-3 rounded-lg border text-left min-h-[4.5rem] sm:min-h-20 flex flex-col justify-start transition-colors ${selectedDate === dateString ? 'border-park-500 bg-park-50' : 'border-gray-200'} ${isAllDay ? 'bg-red-100 border-red-300' : ''} ${unavailableSlots.length > 0 && !isAllDay ? 'bg-red-50 border-red-200' : ''} ${unavailableSlots.length === 0 && selectedDate !== dateString ? 'bg-white' : ''} ${unavailableSlots.length === 0 && selectedDate === dateString ? '' : 'hover:bg-gray-50'}`}>
                      <div className="font-semibold text-sm">{day.getDate()}</div>
                      {isAllDay && <div className="hidden sm:block text-[10px] sm:text-xs text-red-700 mt-0.5 font-medium">{t.unavailable_short}</div>}
                      {unavailableSlots.length > 0 && !isAllDay && <div className="hidden sm:block text-[10px] sm:text-xs text-red-600 mt-0.5">{unavailableSlots.length} {t.unavailable_count_short}</div>}
                      {unavailableSlots.length === 0 && <div className="hidden sm:block text-[10px] sm:text-xs text-green-600 mt-0.5">{t.available_short}</div>}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="lg:col-span-1 flex flex-col gap-8">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">{selectedDate ? `${t.details}: ${formatDetailDate(selectedDate)}` : t.day_details}</h3>
                    {selectedDate && (
                        <div className="space-y-2">
                        {getUnavailableSlotsForDate(selectedDate).length === 0 ? (
                            <div className="p-3 bg-green-50 rounded border border-green-200 text-green-700 font-medium">{t.available_all_day}</div>
                        ) : (
                            getUnavailableSlotsForDate(selectedDate).map((slot, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
                                <span className="font-medium text-red-800">{slot.allDay ? t.unavailable_all_day : `${slot.startTime} - ${slot.endTime}`}</span>
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
                    <div className={`bg-white p-5 rounded-xl border ${selectedDate ? 'border-park-500 bg-park-50' : ''}`}>
                        <div className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-2"><ClockIcon className="w-4 h-4"/> {selectedDate ? t.selected_day : t.today}</div>
                        <div className="text-3xl font-bold text-gray-800">{stats.hoursToday.toFixed(1)}h</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border">
                        <div className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-2"><CalendarDaysIcon className="w-4 h-4"/> {t.this_week}</div>
                        <div className="text-3xl font-bold text-gray-800">{stats.hoursWeek.toFixed(1)}h</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border">
                        <div className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> {t.current_month}</div>
                        <div className="text-3xl font-bold text-gray-800">{stats.hoursMonth.toFixed(1)}h</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border">
                        <div className="text-sm text-gray-500 font-bold mb-1 flex items-center gap-2"><ChartBarIcon className="w-4 h-4"/> {t.year} {currentMonth.getFullYear()}</div>
                        <div className="text-3xl font-bold text-gray-800">{stats.hoursYear.toFixed(1)}h</div>
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
                                        className={`h-20 sm:h-24 p-1 border rounded flex flex-col items-start justify-between transition-all ${isSelected ? 'border-park-500 bg-park-50 ring-1 ring-park-500' : 'hover:bg-gray-50 border-gray-100'} ${shifts.length > 0 ? 'bg-park-50/30' : 'bg-white'}`}>
                                        <span className={`font-bold text-sm ${isSelected ? 'text-park-700' : 'text-gray-700'}`}>{day.getDate()}</span>
                                        <div className="w-full flex flex-col gap-1">
                                            {shifts.map((s, i) => (
                                                <span key={i} className="text-[10px] bg-park-100 text-park-800 px-1.5 py-0.5 rounded font-bold w-full text-left truncate">
                                                  {s.startTime}-{s.endTime}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow border h-fit">
                        <div className="flex justify-between items-center border-b pb-2 mb-4">
                            <h3 className="font-bold text-lg">{selectedDate ? formatDetailDate(selectedDate) : t.shift_details}</h3>
                            {/* BOTÃO DE APAGAR MÚLTIPLOS */}
                            {selectedShiftIds.length > 0 && (
                                <button 
                                    onClick={handleBulkDelete}
                                    className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-200 transition-colors animate-in fade-in"
                                >
                                    {t.delete_selected.replace('{count}', selectedShiftIds.length.toString())}
                                </button>
                            )}
                        </div>
                        
                        {selectedDate && (
                            <div>
                                {workShifts.filter(s => s.date === selectedDate).length === 0 ? 
                                    <div className="text-center py-8 text-gray-400"><ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-20"/><p>{t.no_shifts}</p></div> 
                                : 
                                workShifts.filter(s => s.date === selectedDate).map((s, i) => {
                                    const isSelected = selectedShiftIds.includes(s._id);
                                    return (
                                        <div key={i} className={`p-4 rounded-lg mb-3 border shadow-sm relative group transition-all cursor-pointer ${isSelected ? 'bg-park-100 border-park-300' : 'bg-park-50 border-park-100'}`} onClick={() => toggleSelectShift(s._id)}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    {/* CHECKBOX */}
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-park-500 border-park-500' : 'bg-white border-gray-300'}`}>
                                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white"/>}
                                                    </div>
                                                    <span className="text-xs font-bold text-park-400 uppercase tracking-wider">{t.shift}</span>
                                                </div>
                                                <span className="bg-white text-park-600 text-xs font-bold px-2 py-1 rounded shadow-sm">{s.totalHours.toFixed(2)} {t.hours}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-park-900 font-bold text-lg pl-7">
                                              <ClockIcon className="w-5 h-5"/> 
                                              {s.startTime} - {s.endTime}
                                            </div>
                                            
                                            <div className="mt-3 pt-2 border-t border-park-200 flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => openEditModal(s)} className="p-1.5 bg-white text-park-600 rounded hover:bg-park-100 transition-colors" title={t.edit}>
                                                  <PencilSquareIcon className="w-4 h-4"/>
                                                </button>
                                                <button onClick={() => handleDeleteShift(s._id)} className="p-1.5 bg-white text-red-600 rounded hover:bg-red-100 transition-colors" title={t.delete}>
                                                  <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {!selectedDate && <p className="text-gray-500 text-center py-10">{t.select_day_help}</p>}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO COM SELECTS */}
      {editingShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">{t.edit_schedule}</h3>
                    <button onClick={() => setEditingShift(null)}>
                      <XMarkIcon className="w-6 h-6 text-gray-500"/>
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.start_time}</label>
                        <div className="flex gap-2">
                            <select value={editStartH} onChange={e => setEditStartH(e.target.value)} className="w-full p-2 border rounded font-mono text-lg bg-gray-50">
                                {HOURS_24.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <span className="text-2xl text-gray-300">:</span>
                            <select value={editStartM} onChange={e => setEditStartM(e.target.value)} className="w-full p-2 border rounded font-mono text-lg bg-gray-50">
                                {MINUTES_STEP.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.end_time}</label>
                        <div className="flex gap-2">
                            <select value={editEndH} onChange={e => setEditEndH(e.target.value)} className="w-full p-2 border rounded font-mono text-lg bg-gray-50">
                                {HOURS_24.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <span className="text-2xl text-gray-300">:</span>
                            <select value={editEndM} onChange={e => setEditEndM(e.target.value)} className="w-full p-2 border rounded font-mono text-lg bg-gray-50">
                                {MINUTES_STEP.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t">
                        <button onClick={() => setEditingShift(null)} className="flex-1 py-2.5 border rounded-lg text-gray-600 font-medium hover:bg-gray-50">
                          {t.cancel}
                        </button>
                        <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-park-600 text-white rounded-lg font-medium hover:bg-park-700 shadow-sm">
                          {t.save_changes}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}