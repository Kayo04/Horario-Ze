import { Schema, model, models } from 'mongoose';

// Uma marcação (entrada/saída) tal como veio do relógio de ponto NGTeco.
// Estes dados são substituídos sempre que se reimporta o ficheiro exportado;
// as correções manuais ficam à parte em HorasCorrecao para não se perderem.
const HorasMarcacaoSchema = new Schema({
  key: { type: String, required: true, unique: true }, // chave estável: "<id>-<data>-<entrada>"
  employeeId: { type: Number, required: true },         // ID do funcionário no relógio
  name: { type: String, required: true },
  date: { type: String, required: true },               // "2026-10-02"
  start: { type: String, default: '' },                 // "10:02" ("" se em falta)
  end: { type: String, default: '' },                   // "15:03" ("" se em falta)
  minutes: { type: Number, default: null },             // null = por confirmar
  nextDay: { type: Boolean, default: false },
  state: { type: String, required: true },              // Completo | Por confirmar | Corrigido manualmente
}, {
  timestamps: true,
});

HorasMarcacaoSchema.index({ date: 1 });

const HorasMarcacao = models.HorasMarcacao || model('HorasMarcacao', HorasMarcacaoSchema);

export default HorasMarcacao;
