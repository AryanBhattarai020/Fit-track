const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.worker = await Tesseract.createWorker();
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
      this.isInitialized = true;
      console.log('✅ OCR Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OCR service:', error);
      throw error;
    }
  }

  async processReceipt(imagePath) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if file exists
      const fileExists = await fs.access(imagePath).then(() => true).catch(() => false);
      if (!fileExists) {
        throw new Error('Receipt image file not found');
      }

      // Perform OCR
      const { data: { text } } = await this.worker.recognize(imagePath);
      
      // Parse the extracted text
      const parsedData = this.parseReceiptText(text);
      
      return {
        rawText: text,
        ...parsedData,
        confidence: parsedData.amount && parsedData.merchantName ? 0.8 : 0.3
      };
    } catch (error) {
      console.error('Error processing receipt:', error);
      return {
        rawText: '',
        amount: null,
        merchantName: null,
        date: null,
        description: null,
        items: [],
        confidence: 0.0,
        error: error.message
      };
    }
  }

  parseReceiptText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const result = {
      amount: null,
      merchantName: null,
      date: null,
      description: null,
      items: []
    };

    // Extract merchant name (usually at the top)
    if (lines.length > 0) {
      // Look for merchant name in first few lines
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (this.isMerchantName(line)) {
          result.merchantName = this.cleanMerchantName(line);
          break;
        }
      }
    }

    // Extract total amount
    result.amount = this.extractTotalAmount(text);

    // Extract date
    result.date = this.extractDate(text);

    // Extract items
    result.items = this.extractItems(lines);

    // Generate description
    if (result.merchantName) {
      result.description = `Purchase at ${result.merchantName}`;
    } else {
      result.description = 'Receipt purchase';
    }

    return result;
  }

  isMerchantName(line) {
    // Skip common receipt header words
    const skipWords = [
      'receipt', 'customer', 'copy', 'thank', 'you', 'welcome', 'store',
      'location', 'address', 'phone', 'tel', 'fax', 'email', 'www'
    ];
    
    const lowerLine = line.toLowerCase();
    
    // Skip lines with mostly numbers or special characters
    if (/^[\d\s\-\.\,\(\)\#\*]+$/.test(line)) return false;
    
    // Skip very short lines
    if (line.length < 3) return false;
    
    // Skip lines that are mostly skip words
    const words = lowerLine.split(/\s+/);
    const skipCount = words.filter(word => skipWords.some(skip => word.includes(skip))).length;
    if (skipCount / words.length > 0.5) return false;
    
    // Prefer lines with common business words
    const businessWords = ['store', 'mart', 'shop', 'restaurant', 'cafe', 'inc', 'llc', 'corp', 'co'];
    const hasBusinessWord = businessWords.some(word => lowerLine.includes(word));
    
    // If it looks like a business name and isn't too long
    return (hasBusinessWord || words.length <= 4) && line.length <= 50;
  }

  cleanMerchantName(name) {
    return name
      .replace(/[#*]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  extractTotalAmount(text) {
    // Common total patterns
    const totalPatterns = [
      /(?:total|amount|sum)[\s:]*\$?(\d+\.?\d*)/i,
      /\$(\d+\.\d{2})\s*(?:total|amount)?/i,
      /(?:^|\s)(\d+\.\d{2})\s*(?:total|amount|$)/im,
      /(?:balance|due|pay)[\s:]*\$?(\d+\.?\d*)/i
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1]);
        if (amount > 0 && amount < 10000) { // Reasonable range
          return amount.toFixed(2);
        }
      }
    }

    // Fallback: look for the largest monetary amount
    const amounts = text.match(/\$?(\d{1,4}\.\d{2})/g);
    if (amounts) {
      const validAmounts = amounts
        .map(amt => parseFloat(amt.replace('$', '')))
        .filter(amt => amt > 0 && amt < 10000)
        .sort((a, b) => b - a);
      
      if (validAmounts.length > 0) {
        return validAmounts[0].toFixed(2);
      }
    }

    return null;
  }

  extractDate(text) {
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(\d{1,2}-\d{1,2}-\d{2,4})/,
      /(\d{4}-\d{1,2}-\d{1,2})/,
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        }
      }
    }

    return null;
  }

  extractItems(lines) {
    const items = [];
    const itemPattern = /^([A-Za-z][^$\d]*?)\s*[\$]?(\d+\.?\d*)(?:\s|$)/;

    for (const line of lines) {
      const match = line.match(itemPattern);
      if (match && match[1].length > 2) {
        const itemName = match[1].trim();
        const price = parseFloat(match[2]);
        
        if (price > 0 && price < 1000 && !this.isTotal(itemName)) {
          items.push({
            name: itemName,
            price: price.toFixed(2)
          });
        }
      }
    }

    return items.slice(0, 20); // Limit to 20 items
  }

  isTotal(text) {
    const totalWords = ['total', 'subtotal', 'tax', 'amount', 'balance', 'due', 'change'];
    const lowerText = text.toLowerCase();
    return totalWords.some(word => lowerText.includes(word));
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  // Method for testing OCR without saving to database
  async testOCR(imagePath) {
    try {
      const result = await this.processReceipt(imagePath);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const ocrService = new OCRService();

// Cleanup on process exit
process.on('exit', async () => {
  await ocrService.cleanup();
});

process.on('SIGINT', async () => {
  await ocrService.cleanup();
  process.exit(0);
});

module.exports = ocrService;