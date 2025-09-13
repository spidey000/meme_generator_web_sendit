const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/vercelLogger');

// Initialize the bot with environment variable
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

module.exports = async (req, res) => {
  const prepareStartTime = Date.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    logger.info('Message preparation OPTIONS request', { method: 'OPTIONS', url: req.url });
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    logger.warn('Invalid method for message preparation', { method: req.method, url: req.url });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Start request tracing
  const requestId = logger.startRequest(req, { operation: 'message_preparation' });
  logger.logApiOperation('/api/prepare-message', 'POST', { requestId });

  try {
    const { imageUrl, userId, caption = 'Check out this meme!' } = req.body;

    if (!imageUrl) {
      logger.warn('Image URL missing in message preparation', { requestId, body: req.body });
      return res.status(400).json({ error: 'Image URL is required' });
    }

    if (!userId) {
      logger.warn('User ID missing in message preparation', { requestId, body: req.body });
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get the base URL for the current deployment
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : req.headers.host
        ? `${req.protocol}://${req.headers.host}`
        : 'http://localhost:5173';

    // Make the image URL absolute
    const absoluteImageUrl = imageUrl.startsWith('http')
      ? imageUrl
      : `${baseUrl}${imageUrl}`;

    logger.info('Preparing message', {
      imageUrl: absoluteImageUrl,
      userId,
      caption: caption.substring(0, 50) + '...',
      baseUrl,
      requestId
    });

    // Create a unique message ID
    const messageId = `meme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // For inline message preparation, we'll simulate the response
    // since savePreparedInlineMessage might not be available in all bot versions
    const preparedMessage = {
      id: messageId,
      result: {
        type: 'photo',
        id: messageId,
        photo_url: absoluteImageUrl,
        thumbnail_url: absoluteImageUrl,
        caption: caption
      },
      user_id: userId,
      peer_types: ['same_chat', 'pm', 'group', 'channel']
    };

    // Use local ID generation since savePreparedInlineMessage is not available
    logger.debug('Using fallback message preparation', { userId, messageId });
    
    const response = {
      msgId: messageId,
      imageUrl: absoluteImageUrl,
      fallback: true,
      requestId
    };
    
    res.json(response);
    logger.endRequest(requestId, { statusCode: 200, size: JSON.stringify(response).length });

  } catch (error) {
    logger.error('Message preparation error', {
      error,
      requestId,
      body: { imageUrl: req.body?.imageUrl, userId: req.body?.userId },
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Failed to prepare message',
      details: error.message,
      requestId
    });
    
    logger.endRequest(requestId, { statusCode: 500, error: error.message });
  }
};