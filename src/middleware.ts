// middleware.ts
import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { podeVer, quadradoDaPagina } from "@/lib/permissoes"

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
  
  // C: Páginas protegidas por quadrado (Gerir Horários, Funcionários, Painel de Admin, Base de Dados,
  //    Gestão de Horas, Criar Horários): só entra o admin ou um Host/Manager a quem o admin deu esse quadrado
  const quadrado = quadradoDaPagina(pathname)
  if (quadrado && !podeVer(token?.role, token?.permissions, quadrado)) {
      return NextResponse.redirect(new URL('/portal?error=NaoAutorizado', req.url))
  }

  return NextResponse.next()
}

// Configuração
export const config = { 
  matcher: [
    // Imagens da pasta public (ex. o logótipo no ecrã de login) não precisam de sessão
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ] 
}