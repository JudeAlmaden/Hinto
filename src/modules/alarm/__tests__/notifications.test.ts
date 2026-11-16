import { describe, expect, it } from '@jest/globals';

import { extractAlarmJourneyId } from '../notifications';
import { ALARM_CATEGORY_ID, ALARM_ACTION_STOP_ID, soundFileName } from '../channels';

describe('alarm channels and notifications', () => {
  it('uses a category ID without hyphens or colons for Android compatibility', () => {
    expect(ALARM_CATEGORY_ID).not.toMatch(/[:\-]/);
    expect(ALARM_ACTION_STOP_ID).not.toMatch(/[:\-]/);
  });

  it('maps alarm sounds to bundled wav filenames', () => {
    expect(soundFileName('classic')).toBe('alarm_classic.wav');
    expect(soundFileName('chime')).toBe('alarm_chime.wav');
    expect(soundFileName('beep')).toBe('alarm_beep.wav');
    expect(soundFileName('custom')).toBe('alarm_classic.wav');
  });

  it('extracts journey id from notification response', () => {
    expect(extractAlarmJourneyId(null)).toBeNull();
    expect(extractAlarmJourneyId({ notification: { request: { content: {} } } } as any)).toBeNull();
    expect(
      extractAlarmJourneyId({
        notification: {
          request: {
            content: {
              data: { journeyId: 'journey-123' },
            },
          },
        },
      } as any),
    ).toBe('journey-123');
  });
});
