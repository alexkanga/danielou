/**
 * Navigation active-state hotfix regression tests.
 *
 * Verifies that sibling leaf menu items are mutually exclusive:
 * - Résultats par période (/dashboard/resultats)
 * - Compositions (/dashboard/compositions)
 * - Résultats annuels (/dashboard/resultats/annuelles)
 *
 * The original defect: pathname.startsWith(item.href + '/') on
 * /dashboard/resultats incorrectly matched /dashboard/resultats/annuelles,
 * causing both "Résultats par période" and "Résultats annuels" to appear
 * active simultaneously.
 */

import { describe, it, expect } from 'vitest';
import { isNavItemActive, NAV_SECTIONS } from '@/lib/navigation';

// Collect all nav hrefs from the canonical navigation config
const ALL_HREFS = NAV_SECTIONS.flatMap(s => s.items.map(i => i.href));

// The three sibling leaf items under test
const PERIOD_RESULTS_HREF = '/dashboard/resultats';
const COMPOSITIONS_HREF = '/dashboard/compositions';
const ANNUAL_RESULTS_HREF = '/dashboard/resultats/annuelles';

describe('NAV-01: period-results route active state', () => {
  const pathname = '/dashboard/resultats';

  it('Résultats par période is ACTIVE', () => {
    expect(isNavItemActive(pathname, PERIOD_RESULTS_HREF, ALL_HREFS)).toBe(true);
  });

  it('Résultats annuels is INACTIVE', () => {
    expect(isNavItemActive(pathname, ANNUAL_RESULTS_HREF, ALL_HREFS)).toBe(false);
  });

  it('Compositions is INACTIVE', () => {
    expect(isNavItemActive(pathname, COMPOSITIONS_HREF, ALL_HREFS)).toBe(false);
  });
});

describe('NAV-02: annual-results route active state', () => {
  const pathname = '/dashboard/resultats/annuelles';

  it('Résultats annuels is ACTIVE', () => {
    expect(isNavItemActive(pathname, ANNUAL_RESULTS_HREF, ALL_HREFS)).toBe(true);
  });

  it('Résultats par période is INACTIVE (original defect)', () => {
    // This was the defect: /dashboard/resultats prefix-matched
    // /dashboard/resultats/annuelles causing dual active state
    expect(isNavItemActive(pathname, PERIOD_RESULTS_HREF, ALL_HREFS)).toBe(false);
  });

  it('Compositions is INACTIVE', () => {
    expect(isNavItemActive(pathname, COMPOSITIONS_HREF, ALL_HREFS)).toBe(false);
  });
});

describe('NAV-03: compositions route active state', () => {
  const pathname = '/dashboard/compositions';

  it('Compositions is ACTIVE', () => {
    expect(isNavItemActive(pathname, COMPOSITIONS_HREF, ALL_HREFS)).toBe(true);
  });

  it('Résultats par période is INACTIVE', () => {
    expect(isNavItemActive(pathname, PERIOD_RESULTS_HREF, ALL_HREFS)).toBe(false);
  });

  it('Résultats annuels is INACTIVE', () => {
    expect(isNavItemActive(pathname, ANNUAL_RESULTS_HREF, ALL_HREFS)).toBe(false);
  });
});

describe('NAV-04: mutual exclusivity across all result siblings', () => {
  const routes = [
    { name: 'period-results', pathname: '/dashboard/resultats' },
    { name: 'annual-results', pathname: '/dashboard/resultats/annuelles' },
    { name: 'compositions', pathname: '/dashboard/compositions' },
  ];

  const siblings = [
    { name: 'Résultats par période', href: PERIOD_RESULTS_HREF },
    { name: 'Résultats annuels', href: ANNUAL_RESULTS_HREF },
    { name: 'Compositions', href: COMPOSITIONS_HREF },
  ];

  for (const route of routes) {
    it(`on ${route.name} route, exactly one sibling is active`, () => {
      const activeCount = siblings.filter(s =>
        isNavItemActive(route.pathname, s.href, ALL_HREFS)
      ).length;
      expect(activeCount).toBe(1);
    });
  }
});

describe('NAV-05: legitimate parent-child prefix matching preserved', () => {
  it('/dashboard/regles-calcul stays active on child route /dashboard/regles-calcul/123', () => {
    expect(isNavItemActive('/dashboard/regles-calcul/123', '/dashboard/regles-calcul', ALL_HREFS)).toBe(true);
  });

  it('/dashboard/bulletins/preparation stays active on exact match', () => {
    expect(isNavItemActive('/dashboard/bulletins/preparation', '/dashboard/bulletins/preparation', ALL_HREFS)).toBe(true);
  });

  it('/dashboard/bulletins/preparation does NOT match /dashboard/bulletins/validation', () => {
    expect(isNavItemActive('/dashboard/bulletins/validation', '/dashboard/bulletins/preparation', ALL_HREFS)).toBe(false);
  });
});
