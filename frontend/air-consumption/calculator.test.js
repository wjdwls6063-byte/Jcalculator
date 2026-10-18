import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAirConsumption } from './calculator.js';

const smcExample = {
  mode: 'double', bore: 20, rod: 8, stroke: 50,
  pressureOut: 0.4, pressureIn: 0.4,
  tubeIdOut: 4, tubeIdIn: 4, tubeLengthOut: 1500, tubeLengthIn: 1500,
  cyclesPerMinute: 30, cylinderCount: 1, temperatureC: 20, includePiping: true,
};

test('SMC Korea section 1.7.5 worked example: 0.154 + 0.141 = 0.295 L/cycle and 8.85 L/min', () => {
  const result = calculateAirConsumption(smcExample);
  assert.ok(Math.abs(result.extension.total - 0.154) < 0.0005);
  assert.ok(Math.abs(result.retraction.total - 0.141) < 0.0005);
  assert.ok(Math.abs(result.perCycle - 0.295) < 0.0005);
  assert.ok(Math.abs(result.perMinuteTotal - 8.85) < 0.015);
});

test('single acting modes count only the supplied stroke', () => {
  const double = calculateAirConsumption(smcExample);
  const returning = calculateAirConsumption({ ...smcExample, mode: 'spring-return' });
  const extending = calculateAirConsumption({ ...smcExample, mode: 'spring-extend' });
  assert.equal(returning.perCycle, double.extension.total);
  assert.equal(extending.perCycle, double.retraction.total);
});

test('piping exclusion and multiple cylinders affect only the expected terms', () => {
  const base = calculateAirConsumption(smcExample);
  const noPipe = calculateAirConsumption({ ...smcExample, includePiping: false, cylinderCount: 2 });
  assert.equal(noPipe.extension.piping, 0);
  assert.ok(noPipe.perCycle < base.perCycle);
  assert.equal(noPipe.perMinuteTotal, noPipe.perMinuteEach * 2);
});

test('rejects impossible cylinder geometry and negative operating pressure', () => {
  assert.throws(() => calculateAirConsumption({ ...smcExample, rod: 20 }));
  assert.throws(() => calculateAirConsumption({ ...smcExample, pressureOut: -0.1 }));
});
