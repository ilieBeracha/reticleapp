/**
 * Shot Correlation Tests
 *
 * Tests for correlating audio detections with watch timestamps.
 */

import { correlateShots } from '../shotCorrelation';
import type { AudioDetection, CorrelationResult } from '@/types/audio';

describe('correlateShots', () => {
  describe('Empty inputs', () => {
    it('should return empty results when no watch timestamps', () => {
      const audioDetections: AudioDetection[] = [
        { timestamp: 1000, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 2000, confidence: 0.8, peakEnergy: 0.4 },
      ];

      const result = correlateShots([], audioDetections);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(0);
      expect(result.distantShots).toHaveLength(2);
      expect(result.summary.totalUserShots).toBe(0);
      expect(result.summary.totalDistantShots).toBe(2);
      expect(result.summary.correlationRate).toBe(1);
    });

    it('should return empty results when no audio detections', () => {
      const watchTimestamps = [1000, 2000, 3000];

      const result = correlateShots(watchTimestamps, []);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(3);
      expect(result.distantShots).toHaveLength(0);
      expect(result.summary.totalUserShots).toBe(3);
      expect(result.summary.correlationRate).toBe(0);
    });

    it('should return empty results when both inputs are empty', () => {
      const result = correlateShots([], []);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(0);
      expect(result.distantShots).toHaveLength(0);
      expect(result.summary.totalUserShots).toBe(0);
      expect(result.summary.totalDistantShots).toBe(0);
      expect(result.summary.correlationRate).toBe(1);
    });
  });

  describe('Perfect correlation', () => {
    it('should match all shots when timestamps are identical', () => {
      const watchTimestamps = [1000, 2000, 3000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1000, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 2000, confidence: 0.8, peakEnergy: 0.4 },
        { timestamp: 3000, confidence: 0.85, peakEnergy: 0.45 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(3);
      expect(result.watchOnlyShots).toHaveLength(0);
      expect(result.distantShots).toHaveLength(0);
      expect(result.summary.correlationRate).toBe(1);

      result.userShots.forEach((shot) => {
        expect(shot.correlationDeltaMs).toBe(0);
        expect(shot.source).toBe('user');
      });
    });

    it('should match shots within 200ms window', () => {
      const watchTimestamps = [1000, 2000, 3000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1150, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 1850, confidence: 0.8, peakEnergy: 0.4 },
        { timestamp: 3100, confidence: 0.85, peakEnergy: 0.45 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(3);
      expect(result.distantShots).toHaveLength(0);
      expect(result.summary.correlationRate).toBe(1);
    });
  });

  describe('No correlation', () => {
    it('should not match shots outside 200ms window', () => {
      const watchTimestamps = [1000, 5000, 9000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 2500, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 3500, confidence: 0.8, peakEnergy: 0.4 },
        { timestamp: 7000, confidence: 0.85, peakEnergy: 0.45 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(3);
      expect(result.distantShots).toHaveLength(3);
      expect(result.summary.totalUserShots).toBe(3);
      expect(result.summary.totalDistantShots).toBe(3);
      expect(result.summary.correlationRate).toBe(0);
    });
  });

  describe('Partial correlation', () => {
    it('should correctly classify mixed scenario', () => {
      const watchTimestamps = [1000, 3000, 5000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1050, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 2000, confidence: 0.7, peakEnergy: 0.3 },
        { timestamp: 3100, confidence: 0.85, peakEnergy: 0.45 },
        { timestamp: 4000, confidence: 0.6, peakEnergy: 0.25 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(2);
      expect(result.watchOnlyShots).toHaveLength(1);
      expect(result.distantShots).toHaveLength(2);
      expect(result.summary.totalUserShots).toBe(3);
      expect(result.summary.totalDistantShots).toBe(2);
      expect(result.summary.correlationRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid fire (shots close together)', () => {
      const watchTimestamps = [1000, 1100, 1200];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1020, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 1110, confidence: 0.85, peakEnergy: 0.48 },
        { timestamp: 1190, confidence: 0.88, peakEnergy: 0.49 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(3);
      expect(result.distantShots).toHaveLength(0);
    });

    it('should not double-match an audio detection', () => {
      const watchTimestamps = [1000, 1100];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1050, confidence: 0.9, peakEnergy: 0.5 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(1);
      expect(result.watchOnlyShots).toHaveLength(1);
      expect(result.distantShots).toHaveLength(0);
    });

    it('should use custom window size', () => {
      const watchTimestamps = [1000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1300, confidence: 0.9, peakEnergy: 0.5 },
      ];

      const result1 = correlateShots(watchTimestamps, audioDetections);
      expect(result1.userShots).toHaveLength(0);

      const result2 = correlateShots(watchTimestamps, audioDetections, { windowMs: 500 });
      expect(result2.userShots).toHaveLength(1);
    });

    it('should preserve audio metadata in correlated shots', () => {
      const watchTimestamps = [1000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1050, confidence: 0.92, peakEnergy: 0.67 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots[0].confidence).toBe(0.92);
      expect(result.userShots[0].peakEnergy).toBe(0.67);
      expect(result.userShots[0].watchTimestamp).toBe(1000);
      expect(result.userShots[0].audioTimestamp).toBe(1050);
      expect(result.userShots[0].correlationDeltaMs).toBe(50);
    });

    it('should handle unsorted input arrays', () => {
      const watchTimestamps = [3000, 1000, 2000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 2050, confidence: 0.8, peakEnergy: 0.4 },
        { timestamp: 3020, confidence: 0.85, peakEnergy: 0.45 },
        { timestamp: 1010, confidence: 0.9, peakEnergy: 0.5 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(3);
      expect(result.summary.correlationRate).toBe(1);
    });
  });
});
