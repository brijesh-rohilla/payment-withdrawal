require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Wallet = require('../src/models/Wallet');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Ensures a clean slate on every run.
  await User.deleteMany({});
  await Wallet.deleteMany({});

  const users = await User.insertMany([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
  ]);

  // Avoid floating-point precision issues. currency unit (1 ₹ = 100 paisa).
  await Wallet.insertMany([
    { userId: users[0]._id, balanceInPaisa: 100000 }, // ₹1000
    { userId: users[1]._id, balanceInPaisa: 50000 }, // ₹500
  ]);

  console.log('Seeded users:');
  users.forEach((u) => console.log(`  ${u.name} → userId: ${u._id}`));
  console.log('Done.');
  await mongoose.disconnect();
};

seed().catch(console.error);
