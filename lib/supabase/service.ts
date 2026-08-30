import { supabase } from './client';
import { FlatEvidence } from '@/lib/evidence/types';
import { Gap } from '@/lib/evidence/gaps';
import { Contradiction } from '@/lib/evidence/contradictions';

export interface ApplicantUser {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  businessName?: string;
}

export interface SupabaseApplicationRecord {
  sessionId: string;
  userId: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  businessName?: string;
  language?: string;
  channel?: string;
  flatEvidence: FlatEvidence;
  gaps: Gap[];
  contradictions: Contradiction[];
  progress: number;
  status: string;
}

export interface SupabaseMessageRecord {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  content?: string;
  inputType?: 'text' | 'voice' | 'photo';
  attachmentName?: string;
  attachmentUrl?: string;
  timestamp?: string | number;
}

/**
 * Save or update applicant user details in Supabase
 */
export async function saveApplicantUser(user: ApplicantUser): Promise<void> {
  try {
    const { error } = await supabase.from('applicant_users').upsert(
      {
        user_id: user.userId,
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        business_name: user.businessName || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) {
      console.warn('Supabase applicant_users save warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase saveApplicantUser error:', err);
  }
}

/**
 * Save or update application session and evidence in Supabase
 */
export async function saveApplicationSession(app: SupabaseApplicationRecord): Promise<void> {
  try {
    const { error } = await supabase.from('applications').upsert(
      {
        session_id: app.sessionId,
        user_id: app.userId,
        applicant_name: app.applicantName || null,
        applicant_email: app.applicantEmail || null,
        applicant_phone: app.applicantPhone || null,
        business_name: app.businessName || null,
        language: app.language || 'en',
        channel: app.channel || 'web',
        flat_evidence: app.flatEvidence || {},
        gaps: app.gaps || [],
        contradictions: app.contradictions || [],
        progress: app.progress || 0,
        status: app.status || 'in_progress',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );
    if (error) {
      console.warn('Supabase applications save warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase saveApplicationSession error:', err);
  }
}

/**
 * Save chat message & attachments (voice recordings, uploaded audio, or photos) in Supabase
 */
export async function saveApplicationMessage(msg: SupabaseMessageRecord): Promise<void> {
  try {
    const { error } = await supabase.from('application_messages').upsert(
      {
        id: msg.id,
        session_id: msg.sessionId,
        user_id: msg.userId,
        role: msg.role,
        content: msg.content || '',
        input_type: msg.inputType || 'text',
        attachment_name: msg.attachmentName || null,
        attachment_url: msg.attachmentUrl || null,
        timestamp: typeof msg.timestamp === 'number' ? new Date(msg.timestamp).toISOString() : msg.timestamp || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('Supabase application_messages save warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase saveApplicationMessage error:', err);
  }
}

/**
 * Load all applications for a specific logged-in user
 */
export async function getApplicationsByUser(userId: string) {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase getApplicationsByUser error:', err);
    return [];
  }
}
