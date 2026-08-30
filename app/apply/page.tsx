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

  // Initialize or restore session
  useEffect(() => {
    let existingSession = localStorage.getItem('fundflow_session_id');
    if (!existingSession) {
      existingSession = `web-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('fundflow_session_id', existingSession);
    }
    setSessionId(existingSession);

    // Initial greeting
    sendMessage('', existingSession, 'en', true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recording logic
  const startRecording = async () => {
    setIsInputHubOpen(false);
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

    const activeUserId = currentUser?.userId || 'web-applicant';

    const formData = new FormData();
    formData.append('userId', activeUserId);
    formData.append('sessionId', sessId || sessionId);
    if (text) formData.append('text', text);
    
    const curAudio = audioOverride !== undefined ? audioOverride : audioFile;
    if (curAudio) formData.append('audio', curAudio);

    const curLicense = licenseOverride !== undefined ? licenseOverride : licensePhoto;
    const curWorkshop = workshopOverride !== undefined ? workshopOverride : workshopPhoto;

    if (curLicense) formData.append('photos', curLicense);
    if (curWorkshop) formData.append('photos', curWorkshop);

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

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
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

      if (data.evidence) setFlatEvidence(data.evidence);
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
            ← Exit Intake
          </Link>
          <div className="h-4 w-px bg-slate-800"></div>
          <div>
            <h1 className="font-semibold text-white text-sm md:text-base flex items-center gap-2">
              FUNDflow Application Intake
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                SME Support Scheme
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
            <span className="text-slate-400 font-medium">Readiness:</span>
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
              <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                Processing intake input...
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
                <span className="text-slate-200 font-semibold uppercase tracking-wider">Live Application Form</span>
              </div>
              <span className="font-bold text-blue-400">{progress}% Complete</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{Object.keys(flatEvidence).length} fields auto-filled</span>
              <span>{gaps.length} fields needed</span>
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
              <span>📋 Live Form</span>
            </button>

            <button
              onClick={() => setRightConsoleTab('evidence')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                rightConsoleTab === 'evidence'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🛡️ Audit Log</span>
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
                <span>🌱 SDGs</span>
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
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                
                {/* Form Field 1: Business Name & Legal Entity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 text-xs">Business Legal Name & Location</label>
                    {(() => {
                      const e = flatEvidence['company_profile.company_name'] || flatEvidence['business.name'];
                      if (!e) return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">⏳ Needed</span>;
                      if (e.state === 'inferred') return <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">◈ Assumed</span>;
                      return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">✔ Confirmed</span>;
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-400">Official trade name, sector, and registered location.</p>
                  <div className="p-3 rounded bg-[#172030] border border-slate-700 min-h-[42px] text-slate-200 leading-relaxed font-mono">
                    {flatEvidence['company_profile.company_name']?.value ||
                      flatEvidence['business.name']?.value || (
                        <span className="text-slate-500 italic font-sans text-xs">
                          Awaiting business name from chat or document upload...
                        </span>
                      )}
                  </div>
                </div>

                {/* Form Field 2: Problem Statement */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 text-xs">What problem do you need help with?</label>
                    {(() => {
                      const e = flatEvidence['business.problem_addressed'] || flatEvidence['project.problem'] || flatEvidence['intervention_requested.problem_to_be_addressed'];
                      if (!e) return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">⏳ Needed</span>;
                      if (e.state === 'inferred') return <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">◈ Assumed</span>;
                      return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">✔ Confirmed</span>;
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-400">The need in your community or business that this project addresses.</p>
                  <div className="p-3 rounded bg-[#172030] border border-slate-700 min-h-[64px] text-slate-200 leading-relaxed">
                    {flatEvidence['business.problem_addressed']?.value ||
                      flatEvidence['project.problem']?.value || (
                        <span className="text-slate-500 italic text-xs">
                          Describe your business problem or talk to the assistant to auto-fill...
                        </span>
                      )}
                  </div>
                </div>

                {/* Form Field 3: Use of Funds */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 text-xs">What will the money be used for?</label>
                    {(() => {
                      const e = flatEvidence['financials.use_of_funds'] || flatEvidence['funding.purpose'] || flatEvidence['intervention_requested.expected_results'];
                      if (!e) return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">⏳ Needed</span>;
                      if (e.state === 'inferred') return <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">◈ Assumed</span>;
                      return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">✔ Confirmed</span>;
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-400">What you will buy, build, run or pay for (equipment, inventory, payroll).</p>
                  <div className="p-3 rounded bg-[#172030] border border-slate-700 min-h-[64px] text-slate-200 leading-relaxed">
                    {flatEvidence['financials.use_of_funds']?.value ||
                      flatEvidence['funding.purpose']?.value || (
                        <span className="text-slate-500 italic text-xs">
                          Be concrete — this is what the funding decision is made on.
                        </span>
                      )}
                  </div>
                </div>

                {/* Form Field 4: Project Description & Impact */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 text-xs">Project description & impact</label>
                    {(() => {
                      const e = flatEvidence['business.description'] || flatEvidence['company_profile.business_type'] || flatEvidence['company_overview.development_since_start'];
                      if (!e) return <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">⏳ Needed</span>;
                      if (e.state === 'inferred') return <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">◈ Assumed</span>;
                      return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">✔ Confirmed</span>;
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-400">What the project does and the impact it will have on beneficiaries.</p>
                  <div className="p-3 rounded bg-[#172030] border border-slate-700 min-h-[64px] text-slate-200 leading-relaxed">
                    {flatEvidence['business.description']?.value ||
                      flatEvidence['company_profile.business_type']?.value || (
                        <span className="text-slate-500 italic text-xs">
                          A few sentences on enterprise operations, employees, and community impact.
                        </span>
                      )}
                  </div>
                </div>

                {/* Form Field 5: Requested Amount & License */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300 text-[11px]">Funding Requested</label>
                    <div className="p-2.5 rounded bg-[#172030] border border-slate-700 text-slate-200 font-mono text-xs">
                      {flatEvidence['financials.requested_amount']?.value ||
                        flatEvidence['financials.funding_requested']?.value ||
                        'Not set'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300 text-[11px]">License / Registration</label>
                    <div className="p-2.5 rounded bg-[#172030] border border-slate-700 text-slate-200 font-mono text-xs truncate">
                      {flatEvidence['company_profile.business_registration_number']?.value ||
                        (licensePhoto ? 'License Photo Attached' : 'Awaiting Permit')}
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
                    No structured evidence extracted yet. Enter text, record voice, or upload audio/photos.
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111723] border border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <h3 className="font-bold text-sm text-white">Applicant Profile & Supabase Sync</h3>
                  <p className="text-[11px] text-slate-400">Identify who is filling out this application to link voice, text, & photo evidence in Supabase.</p>
                </div>
              </div>
              <button
                onClick={() => setLoginModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
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
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(false)}
                  className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Save Profile & Sync Supabase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}