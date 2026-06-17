import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Bot, 
  Users, 
  CalendarClock, 
  MessageSquare, 
  ClipboardList, 
  Send, 
  Trash2, 
  Plus, 
  PenTool, 
  Edit,
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  Clock, 
  X, 
  Check, 
  ArrowRight,
  Sparkles,
  Smartphone,
  Info,
  HelpCircle,
  Hash,
  Eye,
  EyeOff,
  Lock,
  Mail,
  LogOut,
  Key,
  ShieldCheck,
  Copy,
  CalendarDays,
  Cloud
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TelegramBot, TelegramGroup, MessageSchedule, MessageTemplate, SimulationLog, ScheduleRecurrence, UserAccount, UserSession } from './types';
import { INITIAL_BOTS, INITIAL_GROUPS, INITIAL_TEMPLATES, INITIAL_SCHEDULES, INITIAL_LOGS } from './initialData';

// Chart preparation logic
const prepareChartData = (logs: SimulationLog[]) => {
  const data: Record<string, { date: string; success: number; failed: number }> = {};
  
  // Initialize last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    data[dateStr] = { date: dateStr, success: 0, failed: 0 };
  }

  logs.forEach(log => {
    const logDate = new Date(log.timestamp);
    if (!isNaN(logDate.getTime())) {
      const dateStr = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (data[dateStr]) {
        if (log.deliveryStatus === 'success' || log.deliveryStatus === 'simulated') {
          data[dateStr].success += 1;
        } else if (log.deliveryStatus === 'failed') {
          data[dateStr].failed += 1;
        }
      }
    }
  });

  return Object.values(data);
};

// Helper: Custom audio feedback for notifications
const playBeep = (freq = 800, type: OscillatorType = 'sine', duration = 0.15) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.value = freq;
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Audio context not allowed or supported
  }
};

// Time conversion helper from 24h string ("HH:mm") to 12h string ("hh:mm AM/PM")
export function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return timeStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin = String(minute).padStart(2, '0');
  return `${String(displayHour).padStart(2, '0')}:${displayMin} ${ampm}`;
}

// Variable Decoder Helper
export function formatTelegramMessage(
  template: string,
  botName: string,
  groupName: string,
  memberCount: number,
  targetDate: Date = new Date()
): string {
  if (!template) return '';
  
  // Get time and date strings in English format
  const dateStrEn = targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStrEn = targetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dayStrEn = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

  // Determine English seasonal / time greetings
  const hour = targetDate.getHours();
  let greetingEn = "Hello";
  if (hour >= 5 && hour < 12) {
    greetingEn = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greetingEn = "Good afternoon";
  } else if (hour >= 17 && hour < 21) {
    greetingEn = "Good evening";
  } else {
    greetingEn = "Good night";
  }

  // Bangla payment-related dynamic calculations
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const toBanglaDigits = (num: string | number): string => {
    return num.toString().replace(/\d/g, (digit) => banglaDigits[parseInt(digit)]);
  };

  const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const dayOfMonthVal = targetDate.getDate();
  const monthVal = targetDate.getMonth(); // 0-11
  const yearVal = targetDate.getFullYear();

  const paymentMonthBangla = banglaMonths[monthVal];
  const paymentYearBangla = toBanglaDigits(yearVal);

  // Determine slot based on targetDate: day <= 20 is 1st slot, day > 20 is 2nd slot
  const isFirstSlot = dayOfMonthVal <= 20;
  const paymentSlotBangla = isFirstSlot ? '১ম স্লট' : '২য় স্লট';
  const paymentSlotBanglaLocative = isFirstSlot ? '১ম স্লটে' : '২য় স্লটে';

  // Determine deadline day:
  // 1st slot: 16th of that month
  // 2nd slot: last day of that month
  let deadlineDay = 16;
  if (!isFirstSlot) {
    const lastDayDate = new Date(yearVal, monthVal + 1, 0);
    deadlineDay = lastDayDate.getDate();
  }

  const deadlineMonthStr = (monthVal + 1).toString().padStart(2, '0');
  const deadlineYearTwoDigits = (yearVal % 100).toString().padStart(2, '0');
  const deadlineDayStr = deadlineDay.toString().padStart(2, '0');

  const paymentDeadlineEn = `${deadlineDayStr}/${deadlineMonthStr}/${deadlineYearTwoDigits}`;
  const paymentDeadlineBangla = toBanglaDigits(paymentDeadlineEn);

  return template
    .replace(/{date}/g, dateStrEn)
    .replace(/{date_en}/g, dateStrEn)
    .replace(/{time}/g, timeStrEn)
    .replace(/{time_en}/g, timeStrEn)
    .replace(/{day}/g, dayStrEn)
    .replace(/{day_en}/g, dayStrEn)
    .replace(/{group_name}/g, groupName)
    .replace(/{bot_name}/g, botName)
    .replace(/{member_count}/g, memberCount.toLocaleString('en-US'))
    .replace(/{member_count_en}/g, memberCount.toString())
    .replace(/{greeting_bangla}/g, greetingEn)
    .replace(/{greeting_english}/g, greetingEn)
    .replace(/{payment_month_bangla}/g, paymentMonthBangla)
    .replace(/{payment_year_bangla}/g, paymentYearBangla)
    .replace(/{payment_slot_bangla}/g, paymentSlotBangla)
    .replace(/{payment_slot_bangla_locative}/g, paymentSlotBanglaLocative)
    .replace(/{payment_deadline_bangla}/g, paymentDeadlineBangla);
}

