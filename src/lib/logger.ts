/**
 * Centralized logging service for mobile app debugging
 * Captures all console logs and provides a UI to view them
 */

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  source?: string;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private listeners = new Set<(logs: LogEntry[]) => void>();
  private originalConsole: { [key: string]: any } = {};

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole() {
    // Store original console methods
    this.originalConsole.log = console.log;
    this.originalConsole.info = console.info;
    this.originalConsole.warn = console.warn;
    this.originalConsole.error = console.error;
    this.originalConsole.debug = console.debug;

    // Override console methods
    console.log = (...args) => {
      this.originalConsole.log(...args);
      this.addLog('log', this.formatMessage(args));
    };

    console.info = (...args) => {
      this.originalConsole.info(...args);
      this.addLog('info', this.formatMessage(args));
    };

    console.warn = (...args) => {
      this.originalConsole.warn(...args);
      this.addLog('warn', this.formatMessage(args));
    };

    console.error = (...args) => {
      this.originalConsole.error(...args);
      this.addLog('error', this.formatMessage(args));
    };

    console.debug = (...args) => {
      this.originalConsole.debug(...args);
      this.addLog('debug', this.formatMessage(args));
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.addLog('error', `Unhandled Error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', `Unhandled Promise Rejection: ${event.reason}`, {
        reason: event.reason
      });
    });
  }

  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  private addLog(level: LogEntry['level'], message: string, data?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      data,
      source: this.getCallerInfo()
    };

    this.logs.unshift(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  private getCallerInfo(): string {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Skip the first few lines (this method, addLog, console override)
        for (let i = 4; i < lines.length; i++) {
          const line = lines[i];
          if (line && !line.includes('logger.ts') && !line.includes('console')) {
            const match = line.match(/at (.+) \((.+):(\d+):(\d+)\)/);
            if (match) {
              const [, functionName, file, lineNum] = match;
              const fileName = file.split('/').pop() || file;
              return `${functionName} (${fileName}:${lineNum})`;
            }
          }
        }
      }
    } catch {
      // Ignore errors in stack trace parsing
    }
    return 'unknown';
  }

  // Public API
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getRecentLogs(count: number): LogEntry[] {
    return this.logs.slice(0, count);
  }

  clearLogs(): void {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Utility methods for manual logging
  log(message: string, data?: any): void {
    this.addLog('log', message, data);
  }

  info(message: string, data?: any): void {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.addLog('error', message, data);
  }

  debug(message: string, data?: any): void {
    this.addLog('debug', message, data);
  }

  // Performance logging
  time(label: string): void {
    this.debug(`Timer started: ${label}`);
    console.time?.(label);
  }

  timeEnd(label: string): void {
    this.debug(`Timer ended: ${label}`);
    console.timeEnd?.(label);
  }

  // Group logging
  group(label: string): void {
    this.debug(`Group: ${label}`);
    console.group?.(label);
  }

  groupEnd(): void {
    this.debug('Group ended');
    console.groupEnd?.();
  }
}

export const logger = new LoggerService();



