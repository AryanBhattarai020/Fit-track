const express = require('express');
const { AIInsight, Transaction, Category } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const aiCategorization = require('../services/aiCategorization');

const router = express.Router();

// Get AI insights for user
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const insights = await AIInsight.findAll({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      order: [['priority', 'DESC'], ['createdAt', 'DESC']],
      limit: 20
    });

    res.json({ insights });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({
      error: 'Failed to fetch insights'
    });
  }
});

// Categorize transaction using AI
router.post('/categorize', authenticateToken, async (req, res) => {
  try {
    const { description, merchantName, amount } = req.body;
    
    const categorization = await aiCategorization.categorizeTransaction(
      description,
      merchantName,
      amount
    );

    res.json({ categorization });
  } catch (error) {
    console.error('Error in AI categorization:', error);
    res.status(500).json({
      error: 'Failed to categorize transaction'
    });
  }
});

module.exports = router;