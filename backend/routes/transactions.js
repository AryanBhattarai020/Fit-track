const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const { Transaction, Category, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const aiCategorization = require('../services/aiCategorization');
const ocrService = require('../services/ocrService');
const { Op } = require('sequelize');

const router = express.Router();

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

// Get all transactions for a user
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date'),
  query('categoryId').optional().isInt().withMessage('Category ID must be an integer'),
  query('type').optional().isIn(['expense', 'income']).withMessage('Type must be expense or income'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = { userId: req.user.id };
    
    if (req.query.startDate || req.query.endDate) {
      whereClause.transactionDate = {};
      if (req.query.startDate) {
        whereClause.transactionDate[Op.gte] = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        whereClause.transactionDate[Op.lte] = new Date(req.query.endDate);
      }
    }

    if (req.query.categoryId) {
      whereClause.categoryId = req.query.categoryId;
    }

    if (req.query.type) {
      whereClause.type = req.query.type;
    }

    if (req.query.search) {
      whereClause[Op.or] = [
        { description: { [Op.like]: `%${req.query.search}%` } },
        { merchantName: { [Op.like]: `%${req.query.search}%` } },
        { notes: { [Op.like]: `%${req.query.search}%` } }
      ];
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'icon', 'color']
        }
      ],
      order: [['transactionDate', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions'
    });
  }
});

// Get a single transaction
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      error: 'Failed to fetch transaction'
    });
  }
});

// Create a new transaction
router.post('/', authenticateToken, [
  body('amount').isDecimal({ decimal_digits: '0,2' }).withMessage('Amount must be a valid decimal'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('merchantName').optional().trim().isLength({ max: 100 }),
  body('transactionDate').optional().isISO8601().withMessage('Transaction date must be valid'),
  body('type').optional().isIn(['expense', 'income']).withMessage('Type must be expense or income'),
  body('paymentMethod').optional().isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'other']),
  body('categoryId').optional().isInt().withMessage('Category ID must be an integer'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      amount,
      description,
      merchantName,
      transactionDate,
      type,
      paymentMethod,
      categoryId,
      location,
      notes,
      tags
    } = req.body;

    // Auto-categorize if no category provided
    let finalCategoryId = categoryId;
    let confidence = null;
    
    if (!categoryId) {
      const categorization = await aiCategorization.categorizeTransaction(
        description,
        merchantName,
        amount
      );
      finalCategoryId = categorization.categoryId;
      confidence = categorization.confidence;
    }

    const transaction = await Transaction.create({
      amount: parseFloat(amount),
      description: description.trim(),
      merchantName: merchantName?.trim(),
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      type: type || 'expense',
      paymentMethod: paymentMethod || 'cash',
      categoryId: finalCategoryId,
      location,
      notes: notes?.trim(),
      tags: tags || [],
      confidence,
      source: 'manual',
      userId: req.user.id
    });

    // Fetch the created transaction with category details
    const createdTransaction = await Transaction.findByPk(transaction.id, {
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: createdTransaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      error: 'Failed to create transaction'
    });
  }
});

// Create transaction from OCR receipt
router.post('/ocr', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Receipt image is required'
      });
    }

    // Extract data from receipt using OCR
    const ocrData = await ocrService.processReceipt(req.file.path);
    
    if (!ocrData.amount || !ocrData.merchantName) {
      return res.status(400).json({
        error: 'Could not extract required information from receipt',
        extractedData: ocrData
      });
    }

    // Auto-categorize based on extracted data
    const categorization = await aiCategorization.categorizeTransaction(
      ocrData.description || 'Receipt purchase',
      ocrData.merchantName,
      ocrData.amount
    );

    const transaction = await Transaction.create({
      amount: parseFloat(ocrData.amount),
      description: ocrData.description || `Purchase at ${ocrData.merchantName}`,
      merchantName: ocrData.merchantName,
      transactionDate: ocrData.date ? new Date(ocrData.date) : new Date(),
      type: 'expense',
      paymentMethod: 'other',
      categoryId: categorization.categoryId,
      receiptImagePath: req.file.path,
      confidence: categorization.confidence,
      source: 'ocr',
      userId: req.user.id
    });

    // Fetch the created transaction with category details
    const createdTransaction = await Transaction.findByPk(transaction.id, {
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    res.status(201).json({
      message: 'Transaction created from receipt successfully',
      transaction: createdTransaction,
      extractedData: ocrData,
      categorization
    });
  } catch (error) {
    console.error('Error processing OCR transaction:', error);
    res.status(500).json({
      error: 'Failed to process receipt',
      message: error.message
    });
  }
});

