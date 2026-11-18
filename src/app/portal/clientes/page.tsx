'use client'
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  MagnifyingGlassIcon, 
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface ClientData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  visitDate: string;
  eventType: string;
  checkInTime?: string; // Data de criação do registo
  totalVisits?: number;
}

export default function ClientesDatabase() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- NOVOS ESTADOS PARA PAGINAÇÃO ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // 10, 25, 50
  const [activeTab, setActiveTab] = useState<'database' | 'promoters'>('database');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (res.ok) {
        setClients(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- CÁLCULO DAS ESTATÍSTICAS (Memorizado para não pesar) ---
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    let count7d = 0;
    let count30d = 0;
    let count3m = 0;
    let count1y = 0;

    clients.forEach(c => {
        // Se não tiver checkInTime, usamos a visitDate como fallback
        const dateStr = c.checkInTime || c.visitDate; 
        const regDate = new Date(dateStr);

        if (regDate >= oneWeekAgo) count7d++;
        if (regDate >= oneMonthAgo) count30d++;
        if (regDate >= threeMonthsAgo) count3m++;
        if (regDate >= oneYearAgo) count1y++;
    });

    return { count7d, count30d, count3m, count1y };
  }, [clients]);

  // --- LÓGICA DE FILTRO E PAGINAÇÃO ---
  
  // 1. Filtrar primeiro (Pesquisa)
  const filteredClients = clients.filter(c => 
    c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  // 2. Calcular índices para paginação
  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // 3. Cortar a lista para mostrar só a página atual
  const currentClients = filteredClients.slice(startIndex, endIndex);

  // Função para mudar de página
  const changePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8">
            <Link href="/portal" className="inline-flex items-center text-sm text-park-600 hover:text-park-800 font-medium transition-colors mb-4">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar ao Portal
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <UserGroupIcon className="h-8 w-8 text-park-600" />
                    Base de Dados
                    </h1>
                    <p className="text-gray-500 mt-1">Gerir todos os registos de clientes.</p>
                </div>
            </div>
        </div>

            {/* TAB BUTTONS */}
            <div className="flex space-x-4 mb-6">
                <button
                    onClick={() => setActiveTab('database')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 
                    ${activeTab === 'database' 
                        ? 'border-park-600 text-park-700 bg-park-50/50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                   Base de Dados
                </button>
                <button
                    onClick={() => setActiveTab('promoters')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-2
                    ${activeTab === 'promoters' 
                        ? 'border-yellow-400 text-yellow-700 bg-yellow-50/50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                   <span className="text-lg">⭐</span> Top Clientes
                </button>
            </div>

        {/* --- CONTEÚDO: BASE DE DADOS --- */}
        {activeTab === 'database' && (
          <>
            {/* ESTATÍSTICAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Últimos 7 Dias</p>
                    <p className="text-2xl font-bold text-park-600 mt-1">+{stats.count7d}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Último Mês</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">+{stats.count30d}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">3 Meses</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">+{stats.count3m}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total (1 Ano)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.count1y}</p>
                </div>
            </div>
            
            {/* BARRA DE AÇÕES E TABELA (MANTIDO IGUAL MAS DENTRO DO TAB) */}
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                {/* Pesquisa */}
                <div className="relative w-full md:w-96">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                    <input 
                    type="text" 
                    placeholder="Pesquisar cliente..." 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} // Reset página ao pesquisar
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-park-500 text-sm"
                    />
                </div>
    
                {/* Seletor de Itens por Página */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Mostrar:</span>
                    <select 
                        value={itemsPerPage}
                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-park-500 outline-none bg-gray-50 font-bold"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span>por página</span>
                </div>
            </div>
    
            {/* TABELA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-500">A carregar dados...</div>
              ) : filteredClients.length === 0 ? (
                <div className="p-12 text-center text-gray-500">Nenhum registo encontrado.</div>
              ) : (
                <>
                    <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-4 font-bold">Nome</th>
                            <th className="px-6 py-4 font-bold">Contactos</th>
                            <th className="px-6 py-4 font-bold">Nascimento</th>
                            <th className="px-6 py-4 font-bold">Última Visita</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {currentClients.map((client, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{client.firstName} {client.lastName}</div>
                                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                                    <UserGroupIcon className="w-3 h-3" />
                                    {client.totalVisits || 1} Visitas
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-gray-900 text-sm">{client.email}</div>
                                <div className="text-gray-500 text-sm">{client.phone}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-600 text-sm">{client.dob}</td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-park-50 text-park-700 border border-park-100">
                                    <CalendarDaysIcon className="w-3 h-3 mr-1"/>
                                    {client.visitDate}
                                </span>
                                <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">{client.eventType}</div>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
    
                    {/* --- CONTROLES DE PAGINAÇÃO (RODAPÉ) --- */}
                    <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            A mostrar <span className="font-bold">{startIndex + 1}</span> a <span className="font-bold">{Math.min(endIndex, totalItems)}</span> de <span className="font-bold">{totalItems}</span> resultados
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => changePage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>
    
                            <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 shadow-sm">
                                Página {currentPage} de {totalPages}
                            </div>
    
                            <button 
                                onClick={() => changePage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </>
              )}
            </div>
          </>
        )}

        {/* --- CONTEÚDO: TOP PROMOTORES (NOVO) --- */}
        {activeTab === 'promoters' && <TopPromoters />}
      </div>
    </div>
  );
}

function TopPromoters() {
    const [promoters, setPromoters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/statistics/referrals')
            .then(res => res.json())
            .then(data => {
                setPromoters(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-park-600"></div>
      </div>
    );

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-park-900 to-park-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">Ranking de Clientes</h3>
                    <p className="text-park-100 max-w-xl text-lg">
                        Descubra quem são os clientes que trazem mais amigos. Este ranking baseia-se no número de pessoas únicas que cada cliente trouxe ao parque.
                    </p>
                </div>
                {/* Decorative background circle */}
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-50">
                    {promoters.map((p, idx) => {
                        // Logic for medals
                        let medal = null;
                        if (idx === 0) medal = <span className="text-3xl">🥇</span>;
                        if (idx === 1) medal = <span className="text-3xl">🥈</span>;
                        if (idx === 2) medal = <span className="text-3xl">🥉</span>;

                        return (
                            <div key={idx} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-all duration-200 group">
                                <div className="flex items-center gap-6">
                                    <div className="flex-shrink-0 w-12 text-center">
                                        {medal ? medal : (
                                            <span className="text-gray-400 font-bold text-lg">#{idx + 1}</span>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <h4 className={`text-lg font-bold ${idx < 3 ? 'text-gray-900' : 'text-gray-700'} group-hover:text-park-600 transition-colors`}>
                                            {p.name || 'Cliente Sem Nome'}
                                        </h4>
                                        <p className="text-xs text-gray-400 font-medium mt-1">
                                            {idx < 3 ? 'Top Cliente' : 'Cliente Frequente'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end">
                                    <span className="text-3xl font-black text-park-600 leading-none">
                                        {p.totalBrought}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-1">
                                        Pessoas Únicas
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {promoters.length === 0 && (
                        <div className="py-20 text-center">
                           <UserGroupIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                           <p className="text-gray-500 font-medium">Ainda não existem dados de referências.</p>
                           <p className="text-sm text-gray-400 mt-2">Os dados aparecerão aqui à medida que os clientes fizerem check-in.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}