const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/withdrawalController');
const { validate, withdrawalSchema } = require('../middleware/validate');

router.get('/users', ctrl.getUsers);
router.post('/users/:userId/withdrawals', validate(withdrawalSchema), ctrl.initiateWithdrawal);
router.get('/users/:userId/withdrawals/:id', ctrl.getWithdrawal);
router.get('/users/:userId/wallet', ctrl.getWallet);
router.get('/users/:userId/transactions', ctrl.getTransactions);

module.exports = router;
