const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const walletRepo = require('../repositories/walletRepository');
const withdrawalRepo = require('../repositories/withdrawalRepository');
const { enqueue } = require('../queues/withdrawalQueue');
const logger = require('../config/logger');

const initiateWithdrawal = async (userId, { amountInPaisa, destination, idempotencyKey }) => {
  // 1. Idempotency check — return existing result if key already used
  const existing = await withdrawalRepo.findByIdempotencyKey(idempotencyKey);
  if (existing) {
    logger.info({ msg: 'Duplicate request', idempotencyKey });
    return { withdrawal: existing, duplicate: true };
  }

  // 2. Validate user is active
  const user = await User.findById(userId).lean();
  if (!user || !user.isActive)
    throw Object.assign(new Error('User not found or inactive'), { status: 404 });

  // 3. Check balance (optimistic pre-check — final check happens atomically in processor)
  const wallet = await walletRepo.findByUserId(userId);
  if (!wallet || wallet.balanceInPaisa < amountInPaisa) {
    throw Object.assign(new Error('Insufficient balance'), { status: 422 });
  }

  // 4. Create withdrawal record (pending)
  const referenceId = uuidv4();
  const [withdrawal] = await withdrawalRepo.create({
    userId,
    amountInPaisa,
    destination,
    idempotencyKey,
    referenceId,
    status: 'pending',
  });

  // 5. Enqueue for background processing
  await enqueue({ withdrawalId: withdrawal._id, userId, amountInPaisa, destination });

  logger.info({ msg: 'Withdrawal queued', referenceId, userId, amountInPaisa });
  return { withdrawal, duplicate: false };
};

module.exports = { initiateWithdrawal };
