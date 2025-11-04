// components/ToastProvider.tsx
'use client'

import { Toaster } from 'react-hot-toast'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
              color: '#fff',
              fontWeight: '600',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#EF4444',
              color: '#fff',
              fontWeight: '600',
            },
          },
          loading: {
            style: {
              background: '#3B82F6',
              color: '#fff',
              fontWeight: '600',
            },
          },
        }}
      />
    </>
  )
}