// middleware.ts
import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(req: NextRequest) {
  // 1. Obter o token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  // 2. Caminho
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/'
  // Rotas públicas (checkin)
  const isPublicPath = pathname.startsWith('/checkin') || pathname.startsWith('/api/checkin')

  // --- REGRAS ---

  // A: Proteger páginas privadas
  if (!isLoginPage && !isPublicPath && !token) {
    const url = new URL('/', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // B: Login loop
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL('/portal', req.url))
  }
  
  // C: 🔥 REGRA DE ADMIN - BLOQUEAR ACESSO À PASTA CLIENTES
  if ( (pathname.startsWith('/funcionarios') || pathname.startsWith('/portal/clientes')) && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/portal?error=NaoAutorizado', req.url))
  }

  return NextResponse.next()
}

// Configuração
export const config = { 
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ] 
}