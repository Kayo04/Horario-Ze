'use client'
import React, { useState, useEffect } from 'react'
import { Employee } from '@/types/employee'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

export default function FuncionariosPage(): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>([])
  
  // --- ESTADOS DO FORMULÁRIO ---
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [telefone, setTelefone] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [role, setRole] = useState<'admin' | 'employee'>('employee')

  const [loading, setLoading] = useState<boolean>(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)

  const { language, setLanguage } = useLanguage()
  const t = translations[language]

  // Carregar funcionários
  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    } finally {
      setLoading(false)
    }
  }

  // Função para guardar funcionário
  const saveEmployee = async () => {
    if (!name.trim() || !email.trim()) {
      alert(t.name_email_required)
      return
    }
    if (!editingId && !password) {
      alert(t.password_required_new)
      return
    }

    setSaving(true)
    try {
      const employeeData: any = { 
        name: name.trim(),
        email: email.trim().toLowerCase(),
        code: code.trim().toUpperCase(),
        telefone: telefone.trim(),
        role: role,
      }
      
      if (password) {
        employeeData.password = password;
      }

      const url = editingId ? `/api/employees/${editingId}` : '/api/employees'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      })

      if (response.ok) {
        await loadEmployees()
        resetForm()
        alert(editingId ? t.employee_saved : t.employee_created)
      } else {
        const errorData = await response.json()
        alert(t.error_saving_employee + ': ' + (errorData.error || t.email_tag_exists))
      }
    } catch (error) {
      alert(t.error_connection)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setName('')
    setEmail('')
    setCode('')
    setTelefone('')
    setPassword('')
    setRole('employee')
    setEditingId(null)
  }

  const editEmployee = (emp: Employee) => {
    setEditingId(emp.id)
    setName(emp.name)
    setEmail(emp.email)
    setCode(emp.code || '')
    setTelefone(emp.telefone || '')
    setRole(emp.role)
    setPassword('')
    window.scrollTo(0, 0)
  }
  
  const confirmDelete = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setShowDeleteConfirm(true)
  }
  
  const executeDelete = async () => {
    if (!employeeToDelete) return
    try {
      const response = await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== employeeToDelete.id))
        alert(t.employee_deleted)
      } else {
        alert(t.error_deleting_employee)
      }
    } catch (error) {
      alert(t.error_connection)
    } finally {
      setShowDeleteConfirm(false)
      setEmployeeToDelete(null)
    }
  }
  
  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setEmployeeToDelete(null)
  }
  
  const cancelEdit = () => {
    resetForm()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-lg text-gray-700">
          <div className="w-6 h-6 border-4 border-park-200 border-t-park-600 rounded-full animate-spin"></div>
          {t.loading}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans relative">
      <div className="max-w-4xl mx-auto">
      
        <div className="mb-6 flex justify-between items-center">
          <Link href="/portal" passHref legacyBehavior>
            <a className="inline-flex items-center text-sm text-park-600 hover:text-park-800 group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t.back_to_portal}
            </a>
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

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t.employees_title}</h1>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold text-gray-800">
              {editingId ? t.edit_employee : t.create_employee}
            </h2>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300 transition-colors"
                disabled={saving}
              >
                {t.cancel_edit}
              </button>
            )}
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.name_label}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-park-500 transition"
                  placeholder={t.login_name_placeholder}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.tag_label}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-park-500 transition"
                  placeholder={t.tag_placeholder}
                  disabled={saving}
                  maxLength={5}
                />
                <p className="text-xs text-gray-500 mt-1">{t.tag_help}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.email_label}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-park-500 transition"
                  placeholder="funcionario@email.com"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.phone_label}
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-park-500 transition"
                  placeholder={t.phone_placeholder}
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">{t.phone_help}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.password_label} {!editingId && '*'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-park-500 transition"
                  placeholder={editingId ? t.password_placeholder_edit : t.password_placeholder_create}
                  disabled={saving}
                />
                {editingId ? (
                  <p className="text-xs text-gray-500 mt-1">{t.password_help_edit}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">{t.password_help_create}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.role_label}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-park-500 transition"
                  disabled={saving}
                >
                  <option value="employee">{t.role_employee}</option>
                  <option value="admin">{t.role_admin}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={saveEmployee}
                disabled={saving || !name.trim() || !email.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {editingId ? t.saving : t.creating}
                  </>
                ) : (
                  editingId ? t.update_employee : t.create_employee
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lista de funcionários */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-5 text-gray-800">
            {t.existing_employees} ({employees.length})
          </h2>
          
          {employees.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{t.no_employees}</p>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div 
                  key={employee.id} 
                  className="border border-gray-200 rounded-xl p-4 transition-colors duration-150 hover:bg-gray-50"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    
                    {/* Informações do funcionário */}
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{employee.name}</h3>
                        {employee.code && (
                          <span className="text-xs bg-park-100 text-park-800 px-2 py-0.5 rounded-full font-medium">
                            {employee.code}
                          </span>
                        )}
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          employee.role === 'admin' 
                            ? 'bg-park-100 text-park-800' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {employee.role === 'admin' ? t.role_admin : t.role_employee}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {employee.code && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-gray-400">🏷️</span>
                            <span className="font-medium">{t.tag_display}: {employee.code}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-gray-400">📧</span>
                          <span>{employee.email}</span>
                        </div>
                        {employee.telefone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-gray-400">📱</span>
                            <span>{employee.telefone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:ml-4">
                      <button
                        onClick={() => editEmployee(employee)}
                        className="px-3 py-1 bg-park-100 text-park-700 rounded-md text-sm font-medium hover:bg-park-200 transition-colors"
                        disabled={saving}
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => confirmDelete(employee)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                        disabled={saving}
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Confirmação de Delete */}
        {showDeleteConfirm && employeeToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t.confirm_delete}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {t.confirm_delete_employee.replace('{name}', employeeToDelete.name)}
                </p>
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={executeDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    {t.yes_delete}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}