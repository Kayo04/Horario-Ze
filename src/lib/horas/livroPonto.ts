// Totais (em minutos) dos livros de ponto em papel/Excel, por mês e ID de funcionário.
// Servem para conferir com o que o relógio NGTeco registou.
// null = o livro de ponto desse funcionário ainda não foi preenchido.
// Valores recuperados do site antigo da gestão (1 a 17 de novembro de 2026).
export const livroPonto: Record<string, Record<string, number | null>> = {
  '2026-11': {
    '2': 4836,
    '3': null,
    '4': 4218,
    '7': 305,
    '8': 480,
    '9': 3459,
    '10': 340,
    '11': null,
    '12': null,
    '13': 1560,
    '14': 1689,
    '15': 1110,
  },
}
