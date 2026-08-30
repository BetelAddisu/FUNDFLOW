'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type Language = 'en' | 'am' | 'om';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  inputType?: 'text' | 'voice' | 'photo';
  attachmentName?: string;
}

import { saveApplicantUser, saveApplicationMessage, saveApplicationSession } from '@/lib/supabase/service';

interface ApplicantUser {
  userId: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
}

const FORM_UI_I18N: Record<Language, {
  headerTitle: string;
  schemeTag: string;
  exitIntake: string;
  readinessLabel: string;
  complete: string;
  liveFormHeader: string;
  autoFilledCount: (count: number) => string;
  fieldsNeededCount: (count: number) => string;
  tabLiveForm: string;
  tabAuditLog: string;
  tabSdgs: string;
  badgeConfirmed: string;
  badgeAssumed: string;
  badgeNeeded: string;
  field1Label: string;
  field1Sub: string;
  field1Placeholder: string;
  field2Label: string;
  field2Sub: string;
  field2Placeholder: string;
  field3Label: string;
  field3Sub: string;
  field3Placeholder: string;
  field4Label: string;
  field4Sub: string;
  field4Placeholder: string;
  field5Label: string;
  field5NotSet: string;
  field6Label: string;
  field6PhotoAttached: string;
  field6Awaiting: string;
  auditEmpty: string;
  verificationAlert: string;
}> = {
  en: {
    headerTitle: 'FUNDflow Application Intake',
    schemeTag: 'SME Support Scheme',
    exitIntake: '← Exit Intake',
    readinessLabel: 'Readiness:',
    complete: 'Complete',
    liveFormHeader: 'Live Application Form',
    autoFilledCount: (c) => `${c} fields auto-filled`,
    fieldsNeededCount: (c) => `${c} fields needed`,
    tabLiveForm: '📋 Live Form',
    tabAuditLog: '🛡️ Audit Log',
    tabSdgs: '🌱 SDGs',
    badgeConfirmed: '✔ Confirmed',
    badgeAssumed: '◈ Assumed',
    badgeNeeded: '⏳ Needed',
    field1Label: 'Business Legal Name & Location',
    field1Sub: 'Official trade name, sector, and registered location.',
    field1Placeholder: 'Awaiting business name from chat or document upload...',
    field2Label: 'What problem do you need help with?',
    field2Sub: 'The need in your community or business that this project addresses.',
    field2Placeholder: 'Describe your business problem or talk to the assistant to auto-fill...',
    field3Label: 'What will the money be used for?',
    field3Sub: 'What you will buy, build, run or pay for (equipment, inventory, payroll).',
    field3Placeholder: 'Be concrete — this is what the funding decision is made on.',
    field4Label: 'Project description & impact',
    field4Sub: 'What the project does and the impact it will have on beneficiaries.',
    field4Placeholder: 'A few sentences on enterprise operations, employees, and community impact.',
    field5Label: 'Funding Requested',
    field5NotSet: 'Not set',
    field6Label: 'License / Registration',
    field6PhotoAttached: 'License Photo Attached',
    field6Awaiting: 'Awaiting Permit',
    auditEmpty: 'No structured evidence extracted yet. Enter text, record voice, or upload audio/photos.',
    verificationAlert: 'Verification Alert',
  },
  am: {
    headerTitle: 'የFUNDflow ማመልከቻ መሙያ',
    schemeTag: 'የኤስኤምኢ ድጋፍ ፕሮግራም',
    exitIntake: '← ውጣ',
    readinessLabel: 'ዝግጁነት:',
    complete: 'ተጠናቋል',
    liveFormHeader: 'የቀጥታ ማመልከቻ ቅጽ',
    autoFilledCount: (c) => `${c} መስኮች በራስ-ሰር ተሞልተዋል`,
    fieldsNeededCount: (c) => `${c} መስኮች ይፈለጋሉ`,
    tabLiveForm: '📋 የቀጥታ ቅጽ',
    tabAuditLog: '🛡️ የምርመራ ምዝግብ',
    tabSdgs: '🌱 SDGs',
    badgeConfirmed: '✔ ተረጋግጧል',
    badgeAssumed: '◈ የታሰበ',
    badgeNeeded: '⏳ ያስፈልጋል',
    field1Label: 'የድርጅቱ ህጋዊ ስም እና አድራሻ',
    field1Sub: 'ይፋዊ የንግድ ስም፣ ዘርፍ እና የተመዘገበበት ቦታ።',
    field1Placeholder: 'የድርጅቱን ስም በውይይት ወይም ሰነድ በመላክ ይጠብቁ...',
    field2Label: 'ምን ዓይነት ችግር ለመፍታት ይፈልጋሉ?',
    field2Sub: 'ይህ ፕሮጀክት የሚፈታው በማህበረሰብዎ ወይም በንግድዎ ያለ የፍላጎት ችግር።',
    field2Placeholder: 'የንግድ ችግርዎን ይግለጹ ወይም ከረዳቱ ጋር በመወያየት ይሙሉ...',
    field3Label: 'ገንዘቡ ለምን ጥቅም ላይ ይውላል?',
    field3Sub: 'የሚገዙት፣ የሚገነቡት፣ የሚያንቀሳቅሱት ወይም የሚከፍሉት (መሳሪያዎች፣ እቃዎች፣ ደመወዝ)።',
    field3Placeholder: 'ግልጽ ይሁኑ — የገንዘብ ድጋፍ ውሳኔ የሚሰጠው በዚህ ላይ ነው።',
    field4Label: 'የፕሮጀክት መግለጫ እና ተጽዕኖ',
    field4Sub: 'ፕሮጀክቱ የሚያከናውነው እና በተጠቃሚዎች ላይ የሚያመጣው ተጽዕኖ።',
    field4Placeholder: 'ስለ ድርጅቱ አሰራር፣ ሰራተኞች እና ማህበረሰብ ተጽዕኖ በጥቂት አረፍተ ነገሮች።',
    field5Label: 'የተጠየቀው የገንዘብ ድጋፍ',
    field5NotSet: 'ልዩ አልሆነም',
    field6Label: 'የንግድ ፈቃድ / ምዝገባ',
    field6PhotoAttached: 'የፈቃድ ፎቶ ተያይዟል',
    field6Awaiting: 'ፈቃድ ይጠበቃል',
    auditEmpty: 'እስካሁን ምንም የተደራጀ መረጃ አልወጣም። ጽሑፍ ይጻፉ፣ ድምጽ ይቅረጹ ወይም ፎቶ ያያይዙ።',
    verificationAlert: 'የማረጋገጫ ማስጠንቀቂያ',
  },
  om: {
    headerTitle: 'Galmee Iyyannaa FUNDflow',
    schemeTag: 'Sagantaa Deggersa SME',
    exitIntake: '← Ba\'i',
    readinessLabel: 'Qophii:',
    complete: 'Guutameera',
    liveFormHeader: 'Foomii Iyyannaa Kallattii',
    autoFilledCount: (c) => `${c} dirreewwan ofiin guutaman`,
    fieldsNeededCount: (c) => `${c} dirreewwan barbaachisan`,
    tabLiveForm: '📋 Foomii Kallattii',
    tabAuditLog: '🛡️ Galmee Qorannoo',
    tabSdgs: '🌱 SDGs',
    badgeConfirmed: '✔ Mirkanaa\'eera',
    badgeAssumed: '◈ Tilmaamameera',
    badgeNeeded: '⏳ Barbaachisa',
    field1Label: 'Maqaa Seeraa Dhaabbata fi Dhaabbannoo',
    field1Sub: 'Maqaa daldala seeraa, damee fi bakka galmeeffame.',
    field1Placeholder: 'Maqaa dhaabbataa haasaa ykn galmee erguun eegaa...',
    field2Label: 'Rakkoo kam furuuf gargaarsa barbaaddu?',
    field2Sub: 'Fedhii hawaasa keessaniif ykn daldala keessaniif sagantaan kun furu.',
    field2Placeholder: 'Rakkoo daldala keessanii ibsaa ykn gargaaraa wajjin haasa\'a...',
    field3Label: 'Maallaqni kun maaliif fayyada?',
    field3Sub: 'Waan bitattan, ijaartan, deemstan ykn kafaltan (meeshaa, qabeenya, mindaa).',
    field3Placeholder: 'Kallattiin ibsaa — murteon maallaqaa kan irratti kennamu kanaani.',
    field4Label: 'Ibsa Pirojektiifi Dhiibbaa',
    field4Sub: 'Pirojektichi waan hojjetu fi dhiibbaa inni fayyadamtoota irratti fidu.',
    field4Placeholder: 'Hojii dhaabbataa, hojjettoota fi dhiibbaa hawaasaa irratti barreeffama gabaabaa.',
    field5Label: 'Gargaarsa Maallaqaa Gaafatame',
    field5NotSet: 'Hin murtaa\'in',
    field6Label: 'Hayyama Daldalaa / Galmee',
    field6PhotoAttached: 'Suuraan Hayyamaa Qabsiifameera',
    field6Awaiting: 'Hayyama Eegaa',
    auditEmpty: 'Hangafa odeeffannoon qindaa\'e hin argamne. Barreeffama galchaa, sagalee waraabaa ykn suuraa qabsiisaa.',
    verificationAlert: 'Akeekkachiisa Mirkanneessaa',
  },
};

