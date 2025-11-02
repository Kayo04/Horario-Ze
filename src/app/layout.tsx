'use client'

import './globals.css'
import { FuncionariosProvider } from '@/context/FuncionariosContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <FuncionariosProvider>
          {children}
        </FuncionariosProvider>
      </body>
    </html>
  )
}
