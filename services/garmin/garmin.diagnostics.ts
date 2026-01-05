/**
 * Garmin Connection Diagnostics
 * 
 * Provides:
 * 1. Heartbeat system - detect stale connections
 * 2. Message logging - last N messages for debugging
 * 3. Connection health metrics
 * 4. Diagnostic export for debugging
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DiagnosticMessage {
  timestamp: number;
  direction: 'outbound' | 'inbound';
  type: string;
  payload?: unknown;
  success: boolean;
  error?: string;
  latencyMs?: number;
}

export interface DiagnosticError {
  timestamp: number;
  context: string;
  message: string;
  stack?: string;
}

export interface HeartbeatState {
  lastSentAt: number | null;
  lastReceivedAt: number | null;
  lastLatencyMs: number | null;
  avgLatencyMs: number;
  missedCount: number;
  isHealthy: boolean;
}

export interface ConnectionHealth {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  latencyMs: number;
  missedHeartbeats: number;
  lastCommunicationAt: number | null;
  uptime: number; // ms since connection established
}

export interface DiagnosticExport {
  exportedAt: string;
  connectionHealth: ConnectionHealth;
  heartbeat: HeartbeatState;
  recentMessages: DiagnosticMessage[];
  recentErrors: DiagnosticError[];
  statistics: {
    totalMessagesSent: number;
    totalMessagesReceived: number;
    totalErrors: number;
    avgLatencyMs: number;
    successRate: number;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  /** Max messages to keep in buffer */
  maxMessages: 100,
  /** Max errors to keep in buffer */
  maxErrors: 50,
  /** Heartbeat interval (ms) */
  heartbeatIntervalMs: 10000, // 10 seconds
  /** Heartbeat timeout - if no response within this time, connection is stale */
  heartbeatTimeoutMs: 5000,
  /** Number of missed heartbeats before marking connection as unhealthy */
  maxMissedHeartbeats: 3,
  /** Latency thresholds for health status */
  latencyThresholds: {
    excellent: 100,
    good: 300,
    fair: 500,
    poor: 1000,
  },
};

// ============================================================================
// STATE
// ============================================================================

let messages: DiagnosticMessage[] = [];
let errors: DiagnosticError[] = [];
let heartbeat: HeartbeatState = {
  lastSentAt: null,
  lastReceivedAt: null,
  lastLatencyMs: null,
  avgLatencyMs: 0,
  missedCount: 0,
  isHealthy: true,
};

let connectionEstablishedAt: number | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

// Statistics
let stats = {
  totalMessagesSent: 0,
  totalMessagesReceived: 0,
  totalErrors: 0,
  latencySum: 0,
  latencyCount: 0,
};

// Callbacks
let onHeartbeatTimeout: (() => void) | null = null;
let sendHeartbeatFn: (() => boolean) | null = null;

// ============================================================================
// MESSAGE LOGGING
// ============================================================================

/**
 * Log an outbound message (sent to watch)
 */
export function logOutboundMessage(
  type: string,
  payload: unknown,
  success: boolean,
  error?: string
): void {
  const msg: DiagnosticMessage = {
    timestamp: Date.now(),
    direction: 'outbound',
    type,
    payload: sanitizePayload(payload),
    success,
    error,
  };

  messages.push(msg);
  if (messages.length > CONFIG.maxMessages) {
    messages.shift();
  }

  stats.totalMessagesSent++;
  if (!success) {
    stats.totalErrors++;
  }

  console.log(`[Diagnostics] 📤 ${type} ${success ? '✓' : '✗'}${error ? ` (${error})` : ''}`);
}

/**
 * Log an inbound message (received from watch)
 */
export function logInboundMessage(
  type: string,
  payload: unknown,
  latencyMs?: number
): void {
  const msg: DiagnosticMessage = {
    timestamp: Date.now(),
    direction: 'inbound',
    type,
    payload: sanitizePayload(payload),
    success: true,
    latencyMs,
  };

  messages.push(msg);
  if (messages.length > CONFIG.maxMessages) {
    messages.shift();
  }

  stats.totalMessagesReceived++;
  
  if (latencyMs !== undefined) {
    stats.latencySum += latencyMs;
    stats.latencyCount++;
  }

  console.log(`[Diagnostics] 📥 ${type}${latencyMs ? ` (${latencyMs}ms)` : ''}`);
}

/**
 * Log an error
 */
