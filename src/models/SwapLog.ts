import mongoose, { Schema, model, models } from 'mongoose';

const SwapLogSchema = new Schema({
  date: { type: String, required: true },           // "2026-04-07"
  timeSlot: { type: String, required: true },        // "10:00 - 10:30"
  originalEmployee: { type: String, required: true }, // employee code e.g. "TR"
  newEmployee: { type: String, required: true },      // employee code e.g. "DN"
  swappedBy: { type: String, required: true },        // user ID who performed the swap
  swappedByName: { type: String, required: true },    // display name e.g. "Tiago Ribeiro"
}, { 
  timestamps: true 
});

// Index for fast queries by date range
SwapLogSchema.index({ date: 1 });

const SwapLog = models.SwapLog || model('SwapLog', SwapLogSchema);

export default SwapLog;
