/**
 * Health check endpoint for monitoring and deployment verification
 */

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        telegram: {
          configured: !!process.env.TELEGRAM_BOT_TOKEN,
          token_prefix: process.env.TELEGRAM_BOT_TOKEN ? 
            process.env.TELEGRAM_BOT_TOKEN.substring(0, 8) + '...' : null
        },
        vercel: {
          url: process.env.VERCEL_URL || null,
          region: process.env.VERCEL_REGION || 'unknown'
        }
      },
      endpoints: {
        upload_image: '/api/upload-image',
        prepare_message: '/api/prepare-message',
        health: '/api/health'
      }
    };

    // Check if we can access the Telegram bot token
    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        // Basic validation of token format
        const tokenParts = process.env.TELEGRAM_BOT_TOKEN.split(':');
        if (tokenParts.length === 2 && tokenParts[0].match(/^\d+$/)) {
          healthCheck.services.telegram.token_valid = true;
        } else {
          healthCheck.services.telegram.token_valid = false;
          healthCheck.services.telegram.token_error = 'Invalid token format';
        }
      } catch (error) {
        healthCheck.services.telegram.token_valid = false;
        healthCheck.services.telegram.token_error = error.message;
      }
    }

    res.status(200).json(healthCheck);

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};