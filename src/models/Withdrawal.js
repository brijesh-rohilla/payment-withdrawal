const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountInPaisa: { type: Number, required: true, min: 1 },
    destination: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed'],
      default: 'pending',
    },
    // Idempotency key — client sends unique key to prevent duplicate submissions
    idempotencyKey: { type: String, required: true },
    failureReason: { type: String },
    referenceId: { type: String, required: true }, // UUID for tracking
  },
  { timestamps: true }
);

withdrawalSchema.index({ userId: 1, status: 1 });
withdrawalSchema.index({ idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
