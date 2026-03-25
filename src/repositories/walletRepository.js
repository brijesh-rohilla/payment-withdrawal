const Wallet = require('../models/Wallet');

// Find wallet by userId
const findByUserId = (userId, session) => Wallet.findOne({ userId }).session(session || null);

// Deduct balance atomically using findOneAndUpdate with version check (optimistic lock)
// Only succeeds if __v matches — prevents lost updates under concurrency
const deductBalance = (userId, amountInPaisa, currentVersion, session) =>
  Wallet.findOneAndUpdate(
    {
      userId,
      __v: currentVersion, // Optimistic lock check
      balanceInPaisa: { $gte: amountInPaisa }, // Ensure sufficient balance atomically
    },
    {
      $inc: { balanceInPaisa: -amountInPaisa, __v: 1 },
    },
    { new: true, session }
  );

module.exports = { findByUserId, deductBalance };
