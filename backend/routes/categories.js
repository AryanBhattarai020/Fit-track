const express = require('express');
const { Category } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      include: [
        {
          model: Category,
          as: 'subcategories',
          where: { isActive: true },
          required: false
        }
      ]
    });

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories'
    });
  }
});

module.exports = router;