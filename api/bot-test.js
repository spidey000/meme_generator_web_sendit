/**
 * Comprehensive bot testing endpoint
 * Performs actual bot operations testing including:
 * - Image upload → message preparation → bot sharing flow
 * - Bot connectivity and functionality tests
 * - Detailed timing and diagnostics
 */

const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/vercelLogger');

module.exports = async (req, res) => {
  const testStartTime = Date.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    logger.info('Bot test OPTIONS request', { method: 'OPTIONS', url: req.url });
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    logger.warn('Invalid method for bot test', { method: req.method, url: req.url });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Start request tracing
  const requestId = logger.startRequest(req, { operation: 'bot_test' });
  logger.logApiOperation('/api/bot-test', 'POST', { requestId });

  try {
    const { testType = 'full', detailed = false } = req.body;
    
    logger.info('Starting bot test', {
      testType,
      detailed,
      requestId,
      userAgent: req.headers['user-agent']
    });
    
    const testResults = {
      test_id: `bot-test-${Date.now()}`,
      test_type: testType,
      timestamp: new Date().toISOString(),
      overall_status: 'running',
      total_duration_ms: 0,
      phases: {},
      diagnostics: {
        environment: {
          node_env: process.env.NODE_ENV,
          vercel_url: process.env.VERCEL_URL,
          telegram_configured: !!process.env.TELEGRAM_BOT_TOKEN,
          vercel_region: process.env.VERCEL_REGION
        },
        issues: [],
        recommendations: [],
        warnings: []
      }
    };

    // Phase 1: Environment and Configuration Check
    logger.debug('Starting environment configuration check');
    const envCheckStart = Date.now();
    try {
      testResults.phases.environment_check = await testEnvironmentConfiguration();
      if (!testResults.phases.environment_check.success) {
        testResults.overall_status = 'failed';
        testResults.diagnostics.issues.push(...testResults.phases.environment_check.issues);
        logger.error('Environment configuration check failed', {
          issues: testResults.phases.environment_check.issues,
          duration: testResults.phases.environment_check.duration_ms
        });
      } else {
        logger.info('Environment configuration check passed', {
          duration: testResults.phases.environment_check.duration_ms
        });
      }
    } catch (error) {
      testResults.phases.environment_check = {
        success: false,
        duration_ms: Date.now() - envCheckStart,
        error: error.message,
        issues: [error.message]
      };
      logger.error('Environment configuration check error', { error });
    }

    // Phase 2: Bot Connectivity Test
    if (testResults.phases.environment_check.success && process.env.TELEGRAM_BOT_TOKEN) {
      logger.debug('Starting bot connectivity test');
      const botConnectStart = Date.now();
      try {
        testResults.phases.bot_connectivity = await testBotConnectivity();
        if (!testResults.phases.bot_connectivity.success) {
          testResults.overall_status = 'degraded';
          testResults.diagnostics.issues.push(...testResults.phases.bot_connectivity.issues);
          logger.warn('Bot connectivity test failed', {
            issues: testResults.phases.bot_connectivity.issues,
            duration: testResults.phases.bot_connectivity.duration_ms
          });
        } else {
          logger.logBotOperation('connectivity_test', {
            success: true,
            duration: testResults.phases.bot_connectivity.duration_ms,
            botInfo: testResults.phases.bot_connectivity.bot_info
          });
        }
      } catch (error) {
        testResults.phases.bot_connectivity = {
          success: false,
          duration_ms: Date.now() - botConnectStart,
          error: error.message,
          issues: [error.message]
        };
        logger.error('Bot connectivity test error', { error });
      }
    }

    // Phase 3: API Endpoint Tests
    logger.debug('Starting API endpoint tests');
    const apiTestStart = Date.now();
    try {
      testResults.phases.api_endpoints = await testApiEndpoints();
      if (!testResults.phases.api_endpoints.success) {
        testResults.overall_status = 'degraded';
        testResults.diagnostics.issues.push(...testResults.phases.api_endpoints.issues);
        logger.warn('API endpoint tests failed', {
          issues: testResults.phases.api_endpoints.issues,
          duration: testResults.phases.api_endpoints.duration_ms
        });
      } else {
        logger.info('API endpoint tests passed', {
          duration: testResults.phases.api_endpoints.duration_ms,
          endpointsTested: Object.keys(testResults.phases.api_endpoints.endpoints || {}).length
        });
      }
    } catch (error) {
      testResults.phases.api_endpoints = {
        success: false,
        duration_ms: Date.now() - apiTestStart,
        error: error.message,
        issues: [error.message]
      };
      logger.error('API endpoint tests error', { error });
    }

    // Phase 4: Complete Flow Test (only if previous phases succeeded and testType is 'full')
    if (testType === 'full' && testResults.overall_status === 'running') {
      logger.debug('Starting complete flow test');
      const flowTestStart = Date.now();
      try {
        testResults.phases.complete_flow = await testCompleteFlow();
        if (!testResults.phases.complete_flow.success) {
          testResults.overall_status = 'degraded';
          testResults.diagnostics.issues.push(...testResults.phases.complete_flow.issues);
          logger.warn('Complete flow test failed', {
            issues: testResults.phases.complete_flow.issues,
            duration: testResults.phases.complete_flow.duration_ms
          });
        } else {
          logger.logBotOperation('complete_flow_test', {
            success: true,
            duration: testResults.phases.complete_flow.duration_ms,
            steps: Object.keys(testResults.phases.complete_flow.steps || {}).length
          });
        }
      } catch (error) {
        testResults.phases.complete_flow = {
          success: false,
          duration_ms: Date.now() - flowTestStart,
          error: error.message,
          issues: [error.message]
        };
        logger.error('Complete flow test error', { error });
      }
    }

    // Calculate final status and timing
    testResults.total_duration_ms = Date.now() - testStartTime;
    
    if (testResults.overall_status === 'running') {
      testResults.overall_status = 'success';
    }

    // Add recommendations based on test results
    generateRecommendations(testResults);

    logger.info('Bot test completed', {
      test_id: testResults.test_id,
      status: testResults.overall_status,
      duration: testResults.total_duration_ms,
      phases_count: Object.keys(testResults.phases).length,
      issues_count: testResults.diagnostics.issues.length,
      recommendations_count: testResults.diagnostics.recommendations.length
    });

    const statusCode = testResults.overall_status === 'success' ? 200 :
                      testResults.overall_status === 'degraded' ? 200 : 500;

    const response = {
      ...testResults,
      requestId
    };

    res.status(statusCode).json(response);
    logger.endRequest(requestId, { statusCode, size: JSON.stringify(response).length });

  } catch (error) {
    logger.error('Bot test endpoint failed', {
      error,
      duration: Date.now() - testStartTime,
      stack: error.stack
    });
    
    const errorResponse = {
      test_id: `bot-test-error-${Date.now()}`,
      timestamp: new Date().toISOString(),
      overall_status: 'error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      requestId
    };
    
    res.status(500).json(errorResponse);
    logger.endRequest(requestId, { statusCode: 500, error: error.message });
  }
};

