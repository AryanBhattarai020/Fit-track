const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AIInsight = sequelize.define('AIInsight', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM(
        'spending_pattern',
        'budget_recommendation',
        'anomaly_detection',
        'saving_opportunity',
        'category_suggestion',
        'goal_adjustment',
        'cashflow_prediction'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional structured data for the insight',
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      validate: {
        min: 0.00,
        max: 1.00,
      },
      comment: 'AI confidence score (0.00-1.00)',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('active', 'dismissed', 'acted_upon', 'expired'),
      allowNull: false,
      defaultValue: 'active',
    },
    actionable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this insight requires user action',
    },
    actions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of suggested actions with labels and API endpoints',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    viewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actedUponAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    feedback: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'User feedback on the insight for ML improvement',
    },
    relatedTransactionIds: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of transaction IDs related to this insight',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'ai_insights',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['expires_at'],
      },
      {
        fields: ['user_id', 'status'],
      },
    ],
  });

  return AIInsight;
};