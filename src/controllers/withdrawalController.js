const withdrawalService = require('../services/withdrawalService');
const walletRepo = require('../repositories/walletRepository');
const txLogRepo = require('../repositories/transactionLogRepository');
const userRepo = require('../models/User');

// GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const users = await userRepo.find({}, '_id name email').lean();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// POST /api/users/:userId/withdrawals
const initiateWithdrawal = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await withdrawalService.initiateWithdrawal(userId, req.body);

    const statusCode = result.duplicate ? 200 : 202; // 202 = accepted for processing
    res.status(statusCode).json({
      message: result.duplicate ? 'Duplicate request — returning existing' : 'Withdrawal queued',
      withdrawal: result.withdrawal,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:userId/withdrawals/:id
const getWithdrawal = async (req, res, next) => {
  try {
    const w = await require('../models/Withdrawal').findById(req.params.id);
    if (!w || w.userId.toString() !== req.params.userId) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(w);
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:userId/wallet
const getWallet = async (req, res, next) => {
  try {
    const wallet = await walletRepo.findByUserId(req.params.userId);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    res.json({
      balanceInPaisa: wallet.balanceInPaisa,
      balanceInRupees: (wallet.balanceInPaisa / 100).toFixed(2),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:userId/transactions
const getTransactions = async (req, res, next) => {
  try {
    const logs = await txLogRepo.findByUserId(req.params.userId);
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

module.exports = { initiateWithdrawal, getWithdrawal, getWallet, getTransactions, getUsers };