/**
 * Test environment configuration
 */
async function testEnvironmentConfiguration() {
  const startTime = Date.now();
  const issues = [];

  logger.debug('Testing environment configuration');

  // Check Telegram bot token
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    issues.push('TELEGRAM_BOT_TOKEN environment variable is not configured');
    logger.warn('TELEGRAM_BOT_TOKEN not configured');
  } else {
    // Validate token format
    const tokenParts = process.env.TELEGRAM_BOT_TOKEN.split(':');
    if (tokenParts.length !== 2 || !tokenParts[0].match(/^\d+$/)) {
      issues.push('TELEGRAM_BOT_TOKEN format is invalid (should be "数字:字符串")');
      logger.warn('TELEGRAM_BOT_TOKEN format is invalid');
    } else {
      logger.debug('TELEGRAM_BOT_TOKEN format is valid');
    }
  }

  // Check Vercel configuration
  if (!process.env.VERCEL_URL && process.env.NODE_ENV === 'production') {
    issues.push('VERCEL_URL environment variable is not configured for production');
    logger.warn('VERCEL_URL not configured for production');
  } else {
    logger.debug('Vercel configuration is valid');
  }

  const result = {
    success: issues.length === 0,
    duration_ms: Date.now() - startTime,
    checks: {
      telegram_token_configured: !!process.env.TELEGRAM_BOT_TOKEN,
      telegram_token_valid: issues.filter(issue => issue.includes('format')).length === 0,
      vercel_configured: !!process.env.VERCEL_URL,
      node_environment: process.env.NODE_ENV || 'development',
      vercel_region: process.env.VERCEL_REGION
    },
    issues
  };

  logger.debug('Environment configuration test completed', {
    success: result.success,
    duration: result.duration_ms
  });

  return result;
}

/**
 * Test bot connectivity and basic operations
 */
