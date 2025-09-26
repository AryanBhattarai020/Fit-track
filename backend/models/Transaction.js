const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    merchantName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    type: {
      type: DataTypes.ENUM('expense', 'income'),
      allowNull: false,
      defaultValue: 'expense',
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'other'),
      allowNull: false,
      defaultValue: 'cash',
    },
    location: {
      type: DataTypes.JSON,
      allowNull: true,
      // Structure: { latitude: number, longitude: number, address: string }
    },
    receiptImagePath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    recurringPattern: {
      type: DataTypes.JSON,
      allowNull: true,
      // Structure: { frequency: 'daily'|'weekly'|'monthly'|'yearly', interval: number }
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'AI confidence score for auto-categorization (0.00-1.00)',
    },
    source: {
      type: DataTypes.ENUM('manual', 'ocr', 'bank_import', 'recurring'),
      allowNull: false,
      defaultValue: 'manual',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
  }, {
    tableName: 'transactions',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['category_id'],
      },
      {
        fields: ['transaction_date'],
      },
      {
        fields: ['user_id', 'transaction_date'],
      },
    ],
  });

  return Transaction;
};