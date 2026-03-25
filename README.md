# Payment Withdrawal Module

A secure, concurrency-safe withdrawal backend built with **Node.js**, **MongoDB**, and **Bull** queue.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your MongoDB URI and Redis URL

# 3. Seed test data
npm run seed

# 4. Start server
npm start
```

> **Redis optional:** If Redis is unavailable, withdrawals process synchronously (no queue). Suitable for local dev.

---

## Project Structure

```
src/
├── app.js                    # Express entry point
├── config/
│   ├── database.js           # MongoDB connection
│   └── logger.js             # Winston logger
├── models/
│   ├── User.js
│   ├── Wallet.js             # Optimistic locking enabled
│   ├── Withdrawal.js         # Idempotency key index
│   └── TransactionLog.js     # Immutable, insert-only
├── repositories/             # All DB queries isolated here
├── services/
│   └── withdrawalService.js  # Business logic
├── controllers/
│   └── withdrawalController.js
├── queues/
│   ├── withdrawalQueue.js    # Bull queue setup
│   ├── withdrawalProcessor.js# Core atomic processor
│   └── worker.js             # Queue consumer
├── middleware/
│   ├── validate.js           # Joi input validation
│   └── errorHandler.js
└── routes/index.js
scripts/
└── seed.js                   # Creates test users + wallets
```

---

## API Endpoints

### Initiate Withdrawal
```
POST /api/users/:userId/withdrawals
Content-Type: application/json

{
  "amountInPaisa": 5000,
  "destination": "bank_account_XXXX",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```
- Returns `202 Accepted` — withdrawal is queued for processing
- Returns `200 OK` with existing result if `idempotencyKey` already used

### Get Wallet Balance
```
GET /api/users/:userId/wallet
```

### Get Withdrawal Status
```
GET /api/users/:userId/withdrawals/:id
```

### Get Transaction History
```
GET /api/users/:userId/transactions
```

---

## Architecture Decisions

### 1. Concurrency & Race Condition Handling

**Problem:** Two simultaneous requests for the same user could both read the same balance and both approve a withdrawal — causing a negative balance.

**Solution — Optimistic Locking:**

The `Wallet` model uses Mongoose's `optimisticConcurrency: true`, which tracks a `__v` (version) field. The atomic deduction query is:

```js
Wallet.findOneAndUpdate(
  { userId, __v: currentVersion, balanceInPaisa: { $gte: amount } },
  { $inc: { balanceInPaisa: -amount, __v: 1 } }
)
```

If two requests both read `__v: 5`, the first update succeeds and bumps it to `__v: 6`. The second update finds no document matching `__v: 5` and returns `null` → detected as a conflict → transaction aborts → job retried by Bull.

This avoids heavyweight pessimistic locks while ensuring correctness.

### 2. Financial Precision

All amounts are stored as **integers in paisa** (smallest currency unit). This eliminates floating-point rounding errors.

- `₹100.50` → `10050` in DB
- API accepts `amountInPaisa` (integer)
- Display layer converts: `balanceInPaisa / 100`

### 3. Idempotency

Each request requires a client-generated UUID `idempotencyKey`. Before creating a new withdrawal, the service checks if this key already exists. If it does, the existing record is returned — preventing duplicate charges from network retries.

### 4. MongoDB Transactions

The atomic deduction + status update + log insert all happen inside a **MongoDB multi-document transaction** (`session`). If anything fails, `abortTransaction()` rolls everything back — no partial state is possible.

> Requires MongoDB 4.0+ with a replica set. For local dev, run `mongod --replSet rs0` or use MongoDB Atlas.

### 5. Status Flow

```
pending → processing → success
                     → failed
```

A withdrawal record is created as `pending` before the job runs. Inside the processor it moves to `processing`, then `success` or `failed`. This provides a clear audit trail even if the server crashes mid-way.

### 6. Immutable Transaction Logs

`TransactionLog` records are never updated. A pre-hook throws if any update is attempted. Every state change (success or failure) generates a new log entry with `balanceBefore` and `balanceAfter`, supporting full audit and reconciliation.

### 7. Background Queue (Bull + Redis)

Withdrawals are pushed to a **Bull queue** backed by Redis. This provides:
- Decoupled processing (HTTP responds immediately with 202)
- Automatic retries with backoff (3 attempts)
- Horizontal scalability (multiple worker processes)

### 8. Security

| Threat | Mitigation |
|---|---|
| Injection attacks | Mongoose parameterized queries; no raw string interpolation |
| Mass assignment | Joi `stripUnknown: true` — only whitelisted fields accepted |
| Replay / duplicate requests | `idempotencyKey` with unique DB index |
| Amount/userId tampering | `userId` from URL param only; amount validated as integer with min/max |
| State tampering | Status transitions only happen inside the service/processor; never from raw input |
| Brute force | Rate limiting: 100 req/15 min per IP |

---

## Assumptions

- MongoDB replica set is required for transactions (Atlas works out-of-the-box)
- Redis is optional for local dev — falls back to synchronous processing
- No authentication middleware (can add JWT as a layer over routes)
- Payment gateway is mocked — marked clearly in `withdrawalProcessor.js` where a real call would go
- `amountInPaisa` is the API unit (integer). Callers handle conversion from rupees if needed.
