'use client'
import React, { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
// 🔥 IMPORTAÇÃO CENTRALIZADA (Isto resolve os conflitos de tipos)
import { Reservation as IReservation, EventType } from '@/types/reservation'

/* ---------- Tipos Locais (apenas para UI) ---------- */

// Adaptamos a interface para a UI, usando o EventType central
// Tornamos adults e children opcionais para compatibilidade
type SchedulerReservation = {
  id: string
  eventType: EventType
  date: string      // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string   // HH:MM
  people: number
  customerName?: string 
  adults?: number
  children?: number
}

type UnavailableWeekday = { day: number; start: string; end: string }

type UnavailableSlot = {
  date: string
  type: 'unavailable'
} & (
  | { allDay: true }
  | { allDay: false; startTime: string; endTime: string }
)

type Employee = {
  id: string
  name: string
  code?: string
  email: string
  telefone?: string
  role: 'admin' | 'employee'
  unavailable: {
    weekdays: UnavailableWeekday[]
    specificDates: UnavailableSlot[]
  }
  createdAt?: Date
  updatedAt?: Date
}

type Assigned = { id: string; name: string; code?: string }

type Slot = {
  reservation: SchedulerReservation
  required: number
  available: Assigned[]
  assignedCount: number
  note: string
}

/* ---------- Função de Horas (10:00 - 20:00) ---------- */
const generateWorkingTimeOptions = () => {
  const options = []
  // From 09:00 to 24:00 (which is 00:00)
  for (let hour = 9; hour <= 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 24 && minute > 0) continue; // Stop at 24:00 (00:00)
      
      let displayHour = hour;
      if (hour === 24) displayHour = 0; // Display 24:00 as 00:00
      
      const timeString = `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      options.push(timeString)
    }
  }
  return options
}

const workingTimeOptions = generateWorkingTimeOptions()

/* ---------- Component ---------- */
export default function SchedulerPage(): JSX.Element {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  const [reservations, setReservations] = useState<SchedulerReservation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true) 
  const [eventType, setEventType] = useState<EventType>('teambuilding')
  const [date, setDate] = useState<string>(formatDateInput(new Date()))
  const [startTime, setStartTime] = useState<string>('18:00')
  const [endTime, setEndTime] = useState<string>('20:00')
  const [people, setPeople] = useState<number>(10)
  const [saving, setSaving] = useState(false)
  const [schedule, setSchedule] = useState<Record<string, Slot>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSheetJSLoaded, setIsSheetJSLoaded] = useState(false)
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null)

  // 🔥 Objeto de detalhes mapeado corretamente
  const eventTypeDetails: Record<string, { subtitle: string }> = {
    teambuilding: { subtitle: t.corporate },
    birthday: { subtitle: t.celebrations },
    vrlocal: { subtitle: t.virtual_reality }, 
    experiencia: { subtitle: t.escape_rooms }, 
    walkin: { subtitle: "Walk-in" } 
  }

  /* ---------- Carregamento da Biblioteca de Excel (SheetJS) ---------- */
  useEffect(() => {
    const scriptId = 'sheetjs-script';
    if (document.getElementById(scriptId) || (window as any).XLSX) {
      setIsSheetJSLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => {
      console.log('Biblioteca de Excel (SheetJS) carregada.');
      setIsSheetJSLoaded(true);
    };
    script.onerror = () => {
      toast.error('Falha ao carregar o leitor de Excel. Tente recarregar a página.');
    };
    document.head.appendChild(script);
  }, []);

  /* ---------- Controlo de Acesso e Carregamento de Dados ---------- */
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.replace('/')
      return
    }
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      toast.error(t.access_denied)
      router.replace('/portal')
    } else if (status === 'authenticated' && session?.user?.role === 'admin') {
      loadData()
    }
  }, [status, session, router, t])

  /* ---------- Carregar dados ---------- */
  const loadData = async () => {
    try {
      const [employeesRes, reservationsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/reservations')
      ]);

      if (employeesRes.ok) setEmployees(await employeesRes.json());
      if (reservationsRes.ok) {
        const data = await reservationsRes.json();
        const mappedReservations: SchedulerReservation[] = data.map((res: any) => {
            let d = res.date;
            let t = res.startTime;
            
            if (res.datetime && res.datetime.includes('T')) {
                [d, t] = res.datetime.split('T');
            }
            
            return {
                id: res._id || res.id,
                eventType: res.eventType as EventType,
                date: d,
                startTime: t, 
                endTime: res.endTime || calculateEndTime(t), 
                people: (res.adults || 0) + (res.children || 0) || res.people,
                customerName: res.customerName,
                adults: res.adults,
                children: res.children
            };
        });
        setReservations(mappedReservations);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error(t.error_generic)
    } finally {
      setLoading(false)
    }
  }

  const calculateEndTime = (start: string) => {
      if(!start) return "20:00";
      const [h, m] = start.split(':').map(Number);
      const endH = h + 1; 
      return `${endH.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  }


  /* ---------- Funções do formulário ---------- */
  
  const clearForm = () => {
    setEditingReservationId(null)
    setEventType('teambuilding')
    setDate(formatDateInput(new Date()))
    setStartTime('18:00')
    setEndTime('20:00')
    setPeople(10)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (startTime >= endTime) {
      toast.error(t.end_time_error)
      return
    }
    setSaving(true)

    try {
      if (editingReservationId) {
        await updateReservation(editingReservationId)
      } else {
        await createReservation()
      }
    } catch (error) {
      console.error('Erro no formulário:', error)
    } finally {
      setSaving(false)
      clearForm()
    }
  }

  const createReservation = async () => {
    try {
      const newRes = { 
          eventType, 
          datetime: `${date}T${startTime}`, 
          adults: Number(people),
          children: 0,
          startTime, endTime, people: Number(people), date,
          customerName: "Manual"
      }
      
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRes),
      })
      if (response.ok) {
        await loadData()
        toast.success(`✅ ${t.success_schedule}`)
      } else {
        const errorData = await response.json()
        toast.error(`❌ ${t.error_schedule}: ` + (errorData.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao criar reserva:', error)
      toast.error(`❌ ${t.error_connection}`)
      throw error 
    }
  }
  
  const updateReservation = async (id: string) => {
     try {
      const updatedRes = { 
          eventType, 
          datetime: `${date}T${startTime}`,
          adults: Number(people),
          children: 0,
          startTime, endTime, people: Number(people), date
      }
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRes),
      })
      if (response.ok) {
        await loadData()
        toast.success(`✅ ${t.success_update}`)
      } else {
        const errorData = await response.json()
        toast.error(`❌ ${t.error_update}: ` + (errorData.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error)
      toast.error(`❌ ${t.error_connection}`)
      throw error 
    }
  }

  const handleEditClick = (reservation: SchedulerReservation) => {
    setEditingReservationId(reservation.id)
    setEventType(reservation.eventType)
    setDate(reservation.date) 
    setStartTime(reservation.startTime)
    setEndTime(reservation.endTime)
    setPeople(reservation.people)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteReservation = async (id: string) => {
    if (!window.confirm(t.confirm_cancel_event)) return
    try {
      const response = await fetch(`/api/reservations/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await loadData()
        setSchedule({})
        toast.success(`✅ ${t.success_cancel}`)
      } else {
        toast.error(`❌ ${t.error_cancel}`)
      }
    } catch (error) {
      toast.error(`❌ ${t.error_connection}`)
    }
  }

  const clearAll = async () => {
    if (!window.confirm(t.confirm_delete_all)) return
    try {
      const deletePromises = reservations.map(r => fetch(`/api/reservations/${r.id}`, { method: 'DELETE' }))
      await Promise.all(deletePromises)
      await loadData()
      setSchedule({})
      toast.success(`✅ ${t.success_delete_all}`)
    } catch (error) {
      toast.error(`❌ ${t.error_delete_all}`)
    }
  }
  
  /* ---------- LÓGICA DE IMPORTAÇÃO (CORRIGIDA) ---------- */

  const triggerFileInput = () => {
    if (!isSheetJSLoaded) {
      toast.error('A biblioteca de importação ainda está a carregar. Tente de novo.')
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Ficheiro inválido. Envie .xlsx ou .csv');
      return;
    }
    setIsUploading(true)
    const toastId = toast.loading(t.file_processing)
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const XLSX = (window as any).XLSX;
        if (!XLSX) throw new Error('Biblioteca de Excel (SheetJS) não carregada.');
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        toast.dismiss(toastId);
        processParsedData(json as any[][]); // Cast para any[][] para evitar erros de TS
      } catch (error: any) {
        toast.dismiss(toastId);
        toast.error(`${t.file_read_error}: ${error.message}`);
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
       toast.dismiss(toastId);
       toast.error(t.file_read_error);
       setIsUploading(false);
    };
    reader.readAsArrayBuffer(file);
    if (e.target) e.target.value = '';
  }

  const processParsedData = (data: any[][]) => {
    const headerIndex = data.findIndex(row => row && row.includes('Customer Email'))
    if (headerIndex === -1) {
      toast.error('Formato inválido. Não foi possível encontrar a coluna "Customer Email".')
      setIsUploading(false)
      return
    }
    const headerRow = data[headerIndex];
    const colMap: { [key: string]: number } = {
      date: headerRow.findIndex((h: any) => h && h.toString().startsWith('Date')),
      email: headerRow.indexOf('Customer Email'),
      // Mapeamento robusto para encontrar o nome
      name: headerRow.findIndex((h: any) => h && (
          h === 'Customer Name' || 
          h === 'Customer: Account Name' || 
          h === 'Nome do Cliente'
      )),
      time: headerRow.indexOf('Booking Time'),
      description: headerRow.indexOf('Booking Description'),
      endTime: headerRow.indexOf('Party Departure Time'),
      notes: headerRow.indexOf('Booking Notes')
    };

    if (colMap.date === -1 || colMap.email === -1 || colMap.time === -1) {
      toast.error("Colunas essenciais (Date, Customer Email, Booking Time) não encontradas.");
      setIsUploading(false);
      return
    }

    const dataRows = data.slice(headerIndex + 1)
    const reservationsToUpload: any[] = []
    let currentDate = ''; 

    for (const row of dataRows) {
      if (!row || row.length < headerRow.length) continue; 
      const email = row[colMap.email]
      if (email && typeof email === 'string' && email.includes('@')) { 
        const dateStr = row[colMap.date]
        if (dateStr) { 
          const parsedDate = parseDateFromExcel(dateStr)
          if (parsedDate) {
            currentDate = parsedDate;
          }
        }
        const startTimeStr = row[colMap.time]
        const startTime = parseTimeFromExcel(startTimeStr)
        const description = row[colMap.description]
        const endTimeStr = row[colMap.endTime]
        const endTime = parseTimeFromExcel(endTimeStr)
        const notes = row[colMap.notes]
        const finalEndTime = parseEndTimeFromCSV(startTime, endTime)
        const eventType = parseEventTypeFromCSV(description, notes) 
        const people = parsePeopleFromCSV(description, notes)
        
        // EXTRAIR NOME (Lógica Melhorada)
        let customerName = "Cliente";
        if (colMap.name !== -1 && row[colMap.name]) {
            customerName = row[colMap.name];
        } else if (description && !/^\d+x/.test(description)) {
            // Só usa descrição se não parecer uma contagem de items ("3x Mask...")
            customerName = description.split('-')[0].trim();
        }

        if (currentDate && startTime && finalEndTime && people > 0) {
          reservationsToUpload.push({
            eventType,
            datetime: `${currentDate}T${startTime}`, 
            adults: people,
            children: 0,
            date: currentDate,
            startTime,
            endTime: finalEndTime,
            people,
            customerName: customerName
          })
        }
      }
    }
    if (reservationsToUpload.length === 0) {
      toast.error(t.file_no_valid_reservations)
      setIsUploading(false)
      return
    }
    startBatchUpload(reservationsToUpload)
  }

  const startBatchUpload = async (reservationsToUpload: any[]) => {
    const existingKeys = new Set(
      reservations.map(res => 
        `${res.date}_${res.startTime}_${res.eventType}_${res.people}`
      )
    );
    const newReservationsOnly = reservationsToUpload.filter(fileRes => {
      const fileKey = `${fileRes.date}_${fileRes.startTime}_${fileRes.eventType}_${fileRes.people}`;
      return !existingKeys.has(fileKey);
    });
    if (newReservationsOnly.length === 0) {
      toast.success('O ficheiro foi lido, mas não foram encontradas novas reservas para adicionar.');
      setIsUploading(false);
      return;
    }
    const toastId = toast.loading(`${t.importing} ${newReservationsOnly.length}...`);
    const uploadPromises = newReservationsOnly.map(res => 
      fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(res),
      })
    );
    try {
      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(r => r.ok).length;
      const failCount = results.length - successCount;
      toast.dismiss(toastId);
      if (successCount > 0) toast.success(`${successCount} ${t.import_success}`);
      if (failCount > 0) toast.error(`${failCount} ${t.import_fail}`);
      await loadData();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(t.import_error_grave);
    } finally {
      setIsUploading(false);
    }
  }

  // Funções Auxiliares de parsing
  const parseDateFromExcel = (dateInput: string | number): string => {
    try {
      if (typeof dateInput === 'number') {
        const XLSX = (window as any).XLSX;
        if (XLSX && XLSX.SSF) {
          const formattedDate = XLSX.SSF.format('dd/mm/yyyy', dateInput);
          const parts = formattedDate.split('/');
          if (parts.length === 3) {
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }
      if (typeof dateInput === 'string' && dateInput.includes('/')) {
        const parts = dateInput.split('/')
        if (parts.length === 3 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }
    } catch (e) { console.error("Erro a parse Date:", dateInput, e); }
    return ''
  }

  const parseTimeFromExcel = (timeInput: string | number): string => {
    try {
      if (typeof timeInput === 'number') {
        const totalMinutes = Math.round(timeInput * 1440);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      if (typeof timeInput === 'string' && timeInput.includes(':')) {
        return timeInput;
      }
    } catch (e) { console.error("Erro a parse Time:", timeInput, e); }
    return '';
  }

  const parsePeopleFromCSV = (description: string, notes: string): number => {
    const lowerNotes = (notes || '').toLowerCase()
    const lowerDesc = (description || '').toLowerCase()
    const combinedText = lowerNotes + ' ' + lowerDesc
    let match = combinedText.match(/(\d+)\s*\+\s*(\d+)\s*(pax|px)/i);
    if (match) return parseInt(match[1]) + parseInt(match[2]);
    match = combinedText.match(/(\d+)\s*(pax|px)/i);
    if (match) return parseInt(match[1]);
    match = combinedText.match(/(\d+)\s+(pax|px)/i);
    if (match) return parseInt(match[1]);
    match = lowerDesc.match(/(\d+)\s*x/i);
    if (match) return parseInt(match[1]);
    return 1; 
  }

  const parseEventTypeFromCSV = (description: string, notes: string): EventType => {
    const lowerNotes = (notes || '').toLowerCase()
    const lowerDesc = (description || '').toLowerCase()
    const combinedText = lowerNotes + ' ' + lowerDesc
    if (combinedText.includes('aniversário') || combinedText.includes('aniversario')) return 'birthday'
    if (combinedText.includes('vr local')) return 'vrlocal'
    const experienciaKeywords = ['the break-in', 'mission planet x', 'nano clash', 'roboclash', 'dont scream', "don't scream", 'mask of the pharaoh'];
    if (experienciaKeywords.some(keyword => combinedText.includes(keyword))) return 'experiencia';
    return 'teambuilding'
  }

  const parseEndTimeFromCSV = (startTime: string, endTime: string): string => {
    if (endTime && endTime.includes(':')) return endTime
    if (!startTime || !startTime.includes(':')) return '20:00'
    try {
      const [hours, minutes] = startTime.split(':').map(Number)
      const date = new Date()
      date.setHours(hours, minutes + 90, 0, 0)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    } catch (e) {
      return '20:00'
    }
  }

  const generateSchedule = () => {
    const bySlot: Record<string, Slot> = {}
    for (const r of reservations) {
      const slotKey = `${r.date}T${r.startTime}`
      let required: number;
      if (r.people <= 10) required = 2;
      else if (r.people <= 20) required = 3;
      else if (r.people <= 30) required = 5;
      else required = 7;

      const available = employees.filter(emp => {
        try {
          if (emp.role === 'admin') return false
          if (!emp.unavailable || typeof emp.unavailable !== 'object') return true
          const slotDate = new Date(r.date + 'T12:00:00')
          const slotDay = slotDate.getDay()
          
          const specificDates = (emp.unavailable.specificDates || []) as UnavailableSlot[]
          const isUnavailableOnDate = specificDates.some((slot: UnavailableSlot) => {
            if (slot.date !== r.date) return false
            if (slot.allDay) return true
            if (!slot.startTime || !slot.endTime) return false;
            const slotStart = convertTimeToMinutes(slot.startTime)
            const slotEnd = convertTimeToMinutes(slot.endTime)
            const eventStart = convertTimeToMinutes(r.startTime)
            const eventEnd = convertTimeToMinutes(r.endTime)
            return (eventStart < slotEnd && eventEnd > slotStart)
          })
          if (isUnavailableOnDate) return false

          const unavailableWeekdays = (emp.unavailable.weekdays || []) as UnavailableWeekday[]
          const isUnavailableOnWeekday = unavailableWeekdays.some((weekday: UnavailableWeekday) => {
            if (weekday.day !== slotDay) return false
            if (!weekday.start || !weekday.end) return false;
            const weekdayStart = convertTimeToMinutes(weekday.start)
            const weekdayEnd = convertTimeToMinutes(weekday.end)
            const eventStart = convertTimeToMinutes(r.startTime)
            const eventEnd = convertTimeToMinutes(r.endTime)
            return (eventStart < weekdayEnd && eventEnd > weekdayStart)
          })
          return !isUnavailableOnWeekday
        } catch (error) {
          console.error('Erro ao verificar disponibilidade do funcionário:', emp.name, error)
          return true
        }
      })
      const allAvailableStaff = available.map(e => ({ id: e.id, name: e.name, code: e.code }))
      const assignedCount = Math.min(available.length, required)
      bySlot[slotKey] = {
        reservation: r,
        required,
        available: allAvailableStaff,
        assignedCount: assignedCount,
        note: available.length < required ? 'Staff insuficiente' : 'OK',
      }
    }
    setSchedule(bySlot)
    toast.success('Horário gerado com sucesso!')
  }

  // Funções utilitárias
  const convertTimeToMinutes = (timeString: string): number => {
    if (!timeString || !timeString.includes(':')) return 0;
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  function formatDateInput(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const formatEventType = (type: EventType) => {
    switch (type) {
      case 'teambuilding': return t.teambuilding
      case 'birthday': return t.birthday
      case 'vrlocal': return t.vrlocal
      case 'experiencia': return t.experiencia
      default: return type
    }
  }

  const formatDateBlock = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T12:00:00');
      const day = date.getDate().toString();
      const month = date.toLocaleString(language === 'pt' ? 'pt-PT' : 'en-US', { month: 'short' }).toUpperCase().replace('.', '');
      const year = date.getFullYear();
      return { day, month, year };
    } catch (e) {
      return { day: '??', month: '???', year: '????' };
    }
  }

  const calculateDuration = (start: string, end: string) => {
    try {
      if (!start || !end) return 0;
      const [startHour, startMinute] = start.split(':').map(Number)
      let [endHour, endMinute] = end.split(':').map(Number)
      
      // Handle midnight (00:00) as end of day (24:00) relative to start time
      if (endHour === 0 && startHour > 0) {
        endHour = 24
      } else if (endHour < startHour) {
         // Case like start 23:00, end 01:00 (crossing midnight)
         endHour += 24
      }

      const startTotalMinutes = startHour * 60 + startMinute
      const endTotalMinutes = endHour * 60 + endMinute
      const duration = (endTotalMinutes - startTotalMinutes) / 60
      return duration > 0 ? duration : 0
    } catch {
      return 0
    }
  }

  /* ---------- Render (Loading de Sessão) ---------- */
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">{t.check_session}</div>
        </div>
      </div>
    )
  }

  /* ---------- Render (Loading de Dados) ---------- */
  if (loading && status === 'authenticated' && session?.user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">{t.loading_data}</div>
        </div>
      </div>
    )
  }

  /* ---------- Render (Conteúdo da Página - SÓ ADMIN) ---------- */
  if (status === 'authenticated' && session?.user?.role === 'admin' && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          style={{ display: 'none' }}
        />
        
        <div className="max-w-4xl mx-auto">

          <div className="mb-6 flex justify-between items-center">
            <Link href="/portal" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t.back_to_portal}
            </Link>

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
          </div>

          <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{t.scheduler_title}</h1>
              <p className="mt-2 text-gray-600">
                {t.scheduler_subtitle}
              </p>
            </div>
          </div>

          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingReservationId ? t.edit_event : t.schedule_new_event}
            </h2>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.event_type} *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button type="button" onClick={() => setEventType('teambuilding')} className={`p-4 border-2 rounded-lg text-center transition-colors ${eventType === 'teambuilding' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    <div className="font-medium">{t.teambuilding}</div>
                  </button>
                  <button type="button" onClick={() => setEventType('birthday')} className={`p-4 border-2 rounded-lg text-center transition-colors ${eventType === 'birthday' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    <div className="font-medium">{t.birthday}</div>
                  </button>
                  <button type="button" onClick={() => setEventType('vrlocal')} className={`p-4 border-2 rounded-lg text-center transition-colors ${eventType === 'vrlocal' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    <div className="font-medium">{t.vrlocal}</div>
                  </button>
                  <button type="button" onClick={() => setEventType('experiencia')} className={`p-4 border-2 rounded-lg text-center transition-colors ${eventType === 'experiencia' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    <div className="font-medium">{t.experiencia}</div>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.date_label} *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required disabled={saving || isUploading} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.start_time} *</label>
                  <select value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required disabled={saving || isUploading}>
                    { workingTimeOptions.map(time => (<option key={time} value={time}>{time}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.end_time} *</label>
                  <select value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required disabled={saving || isUploading}>
                    { workingTimeOptions.map(time => (<option key={time} value={time}>{time}</option>))}
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{t.duration}:</span>{' '}
                  {calculateDuration(startTime, endTime)} {t.hours}
                  {startTime >= endTime && (<span className="text-red-600 ml-2">⚠️ {t.end_time_error}</span>)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.people_label} *</label>
                <input type="number" min="1" max="100" value={people} onChange={e => setPeople(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required disabled={saving || isUploading} />
              </div>
              
              <div className="flex justify-end pt-2 gap-3">
                {editingReservationId && (
                  <button
                    type="button"
                    onClick={clearForm}
                    disabled={saving}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
                  >
                    {t.cancel_edit}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || startTime >= endTime || isUploading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving 
                    ? (editingReservationId ? t.updating : t.saving)
                    : (editingReservationId ? t.update_event : t.schedule_event)
                  }
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t.scheduled_events} ({reservations.length})</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerFileInput}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                  disabled={!isSheetJSLoaded || isUploading || saving}
                >
                  {isUploading 
                    ? t.importing 
                    : (language === 'en' ? "Import File (.xlsx, .csv)" : "Importar Ficheiro (.xlsx, .csv)")
                  }
                </button>
                {reservations.length > 0 && (
                  <button onClick={clearAll} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600" disabled={saving || isUploading}>
                    {t.delete_all}
                  </button>
                )}
              </div>
            </div>
            {reservations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t.no_events}</p>
            ) : (
              <div className="space-y-3">
                 {[...reservations].sort((a, b) => {
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    if (dateA !== dateB) return dateA - dateB;
                    return convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime);
                 }).map(reservation => {
                    const { day, month, year } = formatDateBlock(reservation.date);
                    const subtitle = eventTypeDetails[reservation.eventType]?.subtitle || '';

                    return (
                      <div key={reservation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex gap-4 items-start">
                          
                          {/* Bloco da Data */}
                          <div className="flex-shrink-0 w-16 text-center border-r border-gray-200 pr-4 pt-1">
                            <div className="text-3xl font-bold text-blue-600 leading-none">{day}</div>
                            <div className="text-sm font-medium text-gray-700 mt-1">{month}</div>
                            <div className="text-xs text-gray-500">{year}</div>
                          </div>

                          {/* Bloco de Informação Principal */}
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              
                              {/* Informação do Evento */}
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    reservation.eventType === 'teambuilding' ? 'bg-blue-100 text-blue-800'
                                    : reservation.eventType === 'birthday' ? 'bg-green-100 text-green-800'
                                    : reservation.eventType === 'vrlocal' ? 'bg-purple-100 text-purple-800'
                                    : 'bg-cyan-100 text-cyan-800'
                                  }`}>
                                    {formatEventType(reservation.eventType)}
                                  </span>
                                </div>
                                
                                {/* Subtítulo */}
                                <div className="text-sm text-gray-500 mb-2">
                                  {subtitle}
                                </div>

                                <div className="text-sm text-gray-600 space-y-1">
                                  {/* MOSTRAR NOME DO CLIENTE SE EXISTIR */}
                                  {reservation.customerName && (
                                    <div className="font-bold text-gray-800">{reservation.customerName}</div>
                                  )}
                                  <div><span className="font-medium">{t.start_time.split(' ')[0]}:</span> {reservation.startTime} - {reservation.endTime} <span className="text-gray-500 ml-2">({calculateDuration(reservation.startTime, reservation.endTime)} {t.hours})</span></div>
                                  <div><span className="font-medium">{t.people_label.split(' ')[0]}:</span> {reservation.people}</div>
                                </div>
                              </div>

                              {/* Botões */}
                              <div className="flex-shrink-0 ml-4">
                                <button
                                  onClick={() => handleEditClick(reservation)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 mr-2"
                                  disabled={saving || isUploading}
                                >
                                  {t.edit}
                                </button>
                                <button
                                  onClick={() => deleteReservation(reservation.id)}
                                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                  disabled={saving || isUploading}
                                >
                                  {t.cancel}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                 })}
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t.staff_assignment}</h2>
              <div className="flex gap-2"> 
                <button
                  onClick={generateSchedule}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  disabled={reservations.length === 0 || isUploading || saving}
                >
                  {t.generate_schedule}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {Object.keys(schedule).length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {reservations.length === 0 ? t.generate_schedule_help : t.generate_schedule_click}
                </p>
              ) : (
                Object.entries(schedule).map(([slot, data]) => (
                  <div key={slot} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-lg">{formatEventType(data.reservation.eventType)} - {new Date(data.reservation.date + 'T12:00:00').toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US')}</div>
                        <div className="text-sm text-gray-600 mt-1">{data.reservation.startTime} - {data.reservation.endTime} • {data.reservation.people} {t.people_label.split(' ')[2] || 'pessoas'}</div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${data.note === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {data.note}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="mb-2"><span className="font-medium">{t.staff_required}:</span> {data.required}</div>
                      <div>
                        <span className="font-medium">{t.staff_available} ({data.available.length}):</span>{' '}
                        {data.available.length > 0 ? data.available.map(a => a.name).join(', ') : t.no_staff_available}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <footer className="mt-8 text-center text-gray-500 text-sm">
            {t.system_footer} - {employees.length} {t.staff_available_count}
            <br />
            <span className="text-xs">
              ⚡ {t.auto_delete_footer}
            </span>
          </footer>
        </div>
      </div>
    )
  }

  /* ---------- Render (Fallback/Redirecionamento) ---------- */
  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg text-red-600">{t.access_denied}</div>
        <p className="text-gray-600">{t.redirecting}</p>
      </div>
    </div>
  )
}