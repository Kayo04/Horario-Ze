import { Schema, model, models } from 'mongoose';

// Lembra a que funcionário do relógio pertence cada nome escrito nos livros de ponto
// (ex.: "Miguel Marques Santos" no livro -> ID 12 "Miguel Santos" no relógio),
// para não ser preciso escolher outra vez na próxima importação.
const HorasLivroNomeSchema = new Schema({
  nome: { type: String, required: true, unique: true }, // nome do livro normalizado (sem acentos, minúsculas)
  employeeId: { type: Number, required: true },
}, {
  timestamps: true,
});

const HorasLivroNome = models.HorasLivroNome || model('HorasLivroNome', HorasLivroNomeSchema);

export default HorasLivroNome;
