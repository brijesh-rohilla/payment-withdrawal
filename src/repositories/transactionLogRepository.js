const TransactionLog = require('../models/TransactionLog');

// Insert-only. Never update.
const insert = (data, session) => TransactionLog.create([data], { session });
const findByUserId = (userId) => TransactionLog.find({ userId }).sort({ createdAt: -1 });

module.exports = { insert, findByUserId };
