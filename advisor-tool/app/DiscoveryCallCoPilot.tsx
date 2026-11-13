'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic, MicOff, MonitorSpeaker, Sparkles, CheckCircle2, Circle,
  ArrowRight, Save, Download, Calculator, AlertCircle, UserCheck,
  PhoneCall, FileText
} from 'lucide-react';

export interface DiscoveryExtractedData {
  clientName: string;
  currentAge: number;
  spouseAge: number | null;
  isMarried: boolean;
  retirementAge: number;
  currentEarnedIncome: number;
  iraBalance: number;
  rothBalance: number;
  liquidReserveNeed: number;
  desiredMonthlyIncome: number;
  monthlySocialSecurity: number;
  monthlyPensionFixed: number;
  biggestConcern: string;
  hasExistingAnnuity: boolean;
  notes: string;
}

interface DiscoveryCallCoPilotProps {
  initialData: {
    clientName: string;
    currentAge: number;
    retirementAge: number;
    filingStatus: 'mfj' | 'single';
    iraBalance: number;
    rothBalance: number;
    currentEarnedIncome: number;
    withdrawalNeed: number;
    socialSecurity: number;
    fixedIncome: number;
  };
  onSyncToBlueprint: (mapped: {
    clientName: string;
    currentAge: number;
    retirementAge: number;
    filingStatus: 'mfj' | 'single';
    iraBalance: number;
    rothBalance: number;
    currentEarnedIncome: number;
    withdrawalNeed: number;
    socialSecurity: number;
    fixedIncome: number;
  }) => void;
}

interface SavedTranscript {
  id: string;
  date: string;
  clientName: string;
  transcript: string;
  extracted: DiscoveryExtractedData;
}

const SCRIPT_STAGES = [
  { id: 1, title: '1. Open & Permission', subtitle: 'Confirm request & secure 10-minute window' },
  { id: 2, title: '2. Personal Situation & Timing', subtitle: 'Age, spouse, kids/legacy, work, retirement date' },
  { id: 3, title: '3. What Do They Want?', subtitle: 'Vision, top priority, one financial win (No pitching)' },
  { id: 4, title: '4. Assets & Current Strategy', subtitle: '401(k)/IRA totals, annuities, advisor vs. DIY' },
  { id: 5, title: '5. Debt & Obligations', subtitle: 'Mortgage, loans, or ongoing family obligations' },
  { id: 6, title: '6. Market Risk', subtitle: 'Early crash impact, down-market income, loss vs. upside' },
  { id: 7, title: '7. Define Safe (Conditional)', subtitle: 'ONLY if they bring up safety — define what safe means' },
  { id: 8, title: '8. Liquidity', subtitle: 'Emergency cash, upcoming big expenses, long-term bucket' },
  { id: 9, title: '9. Income & Predictability', subtitle: 'Monthly goal, SS/Pension, identify gap, lifetime income' },
  { id: 10, title: '10. Find the Real Gap', subtitle: 'Biggest concern & comfort if nothing changes' },
  { id: 11, title: '11. Summarize Their Own Words', subtitle: 'Auto-filled recap — wait for their "Yes"' },
  { id: 12, title: '12. Give Money Different Jobs', subtitle: 'Liquid, Growth, Protection, and Income buckets' },
  { id: 13, title: '13. Book Strategy Appointment', subtitle: '45–60 min Strategy Session with spouse' },
];

