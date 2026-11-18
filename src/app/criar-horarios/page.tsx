  'use client'
  import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
  import {
    ArrowLeftIcon,
    SparklesIcon,
    ArrowDownTrayIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    PencilSquareIcon,
    XMarkIcon,
    PlusIcon,
    Squares2X2Icon,
    ShieldExclamationIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    DocumentArrowDownIcon,
    DocumentArrowUpIcon,
    XCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
    UserGroupIcon,
    ArrowUpTrayIcon
  } from '@heroicons/react/24/outline';
  import SeletorSemanas, { numeroSemana, intervaloSemana, segundaDaSemana } from '@/app/components/SeletorSemanas';
  import { lerReservas, chaveReserva } from '@/lib/importarReservas';
  import { useLanguage } from '@/context/LanguageContext';
  import { translations } from '@/lib/translations';

  // ✅ MOCK DO LINK
  const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );

  // --- TIPOS ---
  type UnavailableWeekday = { day: number; start: string; end: string };
  type UnavailableSlot = { date: string; type: 'unavailable'; allDay?: boolean; startTime?: string; endTime?: string };

  type Employee = {
    id: string;
    name: string;
    code: string;
    role: 'admin' | 'employee';
    unavailable?: {
      weekdays: UnavailableWeekday[];
      specificDates: UnavailableSlot[];
    };
  };

  type Reservation = {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    people: number;
    eventType: string;
  };

  type Schedule = Record<string, Record<string, string[]>>;

  type NotificationType = {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  };

  type SavePromptType = {
    show: boolean;
    title: string;
    message: string;
    onSave?: () => void;
    onDiscard?: () => void;
    onCancel?: () => void;
  };

  // --- CONFIGURAÇÃO ---
  const TIME_SLOTS = [
    '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30',
    '11:30 - 12:00', '12:00 - 12:30', '12:30 - 13:00', '13:00 - 13:30',
    '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30',
    '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00', '17:00 - 17:30',
    '17:30 - 18:00', '18:00 - 18:30', '18:30 - 19:00', '19:00 - 19:30',
    '19:30 - 20:00', '20:00 - 20:30', '20:30 - 21:00', '21:00 - 21:30',
    '21:30 - 22:00', '22:00 - 22:30', '22:30 - 23:00', '23:00 - 23:30',
    '23:30 - 00:00'
  ];

  // --- FUNÇÕES HELPER ---
  const formatDateToEuropean = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateToInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const timeToMin = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const addDaysUTC = (dateString: string, days: number): string => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return date.toISOString().split('T')[0];
  };

  const formatDDMM = (dateStr: string): string => {
    const [_, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };

  const orderStaff = (staff: string[]): string[] => {
    const withoutTR = staff.filter(c => c !== 'TR').sort((a, b) => a.localeCompare(b));
    if (staff.includes('TR')) {
      if (withoutTR.length >= 1) {
        withoutTR.splice(1, 0, 'TR');
      } else {
        withoutTR.push('TR');
      }
    }
    return withoutTR;
  };

  export default function GeradorHorariosPage() {
    const { language } = useLanguage();
    const t = translations[language];

    const locale = language === 'pt' ? 'pt-PT' : 'en-US';
    const WEEK_DAYS = useMemo(() => {
      const formatter = new Intl.DateTimeFormat(locale, { weekday: 'long' });
      return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(2024, 0, i + 1);
          const dayName = formatter.format(d);
          return dayName.charAt(0).toUpperCase() + dayName.slice(1);
      });
    }, [locale]);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isSheetJSLoaded, setIsSheetJSLoaded] = useState(false);
    const [currentUser, setCurrentUser] = useState<Employee | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);

    // ✅ Estados para seleção e Drag-and-Drop
    const [expandedCols, setExpandedCols] = useState<number[]>([]);
    const [selectedCells, setSelectedCells] = useState<{slot: string; day: string}[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{slot: string; day: string} | null>(null);
    // Snapshot para guardar a seleção antes do drag começar, permitindo adicionar ao que já existe
    const selectionSnapshot = useRef<{slot: string; day: string}[]>([]);

    const [selectedDate, setSelectedDate] = useState(() => {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      return formatDateToInput(monday);
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('');

    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [weekDates, setWeekDates] = useState<string[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [editingCells, setEditingCells] = useState<{slot: string; day: string}[]>([]);

    const [notification, setNotification] = useState<NotificationType | null>(null);

    // Horários guardados (semanas com turnos na base de dados) e importação de reservas
    const [semanasGuardadas, setSemanasGuardadas] = useState<{ weekStart: string; shifts: number; employees: number }[]>([]);
    const [verTodasGuardadas, setVerTodasGuardadas] = useState(false);
    // Só se pode clicar numa semana depois de saber quais já têm horário (senão podia gerar por cima de um guardado)
    const [guardadasCarregadas, setGuardadasCarregadas] = useState(false);
    // Depois de clicar numa semana: abrir o horário guardado ou gerar um novo (corre quando a semana já mudou)
    const [acaoSemana, setAcaoSemana] = useState<'abrir' | 'gerar' | null>(null);
    const [aImportar, setAImportar] = useState(false);
    const inputReservasRef = useRef<HTMLInputElement>(null);

    const carregarSemanasGuardadas = useCallback(async () => {
      try {
        const res = await fetch('/api/admin/schedule-weeks', { cache: 'no-store' });
        if (res.ok) setSemanasGuardadas((await res.json()).weeks || []);
      } catch {
        // sem lista: o resto da página continua a funcionar
      } finally {
        setGuardadasCarregadas(true);
      }
    }, []);

    useEffect(() => {
      carregarSemanasGuardadas();
    }, [carregarSemanasGuardadas]);
    const [savePrompt, setSavePrompt] = useState<SavePromptType | null>(null);

    useEffect(() => {
      if (notification?.show) {
        const timer = setTimeout(() => setNotification(null), 3000);
        return () => clearTimeout(timer);
      }
    }, [notification]);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setNotification({ show: true, message, type });
    }, []);

    useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = '';
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // ✅ Função para abrir/fechar a lista de eventos
    const toggleColumn = (idx: number) => {
      setExpandedCols(prev =>
          prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
      );
    };

    const stats = useMemo(() => {
      const newStats: Record<string, number> = {};
      employees.forEach(emp => newStats[emp.id] = 0);

      if (schedule) {
        Object.values(schedule).forEach(daySlots => {
          Object.values(daySlots).forEach(staffList => {
            staffList.forEach(code => {
              const emp = employees.find(e => e.code === code);
              if (emp) {
                newStats[emp.id] = (newStats[emp.id] || 0) + 0.5;
              }
            });
          });
        });
      }
      return newStats;
    }, [schedule, employees]);

    // 🔥 Helper para verificar disponibilidade
    const checkSpecificSlotAvailability = useCallback((emp: Employee, cell: {slot: string, day: string}) => {
      if (emp.role === 'admin' && emp.code !== 'TR') return false;

      const dayIndex = WEEK_DAYS.indexOf(cell.day);
      const dayOfWeekJS = (dayIndex + 1) % 7;
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + dayIndex);
      const dateString = d.toISOString().split('T')[0];

      const [startStr, endStr] = cell.slot.split(' - ');
      const slotStart = timeToMin(startStr);
      const slotEnd = timeToMin(endStr);

      if (emp.unavailable?.weekdays) {
          const weekdayBlock = emp.unavailable.weekdays.find(w => w.day === dayOfWeekJS);
          if (weekdayBlock && weekdayBlock.start && weekdayBlock.end) {
              const blockStart = timeToMin(weekdayBlock.start);
              const blockEnd = timeToMin(weekdayBlock.end);
              if (slotStart < blockEnd && slotEnd >= blockStart) return false;
          }
      }

      if (emp.unavailable?.specificDates) {
          const specificBlock = emp.unavailable.specificDates.find(s => s.date === dateString);
          if (specificBlock) {
              if (specificBlock.allDay) return false;
              if (specificBlock.startTime && specificBlock.endTime) {
                  const blockStart = timeToMin(specificBlock.startTime);
                  const blockEnd = timeToMin(specificBlock.endTime);
                  if (slotStart < blockEnd && slotEnd >= blockStart) return false;
              }
          }
      }
      return true;
    }, [WEEK_DAYS, selectedDate]);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const userResponse = await fetch('/api/auth/me');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.role === 'admin') {
              setCurrentUser(userData);
            } else {
              setAccessDenied(true);
            }
          } else {
            setCurrentUser({
              id: '4', name: 'Admin Local', code: 'AD', role: 'admin',
              unavailable: { weekdays: [], specificDates: [] }
            });
          }
        } catch (error) {
          console.warn('Erro auth, usando fallback:', error);
          setCurrentUser({
            id: '4', name: 'Admin Local', code: 'AD', role: 'admin',
            unavailable: { weekdays: [], specificDates: [] }
          });
        }
      };
      checkAuth();
    }, []);

    useEffect(() => {
      if ((window as any).XLSX) {
        setIsSheetJSLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.async = true;
      script.onload = () => setIsSheetJSLoaded(true);
      document.body.appendChild(script);
    }, []);

    useEffect(() => {
      const fetchData = async () => {
        if (!currentUser || currentUser.role !== 'admin') {
          setLoadingData(false);
          return;
        }
        try {
          setLoadingData(true);
          let loadedEmployees: Employee[] = [];
          try {
            const resEmp = await fetch('/api/employees');
            if (resEmp.ok) {
              const data = await resEmp.json();
              const filteredData = data.filter((emp: any) => {
                const isBoss = emp.name.toLowerCase().includes('jose marques') ||
                              emp.name.toLowerCase().includes('josé marques');
                if (emp.code === 'TR') return true;
                const isAdmin = emp.role === 'admin';
                return !isAdmin && !isBoss;
              });
              loadedEmployees = filteredData.map((emp: any) => ({
                ...emp,
                code: emp.code || getInitials(emp.name)
              }));
            }
          } catch (error) {
            console.warn("API employees offline.");
          }
          setEmployees(loadedEmployees);

          let loadedReservations: Reservation[] = [];
          try {
            const resRes = await fetch('/api/reservations');
            if (resRes.ok) {
              loadedReservations = await resRes.json();
            }
          } catch (error) {
            loadedReservations = [];
          }
          setReservations(loadedReservations);

        } catch (error) {
          console.error("Erro fatal", error);
          showToast(t.error_generic, "error");
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }, [currentUser, showToast, t]);

    const getInitials = (name: string) =>
      name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    useEffect(() => {
      if (!selectedDate) return;
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const nextDateStr = addDaysUTC(selectedDate, i);
        dates.push(formatDDMM(nextDateStr));
      }
      setWeekDates(dates);
    }, [selectedDate]);

    const getWeekRangeText = useCallback(() => {
      if (weekDates.length === 0) return "";
      return t.week_days_range.replace('{start}', weekDates[0]).replace('{end}', weekDates[6]);
    }, [weekDates, t]);

    // =================================================================================
    // 🖱️ LÓGICA DE DRAG AND DROP SELECTION
    // =================================================================================

    // Parar o drag se o utilizador largar o rato fora da tabela
    // Edição das células do horário:
    //  - 1 clique marca a célula
    //  - clicar outra vez na célula marcada (ou duplo clique) edita-a
    //  - arrastar por várias células marca-as e, ao largar, abre o menu de editar
    //  - Ctrl/Cmd + clique junta células à seleção; Esc limpa; Enter edita as marcadas
    const selectedCellsRef = useRef<{slot: string; day: string}[]>([]);
    useEffect(() => { selectedCellsRef.current = selectedCells; }, [selectedCells]);
    const arrastou = useRef(false);            // o rato passou por outras células durante o clique
    const cliqueNaMarcada = useRef(false);     // o clique começou na única célula já marcada

    // Abre o menu de editar para estas células (ordenadas por dia e hora)
    const abrirEdicao = useCallback((cells: {slot: string; day: string}[]) => {
      if (cells.length === 0) return;
      const ordenadas = [...cells].sort((a, b) => {
        const dayDiff = WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot);
      });
      setEditingCells(ordenadas);
      setSelectedCells([]);
    }, [WEEK_DAYS]);

    useEffect(() => {
      const handleWindowMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
        setDragStart(null);
        selectionSnapshot.current = [];
        const sel = selectedCellsRef.current;
        if (arrastou.current && sel.length > 1) {
          abrirEdicao(sel);            // acabou de escolher várias: abre logo o menu
        } else if (!arrastou.current && cliqueNaMarcada.current) {
          abrirEdicao(sel);            // segundo clique na célula marcada: editar
        }
      };
      window.addEventListener('mouseup', handleWindowMouseUp);
      return () => window.removeEventListener('mouseup', handleWindowMouseUp);
    }, [isDragging, abrirEdicao]);

    const handleCellMouseDown = (slot: string, day: string, e?: React.MouseEvent) => {
      if (e && e.button !== 0) return; // só o botão esquerdo
      const juntar = !!e && (e.ctrlKey || e.metaKey);
      cliqueNaMarcada.current = !juntar && selectedCells.length === 1 && selectedCells[0].slot === slot && selectedCells[0].day === day;
      arrastou.current = false;

      setIsDragging(true);
      setDragStart({ slot, day });
      selectionSnapshot.current = juntar ? [...selectedCells] : [];
      if (juntar) {
        if (!selectedCells.some(c => c.slot === slot && c.day === day)) setSelectedCells(prev => [...prev, { slot, day }]);
      } else {
        setSelectedCells([{ slot, day }]);
      }
    };

    const handleCellMouseEnter = (currentSlot: string, currentDay: string) => {
      if (!isDragging || !dragStart) return;
      arrastou.current = true;

      const startSlotIdx = TIME_SLOTS.indexOf(dragStart.slot);
      const endSlotIdx = TIME_SLOTS.indexOf(currentSlot);
      const startDayIdx = WEEK_DAYS.indexOf(dragStart.day);
      const endDayIdx = WEEK_DAYS.indexOf(currentDay);

      const minSlot = Math.min(startSlotIdx, endSlotIdx);
      const maxSlot = Math.max(startSlotIdx, endSlotIdx);
      const minDay = Math.min(startDayIdx, endDayIdx);
      const maxDay = Math.max(startDayIdx, endDayIdx);

      const newRangeCells: {slot: string, day: string}[] = [];

      for (let s = minSlot; s <= maxSlot; s++) {
        for (let d = minDay; d <= maxDay; d++) {
          newRangeCells.push({ slot: TIME_SLOTS[s], day: WEEK_DAYS[d] });
        }
      }

      // Combina o snapshot original com o novo range (evitando duplicados)
      const combined = [...selectionSnapshot.current];
      newRangeCells.forEach(newCell => {
          if (!combined.some(existing => existing.slot === newCell.slot && existing.day === newCell.day)) {
              combined.push(newCell);
          }
      });

      setSelectedCells(combined);
    };

    const cancelMultiSelect = useCallback(() => {
      setSelectedCells([]);
      setIsDragging(false);
      setDragStart(null);
    }, []);

    const openMultiEditModal = useCallback(() => {
      if (selectedCells.length === 0) {
        showToast(t.select_cell_edit, 'error');
        return;
      }
      abrirEdicao(selectedCells);
    }, [selectedCells, showToast, t, abrirEdicao]);

    // Teclado: Esc limpa a seleção, Enter edita as células marcadas
    useEffect(() => {
      if (!schedule || editingCells.length > 0) return;
      const tecla = (e: KeyboardEvent) => {
        const alvo = e.target as HTMLElement;
        if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return;
        if (e.key === 'Escape' && selectedCellsRef.current.length) setSelectedCells([]);
        if (e.key === 'Enter' && selectedCellsRef.current.length) { e.preventDefault(); abrirEdicao(selectedCellsRef.current); }
      };
      window.addEventListener('keydown', tecla);
      return () => window.removeEventListener('keydown', tecla);
    }, [schedule, editingCells.length, abrirEdicao]);

    const toggleEmployeeInMultipleCells = useCallback((code: string) => {
      if (!schedule || editingCells.length === 0) return;

      setHasUnsavedChanges(true);
      const newSchedule = { ...schedule };

      // Verifica se está em TODOS os selecionados
      const isInAllCells = editingCells.every(cell =>
        newSchedule[cell.slot]?.[cell.day]?.includes(code)
      );

      if (isInAllCells) {
        editingCells.forEach(cell => {
          if (newSchedule[cell.slot]?.[cell.day]) {
            newSchedule[cell.slot][cell.day] = orderStaff(newSchedule[cell.slot][cell.day].filter(c => c !== code));
          }
        });
      } else {
        editingCells.forEach(cell => {
          if (!newSchedule[cell.slot]) newSchedule[cell.slot] = {};
          if (!newSchedule[cell.slot][cell.day]) newSchedule[cell.slot][cell.day] = [];

          const emp = employees.find(e => e.code === code);
          if (emp && checkSpecificSlotAvailability(emp, cell)) {
              const currentStaff = [...newSchedule[cell.slot][cell.day]];
              if (!currentStaff.includes(code)) {
                newSchedule[cell.slot][cell.day] = orderStaff([...currentStaff, code]);
              }
          }
        });
      }
      setSchedule(newSchedule);
    }, [schedule, editingCells, employees, checkSpecificSlotAvailability]);

    const setEmployeesInMultipleCells = useCallback((codes: string[]) => {
      if (!schedule || editingCells.length === 0) return;

      setHasUnsavedChanges(true);
      const newSchedule = { ...schedule };
      editingCells.forEach(cell => {
        if (!newSchedule[cell.slot]) newSchedule[cell.slot] = {};
        const newStaff = orderStaff([...codes]);
        newSchedule[cell.slot][cell.day] = newStaff;
      });
      setSchedule(newSchedule);
    }, [schedule, editingCells]);

    // 🔥 Helper para % disponibilidade visual
    const checkEmployeeAvailabilityRate = useCallback((emp: Employee) => {
      if (emp.role === 'admin' && emp.code !== 'TR') return 0;

      let availableCount = 0;
      let totalCount = editingCells.length;

      editingCells.forEach(cell => {
          if (checkSpecificSlotAvailability(emp, cell)) {
              availableCount++;
          }
      });

      return availableCount / totalCount;
    }, [editingCells, checkSpecificSlotAvailability]);

    const getEventColor = (eventType: string) => {
      switch(eventType?.toLowerCase()) {
          case 'birthday': return 'bg-green-100 text-green-800 border-green-200';
          case 'teambuilding': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'vrlocal': return 'bg-purple-100 text-purple-800 border-purple-200';
          default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const handleExportExcel = useCallback(() => {
      if (!schedule || !(window as any).XLSX) return;
      const XLSX = (window as any).XLSX;
      const headers = [t.schedule_header, ...WEEK_DAYS.map((day, i) => `${day} (${weekDates[i]})`)];
      const dataRows = TIME_SLOTS.map(slot => {
        const row = [slot];
        WEEK_DAYS.forEach(day => {
          const staff = schedule[slot]?.[day] || [];
          row.push(staff.join('+'));
        });
        return row;
      });
      const worksheetData = [headers, ...dataRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const wscols = [{ wch: 15 }];
      for (let i = 0; i < 7; i++) wscols.push({ wch: 20 });
      worksheet['!cols'] = wscols;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t.schedule_header);
      const fileName = `Schedule_${weekDates[0].replace('/', '-')}_to_${weekDates[6].replace('/', '-')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast(t.success_generic, "success");
    }, [schedule, weekDates, showToast, t, WEEK_DAYS]);

    const handleSaveToDatabase = useCallback(async (onSuccess?: () => void) => {
      if (!schedule) return;

      setIsSaving(true);

      try {
        const shiftsToSave: any[] = [];
        const allStaffCodes = new Set<string>();

        Object.values(schedule).forEach(daySlots => {
          Object.values(daySlots).forEach(staffList => {
            staffList.forEach(code => allStaffCodes.add(code));
          });
        });

        allStaffCodes.forEach(code => {
          WEEK_DAYS.forEach((dayName, dayIndex) => {
            const dateStr = addDaysUTC(selectedDate, dayIndex);

            const workedSlotsIndices: number[] = [];
            TIME_SLOTS.forEach((slot, slotIndex) => {
              if (schedule[slot]?.[dayName]?.includes(code)) {
                workedSlotsIndices.push(slotIndex);
              }
            });

            if (workedSlotsIndices.length === 0) return;
            workedSlotsIndices.sort((a, b) => a - b);

            let currentBlockStart = workedSlotsIndices[0];
            let previousSlot = workedSlotsIndices[0];

            for (let i = 1; i <= workedSlotsIndices.length; i++) {
              const currentSlot = workedSlotsIndices[i];
              if (currentSlot !== previousSlot + 1 || i === workedSlotsIndices.length) {
                const startSlotStr = TIME_SLOTS[currentBlockStart].split(' - ')[0];
                const endSlotStr = TIME_SLOTS[previousSlot].split(' - ')[1];
                const slotsCount = (previousSlot - currentBlockStart) + 1;
                const totalHours = slotsCount * 0.5;

                shiftsToSave.push({
                  employeeCode: code,
                  date: dateStr,
                  startTime: startSlotStr,
                  endTime: endSlotStr,
                  totalHours: totalHours
                });

                if (i < workedSlotsIndices.length) {
                  currentBlockStart = currentSlot;
                }
              }
              previousSlot = currentSlot;
            }
          });
        });

        const response = await fetch('/api/admin/save-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shifts: shiftsToSave })
        });

        const data = await response.json();

        if (response.ok) {
          setHasUnsavedChanges(false);
          showToast(t.schedule_saved.replace('{count}', shiftsToSave.length.toString()), "success");
          carregarSemanasGuardadas();
          if (onSuccess) onSuccess();
          setSavePrompt(null);
        } else {
          showToast(t.error_saving.replace('{message}', data.message), "error");
        }

      } catch (error) {
        console.error("Erro ao guardar:", error);
        showToast(t.error_generic, "error");
      } finally {
        setIsSaving(false);
      }
    }, [schedule, selectedDate, showToast, t, WEEK_DAYS, carregarSemanasGuardadas]);

    const loadScheduleFromDatabase = useCallback(async () => {
      setIsLoadingSchedule(true);
      setSchedule(null);

      try {
        const startDateStr = selectedDate;
        const endDateStr = addDaysUTC(selectedDate, 6);

        const res = await fetch(`/api/admin/get-weekly-schedule?start=${startDateStr}&end=${endDateStr}`);
        if (!res.ok) throw new Error(`Erro na API: ${res.status}`);

        const data = await res.json();
        const shifts = data.shifts || [];

        if (shifts.length === 0) {
          showToast(t.no_schedule_found, "info");
          setIsLoadingSchedule(false);
          setHasUnsavedChanges(false);
          return;
        }

        const newSchedule: Schedule = {};
        TIME_SLOTS.forEach(slot => {
          newSchedule[slot] = {};
          WEEK_DAYS.forEach(day => { newSchedule[slot][day] = []; });
        });

        const dateToDayNameMap: Record<string, string> = {};
        WEEK_DAYS.forEach((day, index) => {
          const dateStr = addDaysUTC(selectedDate, index);
          dateToDayNameMap[dateStr] = day;
        });

        shifts.forEach((shift: any) => {
          try {
            const shiftDateStr = shift.date.split('T')[0];
            const dayName = dateToDayNameMap[shiftDateStr];

            if (!dayName) return;

            const startMin = timeToMin(shift.startTime);
            const endMin = timeToMin(shift.endTime);

            TIME_SLOTS.forEach((slot) => {
              const [sStart] = slot.split(' - ');
              const slotMin = timeToMin(sStart);
              if (slotMin >= startMin && slotMin < endMin) {
                if (newSchedule[slot] && newSchedule[slot][dayName]) {
                  newSchedule[slot][dayName].push(shift.employeeCode);
                }
              }
            });
          } catch (error) {
            console.error("Erro ao processar turno:", error, shift);
          }
        });

        TIME_SLOTS.forEach(slot => {
          WEEK_DAYS.forEach(day => {
            newSchedule[slot][day] = orderStaff(Array.from(new Set(newSchedule[slot][day])));
          });
        });

        setSchedule(newSchedule);
        setHasUnsavedChanges(false);
        showToast(t.schedule_loaded, "success");

      } catch (error) {
        console.error("Erro ao carregar:", error);
        showToast(t.error_generic, "error");
      } finally {
        setIsLoadingSchedule(false);
        setSavePrompt(null);
      }
    }, [selectedDate, showToast, t, WEEK_DAYS]);

    const executeLoadSchedule = useCallback(() => {
      if (!selectedDate) return;

      if (hasUnsavedChanges) {
        setSavePrompt({
          show: true,
          title: t.load_unsaved_title,
          message: t.load_unsaved_message,
          onSave: () => {
            handleSaveToDatabase(() => {
              loadScheduleFromDatabase();
            });
          },
          onDiscard: () => {
            loadScheduleFromDatabase();
          },
          onCancel: () => {
            setSavePrompt(null);
          }
        });
      } else {
        loadScheduleFromDatabase();
      }
    }, [selectedDate, hasUnsavedChanges, handleSaveToDatabase, loadScheduleFromDatabase, t]);

    const handleLoadClick = useCallback(() => {
      executeLoadSchedule();
    }, [executeLoadSchedule]);

    // Clicar numa semana: se já tem horário guardado abre-o, senão começa logo a gerar
    const escolherSemana = (segunda: string) => {
      setSelectedDate(segunda);
      setAcaoSemana(semanasGuardadas.some(s => s.weekStart === segunda) ? 'abrir' : 'gerar');
    };
    // Clicar num horário da lista "Horários guardados"
    const abrirHorarioGuardado = (segunda: string) => {
      setSelectedDate(segunda);
      setAcaoSemana('abrir');
    };

    // Nº de reservas em cada semana (aparece em cada semana do seletor)
    const reservasPorSemana = useMemo(() => {
      const contagem: Record<string, number> = {};
      reservations.forEach((r: any) => {
        if (!r.date) return;
        const s = segundaDaSemana(String(r.date).slice(0, 10));
        contagem[s] = (contagem[s] || 0) + 1;
      });
      return contagem;
    }, [reservations]);

    // Importar o Excel/CSV de reservas (antes estava na página Gerir Horários)
    const importarReservas = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const ficheiro = e.target.files?.[0];
      e.target.value = '';
      if (!ficheiro) return;
      setAImportar(true);
      try {
        const XLSX = await import('xlsx');
        const { reservas, erro } = lerReservas(XLSX, await ficheiro.arrayBuffer());
        if (erro) {
          const msg = erro === 'missing_email_col' ? t.sch_missing_email_col : erro === 'missing_cols' ? t.sch_missing_cols : t.file_no_valid_reservations;
          showToast(msg, 'error');
          return;
        }
        // Não importar outra vez reservas que já existem
        const existentes = new Set(reservations.map((r: any) => chaveReserva(r)));
        const novas = reservas.filter(r => !existentes.has(chaveReserva(r)));
        if (novas.length === 0) {
          showToast(t.sch_no_new_reservations, 'info');
          return;
        }
        const resultados = await Promise.all(novas.map(r =>
          fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
            .then(res => res.ok)
            .catch(() => false)
        ));
        const ok = resultados.filter(Boolean).length;
        const falhas = resultados.length - ok;
        // Recarregar as reservas (contam para gerar o horário)
        const resRes = await fetch('/api/reservations');
        if (resRes.ok) setReservations(await resRes.json());
        showToast(
          falhas > 0
            ? t.cs_import_partial.replace('{ok}', String(ok)).replace('{fail}', String(falhas))
            : t.cs_import_done.replace('{n}', String(ok)),
          falhas > 0 ? 'error' : 'success'
        );
      } catch (err: any) {
        showToast(`${t.file_read_error}: ${err?.message || ''}`, 'error');
      } finally {
        setAImportar(false);
      }
    };

    const handleDiscardAndRegenerate = useCallback(() => {
      if (hasUnsavedChanges) {
        setSavePrompt({
          show: true,
          title: t.discard_changes_title,
          message: t.discard_changes_message,
          onSave: () => {
            handleSaveToDatabase(() => {
              setSchedule(null);
              setHasUnsavedChanges(false);
            });
          },
          onDiscard: () => {
            setSchedule(null);
            setHasUnsavedChanges(false);
          },
          onCancel: () => {
            setSavePrompt(null);
          }
        });
      } else {
        setSchedule(null);
      }
    }, [hasUnsavedChanges, handleSaveToDatabase, t]);

    // Seta de voltar: a ver um horário -> volta à lista de semanas do Criar Horários;
    // na lista de semanas -> volta ao portal. Com alterações por guardar pergunta primeiro.
    const handleExit = useCallback(() => {
      const voltar = schedule
        ? () => {
            cancelMultiSelect();
            setEditingCells([]);
            setSchedule(null);
            setHasUnsavedChanges(false);
            setSavePrompt(null);
            window.scrollTo({ top: 0 });
          }
        : () => { window.location.href = '/portal'; };

      if (hasUnsavedChanges) {
        setSavePrompt({
          show: true,
          title: t.save_prompt_title,
          message: t.save_prompt_message,
          onSave: () => {
            handleSaveToDatabase(voltar);
          },
          onDiscard: voltar,
          onCancel: () => {
            setSavePrompt(null);
          }
        });
      } else {
        voltar();
      }
    }, [schedule, hasUnsavedChanges, handleSaveToDatabase, cancelMultiSelect, t]);

    const handleSaveClick = useCallback(() => {
      if (!schedule) return;

      if (hasUnsavedChanges) {
        handleSaveToDatabase();
      } else {
        showToast(t.no_changes, "info");
      }
    }, [schedule, hasUnsavedChanges, handleSaveToDatabase, showToast, t]);

    const handleGenerate = useCallback(() => {
      if (employees.length === 0) {
        showToast(t.no_employees_generate, "error");
        return;
      }

      setIsGenerating(true);
      setSchedule(null);
      setHasUnsavedChanges(true);
      setProgress(0);

      const steps = [
        { pct: 10, txt: t.calculating_demand },
        { pct: 30, txt: t.building_layers },
        { pct: 60, txt: t.optimizing_blocks },
        { pct: 90, txt: t.filling_teams },
      ];

      let stepIndex = 0;
      const interval = setInterval(() => {
        if (stepIndex >= steps.length) {
          clearInterval(interval);
          runAlgorithm();
        } else {
          setProgress(steps[stepIndex].pct);
          setLoadingText(steps[stepIndex].txt);
          stepIndex++;
        }
      }, 400);

      // =================================================================================
      // 🔥 ALGORITMO FINAL COM TODAS AS CORREÇÕES:
      // 1. Vantagem APENAS para TR
      // 2. Afinidade NUCLEAR para (DO+MO) e (NR+HN) (5000h de bónus)
      // 3. Fim de Semana: Rotação "Suave" de 5h. Se passar disso, tenta mudar. Se não conseguir, mantém.
      // 4. Limite mínimo 5h ao FDS se for chamado (10 slots)
      // =================================================================================
      const runAlgorithm = () => {
        const newSchedule: Schedule = {};
        TIME_SLOTS.forEach(slot => {
          newSchedule[slot] = {};
          WEEK_DAYS.forEach(day => newSchedule[slot][day] = []);
        });

        const employeeHours: Record<string, number> = {};
        employees.forEach(emp => employeeHours[emp.id] = 0);

        const startOfWeek = new Date(selectedDate);
        const demandMap: Record<string, number[]> = {};

        const STORE_OPEN_MIN = 9 * 60; // 09:00
        const MIN_SHIFT_SLOTS = 4;

        // 1. CALCULAR DEMAND
        WEEK_DAYS.forEach((_, dayIdx) => {
          const currentDate = new Date(startOfWeek);
          currentDate.setDate(startOfWeek.getDate() + dayIdx);
          const dateString = currentDate.toISOString().split('T')[0];
          demandMap[dateString] = new Array(TIME_SLOTS.length).fill(0);

          const daysReservations = reservations.filter(r => r.date === dateString);
          const isWeekend = dayIdx === 5 || dayIdx === 6;

          if (isWeekend) {
            const WEEKEND_DEFAULT_START_MIN = 10 * 60; // 10:00
            TIME_SLOTS.forEach((slot, i) => {
              const [sStart] = slot.split(' - ');
              const slotStartMin = timeToMin(sStart);
              const WEEKEND_LIMIT_MIN = 20 * 60; // 20:00

              // Only apply default staff (2) from 10:00 onwards
              if (slotStartMin >= WEEKEND_DEFAULT_START_MIN && slotStartMin < WEEKEND_LIMIT_MIN) {
                demandMap[dateString][i] = 2;
              }
            });
          }

          daysReservations.forEach(res => {
            const rawStart = timeToMin(res.startTime) - 30;
            const rawEnd = timeToMin(res.endTime) + 30;

            // 🔥 CORREÇÃO: Limpar string "24p" -> 24
            const cleanPeopleString = String(res.people || '0').replace(/\D/g, '');
            const peopleCount = parseInt(cleanPeopleString, 10) || 0;

            let staffNeeded = 2;
            if (peopleCount >= 12) staffNeeded = 3;
            if (peopleCount >= 17) staffNeeded = 4;
            if (peopleCount >= 20) staffNeeded = 5;
            if (peopleCount >= 24) staffNeeded = 6;
            if (peopleCount >= 30) staffNeeded = 7;

            TIME_SLOTS.forEach((slot, i) => {
              const [sStart, sEnd] = slot.split(' - ');
              const slotStartMin = timeToMin(sStart);
              const slotEndMin = timeToMin(sEnd);

              if (slotStartMin < rawEnd && slotEndMin > rawStart) {
                demandMap[dateString][i] = Math.max(demandMap[dateString][i], staffNeeded);
              }
            });
          });

          if (isWeekend) {
            const WEEKEND_LIMIT_MIN = 20 * 60;
            TIME_SLOTS.forEach((slot, i) => {
              const [sStart] = slot.split(' - ');
              const slotStartMin = timeToMin(sStart);
              if (slotStartMin >= WEEKEND_LIMIT_MIN && demandMap[dateString][i] <= 2) {
                  const activeRes = daysReservations.some(r => {
                      const rEnd = timeToMin(r.endTime) + 30;
                      return rEnd > slotStartMin;
                  });
                  if (!activeRes) demandMap[dateString][i] = 0;
              }
            });
          }
        });

        // 2. ATRIBUIR STAFF
        WEEK_DAYS.forEach((dayName, dayIdx) => {
          const currentDate = new Date(startOfWeek);
          currentDate.setDate(startOfWeek.getDate() + dayIdx);
          const dateString = currentDate.toISOString().split('T')[0];
          const jsDay = (dayIdx + 1) % 7;

          const demandArr = demandMap[dateString];
          const maxDemand = Math.max(...demandArr);

          const dailyHours: Record<string, number> = {};
          employees.forEach(emp => dailyHours[emp.id] = 0);

          const isWeekend = dayIdx === 5 || dayIdx === 6;

          // 🔥 Lógica de Preferência do TR ao Fim de Semana
          let trPrefersMorning = true;
          if (isWeekend) {
            let morningDemand = 0;
            let afternoonDemand = 0;
            for (let i = 0; i < TIME_SLOTS.length; i++) {
               const [sStart] = TIME_SLOTS[i].split(' - ');
               const slotMin = timeToMin(sStart);
               if (slotMin < 14 * 60) {
                 morningDemand += demandArr[i];
               } else {
                 afternoonDemand += demandArr[i];
               }
            }
            // TR appears where there are LESS reservations (less demand)
            trPrefersMorning = morningDemand <= afternoonDemand;
          }

          // 🛑 ROTAÇÃO NO FIM DE SEMANA
          // Limite "suave" de 5h (10 slots). Se passar disso, tenta mudar de pessoa.
          const rotationThreshold = isWeekend ? 10 : 12;

          for (let level = 1; level <= maxDemand; level++) {
            let inShift = false;
            let startIdx = -1;
            const shiftRequests: {start: number; end: number}[] = [];

            for (let i = 0; i < TIME_SLOTS.length; i++) {
              if (demandArr[i] >= level) {
                if (!inShift) {
                  startIdx = i;
                  inShift = true;
                }
              } else {
                if (inShift) {
                  shiftRequests.push({ start: startIdx, end: i });
                  inShift = false;
                }
              }
            }
            if (inShift) {
              shiftRequests.push({ start: startIdx, end: TIME_SLOTS.length });
            }

            shiftRequests.forEach(req => {
              let duration = req.end - req.start;
              let currentStart = req.start;
              let currentEnd = req.end;

              // Mínimos
              // Fim de semana: mínimo 5h (10 slots) se possível, senão o que der
              // Semana: mínimo 2h (4 slots)
              const minSlots = isWeekend ? 10 : MIN_SHIFT_SLOTS;

              if (duration < minSlots) {
                const expandBy = minSlots - duration;
                currentStart = Math.max(0, currentStart - Math.floor(expandBy/2));
                currentEnd = Math.min(TIME_SLOTS.length, currentStart + minSlots);
                if (currentEnd - currentStart < minSlots) {
                  currentStart = Math.max(0, currentEnd - minSlots);
                }
                duration = currentEnd - currentStart;
              }

              // Dividir turno se for muito longo para rotação (especialmente FDS)
              const shiftsToFill: {s: number; e: number}[] = [];

              if (duration > rotationThreshold) {
                  let s = currentStart;
                  while(s < currentEnd) {
                      let e = Math.min(s + rotationThreshold, currentEnd);
                      // Evitar sobras minúsculas (ex: turno de 1h no fim)
                      if ((currentEnd - e) > 0 && (currentEnd - e) < 4) {
                          e = currentEnd; // Junta o resto
                      }
                      shiftsToFill.push({ s, e });
                      s = e;
                  }
              } else {
                  shiftsToFill.push({ s: currentStart, e: currentEnd });
              }

              shiftsToFill.forEach(shift => {
                const [tStartStr] = TIME_SLOTS[shift.s].split(' - ');
                const shiftStartMin = timeToMin(tStartStr);
                const endSlotIdx = Math.min(shift.e - 1, TIME_SLOTS.length - 1);
                const [_, tEndStr] = TIME_SLOTS[endSlotIdx].split(' - ');
                const shiftEndMin = timeToMin(tEndStr);

                // 1. Verificar se é "Grupo Grande" (5+ pessoas) para a lógica DO/MO
                let shiftMaxDemand = 0;
                for (let i = shift.s; i < shift.e; i++) {
                    if (demandArr[i] > shiftMaxDemand) shiftMaxDemand = demandArr[i];
                }
                const isBigGroup = shiftMaxDemand >= 5;

                const candidates = employees.filter(emp => {
                  if (emp.role === 'admin' && emp.code !== 'TR') return false;

                  // Permitir voltar no mesmo dia (Split Shift) - Limite 13h por segurança
                  if (dailyHours[emp.id] >= 13) return false;

                  // Impedir duplicação no mesmo slot
                  let isBusyNow = false;
                  for (let k = shift.s; k < shift.e; k++) {
                      if (newSchedule[TIME_SLOTS[k]]?.[dayName]?.includes(emp.code)) {
                          isBusyNow = true;
                          break;
                      }
                  }
                  if (isBusyNow) return false;

                  if (!emp.unavailable) return true;

                  const specific = emp.unavailable.specificDates?.find(s => s.date === dateString);
                  if (specific) {
                    if (specific.allDay) return false;
                    if (specific.startTime && specific.endTime) {
                      const uStart = timeToMin(specific.startTime);
                      const uEnd = timeToMin(specific.endTime);
                      if (shiftStartMin < uEnd && shiftEndMin >= uStart) return false;
                    }
                  }

                  const weekdayUn = emp.unavailable.weekdays?.find(w => w.day === jsDay);
                  if (weekdayUn) {
                    if (weekdayUn.start && weekdayUn.end) {
                      const wStart = timeToMin(weekdayUn.start);
                      const wEnd = timeToMin(weekdayUn.end);
                      if (shiftStartMin < wEnd && shiftEndMin >= wStart) return false;
                    } else {
                      return false;
                    }
                  }

                  return true;
                });

                const finalCandidates = candidates;

                finalCandidates.sort((a, b) => {
                  const currentStaffInSlot = newSchedule[TIME_SLOTS[shift.s]]?.[dayName] || [];

                  let hoursA = employeeHours[a.id];
                  let hoursB = employeeHours[b.id];

                  // 🔥 ROTAÇÃO FORÇADA: Se já trabalhou hoje, penalizamos as horas virtuais (só para ordenação)
                  if (dailyHours[a.id] > 0) hoursA += 50;
                  if (dailyHours[b.id] > 0) hoursB += 50;

                  // 🟢 BUFFS INDIVIDUAIS
                  if (a.code === 'DO' || a.code === 'NR') hoursA -= 5; // Buff: mais prováveis de calhar
                  if (b.code === 'DO' || b.code === 'NR') hoursB -= 5;
                  if (a.code === 'TR') hoursA -= 7;
                  if (b.code === 'TR') hoursB -= 7;

                  // 🔴 NERFS INDIVIDUAIS
                  if (a.code === 'MO' || a.code === 'GR') hoursA += 7;
                  if (b.code === 'MO' || b.code === 'GR') hoursB += 7;
                  if (a.code === 'AM') hoursA += 9;
                  if (b.code === 'AM') hoursB += 9;

                  // ⛔ ANTI-AFINIDADE: GR e MO — se um já está no turno, o outro vai para o fim da fila (só calha se não houver mais ninguém)
                  const staffInThisShift: string[] = [];
                  for (let k = shift.s; k < shift.e; k++) {
                    (newSchedule[TIME_SLOTS[k]]?.[dayName] || []).forEach((c: string) => {
                      if (!staffInThisShift.includes(c)) staffInThisShift.push(c);
                    });
                  }
                  const grInShift = staffInThisShift.includes('GR');
                  const moInShift = staffInThisShift.includes('MO');

                  if (a.code === 'GR' && moInShift) hoursA += 5000;
                  if (a.code === 'MO' && grInShift) hoursA += 5000;
                  if (b.code === 'GR' && moInShift) hoursB += 5000;
                  if (b.code === 'MO' && grInShift) hoursB += 5000;

                  if (Math.abs(hoursA - hoursB) > 2) {
                    return hoursA - hoursB;
                  }

                  return 0.5 - Math.random();
                });

                if (finalCandidates.length > 0) {
                  const worker = finalCandidates[0];
                  for (let k = shift.s; k < shift.e; k++) {
                    if (!newSchedule[TIME_SLOTS[k]]) newSchedule[TIME_SLOTS[k]] = {};
                    if (!newSchedule[TIME_SLOTS[k]][dayName]) newSchedule[TIME_SLOTS[k]][dayName] = [];
                    newSchedule[TIME_SLOTS[k]][dayName].push(worker.code);
                  }
                  const hoursAdded = (shift.e - shift.s) * 0.5;
                  employeeHours[worker.id] += hoursAdded;
                  dailyHours[worker.id] += hoursAdded;
                }
              });
            });
          }
        });

        TIME_SLOTS.forEach(slot => {
          WEEK_DAYS.forEach(day => {
            if (newSchedule[slot] && newSchedule[slot][day]) {
              newSchedule[slot][day] = orderStaff(newSchedule[slot][day]);
            }
          });
        });

        setSchedule(newSchedule);
        setIsGenerating(false);
        showToast(t.schedule_generated, "success");
      };
    }, [employees, reservations, selectedDate, showToast, t, WEEK_DAYS]);

    // Executa a ação da semana escolhida, já com a nova semana em selectedDate
    useEffect(() => {
      if (!acaoSemana) return;
      const acao = acaoSemana;
      setAcaoSemana(null);
      if (acao === 'abrir') executeLoadSchedule();
      else handleGenerate();
    }, [acaoSemana, executeLoadSchedule, handleGenerate]);

    if (accessDenied) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldExclamationIcon className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{t.access_denied}</h1>
            <p className="text-gray-600 mb-6">
              {t.access_denied_message}
            </p>
            <Link href="/portal" className="inline-flex items-center gap-2 bg-park-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-park-700 transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
              {t.back_to_portal}
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">

        {notification?.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 max-w-sm border ${
              notification.type === 'success' ? 'bg-white border-green-200 text-green-800' :
              notification.type === 'error' ? 'bg-white border-red-200 text-red-800' :
              'bg-white border-park-200 text-park-800'
          }`}>
              {notification.type === 'success' && <CheckCircleIcon className="w-6 h-6 text-green-500" />}
              {notification.type === 'error' && <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />}
              {notification.type === 'info' && <InformationCircleIcon className="w-6 h-6 text-park-500" />}

              <div className="flex-1">
                  <p className="font-medium text-sm">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-4 h-4" />
              </button>
          </div>
        )}

        {savePrompt?.show && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 scale-100 border border-gray-200">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-full">
                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{savePrompt.title}</h3>
                </div>
                <button
                  onClick={savePrompt.onCancel}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-600 mb-2">{savePrompt.message}</p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <InformationCircleIcon className="w-4 h-4" />
                    <span>{t.save_prompt_warning}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 p-4 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={savePrompt.onSave}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-park-600 text-white rounded-lg font-medium hover:bg-park-700 transition-colors shadow-sm flex-1"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t.saving}</span>
                    </>
                  ) : (
                    <>
                      <DocumentArrowDownIcon className="w-5 h-5" />
                      <span>{t.save_official}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={savePrompt.onDiscard}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1"
                >
                  <XCircleIcon className="w-5 h-5" />
                  <span>{t.exit_without_saving}</span>
                </button>

                <button
                  onClick={savePrompt.onCancel}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>{t.cancel_selection}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExit}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              title={schedule ? t.cs_back_to_weeks : t.back_to_portal}
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>

            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-park-600" />
                {t.generate_schedule_title}
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {t.admin_area.replace('{name}', currentUser?.name || '').replace('{code}', currentUser?.code || '')}
              </p>
            </div>
          </div>

          {hasUnsavedChanges && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-amber-700">{t.unsaved_changes}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {schedule && (
              <>
                  <button
                      onClick={handleSaveClick}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 ${
                        hasUnsavedChanges
                          ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 ring-offset-2'
                          : 'bg-park-600 hover:bg-park-700 text-white'
                      }`}
                  >
                      {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                          <DocumentArrowDownIcon className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {hasUnsavedChanges ? t.save_unsaved : t.save_official}
                      </span>
                  </button>

              </>
            )}
            {schedule && selectedCells.length > 0 && editingCells.length === 0 && (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-sm text-gray-600">
                  {t.cells_selected.replace('{count}', selectedCells.length.toString())}
                </span>
                <button
                  onClick={openMultiEditModal}
                  className="flex items-center gap-2 bg-park-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-park-700 transition-colors shadow-sm"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  {t.edit_selected.replace('{count}', String(selectedCells.length))}
                </button>
                <button
                  onClick={() => setSelectedCells([])}
                  className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors shadow-sm"
                >
                  <XMarkIcon className="w-4 h-4" />
                  {t.cancel_selection}
                </button>
              </div>
            )}
            {schedule && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.export_excel}</span>
              </button>
            )}
          </div>
        </div>

        <main className="max-w-[95rem] mx-auto p-4 sm:p-6 relative">
          {loadingData && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-park-200 border-t-park-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">{t.loading_data}</p>
            </div>
          )}

          {!loadingData && (
            <>
              {!schedule && !isGenerating && (
                <div className="max-w-6xl mx-auto mt-2 sm:mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* 1. Criar horário: escolher a semana e gerar */}
                  <section className="lg:col-span-3 bg-white p-5 sm:p-8 rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <SparklesIcon className="w-6 h-6 text-park-600" />
                      {t.generate_weekly_schedule}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 mb-6">{t.cs_choose_week_hint}</p>

                    <SeletorSemanas
                      value={selectedDate}
                      onChange={escolherSemana}
                      locale={locale}
                      semanasGuardadas={new Set(semanasGuardadas.map(s => s.weekStart))}
                      reservasPorSemana={reservasPorSemana}
                      desativado={isLoadingSchedule || !guardadasCarregadas}
                      textos={{
                        week: t.cs_week,
                        saved: t.cs_saved,
                        today: t.cs_this_week,
                        prevMonth: t.cs_prev_month,
                        nextMonth: t.cs_next_month,
                        prevYear: t.cs_prev_year,
                        nextYear: t.cs_next_year,
                        open: t.cs_open,
                        generate: t.cs_generate,
                        reservations: t.cs_reservations,
                      }}
                    />
                  </section>

                  <div className="lg:col-span-2 space-y-6">
                    {/* 2. Importar reservas (antes estava na página Gerir Horários) */}
                    <section className="bg-white p-5 sm:p-6 rounded-2xl shadow-lg border border-gray-100">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ArrowUpTrayIcon className="w-5 h-5 text-park-600" />
                        {t.cs_import_title}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1 mb-4">{t.cs_import_hint}</p>
                      <input ref={inputReservasRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importarReservas} />
                      <button
                        onClick={() => inputReservasRef.current?.click()}
                        disabled={aImportar}
                        className="w-full py-3 bg-park-800 hover:bg-park-900 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {aImportar ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ArrowUpTrayIcon className="w-5 h-5" />
                        )}
                        {aImportar ? t.cs_importing : t.cs_import_button}
                      </button>
                    </section>

                    {/* 3. Horários guardados (antigos) */}
                    <section className="bg-white p-5 sm:p-6 rounded-2xl shadow-lg border border-gray-100">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-park-600" />
                        {t.cs_saved_title}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1 mb-4">{t.cs_saved_hint}</p>
                      {semanasGuardadas.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">{t.cs_saved_empty}</p>
                      ) : (
                        <>
                          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                            {(verTodasGuardadas ? semanasGuardadas : semanasGuardadas.slice(0, 6)).map(s => (
                              <li key={s.weekStart}>
                                <button
                                  onClick={() => abrirHorarioGuardado(s.weekStart)}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-park-50 transition-colors"
                                >
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900">
                                      {t.cs_week} {numeroSemana(s.weekStart)}{' '}
                                      <span className="font-normal text-gray-400">{s.weekStart.slice(0, 4)}</span>
                                    </p>
                                    <p className="text-sm text-gray-500">{intervaloSemana(s.weekStart, locale)}</p>
                                  </div>
                                  <span className="ml-auto text-xs text-gray-500 text-right shrink-0">
                                    {t.cs_staff_count.replace('{n}', String(s.employees))}
                                  </span>
                                  <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                </button>
                              </li>
                            ))}
                          </ul>
                          {semanasGuardadas.length > 6 && (
                            <button
                              onClick={() => setVerTodasGuardadas(v => !v)}
                              className="mt-3 text-sm font-medium text-park-700 hover:text-park-900"
                            >
                              {verTodasGuardadas ? t.cs_show_less : t.cs_show_all.replace('{n}', String(semanasGuardadas.length))}
                            </button>
                          )}
                        </>
                      )}
                    </section>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-32">
                  <div className="relative w-64 h-64 mb-8">
                    <div className="absolute inset-0 border-4 border-park-100 rounded-full"></div>
                    <div
                      className="absolute inset-0 border-4 border-park-600 rounded-full border-t-transparent animate-spin"
                      style={{ animationDuration: '1s' }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-4xl font-bold text-park-600">{progress}%</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2 animate-pulse">{loadingText}</h3>
                </div>
              )}

              {schedule && (
                <div className="animate-in slide-in-from-bottom-8 duration-700">
                  <div className="flex flex-col sm:flex-row justify-between items-end mb-4 gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{t.planning}: {getWeekRangeText()}</h2>
                      <p className="text-gray-500 text-sm">
                        {t.click_to_edit}
                      </p>
                    </div>
                    <button
                      onClick={handleDiscardAndRegenerate}
                      className="text-sm text-gray-500 hover:text-red-600 underline"
                    >
                      {t.discard_regenerate}
                    </button>
                  </div>

                  {/* ========================================================================================= */}
                  {/* 🚀 LAYOUT FLEX PARA TER O DASHBOARD LADO A LADO */}
                  {/* ========================================================================================= */}
                  <div className="flex flex-col 2xl:flex-row gap-6 items-start">

                    {/* --- TABELA DE HORÁRIOS (ESQUERDA) --- */}
                    <div className="flex-1 w-full min-w-0 bg-white border border-gray-300 shadow-xl overflow-hidden rounded-lg relative select-none">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center border-collapse">
                          <thead>
                            <tr className="bg-gray-800 text-white">
                              <th className="p-3 border-r border-gray-600 w-32 sticky left-0 bg-gray-800 z-10 font-semibold">{t.schedule_header}</th>
                              {WEEK_DAYS.map((day, idx) => {
                                const currentColumnDate = new Date(selectedDate);
                                currentColumnDate.setDate(currentColumnDate.getDate() + idx);
                                const dateStr = currentColumnDate.toISOString().split('T')[0];
                                const dayReservations = reservations.filter(r => r.date === dateStr);

                                return (
                                  <th key={day} className="p-3 border-r border-gray-600 min-w-[130px] align-top">
                                    <div className="font-semibold text-base">{day}</div>
                                    <div className="text-[11px] font-normal text-gray-300 mt-0.5">
                                      {weekDates[idx]}
                                    </div>
                                    {dayReservations.length > 0 && (
                                      <div className="mt-2">
                                        <button
                                          onClick={() => toggleColumn(idx)}
                                          className="text-xs flex items-center gap-1 text-park-600 font-medium hover:text-park-800 bg-park-50 px-2 py-1 rounded w-full justify-center transition-colors"
                                        >
                                          {dayReservations.length} {t.events}
                                          {expandedCols.includes(idx) ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>}
                                        </button>
                                        {expandedCols.includes(idx) && (
                                          <div className="flex flex-col gap-1 mt-2 animate-in fade-in zoom-in-95 duration-200">
                                            {dayReservations.map(res => (
                                              <div
                                                key={res.id}
                                                className={`text-[10px] p-1 rounded border text-left leading-tight ${getEventColor(res.eventType)}`}
                                              >
                                                <div className="font-bold">{res.startTime}-{res.endTime}</div>
                                                <div>{res.people}p - {res.eventType}</div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {TIME_SLOTS.map((slot, idx) => (
                              <tr key={slot} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-park-50 transition-colors`}>
                                <td className="p-2 border-r border-gray-300 border-b border-gray-200 font-mono text-xs text-gray-600 font-medium sticky left-0 bg-inherit z-10">
                                  {slot}
                                </td>
                                {WEEK_DAYS.map(day => {
                                  const staffCodes = schedule[slot]?.[day] || [];
                                  const hasStaff = staffCodes.length > 0;
                                  const isSelected = selectedCells.some(c => c.slot === slot && c.day === day);

                                  return (
                                    <td
                                      key={day}
                                      onMouseDown={(e) => handleCellMouseDown(slot, day, e)}
                                      onMouseEnter={() => handleCellMouseEnter(slot, day)}
                                      onDoubleClick={() => abrirEdicao([{ slot, day }])}
                                      className={`p-1 border-r border-b border-gray-200 h-10 cursor-pointer select-none transition-colors relative group ${
                                        isSelected
                                          ? 'bg-park-200 ring-2 ring-inset ring-park-500'
                                          : hasStaff
                                          ? 'hover:bg-park-100'
                                          : 'bg-gray-50/50 hover:bg-park-100'
                                      }`}
                                    >
                                      {hasStaff ? (
                                        <div className="flex items-center justify-center gap-1">
                                          <span className="font-bold text-gray-800 text-xs tracking-wide block">
                                            {staffCodes.join('+')}
                                          </span>
                                          {!isSelected && (
                                            <PencilSquareIcon className="w-3 h-3 text-park-400 opacity-0 group-hover:opacity-100" />
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center h-full w-full">
                                            <span className="text-gray-300 text-xs">-</span>
                                            {!isSelected && (
                                              <PlusIcon className="w-3 h-3 text-park-400 opacity-0 group-hover:opacity-100 absolute" />
                                            )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* --- SIDEBAR DAS HORAS (DIREITA) --- */}
                    {/* DESIGN CLEAN ATUALIZADO */}
                    <div className="w-full 2xl:w-72 shrink-0">
                      <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 sticky top-24 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-park-50 rounded-lg">
                              <ClockIcon className="w-5 h-5 text-park-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-800 tracking-tight">{t.assigned_hours}</h3>
                          </div>
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded-md flex items-center gap-1">
                            <UserGroupIcon className="w-3 h-3"/> {employees.length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {employees.map(emp => {
                            const hours = stats[emp.id] || 0;
                            const progress = Math.min((hours / 40) * 100, 100);
                            let barColor = 'bg-park-500';
                            let textColor = 'text-gray-600';

                            if (hours > 40) {
                                barColor = 'bg-red-500';
                                textColor = 'text-red-600 font-bold';
                            }

                            return (
                              <div key={emp.id} className="group bg-white p-3 rounded-xl border border-gray-100 hover:border-park-200 hover:shadow-sm transition-all duration-200">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">{emp.code}</span>
                                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 rounded truncate max-w-[80px]">{emp.name.split(' ')[0]}</span>
                                    </div>
                                  </div>
                                  <span className={`text-xs ${textColor}`}>{hours}h</span>
                                </div>

                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out group-hover:opacity-90`}
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                  </div>

                  {editingCells.length > 0 && schedule && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-lg">
                              {editingCells.length === 1
                                ? t.edit_single_title.replace('{day}', editingCells[0].day).replace('{slot}', editingCells[0].slot)
                                : t.edit_selection_title.replace('{count}', editingCells.length.toString())
                              }
                            </h3>
                            <p className="text-xs text-gray-300">
                              {editingCells.length > 1 &&
                                editingCells.map((cell, idx) => (
                                  <span key={`${cell.slot}-${cell.day}`}>
                                    {cell.day} {cell.slot}{idx < editingCells.length - 1 ? ', ' : ''}
                                  </span>
                                ))
                              }
                            </p>
                          </div>
                          <button onClick={() => setEditingCells([])} className="hover:bg-gray-700 p-1 rounded-full">
                            <XMarkIcon className="w-6 h-6" />
                          </button>
                        </div>

                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">
                              {t.available_employees.replace('{count}', editingCells.length.toString())}
                            </p>
                            <div className="flex gap-2 mb-4 flex-wrap">
                              <button onClick={() => setEmployeesInMultipleCells([])} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200">
                                {t.clear_all}
                              </button>
                              <button onClick={() => {
                                  const commonStaff = editingCells.reduce((common, cell) => {
                                    const cellStaff = schedule[cell.slot]?.[cell.day] || [];
                                    return common.filter(code => cellStaff.includes(code));
                                  }, schedule[editingCells[0].slot]?.[editingCells[0].day] || []);
                                  setEmployeesInMultipleCells(commonStaff);
                                }} className="px-3 py-1 bg-park-100 text-park-700 rounded text-xs font-medium hover:bg-park-200">
                                {t.keep_common}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {employees.map(emp => {
                                // 🔥 LÓGICA DE BARRA VISUAL (MINI-TIMELINE)
                                const availabilityMap = editingCells.map(cell => {
                                    return checkSpecificSlotAvailability(emp, cell);
                                });

                                const totalSlots = availabilityMap.length;
                                const availableCount = availabilityMap.filter(Boolean).length;
                                const isFullyAvailable = availableCount === totalSlots;
                                const isUnavailable = availableCount === 0;

                                if (isUnavailable) return null;

                                const isInAllCells = editingCells.every(cell => schedule[cell.slot]?.[cell.day]?.includes(emp.code));
                                const isInSomeCells = editingCells.some(cell => schedule[cell.slot]?.[cell.day]?.includes(emp.code));

                                let buttonStyle = 'bg-white border-gray-200 hover:border-park-300 hover:bg-gray-50';
                                if (isInAllCells) { buttonStyle = 'bg-park-50 border-park-500 ring-2 ring-park-500'; }
                                else if (isInSomeCells) { buttonStyle = 'bg-park-50 border-park-300 ring-1 ring-park-300'; }

                                // Texto descritivo da disponibilidade
                                let timeRangeText = "";
                                if (!isFullyAvailable) {
                                    const firstAvailableIdx = availabilityMap.indexOf(true);
                                    const lastAvailableIdx = availabilityMap.lastIndexOf(true);
                                    if (firstAvailableIdx !== -1) {
                                        const start = editingCells[firstAvailableIdx].slot.split(' - ')[0];
                                        const end = editingCells[lastAvailableIdx].slot.split(' - ')[1];
                                        timeRangeText = `${start} - ${end}`;
                                    }
                                }

                                return (
                                  <button key={emp.id} onClick={() => toggleEmployeeInMultipleCells(emp.code)} className={`flex flex-col p-2 rounded-lg border transition-all ${buttonStyle}`}>

                                    {/* Cabeçalho do Card */}
                                    <div className="flex justify-between items-center w-full mb-1">
                                      <div className="text-left">
                                          <div className={`font-bold text-sm ${isInAllCells ? 'text-park-700' : isInSomeCells ? 'text-park-600' : 'text-gray-700'}`}>
                                              {emp.code}
                                          </div>
                                          <div className="text-[10px] text-gray-500 truncate w-20">{emp.name}</div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                          {isInAllCells ? <CheckCircleIcon className="w-5 h-5 text-park-600" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                                      </div>
                                    </div>

                                    {/* 🔥 BARRA VISUAL DE DISPONIBILIDADE */}
                                    <div className="w-full flex gap-0.5 h-1.5 mt-1 rounded overflow-hidden bg-gray-100">
                                        {availabilityMap.map((isAvail, idx) => (
                                            <div key={idx} className={`flex-1 ${isAvail ? 'bg-green-500' : 'bg-red-300 opacity-50'}`} />
                                        ))}
                                    </div>

                                    {/* Texto de disponibilidade parcial */}
                                    {!isFullyAvailable && (
                                        <div className="text-[9px] text-amber-600 font-bold mt-1 w-full text-left flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3" />
                                            Disp: {timeRangeText}
                                        </div>
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                          <span className="text-sm text-gray-500">{t.cells_selected.replace('{count}', selectedCells.length.toString())}</span>
                          <button onClick={() => setEditingCells([])} className="px-4 py-2 bg-park-600 text-white rounded-lg hover:bg-park-700 text-sm font-medium shadow-sm">
                            {t.finish_editing}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    );
  }