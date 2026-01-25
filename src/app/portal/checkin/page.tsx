'use client'
import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code";
import Link from 'next/link';
import { 
  QrCodeIcon, 
  CheckBadgeIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  EyeIcon // <--- Ícone Novo
} from '@heroicons/react/24/outline';
import { Reservation as IReservation, EventType } from '@/types/reservation';

// Interface atualizada com a lista de clientes
interface CheckInReservation {
  _id: string; 
  eventType: EventType;
  datetime?: string;
  adults?: number;
  children?: number;
  customerName?: string;
  marketingSource?: string;
  date?: string;
  startTime?: string;
  people?: number;
  // Lista de quem já fez check-in
  clients?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }[];
}

export default function CheckInDashboard() {
  const [reservations, setReservations] = useState<CheckInReservation[]>([]);
  const [selectedRes, setSelectedRes] = useState<CheckInReservation | null>(null);
  
  // Estados dos Modais
  const [showQRModal, setShowQRModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false); // Novo Modal

  const [marketingSource, setMarketingSource] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; 
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    fetchReservationsByDate(selectedDate);
  }, [selectedDate]);

  const fetchReservationsByDate = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/date?date=${dateStr}`); 
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (error) {
      console.error("Erro ao buscar reservas", error);
    } finally {
      setLoading(false);
    }
  };

  const changeDay = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // --- LÓGICA DO QR CODE ---
  const handleSourceSubmit = async () => {
    if (!selectedRes || !marketingSource) return;
    try {
       const res = await fetch('/api/checkin/save-source', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id: selectedRes._id, source: marketingSource })
       });
       if (res.ok) {
           selectedRes.marketingSource = marketingSource;
           setShowQRModal(true); // Abre só o QR
       } else { alert("Erro ao gravar."); }
    } catch (err) { alert("Erro de conexão."); }
  };

  const openQRModal = (res: CheckInReservation) => {
    setSelectedRes(res);
    if (res.marketingSource) {
      setMarketingSource(res.marketingSource);
      setShowQRModal(true);
    } else {
      setMarketingSource("");
      setShowQRModal(false); // Fica na parte do input
    }
  };

  // --- LÓGICA DE VER CLIENTES ---
  const openClientsList = (res: CheckInReservation) => {
    setSelectedRes(res);
    setShowClientsModal(true);
  };

  const closeModal = () => {
    setShowQRModal(false);
    setShowClientsModal(false);
    setSelectedRes(null);
    setMarketingSource("");
  };

  // HELPERS
  const getDisplayTime = (res: CheckInReservation) => {
    if (res.startTime) return res.startTime; 
    if (res.datetime && res.datetime.includes('T')) {
        return res.datetime.split('T')[1].substring(0, 5); 
    }
    return "--:--";
  };

  const getTotalPeople = (res: CheckInReservation) => {
      const p = res.people || 0;
      const a = res.adults || 0;
      const c = res.children || 0;
      return Math.max(p, a + c);
  };

  const getDisplayName = (name?: string) => {
      if (!name) return "Cliente (Sem Nome)";
      if (/^\d+x/.test(name) || name.includes('Mask of') || name.includes('Mission')) {
          return "Cliente (Ver Detalhes)";
      }
      return name;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      <div className="max-w-5xl mx-auto mb-8">
        <div className="mb-6 flex justify-between items-center">
            <Link href="/portal" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar ao Portal
            </Link>
            <Link href="/portal/statistics" className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-200 transition-colors">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Ver Estatísticas
            </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckBadgeIcon className="w-8 h-8 text-teal-600" />
              Check-In
            </h1>
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button onClick={() => changeDay(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronLeftIcon className="w-5 h-5" /></button>
                <div className="relative flex items-center">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-400 absolute left-3 pointer-events-none" />
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-10 pr-4 py-2 bg-transparent font-bold text-gray-700 outline-none cursor-pointer"/>
                </div>
                <button onClick={() => changeDay(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronRightIcon className="w-5 h-5" /></button>
            </div>
        </div>
      </div>

      <div className="grid gap-4 max-w-5xl mx-auto">
        {loading ? (
            <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">A carregar reservas...</p>
            </div>
        ) : reservations.length === 0 ? (
          <div className="text-center p-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            Não há reservas para o dia <span className="font-bold text-gray-700">{selectedDate}</span>.
          </div>
        ) : (
            reservations.map((res) => (
            <div key={res._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-6 w-full">
                    <div className="bg-teal-50 p-3 rounded-full text-teal-700 font-bold text-xl min-w-[85px] text-center border border-teal-100">
                        {getDisplayTime(res)}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800">{getDisplayName(res.customerName)}</h3>
                        
                        {/* Indicador de inscritos */}
                        <div className="flex items-center gap-4 mt-2">
                             <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide
                                ${res.eventType === 'birthday' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {res.eventType || 'Evento'}
                            </span>
                            
                            {/* Mostra quantos já fizeram checkin */}
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                                <UserGroupIcon className="w-4 h-4"/> 
                                {res.clients?.length || 0} / {getTotalPeople(res)} Registados
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* BOTÃO VER LISTA DE CLIENTES */}
                    <button 
                        onClick={() => openClientsList(res)}
                        className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                        title="Ver Lista de Inscritos"
                    >
                        <EyeIcon className="w-5 h-5" />
                    </button>

                    {/* BOTÃO CHECK-IN / QR */}
                    <button 
                        onClick={() => openQRModal(res)}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm
                            ${res.marketingSource 
                                ? 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50' 
                                : 'bg-gray-900 hover:bg-gray-800 text-white'}`}
                    >
                        <QrCodeIcon className="w-5 h-5" />
                        {res.marketingSource ? 'Ver QR' : 'Check-in'}
                    </button>
                </div>
            </div>
            ))
        )}
      </div>

      {/* --- MODAL 1: QR CODE & MARKETING --- */}
      {selectedRes && !showClientsModal && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 ${selectedRes && !showClientsModal ? 'block' : 'hidden'}`}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
            <div className="mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">{getDisplayName(selectedRes.customerName)}</h2>
            </div>

            {!showQRModal ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">De onde ouviu falar do The Park?</label>
                  <input type="text" value={marketingSource} onChange={(e) => setMarketingSource(e.target.value)} placeholder="Ex: TikTok, Amigo..." className="w-full p-4 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50" autoFocus />
                </div>
                <button onClick={handleSourceSubmit} disabled={!marketingSource.trim()} className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 transition-all">
                  Confirmar e Gerar QR
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300">
                  <QRCode value={`${siteUrl}/checkin/cliente/${selectedRes._id}`} size={220} />
                </div>
                <p className="font-bold text-lg text-gray-900">Mostre ao cliente para registo.</p>
                <button onClick={closeModal} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium w-full">Concluído</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 2: LISTA DE CLIENTES --- */}
      {showClientsModal && selectedRes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
             <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl relative max-h-[80vh] overflow-y-auto">
                <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Inscritos</h2>
                <p className="text-gray-500 mb-6">Lista de pessoas que já preencheram o waiver.</p>

                {!selectedRes.clients || selectedRes.clients.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-2"/>
                        <p className="text-gray-500">Ainda ninguém se registou nesta reserva.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {selectedRes.clients.map((client, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div>
                                    <p className="font-bold text-gray-800">{client.firstName} {client.lastName}</p>
                                    <p className="text-sm text-gray-500">{client.email} • {client.phone}</p>
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                    Registado
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button onClick={closeModal} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">Fechar</button>
                </div>
             </div>
        </div>
      )}

    </div>
  );
}