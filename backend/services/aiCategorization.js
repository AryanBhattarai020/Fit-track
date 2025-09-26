const natural = require('natural');
const { Category } = require('../models');

// Default categories with keywords for training
const DEFAULT_CATEGORIES = [
  {
    name: 'Food & Dining',
    keywords: ['restaurant', 'food', 'dining', 'cafe', 'pizza', 'burger', 'grocery', 'supermarket', 'starbucks', 'mcdonalds', 'subway', 'chipotle', 'dominos'],
    icon: 'utensils',
    color: '#f59e0b'
  },
  {
    name: 'Transportation',
    keywords: ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'metro', 'bus', 'train', 'airline', 'flight', 'car', 'auto'],
    icon: 'car',
    color: '#3b82f6'
  },
  {
    name: 'Shopping',
    keywords: ['amazon', 'target', 'walmart', 'store', 'mall', 'shopping', 'clothes', 'clothing', 'shoes', 'electronics', 'best buy'],
    icon: 'shopping-bag',
    color: '#ec4899'
  },
  {
    name: 'Entertainment',
    keywords: ['movie', 'cinema', 'netflix', 'spotify', 'game', 'concert', 'theater', 'museum', 'park', 'entertainment'],
    icon: 'film',
    color: '#8b5cf6'
  },
  {
    name: 'Health & Fitness',
    keywords: ['doctor', 'hospital', 'pharmacy', 'gym', 'fitness', 'yoga', 'medical', 'health', 'dentist', 'clinic'],
    icon: 'heart',
    color: '#10b981'
  },
  {
    name: 'Bills & Utilities',
    keywords: ['electric', 'electricity', 'water', 'gas', 'internet', 'phone', 'utility', 'bill', 'rent', 'mortgage', 'insurance'],
    icon: 'receipt',
    color: '#f97316'
  },
  {
    name: 'Personal Care',
    keywords: ['salon', 'haircut', 'spa', 'beauty', 'cosmetics', 'personal', 'hygiene', 'barber'],
    icon: 'user',
    color: '#06b6d4'
  },
  {
    name: 'Education',
    keywords: ['school', 'university', 'course', 'book', 'education', 'tuition', 'learning', 'training'],
    icon: 'graduation-cap',
    color: '#84cc16'
  },
  {
    name: 'Travel',
    keywords: ['hotel', 'airbnb', 'booking', 'travel', 'vacation', 'trip', 'resort', 'flight', 'airline'],
    icon: 'plane',
    color: '#f43f5e'
  },
  {
    name: 'Other',
    keywords: [],
    icon: 'more-horizontal',
    color: '#6b7280'
  }
];

