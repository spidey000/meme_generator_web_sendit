/**
 * Log viewing endpoint for Vercel logs
 * Provides web interface to view recent logs with filtering and pagination
 */

const logger = require('../utils/vercelLogger');

// In-memory log storage (in production, you'd use a database)
let logStorage = [];
const MAX_LOG_ENTRIES = 1000;

/**
 * Store a log entry for later retrieval
 */
function storeLogEntry(logEntry) {
  logStorage.unshift(logEntry); // Add to beginning for newest first
  
  // Keep only the most recent entries
  if (logStorage.length > MAX_LOG_ENTRIES) {
    logStorage = logStorage.slice(0, MAX_LOG_ENTRIES);
  }
}

/**
 * Interceptor to capture all logs for storage
 */
const originalWriteLog = logger.writeLog.bind(logger);
logger.writeLog = function(level, message, data = {}) {
  // Call original method
  originalWriteLog(level, message, data);
  
  // Store for retrieval
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  storeLogEntry(logEntry);
};

module.exports = async (req, res) => {
  const requestStartTime = Date.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    logger.info('Logs OPTIONS request', { method: 'OPTIONS', url: req.url });
    return res.status(200).end();
  }

  // Start request tracing
  const requestId = logger.startRequest(req, { operation: 'logs_view' });
  logger.logApiOperation('/api/logs', req.method, { requestId });

  try {
    if (req.method === 'GET') {
      await handleGetLogs(req, res, requestId);
    } else if (req.method === 'POST') {
      await handlePostLogs(req, res, requestId);
    } else {
      logger.warn('Invalid method for logs endpoint', { method: req.method, url: req.url });
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    logger.endRequest(requestId, { statusCode: 200 });
  } catch (error) {
    logger.error('Logs endpoint error', { 
      error, 
      requestId,
      stack: error.stack 
    });
    
    res.status(500).json({ 
      error: 'Failed to process logs request',
      requestId
    });
    
    logger.endRequest(requestId, { statusCode: 500, error: error.message });
  }
};

/**
 * Handle GET requests for log viewing
 */
async function handleGetLogs(req, res, requestId) {
  const {
    level,
    operation,
    category,
    userId,
    platform,
    limit = '50',
    offset = '0',
    startTime: startTimeStr,
    endTime: endTimeStr,
    search
  } = req.query;

  logger.debug('Processing logs GET request', {
    requestId,
    query: req.query
  });

  let filteredLogs = [...logStorage];

  // Filter by level
  if (level) {
    filteredLogs = filteredLogs.filter(log => log.level === level.toUpperCase());
  }

  // Filter by operation
  if (operation) {
    filteredLogs = filteredLogs.filter(log => 
      log.data?.operation === operation || 
      log.message.includes(operation)
    );
  }

  // Filter by category
  if (category) {
    filteredLogs = filteredLogs.filter(log => log.data?.category === category);
  }

  // Filter by user ID
  if (userId) {
    filteredLogs = filteredLogs.filter(log => 
      log.data?.userId === userId || 
      log.data?.requestId === userId
    );
  }

  // Filter by platform
  if (platform) {
    filteredLogs = filteredLogs.filter(log => 
      log.data?.platform === platform || 
      log.data?.isTelegram === (platform === 'telegram')
    );
  }

  // Filter by time range
  if (startTimeStr) {
    const startTime = new Date(startTimeStr);
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startTime);
  }

  if (endTimeStr) {
    const endTime = new Date(endTimeStr);
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endTime);
  }

  // Search in message and data
  if (search) {
    const searchLower = search.toLowerCase();
    filteredLogs = filteredLogs.filter(log => 
      log.message.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.data).toLowerCase().includes(searchLower)
    );
  }

  // Apply pagination
  const limitNum = parseInt(limit, 10);
  const offsetNum = parseInt(offset, 10);
  const paginatedLogs = filteredLogs.slice(offsetNum, offsetNum + limitNum);

  // Calculate statistics
  const stats = {
    totalLogs: filteredLogs.length,
    filteredLogs: filteredLogs.length,
    returnedLogs: paginatedLogs.length,
    levelCounts: {},
    operationCounts: {},
    categoryCounts: {},
    platformCounts: {},
    errorCount: 0,
    warningCount: 0
  };

  // Calculate statistics
  filteredLogs.forEach(log => {
    // Level counts
    stats.levelCounts[log.level] = (stats.levelCounts[log.level] || 0) + 1;
    
    // Operation counts
    if (log.data?.operation) {
      stats.operationCounts[log.data.operation] = (stats.operationCounts[log.data.operation] || 0) + 1;
    }
    
    // Category counts
    if (log.data?.category) {
      stats.categoryCounts[log.data.category] = (stats.categoryCounts[log.data.category] || 0) + 1;
    }
    
    // Platform counts
    if (log.data?.platform) {
      stats.platformCounts[log.data.platform] = (stats.platformCounts[log.data.platform] || 0) + 1;
    }
    
    // Error and warning counts
    if (log.level === 'ERROR') stats.errorCount++;
    if (log.level === 'WARN') stats.warningCount++;
  });

  const response = {
    logs: paginatedLogs,
    pagination: {
      limit: limitNum,
      offset: offsetNum,
      total: filteredLogs.length,
      hasMore: offsetNum + limitNum < filteredLogs.length
    },
    filters: {
      level,
      operation,
      category,
      userId,
      platform,
      startTime: startTimeStr,
      endTime: endTimeStr,
      search
    },
    statistics: stats,
    requestId,
    timestamp: new Date().toISOString()
  };

  logger.info('Logs retrieved successfully', {
    requestId,
    returnedLogs: paginatedLogs.length,
    totalLogs: filteredLogs.length,
    filters: Object.keys(req.query).filter(key => req.query[key])
  });

  res.json(response);
}

