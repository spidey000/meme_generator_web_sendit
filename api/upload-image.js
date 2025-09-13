const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({ 
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    try {
      // Create a unique filename
      const uniqueId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const filename = `meme-${uniqueId}.png`;
      
      // For Vercel deployment, use public directory for static file serving
      // This allows Vercel to serve the files statically
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Move the file to our uploads directory
      const filePath = path.join(uploadDir, filename);
      fs.renameSync(req.file.path, filePath);

      // Create a public URL that works with Vercel static serving
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:5173';
      const publicUrl = `${baseUrl}/uploads/${filename}`;

      console.log('Image uploaded successfully:', {
        filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        publicUrl
      });

      res.json({ 
        imageUrl: publicUrl,
        filename: filename,
        size: req.file.size
      });

    } catch (error) {
      console.error('Image processing error:', error);
      res.status(500).json({ error: 'Failed to process image' });
    }
  });
};