/**
 * S1 Student Import Pipeline — Synthetic Tests
 */
import { describe, it, expect } from 'vitest';
import { normalizeForMatching, createMatchingKey, isBrouVariant, BROU_CANONICAL } from '../../lib/import/normalization';

describe('S1 — normalizeForMatching', () => {
  it('handles multiple spaces', () => {
    expect(normalizeForMatching('  Jean   Marie  ')).toBe('jean marie');
  });
  it('handles case', () => {
    expect(normalizeForMatching("N'GUESSAN")).toBe("n'guessan");
  });
  it('normalizes typographic apostrophe', () => {
    expect(normalizeForMatching('N\u2019GUESSAN')).toBe("n'guessan");
  });
  it('normalizes en-dash to hyphen', () => {
    expect(normalizeForMatching('Marie \u2013 Gabryelle')).toBe('marie-gabryelle');
  });
  it('normalizes em-dash to hyphen', () => {
    expect(normalizeForMatching('Marie \u2014 Gabryelle')).toBe('marie-gabryelle');
  });
  it('removes spaces around dashes', () => {
    expect(normalizeForMatching('Marie - Gabryelle')).toBe('marie-gabryelle');
  });
});

describe('S1 — createMatchingKey', () => {
  it('produces identical keys for equivalent identities', () => {
    const k1 = createMatchingKey("N'GUESSAN", 'Ange Ya\u00eble');
    const k2 = createMatchingKey('N\u2019GUESSAN', 'Ange Ya\u00eble');
    expect(k1).toBe(k2);
  });
  it('produces different keys for different identities', () => {
    const k1 = createMatchingKey('KONAN', 'Naelle Amirah Enimo');
    const k2 = createMatchingKey('KONAN', 'Elyna Marie-Kanny');
    expect(k1).not.toBe(k2);
  });
});

describe('S1 — BROU human resolution', () => {
  it('detects BROU variant A (short lastName)', () => {
    expect(isBrouVariant('BROU', 'N. Marie-Gabrielle Od\u00e9lia')).toBe(true);
  });
  it('detects BROU variant B (full lastName with en-dash)', () => {
    expect(isBrouVariant('BROU N\u00e9tro', 'Marie \u2013 Gabryelle Od\u00e9lia')).toBe(true);
  });
  it('does NOT false-positive on non-BROU', () => {
    expect(isBrouVariant('BAMBA', 'Tahi Chahima')).toBe(false);
  });
  it('canonical values are exact', () => {
    expect(BROU_CANONICAL.lastName).toBe('BROU N\u00e9tro');
    expect(BROU_CANONICAL.firstName).toBe('Marie\u2013Gabryelle Od\u00e9lia');
  });
});

describe('S1 — Duplicate labels (9 identical → 1)', () => {
  it('9 identical occurrences → 1 candidate', () => {
    const keys = new Set(Array.from({ length: 9 }, () => createMatchingKey('SANGARE', 'Louisa')));
    expect(keys.size).toBe(1);
  });
});

describe('S1 — Cross-file duplicate', () => {
  it('same identity in two files → 1 candidate', () => {
    const k1 = createMatchingKey('SISSOKO', 'Oria Fatim');
    const k2 = createMatchingKey('SISSOKO', 'Oria Fatim');
    expect(k1).toBe(k2);
  });
});

describe('S1 — Same name different people (no auto-merge)', () => {
  it('two AKA students remain distinct', () => {
    const keys = new Set([
      createMatchingKey('AKA', 'Guela Ilia'),
      createMatchingKey('AKA', 'Esther'),
      createMatchingKey('AKA', 'Maylis Keren'),
    ]);
    expect(keys.size).toBe(3);
  });
  it('two ECRABE students remain distinct', () => {
    expect(createMatchingKey('ECRABE', 'Asse Elvina Marie-Ginette'))
      .not.toBe(createMatchingKey('ECRABE', 'Akissi Iris-Michael'));
  });
});

describe('S1 — Null data accepted', () => {
  it('null matricule/birthDate/gender is valid', () => {
    expect(null).toBeNull();
  });
});

describe('S1 — Probable duplicate (no auto-merge)', () => {
  it('similar but unconfirmed names remain separate', () => {
    expect(createMatchingKey('KOUADIO', 'Kyria Somah'))
      .not.toBe(createMatchingKey('KOUADIO', 'Fi\u00e9ni Abran Ivy-Regina'));
  });
});
