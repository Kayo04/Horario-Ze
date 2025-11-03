// middleware.ts
import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(req: NextRequest) {
  // 1. Obter o token do utilizador (se existir)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  // 2. Ver o caminho que o utilizador está a tentar aceder
  const { pathname } = req.nextUrl

  // 3. Definir qual é a nossa página de login (que é pública)
  const isPublicPage = pathname === '/'

  // --- REGRAS DE REDIRECIONAMENTO ---

  // REGRA A: Proteger páginas privadas
  // Se a página NÃO é pública E o utilizador NÃO está logado
  if (!isPublicPage && !token) {
    // Redireciona-o para a página de login (/)
    const url = new URL('/', req.url)
    url.searchParams.set('callbackUrl', pathname) // Guarda onde ele queria ir
    return NextResponse.redirect(url)
  }

  // REGRA B: Impedir loop de login
  // Se a página É pública (login) E o utilizador JÁ está logado
  if (isPublicPage && token) {
    // Redireciona-o para o portal
    return NextResponse.redirect(new URL('/portal', req.url))
  }
  
  // REGRA C: Proteger páginas de Admin
  // Se ele tenta aceder a /funcionarios E NÃO é um admin
  if (pathname.startsWith('/funcionarios') && token?.role !== 'admin') {
     // Redireciona-o para o portal com um aviso
     return NextResponse.redirect(new URL('/portal?error=NaoAutorizado', req.url))
  }

  // Se nenhuma regra for ativada, deixa o utilizador passar
  return NextResponse.next()
}

// Configuração:
// O 'matcher' define quais páginas vão ativar o 'middleware'
export const config = { 
  matcher: [
    /*
     * Correr o middleware em TODAS as rotas, exceto:
     * - /api/auth/... (para o login funcionar)
     * - /_next/static (ficheiros estáticos)
     * - /_next/image (imagens)
     * - favicon.ico (o ícone)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ] 
}