// Update a transaction
router.put('/:id', authenticateToken, [
  body('amount').optional().isDecimal({ decimal_digits: '0,2' }),
  body('description').optional().trim().isLength({ min: 1 }),
  body('merchantName').optional().trim().isLength({ max: 100 }),
  body('transactionDate').optional().isISO8601(),
  body('type').optional().isIn(['expense', 'income']),
  body('paymentMethod').optional().isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'other']),
  body('categoryId').optional().isInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const transaction = await Transaction.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    // Learn from user category correction
    if (req.body.categoryId && req.body.categoryId !== transaction.categoryId) {
      await aiCategorization.learnFromUserCorrection(
        transaction.description,
        transaction.merchantName,
        req.body.categoryId
      );
    }

    const allowedFields = [
      'amount', 'description', 'merchantName', 'transactionDate',
      'type', 'paymentMethod', 'categoryId', 'location', 'notes', 'tags'
    ];

    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'amount') {
          updateData[key] = parseFloat(req.body[key]);
        } else if (key === 'transactionDate') {
          updateData[key] = new Date(req.body[key]);
        } else {
          updateData[key] = req.body[key];
        }
      }
    });

    // Mark as verified if user is manually updating
    updateData.isVerified = true;

    await transaction.update(updateData);

    // Fetch updated transaction with category
    const updatedTransaction = await Transaction.findByPk(transaction.id, {
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    res.json({
      message: 'Transaction updated successfully',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      error: 'Failed to update transaction'
    });
  }
});

// Delete a transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    await transaction.destroy();

    res.json({
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      error: 'Failed to delete transaction'
    });
  }
});

// Get transaction summary/statistics
router.get('/summary/stats', authenticateToken, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    let startDate, endDate;
    
    if (req.query.period) {
      const now = new Date();
      switch (req.query.period) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      endDate = new Date();
    } else {
      startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    }

    const whereClause = {
      userId: req.user.id,
      transactionDate: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    };

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    // Calculate statistics
    const stats = {
      totalTransactions: transactions.length,
      totalExpenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0),
      totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0),
      avgTransactionAmount: 0,
      categoryBreakdown: {},
      dailyTrends: {},
      topMerchants: {},
    };

    stats.netAmount = stats.totalIncome - stats.totalExpenses;
    stats.avgTransactionAmount = stats.totalTransactions > 0 ? (stats.totalExpenses + stats.totalIncome) / stats.totalTransactions : 0;

    // Category breakdown
    transactions.forEach(transaction => {
      const categoryName = transaction.Category?.name || 'Other';
      if (!stats.categoryBreakdown[categoryName]) {
        stats.categoryBreakdown[categoryName] = {
          amount: 0,
          count: 0,
          icon: transaction.Category?.icon || 'more-horizontal',
          color: transaction.Category?.color || '#6b7280'
        };
      }
      stats.categoryBreakdown[categoryName].amount += parseFloat(transaction.amount);
      stats.categoryBreakdown[categoryName].count += 1;
    });

    // Daily trends
    transactions.forEach(transaction => {
      const date = new Date(transaction.transactionDate).toDateString();
      if (!stats.dailyTrends[date]) {
        stats.dailyTrends[date] = { expenses: 0, income: 0 };
      }
      if (transaction.type === 'expense') {
        stats.dailyTrends[date].expenses += parseFloat(transaction.amount);
      } else {
        stats.dailyTrends[date].income += parseFloat(transaction.amount);
      }
    });

    // Top merchants
    transactions.forEach(transaction => {
      if (transaction.merchantName) {
        if (!stats.topMerchants[transaction.merchantName]) {
          stats.topMerchants[transaction.merchantName] = { amount: 0, count: 0 };
        }
        stats.topMerchants[transaction.merchantName].amount += parseFloat(transaction.amount);
        stats.topMerchants[transaction.merchantName].count += 1;
      }
    });

    // Sort top merchants by amount
    stats.topMerchants = Object.fromEntries(
      Object.entries(stats.topMerchants)
        .sort(([,a], [,b]) => b.amount - a.amount)
        .slice(0, 10)
    );

    res.json({
      stats,
      period: {
        startDate,
        endDate,
        period: req.query.period
      }
    });
  } catch (error) {
    console.error('Error generating transaction statistics:', error);
    res.status(500).json({
      error: 'Failed to generate statistics'
    });
  }
});

module.exports = router;