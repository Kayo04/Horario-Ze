import { Schema, model, models } from 'mongoose';

// Horas de UM funcionário num mês, tal como ele as escreveu no livro de ponto (Excel).
// Serve para comparar com o que o relógio NGTeco registou.
// Reimportar o mesmo funcionário/mês substitui o registo anterior.
const DiaSchema = new Schema({
  date: { type: String, required: true },          // "2026-10-04"
  periods: { type: [[String]], default: [] },      // [["15:00","19:05"], ...]
  minutes: { type: Number, required: true },
}, { _id: false });

const HorasLivroSchema = new Schema({
  employeeId: { type: Number, required: true },    // ID no relógio NGTeco
  employeeName: { type: String, required: true },  // nome no relógio
  livroName: { type: String, default: '' },        // nome escrito no livro de ponto
  month: { type: String, required: true },         // "2026-10"
  days: { type: [DiaSchema], default: [] },
  totalMinutes: { type: Number, required: true },
  fileName: { type: String, default: '' },
  importedBy: { type: String, default: '' },
}, {
  timestamps: true,
});

HorasLivroSchema.index({ employeeId: 1, month: 1 }, { unique: true });

const HorasLivro = models.HorasLivro || model('HorasLivro', HorasLivroSchema);

export default HorasLivro;