export default function App() {
  // User Authentication States
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('bt_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Login/Signup form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bots' | 'groups' | 'schedules' | 'templates' | 'logs' | 'calendar'>('dashboard');

  // Persistence Helpers
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Core States
  const [bots, setBots] = useState<TelegramBot[]>(() => {
    const saved = localStorage.getItem('bt_bots');
    return saved ? JSON.parse(saved) : INITIAL_BOTS;
  });

  const [groups, setGroups] = useState<TelegramGroup[]>(() => {
    const saved = localStorage.getItem('bt_groups');
    return saved ? JSON.parse(saved) : INITIAL_GROUPS;
  });

  const [schedules, setSchedules] = useState<MessageSchedule[]>(() => {
    const saved = localStorage.getItem('bt_schedules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as MessageSchedule[];
        const hasUdvashSched1 = parsed.some(s => s.id === 'sched_payment_notice_01');
        const hasUdvashSched2 = parsed.some(s => s.id === 'sched_payment_notice_02');
        let modified = false;
        if (!hasUdvashSched1) {
          const matching = INITIAL_SCHEDULES.find(s => s.id === 'sched_payment_notice_01');
          if (matching) {
            parsed.unshift(matching);
            modified = true;
          }
        }
        if (!hasUdvashSched2) {
          const matching = INITIAL_SCHEDULES.find(s => s.id === 'sched_payment_notice_02');
          if (matching) {
            parsed.push(matching);
            modified = true;
          }
        }
        if (modified) {
          localStorage.setItem('bt_schedules', JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        return INITIAL_SCHEDULES;
      }
    }
    return INITIAL_SCHEDULES;
  });

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    const saved = localStorage.getItem('bt_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as MessageTemplate[];
        const hasUdvash = parsed.some(t => t.id === 'temp_payment_notice');
        if (!hasUdvash) {
          const udvashTemp = INITIAL_TEMPLATES.find(t => t.id === 'temp_payment_notice');
          if (udvashTemp) {
            parsed.unshift(udvashTemp);
            localStorage.setItem('bt_templates', JSON.stringify(parsed));
          }
        }
        return parsed;
      } catch (e) {
        return INITIAL_TEMPLATES;
      }
    }
    return INITIAL_TEMPLATES;
  });

  const [logs, setLogs] = useState<SimulationLog[]>(() => {
    const saved = localStorage.getItem('bt_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  // Simulator Time Control State
  const [simulatedTime, setSimulatedTime] = useState<Date>(new Date());
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1); // Speed index: 1 = real-time, 60 = 1 min per sec, 3600 = 1 hour per sec
  const [isClockHidden, setIsClockHidden] = useState<boolean>(() => {
    return localStorage.getItem('bt_clock_hidden') === 'true';
  });

  // Delivery Setting Toggle (Real Telegram Bot API vs Simulation)
  const [isRealDeliveryEnabled, setIsRealDeliveryEnabled] = useState<boolean>(() => {
    return localStorage.getItem('bt_real_delivery') === 'true';
  });

  // UI Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({
    message: '',
    type: null
  });

  // Modal / Input states
  const [showBotModal, setShowBotModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Selected object for editing
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Input bindings
  const [botForm, setBotForm] = useState({ name: '', token: '' });
  const [groupForm, setGroupForm] = useState({ name: '', chatId: '', botId: '', memberCount: 1500 });
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    botId: '',
    groupId: '',
    groupIds: [] as string[],
    messageTemplate: '',
    recurrence: 'monthly' as ScheduleRecurrence,
    dayOfMonth: 15,
    dayOfWeek: 1,
    time: '11:00'
  });
  const [templateForm, setTemplateForm] = useState({ title: '', content: '', category: 'Promotion' as any });

  // Persistent Savings
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('bt_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('bt_current_user');
    }
  }, [currentUser]);

  // Load initial dataset from backend system database
  useEffect(() => {
    const fetchFreshSystemData = async () => {
      try {
        const response = await fetch("/api/data");
        const data = await response.json();
        if (data) {
          if (data.bots && Array.isArray(data.bots)) {
            setBots(data.bots);
          }
          if (data.groups && Array.isArray(data.groups)) {
            setGroups(data.groups);
          }
          if (data.schedules && Array.isArray(data.schedules)) {
            setSchedules(data.schedules);
          }
          if (data.logs && Array.isArray(data.logs)) {
            setLogs(data.logs);
          }
          if (typeof data.isRealDeliveryEnabled === "boolean") {
            setIsRealDeliveryEnabled(data.isRealDeliveryEnabled);
          }
          setIsInitialDataLoaded(true);
        }
      } catch (error) {
        console.warn("Failed to load data from server store:", error);
        setIsInitialDataLoaded(true); // Still set to true so we can start syncing locally at least if server fails once
      }
    };
    fetchFreshSystemData();
  }, []);

  // Poll backend for real-world updates periodically (every 10 seconds) to sync server-side triggers
  useEffect(() => {
    let active = true;
    const fetchAndMergeUpdates = async () => {
      // Don't poll while the initial load is pending or if a local sync was just initiated
      if (!isInitialDataLoaded || isSyncing) return;

      try {
        const response = await fetch("/api/data");
        const data = await response.json();
        if (!active || !data) return;

        // Perform lazy updates - only if modal is not open (to avoid interrupting user edits)
        const isEditing = showBotModal || showGroupModal || showScheduleModal || showTemplateModal;
        if (isEditing) return;

        // Check for bots change
        if (data.bots && Array.isArray(data.bots)) {
          setBots(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.bots)) {
              console.log("Syncing bots from server...");
              return data.bots;
            }
            return prev;
          });
        }
        // Check for groups change
        if (data.groups && Array.isArray(data.groups)) {
          setGroups(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.groups)) {
              console.log("Syncing groups from server...");
              return data.groups;
            }
            return prev;
          });
        }
        // Check for schedules change
        if (data.schedules && Array.isArray(data.schedules)) {
          setSchedules(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.schedules)) {
              console.log("Syncing schedules from server...");
              return data.schedules;
            }
            return prev;
          });
        }
        // Check for logs change
        if (data.logs && Array.isArray(data.logs)) {
          setLogs(prev => {
            const currentFirstId = prev[0]?.id;
            const incomingFirstId = data.logs[0]?.id;
            if (prev.length !== data.logs.length || currentFirstId !== incomingFirstId) {
              console.log("Syncing logs from server...");
              return data.logs;
            }
            return prev;
          });
        }
        if (typeof data.isRealDeliveryEnabled === "boolean") {
          setIsRealDeliveryEnabled(prev => {
            return prev === data.isRealDeliveryEnabled ? prev : data.isRealDeliveryEnabled;
          });
        }
      } catch (error) {
        console.warn("Polling state sync error:", error);
      }
    };

    const pollTimer = setInterval(fetchAndMergeUpdates, 10000);
    return () => {
      active = false;
      clearInterval(pollTimer);
    };
  }, [showBotModal, showGroupModal, showScheduleModal, showTemplateModal, isInitialDataLoaded, isSyncing]);

  // Sync to database and local fallback persistent states whenever inputs change
  useEffect(() => {
    if (!isInitialDataLoaded) return;

    // Debounce the sync to avoid high frequency POSTs
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bots,
            groups,
            schedules,
            templates,
            logs,
            isRealDeliveryEnabled
          })
        });
      } catch (error) {
        console.warn("Continuous sync with server failed:", error);
      } finally {
        // Leave a small window before allowing polling again to let the server process
        setTimeout(() => setIsSyncing(false), 2000);
      }
    }, 1000);

    localStorage.setItem('bt_bots', JSON.stringify(bots));
    localStorage.setItem('bt_groups', JSON.stringify(groups));
    localStorage.setItem('bt_schedules', JSON.stringify(schedules));
    localStorage.setItem('bt_templates', JSON.stringify(templates));
    localStorage.setItem('bt_logs', JSON.stringify(logs));
    localStorage.setItem('bt_real_delivery', String(isRealDeliveryEnabled));

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [bots, groups, schedules, templates, logs, isRealDeliveryEnabled, isInitialDataLoaded]);

  // Safeguard: Inject Udvash Board Payment Notice template and schedules if not already present
  useEffect(() => {
    const hasUdvashTemplate = templates.some(t => t.id === 'temp_payment_notice');
    if (!hasUdvashTemplate) {
      const udvashTemplateObj: MessageTemplate = {
        id: 'temp_payment_notice',
        title: 'Udvash Board Payment Notice',
        category: 'Alert',
        content: `💳পেমেন্ট সংক্রান্ত নোটিশ 💳\nযে সকল পরীক্ষকগণ {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে খাতা মূল্যায়নের পেমেন্ট নিতে আগ্রহী তারা এই ফর্মটি পূরণ করুন, উক্ত ফর্মটি {payment_deadline_bangla} তারিখ রাত ০৮:০০টা পর্যন্ত পূরণ করা যাবে, ফর্ম পূরণকারী ৫০টাকার অধিক ডিউ সম্পন্ন (TIN নম্বর যাদের আছে তাদের ১০০টাকা) পরীক্ষকদের পেমেন্ট {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে প্রদান করা হবে। একটি টি-পিন এর জন্য একবার এবং সতর্কতার সাথে ফর্মটি পূরণ করার জন্য বিশেষভাবে অনুরোধ করা যাচ্ছে।\n\nবিঃদ্রঃ ফর্ম পূরণ করে মোবাইল ব্যাংকিং এর মাধ্যমে পেমেন্ট এর প্রোসেসিং এর মাঝে আমাদের ক্যাম্পাসে এসে ফিজিক্যালি পেমেন্ট না নেওয়ার জন্য বিশেষ ভাবে অনুরোধ করা যাচ্ছে।\n\nফর্ম লিংকঃ https://tinyurl.com/udvashESMPayment\n\nউদ্ভাসের খাতা মূল্যায়নের পেমেন্ট সম্পর্কে বিস্তারিত জানতেঃ https://tinyurl.com/ESMPayment`
      };
      setTemplates(prev => [udvashTemplateObj, ...prev.filter(t => t.id !== 'temp_payment_notice')]);
    }

    const hasSched1 = schedules.some(s => s.id === 'sched_payment_notice_01');
    const hasSched2 = schedules.some(s => s.id === 'sched_payment_notice_02');
    if (!hasSched1 || !hasSched2) {
      const newSchedules = [...schedules];
      if (!hasSched2) {
        newSchedules.unshift({
          id: 'sched_payment_notice_02',
          name: 'Udvash 2nd Slot (Monthly - 28th @ 10:00 AM)',
          botId: 'bot_01',
          groupId: 'group_01',
          messageTemplate: `💳পেমেন্ট সংক্রান্ত নোটিশ 💳\nযে সকল পরীক্ষকগণ {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে খাতা মূল্যায়নের পেমেন্ট নিতে আগ্রহী তারা এই ফর্মটি পূরণ করুন, উক্ত ফর্মটি {payment_deadline_bangla} তারিখ রাত ০৮:০০টা পর্যন্ত পূরণ করা যাবে, ফর্ম পূরণকারী ৫০টাকার অধিক ডিউ সম্পন্ন (TIN নম্বর যাদের আছে তাদের ১০০টাকা) পরীক্ষকদের পেমেন্ট {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে প্রদান করা হবে। একটি টি-পিন এর জন্য একবার এবং সতর্কতার সাথে ফর্মটি পূরণ করার জন্য বিশেষভাবে অনুরোধ করা যাচ্ছে।\n\nবিঃদ্রঃ ফর্ম পূরণ করে মোবাইল ব্যাংকিং এর মাধ্যমে পেমেন্ট এর প্রোসেসিং এর মাঝে আমাদের ক্যাম্পাসে এসে ফিজিক্যালি পেমেন্ট না নেওয়ার জন্য বিশেষ ভাবে অনুরোধ করা যাচ্ছে।\n\nফর্ম লিংকঃ https://tinyurl.com/udvashESMPayment\n\nউদ্ভাসের খাতা মূল্যায়নের পেমেন্ট সম্পর্কে বিস্তারিত জানতেঃ https://tinyurl.com/ESMPayment`,
          recurrence: 'monthly',
          dayOfMonth: 28,
          time: '10:00',
          status: 'active'
        });
      }
      if (!hasSched1) {
        newSchedules.unshift({
          id: 'sched_payment_notice_01',
          name: 'Udvash 1st Slot (Monthly - 14th @ 10:00 AM)',
          botId: 'bot_01',
          groupId: 'group_01',
          messageTemplate: `💳পেমেন্ট সংক্রান্ত নোটিশ 💳\nযে সকল পরীক্ষকগণ {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে খাতা মূল্যায়নের পেমেন্ট নিতে আগ্রহী তারা এই ফর্মটি পূরণ করুন, উক্ত ফর্মটি {payment_deadline_bangla} তারিখ রাত ০৮:০০টা পর্যন্ত পূরণ করা যাবে, ফর্ম পূরণকারী ৫০টাকার অধিক ডিউ সম্পন্ন (TIN নম্বর যাদের আছে তাদের ১০০টাকা) পরীক্ষকদের পেমেন্ট {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে প্রদান করা হবে। একটি টি-পিন এর জন্য একবার এবং সতর্কতার সাথে ফর্মটি পূরণ করার জন্য বিশেষভাবে অনুরোধ করা যাচ্ছে।\n\nবিঃদ্রঃ ফর্ম পূরণ করে মোবাইল ব্যাংকিং এর মাধ্যমে পেমেন্ট এর প্রোসেসিং এর মাঝে আমাদের ক্যাম্পাসে এসে ফিজিক্যালি পেমেন্ট না নেওয়ার জন্য বিশেষ ভাবে অনুরোধ করা যাচ্ছে।\n\nফর্ম লিংকঃ https://tinyurl.com/udvashESMPayment\n\nউদ্ভাসের খাতা মূল্যায়নের পেমেন্ট সম্পর্কে বিস্তারিত জানতেঃ https://tinyurl.com/ESMPayment`,
          recurrence: 'monthly',
          dayOfMonth: 14,
          time: '10:00',
          status: 'active'
        });
      }
      setSchedules(newSchedules);
    }
  }, []);

  // Toast auto-dismisser
  const triggerToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    playBeep(type === 'success' ? 950 : type === 'error' ? 450 : 700, type === 'success' ? 'sine' : 'sawtooth', 0.18);
    setTimeout(() => setToast({ message: '', type: null }), 4500);
  };

  // Automated Scheduler Engine Tick
  // Run scheduler match checks on real-world timer
  useEffect(() => {
    const timer = setInterval(() => {
      let nextTime = new Date(simulatedTime);
      
      if (!isSimPaused) {
        // Increment Simulated Clock
        // speed 1 = real timer adds 1 sec
        // speed 60 = adds 1 minute
        // speed 3600 = adds 1 hour
        const addSecs = simSpeed === 1 ? 1 : simSpeed === 60 ? 60 : 3600;
        nextTime.setSeconds(nextTime.getSeconds() + addSecs);
        setSimulatedTime(nextTime);
      } else {
        // Sync with system time when paused
        nextTime = new Date();
        setSimulatedTime(nextTime);
      }

      // Check Active Schedules for matches (Only during interactive accelerated simulations)
      // For real-time execution (1x speed or paused), the persistent server-side background engine in server.ts handles all triggers authoritatively.
      const isAcceleratedSimulation = !isSimPaused && simSpeed > 1;

      if (isAcceleratedSimulation) {
        const currentHourStr = String(nextTime.getHours()).padStart(2, '0');
        const currentMinStr = String(nextTime.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHourStr}:${currentMinStr}`;
        const currentDayOfMonth = nextTime.getDate();
        const currentDayOfWeek = nextTime.getDay(); // 0 is Sunday

        schedules.forEach(schedule => {
          if (schedule.status !== 'active') return;

          // Ensure connected Bot is active/configured
          const targetBot = bots.find(b => b.id === schedule.botId);
          if (!targetBot || targetBot.status === 'paused') return;

          // Resolve multiple target groups
          let targetGroups: TelegramGroup[] = [];
          if (schedule.groupIds && schedule.groupIds.length > 0) {
            targetGroups = schedule.groupIds
              .map(gId => groups.find(g => g.id === gId))
              .filter((g): g is TelegramGroup => !!g);
          } else if (schedule.groupId) {
            const targetGroup = groups.find(g => g.id === schedule.groupId);
            if (targetGroup) targetGroups.push(targetGroup);
          }

          if (targetGroups.length === 0) return;

          let isMatch = false;

          // Check if matching recurrence criteria at the specific minute
          if (schedule.time === currentTimeStr && nextTime.getSeconds() < (simSpeed === 1 ? 2 : 60)) {
            // Check if already sent recently inside this simulated minute to avoid double triggering
            const lastSentSim = schedule.lastSent ? new Date(schedule.lastSent) : null;
            const isRecentlySent = lastSentSim && 
              lastSentSim.getFullYear() === nextTime.getFullYear() &&
              lastSentSim.getMonth() === nextTime.getMonth() &&
              lastSentSim.getDate() === nextTime.getDate() &&
              lastSentSim.getHours() === nextTime.getHours() &&
              lastSentSim.getMinutes() === nextTime.getMinutes();

            if (!isRecentlySent) {
              if (schedule.recurrence === 'daily') {
                isMatch = true;
              } else if (schedule.recurrence === 'weekly' && schedule.dayOfWeek === currentDayOfWeek) {
                isMatch = true;
              } else if (schedule.recurrence === 'monthly' && schedule.dayOfMonth === currentDayOfMonth) {
                isMatch = true;
              } else if (schedule.recurrence === 'once') {
                isMatch = true;
              }
            }
          }

          if (isMatch) {
            targetGroups.forEach(targetGroup => {
              executeSchedule(schedule, targetBot, targetGroup, nextTime);
            });
          }
        });
      }

    }, 1000);

    return () => clearInterval(timer);
  }, [schedules, bots, groups, simulatedTime, isSimPaused, simSpeed, isRealDeliveryEnabled]);

  // Execute scheduling and perform delivery details
  const executeSchedule = async (schedule: MessageSchedule, bot: TelegramBot, group: TelegramGroup, executionTime: Date) => {
    const formattedContent = formatTelegramMessage(
      schedule.messageTemplate,
      bot.name,
      group.name,
      group.memberCount,
      executionTime
    );

    // Update schedule lastSent locally
    setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, lastSent: executionTime.toISOString() } : s));

    // Log the delivery event
    const newLogId = 'log_' + Date.now() + Math.random().toString(36).substr(2, 4);
    const newLogItem: SimulationLog = {
      id: newLogId,
      timestamp: executionTime.toLocaleString('en-US', { hour12: true }),
      type: 'info',
      botName: bot.name,
      groupName: group.name,
      message: 'Message delivery initiated...',
      actualContent: formattedContent,
      isRealDelivery: isRealDeliveryEnabled,
      deliveryStatus: 'simulated'
    };

    setLogs(prev => [newLogItem, ...prev].slice(0, 150)); // store last 150 logs

    if (isRealDeliveryEnabled && bot.token && group.chatId) {
      // Execute Real Endpoint Delivery
      try {
        const response = await fetch(`/api/telegram-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: bot.token,
            chatId: group.chatId,
            text: formattedContent,
            parseMode: 'HTML'
          })
        });

        const result = await response.json();
        if (result.ok) {
          setLogs(prev => prev.map(l => l.id === newLogId ? {
            ...l,
            type: 'success',
            message: 'Message successfully delivered to Telegram server!',
            deliveryStatus: 'success',
            telegramMessageId: result.result?.message_id,
            telegramChatId: group.chatId,
            telegramBotToken: bot.token
          } : l));
          triggerToast(`Automated message sent successfully to group '${group.name}'!`, 'success');
        } else {
          setLogs(prev => prev.map(l => l.id === newLogId ? {
            ...l,
            type: 'error',
            message: `Error: ${result.description}`,
            deliveryStatus: 'failed'
          } : l));
          triggerToast(`Failed to send message: ${result.description}`, 'error');
        }
      } catch (err: any) {
        setLogs(prev => prev.map(l => l.id === newLogId ? {
          ...l,
          type: 'error',
          message: `Connection error: ${err.message || 'Server did not respond'}`,
          deliveryStatus: 'failed'
        } : l));
        triggerToast('Telegram API is unreachable!', 'error');
      }
    } else {
      // Simulate delivery inside the UI
      setTimeout(() => {
        setLogs(prev => prev.map(l => l.id === newLogId ? {
          ...l,
          type: 'success',
          message: 'Automated simulation message processed and published successfully.',
          deliveryStatus: 'simulated'
        } : l));
        triggerToast(`[Simulation] Message delivery successful for group '${group.name}'!`, 'success');
      }, 700);
    }
  };

  // Trigger test delivery immediately for a specific schedule
  const handleTestSendNow = async (schedule: MessageSchedule) => {
    let bot = bots.find(b => b.id === schedule.botId);
    
    // Resolve target groups (can be multiple)
    let targetGroups: TelegramGroup[] = [];
    if (schedule.groupIds && schedule.groupIds.length > 0) {
      targetGroups = schedule.groupIds
        .map(gId => groups.find(g => g.id === gId))
        .filter((g): g is TelegramGroup => !!g);
    } else if (schedule.groupId) {
      const g = groups.find(g => g.id === schedule.groupId);
      if (g) targetGroups.push(g);
    }

    // Smart fallbacks
    if (!bot && bots.length > 0) {
      bot = bots.find(b => b.status === 'active') || bots[0];
    }
    
    if (targetGroups.length === 0 && groups.length > 0) {
      if (bot) {
        const fallbackGroup = groups.find(g => g.botId === bot.id) || groups[0];
        if (fallbackGroup) targetGroups.push(fallbackGroup);
      } else {
        targetGroups.push(groups[0]);
      }
    }

    if (!bot || targetGroups.length === 0) {
      triggerToast('দয়া করে প্রথমে একটি সচল বোট (Bot) ও গ্রুপ (Group) সংযুক্ত করুন অথবা সিলেক্ট করুন!', 'error');
      return;
    }

    const testTime = new Date(simulatedTime);

    // Loop through each group and trigger sending
    for (const group of targetGroups) {
      const formattedContent = formatTelegramMessage(
        schedule.messageTemplate,
        bot.name,
        group.name,
        group.memberCount,
        testTime
      );

      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const initLog: SimulationLog = {
        id: logId,
        timestamp: testTime.toLocaleString('en-US', { hour12: true }),
        type: 'info',
        botName: bot.name,
        groupName: group.name,
        message: `Manual instant transmission for '${group.name}' initiated...`,
        actualContent: formattedContent,
        isRealDelivery: isRealDeliveryEnabled,
        deliveryStatus: 'simulated'
      };

      setLogs(prev => [initLog, ...prev]);

      if (isRealDeliveryEnabled) {
        if (!bot.token || bot.token.includes('...')) {
          triggerToast('Please enter a valid real Telegram bot token!', 'error');
          setLogs(prev => prev.map(l => l.id === logId ? {
            ...l,
            type: 'error',
            message: 'Failure: Cannot send real message with an incomplete or demo bot token.'
          } : l));
          continue;
        }

        try {
          const response = await fetch(`/api/telegram-proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: bot.token,
              chatId: group.chatId,
              text: formattedContent,
              parseMode: 'HTML'
            })
          });

          const res = await response.json();
          if (res.ok) {
            setLogs(prev => prev.map(l => l.id === logId ? {
              ...l,
              type: 'success',
              message: `Manual test message delivered directly to Telegram group '${group.name}'!`,
              deliveryStatus: 'success',
              telegramMessageId: res.result?.message_id,
              telegramChatId: group.chatId,
              telegramBotToken: bot.token
            } : l));
            triggerToast(`Message successfully sent to '${group.name}'!`, 'success');
          } else {
            setLogs(prev => prev.map(l => l.id === logId ? {
              ...l,
              type: 'error',
              message: `Failure for '${group.name}': ${res.description}`,
              deliveryStatus: 'failed'
            } : l));
            triggerToast(`Error sending to '${group.name}': ${res.description}`, 'error');
          }
        } catch (e: any) {
          setLogs(prev => prev.map(l => l.id === logId ? {
            ...l,
            type: 'error',
            message: `Connection failed for '${group.name}': ${e.message}`,
            deliveryStatus: 'failed'
          } : l));
          triggerToast(`API connection error for '${group.name}'!`, 'error');
        }
      } else {
        // Simulate immediately
        setTimeout(() => {
          setLogs(prev => prev.map(l => l.id === logId ? {
            ...l,
            type: 'success',
            message: `Simulated message data processing completed successfully for group '${group.name}'.`,
            deliveryStatus: 'simulated'
          } : l));
          triggerToast(`Instant test simulation successful for '${group.name}'!`, 'success');
        }, 500);
      }
    }
  };

  const handleDeleteLogMessage = async (logId: string) => {
    const targetLog = logs.find(l => l.id === logId);
    if (!targetLog) return;
    
    if (!targetLog.telegramMessageId || !targetLog.telegramChatId || !targetLog.telegramBotToken) {
      triggerToast('No valid Telegram Message references found to delete.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/telegram-delete-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: targetLog.telegramBotToken,
          chatId: targetLog.telegramChatId,
          messageId: targetLog.telegramMessageId
        })
      });

      const data = await response.json();
      
      if (response.ok && data.ok) {
        setLogs(prev => prev.map(l => l.id === logId ? {
          ...l,
          message: l.message + ' [Deleted from Telegram]',
          actualContent: 'This message has been deleted.',
          telegramMessageId: undefined
        } : l));
        triggerToast('Message successfully deleted from Telegram.', 'success');
      } else {
        triggerToast(`Delete failed: ${data.description}`, 'error');
      }
    } catch (e: any) {
      triggerToast(`Error contacting delete service: ${e.message}`, 'error');
    }
  };

  // Authentication Handlers
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsAuthenticating(true);

    const emailLower = loginForm.email.trim().toLowerCase();
    const pwd = loginForm.password;

    if (!emailLower || !pwd) {
      setAuthError('Please fill in all requested credentials.');
      setIsAuthenticating(false);
      triggerToast('Credentials missing!', 'error');
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password: pwd })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setAuthError(data.message || 'Authentication failed. Check your email or password details.');
        setIsAuthenticating(false);
        triggerToast('Password/Email incorrect!', 'error');
        return;
      }

      const session: UserSession = {
        email: data.email,
        name: data.name,
        loginTime: new Date().toISOString()
      };
      
      setCurrentUser(session);
      setIsAuthenticating(false);
      triggerToast(`Welcome back, ${data.name}!`, 'success');
      setLoginForm({ email: '', password: '' });
    } catch (err) {
      setAuthError('Failed to communicate with authentication gateway.');
      setIsAuthenticating(false);
      triggerToast('Network error during login!', 'error');
    }
  };


  const handleLogout = () => {
    setCurrentUser(null);
    triggerToast('Logged out of system dashboard successfully.', 'info');
  };

  // Add / Edit Action Handlers
  const handleAddBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botForm.name) {
      triggerToast('Please provide a name for the bot!', 'error');
      return;
    }
    const enteredToken = botForm.token.trim();
    if (editingBotId) {
      setBots(prev => prev.map(b => b.id === editingBotId ? {
        ...b,
        name: botForm.name,
        token: enteredToken || b.token
      } : b));
      triggerToast(`Bot '${botForm.name}' has been updated!`, 'success');
      setEditingBotId(null);
    } else {
      const newBot: TelegramBot = {
        id: 'bot_' + Date.now(),
        name: botForm.name,
        token: enteredToken || 'DEMO_TOKEN_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      setBots(prev => [...prev, newBot]);
      triggerToast(`New bot '${newBot.name}' has been added!`, 'success');
    }
    setBotForm({ name: '', token: '' });
    setShowBotModal(false);
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name || !groupForm.chatId) {
      triggerToast('Please enter a group name and a valid Telegram chat ID!', 'error');
      return;
    }
    if (!groupForm.botId) {
      triggerToast('Please select a bot to control this group!', 'error');
      return;
    }
    const enteredChatId = groupForm.chatId.trim();
    const finalChatId = enteredChatId.startsWith('-') ? enteredChatId : '-' + enteredChatId;
    if (editingGroupId) {
      setGroups(prev => prev.map(g => g.id === editingGroupId ? {
        ...g,
        name: groupForm.name,
        chatId: finalChatId,
        botId: groupForm.botId,
        memberCount: Number(groupForm.memberCount) || g.memberCount
      } : g));
      triggerToast(`Group '${groupForm.name}' has been updated successfully!`, 'success');
      setEditingGroupId(null);
    } else {
      const newGroup: TelegramGroup = {
        id: 'grp_' + Date.now(),
        name: groupForm.name,
        chatId: finalChatId,
        botId: groupForm.botId,
        memberCount: Number(groupForm.memberCount) || 1200
      };
      setGroups(prev => [...prev, newGroup]);
      triggerToast(`Group '${newGroup.name}' has been connected successfully!`, 'success');
    }
    setGroupForm({ name: '', chatId: '', botId: bots[0]?.id || '', memberCount: 1500 });
    setShowGroupModal(false);
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedGroupIds = scheduleForm.groupIds?.length > 0 
      ? scheduleForm.groupIds 
      : (scheduleForm.groupId ? [scheduleForm.groupId] : []);

    if (!scheduleForm.name || !scheduleForm.botId || selectedGroupIds.length === 0 || !scheduleForm.messageTemplate) {
      triggerToast('দয়া করে শিডিউলের একটি নাম, সেন্ডার বোট, অন্তত একটি টার্গেট গ্রুপ এবং মেসেজ টেমপ্লেট নির্ধারণ করুন!', 'error');
      return;
    }

    const firstGroupId = selectedGroupIds[0] || '';

    if (editingScheduleId) {
      // Editing Mode
      setSchedules(prev => prev.map(s => s.id === editingScheduleId ? {
        ...s,
        name: scheduleForm.name,
        botId: scheduleForm.botId,
        groupId: firstGroupId,
        groupIds: selectedGroupIds,
        messageTemplate: scheduleForm.messageTemplate,
        recurrence: scheduleForm.recurrence,
        dayOfMonth: Number(scheduleForm.dayOfMonth),
        dayOfWeek: Number(scheduleForm.dayOfWeek),
        time: scheduleForm.time
      } : s));
      triggerToast('Schedule has been updated successfully!', 'success');
      setEditingScheduleId(null);
    } else {
      // Creation Mode
      const newSchedule: MessageSchedule = {
        id: 'sched_' + Date.now(),
        name: scheduleForm.name,
        botId: scheduleForm.botId,
        groupId: firstGroupId,
        groupIds: selectedGroupIds,
        messageTemplate: scheduleForm.messageTemplate,
        recurrence: scheduleForm.recurrence,
        dayOfMonth: Number(scheduleForm.dayOfMonth),
        dayOfWeek: Number(scheduleForm.dayOfWeek),
        time: scheduleForm.time,
        status: 'active'
      };
      setSchedules(prev => [...prev, newSchedule]);
      triggerToast('New auto message schedule has been added!', 'success');
    }

    setScheduleForm({
      name: '',
      botId: '',
      groupId: '',
      groupIds: [] as string[],
      messageTemplate: '',
      recurrence: 'monthly',
      dayOfMonth: 15,
      dayOfWeek: 1,
      time: '11:00'
    });
    setShowScheduleModal(false);
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.title || !templateForm.content) {
      triggerToast('Please write both a template title and content!', 'error');
      return;
    }
    const newTemplate: MessageTemplate = {
      id: 'temp_' + Date.now(),
      title: templateForm.title,
      content: templateForm.content,
      category: templateForm.category
    };
    setTemplates(prev => [newTemplate, ...prev]);
    setTemplateForm({ title: '', content: '', category: 'Promotion' });
    setShowTemplateModal(false);
    triggerToast('New message template has been saved!', 'success');
  };

  // Quick state togglers
  const toggleBotStatus = (id: string) => {
    setBots(prev => prev.map(b => b.id === id ? { ...b, status: b.status === 'active' ? 'paused' : 'active' } : b));
    const target = bots.find(b => b.id === id);
    triggerToast(`Bot '${target?.name}' status has been updated.`, 'info');
  };

  const toggleScheduleStatus = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s));
    const target = schedules.find(s => s.id === id);
    triggerToast(`Schedule '${target?.name}' status has been updated.`, 'info');
  };

  // Delete handlers
  const deleteBot = (id: string) => {
    setBots(prev => prev.filter(b => b.id !== id));
    triggerToast('Bot removed successfully!', 'info');
  };

  const deleteGroup = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    triggerToast('Group removed successfully!', 'info');
  };

  const deleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    triggerToast('Schedule deleted successfully!', 'info');
  };

  const duplicateSchedule = (sched: MessageSchedule) => {
    const newSchedule: MessageSchedule = {
      ...sched,
      id: 'sched_' + Date.now() + Math.random().toString(36).substr(2, 4),
      name: `${sched.name} (Copy)`,
      status: 'paused', // Always pause duplicates for safety
      lastSent: undefined
    };
    setSchedules(prev => [newSchedule, ...prev]);
    triggerToast('Schedule duplicated successfully!', 'success');
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    triggerToast('Template deleted successfully!', 'info');
  };

  // Load schedule for edit
  const startEditSchedule = (sched: MessageSchedule) => {
    setEditingScheduleId(sched.id);
    const botExists = bots.some(b => b.id === sched.botId);
    const groupExists = groups.some(g => g.id === sched.groupId);
    
    // Resolve existing groupIds or default to single groupId
    const resolvedGroupIds = sched.groupIds && sched.groupIds.length > 0
      ? sched.groupIds.filter(gId => groups.some(g => g.id === gId))
      : (groupExists ? [sched.groupId] : []);

    setScheduleForm({
      name: sched.name,
      botId: botExists ? sched.botId : (bots[0]?.id || ''),
      groupId: groupExists ? sched.groupId : (groups[0]?.id || ''),
      groupIds: resolvedGroupIds,
      messageTemplate: sched.messageTemplate,
      recurrence: sched.recurrence,
      dayOfMonth: sched.dayOfMonth || 15,
      dayOfWeek: sched.dayOfWeek || 1,
      time: sched.time
    });
    setShowScheduleModal(true);
  };

  // Load bot for edit
  const startEditBot = (b: TelegramBot) => {
    setEditingBotId(b.id);
    setBotForm({
      name: b.name,
      token: b.token
    });
    setShowBotModal(true);
  };

  // Load group for edit
  const startEditGroup = (g: TelegramGroup) => {
    setEditingGroupId(g.id);
    setGroupForm({
      name: g.name,
      chatId: g.chatId,
      botId: g.botId || (bots[0]?.id || ''),
      memberCount: g.memberCount
    });
    setShowGroupModal(true);
  };

  const closeBotModal = () => {
    setShowBotModal(false);
    setEditingBotId(null);
    setBotForm({ name: '', token: '' });
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setEditingGroupId(null);
    setGroupForm({ name: '', chatId: '', botId: '', memberCount: 1500 });
  };

  // Quick preset template loader into schedule form
  const applyTemplateToScheduleForm = (content: string) => {
    setScheduleForm(prev => ({ ...prev, messageTemplate: content }));
    triggerToast('Template applied to schedule!', 'success');
  };

  // Helper variables statistics
  // Helper: Format to Bangladesh Standard Time (UTC+6)
  const formatToBDTime = (dateInput?: Date | string | null) => {
    if (!dateInput) return 'Never';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    try {
      return d.toLocaleString('en-US', { 
        timeZone: 'Asia/Dhaka', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true,
        day: 'numeric',
        month: 'short'
      });
    } catch (e) {
      return d.toLocaleString();
    }
  };

  const activeBotsCount = bots.filter(b => b.status === 'active').length;
  const connectedGroupsCount = groups.length;
  const activeSchedulesCount = schedules.filter(s => s.status === 'active').length;
  const successDeliveriesCount = logs.filter(l => l.deliveryStatus === 'success' || l.deliveryStatus === 'simulated').length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden select-none">
        
        {/* Decorative background grid elements */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Toast Alert floating top-right inside login too */}
        {toast.type && (
          <div className={`absolute top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 shadow-xl border rounded ${
            toast.type === 'success' ? 'bg-emerald-55 text-emerald-950 border-emerald-300' :
            toast.type === 'error' ? 'bg-rose-55 text-rose-950 border-rose-300' :
            'bg-indigo-55 text-indigo-950 border-indigo-300'
          } transition-all duration-300 max-w-sm`}>
            {toast.type === 'success' && <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />}
            {toast.type === 'error' && <AlertCircle className="text-rose-600 shrink-0" size={18} />}
            {toast.type === 'info' && <Info className="text-indigo-600 shrink-0" size={18} />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        )}

        <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-8 relative z-10 transition-all duration-300">
          
          {/* Main Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-2xl mb-3 shadow-[0_4px_12px_rgba(79,70,229,0.35)]">
              <ShieldCheck size={26} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 uppercase leading-none">BOTCONTROL PANEL</h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-1.5">SECURE AUTHENTICATION GATEWAY</p>
          </div>

          {/* Error & Success Alert Boxes inside Card */}
          {authError && (
            <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs flex items-start gap-2 animate-fade-in font-medium">
              <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-xs flex items-start gap-2 animate-fade-in font-medium">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="e.g., example@gmail.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-200 rounded-xl pl-10 p-3 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all font-medium"
                    disabled={isAuthenticating}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">Password</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-200 rounded-xl pl-10 pr-10 p-3 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all font-medium"
                    disabled={isAuthenticating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className={`w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer uppercase ${isAuthenticating ? 'opacity-80 cursor-wait' : ''}`}
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCcw size={16} className="animate-spin" />
                    <span>Awaiting Safe Sync...</span>
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    <span>Authenticate Account</span>
                  </>
                )}
              </button>
            </form>

        </div>
        
        {/* Simple visual copyright footer */}
        <p className="text-slate-400 font-mono text-[10px] mt-6 tracking-widest uppercase">BOTCONTROL SEGMENT IDENTITY CONTROLLER</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      
      {/* Toast Alert floating top-right */}
      {toast.type && (
        <div className={`absolute top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 shadow-xl border rounded ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
          toast.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-800' :
          'bg-indigo-50 border-indigo-300 text-indigo-800'
        } transition-all duration-300 max-w-sm`}>
          {toast.type === 'success' && <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />}
          {toast.type === 'error' && <AlertCircle className="text-rose-600 shrink-0" size={20} />}
          {toast.type === 'info' && <Info className="text-indigo-600 shrink-0" size={20} />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center relative rotate-45 transform">
              <div className="w-4 h-4 bg-white rounded-full -rotate-45"></div>
            </div>
            <div>
              <span className="text-white font-extrabold tracking-tight text-xl block leading-none">BotControl</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest mt-1 block uppercase">v2.5 Global</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button 
            id="nav-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left p-3 rounded-md flex items-center gap-3 font-medium transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button 
            id="nav-bots"
            onClick={() => setActiveTab('bots')}
            className={`w-full text-left p-3 rounded-md flex items-center gap-3 font-medium transition-all ${
              activeTab === 'bots' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Bot size={18} />
            <span>Telegram Bots</span>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">{bots.length}</span>
          </button>

          <button 
            id="nav-groups"
            onClick={() => setActiveTab('groups')}
            className={`w-full text-left p-3 rounded-md flex items-center gap-3 font-medium transition-all ${
              activeTab === 'groups' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Users size={18} />
            <span>Group Management</span>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">{groups.length}</span>
          </button>

          <button 
            id="nav-schedules"
            onClick={() => setActiveTab('schedules')}
            className={`w-full text-left p-3 rounded-md flex items-center gap-3 font-medium transition-all ${
              activeTab === 'schedules' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <CalendarClock size={18} />
            <span>Automation Schedules</span>
            {activeSchedulesCount > 0 && (
              <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500 text-amber-950 animate-pulse">{activeSchedulesCount}</span>
            )}
          </button>

          <button 
            id="nav-calendar"
            onClick={() => setActiveTab('calendar')}
            className={`w-full text-left p-3 rounded-md flex items-center gap-3 font-medium transition-all ${
              activeTab === 'calendar' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <CalendarDays size={18} />
            <span>Schedule Calendar</span>
          </button>

          <button 
            id="nav-templates"
            onClick={() => setActiveTab('templates')}
            className={`w-full text-left p-3 rounded-md flex items-center gap-3 font-medium transition-all ${
              activeTab === 'templates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={18} />
            <span>Message Templates</span>
          </button>

          <button 
            id="nav-logs"
            onClick={() => setActiveTab('logs')}
            className={`w-full text-left p-3 rounded-md flex items-center gap-3 font-medium transition-all ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <ClipboardList size={18} />
            <span>Logs & Console</span>
          </button>
        </nav>

        {/* Global Delivery Toggle inside sidebar footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Real Delivery Mode</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isRealDeliveryEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
              {isRealDeliveryEnabled ? 'ACTIVE' : 'SIMULATION'}
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer w-full">
            <input 
              id="real-delivery-checkbox"
              type="checkbox" 
              checked={isRealDeliveryEnabled} 
              onChange={() => {
                setIsRealDeliveryEnabled(!isRealDeliveryEnabled);
                triggerToast(
                  !isRealDeliveryEnabled 
                    ? 'Real Telegram delivery mode enabled! Make sure to specify valid Chat IDs and Tokens.' 
                    : 'Simulated sandbox session activated.',
                  'info'
                );
              }}
              className="sr-only peer"
            />
            <div className="w-full h-8 bg-slate-800 rounded-md border border-slate-700 peer peer-checked:bg-indigo-600/20 peer-checked:border-indigo-500 flex items-center px-2 justify-between transition-all">
              <span className="text-xs text-slate-400 font-medium peer-checked:text-indigo-300">
                {isRealDeliveryEnabled ? 'Real Telegram API' : 'Simulated Sandbox'}
              </span>
              <div className={`w-4 h-4 bg-slate-500 rounded-full transition-transform ${isRealDeliveryEnabled ? 'translate-x-0 bg-indigo-400 shadow-[0_0_8px_indigo]' : ''}`}></div>
            </div>
          </label>
        </div>

        {/* Bot Status Summary */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">System Hub Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></div>
            <span className="text-sm text-slate-300 font-medium">Automation Engine Active</span>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Bot Management Automation
              <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 font-mono rounded">Pro</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            
            {/* Bangladesh Server Clock */}
            <div className="hidden md:flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg shadow-sm">
              <Clock size={14} className="text-indigo-600 animate-pulse" />
              <div className="text-left">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter block leading-none">BD Time (GMT+6)</span>
                <span className="text-xs font-bold text-indigo-700 font-mono">{formatToBDTime(simulatedTime)}</span>
              </div>
            </div>

            {/* Active User Session Avatar / Info */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pr-3 pl-3 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs uppercase shadow-xs shrink-0 select-none">
                {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div className="text-left hidden lg:block select-none">
                <span className="text-xs font-bold text-slate-800 block leading-tight">{currentUser?.name}</span>
                <span className="text-[9px] font-medium text-slate-500 font-mono block leading-none">{currentUser?.email}</span>
              </div>
              <div className="w-px h-6 bg-slate-200 mx-1 hidden lg:block"></div>
              <button 
                id="btn-header-logout"
                title="Sign out of BotControl panel"
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
              >
                <LogOut size={15} />
              </button>
            </div>

            <button 
              id="btn-header-add-automation"
              onClick={() => {
                setEditingScheduleId(null);
                setScheduleForm({
                  name: '',
                  botId: bots[0]?.id || '',
                  groupId: groups[0]?.id || '',
                  groupIds: [] as string[],
                  messageTemplate: '',
                  recurrence: 'monthly',
                  dayOfMonth: 15,
                  dayOfWeek: 1,
                  time: '11:00'
                });
                setShowScheduleModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold shadow-sm hover:bg-indigo-700 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Add New Automation</span>
            </button>
          </div>
        </header>

        {/* View Changer Wrapper */}
        <div className="flex-grow overflow-auto">
          
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div onClick={() => setActiveTab('bots')} className="cursor-pointer hover:border-indigo-600 transition-all bg-white p-5 border border-slate-200 rounded border-l-4 border-l-indigo-500 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Bots</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{activeBotsCount < 10 ? '0' + activeBotsCount : activeBotsCount} <span className="text-xs text-slate-400 font-normal">/ {bots.length}</span></p>
                  </div>
                  <Bot size={36} className="text-indigo-400 bg-indigo-50 p-1.5 rounded-full" />
                </div>

                <div onClick={() => setActiveTab('groups')} className="cursor-pointer hover:border-emerald-600 transition-all bg-white p-5 border border-slate-200 rounded border-l-4 border-l-emerald-500 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Connected Groups</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{connectedGroupsCount < 10 ? '0' + connectedGroupsCount : connectedGroupsCount}</p>
                  </div>
                  <Users size={36} className="text-emerald-400 bg-emerald-50 p-1.5 rounded-full" />
                </div>

                <div onClick={() => setActiveTab('schedules')} className="cursor-pointer hover:border-orange-600 transition-all bg-white p-5 border border-slate-200 rounded border-l-4 border-l-orange-500 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Automated Schedules</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{activeSchedulesCount < 10 ? '0' + activeSchedulesCount : activeSchedulesCount} <span className="text-xs text-slate-400 font-normal">/ {schedules.length}</span></p>
                  </div>
                  <CalendarClock size={36} className="text-orange-400 bg-orange-50 p-1.5 rounded-full" />
                </div>

                <div onClick={() => setActiveTab('logs')} className="cursor-pointer hover:border-slate-800 transition-all bg-white p-5 border border-slate-200 rounded border-l-4 border-l-slate-800 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Sent Messages</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{successDeliveriesCount < 10 ? '0' + successDeliveriesCount : successDeliveriesCount} times</p>
                  </div>
                  <CheckCircle2 size={36} className="text-slate-500 bg-slate-100 p-1.5 rounded-full" />
                </div>
              </div>

              {/* Chart Section */}
              <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
                <h3 className="font-bold text-slate-900 text-md flex items-center gap-2 mb-4">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  Message Delivery Success Metrics (Last 30 Days)
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareChartData(logs)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 10}} stroke="#94a3b8" />
                      <YAxis tick={{fontSize: 10}} stroke="#94a3b8" />
                      <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                      <Bar name="Successful / Simulated" dataKey="success" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar name="Failed Deliveries" dataKey="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Layout Content Row: Main Schedule + Variable Guide & Live Log Stream */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Current schedules section (Main Table) */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-slate-200 rounded shadow-sm flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                      <h3 className="font-bold text-slate-900 text-md flex items-center gap-2">
                        <CalendarClock className="text-indigo-600" size={18} />
                        Automation Scheduler Routine
                      </h3>
                      <button onClick={() => setActiveTab('schedules')} className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1">
                        View All Schedules <ArrowRight size={12} />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/60 uppercase text-[10px] text-slate-500 font-bold tracking-wider border-b border-slate-200">
                            <th className="p-4">Bot & Group</th>
                            <th className="p-4">Message Preview</th>
                            <th className="p-4">Schedule/Recurrence</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {schedules.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400">
                                No automation schedules or message routines are configured.
                              </td>
                            </tr>
                          ) : (
                            schedules.slice(0, 3).map(schedule => {
                              const targetGroups: TelegramGroup[] = [];
                              if (schedule.groupIds && schedule.groupIds.length > 0) {
                                schedule.groupIds.forEach(gId => {
                                  const g = groups.find(x => x.id === gId);
                                  if (g) targetGroups.push(g);
                                });
                              } else if (schedule.groupId) {
                                const g = groups.find(x => x.id === schedule.groupId);
                                if (g) targetGroups.push(g);
                              }
                              const bot = bots.find(b => b.id === schedule.botId);
                              const groupNames = targetGroups.map(g => g.name).join(', ') || 'No groups linked';
                              return (
                                <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4">
                                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <Bot size={13} className="text-indigo-500" />
                                      {bot?.name || 'Unknown Bot'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                      <Users size={11} className="text-slate-400" />
                                      Groups: {groupNames}
                                    </p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-xs text-slate-600 font-medium italic break-words line-clamp-2 max-w-xs">{schedule.messageTemplate}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded inline-block">
                                      {formatTimeTo12Hour(schedule.time)}
                                    </p>
                                    <div className="text-[10px] text-indigo-600 font-bold uppercase mt-1">
                                      {schedule.recurrence === 'monthly' && `Every month on day ${schedule.dayOfMonth}`}
                                      {schedule.recurrence === 'weekly' && `Weekly on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.dayOfWeek || 0]}`}
                                      {schedule.recurrence === 'daily' && 'Daily auto-transmit'}
                                      {schedule.recurrence === 'once' && `Once: Month Day ${schedule.dayOfMonth || '?'}`}
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${schedule.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {schedule.status === 'active' ? 'Active' : 'Paused'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <button 
                                      id={`btn-dashboard-test-now-${schedule.id}`}
                                      onClick={() => handleTestSendNow(schedule)}
                                      className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 rounded transition-all cursor-pointer flex items-center gap-1 mx-auto"
                                    >
                                      <Send size={11} /> Send Now
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Smart Info Box - Customizing features explanation */}
                  <div className="bg-slate-900 text-white rounded p-6 shadow-sm relative overflow-hidden flex flex-col xl:flex-row gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Sparkles size={20} className="animate-pulse" />
                        <h4 className="text-md font-bold uppercase tracking-wider">Dynamic Variables Guide</h4>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                        By including these special dynamic variables in your template content, the system will automatically inject current scheduled values such as date, time, group name, or situational greetings.
                      </p>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                        <div className="bg-slate-800 p-2 border border-slate-700 rounded text-center">
                          <code className="text-xs text-indigo-300 font-mono font-bold block">{`{date}`}</code>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Formatted Date</span>
                        </div>
                        <div className="bg-slate-800 p-2 border border-slate-700 rounded text-center">
                          <code className="text-xs text-indigo-300 font-mono font-bold block">{`{time}`}</code>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Formatted Time</span>
                        </div>
                        <div className="bg-slate-800 p-2 border border-slate-700 rounded text-center">
                          <code className="text-xs text-indigo-300 font-mono font-bold block">{`{group_name}`}</code>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Group Name</span>
                        </div>
                        <div className="bg-slate-800 p-2 border border-slate-700 rounded text-center">
                          <code className="text-xs text-indigo-300 font-mono font-bold block">{`{greeting_english}`}</code>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Time Greeting</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t xl:border-t-0 xl:border-l border-slate-800 pt-4 xl:pt-0 xl:pl-6 space-y-3 flex-1">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Smartphone size={20} />
                        <h4 className="text-md font-bold uppercase tracking-wider">পেমেন্ট সংক্রান্ত ডাইনামিক ভেরিয়েবল</h4>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                        মোবাইল ব্যাংকিং খাতা মূল্যায়ন বা উদ্ভাস (Udvash) পেমেন্ট নোটিশ অটোমেশনের জন্য বিশেষ বাংলা ভেরিয়েবল যা তারিখ অনুযায়ী স্বয়ংক্রিয়ভাবে স্লট, মাস ও ডেডলাইন সেট করে দেয়:
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        <div className="bg-slate-800/80 p-2 border border-slate-700 rounded">
                          <code className="text-emerald-300 font-bold block">{`{payment_month_bangla}`}</code>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{`মাস (যেমন: জুন, জুলাই)`}</span>
                        </div>
                        <div className="bg-slate-800/80 p-2 border border-slate-700 rounded">
                          <code className="text-emerald-300 font-bold block">{`{payment_year_bangla}`}</code>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{`বছর (যেমন: ২০২৬)`}</span>
                        </div>
                        <div className="bg-slate-800/80 p-2 border border-slate-700 rounded">
                          <code className="text-emerald-300 font-bold block">{`{payment_slot_bangla_locative}`}</code>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{`স্লট (১ম স্লটে / ২য় স্লটে)`}</span>
                        </div>
                        <div className="bg-slate-800/80 p-2 border border-slate-700 rounded">
                          <code className="text-emerald-300 font-bold block">{`{payment_deadline_bangla}`}</code>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{`ডেডলাইন (যেমন: ১৬/০৬/২৬ বা ৩০/০৬/২৬)`}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Cloud size={18} className="text-indigo-600" />
                      <h4 className="font-bold text-sm uppercase tracking-wide">Sync Management</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Push your local schedules, bots, and group configurations to the Render production server manually.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            const res = await axios.post('/api/data', {
                              bots, groups, schedules, templates, logs, isRealDeliveryEnabled
                            });
                            if (res.data.ok) {
                              triggerToast('Production data pushed successfully!', 'success');
                            }
                          } catch (e: any) {
                            const msg = e.response?.data?.message || 'Push failed. Check server logs.';
                            triggerToast(msg, 'error');
                          }
                        }}
                        className="py-2.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <RefreshCcw size={14} />
                        Push to Prod
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            const res = await axios.get('/api/sync-pull');
                            if (res.data.ok) {
                              triggerToast('Data pulled from Render successfully!', 'success');
                              // Reload data from local server
                              const updatedRes = await fetch("/api/data");
                              const data = await updatedRes.json();
                              if (data) {
                                setBots(data.bots || []);
                                setGroups(data.groups || []);
                                setSchedules(data.schedules || []);
                                setLogs(data.logs || []);
                                setIsRealDeliveryEnabled(!!data.isRealDeliveryEnabled);
                              }
                            }
                          } catch (e: any) {
                            const msg = e.response?.data?.message || 'Pull failed. Check server logs.';
                            triggerToast(msg, 'error');
                          }
                        }}
                        className="py-2.5 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Cloud size={14} />
                        Fetch from Prod
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right sidebar: Live logs stream */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded p-6 flex flex-col h-[480px] shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide text-xs">
                        <ClipboardList size={14} className="text-indigo-600" />
                        Real-Time Live Logs
                      </h4>
                      <button 
                        onClick={() => {
                          setLogs(INITIAL_LOGS);
                          triggerToast('Demo server logs state reset successfully.', 'info');
                        }}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                      >
                        <RefreshCcw size={12} /> Reset
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs text-slate-600 pr-1 select-none">
                      {logs.length === 0 ? (
                        <p className="text-slate-400 p-4 text-center">No transmission events detected in system log.</p>
                      ) : (
                        logs.map(log => (
                          <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded leading-relaxed text-[11px] relative group">
                            <div className="flex items-center justify-between mb-1 text-[10px]">
                              <span className="text-slate-400 font-bold">{log.timestamp}</span>
                              <span className={`px-1 rounded font-bold uppercase ${
                                log.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                log.type === 'error' ? 'bg-rose-100 text-rose-700' :
                                'bg-indigo-100 text-indigo-700'
                              }`}>
                                {log.deliveryStatus}
                              </span>
                            </div>
                            <p className="text-slate-800 pr-6"><span className="font-bold text-indigo-600">[{log.botName}]</span> {log.message}</p>
                            {log.actualContent && (
                              <p className="mt-1 bg-white p-2 rounded text-slate-500 italic text-[10px] break-words line-clamp-3 pr-6">
                                Message Sent: {log.actualContent}
                              </p>
                            )}
                            {log.telegramMessageId && (
                              <button
                                onClick={() => handleDeleteLogMessage(log.id)}
                                className="absolute right-3 bottom-3 p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete from Telegram"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: TELEGRAM BOTS VIEW */}
          {activeTab === 'bots' && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between bg-white p-6 border border-slate-200 rounded shadow-xs">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Telegram Bot Accounts</h3>
                  <p className="text-sm text-slate-500 mt-1">List of active Telegram bots managed by this control panel and their API connection status</p>
                </div>
                <button 
                  id="btn-add-new-bot-modal"
                  onClick={() => {
                    setBotForm({ name: '', token: '' });
                    setShowBotModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={16} /> Add New Bot
                </button>
              </div>

              {/* Grid lists of bots */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {bots.length === 0 ? (
                  <div className="col-span-full bg-white p-12 text-center text-slate-400 border border-slate-200 rounded">
                    <Bot size={48} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-lg text-slate-500">No Telegram bots found!</p>
                    <p className="text-sm text-slate-400 mt-1">To schedule messages, first click the button above to register a custom Telegram bot.</p>
                  </div>
                ) : (
                  bots.map(bot => {
                    // count groups of this bot
                    const botGroupsCount = groups.filter(g => g.botId === bot.id).length;
                    return (
                      <div key={bot.id} className="bg-white border border-slate-200 rounded shadow-xs p-6 flex flex-col justify-between hover:border-indigo-400 transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                <Bot size={22} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-md">{bot.name}</h4>
                                <span className="text-[10px] text-slate-400 font-mono">Created: {new Date(bot.createdAt).toLocaleDateString('bn-BD')}</span>
                              </div>
                            </div>

                            <button 
                              onClick={() => toggleBotStatus(bot.id)}
                              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                                bot.status === 'active' 
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                  : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              }`}
                            >
                              {bot.status === 'active' ? 'Active' : 'Paused'}
                            </button>
                          </div>

                          <div className="space-y-2 border-t border-slate-100 pt-4 mb-5">
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Bot API Token</span>
                              <span className="font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 max-w-[150px] truncate">{bot.token}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Connected Groups</span>
                              <span className="font-bold text-slate-800">{botGroupsCount} groups</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 pt-4 gap-2">
                          <span className="text-xs text-slate-400">ID: {bot.id.substr(0, 8)}</span>
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => startEditBot(bot)}
                              className="p-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 border border-indigo-100 bg-indigo-50 rounded transition-all flex items-center gap-1 text-xs cursor-pointer inline-flex"
                            >
                              <Edit size={13} /> Edit
                            </button>
                            <button 
                              onClick={() => deleteBot(bot.id)}
                              className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-500 border border-rose-100 bg-rose-50 rounded transition-all flex items-center gap-1 text-xs cursor-pointer inline-flex"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GROUP MANAGEMENT VIEW */}
          {activeTab === 'groups' && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between bg-white p-6 border border-slate-200 rounded shadow-xs">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Telegram Groups</h3>
                  <p className="text-sm text-slate-500 mt-1">Telegram chat groups connected to various management bots managed in the server directory</p>
                </div>
                <button 
                  id="btn-add-new-group-modal"
                  onClick={() => {
                    if (bots.length === 0) {
                      triggerToast('Please add at least one active Telegram bot before connecting a group!', 'error');
                      return;
                    }
                    setGroupForm({ name: '', chatId: '', botId: bots[0]?.id || '', memberCount: 1500 });
                    setShowGroupModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={16} /> Connect Group
                </button>
              </div>

              {/* Group table list */}
              <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h4 className="font-bold text-slate-800 text-md">Group Directory</h4>
                  <span className="text-xs bg-slate-200 text-slate-700 border border-slate-300 font-bold px-2 py-0.5 rounded">{groups.length} active groups</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 uppercase text-[10px] text-slate-500 font-bold tracking-wider border-b border-slate-200">
                        <th className="p-4">Group Name & Members</th>
                        <th className="p-4">Telegram Chat ID</th>
                        <th className="p-4">Associated Management Bot</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groups.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-400">
                            No Telegram groups connected.
                          </td>
                        </tr>
                      ) : (
                        groups.map(group => {
                          const connectedBot = bots.find(b => b.id === group.botId);
                          return (
                            <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-slate-900">{group.name}</p>
                                <span className="text-xs text-slate-500 inline-flex items-center gap-1 mt-1 font-mono">
                                  <Users size={12} /> {group.memberCount.toLocaleString()} members
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200 text-xs font-semibold">{group.chatId}</span>
                              </td>
                              <td className="p-4">
                                {connectedBot ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 font-bold px-2.5 py-1 rounded">
                                    <Bot size={13} /> {connectedBot.name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded font-bold">Bot Removed</span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded">Ready</span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button 
                                    onClick={() => startEditGroup(group)}
                                    className="text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 bg-indigo-50 p-1.5 rounded transition-all cursor-pointer inline-flex items-center gap-1 text-xs font-bold"
                                  >
                                    <Edit size={13} /> Edit
                                  </button>
                                  <button 
                                    onClick={() => deleteGroup(group.id)}
                                    className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 bg-rose-50 p-1.5 rounded transition-all cursor-pointer inline-flex items-center gap-1 text-xs font-bold"
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: AUTOMATION SCHEDULE MANAGEMENT VIEW */}
          {activeTab === 'schedules' && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              {/* Top Banner Control */}
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 border border-slate-200 rounded shadow-xs gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Broadcast Schedules</h3>
                  <p className="text-sm text-slate-500 mt-1">Configure daily, weekly, or monthly message broadcasts to groups automatically</p>
                </div>
                <button 
                  id="btn-add-schedule-inside-schedule-tab"
                  onClick={() => {
                    setEditingScheduleId(null);
                    setScheduleForm({
                      name: '',
                      botId: bots[0]?.id || '',
                      groupId: groups[0]?.id || '',
                      groupIds: [] as string[],
                      messageTemplate: '',
                      recurrence: 'monthly',
                      dayOfMonth: 15,
                      dayOfWeek: 1,
                      time: '11:00'
                    });
                    setShowScheduleModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={16} /> Create Schedule
                </button>
              </div>

              {/* Schedules detailed rows */}
              <div className="space-y-4">
                {schedules.length === 0 ? (
                  <div className="bg-white p-12 text-center text-slate-400 border border-slate-200 rounded">
                    <CalendarClock size={48} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-lg text-slate-500">No automation schedules created yet!</p>
                    <p className="text-sm text-slate-400 mt-1">Click the button above to quickly schedule automated group messages based on dates & times.</p>
                  </div>
                ) : (
                  schedules.map(schedule => {
                    const targetGroups: TelegramGroup[] = [];
                    if (schedule.groupIds && schedule.groupIds.length > 0) {
                      schedule.groupIds.forEach(gId => {
                        const g = groups.find(x => x.id === gId);
                        if (g) targetGroups.push(g);
                      });
                    } else if (schedule.groupId) {
                      const g = groups.find(x => x.id === schedule.groupId);
                      if (g) targetGroups.push(g);
                    }
                    const bot = bots.find(b => b.id === schedule.botId);
                    return (
                      <div key={schedule.id} className="bg-white border border-slate-200 rounded p-6 shadow-xs hover:border-indigo-400 transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          {/* Schedule title and linked nodes */}
                          <div className="space-y-1 fle-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-bold text-slate-900">{schedule.name}</h4>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${schedule.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                {schedule.status === 'active' ? 'Active' : 'Paused'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs">
                              <span className="flex items-center gap-1 leading-none">
                                <Bot size={13} className="text-indigo-500" />
                                {bot?.name || 'No Bot Linked'}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="flex items-center gap-1 leading-none">
                                <Users size={13} className="text-emerald-500" />
                                Groups: {targetGroups.map(g => `${g.name} (${g.chatId})`).join(', ') || 'No Groups Linked'}
                              </span>
                            </div>
                          </div>

                          {/* Recurrence timeline */}
                          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                            <div className="bg-slate-50 border border-slate-200 rounded px-4 py-2 font-mono text-xs font-bold shrink-0 text-slate-800">
                              <span className="text-slate-400 font-semibold block uppercase text-[8px] tracking-wider mb-0.5">Recurrence Rule</span>
                              {schedule.recurrence === 'monthly' && `Day ${schedule.dayOfMonth} @ ${formatTimeTo12Hour(schedule.time)}`}
                              {schedule.recurrence === 'weekly' && `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.dayOfWeek || 0]} @ ${formatTimeTo12Hour(schedule.time)}`}
                              {schedule.recurrence === 'daily' && `Daily @ ${formatTimeTo12Hour(schedule.time)}`}
                              {schedule.recurrence === 'once' && `On Day ${schedule.dayOfMonth} Once @ ${formatTimeTo12Hour(schedule.time)}`}
                            </div>

                            <div className="flex gap-2">
                              <button 
                                id={`btn-test-send-schedule-${schedule.id}`}
                                onClick={() => handleTestSendNow(schedule)}
                                className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 rounded transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Send size={11} /> Send Now
                              </button>
                              
                              <button 
                                onClick={() => toggleScheduleStatus(schedule.id)}
                                className={`px-3 py-1.5 text-xs font-bold rounded border cursor-pointer transition-all ${
                                  schedule.status === 'active' 
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                {schedule.status === 'active' ? 'Pause' : 'Resume'}
                              </button>

                              <button 
                                id={`btn-edit-schedule-${schedule.id}`}
                                onClick={() => startEditSchedule(schedule)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-white bg-slate-50 hover:bg-slate-700 border border-slate-200 rounded transition-all cursor-pointer"
                              >
                                Edit
                              </button>

                              <button 
                                onClick={() => duplicateSchedule(schedule)}
                                className="p-1.5 text-slate-500 hover:text-white bg-slate-50 hover:bg-slate-600 rounded border border-slate-200 cursor-pointer transition-all"
                                title="Duplicate Schedule"
                              >
                                <Copy size={13} />
                              </button>

                              <button 
                                onClick={() => deleteSchedule(schedule.id)}
                                className="p-1.5 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-600 rounded border border-rose-100 cursor-pointer transition-all"
                                title="Delete Schedule"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Message box preview */}
                        <div className="mt-4 bg-slate-50/50 rounded border border-slate-150 p-4 relative">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Message Content Template</span>
                          <p className="text-xs text-slate-700 break-words font-mono whitespace-pre-wrap">{schedule.messageTemplate}</p>
                          
                          <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-3">
                            <span className="text-[10px] text-slate-400">Server Last Transmit: {formatToBDTime(schedule.lastSent)}</span>
                            <div className="flex gap-2">
                              <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">{schedule.recurrence.toUpperCase()}</span>
                              {schedule.status === 'active' && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: MESSAGE TEMPLATES VIEW */}
          {activeTab === 'templates' && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between bg-white p-6 border border-slate-200 rounded shadow-xs">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Message Templates Library</h3>
                  <p className="text-sm text-slate-500 mt-1">Save frequently used message templates with customization placeholders to easily load them when organizing broadcasts.</p>
                </div>
                <button 
                  id="btn-add-new-template"
                  onClick={() => {
                    setTemplateForm({ title: '', content: '', category: 'Promotion' });
                    setShowTemplateModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={16} /> Save New Template
                </button>
              </div>

              {/* Dynamic Instant Previewer Widget */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Lists of saved templates */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(temp => (
                      <div key={temp.id} className="bg-white border border-slate-200 rounded p-5 shadow-xs flex flex-col justify-between hover:border-indigo-400 transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">{temp.category}</span>
                            <button 
                              onClick={() => deleteTemplate(temp.id)}
                              className="text-slate-400 hover:text-rose-500 transition-colors"
                              title="Delete template"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          
                          <h4 className="font-bold text-slate-900 text-sm mb-2">{temp.title}</h4>
                          <p className="text-xs text-slate-600 whitespace-pre-wrap font-mono line-clamp-5 leading-relaxed">{temp.content}</p>
                        </div>

                        <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center bg-slate-50 -mx-5 -mb-5 px-5 py-2.5 rounded-b">
                          <span className="text-[10px] text-slate-400">ID: {temp.id}</span>
                          <button 
                            id={`btn-apply-template-${temp.id}`}
                            onClick={() => applyTemplateToScheduleForm(temp.content)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <PenTool size={11} /> Apply to Schedule
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side live interactive template visualizer (Telegram Preview) */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded p-6 shadow-sm flex flex-col">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                      <Smartphone size={14} className="text-indigo-600" />
                      Live Telegram Preview
                    </h4>

                    <div className="space-y-4">
                      <p className="text-xs text-slate-500">Check real-time previews of how scheduled template variables resolve from a user-end handset perspective:</p>
                      
                      <div className="space-y-3 bg-slate-200/50 p-4 rounded-lg border border-slate-300 h-[320px] flex flex-col justify-end">
                        {/* Telegram Header decoration */}
                        <div className="bg-indigo-600 text-white rounded-t-lg -mx-4 -mt-4 p-3 flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 font-bold leading-none text-[6px] pl-0.5 text-slate-900">100</div>
                          <span className="text-[11px] font-bold font-mono tracking-tight text-white ml-2">Telegram App Terminal</span>
                        </div>

                        {/* Telegram Bubble Chat Content */}
                        <div className="flex-1 overflow-y-auto space-y-3 pt-3 flex flex-col justify-end pr-1 transition-all">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm leading-none">
                              OB
                            </div>
                            
                            <div className="bg-white text-slate-800 rounded-lg p-3 shadow-md text-xs relative max-w-[85%] border border-slate-100">
                              <span className="text-[10px] font-bold text-indigo-600 block mb-1">OfferBot_01 (Bot)</span>
                              
                              <p className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-700">
                                {templates[0] ? formatTelegramMessage(
                                  templates[0].content,
                                  'OfferBot_01',
                                  'Tech Community BD',
                                  4520,
                                  simulatedTime
                                ) : 'No template available.'}
                              </p>
                              
                              <span className="text-[9px] text-slate-400 font-mono text-right block mt-2">
                                {simulatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="h-0.5 bg-slate-300"></div>
                        <div className="text-[9px] text-slate-500 font-bold tracking-tight text-center">
                          * Dynamic template tags are resolving live in real-time.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: SERVER LOGS VIEW */}
          {activeTab === 'logs' && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
              <div className="bg-white p-6 border border-slate-200 rounded shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Message Delivery & System Logs</h3>
                  <p className="text-sm text-slate-500 mt-1">Monitor server delivery events, custom automated broadcast responses, and connection statuses live.</p>
                </div>
                <button 
                  onClick={() => {
                    setLogs([]);
                    triggerToast('Demo server logs cleared successfully.', 'success');
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 size={16} /> Clear All Logs
                </button>
              </div>

              {/* Logs display view */}
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded shadow bg-radial-gradient flex flex-col font-mono text-xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 p-4 mb-2 text-slate-400 shrink-0">
                  <span className="font-bold flex items-center gap-2"><ClipboardList size={16} className="text-indigo-400" /> SYSTEM CONSOLE LOG STREAM</span>
                  <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 border border-slate-700 rounded select-none">ONLINE PORT: 3000</span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto p-4 pt-2 text-slate-300 custom-scrollbar">
                  {logs.length === 0 ? (
                    <p className="text-center text-slate-500 py-12 select-none">No entries recorded in transmission history.</p>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="border-b border-slate-800/60 pb-3 text-[11px] leading-relaxed relative group">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                          <span className="font-bold text-slate-500">TIMESTAMP: {log.timestamp.includes('AM') || log.timestamp.includes('PM') ? log.timestamp : formatToBDTime(log.timestamp)}</span>
                          <span className={`px-2 py-0.5 rounded font-extrabold uppercase text-[9px] ${
                            log.type === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                            log.type === 'error' ? 'bg-rose-950 text-rose-400 border border-rose-800/40' :
                            'bg-indigo-950 text-indigo-400'
                          }`}>
                            {log.deliveryStatus.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-slate-200 pr-10">
                          <span className="text-indigo-400 font-semibold">[BOT: {log.botName}]</span> {log.message}
                        </p>
                        {log.actualContent && (
                          <div className="mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded text-slate-400 break-words whitespace-pre-wrap pr-10">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Parsed Message Content:</span>
                            {log.actualContent}
                          </div>
                        )}
                        {log.telegramMessageId && (
                          <button
                            onClick={() => handleDeleteLogMessage(log.id)}
                            className="absolute right-0 bottom-4 p-2 bg-rose-950 text-rose-400 hover:bg-rose-900 border border-rose-900 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete from Telegram"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CALENDAR VIEW */}
          {activeTab === 'calendar' && (() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth(); // 0-11
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0-6 (Sun-Sat)

            const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            
            // Map schedules to days
            const schedsByDay = days.map(day => {
              const d = new Date(year, month, day);
              const dayOfWeek = d.getDay();
              const dayScheds = schedules.filter(sched => {
                if (sched.status !== 'active') return false;
                if (sched.recurrence === 'daily') return true;
                if (sched.recurrence === 'weekly' && sched.dayOfWeek === dayOfWeek) return true;
                if (sched.recurrence === 'monthly' && sched.dayOfMonth === day) return true;
                if (sched.recurrence === 'once' && day === now.getDate()) return true;
                return false;
              });
              return { day, scheds: dayScheds };
            });

            return (
              <div className="p-8 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
                 <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      <CalendarDays size={24} className="text-indigo-600" /> 
                      Schedule Calendar
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                      Monthly overview of your active automation broadcasts.
                    </p>
                  </div>
                  <div className="text-xl font-bold text-slate-800 px-4 py-2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                    {monthName}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex-1 flex flex-col min-h-[500px]">
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 relative shrink-0">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="p-3 text-center text-xs font-bold text-slate-600 uppercase">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(100px,1fr)] bg-slate-200 gap-[1px]">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="bg-slate-50/50" />
                    ))}
                    {schedsByDay.map(({ day, scheds }) => (
                      <div key={day} className={`bg-white p-2 min-h-[100px] flex flex-col ${day === now.getDate() ? 'bg-indigo-50/20' : ''}`}>
                        <div className={`text-xs font-bold w-6 h-6 flex flex-col items-center justify-center rounded-full mb-1 shrink-0 ${
                          day === now.getDate() ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-1 mt-1 overflow-y-auto flex-1 custom-scrollbar pr-1">
                           {scheds.map((s, idx) => (
                             <div key={`${s.id}-${day}-${idx}`} className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 p-1.5 rounded truncate cursor-help" title={`${s.name} @ ${s.time}`}>
                               <span className="text-indigo-600 font-bold">{s.time}</span> {s.name}
                             </div>
                           ))}
                        </div>
                      </div>
                    ))}
                    {Array.from({ length: (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7 }).map((_, i) => (
                      <div key={`empty-end-${i}`} className="bg-slate-50/50" />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </main>

      {/* ============================================================== */}
      {/* MODALS INLINE OVERLAYS FOR CLEAN THEMATIC EXPERIENCE */}
      {/* ============================================================== */}

      {/* MODAL 1: ADD/EDIT BOT MODAL */}
      {showBotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 transition-opacity p-4">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-md flex items-center gap-2">
                <Bot size={18} className="text-indigo-400" /> {editingBotId ? 'Edit Telegram Bot Setting' : 'Add New Telegram Bot'}
              </h3>
              <button onClick={closeBotModal} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddBot} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Custom Bot Name *</label>
                <input 
                  id="bot-name-input"
                  type="text" 
                  required
                  placeholder="e.g., BD_Offer_Alert_Bot"
                  value={botForm.name}
                  onChange={(e) => setBotForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Bot API Token (Telegram Token) *</label>
                <input 
                  id="bot-token-input"
                  type="text" 
                  placeholder="e.g., 123456789:AAF-DEFGH..."
                  value={botForm.token}
                  onChange={(e) => setBotForm(prev => ({ ...prev, token: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Leave blank to auto-generate a mock token. Provide a valid token for real Telegram integrations.</span>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  id="btn-save-bot"
                  type="submit" 
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded transition-all cursor-pointer"
                >
                  {editingBotId ? 'Update Settings' : 'Connect & Save Bot'}
                </button>
                <button 
                  type="button" 
                  onClick={closeBotModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONNECT/EDIT GROUP MODAL */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 transition-opacity p-4">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full shadow-2xl overflow-hidden animate-fade-in font-sans">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-md flex items-center gap-2">
                <Users size={18} className="text-indigo-400" /> {editingGroupId ? 'Edit Telegram Group Setting' : 'Connect Telegram Group'}
              </h3>
              <button onClick={closeGroupModal} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddGroup} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Group Title / Name *</label>
                <input 
                  id="group-name-input"
                  type="text" 
                  required
                  placeholder="e.g., Tech Discussion Group"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Group Chat ID *</label>
                  <input 
                     id="group-chatid-input"
                     type="text" 
                     required
                     placeholder="e.g., -10015566778"
                     value={groupForm.chatId}
                     onChange={(e) => setGroupForm(prev => ({ ...prev, chatId: e.target.value }))}
                     className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Member Count (Demo)</label>
                  <input 
                    id="group-members-input"
                    type="number" 
                    placeholder="e.g., 4500"
                    value={groupForm.memberCount}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, memberCount: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Select Controlling Bot *</label>
                <select 
                  id="group-bot-select"
                  value={groupForm.botId}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, botId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {bots.map(bot => (
                    <option key={bot.id} value={bot.id}>{bot.name} ({bot.status})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  id="btn-save-group"
                  type="submit" 
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded transition-all cursor-pointer"
                >
                  {editingGroupId ? 'Update Settings' : 'Connect Group'}
                </button>
                <button 
                  type="button" 
                  onClick={closeGroupModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD/EDIT SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 transition-opacity p-4">
          <div className="bg-white border border-slate-200 rounded max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-md flex items-center gap-2">
                <CalendarClock size={18} className="text-indigo-400" /> 
                {editingScheduleId ? 'Edit Broadcast Schedule' : 'Create Broadcast Schedule Automation'}
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddSchedule} className="p-6 space-y-4 max-h-[550px] overflow-y-auto">
              
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Campaign/Automation Name *</label>
                <input 
                  id="schedule-name-input"
                  type="text" 
                  required
                  placeholder="e.g., Monthly Promotion Campaign"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Sender Bot *</label>
                  <select 
                    id="schedule-bot-select"
                    value={scheduleForm.botId}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, botId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none"
                  >
                    <option value="" disabled>Select Bot</option>
                    {bots.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Target Groups (Select Multiple Checkboxes) *</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 text-sm max-h-[140px] overflow-y-auto space-y-1.5 font-medium">
                    {groups.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2">No groups available. Please create a group first!</p>
                    ) : (
                      groups.map(g => {
                        const isChecked = scheduleForm.groupIds?.includes(g.id) || (scheduleForm.groupId === g.id && (!scheduleForm.groupIds || scheduleForm.groupIds.length === 0));
                        return (
                          <label key={g.id} className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded cursor-pointer select-none transition-colors">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setScheduleForm(prev => {
                                  const currentIds = prev.groupIds || (prev.groupId ? [prev.groupId] : []);
                                  const updatedIds = isChecked 
                                    ? currentIds.filter(id => id !== g.id)
                                    : [...currentIds, g.id];
                                  return { 
                                    ...prev, 
                                    groupIds: updatedIds,
                                    groupId: updatedIds[0] || ''
                                  };
                                });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <div className="flex-1 flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-800">{g.name}</span>
                              <span className="text-slate-500 font-mono text-[10px]">Chat ID: {g.chatId}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 border border-slate-250 rounded">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">Message Recurrence *</label>
                  <select 
                    id="schedule-recurrence-select"
                    value={scheduleForm.recurrence}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, recurrence: e.target.value as any }))}
                    className="w-full bg-white border border-slate-200 rounded p-2 text-xs focus:outline-none"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly Recurrence</option>
                  </select>
                </div>

                {(scheduleForm.recurrence === 'monthly' || scheduleForm.recurrence === 'once') && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                      {scheduleForm.recurrence === 'once' ? 'Target Day' : 'Day of Month'} *
                    </label>
                    <select 
                      id="schedule-dayofmonth-select"
                      value={scheduleForm.dayOfMonth}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-xs"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                {scheduleForm.recurrence === 'weekly' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">Day of Week *</label>
                    <select 
                      id="schedule-dayofweek-select"
                      value={scheduleForm.dayOfWeek}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-xs"
                    >
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                        <option key={idx} value={idx}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">Broadcast Time *</label>
                  <input 
                    id="schedule-time-input"
                    type="time" 
                    required
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-none"
                  />
                  {scheduleForm.time && (
                    <span className="text-[10px] text-indigo-600 font-bold block mt-1">
                      12-Hour Format: {formatTimeTo12Hour(scheduleForm.time)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block text-xs">Message Body Template *</label>
                  <span className="text-[10px] text-slate-400">Use dynamic variable tags like {`{date}`} or {`{greeting_english}`} inside templates.</span>
                </div>
                <textarea 
                  id="schedule-message-textarea"
                  required
                  rows={4}
                  placeholder="Hello {greeting_english} members! Welcome to our {group_name}. Today is {date} and time is {time}."
                  value={scheduleForm.messageTemplate}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, messageTemplate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  id="btn-save-schedule-action"
                  type="submit" 
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded transition-all cursor-pointer"
                >
                  {editingScheduleId ? 'Update Schedule' : 'Save Automation Schedule'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD TEMPLATE MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 transition-opacity p-4">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-md flex items-center gap-2"><MessageSquare size={18} className="text-indigo-400" /> Add Message Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddTemplate} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Template Title / Identifier *</label>
                <input 
                  id="template-title-input"
                  type="text" 
                  required
                  placeholder="e.g., Weekly Follow-up Notification"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Category Type</label>
                <select 
                  id="template-category-select"
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm font-medium focus:outline-none"
                >
                  <option value="Promotion">Promotion</option>
                  <option value="Support">Customer Support</option>
                  <option value="Greeting">Greeting</option>
                  <option value="Alert">System Alert</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">Message Body Content *</label>
                <textarea 
                  id="template-content-textarea"
                  required
                  rows={5}
                  placeholder="Compose template sentences. Standard dynamic variable placeholders can be included."
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  id="btn-save-template-submit"
                  type="submit" 
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded transition-all cursor-pointer"
                >
                  Save Template
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING CORNER SIMULATOR CLOCK CONTROL PANEL */}
      <div id="floating-clock-simulator" className="fixed bottom-6 right-6 z-40 transition-all duration-300">
        {isClockHidden ? (
          // Collapsed Floating Button at bottom-right corner
          <button
            onClick={() => {
              setIsClockHidden(false);
              localStorage.setItem('bt_clock_hidden', 'false');
            }}
            className="flex items-center gap-2.5 px-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-full shadow-2xl hover:bg-slate-850 active:scale-95 transition-all duration-200 cursor-pointer group"
            title="Time Simulator Control Panel"
          >
            <Clock size={16} className="text-amber-400 group-hover:text-white animate-spin" style={{ animationDuration: isSimPaused ? '0s' : '4s' }} />
            <span className="font-mono font-bold text-sm tracking-wider text-amber-300 group-hover:text-white">
              {simulatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
            <Eye size={14} className="text-slate-400 group-hover:text-white ml-0.5" />
          </button>
        ) : (
          // Expanded Floating Control Dashboard card
          <div className="w-80 bg-slate-950/95 backdrop-blur-md border border-slate-800 text-slate-100 rounded-xl shadow-2xl p-5 space-y-4 relative transform hover:border-slate-700 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 rounded border border-indigo-500/20">
                  <Clock size={16} className="text-indigo-400 animate-spin" style={{ animationDuration: isSimPaused ? '0s' : '4s' }} />
                </div>
                <div>
                  <span className="font-bold text-xs tracking-wider uppercase text-indigo-400">Time Simulator</span>
                  <p className="text-[10px] text-slate-400">Real-time scheduling simulation</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsClockHidden(true);
                  localStorage.setItem('bt_clock_hidden', 'true');
                  triggerToast('Time simulator hidden. Click top-right or floating clock to recover!', 'info');
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Hide simulator controls"
              >
                <EyeOff size={15} />
              </button>
            </div>

            {/* Simulated Time Reading Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 text-center shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500"></div>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block mb-1">Simulated Time</span>
              <div className="text-2xl font-mono text-amber-300 font-bold tracking-widest drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                {simulatedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <p className="text-xs font-semibold text-slate-300 mt-1.5 font-mono">
                {simulatedTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            {/* Controller row: Speed and Play/Pause */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Clock Progression Speed:</span>
                <span className="text-indigo-300 font-bold font-mono">
                  {simSpeed === 1 ? 'Real-Time (1x)' : `${simSpeed}x`}
                </span>
              </div>
              
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 60, 300, 1800, 3600].map(speed => (
                  <button
                    key={speed}
                    onClick={() => {
                      setSimSpeed(speed);
                      triggerToast(`Simulation speed updated: ${speed === 1 ? 'Real-time' : speed + 'x'}`, 'info');
                    }}
                    className={`p-1.5 rounded text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                      simSpeed === speed 
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {speed === 1 ? '1x' : speed === 60 ? '1m/s' : speed === 300 ? '5m/s' : speed === 1800 ? '30m/s' : '1h/s'}
                  </button>
                ))}
              </div>

              {/* Action buttons (Play/Pause / Sync Real) */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsSimPaused(!isSimPaused);
                    triggerToast(!isSimPaused ? 'Simulation clock paused. Synchronized with real-time.' : 'Time-simulation clock resumed!', 'info');
                  }}
                  className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                    !isSimPaused
                      ? 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border-amber-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow'
                  }`}
                >
                  {isSimPaused ? (
                    <>
                      <Play size={12} fill="currentColor" />
                      <span>Start Clock</span>
                    </>
                  ) : (
                    <>
                      <Pause size={12} fill="currentColor" />
                      <span>Sync/Pause</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    const now = new Date();
                    setSimulatedTime(now);
                    setIsSimPaused(true);
                    triggerToast('Time synchronized with real-world clock!', 'success');
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Sync with current actual time"
                >
                  <RefreshCcw size={12} />
                </button>
              </div>
            </div>

            {/* Helpful Indicator badge */}
            <div className="flex items-center gap-2 justify-center text-[10px] text-slate-500 bg-slate-900/50 rounded-md py-1 border border-slate-900">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active background simulation scheduler running</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
