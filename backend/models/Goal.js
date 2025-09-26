const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Goal = sequelize.define('Goal', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('savings', 'debt_reduction', 'spending_limit', 'income_target'),
      allowNull: false,
    },
    targetAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    currentAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    targetDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'paused', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
    },
    autoContribution: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Automatic contribution amount per period',
    },
    contributionFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'bi-weekly', 'monthly'),
      allowNull: true,
    },
    reminderSettings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 'sunday',
      },
    },
    milestones: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of milestone objects with percentage and description',
    },
    completedDate: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'goals',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['target_date'],
      },
      {
        fields: ['user_id', 'status'],
      },
    ],
  });

  return Goal;
};