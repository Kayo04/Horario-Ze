'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

// --- TYPES ---
type ShiftRecord = {
  _id: string
  employeeCode: string
  date: string
  startTime: string
  endTime: string
  totalHours: number
}

type SwapLogEntry = {
  _id: string
  date: string
  timeSlot: string
  originalEmployee: string
  newEmployee: string
  swappedBy: string
  swappedByName: string
  createdAt: string
}

type EmployeeInfo = {
  id: string
  name: string
  code: string
  role: string
}

type SwapModal = {
  show: boolean
  date: string
  timeSlot: string
  originalEmployee: string
} | null

// --- HELPERS ---
const formatDateToInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getMonday = (d: Date): Date => {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

// Employee code color palette
const CODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TR: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  AP: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  DO: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  HN: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  IQ: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  IP: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  JMM: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  DIAS: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  MO: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  MS: { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-300' },
  NR: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
}

const getCodeColor = (code: string) => {
  return CODE_COLORS[code] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
}

// Helper to convert time string to minutes
const timeToMin = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// --- TIME SLOTS ---
const TIME_SLOTS = [
  '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30',
  '11:30 - 12:00', '12:00 - 12:30', '12:30 - 13:00', '13:00 - 13:30',
  '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30',
  '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00', '17:00 - 17:30',
  '17:30 - 18:00', '18:00 - 18:30', '18:30 - 19:00', '19:00 - 19:30',
  '19:30 - 20:00', '20:00 - 20:30', '20:30 - 21:00', '21:00 - 21:30',
  '21:30 - 22:00', '22:00 - 22:30', '22:30 - 23:00', '23:00 - 23:30',
  '23:30 - 00:00'
]

export default function HorarioPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  const locale = language === 'pt' ? 'pt-PT' : 'en-US'

  // Week days
  const WEEK_DAYS = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'long' })
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, i + 1) // Mon=1, ..., Sun=7
      const dayName = formatter.format(d)
      return dayName.charAt(0).toUpperCase() + dayName.slice(1)
    })
  }, [locale])

  const WEEK_DAYS_SHORT = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, i + 1)
      return formatter.format(d).replace('.', '')
    })
  }, [locale])

  // State
  const [selectedDate, setSelectedDate] = useState(() => {
    return formatDateToInput(getMonday(new Date()))
  })
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [weekDatesFull, setWeekDatesFull] = useState<string[]>([]) // YYYY-MM-DD format
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [swapLogs, setSwapLogs] = useState<SwapLogEntry[]>([])
  const [employees, setEmployees] = useState<EmployeeInfo[]>([])
  const [currentUserCode, setCurrentUserCode] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSwapping, setIsSwapping] = useState(false)
  const [swapModal, setSwapModal] = useState<SwapModal>(null)
  const [selectedSwapTarget, setSelectedSwapTarget] = useState('')
  const [selectedSwapSlots, setSelectedSwapSlots] = useState<string[]>([])
  const [allSlotsForSwap, setAllSlotsForSwap] = useState<string[]>([])
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null)

  const isAdmin = (session?.user as any)?.role === 'admin'

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification?.show) {
      const timer = setTimeout(() => setNotification(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Auth redirect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/')
    }
  }, [status, router])

  // Calculate week dates when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return
    const start = new Date(selectedDate)
    const shortDates: string[] = []
    const fullDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      shortDates.push(`${day}/${month}`)
      fullDates.push(formatDateToInput(d))
    }
    setWeekDates(shortDates)
    setWeekDatesFull(fullDates)
  }, [selectedDate])

  // Load employees list
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await fetch('/api/employees')
        if (res.ok) {
          const data = await res.json()
          setEmployees(data.map((emp: any) => ({
            id: emp.id || emp._id,
            name: emp.name,
            code: emp.code || '',
            role: emp.role,
          })).filter((e: EmployeeInfo) => e.code)) // Only employees with codes
        }
      } catch (error) {
        console.error('Error loading employees:', error)
      }
    }
    if (status === 'authenticated') {
      loadEmployees()
    }
  }, [status])

  // Determine current user's code
  useEffect(() => {
    if (session?.user && employees.length > 0) {
      const user = session.user as any
      const match = employees.find(e => 
        e.name === user.name || e.id === user.id
      )
      if (match) {
        setCurrentUserCode(match.code)
      }
    }
  }, [session, employees])

  // Load schedule & swap logs when week changes
  const loadScheduleData = useCallback(async () => {
    if (!selectedDate || weekDatesFull.length === 0) return
    
    setIsLoading(true)
    try {
      const start = weekDatesFull[0]
      const end = weekDatesFull[6]

      // Fetch schedule and swap logs in parallel
      const [scheduleRes, swapRes] = await Promise.all([
        fetch(`/api/horario?start=${start}&end=${end}`),
        fetch(`/api/horario/swap-log?start=${start}&end=${end}`),
      ])

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        setShifts(scheduleData.shifts || [])
      }

      if (swapRes.ok) {
        const swapData = await swapRes.json()
        setSwapLogs(swapData.swapLogs || [])
      }
    } catch (error) {
      console.error('Error loading schedule data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate, weekDatesFull])

  useEffect(() => {
    if (status === 'authenticated' && weekDatesFull.length > 0) {
      loadScheduleData()
    }
  }, [status, weekDatesFull, loadScheduleData])

  // Build schedule grid: timeSlot -> day -> employee codes[]
  // Shifts are stored as consolidated blocks (e.g., startTime: "10:00", endTime: "14:00")
  // We need to expand them into individual 30-min slots
  const scheduleGrid = useMemo(() => {
    const grid: Record<string, Record<string, string[]>> = {}

    TIME_SLOTS.forEach(slot => {
      grid[slot] = {}
      WEEK_DAYS.forEach(day => {
        grid[slot][day] = []
      })
    })

    shifts.forEach(shift => {
      // Handle MongoDB dates that may have T00:00:00.000Z suffix
      const shiftDateStr = shift.date.split('T')[0]
      const dateIndex = weekDatesFull.indexOf(shiftDateStr)
      if (dateIndex === -1) return

      const dayName = WEEK_DAYS[dateIndex]
      const shiftStartMin = timeToMin(shift.startTime)
      const shiftEndMin = timeToMin(shift.endTime)

      // Expand: find all 30-min slots that fall within this shift block
      TIME_SLOTS.forEach(slot => {
        const [slotStart] = slot.split(' - ')
        const slotMin = timeToMin(slotStart)

        if (slotMin >= shiftStartMin && slotMin < shiftEndMin) {
          if (grid[slot] && grid[slot][dayName]) {
            if (!grid[slot][dayName].includes(shift.employeeCode)) {
              grid[slot][dayName].push(shift.employeeCode)
            }
          }
        }
      })
    })

    return grid
  }, [shifts, weekDatesFull, WEEK_DAYS])

  // Week navigation
  const goToPreviousWeek = () => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() - 7)
    setSelectedDate(formatDateToInput(current))
  }

  const goToNextWeek = () => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + 7)
    setSelectedDate(formatDateToInput(current))
  }

  const goToCurrentWeek = () => {
    setSelectedDate(formatDateToInput(getMonday(new Date())))
  }

  // Swap handlers
  const openSwapModal = (date: string, timeSlot: string, employeeCode: string) => {
    // Only allow swapping your own shifts (or any if admin)
    if (!isAdmin && employeeCode !== currentUserCode) return

    // Find all time slots where this employee works on this day
    const dayIndex = weekDatesFull.indexOf(date)
    if (dayIndex === -1) return
    const dayName = WEEK_DAYS[dayIndex]

    const empSlots = TIME_SLOTS.filter(slot => {
      return scheduleGrid[slot]?.[dayName]?.includes(employeeCode)
    })

    setSwapModal({
      show: true,
      date,
      timeSlot,
      originalEmployee: employeeCode,
    })
    setAllSlotsForSwap(empSlots)
    setSelectedSwapSlots([timeSlot]) // Pre-select the clicked slot
    setSelectedSwapTarget('')
  }

  const closeSwapModal = () => {
    setSwapModal(null)
    setSelectedSwapTarget('')
    setSelectedSwapSlots([])
    setAllSlotsForSwap([])
  }

  const toggleSlotSelection = (slot: string) => {
    setSelectedSwapSlots(prev => {
      if (prev.includes(slot)) {
        return prev.filter(s => s !== slot)
      }
      return [...prev, slot]
    })
  }

  const toggleSelectAll = () => {
    if (selectedSwapSlots.length === allSlotsForSwap.length) {
      setSelectedSwapSlots([])
    } else {
      setSelectedSwapSlots([...allSlotsForSwap])
    }
  }

  const performSwap = async () => {
    if (!swapModal || !selectedSwapTarget || selectedSwapSlots.length === 0) return

    setIsSwapping(true)
    try {
      const res = await fetch('/api/horario/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: swapModal.date,
          selectedSlots: selectedSwapSlots,
          originalEmployee: swapModal.originalEmployee,
          newEmployee: selectedSwapTarget,
        }),
      })

      if (res.ok) {
        setNotification({ show: true, message: t.horario_swap_success, type: 'success' })
        closeSwapModal()
        await loadScheduleData()
      } else {
        const data = await res.json()
        setNotification({ show: true, message: data.error || t.horario_swap_error, type: 'error' })
      }
    } catch (error) {
      setNotification({ show: true, message: t.horario_swap_error, type: 'error' })
    } finally {
      setIsSwapping(false)
    }
  }

  // Format swap log date for display
  const formatSwapDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatSwapTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(locale, { 
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
    })
  }

  // Loading screen
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">{t.horario_loading}</p>
        </div>
      </div>
    )
  }

  const hasSchedule = shifts.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50">
      {/* Notification Toast */}
      {notification?.show && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-2xl text-white font-medium
          transition-all duration-300 animate-slide-in
          ${notification.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-red-600'}
        `}>
          <div className="flex items-center gap-2">
            <span>{notification.type === 'success' ? '✅' : '❌'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-[95rem] mx-auto p-4 sm:p-6">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {t.horario_title}
              </h1>
              <p className="text-gray-500 mt-1 text-lg">{t.horario_subtitle}</p>
              {currentUserCode && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">{t.horario_your_shifts}:</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2
                    ${getCodeColor(currentUserCode).bg} ${getCodeColor(currentUserCode).text} ${getCodeColor(currentUserCode).border}
                    ring-2 ring-offset-1 ring-cyan-300
                  `}>
                    {currentUserCode}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Language Toggle */}
              <div className="flex gap-2">
                <LanguageSwitcher />
              </div>

              <button
                onClick={() => router.push('/portal')}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200"
              >
                {t.back}
              </button>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={goToPreviousWeek}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-cyan-100 hover:text-cyan-700 transition-all duration-200"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm sm:text-lg font-bold text-gray-800 sm:min-w-[200px] text-center">
                {weekDates.length > 0 && `${weekDates[0]} — ${weekDates[6]}`}
              </span>
              <button
                onClick={goToCurrentWeek}
                className="px-3 py-1.5 text-sm bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 font-medium transition-colors"
              >
                {t.today}
              </button>
            </div>

            <button
              onClick={goToNextWeek}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-cyan-100 hover:text-cyan-700 transition-all duration-200"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>

            <button
              onClick={loadScheduleData}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-cyan-100 hover:text-cyan-700 transition-all duration-200 ml-2"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Schedule Content */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-500">{t.horario_loading}</p>
            </div>
          </div>
        ) : !hasSchedule ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📋</span>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">{t.horario_no_schedule}</h3>
            <p className="text-gray-500">{weekDates.length > 0 && `${weekDates[0]} — ${weekDates[6]}`}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Schedule Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gradient-to-r from-cyan-600 to-cyan-700">
                    <th className="sticky left-0 z-10 bg-cyan-700 px-4 py-3 text-left text-white font-bold text-sm min-w-[120px] border-r border-cyan-500/30">
                      {t.schedule_header}
                    </th>
                    {WEEK_DAYS.map((day, i) => (
                      <th key={day} className="px-3 py-3 text-center text-white min-w-[120px] border-r border-cyan-500/30 last:border-r-0">
                        <div className="font-bold text-sm">{WEEK_DAYS_SHORT[i]}</div>
                        <div className="text-cyan-200 text-xs font-medium mt-0.5">{weekDates[i]}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot, slotIdx) => (
                    <tr 
                      key={slot} 
                      className={`${slotIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-cyan-50/30 transition-colors`}
                    >
                      <td className="sticky left-0 z-10 px-3 py-2 text-xs font-mono font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap"
                        style={{ backgroundColor: slotIdx % 2 === 0 ? 'white' : '#f9fafb' }}
                      >
                        {slot}
                      </td>
                      {WEEK_DAYS.map((day, dayIdx) => {
                        const cellCodes = scheduleGrid[slot]?.[day] || []
                        const dateStr = weekDatesFull[dayIdx]

                        return (
                          <td key={day} className="px-2 py-1.5 border-r border-gray-100 last:border-r-0">
                            <div className="flex flex-wrap gap-1 justify-center min-h-[28px] items-center">
                              {cellCodes.map(code => {
                                const colors = getCodeColor(code)
                                const isOwnShift = code === currentUserCode
                                const canSwap = isAdmin || isOwnShift

                                return (
                                  <button
                                    key={code}
                                    onClick={canSwap ? () => openSwapModal(dateStr, slot, code) : undefined}
                                    className={`
                                      inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border
                                      transition-all duration-200
                                      ${colors.bg} ${colors.text} ${colors.border}
                                      ${isOwnShift ? 'ring-2 ring-cyan-400 ring-offset-1 shadow-md scale-105' : ''}
                                      ${canSwap ? 'cursor-pointer hover:shadow-lg hover:scale-110 active:scale-95' : 'cursor-default'}
                                    `}
                                    title={canSwap ? t.horario_swap : ''}
                                  >
                                    {code}
                                  </button>
                                )
                              })}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 items-center text-xs text-gray-600">
                <span className="font-semibold text-gray-700">👥 Staff:</span>
                {Array.from(new Set(shifts.map(s => s.employeeCode))).sort().map(code => {
                  const colors = getCodeColor(code)
                  const emp = employees.find(e => e.code === code)
                  return (
                    <div key={code} className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {code}
                      </span>
                      {emp && <span className="text-gray-500">{emp.name.split(' ')[0]}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Swap History */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-800">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🔄 {t.horario_swap_history}
            </h2>
          </div>

          <div className="p-6">
            {swapLogs.length === 0 ? (
              <p className="text-gray-400 text-center py-6 text-sm">{t.horario_no_swaps}</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {swapLogs.map(log => {
                  const origColors = getCodeColor(log.originalEmployee)
                  const newColors = getCodeColor(log.newEmployee)

                  return (
                    <div 
                      key={log._id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Swap direction */}
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${origColors.bg} ${origColors.text} ${origColors.border}`}>
                            {log.originalEmployee}
                          </span>
                          <span className="text-gray-400 font-bold text-lg">→</span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${newColors.bg} ${newColors.text} ${newColors.border}`}>
                            {log.newEmployee}
                          </span>
                        </div>

                        {/* Date + time slot */}
                        <span className="text-sm text-gray-600">
                          <span className="font-medium">{formatSwapDate(log.date)}</span>
                          <span className="text-gray-400 mx-1.5">•</span>
                          <span className="font-mono text-xs">{log.timeSlot}</span>
                        </span>
                      </div>

                      {/* Who did it + when */}
                      <div className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span>{t.horario_swapped_by}</span>
                        <span className="font-semibold text-gray-600">{log.swappedByName}</span>
                        <span className="text-gray-300">•</span>
                        <span>{formatSwapTimestamp(log.createdAt)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Back Button */}
        <div className="mt-6 text-center sm:hidden pb-8">
          <button
            onClick={() => router.push('/portal')}
            className="px-5 py-2.5 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
          >
            {t.back_to_portal}
          </button>
        </div>
      </div>

      {/* Swap Modal */}
      {swapModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeSwapModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🔄 {t.horario_swap}
                </h3>
                <button 
                  onClick={closeSwapModal}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Date info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 text-xs">{t.date_label}:</span>
                  <span className="font-semibold text-gray-800">
                    {formatSwapDate(swapModal.date)}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getCodeColor(swapModal.originalEmployee).bg} ${getCodeColor(swapModal.originalEmployee).text} ${getCodeColor(swapModal.originalEmployee).border}`}>
                    {swapModal.originalEmployee}
                  </span>
                </div>
              </div>

              {/* Slot Selection */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-700">
                    {language === 'pt' ? 'Selecionar turnos' : 'Select shifts'} ({selectedSwapSlots.length}/{allSlotsForSwap.length})
                  </label>
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-cyan-600 hover:text-cyan-800 transition-colors px-2 py-1 rounded-lg hover:bg-cyan-50"
                  >
                    {selectedSwapSlots.length === allSlotsForSwap.length
                      ? (language === 'pt' ? 'Desselecionar todos' : 'Deselect all')
                      : (language === 'pt' ? 'Selecionar todos' : 'Select all')
                    }
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {allSlotsForSwap.map(slot => {
                    const isSelected = selectedSwapSlots.includes(slot)
                    return (
                      <button
                        key={slot}
                        onClick={() => toggleSlotSelection(slot)}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-all duration-150
                          ${isSelected
                            ? 'bg-cyan-100 border-cyan-400 text-cyan-800 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                          ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300'}
                        `}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {slot}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Employee selector */}
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t.horario_swap_with.replace('{original}', swapModal.originalEmployee)}
              </label>
              <select
                value={selectedSwapTarget}
                onChange={(e) => setSelectedSwapTarget(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all duration-200 text-gray-800 font-medium bg-white"
              >
                <option value="">{t.horario_select_employee}</option>
                {employees
                  .filter(e => e.code !== swapModal.originalEmployee && e.role !== 'admin')
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(emp => (
                    <option key={emp.id} value={emp.code}>
                      {emp.code} — {emp.name}
                    </option>
                  ))
                }
              </select>

              {/* Preview */}
              {selectedSwapTarget && selectedSwapSlots.length > 0 && (
                <div className="mt-4 p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold border ${getCodeColor(swapModal.originalEmployee).bg} ${getCodeColor(swapModal.originalEmployee).text} ${getCodeColor(swapModal.originalEmployee).border}`}>
                      {swapModal.originalEmployee}
                    </span>
                    <span className="text-cyan-600 font-bold text-xl">→</span>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold border ${getCodeColor(selectedSwapTarget).bg} ${getCodeColor(selectedSwapTarget).text} ${getCodeColor(selectedSwapTarget).border}`}>
                      {selectedSwapTarget}
                    </span>
                  </div>
                  <p className="text-xs text-cyan-600 text-center">
                    {selectedSwapSlots.length} {selectedSwapSlots.length === 1 ? 'slot' : 'slots'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                onClick={closeSwapModal}
                className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={performSwap}
                disabled={!selectedSwapTarget || isSwapping || selectedSwapSlots.length === 0}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl font-bold
                  hover:from-cyan-700 hover:to-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {isSwapping ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t.saving}
                  </span>
                ) : (
                  t.horario_swap_confirm
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