export function logError(context: string, error: Error | string): void {
  const err: DiagnosticError = {
    timestamp: Date.now(),
    context,
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
  };

  errors.push(err);
  if (errors.length > CONFIG.maxErrors) {
    errors.shift();
  }

  stats.totalErrors++;

  console.error(`[Diagnostics] ❌ ${context}: ${err.message}`);
}

/**
 * Sanitize payload for logging (remove large data, sensitive info)
 */
function sanitizePayload(payload: unknown): unknown {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload !== 'object') return payload;

  const sanitized = { ...(payload as Record<string, unknown>) };
  
  // Remove potentially large arrays
  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];
    if (Array.isArray(value) && value.length > 10) {
      sanitized[key] = `[Array(${value.length})]`;
    }
  }

  return sanitized;
}

// ============================================================================
// HEARTBEAT SYSTEM
// ============================================================================

/**
 * Start the heartbeat system
 * @param sendFn Function to send heartbeat message to watch
 * @param onTimeout Callback when heartbeat timeout occurs
 */
export function startHeartbeat(
  sendFn: () => boolean,
  onTimeout?: () => void
): void {
  stopHeartbeat();

  sendHeartbeatFn = sendFn;
  onHeartbeatTimeout = onTimeout || null;
  connectionEstablishedAt = Date.now();

  // Reset heartbeat state
  heartbeat = {
    lastSentAt: null,
    lastReceivedAt: null,
    lastLatencyMs: null,
    avgLatencyMs: 0,
    missedCount: 0,
    isHealthy: true,
  };

  // Send first heartbeat immediately
  sendHeartbeatPing();

  // Start interval
  heartbeatTimer = setInterval(sendHeartbeatPing, CONFIG.heartbeatIntervalMs);

  console.log(`[Diagnostics] 💓 Heartbeat started (${CONFIG.heartbeatIntervalMs / 1000}s interval)`);
}

/**
 * Stop the heartbeat system
 */
export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
  }
  connectionEstablishedAt = null;
  console.log('[Diagnostics] 💓 Heartbeat stopped');
}

/**
 * Send a heartbeat ping
 */
function sendHeartbeatPing(): void {
  if (!sendHeartbeatFn) return;

  heartbeat.lastSentAt = Date.now();
  
  const success = sendHeartbeatFn();
  logOutboundMessage('HEARTBEAT', { timestamp: heartbeat.lastSentAt }, success);

  if (success) {
    // Start timeout timer
    heartbeatTimeoutTimer = setTimeout(handleHeartbeatTimeout, CONFIG.heartbeatTimeoutMs);
  } else {
    // Send failed immediately
    handleHeartbeatTimeout();
  }
}

/**
 * Handle heartbeat timeout (no response received)
 */
function handleHeartbeatTimeout(): void {
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
  }

  heartbeat.missedCount++;
  console.warn(`[Diagnostics] 💔 Heartbeat timeout! Missed: ${heartbeat.missedCount}`);

  if (heartbeat.missedCount >= CONFIG.maxMissedHeartbeats) {
    heartbeat.isHealthy = false;
    console.error(`[Diagnostics] ❌ Connection unhealthy (${heartbeat.missedCount} missed heartbeats)`);
    
    if (onHeartbeatTimeout) {
      onHeartbeatTimeout();
    }
  }
}

/**
 * Called when heartbeat response (PONG/HEARTBEAT_ACK) is received
 */
export function onHeartbeatResponse(payload?: { timestamp?: number; watchState?: unknown }): void {
  const now = Date.now();
  
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
  }

  // Calculate latency
  if (heartbeat.lastSentAt) {
    heartbeat.lastLatencyMs = now - heartbeat.lastSentAt;
    
    // Update running average
    if (heartbeat.avgLatencyMs === 0) {
      heartbeat.avgLatencyMs = heartbeat.lastLatencyMs;
    } else {
      heartbeat.avgLatencyMs = Math.round(
        heartbeat.avgLatencyMs * 0.8 + heartbeat.lastLatencyMs * 0.2
      );
    }
  }

  heartbeat.lastReceivedAt = now;
  heartbeat.missedCount = 0;
  heartbeat.isHealthy = true;

  logInboundMessage('HEARTBEAT_ACK', payload, heartbeat.lastLatencyMs ?? undefined);
}

/**
 * Get current heartbeat state
 */
export function getHeartbeatState(): HeartbeatState {
  return { ...heartbeat };
}

// ============================================================================
// CONNECTION HEALTH
// ============================================================================

/**
 * Get current connection health status
 */