export default function ApplyPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [workshopPhoto, setWorkshopPhoto] = useState<File | null>(null);
  
  // Applicant Authentication State
  const [currentUser, setCurrentUser] = useState<ApplicantUser | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
  });

  // Application State
  const [flatEvidence, setFlatEvidence] = useState<Record<string, any>>({});
  const [gaps, setGaps] = useState<any[]>([]);
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [sdgSuggestions, setSdgSuggestions] = useState<any[]>([]);
  const [progress, setProgress] = useState<number>(0);
  
  // Real-time Extraction Feedback State
  const [recentlyExtractedKeys, setRecentlyExtractedKeys] = useState<Set<string>>(new Set());
  const [liveExtractionToast, setLiveExtractionToast] = useState<{ text: string; count: number } | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'form' | 'evidence' | 'gaps' | 'sdgs'>('chat');
  const [rightConsoleTab, setRightConsoleTab] = useState<'form' | 'evidence' | 'sdgs'>('form');
  const [error, setError] = useState<string | null>(null);

  // Floating Input Hub State
  const [isInputHubOpen, setIsInputHubOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const workshopInputRef = useRef<HTMLInputElement>(null);

  // Initialize or restore session & mandatory applicant authentication
  useEffect(() => {
    let existingSession = localStorage.getItem('fundflow_session_id');
    if (!existingSession) {
      existingSession = `web-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('fundflow_session_id', existingSession);
    }
    setSessionId(existingSession);

    const savedUserStr = localStorage.getItem('fundflow_applicant_user');
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        if (parsed.name && (parsed.email || parsed.phone) && parsed.businessName) {
          setCurrentUser(parsed);
          setLoginForm({
            name: parsed.name || '',
            email: parsed.email || '',
            phone: parsed.phone || '',
            businessName: parsed.businessName || '',
          });
        } else {
          setLoginModalOpen(true);
        }
      } catch {
        setLoginModalOpen(true);
      }
    } else {
      setLoginModalOpen(true);
    }

    // Initial greeting
    sendMessage('', existingSession, 'en', true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recording logic
  const startRecording = async () => {
    setIsInputHubOpen(false);
    if (!currentUser) {
      setLoginModalOpen(true);
      setError('Applicant sign-in required before recording voice notes.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || '';
      mediaRecorderRef.current = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);
      const actualMimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const ext = actualMimeType.split('/')[1]?.split(';')[0] || 'webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
          const file = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, { type: actualMimeType });
          setAudioFile(file);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access denied or not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleLanguageChange = async (newLang: Language) => {
    setLanguage(newLang);
    await sendMessage(`/lang ${newLang}`, sessionId, newLang);
  };

  // Helper to convert files to Data URL for Supabase storage persistence
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.name || (!loginForm.email && !loginForm.phone) || !loginForm.businessName) {
      setError('Please provide your Name, Email or Phone, and Business Name.');
      return;
    }
    const uid = currentUser?.userId || `usr_${Math.random().toString(36).substring(2, 9)}`;
    const userObj: ApplicantUser = {
      userId: uid,
      name: loginForm.name,
      email: loginForm.email,
      phone: loginForm.phone,
      businessName: loginForm.businessName,
    };
    setCurrentUser(userObj);
    localStorage.setItem('fundflow_applicant_user', JSON.stringify(userObj));
    setLoginModalOpen(false);

    // Save applicant user profile to Supabase
    await saveApplicantUser(userObj);

    // Sync application session with user details
    await saveApplicationSession({
      sessionId,
      userId: uid,
      applicantName: userObj.name,
      applicantEmail: userObj.email,
      applicantPhone: userObj.phone,
      businessName: userObj.businessName,
      language,
      flatEvidence,
      gaps,
      contradictions,
      progress,
      status: 'in_progress',
    });
  };

  // Helper to compress image files client-side before sending
  const compressImageIfNeeded = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.size < 1.2 * 1024 * 1024) {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  const sendMessage = async (
    text: string,
    sessId: string,
    lang: Language,
    isInitial = false,
    audioOverride?: File | null,
    licenseOverride?: File | null,
    workshopOverride?: File | null
  ) => {
    setLoading(true);
    setError(null);

    if (!isInitial && !currentUser) {
      setLoginModalOpen(true);
      setError('Applicant sign-in required before submitting messages or uploads.');
      setLoading(false);
      return;
    }

    const activeUserId = currentUser?.userId || 'web-applicant';

    const formData = new FormData();
    formData.append('userId', activeUserId);
    formData.append('sessionId', sessId || sessionId);
    if (text) formData.append('text', text);
    
    const curAudio = audioOverride !== undefined ? audioOverride : audioFile;
    if (curAudio) formData.append('audio', curAudio);

    let curLicense = licenseOverride !== undefined ? licenseOverride : licensePhoto;
    let curWorkshop = workshopOverride !== undefined ? workshopOverride : workshopPhoto;

    // Compress photo uploads client-side to prevent 413 Payload Too Large errors
    if (curLicense) curLicense = await compressImageIfNeeded(curLicense);
    if (curWorkshop) curWorkshop = await compressImageIfNeeded(curWorkshop);

    if (curLicense) formData.append('photos', curLicense);
    if (curWorkshop) formData.append('photos', curWorkshop);

    let currentMsgId: string | undefined;

    if (!isInitial) {
      let attachmentName: string | undefined;
      let msgType: 'text' | 'voice' | 'photo' = 'text';

      if (curAudio) {
        msgType = 'voice';
        attachmentName = curAudio.name || 'Voice Audio File';
      } else if (curLicense || curWorkshop) {
        msgType = 'photo';
        attachmentName = curLicense ? `License: ${curLicense.name}` : `Workshop: ${curWorkshop?.name}`;
      }

      const msgId = `msg_${Math.random().toString(36).substring(2, 9)}`;
      currentMsgId = msgId;
      const userContent = text || (curAudio ? `[Audio File Sent: ${curAudio.name}]` : '[Photo Uploaded]');

      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'user',
          content: userContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inputType: msgType,
          attachmentName,
        },
      ]);

      // Convert attachments to Data URL & persist message to Supabase
      (async () => {
        let attachmentUrl: string | undefined;
        if (curAudio) attachmentUrl = await fileToDataUrl(curAudio);
        else if (curLicense) attachmentUrl = await fileToDataUrl(curLicense);
        else if (curWorkshop) attachmentUrl = await fileToDataUrl(curWorkshop);

        saveApplicationMessage({
          id: msgId,
          sessionId: sessId || sessionId,
          userId: activeUserId,
          role: 'user',
          content: userContent,
          inputType: msgType,
          attachmentName,
          attachmentUrl,
        }).catch(() => {});
      })();
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'x-language': lang,
        },
        body: formData,
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 504 || rawText.toLowerCase().includes('function_invocation_timeout')) {
          setError('Server timeout (504). Your photo was received and saved — tap Send again to finish auto-filling.');
        } else if (res.status === 413 || rawText.toLowerCase().includes('request entity') || rawText.toLowerCase().includes('large')) {
          setError('File size too large for a single upload. Please send your audio recording and photo separately.');
        } else {
          setError(`Server response error (${res.status}): ${rawText.slice(0, 120)}`);
        }
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.transcribedText && currentMsgId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === currentMsgId ? { ...m, content: `🗣️ "${data.transcribedText}"` } : m))
        );
      }

      if (data.text) {
        const assistantMsgId = `msg_${Math.random().toString(36).substring(2, 9)}`;
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        // Save assistant message to Supabase
        saveApplicationMessage({
          id: assistantMsgId,
          sessionId: sessId || sessionId,
          userId: activeUserId,
          role: 'assistant',
          content: data.text,
          inputType: 'text',
        }).catch(() => {});
      }

      if (data.evidence) {
        const newKeys = new Set<string>();
        for (const [k, v] of Object.entries(data.evidence)) {
          const oldVal = flatEvidence[k]?.value;
          const newVal = (v as any)?.value;
          if (newVal !== undefined && newVal !== null && newVal !== oldVal) {
            newKeys.add(k);
          }
        }

        setFlatEvidence(data.evidence);

        // Instantly reflect submission in localStorage for Reviewer Workstation
        try {
          localStorage.setItem(
            'fundflow_live_submission',
            JSON.stringify({
              sessionId,
              evidence: data.evidence,
              currentUser,
              progress: data.progress,
              updatedAt: new Date().toISOString(),
            })
          );
        } catch (e) {
          console.warn('Failed to store live submission in localStorage:', e);
        }

        if (newKeys.size > 0) {
          setRecentlyExtractedKeys(newKeys);
          const toastText = lang === 'am'
            ? `✨ ${newKeys.size} መስኮች በራስ-ሰር ተሞልተዋል!`
            : lang === 'om'
            ? `✨ Dirreewwan ${newKeys.size} ofiin guutaman!`
            : `✨ ${newKeys.size} field${newKeys.size > 1 ? 's' : ''} auto-filled in real time!`;
          setLiveExtractionToast({ text: toastText, count: newKeys.size });

          setTimeout(() => {
            setRecentlyExtractedKeys(new Set());
            setLiveExtractionToast(null);
          }, 6000);
        }
      }
      if (data.gaps) setGaps(data.gaps);
      if (data.contradictions) setContradictions(data.contradictions);
      if (data.sdgSuggestions) setSdgSuggestions(data.sdgSuggestions);
      if (data.progress !== undefined) setProgress(data.progress);

      // Save overall application session to Supabase
      saveApplicationSession({
        sessionId: sessId || sessionId,
        userId: activeUserId,
        applicantName: currentUser?.name,
        applicantEmail: currentUser?.email,
        applicantPhone: currentUser?.phone,
        businessName: currentUser?.businessName,
        language: lang,
        flatEvidence: data.evidence || flatEvidence,
        gaps: data.gaps || gaps,
        contradictions: data.contradictions || contradictions,
        progress: data.progress !== undefined ? data.progress : progress,
        status: 'in_progress',
      }).catch(() => {});

      setInputText('');
      setAudioFile(null);
      setLicensePhoto(null);
      setWorkshopPhoto(null);
      setIsInputHubOpen(false);
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (
    audioOverride?: File | null,
    licenseOverride?: File | null,
    workshopOverride?: File | null
  ) => {
    if (!inputText.trim() && !audioOverride && !licenseOverride && !workshopOverride && !audioFile && !licensePhoto && !workshopPhoto) {
      return;
    }
    await sendMessage(inputText, sessionId, language, false, audioOverride, licenseOverride, workshopOverride);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Application Navigation Header */}
      <header className="h-14 border-b border-slate-800 bg-[#111723] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-2.5 py-1 rounded border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {FORM_UI_I18N[language].exitIntake}
          </Link>
          <div className="h-4 w-px bg-slate-800"></div>
          <div>
            <h1 className="font-semibold text-white text-sm md:text-base flex items-center gap-2">
              {FORM_UI_I18N[language].headerTitle}
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {FORM_UI_I18N[language].schemeTag}
              </span>
            </h1>
          </div>
        </div>

        {/* Language Selection & Readiness Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#0b0f17] p-0.5 rounded border border-slate-800 text-xs">
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('am')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                language === 'am' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              አማርኛ
            </button>
            <button
              onClick={() => handleLanguageChange('om')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                language === 'om' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Afaan Oromoo
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs border-l border-slate-800 pl-4">
            <span className="text-slate-400 font-medium">{FORM_UI_I18N[language].readinessLabel}</span>
            <span className="font-bold text-blue-400">{progress}%</span>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          {/* Applicant Account Login / Profile Indicator */}
          <div className="border-l border-slate-800 pl-4 flex items-center">
            {currentUser ? (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate max-w-[120px]">{currentUser.name}</span>
                <span className="text-[10px] text-emerald-300/70 hidden md:inline">({currentUser.businessName || 'Applicant'})</span>
              </button>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded border border-blue-500/40 bg-blue-600/10 text-xs font-semibold text-blue-400 hover:bg-blue-600/20 transition-colors"
              >
                <span>👤</span>
                <span>Sign In / Identify Applicant</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl w-full mx-auto p-3 md:p-5 gap-5 overflow-hidden">
        
        {/* Left Console: Conversation & Interactive Input Engine */}
        <div className="lg:col-span-8 flex flex-col h-[calc(100vh-5.5rem)] bg-[#111723] rounded-lg border border-slate-800 overflow-hidden relative shadow-lg">
          
          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden border-b border-slate-800 bg-[#0b0f17] text-xs font-medium">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2.5 text-center border-b-2 ${
                activeTab === 'chat' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-slate-400'
              }`}
            >
              Intake Conversation
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`flex-1 py-2.5 text-center border-b-2 ${
                activeTab === 'evidence' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-slate-400'
              }`}
            >
              Evidence ({Object.keys(flatEvidence).length})
            </button>
            <button
              onClick={() => setActiveTab('gaps')}
              className={`flex-1 py-2.5 text-center border-b-2 ${
                activeTab === 'gaps' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-slate-400'
              }`}
            >
              Gaps ({gaps.length})
            </button>
          </div>

          {/* Messages Stream */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${activeTab !== 'chat' ? 'hidden lg:block' : 'block'}`}>
            {/* Contradiction Engine Warning Alert */}
            {contradictions.length > 0 && (
              <div className="p-3 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1 text-rose-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Verification Alert
                </div>
                {contradictions.map((c, idx) => (
                  <p key={idx} className="leading-relaxed">{c.message}</p>
                ))}
              </div>
            )}

            {/* Submission Success Banner */}
            {(flatEvidence['documents.business_license_uploaded']?.value || status === 'complete' || progress >= 90) && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/90 via-teal-900/90 to-slate-900 border border-emerald-500/50 shadow-xl shadow-emerald-500/10 text-white space-y-2.5 animate-in fade-in slide-in-from-top-3 duration-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-xl shrink-0 shadow-inner">
                    🎉
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                      <span>
                        {language === 'am'
                          ? 'ማመልከቻዎ በተሳካ ሁኔታ ተልኳል!'
                          : language === 'om'
                          ? 'Iyyannaan keessan milkaa\'inaan ergameera!'
                          : 'Application & Licence Successfully Submitted!'}
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-wider font-mono">
                        SUBMITTED
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                      {language === 'am'
                        ? 'የንግድ ፈቃድዎ እና የድርጅትዎ መረጃ ተረጋግጧል። ማመልከቻዎ ለግምገማ መድረክ (Reviewer Workstation) ወዲያውኑ ተልኳል።'
                        : language === 'om'
                        ? 'Hayyamni daldala fi odeeffannoon keessan mirkanaa\'eera. Amma garas Reviewer Workstationtti ergameera.'
                        : 'Your trade licence & business data have been verified and forwarded to the Reviewer Workstation for ranking.'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-emerald-500/20 text-xs gap-2">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live Status: <strong>Forwarded to Reviewer Workstation</strong></span>
                  </span>
                  <Link
                    href="/review"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md hover:shadow-emerald-500/30 flex items-center gap-1.5 text-xs"
                  >
                    <span>🔍</span>
                    <span>View in Reviewer Workstation &rarr;</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Chat Message Bubbles */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1 font-medium">
                  <span>{msg.role === 'user' ? 'Applicant' : 'FUNDflow AI'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[78%] p-3.5 rounded-lg text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-[#172030] text-slate-100 border border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  {msg.inputType === 'voice' && (
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/20 text-xs font-semibold text-emerald-200">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                      {msg.attachmentName || 'Voice Audio Input'}
                    </div>
                  )}

                  {msg.inputType === 'photo' && (
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/20 text-xs font-semibold text-amber-200">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {msg.attachmentName || 'Photo Evidence'}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-3 p-2">
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#172030] border border-slate-700/80 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                    {audioFile
                      ? (language === 'om' ? 'Sagalee dhaggeeffachaa...' : language === 'am' ? 'ድምጽ እየተቀበለ...' : 'Transcribing voice...')
                      : licensePhoto || workshopPhoto
                      ? (language === 'om' ? 'Suuraa qoraa...' : language === 'am' ? 'ፎቶ እያጠና...' : 'Analyzing photo...')
                      : (language === 'om' ? 'Odeeffannoo baasaa...' : language === 'am' ? 'መረጃ እያወጣ...' : 'Extracting information...')}
                  </div>
                </div>
              </div>
            )}

            {/* Inline Document Upload Action Card — shown when AI has enough info and asks for docs */}
            {!loading && progress >= 40 && !flatEvidence['documents.business_license_uploaded'] && (
              <div className="flex items-start gap-2 mt-1">
                <div className="bg-[#0b1628] border border-blue-500/30 rounded-lg p-3.5 text-xs space-y-3 w-full max-w-[85%]">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <span>📎</span>
                    <span>
                      {language === 'om'
                        ? 'Galmee fi suuraa galchi'
                        : language === 'am'
                        ? 'ሰነዶች ያቅርቡ'
                        : 'Upload Supporting Documents'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => licenseInputRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded bg-[#172030] border border-amber-500/30 hover:border-amber-400/60 text-amber-400 font-medium transition-colors"
                    >
                      <span className="text-lg">📄</span>
                      <span className="text-[10px] text-center leading-tight">
                        {language === 'om' ? 'Hayyama Daldala' : language === 'am' ? 'የንግድ ፈቃድ' : 'Business Licence'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => workshopInputRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded bg-[#172030] border border-slate-600/40 hover:border-slate-500/60 text-slate-400 font-medium transition-colors"
                    >
                      <span className="text-lg">🏭</span>
                      <span className="text-[10px] text-center leading-tight">
                        {language === 'om' ? 'Mana Hojii' : language === 'am' ? 'የሥራ ቦታ' : 'Workshop Photo'}
                      </span>
                    </button>
                  </div>
                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    {language === 'om'
                      ? 'Hayyama daldala keessanii suuraa kaasaa ergaa. Ibsaaf dirqama miti.'
                      : language === 'am'
                      ? 'ፎቶ ቢያቀርቡ ማመልከቻዎ ይጠናከራል። አስፈላጊ አይደለም ነገር ግን ይረዳል።'
                      : 'Upload a photo of your trade licence to strengthen your application. Workshop photo optional.'}
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner */}
          {error && <div className="text-xs text-rose-400 bg-rose-500/10 px-4 py-2 border-t border-rose-500/20">{error}</div>}

          {/* Attached Files Active Bar */}
          {(licensePhoto || workshopPhoto || audioFile) && (
            <div className="px-4 py-2 bg-[#172030] border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Pending Attachments:</span>
              
              {audioFile && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  <span>Voice/Audio: {audioFile.name.slice(0, 18)}</span>
                  <button onClick={() => setAudioFile(null)} className="ml-1 text-slate-400 hover:text-white font-bold">×</button>
                </div>
              )}

              {licensePhoto && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>License Photo: {licensePhoto.name.slice(0, 15)}</span>
                  <button onClick={() => setLicensePhoto(null)} className="ml-1 text-slate-400 hover:text-white font-bold">×</button>
                </div>
              )}

              {workshopPhoto && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Workshop Photo: {workshopPhoto.name.slice(0, 15)}</span>
                  <button onClick={() => setWorkshopPhoto(null)} className="ml-1 text-slate-400 hover:text-white font-bold">×</button>
                </div>
              )}
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={audioFileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setAudioFile(e.target.files[0]);
              setIsInputHubOpen(false);
            }}
          />

          <input
            ref={licenseInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setLicensePhoto(e.target.files[0]);
              setIsInputHubOpen(false);
            }}
          />

          <input
            ref={workshopInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setWorkshopPhoto(e.target.files[0]);
              setIsInputHubOpen(false);
            }}
          />

          {/* Interactive Floating Expandable Input Engine */}
          <div className="p-3 bg-[#0b0f17] border-t border-slate-800 relative">
            
            {/* Voice Recording Control Bar */}
            {isRecording ? (
              <div className="flex items-center justify-between bg-[#172030] border border-emerald-500/40 p-2.5 rounded text-xs animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="font-semibold text-emerald-400">Recording Voice Note</span>
                  <span className="font-mono text-slate-300 font-bold bg-[#0b0f17] px-2 py-0.5 rounded border border-slate-700">
                    {formatTimer(recordingTime)}
                  </span>
                  
                  {/* Equalizer Visualizer Bars */}
                  <div className="flex items-center gap-1 h-5">
                    <span className="w-1 bg-emerald-500 visualizer-bar"></span>
                    <span className="w-1 bg-emerald-500 visualizer-bar"></span>
                    <span className="w-1 bg-emerald-500 visualizer-bar"></span>
                    <span className="w-1 bg-emerald-500 visualizer-bar"></span>
                    <span className="w-1 bg-emerald-500 visualizer-bar"></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopRecording();
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors flex items-center gap-1.5"
                  >
                    <span>Attach Recording ✓</span>
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 relative"
              >
                {/* Floating Action Hub Toggle Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsInputHubOpen(!isInputHubOpen)}
                    title="Add input/attachment"
                    className={`p-2.5 rounded border transition-colors flex items-center justify-center ${
                      isInputHubOpen
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#172030] text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <svg className={`w-5 h-5 transition-transform ${isInputHubOpen ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>

                  {/* Expandable Popover Action Menu */}
                  {isInputHubOpen && (
                    <div className="absolute bottom-12 left-0 w-64 bg-[#172030] border border-slate-700 rounded-lg shadow-xl p-2 z-50 space-y-1 text-xs animate-slide-up">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                        Select Input Method
                      </div>

                      {/* Option 1: Record Voice */}
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-full text-left px-3 py-2 rounded hover:bg-[#0b0f17] text-slate-200 hover:text-emerald-400 flex items-center gap-2.5 font-medium transition-colors"
                      >
                        <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">🎙️</span>
                        <div>
                          <div className="font-semibold">Record Voice Note</div>
                          <div className="text-[10px] text-slate-400">Speak naturally in Amharic/Oromo/EN</div>
                        </div>
                      </button>

                      {/* Option 2: Upload Voice/Audio File */}
                      <button
                        type="button"
                        onClick={() => audioFileInputRef.current?.click()}
                        className="w-full text-left px-3 py-2 rounded hover:bg-[#0b0f17] text-slate-200 hover:text-emerald-400 flex items-center gap-2.5 font-medium transition-colors"
                      >
                        <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">📁</span>
                        <div>
                          <div className="font-semibold">Upload Voice / Audio File</div>
                          <div className="text-[10px] text-slate-400">Select .wav, .mp3, or .m4a audio file</div>
                        </div>
                      </button>

                      {/* Option 3: Upload License Photo */}
                      <button
                        type="button"
                        onClick={() => licenseInputRef.current?.click()}
                        className="w-full text-left px-3 py-2 rounded hover:bg-[#0b0f17] text-slate-200 hover:text-amber-400 flex items-center gap-2.5 font-medium transition-colors"
                      >
                        <span className="p-1 rounded bg-amber-500/10 text-amber-400">📄</span>
                        <div>
                          <div className="font-semibold">Upload Business License</div>
                          <div className="text-[10px] text-slate-400">Trade permit or TIN certificate image</div>
                        </div>
                      </button>

                      {/* Option 4: Upload Workshop Photo */}
                      <button
                        type="button"
                        onClick={() => workshopInputRef.current?.click()}
                        className="w-full text-left px-3 py-2 rounded hover:bg-[#0b0f17] text-slate-200 hover:text-amber-400 flex items-center gap-2.5 font-medium transition-colors"
                      >
                        <span className="p-1 rounded bg-amber-500/10 text-amber-400">🏭</span>
                        <div>
                          <div className="font-semibold">Upload Workshop / Premises</div>
                          <div className="text-[10px] text-slate-400">Facility or equipment photo</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary Text Message Input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    language === 'am'
                      ? 'ስለ ኩባንያዎ ይጻፉ ወይም ማያያዣዎችን ይጨምሩ...'
                      : language === 'om'
                      ? 'Dhaabbata keessan barreessaa ykn galmee dabalataa galchaa...'
                      : 'Type business message, sales numbers, or attach audio/photos...'
                  }
                  className="flex-1 bg-[#172030] border border-slate-700 rounded px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />

                {/* Submit Send Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>Send</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Console: Live Application Form Visibility & Audit Log */}
        <div className="lg:col-span-4 flex flex-col h-[calc(100vh-5.5rem)] gap-3 overflow-hidden">
          
          {/* Intake Progress Header */}
          <div className="bg-[#111723] p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-slate-200 font-semibold uppercase tracking-wider">{FORM_UI_I18N[language].liveFormHeader}</span>
              </div>
              <span className="font-bold text-blue-400">{progress}% {FORM_UI_I18N[language].complete}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{FORM_UI_I18N[language].autoFilledCount(Object.keys(flatEvidence).length)}</span>
              <span>{FORM_UI_I18N[language].fieldsNeededCount(gaps.length)}</span>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-800 pb-1.5 text-xs font-medium">
            <button
              onClick={() => setRightConsoleTab('form')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                rightConsoleTab === 'form'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{FORM_UI_I18N[language].tabLiveForm}</span>
            </button>

            <button
              onClick={() => setRightConsoleTab('evidence')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                rightConsoleTab === 'evidence'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{FORM_UI_I18N[language].tabAuditLog}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {Object.keys(flatEvidence).length}
              </span>
            </button>

            {sdgSuggestions.length > 0 && (
              <button
                onClick={() => setRightConsoleTab('sdgs')}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                  rightConsoleTab === 'sdgs'
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{FORM_UI_I18N[language].tabSdgs}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400">
                  {sdgSuggestions.length}
                </span>
              </button>
            )}
          </div>

          {/* Main Content Area */}
          <div className="bg-[#111723] p-4 rounded-lg border border-slate-800 flex-1 flex flex-col overflow-hidden">
            
            {/* TAB 1: LIVE APPLICATION FORM VIEW */}
            {rightConsoleTab === 'form' && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs relative">
                
                {/* Real-Time Extraction Toast Alert */}
                {liveExtractionToast && (
                  <div className="bg-emerald-600/90 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg shadow-xl border border-emerald-400/40 flex items-center justify-between animate-bounce">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                      <span>{liveExtractionToast.text}</span>
                    </div>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider font-mono">Real-time Auto Fill</span>
                  </div>
                )}

                {/* Form Field 1: Business Name & Legal Entity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      {FORM_UI_I18N[language].field1Label}
                    </label>
                    {(() => {
                      const e = flatEvidence['company_profile.company_name'] || flatEvidence['business.name'];
                      if (!e) return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{FORM_UI_I18N[language].badgeNeeded}</span>;
                      if (e.state === 'inferred') return <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">{FORM_UI_I18N[language].badgeAssumed}</span>;
                      return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{FORM_UI_I18N[language].badgeConfirmed}</span>;
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-400">{FORM_UI_I18N[language].field1Sub}</p>
                  <div
                    className={`p-3 rounded bg-[#172030] leading-relaxed font-mono min-h-[42px] transition-all duration-500 ${
                      recentlyExtractedKeys.has('company_profile.company_name') || recentlyExtractedKeys.has('business.name')
                        ? 'border-2 border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                        : 'border border-slate-700 text-slate-200'
                    }`}
                  >
                    {(recentlyExtractedKeys.has('company_profile.company_name') || recentlyExtractedKeys.has('business.name')) && (
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>✨ AUTO-FILLED IN REAL TIME</span>
                      </div>
                    )}
                    {flatEvidence['company_profile.company_name']?.value ||
                      flatEvidence['business.name']?.value || (
                        <span className="text-slate-500 italic font-sans text-xs">
                          {FORM_UI_I18N[language].field1Placeholder}
                        </span>
                      )}
                  </div>
                </div>

                {/* Form Field 2: Problem Statement */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 text-xs">{FORM_UI_I18N[language].field2Label}</label>
                    {(() => {
                      const e = flatEvidence['business.problem_addressed'] || flatEvidence['project.problem'] || flatEvidence['intervention_requested.problem_to_be_addressed'];
                      if (!e) return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{FORM_UI_I18N[language].badgeNeeded}</span>;
                      if (e.state === 'inferred') return <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">{FORM_UI_I18N[language].badgeAssumed}</span>;
                      return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{FORM_UI_I18N[language].badgeConfirmed}</span>;
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-400">{FORM_UI_I18N[language].field2Sub}</p>
                  <div
                    className={`p-3 rounded bg-[#172030] leading-relaxed min-h-[64px] transition-all duration-500 ${
                      recentlyExtractedKeys.has('business.problem_addressed') ||
                      recentlyExtractedKeys.has('project.problem') ||
                      recentlyExtractedKeys.has('intervention_requested.problem_to_be_addressed')
                        ? 'border-2 border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                        : 'border border-slate-700 text-slate-200'
                    }`}
                  >
                    {(recentlyExtractedKeys.has('business.problem_addressed') ||
                      recentlyExtractedKeys.has('project.problem') ||
                      recentlyExtractedKeys.has('intervention_requested.problem_to_be_addressed')) && (
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>✨ AUTO-FILLED IN REAL TIME</span>
                      </div>
                    )}
                    {flatEvidence['business.problem_addressed']?.value ||
                      flatEvidence['project.problem']?.value ||
                      flatEvidence['intervention_requested.problem_to_be_addressed']?.value || (
                        <span className="text-slate-500 italic text-xs">
                          {FORM_UI_I18N[language].field2Placeholder}
                        </span>
                      )}
                  </div>
                </div>

                {/* Form Field 3: Use of Funds */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 text-xs">{FORM_UI_I18N[language].field3Label}</label>
                    {(() => {
                      const e = flatEvidence['financials.use_of_funds'] || flatEvidence['funding.purpose'] || flatEvidence['intervention_requested.expected_results'];
                      if (!e) return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{FORM_UI_I18N[language].badgeNeeded}</span>;
                      if (e.state === 'inferred') return <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">{FORM_UI_I18N[language].badgeAssumed}</span>;
                      return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{FORM_UI_I18N[language].badgeConfirmed}</span>;
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-400">{FORM_UI_I18N[language].field3Sub}</p>
                  <div
                    className={`p-3 rounded bg-[#172030] leading-relaxed min-h-[64px] transition-all duration-500 ${
                      recentlyExtractedKeys.has('financials.use_of_funds') ||
                      recentlyExtractedKeys.has('funding.purpose') ||
                      recentlyExtractedKeys.has('intervention_requested.expected_results')
                        ? 'border-2 border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                        : 'border border-slate-700 text-slate-200'
                    }`}
                  >
                    {(recentlyExtractedKeys.has('financials.use_of_funds') ||
                      recentlyExtractedKeys.has('funding.purpose') ||
                      recentlyExtractedKeys.has('intervention_requested.expected_results')) && (
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>✨ AUTO-FILLED IN REAL TIME</span>
                      </div>
                    )}
                    {flatEvidence['financials.use_of_funds']?.value ||
                      flatEvidence['funding.purpose']?.value ||
                      flatEvidence['intervention_requested.expected_results']?.value || (
                        <span className="text-slate-500 italic text-xs">
                          {FORM_UI_I18N[language].field3Placeholder}
                        </span>
                      )}
                  </div>
                </div>

                {/* Form Field 4: Project Description & Impact */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 text-xs">{FORM_UI_I18N[language].field4Label}</label>
                    {(() => {
                      const e = flatEvidence['business.description'] || flatEvidence['company_profile.business_type'] || flatEvidence['company_overview.development_since_start'];
                      if (!e) return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{FORM_UI_I18N[language].badgeNeeded}</span>;
                      if (e.state === 'inferred') return <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">{FORM_UI_I18N[language].badgeAssumed}</span>;
                      return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{FORM_UI_I18N[language].badgeConfirmed}</span>;
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-400">{FORM_UI_I18N[language].field4Sub}</p>
                  <div
                    className={`p-3 rounded bg-[#172030] leading-relaxed min-h-[64px] transition-all duration-500 ${
                      recentlyExtractedKeys.has('business.description') ||
                      recentlyExtractedKeys.has('company_profile.business_type') ||
                      recentlyExtractedKeys.has('company_overview.development_since_start')
                        ? 'border-2 border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                        : 'border border-slate-700 text-slate-200'
                    }`}
                  >
                    {(recentlyExtractedKeys.has('business.description') ||
                      recentlyExtractedKeys.has('company_profile.business_type') ||
                      recentlyExtractedKeys.has('company_overview.development_since_start')) && (
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>✨ AUTO-FILLED IN REAL TIME</span>
                      </div>
                    )}
                    {flatEvidence['business.description']?.value ||
                      flatEvidence['company_profile.business_type']?.value ||
                      flatEvidence['company_overview.development_since_start']?.value || (
                        <span className="text-slate-500 italic text-xs">
                          {FORM_UI_I18N[language].field4Placeholder}
                        </span>
                      )}
                  </div>
                </div>

                {/* Form Field 5: Requested Amount & License */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300 text-[11px]">{FORM_UI_I18N[language].field5Label}</label>
                    <div
                      className={`p-2.5 rounded bg-[#172030] font-mono text-xs transition-all duration-500 ${
                        recentlyExtractedKeys.has('financials.requested_amount') || recentlyExtractedKeys.has('financials.funding_requested')
                          ? 'border-2 border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                          : 'border border-slate-700 text-slate-200'
                      }`}
                    >
                      {flatEvidence['financials.requested_amount']?.value ||
                        flatEvidence['financials.funding_requested']?.value ||
                        FORM_UI_I18N[language].field5NotSet}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300 text-[11px]">{FORM_UI_I18N[language].field6Label}</label>
                    <div
                      className={`p-2.5 rounded bg-[#172030] font-mono text-xs truncate transition-all duration-500 ${
                        recentlyExtractedKeys.has('company_profile.business_registration_number') || recentlyExtractedKeys.has('documents.business_license_uploaded')
                          ? 'border-2 border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                          : 'border border-slate-700 text-slate-200'
                      }`}
                    >
                      {flatEvidence['company_profile.business_registration_number']?.value ||
                        (licensePhoto ? FORM_UI_I18N[language].field6PhotoAttached : FORM_UI_I18N[language].field6Awaiting)}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: AUDIT PROVENANCE LOG */}
            {rightConsoleTab === 'evidence' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                {Object.keys(flatEvidence).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 italic text-xs">
                    {FORM_UI_I18N[language].auditEmpty}
                  </div>
                ) : (
                  Object.entries(flatEvidence).map(([key, item]: [string, any]) => (
                    <div key={key} className="p-2.5 rounded bg-[#172030] border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200 text-xs">
                          {key.split('.').pop()?.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                            item.state === 'document_supported'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.state === 'visually_observed'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : item.state === 'self_reported'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {item.state?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="text-slate-300 font-mono text-xs">
                        {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}
                        {item.isApproximate && <span className="text-amber-400 text-[10px] font-sans ml-1">(approx)</span>}
                      </div>

                      {item.notes && <div className="text-[10px] text-slate-400 italic">{item.notes}</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: SDG IMPACT PROTOCOL */}
            {rightConsoleTab === 'sdgs' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                {sdgSuggestions.map((s, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-[#172030] border border-slate-800 text-[11px] space-y-1">
                    <div className="font-semibold text-emerald-400 flex items-center justify-between">
                      <span>SDG {s.sdgId}: {s.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {s.alignmentStatus}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{s.reason}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* APPLICANT LOGIN & PROFILE MODAL */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111723] border border-blue-500/30 rounded-xl p-6 w-full max-w-md space-y-4 text-slate-100 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-blue-600/20 text-blue-400 text-lg">👤</span>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    {currentUser ? 'Update Applicant Profile' : 'Mandatory Applicant Registration'}
                    {!currentUser && (
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Required
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {currentUser
                      ? 'Update your details to sync application data in Supabase.'
                      : 'Register your applicant identity to start filling out your application and link your voice, text & photo submissions.'}
                  </p>
                </div>
              </div>
              {currentUser && (
                <button
                  onClick={() => setLoginModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={loginForm.name}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Abebe Bekele"
                  className="w-full bg-[#172030] border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Email Address or Phone *</label>
                <input
                  type="text"
                  required
                  value={loginForm.email || loginForm.phone}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value, phone: e.target.value }))}
                  placeholder="e.g. abebe@suntech.et or 0911234567"
                  className="w-full bg-[#172030] border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Enterprise / Business Name *</label>
                <input
                  type="text"
                  required
                  value={loginForm.businessName}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, businessName: e.target.value }))}
                  placeholder="e.g. SunTech Solar Solutions"
                  className="w-full bg-[#172030] border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2 justify-end">
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setLoginModalOpen(false)}
                    className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
                >
                  <span>Start Application & Save Profile</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}