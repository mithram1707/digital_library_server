const cron = require('node-cron');
const Transaction = require('../models/Transaction');

const startCronJobs = () => {
  cron.schedule('0 0 * * *', async () => {
    const finePerDay = parseFloat(process.env.FINE_PER_DAY) || 5;
    const now = new Date();
    const overdueTransactions = await Transaction.find({
      status: { $in: ['issued', 'overdue'] },
      dueDate: { $lt: now },
    });
    for (const txn of overdueTransactions) {
      const overdueDays = Math.ceil((now - txn.dueDate) / (1000 * 60 * 60 * 24));
      txn.fine = overdueDays * finePerDay;
      txn.status = 'overdue';
      await txn.save();
    }
    console.log(`[CRON] Processed ${overdueTransactions.length} overdue transactions`);
  });
};

module.exports = startCronJobs;
