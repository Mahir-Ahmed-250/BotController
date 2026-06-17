import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Interfaces
interface TelegramBot {
  id: string;
  name: string;
  token: string;
  status: 'active' | 'paused';
  createdAt: string;
}

interface TelegramGroup {
  id: string;
  name: string;
  chatId: string;
  botId: string;
  memberCount: number;
}

interface MessageSchedule {
  id: string;
  name: string;
  botId: string;
  groupId: string;
  groupIds?: string[];
  messageTemplate: string;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  time: string; // "HH:MM"
  status: 'active' | 'paused';
  lastSent?: string;
  nextRun?: string;
}

interface SimulationLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  botName: string;
  groupName: string;
  message: string;
  actualContent: string;
  isRealDelivery: boolean;
  deliveryStatus: 'success' | 'failed' | 'simulated';
}

const DATA_FILE = path.join(process.cwd(), "data.json");

// Default initial data to seed if file doesn't exist
const DEFAULT_SYSTEM_DATA = {
  bots: [
    {
      id: "bot_01",
      name: "OfferBot_01",
      token: "718290321:AAE7B_y3k-xXpX_8...",
      status: "active",
      createdAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString()
    },
    {
      id: "bot_02",
      name: "Support_Master",
      token: "891012345:BBG8C_z4j-yYqY_9...",
      status: "active",
      createdAt: new Date(Date.now() - 20 * 86400 * 1000).toISOString()
    }
  ],
  groups: [
    {
      id: "group_01",
      name: "Tech Community Global",
      chatId: "-1001481234567",
      botId: "bot_01",
      memberCount: 4520
    },
    {
      id: "group_02",
      name: "Freelance Hub Global",
      chatId: "-1001298765432",
      botId: "bot_02",
      memberCount: 1280
    }
  ],
  schedules: [
    {
      id: "sched_payment_notice_01",
      name: "Udvash 1st Slot (Monthly - 14th @ 10:00 AM)",
      botId: "bot_01",
      groupId: "group_01",
      groupIds: ["group_01"],
      messageTemplate: `💳পেমেন্ট সংক্রান্ত নোটিশ 💳\nযে সকল পরীক্ষকগণ {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে খাতা মূল্যায়নের পেমেন্ট নিতে আগ্রহী তারা এই ফর্মটি পূরণ করুন, উক্ত ফর্মটি {payment_deadline_bangla} তারিখ রাত ০৮:০০টা পর্যন্ত পূরণ করা যাবে, ফর্ম পূরণকারী ৫০টাকার অধিক ডিউ সম্পন্ন (TIN নম্বর যাদের আছে তাদের ১০০টাকা) পরীক্ষকদের পেমেন্ট {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে প্রদান করা হবে। একটি টি-পিন এর জন্য একবার এবং সতর্কতার সাথে ফর্মটি পূরণ করার জন্য বিশেষভাবে অনুরোধ করা যাচ্ছে।\n\nবিঃদ্রঃ ফর্ম পূরণ করে মোবাইল ব্যাংকিং এর মাধ্যমে পেমেন্ট এর প্রোসেসিং এর মাঝে আমাদের ক্যাম্পাসে এসে ফিজিক্যালি পেমেন্ট না নেওয়ার জন্য বিশেষ ভাবে অনুরোধ করা যাচ্ছে।\n\nফর্ম লিংকঃ https://tinyurl.com/udvashESMPayment\n\nউদ্ভাসের খাতা মূল্যায়নের পেমেন্ট সম্পর্কে বিস্তারিত জানতেঃ https://tinyurl.com/ESMPayment`,
      recurrence: "monthly",
      dayOfMonth: 14,
      time: "10:00",
      status: "active"
    },
    {
      id: "sched_payment_notice_02",
      name: "Udvash 2nd Slot (Monthly - 28th @ 10:00 AM)",
      botId: "bot_01",
      groupId: "group_01",
      groupIds: ["group_01"],
      messageTemplate: `💳পেমেন্ট সংক্রান্ত নোটিশ 💳\nযে সকল পরীক্ষকগণ {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে খাতা মূল্যায়নের পেমেন্ট নিতে আগ্রহী তারা এই ফর্মটি পূরণ করুন, উক্ত ফর্মটি {payment_deadline_bangla} তারিখ রাত ০৮:০০টা পর্যন্ত পূরণ করা যাবে, ফর্ম পূরণকারী ৫০টাকার অধিক ডিউ সম্পন্ন (TIN নম্বর যাদের আছে তাদের ১০০টাকা) পরীক্ষকদের পেমেন্ট {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে প্রদান করা হবে। একটি টি-পিন এর জন্য একবার এবং সতর্কতার সাথে ফর্মটি পূরণ করার জন্য বিশেষভাবে অনুরোধ করা যাচ্ছে।\n\nবিঃদ্রঃ ফর্ম পূরণ করে মোবাইল ব্যাংকিং এর মাধ্যমে পেমেন্ট এর প্রোসেসিং এর মাঝে আমাদের ক্যাম্পাসে এসে ফিজিক্যালি পেমেন্ট না নেওয়ার জন্য বিশেষ ভাবে অনুরোধ করা যাচ্ছে।\n\nফর্ম লিংকঃ https://tinyurl.com/udvashESMPayment\n\nউদ্ভাসের খাতা মূল্যায়নের পেমেন্ট সম্পর্কে বিস্তারিত জানতেঃ https://tinyurl.com/ESMPayment`,
      recurrence: "monthly",
      dayOfMonth: 28,
      time: "10:00",
      status: "active"
    }
  ],
  logs: [] as SimulationLog[],
  isRealDeliveryEnabled: false
};

