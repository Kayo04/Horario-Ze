'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  MagnifyingGlassIcon, 
  UserGroupIcon,
  DocumentArrowDownIcon // Ícone para exportar (futuro)
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
}

export default function ClientesDatabase() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes com base na pesquisa
  const filteredClients = clients.filter(c => 
    c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/portal" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors mb-2">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar ao Portal
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserGroupIcon className="h-8 w-8 text-indigo-600" />
              Base de Dados de Clientes
            </h1>
            <p className="text-gray-500 mt-1">
              Total de registos: <span className="font-bold text-gray-900">{clients.length}</span>
            </p>
          </div>

          {/* BARRA DE PESQUISA */}
          <div className="relative w-full md:w-96">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, email ou telemóvel..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">A carregar clientes...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Nenhum cliente encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Telemóvel</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data Nasc.</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Última Visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClients.map((client) => (
                    <tr key={client._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{client.firstName} {client.lastName}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{client.email}</td>
                      <td className="px-6 py-4 text-gray-600">{client.phone}</td>
                      <td className="px-6 py-4 text-gray-600">{client.dob}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {client.visitDate}
                        </span>
                        <div className="text-xs text-gray-400 mt-1 uppercase">{client.eventType}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}