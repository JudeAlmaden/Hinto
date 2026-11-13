import { describe, expect, it } from '@jest/globals';

import { createTriggerState, type TriggerStage } from '../index';
import { evaluateTrigger } from '../trigger';

const DESTINATION = { latitude: 14.5995, longitude: 120.9842 };
const M_PER_DEG_LAT = 111_320;
const NOW = 1_700_000_000_000;
const PRIMARY = 1000;

function northBy(metres: number) {
  return { latitude: DESTINATION.latitude + metres / M_PER_DEG_LAT, longitude: DESTINATION.longitude };
}

function sample(metres: number, options: { accuracy?: number; at?: number; south?: boolean } = {}) {
  const point = northBy(options.south ? -metres : metres);
  return {
    ...point,
    accuracyM: options.accuracy ?? 15,
    timestamp: options.at ?? NOW - 1_000,
  };
}

const STAGES: TriggerStage[] = [{ radiusM: PRIMARY, stageIndex: 0 }];

function evaluate(
  metredit: ReturnType<typeof sample>,
  state = createTriggerState(),
  stages: TriggerStage[] = STAGES,
) {
  return evaluateTrigger({
    sample: metredit,
    destination: DESTINATION,
    primaryRadiusM: PRIMARY,
    stages,
    timeIntervalMs: 10_000,
    state,
    now: NOW,
  });
}

describe('evaluateTrigger — single stage', () => {
  it('fires when the fix is confidently inside the radius', () => {
    const decision = evaluate(sample(900));
    expect(decision.fireStage?.stageIndex).toBe(0);
    expect(decision.distanceM).toBeGreaterThan(880);
    expect(decision.distanceM).toBeLessThan(920);
    expect(decision.estimateOnly).toBe(false);
  });

  it('does not fire while the error bound still reaches outside the radius', () => {
    const decision = evaluate(sample(980, { accuracy: 40 }));
    expect(decision.fireStage).toBeNull();
  });

  it('refuses a poor fix even when the point is well inside', () => {
    const decision = evaluate(sample(400, { accuracy: 80 }));
    expect(decision.fireStage).toBeNull();
    expect(decision.accuracyRejected).toBe(true);
  });

  it('ignores a stale sample', () => {
    const decision = evaluate(sample(900, { at: NOW - 120_000 }));
    expect(decision.fireStage).toBeNull();
    expect(decision.stale).toBe(true);
  });

  it('records the first entry into the radius only once', () => {
    const first = evaluate(sample(900));
    expect(first.enteredRadius).toBe(true);
    expect(first.state.enteredRadiusAt).toBe(NOW);

    const second = evaluate(sample(850), first.state);
    expect(second.enteredRadius).toBe(false);
    expect(second.state.enteredRadiusAt).toBe(NOW);
  });

  it('fires each stage only once', () => {
    const first = evaluate(sample(900));
    const second = evaluate(sample(920), first.state);
    expect(first.fireStage?.stageIndex).toBe(0);
    expect(second.fireStage).toBeNull();
    expect(second.state.firedStages).toEqual([0]);
  });

  it('does not re-fire when jitter crosses the boundary again', () => {
    const first = evaluate(sample(950));
    const outside = evaluate(sample(1080), first.state);
    const back = evaluate(sample(950), outside.state);
    expect(outside.fireStage).toBeNull();
    expect(back.fireStage).toBeNull();
  });
});

describe('evaluateTrigger — multi-stage', () => {
  const stages: TriggerStage[] = [
    { radiusM: 3000, stageIndex: 0 },
    { radiusM: 1000, stageIndex: 1 },
  ];

  it('fires the earlier stage at the wider radius', () => {
    const decision = evaluate(sample(2800), createTriggerState(), stages);
    expect(decision.fireStage?.stageIndex).toBe(0);
    expect(decision.state.firedStages).toEqual([0]);
  });

  it('fires the innermost stage when both radii are crossed at once', () => {
    const decision = evaluate(sample(900), createTriggerState(), stages);
    expect(decision.fireStage?.stageIndex).toBe(1);
    expect(decision.state.firedStages.sort()).toEqual([0, 1]);
  });

  it('fires the primary stage after the earlier one', () => {
    const earlier = evaluate(sample(2800), createTriggerState(), stages);
    const primary = evaluate(sample(900), earlier.state, stages);
    expect(primary.fireStage?.stageIndex).toBe(1);
    expect(primary.state.firedStages.sort()).toEqual([0, 1]);
  });
});

describe('evaluateTrigger — overshoot', () => {
  it('notices a radius crossed between two trustworthy fixes', () => {
    const before = evaluate(sample(1200, { at: NOW - 21_000 }));
    expect(before.fireStage).toBeNull();

    const after = evaluate(sample(1200, { at: NOW - 1_000, south: true }), before.state);
    expect(after.fireStage?.stageIndex).toBe(0);
    expect(after.estimateOnly).toBe(true);
  });

  it('does not infer an overshoot from a single outside sample', () => {
    const decision = evaluate(sample(1500, { south: true }));
    expect(decision.fireStage).toBeNull();
    expect(decision.estimateOnly).toBe(false);
  });

  it('does not infer an overshoot with an inaccurate current fix', () => {
    const before = evaluate(sample(1200, { at: NOW - 21_000 }));
    const after = evaluate(sample(1200, { at: NOW - 1_000, south: true, accuracy: 120 }), before.state);
    expect(after.fireStage).toBeNull();
  });
});

describe('evaluateTrigger — state', () => {
  it('keeps the last distance for the UI even when the fix is rejected', () => {
    const before = evaluate(sample(1200));
    const after = evaluate(sample(1100, { accuracy: 90 }), before.state);
    expect(after.distanceM).toBeGreaterThan(1090);
  });

  it('tracks the last trustworthy sample time', () => {
    const decision = evaluate(sample(4000, { at: NOW - 5_000 }));
    expect(decision.state.lastTrustworthySampleAt).toBe(NOW - 5_000);
  });
});
