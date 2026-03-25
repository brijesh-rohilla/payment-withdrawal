const mongoose = require('mongoose');

// This collection is INSERT-ONLY. Never update or delete logs.
const transactionLogSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true }, // Links to withdrawal
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['withdrawal'], required: true },
    status: { type: String, enum: ['pending', 'processing', 'success', 'failed'], required: true },
    amountInPaisa: { type: Number, required: true },
    balanceBeforeInPaisa: { type: Number, required: true },
    balanceAfterInPaisa: { type: Number, required: true },
    meta: { type: Object }, // Extra context (destination, error, etc.)
  },
  {
    timestamps: true,
    // Prevent accidental updates at schema level
  }
);

// Block updates — logs are immutable
transactionLogSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function () {
  throw new Error('TransactionLog is immutable');
});

transactionLogSchema.index({ referenceId: 1 });
transactionLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('TransactionLog', transactionLogSchema);
