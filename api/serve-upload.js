const fs = require('fs');
const path = require('path');
const logger = require('../utils/vercelLogger');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    logger.info('Serve upload OPTIONS request', { method: 'OPTIONS', url: req.url });
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    logger.warn('Invalid method for serve upload', { method: req.method, url: req.url });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract filename from URL
  const filename = req.query.filename || req.params.filename;
  if (!filename) {
    logger.warn('No filename provided for serve upload', { url: req.url });
    return res.status(400).json({ error: 'Filename is required' });
  }

  // Start request tracing
  const requestId = logger.startRequest(req, { operation: 'serve_upload', filename });
  logger.logApiOperation('/api/serve-upload', 'GET', { requestId, filename });

  try {
    // Construct the file path in /tmp/uploads
    const filePath = path.join('/tmp/uploads', filename);
    
    // Security check to prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith('/tmp/uploads/')) {
      logger.error('Potential directory traversal attempt', { 
        filename, 
        filePath: normalizedPath,
        requestId 
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    logger.debug('Attempting to serve file', { 
      filename, 
      filePath: normalizedPath,
      requestId 
    });

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      logger.warn('File not found', { 
        filename, 
        filePath: normalizedPath,
        requestId 
      });
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(normalizedPath);
    
    // Set appropriate content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    // Set cache headers for better performance
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('ETag', `"${stats.size}-${stats.mtime.getTime()}"`);

    logger.info('Serving file successfully', { 
      filename, 
      size: stats.size,
      contentType,
      requestId 
    });

    // Stream the file
    const fileStream = fs.createReadStream(normalizedPath);
    fileStream.pipe(res);

    logger.endRequest(requestId, { 
      statusCode: 200, 
      size: stats.size,
      contentType 
    });

  } catch (error) {
    logger.error('Error serving uploaded file', {
      error: error.message,
      filename,
      requestId,
      stack: error.stack
    });
    
    res.status(500).json({ error: 'Failed to serve file' });
    logger.endRequest(requestId, { 
      statusCode: 500, 
      error: error.message 
    });
  }
};