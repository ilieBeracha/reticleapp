/**
 * Garmin Message Handlers
 *
 * Individual handler functions for each incoming message type.
 * Extracted from garminService.ts for better organization and testability.
 */

import {
    buildDetailsPartial,
    buildTimelineData,
    convertLegacyPayload,
    TimelineChunkAssembler,
    transformSummaryPayload
} from '../session/watchDataTransformer';
import type {
    WatchDetailsPayload,
    WatchSummaryPayload,
    WatchTimelineChunkPayload
} from '@/types/session.watch';
import type {
    GarminBiometrics,
    GarminInboundMessage,
    GarminPerformance,
    GarminServiceEvent,
    GarminSessionData,
    GarminSteadiness,
    GarminTimelineData,
    WatchErrorPayload
} from '@/types/garmin';

// ============================================================================
// HANDLER CONTEXT
// ============================================================================

/**
 * Context passed to all handlers, providing access to service internals.
 * This avoids circular dependencies and makes handlers testable.
 */
export interface MessageHandlerContext {
    /** Emit a service event to subscribers */
    emit: (event: GarminServiceEvent) => void;
    /** Send a message to the watch */
    sendMessage: (type: string, payload: Record<string, unknown>) => boolean;
    /** Timeline chunk assembler instance */
    timelineAssembler: TimelineChunkAssembler;
    /** Reset the timeline timeout for a session */
    resetTimelineTimeout: (sessionId: string) => void;
    /** Clear the timeline timeout for a session */
    clearTimelineTimeout: (sessionId: string) => void;
}

// ============================================================================
// ACK SENDING WITH RETRY
// ============================================================================

/**
 * ACK retry configuration
 */
const ACK_RETRY_CONFIG = {
    maxRetries: 5,
    initialDelayMs: 150,      // Start with 150ms delay
    maxDelayMs: 2000,         // Cap at 2 seconds
    backoffMultiplier: 1.5,   // Exponential backoff factor
};

/**
 * Send an ACK message with retry logic and exponential backoff.
 * This handles transient "Failure_InternalError" from ConnectIQ SDK.
 */
