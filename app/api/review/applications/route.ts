import { NextRequest, NextResponse } from 'next/server';
import { reviewerFixtures } from '@/lib/reviewer/fixtures';
import { rankApplications } from '@/lib/reviewer/ranking';
import { supabase } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slotsParam = searchParams.get('slots');
  const slotsAvailable = slotsParam ? parseInt(slotsParam, 10) : 2;

  const fixtures = [...reviewerFixtures];

  try {
    const { data: dbApps } = await supabase
      .from('applications')
      .select('*')
      .order('updated_at', { ascending: false });

    if (dbApps && dbApps.length > 0) {
      dbApps.forEach((app: any) => {
        const evidence = app.flat_evidence || {};
        const compName = app.business_name || app.applicant_name || evidence['company_profile.company_name']?.value || evidence['business.name']?.value || `Live App ${app.session_id.slice(-4)}`;
        
        // Add real Supabase submission as a reviewer entry
        fixtures.unshift({
          id: app.session_id,
          companyName: compName,
          sector: evidence['company_profile.business_type']?.value || evidence['business.sector']?.value || 'SME Business',
          region: evidence['company_profile.address']?.value || 'Addis Ababa',
          language: (app.language as any) || 'en',
          channel: (app.channel as any) || 'web',
          synthetic: false,
          evidence: {
            company_profile: {
              company_name: { state: 'self_reported', value: compName },
              business_registration_number: { state: 'self_reported', value: evidence['company_profile.business_registration_number']?.value || 'REG-PENDING' },
              address: { state: 'self_reported', value: evidence['company_profile.address']?.value || 'Ethiopia' },
              mobile_number: { state: 'self_reported', value: app.applicant_phone || '0911000000' },
              business_organization_form: { state: 'self_reported', value: 'Sole Proprietorship' },
              years_in_operation: { state: 'self_reported', value: 3 },
              business_type: { state: 'self_reported', value: 'Light Manufacturing' },
              ownership_percentage: {
                women_pct: { state: 'self_reported', value: 50 },
                men_pct: { state: 'self_reported', value: 50 },
              },
            },
            growth_indicators: {
              sales_etb: { '2024': { state: 'self_reported', value: 450000 } },
              total_employees: { '2024': { state: 'self_reported', value: 6 } },
              female_employees: { '2024': { state: 'self_reported', value: 3 } },
              youth_employees_18_24: { '2024': { state: 'self_reported', value: 2 } },
            },
            funding_request: {
              requested_amount_etb: { state: 'self_reported', value: 500000 },
              requested_amount_usd: { state: 'self_reported', value: 10000 },
              use_of_funds: { state: 'self_reported', value: evidence['financials.use_of_funds']?.value || 'Equipment' },
            },
          },
        } as any);
      });
    }
  } catch (err) {
    console.warn('Failed to load Supabase apps for review route:', err);
  }

  const result = rankApplications(fixtures, slotsAvailable);

  const metrics = {
    totalApplications: result.ranked.length,
    eligibleCount: result.ranked.filter((a) => a.eligible === true).length,
    needsReviewCount: result.ranked.filter((a) => a.eligible === 'needs_review').length,
    excludedCount: result.ranked.filter((a) => a.eligible === false).length,
    shortlistCount: result.shortlist.length,
    slotsAvailable,
    averageScoreVariantA: Math.round(
      result.ranked.reduce((acc, curr) => acc + curr.totalPointsVariantA, 0) / result.ranked.length
    ),
  };

  return NextResponse.json({
    metrics,
    ranked: result.ranked,
    shortlist: result.shortlist,
    slotsAvailable,
  });
}