class AICategorization {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.classifier = new natural.BayesClassifier();
    this.isTrained = false;
    this.categoryCache = new Map();
  }

  async initializeDefaultCategories() {
    try {
      for (const categoryData of DEFAULT_CATEGORIES) {
        const [category] = await Category.findOrCreate({
          where: { name: categoryData.name, isDefault: true },
          defaults: {
            ...categoryData,
            isDefault: true,
            keywords: categoryData.keywords
          }
        });
      }
      console.log('✅ Default categories initialized');
    } catch (error) {
      console.error('Error initializing default categories:', error);
    }
  }

  async trainClassifier() {
    try {
      const categories = await Category.findAll({
        where: { isDefault: true, isActive: true }
      });

      // Clear existing training data
      this.classifier = new natural.BayesClassifier();

      // Train with category keywords
      for (const category of categories) {
        const keywords = category.keywords || [];
        for (const keyword of keywords) {
          // Add variations of keywords
          this.classifier.addDocument(keyword.toLowerCase(), category.name);
          this.classifier.addDocument(`${keyword} store`, category.name);
          this.classifier.addDocument(`${keyword} payment`, category.name);
        }
      }

      // Train the classifier
      this.classifier.train();
      this.isTrained = true;
      
      console.log('✅ AI Classifier trained successfully');
    } catch (error) {
      console.error('Error training classifier:', error);
      this.isTrained = false;
    }
  }

  preprocessText(text) {
    if (!text) return '';
    
    // Convert to lowercase and remove special characters
    const cleaned = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Tokenize and stem
    const tokens = this.tokenizer.tokenize(cleaned);
    return tokens.map(token => this.stemmer.stem(token)).join(' ');
  }

  async categorizeTransaction(description, merchantName, amount) {
    try {
      if (!this.isTrained) {
        await this.trainClassifier();
      }

      // Combine description and merchant name for better context
      const fullText = `${description || ''} ${merchantName || ''}`.trim();
      const processedText = this.preprocessText(fullText);

      if (!processedText) {
        return this.getDefaultCategory();
      }

      // Check cache first
      const cacheKey = processedText.substring(0, 50);
      if (this.categoryCache.has(cacheKey)) {
        return this.categoryCache.get(cacheKey);
      }

      // Use classifier to predict category
      const classifications = this.classifier.getClassifications(processedText);
      
      if (classifications.length === 0) {
        return this.getDefaultCategory();
      }

      // Get the best classification
      const bestMatch = classifications[0];
      const confidence = bestMatch.value;

      // Find the category in database
      const category = await Category.findOne({
        where: { name: bestMatch.label, isActive: true }
      });

      if (!category) {
        return this.getDefaultCategory();
      }

      const result = {
        categoryId: category.id,
        categoryName: category.name,
        confidence: Math.round(confidence * 100) / 100,
        icon: category.icon,
        color: category.color
      };

      // Cache the result
      this.categoryCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error in AI categorization:', error);
      return this.getDefaultCategory();
    }
  }

  async getDefaultCategory() {
    try {
      const defaultCategory = await Category.findOne({
        where: { name: 'Other', isDefault: true }
      });
      
      return {
        categoryId: defaultCategory?.id || null,
        categoryName: 'Other',
        confidence: 0.1,
        icon: 'more-horizontal',
        color: '#6b7280'
      };
    } catch (error) {
      console.error('Error getting default category:', error);
      return {
        categoryId: null,
        categoryName: 'Other',
        confidence: 0.1,
        icon: 'more-horizontal',
        color: '#6b7280'
      };
    }
  }

  async updateCategoryKeywords(categoryId, newKeywords) {
    try {
      const category = await Category.findByPk(categoryId);
      if (!category) return false;

      const existingKeywords = category.keywords || [];
      const updatedKeywords = [...new Set([...existingKeywords, ...newKeywords])];
      
      await category.update({ keywords: updatedKeywords });
      
      // Retrain classifier with new keywords
      await this.trainClassifier();
      
      return true;
    } catch (error) {
      console.error('Error updating category keywords:', error);
      return false;
    }
  }

  async learnFromUserCorrection(description, merchantName, correctCategoryId) {
    try {
      const category = await Category.findByPk(correctCategoryId);
      if (!category) return false;

      const processedText = this.preprocessText(`${description || ''} ${merchantName || ''}`);
      const tokens = this.tokenizer.tokenize(processedText);
      
      // Extract meaningful tokens (longer than 2 characters)
      const meaningfulTokens = tokens.filter(token => token.length > 2);
      
      if (meaningfulTokens.length > 0) {
        await this.updateCategoryKeywords(correctCategoryId, meaningfulTokens.slice(0, 3));
      }

      return true;
    } catch (error) {
      console.error('Error learning from user correction:', error);
      return false;
    }
  }

  // Analyze spending patterns
  async analyzeSpendingPatterns(transactions) {
    try {
      const patterns = {
        dayOfWeek: {},
        timeOfDay: {},
        merchantFrequency: {},
        categoryTrends: {},
        averageAmounts: {}
      };

      for (const transaction of transactions) {
        const date = new Date(transaction.transactionDate);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = date.getHours();
        const timeSlot = this.getTimeSlot(hour);

        // Day of week patterns
        patterns.dayOfWeek[dayOfWeek] = (patterns.dayOfWeek[dayOfWeek] || 0) + parseFloat(transaction.amount);

        // Time of day patterns
        patterns.timeOfDay[timeSlot] = (patterns.timeOfDay[timeSlot] || 0) + parseFloat(transaction.amount);

        // Merchant frequency
        if (transaction.merchantName) {
          patterns.merchantFrequency[transaction.merchantName] = 
            (patterns.merchantFrequency[transaction.merchantName] || 0) + 1;
        }

        // Category trends
        const categoryName = transaction.Category?.name || 'Other';
        if (!patterns.categoryTrends[categoryName]) {
          patterns.categoryTrends[categoryName] = [];
        }
        patterns.categoryTrends[categoryName].push({
          amount: parseFloat(transaction.amount),
          date: transaction.transactionDate
        });
      }

      return patterns;
    } catch (error) {
      console.error('Error analyzing spending patterns:', error);
      return null;
    }
  }

  getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 22) return 'Evening';
    return 'Night';
  }

  clearCache() {
    this.categoryCache.clear();
  }
}

// Create singleton instance
const aiCategorization = new AICategorization();

module.exports = aiCategorization;