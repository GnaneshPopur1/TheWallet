const express = require('express');
const router = express.Router();
const multer = require('multer');
const tesseract = require('tesseract.js');
const { authenticateToken } = require('../../middleware/auth.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image receipts are supported'));
    }
    cb(null, true);
  },
});

router.post('/scan', authenticateToken, upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  try {
    // Run OCR
    const {
      data: { text },
    } = await tesseract.recognize(req.file.buffer, 'eng');

    // Simple regex to find a Total amount (e.g. Total: $12.34 or TOTAL 12.34)
    const totalRegex = /total[\s:]*[$]*([0-9]+\.[0-9]{2})/i;
    const match = text.match(totalRegex);
    let extractedTotal = null;

    if (match && match[1]) {
      extractedTotal = parseFloat(match[1]);
    }

    res.json({
      success: true,
      text: text,
      extractedTotal: extractedTotal,
    });
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'Failed to process receipt image' });
  }
});

module.exports = router;
