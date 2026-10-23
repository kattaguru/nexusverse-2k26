import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { 
  QrCode, 
  Camera, 
  CameraOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  User, 
  Phone, 
  Mail, 
  Award, 
  Trophy, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Upload, 
  Copy, 
  Check, 
  Printer, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Users, 
  School, 
  Layers, 
  RotateCcw, 
  Zap, 
  Tag, 
  CheckSquare, 
  Square,
  HelpCircle,
  FlipHorizontal,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  FileCheck,
  Utensils,
  ShieldAlert,
  Filter,
  Download,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import { RegistrationRecord } from './TicketPass';
import { 
  computeDelegatesStats, 
  getRecordTeammates, 
  getRecordMemberCount, 
  getRecordLunchStats,
  getRecordCheckInStats,
  getRecordTrackAttendanceStats,
  RecordTrackAttendanceStats,
  flattenToIndividualParticipants,
  IndividualParticipant,
  RecordCheckInStats,
  DeskKey,
  DeskDefinition,
  SYMPOSIUM_DESKS,
  DEFAULT_DESK_TITLES,
  getRecordCertStats,
  getRecord5DeskSummary,
  get5DesksGlobalStats
} from '../utils/delegateStats';
import { EVENTS, SPOT_EVENT, ALL_EVENTS, SYMPOSIUM_CONFIG } from '../data/symposiumData';
import { sendTicketEmailApi } from '../services/api';

interface AdminTicketScannerProps {
  records: RegistrationRecord[];
  onUpdateRecord: (updated: RegistrationRecord) => void;
  onViewPass?: (record: RegistrationRecord) => void;
  onNavigateToRegistrations?: () => void;
  theme?: 'dark' | 'light';
}

export const AdminTicketScanner: React.FC<AdminTicketScannerProps> = ({
  records,
  onUpdateRecord,
  onViewPass,
  onNavigateToRegistrations,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // 5 Desk Station Scan Mode:
  // 'reception': Desk 1 · Reception & Kit Desk
  // 'tech':      Desk 2 · Technical Events Desk
  // 'lunch':     Desk 3 · Food & Lunch Token Desk
  // 'spot':      Desk 4 · Spot Events Pass Desk
  // 'cert':      Desk 5 · Certificates & Valedictory Desk
  const [scannerMode, setScannerMode] = useState<DeskKey>(() => {
    try {
      const saved = localStorage.getItem('nexusverse_scanner_desk_mode');
      if (saved && ['reception', 'tech', 'lunch', 'spot', 'cert'].includes(saved)) {
        return saved as DeskKey;
      }
    } catch (e) {}
    return 'reception';
  });

  const handleSelectScannerMode = (mode: DeskKey) => {
    setScannerMode(mode);
    setLunchAlert(null);
    setScanResultModal(null);
    try {
      localStorage.setItem('nexusverse_scanner_desk_mode', mode);
    } catch (e) {}
  };

  const [mainScannerTab, setMainScannerTab] = useState<'scanner' | 'attendees'>('scanner');
  const [attendeeFilter, setAttendeeFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [lunchAlert, setLunchAlert] = useState<{
    type: 'duplicate' | 'success' | 'info';
    message: string;
    delegateName?: string;
    delegateRoll?: string;
  } | null>(null);

  // Local reactive records to ensure immediate instant update reflection
  const [localRecords, setLocalRecords] = useState<RegistrationRecord[]>(records);
  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Synchronous local state committer that immediately reflects in UI and findRecord before network roundtrip
  const commitRecordUpdate = (updated: RegistrationRecord) => {
    setLocalRecords(prev => prev.map(r => r.regId === updated.regId ? updated : r));
    setActiveRecord(updated);
    onUpdateRecord(updated);
  };

  // Strict 1-Time QR Scan Result Popup Modal
  const [scanResultModal, setScanResultModal] = useState<{
    type: 'already_scanned' | 'not_registered' | 'success';
    scanTrack: 'Desk 1: Reception & Kit' | 'Desk 2: Technical Event' | 'Desk 3: Food Meal Token' | 'Desk 4: Spot Event' | 'Desk 5: Certificates & Valedictory' | string;
    deskNumber?: number;
    title: string;
    message: string;
    delegateName: string;
    delegateRoll: string;
    delegateRole?: string;
    teamName?: string;
    scannedAt?: string;
    eventName?: string;
    totalTeamCount?: number;
    attendedTeamCount?: number;
  } | null>(null);

  const scanResultModalRef = useRef(scanResultModal);
  useEffect(() => {
    scanResultModalRef.current = scanResultModal;
  }, [scanResultModal]);

  const lastScanAttemptRef = useRef<{ payload: string; time: number } | null>(null);

  // Auto-dismiss popup modal after 1.4 seconds to resume scanning snappy and automatically
  useEffect(() => {
    if (!scanResultModal) return;
    const timer = setTimeout(() => {
      setScanResultModal(null);
      lastScanAttemptRef.current = null;
    }, 1400);
    return () => clearTimeout(timer);
  }, [scanResultModal]);

  // Keyboard shortcut: Press Escape, Enter, or Space to dismiss popup modal and resume scanning
  useEffect(() => {
    if (!scanResultModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        setScanResultModal(null);
        lastScanAttemptRef.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scanResultModal]);

  // Active delegate loaded
  const [activeRecord, setActiveRecord] = useState<RegistrationRecord | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio feedback synthesizer
  const playBeep = (isSuccess = true) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Audio fallback
    }
  };

  // Warning buzzer synthesizer for duplicate meal claim
  const playBuzzer = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(140, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  // Sync activeRecord if localRecords array updates
  useEffect(() => {
    if (activeRecord) {
      const fresh = localRecords.find(r => r.regId === activeRecord.regId);
      if (fresh) {
        setActiveRecord(fresh);
        setNotesInput(fresh.checkInNotes || '');
      }
    }
  }, [localRecords]);

  // Start Camera with hardware autofocus and high frame rate
  const startCamera = async () => {
    setCameraError('');
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, min: 20 }
        },
        audio: false
      });

      try {
        const track = stream.getVideoTracks()[0];
        const capabilities = (track as any).getCapabilities?.();
        if (capabilities && capabilities.focusMode?.includes('continuous')) {
          await (track as any).applyConstraints({
            advanced: [{ focusMode: 'continuous' }]
          });
        }
      } catch (focusErr) {}

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        setIsScanning(true);
        startScanLoop();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera permissions in your browser or use manual search / photo upload.'
          : 'Could not activate camera. Please ensure no other application is using your camera.'
      );
      setIsScanning(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // Switch Camera facing mode
  const toggleCameraFacing = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  };

  useEffect(() => {
    if (isScanning) {
      startCamera();
    }
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Continuous ultra-fast frame analysis with native BarcodeDetector & downscaled jsQR
  const startScanLoop = () => {
    // 1. Prepare native hardware-accelerated BarcodeDetector if supported by browser/GPU
    let nativeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {}
    }

    let isDecoding = false;
    let lastScanTime = 0;

    const tick = async (now: number) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }

      // Check frame every 60ms for instantaneous QR acquisition without dropping camera preview fps
      if (now - lastScanTime > 60 && !isDecoding) {
        lastScanTime = now;

        // Prevent rapid duplicate scans within 800ms
        const lastScanTimeMs = lastScanAttemptRef.current ? lastScanAttemptRef.current.time : 0;
        if (Date.now() - lastScanTimeMs < 800) {
          scanLoopRef.current = requestAnimationFrame(tick);
          return;
        }

        isDecoding = true;
        try {
          // A. Ultra-fast hardware BarcodeDetector (Zero CPU load, runs on GPU/NPU in ~1ms)
          if (nativeDetector) {
            try {
              const barcodes = await nativeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleDecodePayload(barcodes[0].rawValue);
                isDecoding = false;
                scanLoopRef.current = requestAnimationFrame(tick);
                return;
              }
            } catch (detectorErr) {
              // Fall through to jsQR if detector encounters hardware frame lock
            }
          }

          // B. High-speed downscaled canvas decode with jsQR (max 480px downscale avoids 1080p lag)
          let canvas = canvasRef.current;
          if (!canvas) {
            canvas = document.createElement('canvas');
            canvasRef.current = canvas;
          }

          const maxDim = 480;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const scale = Math.min(1, maxDim / Math.max(vw, vh));
          const targetW = Math.max(200, Math.round(vw * scale));
          const targetH = Math.max(200, Math.round(vh * scale));

          // Only resize canvas when video dimensions change to prevent graphics pipeline stalls
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, targetW, targetH);
            const imageData = ctx.getImageData(0, 0, targetW, targetH);
            const code = jsQR(imageData.data, targetW, targetH, {
              inversionAttempts: 'dontInvert'
            });

            if (code && code.data) {
              handleDecodePayload(code.data);
            }
          }
        } catch (e) {
          // Frame read exception safeguard
        } finally {
          isDecoding = false;
        }
      }

      scanLoopRef.current = requestAnimationFrame(tick);
    };

    scanLoopRef.current = requestAnimationFrame(tick);
  };

  // Decode scanned payload with Strict 1-Time Scan Rule
  const handleDecodePayload = (payload: string) => {
    if (!payload || !payload.trim()) return;
    const clean = payload.trim();

    // Prevent duplicate rapid re-triggering of the same payload within 800ms
    const nowMs = Date.now();
    if (lastScanAttemptRef.current && lastScanAttemptRef.current.payload === clean && nowMs - lastScanAttemptRef.current.time < 800) {
      return;
    }
    lastScanAttemptRef.current = { payload: clean, time: nowMs };

    // Check if URL with passId, member index, or roll
    let targetId = clean;
    let targetMemberIndex: number | null = null;
    let targetMemberRoll: string | null = null;

    try {
      const urlString = (clean.startsWith('http://') || clean.startsWith('https://'))
        ? clean
        : (clean.includes('passId=') || clean.includes('regId=') || clean.includes('roll=') || clean.includes('/register') ? `https://${clean.replace(/^\/+/, '')}` : null);
      if (urlString) {
        const url = new URL(urlString);
        const passId = url.searchParams.get('passId') || url.searchParams.get('regId') || url.searchParams.get('id');
        if (passId) targetId = passId;
        const mParam = url.searchParams.get('member');
        if (mParam) {
          const parsedM = parseInt(mParam, 10);
          if (!isNaN(parsedM)) targetMemberIndex = parsedM;
        }
        const rParam = url.searchParams.get('roll');
        if (rParam) targetMemberRoll = rParam.trim().toLowerCase();
      }
    } catch (e) {}

    // Check if targetId has -M1, -M2 suffix (individual member pass code)
    const subMemberMatch = targetId.match(/-m(\d+)$/i);
    if (subMemberMatch) {
      targetMemberIndex = parseInt(subMemberMatch[1], 10);
      targetId = targetId.replace(/-m\d+$/i, '');
    }

    // Find record in local reactive records (also searches teammate rolls and names)
    const matched = findRecord(targetId) || (targetMemberRoll ? findRecord(targetMemberRoll) : undefined);

    if (matched) {
      // Trigger scan flash animation
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 400);

      const matchedTeammates = getRecordTeammates(matched);
      const matchedTotalMembers = 1 + matchedTeammates.length;
      const trackStats = getRecordTrackAttendanceStats(matched);
      const lunchStats = getRecordLunchStats(matched);

      // Determine which specific team member is being scanned (deterministically defaults to lead)
      let scannedMemberKey = 'lead';
      let scannedMemberName = matched.name;
      let scannedMemberRoll = matched.roll || matched.regId;
      let scannedMemberRole = matchedTotalMembers > 1 ? 'Lead (Member 1)' : 'Solo Delegate';

      if (targetMemberIndex !== null) {
        if (targetMemberIndex === 1) {
          scannedMemberKey = 'lead';
          scannedMemberRole = matchedTotalMembers > 1 ? 'Lead (Member 1)' : 'Solo Delegate';
        } else if (targetMemberIndex > 1 && targetMemberIndex <= matchedTotalMembers) {
          const tIdx = targetMemberIndex - 2;
          scannedMemberKey = `teammate_${tIdx}`;
          const tMember = matchedTeammates[tIdx];
          if (tMember) {
            scannedMemberName = tMember.name || `Member ${targetMemberIndex}`;
            scannedMemberRoll = tMember.roll || `M${targetMemberIndex}`;
            scannedMemberRole = `Member ${targetMemberIndex}`;
          }
        }
      } else if (targetMemberRoll) {
        if (matched.roll && matched.roll.toLowerCase() === targetMemberRoll) {
          scannedMemberKey = 'lead';
          scannedMemberRole = matchedTotalMembers > 1 ? 'Lead (Member 1)' : 'Solo Delegate';
        } else {
          const tIdx = matchedTeammates.findIndex(m => m.roll && m.roll.toLowerCase() === targetMemberRoll);
          if (tIdx >= 0) {
            scannedMemberKey = `teammate_${tIdx}`;
            const tMember = matchedTeammates[tIdx];
            scannedMemberName = tMember?.name || `Member ${tIdx + 2}`;
            scannedMemberRoll = tMember?.roll || `M${tIdx + 2}`;
            scannedMemberRole = `Member ${tIdx + 2}`;
          }
        }
      }

      // -------------------------------------------------------------
      // DESK 1: RECEPTION & KIT DESK (STRICT 1-TIME SCAN RULE)
      // -------------------------------------------------------------
      if (scannerMode === 'reception') {
        const currentCheckInStatus = { ...(matched.memberCheckInStatus || {}) };
        const currentCheckInTimes = { ...(matched.memberCheckInTimes || {}) };

        // Legacy fallback
        if (matched.checkedIn && Object.keys(currentCheckInStatus).length === 0) {
          currentCheckInStatus['lead'] = true;
          if (matched.checkInTime) currentCheckInTimes['lead'] = matched.checkInTime;
          matchedTeammates.forEach((_, i) => {
            currentCheckInStatus[`teammate_${i}`] = true;
            if (matched.checkInTime) currentCheckInTimes[`teammate_${i}`] = matched.checkInTime;
          });
        }

        // AUTO-ADVANCE FOR MULTI-MEMBER TEAMS:
        if (targetMemberIndex === null && !targetMemberRoll && Boolean(currentCheckInStatus['lead'])) {
          const nextUnscannedIdx = matchedTeammates.findIndex((_, idx) => !Boolean(currentCheckInStatus[`teammate_${idx}`]));
          if (nextUnscannedIdx >= 0) {
            scannedMemberKey = `teammate_${nextUnscannedIdx}`;
            const tMember = matchedTeammates[nextUnscannedIdx];
            scannedMemberName = tMember?.name || `Member ${nextUnscannedIdx + 2}`;
            scannedMemberRoll = tMember?.roll || `M${nextUnscannedIdx + 2}`;
            scannedMemberRole = `Member ${nextUnscannedIdx + 2}`;
          }
        }

        const isAlreadyScanned = Boolean(currentCheckInStatus[scannedMemberKey]);
        if (isAlreadyScanned) {
          playBuzzer();
          try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
          const existingTime = currentCheckInTimes[scannedMemberKey]
            ? new Date(currentCheckInTimes[scannedMemberKey]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : (matched.checkInTime ? new Date(matched.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today');

          const allScanned = ['lead', ...matchedTeammates.map((_, i) => `teammate_${i}`)].every(k => Boolean(currentCheckInStatus[k]));

          setScanResultModal({
            type: 'already_scanned',
            scanTrack: 'Desk 1: Reception & Kit',
            deskNumber: 1,
            title: allScanned && matchedTotalMembers > 1 ? 'ALL TEAM MEMBERS ALREADY CHECKED IN!' : 'ALREADY CHECKED IN! NO OTHER CHANCE.',
            message: allScanned && matchedTotalMembers > 1
              ? `All ${matchedTotalMembers} delegates for team "${matched.name}" have ALREADY been checked in at Desk 1 Reception.`
              : `This QR code has ALREADY been scanned and checked in for ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) at ${existingTime}. Duplicate check-in rejected! Each delegate can only be checked in ONCE.`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: existingTime,
            eventName: 'Desk 1: Reception & Welcome Kit'
          });
          setActiveRecord(matched);
        } else {
          playBeep(true);
          try {
            navigator.vibrate?.([80, 40, 80]);
            confetti({
              particleCount: 75,
              spread: 75,
              origin: { y: 0.6 },
              colors: ['#22c55e', '#4cc38a', '#ffffff', '#f2c14e']
            });
          } catch (e) {}

          const now = new Date().toISOString();
          currentCheckInStatus[scannedMemberKey] = true;
          currentCheckInTimes[scannedMemberKey] = now;

          const memberKeys = ['lead', ...matchedTeammates.map((_, i) => `teammate_${i}`)];
          const newCheckInCount = memberKeys.filter(k => Boolean(currentCheckInStatus[k])).length;

          const currentDeskScans = { ...(matched.deskScans || {}) };
          currentDeskScans['desk1_reception'] = {
            scanned: true,
            time: now,
            by: 'Reception Desk Scanner',
            memberStatus: currentCheckInStatus,
            memberTimes: currentCheckInTimes
          };

          const updated: RegistrationRecord = {
            ...matched,
            memberCheckInStatus: currentCheckInStatus,
            memberCheckInTimes: currentCheckInTimes,
            checkedIn: true,
            checkInTime: matched.checkInTime || now,
            checkedInBy: 'Reception Desk Scanner',
            kitIssued: true,
            deskScans: currentDeskScans
          };

          commitRecordUpdate(updated);

          setScanResultModal({
            type: 'success',
            scanTrack: 'Desk 1: Reception & Kit',
            deskNumber: 1,
            title: 'RECEPTION CHECK-IN VERIFIED (1-TIME LOGGED)',
            message: `1 Delegate Check-In Counted ✓: ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) verified at Desk 1 Reception & Welcome Kit Dispatched. [${newCheckInCount} of ${matchedTotalMembers} team delegates checked in].`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            eventName: 'Desk 1: Reception & Welcome Kit',
            totalTeamCount: matchedTotalMembers,
            attendedTeamCount: newCheckInCount
          });
        }
      }

      // -------------------------------------------------------------
      // DESK 2: TECHNICAL EVENT SCAN (STRICT 1-TIME SCAN RULE)
      // -------------------------------------------------------------
      else if (scannerMode === 'tech') {
        if (!trackStats.hasTech) {
          playBuzzer();
          try { navigator.vibrate?.([300, 150, 300]); } catch (e) {}
          setScanResultModal({
            type: 'not_registered',
            scanTrack: 'Desk 2: Technical Event',
            deskNumber: 2,
            title: 'NOT REGISTERED FOR TECHNICAL EVENT',
            message: `${scannedMemberName} (${scannedMemberRoll}) is NOT registered for any Technical Event. Only registered for: ${trackStats.hasSpot ? 'Spot Events' : 'None'}. Technical scan rejected.`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            eventName: 'Technical Event (Not Registered)'
          });
          setActiveRecord(matched);
          return;
        }

        const currentTechStatus = { ...(matched.memberTechStatus || {}) };
        const currentTechTimes = { ...(matched.memberTechTimes || {}) };

        // Legacy fallback
        if (matched.attendedEvents?.some(id => id !== 'spot' && id !== 'spot-pass') && Object.keys(currentTechStatus).length === 0) {
          currentTechStatus['lead'] = true;
          if (matched.checkInTime) currentTechTimes['lead'] = matched.checkInTime;
          matchedTeammates.forEach((_, i) => {
            currentTechStatus[`teammate_${i}`] = true;
            if (matched.checkInTime) currentTechTimes[`teammate_${i}`] = matched.checkInTime;
          });
        }

        // AUTO-ADVANCE FOR MULTI-MEMBER TEAMS:
        if (targetMemberIndex === null && !targetMemberRoll && Boolean(currentTechStatus['lead'])) {
          const nextUnscannedIdx = matchedTeammates.findIndex((_, idx) => !Boolean(currentTechStatus[`teammate_${idx}`]));
          if (nextUnscannedIdx >= 0) {
            scannedMemberKey = `teammate_${nextUnscannedIdx}`;
            const tMember = matchedTeammates[nextUnscannedIdx];
            scannedMemberName = tMember?.name || `Member ${nextUnscannedIdx + 2}`;
            scannedMemberRoll = tMember?.roll || `M${nextUnscannedIdx + 2}`;
            scannedMemberRole = `Member ${nextUnscannedIdx + 2}`;
          }
        }

        const isAlreadyScanned = Boolean(currentTechStatus[scannedMemberKey]);
        if (isAlreadyScanned) {
          // DUPLICATE SCAN ATTEMPT DETECTED!
          playBuzzer();
          try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
          const existingTime = currentTechTimes[scannedMemberKey]
            ? new Date(currentTechTimes[scannedMemberKey]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : (matched.checkInTime ? new Date(matched.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today');

          const allScanned = (['lead', ...matchedTeammates.map((_, i) => `teammate_${i}`)].every(k => Boolean(currentTechStatus[k])));

          setScanResultModal({
            type: 'already_scanned',
            scanTrack: 'Desk 2: Technical Event',
            deskNumber: 2,
            title: allScanned && matchedTotalMembers > 1 ? 'ALL TEAM MEMBERS ALREADY SCANNED!' : 'ALREADY SCANNED! NO OTHER CHANCE.',
            message: allScanned && matchedTotalMembers > 1
              ? `All ${matchedTotalMembers} delegates for team "${matched.name}" have ALREADY been verified and counted for Technical Events.`
              : `This QR code has ALREADY been scanned and counted for ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) at ${existingTime}. Duplicate entry is strictly rejected! Each delegate can only be scanned and counted ONCE.`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: existingTime,
            eventName: trackStats.techEventName
          });
          setActiveRecord(matched);
        } else {
          // VALID 1-TIME SCAN FOR THIS INDIVIDUAL DELEGATE
          playBeep(true);
          try {
            navigator.vibrate?.([80, 40, 80]);
            confetti({
              particleCount: 70,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#0088d4', '#4cc38a', '#ffffff', '#f2c14e']
            });
          } catch (e) {}

          const now = new Date().toISOString();
          currentTechStatus[scannedMemberKey] = true;
          currentTechTimes[scannedMemberKey] = now;

          // Also ensure general reception checkIn is marked
          const currentCheckInStatus = { ...(matched.memberCheckInStatus || {}) };
          const currentCheckInTimes = { ...(matched.memberCheckInTimes || {}) };
          currentCheckInStatus[scannedMemberKey] = true;
          currentCheckInTimes[scannedMemberKey] = now;

          const techEvents = (matched.eventIds || []).filter(id => id !== 'spot' && id !== 'spot-pass');
          const newAttended = Array.from(new Set([...(matched.attendedEvents || []), ...techEvents]));

          const memberKeys = ['lead', ...matchedTeammates.map((_, i) => `teammate_${i}`)];
          const newTechCount = memberKeys.filter(k => Boolean(currentTechStatus[k])).length;

          const currentDeskScans = { ...(matched.deskScans || {}) };
          currentDeskScans['desk2_tech'] = {
            scanned: true,
            time: now,
            by: 'Technical Desk Scanner',
            memberStatus: currentTechStatus,
            memberTimes: currentTechTimes
          };

          const updated: RegistrationRecord = {
            ...matched,
            memberTechStatus: currentTechStatus,
            memberTechTimes: currentTechTimes,
            memberCheckInStatus: currentCheckInStatus,
            memberCheckInTimes: currentCheckInTimes,
            checkedIn: true,
            checkInTime: matched.checkInTime || now,
            checkedInBy: 'Technical Desk Scanner',
            attendedEvents: newAttended,
            kitIssued: true,
            deskScans: currentDeskScans
          };

          commitRecordUpdate(updated);

          setScanResultModal({
            type: 'success',
            scanTrack: 'Desk 2: Technical Event',
            deskNumber: 2,
            title: 'TECHNICAL EVENT ENTRY VERIFIED (1-TIME COUNTED)',
            message: `1 Technical Delegate Attendance Counted ✓: ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) verified for ${trackStats.techEventName}. [${newTechCount} of ${matchedTotalMembers} team delegates counted].`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            eventName: trackStats.techEventName,
            totalTeamCount: matchedTotalMembers,
            attendedTeamCount: newTechCount
          });
        }
      }

      // -------------------------------------------------------------
      // DESK 3: FOOD & CATERING LUNCH TOKEN COUNTER
      // -------------------------------------------------------------
      else if (scannerMode === 'lunch') {
        const currentMemberStatus = { ...(matched.memberLunchStatus || {}) };
        if (matched.lunchCollected && Object.keys(currentMemberStatus).length === 0) {
          currentMemberStatus['lead'] = true;
          matchedTeammates.forEach((_, i) => { currentMemberStatus[`teammate_${i}`] = true; });
        }

        // AUTO-ADVANCE FOR MULTI-MEMBER TEAMS:
        if (targetMemberIndex === null && !targetMemberRoll && Boolean(currentMemberStatus['lead'])) {
          const nextUnscannedIdx = matchedTeammates.findIndex((_, idx) => !Boolean(currentMemberStatus[`teammate_${idx}`]));
          if (nextUnscannedIdx >= 0) {
            scannedMemberKey = `teammate_${nextUnscannedIdx}`;
            const tMember = matchedTeammates[nextUnscannedIdx];
            scannedMemberName = tMember?.name || `Member ${nextUnscannedIdx + 2}`;
            scannedMemberRoll = tMember?.roll || `M${nextUnscannedIdx + 2}`;
            scannedMemberRole = `Member ${nextUnscannedIdx + 2}`;
          }
        }

        const isAlreadyCollected = Boolean(currentMemberStatus[scannedMemberKey]);
        if (isAlreadyCollected) {
          playBuzzer();
          try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
          const claimTime = matched.lunchCollectedTime ? new Date(matched.lunchCollectedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today';

          const allCollected = (['lead', ...matchedTeammates.map((_, i) => `teammate_${i}`)].every(k => Boolean(currentMemberStatus[k])));

          setScanResultModal({
            type: 'already_scanned',
            scanTrack: 'Desk 3: Food Meal Token',
            deskNumber: 3,
            title: allCollected && matchedTotalMembers > 1 ? 'ALL TEAM MEALS ALREADY DISPENSED!' : 'ALREADY SCANNED! NO OTHER CHANCE.',
            message: allCollected && matchedTotalMembers > 1
              ? `All ${matchedTotalMembers} meal trays for team "${matched.name}" have ALREADY been dispensed. Duplicate meal rejected!`
              : `DUPLICATE MEAL CLAIM! Meal tray for ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) was already dispensed at ${claimTime}. Duplicate meal rejected!`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: claimTime,
            eventName: 'Desk 3: Food & Lunch Token'
          });
          setActiveRecord(matched);
        } else {
          playBeep(true);
          try {
            navigator.vibrate?.([80, 40, 80]);
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#22c55e', '#f59e0b', '#ffffff']
            });
          } catch (e) {}

          currentMemberStatus[scannedMemberKey] = true;
          const newDispensed = Object.values(currentMemberStatus).filter(Boolean).length;
          const allCollected = newDispensed >= matchedTotalMembers && matchedTotalMembers > 0;
          const now = new Date().toISOString();

          const currentDeskScans = { ...(matched.deskScans || {}) };
          currentDeskScans['desk3_lunch'] = {
            scanned: true,
            time: now,
            by: 'Catering Counter',
            memberStatus: currentMemberStatus,
            memberTimes: matched.lunchCollectedTime ? { lead: matched.lunchCollectedTime } : { lead: now }
          };

          const updated: RegistrationRecord = {
            ...matched,
            memberLunchStatus: currentMemberStatus,
            lunchCollectedCount: newDispensed,
            lunchCollected: allCollected,
            lunchCollectedTime: now,
            lunchCollectedBy: 'Catering Counter',
            deskScans: currentDeskScans
          };
          commitRecordUpdate(updated);

          setScanResultModal({
            type: 'success',
            scanTrack: 'Desk 3: Food Meal Token',
            deskNumber: 3,
            title: 'MEAL TRAY DISPENSED (1-TIME TOKEN USED)',
            message: `1 Meal Tray Dispensed ✓: Lunch token verified for ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}). [${newDispensed} of ${matchedTotalMembers} team meal trays collected].`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            eventName: 'Desk 3: Food & Lunch Token',
            totalTeamCount: matchedTotalMembers,
            attendedTeamCount: newDispensed
          });
        }
      }

      // -------------------------------------------------------------
      // DESK 4: SPOT EVENT SCAN (STRICT 1-TIME SCAN RULE)
      // -------------------------------------------------------------
      else if (scannerMode === 'spot') {
        if (!trackStats.hasSpot) {
          playBuzzer();
          try { navigator.vibrate?.([300, 150, 300]); } catch (e) {}
          setScanResultModal({
            type: 'not_registered',
            scanTrack: 'Desk 4: Spot Event',
            deskNumber: 4,
            title: 'NOT REGISTERED FOR SPOT EVENT',
            message: `${scannedMemberName} (${scannedMemberRoll}) is NOT registered for Spot Event Pass. Only registered for: ${trackStats.hasTech ? trackStats.techEventName : 'None'}. Spot scan rejected.`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            eventName: 'Spot Event Pass (Not Registered)'
          });
          setActiveRecord(matched);
          return;
        }

        const currentSpotStatus = { ...(matched.memberSpotStatus || {}) };
        const currentSpotTimes = { ...(matched.memberSpotTimes || {}) };

        // Legacy fallback
        if (matched.attendedEvents?.some(id => id === 'spot' || id === 'spot-pass') && Object.keys(currentSpotStatus).length === 0) {
          currentSpotStatus['lead'] = true;
          if (matched.checkInTime) currentSpotTimes['lead'] = matched.checkInTime;
          matchedTeammates.forEach((_, i) => {
            currentSpotStatus[`teammate_${i}`] = true;
            if (matched.checkInTime) currentSpotTimes[`teammate_${i}`] = matched.checkInTime;
          });
        }

        // AUTO-ADVANCE FOR MULTI-MEMBER TEAMS:
        if (targetMemberIndex === null && !targetMemberRoll && Boolean(currentSpotStatus['lead'])) {
          const nextUnscannedIdx = matchedTeammates.findIndex((_, idx) => !Boolean(currentSpotStatus[`teammate_${idx}`]));
          if (nextUnscannedIdx >= 0) {
            scannedMemberKey = `teammate_${nextUnscannedIdx}`;
            const tMember = matchedTeammates[nextUnscannedIdx];
            scannedMemberName = tMember?.name || `Member ${nextUnscannedIdx + 2}`;
            scannedMemberRoll = tMember?.roll || `M${nextUnscannedIdx + 2}`;
            scannedMemberRole = `Member ${nextUnscannedIdx + 2}`;
          }
        }

        const isAlreadyScanned = Boolean(currentSpotStatus[scannedMemberKey]);
        if (isAlreadyScanned) {
          playBuzzer();
          try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
          const existingTime = currentSpotTimes[scannedMemberKey]
            ? new Date(currentSpotTimes[scannedMemberKey]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : (matched.checkInTime ? new Date(matched.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today');

          const allScanned = (['lead', ...matchedTeammates.map((_, i) => `teammate_${i}`)].every(k => Boolean(currentSpotStatus[k])));

          setScanResultModal({
            type: 'already_scanned',
            scanTrack: 'Desk 4: Spot Event',
            deskNumber: 4,
            title: allScanned && matchedTotalMembers > 1 ? 'ALL TEAM MEMBERS ALREADY SCANNED!' : 'ALREADY SCANNED! NO OTHER CHANCE.',
            message: allScanned && matchedTotalMembers > 1
              ? `All ${matchedTotalMembers} delegates for team "${matched.name}" have ALREADY been verified and counted for Spot Events.`
              : `This QR code has ALREADY been scanned and counted for ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) at ${existingTime}. Duplicate entry is strictly rejected! Each delegate can only be scanned and counted ONCE.`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: existingTime,
            eventName: 'Spot Events Pass (Arena Activities)'
          });
          setActiveRecord(matched);
        } else {
          playBeep(true);
          try {
            navigator.vibrate?.([80, 40, 80]);
            confetti({
              particleCount: 70,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#8b5cf6', '#ec4899', '#ffffff', '#f2c14e']
            });
          } catch (e) {}

          const now = new Date().toISOString();
          currentSpotStatus[scannedMemberKey] = true;
          currentSpotTimes[scannedMemberKey] = now;

          const currentCheckInStatus = { ...(matched.memberCheckInStatus || {}) };
          const currentCheckInTimes = { ...(matched.memberCheckInTimes || {}) };
          currentCheckInStatus[scannedMemberKey] = true;
          currentCheckInTimes[scannedMemberKey] = now;

          const newAttended = Array.from(new Set([...(matched.attendedEvents || []), 'spot']));
          const memberKeys = ['lead', ...matchedTeammates.map((_, i) => `teammate_${i}`)];
          const newSpotCount = memberKeys.filter(k => Boolean(currentSpotStatus[k])).length;

          const currentDeskScans = { ...(matched.deskScans || {}) };
          currentDeskScans['desk4_spot'] = {
            scanned: true,
            time: now,
            by: 'Spot Desk Scanner',
            memberStatus: currentSpotStatus,
            memberTimes: currentSpotTimes
          };

          const updated: RegistrationRecord = {
            ...matched,
            memberSpotStatus: currentSpotStatus,
            memberSpotTimes: currentSpotTimes,
            memberCheckInStatus: currentCheckInStatus,
            memberCheckInTimes: currentCheckInTimes,
            checkedIn: true,
            checkInTime: matched.checkInTime || now,
            checkedInBy: 'Spot Desk Scanner',
            attendedEvents: newAttended,
            kitIssued: true,
            deskScans: currentDeskScans
          };

          commitRecordUpdate(updated);

          setScanResultModal({
            type: 'success',
            scanTrack: 'Desk 4: Spot Event',
            deskNumber: 4,
            title: 'SPOT EVENT ENTRY VERIFIED (1-TIME COUNTED)',
            message: `1 Spot Delegate Attendance Counted ✓: ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) verified for Track 2 Spot Events Pass. [${newSpotCount} of ${matchedTotalMembers} team delegates counted].`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            eventName: 'Spot Events Pass (Arena Activities)',
            totalTeamCount: matchedTotalMembers,
            attendedTeamCount: newSpotCount
          });
        }
      }

      // -------------------------------------------------------------
      // DESK 5: CERTIFICATES & VALEDICTORY (STRICT 1-TIME SCAN RULE)
      // -------------------------------------------------------------
      else if (scannerMode === 'cert') {
        const currentCertStatus = { ...(matched.memberCertStatus || {}) };
        const currentCertTimes = { ...(matched.memberCertTimes || {}) };

        // Legacy fallback
        if (matched.certificateIssued && Object.keys(currentCertStatus).length === 0) {
          currentCertStatus['lead'] = true;
          if (matched.certificateIssuedTime) currentCertTimes['lead'] = matched.certificateIssuedTime;
          matchedTeammates.forEach((_, i) => {
            currentCertStatus[`teammate_${i}`] = true;
            if (matched.certificateIssuedTime) currentCertTimes[`teammate_${i}`] = matched.certificateIssuedTime;
          });
        }

        // AUTO-ADVANCE FOR MULTI-MEMBER TEAMS:
        if (targetMemberIndex === null && !targetMemberRoll && Boolean(currentCertStatus['lead'])) {
          const nextUnscannedIdx = matchedTeammates.findIndex((_, idx) => !Boolean(currentCertStatus[`teammate_${idx}`]));
          if (nextUnscannedIdx >= 0) {
            scannedMemberKey = `teammate_${nextUnscannedIdx}`;
            const tMember = matchedTeammates[nextUnscannedIdx];
            scannedMemberName = tMember?.name || `Member ${nextUnscannedIdx + 2}`;
            scannedMemberRoll = tMember?.roll || `M${nextUnscannedIdx + 2}`;
            scannedMemberRole = `Member ${nextUnscannedIdx + 2}`;
          }
        }

        const isAlreadyIssued = Boolean(currentCertStatus[scannedMemberKey]);
        if (isAlreadyIssued) {
          playBuzzer();
          try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
          const existingTime = currentCertTimes[scannedMemberKey]
            ? new Date(currentCertTimes[scannedMemberKey]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : (matched.certificateIssuedTime ? new Date(matched.certificateIssuedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today');

          const allIssued = (['lead', ...matchedTeammates.map((_, i) => `teammate_${i}`)].every(k => Boolean(currentCertStatus[k])));

          setScanResultModal({
            type: 'already_scanned',
            scanTrack: 'Desk 5: Certificates & Valedictory',
            deskNumber: 5,
            title: allIssued && matchedTotalMembers > 1 ? 'ALL TEAM CERTIFICATES ALREADY ISSUED!' : 'CERTIFICATE ALREADY ISSUED! NO OTHER CHANCE.',
            message: allIssued && matchedTotalMembers > 1
              ? `All ${matchedTotalMembers} participation certificates for team "${matched.name}" have ALREADY been issued at Desk 5.`
              : `Certificate has ALREADY been issued for ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) at ${existingTime}. Duplicate certificate request is strictly rejected! Each delegate can only receive their certificate ONCE.`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: existingTime,
            eventName: 'Desk 5: Participation Certificate'
          });
          setActiveRecord(matched);
        } else {
          playBeep(true);
          try {
            navigator.vibrate?.([80, 40, 80]);
            confetti({
              particleCount: 75,
              spread: 75,
              origin: { y: 0.6 },
              colors: ['#ec4899', '#f43f5e', '#ffffff', '#f2c14e']
            });
          } catch (e) {}

          const now = new Date().toISOString();
          currentCertStatus[scannedMemberKey] = true;
          currentCertTimes[scannedMemberKey] = now;

          const memberKeys = ['lead', ...matchedTeammates.map((_, i) => `teammate_${i}`)];
          const newCertCount = memberKeys.filter(k => Boolean(currentCertStatus[k])).length;
          const allIssued = newCertCount >= matchedTotalMembers && matchedTotalMembers > 0;

          const currentDeskScans = { ...(matched.deskScans || {}) };
          currentDeskScans['desk5_cert'] = {
            scanned: true,
            time: now,
            by: 'Valedictory Desk Scanner',
            memberStatus: currentCertStatus,
            memberTimes: currentCertTimes
          };

          const updated: RegistrationRecord = {
            ...matched,
            memberCertStatus: currentCertStatus,
            memberCertTimes: currentCertTimes,
            certificateIssued: allIssued,
            certificateIssuedTime: now,
            certificateIssuedBy: 'Valedictory Desk Scanner',
            deskScans: currentDeskScans
          };

          commitRecordUpdate(updated);

          setScanResultModal({
            type: 'success',
            scanTrack: 'Desk 5: Certificates & Valedictory',
            deskNumber: 5,
            title: 'CERTIFICATE ISSUED & LOGGED (1-TIME)',
            message: `1 Participation Certificate Issued ✓: ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) issued at Desk 5 Certificates. [${newCertCount} of ${matchedTotalMembers} team certificates handed over].`,
            delegateName: scannedMemberName,
            delegateRoll: scannedMemberRoll,
            delegateRole: scannedMemberRole,
            teamName: matched.name,
            scannedAt: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            eventName: 'Desk 5: Participation Certificate',
            totalTeamCount: matchedTotalMembers,
            attendedTeamCount: newCertCount
          });
        }
      }

      setNotesInput(matched.checkInNotes || '');
    } else {
      playBeep(false);
      setCameraError(`No registration found matching scanned QR: "${targetId}".`);
      setScanResultModal(null);
    }
  };

  // Toggle individual member Technical attendance
  const handleToggleMemberTech = (targetRecord: RegistrationRecord, memberKey: string, forceStatus?: boolean) => {
    const currentTech = { ...(targetRecord.memberTechStatus || {}) };
    const currentTimes = { ...(targetRecord.memberTechTimes || {}) };
    const teammates = getRecordTeammates(targetRecord);
    const totalMembers = 1 + teammates.length;
    const trackStats = getRecordTrackAttendanceStats(targetRecord);

    let mName = targetRecord.name;
    let mRoll = targetRecord.roll || targetRecord.regId;
    let mRole = totalMembers > 1 ? 'Lead' : 'Delegate';
    if (memberKey !== 'lead') {
      const idx = parseInt(memberKey.replace('teammate_', ''), 10);
      const t = teammates[idx];
      if (t) {
        mName = t.name || `Member ${idx + 2}`;
        mRoll = t.roll || `M${idx + 2}`;
        mRole = `Member ${idx + 2}`;
      }
    }

    if (forceStatus === true && currentTech[memberKey]) {
      playBuzzer();
      try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
      setScanResultModal({
        type: 'already_scanned',
        scanTrack: 'Technical Event',
        title: 'ALREADY SCANNED! NO OTHER CHANCE.',
        message: `This QR code has ALREADY been scanned and counted for Technical Events. Duplicate entry is strictly rejected! Each QR code can only be scanned and counted ONCE.`,
        delegateName: mName,
        delegateRoll: mRoll,
        delegateRole: mRole,
        teamName: targetRecord.name,
        scannedAt: currentTimes[memberKey] ? new Date(currentTimes[memberKey]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today',
        eventName: trackStats.techEventName
      });
      return;
    }

    const nextState = forceStatus !== undefined ? forceStatus : !Boolean(currentTech[memberKey]);
    currentTech[memberKey] = nextState;
    const now = new Date().toISOString();
    if (nextState) {
      currentTimes[memberKey] = now;
      playBeep(true);
      try {
        navigator.vibrate?.([80, 40, 80]);
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0088d4', '#4cc38a', '#ffffff', '#f2c14e']
        });
      } catch (e) {}
    } else {
      delete currentTimes[memberKey];
    }
    const techEvents = (targetRecord.eventIds || []).filter(id => id !== 'spot' && id !== 'spot-pass');
    const updatedAttended = nextState
      ? Array.from(new Set([...(targetRecord.attendedEvents || []), ...techEvents]))
      : targetRecord.attendedEvents;

    const currentCheckInStatus = { ...(targetRecord.memberCheckInStatus || {}) };
    const currentCheckInTimes = { ...(targetRecord.memberCheckInTimes || {}) };
    if (nextState) {
      currentCheckInStatus[memberKey] = true;
      currentCheckInTimes[memberKey] = now;
    }

    const memberKeys = ['lead', ...teammates.map((_, i) => `teammate_${i}`)];
    const newTechCount = memberKeys.filter(k => Boolean(currentTech[k])).length;

    const updated: RegistrationRecord = {
      ...targetRecord,
      memberTechStatus: currentTech,
      memberTechTimes: currentTimes,
      memberCheckInStatus: currentCheckInStatus,
      memberCheckInTimes: currentCheckInTimes,
      checkedIn: nextState ? true : targetRecord.checkedIn,
      checkInTime: targetRecord.checkInTime || (nextState ? now : undefined),
      attendedEvents: updatedAttended
    };
    commitRecordUpdate(updated);

    if (nextState) {
      setScanResultModal({
        type: 'success',
        scanTrack: 'Technical Event',
        title: 'TECHNICAL EVENT ENTRY VERIFIED (1-TIME COUNTED)',
        message: `1 Technical Delegate Attendance Counted ✓: ${mName} (${mRoll} · ${mRole}) verified for ${trackStats.techEventName}. [${newTechCount} of ${totalMembers} team delegates counted].`,
        delegateName: mName,
        delegateRoll: mRoll,
        delegateRole: mRole,
        teamName: targetRecord.name,
        scannedAt: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        eventName: trackStats.techEventName,
        totalTeamCount: totalMembers,
        attendedTeamCount: newTechCount
      });
    }
  };

  // Toggle individual member Spot attendance
  const handleToggleMemberSpot = (targetRecord: RegistrationRecord, memberKey: string, forceStatus?: boolean) => {
    const currentSpot = { ...(targetRecord.memberSpotStatus || {}) };
    const currentTimes = { ...(targetRecord.memberSpotTimes || {}) };
    const teammates = getRecordTeammates(targetRecord);
    const totalMembers = 1 + teammates.length;

    let mName = targetRecord.name;
    let mRoll = targetRecord.roll || targetRecord.regId;
    let mRole = totalMembers > 1 ? 'Lead' : 'Delegate';
    if (memberKey !== 'lead') {
      const idx = parseInt(memberKey.replace('teammate_', ''), 10);
      const t = teammates[idx];
      if (t) {
        mName = t.name || `Member ${idx + 2}`;
        mRoll = t.roll || `M${idx + 2}`;
        mRole = `Member ${idx + 2}`;
      }
    }

    if (forceStatus === true && currentSpot[memberKey]) {
      playBuzzer();
      try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
      setScanResultModal({
        type: 'already_scanned',
        scanTrack: 'Spot Event',
        title: 'ALREADY SCANNED! NO OTHER CHANCE.',
        message: `This QR code has ALREADY been scanned and counted for Spot Events. Duplicate entry is strictly rejected! Each QR code can only be scanned and counted ONCE.`,
        delegateName: mName,
        delegateRoll: mRoll,
        delegateRole: mRole,
        teamName: targetRecord.name,
        scannedAt: currentTimes[memberKey] ? new Date(currentTimes[memberKey]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today',
        eventName: 'Spot Events Pass (Arena Activities)'
      });
      return;
    }

    const nextState = forceStatus !== undefined ? forceStatus : !Boolean(currentSpot[memberKey]);
    currentSpot[memberKey] = nextState;
    const now = new Date().toISOString();
    if (nextState) {
      currentTimes[memberKey] = now;
      playBeep(true);
      try {
        navigator.vibrate?.([80, 40, 80]);
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#ec4899', '#ffffff', '#f2c14e']
        });
      } catch (e) {}
    } else {
      delete currentTimes[memberKey];
    }
    const updatedAttended = nextState
      ? Array.from(new Set([...(targetRecord.attendedEvents || []), 'spot']))
      : targetRecord.attendedEvents;

    const currentCheckInStatus = { ...(targetRecord.memberCheckInStatus || {}) };
    const currentCheckInTimes = { ...(targetRecord.memberCheckInTimes || {}) };
    if (nextState) {
      currentCheckInStatus[memberKey] = true;
      currentCheckInTimes[memberKey] = now;
    }

    const memberKeys = ['lead', ...teammates.map((_, i) => `teammate_${i}`)];
    const newSpotCount = memberKeys.filter(k => Boolean(currentSpot[k])).length;

    const updated: RegistrationRecord = {
      ...targetRecord,
      memberSpotStatus: currentSpot,
      memberSpotTimes: currentTimes,
      memberCheckInStatus: currentCheckInStatus,
      memberCheckInTimes: currentCheckInTimes,
      checkedIn: nextState ? true : targetRecord.checkedIn,
      checkInTime: targetRecord.checkInTime || (nextState ? now : undefined),
      attendedEvents: updatedAttended
    };
    commitRecordUpdate(updated);

    if (nextState) {
      setScanResultModal({
        type: 'success',
        scanTrack: 'Desk 4: Spot Event',
        deskNumber: 4,
        title: 'SPOT EVENT ENTRY VERIFIED (1-TIME COUNTED)',
        message: `1 Spot Delegate Attendance Counted ✓: ${mName} (${mRoll} · ${mRole}) verified for Track 2 Spot Events Pass. [${newSpotCount} of ${totalMembers} team delegates counted].`,
        delegateName: mName,
        delegateRoll: mRoll,
        delegateRole: mRole,
        teamName: targetRecord.name,
        scannedAt: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        eventName: 'Spot Events Pass (Arena Activities)',
        totalTeamCount: totalMembers,
        attendedTeamCount: newSpotCount
      });
    }
  };

  // Toggle individual member Certificate issuance (Desk 5)
  const handleToggleMemberCert = (targetRecord: RegistrationRecord, memberKey: string, forceStatus?: boolean) => {
    const currentCert = { ...(targetRecord.memberCertStatus || {}) };
    const currentTimes = { ...(targetRecord.memberCertTimes || {}) };
    const teammates = getRecordTeammates(targetRecord);
    const totalMembers = 1 + teammates.length;

    let mName = targetRecord.name;
    let mRoll = targetRecord.roll || targetRecord.regId;
    let mRole = totalMembers > 1 ? 'Lead' : 'Delegate';
    if (memberKey !== 'lead') {
      const idx = parseInt(memberKey.replace('teammate_', ''), 10);
      const t = teammates[idx];
      if (t) {
        mName = t.name || `Member ${idx + 2}`;
        mRoll = t.roll || `M${idx + 2}`;
        mRole = `Member ${idx + 2}`;
      }
    }

    if (forceStatus === true && currentCert[memberKey]) {
      playBuzzer();
      try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
      setScanResultModal({
        type: 'already_scanned',
        scanTrack: 'Desk 5: Certificates & Valedictory',
        deskNumber: 5,
        title: 'ALREADY ISSUED CERTIFICATE! NO OTHER CHANCE.',
        message: `Certificate has ALREADY been issued for ${mName} (${mRoll} · ${mRole}). Duplicate certificate is strictly rejected! Each delegate can only receive their certificate ONCE.`,
        delegateName: mName,
        delegateRoll: mRoll,
        delegateRole: mRole,
        teamName: targetRecord.name,
        scannedAt: currentTimes[memberKey] ? new Date(currentTimes[memberKey]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today',
        eventName: 'Desk 5: Participation Certificate'
      });
      return;
    }

    const nextState = forceStatus !== undefined ? forceStatus : !Boolean(currentCert[memberKey]);
    currentCert[memberKey] = nextState;
    const now = new Date().toISOString();
    if (nextState) {
      currentTimes[memberKey] = now;
      playBeep(true);
      try {
        navigator.vibrate?.([80, 40, 80]);
        confetti({
          particleCount: 75,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#ec4899', '#f43f5e', '#ffffff', '#f2c14e']
        });
      } catch (e) {}
    } else {
      delete currentTimes[memberKey];
    }

    const memberKeys = ['lead', ...teammates.map((_, i) => `teammate_${i}`)];
    const newCertCount = memberKeys.filter(k => Boolean(currentCert[k])).length;
    const allIssued = newCertCount >= totalMembers && totalMembers > 0;

    const currentDeskScans = { ...(targetRecord.deskScans || {}) };
    currentDeskScans['desk5_cert'] = {
      scanned: newCertCount > 0,
      time: now,
      by: 'Valedictory Desk Operator',
      memberStatus: currentCert,
      memberTimes: currentTimes
    };

    const updated: RegistrationRecord = {
      ...targetRecord,
      memberCertStatus: currentCert,
      memberCertTimes: currentTimes,
      certificateIssued: allIssued,
      certificateIssuedTime: targetRecord.certificateIssuedTime || (nextState ? now : undefined),
      certificateIssuedBy: targetRecord.certificateIssuedBy || 'Valedictory Desk Operator',
      deskScans: currentDeskScans
    };
    commitRecordUpdate(updated);

    if (nextState) {
      setScanResultModal({
        type: 'success',
        scanTrack: 'Desk 5: Certificates & Valedictory',
        deskNumber: 5,
        title: 'CERTIFICATE ISSUED & LOGGED (1-TIME)',
        message: `1 Participation Certificate Issued ✓: ${mName} (${mRoll} · ${mRole}) issued at Desk 5 Certificates. [${newCertCount} of ${totalMembers} team certificates handed over].`,
        delegateName: mName,
        delegateRoll: mRoll,
        delegateRole: mRole,
        teamName: targetRecord.name,
        scannedAt: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        eventName: 'Desk 5: Participation Certificate',
        totalTeamCount: totalMembers,
        attendedTeamCount: newCertCount
      });
    }
  };

  // Issue certificates for all members of a team at once
  const handleIssueAllCerts = (targetRecord: RegistrationRecord) => {
    const teammates = getRecordTeammates(targetRecord);
    const totalMembers = 1 + teammates.length;
    const certs: Record<string, boolean> = { lead: true };
    const times: Record<string, string> = { ...(targetRecord.memberCertTimes || {}) };
    const now = new Date().toISOString();
    times['lead'] = times['lead'] || now;

    teammates.forEach((_, i) => {
      const k = `teammate_${i}`;
      certs[k] = true;
      times[k] = times[k] || now;
    });

    const currentDeskScans = { ...(targetRecord.deskScans || {}) };
    currentDeskScans['desk5_cert'] = {
      scanned: true,
      time: now,
      by: 'Valedictory Desk Operator',
      memberStatus: certs,
      memberTimes: times
    };

    const updated: RegistrationRecord = {
      ...targetRecord,
      memberCertStatus: certs,
      memberCertTimes: times,
      certificateIssued: true,
      certificateIssuedTime: targetRecord.certificateIssuedTime || now,
      certificateIssuedBy: 'Valedictory Desk Operator',
      deskScans: currentDeskScans
    };

    commitRecordUpdate(updated);
    playBeep(true);
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ec4899', '#f2c14e', '#ffffff']
      });
    } catch (e) {}
  };

  // Reset certificates for all members of a team
  const handleResetAllCerts = (targetRecord: RegistrationRecord) => {
    if (!confirm(`Reset certificate status for all delegates of ${targetRecord.name} (${targetRecord.regId})?`)) return;

    const currentDeskScans = { ...(targetRecord.deskScans || {}) };
    delete currentDeskScans['desk5_cert'];

    const updated: RegistrationRecord = {
      ...targetRecord,
      memberCertStatus: {},
      memberCertTimes: {},
      certificateIssued: false,
      certificateIssuedTime: undefined,
      certificateIssuedBy: undefined,
      deskScans: currentDeskScans
    };

    commitRecordUpdate(updated);
  };

  // Flexible record finder (checks regId, sub-member passes, lead roll/phone, and all teammate rolls/phones/names)
  const findRecord = (query: string): RegistrationRecord | undefined => {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    const cleanId = q.replace(/-m\d+$/i, '');

    return localRecords.find(r => {
      const regIdMatch = r.regId ? (
        r.regId.toLowerCase() === q || 
        r.regId.toLowerCase() === cleanId ||
        r.regId.toLowerCase().includes(q) || 
        q.includes(r.regId.toLowerCase())
      ) : false;
      const rollMatch = r.roll ? r.roll.toLowerCase() === q : false;
      const phoneMatch = r.phone ? r.phone.replace(/\D/g, '') === q.replace(/\D/g, '') : false;
      const emailMatch = r.email ? r.email.toLowerCase() === q : false;
      const nameMatch = r.name ? r.name.toLowerCase() === q : false;
      const paymentMatch = r.paymentId ? r.paymentId.toLowerCase() === q : false;

      // Also search through registered teammates
      const teammates = getRecordTeammates(r);
      const teammateRollMatch = teammates.some(m => m.roll && m.roll.toLowerCase() === q);
      const teammatePhoneMatch = teammates.some(m => m.phone && m.phone.replace(/\D/g, '') === q.replace(/\D/g, ''));
      const teammateNameMatch = teammates.some(m => m.name && m.name.toLowerCase() === q);

      return regIdMatch || rollMatch || phoneMatch || emailMatch || nameMatch || paymentMatch || teammateRollMatch || teammatePhoneMatch || teammateNameMatch;
    });
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data) {
            handleDecodePayload(code.data);
          } else {
            alert('Could not detect a valid ticket QR code in this image. Please ensure the QR is clear and well lit.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Toggle individual member check-in status (allows individual counting)
  const handleToggleMemberCheckIn = (targetRecord: RegistrationRecord, memberKey: string, forceStatus?: boolean) => {
    const currentStatus = { ...(targetRecord.memberCheckInStatus || {}) };
    const currentTimes = { ...(targetRecord.memberCheckInTimes || {}) };
    const teammates = getRecordTeammates(targetRecord);
    const memberKeys = ['lead', ...teammates.map((_, i) => `teammate_${i}`)];

    // Legacy backfill
    if (targetRecord.checkedIn && Object.keys(currentStatus).length === 0) {
      currentStatus['lead'] = true;
      teammates.forEach((_, i) => { currentStatus[`teammate_${i}`] = true; });
    }

    const nextStatus = forceStatus !== undefined ? forceStatus : !Boolean(currentStatus[memberKey]);
    currentStatus[memberKey] = nextStatus;
    const now = new Date().toISOString();
    if (nextStatus) {
      currentTimes[memberKey] = now;
      playBeep(true);
      try {
        navigator.vibrate?.([80, 40, 80]);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#4cc38a', '#22c55e', '#ffffff']
        });
      } catch (e) {}
    } else {
      delete currentTimes[memberKey];
    }

    const activeCount = memberKeys.filter(k => Boolean(currentStatus[k])).length;
    const anyCheckedIn = activeCount > 0;

    const updated: RegistrationRecord = {
      ...targetRecord,
      memberCheckInStatus: currentStatus,
      memberCheckInTimes: currentTimes,
      checkedIn: anyCheckedIn,
      checkInTime: anyCheckedIn ? (targetRecord.checkInTime || now) : undefined,
      checkedInBy: anyCheckedIn ? (targetRecord.checkedInBy || 'Reception Desk') : undefined,
      kitIssued: anyCheckedIn ? true : targetRecord.kitIssued
    };
    commitRecordUpdate(updated);
  };

  // Check In All Members of a team at once
  const handleCheckInAllMembers = (targetRecord: RegistrationRecord) => {
    const teammates = getRecordTeammates(targetRecord);
    const status: Record<string, boolean> = { lead: true };
    const times: Record<string, string> = { ...(targetRecord.memberCheckInTimes || {}) };
    const now = new Date().toISOString();
    times['lead'] = times['lead'] || now;

    teammates.forEach((_, i) => {
      const k = `teammate_${i}`;
      status[k] = true;
      times[k] = times[k] || now;
    });

    const defaultAttended = Array.from(new Set([...(targetRecord.attendedEvents || []), ...(targetRecord.eventIds || [])]));

    const updated: RegistrationRecord = {
      ...targetRecord,
      memberCheckInStatus: status,
      memberCheckInTimes: times,
      checkedIn: true,
      checkInTime: targetRecord.checkInTime || now,
      checkedInBy: 'Reception Desk',
      attendedEvents: defaultAttended,
      kitIssued: true,
      checkInNotes: notesInput.trim() || targetRecord.checkInNotes
    };

    commitRecordUpdate(updated);
    setJustCheckedIn(true);
    setTimeout(() => setJustCheckedIn(false), 3000);

    playBeep(true);
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#4cc38a', '#f2c14e', '#ffffff', '#0088d4']
      });
    } catch (e) {}
  };

  // Reset / Mark All Members Absent
  const handleResetAllMembers = (targetRecord: RegistrationRecord) => {
    if (!confirm(`Mark all delegates of ${targetRecord.name} (${targetRecord.regId}) as absent?`)) return;

    const updated: RegistrationRecord = {
      ...targetRecord,
      memberCheckInStatus: {},
      memberCheckInTimes: {},
      checkedIn: false,
      checkInTime: undefined,
      checkedInBy: undefined,
      attendedEvents: [],
      kitIssued: false
    };

    commitRecordUpdate(updated);
  };

  // Check-In Action
  const handleCheckIn = () => {
    if (!activeRecord) return;
    const teammates = getRecordTeammates(activeRecord);
    if (teammates.length > 0) {
      handleCheckInAllMembers(activeRecord);
    } else {
      handleToggleMemberCheckIn(activeRecord, 'lead', true);
    }
  };

  // Undo Check-In
  const handleUndoCheckIn = () => {
    if (!activeRecord) return;
    handleResetAllMembers(activeRecord);
  };

  // Export Individual Attendance CSV (All, Present, or Absent)
  const handleExportIndividualAttendanceCsv = (filterType: 'all' | 'present' | 'absent') => {
    const list = flattenToIndividualParticipants(records).filter(p => {
      if (filterType === 'present') return p.isCheckedIn;
      if (filterType === 'absent') return !p.isCheckedIn;
      return true;
    });

    const headers = [
      'S.No',
      'Pass ID / Reg ID',
      'Member Pass Code',
      'Delegate Name',
      'Roll Number',
      'Team Role',
      'Team Name',
      'Overall Attendance',
      'Check-In Time',
      'Technical Event Registered',
      'Technical Event Name',
      'Technical Track Attendance',
      'Technical Scan Time',
      'Spot Event Registered',
      'Spot Track Attendance',
      'Spot Scan Time',
      'Mobile Phone',
      'Email',
      'Department / Branch',
      'Year',
      'Section',
      'Degree / Class',
      'College',
      'IEEE Member',
      'IEEE ID',
      'Payment Mode',
      'Payment Verified',
      'Total Paid',
      'Lunch Meal Tray Status'
    ];

    const rows = list.map((p, idx) => [
      idx + 1,
      `"${p.regId}"`,
      `"${p.passCode}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.roll}"`,
      `"${p.role}"`,
      `"${(p.teamName || 'Solo').replace(/"/g, '""')}"`,
      `"${p.isCheckedIn ? 'PRESENT' : 'ABSENT'}"`,
      `"${p.checkInTime ? new Date(p.checkInTime).toLocaleString() : 'N/A'}"`,
      `"${p.isTechRegistered ? 'YES' : 'NO'}"`,
      `"${p.techEventName || 'N/A'}"`,
      `"${p.isTechAttended ? 'ATTENDED' : 'NOT ATTENDED'}"`,
      `"${p.techAttendedTime ? new Date(p.techAttendedTime).toLocaleString() : 'N/A'}"`,
      `"${p.isSpotRegistered ? 'YES' : 'NO'}"`,
      `"${p.isSpotAttended ? 'ATTENDED' : 'NOT ATTENDED'}"`,
      `"${p.spotAttendedTime ? new Date(p.spotAttendedTime).toLocaleString() : 'N/A'}"`,
      `"${p.phone}"`,
      `"${p.email}"`,
      `"${p.dept}"`,
      `"${p.year}"`,
      `"${p.section}"`,
      `"${p.className}"`,
      `"${(p.college || '').replace(/"/g, '""')}"`,
      `"${p.isIeeeMember ? 'YES' : 'NO'}"`,
      `"${p.ieeeId || ''}"`,
      `"${p.paymentMode || 'UPI'}"`,
      `"${p.isVerified ? 'VERIFIED' : 'PENDING'}"`,
      `"${p.totalPaid}"`,
      `"${p.isLunchCollected ? 'DISPENSED' : 'PENDING'}"`
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NexusVerse_Attendance_${filterType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Toggle individual event attendance
  const handleToggleEventAttendance = (eventId: string) => {
    if (!activeRecord) return;

    const current = activeRecord.attendedEvents || [];
    const isAttended = current.includes(eventId);
    const updatedAttended = isAttended
      ? current.filter(id => id !== eventId)
      : [...current, eventId];

    const updated: RegistrationRecord = {
      ...activeRecord,
      attendedEvents: updatedAttended,
      // If any event attended, mark overall checkedIn if not already
      checkedIn: updatedAttended.length > 0 ? true : activeRecord.checkedIn,
      checkInTime: updatedAttended.length > 0 && !activeRecord.checkInTime ? new Date().toISOString() : activeRecord.checkInTime
    };

    commitRecordUpdate(updated);
  };

  // Toggle Kit & Badge Issued
  const handleToggleKit = () => {
    if (!activeRecord) return;
    const updated: RegistrationRecord = {
      ...activeRecord,
      kitIssued: !activeRecord.kitIssued
    };
    commitRecordUpdate(updated);
  };

  // Toggle Individual Member Food / Lunch Token (Anti-Dispute Check)
  const handleToggleMemberLunch = (memberKey: string, forceState?: boolean) => {
    if (!activeRecord) return;
    const teammates = getRecordTeammates(activeRecord);
    const totalMembers = 1 + teammates.length;
    const currentMap = { ...(activeRecord.memberLunchStatus || {}) };

    // If older record was marked lunchCollected but had empty map, initialize all
    if (activeRecord.lunchCollected && Object.keys(currentMap).length === 0) {
      currentMap['lead'] = true;
      teammates.forEach((_, i) => { currentMap[`teammate_${i}`] = true; });
    }

    const currentState = Boolean(currentMap[memberKey]);
    const nextState = forceState !== undefined ? forceState : !currentState;
    currentMap[memberKey] = nextState;

    const collectedCount = Object.values(currentMap).filter(Boolean).length;
    const allCollected = collectedCount >= totalMembers && totalMembers > 0;
    const now = new Date().toISOString();

    const updated: RegistrationRecord = {
      ...activeRecord,
      memberLunchStatus: currentMap,
      lunchCollectedCount: collectedCount,
      lunchCollected: allCollected,
      lunchCollectedTime: nextState ? now : activeRecord.lunchCollectedTime,
      lunchCollectedBy: nextState ? 'Admin Desk' : activeRecord.lunchCollectedBy
    };

    commitRecordUpdate(updated);

    // Get display name of member
    let memberName = activeRecord.name;
    let memberRole = totalMembers > 1 ? 'Lead' : 'Delegate';
    let memberRoll = activeRecord.roll;
    if (memberKey.startsWith('teammate_')) {
      const idx = parseInt(memberKey.replace('teammate_', ''), 10);
      const tm = teammates[idx];
      if (tm) {
        memberName = tm.name || `Member ${idx + 2}`;
        memberRole = `Member ${idx + 2}`;
        memberRoll = tm.roll;
      }
    }

    if (nextState) {
      playBeep(true);
      setLunchAlert({
        type: 'success',
        message: `1 Meal Tray Dispensed ✓: Lunch token redeemed for ${memberName} (${memberRole}). [${collectedCount} of ${totalMembers} team meal trays dispensed].`,
        delegateName: memberName,
        delegateRoll: memberRoll
      });
    } else {
      setLunchAlert({
        type: 'info',
        message: `Lunch token reset to unredeemed for ${memberName} (${memberRole}). [${collectedCount} of ${totalMembers} team meal trays dispensed].`,
        delegateName: memberName,
        delegateRoll: memberRoll
      });
    }
  };

  // Dispense All Meal Trays for Team
  const handleDispenseAllLunch = () => {
    if (!activeRecord) return;
    const teammates = getRecordTeammates(activeRecord);
    const totalMembers = 1 + teammates.length;
    const newMap: Record<string, boolean> = { lead: true };
    teammates.forEach((_, i) => { newMap[`teammate_${i}`] = true; });
    const now = new Date().toISOString();

    const updated: RegistrationRecord = {
      ...activeRecord,
      memberLunchStatus: newMap,
      lunchCollectedCount: totalMembers,
      lunchCollected: true,
      lunchCollectedTime: now,
      lunchCollectedBy: 'Admin Desk'
    };

    commitRecordUpdate(updated);
    playBeep(true);
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#f59e0b', '#ffffff']
      });
    } catch (e) {}

    setLunchAlert({
      type: 'success',
      message: `All ${totalMembers} Meal Trays Dispensed ✓: Full lunch allocation redeemed for team "${activeRecord.name}".`,
      delegateName: activeRecord.name,
      delegateRoll: activeRecord.roll
    });
  };

  // Reset All Lunch Tokens
  const handleResetLunch = () => {
    if (!activeRecord) return;
    const teammates = getRecordTeammates(activeRecord);
    const newMap: Record<string, boolean> = { lead: false };
    teammates.forEach((_, i) => { newMap[`teammate_${i}`] = false; });

    const updated: RegistrationRecord = {
      ...activeRecord,
      memberLunchStatus: newMap,
      lunchCollectedCount: 0,
      lunchCollected: false,
      lunchCollectedTime: undefined,
      lunchCollectedBy: undefined
    };

    commitRecordUpdate(updated);
    setLunchAlert({
      type: 'info',
      message: `Lunch tokens reset to 0 redeemed for team "${activeRecord.name}".`,
      delegateName: activeRecord.name,
      delegateRoll: activeRecord.roll
    });
  };

  const handleToggleLunch = () => {
    if (!activeRecord) return;
    if (activeRecord.lunchCollected) {
      handleResetLunch();
    } else {
      handleDispenseAllLunch();
    }
  };

  // Verify Payment on Spot (for UPI)
  const handleVerifyPayment = () => {
    if (!activeRecord) return;
    const updated: RegistrationRecord = {
      ...activeRecord,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Desk Admin'
    };
    commitRecordUpdate(updated);
    if (updated.email) {
      sendTicketEmailApi(updated).catch(e => console.warn('Desk verify auto email notice:', e));
    }
  };

  // On-Spot Upgrade: Add Spot Events Pass (+₹100)
  const handleAddSpotPassOnSpot = () => {
    if (!activeRecord) return;
    if ((activeRecord.eventIds || []).includes('spot')) return;

    const spotBase = 100;
    const spotGst = Math.round((spotBase * (SYMPOSIUM_CONFIG.gstPercent || 2)) / 100);
    const spotTotal = spotBase + spotGst;

    if (!confirm(`Add Spot Events Pass (₹${spotTotal} incl. 2% GST) to ${activeRecord.name}'s registration?`)) return;

    const updatedEventIds = [...(activeRecord.eventIds || []), 'spot'];
    const updatedAttended = [...(activeRecord.attendedEvents || []), 'spot'];
    const updated: RegistrationRecord = {
      ...activeRecord,
      eventIds: updatedEventIds,
      subtotal: (activeRecord.subtotal || (activeRecord.totalPaid ? Math.round(activeRecord.totalPaid / 1.02) : 0)) + spotBase,
      gstAmount: (activeRecord.gstAmount || (activeRecord.totalPaid ? activeRecord.totalPaid - Math.round(activeRecord.totalPaid / 1.02) : 0)) + spotGst,
      totalPaid: (activeRecord.totalPaid || 0) + spotTotal,
      attendedEvents: updatedAttended
    };

    commitRecordUpdate(updated);
  };

  // Save Desk Notes
  const handleSaveNotes = () => {
    if (!activeRecord) return;
    const updated: RegistrationRecord = {
      ...activeRecord,
      checkInNotes: notesInput.trim()
    };
    commitRecordUpdate(updated);
    alert('Desk notes updated successfully.');
  };

  // Reset to scan next
  const handleResetForNext = () => {
    setActiveRecord(null);
    setSearchQuery('');
    setNotesInput('');
    setCameraError('');
  };

  // Search filter list
  const searchResults = searchQuery.trim().length > 1
    ? localRecords.filter(r => {
        const q = searchQuery.trim().toLowerCase();
        return (
          (r.regId && r.regId.toLowerCase().includes(q)) ||
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.roll && r.roll.toLowerCase().includes(q)) ||
          (r.phone && r.phone.includes(q)) ||
          (r.email && r.email.toLowerCase().includes(q))
        );
      }).slice(0, 6)
    : [];

  // Metrics
  const scannerStats = computeDelegatesStats(records);
  const totalDelegates = scannerStats.totalDelegates;
  const totalRegistrations = scannerStats.totalRegistrations;
  const checkedInDelegates = scannerStats.checkedInDelegates;
  const checkedInCount = scannerStats.checkedInRegistrations;
  const checkInPercent = totalDelegates > 0 ? Math.round((checkedInDelegates / totalDelegates) * 100) : 0;
  const techAttendedCount = scannerStats.techAttendedDelegates;
  const totalTechDelegates = scannerStats.totalTechDelegates;
  const spotAttendedCount = scannerStats.spotAttendedDelegates;
  const totalSpotDelegates = scannerStats.totalSpotDelegates;
  const kitsIssuedCount = records.filter(r => r.kitIssued).length;
  const lunchCollectedCount = scannerStats.totalLunchMealsDispensed;
  const lunchPercent = totalDelegates > 0 ? Math.round((lunchCollectedCount / totalDelegates) * 100) : 0;

  // Recent checked in delegates (last 8)
  const recentCheckedIn = records
    .filter(r => r.checkedIn && r.checkInTime)
    .sort((a, b) => new Date(b.checkInTime || 0).getTime() - new Date(a.checkInTime || 0).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-lg ${
        isLight
          ? 'bg-gradient-to-r from-[#eef5fc] via-[#f4f7fb] to-[#e8eff8] border-[#c0d6ea] text-[#1c1811]'
          : 'bg-gradient-to-r from-[#141d2c] via-[#0d1624] to-[#0a0f18] border-[#234259] text-white'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg border ${
                isLight ? 'bg-[#0088d4]/10 text-[#006ca8] border-[#0088d4]/20' : 'bg-[#0088d4]/20 text-[#70baff] border-[#0088d4]/30'
              }`}>
                <QrCode className="w-5 h-5 text-[#0088d4]" />
              </span>
              <h3 className={`font-serif-title text-xl sm:text-2xl font-bold tracking-tight ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                Entry Ticket Scanner & Delegate Check-In
              </h3>
            </div>
            <p className={`text-xs ${isLight ? 'text-[#3e556e]' : 'text-[#9fc7e8]'}`}>
              Scan entry ticket QR codes from delegate phones or paper passes. Strict 1-time scanning for Technical vs Spot tracks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto shrink-0 w-full sm:w-auto">
            {onNavigateToRegistrations && (
              <button
                type="button"
                onClick={onNavigateToRegistrations}
                className={`flex-1 sm:flex-initial px-3 py-2.5 sm:py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer ${
                  isLight
                    ? 'bg-white text-[#705600] border-[#d4a935]/40 hover:bg-[#fff9e6]'
                    : 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935]/50 hover:bg-[#2b220d]'
                }`}
                title="Switch to All Registrations & Participant Details Page"
              >
                <Users className="w-3.5 h-3.5 text-[#f2c14e]" />
                <span className="sm:hidden font-bold">Records Page</span>
                <span className="hidden sm:inline">All Registrations Page</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 sm:p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                soundEnabled
                  ? isLight
                    ? 'bg-white text-[#006ca8] border-[#c0d6ea] hover:bg-[#e4effa]'
                    : 'bg-[#1b2a38] text-[#70baff] border-[#0088d4]/40 hover:bg-[#203649]'
                  : isLight
                    ? 'bg-white text-[#6b6250] border-[#d8d0ba] hover:text-[#1c1811]'
                    : 'bg-[#121217] text-[#a79f8b] border-[#2e2b22] hover:text-white'
              }`}
              title={soundEnabled ? 'Sound alerts enabled' : 'Sound alerts muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#0088d4]" /> : <VolumeX className="w-4 h-4" />}
              <span className="inline sm:inline">{soundEnabled ? 'Chime' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={isScanning ? stopCamera : startCamera}
              className={`flex-1 sm:flex-initial px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                isScanning
                  ? 'bg-[#ef4444]/20 text-[#ff8a80] border-[#ef4444]/40 hover:bg-[#ef4444]/30'
                  : 'bg-gradient-to-r from-[#d4a935] to-[#f2c14e] text-[#121217] border-transparent hover:scale-[1.02] shadow-[#f2c14e]/20'
              }`}
            >
              {isScanning ? (
                <>
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Cam</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-[#121217]" />
                  <span>Start Camera</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5-Desk Station Mode Switcher */}
        <div className={`mt-4 pt-4 border-t flex flex-col gap-2.5 ${
          isLight ? 'border-[#c0d6ea]' : 'border-[#234259]/60'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-[#3e556e]' : 'text-[#9fc7e8]'}`}>
              <Tag className="w-3.5 h-3.5 text-[#f2c14e]" />
              <span>Select Scan Desk Station (Strict 1-Time QR Limit):</span>
            </span>
            <div className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
              {scannerMode === 'reception' ? (
                <span className="text-[#22c55e] font-semibold flex items-center gap-1.5 bg-[#22c55e]/10 border border-[#22c55e]/30 px-2 py-0.5 rounded-md">
                  <UserCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Desk 1: Reception Active · 1-Time Scan</span>
                </span>
              ) : scannerMode === 'tech' ? (
                <span className="text-[#0088d4] font-semibold flex items-center gap-1.5 bg-[#0088d4]/10 border border-[#0088d4]/30 px-2 py-0.5 rounded-md">
                  <Zap className="w-3.5 h-3.5 text-[#0088d4]" />
                  <span>Desk 2: Technical Active · 1-Time Scan</span>
                </span>
              ) : scannerMode === 'lunch' ? (
                <span className="text-[#f59e0b] font-semibold flex items-center gap-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-2 py-0.5 rounded-md">
                  <Utensils className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span>Desk 3: Food & Lunch Active · Token Dispenser</span>
                </span>
              ) : scannerMode === 'spot' ? (
                <span className="text-[#a78bfa] font-semibold flex items-center gap-1.5 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 px-2 py-0.5 rounded-md">
                  <Sparkles className="w-3.5 h-3.5 text-[#a78bfa]" />
                  <span>Desk 4: Spot Events Active · 1-Time Scan</span>
                </span>
              ) : (
                <span className="text-[#ec4899] font-semibold flex items-center gap-1.5 bg-[#ec4899]/10 border border-[#ec4899]/30 px-2 py-0.5 rounded-md">
                  <Award className="w-3.5 h-3.5 text-[#ec4899]" />
                  <span>Desk 5: Certificates Active · 1-Time Handover</span>
                </span>
              )}
            </div>
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-5 gap-2 w-full p-1.5 rounded-2xl border shadow-inner ${
            isLight ? 'bg-white border-[#c0d6ea]' : 'bg-[#09111c] border-[#1b3447]'
          }`}>
            {/* Desk 1: Reception & Kit Desk */}
            <button
              type="button"
              onClick={() => handleSelectScannerMode('reception')}
              className={`w-full py-2.5 sm:py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scannerMode === 'reception'
                  ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white shadow-md shadow-[#22c55e]/30 scale-[1.01]'
                  : isLight ? 'text-[#3e556e] hover:text-[#1c1811] bg-[#f0fdf4]' : 'text-[#9fc7e8] hover:text-white bg-[#0e2417]'
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#f2c14e] shrink-0" />
              <span className="truncate">Desk 1 · Reception</span>
            </button>

            {/* Desk 2: Technical Event Scan */}
            <button
              type="button"
              onClick={() => handleSelectScannerMode('tech')}
              className={`w-full py-2.5 sm:py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scannerMode === 'tech'
                  ? 'bg-gradient-to-r from-[#0088d4] to-[#026aa6] text-white shadow-md shadow-[#0088d4]/30 scale-[1.01]'
                  : isLight ? 'text-[#3e556e] hover:text-[#1c1811] bg-[#f4f8fc]' : 'text-[#9fc7e8] hover:text-white bg-[#0e1c2e]'
              }`}
            >
              <Zap className="w-4 h-4 text-[#f2c14e] shrink-0" />
              <span className="truncate">Desk 2 · Technical</span>
            </button>

            {/* Desk 3: Food & Catering Counter */}
            <button
              type="button"
              onClick={() => handleSelectScannerMode('lunch')}
              className={`w-full py-2.5 sm:py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scannerMode === 'lunch'
                  ? 'bg-gradient-to-r from-[#d97706] to-[#b45309] text-white shadow-md shadow-[#d97706]/30 scale-[1.01]'
                  : isLight ? 'text-[#3e556e] hover:text-[#1c1811] bg-[#fef8ed]' : 'text-[#9fc7e8] hover:text-white bg-[#281c0c]'
              }`}
            >
              <Utensils className="w-4 h-4 text-[#f2c14e] shrink-0" />
              <span className="truncate">Desk 3 · Food/Lunch</span>
            </button>

            {/* Desk 4: Spot Event Scan */}
            <button
              type="button"
              onClick={() => handleSelectScannerMode('spot')}
              className={`w-full py-2.5 sm:py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scannerMode === 'spot'
                  ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white shadow-md shadow-[#8b5cf6]/30 scale-[1.01]'
                  : isLight ? 'text-[#3e556e] hover:text-[#1c1811] bg-[#f7f4fe]' : 'text-[#9fc7e8] hover:text-white bg-[#1e1533]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#f2c14e] shrink-0" />
              <span className="truncate">Desk 4 · Spot Arena</span>
            </button>

            {/* Desk 5: Certificates & Valedictory */}
            <button
              type="button"
              onClick={() => handleSelectScannerMode('cert')}
              className={`w-full py-2.5 sm:py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scannerMode === 'cert'
                  ? 'bg-gradient-to-r from-[#ec4899] to-[#be185d] text-white shadow-md shadow-[#ec4899]/30 scale-[1.01]'
                  : isLight ? 'text-[#3e556e] hover:text-[#1c1811] bg-[#fdf2f8]' : 'text-[#9fc7e8] hover:text-white bg-[#260f1e]'
              }`}
            >
              <Award className="w-4 h-4 text-[#f2c14e] shrink-0" />
              <span className="truncate">Desk 5 · Certificates</span>
            </button>
          </div>
        </div>

        {/* Live Attendance Metric Cards for All 5 Desks */}
        {(() => {
          const fiveDeskStats = get5DesksGlobalStats(records);
          const certCount = fiveDeskStats.desk5ScannedDelegates;
          const certPercent = totalDelegates > 0 ? Math.round((certCount / totalDelegates) * 100) : 0;

          return (
            <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t mt-4 ${
              isLight ? 'border-[#c0d6ea]' : 'border-[#234259]/60'
            }`}>
              {/* Desk 1 Metric */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
              }`}>
                <span className={`text-[11px] font-medium flex items-center gap-1 block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>
                  <UserCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Desk 1: Reception Check-In</span>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-[#4cc38a]">{checkedInDelegates}</span>
                  <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>/ {totalDelegates}</span>
                  <span className="text-[10px] font-bold font-mono text-[#4cc38a] bg-[#4cc38a]/15 px-1.5 py-0.5 rounded ml-auto">
                    {checkInPercent}%
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 ${isLight ? 'bg-[#d8e7f5]' : 'bg-[#1b2b3a]'}`}>
                  <div 
                    className="bg-gradient-to-r from-[#0088d4] to-[#4cc38a] h-full transition-all duration-500 rounded-full" 
                    style={{ width: `${checkInPercent}%` }}
                  />
                </div>
              </div>

              {/* Desk 2 Metric */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
              }`}>
                <span className={`text-[11px] font-medium flex items-center gap-1 block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>
                  <Zap className="w-3.5 h-3.5 text-[#0088d4]" />
                  <span>Desk 2: Technical Track</span>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-[#0088d4]">{techAttendedCount}</span>
                  <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>/ {totalTechDelegates}</span>
                </div>
                <span className="text-[10px] text-[#0088d4] font-semibold block truncate">Track 1: Morning Sessions (1-Time)</span>
              </div>

              {/* Desk 3 Metric */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
              }`}>
                <span className={`text-[11px] font-medium flex items-center gap-1 block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>
                  <Utensils className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span>Desk 3: Food & Lunch</span>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-[#f59e0b]">{lunchCollectedCount}</span>
                  <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>/ {totalDelegates}</span>
                  <span className="text-[10px] font-bold font-mono text-[#f59e0b] bg-[#f59e0b]/15 px-1.5 py-0.5 rounded ml-auto">
                    {lunchPercent}%
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 ${isLight ? 'bg-[#d8e7f5]' : 'bg-[#1b2b3a]'}`}>
                  <div 
                    className="bg-gradient-to-r from-[#d97706] to-[#f59e0b] h-full transition-all duration-500 rounded-full" 
                    style={{ width: `${lunchPercent}%` }}
                  />
                </div>
              </div>

              {/* Desk 4 Metric */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
              }`}>
                <span className={`text-[11px] font-medium flex items-center gap-1 block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>
                  <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
                  <span>Desk 4: Spot Arena</span>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-[#8b5cf6]">{spotAttendedCount}</span>
                  <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>/ {totalSpotDelegates}</span>
                </div>
                <span className="text-[10px] text-[#8b5cf6] font-semibold block truncate">Track 2: Afternoon Arena (1-Time)</span>
              </div>

              {/* Desk 5 Metric */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
              }`}>
                <span className={`text-[11px] font-medium flex items-center gap-1 block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>
                  <Award className="w-3.5 h-3.5 text-[#ec4899]" />
                  <span>Desk 5: Certificates</span>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-[#ec4899]">{certCount}</span>
                  <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>/ {totalDelegates}</span>
                  <span className="text-[10px] font-bold font-mono text-[#ec4899] bg-[#ec4899]/15 px-1.5 py-0.5 rounded ml-auto">
                    {certPercent}%
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 ${isLight ? 'bg-[#d8e7f5]' : 'bg-[#1b2b3a]'}`}>
                  <div 
                    className="bg-gradient-to-r from-[#f43f5e] to-[#ec4899] h-full transition-all duration-500 rounded-full" 
                    style={{ width: `${certPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Lunch / Catering Dispute Notification Alert */}
      {lunchAlert && (
        <div className={`p-4 rounded-2xl border text-sm flex items-start justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300 ${
          lunchAlert.type === 'duplicate'
            ? 'bg-[#3b1219] border-[#ef4444] text-[#ff8a80]'
            : lunchAlert.type === 'success'
              ? 'bg-[#0f2e1b] border-[#22c55e] text-[#86efac]'
              : 'bg-[#1a2333] border-[#3b82f6] text-[#93c5fd]'
        }`}>
          <div className="flex items-start gap-3">
            {lunchAlert.type === 'duplicate' ? (
              <ShieldAlert className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5 animate-bounce" />
            ) : lunchAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#3b82f6] shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block text-sm tracking-wide">
                {lunchAlert.type === 'duplicate' 
                  ? '⚠️ DUPLICATE DETECTED: ALREADY CHECKED IN / CLAIMED' 
                  : lunchAlert.type === 'success' 
                    ? (scannerMode === 'lunch' ? 'MEAL TOKEN VERIFIED & DISPENSED ✓' : 'DELEGATE CHECK-IN SUCCESS ✓') 
                    : 'SCANNER DESK NOTIFICATION'}
              </span>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed font-medium">
                {lunchAlert.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLunchAlert(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-current cursor-pointer"
            title="Dismiss alert"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Section Switcher: Live Scanner Desk vs All Individual Participants */}
      <div className={`p-2.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md ${
        isLight ? 'bg-white border-[#d8d0ba]' : 'bg-[#0a0a0d] border-[#2e2b22]'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMainScannerTab('scanner')}
            className={`w-full px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mainScannerTab === 'scanner'
                ? 'bg-gradient-to-r from-[#d4a935] to-[#f2c14e] text-[#121217] shadow-md shadow-[#d4a935]/20 scale-[1.01]'
                : isLight ? 'text-[#6b6250] hover:text-[#1c1811] hover:bg-[#f4efe0]' : 'text-[#a79f8b] hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span>Camera Scanner & Desk</span>
          </button>

          <button
            type="button"
            onClick={() => setMainScannerTab('attendees')}
            className={`w-full px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mainScannerTab === 'attendees'
                ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white shadow-md shadow-[#22c55e]/25 scale-[1.01]'
                : isLight ? 'text-[#6b6250] hover:text-[#1c1811] hover:bg-[#f4efe0]' : 'text-[#a79f8b] hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Delegates ({totalDelegates})</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
              mainScannerTab === 'attendees' ? 'bg-black/30 text-white' : 'bg-[#4cc38a]/15 text-[#4cc38a]'
            }`}>
              {checkedInDelegates} In
            </span>
          </button>
        </div>

        {mainScannerTab === 'attendees' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportIndividualAttendanceCsv('all')}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isLight ? 'bg-[#f4efe0] hover:bg-[#ede4ce] text-[#705600] border-[#d4a935]' : 'bg-[#181820] hover:bg-[#20202c] text-[#f2c14e] border-[#d4a935]/40'
              }`}
              title="Download CSV of all individual delegates"
            >
              <Download className="w-3.5 h-3.5" />
              <span>All CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportIndividualAttendanceCsv('present')}
              className="px-2.5 py-1.5 rounded-lg bg-[#0f2e1e] hover:bg-[#1a4a32] border border-[#4cc38a]/50 text-[#4cc38a] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV of present delegates"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Present List ({checkedInDelegates})</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportIndividualAttendanceCsv('absent')}
              className="px-2.5 py-1.5 rounded-lg bg-[#2a1315] hover:bg-[#3d181d] border border-[#ff8a80]/50 text-[#ff8a80] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV of absent delegates"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Absent List ({scannerStats.absentDelegates})</span>
            </button>
          </div>
        )}
      </div>

      {mainScannerTab === 'scanner' ? (
        /* Main Two-Column Layout: Scanner & Search vs Loaded Delegate Detail */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 5 Cols: Scanner & Manual Lookup */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* CAMERA VIEWFINDER CARD */}
          <div className={`p-4 rounded-2xl ${isLight ? 'bg-white border-[#d8d0ba] shadow-sm text-[#1c1811]' : 'bg-[#0a0a0d] border-[#2e2b22] text-[#f3ecd9]'} space-y-3 relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#f2c14e]" />
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#1c1811]' : 'text-[#f3ecd9]'}`}>
                  Live QR Scanner
                </span>
                {isScanning && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4cc38a] bg-[#4cc38a]/10 px-2 py-0.5 rounded-full border border-[#4cc38a]/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]"></span>
                    ACTIVE
                  </span>
                )}
              </div>

              {isScanning && (
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className={`text-[11px] ${isLight ? 'text-[#6b6250] hover:text-[#d4a935]' : 'text-[#a79f8b] hover:text-[#f2c14e]'} flex items-center gap-1 transition-colors cursor-pointer`}
                  title="Switch camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>{facingMode === 'environment' ? 'Back Cam' : 'Front Cam'}</span>
                </button>
              )}
            </div>

            {/* Viewfinder Window */}
            <div className={`relative w-full aspect-[4/3] max-h-[46vh] sm:max-h-[55vh] rounded-xl overflow-hidden bg-[#050507] border flex items-center justify-center transition-all ${
              scanFlash ? 'ring-4 ring-[#4cc38a] border-[#4cc38a]' : (isLight ? 'border-[#d8d0ba]' : 'border-[#2e2b22]')
            }`}>
              {/* Actual Video Stream */}
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${!isScanning ? 'hidden' : ''}`}
              />

              {/* Laser Scan HUD Overlay when active */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                  {/* Corner Targets */}
                  <div className="flex justify-between">
                    <div className="w-7 h-7 border-t-2 border-l-2 border-[#f2c14e] rounded-tl"></div>
                    <div className="w-7 h-7 border-t-2 border-r-2 border-[#f2c14e] rounded-tr"></div>
                  </div>

                  {/* Animated Sweeping Laser Line */}
                  <div 
                    className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#4cc38a] to-transparent shadow-[0_0_12px_#4cc38a]"
                    style={{
                      animation: 'scanLaser 2.2s ease-in-out infinite alternate'
                    }}
                  />

                  {/* Bottom Corners */}
                  <div className="flex justify-between">
                    <div className="w-7 h-7 border-b-2 border-l-2 border-[#f2c14e] rounded-bl"></div>
                    <div className="w-7 h-7 border-b-2 border-r-2 border-[#f2c14e] rounded-br"></div>
                  </div>

                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/70 bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                    Align Ticket QR within frame
                  </span>
                </div>
              )}

              {/* Fallback Idle State - Tap Anywhere to Start */}
              {!isScanning && (
                <div 
                  onClick={startCamera}
                  className="p-5 text-center space-y-2.5 cursor-pointer hover:bg-white/5 transition-colors w-full h-full flex flex-col items-center justify-center"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] text-[#d4a935]' : 'bg-[#1f1b0e] border-[#d4a935]/40 text-[#f2c14e]'} border flex items-center justify-center mx-auto shadow-inner`}>
                    <QrCode className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <h4 className={`text-sm sm:text-base font-bold ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>Tap to Open Camera</h4>
                    <p className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'} mt-0.5`}>
                      Live scanner for delegate passes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startCamera();
                    }}
                    className="px-4 py-2 sm:py-2.5 rounded-xl bg-[#f2c14e] hover:bg-[#d4a935] text-[#121217] font-bold text-xs shadow-md transition-all hover:scale-[1.03] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Camera Scanner</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera Error Message */}
            {cameraError && (
              <div className="p-3 rounded-xl bg-[#ff8a80]/10 border border-[#ff8a80]/30 text-xs text-[#ff8a80] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Quick Upload Image Option */}
            <div className={`pt-2 border-t ${isLight ? 'border-[#e4ded0] text-[#6b6250]' : 'border-[#2e2b22] text-[#a79f8b]'} flex items-center justify-between text-xs`}>
              <span>Have a screenshot or image?</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="qr-image-upload"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`text-xs font-semibold ${isLight ? 'text-[#705600]' : 'text-[#f2c14e]'} hover:underline flex items-center gap-1 cursor-pointer`}
              >
                <Upload className="w-3 h-3" />
                <span>Upload QR Photo</span>
              </button>
            </div>
          </div>

          {/* INSTANT MANUAL SEARCH CARD */}
          <div className={`p-4 rounded-2xl ${isLight ? 'bg-white border-[#d8d0ba] shadow-sm text-[#1c1811]' : 'bg-[#0a0a0d] border-[#2e2b22] text-[#f3ecd9]'} space-y-3`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#705600]' : 'text-[#d4a935]'} flex items-center gap-1.5`}>
                <Search className="w-3.5 h-3.5" />
                <span>Manual Lookup</span>
              </span>
              <span className={`text-[11px] ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>Pass ID, Roll, Phone, or Name</span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. NV26-D3PJ9O, 23KB1A0501, or 949150..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-[#d4a935] ${isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] text-[#1c1811] placeholder-[#8a806c]' : 'bg-[#131318] border-[#2e2b22] text-[#f3ecd9] placeholder-[#5a5444]'}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs ${isLight ? 'text-[#6b6250] hover:text-[#1c1811]' : 'text-[#a79f8b] hover:text-white'}`}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Delegate Selector Pills when search is empty */}
            {!searchQuery && records.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className={`text-[11px] font-medium flex items-center justify-between ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                  <span>Registered Delegates ({records.length}):</span>
                  <span className={`text-[10px] ${isLight ? 'text-[#705600]' : 'text-[#d4a935]'}`}>Click to inspect / check in</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {records.slice(0, 10).map((rec) => (
                    <button
                      key={rec.regId}
                      type="button"
                      onClick={() => {
                        setActiveRecord(rec);
                        setNotesInput(rec.checkInNotes || '');
                        playBeep(true);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeRecord?.regId === rec.regId
                          ? 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935]'
                          : rec.checkedIn
                          ? isLight ? 'bg-[#eaf8f0] text-[#187547] border-[#4cc38a]' : 'bg-[#0d2316] text-[#4cc38a] border-[#4cc38a]/40 hover:border-[#4cc38a]'
                          : isLight ? 'bg-[#f8f5ee] text-[#1c1811] border-[#d8d0ba] hover:border-[#b0a790]' : 'bg-[#131318] text-[#f3ecd9] border-[#2e2b22] hover:border-[#a79f8b]'
                      }`}
                      title={`${rec.name} (${rec.roll}) - Click to inspect`}
                    >
                      <span className="font-bold truncate max-w-[120px]">{rec.name}</span>
                      <span className={`font-mono text-[10px] ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>({rec.roll})</span>
                      {rec.checkedIn ? (
                        <Check className="w-3 h-3 text-[#4cc38a]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f2c14e]"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Autocomplete List */}
            {searchResults.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {searchResults.map((rec) => (
                  <button
                    key={rec.regId}
                    type="button"
                    onClick={() => {
                      setActiveRecord(rec);
                      setNotesInput(rec.checkInNotes || '');
                      setSearchQuery('');
                      playBeep(true);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      activeRecord?.regId === rec.regId
                        ? (isLight ? 'bg-[#fbf4e2] border-[#d4a935]' : 'bg-[#1f1b0e] border-[#d4a935]')
                        : (isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] hover:border-[#b0a790]' : 'bg-[#131318] border-[#2e2b22] hover:border-[#a79f8b]')
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs truncate ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>{rec.name}</span>
                        <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${isLight ? 'text-[#705600] bg-[#f4efe0]' : 'text-[#f2c14e] bg-[#2a220d]'}`}>
                          {rec.roll}
                        </span>
                      </div>
                      <div className={`text-[11px] truncate mt-0.5 ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                        {rec.regId} · {rec.dept} ({rec.className})
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {rec.checkedIn ? (
                        <span className="text-[10px] font-bold text-[#4cc38a] bg-[#4cc38a]/10 px-2 py-0.5 rounded border border-[#4cc38a]/30">
                          Checked In
                        </span>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${isLight ? 'text-[#6b6250] bg-[#ede7d8] border-[#d8d0ba]' : 'text-[#a79f8b] bg-[#181820] border-[#2e2b22]'}`}>
                          Ready
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RECENT CHECK-INS FEED */}
          {recentCheckedIn.length > 0 && (
            <div className={`p-4 rounded-2xl ${isLight ? 'bg-white border-[#d8d0ba] shadow-sm text-[#1c1811]' : 'bg-[#0a0a0d] border-[#2e2b22] text-[#f3ecd9]'} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'} flex items-center gap-1.5`}>
                  <Clock className="w-3.5 h-3.5 text-[#4cc38a]" />
                  <span>Recent Front Desk Check-Ins</span>
                </span>
                <span className="text-[11px] font-mono text-[#4cc38a]">{recentCheckedIn.length} recent</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {recentCheckedIn.map((r) => {
                  const checkInDate = r.checkInTime ? new Date(r.checkInTime) : null;
                  const timeFormatted = checkInDate
                    ? checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={r.regId}
                      onClick={() => {
                        setActiveRecord(r);
                        setNotesInput(r.checkInNotes || '');
                      }}
                      className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                        isLight ? 'bg-[#f8f5ee] hover:bg-[#ede7d8] border-[#d8d0ba]' : 'bg-[#131318] hover:bg-[#1a1a22] border-[#2e2b22]'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className={`font-bold block truncate ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>{r.name}</span>
                        <span className={`text-[11px] font-mono ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                          {r.regId} · {r.roll}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-[#4cc38a] block">{timeFormatted}</span>
                        <span className={`text-[9px] ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>Checked In</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 7 Cols: Active Scanned Participant Inspection Card */}
        <div className="lg:col-span-7">
          {activeRecord ? (
            <div className={`p-5 sm:p-6 rounded-2xl border-2 border-[#d4a935] shadow-2xl shadow-[#d4a935]/10 space-y-5 animate-in fade-in duration-200 ${
              isLight ? 'bg-white text-[#1c1811]' : 'bg-[#0a0a0d] text-[#f3ecd9]'
            }`}>
              
              {/* Header: Delegate Info & Category */}
              <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b ${
                isLight ? 'border-[#e4ded0]' : 'border-[#2e2b22]'
              }`}>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${
                      isLight ? 'bg-[#f4efe0] text-[#705600] border-[#d4a935]/60' : 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935]/50'
                    }`}>
                      <Tag className="w-3 h-3 text-[#d4a935]" />
                      <span>{activeRecord.regId}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeRecord.regId);
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 2000);
                        }}
                        className="hover:opacity-70 transition-opacity"
                        title="Copy Registration ID"
                      >
                        {copiedId ? <Check className="w-3 h-3 text-[#4cc38a]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>

                    {activeRecord.isIeeeMember ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/40 flex items-center gap-1 font-mono">
                        <Award className="w-3 h-3" />
                        <span>IEEE Member (#{activeRecord.ieeeId})</span>
                      </span>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                        isLight ? 'bg-[#f8f5ee] text-[#6b6250] border-[#d8d0ba]' : 'bg-[#181820] text-[#a79f8b] border-[#2e2b22]'
                      }`}>
                        Standard Delegate
                      </span>
                    )}

                    {(() => {
                      const lStats = getRecordLunchStats(activeRecord);
                      const totalM = 1 + getRecordTeammates(activeRecord).length;
                      if (lStats.isFullyCollected) {
                        return (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#4cc38a]/20 text-[#4cc38a] border border-[#4cc38a]/40 flex items-center gap-1 font-mono">
                            <Utensils className="w-3 h-3 text-[#4cc38a]" />
                            <span>All {totalM} Meals Claimed ✓</span>
                          </span>
                        );
                      }
                      if (lStats.mealsDispensed > 0) {
                        return (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 flex items-center gap-1 font-mono">
                            <Utensils className="w-3 h-3 text-[#f59e0b]" />
                            <span>{lStats.mealsDispensed}/{totalM} Meals Dispensed</span>
                          </span>
                        );
                      }
                      return (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 flex items-center gap-1 font-mono">
                          <Utensils className="w-3 h-3 text-[#f59e0b]" />
                          <span>{totalM} {totalM === 1 ? 'Meal Available' : 'Meals Available'}</span>
                        </span>
                      );
                    })()}
                  </div>

                  <h3 className={`font-serif-title text-2xl font-bold mt-1 ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                    {activeRecord.name}
                  </h3>

                  <div className={`text-xs flex flex-wrap items-center gap-x-3 gap-y-1 ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                    <span className={`font-mono font-semibold ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>Roll: {activeRecord.roll}</span>
                    <span>·</span>
                    <span>{activeRecord.className} {activeRecord.section ? `(Sec ${activeRecord.section})` : ''}</span>
                    <span>·</span>
                    <span>{activeRecord.dept} ({activeRecord.year})</span>
                    <span>·</span>
                    <span className="truncate">{activeRecord.college}</span>
                  </div>
                </div>

                {/* Quick reset / next button */}
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shrink-0 self-start cursor-pointer flex items-center gap-1 ${
                    isLight ? 'bg-[#f8f5ee] hover:bg-[#ede7d8] text-[#1c1811] border-[#d8d0ba]' : 'bg-[#181820] hover:bg-[#252530] text-[#a79f8b] hover:text-white border-[#2e2b22]'
                  }`}
                >
                  <span>Close / Next</span>
                  <span>&rarr;</span>
                </button>
              </div>

              {/* 5-DESK AUDIT DOSSIER & PROGRESS STEPPER */}
              {(() => {
                const fiveDeskSummary = getRecord5DeskSummary(activeRecord);
                return (
                  <div className={`p-3.5 sm:p-4 rounded-xl border space-y-2.5 ${
                    isLight ? 'bg-[#f4f8fc] border-[#c0d6ea]' : 'bg-[#0b1624] border-[#1f3a52]'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isLight ? 'text-[#006ca8]' : 'text-[#70baff]'
                      }`}>
                        <Layers className="w-3.5 h-3.5" />
                        <span>5-Desk Station Tracking Dossier</span>
                      </span>
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        fiveDeskSummary.allApplicableCompleted
                          ? 'bg-[#22c55e]/20 text-[#4cc38a] border-[#22c55e]/40'
                          : 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30'
                      }`}>
                        {fiveDeskSummary.completedDesksCount} of {fiveDeskSummary.applicableDesksCount} Desks Completed
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {fiveDeskSummary.desks.map(d => {
                        if (!d.isApplicable) {
                          return (
                            <div key={d.id} className={`p-2 rounded-lg border text-center opacity-50 ${
                              isLight ? 'bg-white/60 border-gray-200 text-gray-500' : 'bg-black/30 border-white/10 text-white/40'
                            }`}>
                              <span className="text-[10px] font-mono block font-bold">D{d.deskNumber}</span>
                              <span className="text-[11px] font-semibold block truncate">{d.shortLabel.split(' · ')[1]}</span>
                              <span className="text-[9px] block text-gray-400">Not Registered</span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={d.id}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              d.isScanned
                                ? isLight
                                  ? 'bg-white border-[#22c55e]/60 shadow-sm ring-1 ring-[#22c55e]/30'
                                  : 'bg-[#0f2418] border-[#22c55e]/60 shadow-sm ring-1 ring-[#22c55e]/30'
                                : isLight
                                  ? 'bg-white/70 border-gray-200'
                                  : 'bg-black/40 border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-[10px] font-mono font-bold ${
                                d.isScanned ? 'text-[#22c55e]' : (isLight ? 'text-gray-400' : 'text-white/40')
                              }`}>
                                D{d.deskNumber}
                              </span>
                              {d.isScanned && <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />}
                            </div>
                            <span className={`text-[11px] font-bold block truncate ${
                              d.isScanned
                                ? isLight ? 'text-[#14532d]' : 'text-[#86efac]'
                                : isLight ? 'text-gray-600' : 'text-white/70'
                            }`}>
                              {d.shortLabel.split(' · ')[1]}
                            </span>
                            <span className={`text-[9px] font-mono block truncate ${
                              d.isScanned
                                ? 'text-[#22c55e] font-semibold'
                                : (isLight ? 'text-gray-400' : 'text-white/40')
                            }`}>
                              {d.isScanned
                                ? (d.primaryTime
                                    ? new Date(d.primaryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : 'Scanned ✓')
                                : 'Pending'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Direct Contact Links */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href={activeRecord.phone ? `tel:${activeRecord.phone}` : '#'}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                    isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] text-[#1c1811] hover:border-[#4cc38a]' : 'bg-[#131318] border-[#2e2b22] text-[#f3ecd9] hover:border-[#4cc38a]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Phone className="w-3.5 h-3.5 text-[#4cc38a] shrink-0" />
                    <span className="font-mono truncate">{activeRecord.phone || 'Phone N/A'}</span>
                  </div>
                  <span className="text-[10px] text-[#4cc38a] font-semibold shrink-0">Call</span>
                </a>

                <a
                  href={activeRecord.phone ? `https://wa.me/91${activeRecord.phone.replace(/\D/g, '')}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                    isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] text-[#1c1811] hover:border-[#25d366]' : 'bg-[#131318] border-[#2e2b22] text-[#f3ecd9] hover:border-[#25d366]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageCircle className="w-3.5 h-3.5 text-[#25d366] shrink-0" />
                    <span className={`truncate ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>{(activeRecord.name || 'Delegate').split(' ')[0]}</span>
                  </div>
                  <span className="text-[10px] text-[#25d366] font-semibold shrink-0">WhatsApp</span>
                </a>
              </div>

              {/* INDIVIDUAL MEMBER ATTENDANCE & CHECK-IN SYSTEM */}
              {(() => {
                const checkInStats = getRecordCheckInStats(activeRecord);
                const teammates = getRecordTeammates(activeRecord);
                const totalMembers = 1 + teammates.length;
                const memberAttendanceList = [
                  {
                    key: 'lead',
                    role: totalMembers > 1 ? 'Team Lead (Member 1)' : 'Lead Delegate',
                    name: activeRecord.name,
                    roll: activeRecord.roll || 'N/A',
                    phone: activeRecord.phone,
                    isPresent: Boolean(checkInStats.memberStatus['lead']),
                    time: checkInStats.memberTimes['lead'] || (activeRecord.checkedIn ? activeRecord.checkInTime : undefined)
                  },
                  ...teammates.map((m, idx) => ({
                    key: `teammate_${idx}`,
                    role: `Team Member ${idx + 2}`,
                    name: m.name || `Member ${idx + 2}`,
                    roll: m.roll || 'N/A',
                    phone: m.phone || activeRecord.phone,
                    isPresent: Boolean(checkInStats.memberStatus[`teammate_${idx}`]),
                    time: checkInStats.memberTimes[`teammate_${idx}`]
                  }))
                ];

                return (
                  <div className={`p-5 rounded-2xl border transition-all ${
                    checkInStats.isFullyCheckedIn
                      ? isLight
                        ? 'bg-gradient-to-r from-[#eaf8f0] via-[#f1faf4] to-[#e4f6eb] border-[#4cc38a] shadow-md shadow-[#4cc38a]/10'
                        : 'bg-gradient-to-r from-[#0d2a1c] via-[#091f14] to-[#07170f] border-[#4cc38a] shadow-lg shadow-[#4cc38a]/10 ring-1 ring-[#4cc38a]/50'
                      : checkInStats.isPartiallyCheckedIn
                        ? isLight
                          ? 'bg-gradient-to-r from-[#fefbf2] via-[#faf4e4] to-[#f7eed6] border-[#d4a935] shadow-md'
                          : 'bg-gradient-to-r from-[#1c1809] via-[#141006] to-[#0e0c04] border-[#d4a935] shadow-lg shadow-[#d4a935]/15'
                        : isLight
                          ? 'bg-[#fcfaf5] border-[#d8d0ba] shadow-sm'
                          : 'bg-[#0e0e13] border-[#2e2b22]'
                  }`}>
                    {/* Header Summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {checkInStats.isFullyCheckedIn ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-[#4cc38a]" />
                              <span className={`text-base font-bold ${isLight ? 'text-[#14532d]' : 'text-white'}`}>
                                ALL DELEGATES PRESENT ✓ ({checkInStats.checkedInCount}/{checkInStats.totalMembers})
                              </span>
                            </>
                          ) : checkInStats.isPartiallyCheckedIn ? (
                            <>
                              <Sparkles className="w-5 h-5 text-[#f2c14e]" />
                              <span className={`text-base font-bold ${isLight ? 'text-[#594200]' : 'text-white'}`}>
                                PARTIAL ATTENDANCE ({checkInStats.checkedInCount}/{checkInStats.totalMembers} Present · {checkInStats.absentCount} Absent)
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-5 h-5 text-[#a79f8b]" />
                              <span className={`text-base font-bold ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                                NOT CHECKED IN (0/{checkInStats.totalMembers} Present · All Absent)
                              </span>
                            </>
                          )}
                        </div>
                        <p className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                          {totalMembers > 1 
                            ? 'Individual member attendance tracking. Each team member is counted separately.'
                            : 'Verify student ID badge and confirm entry attendance.'}
                        </p>
                      </div>

                      {/* Quick Bulk Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {totalMembers > 1 && !checkInStats.isFullyCheckedIn && (
                          <button
                            type="button"
                            onClick={() => handleCheckInAllMembers(activeRecord)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Check In All ({totalMembers})</span>
                          </button>
                        )}

                        {checkInStats.checkedInCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleResetAllMembers(activeRecord)}
                            className="px-3 py-1.5 rounded-xl bg-[#2a1215] hover:bg-[#3d181d] text-[#ff8a80] border border-[#ff8a80]/30 font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Mark All Absent</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Member-by-Member Attendance Checklist */}
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                      <span className={`text-xs font-bold uppercase tracking-wider block ${isLight ? 'text-[#705600]' : 'text-[#d4a935]'}`}>
                        Individual Participants Attendance List ({checkInStats.checkedInCount} Present · {checkInStats.absentCount} Absent):
                      </span>

                      {memberAttendanceList.map((m) => (
                        <div
                          key={m.key}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            m.isPresent
                              ? isLight
                                ? 'bg-[#f0fdf4] border-[#86efac]'
                                : 'bg-[#0f1f14] border-[#4cc38a]/40 shadow-sm'
                              : isLight
                                ? 'bg-white border-[#d8d0ba]'
                                : 'bg-[#14141d] border-[#2e2b22]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleMemberCheckIn(activeRecord, m.key)}
                              className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                m.isPresent
                                  ? 'bg-[#22c55e] text-white'
                                  : isLight ? 'border border-[#d8d0ba] hover:border-[#4cc38a]' : 'border border-[#2e2b22] hover:border-[#4cc38a]'
                              }`}
                              title={m.isPresent ? "Click to mark as absent" : "Click to mark as present"}
                            >
                              {m.isPresent && <Check className="w-3.5 h-3.5" />}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold truncate ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                                  {m.name}
                                </span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold uppercase ${
                                  m.role.includes('Lead')
                                    ? 'bg-[#d4a935]/15 text-[#d4a935] border-[#d4a935]/30'
                                    : 'bg-[#9fc7e8]/15 text-[#9fc7e8] border-[#9fc7e8]/30'
                                }`}>
                                  {m.role}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#a79f8b] font-mono mt-0.5 flex items-center gap-2">
                                <span>Roll: {m.roll}</span>
                                {m.phone && <span>· 📞 {m.phone}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {m.isPresent ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-[#4cc38a] flex items-center gap-1 bg-[#4cc38a]/15 px-2 py-1 rounded-lg border border-[#4cc38a]/30">
                                  <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                                  <span>PRESENT ✓</span>
                                  {m.time && (
                                    <span className="hidden sm:inline text-[9px] opacity-75">
                                      ({new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleMemberCheckIn(activeRecord, m.key, false)}
                                  className="text-[10px] text-[#ff8a80] hover:underline px-1 cursor-pointer"
                                  title="Mark this delegate absent"
                                >
                                  Undo
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/15 px-2 py-1 rounded-lg border border-[#f59e0b]/30">
                                  ABSENT
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleMemberCheckIn(activeRecord, m.key, true)}
                                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white font-bold text-[10px] shadow transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Check In</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Welcome Kit Dispatch */}
                    <div className={`mt-4 pt-3 border-t ${isLight ? 'border-[#d8d0ba]' : 'border-white/10'} flex items-center justify-between text-xs`}>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(activeRecord.kitIssued)}
                          onChange={handleToggleKit}
                          className="w-4 h-4 rounded text-[#4cc38a] accent-[#4cc38a] cursor-pointer"
                        />
                        <span className={`font-medium ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>Welcome Kit & Delegate ID Badge Dispatched</span>
                      </label>
                      <span className={`text-[11px] font-semibold ${activeRecord.kitIssued ? 'text-[#4cc38a]' : (isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]')}`}>
                        {activeRecord.kitIssued ? 'Kit Handed Over ✓' : 'Pending Kit'}
                      </span>
                    </div>
                  </div>
                );
              })()}

                {/* Food / Lunch Token Check & Anti-Dispute Verification (Based on Members) */}
                {(() => {
                  const lunchStats = getRecordLunchStats(activeRecord);
                  const teammates = getRecordTeammates(activeRecord);
                  const totalMembers = 1 + teammates.length;
                  const memberList = [
                    {
                      key: 'lead',
                      role: totalMembers > 1 ? 'Lead' : 'Delegate',
                      name: activeRecord.name,
                      roll: activeRecord.roll || 'N/A',
                      isCollected: Boolean(lunchStats.memberStatus['lead'] || lunchStats.isFullyCollected)
                    },
                    ...teammates.map((m, idx) => ({
                      key: `teammate_${idx}`,
                      role: `Member ${idx + 2}`,
                      name: m.name || `Member ${idx + 2}`,
                      roll: m.roll || 'N/A',
                      isCollected: Boolean(lunchStats.memberStatus[`teammate_${idx}`] || lunchStats.isFullyCollected)
                    }))
                  ];

                  return (
                    <div className={`mt-3 pt-3 border-t ${isLight ? 'border-[#d8d0ba]' : 'border-white/10'} space-y-3`}>
                      {/* Section Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Utensils className="w-4 h-4 text-[#f59e0b]" />
                          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                            Food & Lunch Tokens ({lunchStats.mealsDispensed} of {lunchStats.totalMealsAllocated} Meal Trays)
                          </span>
                        </div>

                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase font-mono ${
                          lunchStats.isFullyCollected
                            ? 'bg-[#4cc38a]/15 text-[#4cc38a] border-[#4cc38a]/40'
                            : lunchStats.mealsDispensed > 0
                            ? 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40'
                            : (isLight ? 'bg-[#fef3c7] text-[#b45309] border-[#f59e0b]/40' : 'bg-[#291b00] text-[#f2c14e] border-[#d4a935]/40')
                        }`}>
                          {lunchStats.isFullyCollected 
                            ? `All ${lunchStats.totalMealsAllocated} Trays Collected ✓` 
                            : lunchStats.mealsDispensed > 0
                            ? `${lunchStats.mealsRemaining} Trays Remaining`
                            : `${lunchStats.totalMealsAllocated} Trays Available`}
                        </span>
                      </div>

                      {/* Member-by-Member Lunch Trays Checklist */}
                      <div className="space-y-2">
                        {memberList.map((m) => (
                          <div 
                            key={m.key} 
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                              m.isCollected
                                ? (isLight ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-[#0f1f14] border-[#4cc38a]/40')
                                : (isLight ? 'bg-white border-[#d8d0ba]' : 'bg-[#14141d] border-[#2e2b22]')
                            }`}
                          >
                            <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={m.isCollected}
                                onChange={() => handleToggleMemberLunch(m.key)}
                                className="w-4 h-4 rounded text-[#f59e0b] accent-[#f59e0b] cursor-pointer shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs font-bold truncate ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                                    {m.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#f59e0b] px-1.5 py-0.2 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/30 font-semibold uppercase">
                                    {m.role}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#a79f8b] font-mono">
                                  Roll: {m.roll} · 1 Lunch Meal Tray
                                </div>
                              </div>
                            </label>

                            <div className="shrink-0">
                              {m.isCollected ? (
                                <span className="text-[10px] font-bold text-[#4cc38a] flex items-center gap-1 bg-[#4cc38a]/15 px-2 py-1 rounded-lg border border-[#4cc38a]/30">
                                  <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                                  <span>Tray Dispensed ✓</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleMemberLunch(m.key, true)}
                                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white font-bold text-[10px] hover:opacity-90 transition-all flex items-center gap-1 shadow cursor-pointer"
                                >
                                  <Utensils className="w-3 h-3" />
                                  <span>Dispense Meal</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick Bulk Actions for Team */}
                      {totalMembers > 1 && (
                        <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                          <span className="text-[10px] text-[#a79f8b]">
                            Team Allocation: <strong>{totalMembers} Meal Trays</strong> ({lunchStats.mealsDispensed} Claimed, {lunchStats.mealsRemaining} Remaining)
                          </span>
                          <div className="flex items-center gap-2">
                            {lunchStats.mealsRemaining > 0 && (
                              <button
                                type="button"
                                onClick={handleDispenseAllLunch}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow"
                              >
                                <Check className="w-3 h-3" />
                                <span>Dispense All ({lunchStats.mealsRemaining} Trays)</span>
                              </button>
                            )}
                            {lunchStats.mealsDispensed > 0 && (
                              <button
                                type="button"
                                onClick={handleResetLunch}
                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#a79f8b] hover:text-white border border-white/10 text-[10px] transition-all cursor-pointer"
                              >
                                Reset Lunch
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Audit Trail Note */}
                      {activeRecord.lunchCollectedTime && (
                        <div className="text-[10px] text-[#a79f8b] italic flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#d4a935]" />
                          <span>
                            Last meal activity at {new Date(activeRecord.lunchCollectedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {activeRecord.lunchCollectedBy || 'Admin Desk'}.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* EVENT-LEVEL ATTENDANCE CARDS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#705600]' : 'text-[#d4a935]'} flex items-center gap-1.5`}>
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Registered Tracks & Event Attendance</span>
                  </span>
                  <span className={`text-[11px] ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>Mark specific track participation</span>
                </div>

                {/* TRACK 1: TECHNICAL EVENTS */}
                {(() => {
                  const techEvents = (activeRecord.eventIds || []).filter(id => id !== 'spot' && id !== 'spot-pass');
                  if (techEvents.length === 0) {
                    return (
                      <div className={`p-3.5 rounded-xl border text-xs ${isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] text-[#6b6250]' : 'bg-[#131318] border-[#2e2b22] text-[#a79f8b]'}`}>
                        No Flagship Technical Event selected for this delegate (Spot Events Pass only).
                      </div>
                    );
                  }

                  const trackStats = getRecordTrackAttendanceStats(activeRecord);
                  const teammates = getRecordTeammates(activeRecord);
                  const totalMembers = 1 + teammates.length;
                  const memberList = [
                    {
                      key: 'lead',
                      role: totalMembers > 1 ? 'Lead' : 'Delegate',
                      name: activeRecord.name,
                      roll: activeRecord.roll || 'N/A',
                      isAttended: Boolean(trackStats.techMemberStatus['lead']),
                      time: trackStats.techMemberTimes['lead']
                    },
                    ...teammates.map((m, idx) => ({
                      key: `teammate_${idx}`,
                      role: `Member ${idx + 2}`,
                      name: m.name || `Member ${idx + 2}`,
                      roll: m.roll || 'N/A',
                      isAttended: Boolean(trackStats.techMemberStatus[`teammate_${idx}`]),
                      time: trackStats.techMemberTimes[`teammate_${idx}`]
                    }))
                  ];

                  return techEvents.map(eventId => {
                    const ev = ALL_EVENTS.find(e => e.id === eventId);
                    const isAttended = (activeRecord.attendedEvents || []).includes(eventId);

                    return (
                      <div
                        key={eventId}
                        className={`p-4 rounded-xl border transition-all ${
                          trackStats.isFullyTechAttended
                            ? isLight ? 'bg-[#f0faf4] border-[#4cc38a] shadow-sm' : 'bg-[#0f1d14] border-[#4cc38a]/60 shadow-sm'
                            : isLight ? 'bg-[#f8f5ee] border-[#d8d0ba]' : 'bg-[#131318] border-[#2e2b22]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-serif-title font-bold text-base ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                                {ev?.name || eventId.toUpperCase()}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                isLight ? 'text-[#705600] bg-[#f4efe0] border-[#d4a935]/40 font-semibold' : 'text-[#f2c14e] bg-[#2a220d] border-[#d4a935]/30'
                              }`}>
                                Track 1 · Morning
                              </span>
                              {trackStats.techAttendedCount > 0 && (
                                <span className="text-[10px] font-bold text-[#4cc38a] bg-[#4cc38a]/15 px-2 py-0.5 rounded border border-[#4cc38a]/30">
                                  {trackStats.techAttendedCount}/{trackStats.totalMembers} Scanned (1-Time)
                                </span>
                              )}
                            </div>
                            <div className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                              Time: {ev?.time || '10:00 AM – 12:00 PM'} · Venue: {ev?.venue || 'Labs'} · Strict 1-Time QR Scan Limit
                            </div>
                          </div>
                        </div>

                        {/* Member-by-Member Technical Attendance */}
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? 'text-[#705600]' : 'text-[#d4a935]'}`}>
                            Technical Track Delegates ({trackStats.techAttendedCount} Scanned & Counted · {Math.max(0, totalMembers - trackStats.techAttendedCount)} Remaining):
                          </span>
                          {memberList.map((m) => (
                            <div
                              key={m.key}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                                m.isAttended
                                  ? (isLight ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-[#0f1f14] border-[#4cc38a]/40')
                                  : (isLight ? 'bg-white border-[#d8d0ba]' : 'bg-[#14141d] border-[#2e2b22]')
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`font-bold ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>{m.name}</span>
                                  <span className="text-[10px] font-mono text-[#0088d4] px-1.5 py-0.2 rounded bg-[#0088d4]/10 border border-[#0088d4]/30 font-semibold uppercase">{m.role}</span>
                                </div>
                                <span className="text-[10px] text-[#a79f8b] font-mono">Roll: {m.roll}</span>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {m.isAttended ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playBuzzer();
                                        try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
                                        setScanResultModal({
                                          type: 'already_scanned',
                                          scanTrack: 'Technical Event',
                                          title: 'ALREADY SCANNED! NO OTHER CHANCE.',
                                          message: `This QR code has ALREADY been scanned and counted for Technical Events. Duplicate entry is strictly rejected! Each QR code can only be scanned and counted ONCE.`,
                                          delegateName: m.name,
                                          delegateRoll: m.roll,
                                          delegateRole: m.role,
                                          teamName: activeRecord.name,
                                          scannedAt: m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today',
                                          eventName: trackStats.techEventName
                                        });
                                      }}
                                      className="text-[10px] font-bold text-[#4cc38a] flex items-center gap-1 bg-[#4cc38a]/15 hover:bg-[#4cc38a]/25 px-2 py-1 rounded-lg border border-[#4cc38a]/30 cursor-pointer transition-colors"
                                      title="Already counted · Click to test duplicate scan alert"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                                      <span>1-TIME SCANNED ✓</span>
                                      {m.time && (
                                        <span className="hidden sm:inline text-[9px] opacity-75">
                                          ({new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                        </span>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMemberTech(activeRecord, m.key, false)}
                                      className="text-[10px] text-[#ff8a80] hover:underline px-1 cursor-pointer"
                                      title="Reset this delegate's technical scan"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberTech(activeRecord, m.key, true)}
                                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#0088d4] to-[#026aa6] text-white font-bold text-[10px] shadow hover:opacity-95 transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Zap className="w-3 h-3 text-[#f2c14e]" />
                                    <span>Scan & Count (1-Time)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* TRACK 2: SPOT EVENTS PASS */}
                {(() => {
                  const trackStats = getRecordTrackAttendanceStats(activeRecord);
                  if (!trackStats.hasSpot) {
                    return (
                      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        isLight ? 'bg-[#f8f5ee] border-[#d8d0ba]' : 'bg-[#131318] border-[#2e2b22]'
                      }`}>
                        <div>
                          <span className={`font-bold block ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>Track 2: Spot Events Pass</span>
                          <span className={`${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>Delegate has NOT registered for Afternoon Spot Events (01:30 PM - 03:30 PM).</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddSpotPassOnSpot}
                          className="px-3 py-1.5 rounded-lg bg-[#0088d4]/20 hover:bg-[#0088d4]/30 text-[#006ca8] border border-[#0088d4]/40 font-semibold text-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Spot Pass (+₹100)</span>
                        </button>
                      </div>
                    );
                  }

                  const teammates = getRecordTeammates(activeRecord);
                  const totalMembers = 1 + teammates.length;
                  const memberList = [
                    {
                      key: 'lead',
                      role: totalMembers > 1 ? 'Lead' : 'Delegate',
                      name: activeRecord.name,
                      roll: activeRecord.roll || 'N/A',
                      isAttended: Boolean(trackStats.spotMemberStatus['lead']),
                      time: trackStats.spotMemberTimes['lead']
                    },
                    ...teammates.map((m, idx) => ({
                      key: `teammate_${idx}`,
                      role: `Member ${idx + 2}`,
                      name: m.name || `Member ${idx + 2}`,
                      roll: m.roll || 'N/A',
                      isAttended: Boolean(trackStats.spotMemberStatus[`teammate_${idx}`]),
                      time: trackStats.spotMemberTimes[`teammate_${idx}`]
                    }))
                  ];

                  return (
                    <div className={`p-4 rounded-xl border transition-all ${
                      trackStats.isFullySpotAttended
                        ? isLight ? 'bg-[#f0faf4] border-[#4cc38a] shadow-sm' : 'bg-[#0f1d14] border-[#4cc38a]/60 shadow-sm'
                        : isLight ? 'bg-[#edf5fc] border-[#0088d4]/40' : 'bg-[#0c1824] border-[#0088d4]/40'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-serif-title font-bold text-base ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                              Spot Events Pass (Arena & Non-Technical)
                            </span>
                            <span className="text-[10px] text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded border border-[#8b5cf6]/30 font-semibold">
                              Track 2 · ₹100
                            </span>
                            {trackStats.spotAttendedCount > 0 && (
                              <span className="text-[10px] font-bold text-[#4cc38a] bg-[#4cc38a]/15 px-2 py-0.5 rounded border border-[#4cc38a]/30">
                                {trackStats.spotAttendedCount}/{trackStats.totalMembers} Scanned (1-Time)
                              </span>
                            )}
                          </div>
                          <div className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                            Time: 01:30 PM – 03:30 PM · Venue: Central Courtyard & Seminar Halls · Strict 1-Time QR Scan Limit
                          </div>
                        </div>
                      </div>

                      {/* Member-by-Member Spot Attendance */}
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? 'text-[#705600]' : 'text-[#d4a935]'}`}>
                          Spot Track Delegates ({trackStats.spotAttendedCount} Scanned & Counted · {Math.max(0, totalMembers - trackStats.spotAttendedCount)} Remaining):
                        </span>
                        {memberList.map((m) => (
                          <div
                            key={m.key}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                              m.isAttended
                                ? (isLight ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-[#0f1f14] border-[#4cc38a]/40')
                                : (isLight ? 'bg-white border-[#d8d0ba]' : 'bg-[#14141d] border-[#2e2b22]')
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-bold ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>{m.name}</span>
                                <span className="text-[10px] font-mono text-[#8b5cf6] px-1.5 py-0.2 rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 font-semibold uppercase">{m.role}</span>
                              </div>
                              <span className="text-[10px] text-[#a79f8b] font-mono">Roll: {m.roll}</span>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {m.isAttended ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playBuzzer();
                                      try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
                                      setScanResultModal({
                                        type: 'already_scanned',
                                        scanTrack: 'Spot Event',
                                        title: 'ALREADY SCANNED! NO OTHER CHANCE.',
                                        message: `This QR code has ALREADY been scanned and counted for Spot Events. Duplicate entry is strictly rejected! Each QR code can only be scanned and counted ONCE.`,
                                        delegateName: m.name,
                                        delegateRoll: m.roll,
                                        delegateRole: m.role,
                                        teamName: activeRecord.name,
                                        scannedAt: m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier Today',
                                        eventName: 'Spot Events Pass (Arena Activities)'
                                      });
                                    }}
                                    className="text-[10px] font-bold text-[#4cc38a] flex items-center gap-1 bg-[#4cc38a]/15 hover:bg-[#4cc38a]/25 px-2 py-1 rounded-lg border border-[#4cc38a]/30 cursor-pointer transition-colors"
                                    title="Already counted · Click to test duplicate scan alert"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                                    <span>1-TIME SCANNED ✓</span>
                                    {m.time && (
                                      <span className="hidden sm:inline text-[9px] opacity-75">
                                        ({new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberSpot(activeRecord, m.key, false)}
                                    className="text-[10px] text-[#ff8a80] hover:underline px-1 cursor-pointer"
                                    title="Reset this delegate's spot scan"
                                  >
                                    Reset
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleMemberSpot(activeRecord, m.key, true)}
                                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white font-bold text-[10px] shadow hover:opacity-95 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3 text-[#f2c14e]" />
                                  <span>Scan & Count (1-Time)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* DESK 5: CERTIFICATES & VALEDICTORY DESK */}
              {(() => {
                const certStats = getRecordCertStats(activeRecord);
                const teammates = getRecordTeammates(activeRecord);
                const totalMembers = 1 + teammates.length;
                const memberList = [
                  {
                    key: 'lead',
                    role: totalMembers > 1 ? 'Lead' : 'Delegate',
                    name: activeRecord.name,
                    roll: activeRecord.roll || 'N/A',
                    isIssued: Boolean(certStats.memberStatus['lead']),
                    time: certStats.memberTimes['lead']
                  },
                  ...teammates.map((m, idx) => ({
                    key: `teammate_${idx}`,
                    role: `Member ${idx + 2}`,
                    name: m.name || `Member ${idx + 2}`,
                    roll: m.roll || 'N/A',
                    isIssued: Boolean(certStats.memberStatus[`teammate_${idx}`]),
                    time: certStats.memberTimes[`teammate_${idx}`]
                  }))
                ];

                return (
                  <div className={`p-4 rounded-xl border transition-all ${
                    certStats.isFullyIssued
                      ? isLight ? 'bg-[#fdf2f8] border-[#ec4899] shadow-sm' : 'bg-[#200d18] border-[#ec4899]/60 shadow-sm'
                      : isLight ? 'bg-[#faf5f8] border-[#d8d0ba]' : 'bg-[#151016] border-[#2e2b22]'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#ec4899]" />
                          <span className={`font-serif-title font-bold text-base ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                            Desk 5: Certificates & Valedictory Desk
                          </span>
                          <span className="text-[10px] text-[#ec4899] bg-[#ec4899]/10 px-2 py-0.5 rounded border border-[#ec4899]/30 font-semibold">
                            Valedictory
                          </span>
                          {certStats.certificatesIssuedCount > 0 && (
                            <span className="text-[10px] font-bold text-[#4cc38a] bg-[#4cc38a]/15 px-2 py-0.5 rounded border border-[#4cc38a]/30">
                              {certStats.certificatesIssuedCount}/{certStats.totalCertificates} Issued (1-Time)
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                          Valedictory Session · Physical certificate distribution · Strict 1-Time Issuance Logging
                        </div>
                      </div>

                      {totalMembers > 1 && (
                        <div className="flex items-center gap-2 shrink-0">
                          {!certStats.isFullyIssued && (
                            <button
                              type="button"
                              onClick={() => handleIssueAllCerts(activeRecord)}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#ec4899] to-[#db2777] text-white font-bold text-[11px] shadow hover:opacity-90 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Issue All ({totalMembers})</span>
                            </button>
                          )}
                          {certStats.certificatesIssuedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleResetAllCerts(activeRecord)}
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#a79f8b] hover:text-white border border-white/10 text-[10px] transition-all cursor-pointer"
                            >
                              Reset Certs
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Member-by-Member Certificates Checklist */}
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? 'text-[#705600]' : 'text-[#d4a935]'}`}>
                        Participation Certificates ({certStats.certificatesIssuedCount} Issued · {certStats.certificatesRemaining} Remaining):
                      </span>
                      {memberList.map((m) => (
                        <div
                          key={m.key}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                            m.isIssued
                              ? (isLight ? 'bg-[#fdf2f8] border-[#f472b6]' : 'bg-[#260f1e] border-[#ec4899]/40')
                              : (isLight ? 'bg-white border-[#d8d0ba]' : 'bg-[#14141d] border-[#2e2b22]')
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-bold ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>{m.name}</span>
                              <span className="text-[10px] font-mono text-[#ec4899] px-1.5 py-0.2 rounded bg-[#ec4899]/10 border border-[#ec4899]/30 font-semibold uppercase">{m.role}</span>
                            </div>
                            <span className="text-[10px] text-[#a79f8b] font-mono">Roll: {m.roll} · 1 Certificate</span>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {m.isIssued ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    playBuzzer();
                                    try { navigator.vibrate?.([300, 150, 300, 150, 400]); } catch (e) {}
                                    setScanResultModal({
                                      type: 'already_scanned',
                                      scanTrack: 'Desk 5: Certificates & Valedictory',
                                      deskNumber: 5,
                                      title: 'ALREADY ISSUED CERTIFICATE! NO OTHER CHANCE.',
                                      message: `Certificate has ALREADY been issued for ${m.name} (${m.roll} · ${m.role}). Duplicate certificate is strictly rejected! Each delegate can only receive their certificate ONCE.`,
                                      delegateName: m.name,
                                      delegateRoll: m.roll,
                                      delegateRole: m.role,
                                      teamName: activeRecord.name,
                                      scannedAt: m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier Today',
                                      eventName: 'Desk 5: Participation Certificate'
                                    });
                                  }}
                                  className="text-[10px] font-bold text-[#ec4899] flex items-center gap-1 bg-[#ec4899]/15 hover:bg-[#ec4899]/25 px-2 py-1 rounded-lg border border-[#ec4899]/30 cursor-pointer transition-colors"
                                  title="Already issued · Click to test duplicate alert"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-[#ec4899]" />
                                  <span>CERTIFICATE ISSUED ✓</span>
                                  {m.time && (
                                    <span className="hidden sm:inline text-[9px] opacity-75">
                                      ({new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleMemberCert(activeRecord, m.key, false)}
                                  className="text-[10px] text-[#ff8a80] hover:underline px-1 cursor-pointer"
                                  title="Reset this delegate's certificate"
                                >
                                  Reset
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleMemberCert(activeRecord, m.key, true)}
                                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#ec4899] to-[#be185d] text-white font-bold text-[10px] shadow hover:opacity-95 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Award className="w-3 h-3 text-[#f2c14e]" />
                                <span>Issue Certificate (1-Time)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* PAYMENT & VERIFICATION STATUS */}
              <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-[#f8f5ee] border-[#d8d0ba]' : 'bg-[#131318] border-[#2e2b22]'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>Payment Details:</span>
                  <div className="text-right">
                    <span className={`font-mono text-sm font-bold block ${isLight ? 'text-[#705600]' : 'text-white'}`}>
                      ₹{activeRecord.totalPaid} Total
                    </span>
                    {activeRecord.gstAmount ? (
                      <span className={`text-[10px] font-mono block ${isLight ? 'text-[#8a7f6a]' : 'text-[#a79f8b]'}`}>
                        (Base: ₹{activeRecord.subtotal || (activeRecord.totalPaid - activeRecord.gstAmount)} + 2% GST: ₹{activeRecord.gstAmount})
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className={`flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t ${isLight ? 'border-[#e4ded0]' : 'border-[#2e2b22]'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>Mode:</span>
                    <span className={`font-mono font-semibold uppercase ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>{activeRecord.paymentMode || 'UPI'}</span>
                    <span className={`${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>· Ref: {activeRecord.paymentId || 'N/A'}</span>
                  </div>

                  <div>
                    {activeRecord.isVerified ? (
                      <span className="text-[11px] font-semibold text-[#4cc38a] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Payment Verified</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVerifyPayment}
                        className={`px-2.5 py-1 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                          isLight ? 'bg-[#fbf4e2] hover:bg-[#f6ebd1] text-[#705600] border-[#d4a935]' : 'bg-[#2a1e06] hover:bg-[#3d2c09] text-[#f2c14e] border-[#d4a935]/40'
                        }`}
                      >
                        Mark Payment Verified
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CHECK-IN DESK NOTES */}
              <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-[#f8f5ee] border-[#d8d0ba]' : 'bg-[#131318] border-[#2e2b22]'}`}>
                <label className={`text-xs font-bold block ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                  Front Desk Operator Notes:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="e.g. College ID physically checked, Kit collected by lead"
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#d4a935] ${
                      isLight ? 'bg-white border-[#d8d0ba] text-[#1c1811] placeholder-[#8a806c]' : 'bg-[#0a0a0d] border-[#2e2b22] text-[#f3ecd9] placeholder-[#5a5444]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                      isLight ? 'bg-[#f4efe0] hover:bg-[#ede4ce] text-[#705600] border-[#d4a935]' : 'bg-[#1f1b0e] hover:bg-[#2a2412] text-[#f2c14e] border-[#d4a935]/40'
                    }`}
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {onViewPass && (
                    <button
                      type="button"
                      onClick={() => onViewPass(activeRecord)}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                        isLight ? 'bg-white hover:bg-[#f8f5ee] text-[#705600] border-[#d4a935]' : 'bg-[#1f1b0e] hover:bg-[#2e2612] text-[#f2c14e] border-[#d4a935]/50'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Official Pass</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isLight ? 'bg-white hover:bg-[#f8f5ee] text-[#1c1811] border-[#d8d0ba]' : 'bg-[#131318] hover:bg-[#1a1a22] text-[#a79f8b] hover:text-white border-[#2e2b22]'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Badge</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="px-4 py-2 rounded-xl bg-[#f2c14e] hover:bg-[#d4a935] text-[#121217] font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5 ml-auto shadow-md"
                >
                  <span>Ready for Next Delegate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ) : (
            /* EMPTY / WAITING STATE */
            <div className={`p-8 sm:p-12 rounded-2xl border border-dashed text-center space-y-4 ${
              isLight ? 'bg-white border-[#d8d0ba]' : 'bg-[#0a0a0d] border-[#2e2b22]'
            }`}>
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto shadow-inner ${
                isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] text-[#705600]' : 'bg-[#14141c] border-[#2e2b22] text-[#d4a935]'
              }`}>
                {scannerMode === 'lunch' ? (
                  <Utensils className="w-8 h-8 text-[#f59e0b]" />
                ) : (
                  <QrCode className="w-8 h-8 opacity-60" />
                )}
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className={`font-serif-title text-xl font-bold ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                  {scannerMode === 'lunch'
                    ? 'Waiting for Food / Lunch Token Scan...'
                    : 'Waiting for Ticket QR Scan...'}
                </h4>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                  {scannerMode === 'lunch'
                    ? 'Point the camera at delegate badge QR code. System will automatically verify token, dispense 1 meal box, and immediately alert if duplicate claim is detected.'
                    : "Point the camera at any participant's entry ticket QR code, upload a pass image, or type their name, roll number, or phone into the manual search box."}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isLight ? 'bg-white hover:bg-[#f8f5ee] text-[#705600] border-[#d4a935]' : 'bg-[#1f1b0e] hover:bg-[#2d2612] text-[#f2c14e] border-[#d4a935]/50'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Activate Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isLight ? 'bg-white hover:bg-[#f8f5ee] text-[#1c1811] border-[#d8d0ba]' : 'bg-[#131318] hover:bg-[#1a1a22] text-[#a79f8b] hover:text-white border-[#2e2b22]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select Pass Image</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      ) : (
        /* INDIVIDUAL ATTENDEES ATTENDANCE DIRECTORY VIEW */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isLight ? 'bg-white border-[#d8d0ba] shadow-sm' : 'bg-[#0a0a0d] border-[#2e2b22]'
          }`}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mr-1 ${isLight ? 'text-[#705600]' : 'text-[#d4a935]'}`}>
                  <Filter className="w-3.5 h-3.5" />
                  <span>Attendance Status:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setAttendeeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    attendeeFilter === 'all'
                      ? 'bg-[#d4a935] text-[#121217] shadow-sm scale-[1.02]'
                      : isLight ? 'bg-[#f4efe0] text-[#6b6250] hover:text-[#1c1811]' : 'bg-[#181820] text-[#a79f8b] hover:text-white border border-[#2e2b22]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All Delegates ({totalDelegates})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendeeFilter('present')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    attendeeFilter === 'present'
                      ? 'bg-[#22c55e] text-white shadow-md shadow-[#22c55e]/30 scale-[1.02]'
                      : isLight ? 'bg-[#eaf8f0] text-[#187547] hover:bg-[#d5f3e2]' : 'bg-[#0e2417] text-[#4cc38a] hover:bg-[#153823] border border-[#4cc38a]/40'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Checked In / Present ({checkedInDelegates})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendeeFilter('absent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    attendeeFilter === 'absent'
                      ? 'bg-[#e11d48] text-white shadow-md shadow-[#e11d48]/30 scale-[1.02]'
                      : isLight ? 'bg-[#fef2f2] text-[#991b1b] hover:bg-[#fee2e2]' : 'bg-[#2a1215] text-[#ff8a80] hover:bg-[#3d181d] border border-[#ff8a80]/40'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Not Checked In / Absent ({scannerStats.absentDelegates})</span>
                </button>
              </div>

              {/* Live Search */}
              <div className="relative w-full sm:w-72">
                <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-[#8a806c]' : 'text-[#a79f8b]'}`} />
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder="Search name, roll, phone, college..."
                  className={`w-full pl-9 pr-7 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#d4a935] ${
                    isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] text-[#1c1811] placeholder-[#8a806c]' : 'bg-[#131318] border-[#2e2b22] text-[#f3ecd9] placeholder-[#5a5444]'
                  }`}
                />
                {attendeeSearch && (
                  <button
                    type="button"
                    onClick={() => setAttendeeSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#a79f8b] hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Individual Participants List */}
          {(() => {
            const allParticipants = flattenToIndividualParticipants(records);
            const filtered = allParticipants.filter(p => {
              if (attendeeFilter === 'present' && !p.isCheckedIn) return false;
              if (attendeeFilter === 'absent' && p.isCheckedIn) return false;
              if (attendeeSearch) {
                const q = attendeeSearch.trim().toLowerCase();
                const mName = (p.name || '').toLowerCase().includes(q);
                const mRoll = (p.roll || '').toLowerCase().includes(q);
                const mPhone = (p.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
                const mCollege = (p.college || '').toLowerCase().includes(q);
                const mTeam = (p.teamName || '').toLowerCase().includes(q);
                const mPass = (p.passCode || '').toLowerCase().includes(q);
                return mName || mRoll || mPhone || mCollege || mTeam || mPass;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className={`p-12 text-center rounded-2xl border border-dashed space-y-2 ${
                  isLight ? 'bg-white border-[#d8d0ba] text-[#6b6250]' : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b]'
                }`}>
                  <AlertCircle className="w-8 h-8 text-[#d4a935] mx-auto opacity-70" />
                  <h4 className="font-bold text-sm">No Delegates Found</h4>
                  <p className="text-xs">
                    {attendeeFilter === 'present'
                      ? 'No delegates have been checked in yet.'
                      : attendeeFilter === 'absent'
                      ? 'All delegates have arrived and checked in! 100% attendance.'
                      : 'No delegates match your search filter.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-2.5">
                <div className={`text-xs px-2 flex items-center justify-between font-medium ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                  <span>Showing {filtered.length} {filtered.length === 1 ? 'Individual Delegate' : 'Individual Delegates'}:</span>
                  <span className={`text-[11px] ${isLight ? 'text-[#705600]' : 'text-[#d4a935]'}`}>
                    Tap "Check In" to mark delegate present individually
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filtered.map((p, idx) => (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        p.isCheckedIn
                          ? isLight
                            ? 'bg-[#f0fdf4] border-[#86efac] shadow-sm'
                            : 'bg-gradient-to-r from-[#0d2217] to-[#091710] border-[#4cc38a]/50 shadow-md'
                          : isLight
                            ? 'bg-white border-[#d8d0ba] shadow-sm hover:border-[#b0a790]'
                            : 'bg-[#101017] border-[#242432] hover:border-[#38384d]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* S.No badge */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                            p.isCheckedIn
                              ? 'bg-[#22c55e]/20 text-[#4cc38a] border border-[#22c55e]/40'
                              : isLight ? 'bg-[#f4efe0] text-[#705600] border border-[#d4a935]/30' : 'bg-[#1a1a24] text-[#a79f8b] border border-[#2e2e3d]'
                          }`}>
                            {idx + 1}
                          </div>

                          <div className="min-w-0 space-y-1">
                            {/* Delegate Name & Role */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-serif-title font-bold text-sm truncate ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                                {p.name}
                              </span>
                              <span className={`text-[10px] font-mono px-2 py-0.2 rounded border font-semibold uppercase ${
                                p.role.includes('Lead')
                                  ? 'bg-[#d4a935]/15 text-[#d4a935] border-[#d4a935]/40'
                                  : p.role.includes('Solo')
                                  ? 'bg-[#0088d4]/15 text-[#0088d4] border-[#0088d4]/40'
                                  : 'bg-[#9fc7e8]/15 text-[#9fc7e8] border-[#9fc7e8]/40'
                              }`}>
                                {p.role}
                              </span>
                              {p.isIeeeMember && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/30 font-mono font-semibold">
                                  IEEE #{p.ieeeId}
                                </span>
                              )}
                            </div>

                            {/* Roll, Branch, Section, College */}
                            <div className={`text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5 ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                              <span className={`font-mono font-bold ${isLight ? 'text-[#1c1811]' : 'text-[#f3ecd9]'}`}>
                                {p.roll || 'Roll N/A'}
                              </span>
                              <span>·</span>
                              <span>{[p.dept, p.className, p.section ? `Sec ${p.section}` : '', p.year].filter(Boolean).join(' ')}</span>
                            </div>

                            {p.college && (
                              <div className={`text-[11px] truncate ${isLight ? 'text-[#8a806c]' : 'text-[#7e7663]'}`}>
                                🏫 {p.college}
                              </div>
                            )}

                            {/* Team name if team */}
                            {p.teamName && (
                              <div className="text-[11px] text-[#f2c14e] font-medium truncate">
                                👥 Team: {p.teamName} ({p.totalTeamMembers} delegates)
                              </div>
                            )}

                            {/* Pass Code & Contact */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#a79f8b] font-mono pt-0.5">
                              <span>Pass ID: {p.passCode}</span>
                              {p.phone && (
                                <a
                                  href={`https://wa.me/91${p.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#25d366] hover:underline flex items-center gap-1 font-sans"
                                >
                                  <MessageCircle className="w-3 h-3 text-[#25d366]" />
                                  <span>{p.phone}</span>
                                </a>
                              )}
                            </div>

                            {/* Technical and Spot Track Attendance Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                              {p.isTechRegistered ? (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                                  p.isTechAttended 
                                    ? 'bg-[#0088d4]/20 text-[#70baff] border-[#0088d4]/40 font-bold' 
                                    : 'bg-[#0088d4]/10 text-[#0088d4] border-[#0088d4]/20'
                                }`}>
                                  <Zap className="w-3 h-3 text-[#f2c14e]" />
                                  <span>{p.isTechAttended ? 'Tech: Scanned ✓' : 'Tech: Pending'}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">
                                  No Tech
                                </span>
                              )}

                              {p.isSpotRegistered ? (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                                  p.isSpotAttended 
                                    ? 'bg-[#8b5cf6]/20 text-[#c4b5fd] border-[#8b5cf6]/40 font-bold' 
                                    : 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20'
                                }`}>
                                  <Sparkles className="w-3 h-3 text-[#f2c14e]" />
                                  <span>{p.isSpotAttended ? 'Spot: Scanned ✓' : 'Spot: Pending'}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">
                                  No Spot
                                </span>
                              )}

                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                                p.isLunchCollected 
                                  ? 'bg-[#f59e0b]/20 text-[#fbbf24] border-[#f59e0b]/40 font-bold' 
                                  : 'bg-white/5 text-white/50 border-white/10'
                              }`}>
                                <Utensils className="w-3 h-3 text-[#f59e0b]" />
                                <span>{p.isLunchCollected ? 'Meal Claimed' : 'Meal Pending'}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status & Action */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {p.isCheckedIn ? (
                            <span className="text-[10px] font-bold text-[#4cc38a] bg-[#4cc38a]/15 px-2.5 py-1 rounded-lg border border-[#4cc38a]/40 flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#4cc38a]" />
                              <span>PRESENT ✓</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/15 px-2.5 py-1 rounded-lg border border-[#f59e0b]/40 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#f59e0b]" />
                              <span>ABSENT</span>
                            </span>
                          )}

                          {p.isCheckedIn && p.checkInTime && (
                            <span className={`text-[9px] font-mono ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                              {new Date(p.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5 mt-1 justify-end">
                            {/* 1-Time Tech Scan Button */}
                            {p.isTechRegistered && !p.isTechAttended && (
                              <button
                                type="button"
                                onClick={() => handleToggleMemberTech(p.record, p.memberKey, true)}
                                className="px-2 py-1 rounded-lg bg-[#0088d4]/20 hover:bg-[#0088d4]/30 text-[#006ca8] border border-[#0088d4]/40 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                title="Mark Technical Track 1-time attendance"
                              >
                                <Zap className="w-3 h-3 text-[#f2c14e]" />
                                <span>Tech Scan</span>
                              </button>
                            )}

                            {/* 1-Time Spot Scan Button */}
                            {p.isSpotRegistered && !p.isSpotAttended && (
                              <button
                                type="button"
                                onClick={() => handleToggleMemberSpot(p.record, p.memberKey, true)}
                                className="px-2 py-1 rounded-lg bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] border border-[#8b5cf6]/40 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                title="Mark Spot Track 1-time attendance"
                              >
                                <Sparkles className="w-3 h-3 text-[#f2c14e]" />
                                <span>Spot Scan</span>
                              </button>
                            )}

                            {p.isCheckedIn ? (
                              <button
                                type="button"
                                onClick={() => handleToggleMemberCheckIn(p.record, p.memberKey, false)}
                                className="px-2.5 py-1 rounded-lg bg-[#2a1215] hover:bg-[#3d181d] text-[#ff8a80] border border-[#ff8a80]/30 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Mark delegate absent"
                              >
                                Undo
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleMemberCheckIn(p.record, p.memberKey, true)}
                                className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white text-[11px] font-bold shadow transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Check In</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveRecord(p.record);
                                setMainScannerTab('scanner');
                              }}
                              className={`p-1 px-2 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                                isLight ? 'bg-[#f4efe0] hover:bg-[#ede4ce] text-[#705600] border-[#d4a935]' : 'bg-[#181820] hover:bg-[#20202c] text-[#f2c14e] border-[#d4a935]/40'
                              }`}
                              title="Inspect ticket pass and event details"
                            >
                              Inspect
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {/* ============================================================== */}
      {/* PROMINENT SCAN RESULT POPUP MODAL (STRICT 1-TIME SCAN LIMIT) */}
      {/* ============================================================== */}
      {scanResultModal && (
        <div 
          onClick={() => { setScanResultModal(null); lastScanAttemptRef.current = null; }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-7 rounded-2xl sm:rounded-3xl border shadow-2xl transition-all scale-100 cursor-default ${
            scanResultModal.type === 'already_scanned'
              ? 'bg-[#180608] border-[#ef4444] shadow-[0_0_60px_rgba(239,68,68,0.55)] text-white ring-2 ring-[#ef4444]/60'
              : scanResultModal.type === 'success'
                ? 'bg-[#06180f] border-[#22c55e] shadow-[0_0_60px_rgba(34,197,94,0.45)] text-white ring-2 ring-[#22c55e]/60'
                : 'bg-[#181306] border-[#f59e0b] shadow-[0_0_50px_rgba(245,158,11,0.4)] text-white ring-2 ring-[#f59e0b]/60'
          }`}>
            {/* Top Track & Station Indicator Badge */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3 sm:mb-4 gap-2">
              <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border font-mono truncate ${
                scanResultModal.scanTrack.includes('Reception') || scanResultModal.deskNumber === 1
                  ? 'bg-[#22c55e]/20 text-[#86efac] border-[#22c55e]/40'
                  : scanResultModal.scanTrack.includes('Technical') || scanResultModal.deskNumber === 2
                    ? 'bg-[#0088d4]/20 text-[#70baff] border-[#0088d4]/40'
                    : scanResultModal.scanTrack.includes('Food') || scanResultModal.scanTrack.includes('Lunch') || scanResultModal.deskNumber === 3
                      ? 'bg-[#f59e0b]/20 text-[#fde68a] border-[#f59e0b]/40'
                      : scanResultModal.scanTrack.includes('Spot') || scanResultModal.deskNumber === 4
                        ? 'bg-[#8b5cf6]/20 text-[#c4b5fd] border-[#8b5cf6]/40'
                        : 'bg-[#ec4899]/20 text-[#fbcfe8] border-[#ec4899]/40'
              }`}>
                {scanResultModal.scanTrack}
              </span>

              <span className="text-[10px] sm:text-[11px] text-white/60 font-mono shrink-0">
                1-TIME QR LIMIT
              </span>
            </div>

            {/* Main Alert Icon & Title */}
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                scanResultModal.type === 'already_scanned'
                  ? 'bg-[#ef4444] text-white animate-pulse shadow-[#ef4444]/40'
                  : scanResultModal.type === 'success'
                    ? 'bg-[#22c55e] text-white shadow-[#22c55e]/40'
                    : 'bg-[#f59e0b] text-[#121217] shadow-[#f59e0b]/40'
              }`}>
                {scanResultModal.type === 'already_scanned' ? (
                  <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
                ) : scanResultModal.type === 'success' ? (
                  <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
                ) : (
                  <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className={`font-serif-title text-lg sm:text-2xl font-black uppercase tracking-tight leading-tight ${
                  scanResultModal.type === 'already_scanned'
                    ? 'text-[#ff6b6b]'
                    : scanResultModal.type === 'success'
                      ? 'text-[#4ade80]'
                      : 'text-[#fbbf24]'
                }`}>
                  {scanResultModal.title}
                </h2>

                <p className="text-xs sm:text-sm text-white/90 mt-1 font-medium leading-relaxed">
                  {scanResultModal.message}
                </p>
              </div>
            </div>

            {/* Delegate Information Dossier */}
            <div className={`mt-4 sm:mt-5 p-3.5 sm:p-4 rounded-2xl border space-y-2.5 ${
              scanResultModal.type === 'already_scanned'
                ? 'bg-black/50 border-[#ef4444]/30'
                : scanResultModal.type === 'success'
                  ? 'bg-black/50 border-[#22c55e]/30'
                  : 'bg-black/50 border-[#f59e0b]/30'
            }`}>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-white/50 uppercase font-mono block">Delegate Name</span>
                  <span className="font-bold text-white text-xs sm:text-sm block truncate">{scanResultModal.delegateName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/50 uppercase font-mono block">Roll / Reg ID</span>
                  <span className="font-mono font-bold text-[#f2c14e] text-xs sm:text-sm block truncate">{scanResultModal.delegateRoll}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs pt-2 border-t border-white/10">
                {scanResultModal.delegateRole && (
                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block">Role</span>
                    <span className="font-semibold text-white/90 block truncate">{scanResultModal.delegateRole}</span>
                  </div>
                )}
                {scanResultModal.eventName && (
                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-mono block">Event Track</span>
                    <span className="font-semibold text-white/90 block truncate">{scanResultModal.eventName}</span>
                  </div>
                )}
              </div>

              {scanResultModal.scannedAt && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/60 flex items-center gap-1 text-[11px] sm:text-xs">
                    <Clock className="w-3.5 h-3.5 text-white/40" />
                    <span>{scanResultModal.type === 'already_scanned' ? 'Original Scan Time:' : 'Recorded At:'}</span>
                  </span>
                  <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded text-[11px] sm:text-xs">
                    {scanResultModal.scannedAt}
                  </span>
                </div>
              )}
            </div>

            {/* Warning Notice Banner for Already Scanned */}
            {scanResultModal.type === 'already_scanned' && (
              <div className="mt-3.5 sm:mt-4 p-2.5 sm:p-3 rounded-xl bg-[#ef4444]/20 border border-[#ef4444]/50 flex items-center gap-2 text-xs text-[#ff9999] font-semibold">
                <XCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
                <span>Zero count added. Only 1 scan allowed per QR. No other chance.</span>
              </div>
            )}

            {/* Close & Next Scan Button */}
            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                onClick={() => { setScanResultModal(null); lastScanAttemptRef.current = null; }}
                autoFocus
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  scanResultModal.type === 'already_scanned'
                    ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[#ef4444]/30'
                    : scanResultModal.type === 'success'
                      ? 'bg-[#22c55e] hover:bg-[#16a34a] text-white shadow-[#22c55e]/30'
                      : 'bg-[#f59e0b] hover:bg-[#d97706] text-[#121217] shadow-[#f59e0b]/30'
                }`}
              >
                <span>{scanResultModal.type === 'already_scanned' ? 'Acknowledge & Scan Next QR' : 'Done · Scan Next QR'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
