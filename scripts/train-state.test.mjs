import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trainPhase} from '../src/lib/train/TrainState.ts';

test('train phase is derived consistently for WebGL and SVG', () => {
  assert.equal(trainPhase(false, false, false, false), 'paused');
  assert.equal(trainPhase(true, false, false, false), 'running');
  assert.equal(trainPhase(true, true, false, false), 'paused');
  assert.equal(trainPhase(true, false, true, false), 'reduced');
  assert.equal(trainPhase(false, true, true, false), 'reduced');
  assert.equal(trainPhase(true, false, false, true), 'disposed');
  assert.equal(trainPhase(true, false, true, true), 'disposed');
});
