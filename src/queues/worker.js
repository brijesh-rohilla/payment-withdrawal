const { withdrawalQueue } = require('./withdrawalQueue');
const processWithdrawal = require('./withdrawalProcessor');
const logger = require('../config/logger');

if (withdrawalQueue) {
  withdrawalQueue.process(async (job) => {
    logger.info({ msg: 'Processing job', jobId: job.id, data: job.data });
    await processWithdrawal(job.data);
  });

  withdrawalQueue.on('failed', (job, err) => {
    logger.error({ msg: 'Job failed', jobId: job.id, error: err.message });
  });
}