async function testBotConnectivity() {
  const startTime = Date.now();
  const issues = [];

  logger.debug('Testing bot connectivity');

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    const result = {
      success: false,
      duration_ms: Date.now() - startTime,
      issues: ['Telegram bot token not configured']
    };
    logger.warn('Bot connectivity test skipped - no token configured');
    return result;
  }

  try {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    
    logger.debug('Attempting bot.getMe() call');
    
    // Test getMe with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bot API connection timeout')), 5000);
    });
    
    const botInfo = await Promise.race([bot.getMe(), timeoutPromise]);
    
    logger.info('Bot connectivity test successful', {
      botId: botInfo.id,
      username: botInfo.username,
      duration: Date.now() - startTime
    });
    
    return {
      success: true,
      duration_ms: Date.now() - startTime,
      bot_info: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name,
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages,
        supports_inline_queries: botInfo.supports_inline_queries
      },
      issues
    };

  } catch (error) {
    issues.push(`Bot connectivity failed: ${error.message}`);
    logger.error('Bot connectivity test failed', { error, duration: Date.now() - startTime });
    return {
      success: false,
      duration_ms: Date.now() - startTime,
      error: error.message,
      issues
    };
  }
}

/**
 * Test API endpoint availability
 */
async function testApiEndpoints() {
  const startTime = Date.now();
  const issues = [];
  const endpoints = {};

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5173';

  logger.debug('Testing API endpoint availability', { baseUrl });

  const endpointsToTest = [
    { path: '/api/upload-image', method: 'POST' },
    { path: '/api/prepare-message', method: 'POST' },
    { path: '/api/health', method: 'GET' }
  ];

  for (const endpoint of endpointsToTest) {
    logger.debug(`Testing endpoint: ${endpoint.method} ${endpoint.path}`);
    try {
      const result = await testEndpointWithTimeout(baseUrl + endpoint.path, endpoint.method);
      endpoints[endpoint.path] = result;
      
      if (result.status !== 'operational') {
        issues.push(`Endpoint ${endpoint.path} is ${result.status}: ${result.error || 'Unknown error'}`);
        logger.warn(`Endpoint test failed: ${endpoint.path}`, { result });
      } else {
        logger.debug(`Endpoint test passed: ${endpoint.path}`, { result });
      }
    } catch (error) {
      endpoints[endpoint.path] = {
        status: 'error',
        error: error.message
      };
      issues.push(`Endpoint ${endpoint.path} test failed: ${error.message}`);
      logger.error(`Endpoint test error: ${endpoint.path}`, { error });
    }
  }

  const result = {
    success: issues.length === 0,
    duration_ms: Date.now() - startTime,
    endpoints,
    issues
  };

  logger.debug('API endpoint tests completed', {
    success: result.success,
    duration: result.duration_ms,
    endpointsTested: Object.keys(endpoints).length
  });

  return result;
}

/**
 * Test complete flow: create test image → upload → prepare message
 */
async function testCompleteFlow() {
  const startTime = Date.now();
  const issues = [];
  const steps = {};

  logger.debug('Starting complete flow test');

  try {
    // Step 1: Create test image
    logger.debug('Creating test image');
    const createImageStart = Date.now();
    const testImagePath = await createTestImage();
    steps.create_test_image = {
      success: true,
      duration_ms: Date.now() - createImageStart,
      file_path: testImagePath
    };
    logger.debug('Test image created successfully', { duration: Date.now() - createImageStart });

    // Step 2: Test image upload
    logger.debug('Testing image upload');
    const uploadStart = Date.now();
    try {
      const uploadResult = await testImageUpload(testImagePath);
      steps.upload_image = {
        success: true,
        duration_ms: Date.now() - uploadStart,
        result: uploadResult
      };
      logger.debug('Image upload test successful', {
        duration: Date.now() - uploadStart,
        imageUrl: uploadResult.imageUrl
      });

      // Step 3: Test message preparation
      logger.debug('Testing message preparation');
      const prepareStart = Date.now();
      try {
        const prepareResult = await testMessagePreparation(uploadResult.imageUrl);
        steps.prepare_message = {
          success: true,
          duration_ms: Date.now() - prepareStart,
          result: prepareResult
        };
        logger.debug('Message preparation test successful', {
          duration: Date.now() - prepareStart,
          msgId: prepareResult.msgId
        });
      } catch (error) {
        steps.prepare_message = {
          success: false,
          duration_ms: Date.now() - prepareStart,
          error: error.message
        };
        issues.push(`Message preparation failed: ${error.message}`);
        logger.error('Message preparation test failed', { error });
      }

    } catch (error) {
      steps.upload_image = {
        success: false,
        duration_ms: Date.now() - uploadStart,
        error: error.message
      };
      issues.push(`Image upload failed: ${error.message}`);
      logger.error('Image upload test failed', { error });
    }

    // Clean up test file
    try {
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
        logger.debug('Test image cleaned up successfully');
      }
    } catch (cleanupError) {
      logger.warn('Failed to cleanup test image', { error: cleanupError });
    }

    const result = {
      success: issues.length === 0,
      duration_ms: Date.now() - startTime,
      steps,
      issues
    };

    logger.debug('Complete flow test completed', {
      success: result.success,
      duration: result.duration_ms,
      issuesCount: issues.length
    });

    return result;

  } catch (error) {
    issues.push(`Complete flow test failed: ${error.message}`);
    logger.error('Complete flow test failed', { error, duration: Date.now() - startTime });
    return {
      success: false,
      duration_ms: Date.now() - startTime,
      error: error.message,
      issues
    };
  }
}

