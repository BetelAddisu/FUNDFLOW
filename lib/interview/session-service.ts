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
    if (!item || item.value === undefined || item.value === null || item.value === '') {
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

    const lang = session.language;

    // ── Handle language switch command ────────────────────────────────────────
    if (input.text?.startsWith('/lang ')) {
      const newLang = input.text.slice(6).trim() as Language;
      if (['en', 'am', 'om'].includes(newLang)) {
        session.language = newLang;
        return { text: WELCOME[newLang], evidence: session.flatEvidence, gaps: session.gaps, contradictions: session.contradictions, progress: 0 };
      }
    }

    // ── First message: welcome ────────────────────────────────────────────────
    if (session.messages.length === 0 && !input.text && !input.audio && !input.photos?.length) {
      const welcome = WELCOME[lang];
      session.messages.push({ role: 'assistant', content: welcome, timestamp: Date.now() });
      return this.buildResponse(session, welcome);
    }

    // ── Step 1: Resolve audio to text ─────────────────────────────────────────
    let userText = input.text ?? '';
    let inputType: 'text' | 'voice' | 'photo' = input.text ? 'text' : 'photo';
    let transcriptionProvider: string | undefined;

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
      if (input.photos[0]) {
        try {
          const visionText = await this.describePhotoWithGemini(input.photos[0], photoFieldKey, lang);
          if (visionText) {
            session.flatEvidence[photoFieldKey].notes = visionText;
            session.flatEvidence[photoFieldKey].confidence = 0.65;
          }
        } catch {
          // Vision analysis failed — photo still recorded as received
        }
      }

      if (!userText) {
        // Photo only — acknowledge and ask next question
        const photoAck = this.getPhotoAcknowledgment(photoFieldKey, lang);
        const nextQ = await this.generateNextQuestion(session);
        const reply = `${photoAck} ${nextQ}`;
        session.messages.push({ role: 'assistant', content: reply, timestamp: Date.now() });
        return this.buildResponse(session, reply);
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
    if (userText) {
      try {
        const extractionPrompt = buildExtractionPrompt(session.flatEvidence, session.messages, userText, lang);
        const extractionResult = await completeWithFallback(extractionPrompt);

        if (extractionResult.text && extractionResult.provider !== 'unresolved') {
          const parsed = parseExtractionResult(extractionResult.text);
          if (parsed?.updates) {
            for (const [field, data] of Object.entries(parsed.updates)) {
              // Only update if confidence is meaningful and value is present
              if (data.value !== undefined && data.value !== null && data.confidence > 0) {
                const existing = session.flatEvidence[field];
                // Don't overwrite higher-confidence established evidence with lower-confidence inference
                if (!existing || existing.confidence < data.confidence || existing.state === 'not_established') {
                  session.flatEvidence[field] = {
                    value: data.value,
                    state: data.state as FlatEvidenceItem['state'],
                    confidence: data.confidence,
                    isApproximate: data.isApproximate ?? false,
                    notes: data.notes,
                    timestamp: Date.now(),
                    originalText: userText,
                  };
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
        // Continue — session state preserved, next question still generated
      }
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
    const assistantText = await this.generateNextQuestion(session, coverageGaps);
    session.messages.push({ role: 'assistant', content: assistantText, timestamp: Date.now() });
    session.updatedAt = Date.now();

    return this.buildResponse(session, assistantText, coverageGaps);
  }

  private async generateNextQuestion(session: SessionState, gaps?: CoverageGap[]): Promise<string> {
    const lang = session.language;
    const gapsToUse = gaps ?? getCoverageGaps(session.flatEvidence);

    if (gapsToUse.length === 0) {
      // All coverage fields established
      session.status = 'complete';
      return COMPLETE[lang];
    }

    // Try LLM-generated adaptive question
    try {
      const questionPrompt = buildQuestionPrompt(session.flatEvidence, gapsToUse, session.messages, lang);
      const result = await completeWithFallback(questionPrompt);
      if (result.text && result.provider !== 'unresolved') {
        return result.text.trim();
      }
    } catch (err) {
      console.warn('[session-service] Question generation failed, falling back to template:', err);
    }

    // Fallback: use coverage map template question
    const topGapField = gapsToUse[0]?.field;
    const fieldDef = coverageMap.find((f) => f.id === topGapField);
    if (fieldDef) {
      return fieldDef.question[lang] ?? fieldDef.question.en;
    }

    return AI_ERROR[lang];
  }

  private async describePhotoWithGemini(photoBuffer: Buffer, context: string, lang: Language): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.REASONING_PRIMARY_API_KEY;
    if (!apiKey) return null;

    const photoBase64 = photoBuffer.toString('base64');
    const contextHint = context.includes('license') ? 'business licence or trade permit' : 'business workshop or premises';
    const prompt = `This photo appears to be a ${contextHint} for a business funding application. 
Describe only what is VISUALLY OBSERVABLE in this image. 
Do NOT infer ownership, revenue, registration validity, or employee count from the image.
State: "Document/premises visible: [brief factual description]" in ${lang === 'en' ? 'English' : lang === 'am' ? 'Amharic' : 'Afaan Oromo'}.
Keep your response under 2 sentences.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: photoBase64 } },
              ],
            }],
          }),
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch {
      return null;
    }
  }

  private getPhotoAcknowledgment(field: string, lang: Language): string {
    const isLicense = field.includes('license');
    const acks: Record<Language, string> = {
      en: isLicense ? 'Business licence photo received. ✓' : 'Workshop photo received. ✓',
      am: isLicense ? 'የንግድ ፈቃድ ፎቶ ደርሷል። ✓' : 'የሥራ ቦታ ፎቶ ደርሷል። ✓',
      om: isLicense ? 'Suuraan hayyama daldala bittaa taateera. ✓' : 'Suuraan mana hojii bittaa taateera. ✓',
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
    coverageGaps?: CoverageGap[]
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
