'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline';

type StatItem = {
  name: string;
  count: number;
};

// Cores vibrantes para o gráfico
const COLORS = [
  '#8B5CF6', // Roxo (TikTok/Base)
  '#EC4899', // Rosa (Instagram)
  '#10B981', // Verde (Google)
  '#F59E0B', // Laranja
  '#3B82F6', // Azul
  '#EF4444', // Vermelho
  '#6366F1', // Indigo
  '#9CA3AF'  // Cinza (Outros)
];

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('all'); // 'today', '7d', '30d', '90d', '1y', 'all'

  useEffect(() => {
    fetchStats();
  }, [range]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/statistics?range=${range}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = stats.reduce((acc, curr) => acc + curr.count, 0);

  // --- Função para gerar o CSS do Gráfico Circular (Conic Gradient) ---
  const getPieChartStyle = () => {
    if (totalVotes === 0) return { background: '#E5E7EB' }; // Cinza se vazio

    let currentAngle = 0;
    const gradientParts = stats.map((item, index) => {
      const color = COLORS[index % COLORS.length];
      const percentage = (item.count / totalVotes) * 100;
      const start = currentAngle;
      const end = currentAngle + percentage;
      currentAngle = end;
      return `${color} ${start}% ${end}%`;
    });

    return { 
        background: `conic-gradient(${gradientParts.join(', ')})`,
        borderRadius: '50%'
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8">
          <Link href="/portal/checkin" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Voltar ao Check-in
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                    <ChartBarIcon className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Estatísticas</h1>
                    <p className="text-gray-500">Origem dos clientes (Marketing)</p>
                </div>
            </div>

            {/* SELETOR DE TEMPO */}
            <div className="bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 flex gap-1 overflow-x-auto">
                {[
                    { label: 'Hoje', val: 'today' },
                    { label: '7 Dias', val: '7d' },
                    { label: '30 Dias', val: '30d' },
                    { label: '3 Meses', val: '90d' },
                    { label: 'Ano', val: '1y' },
                    { label: 'Tudo', val: 'all' },
                ].map((opt) => (
                    <button
                        key={opt.val}
                        onClick={() => setRange(opt.val)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap
                            ${range === opt.val 
                                ? 'bg-purple-600 text-white shadow-md' 
                                : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>

        {/* CONTEÚDO */}
        {loading ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">A carregar dados...</p>
            </div>
        ) : stats.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">Sem dados para este período.</p>
                <p className="text-sm text-gray-400">Tente selecionar outro intervalo de tempo.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. GRÁFICO CIRCULAR & LEGENDA */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 w-full text-left">Distribuição</h3>
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                        {/* O Gráfico */}
                        <div className="relative w-64 h-64 shadow-inner" style={getPieChartStyle()}>
                            {/* Centro branco para fazer o efeito "Donut" (opcional, remove se quiseres tarte cheia) */}
                            <div className="absolute inset-0 m-auto w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-gray-800">{totalVotes}</span>
                                <span className="text-xs text-gray-500 uppercase font-bold">Total</span>
                            </div>
                        </div>

                        {/* Legenda */}
                        <div className="flex-1 space-y-3 w-full">
                            {stats.map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        ></div>
                                        <span className="font-medium text-gray-700">{item.name}</span>
                                    </div>
                                    <span className="text-gray-500">{((item.count / totalVotes) * 100).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. TOP LISTA (BARRAS) */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Top Canais</h3>
                    <div className="space-y-5">
                        {stats.map((item, index) => {
                            const percentage = ((item.count / totalVotes) * 100).toFixed(1);
                            const color = COLORS[index % COLORS.length];
                            
                            return (
                                <div key={item.name}>
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="font-bold text-gray-800 text-md flex items-center gap-2">
                                            <span className="text-gray-400 text-sm">#{index + 1}</span> 
                                            {item.name}
                                        </span>
                                        <span className="text-gray-600 font-medium">
                                            {item.count} <span className="text-xs text-gray-400">({percentage}%)</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="h-3 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${percentage}%`, backgroundColor: color }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        )}
      </div>
    </div>
  );
}