/**
 * Create a test image file
 */
async function createTestImage() {
  return new Promise((resolve, reject) => {
    const canvas = require('canvas');
    const { createCanvas } = canvas;
    
    const canvasElement = createCanvas(400, 300);
    const ctx = canvasElement.getContext('2d');
    
    // Draw test image
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BOT TEST IMAGE', 200, 140);
    ctx.font = '16px Arial';
    ctx.fillText('Created: ' + new Date().toISOString(), 200, 180);
    
    const testDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testImagePath = path.join(testDir, `bot-test-${Date.now()}.png`);
    const out = fs.createWriteStream(testImagePath);
    const stream = canvasElement.createPNGStream();
    
    stream.pipe(out);
    out.on('finish', () => resolve(testImagePath));
    out.on('error', reject);
  });
}

/**
 * Test image upload to the upload-image endpoint
 */
async function testImageUpload(imagePath) {
  const formData = require('form-data');
  const fs = require('fs');
  
  const form = new formData();
  form.append('image', fs.createReadStream(imagePath));
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5173';
  
  const response = await fetch(`${baseUrl}/api/upload-image`, {
    method: 'POST',
    body: form
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Test message preparation
 */
async function testMessagePreparation(imageUrl) {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5173';
  
  const response = await fetch(`${baseUrl}/api/prepare-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl,
      userId: 123456789, // Test user ID
      caption: 'Bot Test Message - ' + new Date().toISOString()
    })
  });
  
  if (!response.ok) {
    throw new Error(`Message preparation failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Test endpoint with timeout
 */
function testEndpointWithTimeout(url, method = 'GET', timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = https.request(url, {
      method: method,
      timeout: timeout,
      headers: {
        'User-Agent': 'MemeGenerator-BotTest/1.0'
      }
    }, (res) => {
      const responseTime = Date.now() - startTime;
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve({
          status: 'operational',
          responseTime,
          http_status: res.statusCode
        });
      } else {
        resolve({
          status: 'error',
          responseTime,
          http_status: res.statusCode,
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

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(testResults) {
  const recommendations = [];
  
  // Environment recommendations
  if (!testResults.diagnostics.environment.telegram_configured) {
    recommendations.push({
      priority: 'high',
      category: 'configuration',
      message: 'Configure TELEGRAM_BOT_TOKEN environment variable for full bot functionality',
      action: 'Add Telegram Bot Token to environment variables'
    });
  }
  
  // Bot connectivity recommendations
  if (testResults.phases.bot_connectivity && !testResults.phases.bot_connectivity.success) {
    recommendations.push({
      priority: 'high',
      category: 'connectivity',
      message: 'Bot API connectivity issues detected',
      action: 'Verify bot token and network connectivity to Telegram API'
    });
  }
  
  // API endpoint recommendations
  if (testResults.phases.api_endpoints && !testResults.phases.api_endpoints.success) {
    recommendations.push({
      priority: 'medium',
      category: 'api',
      message: 'Some API endpoints are not responding correctly',
      action: 'Check API endpoint configurations and server status'
    });
  }
  
  // Performance recommendations
  if (testResults.total_duration_ms > 10000) {
    recommendations.push({
      priority: 'low',
      category: 'performance',
      message: 'Bot test took longer than expected',
      action: 'Consider optimizing API response times or network connectivity'
    });
  }
  
  testResults.diagnostics.recommendations = recommendations;
}