'use client'
import React, { useState, useEffect } from 'react';
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
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

// ✅ MOCK DO LINK
const Link = ({ href, children, className }: { href: string, children: React.ReactNode, className?: string }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

// --- TIPOS ---
type UnavailableWeekday = { day: number; start: string; end: string }
type UnavailableSlot = { date: string; type: 'unavailable'; allDay?: boolean; startTime?: string; endTime?: string }

type Employee = {
  id: string
  name: string
  code: string
  role: 'admin' | 'employee'
  unavailable?: {
    weekdays: UnavailableWeekday[]
    specificDates: UnavailableSlot[]
  }
}

type Reservation = {
  id: string
  date: string
  startTime: string
  endTime: string
  people: number
}

// --- CONFIGURAÇÃO ---
const TIME_SLOTS = [
  '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30',
  '11:30 - 12:00', '12:00 - 12:30', '12:30 - 13:00', '13:00 - 13:30',
  '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30',
  '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00', '17:00 - 17:30',
  '17:30 - 18:00', '18:00 - 18:30', '18:30 - 19:00', '19:00 - 19:30',
  '19:30 - 20:00'
];

const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const STORE_OPEN_MIN = 9 * 60 + 30; 
const STORE_CLOSE_MIN = 20 * 60; 
const MAX_DAILY_HOURS = 6; 
const MIN_SHIFT_SLOTS = 4; 
const MAX_SHIFT_SLOTS = 12; 

export default function GeradorHorariosPage() {
  // --- ESTADOS ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSheetJSLoaded, setIsSheetJSLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const day = today.getDay(); 
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [schedule, setSchedule] = useState<Record<string, Record<string, string[]>> | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [weekDates, setWeekDates] = useState<string[]>([]);

  // Estados para o Modal de Edição Multipla
  const [editingCells, setEditingCells] = useState<{slot: string, day: string}[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<{slot: string, day: string}[]>([]);

  // --- VERIFICAÇÃO DE AUTENTICAÇÃO ---
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
          // Fallback para desenvolvimento - assumir que é admin
          setCurrentUser({
            id: '4',
            name: 'Tiago Ribeiro',
            code: 'TR',
            role: 'admin',
            unavailable: { weekdays: [], specificDates: [] }
          });
        }
      } catch (error) {
        console.warn('Erro na verificação de auth, usando fallback:', error);
        // Fallback para desenvolvimento
        setCurrentUser({
          id: '4',
          name: 'Tiago Ribeiro',
          code: 'TR',
          role: 'admin',
          unavailable: { weekdays: [], specificDates: [] }
        });
      }
    };

    checkAuth();
  }, []);

  // --- CARREGAMENTO DE SCRIPT EXCEL ---
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

  // --- 1. CARREGAR DADOS ---
  useEffect(() => {
    const fetchData = async () => {
      // Só carrega dados se o usuário for admin
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
                const isBoss = emp.name.toLowerCase().includes('jose marques') || emp.name.toLowerCase().includes('josé marques');
                if (emp.code === 'TR') return true; 
                const isAdmin = emp.role === 'admin';
                return !isAdmin && !isBoss;
              });
              loadedEmployees = filteredData.map((emp: any) => ({
                  ...emp,
                  code: emp.code || getInitials(emp.name)
              }));
            }
        } catch (e) {
            console.warn("API employees offline.");
            loadedEmployees = [
                { id: '1', name: 'Nuno Matias', code: 'NR', role: 'employee', unavailable: { weekdays: [{day: 2, start: '', end: ''}, {day: 0, start: '', end: ''}], specificDates: [] } },
                { id: '2', name: 'Helena Nogueira', code: 'HN', role: 'employee', unavailable: { weekdays: [{day: 1, start: '', end: ''}], specificDates: [] } },
                { id: '3', name: 'Dinis Oliveira', code: 'DO', role: 'employee', unavailable: { weekdays: [], specificDates: [] } },
                { id: '4', name: 'Tiago Ribeiro', code: 'TR', role: 'admin', unavailable: { weekdays: [{day: 3, start: '', end: ''}, {day: 4, start: '', end: ''}], specificDates: [] } },
                { id: '5', name: 'Matilde Osório', code: 'MO', role: 'employee', unavailable: { weekdays: [{day: 5, start: '', end: ''}], specificDates: [] } },
                { id: '6', name: 'João Maria', code: 'JMM', role: 'employee', unavailable: { weekdays: [{day: 1, start: '', end: ''}, {day: 2, start: '', end: ''}], specificDates: [] } },
                { id: '7', name: 'Inês Paquete', code: 'IQ', role: 'employee', unavailable: { weekdays: [{day: 0, start: '', end: ''}], specificDates: [] } },
                { id: '8', name: 'Miguel Santos', code: 'MS', role: 'employee', unavailable: { weekdays: [], specificDates: [] } },
                { id: '9', name: 'Beatriz Pinto', code: 'BP', role: 'employee', unavailable: { weekdays: [], specificDates: [] } },
            ];
        }
        setEmployees(loadedEmployees);

        let loadedReservations: Reservation[] = [];
        try {
            const resRes = await fetch('/api/reservations');
            if (resRes.ok) {
                loadedReservations = await resRes.json();
            }
        } catch (e) {
            const today = new Date();
            const monday = new Date(today);
            const day = monday.getDay();
            const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
            monday.setDate(diff);
            const getDate = (daysAdd: number) => {
                const d = new Date(monday);
                d.setDate(monday.getDate() + daysAdd);
                return d.toISOString().split('T')[0];
            };
            loadedReservations = [
                { id: '1', date: getDate(0), startTime: '10:00', endTime: '13:00', people: 12 },
                { id: '2', date: getDate(1), startTime: '15:00', endTime: '18:00', people: 40 },
                { id: '3', date: getDate(3), startTime: '18:00', endTime: '20:00', people: 20 }, 
                { id: '4', date: getDate(4), startTime: '14:00', endTime: '17:00', people: 8 }, 
                { id: '5', date: getDate(4), startTime: '18:00', endTime: '20:00', people: 25 }, 
            ];
        }
        setReservations(loadedReservations);

      } catch (error) {
        console.error("Erro fatal", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const timeToMin = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  useEffect(() => {
    if (!selectedDate) return;
    const start = new Date(selectedDate);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      dates.push(`${day}/${month}`);
    }
    setWeekDates(dates);
  }, [selectedDate]);

  const getWeekRangeText = () => {
    if (weekDates.length === 0) return "";
    return `Semana de ${weekDates[0]} a ${weekDates[6]}`;
  }

  // --- FUNÇÕES DE SELEÇÃO MÚLTIPLA ---
  const toggleCellSelection = (slot: string, day: string) => {
    if (!isMultiSelectMode) return;
    
    const cellKey = `${slot}-${day}`;
    setSelectedCells(prev => {
      const exists = prev.find(c => `${c.slot}-${c.day}` === cellKey);
      if (exists) {
        return prev.filter(c => `${c.slot}-${c.day}` !== cellKey);
      } else {
        return [...prev, { slot, day }];
      }
    });
  };

  const startMultiSelect = () => {
    setIsMultiSelectMode(true);
    setSelectedCells([]);
  };

  const cancelMultiSelect = () => {
    setIsMultiSelectMode(false);
    setSelectedCells([]);
  };

  const openMultiEditModal = () => {
    if (selectedCells.length === 0) {
      alert('Selecione pelo menos uma célula para editar.');
      return;
    }
    setEditingCells(selectedCells);
    setIsMultiSelectMode(false);
    setSelectedCells([]);
  };

  // --- FUNÇÕES DE EDIÇÃO ---
  const toggleEmployeeInMultipleCells = (code: string) => {
    if (!schedule || editingCells.length === 0) return;

    const newSchedule = { ...schedule };
    const empId = employees.find(e => e.code === code)?.id;

    // Verificar se o funcionário está presente em TODAS as células selecionadas
    const isInAllCells = editingCells.every(cell => 
      newSchedule[cell.slot][cell.day].includes(code)
    );

    editingCells.forEach(cell => {
      const currentStaff = [...newSchedule[cell.slot][cell.day]];
      
      if (isInAllCells) {
        // Remover de todas as células
        newSchedule[cell.slot][cell.day] = currentStaff.filter(c => c !== code).sort();
        if (empId) updateStats(empId, -0.5 * editingCells.length);
      } else {
        // Adicionar a todas as células onde não está presente
        if (!currentStaff.includes(code)) {
          newSchedule[cell.slot][cell.day] = [...currentStaff, code].sort();
          if (empId) updateStats(empId, 0.5);
        }
      }
    });

    setSchedule(newSchedule);
  };

  const setEmployeesInMultipleCells = (codes: string[]) => {
    if (!schedule || editingCells.length === 0) return;

    const newSchedule = { ...schedule };
    
    // Calcular diferença nas horas para estatísticas
    let totalHoursChange = 0;
    editingCells.forEach(cell => {
      const oldStaff = newSchedule[cell.slot][cell.day];
      const newStaff = [...codes].sort();
      
      // Calcular diferença
      const added = newStaff.filter(code => !oldStaff.includes(code));
      const removed = oldStaff.filter(code => !newStaff.includes(code));
      
      totalHoursChange += (added.length - removed.length) * 0.5;
      
      newSchedule[cell.slot][cell.day] = newStaff;
    });

    // Atualizar estatísticas de forma justa
    if (totalHoursChange !== 0) {
      const affectedEmps = employees.filter(emp => 
        codes.includes(emp.code) || 
        editingCells.some(cell => schedule[cell.slot][cell.day].includes(emp.code))
      );
      
      if (affectedEmps.length > 0) {
        const changePerEmp = totalHoursChange / affectedEmps.length;
        affectedEmps.forEach(emp => {
          updateStats(emp.id, changePerEmp);
        });
      }
    }

    setSchedule(newSchedule);
  };

  const updateStats = (empId: string, delta: number) => {
    setStats(prev => ({
      ...prev,
      [empId]: Math.max(0, (prev[empId] || 0) + delta)
    }));
  };

  // --- EXPORTAR EXCEL ---
  const handleExportExcel = () => {
    if (!schedule || !(window as any).XLSX) return;
    const XLSX = (window as any).XLSX;
    const headers = ["Horário", ...WEEK_DAYS.map((day, i) => `${day} (${weekDates[i]})`)];
    const dataRows = TIME_SLOTS.map(slot => {
      const row = [slot];
      WEEK_DAYS.forEach(day => {
        const staff = schedule[slot][day] || [];
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Horário");
    const fileName = `Horario_${weekDates[0].replace('/','-')}_a_${weekDates[6].replace('/','-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // --- ALGORITMO JUSTO ---
  const handleGenerate = () => {
    if (employees.length === 0) return alert("Sem funcionários válidos.");
    setIsGenerating(true);
    setSchedule(null);
    setProgress(0);

    const steps = [
      { pct: 10, txt: 'A calcular procura...' },
      { pct: 30, txt: 'A construir camadas de turnos...' },
      { pct: 60, txt: 'A otimizar blocos sólidos...' },
      { pct: 90, txt: 'A preencher equipas...' },
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
  };

  const runAlgorithm = () => {
    const newSchedule: Record<string, Record<string, string[]>> = {};
    TIME_SLOTS.forEach(slot => {
      newSchedule[slot] = {};
      WEEK_DAYS.forEach(day => newSchedule[slot][day] = []);
    });

    // Sistema justo - todos começam com 0 horas
    const employeeHours: Record<string, number> = {};
    employees.forEach(emp => employeeHours[emp.id] = 0);

    const startOfWeek = new Date(selectedDate);

    // 1. MAPA DE PROCURA
    const demandMap: Record<string, number[]> = {};

    WEEK_DAYS.forEach((_, dayIdx) => {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + dayIdx);
        const dateString = currentDate.toISOString().split('T')[0];
        demandMap[dateString] = new Array(TIME_SLOTS.length).fill(0);

        const daysReservations = reservations.filter(r => r.date === dateString);
        const isWeekend = dayIdx === 5 || dayIdx === 6; 

        if (isWeekend) {
            TIME_SLOTS.forEach((slot, i) => {
                const [sStart] = slot.split(' - ');
                const slotStartMin = timeToMin(sStart);
                if (slotStartMin >= STORE_OPEN_MIN && slotStartMin < STORE_CLOSE_MIN) {
                    demandMap[dateString][i] = 3;
                }
            });
        }

        daysReservations.forEach(res => {
            const rawStart = timeToMin(res.startTime) - 60; 
            const rawEnd = timeToMin(res.endTime) + 60;     
            let staffNeeded = 2;
            if (res.people > 10) staffNeeded = 3;
            if (res.people > 20) staffNeeded = 5;
            if (res.people > 30) staffNeeded = 7;
            TIME_SLOTS.forEach((slot, i) => {
                const [sStart, sEnd] = slot.split(' - ');
                const slotStartMin = timeToMin(sStart);
                const slotEndMin = timeToMin(sEnd);
                if (slotStartMin < rawEnd && slotEndMin > rawStart) {
                    demandMap[dateString][i] = Math.max(demandMap[dateString][i], staffNeeded);
                }
            });
        });

        for (let i = 0; i < TIME_SLOTS.length; i++) {
            let d = demandMap[dateString][i];
            if (d > 0 && d < 2) demandMap[dateString][i] = 2;
        }
        for (let i = 1; i < TIME_SLOTS.length - 1; i++) {
            const prev = demandMap[dateString][i-1];
            const curr = demandMap[dateString][i];
            const next = demandMap[dateString][i+1];
            if (prev > 0 && next > 0 && curr < Math.min(prev, next)) {
                demandMap[dateString][i] = Math.min(prev, next);
            }
        }
    });

    // 2. ATRIBUIÇÃO JUSTA
    WEEK_DAYS.forEach((dayName, dayIdx) => {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + dayIdx);
        const dateString = currentDate.toISOString().split('T')[0];
        const jsDay = (dayIdx + 1) % 7;
        const demandArr = demandMap[dateString];
        const maxDemand = Math.max(...demandArr);
        
        const dailyHours: Record<string, number> = {};
        employees.forEach(emp => dailyHours[emp.id] = 0);
        const assignedInSlot = new Array(TIME_SLOTS.length).fill(0);

        for (let level = 1; level <= maxDemand; level++) {
            let inShift = false;
            let startIdx = -1;
            const shiftRequests: {start: number, end: number}[] = [];
            
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

                if (duration < MIN_SHIFT_SLOTS) {
                    const missing = MIN_SHIFT_SLOTS - duration;
                    currentStart = Math.max(0, currentStart - Math.floor(missing / 2));
                    currentEnd = Math.min(TIME_SLOTS.length, currentStart + MIN_SHIFT_SLOTS);
                    if (currentEnd - currentStart < MIN_SHIFT_SLOTS) {
                         currentStart = Math.max(0, currentEnd - MIN_SHIFT_SLOTS);
                    }
                    duration = currentEnd - currentStart;
                }

                const shiftsToFill: {s: number, e: number}[] = [];
                if (duration > MAX_SHIFT_SLOTS) {
                    const midPoint = currentStart + Math.floor(duration / 2);
                    shiftsToFill.push({ s: currentStart, e: midPoint });
                    shiftsToFill.push({ s: midPoint, e: currentEnd });
                } else {
                    shiftsToFill.push({ s: currentStart, e: currentEnd });
                }

                shiftsToFill.forEach(shift => {
                    const [tStartStr] = TIME_SLOTS[shift.s].split(' - ');
                    const shiftStartMin = timeToMin(tStartStr);
                    const endSlotIdx = Math.min(shift.e - 1, TIME_SLOTS.length - 1);
                    const [_, tEndStr] = TIME_SLOTS[endSlotIdx].split(' - ');
                    const shiftEndMin = timeToMin(tEndStr);

                    const candidates = employees.filter(emp => {
                        if (emp.role === 'admin' && emp.code !== 'TR') return false;
                        if (dailyHours[emp.id] > 0) return false;
                        if (!emp.unavailable) return true;
                        const specific = emp.unavailable.specificDates?.find(s => s.date === dateString);
                        if (specific) {
                            if (specific.allDay) return false;
                            if (specific.startTime && specific.endTime) {
                                const uStart = timeToMin(specific.startTime);
                                const uEnd = timeToMin(specific.endTime);
                                if (shiftStartMin < uEnd && shiftEndMin > uStart) return false;
                            }
                        }
                        const weekdayUn = emp.unavailable.weekdays?.find(w => w.day === jsDay);
                        if (weekdayUn) {
                            if (weekdayUn.start && weekdayUn.end) {
                                const wStart = timeToMin(weekdayUn.start);
                                const wEnd = timeToMin(weekdayUn.end);
                                if (shiftStartMin < wEnd && shiftEndMin > wStart) return false;
                            } else { return false; }
                        }
                        return true;
                    });

                    // ALGORITMO JUSTO: ordena por horas totais e aleatoriedade
                    candidates.sort((a, b) => {
                        const hoursA = employeeHours[a.id];
                        const hoursB = employeeHours[b.id];
                        if (Math.abs(hoursA - hoursB) > 2) return hoursA - hoursB;
                        return 0.5 - Math.random();
                    });

                    if (candidates.length > 0) {
                        const worker = candidates[0];
                        for (let k = shift.s; k < shift.e; k++) {
                            newSchedule[TIME_SLOTS[k]][dayName].push(worker.code);
                            assignedInSlot[k]++;
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
            newSchedule[slot][day].sort();
        });
    });

    setStats(employeeHours);
    setSchedule(newSchedule);
    setIsGenerating(false);
  };

  // --- PÁGINA DE ACESSO NEGADO ---
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldExclamationIcon className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600 mb-6">
            Esta área é reservada apenas para administradores. 
            Você não tem permissão para acessar o gerador de horários.
          </p>
          <Link 
            href="/portal"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Voltar ao Portal
          </Link>
        </div>
      </div>
    );
  }

  // --- RENDER PRINCIPAL (apenas para admins) ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/portal" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-pink-500" />
              Gerador de Horários
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Área Administrativa • {currentUser?.name} ({currentUser?.code})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {schedule && !isMultiSelectMode && (
            <button 
              onClick={startMultiSelect}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Squares2X2Icon className="w-4 h-4" /> 
              <span className="hidden sm:inline">Seleção Múltipla</span>
            </button>
          )}
          {schedule && isMultiSelectMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedCells.length} célula(s) selecionada(s)
              </span>
              <button 
                onClick={openMultiEditModal}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
              >
                <PencilSquareIcon className="w-4 h-4" /> 
                Editar Seleção
              </button>
              <button 
                onClick={cancelMultiSelect}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors shadow-sm"
              >
                <XMarkIcon className="w-4 h-4" /> 
                Cancelar
              </button>
            </div>
          )}
          {schedule && !isMultiSelectMode && (
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> 
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          )}
        </div>
      </div>

      <main className="max-w-[95rem] mx-auto p-4 sm:p-6 relative">
        {loadingData && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">A carregar dados...</p>
          </div>
        )}

        {!loadingData && (
          <>
            {!schedule && !isGenerating && (
              <div className="max-w-2xl mx-auto mt-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center">
                <div className="bg-pink-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ArrowPathIcon className="w-10 h-10 text-pink-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Gerar Escala Semanal</h2>
                <p className="text-gray-500 mb-8">
                  Geração automática + Edição Manual.<br/>
                  Distribuição justa de horas entre todos os funcionários.
                </p>
                <div className="bg-gray-50 p-5 rounded-xl mb-8 inline-block text-left w-full max-w-md border border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Escolha a Semana (Segunda-feira):</label>
                  <div className="relative">
                    <CalendarDaysIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        const day = date.getDay();
                        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                        const monday = new Date(date.setDate(diff));
                        setSelectedDate(monday.toISOString().split('T')[0]);
                      }}
                      className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-shadow font-medium text-gray-700"
                    />
                  </div>
                  <div className="mt-3 text-sm text-pink-600 font-medium flex items-center gap-1">
                    <CheckCircleIcon className="w-4 h-4" />
                    {getWeekRangeText()}
                  </div>
                </div>
                <button 
                  onClick={handleGenerate}
                  className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3"
                >
                  <SparklesIcon className="w-6 h-6" />
                  Gerar Horário Agora
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="relative w-64 h-64 mb-8">
                  <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                  <div 
                    className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin"
                    style={{ animationDuration: '1s' }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-4xl font-bold text-pink-600">{progress}%</span>
                  </div>
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-2 animate-pulse">{loadingText}</h3>
              </div>
            )}

            {schedule && (
              <div className="animate-in slide-in-from-bottom-8 duration-700">
                <div className="flex flex-col sm:flex-row justify-between items-end mb-4 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Planeamento: {getWeekRangeText()}</h2>
                    <p className="text-gray-500 text-sm">
                      {isMultiSelectMode 
                        ? "Modo seleção múltipla ativo - clique nas células para selecionar" 
                        : "Clique em qualquer célula para editar manualmente."}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSchedule(null)} 
                    className="text-sm text-gray-500 hover:text-red-600 underline"
                  >
                    Descartar e Gerar Novamente
                  </button>
                </div>

                <div className="bg-white border border-gray-300 shadow-xl overflow-hidden rounded-lg relative">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center border-collapse">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="p-3 border-r border-gray-600 w-32 sticky left-0 bg-gray-800 z-10 font-semibold">Horário</th>
                          {WEEK_DAYS.map((day, idx) => (
                            <th key={day} className="p-3 border-r border-gray-600 min-w-[130px]">
                              <div className="font-semibold text-base">{day}</div>
                              <div className="text-[11px] font-normal text-gray-300 mt-0.5">
                                {weekDates[idx]}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TIME_SLOTS.map((slot, idx) => (
                          <tr key={slot} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                            <td className="p-2 border-r border-gray-300 border-b border-gray-200 font-mono text-xs text-gray-600 font-medium sticky left-0 bg-inherit z-10">
                              {slot}
                            </td>
                            {WEEK_DAYS.map(day => {
                              const staffCodes = schedule[slot][day];
                              const hasStaff = staffCodes.length > 0;
                              const isSelected = selectedCells.some(c => c.slot === slot && c.day === day);
                              
                              return (
                                <td 
                                  key={day} 
                                  onClick={() => {
                                    if (isMultiSelectMode) {
                                      toggleCellSelection(slot, day);
                                    } else {
                                      setEditingCells([{ slot, day }]);
                                    }
                                  }}
                                  className={`p-1 border-r border-b border-gray-200 h-10 cursor-pointer transition-colors relative group ${
                                    isSelected 
                                      ? 'bg-blue-200 ring-2 ring-blue-500' 
                                      : hasStaff 
                                        ? '' 
                                        : 'bg-gray-50/50'
                                  } ${!isMultiSelectMode ? 'hover:bg-blue-100' : ''}`}
                                >
                                  {hasStaff ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="font-bold text-gray-800 text-xs tracking-wide block">
                                        {staffCodes.join('+')}
                                      </span>
                                      {!isMultiSelectMode && (
                                        <PencilSquareIcon className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100" />
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-full w-full">
                                       <span className="text-gray-300 text-xs">-</span>
                                       {!isMultiSelectMode && (
                                         <PlusIcon className="w-3 h-3 text-green-400 opacity-0 group-hover:opacity-100 absolute" />
                                       )}
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
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

                {/* MODAL DE EDIÇÃO MÚLTIPLA */}
                {editingCells.length > 0 && schedule && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg">
                            {editingCells.length === 1 
                              ? `Editar ${editingCells[0].day} - ${editingCells[0].slot}`
                              : `Editar ${editingCells.length} Células Selecionadas`
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
                            Funcionários disponíveis ({editingCells.length} célula(s) selecionada(s))
                          </p>
                          
                          {/* Ações em lote */}
                          <div className="flex gap-2 mb-4 flex-wrap">
                            <button
                              onClick={() => setEmployeesInMultipleCells([])}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                            >
                              Limpar Todas
                            </button>
                            <button
                              onClick={() => {
                                const commonStaff = editingCells.reduce((common, cell) => {
                                  const cellStaff = schedule[cell.slot][cell.day];
                                  return common.filter(code => cellStaff.includes(code));
                                }, schedule[editingCells[0].slot][editingCells[0].day]);
                                setEmployeesInMultipleCells(commonStaff);
                              }}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                            >
                              Manter Apenas Comuns
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {employees
                            .filter(e => e.role !== 'admin' || e.code === 'TR')
                            .map(emp => {
                              // Verificar se o funcionário está presente em TODAS as células selecionadas
                              const isInAllCells = editingCells.every(cell => 
                                schedule[cell.slot][cell.day].includes(emp.code)
                              );
                              
                              // Verificar se está em pelo menos uma
                              const isInSomeCells = editingCells.some(cell =>
                                schedule[cell.slot][cell.day].includes(emp.code)
                              );

                              let buttonStyle = 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50';
                              if (isInAllCells) {
                                buttonStyle = 'bg-blue-50 border-blue-500 ring-2 ring-blue-500';
                              } else if (isInSomeCells) {
                                buttonStyle = 'bg-blue-50 border-blue-300 ring-1 ring-blue-300';
                              }

                              return (
                                <button
                                  key={emp.id}
                                  onClick={() => toggleEmployeeInMultipleCells(emp.code)}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${buttonStyle}`}
                                >
                                  <div className="text-left">
                                    <div className={`font-bold text-sm ${
                                      isInAllCells ? 'text-blue-700' : 
                                      isInSomeCells ? 'text-blue-600' : 'text-gray-700'
                                    }`}>
                                      {emp.code}
                                    </div>
                                    <div className="text-[10px] text-gray-500 truncate w-24">{emp.name}</div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isInSomeCells && !isInAllCells && (
                                      <span className="text-[10px] text-blue-500 font-medium">algumas</span>
                                    )}
                                    {isInAllCells ? (
                                      <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                        </div>

                        {/* Visualização das células selecionadas */}
                        {editingCells.length > 1 && (
                          <div className="mt-6 border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Pré-visualização das Células:</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                              {editingCells.map((cell, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                  <span>{cell.day} {cell.slot}</span>
                                  <span className="font-mono bg-white px-2 py-1 rounded">
                                    {schedule[cell.slot][cell.day].join('+') || '-'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {editingCells.length} célula(s) selecionada(s)
                        </span>
                        <button 
                          onClick={() => setEditingCells([])}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm"
                        >
                          Concluir Edição
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Estatísticas */}
                <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Horas Atribuídas (Atualizado em Tempo Real)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {employees.map(emp => {
                      const hours = stats[emp.id] || 0;
                      let barColor = 'bg-blue-500';
                      let textColor = 'text-gray-900';
                      if (hours > 40) { barColor = 'bg-red-500'; textColor = 'text-red-600'; }
                      
                      return (
                        <div key={emp.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm" title={emp.name}>{emp.code}</span>
                            <span className={`text-xs font-bold ${textColor}`}>{hours}h</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full mb-1 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full ${barColor}`} 
                              style={{ width: `${Math.min((hours / 40) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">{emp.name}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}