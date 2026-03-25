const Withdrawal = require('../models/Withdrawal');

const create = (data, session) => Withdrawal.create([data], { session });
const findByIdempotencyKey = (key) => Withdrawal.findOne({ idempotencyKey: key });
const updateStatus = (id, status, extra = {}, session) =>
  Withdrawal.findByIdAndUpdate(id, { status, ...extra }, { session, new: true });

module.exports = { create, findByIdempotencyKey, updateStatus };