export function sendAckWithRetry(
    ctx: MessageHandlerContext,
    ackPayload: Record<string, unknown>,
    ackType: string,
    attempt: number = 1
): void {
    const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier } = ACK_RETRY_CONFIG;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
    );
    
    setTimeout(() => {
        try {
            const success = ctx.sendMessage('ACK', ackPayload);
            
            if (success) {
                console.log(`[GarminHandlers] ✅ ${ackType} ACK sent successfully${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
            } else {
                // sendMessage returned false - not connected
                if (attempt < maxRetries) {
                    console.warn(`[GarminHandlers] ⚠️ ${ackType} ACK failed (not connected), retry ${attempt + 1}/${maxRetries} in ${Math.round(delay * backoffMultiplier)}ms`);
                    sendAckWithRetry(ctx, ackPayload, ackType, attempt + 1);
                } else {
                    console.error(`[GarminHandlers] ❌ ${ackType} ACK failed after ${maxRetries} attempts - watch will retry`);
                }
            }
        } catch (error) {
            // Exception during send
            if (attempt < maxRetries) {
                console.warn(`[GarminHandlers] ⚠️ ${ackType} ACK error: ${error}, retry ${attempt + 1}/${maxRetries}`);
                sendAckWithRetry(ctx, ackPayload, ackType, attempt + 1);
            } else {
                console.error(`[GarminHandlers] ❌ ${ackType} ACK failed after ${maxRetries} attempts:`, error);
            }
        }
    }, delay);
}

// ============================================================================
// ACK HANDLER
// ============================================================================

/**
 * Handle ACK messages from watch.
 * These confirm receipt of messages and are used for retry logic.
 */
export function handleAckMessage(
    parsedPayload: unknown,
    handleAckReceived: (payload: { status?: string } | null) => void
): void {
    handleAckReceived(parsedPayload as { status?: string } | null);
}

// ============================================================================
// SESSION_RESULT / SESSION_DATA / SESSION_ENDED HANDLER (Legacy)
// ============================================================================

/**
 * Handle legacy session result messages.
 * Watch sends SESSION_RESULT when session ends (auto or manual).
 */
export function handleSessionResultMessage(
    parsedPayload: Record<string, unknown>,
    ctx: MessageHandlerContext
): void {
    console.log('[GarminHandlers] 📩 Processing session result...');

    // Debug: Log raw values from watch BEFORE any conversion
    console.log('[GarminHandlers] 📩 RAW from watch:');
    console.log('  - elapsedTime (seconds):', parsedPayload?.elapsedTime);
    console.log('  - shotsFired:', parsedPayload?.shotsFired);
    console.log('  - sessionId:', parsedPayload?.sessionId);
    console.log('  - distance:', parsedPayload?.distance);
    console.log('  - performance:', parsedPayload?.performance ? 'present' : 'absent');
    console.log('  - biometrics:', parsedPayload?.biometrics ? 'present' : 'absent');
    console.log('  - steadiness:', parsedPayload?.steadiness ? 'present' : 'absent');
    console.log('  - splitTimes:', (parsedPayload?.splitTimes as unknown[])?.length ?? 0, 'items');

    // Map SESSION_RESULT fields to our GarminSessionData format
    const rawElapsedTime = (parsedPayload?.elapsedTime as number) ?? 0;
    const convertedDurationMs = rawElapsedTime * 1000;

    console.log('[GarminHandlers] 📩 Converting: elapsedTime', rawElapsedTime, 'sec → durationMs', convertedDurationMs, 'ms');

    // Extract performance analytics if present
    const performance = parsedPayload?.performance as GarminPerformance | undefined;
    if (performance) {
        console.log('[GarminHandlers] 📩 Performance data:');
        console.log('  - firstShotTime:', performance.firstShotTime);
        console.log('  - bestSplit:', performance.bestSplit, '/ worstSplit:', performance.worstSplit);
        console.log('  - splitStdDev:', performance.splitStdDev);
        console.log('  - warmupAvg:', performance.warmupAvg, '/ restAvg:', performance.restAvg);
    }

    // Extract biometrics if present
    const biometrics = parsedPayload?.biometrics as GarminBiometrics | undefined;
    if (biometrics?.enabled) {
        console.log('[GarminHandlers] 📩 Biometrics data:');
        console.log('  - summary:', JSON.stringify(biometrics.summary));
        console.log('  - stressAvg:', biometrics.summary?.stressAvg, '/ stressTrend:', biometrics.summary?.stressTrend);
        console.log('  - optimalShots:', biometrics.summary?.optimalShots, '/', biometrics.summary?.optimalPct, '%');
        console.log('  - hrTimeline samples:', biometrics.hrTimeline?.length ?? 0);
        console.log('  - breathTimeline samples:', biometrics.breathTimeline?.length ?? 0);
        console.log('  - shotBiometrics:', biometrics.shotBiometrics?.length ?? 0);
    }

    // Extract steadiness if present
    const steadiness = parsedPayload?.steadiness as GarminSteadiness | undefined;
    if (steadiness?.enabled) {
        console.log('[GarminHandlers] 📩 Steadiness data:');
        console.log('  - avgScore:', steadiness.avgScore);
        console.log('  - flinchCount:', steadiness.flinchCount, '/ flinchRate:', steadiness.flinchRate, '%');
        console.log('  - recoilConsistency:', steadiness.recoilConsistency);
        console.log('  - bestShot:', steadiness.bestShot, '(', steadiness.bestScore, ')');
        console.log('  - worstShot:', steadiness.worstShot, '(', steadiness.worstScore, ')');
        console.log('  - shots:', steadiness.shots?.length ?? 0);
    }

    // Build heart rate from biometrics summary for backwards compatibility
    const heartRate = biometrics?.summary ? {
        avg: biometrics.summary.avgHR ?? 0,
        max: biometrics.summary.maxHR ?? 0,
        min: biometrics.summary.minHR ?? 0,
    } : undefined;

    const sessionData: GarminSessionData = {
        sessionId: parsedPayload?.sessionId as string | undefined,
        shotsRecorded: (parsedPayload?.shotsFired as number) ?? 0,
        durationMs: convertedDurationMs,
        // Shot timing data
        ...(parsedPayload?.splitTimes ? { splitTimes: parsedPayload.splitTimes as number[] } : {}),
        ...(parsedPayload?.avgSplit ? { avgSplitMs: parsedPayload.avgSplit as number } : {}),
        // Detection info
        ...(parsedPayload?.autoDetected !== undefined ? { autoDetected: parsedPayload.autoDetected as boolean } : {}),
        ...(parsedPayload?.detectionSensitivity ? { detectionSensitivity: parsedPayload.detectionSensitivity as number } : {}),
        ...(parsedPayload?.manualOverrides !== undefined ? { manualOverrides: parsedPayload.manualOverrides as number } : {}),
        // Basic fields
        ...(parsedPayload?.distance ? { distance: parsedPayload.distance as number } : {}),
        ...(parsedPayload?.completed !== undefined ? { completed: parsedPayload.completed as boolean } : {}),
        // Heart rate (backwards compatible)
        ...(heartRate && heartRate.avg > 0 ? { heartRate } : {}),
        // Performance analytics
        ...(performance ? { performance } : {}),
        // Full biometrics
        ...(biometrics ? { biometrics } : {}),
        // Steadiness data
        ...(steadiness ? { steadiness } : {}),
    };

    console.log('[GarminHandlers] 📩 Final sessionData:', JSON.stringify(sessionData, null, 2));
    ctx.emit({ event: 'session_data', data: sessionData });

    // Send ACK back to watch to confirm receipt
    sendSessionAck(parsedPayload?.sessionId as string | undefined, ctx);
}

// ============================================================================
// SESSION_SUMMARY HANDLER (Phase 1 - Two-Phase Sync)
// ============================================================================

/**
 * Handle SESSION_SUMMARY messages.
 * Phase 1 of two-phase sync - instant summary (~800 bytes).
 */
export function handleSessionSummaryMessage(
    parsedPayload: Record<string, unknown>,
    ctx: MessageHandlerContext
): void {
    console.log('[GarminHandlers] 📩 SESSION_SUMMARY received (Phase 1 - instant)');

    // Check if this is the new compact format (has 'sid' field)
    const isNewFormat = parsedPayload?.sid !== undefined;

    let transformedData;

    if (isNewFormat) {
        // New format: use transformer directly
        console.log('[GarminHandlers] 📩 New compact format detected');
        const summaryPayload = parsedPayload as unknown as WatchSummaryPayload;
        transformedData = transformSummaryPayload(summaryPayload);
    } else {
        // Legacy format: convert first
        console.log('[GarminHandlers] 📩 Legacy format detected, converting...');
        const legacyPayload = convertLegacyPayload(parsedPayload);
        transformedData = transformSummaryPayload(legacyPayload);
        // Override sessionId from legacy field
        transformedData.sessionId = (parsedPayload?.sessionId as string) ?? '';
    }

    console.log('[GarminHandlers] 📩 Transformed summary:', {
        sessionId: transformedData.sessionId,
        shots: transformedData.shotsRecorded,
        hits: transformedData.hitsRecorded,
        durationMs: transformedData.durationMs,
        splits: transformedData.splitTimes?.length ?? 0,
        biometricsEnabled: transformedData.biometrics?.enabled ?? false,
        steadinessEnabled: transformedData.steadiness?.enabled ?? false,
        hasWeather: transformedData.weather != null,
    });

    // Weather logging disabled
    // if (transformedData.weather) { ... }

    // Convert to GarminSessionData for backwards compatibility with existing store/UI
    const summaryData: GarminSessionData = {
        sessionId: transformedData.sessionId,
        shotsRecorded: transformedData.shotsRecorded,
        durationMs: transformedData.durationMs,
        distance: transformedData.distance,
        completed: transformedData.completed,
        splitTimes: transformedData.splitTimes,
        avgSplitMs: transformedData.avgSplitMs,
        // Heart rate
        ...(transformedData.biometrics.enabled && {
            heartRate: {
                avg: transformedData.biometrics.summary.avgHR,
                max: transformedData.biometrics.summary.maxHR,
                min: transformedData.biometrics.summary.minHR,
            }
        }),
        // Performance
        performance: {
            firstShotTime: transformedData.performance.firstShotTime,
            bestSplit: transformedData.performance.bestSplit,
            worstSplit: transformedData.performance.worstSplit,
        },
        // Biometrics
        ...(transformedData.biometrics.enabled && {
            biometrics: {
                enabled: true,
                summary: {
                    avgHR: transformedData.biometrics.summary.avgHR,
                    minHR: transformedData.biometrics.summary.minHR,
                    maxHR: transformedData.biometrics.summary.maxHR,
                    avgBreathRate: transformedData.biometrics.summary.avgBreathRate,
                },
            }
        }),
        // Steadiness
        ...(transformedData.steadiness.enabled && {
            steadiness: {
                enabled: true,
                avgScore: transformedData.steadiness.avgScore,
                trend: transformedData.steadiness.trend,
                flinchCount: transformedData.steadiness.flinchCount,
            }
        }),
        // Weather conditions - DISABLED
        // ...(transformedData.weather && {
        //     weather: transformedData.weather,
        // }),
        // Mark as summary-only (details coming later)
        isSummaryOnly: true,
    };

    ctx.emit({ event: 'session_summary', data: summaryData });

    // Send ACK with type: "summary" so watch knows to send details next
    const sessionIdForAck = transformedData.sessionId;
    if (sessionIdForAck) {
        console.log('[GarminHandlers] 📤 Sending SUMMARY ACK for sessionId:', sessionIdForAck);
        sendAckWithRetry(ctx, {
            sessionId: sessionIdForAck,
            type: 'summary',
            status: 'received',
        }, 'SUMMARY');
    }
}

// ============================================================================
// SESSION_DETAILS HANDLER (Deprecated - kept for backward compatibility)
// ============================================================================

/**
 * Handle SESSION_DETAILS messages.
 * DEPRECATED: In v2 protocol, per-shot data is in TIMELINE_CHUNK.
 * Kept for backward compatibility with older watch apps.
 */
export function handleSessionDetailsMessage(
    parsedPayload: Record<string, unknown>,
    ctx: MessageHandlerContext
): void {
    console.log('[GarminHandlers] 📩 SESSION_DETAILS received (DEPRECATED - still processing for compatibility)');

    // Check if this is the new compact format (has 'sid' field)
    const isNewFormat = parsedPayload?.sid !== undefined;

    let sessionId: string;
    let detailsData: Partial<GarminSessionData> & { sessionId: string };

    if (isNewFormat) {
        // New format: use transformer
        console.log('[GarminHandlers] 📩 New compact format detected');
        const detailsPayload = parsedPayload as unknown as WatchDetailsPayload;
        sessionId = detailsPayload.sid;

        // Build partial from new format
        const partialData = buildDetailsPartial(detailsPayload);

        console.log('[GarminHandlers] 📩 Details content (new format):');
        console.log('  - shotData:', detailsPayload.shotData?.length ?? 0, 'items');
        console.log('  - autoDetected:', detailsPayload.meta?.auto);
        console.log('  - sensitivity:', detailsPayload.meta?.sens);
        console.log('  - overrides:', detailsPayload.meta?.overrides);

        // Convert to GarminSessionData format for backwards compatibility
        detailsData = {
            sessionId,
            autoDetected: partialData.autoDetected,
            detectionSensitivity: partialData.detectionSensitivity,
            manualOverrides: partialData.manualOverrides,
            // Convert shotBiometrics to steadiness.shots format for existing merge logic
            steadiness: partialData.shotBiometrics ? {
                enabled: true,
                shots: partialData.shotBiometrics.map(sb => ({
                    shotNumber: sb.shot,
                    score: sb.steadiness,
                    grade: sb.steadiness >= 80 ? 'A' : sb.steadiness >= 60 ? 'B' : sb.steadiness >= 40 ? 'C' : 'D',
                    flinch: sb.flinch,
                })),
                shotCount: partialData.shotBiometrics.length,
            } : undefined,
            // Also include per-shot biometrics in the biometrics section
            biometrics: partialData.shotBiometrics ? {
                enabled: true,
                shotBiometrics: partialData.shotBiometrics.map(sb => ({
                    shot: sb.shot,
                    hr: sb.hr,
                })),
            } : undefined,
            isSummaryOnly: false,
        };
    } else {
        // Legacy format: extract fields directly
        console.log('[GarminHandlers] 📩 Legacy format detected');
        sessionId = (parsedPayload?.sessionId as string) ?? '';

        const performance = parsedPayload?.performance as GarminPerformance | undefined;
        const biometrics = parsedPayload?.biometrics as GarminBiometrics | undefined;
        const steadiness = parsedPayload?.steadiness as GarminSteadiness | undefined;

        console.log('[GarminHandlers] 📩 Details content (legacy):');
        console.log('  - splitTimes:', (parsedPayload?.splitTimes as unknown[])?.length ?? 0, 'items');
        console.log('  - performance:', performance ? 'present' : 'absent');
        console.log('  - biometrics.shotBiometrics:', biometrics?.shotBiometrics?.length ?? 0, 'items');
        console.log('  - steadiness.shots:', steadiness?.shots?.length ?? 0, 'items');

        detailsData = {
            sessionId,
            ...(parsedPayload?.splitTimes ? { splitTimes: parsedPayload.splitTimes as number[] } : {}),
            ...(parsedPayload?.autoDetected !== undefined ? { autoDetected: parsedPayload.autoDetected as boolean } : {}),
            ...(parsedPayload?.detectionSensitivity ? { detectionSensitivity: parsedPayload.detectionSensitivity as number } : {}),
            ...(parsedPayload?.manualOverrides !== undefined ? { manualOverrides: parsedPayload.manualOverrides as number } : {}),
            ...(performance ? { performance } : {}),
            ...(biometrics ? { biometrics } : {}),
            ...(steadiness ? { steadiness } : {}),
            isSummaryOnly: false,
        };
    }

    console.log('[GarminHandlers] 📩 Details data keys:', Object.keys(detailsData));
    ctx.emit({ event: 'session_details', data: detailsData });

    // Send ACK with type: "details" so watch clears storage
    if (sessionId) {
        console.log('[GarminHandlers] 📤 Sending DETAILS ACK for sessionId:', sessionId);
        sendAckWithRetry(ctx, {
            sessionId,
            type: 'details',
            status: 'received',
        }, 'DETAILS');
    }
}

// ============================================================================
// TIMELINE_CHUNK HANDLER (Phase 3 - Three-Phase Sync)
// ============================================================================

/**
 * Handle TIMELINE_CHUNK messages.
 * Phase 3 of three-phase sync - time-series biometric data in chunks.
 */
export function handleTimelineChunkMessage(
    parsedPayload: Record<string, unknown>,
    ctx: MessageHandlerContext
): void {
    console.log('[GarminHandlers] 📩 TIMELINE_CHUNK received (Phase 3 - time-series)');

    const chunkPayload = parsedPayload as unknown as WatchTimelineChunkPayload;
    const { sid, chunk: chunkIndex, total, pts, shots } = chunkPayload;

    console.log(`[GarminHandlers] 📩 Chunk ${chunkIndex + 1}/${total} for ${sid.slice(0, 8)}...`);
    console.log(`[GarminHandlers] 📩 Points in chunk: ${pts?.length ?? 0}`);
    if (shots) {
        console.log(`[GarminHandlers] 📩 Shot details in chunk: ${shots.length} (last chunk)`);
    }

    // Emit progress event
    ctx.emit({ event: 'timeline_chunk', sessionId: sid, chunk: chunkIndex, total });

    // Reset timeout (will clear incomplete chunks after 30s of inactivity)
    ctx.resetTimelineTimeout(sid);

    // Add to assembler and check if complete
    const assembledData = ctx.timelineAssembler.addChunk(chunkPayload);

    // Send ACK for this chunk with retry
    if (sid) {
        console.log(`[GarminHandlers] 📤 Sending TIMELINE ACK for chunk ${chunkIndex + 1}/${total}`);
        sendAckWithRetry(ctx, {
            sessionId: sid,
            type: 'timeline',
            chunk: chunkIndex,
            status: 'received',
        }, `TIMELINE chunk ${chunkIndex + 1}/${total}`);
    }

    // If all chunks received, emit complete event
    if (assembledData) {
        // Clear timeout since we completed successfully
        ctx.clearTimelineTimeout(sid);

        console.log('[GarminHandlers] 📩 ✅ All timeline chunks received!');
        console.log(`[GarminHandlers] 📩 Total points: ${assembledData.points.length}`);
        console.log(`[GarminHandlers] 📩 Shot details: ${assembledData.shotDetails.length}`);

        // Build the timeline data in the format for storage/display
        const timelineData = buildTimelineData(assembledData);

        // Convert to the event format
        const eventData: GarminTimelineData = {
            sessionId: timelineData.session_id,
            points: timelineData.points,
            shotDetails: timelineData.shot_details,
            summary: {
                totalPoints: timelineData.summary.total_points,
                totalShots: timelineData.summary.total_shots,
                durationSeconds: timelineData.summary.duration_seconds,
                hrMin: timelineData.summary.hr_min,
                hrMax: timelineData.summary.hr_max,
                hrAvg: timelineData.summary.hr_avg,
                stressMin: timelineData.summary.stress_min,
                stressMax: timelineData.summary.stress_max,
                stressAvg: timelineData.summary.stress_avg,
            },
        };

        console.log('[GarminHandlers] 📩 Timeline summary:', eventData.summary);
        ctx.emit({ event: 'timeline_complete', data: eventData });
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Send an ACK message back to the watch to confirm receipt.
 */
function sendSessionAck(
    sessionId: string | undefined,
    ctx: MessageHandlerContext
): void {
    if (sessionId) {
        console.log('[GarminHandlers] 📤 Sending ACK for sessionId:', sessionId);
        sendAckWithRetry(ctx, {
            sessionId,
            received: true,
        }, 'SESSION');
    } else {
        console.warn('[GarminHandlers] ⚠️ No sessionId in payload, cannot send ACK');
    }
}

// ============================================================================
// SHOT_RECORDED HANDLER
// ============================================================================

/**
 * Handle SHOT_RECORDED messages from the watch.
 * Watch payload format:
 * {
 *   "type": "SHOT_RECORDED",
 *   "payload": {
 *     "sid": "session-id",
 *     "shot": 1,
 *     "ts": 1738627200000
 *   }
 * }
 *
 * The timestamp captured here is the phone's Date.now() when the message arrived,
 * which is on the same clock as audio detections - no offset calculation needed!
 */
export function handleShotRecordedMessage(
    parsedPayload: Record<string, unknown>,
    ctx: MessageHandlerContext
): void {
    // Capture phone timestamp immediately (same clock as audio detections)
    const phoneTimestamp = Date.now();

    // Extract fields from watch payload
    const sessionId = parsedPayload?.sid as string | undefined;
    const shotNumber = (parsedPayload?.shot as number) ?? 0;
    const watchTimestamp = parsedPayload?.ts as number | undefined;

    console.log(`[GarminHandlers] 🎯 SHOT_RECORDED #${shotNumber} for session ${sessionId?.slice(0, 8)}...`);
    console.log(`[GarminHandlers] 🎯 Phone time: ${phoneTimestamp}, Watch time: ${watchTimestamp}`);

    // Emit event for the store to accumulate (using phone timestamp for correlation)
    ctx.emit({ event: 'shot_recorded', sessionId, timestamp: phoneTimestamp, shotNumber });
}

// ============================================================================
// WATCH ERROR HANDLER
// ============================================================================

/**
 * Handle ERROR messages from the watch.
 * These report communication failures, ACK timeouts, and sync issues.
 */
export function handleWatchErrorMessage(
    parsedPayload: Record<string, unknown>
): void {
    const payload = parsedPayload as unknown as WatchErrorPayload;
    const { code, message, timestamp, errorCount } = payload;

    // Convert Unix timestamp to ISO string
    const deviceTime = timestamp > 0
        ? new Date(timestamp * 1000).toISOString()
        : new Date().toISOString();

    // Log error with full context
    console.error(`[GarminHandlers] 🚨 WATCH ERROR: ${code}`);
    console.error(`[GarminHandlers] 🚨 Message: ${message}`);
    console.error(`[GarminHandlers] 🚨 Device time: ${deviceTime}`);
    console.error(`[GarminHandlers] 🚨 Total errors this session: ${errorCount}`);

    // Log specific guidance based on error code
    switch (code) {
        case 'SEND_FAILED':
            console.warn('[GarminHandlers] ⚠️ Check Bluetooth connection to watch');
            break;
        case 'ACK_TIMEOUT':
            console.warn('[GarminHandlers] ⚠️ Phone may not be receiving messages - check app is in foreground');
            break;
        case 'SYNC_PARTIAL':
            console.warn('[GarminHandlers] ⚠️ Some timeline data may be missing - data saved on watch for retry');
            break;
        default:
            console.warn(`[GarminHandlers] ⚠️ Unknown error code: ${code}`);
    }
}

// ============================================================================
// MESSAGE TYPE CONSTANTS
// ============================================================================

/** Message types that are handled by this module */
export const HANDLED_MESSAGE_TYPES = [
    'ACK',
    'ERROR',
    'SESSION_DATA',
    'SESSION_RESULT',
    'SESSION_ENDED',
    'SESSION_SUMMARY',
    'SESSION_DETAILS',
    'TIMELINE_CHUNK',
    'TIMELINE',
    'BIOMETRIC_TIMELINE',
    'TIMELINE_DATA',
    'SHOT_RECORDED',
    'HEARTBEAT',
    'PONG',
] as const;

/** Timeline message type aliases */
export const TIMELINE_MESSAGE_TYPES = [
    'TIMELINE_CHUNK',
    'TIMELINE',
    'BIOMETRIC_TIMELINE',
    'TIMELINE_DATA',
] as const;

/**
 * Check if a message type is a timeline-related message
 */
export function isTimelineMessage(type: string): boolean {
    return TIMELINE_MESSAGE_TYPES.includes(type as typeof TIMELINE_MESSAGE_TYPES[number]);
}

/**
 * Check if a message type is handled by this module
 */
export function isHandledMessage(type: string): boolean {
    return HANDLED_MESSAGE_TYPES.includes(type as typeof HANDLED_MESSAGE_TYPES[number]);
}

/**
 * Route an incoming message to the appropriate handler.
 * Returns true if the message was handled, false otherwise.
 */
export function routeMessage(
    message: GarminInboundMessage,
    parsedPayload: unknown,
    ctx: MessageHandlerContext,
    handleAckReceived: (payload: { status?: string } | null) => void
): boolean {
    const { type } = message;

    // ACK messages
    if (type === 'ACK') {
        handleAckMessage(parsedPayload, handleAckReceived);
        return true;
    }

    // Error messages from watch
    if (type === 'ERROR') {
        handleWatchErrorMessage(parsedPayload as Record<string, unknown>);
        return true;
    }

    // Session result messages (legacy)
    if (type === 'SESSION_DATA' || type === 'SESSION_ENDED' || type === 'SESSION_RESULT') {
        handleSessionResultMessage(parsedPayload as Record<string, unknown>, ctx);
        return true;
    }

    // Session summary (Phase 1)
    if (type === 'SESSION_SUMMARY') {
        handleSessionSummaryMessage(parsedPayload as Record<string, unknown>, ctx);
        return true;
    }

    // Session details (deprecated)
    if (type === 'SESSION_DETAILS') {
        handleSessionDetailsMessage(parsedPayload as Record<string, unknown>, ctx);
        return true;
    }

    // Timeline chunks (Phase 3)
    if (isTimelineMessage(type)) {
        handleTimelineChunkMessage(parsedPayload as Record<string, unknown>, ctx);
        return true;
    }

    // Real-time shot detection from watch
    if (type === 'SHOT_RECORDED') {
        handleShotRecordedMessage(parsedPayload as Record<string, unknown>, ctx);
        return true;
    }

    // Unhandled message types
    if (!isHandledMessage(type)) {
        console.warn('[GarminHandlers] ⚠️ UNHANDLED MESSAGE TYPE:', type);
        console.warn('[GarminHandlers] ⚠️ Full message:', JSON.stringify(message).slice(0, 500));
    }

    return false;
}

