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
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

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
  const { language } = useLanguage();
  const t = translations[language];

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

  // "A mostrar {from} a {to} de {total} resultados" -> com os números a negrito
  const comNegrito = (texto: string, valores: Record<string, number>) =>
    texto.split(/\{(\w+)\}/).map((parte, i) =>
      i % 2 === 1 ? <span key={i} className="font-bold">{valores[parte]}</span> : parte
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <Link href="/portal" className="inline-flex items-center text-sm text-park-600 hover:text-park-800 font-medium transition-colors">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                {t.back_to_portal}
              </Link>
              <LanguageSwitcher />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <UserGroupIcon className="h-8 w-8 text-park-600" />
                    {t.database}
                    </h1>
                    <p className="text-gray-500 mt-1">{t.cl_subtitle}</p>
                </div>
            </div>
        </div>

            {/* TAB BUTTONS */}
            <div className="flex space-x-2 sm:space-x-4 mb-6">
                <button
                    onClick={() => setActiveTab('database')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2
                    ${activeTab === 'database'
                        ? 'border-park-600 text-park-700 bg-park-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                   {t.database}
                </button>
                <button
                    onClick={() => setActiveTab('promoters')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-2
                    ${activeTab === 'promoters'
                        ? 'border-yellow-400 text-yellow-700 bg-yellow-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                   <span className="text-lg">⭐</span> {t.cl_top_clients}
                </button>
            </div>

        {/* --- CONTEÚDO: BASE DE DADOS --- */}
        {activeTab === 'database' && (
          <>
            {/* ESTATÍSTICAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.cl_last_7_days}</p>
                    <p className="text-2xl font-bold text-park-600 mt-1">+{stats.count7d}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.cl_last_month}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">+{stats.count30d}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.cl_3_months}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">+{stats.count3m}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.cl_total_1_year}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.count1y}</p>
                </div>
            </div>

            {/* BARRA DE AÇÕES E TABELA */}
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                {/* Pesquisa */}
                <div className="relative w-full md:w-96">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                    <input
                    type="text"
                    placeholder={t.cl_search_placeholder}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} // Reset página ao pesquisar
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-park-500 text-sm"
                    />
                </div>

                {/* Seletor de Itens por Página */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{t.cl_show}</span>
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
                    <span>{t.cl_per_page}</span>
                </div>
            </div>

            {/* TABELA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-500">{t.loading_data}</div>
              ) : filteredClients.length === 0 ? (
                <div className="p-12 text-center text-gray-500">{t.cl_no_records}</div>
              ) : (
                <>
                    <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                        <tr>
                            <th className="px-4 sm:px-6 py-4 font-bold">{t.cl_col_name}</th>
                            <th className="px-4 sm:px-6 py-4 font-bold">{t.cl_col_contacts}</th>
                            <th className="px-4 sm:px-6 py-4 font-bold whitespace-nowrap">{t.cl_col_birth}</th>
                            <th className="px-4 sm:px-6 py-4 font-bold whitespace-nowrap">{t.cl_col_last_visit}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {currentClients.map((client, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 sm:px-6 py-4">
                                <div className="font-bold text-gray-900">{client.firstName} {client.lastName}</div>
                                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                                    <UserGroupIcon className="w-3 h-3" />
                                    {client.totalVisits || 1} {t.cl_visits}
                                </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                                <div className="text-gray-900 text-sm">{client.email}</div>
                                <div className="text-gray-500 text-sm">{client.phone}</div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-gray-600 text-sm whitespace-nowrap">{client.dob}</td>
                            <td className="px-4 sm:px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-park-50 text-park-700 border border-park-100 whitespace-nowrap">
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
                    <div className="bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-sm text-gray-500 text-center sm:text-left">
                          {comNegrito(t.cl_showing, { from: startIndex + 1, to: Math.min(endIndex, totalItems), total: totalItems })}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => changePage(currentPage - 1)}
                                disabled={currentPage === 1}
                                aria-label={t.cl_prev_page}
                                className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>

                            <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 shadow-sm whitespace-nowrap">
                                {t.cl_page_of.replace('{page}', String(currentPage)).replace('{pages}', String(totalPages))}
                            </div>

                            <button
                                onClick={() => changePage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                aria-label={t.cl_next_page}
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
    const { language } = useLanguage();
    const t = translations[language];
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
            <div className="bg-gradient-to-r from-park-900 to-park-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-xl sm:text-2xl font-bold mb-2">{t.cl_ranking_title}</h3>
                    <p className="text-park-100 max-w-xl text-base sm:text-lg">
                        {t.cl_ranking_desc}
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
                            <div key={idx} className="flex items-center justify-between gap-3 p-4 sm:p-6 hover:bg-gray-50 transition-all duration-200 group">
                                <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                                    <div className="flex-shrink-0 w-10 sm:w-12 text-center">
                                        {medal ? medal : (
                                            <span className="text-gray-400 font-bold text-lg">#{idx + 1}</span>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <h4 className={`text-base sm:text-lg font-bold truncate ${idx < 3 ? 'text-gray-900' : 'text-gray-700'} group-hover:text-park-600 transition-colors`}>
                                            {p.name || t.cl_unnamed_client}
                                        </h4>
                                        <p className="text-xs text-gray-400 font-medium mt-1">
                                            {idx < 3 ? t.cl_top_client : t.cl_frequent_client}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end shrink-0">
                                    <span className="text-2xl sm:text-3xl font-black text-park-600 leading-none">
                                        {p.totalBrought}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-1 text-right">
                                        {t.cl_unique_people}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {promoters.length === 0 && (
                        <div className="py-20 px-4 text-center">
                           <UserGroupIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                           <p className="text-gray-500 font-medium">{t.cl_no_referrals}</p>
                           <p className="text-sm text-gray-400 mt-2">{t.cl_no_referrals_hint}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
