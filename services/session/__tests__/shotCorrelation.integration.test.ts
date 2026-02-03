/**
 * Shot Correlation Integration Tests
 *
 * Tests realistic scenarios matching real-world shooting range conditions.
 */

import { correlateShots } from '../shotCorrelation';
import type { AudioDetection } from '@/types/audio';

describe('Shot Correlation - Real World Scenarios', () => {
  describe('Solo shooter at quiet range', () => {
    it('should achieve 100% correlation when alone', () => {
      // User fires 10 shots, audio only picks up their shots
      const watchTimestamps = [
        1000, 3500, 6200, 8800, 11500,
        14200, 17000, 19500, 22100, 25000,
      ];

      // Audio detections are slightly delayed (10-50ms typical)
      const audioDetections: AudioDetection[] = watchTimestamps.map((ts) => ({
        timestamp: ts + Math.floor(Math.random() * 40) + 10,
        confidence: 0.85 + Math.random() * 0.1,
        peakEnergy: 0.6 + Math.random() * 0.2,
      }));

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.summary.totalUserShots).toBe(10);
      expect(result.summary.totalDistantShots).toBe(0);
      expect(result.summary.correlationRate).toBe(1);
    });
  });

  describe('Busy range with multiple shooters', () => {
    it('should correctly identify user shots among distant shots', () => {
      // User fires 5 shots
      const watchTimestamps = [2000, 8000, 15000, 22000, 30000];

      // Audio picks up user shots + 8 distant shots
      const audioDetections: AudioDetection[] = [
        // Distant shot
        { timestamp: 500, confidence: 0.5, peakEnergy: 0.2 },
        // User shot (matches 2000)
        { timestamp: 2030, confidence: 0.9, peakEnergy: 0.7 },
        // Distant shots
        { timestamp: 4500, confidence: 0.4, peakEnergy: 0.15 },
        { timestamp: 6000, confidence: 0.45, peakEnergy: 0.18 },
        // User shot (matches 8000)
        { timestamp: 7980, confidence: 0.88, peakEnergy: 0.68 },
        // Distant shot
        { timestamp: 10000, confidence: 0.5, peakEnergy: 0.2 },
        // User shot (matches 15000)
        { timestamp: 15050, confidence: 0.92, peakEnergy: 0.75 },
        // Distant shots
        { timestamp: 18000, confidence: 0.48, peakEnergy: 0.19 },
        { timestamp: 20000, confidence: 0.52, peakEnergy: 0.21 },
        // User shot (matches 22000)
        { timestamp: 22020, confidence: 0.87, peakEnergy: 0.65 },
        // Distant shots
        { timestamp: 25000, confidence: 0.47, peakEnergy: 0.17 },
        { timestamp: 28000, confidence: 0.51, peakEnergy: 0.2 },
        // User shot (matches 30000)
        { timestamp: 29990, confidence: 0.91, peakEnergy: 0.72 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.summary.totalUserShots).toBe(5);
      expect(result.summary.totalDistantShots).toBe(8);
      expect(result.summary.correlationRate).toBe(1);

      // Verify user shots have high confidence/energy
      result.userShots.forEach((shot) => {
        expect(shot.confidence).toBeGreaterThan(0.85);
        expect(shot.peakEnergy).toBeGreaterThan(0.6);
      });

      // Verify distant shots have lower confidence/energy
      result.distantShots.forEach((shot) => {
        expect(shot.confidence).toBeLessThan(0.6);
        expect(shot.peakEnergy).toBeLessThan(0.3);
      });
    });
  });

  describe('Suppressed firearm scenario', () => {
    it('should count watch-only as user shots', () => {
      // User fires 5 suppressed shots - watch detects all, audio detects none
      const watchTimestamps = [1000, 3000, 5000, 7000, 9000];
      const audioDetections: AudioDetection[] = [];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(5);
      expect(result.summary.totalUserShots).toBe(5); // Watch-only counts as user
      expect(result.summary.correlationRate).toBe(0);
    });
  });

  describe('Rapid fire drill', () => {
    it('should handle shots 200ms apart', () => {
      // 5 shots, 200ms apart (fast but not crazy)
      const watchTimestamps = [1000, 1200, 1400, 1600, 1800];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1020, confidence: 0.9, peakEnergy: 0.7 },
        { timestamp: 1220, confidence: 0.88, peakEnergy: 0.68 },
        { timestamp: 1380, confidence: 0.91, peakEnergy: 0.72 },
        { timestamp: 1610, confidence: 0.87, peakEnergy: 0.66 },
        { timestamp: 1790, confidence: 0.89, peakEnergy: 0.69 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(5);
      expect(result.summary.correlationRate).toBe(1);
    });
  });
});
