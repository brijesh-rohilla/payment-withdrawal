const mongoose = require('mongoose');

// Balance stored in paisa (integer) to avoid floating point issues
// e.g. ₹100.50 → 10050 paisa
const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balanceInPaisa: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    timestamps: true,
    // Mongoose built-in optimistic locking (__v field)
    optimisticConcurrency: true,
  }
);

module.exports = mongoose.model('Wallet', walletSchema);