export function getConnectionHealth(): ConnectionHealth {
  const lastCommunicationAt = Math.max(
    heartbeat.lastReceivedAt || 0,
    messages.filter(m => m.direction === 'inbound').slice(-1)[0]?.timestamp || 0
  );

  const latencyMs = heartbeat.avgLatencyMs;
  const missedHeartbeats = heartbeat.missedCount;

  let status: ConnectionHealth['status'];
  if (!heartbeat.isHealthy || missedHeartbeats >= CONFIG.maxMissedHeartbeats) {
    status = 'disconnected';
  } else if (latencyMs <= CONFIG.latencyThresholds.excellent) {
    status = 'excellent';
  } else if (latencyMs <= CONFIG.latencyThresholds.good) {
    status = 'good';
  } else if (latencyMs <= CONFIG.latencyThresholds.fair) {
    status = 'fair';
  } else {
    status = 'poor';
  }

  return {
    status,
    latencyMs,
    missedHeartbeats,
    lastCommunicationAt: lastCommunicationAt || null,
    uptime: connectionEstablishedAt ? Date.now() - connectionEstablishedAt : 0,
  };
}

// ============================================================================
// DIAGNOSTIC EXPORT
// ============================================================================

/**
 * Export all diagnostic data for debugging
 */
export function exportDiagnostics(): DiagnosticExport {
  const avgLatency = stats.latencyCount > 0
    ? Math.round(stats.latencySum / stats.latencyCount)
    : 0;

  const totalMessages = stats.totalMessagesSent + stats.totalMessagesReceived;
  const successfulMessages = messages.filter(m => m.success).length;
  const successRate = totalMessages > 0
    ? Math.round((successfulMessages / messages.length) * 100)
    : 100;

  return {
    exportedAt: new Date().toISOString(),
    connectionHealth: getConnectionHealth(),
    heartbeat: getHeartbeatState(),
    recentMessages: [...messages],
    recentErrors: [...errors],
    statistics: {
      totalMessagesSent: stats.totalMessagesSent,
      totalMessagesReceived: stats.totalMessagesReceived,
      totalErrors: stats.totalErrors,
      avgLatencyMs: avgLatency,
      successRate,
    },
  };
}

/**
 * Export diagnostics as formatted string for sharing
 */
export function exportDiagnosticsAsText(): string {
  const data = exportDiagnostics();
  
  const lines: string[] = [
    '=== GARMIN DIAGNOSTICS ===',
    `Exported: ${data.exportedAt}`,
    '',
    '--- CONNECTION HEALTH ---',
    `Status: ${data.connectionHealth.status.toUpperCase()}`,
    `Latency: ${data.connectionHealth.latencyMs}ms`,
    `Missed Heartbeats: ${data.connectionHealth.missedHeartbeats}`,
    `Uptime: ${Math.round(data.connectionHealth.uptime / 1000)}s`,
    '',
    '--- STATISTICS ---',
    `Messages Sent: ${data.statistics.totalMessagesSent}`,
    `Messages Received: ${data.statistics.totalMessagesReceived}`,
    `Errors: ${data.statistics.totalErrors}`,
    `Success Rate: ${data.statistics.successRate}%`,
    `Avg Latency: ${data.statistics.avgLatencyMs}ms`,
    '',
    '--- RECENT ERRORS ---',
  ];

  if (data.recentErrors.length === 0) {
    lines.push('(none)');
  } else {
    for (const err of data.recentErrors.slice(-10)) {
      lines.push(`[${new Date(err.timestamp).toISOString()}] ${err.context}: ${err.message}`);
    }
  }

  lines.push('', '--- RECENT MESSAGES (last 20) ---');
  for (const msg of data.recentMessages.slice(-20)) {
    const arrow = msg.direction === 'outbound' ? '→' : '←';
    const status = msg.success ? '✓' : '✗';
    const latency = msg.latencyMs ? ` (${msg.latencyMs}ms)` : '';
    lines.push(`[${new Date(msg.timestamp).toISOString()}] ${arrow} ${msg.type} ${status}${latency}`);
  }

  return lines.join('\n');
}

/**
 * Clear all diagnostic data
 */
export function clearDiagnostics(): void {
  messages = [];
  errors = [];
  stats = {
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    totalErrors: 0,
    latencySum: 0,
    latencyCount: 0,
  };
  console.log('[Diagnostics] 🧹 Cleared all diagnostic data');
}

// ============================================================================
// EXPORTS
// ============================================================================

export const DiagnosticsConfig = CONFIG;

