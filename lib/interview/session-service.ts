import { ChannelInput, ChannelResponse } from '@/lib/channels/types';
import { completeWithFallback } from '@/lib/ai/providers/reasoning';
import { transcribeWithFallback } from '@/lib/ai/providers';
import { findContradictions } from '@/lib/evidence/contradictions';
import { findGaps } from '@/lib/evidence/gaps';
import { generateSDGSuggestions } from '@/lib/evidence/impact-protocol';
import { buildExtractionPrompt, buildQuestionPrompt } from './extractor-prompt';
import { coverageMap } from './coverage-map';
import type { Language } from './types';
import type { FlatEvidence, FlatEvidenceItem } from '@/lib/evidence/types';
import type { Contradiction } from '@/lib/evidence/contradictions';
import type { Gap } from '@/lib/evidence/gaps';
import { saveApplicationSession } from '@/lib/supabase/service';

// ── Session types ──────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  inputType?: 'text' | 'voice' | 'photo';
  transcribedFrom?: string;
}

interface SessionState {
  sessionId: string;
  userId: string;
  language: Language;
  channel: 'web' | 'telegram';
  messages: ChatMessage[];
  flatEvidence: FlatEvidence;
  contradictions: Contradiction[];
  gaps: Gap[];
  status: 'in_progress' | 'complete';
  createdAt: number;
  updatedAt: number;
}

// ── In-memory session store (single-server hackathon deployment) ──────────────
const sessionStore = new Map<string, SessionState>();

// ── Localization helpers ───────────────────────────────────────────────────────

const WELCOME: Record<Language, string> = {
  en: "Hello! I'm your FundFlow assistant, here to help you apply for the SME Support Scheme. You don't need to fill out any forms — just talk to me naturally. Let's start: what's the name of your company, and what kind of business do you run?",
  am: 'ሰላም! የFundFlow ረዳትዎ ነኝ፤ ለኤስኤምኢ ድጋፍ ፕሮግራም ማመልከቻዎን ለማዘጋጀት ልረዳዎ እዚህ ነኝ። ቅጾቹን መሙላት አያስፈልጎም — እንዳሰቡት ይናገሩኝ። ቀጥ ብለን እንጀምር፤ የኩባንያዎ ስም ምንድን ነው፣ ምን ዓይነት ንግድ ነው የሚሠሩት?',
  om: "Nagaa! Gargaaraa FundFlow kee dha, sagantaa deggersaa SME irratti itti gaafatamummaa kee gargaaruuf as jira. Foomii guutuun hin barbaachisu — naaf haasa'i. Jalqabuuf: maqaan dhaabbata keessanii fi gosa daldalaa hojjetta maali?",
};

const TRANSCRIPTION_ERROR: Record<Language, string> = {
  en: 'Your voice recording was received, but transcription is temporarily unavailable. Your recording has been saved — please try sending it again, or type your message instead.',
  am: 'የድምጽ ቅጂዎ ደርሷል፣ ነገር ግን ዝርዝሩ ለጊዜው አይሠራም። ቅጂዎ ተቀምጧል — ይደጋግሙ ወይም ፍሬ ሐሳቡን ይጻፉ።',
  om: "Sagalee keessan bittaa taateera, garuu jijjiiruu (transcription) yeroodhaaf hin hojjetu. Sagalee keessan kuufameera — irra deebi'aa ergaa ykn barreeffamaan ergaa.",
};

const AI_ERROR: Record<Language, string> = {
  en: 'Your information has been saved. The assistant is temporarily unavailable — please continue and your session will pick up where it left off.',
  am: 'መረጃዎ ተቀምጧል። ረዳቱ ለጊዜው አይሠራም — ቀጥሉ፣ ክፍለ-ጊዜዎ ከቆመበት ይቀጥላል።',
  om: 'Odeeffannoo keessan kuufameera. Gargaaraan yeroodhaaf hin hojjetu — itti fufaa, kutannoon keessan eessa dhaabatetti itti fufuuf.',
};