// Helper: Read system data from JSON storage
function readSystemData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading data.json:", error);
  }
  // If parsing error or file doesn't exist, write defaults
  writeSystemData(DEFAULT_SYSTEM_DATA);
  return DEFAULT_SYSTEM_DATA;
}

// Helper: Save system data to JSON storage
function writeSystemData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to data.json:", error);
  }
}

// Helper: Get exact Bangladesh Standard Time (UTC+6)
function getCurrentBangladeshTime(): Date {
  const utcDate = new Date();
  const utcTime = utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000);
  const bdTime = new Date(utcTime + (3600000 * 6));
  return bdTime;
}

// Helper: Message Encoder
function formatTelegramMessage(
  template: string,
  botName: string,
  groupName: string,
  memberCount: number,
  targetDate: Date = new Date()
): string {
  if (!template) return '';
  
  const dateStrEn = targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStrEn = targetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dayStrEn = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

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

  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const toBanglaDigits = (num: string | number): string => {
    return num.toString().replace(/\d/g, (digit) => banglaDigits[parseInt(digit)]);
  };

  const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const dayOfMonthVal = targetDate.getDate();
  const monthVal = targetDate.getMonth();
  const yearVal = targetDate.getFullYear();

  const paymentMonthBangla = banglaMonths[monthVal];
  const paymentYearBangla = toBanglaDigits(yearVal);

  const isFirstSlot = dayOfMonthVal <= 20;
  const paymentSlotBangla = isFirstSlot ? '১ম স্লট' : '২য় স্লট';
  const paymentSlotBanglaLocative = isFirstSlot ? '১ম স্লটে' : '২য় স্লটে';

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

// Background scheduler checker
async function runBackgroundSchedulerTicks() {
  const bdNow = getCurrentBangladeshTime();
  const hours = String(bdNow.getHours()).padStart(2, '0');
  const minutes = String(bdNow.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  const currentDayOfMonth = bdNow.getDate();
  const currentDayOfWeek = bdNow.getDay(); // 0 is Sunday

  const systemData = readSystemData();
  const { schedules, bots, groups, logs, isRealDeliveryEnabled } = systemData;
  let hasModified = false;

  for (const schedule of schedules as MessageSchedule[]) {
    if (schedule.status !== "active") continue;

    // Check if scheduled time matches Bangladesh local time string "HH:MM"
    if (schedule.time === currentTimeStr) {
      // Avoid duplicate triggerings in the same minute
      const lastSentTime = schedule.lastSent ? new Date(schedule.lastSent) : null;
      const isRecentlySent = lastSentTime && (Math.abs(bdNow.getTime() - lastSentTime.getTime()) < 90000); // 90 seconds gap

      if (isRecentlySent) continue;

      let isMatch = false;
      if (schedule.recurrence === "daily") {
        isMatch = true;
      } else if (schedule.recurrence === "weekly" && schedule.dayOfWeek === currentDayOfWeek) {
        isMatch = true;
      } else if (schedule.recurrence === "monthly" && schedule.dayOfMonth === currentDayOfMonth) {
        isMatch = true;
      } else if (schedule.recurrence === "once") {
        isMatch = true;
        schedule.status = "paused"; // Set once to paused after trigger
      }

      if (isMatch) {
        // Resolve Target Groups (can be multiple)
        let targetGroups: TelegramGroup[] = [];
        if (schedule.groupIds && schedule.groupIds.length > 0) {
          targetGroups = schedule.groupIds
            .map(gId => groups.find((g: any) => g.id === gId))
            .filter((g: any): g is TelegramGroup => !!g);
        } else if (schedule.groupId) {
          const g = groups.find((g: any) => g.id === schedule.groupId);
          if (g) targetGroups = [g];
        }

        const bot = bots.find((b: any) => b.id === schedule.botId);
        if (!bot || bot.status === "paused" || targetGroups.length === 0) continue;

        console.log(`[SCHEDULER] Match found for: "${schedule.name}" targets: ${targetGroups.length} groups.`);

        // Process message delivery for each group in the target set
        for (const group of targetGroups) {
          const content = formatTelegramMessage(schedule.messageTemplate, bot.name, group.name, group.memberCount, bdNow);
          const newLogId = 'log_srv_' + Date.now() + Math.random().toString(36).substr(2, 4);

          const newLog: SimulationLog = {
            id: newLogId,
            timestamp: bdNow.toLocaleString('en-US'),
            type: "info",
            botName: bot.name,
            groupName: group.name,
            message: "Automatic background server-side transmission initiated...",
            actualContent: content,
            isRealDelivery: isRealDeliveryEnabled,
            deliveryStatus: "simulated"
          };

          // If real delivery is enabled on backend, attempt to post to Telegram bot API
          if (isRealDeliveryEnabled && bot.token && !bot.token.includes('...')) {
            try {
              const url = `https://api.telegram.org/bot${bot.token}/sendMessage`;
              const response = await axios.post(url, {
                chat_id: group.chatId,
                text: content,
                parse_mode: "HTML"
              }, {
                headers: { "Content-Type": "application/json" },
                timeout: 10000 // 10 second timeout
              });

              if (response.data && response.data.ok) {
                newLog.type = "success";
                newLog.message = "Successfully transmitted directly to Telegram server natively from background!";
                newLog.deliveryStatus = "success";
              } else {
                newLog.type = "error";
                newLog.message = `Transmission failed: ${response.data.description}`;
                newLog.deliveryStatus = "failed";
              }
            } catch (err: any) {
              newLog.type = "error";
              newLog.message = `Network transfer failed: ${err.message || 'Error reaching Telegram API'}`;
              newLog.deliveryStatus = "failed";
            }
          } else {
            // Simulated Success Output if in sandbox mode
            newLog.type = "success";
            newLog.message = "Background session processed and scheduled simulator event created successfully.";
            newLog.deliveryStatus = "simulated";
          }

          logs.unshift(newLog);
        }

        schedule.lastSent = bdNow.toISOString();
        hasModified = true;
      }
    }
  }

  if (hasModified) {
    // Trim logs count to prevent bloated memory/JSON profiles
    systemData.logs = logs.slice(0, 150);
    writeSystemData(systemData);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API 1: Fetch state unified across client-reboots
  app.get("/api/data", (req, res) => {
    const data = readSystemData();
    res.json(data);
  });

  // API 2: Update state on client user transformations
  app.post("/api/data", (req, res) => {
    const { bots, groups, schedules, logs, isRealDeliveryEnabled } = req.body;
    const existing = readSystemData();

    const merged = {
      bots: bots || existing.bots,
      groups: groups || existing.groups,
      schedules: schedules || existing.schedules,
      logs: logs || existing.logs,
      isRealDeliveryEnabled: typeof isRealDeliveryEnabled === "boolean" ? isRealDeliveryEnabled : existing.isRealDeliveryEnabled
    };

    writeSystemData(merged);
    res.json({ ok: true, message: "Storage synced." });
  });

  // Server-side Telegram Message Proxy
  app.post("/api/telegram-proxy", async (req, res) => {
    try {
      const { token, chatId, text, parseMode } = req.body;
      if (!token || !chatId || !text) {
        return res.status(400).json({ ok: false, description: "Missing token, chatId, or text in the request content." });
      }

      const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await axios.post(telegramUrl, {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode || "HTML"
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      });

      res.status(response.status).json(response.data);
    } catch (error: any) {
      console.error("Telegram API Proxy Error:", error);
      res.status(502).json({ ok: false, description: error.message || "Failed to contact Telegram API from server side." });
    }
  });

  // Server-side Telegram Message Deletion Proxy
  app.post("/api/telegram-delete-proxy", async (req, res) => {
    try {
      const { token, chatId, messageId } = req.body;
      if (!token || !chatId || !messageId) {
        return res.status(400).json({ ok: false, description: "Missing token, chatId, or messageId." });
      }

      const telegramUrl = `https://api.telegram.org/bot${token}/deleteMessage`;
      const response = await axios.post(telegramUrl, {
        chat_id: chatId,
        message_id: messageId
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      });

      res.status(response.status).json(response.data);
    } catch (error: any) {
      res.status(502).json({ ok: false, description: error.message || "Failed to configure Telegram API from server side." });
    }
  });

  // Server-side Authentication
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    
    // Use environment variables if set, otherwise fallback to provided credentials
    const adminEmail = (process.env.ADMIN_EMAIL || "xahin.mahir@gmail.com").trim();
    const adminPassword = (process.env.ADMIN_PASSWORD || "rtyfghcvb").trim();

    if (!adminEmail || !adminPassword) {
      console.error("Admin credentials (ADMIN_EMAIL or ADMIN_PASSWORD) not configured.");
      return res.status(500).json({ ok: false, message: "Server configuration error: Admin credentials not set." });
    }

    const emailLower = email?.trim().toLowerCase();
    
    if (emailLower === adminEmail.toLowerCase() && password === adminPassword) {
      res.json({ ok: true, name: "Admin Dashboard Access", email: adminEmail });
    } else {
      res.status(401).json({ ok: false, message: "Invalid admin credentials. Access denied." });
    }
  });

  // Start back-end check loop every 30 seconds
  setInterval(() => {
    runBackgroundSchedulerTicks().catch(err => {
      console.error("Scheduler run error:", err);
    });
  }, 30000);

  // Serve static assets or bundle using Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware loaded successfully.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Production static files directory served.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express node background engine active on port ${PORT}`);
  });
}

startServer();
