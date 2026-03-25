## API Examples

### Get wallet balance
curl http://localhost:3000/api/users/USER_ID/wallet

### Submit withdrawal
curl -X POST http://localhost:3000/api/users/USER_ID/withdrawals \
  -H "Content-Type: application/json" \
  -d '{
    "amountInPaisa": 5000,
    "destination": "HDFC_ACC_1234",
    "idempotencyKey": "any-unique-uuid-here"
  }'

### Get all transactions
curl http://localhost:3000/api/users/USER_ID/transactions
