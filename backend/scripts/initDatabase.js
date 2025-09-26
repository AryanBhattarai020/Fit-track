const { sequelize } = require('../models');
const aiCategorization = require('../services/aiCategorization');

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing Fit Track database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync all models (create tables)
    await sequelize.sync({ force: false });
    console.log('✅ Database models synchronized.');
    
    // Initialize default categories
    await aiCategorization.initializeDefaultCategories();
    
    // Train the AI classifier
    await aiCategorization.trainClassifier();
    
    console.log('🎉 Database initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. The API will be available at http://localhost:3001');
    console.log('3. Health check: http://localhost:3001/health');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;