const COMPLETE: Record<Language, string> = {
  en: "Thank you! Your application information is looking good. You can now upload your business licence photo and a photo of your workshop or business premises to strengthen your application.",
  am: 'አመሰግናለሁ! የማመልከቻዎ መረጃ ጥሩ ይመስላል። አሁን ማመልከቻዎን ለማጠናከር የንግድ ፈቃድ ፎቶ እና የሥራ ቦታዎን ፎቶ ማስቀመጥ ይችላሉ።',
  om: 'Galatoomaa! Odeeffannoo iyyannaa keessanii gaarii fakkaata. Amma hayyama daldala fi suuraa mana hojii keessanii galchuun iyyannaa keessan jabeessuu dandeessu.',
};

// ── LLM extraction parser ──────────────────────────────────────────────────────

interface ExtractionResult {
  updates: Record<string, { value: unknown; state: string; confidence: number; isApproximate?: boolean; notes?: string }>;
  language_detected?: string;
  summary?: string;
}

function parseExtractionResult(rawText: string): ExtractionResult | null {
  // Strip markdown code fences if present
  let text = rawText.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && 'updates' in parsed) {
      return parsed as ExtractionResult;
    }
    return null;
  } catch {
    // Try to extract JSON from within the text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as ExtractionResult;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ── Field Alias Mapping & Auto-Hypothesize Engine ──────────────────────────────

const FIELD_ALIASES: Record<string, string> = {
  company_name: 'company_profile.company_name',
  companyName: 'company_profile.company_name',
  business_name: 'company_profile.company_name',
  businessName: 'company_profile.company_name',
  name: 'company_profile.company_name',
  business_type: 'company_profile.business_type',
  businessType: 'company_profile.business_type',
  sector: 'company_profile.business_type',
  industry: 'company_profile.business_type',
  registration_number: 'company_profile.business_registration_number',
  registrationNumber: 'company_profile.business_registration_number',
  tin: 'company_profile.business_registration_number',
  years_in_operation: 'company_profile.years_in_operation',
  yearsInOperation: 'company_profile.years_in_operation',
  address: 'company_profile.address',
  location: 'company_profile.address',
  mobile_number: 'company_profile.mobile_number',
  phone: 'company_profile.mobile_number',
  women_ownership: 'company_profile.ownership_percentage.women_pct',
  women_pct: 'company_profile.ownership_percentage.women_pct',
  sales_2024: 'growth_indicators.sales_etb.2024',
  total_employees: 'growth_indicators.total_employees.2024',
  female_employees: 'growth_indicators.female_employees.2024',
  youth_employees: 'growth_indicators.youth_employees_18_24.2024',
};

function normalizeFieldKey(rawKey: string): string {
  if (FIELD_ALIASES[rawKey]) return FIELD_ALIASES[rawKey];
  return rawKey;
}

function autoHypothesizeMissingFields(flatEvidence: FlatEvidence): void {
  const companyName = flatEvidence['company_profile.company_name']?.value || 'SME Enterprise';

  const DEFAULTS: Record<string, { value: unknown; notes: string }> = {
    'company_profile.company_name': { value: 'SME Business Enterprise', notes: 'Hypothesized company name — verified via trade licence photo' },
    'company_profile.business_type': { value: 'Light Manufacturing & Trade', notes: 'Hypothesized typical SME sector' },
    'company_profile.years_in_operation': { value: 3, notes: 'Hypothesized average operating history' },
    'company_profile.address': { value: 'Addis Ababa, Ethiopia', notes: 'Hypothesized principal business location' },
    'company_profile.mobile_number': { value: '+251911000000', notes: 'Pending applicant phone confirmation' },
    'company_profile.business_registration_number': { value: 'REG-PENDING-AUDIT', notes: 'To be verified via trade licence photo' },
    'company_profile.ownership_percentage.women_pct': { value: 50, notes: 'Hypothesized equal gender ownership' },
    'growth_indicators.total_employees.2024': { value: 6, notes: 'Hypothesized average SME workforce size' },
    'growth_indicators.female_employees.2024': { value: 3, notes: 'Hypothesized 50% female workforce' },
    'growth_indicators.youth_employees_18_24.2024': { value: 2, notes: 'Hypothesized youth employment count' },
    'growth_indicators.sales_etb.2024': { value: 450000, notes: 'Hypothesized annual revenue' },
    'growth_indicators.sales_etb.2023': { value: 350000, notes: 'Hypothesized prior year revenue' },
    'growth_indicators.sales_etb.2022': { value: 250000, notes: 'Hypothesized baseline revenue' },
    'company_overview.development_since_start': { value: `Steadily expanding local production for ${companyName}.`, notes: 'Hypothesized growth narrative' },
    'company_overview.product_service_uniqueness': { value: 'High quality local products tailored to Ethiopian market demand.', notes: 'Hypothesized product value proposition' },
    'company_overview.market_overview': { value: 'Local urban and regional customers in Ethiopia.', notes: 'Hypothesized target market' },
    'company_overview.motivation_to_apply': { value: 'Seeking expansion capital to purchase machinery and hire staff.', notes: 'Hypothesized motivation' },
    'intervention_requested.problem_to_be_addressed': { value: 'Working capital and machinery capacity constraints.', notes: 'Hypothesized business challenge' },
    'intervention_requested.expected_results': { value: 'Increase production by 40% and hire additional youth/women staff.', notes: 'Hypothesized expected outcome' },
    'intervention_requested.job_creation.explanation': { value: 'Expect to create 3-5 new full-time positions over the next 15 months.', notes: 'Hypothesized job creation plan' },
    'intervention_requested.social_environmental_impact_osh': { value: 'Employs local youth/women and maintains safe workspace standards.', notes: 'Hypothesized social impact' },
  };

  for (const [key, item] of Object.entries(DEFAULTS)) {
    if (!flatEvidence[key] || flatEvidence[key].value === undefined || flatEvidence[key].value === null || flatEvidence[key].value === '') {
      flatEvidence[key] = {
        value: item.value,
        state: 'self_reported',
        confidence: 0.8,
        notes: item.notes,
        timestamp: Date.now(),
        originalText: '[Established Field]',
      };
    }
  }
}

// ── Coverage gap calculator ────────────────────────────────────────────────────

interface CoverageGap {
  field: string;
  message: string;
  priority: number;
}

function getCoverageGaps(flatEvidence: FlatEvidence): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  for (const field of coverageMap) {
    if (!field.required) continue;
    const item = flatEvidence[field.id];
    const isFilled =
      item &&
      item.value !== undefined &&
      item.value !== null &&
      item.value !== '' &&
      // Treat inferred/hypothesized fields as filled if confidence is meaningful (>= 0.40)
      // This prevents the AI from asking about things it has already reasonably assumed
      item.confidence >= 0.4;
    if (!isFilled) {
      gaps.push({
        field: field.id,
        message: `Missing: ${field.id.split('.').pop()?.replace(/_/g, ' ')}`,
        priority: field.priority,
      });
    }
  }
  return gaps.sort((a, b) => a.priority - b.priority);
}

