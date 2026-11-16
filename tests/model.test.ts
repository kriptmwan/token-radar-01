import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRadar, MODEL } from '../lib/engine.ts';
const p = { slug:'example', name:'Example', category:'Lending', chains:['Ethereum'], tvl_usd:10000000, change_7d:20, listed_at:'2025-01-01', mcap_usd:null, gecko_id:null, symbol:null };
const snapshot = { as_of:'2026-11-15', source:'fixture', floor_usd:50000000, watchlist:['example'], protocols:[p] };
test('research evidence and scenario bounds travel with the rendered row', () => {
 const {board,radar} = buildRadar(snapshot);
 const row = board[0];
 assert.ok(row.evidence);
 assert.ok(row.evidence.low_usd < row.implied_value_usd);
 assert.ok(row.evidence.high_usd > row.implied_value_usd);
 assert.deepEqual(radar.rows[0].farm_steps, row.farm_steps);
 assert.match(row.farm_steps.join(' '), /not confirmed/i);
 assert.equal(row.evidence.watchlist, true);
});
