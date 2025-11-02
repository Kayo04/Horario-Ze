import mongoose, { Schema, models } from 'mongoose'

const FuncionarioSchema = new Schema({
  name: { type: String, required: true },
  unavailable: {
    weekdays: [{ day: Number, start: String, end: String }],
    dates: [String],
  },
})

const Funcionario = models.Funcionario || mongoose.model('Funcionario', FuncionarioSchema)
export default Funcionario
