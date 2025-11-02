'use client'
import { useState } from 'react'

export default function TestAPI() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testGetEmployees = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/employees')
      const text = await response.text()
      
      // Tenta fazer parse como JSON, se falhar mostra o texto original
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        data = { rawResponse: text }
      }
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data
      })
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Erro desconhecido' })
    } finally {
      setLoading(false)
    }
  }

  const testCreateEmployee = async () => {
    setLoading(true)
    try {
      const testEmployee = {
        name: 'Teste Funcionário',
        unavailable: {
          weekdays: [],
          dates: []
        }
      }

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEmployee),
      })

      const text = await response.text()
      
      // Tenta fazer parse como JSON, se falhar mostra o texto original
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        data = { rawResponse: text }
      }

      setResult({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data
      })
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Erro desconhecido' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Teste da API - Debug</h1>
      
      <div className="space-y-4 mb-6">
        <button 
          onClick={testGetEmployees}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Testar GET /api/employees
        </button>
        
        <button 
          onClick={testCreateEmployee}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded ml-4"
        >
          Testar POST /api/employees
        </button>
      </div>

      {loading && <div>A carregar...</div>}

      {result && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Resultado:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}