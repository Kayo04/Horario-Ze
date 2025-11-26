import mongoose, { Schema, model, models } from 'mongoose';

const ShiftSchema = new Schema({
  employeeCode: { type: String, required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  totalHours: { type: Number, required: true },
}, { timestamps: true });

const Shift = models.Shift || model('Shift', ShiftSchema);

export default Shift;