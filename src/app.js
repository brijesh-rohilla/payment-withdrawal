require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const routes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');

// Start queue worker
require('./queues/worker');

const app = express();

app.use(express.json());
app.use(express.static(require('path').join(__dirname, 'public')));

// Rate limiting — 100 requests per 15 min per IP
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests' },
  })
);

app.use('/api', routes);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => logger.info({ msg: `Server running on port ${PORT}` }));
};

start();
