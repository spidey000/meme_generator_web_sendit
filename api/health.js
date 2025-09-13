/**
 * Enhanced health check endpoint for monitoring and deployment verification
 * Includes bot-specific connectivity tests and comprehensive service monitoring
 */

const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const http = require('http');
const logger = require('../utils/vercelLogger');

module.exports = async (req, res) => {
  const startTime = Date.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    logger.info('Health check OPTIONS request', { method: 'OPTIONS', url: req.url });
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    logger.warn('Invalid method for health check', { method: req.method, url: req.url });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Start request tracing
  const requestId = logger.startRequest(req, { operation: 'health_check' });
  logger.logApiOperation('/api/health', 'GET', { requestId });

  try {
    logger.debug('Starting health check analysis');
    
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      response_time_ms: Date.now() - startTime,
      services: {
        telegram: {
          configured: !!process.env.TELEGRAM_BOT_TOKEN,
          token_prefix: process.env.TELEGRAM_BOT_TOKEN ?
            process.env.TELEGRAM_BOT_TOKEN.substring(0, 8) + '...' : null,
          bot_api_connectivity: 'unknown',
          bot_info: null,
          token_valid: false,
          token_error: null
        },
        vercel: {
          url: process.env.VERCEL_URL || null,
          region: process.env.VERCEL_REGION || 'unknown'
        },
        endpoints: {
          upload_image: {
            path: '/api/upload-image',
            status: 'unknown'
          },
          prepare_message: {
            path: '/api/prepare-message',
            status: 'unknown'
          },
          bot_test: {
            path: '/api/bot-test',
            status: 'unknown'
          },
          health: {
            path: '/api/health',
            status: 'operational'
          }
        }
      }
    };

    // Enhanced Telegram bot connectivity tests
    if (process.env.TELEGRAM_BOT_TOKEN) {
      logger.debug('Testing Telegram bot connectivity');
      const telegramTestStart = Date.now();
      
      try {
        // Basic validation of token format
        const tokenParts = process.env.TELEGRAM_BOT_TOKEN.split(':');
        if (tokenParts.length === 2 && tokenParts[0].match(/^\d+$/)) {
          healthCheck.services.telegram.token_valid = true;
          logger.info('Telegram token format is valid');
          
          // Test actual bot connectivity with timeout
          const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Bot API connection timeout')), 5000);
          });
          
          const botInfoPromise = bot.getMe();
          
          try {
            const botInfo = await Promise.race([botInfoPromise, timeoutPromise]);
            healthCheck.services.telegram.bot_api_connectivity = 'connected';
            healthCheck.services.telegram.bot_info = {
              id: botInfo.id,
              username: botInfo.username,
              first_name: botInfo.first_name,
              is_bot: botInfo.is_bot
            };
            logger.logBotOperation('connectivity_test', {
              success: true,
              duration: Date.now() - telegramTestStart,
              botId: botInfo.id,
              username: botInfo.username
            });
          } catch (botError) {
            healthCheck.services.telegram.bot_api_connectivity = 'failed';
            healthCheck.services.telegram.bot_error = botError.message;
            logger.warn('Telegram bot connectivity test failed', {
              error: botError.message,
              duration: Date.now() - telegramTestStart
            });
          }
          
        } else {
          healthCheck.services.telegram.token_valid = false;
          healthCheck.services.telegram.token_error = 'Invalid token format';
          logger.warn('Telegram token format is invalid');
        }
      } catch (error) {
        healthCheck.services.telegram.token_valid = false;
        healthCheck.services.telegram.token_error = error.message;
        logger.error('Telegram configuration validation failed', { error });
      }
    } else {
      logger.info('Telegram bot token not configured');
    }

    // Test API endpoint availability
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : req.headers.host
        ? `${req.protocol}://${req.headers.host}`
        : 'http://localhost:5173';

    logger.debug('Testing API endpoint availability', { baseUrl });

    const endpointsToTest = [
      { key: 'upload_image', method: 'POST' },
      { key: 'prepare_message', method: 'POST' },
      { key: 'bot_test', method: 'POST' }
    ];

    for (const endpoint of endpointsToTest) {
      logger.debug(`Testing endpoint: ${endpoint.key}`);
      try {
        const testResult = await testEndpointAvailability(baseUrl, endpoint.key, endpoint.method);
        healthCheck.services.endpoints[endpoint.key].status = testResult.status;
        healthCheck.services.endpoints[endpoint.key].response_time = testResult.responseTime;
        if (testResult.error) {
          healthCheck.services.endpoints[endpoint.key].error = testResult.error;
          logger.warn(`Endpoint test failed: ${endpoint.key}`, { error: testResult.error });
        } else {
          logger.info(`Endpoint test passed: ${endpoint.key}`, {
            status: testResult.status,
            responseTime: testResult.responseTime
          });
        }
      } catch (error) {
        healthCheck.services.endpoints[endpoint.key].status = 'unreachable';
        healthCheck.services.endpoints[endpoint.key].error = error.message;
        logger.error(`Endpoint test error: ${endpoint.key}`, { error });
      }
    }

    // Test Web App integration capability
    healthCheck.services.web_app_integration = {
      available: true, // Always available as this is the server-side check
      documentation_url: 'https://core.telegram.org/bots/webapps'
    };

    // Calculate overall health status
    const allEndpointsOperational = Object.values(healthCheck.services.endpoints)
      .every(endpoint => endpoint.status === 'operational' || endpoint.status === 'reachable');
    
    const botHealthy = healthCheck.services.telegram.bot_api_connectivity === 'connected' || 
                      !process.env.TELEGRAM_BOT_TOKEN;

    if (!allEndpointsOperational || !botHealthy) {
      healthCheck.status = 'degraded';
      logger.warn('Health check status is degraded', {
        allEndpointsOperational,
        botHealthy,
        endpointCount: Object.keys(healthCheck.services.endpoints).length
      });
    } else {
      logger.info('Health check completed successfully', {
        status: healthCheck.status,
        duration: Date.now() - startTime,
        endpointCount: Object.keys(healthCheck.services.endpoints).length
      });
    }

    const response = {
      ...healthCheck,
      requestId
    };

    res.status(200).json(response);
    logger.endRequest(requestId, { statusCode: 200, size: JSON.stringify(response).length });

  } catch (error) {
    logger.error('Health check failed', {
      error,
      duration: Date.now() - startTime,
      stack: error.stack
    });
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - startTime,
      error: error.message,
      requestId
    };
    
    res.status(500).json(errorResponse);
    logger.endRequest(requestId, { statusCode: 500, error: error.message });
  }
};

/**
 * Test if an endpoint is available with a simple OPTIONS request
 */
function testEndpointAvailability(baseUrl, endpointPath, method = 'GET') {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = `${baseUrl}/api/${endpointPath}`;
    
    // Use HTTP for local testing, HTTPS for production
    const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    const httpModule = isLocal ? http : https;
    
    const req = httpModule.request(url, {
      method: 'OPTIONS',
      timeout: 3000,
      headers: {
        'Origin': baseUrl,
        'Access-Control-Request-Method': method,
        'Access-Control-Request-Headers': 'Content-Type'
      }
    }, (res) => {
      const responseTime = Date.now() - startTime;
      
      if (res.statusCode === 200 || res.statusCode === 204) {
        resolve({
          status: 'operational',
          responseTime,
          headers: res.headers
        });
      } else {
        resolve({
          status: 'reachable',
          responseTime,
          error: `HTTP ${res.statusCode}`
        });
      }
    });

    req.on('error', (error) => {
      resolve({
        status: 'unreachable',
        responseTime: Date.now() - startTime,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'timeout',
        responseTime: Date.now() - startTime,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}