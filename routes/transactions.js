const router = require('express').Router();
const Transaction = require('../models/Transaction');
const Book = require('../models/Book');

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const txns = await Transaction.find()
      .populate('book', 'title author isbn')
      .populate('member', 'name email membershipId')
      .sort({ createdAt: -1 });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Issue a book
router.post('/issue', async (req, res) => {
  const { bookId, memberId, dueDays = 14 } = req.body;
  try {
    const book = await Book.findById(bookId);
    if (!book || book.availableCopies < 1)
      return res.status(400).json({ error: 'Book not available' });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const txn = await Transaction.create({ book: bookId, member: memberId, dueDate });
    await Book.findByIdAndUpdate(bookId, { $inc: { availableCopies: -1 } });

    res.status(201).json(await txn.populate(['book', 'member']));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Return a book
router.put('/return/:id', async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn || txn.status === 'returned')
      return res.status(400).json({ error: 'Invalid transaction' });

    const returnDate = new Date();
    const finePerDay = parseFloat(process.env.FINE_PER_DAY) || 5;
    let fine = 0;
    if (returnDate > txn.dueDate) {
      const overdueDays = Math.ceil((returnDate - txn.dueDate) / (1000 * 60 * 60 * 24));
      fine = overdueDays * finePerDay;
    }

    txn.returnDate = returnDate;
    txn.fine = fine;
    txn.status = 'returned';
    await txn.save();
    await Book.findByIdAndUpdate(txn.book, { $inc: { availableCopies: 1 } });

    res.json(await txn.populate(['book', 'member']));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
