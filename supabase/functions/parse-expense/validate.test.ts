import { describe, it, expect } from 'vitest';
import { extractAndValidate, validateParsed } from './validate.ts';

const TODAY = '2026-05-05';
const ALLOWED = new Set(['food', 'cafe', 'trans', 'shop']);

describe('validateParsed — amount', () => {
  it('keeps positive finite number', () => {
    expect(validateParsed({ amount: 350 }, TODAY, ALLOWED).amount).toBe(350);
  });
  it('rejects zero', () => {
    expect(validateParsed({ amount: 0 }, TODAY, ALLOWED).amount).toBeNull();
  });
  it('rejects negative', () => {
    expect(validateParsed({ amount: -50 }, TODAY, ALLOWED).amount).toBeNull();
  });
  it('rejects NaN / Infinity', () => {
    expect(validateParsed({ amount: NaN }, TODAY, ALLOWED).amount).toBeNull();
    expect(validateParsed({ amount: Infinity }, TODAY, ALLOWED).amount).toBeNull();
  });
  it('rejects string number', () => {
    expect(validateParsed({ amount: '100' }, TODAY, ALLOWED).amount).toBeNull();
  });
  it('null when missing', () => {
    expect(validateParsed({}, TODAY, ALLOWED).amount).toBeNull();
  });
});

describe('validateParsed — name', () => {
  it('trims whitespace', () => {
    expect(validateParsed({ name: '  Такси  ' }, TODAY, ALLOWED).name).toBe('Такси');
  });
  it('null on empty / whitespace', () => {
    expect(validateParsed({ name: '' }, TODAY, ALLOWED).name).toBeNull();
    expect(validateParsed({ name: '   ' }, TODAY, ALLOWED).name).toBeNull();
  });
  it('null on non-string', () => {
    expect(validateParsed({ name: 42 }, TODAY, ALLOWED).name).toBeNull();
  });
  it('truncates to 60 chars', () => {
    const long = 'А'.repeat(120);
    const out = validateParsed({ name: long }, TODAY, ALLOWED).name;
    expect(out?.length).toBe(60);
  });
});

describe('validateParsed — cat', () => {
  it('keeps id from allowed set', () => {
    expect(validateParsed({ cat: 'food' }, TODAY, ALLOWED).cat).toBe('food');
  });
  it('rejects id outside allowed set', () => {
    expect(validateParsed({ cat: 'unknown' }, TODAY, ALLOWED).cat).toBeNull();
  });
  it('rejects when allowed set is empty', () => {
    expect(validateParsed({ cat: 'food' }, TODAY, new Set()).cat).toBeNull();
  });
  it('rejects non-string', () => {
    expect(validateParsed({ cat: 42 }, TODAY, ALLOWED).cat).toBeNull();
  });
  it('null when allowed set is undefined', () => {
    expect(validateParsed({ cat: 'food' }, TODAY).cat).toBeNull();
  });
});

describe('validateParsed — date sanity window', () => {
  it('keeps today', () => {
    expect(validateParsed({ date: '2026-05-05' }, TODAY, ALLOWED).date).toBe('2026-05-05');
  });
  it('keeps yesterday', () => {
    expect(validateParsed({ date: '2026-05-04' }, TODAY, ALLOWED).date).toBe('2026-05-04');
  });
  it('keeps today+1 (tz tolerance)', () => {
    expect(validateParsed({ date: '2026-05-06' }, TODAY, ALLOWED).date).toBe('2026-05-06');
  });
  it('rejects today+2 (beyond tolerance)', () => {
    expect(validateParsed({ date: '2026-05-07' }, TODAY, ALLOWED).date).toBeNull();
  });
  it('keeps date 365 days back (boundary)', () => {
    expect(validateParsed({ date: '2025-05-05' }, TODAY, ALLOWED).date).toBe('2025-05-05');
  });
  it('rejects date 366 days back', () => {
    expect(validateParsed({ date: '2025-05-04' }, TODAY, ALLOWED).date).toBeNull();
  });
  it('rejects malformed format', () => {
    expect(validateParsed({ date: '2026-5-5' }, TODAY, ALLOWED).date).toBeNull();
    expect(validateParsed({ date: '05-05-2026' }, TODAY, ALLOWED).date).toBeNull();
    expect(validateParsed({ date: 'yesterday' }, TODAY, ALLOWED).date).toBeNull();
  });
  it('rejects calendar-impossible date (round-trip)', () => {
    // JS would silently shift to March 2 — round-trip catches it.
    expect(validateParsed({ date: '2026-02-30' }, TODAY, ALLOWED).date).toBeNull();
    expect(validateParsed({ date: '2026-13-01' }, TODAY, ALLOWED).date).toBeNull();
  });
  it('rejects non-string', () => {
    expect(validateParsed({ date: 20260505 }, TODAY, ALLOWED).date).toBeNull();
  });
});

describe('validateParsed — non-object input', () => {
  it('null → all-null result', () => {
    expect(validateParsed(null, TODAY, ALLOWED)).toEqual({
      amount: null, name: null, cat: null, date: null,
    });
  });
  it('string → all-null', () => {
    expect(validateParsed('whatever', TODAY, ALLOWED).amount).toBeNull();
  });
});

describe('extractAndValidate — fence stripping & JSON parse', () => {
  it('parses bare JSON', () => {
    const out = extractAndValidate(
      '{"amount":350,"name":"Такси","cat":"trans","date":"2026-05-05"}',
      TODAY, ALLOWED,
    );
    expect(out).toEqual({ amount: 350, name: 'Такси', cat: 'trans', date: '2026-05-05' });
  });
  it('strips ```json fences', () => {
    const out = extractAndValidate(
      '```json\n{"amount":100,"name":null,"cat":null,"date":null}\n```',
      TODAY, ALLOWED,
    );
    expect(out.amount).toBe(100);
  });
  it('strips ``` fences without language', () => {
    const out = extractAndValidate(
      '```\n{"amount":100,"name":null,"cat":null,"date":null}\n```',
      TODAY, ALLOWED,
    );
    expect(out.amount).toBe(100);
  });
  it('returns EMPTY on non-JSON', () => {
    expect(extractAndValidate('not json at all', TODAY, ALLOWED)).toEqual({
      amount: null, name: null, cat: null, date: null,
    });
  });
  it('returns EMPTY on empty string', () => {
    expect(extractAndValidate('', TODAY, ALLOWED).amount).toBeNull();
  });
  it('still validates allowed cat after fence strip', () => {
    const out = extractAndValidate(
      '```json\n{"amount":100,"name":"X","cat":"hacker","date":null}\n```',
      TODAY, ALLOWED,
    );
    expect(out.cat).toBeNull(); // not in ALLOWED
  });
  it('out-of-window date collapses to null but other fields survive', () => {
    const out = extractAndValidate(
      '{"amount":100,"name":"Old","cat":"food","date":"2020-01-01"}',
      TODAY, ALLOWED,
    );
    expect(out).toEqual({ amount: 100, name: 'Old', cat: 'food', date: null });
  });
});
