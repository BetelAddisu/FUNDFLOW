import { describe, it, expect } from 'vitest';
import { reviewerFixtures } from '@/lib/reviewer/fixtures';
import { rankApplications } from '@/lib/reviewer/ranking';

describe('Reviewer Path', () => {
  const slotsAvailable = 2;

  it('includes reviewer fixtures', () => {
    expect(reviewerFixtures.length).toBeGreaterThanOrEqual(12);
    for (const fixture of reviewerFixtures) {
      expect(fixture.channel).toMatch(/^(web|telegram)$/);
    }
  });

  it('ranking is monotonic in score except excluded applications always rank below eligible ones', () => {
    const { ranked } = rankApplications(reviewerFixtures, slotsAvailable);

    let firstExcludedIndex = ranked.findIndex((e) => e.eligible === false);
    if (firstExcludedIndex === -1) firstExcludedIndex = ranked.length;

    for (let i = 0; i < firstExcludedIndex - 1; i++) {
      expect(ranked[i].totalPointsVariantA).toBeGreaterThanOrEqual(ranked[i + 1].totalPointsVariantA);
    }
    for (let i = firstExcludedIndex; i < ranked.length; i++) {
      expect(ranked[i].eligible).toBe(false);
    }
  });

  it('shortlist size is exactly 2× slotsAvailable', () => {
    const { shortlist } = rankApplications(reviewerFixtures, slotsAvailable);
    expect(shortlist).toHaveLength(2 * slotsAvailable);
  });

  it('every ranked entry shows both C7 variant scores and reasoning per criterion', () => {
    const { ranked } = rankApplications(reviewerFixtures, slotsAvailable);
    for (const entry of ranked) {
      expect(entry.criterionScores.some((c) => c.criterionId === 'C7a')).toBe(true);
      expect(entry.criterionScores.some((c) => c.criterionId === 'C7b')).toBe(true);
      for (const cs of entry.criterionScores) {
        expect(cs.reasoning).toBeTruthy();
      }
    }
  });

  it('contains at least one contradiction, one E1/E2 exclusion, one E3-pending, one incomplete-field case', () => {
    const { ranked } = rankApplications(reviewerFixtures, slotsAvailable);
    expect(ranked.some((e) => e.contradiction)).toBe(true);
    expect(ranked.some((e) => e.eligible === false)).toBe(true);
    expect(ranked.some((e) => e.eligible === 'needs_review')).toBe(true);
    expect(ranked.some((e) => e.incompleteFields && e.incompleteFields.length > 0)).toBe(true);
  });
});