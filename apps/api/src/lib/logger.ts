import { isProduction, isTest } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  if (isTest && level !== 'error') return;
  if (isProduction) {
    // One JSON object per line so log collectors can parse it.
    console[level === 'debug' ? 'log' : level](
      JSON.stringify({ level, message, time: new Date().toISOString(), ...meta }),
    );
    return;
  }
  console[level === 'debug' ? 'log' : level](`[${level}] ${message}`, meta ?? '');
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
