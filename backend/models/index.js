const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database/finetrack.db'),
  logging: console.log,
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Import models
const User = require('./User')(sequelize);
const Transaction = require('./Transaction')(sequelize);
const Category = require('./Category')(sequelize);
const Budget = require('./Budget')(sequelize);
const Goal = require('./Goal')(sequelize);
const AIInsight = require('./AIInsight')(sequelize);

// Define associations
User.hasMany(Transaction, { foreignKey: 'user_id' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

Category.hasMany(Transaction, { foreignKey: 'category_id' });
Transaction.belongsTo(Category, { foreignKey: 'category_id' });

User.hasMany(Budget, { foreignKey: 'user_id' });
Budget.belongsTo(User, { foreignKey: 'user_id' });

Category.hasMany(Budget, { foreignKey: 'category_id' });
Budget.belongsTo(Category, { foreignKey: 'category_id' });

User.hasMany(Goal, { foreignKey: 'user_id' });
Goal.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(AIInsight, { foreignKey: 'user_id' });
AIInsight.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Transaction,
  Category,
  Budget,
  Goal,
  AIInsight,
};