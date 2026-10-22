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
  Plus,
  Utensils,
  ShieldAlert
} from 'lucide-react';
import { RegistrationRecord } from './TicketPass';
import { computeDelegatesStats, getRecordTeammates, getRecordMemberCount, getRecordLunchStats } from '../utils/delegateStats';
import { EVENTS, SPOT_EVENT, ALL_EVENTS, SYMPOSIUM_CONFIG } from '../data/symposiumData';

interface AdminTicketScannerProps {
  records: RegistrationRecord[];
  onUpdateRecord: (updated: RegistrationRecord) => void;
  onViewPass?: (record: RegistrationRecord) => void;
  theme?: 'dark' | 'light';
}

export const AdminTicketScanner: React.FC<AdminTicketScannerProps> = ({
  records,
  onUpdateRecord,
  onViewPass,
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

  // Desk mode: 'checkin' for entry reception desk; 'lunch' for catering counter meal check
  const [scannerMode, setScannerMode] = useState<'checkin' | 'lunch'>('checkin');
  const [lunchAlert, setLunchAlert] = useState<{
    type: 'duplicate' | 'success' | 'info';
    message: string;
    delegateName?: string;
    delegateRoll?: string;
  } | null>(null);

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

  // Sync activeRecord if records array updates
  useEffect(() => {
    if (activeRecord) {
      const fresh = records.find(r => r.regId === activeRecord.regId);
      if (fresh) {
        setActiveRecord(fresh);
        setNotesInput(fresh.checkInNotes || '');
      }
    }
  }, [records]);

  // Start Camera
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
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
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

  // Continuous frame analysis
  const startScanLoop = () => {
    let lastScanTime = 0;

    const tick = (now: number) => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }

      // Throttle scanning to every 90ms for performance
      if (now - lastScanTime > 90) {
        lastScanTime = now;
        const video = videoRef.current;
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            handleDecodePayload(code.data);
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(tick);
    };

    scanLoopRef.current = requestAnimationFrame(tick);
  };

  // Decode scanned payload
  const handleDecodePayload = (payload: string) => {
    if (!payload || !payload.trim()) return;
    const clean = payload.trim();

    // Check if URL with passId, member index, or roll
    let targetId = clean;
    let targetMemberIndex: number | null = null;
    let targetMemberRoll: string | null = null;

    try {
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        const url = new URL(clean);
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

    // Find record in records (also searches teammate rolls and names)
    const matched = findRecord(targetId) || (targetMemberRoll ? findRecord(targetMemberRoll) : undefined);

    if (matched) {
      // Trigger scan flash
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 400);

      const matchedTeammates = getRecordTeammates(matched);
      const matchedTotalMembers = 1 + matchedTeammates.length;
      const lunchStats = getRecordLunchStats(matched);

      // Determine which specific team member is being scanned (if individual pass was presented)
      let scannedMemberKey: string | null = null;
      let scannedMemberName = matched.name;
      let scannedMemberRoll = matched.roll || matched.regId;
      let scannedMemberRole = matchedTotalMembers > 1 ? 'Lead' : 'Delegate';

      if (targetMemberIndex !== null) {
        if (targetMemberIndex === 1) {
          scannedMemberKey = 'lead';
          scannedMemberRole = matchedTotalMembers > 1 ? 'Lead (Member 1)' : 'Delegate';
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
          scannedMemberRole = matchedTotalMembers > 1 ? 'Lead (Member 1)' : 'Delegate';
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

      // Handle based on current desk station mode
      if (scannerMode === 'lunch') {
        const currentMemberStatus = { ...(matched.memberLunchStatus || {}) };
        // If older record had lunchCollected=true but empty map, backfill all as collected
        if (matched.lunchCollected && Object.keys(currentMemberStatus).length === 0) {
          currentMemberStatus['lead'] = true;
          matchedTeammates.forEach((_, i) => { currentMemberStatus[`teammate_${i}`] = true; });
        }

        // Case A: Specific team member QR was scanned
        if (scannedMemberKey) {
          const isAlreadyCollected = Boolean(currentMemberStatus[scannedMemberKey]);
          if (isAlreadyCollected) {
            // DUPLICATE MEAL CLAIM DETECTED! PREVENT DISPUTE
            playBuzzer();
            try {
              navigator.vibrate?.([200, 100, 200, 100, 200]);
            } catch (e) {}
            const claimTime = matched.lunchCollectedTime ? new Date(matched.lunchCollectedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier Today';
            setLunchAlert({
              type: 'duplicate',
              message: `DUPLICATE MEAL CLAIM! Meal tray for ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}) was already dispensed at ${claimTime}. Duplicate meal rejected.`,
              delegateName: scannedMemberName,
              delegateRoll: scannedMemberRoll
            });
          } else {
            // VALID CLAIM FOR THIS INDIVIDUAL MEMBER
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
            const updated: RegistrationRecord = {
              ...matched,
              memberLunchStatus: currentMemberStatus,
              lunchCollectedCount: newDispensed,
              lunchCollected: allCollected,
              lunchCollectedTime: now,
              lunchCollectedBy: 'Catering Counter'
            };
            onUpdateRecord(updated);
            setActiveRecord(updated);
            setLunchAlert({
              type: 'success',
              message: `1 MEAL TRAY DISPENSED ✓: Lunch token verified and meal tray dispensed for ${scannedMemberName} (${scannedMemberRoll} · ${scannedMemberRole}). [${newDispensed} of ${matchedTotalMembers} team meal trays collected].`,
              delegateName: scannedMemberName,
              delegateRoll: scannedMemberRoll
            });
          }
        } else {
          // Case B: General team pass scanned without specific member
          if (lunchStats.isFullyCollected) {
            // ALL MEALS ALREADY CLAIMED
            playBuzzer();
            try {
              navigator.vibrate?.([200, 100, 200, 100, 200]);
            } catch (e) {}
            setLunchAlert({
              type: 'duplicate',
              message: `DUPLICATE MEAL CLAIM! All ${matchedTotalMembers} lunch meal trays for team "${matched.name}" have already been collected. No tokens remaining.`,
              delegateName: matched.name,
              delegateRoll: matched.roll
            });
          } else {
            // Find first uncollected member
            let nextKey = 'lead';
            let nextName = matched.name;
            let nextRoll = matched.roll || matched.regId;
            let nextRole = matchedTotalMembers > 1 ? 'Lead' : 'Delegate';

            if (currentMemberStatus['lead']) {
              const uncollectedIdx = matchedTeammates.findIndex((_, i) => !currentMemberStatus[`teammate_${i}`]);
              if (uncollectedIdx >= 0) {
                nextKey = `teammate_${uncollectedIdx}`;
                const tMem = matchedTeammates[uncollectedIdx];
                nextName = tMem?.name || `Member ${uncollectedIdx + 2}`;
                nextRoll = tMem?.roll || `M${uncollectedIdx + 2}`;
                nextRole = `Member ${uncollectedIdx + 2}`;
              }
            }

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

            currentMemberStatus[nextKey] = true;
            const newDispensed = Object.values(currentMemberStatus).filter(Boolean).length;
            const allCollected = newDispensed >= matchedTotalMembers && matchedTotalMembers > 0;
            const now = new Date().toISOString();
            const updated: RegistrationRecord = {
              ...matched,
              memberLunchStatus: currentMemberStatus,
              lunchCollectedCount: newDispensed,
              lunchCollected: allCollected,
              lunchCollectedTime: now,
              lunchCollectedBy: 'Catering Counter'
            };
            onUpdateRecord(updated);
            setActiveRecord(updated);
            setLunchAlert({
              type: 'success',
              message: `1 MEAL TRAY DISPENSED ✓: 1 meal tray dispensed for ${nextName} (${nextRoll} · ${nextRole}). [${newDispensed} of ${matchedTotalMembers} team meal trays collected].`,
              delegateName: nextName,
              delegateRoll: nextRoll
            });
          }
        }
      } else {
        // Standard check-in desk mode
        playBeep(true);
        try {
          navigator.vibrate?.([80, 40, 80]);
        } catch (e) {}

        if (lunchStats.isFullyCollected) {
          setLunchAlert({
            type: 'info',
            message: `Food Note: All ${matchedTotalMembers} delegate lunch meal trays have been collected.`,
            delegateName: matched.name,
            delegateRoll: matched.roll
          });
        } else if (lunchStats.mealsDispensed > 0) {
          setLunchAlert({
            type: 'info',
            message: `Food Note: ${lunchStats.mealsDispensed} of ${matchedTotalMembers} meal trays collected (${lunchStats.mealsRemaining} remaining).`,
            delegateName: matched.name,
            delegateRoll: matched.roll
          });
        } else {
          setLunchAlert(null);
        }
      }

      setActiveRecord(matched);
      setNotesInput(matched.checkInNotes || '');
    } else {
      playBeep(false);
      setCameraError(`No registration found matching scanned QR: "${targetId}".`);
      setLunchAlert(null);
    }
  };

  // Flexible record finder (checks regId, sub-member passes, lead roll/phone, and all teammate rolls/phones/names)
  const findRecord = (query: string): RegistrationRecord | undefined => {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    const cleanId = q.replace(/-m\d+$/i, '');

    return records.find(r => {
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

  // Check-In Action
  const handleCheckIn = () => {
    if (!activeRecord) return;

    const now = new Date().toISOString();
    // By default, mark all registered events as attended on check-in
    const defaultAttended = Array.from(new Set([...(activeRecord.attendedEvents || []), ...(activeRecord.eventIds || [])]));

    const updated: RegistrationRecord = {
      ...activeRecord,
      checkedIn: true,
      checkInTime: now,
      checkedInBy: 'Admin Desk',
      attendedEvents: defaultAttended,
      kitIssued: true,
      checkInNotes: notesInput.trim() || activeRecord.checkInNotes
    };

    onUpdateRecord(updated);
    setActiveRecord(updated);
    setJustCheckedIn(true);
    setTimeout(() => setJustCheckedIn(false), 3000);

    // Celebratory confetti and audio
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

  // Undo Check-In
  const handleUndoCheckIn = () => {
    if (!activeRecord) return;
    if (!confirm(`Undo check-in for ${activeRecord.name} (${activeRecord.regId})?`)) return;

    const updated: RegistrationRecord = {
      ...activeRecord,
      checkedIn: false,
      checkInTime: undefined,
      checkedInBy: undefined,
      attendedEvents: [],
      kitIssued: false
    };

    onUpdateRecord(updated);
    setActiveRecord(updated);
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

    onUpdateRecord(updated);
    setActiveRecord(updated);
  };

  // Toggle Kit & Badge Issued
  const handleToggleKit = () => {
    if (!activeRecord) return;
    const updated: RegistrationRecord = {
      ...activeRecord,
      kitIssued: !activeRecord.kitIssued
    };
    onUpdateRecord(updated);
    setActiveRecord(updated);
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

    onUpdateRecord(updated);
    setActiveRecord(updated);

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

    onUpdateRecord(updated);
    setActiveRecord(updated);
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

    onUpdateRecord(updated);
    setActiveRecord(updated);
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
    onUpdateRecord(updated);
    setActiveRecord(updated);
  };

  // On-Spot Upgrade: Add Spot Events Pass (+₹100)
  const handleAddSpotPassOnSpot = () => {
    if (!activeRecord) return;
    if ((activeRecord.eventIds || []).includes('spot')) return;

    const spotBase = 100;
    const spotGst = Math.round((spotBase * (SYMPOSIUM_CONFIG.gstPercent || 5)) / 100);
    const spotTotal = spotBase + spotGst;

    if (!confirm(`Add Spot Events Pass (₹${spotTotal} incl. 5% GST) to ${activeRecord.name}'s registration?`)) return;

    const updatedEventIds = [...(activeRecord.eventIds || []), 'spot'];
    const updatedAttended = [...(activeRecord.attendedEvents || []), 'spot'];
    const updated: RegistrationRecord = {
      ...activeRecord,
      eventIds: updatedEventIds,
      subtotal: (activeRecord.subtotal || (activeRecord.totalPaid ? Math.round(activeRecord.totalPaid / 1.05) : 0)) + spotBase,
      gstAmount: (activeRecord.gstAmount || (activeRecord.totalPaid ? activeRecord.totalPaid - Math.round(activeRecord.totalPaid / 1.05) : 0)) + spotGst,
      totalPaid: (activeRecord.totalPaid || 0) + spotTotal,
      attendedEvents: updatedAttended
    };

    onUpdateRecord(updated);
    setActiveRecord(updated);
  };

  // Save Desk Notes
  const handleSaveNotes = () => {
    if (!activeRecord) return;
    const updated: RegistrationRecord = {
      ...activeRecord,
      checkInNotes: notesInput.trim()
    };
    onUpdateRecord(updated);
    setActiveRecord(updated);
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
    ? records.filter(r => {
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
  const techAttendedCount = records.filter(r => r.attendedEvents?.some(id => id !== 'spot')).length;
  const spotAttendedCount = records.filter(r => r.attendedEvents?.includes('spot')).length;
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
              Scan entry ticket QR codes from delegate phones or paper passes. Instant identity verification, welcome kit dispatch, and event attendance tracking.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
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
              <span className="hidden sm:inline">{soundEnabled ? 'Chime On' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={isScanning ? stopCamera : startCamera}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                isScanning
                  ? 'bg-[#ef4444]/20 text-[#ff8a80] border-[#ef4444]/40 hover:bg-[#ef4444]/30'
                  : 'bg-gradient-to-r from-[#d4a935] to-[#f2c14e] text-[#121217] border-transparent hover:scale-[1.02] shadow-[#f2c14e]/20'
              }`}
            >
              {isScanning ? (
                <>
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Camera</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-[#121217]" />
                  <span>Start Live Scanner</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Desk Station Mode Switcher */}
        <div className={`mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3 ${
          isLight ? 'border-[#c0d6ea]' : 'border-[#234259]/60'
        }`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#3e556e]' : 'text-[#9fc7e8]'}`}>
              Scanner Desk Mode:
            </span>
            <div className={`inline-flex rounded-xl p-1 border shadow-inner ${
              isLight ? 'bg-white border-[#c0d6ea]' : 'bg-[#09111c] border-[#1b3447]'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setScannerMode('checkin');
                  setLunchAlert(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  scannerMode === 'checkin'
                    ? 'bg-gradient-to-r from-[#0088d4] to-[#026aa6] text-white shadow'
                    : isLight ? 'text-[#3e556e] hover:text-[#1c1811]' : 'text-[#9fc7e8] hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Entry & Check-In Desk</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScannerMode('lunch');
                  setLunchAlert(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  scannerMode === 'lunch'
                    ? 'bg-gradient-to-r from-[#d97706] to-[#b45309] text-white shadow'
                    : isLight ? 'text-[#3e556e] hover:text-[#1c1811]' : 'text-[#9fc7e8] hover:text-white'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Food & Catering Counter (Lunch Token Check)</span>
              </button>
            </div>
          </div>

          <div className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
            {scannerMode === 'lunch' ? (
              <span className="text-[#f59e0b] font-semibold flex items-center gap-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-2.5 py-1 rounded-lg">
                <Utensils className="w-3.5 h-3.5" />
                <span>Catering Anti-Dispute Verification Active · Automatically prevents duplicate meal claims</span>
              </span>
            ) : (
              <span>Registration Desk Active · Badge dispatch & technical track participation</span>
            )}
          </div>
        </div>

        {/* Live Attendance Metric Cards */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t mt-4 ${
          isLight ? 'border-[#c0d6ea]' : 'border-[#234259]/60'
        }`}>
          <div className={`p-3 rounded-xl border space-y-1 ${
            isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
          }`}>
            <span className={`text-[11px] font-medium block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>Total Check-Ins</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-[#4cc38a]">{checkedInDelegates}</span>
              <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>/ {totalDelegates} ({checkedInCount}/{totalRegistrations} teams)</span>
              <span className="text-[10px] font-bold font-mono text-[#4cc38a] bg-[#4cc38a]/15 px-1.5 py-0.5 rounded ml-auto">
                {checkInPercent}%
              </span>
            </div>
            {/* Mini Progress Bar */}
            <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 ${isLight ? 'bg-[#d8e7f5]' : 'bg-[#1b2b3a]'}`}>
              <div 
                className="bg-gradient-to-r from-[#0088d4] to-[#4cc38a] h-full transition-all duration-500 rounded-full" 
                style={{ width: `${checkInPercent}%` }}
              />
            </div>
          </div>

          <div className={`p-3 rounded-xl border space-y-1 ${
            isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
          }`}>
            <span className={`text-[11px] font-medium block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>Technical Track Attended</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-[#d4a935]">{techAttendedCount}</span>
              <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>delegates</span>
            </div>
            <span className="text-[10px] text-[#d4a935] font-semibold block truncate">Track 1: Morning Sessions</span>
          </div>

          <div className={`p-3 rounded-xl border space-y-1 ${
            isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
          }`}>
            <span className={`text-[11px] font-medium block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>Spot Pass Attended</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-[#0088d4]">{spotAttendedCount}</span>
              <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>delegates</span>
            </div>
            <span className="text-[10px] text-[#0088d4] font-semibold block truncate">Track 2: Afternoon Arena</span>
          </div>

          <div className={`p-3 rounded-xl border space-y-1 ${
            isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
          }`}>
            <span className={`text-[11px] font-medium block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>Welcome Kits Issued</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-bold font-mono ${isLight ? 'text-[#1c1811]' : 'text-[#ffffff]'}`}>{kitsIssuedCount}</span>
              <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>/ {totalDelegates}</span>
            </div>
            <span className="text-[10px] text-[#4cc38a] font-semibold block truncate">Badges & Delegate Kits</span>
          </div>

          {/* 5th KPI Card: Lunch Tokens Redeemed */}
          <div className={`p-3 rounded-xl border space-y-1 ${
            isLight ? 'bg-white border-[#c8d9e8] shadow-sm' : 'bg-[#09111c] border-[#1b3447]'
          }`}>
            <span className={`text-[11px] font-medium flex items-center gap-1 block ${isLight ? 'text-[#425d78]' : 'text-[#9fc7e8]'}`}>
              <Utensils className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>Lunch Meal Trays Dispensed</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-[#f59e0b]">{lunchCollectedCount}</span>
              <span className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>/ {totalDelegates}</span>
              <span className="text-[10px] font-bold font-mono text-[#f59e0b] bg-[#f59e0b]/15 px-1.5 py-0.5 rounded ml-auto">
                {lunchPercent}%
              </span>
            </div>
            {/* Mini Progress Bar */}
            <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 ${isLight ? 'bg-[#d8e7f5]' : 'bg-[#1b2b3a]'}`}>
              <div 
                className="bg-gradient-to-r from-[#d97706] to-[#f59e0b] h-full transition-all duration-500 rounded-full" 
                style={{ width: `${lunchPercent}%` }}
              />
            </div>
          </div>
        </div>
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
                  ? '⚠️ CATERING DISPUTE ALERT: DUPLICATE MEAL CLAIM DETECTED' 
                  : lunchAlert.type === 'success' 
                    ? 'MEAL TOKEN VERIFIED & DISPENSED ✓' 
                    : 'CATERING / FOOD TOKEN STATUS'}
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

      {/* Main Two-Column Layout: Scanner & Search vs Loaded Delegate Detail */}
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
            <div className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#050507] border flex items-center justify-center transition-all ${
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

              {/* Fallback Idle State */}
              {!isScanning && (
                <div className="p-6 text-center space-y-3">
                  <div className={`w-12 h-12 rounded-2xl ${isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] text-[#d4a935]' : 'bg-[#1f1b0e] border-[#d4a935]/40 text-[#f2c14e]'} border flex items-center justify-center mx-auto shadow-inner`}>
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>Camera is Idle</h4>
                    <p className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'} mt-0.5`}>
                      Click below to activate device webcam or mobile camera.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-[#f2c14e] hover:bg-[#d4a935] text-[#121217] font-bold text-xs shadow-md transition-all hover:scale-[1.03] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Launch Camera Scanner</span>
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

              {/* CHECK-IN HERO ACTION BOX */}
              <div className={`p-5 rounded-2xl border transition-all ${
                activeRecord.checkedIn
                  ? isLight
                    ? 'bg-gradient-to-r from-[#eaf8f0] via-[#f1faf4] to-[#e4f6eb] border-[#4cc38a] shadow-md shadow-[#4cc38a]/10'
                    : 'bg-gradient-to-r from-[#0d2a1c] via-[#091f14] to-[#07170f] border-[#4cc38a] shadow-lg shadow-[#4cc38a]/10 ring-1 ring-[#4cc38a]/50'
                  : isLight
                    ? 'bg-gradient-to-r from-[#fefbf2] via-[#faf4e4] to-[#f7eed6] border-[#d4a935] shadow-md'
                    : 'bg-gradient-to-r from-[#1c1809] via-[#141006] to-[#0e0c04] border-[#d4a935] shadow-lg shadow-[#d4a935]/15'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {activeRecord.checkedIn ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-[#4cc38a]" />
                          <span className={`text-base font-bold ${isLight ? 'text-[#14532d]' : 'text-white'}`}>DELEGATE CHECKED IN</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-[#f2c14e]" />
                          <span className={`text-base font-bold ${isLight ? 'text-[#594200]' : 'text-white'}`}>READY FOR CHECK-IN</span>
                        </>
                      )}
                    </div>
                    <p className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                      {activeRecord.checkedIn
                        ? `Checked in on ${new Date(activeRecord.checkInTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${activeRecord.checkedInBy || 'Admin Desk'}).`
                        : 'Delegate has arrived at symposium venue. Verify student ID and confirm attendance.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeRecord.checkedIn ? (
                      <button
                        type="button"
                        onClick={handleUndoCheckIn}
                        className="px-3.5 py-2 rounded-xl bg-[#2a1215] hover:bg-[#3d181d] text-[#ff8a80] border border-[#ff8a80]/30 font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Undo Check-In</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCheckIn}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white font-bold text-sm shadow-xl shadow-[#16a34a]/30 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>CHECK IN DELEGATE</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Kit Issued Checkbox */}
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
                    {activeRecord.kitIssued ? 'Kit Handed Over' : 'Pending Kit'}
                  </span>
                </div>

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
              </div>

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
                  const techEvents = (activeRecord.eventIds || []).filter(id => id !== 'spot');
                  if (techEvents.length === 0) {
                    return (
                      <div className={`p-3.5 rounded-xl border text-xs ${isLight ? 'bg-[#f8f5ee] border-[#d8d0ba] text-[#6b6250]' : 'bg-[#131318] border-[#2e2b22] text-[#a79f8b]'}`}>
                        No Flagship Technical Event selected for this delegate (Spot Events Pass only).
                      </div>
                    );
                  }

                  return techEvents.map(eventId => {
                    const ev = ALL_EVENTS.find(e => e.id === eventId);
                    const isAttended = (activeRecord.attendedEvents || []).includes(eventId);
                    const team = activeRecord.teamDetails?.[eventId];
                    const teammates = team?.teamMembers || [];

                    return (
                      <div
                        key={eventId}
                        className={`p-4 rounded-xl border transition-all ${
                          isAttended
                            ? isLight
                              ? 'bg-[#f0faf4] border-[#4cc38a] shadow-sm'
                              : 'bg-[#0f1d14] border-[#4cc38a]/60 shadow-sm'
                            : isLight
                              ? 'bg-[#f8f5ee] border-[#d8d0ba]'
                              : 'bg-[#131318] border-[#2e2b22]'
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
                              {isAttended && (
                                <span className="text-[10px] font-bold text-[#4cc38a] bg-[#4cc38a]/15 px-2 py-0.5 rounded border border-[#4cc38a]/30">
                                  Attended
                                </span>
                              )}
                            </div>
                            <div className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                              Time: {ev?.time || '10:00 AM – 12:00 PM'} · Venue: {ev?.venue || 'Labs'}
                            </div>

                            {/* Team Roster if present */}
                            {team?.teamName && (
                              <div className="pt-2 text-xs">
                                <span className={`font-semibold ${isLight ? 'text-[#705600]' : 'text-[#f2c14e]'}`}>Team: {team.teamName}</span>
                                {teammates.length > 0 && (
                                  <div className={`mt-1 space-y-0.5 text-[11px] ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                                    <span className={`font-medium block ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>Teammates:</span>
                                    {teammates.map((m, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <span>• {m.name} ({m.roll || 'Roll N/A'})</span>
                                        {m.phone && <span>· Ph: {m.phone}</span>}
                                        {m.isIeeeMember && <span className="text-[#4cc38a]">· IEEE #{m.ieeeId}</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleEventAttendance(eventId)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                              isAttended
                                ? 'bg-[#1b5e39]/30 text-[#4cc38a] border-[#4cc38a]/50 hover:bg-[#1b5e39]/50'
                                : isLight
                                  ? 'bg-white hover:bg-[#ede7d8] text-[#705600] border-[#d4a935]'
                                  : 'bg-[#1f1b0e] hover:bg-[#2e2612] text-[#f2c14e] border-[#d4a935]/50'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isAttended ? 'Marked Attended' : 'Mark Attended'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* TRACK 2: SPOT EVENTS PASS */}
                {(() => {
                  const hasSpot = (activeRecord.eventIds || []).includes('spot') || (activeRecord as any).track2Event === 'spot-pass';
                  const isSpotAttended = (activeRecord.attendedEvents || []).includes('spot') || (activeRecord.attendedEvents || []).includes('spot-pass');

                  if (!hasSpot) {
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

                  return (
                    <div className={`p-4 rounded-xl border transition-all ${
                      isSpotAttended
                        ? isLight
                          ? 'bg-[#f0faf4] border-[#4cc38a] shadow-sm'
                          : 'bg-[#0f1d14] border-[#4cc38a]/60 shadow-sm'
                        : isLight
                          ? 'bg-[#edf5fc] border-[#0088d4]/40'
                          : 'bg-[#0c1824] border-[#0088d4]/40'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-serif-title font-bold text-base ${isLight ? 'text-[#1c1811]' : 'text-white'}`}>
                              Spot Events Pass (Non-Technical)
                            </span>
                            <span className="text-[10px] text-[#0088d4] bg-[#0088d4]/10 px-2 py-0.5 rounded border border-[#0088d4]/30 font-semibold">
                              Track 2 · ₹100
                            </span>
                            {isSpotAttended && (
                              <span className="text-[10px] font-bold text-[#4cc38a] bg-[#4cc38a]/15 px-2 py-0.5 rounded border border-[#4cc38a]/30">
                                Attended
                              </span>
                            )}
                          </div>
                          <div className={`text-xs ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                            Time: 01:30 PM – 03:30 PM · Venue: Central Courtyard & Seminar Halls
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleEventAttendance('spot')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            isSpotAttended
                              ? 'bg-[#1b5e39]/30 text-[#4cc38a] border-[#4cc38a]/50 hover:bg-[#1b5e39]/50'
                              : isLight
                                ? 'bg-[#0088d4]/10 hover:bg-[#0088d4]/20 text-[#006ca8] border-[#0088d4]/40'
                                : 'bg-[#0d2238] hover:bg-[#122e4d] text-[#70baff] border-[#0088d4]/50'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isSpotAttended ? 'Marked Attended' : 'Mark Spot Attended'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

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
                        (Base: ₹{activeRecord.subtotal || (activeRecord.totalPaid - activeRecord.gstAmount)} + 5% GST: ₹{activeRecord.gstAmount})
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
    </div>
  );
};
