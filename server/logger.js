// Simple logging system with configurable log levels

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Default log level: INFO
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}]${contextStr} ${message}`;
}

function error(message, context) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    console.error(formatMessage('ERROR', message, context));
  }
}

function warn(message, context) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(formatMessage('WARN', message, context));
  }
}

function info(message, context) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.log(formatMessage('INFO', message, context));
  }
}

function debug(message, context) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.log(formatMessage('DEBUG', message, context));
  }
}

module.exports = {
  error,
  warn,
  info,
  debug,
  LOG_LEVELS
};
