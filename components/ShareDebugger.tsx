/**
 * Enhanced Debug component for testing share functionality and bot operations
 * This component provides comprehensive bot testing and diagnostics
 */

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from './common/Button';
import { getTelegramEnvironment, testShareFunctionality } from '../utils/share';

interface ShareDebuggerProps {
  onTestComplete?: (results: any) => void;
}

interface BotTestResult {
  test_id: string;
  test_type: string;
  timestamp: string;
  overall_status: 'success' | 'degraded' | 'failed' | 'error';
  total_duration_ms: number;
  phases: Record<string, any>;
  diagnostics: {
    environment: Record<string, any>;
    issues: string[];
    recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      category: string;
      message: string;
      action: string;
    }>;
    warnings: string[];
  };
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    telegram: {
      configured: boolean;
      bot_api_connectivity: string;
      bot_info?: {
        id: number;
        username: string;
        first_name: string;
        is_bot: boolean;
      };
    };
    endpoints: Record<string, any>;
  };
}

const ShareDebugger: React.FC<ShareDebuggerProps> = ({ onTestComplete }: ShareDebuggerProps) => {
  const env = getTelegramEnvironment();
  const [debugMode, setDebugMode] = useState(false);
  const [botStatus, setBotStatus] = useState<HealthStatus | null>(null);
  const [botTestResult, setBotTestResult] = useState<BotTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Enable debug mode
    (window as any).DEBUG_TELEGRAM_SHARE = debugMode;
    console.log('Debug mode:', debugMode);
  }, [debugMode]);

  // Load health status on mount
  useEffect(() => {
    checkBotHealth();
  }, []);

  const checkBotHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const healthData = await response.json();
      setBotStatus(healthData);
    } catch (error) {
      console.error('Failed to fetch bot health:', error);
    }
  };

  const runBotTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/bot-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'full',
          detailed: true
        })
      });

      const testResult = await response.json();
      setBotTestResult(testResult);
      onTestComplete?.(testResult);
      
      // Refresh health status after test
      setTimeout(checkBotHealth, 1000);
    } catch (error) {
      console.error('Bot test failed:', error);
      setBotTestResult({
        test_id: 'error',
        test_type: 'error',
        timestamp: new Date().toISOString(),
        overall_status: 'error',
        total_duration_ms: 0,
        phases: {},
        diagnostics: {
          environment: {},
          issues: [(error as Error).message],
          recommendations: [],
          warnings: []
        }
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTest = () => {
    const results = testShareFunctionality();
    onTestComplete?.(results);
  };

  const handleCreateTestBlob = async () => {
    // Create a test image blob
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw a simple test image
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TEST IMAGE', 100, 100);
      ctx.fillText('Share Me!', 100, 130);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      
      return blob;
    }
    return null;
  };

  const handleTestShare = async () => {
    const blob = await handleCreateTestBlob();
    if (blob) {
      try {
        const { shareImageBlob } = await import('../utils/share');
        await shareImageBlob(blob, {
          filename: 'test-share.png',
          title: 'Test Share',
          text: 'This is a test share',
          url: window.location.href
        });
      } catch (error) {
        console.error('Test share failed:', error);
      }
    }
  };

  const handleTestDownload = async () => {
    const blob = await handleCreateTestBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'test-download.png';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'healthy':
      case 'operational':
      case 'connected':
        return 'text-green-400';
      case 'degraded':
      case 'warning':
        return 'text-yellow-400';
      case 'failed':
      case 'unhealthy':
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'healthy':
      case 'operational':
      case 'connected':
        return '✅';
      case 'degraded':
      case 'warning':
        return '⚠️';
      case 'failed':
      case 'unhealthy':
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md z-50 border border-gray-700 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">🔧 Bot Testing & Debug</h3>
        <div className="flex space-x-1">
          <Button
            variant="icon"
            size="sm"
            onClick={() => setDebugMode(!debugMode)}
            className="text-gray-400 hover:text-white"
          >
            <span className="text-xs">{debugMode ? '🐛' : '🔍'}</span>
          </Button>
          <Button
            variant="icon"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-gray-400 hover:text-white"
          >
            <span className="text-xs">{showAdvanced ? '📋' : '⚙️'}</span>
          </Button>
        </div>
      </div>
      
      {/* Bot Status Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-blue-400">Bot Status</h4>
          <Button
            onClick={checkBotHealth}
            variant="icon"
            size="sm"
            className="text-gray-400 hover:text-white text-xs"
          >
            🔄
          </Button>
        </div>
        
        {botStatus ? (
          <div className="bg-gray-800 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span>Overall:</span>
              <span className={`font-semibold ${getStatusColor(botStatus.status)}`}>
                {getStatusIcon(botStatus.status)} {botStatus.status}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Bot Configured:</span>
              <span className={botStatus.services.telegram.configured ? 'text-green-400' : 'text-red-400'}>
                {botStatus.services.telegram.configured ? '✅' : '❌'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Bot Connectivity:</span>
              <span className={getStatusColor(botStatus.services.telegram.bot_api_connectivity)}>
                {getStatusIcon(botStatus.services.telegram.bot_api_connectivity)} {botStatus.services.telegram.bot_api_connectivity}
              </span>
            </div>
            
            {botStatus.services.telegram.bot_info && (
              <div className="text-gray-300 text-xs mt-1">
                <div>@{botStatus.services.telegram.bot_info.username}</div>
                <div>ID: {botStatus.services.telegram.bot_info.id}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 p-2 rounded text-xs text-gray-400">
            Loading bot status...
          </div>
        )}
      </div>

      {/* Bot Test Section */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-green-400 mb-2">Bot Testing</h4>
        <Button
          onClick={runBotTest}
          disabled={isTesting}
          fullWidth
          size="sm"
          className="text-xs mb-2"
        >
          {isTesting ? '🔄 Testing Bot...' : '🧪 Test Bot Status'}
        </Button>
        
        {botTestResult && (
          <div className="bg-gray-800 p-2 rounded text-xs space-y-2">
            <div className="flex justify-between">
              <span>Test Status:</span>
              <span className={`font-semibold ${getStatusColor(botTestResult.overall_status)}`}>
                {getStatusIcon(botTestResult.overall_status)} {botTestResult.overall_status}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{botTestResult.total_duration_ms}ms</span>
            </div>
            
            {botTestResult.diagnostics.issues.length > 0 && (
              <div className="mt-2">
                <div className="text-red-400 font-semibold mb-1">Issues:</div>
                {botTestResult.diagnostics.issues.slice(0, 3).map((issue, index) => (
                  <div key={index} className="text-red-300 text-xs">• {issue}</div>
                ))}
                {botTestResult.diagnostics.issues.length > 3 && (
                  <div className="text-gray-400 text-xs">
                    +{botTestResult.diagnostics.issues.length - 3} more issues
                  </div>
                )}
              </div>
            )}
            
            {botTestResult.diagnostics.recommendations.length > 0 && (
              <div className="mt-2">
                <div className="text-yellow-400 font-semibold mb-1">Recommendations:</div>
                {botTestResult.diagnostics.recommendations.slice(0, 2).map((rec, index) => (
                  <div key={index} className="text-yellow-300 text-xs">
                    <div className="font-semibold">• {rec.message}</div>
                    <div className="text-gray-400 text-xs ml-2">{rec.action}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform Info */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-purple-400 mb-2">Platform Info</h4>
        <div className="bg-gray-800 p-2 rounded text-xs space-y-1">
          <div className="flex justify-between">
            <span>Platform:</span>
            <span>{env.platform}</span>
          </div>
          <div className="flex justify-between">
            <span>Telegram:</span>
            <span>{env.isTelegram ? '✅' : '❌'}</span>
          </div>
          <div className="flex justify-between">
            <span>Brave:</span>
            <span>{env.isBrave ? '✅' : '❌'}</span>
          </div>
          <div className="flex justify-between">
            <span>Debug Mode:</span>
            <span>{debugMode ? '✅' : '❌'}</span>
          </div>
        </div>
      </div>

      {/* Basic Testing */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-orange-400 mb-2">Basic Testing</h4>
        <div className="space-y-1">
          <Button
            onClick={handleTest}
            fullWidth
            size="sm"
            className="text-xs"
          >
            Run Share Tests
          </Button>
          <Button
            onClick={handleTestShare}
            fullWidth
            size="sm"
            variant="secondary"
            className="text-xs"
          >
            Test Share
          </Button>
          <Button
            onClick={handleTestDownload}
            fullWidth
            size="sm"
            variant="secondary"
            className="text-xs"
          >
            Test Download
          </Button>
        </div>
      </div>

      {/* Advanced Information */}
      {showAdvanced && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">Advanced Info</h4>
          <div className="bg-gray-800 p-2 rounded text-xs space-y-1">
            <div className="text-gray-300">User Agent:</div>
            <div className="text-gray-400 text-xs break-all">{env.userAgent}</div>
            
            {botTestResult && (
              <>
                <div className="text-gray-300 mt-2">Test Phases:</div>
                {Object.entries(botTestResult.phases).map(([phase, result]: [string, any]) => (
                  <div key={phase} className="text-gray-400 text-xs">
                    {phase}: {result.success ? '✅' : '❌'} ({result.duration_ms}ms)
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareDebugger;