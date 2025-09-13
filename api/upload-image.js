const multer = require('multer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/vercelLogger');

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      logger.debug('File filter: Image file accepted', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
      cb(null, true);
    } else {
      logger.warn('File filter: Non-image file rejected', {
        filename: file.originalname,
        mimetype: file.mimetype
      });
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

module.exports = async (req, res) => {
  const uploadStartTime = Date.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    logger.info('Image upload OPTIONS request', { method: 'OPTIONS', url: req.url });
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    logger.warn('Invalid method for image upload', { method: req.method, url: req.url });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Start request tracing
  const requestId = logger.startRequest(req, { operation: 'image_upload' });
  logger.logApiOperation('/api/upload-image', 'POST', { requestId });

  upload.single('image')(req, res, async (err) => {
    if (err) {
      logger.error('Upload middleware error', {
        error: err.message,
        requestId,
        errorType: err.code || 'middleware_error'
      });
      return res.status(500).json({ error: err.message });
    }

    if (!req.file) {
      logger.warn('No image file provided in upload request', { requestId });
      return res.status(400).json({ error: 'No image file provided' });
    }

    try {
      logger.info('Processing uploaded image', {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        requestId
      });

      // Create a unique filename
      const uniqueId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const filename = `meme-${uniqueId}.png`;
      
      // For Vercel deployment, use public directory for static file serving
      // This allows Vercel to serve the files statically
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        logger.debug('Creating uploads directory', { uploadDir });
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Move the file to our uploads directory
      const filePath = path.join(uploadDir, filename);
      logger.debug('Moving uploaded file to final location', {
        from: req.file.path,
        to: filePath
      });
      
      fs.renameSync(req.file.path, filePath);

      // Create a public URL that works with Vercel static serving
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:5173';
      const publicUrl = `${baseUrl}/uploads/${filename}`;

      logger.logBotOperation('image_upload', {
        success: true,
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        publicUrl,
        duration: Date.now() - uploadStartTime,
        requestId
      });

      const response = {
        imageUrl: publicUrl,
        filename: filename,
        size: req.file.size,
        requestId
      };

      res.json(response);
      logger.endRequest(requestId, { statusCode: 200, size: JSON.stringify(response).length });

    } catch (error) {
      logger.error('Image processing error', {
        error,
        requestId,
        filename: req.file?.originalname,
        stack: error.stack
      });
      
      // Clean up temporary file if it exists
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          logger.debug('Cleaned up temporary file', { filePath: req.file.path });
        } catch (cleanupError) {
          logger.warn('Failed to cleanup temporary file', {
            error: cleanupError.message,
            filePath: req.file.path
          });
        }
      }
      
      res.status(500).json({ error: 'Failed to process image' });
      logger.endRequest(requestId, { statusCode: 500, error: error.message });
    }
  });
};