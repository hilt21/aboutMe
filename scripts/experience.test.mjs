import {test} from 'node:test';import assert from 'node:assert/strict';import {experienceYears,profileYear} from '../src/lib/experience.ts';
test('experience follows the 2026 baseline and changes at Shanghai new year',()=>{
 const before=profileYear(new Date('2026-12-31T15:59:59Z')),after=profileYear(new Date('2026-12-31T16:00:00Z'));
 assert.deepEqual([16,9,3].map(n=>experienceYears(n,2026,before)),[16,9,3]);
 assert.deepEqual([16,9,3].map(n=>experienceYears(n,2026,after)),[17,10,4]);
});
