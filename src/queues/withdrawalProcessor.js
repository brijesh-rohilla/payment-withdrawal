const mongoose = require('mongoose');
const walletRepo = require('../repositories/walletRepository');
const withdrawalRepo = require('../repositories/withdrawalRepository');
const txLogRepo = require('../repositories/transactionLogRepository');
const logger = require('../config/logger');

// Called by the queue worker (or directly as fallback)
const processWithdrawal = async ({ withdrawalId, userId, amountInPaisa, destination }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Mark withdrawal as processing
    await withdrawalRepo.updateStatus(withdrawalId, 'processing', {}, session);

    // Read current wallet (inside transaction)
    const wallet = await walletRepo.findByUserId(userId, session);

    if (!wallet || wallet.balanceInPaisa < amountInPaisa) {
      throw new Error('Insufficient balance');
    }

    const balanceBefore = wallet.balanceInPaisa;

    // Deduct with optimistic lock — if __v changed (another request beat us), this returns null
    const updated = await walletRepo.deductBalance(userId, amountInPaisa, wallet.__v, session);

    if (!updated) {
      throw new Error('Concurrent modification detected — retry');
    }

    // --- Mocked payment gateway call ---

    // Insert immutable log
    await txLogRepo.insert(
      {
        referenceId: withdrawalId.toString(),
        userId,
        type: 'withdrawal',
        status: 'success',
        amountInPaisa,
        balanceBeforeInPaisa: balanceBefore,
        balanceAfterInPaisa: updated.balanceInPaisa,
        meta: {
          destination: destination,
        },
      },
      session
    );

    // Mark withdrawal success
    await withdrawalRepo.updateStatus(withdrawalId, 'success', {}, session);

    await session.commitTransaction();
    logger.info({ msg: 'Withdrawal success', withdrawalId, userId, amountInPaisa });
  } catch (err) {
    await session.abortTransaction();
    logger.error({ msg: 'Withdrawal failed', withdrawalId, error: err.message });

    // Log the failure (outside the aborted transaction)
    const wallet = await walletRepo.findByUserId(userId);
    if (wallet) {
      await txLogRepo.insert({
        referenceId: withdrawalId.toString(),
        userId,
        type: 'withdrawal',
        status: 'failed',
        amountInPaisa,
        balanceBeforeInPaisa: wallet.balanceInPaisa,
        balanceAfterInPaisa: wallet.balanceInPaisa,
        meta: { error: err.message },
      });
    }

    await withdrawalRepo.updateStatus(withdrawalId, 'failed', { failureReason: err.message });
    throw err; // Re-throw so Bull retries if configured
  } finally {
    session.endSession();
  }
};

module.exports = processWithdrawal;
