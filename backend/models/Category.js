const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'category',
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#6366f1',
      validate: {
        isHexColor: function(value) {
          if (!/^#[0-9A-F]{6}$/i.test(value)) {
            throw new Error('Color must be a valid hex color code');
          }
        },
      },
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    keywords: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Keywords for AI categorization',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    monthlyBudgetSuggestion: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'AI suggested monthly budget for this category',
    },
  }, {
    tableName: 'categories',
    indexes: [
      {
        fields: ['parent_id'],
      },
      {
        fields: ['is_default'],
      },
      {
        fields: ['sort_order'],
      },
    ],
  });

  // Self-referencing association for parent-child relationships
  Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parentId' });
  Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

  return Category;
};