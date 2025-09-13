/**
 * Enhanced Vercel Logging Utility for Bot Operations
 * Provides structured logging optimized for Vercel's platform with request tracing,
 * performance metrics, and comprehensive diagnostic information.
 */

const crypto = require('crypto');

// Log levels with severity ordering
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Default configuration
const DEFAULT_CONFIG = {
  level: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
  enablePerformanceTracking: true,
  enableRequestTracing: true,
  enableStructuredOutput: true,
  maxLogEntrySize: 10000, // Maximum characters per log entry
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization']
};

class VercelLogger {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.requestContext = new Map();
    this.performanceMetrics = new Map();
  }

  /**
   * Generate a unique request ID for tracing
   */
  generateRequestId() {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Start tracking a request with timing and context
   */
  startRequest(req, options = {}) {
    if (!this.config.enableRequestTracing) return null;

    const requestId = options.requestId || this.generateRequestId();
    const startTime = Date.now();
    
    const requestContext = {
      id: requestId,
      startTime,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIP(req),
      referer: req.headers.referer,
      userAgent: req.headers['user-agent'],
      environment: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION,
      vercelUrl: process.env.VERCEL_URL
    };

    this.requestContext.set(requestId, requestContext);
    
    // Log request start
    this.info('Request started', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent']
    });

    return requestId;
  }

  /**
   * End request tracking and calculate duration
   */
  endRequest(requestId, response = {}) {
    if (!this.config.enableRequestTracing || !requestId) return;

    const context = this.requestContext.get(requestId);
    if (!context) return;

    const endTime = Date.now();
    const duration = endTime - context.startTime;

    const requestEndLog = {
      requestId,
      duration,
      method: context.method,
      url: context.url,
      statusCode: response.statusCode || 200,
      responseSize: response.size || 0
    };

    if (response.error) {
      requestEndLog.error = response.error;
      requestEndLog.errorType = response.errorType || 'unknown';
    }

    this.info('Request completed', requestEndLog);
    this.requestContext.delete(requestId);

    // Log performance metrics if enabled
    if (this.config.enablePerformanceTracking) {
      this.logPerformanceMetrics(requestId, duration);
    }
  }

  /**
   * Log performance metrics for the request
   */
  logPerformanceMetrics(requestId, duration) {
    const metrics = {
      requestId,
      duration,
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime()
    };

    // Log slow requests
    if (duration > 5000) { // 5 seconds
      this.warn('Slow request detected', {
        requestId,
        duration,
        threshold: 5000
      });
    }

    this.debug('Performance metrics', metrics);
  }

  /**
   * Get client IP address from request
   */
  getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Sanitize sensitive data from logs
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    
    for (const field of this.config.sensitiveFields) {
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase().includes(field.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        }
      });
    }

    return sanitized;
  }

  /**
   * Format log entry for Vercel's structured logging
   */
  formatLogEntry(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
      environment: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION,
      service: 'meme-generator-bot'
    };

    // Add request context if available
    const activeRequests = Array.from(this.requestContext.values());
    if (activeRequests.length > 0) {
      entry.requestId = activeRequests[0].id;
      entry.requestInfo = {
        method: activeRequests[0].method,
        url: activeRequests[0].url,
        ip: activeRequests[0].ip
      };
    }

    // Add sanitized data
    if (Object.keys(data).length > 0) {
      entry.data = this.sanitizeData(data);
    }

    // Add error information if present
    if (data.error) {
      entry.error = {
        message: data.error.message || data.error,
        stack: data.error.stack,
        type: data.error.name || data.errorType
      };
    }

    return entry;
  }

  /**
   * Write log to console with Vercel formatting
   */
  writeLog(level, message, data = {}) {
    if (LOG_LEVELS[level] > LOG_LEVELS[this.config.level]) return;

    const entry = this.formatLogEntry(level, message, data);
    const logString = JSON.stringify(entry);

    // Truncate very long log entries
    const finalLogString = logString.length > this.config.maxLogEntrySize
      ? logString.substring(0, this.config.maxLogEntrySize) + '...[TRUNCATED]'
      : logString;

    switch (level) {
      case 'ERROR':
        console.error(finalLogString);
        break;
      case 'WARN':
        console.warn(finalLogString);
        break;
      case 'DEBUG':
        console.debug(finalLogString);
        break;
      default:
        console.log(finalLogString);
    }
  }

  /**
   * Log error with full stack trace and context
   */
  error(message, data = {}) {
    const errorData = { ...data };
    
    if (data.error instanceof Error) {
      errorData.error = {
        message: data.error.message,
        stack: data.error.stack,
        name: data.error.name
      };
    }

    this.writeLog('ERROR', message, errorData);
  }

  /**
   * Log warning messages
   */
  warn(message, data = {}) {
    this.writeLog('WARN', message, data);
  }

  /**
   * Log informational messages
   */
  info(message, data = {}) {
    this.writeLog('INFO', message, data);
  }

  /**
   * Log debug messages
   */
  debug(message, data = {}) {
    this.writeLog('DEBUG', message, data);
  }

  /**
   * Log bot-specific operations
   */
  logBotOperation(operation, data = {}) {
    this.info(`Bot operation: ${operation}`, {
      operation,
      ...data,
      category: 'bot_operation'
    });
  }

  /**
   * Log API endpoint operations
   */
  logApiOperation(endpoint, method, data = {}) {
    this.info(`API operation: ${method} ${endpoint}`, {
      endpoint,
      method,
      ...data,
      category: 'api_operation'
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation, duration, data = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...data,
      category: 'performance'
    });
  }

  /**
   * Log user interactions
   */
  logUserInteraction(userId, action, data = {}) {
    this.info(`User interaction: ${action}`, {
      userId,
      action,
      ...data,
      category: 'user_interaction'
    });
  }

  /**
   * Create middleware for Express-like frameworks
   */
  middleware() {
    return (req, res, next) => {
      const requestId = this.startRequest(req);
      
      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const response = {
          statusCode: res.statusCode,
          size: chunk ? chunk.length : 0
        };
        
        if (res.statusCode >= 400) {
          response.error = 'HTTP error response';
          response.errorType = 'http_error';
        }
        
        logger.endRequest(requestId, response);
        originalEnd.call(res, chunk, encoding);
      };

      res.requestId = requestId;
      next();
    };
  }
}

// Create singleton instance
const logger = new VercelLogger();

module.exports = logger;