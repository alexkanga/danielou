/**
 * M4-TH-UI — Promotion Threshold Edit UI Tests
 *
 * Verifies the config edit dialog and summary display handle promotionThreshold.
 * Uses source-invariant text analysis + Zod validation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { updatePedagogicalConfigSchema, createPedagogicalConfigSchema } from '@/lib/validations/pedagogy';

const detailPage = readFileSync(
  resolve(__dirname, '../../app/(dashboard)/dashboard/regles-calcul/[configId]/page.tsx'),
  'utf-8',
);

const createPage = readFileSync(
  resolve(__dirname, '../../app/(dashboard)/dashboard/regles-calcul/page.tsx'),
  'utf-8',
);

describe('M4-TH-UI: Promotion Threshold Edit UI (TH-UI-01..TH-UI-08)', () => {
  // ─── TH-UI-01: Edit dialog displays promotion threshold field ───
  it('TH-UI-01: Edit dialog displays promotion threshold field', () => {
    // The edit dialog contains a Seuil de promotion input
    expect(detailPage).toContain('Seuil de promotion');
    expect(detailPage).toContain('ed-threshold');
    expect(detailPage).toContain('cfgPromotionThreshold');
    // The edit dialog title is present
    expect(detailPage).toContain('Modifier la configuration');
  });

  // ─── TH-UI-02: NULL threshold displays "Non configuré" ───
  it('TH-UI-02: NULL threshold displays "Non configuré" in edit form', () => {
    // openEditConfig maps null to empty string
    expect(detailPage).toContain(
      "config.promotionThreshold != null ? String(config.promotionThreshold) : ''",
    );
    // The input placeholder shows Non configuré
    expect(detailPage).toContain('placeholder="Non configuré"');
  });

  // ─── TH-UI-03: Existing numeric threshold is loaded into edit form ───
  it('TH-UI-03: Existing numeric threshold is loaded into edit form', () => {
    // When promotionThreshold is non-null, it's converted to string via String()
    expect(detailPage).toContain('String(config.promotionThreshold)');
  });

  // ─── TH-UI-04: Editing threshold to 8.50 submits 8.50 ───
  it('TH-UI-04: Editing threshold to 8.50 submits 8.50', () => {
    // The handleSaveConfig payload includes promotionThreshold parsed as float
    expect(detailPage).toContain('promotionThreshold:');
    expect(detailPage).toContain('parseFloat(cfgPromotionThreshold)');
    // The input step is 0.01 allowing decimal values
    expect(detailPage).toContain('step="0.01"');
  });

  // ─── TH-UI-05: Clearing threshold submits NULL ───
  it('TH-UI-05: Clearing threshold submits NULL', () => {
    // Empty string maps to null
    expect(detailPage).toContain("cfgPromotionThreshold.trim() !== '' ? (parseFloat(cfgPromotionThreshold) || null) : null");
  });

  // ─── TH-UI-06: Values below 0 are rejected ───
  it('TH-UI-06: Values below 0 are rejected by validation', () => {
    // HTML input min="0" provides client-side guard
    expect(detailPage).toContain('min="0"');
    // Zod validation enforces >= 0 on the update schema
    const parsed = updatePedagogicalConfigSchema.safeParse({
      promotionThreshold: -0.01,
    });
    expect(parsed.success).toBe(false);
  });

  // ─── TH-UI-07: Values above 10 are rejected ───
  it('TH-UI-07: Values above 10 are rejected by validation', () => {
    // HTML input max="10" provides client-side guard
    expect(detailPage).toContain('max="10"');
    // Zod validation enforces <= 10 on the update schema
    const parsed = updatePedagogicalConfigSchema.safeParse({
      promotionThreshold: 10.01,
    });
    expect(parsed.success).toBe(false);
  });

  // ─── TH-UI-08: Configuration summary displays threshold ───
  it('TH-UI-08: Configuration summary displays threshold', () => {
    // The summary section shows the threshold
    expect(detailPage).toContain('Seuil de promotion :');
    expect(detailPage).toContain('/ 10');
    // NULL case shows Non configuré
    expect(detailPage).toContain("'Non configuré'");
    // Non-null case shows the value
    expect(detailPage).toContain('config.promotionThreshold');
  });

  // ─── Additional: Edit form validation is consistent with create form ───
  it('TH-UI-BONUS: Validation is consistent between create and update schemas', () => {
    // Both schemas share the same promotionThreshold definition
    // Verify by parsing the same valid values through both
    const validValues = [0, 5, 8.5, 10];
    for (const val of validValues) {
      const createResult = createPedagogicalConfigSchema.safeParse({
        levelId: 'a0000000-0000-4000-a000-000000000001',
        academicYearId: 'a0000000-0000-4000-a000-000000000002',
        promotionThreshold: val,
      });
      const updateResult = updatePedagogicalConfigSchema.safeParse({
        promotionThreshold: val,
      });
      expect(createResult.success).toBe(true);
      expect(updateResult.success).toBe(true);
    }

    const invalidValues = [-0.01, 10.1, -1];
    for (const val of invalidValues) {
      const updateResult = updatePedagogicalConfigSchema.safeParse({
        promotionThreshold: val,
      });
      expect(updateResult.success).toBe(false);
    }
  });

  // ─── Additional: Edit form uses same wording as create form ───
  it('TH-UI-BONUS: Edit form uses same threshold wording as create form', () => {
    // Both forms use identical label structure
    expect(createPage).toContain('Seuil de promotion');
    expect(detailPage).toContain('Seuil de promotion');
    // Both use the same helper text
    expect(createPage).toContain('Si non configuré');
    expect(detailPage).toContain('Si non configuré');
    // Both use the same placeholder
    expect(createPage).toContain('placeholder="Non configuré"');
    expect(detailPage).toContain('placeholder="Non configuré"');
  });

  // ─── Additional: NULL is accepted by validation ───
  it('TH-UI-BONUS: NULL threshold is accepted by update validation', () => {
    const parsed = updatePedagogicalConfigSchema.safeParse({
      promotionThreshold: null,
    });
    expect(parsed.success).toBe(true);
  });

  // ─── Additional: Omitting threshold is accepted (no change) ───
  it('TH-UI-BONUS: Omitting threshold from update payload is accepted', () => {
    const parsed = updatePedagogicalConfigSchema.safeParse({
      description: 'test',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // promotionThreshold should be undefined (not sent)
      expect(parsed.data.promotionThreshold).toBeUndefined();
    }
  });
});
