/**
 * Garmin Service Module
 *
 * Re-exports all Garmin-related types and functions.
 * Import from '@/services/garmin' for cleaner imports.
 */

// Types (from dedicated types file)
export type { MessageHandlerContext } from './garmin.handlers';
export type {
    BiometricsSummary,
    GarminBiometrics,
    GarminConfig,
    GarminConnectionStatus,
    GarminDevice,
    GarminInboundMessage,
    GarminInboundMessageType,
    GarminOutboundMessageType,
    GarminPerformance,
    GarminServiceEvent,
    GarminServiceListener,
    GarminSessionData,
    GarminSteadiness,
    GarminTimelineData,
    ShotBiometrics,
    ShotSteadiness,
    StartWatchSessionPayload,
    WatchDetectionConfig
} from './garmin.types';

// Service functions and constants (from main service file)
export {
    endWatchSession,
    // Constants
    GARMIN_DEFAULT_CONFIG,
    // Re-export Status enum from SDK
    GarminDeviceStatus,
    // State getters
    getConfig, getCurrentStatus, getIsReady, getPairedDevices,
    // Initialization
    initialize, isConnected,
    // Mock utilities
    mockWatchSessionResult, openDeviceSelection,
    // Device management
    refreshDevices,
    // Message sending
    sendMessage,
    sendMessageWithRetry,
    // Session helpers
    startWatchSession, subscribe, syncDrillToWatch,
    // Diagnostics
    exportDiagnostics,
    exportDiagnosticsAsText,
    clearDiagnostics,
    getConnectionHealth,
    getHeartbeatState,
} from '../garminService';

// Re-export diagnostic types
export type {
    DiagnosticMessage,
    DiagnosticError,
    HeartbeatState,
    ConnectionHealth,
    DiagnosticExport,
} from './garmin.diagnostics';