/**
 * Handle POST requests for log management
 */
async function handlePostLogs(req, res, requestId) {
  const { action } = req.body;

  logger.debug('Processing logs POST request', {
    requestId,
    action,
    body: req.body
  });

  switch (action) {
    case 'clear':
      // Clear all logs
      const clearedCount = logStorage.length;
      logStorage = [];
      
      logger.info('Logs cleared', { requestId, clearedCount });
      
      res.json({
        success: true,
        clearedCount,
        message: `Cleared ${clearedCount} log entries`,
        requestId
      });
      break;

    case 'export':
      // Export logs as JSON
      logger.info('Logs exported', { 
        requestId, 
        logCount: logStorage.length 
      });
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="vercel-logs-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(logStorage);
      break;

    case 'stats':
      // Get detailed statistics
      const stats = getDetailedStatistics();
      
      logger.info('Statistics retrieved', { requestId });
      
      res.json({
        success: true,
        statistics: stats,
        requestId
      });
      break;

    default:
      logger.warn('Unknown log action', { requestId, action });
      res.status(400).json({ 
        error: 'Unknown action',
        requestId,
        availableActions: ['clear', 'export', 'stats']
      });
  }
}

/**
 * Get detailed statistics about the logs
 */
function getDetailedStatistics() {
  const stats = {
    totalLogs: logStorage.length,
    earliestLog: null,
    latestLog: null,
    levelDistribution: {},
    hourlyDistribution: {},
    operationDistribution: {},
    platformDistribution: {},
    errorRate: 0,
    averageLogsPerHour: 0,
    topErrors: [],
    topOperations: []
  };

  if (logStorage.length === 0) {
    return stats;
  }

  // Time range
  stats.earliestLog = logStorage[logStorage.length - 1]?.timestamp;
  stats.latestLog = logStorage[0]?.timestamp;

  const timeRange = new Date(stats.latestLog) - new Date(stats.earliestLog);
  const hoursInRange = timeRange / (1000 * 60 * 60) || 1;

  // Analyze logs
  logStorage.forEach(log => {
    const timestamp = new Date(log.timestamp);
    const hour = timestamp.getHours();

    // Level distribution
    stats.levelDistribution[log.level] = (stats.levelDistribution[log.level] || 0) + 1;

    // Hourly distribution
    stats.hourlyDistribution[hour] = (stats.hourlyDistribution[hour] || 0) + 1;

    // Operation distribution
    if (log.data?.operation) {
      stats.operationDistribution[log.data.operation] = 
        (stats.operationDistribution[log.data.operation] || 0) + 1;
    }

    // Platform distribution
    if (log.data?.platform) {
      stats.platformDistribution[log.data.platform] = 
        (stats.platformDistribution[log.data.platform] || 0) + 1;
    }
  });

  // Calculate rates
  stats.errorRate = (stats.levelDistribution.ERROR || 0) / stats.totalLogs * 100;
  stats.averageLogsPerHour = stats.totalLogs / hoursInRange;

  // Top errors
  stats.topErrors = logStorage
    .filter(log => log.level === 'ERROR')
    .slice(0, 10)
    .map(log => ({
      message: log.message,
      timestamp: log.timestamp,
      data: log.data
    }));

  // Top operations
  stats.topOperations = Object.entries(stats.operationDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([operation, count]) => ({ operation, count }));

  return stats;
}

// Export for testing
module.exports.getLogStorage = () => logStorage;
module.exports.clearLogStorage = () => { logStorage = []; };