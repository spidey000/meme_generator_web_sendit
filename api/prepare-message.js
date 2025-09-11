const TelegramBot = require('node-telegram-bot-api');

// Initialize the bot with environment variable
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

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

  try {
    const { imageUrl, userId, caption = 'Check out this meme!' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    if (!userId) {
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

    console.log('Preparing message:', {
      imageUrl: absoluteImageUrl,
      userId,
      caption: caption.substring(0, 50) + '...',
      baseUrl
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

    // If the bot supports savePreparedInlineMessage, try to use it
    try {
      const savedMessage = await bot.savePreparedInlineMessage({
        result: {
          type: 'photo',
          id: messageId,
          photo_url: absoluteImageUrl,
          thumbnail_url: absoluteImageUrl,
          caption: caption
        },
        user_id: userId,
        peer_types: ['same_chat', 'pm', 'group', 'channel']
      });

      console.log('Message prepared successfully:', savedMessage);
      res.json({ msgId: savedMessage.id, imageUrl: absoluteImageUrl });

    } catch (botError) {
      console.warn('savePreparedInlineMessage failed, using fallback:', botError.message);
      
      // Fallback: return our own prepared message ID
      console.log('Using fallback message preparation');
      res.json({ 
        msgId: messageId, 
        imageUrl: absoluteImageUrl,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Message preparation error:', error);
    res.status(500).json({ 
      error: 'Failed to prepare message',
      details: error.message 
    });
  }
};