/**
 * Client log endpoint for receiving client-side logs from Telegram bot
 * Integrates with Vercel logging system to provide comprehensive visibility
 */

const logger = require('../utils/vercelLogger');

module.exports = async (req, res) => {
  const logStartTime = Date.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    logger.info('Client log OPTIONS request', { method: 'OPTIONS', url: req.url });
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    logger.warn('Invalid method for client log', { method: req.method, url: req.url });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Start request tracing
  const requestId = logger.startRequest(req, { operation: 'client_log' });
  logger.logApiOperation('/api/client-log', 'POST', { requestId });

  try {
    const clientLog = req.body;

    if (!clientLog || !clientLog.operation || !clientLog.message) {
      logger.warn('Invalid client log format', { 
        requestId, 
        body: req.body 
      });
      return res.status(400).json({ error: 'Invalid log format' });
    }

    // Log the client-side entry with enhanced context
    logger.info('Client log received', {
      ...clientLog,
      requestId,
      category: 'client_side',
      source: 'telegram_bot_client'
    });

    // Log performance metrics if present
    if (clientLog.duration) {
      logger.logPerformance('client_operation', clientLog.duration, {
        operation: clientLog.operation,
        platform: clientLog.platform,
        isTelegram: clientLog.isTelegram,
        userId: clientLog.userId
      });
    }

    // Log user interactions
    if (clientLog.userId && clientLog.operation.includes('share')) {
      logger.logUserInteraction(clientLog.userId, clientLog.operation, {
        platform: clientLog.platform,
        duration: clientLog.duration,
        success: !clientLog.level || clientLog.level !== 'ERROR'
      });
    }

    // Log bot operations
    if (clientLog.operation.includes('bot') || clientLog.operation.includes('telegram')) {
      logger.logBotOperation(clientLog.operation, {
        success: clientLog.level !== 'ERROR',
        duration: clientLog.duration,
        platform: clientLog.platform,
        userId: clientLog.userId,
        clientSide: true
      });
    }

    const response = { 
      success: true, 
      requestId,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
    logger.endRequest(requestId, { statusCode: 200, size: JSON.stringify(response).length });

  } catch (error) {
    logger.error('Client log processing error', { 
      error, 
      requestId,
      body: req.body,
      stack: error.stack 
    });
    
    res.status(500).json({ 
      error: 'Failed to process client log',
      requestId
    });
    
    logger.endRequest(requestId, { statusCode: 500, error: error.message });
  }
};