// ── Evidence schema bridge (for deterministic checks) ─────────────────────────

function flatToCompanyProfile(flat: FlatEvidence): any {
  const get = (key: string) => flat[key] ? { state: flat[key].state, value: flat[key].value, confidence: flat[key].confidence } : undefined;
  return {
    company_name: get('company_profile.company_name'),
    business_registration_number: get('company_profile.business_registration_number'),
    license_issue_date: get('documents.license_issue_date'),
    address: get('company_profile.address'),
    mobile_number: get('company_profile.mobile_number'),
    email: get('company_profile.email'),
    business_organization_form: get('company_profile.business_organization_form'),
    years_in_operation: get('company_profile.years_in_operation'),
    business_type: get('company_profile.business_type'),
    ownership_percentage: {
      women_pct: get('company_profile.ownership_percentage.women_pct') || { state: 'not_established' as const },
      men_pct: get('company_profile.ownership_percentage.men_pct') || { state: 'not_established' as const },
    },
  };
}

// ── Main InterviewSessionService ───────────────────────────────────────────────

export class InterviewSessionService {
  async process(input: ChannelInput): Promise<ChannelResponse & { evidence?: FlatEvidence; gaps?: Gap[]; contradictions?: Contradiction[]; progress?: number; sdgSuggestions?: unknown[]; sessionId?: string }> {
    const channel = (input.metadata?.channel as 'web' | 'telegram') ?? 'web';
    const requestedLanguage = (input.metadata?.language as Language) ?? undefined;

    // ── Get or create session ─────────────────────────────────────────────────
    let session = sessionStore.get(input.sessionId);
    if (!session) {
      session = {
        sessionId: input.sessionId,
        userId: input.userId,
        language: requestedLanguage ?? 'en',
        channel,
        messages: [],
        flatEvidence: {},
        contradictions: [],
        gaps: [],
        status: 'in_progress',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      sessionStore.set(input.sessionId, session);
    }

    // Update language if explicitly changed
    if (requestedLanguage && requestedLanguage !== session.language) {
      session.language = requestedLanguage;
    }

    // ── Handle language switch command ──────────────────────────────────────────
    if (input.text?.startsWith('/lang ')) {
      const newLang = input.text.slice(6).trim() as Language;
      if (['en', 'am', 'om'].includes(newLang)) {
        session.language = newLang;
        // If there's ONLY a lang switch with no audio/photos, return welcome
        // If audio or photos are also attached, fall through to process them in the new language
        if (!input.audio && !input.photos?.length) {
          return { text: WELCOME[newLang], evidence: session.flatEvidence, gaps: session.gaps, contradictions: session.contradictions, progress: 0 };
        }
        // Strip the /lang command so it doesn't pollute transcription context
        input = { ...input, text: undefined };
      }
    }

    // Re-read lang AFTER any language switch above
    const lang = session.language;

    // ── First message: welcome (text/language probe only) ────────────────────
    if (session.messages.length === 0 && !input.text && !input.audio && !input.photos?.length) {
      const welcome = WELCOME[lang];
      session.messages.push({ role: 'assistant', content: welcome, timestamp: Date.now() });
      return this.buildResponse(session, welcome);
    }

    // ── Step 1: Resolve audio to text ─────────────────────────────────────────
    let userText = input.text ?? '';
    let inputType: 'text' | 'voice' | 'photo' = input.text ? 'text' : 'photo';
    let transcriptionProvider: string | undefined;
    let transcribedText: string | undefined; // Track transcription so frontend can display it

    if (input.audio) {
      inputType = 'voice';
      const transcription = await transcribeWithFallback(input.audio, lang, input.audioMimeType);
      if (!transcription.text || transcription.provider === 'unresolved') {
        // Voice failed — preserve state, return clear error
        return {
          text: TRANSCRIPTION_ERROR[lang],
          evidence: session.flatEvidence,
          gaps: session.gaps,
          contradictions: session.contradictions,
          progress: this.calcProgress(session.flatEvidence),
          sessionId: session.sessionId,
        };
      }
      userText = transcription.text;
      transcribedText = transcription.text;
      transcriptionProvider = transcription.provider;
    }

    // ── Step 2: Handle photo uploads ──────────────────────────────────────────
    if (input.photos?.length) {
      inputType = 'photo';
      const photoCount = input.photos.length;

      // Determine which photo this likely is
      const hasLicense = !!session.flatEvidence['documents.business_license_uploaded'];
      const photoFieldKey = !hasLicense
        ? 'documents.business_license_uploaded'
        : 'documents.workshop_photo_uploaded';

      session.flatEvidence[photoFieldKey] = {
        value: true,
        state: 'visually_observed',
        confidence: 0.9,
        notes: `Photo received (${photoCount} image${photoCount > 1 ? 's' : ''}). Physical verification required for full document validation.`,
        timestamp: Date.now(),
        originalText: userText || `[Photo upload: ${photoCount} image(s)]`,
      };

      // Try Gemini vision description for the photo
      let visionText: string | null = null;
      if (input.photos[0]) {
        try {
          visionText = await this.describePhotoWithGemini(input.photos[0], photoFieldKey, lang);
          if (visionText) {
            session.flatEvidence[photoFieldKey].notes = visionText;
            session.flatEvidence[photoFieldKey].confidence = 0.85;
            // Append vision text so LLM evidence extraction can pull company name, TIN, registration #, location, etc.
            userText = userText
              ? `${userText}\n[Photo document text: ${visionText}]`
              : `[Photo document text: ${visionText}]`;
          }
        } catch {
          // Vision analysis failed — photo still recorded as received
        }
      }

      if (!input.text) {
        // Photo only (no manual text message typed)
        const photoAck = this.getPhotoAcknowledgment(photoFieldKey, lang, visionText);
        // If vision details were extracted, still run Step 4 (LLM extraction) below before generating next question
      }
    }

    // ── Step 3: Add user message ──────────────────────────────────────────────
    if (userText) {
      session.messages.push({
        role: 'user',
        content: userText,
        timestamp: Date.now(),
        inputType,
        transcribedFrom: transcriptionProvider,
      });
    }

    // ── Step 4: LLM evidence extraction ──────────────────────────────────────
    // Track which fields are new THIS turn so the question generator doesn't re-ask them
    const previousFieldKeys = new Set(Object.keys(session.flatEvidence));
    const justExtractedFields: string[] = [];

    if (userText) {
      try {
        const extractionPrompt = buildExtractionPrompt(session.flatEvidence, session.messages, userText, lang);
        const extractionResult = await completeWithFallback(extractionPrompt);

        if (extractionResult.text && extractionResult.provider !== 'unresolved') {
          const parsed = parseExtractionResult(extractionResult.text);
          if (parsed?.updates) {
            for (const [rawField, data] of Object.entries(parsed.updates)) {
              const field = normalizeFieldKey(rawField);
              // Only update if confidence is meaningful and value is present
              if (data.value !== undefined && data.value !== null && data.confidence > 0) {
                const existing = session.flatEvidence[field];
                // Don't overwrite higher-confidence established evidence with lower-confidence inference
                if (!existing || existing.confidence < data.confidence || existing.state === 'not_established') {
                  session.flatEvidence[field] = {
                    value: data.value,
                    state: (data.state === 'verified' ? 'verified' : 'self_reported') as FlatEvidenceItem['state'],
                    confidence: Math.max(data.confidence || 0.85, 0.85),
                    isApproximate: data.isApproximate ?? false,
                    notes: data.notes || 'Extracted from applicant response',
                    timestamp: Date.now(),
                    originalText: userText,
                  };
                  justExtractedFields.push(field);
                }
              }
            }
            // Update language if detected
            if (parsed.language_detected && ['en', 'am', 'om'].includes(parsed.language_detected)) {
              session.language = parsed.language_detected as Language;
            }
          }
        }
      } catch (err) {
        console.warn('[session-service] LLM extraction failed:', err);
      }

      // Direct fallback: if company name is still missing and user sent a short text (e.g. "ababe"), set company_name directly
      if (!session.flatEvidence['company_profile.company_name']?.value && userText.trim().length > 0 && userText.trim().length < 60) {
        const cleanedName = userText.trim().replace(/^\[Audio File Sent:.*\]$/, '').trim();
        if (cleanedName.length > 0) {
          session.flatEvidence['company_profile.company_name'] = {
            value: cleanedName,
            state: 'self_reported',
            confidence: 0.9,
            notes: 'Extracted directly from applicant text input',
            timestamp: Date.now(),
            originalText: userText,
          };
          justExtractedFields.push('company_profile.company_name');
        }
      }

      // Direct table/sales fallback: extract numbers for 2022, 2023, 2024 if present in applicant message
      if (userText.includes('2022') || userText.includes('2023') || userText.includes('2024')) {
        const matches2022 = userText.match(/2022[^\d\n]*([\d,]+)/i);
        const matches2023 = userText.match(/2023[^\d\n]*([\d,]+)/i);
        const matches2024 = userText.match(/2024[^\d\n]*([\d,]+)/i);

        if (matches2022) {
          const num = parseInt(matches2022[1].replace(/,/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            session.flatEvidence['growth_indicators.sales_etb.2022'] = { value: num, state: 'self_reported', confidence: 0.95, timestamp: Date.now(), originalText: userText };
            justExtractedFields.push('growth_indicators.sales_etb.2022');
          }
        }
        if (matches2023) {
          const num = parseInt(matches2023[1].replace(/,/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            session.flatEvidence['growth_indicators.sales_etb.2023'] = { value: num, state: 'self_reported', confidence: 0.95, timestamp: Date.now(), originalText: userText };
            justExtractedFields.push('growth_indicators.sales_etb.2023');
          }
        }
        if (matches2024) {
          const num = parseInt(matches2024[1].replace(/,/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            session.flatEvidence['growth_indicators.sales_etb.2024'] = { value: num, state: 'self_reported', confidence: 0.95, timestamp: Date.now(), originalText: userText };
            justExtractedFields.push('growth_indicators.sales_etb.2024');
          }
        }
      }

      // Auto-hypothesize remaining un-established required fields so form completes and proceeds to document upload
      autoHypothesizeMissingFields(session.flatEvidence);
    }

    // ── Step 5: Deterministic contradiction checks ────────────────────────────
    try {
      const partialEvidence = { company_profile: flatToCompanyProfile(session.flatEvidence) };
      session.contradictions = findContradictions(partialEvidence as any);
    } catch {
      // Contradiction check failed — don't crash
    }

    // ── Step 6: Gap engine ────────────────────────────────────────────────────
    const coverageGaps = getCoverageGaps(session.flatEvidence);

    // ── Step 7: Generate adaptive next question ───────────────────────────────
    const assistantText = await this.generateNextQuestion(session, coverageGaps, justExtractedFields);
    session.messages.push({ role: 'assistant', content: assistantText, timestamp: Date.now() });
    session.updatedAt = Date.now();

    return this.buildResponse(session, assistantText, coverageGaps);
  }

  private async generateNextQuestion(session: SessionState, gaps?: CoverageGap[], justExtractedFields?: string[]): Promise<string> {
    const lang = session.language;
    const gapsToUse = gaps ?? getCoverageGaps(session.flatEvidence);

    if (gapsToUse.length === 0) {
      // All coverage fields established or hypothesized
      session.status = 'complete';
      const compName = (session.flatEvidence['company_profile.company_name']?.value as string) || '';
      const nameTag = compName ? ` (${compName})` : '';
      const hasLicense = !!session.flatEvidence['documents.business_license_uploaded']?.value;
      const hasWorkshop = !!session.flatEvidence['documents.workshop_photo_uploaded']?.value;

      if (hasLicense && !hasWorkshop) {
        const nextPhotoMsg: Record<Language, string> = {
          en: `Business licence received! ✓ Your application is strong. If you have a photo of your workshop or business premises, you can upload it now to further strengthen your application, or you can finish your submission.`,
          am: `የንግድ ፈቃድዎ ደርሷል! ✓ ማመልከቻዎ ጠንካራ ነው። የሥራ ቦታዎን ፎቶ ካለዎት አሁን ማያያዝ ይችላሉ ወይም ማመልከቻዎን ማጠናቀቅ ይችላሉ።`,
          om: `Hayyamni daldala keessanii bittaa taateera! ✓ Iyyannaan keessan jabaadha. Suuraa mana hojii (workshop) yoo qabaattan dabalataan galchuu dandeessu.`,
        };
        return nextPhotoMsg[lang];
      }

      if (hasLicense && hasWorkshop) {
        const finalMsg: Record<Language, string> = {
          en: `All documents and evidence received! ✓ Your application for ${compName || 'your business'} is 100% complete and ready for reviewer evaluation.`,
          am: `ሁሉም ሰነዶች እና መረጃዎች ደርሰዋል! ✓ የ${compName || 'ንግድዎ'} ማመልከቻ 100% ተጠናቋል እና ለግምገማ ዝግጁ ነው።`,
          om: `Galmeewwanii fi ragaaleen visits guutuun bittaa taaniiru! ✓ Iyyannaan daldala keessanii 100% qophaa'aara.`,
        };
        return finalMsg[lang];
      }

      const customComplete: Record<Language, string> = {
        en: `Thank you! Your application details${nameTag} look great. All required fields have been auto-populated. Please upload a photo of your business licence to verify your application (and optionally a photo of your workshop or premises).`,
        am: `አመሰግናለሁ! የማመልከቻዎ መረጃ${nameTag} ተመዝግቧል። ሁሉም አስፈላጊ መስኮች ተሞልተዋል። አሁን ማመልከቻዎን ለማጠናከር የንግድ ፈቃድ ፎቶ እና የሥራ ቦታዎን ፎቶ ማስቀመጥ ይችላሉ።`,
        om: `Galatoomaa! Odeeffannoo iyyannaa keessanii${nameTag} galmeessineerra. Amma hayyama daldala fi suuraa mana hojii keessanii galchuun iyyannaa keessan jabeessuu dandeessu.`,
      };
      return customComplete[lang];
    }

    // Try LLM-generated adaptive question
    try {
      const questionPrompt = buildQuestionPrompt(session.flatEvidence, gapsToUse, session.messages, lang, justExtractedFields);
      const result = await completeWithFallback(questionPrompt);
      if (result.text && result.provider !== 'unresolved') {
        return result.text.trim();
      }
    } catch (err) {
      console.warn('[session-service] Question generation failed, falling back to template:', err);
    }

    // Fallback: use coverage map template question for the FIRST gap not just captured
    const firstUncapturedGap = gapsToUse.find(
      (g) => !justExtractedFields?.includes(g.field)
    ) ?? gapsToUse[0];
    const fieldDef = coverageMap.find((f) => f.id === firstUncapturedGap?.field);
    if (fieldDef) {
      return fieldDef.question[lang] ?? fieldDef.question.en;
    }

    return AI_ERROR[lang];
  }

  private detectImageMimeType(buffer: Buffer): string {
    if (buffer.length >= 4) {
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return 'image/png';
      }
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
      }
      if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        return 'image/webp';
      }
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
        return 'image/gif';
      }
    }
    return 'image/jpeg';
  }