export default function DiscoveryCallCoPilot({
  initialData,
  onSyncToBlueprint,
}: DiscoveryCallCoPilotProps) {
  const [advisorName, setAdvisorName] = useState<string>('Advisor Name');
  const [activeStage, setActiveStage] = useState<number>(1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);

  const [rememberedRequest, setRememberedRequest] = useState<'yes' | 'no_memory'>('yes');
  const [isMarried, setIsMarried] = useState<boolean>(initialData.filingStatus === 'mfj');
  const [isWorking, setIsWorking] = useState<boolean>(true);
  const [broughtUpSafety, setBroughtUpSafety] = useState<boolean>(false);

  const [formData, setFormData] = useState<DiscoveryExtractedData>({
    clientName: initialData.clientName,
    currentAge: initialData.currentAge,
    spouseAge: initialData.currentAge - 2,
    isMarried: initialData.filingStatus === 'mfj',
    retirementAge: initialData.retirementAge,
    currentEarnedIncome: initialData.currentEarnedIncome,
    iraBalance: initialData.iraBalance,
    rothBalance: initialData.rothBalance,
    liquidReserveNeed: 75000,
    desiredMonthlyIncome: Math.round(initialData.withdrawalNeed / 12),
    monthlySocialSecurity: Math.round(initialData.socialSecurity / 12),
    monthlyPensionFixed: Math.round(initialData.fixedIncome / 12),
    biggestConcern: 'Outliving savings or losing money in a market crash right at retirement',
    hasExistingAnnuity: false,
    notes: '',
  });

  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isCapturingCrmTab, setIsCapturingCrmTab] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [crmNotes, setCrmNotes] = useState<string>('');
  const [copiedNotes, setCopiedNotes] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState<string>('');

  const firstName = formData.clientName.split('&')[0].trim() || 'there';
  const displayAdvisor = advisorName.trim() || 'Advisor Name';

  const [aiOverlay, setAiOverlay] = useState<{
    suggestedNextPrompt: string;
    coachingTip: string;
    branchDetected: string;
  }>({
    suggestedNextPrompt: `"Hey, ${firstName}, this is ${displayAdvisor}. You recently requested some information about retirement income strategies, so I wanted to follow up and see what you were looking for. Do you remember doing that?"`,
    coachingTip: 'Stage 1: Confirm they remember requesting info, then ask for 10 minutes.',
    branchDetected: 'Opening Call',
  });

  const [savedTranscripts, setSavedTranscripts] = useState<SavedTranscript[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef<boolean>(false);
  const crmStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const lastApiCallRef = useRef<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gfi_discovery_transcripts');
      if (raw) setSavedTranscripts(JSON.parse(raw));
    } catch {
      // ignore storage errors
    }
  }, []);

  const totalGuaranteedMonthly = (formData.monthlySocialSecurity || 0) + (formData.monthlyPensionFixed || 0);
  const monthlyIncomeGap = Math.max(0, (formData.desiredMonthlyIncome || 0) - totalGuaranteedMonthly);

  const toggleLiveCallCapture = async () => {
    if (isListeningMic) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      stopCrmTabTranscription();
    crmStreamRef.current?.getTracks().forEach((t) => t.stop());
      setIsListeningMic(false);
      setIsCapturingCrmTab(false);
      return;
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalChunk = '';
          let interimChunk = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalChunk += event.results[i][0].transcript + ' ';
            } else {
              interimChunk += event.results[i][0].transcript;
            }
          }
          if (finalChunk) {
            setTranscript((prev) => `${prev}\n[Call]: ${finalChunk.trim()}`);
          }
          setInterimText(interimChunk);
        };

        recognition.onerror = (event: any) => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            shouldKeepListeningRef.current = false;
            setIsListeningMic(false);
          }
        };

        recognition.onend = () => {
          if (shouldKeepListeningRef.current) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch {
                // ignore if already started
              }
            }, 150);
          }
        };

        shouldKeepListeningRef.current = true;
        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsListeningMic(true);
    } catch {
      setAiErrorMsg('Microphone permission is required for live call transcription.');
    }
  };

  
  const crmRecorderIntervalRef = useRef<any>(null);
  const crmAudioCtxRef = useRef<AudioContext | null>(null);

  const stopCrmTabTranscription = () => {
    if (crmRecorderIntervalRef.current) {
      clearInterval(crmRecorderIntervalRef.current);
      crmRecorderIntervalRef.current = null;
    }
    if (crmAudioCtxRef.current) {
      crmAudioCtxRef.current.close().catch(() => {});
      crmAudioCtxRef.current = null;
    }
  };

  const startCrmTabTranscription = async (stream: MediaStream) => {
    stopCrmTabTranscription();
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    const audioOnlyStream = new MediaStream(audioTracks);
    const audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }
    crmAudioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(audioOnlyStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    let peakVolume = 0;
    const volumeCheck = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      if (avg > peakVolume) peakVolume = avg;
    }, 150);

    const recordChunk = () => {
      if (!audioOnlyStream.active || audioTracks[0].readyState === 'ended') {
        clearInterval(volumeCheck);
        stopCrmTabTranscription();
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(audioOnlyStream, { mimeType });
      const chunks: BlobPart[] = [];
      const lastChunkPeak = peakVolume;
      peakVolume = 0;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (peakVolume < 0.5 && lastChunkPeak < 0.5) return;
        if (chunks.length === 0) return;

        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string)?.split(',')[1];
          if (!base64) return;
          try {
            const res = await fetch('/api/transcribe-crm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64, mimeType: 'audio/webm' }),
            });
            const data = await res.json();
            if (data.text && data.text.trim()) {
              setTranscript((prev) =>
                prev ? prev + '\n[Prospect]: ' + data.text.trim() : '[Prospect]: ' + data.text.trim()
              );
            }
          } catch (err) {
            console.error('CRM transcribe chunk error:', err);
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 3800);
    };

    recordChunk();
    crmRecorderIntervalRef.current = setInterval(recordChunk, 4000);
  };

  const connectCrmTabAudio = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Keep video track active so Chrome preserves tab audio stream

      if (displayStream.getAudioTracks().length === 0) {
        setAiErrorMsg('No tab audio detected. Select your CRM browser tab and check "Share tab audio".');
        return;
      }

      crmStreamRef.current = displayStream;
      startCrmTabTranscription(displayStream);
      setIsCapturingCrmTab(true);
    } catch {
      // User cancelled tab picker
    }
  };

  
  const instantExtractFromText = (text: string) => {
    const lower = text.toLowerCase();
    const parseMoney = (raw: string, suffix?: string) => {
      const num = parseFloat(raw.replace(/,/g, ""));
      if (isNaN(num)) return null;
      if (suffix && /m|million/i.test(suffix)) return Math.round(num * 1000000);
      if (suffix && /k|thousand/i.test(suffix)) return Math.round(num * 1000);
      return Math.round(num);
    };

    const ageMatch = lower.match(/(?:age|i am|he is|she is|client is|[a-z]+,)\s*(\d{2})(?:\b|\s*years?\s*old)/);
    const retireMatch = lower.match(/retire(?:\s+at|\s+around|\s+age)?\s*(\d{2})/);
    const iraMatch = lower.match(/\$?([\d,.]+)\s*(k|thousand|m|million)?\s*(?:in\s+(?:a|an|my|his|her|their)\s+)?(?:401k|401\(k\)|ira|saved|retirement)/);
    const rothMatch = lower.match(/\$?([\d,.]+)\s*(k|thousand|m|million)?\s*(?:in\s+(?:a|my)\s+)?roth/);
    const incomeMatch = lower.match(/(?:wants?|need|needs|looking for|goal of)\s*\$?([\d,.]+)\s*(k|thousand)?\s*(?:a\s+month|per\s+month|\/mo|monthly)/);
    const ssMatch = lower.match(/social\s+security[^\d$]{0,15}\$?([\d,.]+)\s*(k)?/);
    const pensionMatch = lower.match(/pension[^\d$]{0,15}\$?([\d,.]+)\s*(k)?/);
    const marriedMentioned = /\b(married|spouse|wife|husband)\b/.test(lower);

    setFormData((prev) => ({
      ...prev,
      currentAge: ageMatch ? Number(ageMatch[1]) : prev.currentAge,
      retirementAge: retireMatch ? Number(retireMatch[1]) : prev.retirementAge,
      iraBalance: iraMatch ? (parseMoney(iraMatch[1], iraMatch[2]) ?? prev.iraBalance) : prev.iraBalance,
      rothBalance: rothMatch ? (parseMoney(rothMatch[1], rothMatch[2]) ?? prev.rothBalance) : prev.rothBalance,
      desiredMonthlyIncome: incomeMatch ? (parseMoney(incomeMatch[1], incomeMatch[2]) ?? prev.desiredMonthlyIncome) : prev.desiredMonthlyIncome,
      monthlySocialSecurity: ssMatch ? (parseMoney(ssMatch[1], ssMatch[2]) ?? prev.monthlySocialSecurity) : prev.monthlySocialSecurity,
      monthlyPensionFixed: pensionMatch ? (parseMoney(pensionMatch[1], pensionMatch[2]) ?? prev.monthlyPensionFixed) : prev.monthlyPensionFixed,
      isMarried: marriedMentioned ? true : prev.isMarried,
    }));
    if (marriedMentioned) setIsMarried(true);
  };

  const runAiCoPilotAnalysis = async () => {
    if (!transcript.trim()) {
      setAiErrorMsg('Type or record a few words in the Live Call Transcript box first, then click AI Next Prompt & Extract.');
      return;
    }

    setAiErrorMsg('');
    instantExtractFromText(transcript);
    setIsAnalyzingAi(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/discovery-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          currentData: formData,
          advisorName: displayAdvisor,
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (data.rateLimited) { return; }
      if (!res.ok || data.error) {
        setAiErrorMsg(`API Error: ${data.error || res.statusText}`);
        return;
      }

      if (data.currentStage) setActiveStage(data.currentStage);
      if (data.safetyMentioned) setBroughtUpSafety(true);
      setAiOverlay({
        suggestedNextPrompt: data.suggestedNextPrompt || aiOverlay.suggestedNextPrompt,
        coachingTip: data.coachingTip || aiOverlay.coachingTip,
        branchDetected: data.branchDetected || 'Active Call',
      });

      if (data.extractedData) {
        const ext = data.extractedData;
        setFormData((prev) => ({
          ...prev,
          clientName: ext.clientName ?? prev.clientName,
          currentAge: ext.currentAge ?? prev.currentAge,
          spouseAge: ext.spouseAge ?? prev.spouseAge,
          isMarried: ext.isMarried ?? prev.isMarried,
          retirementAge: ext.retirementAge ?? prev.retirementAge,
          currentEarnedIncome: ext.currentEarnedIncome ?? prev.currentEarnedIncome,
          iraBalance: ext.iraBalance ?? prev.iraBalance,
          rothBalance: ext.rothBalance ?? prev.rothBalance,
          liquidReserveNeed: ext.liquidReserveNeed ?? prev.liquidReserveNeed,
          desiredMonthlyIncome: ext.desiredMonthlyIncome ?? prev.desiredMonthlyIncome,
          monthlySocialSecurity: ext.monthlySocialSecurity ?? prev.monthlySocialSecurity,
          monthlyPensionFixed: ext.monthlyPensionFixed ?? prev.monthlyPensionFixed,
          biggestConcern: ext.biggestConcern ?? prev.biggestConcern,
          hasExistingAnnuity: ext.currentAnnuity ?? prev.hasExistingAnnuity,
        }));
        if (typeof ext.isMarried === 'boolean') setIsMarried(ext.isMarried);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAiErrorMsg('Request timed out after 30 seconds. Check your GEMINI_API_KEY and network connection.');
      } else {
        setAiErrorMsg(`Network Error: ${err.message}`);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsAnalyzingAi(false);
    }
  };

  
  useEffect(() => {
    const trimmed = transcript.trim();
    if (!trimmed) return;
    instantExtractFromText(trimmed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const toggleStageComplete = (id: number) => {
    setCompletedStages((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSaveTranscript = () => {
    const newRecord: SavedTranscript = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      clientName: formData.clientName || 'Unnamed Prospect',
      transcript,
      extracted: formData,
    };
    const updated = [newRecord, ...savedTranscripts];
    setSavedTranscripts(updated);
    localStorage.setItem('gfi_discovery_transcripts', JSON.stringify(updated));
    setSaveSuccessMsg('Transcript & Client Discovery Profile saved!');
    setTimeout(() => setSaveSuccessMsg(''), 3500);
  };

  const handleDownloadTxt = () => {
    const content = `GFI RETIREMENT DISCOVERY CALL TRANSCRIPT & SUMMARY
Date: ${new Date().toLocaleString()}
Advisor: ${displayAdvisor}
Client: ${formData.clientName}
Age: ${formData.currentAge} | Married: ${isMarried ? `Yes (Spouse Age: ${formData.spouseAge || 'N/A'})` : 'No'}
Target Retirement Age: ${formData.retirementAge}
Household Earned Income: $${formData.currentEarnedIncome.toLocaleString()}/yr
Total Accumulated IRA/401(k): $${formData.iraBalance.toLocaleString()}
Existing Roth Balance: $${formData.rothBalance.toLocaleString()}
Liquid Cash Reserve Need: $${formData.liquidReserveNeed.toLocaleString()}
Desired Monthly Retirement Income: $${formData.desiredMonthlyIncome.toLocaleString()}/mo ($${(formData.desiredMonthlyIncome * 12).toLocaleString()}/yr)
Guaranteed Monthly Income (SS + Pension): $${totalGuaranteedMonthly.toLocaleString()}/mo
Monthly Income Gap to Fill: $${monthlyIncomeGap.toLocaleString()}/mo
Biggest Concern: ${formData.biggestConcern}

--- CALL TRANSCRIPT ---
${transcript || '(No transcript recorded)'}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.clientName.replace(/\s+/g, '_')}_Discovery_Call.txt`;
    a.click();
  };

  const handlePushToStrategySession = () => {
    onSyncToBlueprint({
      clientName: formData.clientName,
      currentAge: formData.currentAge,
      retirementAge: formData.retirementAge,
      filingStatus: isMarried ? 'mfj' : 'single',
      iraBalance: formData.iraBalance,
      rothBalance: formData.rothBalance,
      currentEarnedIncome: formData.currentEarnedIncome,
      withdrawalNeed: formData.desiredMonthlyIncome * 12,
      socialSecurity: formData.monthlySocialSecurity * 12,
      fixedIncome: formData.monthlyPensionFixed * 12,
    });
  };


  const handleCopyCrmNotes = async () => {
    if (!crmNotes.trim()) return;
    try {
      await navigator.clipboard.writeText(crmNotes);
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 2000);
    } catch {
      // fallback if clipboard permission denied
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-cyan-950 border border-indigo-500/50 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl">
              <PhoneCall className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Live Retirement Discovery Call Co-Pilot
                </h2>
                <span className="text-[11px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                  13-Stage Script Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Captures browser CRM audio + microphone, guides next question in real time, and auto-builds the Strategy Session.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] font-bold text-slate-400">Advisor:</span>
              <input
                type="text"
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value)}
                placeholder="Advisor Name"
                className="w-32 bg-transparent text-xs font-bold text-cyan-300 focus:outline-none"
              />
            </div>

            <button
              onClick={toggleLiveCallCapture}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                isListeningMic
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isListeningMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListeningMic ? 'Stop Mic Listening' : '1. Start Mic Capture'}
            </button>

            <button
              onClick={connectCrmTabAudio}
              className={`px-3.5 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                isCapturingCrmTab
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-cyan-500'
              }`}
            >
              <MonitorSpeaker className="w-4 h-4 text-cyan-400" />
              {isCapturingCrmTab ? 'CRM Tab Audio Connected' : '2. Capture CRM Browser Tab Audio'}
            </button>

            <button
              onClick={runAiCoPilotAnalysis}
              disabled={isAnalyzingAi}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-sm"
            >
              <Sparkles className={`w-4 h-4 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
              {isAnalyzingAi ? 'Analyzing Call...' : 'AI Next Prompt & Extract'}
            </button>
          </div>
        </div>

        {aiErrorMsg && (
          <div className="bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-between">
            <span>{aiErrorMsg}</span>
            <button onClick={() => setAiErrorMsg('')} className="text-rose-300 hover:text-white font-bold ml-4">Dismiss</button>
          </div>
        )}

        <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> AI Suggested Next Question / Response (Stage {activeStage} of 13)
            </span>
            <span className="text-[11px] bg-slate-900 border border-slate-700 text-cyan-300 px-2.5 py-0.5 rounded font-mono">
              Branch: {aiOverlay.branchDetected}
            </span>
          </div>
          <p className="text-base md:text-lg font-semibold text-white leading-relaxed">
            {activeStage === 1 && aiOverlay.branchDetected === 'Opening Call'
              ? `"Hey, ${firstName}, this is ${displayAdvisor}. You recently requested some information about retirement income strategies, so I wanted to follow up and see what you were looking for. Do you remember doing that?"`
              : aiOverlay.suggestedNextPrompt}
          </p>
          <p className="text-xs text-amber-200/90 flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span><b>Coaching Cue:</b> {aiOverlay.coachingTip}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 h-fit">
          <div className="text-xs font-black uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
            Discovery Call Roadmap
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <button
              onClick={() => setIsMarried(!isMarried)}
              className={`py-1.5 px-2 rounded border font-bold transition ${
                isMarried ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {isMarried ? 'Married: YES' : 'Single'}
            </button>
            <button
              onClick={() => setIsWorking(!isWorking)}
              className={`py-1.5 px-2 rounded border font-bold transition ${
                isWorking ? 'bg-sky-600/30 border-sky-500 text-sky-200' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {isWorking ? 'Working' : 'Retired'}
            </button>
            <button
              onClick={() => setBroughtUpSafety(!broughtUpSafety)}
              className={`py-1.5 px-2 rounded border font-bold transition ${
                broughtUpSafety ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {broughtUpSafety ? 'Safety: ON' : 'Safety: OFF'}
            </button>
          </div>

          <div className="space-y-1 max-h-[540px] overflow-y-auto pr-1">
            {SCRIPT_STAGES.map((stage) => {
              const isDone = completedStages.includes(stage.id);
              const isCurrent = activeStage === stage.id;
              const isConditionalHidden = stage.id === 7 && !broughtUpSafety;

              return (
                <div
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start gap-2.5 ${
                    isCurrent
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : isConditionalHidden
                      ? 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-60'
                      : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStageComplete(stage.id);
                    }}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-slate-600" />}
                  </button>
                  <div>
                    <div className="text-xs font-bold leading-tight">{stage.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{stage.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-black text-cyan-300 uppercase tracking-wide">
              {SCRIPT_STAGES.find((s) => s.id === activeStage)?.title}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveStage((s) => Math.max(1, s - 1))}
                className="px-2.5 py-1 rounded bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
              >
                Prev
              </button>
              <button
                onClick={() => {
                  if (!completedStages.includes(activeStage)) toggleStageComplete(activeStage);
                  setActiveStage((s) => Math.min(13, s + 1));
                }}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1"
              >
                Next Stage <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {activeStage === 1 && (
            <div className="space-y-4 text-sm text-slate-200 leading-relaxed">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <span className="text-xs font-bold text-cyan-400 uppercase">Opening Line:</span>
                <p className="font-medium text-white">
                  &ldquo;Hey, <b>{firstName}</b>, this is <b>{displayAdvisor}</b>. You recently requested some information about retirement income strategies, so I wanted to follow up and see what you were looking for. Do you remember doing that?&rdquo;
                </p>
              </div>

              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setRememberedRequest('yes')}
                  className={`flex-1 py-2 rounded font-bold border ${
                    rememberedRequest === 'yes' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  IF YES
                </button>
                <button
                  onClick={() => setRememberedRequest('no_memory')}
                  className={`flex-1 py-2 rounded font-bold border ${
                    rememberedRequest === 'no_memory' ? 'bg-amber-600/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  IF THEY DON&apos;T REMEMBER
                </button>
              </div>

              {rememberedRequest === 'yes' ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-3">
                  <p>&ldquo;Perfect. What was it that caught your attention?&rdquo; <span className="text-xs text-emerald-400 italic">(Let them talk.)</span></p>
                  <p>&ldquo;Gotcha. What I&apos;d like to do is ask you a few questions so I can understand what you&apos;re trying to accomplish and see if there&apos;s anything I can actually help with. Do you have about 10 minutes right now, or would it be better to set up a time?&rdquo;</p>
                </div>
              ) : (
                <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-lg space-y-3">
                  <p>&ldquo;No problem. Sometimes people don&apos;t remember the specific request. Before I let you go, are retirement income or protecting your retirement savings things you&apos;re currently thinking about?&rdquo;</p>
                  <p className="text-xs text-slate-300"><b>IF YES:</b> &ldquo;Okay, then it may still be worth having a quick conversation. Do you have about 10 minutes now, or would another time be better?&rdquo;</p>
                  <p className="text-xs text-rose-300"><b>IF NO:</b> &ldquo;Got it. I&apos;ll close this out on my end. Thanks for letting me know.&rdquo;</p>
                </div>
              )}
            </div>
          )}

          {activeStage === 2 && (
            <div className="space-y-3 text-sm text-slate-200 leading-relaxed">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <p>&ldquo;Before we get into the financial side, let me learn a little bit about you. Can I ask how old you are?&rdquo;</p>
                <p>&ldquo;Are you married?&rdquo;</p>
                {isMarried && (
                  <p className="text-indigo-300 font-semibold pl-3 border-l-2 border-indigo-500">
                    [IF MARRIED] &ldquo;How old is your spouse?&rdquo;
                  </p>
                )}
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <span className="text-xs font-bold text-cyan-400 uppercase">Family:</span>
                <p>&ldquo;Do you have any kids? Are they grown and on their own, or are you still helping any of them financially?&rdquo;</p>
                <p>&ldquo;Is leaving money behind to your kids or family important to you?&rdquo;</p>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <span className="text-xs font-bold text-cyan-400 uppercase">Work, Income &amp; Timing:</span>
                <p>&ldquo;Are you currently working or already retired? {isMarried ? 'Is your spouse still working or already retired?' : ''}&rdquo;</p>
                {isWorking && (
                  <p className="text-sky-300 pl-3 border-l-2 border-sky-500">
                    [IF WORKING] &ldquo;What do you do? {isMarried ? 'And what does your spouse do?' : ''} And roughly what&apos;s your total household income right now?&rdquo;
                  </p>
                )}
                <p>&ldquo;When would you ideally like to retire? Is that date pretty firm, or do you have some flexibility?&rdquo;</p>
              </div>
            </div>
          )}

          {activeStage === 3 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 text-sm text-slate-200 leading-relaxed">
              <p>&ldquo;Before we talk about any particular strategy, when you picture a successful retirement, what does that look like financially?&rdquo; <span className="text-xs text-amber-400 italic">(Listen.)</span></p>
              <p>&ldquo;What&apos;s most important to you about your money in retirement?&rdquo;</p>
              <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded">
                <b>IF THEY NEED HELP:</b> &ldquo;Would you say your bigger priorities are growth, protecting what you&apos;ve accumulated, creating income, maintaining access to your money, or some combination?&rdquo;
              </p>
              <p className="font-semibold text-emerald-300">&ldquo;If we could accomplish one thing for you financially that would make you feel better about retirement, what would that be?&rdquo;</p>
              <div className="text-xs font-bold text-rose-400 uppercase">Rule: Listen. Don&apos;t pitch.</div>
            </div>
          )}

          {activeStage === 4 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 text-sm text-slate-200 leading-relaxed">
              <p>&ldquo;What types of accounts have you accumulated for retirement? Things like 401(k)s, IRAs, brokerage accounts, savings, annuities, things like that?&rdquo;</p>
              <p>&ldquo;Roughly how much have you accumulated across those accounts?&rdquo;</p>
              <p>&ldquo;Is any of that currently in an annuity?&rdquo;</p>
              <p>&ldquo;Are you managing this yourself right now, or are you working with an advisor?&rdquo;</p>
              <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded">
                <b>IF WORKING WITH SOMEONE:</b> &ldquo;What do you like about what you&apos;re currently doing? Is there anything you wish was different?&rdquo;
              </p>
              <p>&ldquo;What are you currently doing with these accounts to accomplish what you want in retirement?&rdquo; <span className="text-xs text-amber-400 italic">(Pause. Let them talk.)</span></p>
            </div>
          )}

          {activeStage === 5 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 text-sm text-slate-200">
              <p>&ldquo;Do you expect to have any significant debt or ongoing financial obligations going into retirement?&rdquo;</p>
              <p className="text-xs text-slate-400">If needed, explore mortgage, auto/personal loans, or ongoing family obligations.</p>
            </div>
          )}

          {activeStage === 6 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 text-sm text-slate-200">
              <p>&ldquo;Let me ask you about risk. If the market dropped substantially right after you retired, how would that affect your plans?&rdquo; <span className="text-xs text-amber-400 italic">(Let them answer.)</span></p>
              <p>&ldquo;If the market were down and you still needed to take income, how would you feel about pulling money from that account?&rdquo;</p>
              <p className="font-semibold text-cyan-300">&ldquo;At this stage of your life, which concerns you more: missing some of the upside, or experiencing a major loss?&rdquo;</p>
            </div>
          )}

          {activeStage === 7 && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-lg space-y-3 text-sm text-slate-200">
              <span className="text-xs font-black uppercase text-emerald-400">Conditional Stage — Only If They Bring Up Safety</span>
              <p>&ldquo;You&apos;ve mentioned wanting some of your money safe. When you say &lsquo;safe,&rsquo; what does safe mean to you?&rdquo; <span className="text-xs text-amber-400 italic">(Let them define it.)</span></p>
              <p>&ldquo;Is protecting that portion of your retirement more important to you than maximizing every bit of potential upside?&rdquo;</p>
            </div>
          )}

          {activeStage === 8 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 text-sm text-slate-200">
              <p>&ldquo;Now let me ask about access to your money. How much do you feel you need to keep completely liquid and accessible?&rdquo;</p>
              <p>&ldquo;Do you anticipate any major purchases or expenses over the next several years?&rdquo; <span className="text-xs text-slate-400">(Major purchases, medical, travel, helping family, home repairs.)</span></p>
              <p>&ldquo;Outside of emergencies and those larger expenses, how much of your retirement savings could you realistically leave positioned for longer term needs?&rdquo;</p>
            </div>
          )}

          {activeStage === 9 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 text-sm text-slate-200">
              <p>&ldquo;Let&apos;s talk about income. About how much monthly income would you ideally like to have in retirement?&rdquo;</p>
              <p>&ldquo;How much of that do you expect Social Security, pensions, or other guaranteed sources to cover?&rdquo;</p>
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-lg">
                <span className="text-xs font-bold uppercase text-indigo-300">Auto-Calculated Monthly Income Gap:</span>
                <p className="font-semibold text-white mt-1">
                  &ldquo;So it sounds like you&apos;d have about a <span className="text-emerald-400 font-black">${monthlyIncomeGap.toLocaleString()}/mo</span> gap between the income you want (${formData.desiredMonthlyIncome.toLocaleString()}/mo) and what&apos;s already coming in (${totalGuaranteedMonthly.toLocaleString()}/mo). Is that about right?&rdquo;
                </p>
              </div>
              <p>&ldquo;Where do you expect the rest to come from? How do you picture creating that income from your savings once you&apos;re retired?&rdquo;</p>
              <p>&ldquo;How important is having a predictable amount coming in each month? How important is it to you that at least part of your retirement income can&apos;t be outlived?&rdquo;</p>
              <p className="font-semibold text-cyan-300">&ldquo;Is having that predictability more important to you than having every dollar positioned strictly for maximum growth?&rdquo; <span className="text-xs text-rose-400">(Listen. Don&apos;t sell yet.)</span></p>
            </div>
          )}

          {activeStage === 10 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 text-sm text-slate-200">
              <p className="font-semibold text-white">&ldquo;So after talking through all of this, what concerns you most about your current retirement strategy?&rdquo;</p>
              <p className="text-xs text-amber-400 italic">Stop talking. Let them answer.</p>
              <p>&ldquo;If nothing changed between now and retirement, how comfortable would you be with the plan you have today?&rdquo;</p>
            </div>
          )}

          {activeStage === 11 && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-lg space-y-2.5 text-sm text-slate-100">
              <span className="text-xs font-black uppercase text-emerald-400">Auto-Filled From Live Call Numbers:</span>
              <p>&ldquo;Okay, <b>{firstName}</b>, let me make sure I&apos;m understanding you correctly.&rdquo;</p>
              <ul className="space-y-1.5 pl-4 list-disc text-slate-200">
                <li>&ldquo;You&apos;d ideally like to retire around age <b>{formData.retirementAge}</b>.&rdquo;</li>
                <li>&ldquo;You&apos;d like roughly <b>${formData.desiredMonthlyIncome.toLocaleString()}</b> a month coming in.&rdquo;</li>
                <li>&ldquo;About <b>${totalGuaranteedMonthly.toLocaleString()}</b> of that should already be covered from Social Security, pensions, and other income.&rdquo;</li>
                <li>&ldquo;You&apos;ve accumulated approximately <b>${(formData.iraBalance + formData.rothBalance).toLocaleString()}</b> for retirement.&rdquo;</li>
                <li>&ldquo;You want to keep roughly <b>${formData.liquidReserveNeed.toLocaleString()}</b> liquid and accessible.&rdquo;</li>
                <li>&ldquo;You&apos;ve told me your biggest concern is <b>{formData.biggestConcern}</b>.&rdquo;</li>
                <li>&ldquo;And you&apos;d like predictable, reliable retirement income.&rdquo;</li>
              </ul>
              <p className="font-bold text-emerald-300 pt-1">&ldquo;Am I hearing you correctly?&rdquo; <span className="text-xs font-normal text-amber-300">(WAIT FOR YES)</span></p>
            </div>
          )}

          {activeStage === 12 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 text-sm text-slate-200">
              <p>&ldquo;Something I&apos;m hearing from you is that not all of this money necessarily needs to do the same job. Would you agree with that?&rdquo; <span className="text-xs text-amber-400 italic">(Let them answer.)</span></p>
              <p>&ldquo;That&apos;s how I tend to look at retirement money. Some may need to stay <b>liquid</b>. Some may be there for <b>growth</b>. Some may need <b>protection</b>. And some may be used to produce <b>income</b>.&rdquo;</p>
              <p className="font-semibold text-cyan-300">&ldquo;The question is how much, if any, belongs in each area based on what you just told me.&rdquo;</p>
            </div>
          )}

          {activeStage === 13 && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 text-sm text-slate-200">
              <p>&ldquo;I think I have a pretty good picture now of what you&apos;re trying to accomplish. Rather than throwing something at you off the top of my head, I&apos;d like to take what you&apos;ve given me, do some research, look at the options that may fit what you&apos;ve told me, and then come back and walk you through what I find.&rdquo;</p>
              <p>&ldquo;Let&apos;s set another time when we can go through everything together. Would <b>[Day/Time A]</b> or <b>[Day/Time B]</b> work better for you?&rdquo;</p>
              {isMarried && (
                <p className="text-indigo-300 font-semibold pl-3 border-l-2 border-indigo-500">
                  [IF MARRIED] &ldquo;And since this affects both of you, I&apos;d like your spouse to join us if possible so you both hear the same information and have a chance to ask questions. Would that work?&rdquo;
                </p>
              )}
              <p>&ldquo;Perfect. Let&apos;s plan on about 45 to 60 minutes so we&apos;re not rushed. I&apos;ll do my homework beforehand, and when we get together I&apos;ll walk you through what I found, how it relates to what you told me today, and then you can decide what makes sense to you.&rdquo;</p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" /> Live Call Transcript &amp; Notes
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveTranscript}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Save Transcript
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-300 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Export .TXT
                </button>
              </div>
            </div>
            <textarea
              rows={5}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Live speech-to-text appears here automatically during your CRM call, or paste/type call notes here and click 'AI Next Prompt & Extract'..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 leading-relaxed focus:border-cyan-500 focus:outline-none"
            />

            {/* Separate Advisor CRM Notes Box */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                  Advisor CRM Notes (Isolated from Live Transcript)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCrmNotes('')}
                    disabled={!crmNotes.trim()}
                    className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCrmNotes}
                    disabled={!crmNotes.trim()}
                    className="px-3 py-1 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 transition"
                  >
                    {copiedNotes ? 'Copied to Clipboard!' : 'Copy Notes for CRM'}
                  </button>
                </div>
              </div>
              <textarea
                rows={4}
                value={crmNotes}
                onChange={(e) => setCrmNotes(e.target.value)}
                placeholder="Type your private call notes, follow-up items, or CRM summary here without interrupting the live transcript..."
                className="w-full rounded-lg bg-slate-950/90 border border-slate-700/80 focus:border-amber-400 focus:outline-none p-3 text-sm text-slate-100 placeholder-slate-500 resize-y"
              />
            </div>
            {interimText && (
              <div className="text-[11px] text-cyan-400 italic">Hearing: {interimText}...</div>
            )}
            {saveSuccessMsg && (
              <div className="text-xs text-emerald-400 font-bold">{saveSuccessMsg}</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Calculator className="w-4 h-4" /> Extracted Strategy Numbers
            </span>
            <span className="text-[11px] text-slate-400">Auto-synced or editable</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2">
              <label className="text-slate-400 block mb-1">Client Name(s)</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Client Age</label>
              <input
                type="number"
                value={formData.currentAge}
                onChange={(e) => setFormData({ ...formData, currentAge: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Target Retirement Age</label>
              <input
                type="number"
                value={formData.retirementAge}
                onChange={(e) => setFormData({ ...formData, retirementAge: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-indigo-300 font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Pre-Tax IRA / 401(k)</label>
              <input
                type="number"
                step={5000}
                value={formData.iraBalance}
                onChange={(e) => setFormData({ ...formData, iraBalance: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Existing Roth IRA</label>
              <input
                type="number"
                step={1000}
                value={formData.rothBalance}
                onChange={(e) => setFormData({ ...formData, rothBalance: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-300 font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Household Income (/yr)</label>
              <input
                type="number"
                step={5000}
                value={formData.currentEarnedIncome}
                onChange={(e) => setFormData({ ...formData, currentEarnedIncome: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sky-300 font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Liquid Cash Reserve</label>
              <input
                type="number"
                step={5000}
                value={formData.liquidReserveNeed}
                onChange={(e) => setFormData({ ...formData, liquidReserveNeed: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-amber-300 font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Desired Income (/mo)</label>
              <input
                type="number"
                step={250}
                value={formData.desiredMonthlyIncome}
                onChange={(e) => setFormData({ ...formData, desiredMonthlyIncome: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-emerald-300 font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Social Security (/mo)</label>
              <input
                type="number"
                step={100}
                value={formData.monthlySocialSecurity}
                onChange={(e) => setFormData({ ...formData, monthlySocialSecurity: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Pension / Fixed (/mo)</label>
              <input
                type="number"
                step={100}
                value={formData.monthlyPensionFixed}
                onChange={(e) => setFormData({ ...formData, monthlyPensionFixed: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-bold"
              />
            </div>

            <div className="bg-slate-950 border border-rose-500/40 rounded p-2 flex flex-col justify-center">
              <span className="text-[10px] text-rose-400 uppercase font-bold">Monthly Income Gap</span>
              <span className="text-sm font-black text-white">${monthlyIncomeGap.toLocaleString()}/mo</span>
            </div>

            <div className="col-span-2">
              <label className="text-slate-400 block mb-1">Client&apos;s Biggest Stated Concern</label>
              <input
                type="text"
                value={formData.biggestConcern}
                onChange={(e) => setFormData({ ...formData, biggestConcern: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-amber-200 font-medium"
              />
            </div>
          </div>

          <button
            onClick={handlePushToStrategySession}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition"
          >
            <UserCheck className="w-4 h-4" />
            Build Strategy Session Blueprint
          </button>

          {savedTranscripts.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-[11px] font-bold uppercase text-slate-400">Saved Call Vault ({savedTranscripts.length})</div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {savedTranscripts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setFormData(item.extracted);
                      setTranscript(item.transcript);
                    }}
                    className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-indigo-500 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <span className="font-bold text-white truncate">{item.clientName}</span>
                    <span className="text-[10px] text-slate-400">{item.date.split(',')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}