import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const handleManualRefresh = () => {
    const newLogs = logger.getLogs();
    setLogs(newLogs);
    applyFilters(newLogs, searchTerm, activeLevel);
    toast({
      title: "Refreshed",
      description: "Logs have been refreshed",
    });
  };

  const handleAddTestLogs = () => {
    const testMessages = [
      "Test info message - checking scrolling behavior",
      "Debug message with some additional context",
      "Warning: This is a test warning message",
      "Error: Test error message for scrolling verification",
      "Network operation completed successfully",
      "Printer connection established on port 9100",
      "Order processing started for table #12",
      "Database query executed in 45ms",
      "Authentication token refreshed",
      "Cache invalidated and rebuilt"
    ];
    
    const levels: LogEntry['level'][] = ['info', 'debug', 'warn', 'error', 'log'];
    
    // Add 20 test log entries
    for (let i = 0; i < 20; i++) {
      const level = levels[i % levels.length];
      const message = `${testMessages[i % testMessages.length]} (#${i + 1})`;
      logger[level](message, { testIndex: i, timestamp: new Date() });
    }
    
    toast({
      title: "Test Logs Added",
      description: "Added 20 test log entries for scrolling verification",
    });
  };

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  ArrowDown,
  ArrowUp,
  ScrollText
} from 'lucide-react';
import { LogEntry, logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLevel, setActiveLevel] = useState<string>('all');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [showData, setShowData] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const { toast } = useToast();
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const prevLogsLengthRef = useRef(0);

  useEffect(() => {
    // Initial load
    const initialLogs = logger.getLogs();
    setLogs(initialLogs);
    setFilteredLogs(initialLogs);
    prevLogsLengthRef.current = initialLogs.length;

    // Subscribe to log updates
    const unsubscribe = logger.subscribe((newLogs) => {
      if (isAutoRefresh) {
        setLogs(newLogs);
        applyFilters(newLogs, searchTerm, activeLevel);
        
        // Auto-scroll to bottom if new logs arrived and auto-scroll is enabled
        if (autoScroll && newLogs.length > prevLogsLengthRef.current) {
          setTimeout(() => {
            if (logsContainerRef.current) {
              logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
            }
          }, 100);
        }
        prevLogsLengthRef.current = newLogs.length;
      }
    });

    return unsubscribe;
  }, [isAutoRefresh, searchTerm, activeLevel, autoScroll]);

  useEffect(() => {
    applyFilters(logs, searchTerm, activeLevel);
  }, [logs, searchTerm, activeLevel]);

  const applyFilters = (logList: LogEntry[], search: string, level: string) => {
    let filtered = logList;

    // Filter by level
    if (level !== 'all') {
      filtered = filtered.filter(log => log.level === level);
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.source?.toLowerCase().includes(searchLower) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
      );
    }

    setFilteredLogs(filtered);
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'warn': return <AlertTriangle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      case 'debug': return <Bug className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'orange';
      case 'info': return 'blue';
      case 'debug': return 'gray';
      default: return 'default';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('fi-FI', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const handleClearLogs = () => {
    logger.clearLogs();
    toast({
      title: "Logs Cleared",
      description: "All logs have been cleared successfully",
    });
  };

  const handleExportLogs = () => {
    const logsData = logger.exportLogs();
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Logs Exported",
      description: "Logs have been downloaded as JSON file",
    });
  };

  const handleCopyLog = (log: LogEntry) => {
    const logText = `[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}`;
    navigator.clipboard.writeText(logText).then(() => {
      toast({
        title: "Copied",
        description: "Log entry copied to clipboard",
      });
    });
  };

  const handleScrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  };

  const handleScrollToTop = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  };

  const handleRefresh = () => {
    const newLogs = logger.getLogs();
    setLogs(newLogs);
    applyFilters(newLogs, searchTerm, activeLevel);
    toast({
      title: "Refreshed",
      description: "Logs have been refreshed",
    });
  };

  const levelCounts = {
    all: logs.length,
    error: logs.filter(l => l.level === 'error').length,
    warn: logs.filter(l => l.level === 'warn').length,
    info: logs.filter(l => l.level === 'info').length,
    log: logs.filter(l => l.level === 'log').length,
    debug: logs.filter(l => l.level === 'debug').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Application Logs</h1>
          <p className="text-muted-foreground">
            Debug and monitor application behavior
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className={autoScroll ? "bg-green-50 border-green-200" : ""}
          >
            <ScrollText className="w-4 h-4 mr-2" />
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            {isAutoRefresh ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            Auto-refresh {isAutoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearLogs}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowData(!showData)}
            >
              {showData ? 'Hide' : 'Show'} Data
            </Button>
          </div>

          <Tabs value={activeLevel} onValueChange={setActiveLevel}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all" className="flex items-center gap-2">
                All <Badge variant="secondary">{levelCounts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="error" className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Errors <Badge variant="destructive">{levelCounts.error}</Badge>
              </TabsTrigger>
              <TabsTrigger value="warn" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings <Badge variant="secondary">{levelCounts.warn}</Badge>
              </TabsTrigger>
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Info <Badge variant="secondary">{levelCounts.info}</Badge>
              </TabsTrigger>
              <TabsTrigger value="log" className="flex items-center gap-2">
                Logs <Badge variant="secondary">{levelCounts.log}</Badge>
              </TabsTrigger>
              <TabsTrigger value="debug" className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Debug <Badge variant="secondary">{levelCounts.debug}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Log Entries ({filteredLogs.length} of {logs.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleScrollToTop}
                disabled={filteredLogs.length === 0}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScrollToBottom}
                disabled={filteredLogs.length === 0}
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6 pb-2">
            <div className="text-sm text-muted-foreground mb-4 flex items-center justify-between">
              <span>Showing {filteredLogs.length} of {logs.length} log entries</span>
              <div className="flex items-center gap-3">
                {filteredLogs.length > 10 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                    <ScrollText className="w-3 h-3" />
                    Scrollable container (500px height)
                  </span>
                )}
                {filteredLogs.length > 5 && filteredLogs.length <= 10 && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Scroll to see more logs
                  </span>
                )}
              </div>
            </div>
          </div>
          <div 
            ref={logsContainerRef}
            data-testid="logs-container"
            className="space-y-2 h-[500px] max-h-[500px] overflow-y-scroll px-6 pb-6 scroll-smooth border-t bg-gray-50/50"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f1f5f9',
              overflowY: 'scroll',
              minHeight: '500px'
            }}
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No logs found</p>
                <p className="text-sm">Try adjusting your filters or wait for new logs</p>
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-3 transition-colors hover:shadow-sm ${
                    log.level === 'error' ? 'border-red-200 bg-red-50 hover:bg-red-100' :
                    log.level === 'warn' ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' :
                    log.level === 'info' ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' :
                    log.level === 'debug' ? 'border-gray-200 bg-gray-50 hover:bg-gray-100' :
                    'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                  style={{
                    scrollMarginTop: '20px'
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getLevelColor(log.level) as any} className="flex items-center gap-1">
                          {getLevelIcon(log.level)}
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-mono text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {log.source && (
                          <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                            {log.source}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-sm break-words">
                        {log.message}
                      </div>
                      {showData && log.data && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto">
                          <pre>{JSON.stringify(log.data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLog(log)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