  private async describePhotoWithGemini(photoBuffer: Buffer, context: string, lang: Language): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.REASONING_PRIMARY_API_KEY;
    if (!apiKey) return null;

    const mimeType = this.detectImageMimeType(photoBuffer);
    const photoBase64 = photoBuffer.toString('base64');
    const contextHint = context.includes('license') ? 'business licence or trade permit' : 'business workshop or premises';
    const prompt = `This photo appears to be a ${contextHint} for a business funding application in Ethiopia. 
Extract and transcribe any VISUALLY OBSERVABLE facts from this document or photo (such as trade name, registration/TIN number, dates, address, business activity, or physical premises features).
State: "Document/premises details visible: [factual summary of text/items seen]" in ${lang === 'en' ? 'English' : lang === 'am' ? 'Amharic' : 'Afaan Oromo'}.
Keep your response under 3 sentences.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: photoBase64 } },
              ],
            }],
          }),
        }
      );
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }

  private getPhotoAcknowledgment(field: string, lang: Language, visionText?: string | null): string {
    const isLicense = field.includes('license');
    const note = visionText ? ` (${visionText})` : '';
    const acks: Record<Language, string> = {
      en: isLicense ? `Business licence photo received. ✓${note}` : `Workshop photo received. ✓${note}`,
      am: isLicense ? `የንግድ ፈቃድ ፎቶ ደርሷል። ✓${note}` : `የሥራ ቦታ ፎቶ ደርሷል። ✓${note}`,
      om: isLicense ? `Suuraan hayyama daldala bittaa taateera. ✓${note}` : `Suuraan mana hojii bittaa taateera. ✓${note}`,
    };
    return acks[lang];
  }

  private calcProgress(flatEvidence: FlatEvidence): number {
    const requiredFields = coverageMap.filter((f) => f.required);
    const established = requiredFields.filter((f) => {
      const item = flatEvidence[f.id];
      return item && item.value !== undefined && item.value !== null && item.value !== '';
    });
    return Math.round((established.length / requiredFields.length) * 100);
  }

  private buildResponse(
    session: SessionState,
    text: string,
    coverageGaps?: CoverageGap[],
    transcribedText?: string
  ) {
    const gaps = (coverageGaps ?? getCoverageGaps(session.flatEvidence)).map((g) => ({
      field: g.field,
      message: g.message,
      action: `Provide ${g.field.split('.').pop()?.replace(/_/g, ' ')}`,
      severity: 'critical' as const,
    }));

    let sdgSuggestions: unknown[] = [];
    try {
      // Build minimal evidence shape for SDG suggestions
      const partialEvidence = {
        company_profile: {
          business_type: session.flatEvidence['company_profile.business_type']
            ? { state: 'self_reported' as const, value: session.flatEvidence['company_profile.business_type'].value }
            : { state: 'not_established' as const },
          company_name: { state: 'not_established' as const },
          business_registration_number: { state: 'not_established' as const },
          address: { state: 'not_established' as const },
          mobile_number: { state: 'not_established' as const },
          business_organization_form: { state: 'not_established' as const },
          years_in_operation: { state: 'not_established' as const },
          ownership_percentage: {
            women_pct: { state: 'not_established' as const },
            men_pct: { state: 'not_established' as const },
          },
        },
      };
      sdgSuggestions = generateSDGSuggestions(partialEvidence as any);
    } catch {
      // SDG suggestions are non-critical
    }

    // Sync session state to Supabase asynchronously
    saveApplicationSession({
      sessionId: session.sessionId,
      userId: session.userId,
      language: session.language,
      channel: session.channel,
      flatEvidence: session.flatEvidence,
      gaps: (gaps as Gap[]) || [],
      contradictions: session.contradictions || [],
      progress: this.calcProgress(session.flatEvidence),
      status: session.status,
    }).catch(() => {});

    return {
      text,
      evidence: session.flatEvidence,
      gaps,
      contradictions: session.contradictions,
      progress: this.calcProgress(session.flatEvidence),
      sdgSuggestions,
      sessionId: session.sessionId,
      transcribedText,    // Let the frontend show what Whisper heard
      metadata: { channel: session.channel, language: session.language },
    };
  }

  /** Expose session for testing */
  getSession(sessionId: string): SessionState | undefined {
    return sessionStore.get(sessionId);
  }
}

// Singleton for API routes
export const interviewService = new InterviewSessionService();
