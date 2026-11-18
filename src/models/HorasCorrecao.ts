import { Schema, model, models } from 'mongoose';

// Correção manual de uma marcação, indexada pela chave estável da marcação.
// A "revision" evita que duas pessoas a editar ao mesmo tempo se sobreponham:
// só se grava se a revisão enviada for a que está na base de dados.
const HorasCorrecaoSchema = new Schema({
  key: { type: String, required: true, unique: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  nextDay: { type: Boolean, required: true },
  minutes: { type: Number, required: true },
  state: { type: String, default: 'Corrigido manualmente' },
  revision: { type: Number, required: true },
  correctedBy: { type: String, default: '' }, // nome de quem corrigiu
}, {
  timestamps: true,
});

const HorasCorrecao = models.HorasCorrecao || model('HorasCorrecao', HorasCorrecaoSchema);

export default HorasCorrecao;
