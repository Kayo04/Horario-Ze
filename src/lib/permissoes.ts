// Roles e "quadrados" (botões do portal) que cada pessoa pode ver e usar.
// Partilhado entre o browser, as APIs e o middleware: não importar aqui nada só de servidor.

export type Role = 'admin' | 'manager' | 'host'
export const ROLES: Role[] = ['host', 'manager', 'admin']

/** Converte a role guardada na base de dados. 'employee' (o nome antigo) passa a 'host'. */
export function normalizarRole(role: unknown): Role {
  if (role === 'admin' || role === 'manager' || role === 'host') return role
  return 'host' // 'employee' antigo ou sem role
}

// Todos os quadrados do portal
export type Quadrado =
  | 'scheduler'
  | 'reservas'
  | 'checkin'
  | 'funcionarios'
  | 'adminpanel'
  | 'disponibilidade'
  | 'horario'
  | 'clientes'
  | 'horas'
  | 'criarHorarios'

export const HREF: Record<Quadrado, string> = {
  scheduler: '/scheduler',
  reservas: '/gestao-reserva',
  checkin: '/portal/checkin',
  funcionarios: '/funcionarios',
  adminpanel: '/adminpanel',
  disponibilidade: '/disponibilidade',
  horario: '/horario',
  clientes: '/portal/clientes',
  horas: '/gestao-horas',
  criarHorarios: '/criar-horarios',
}

// Os 4 de sempre: toda a gente (Host, Manager, Admin) vê-os, não se podem tirar
export const QUADRADOS_BASE: Quadrado[] = ['reservas', 'checkin', 'disponibilidade', 'horario']

// Os que o admin pode dar a mais a um Host/Manager
export const QUADRADOS_EXTRA: Quadrado[] = ['scheduler', 'funcionarios', 'adminpanel', 'clientes', 'horas', 'criarHorarios']

// Ordem em que aparecem no portal "simples" (Host/Manager)
export const ORDEM_QUADRADOS: Quadrado[] = [
  'scheduler', 'reservas', 'checkin', 'funcionarios', 'adminpanel',
  'disponibilidade', 'horario', 'clientes', 'horas', 'criarHorarios',
]

// Grupos (as secções grandes do portal dos admins e do menu de permissões)
export type Grupo = 'rh' | 'administracao'
export const GRUPOS: Record<Grupo, Quadrado[]> = {
  rh: ['scheduler', 'reservas', 'disponibilidade', 'horario', 'horas', 'criarHorarios'],
  administracao: ['checkin', 'funcionarios', 'clientes', 'adminpanel'],
}

/** Limpa a lista vinda do browser/base de dados: só quadrados extra válidos, sem repetidos. */
export function normalizarPermissoes(lista: unknown): Quadrado[] {
  if (!Array.isArray(lista)) return []
  return QUADRADOS_EXTRA.filter(q => lista.includes(q))
}

/** Pode esta pessoa ver/usar este quadrado? */
export function podeVer(role: unknown, permissoes: unknown, quadrado: Quadrado): boolean {
  if (normalizarRole(role) === 'admin') return true
  if (QUADRADOS_BASE.includes(quadrado)) return true
  return normalizarPermissoes(permissoes).includes(quadrado)
}

/** Quadrados que a pessoa vê, pela ordem do portal. */
export function quadradosVisiveis(role: unknown, permissoes: unknown): Quadrado[] {
  return ORDEM_QUADRADOS.filter(q => podeVer(role, permissoes, q))
}

/** Que quadrado protege esta página? (para o middleware) */
export function quadradoDaPagina(pathname: string): Quadrado | null {
  for (const q of QUADRADOS_EXTRA) {
    const href = HREF[q]
    if (pathname === href || pathname.startsWith(href + '/')) return q
  }
  return null
}
