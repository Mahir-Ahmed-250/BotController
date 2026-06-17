export interface TelegramBot {
  id: string;
  name: string;
  token: string; // Bot Token (e.g. 123456:ABC-DEF...)
  status: 'active' | 'paused';
  createdAt: string;
}

export interface TelegramGroup {
  id: string;
  name: string;
  chatId: string; // Chat ID (e.g. -100123456789)
  botId: string; // Connected bot
  memberCount: number;
}

export type ScheduleRecurrence = 'once' | 'daily' | 'weekly' | 'monthly';

export interface MessageSchedule {
  id: string;
  name: string;
  botId: string;
  groupId: string;
  groupIds?: string[];
  messageTemplate: string;
  recurrence: ScheduleRecurrence;
  // For once/monthly: date of the month (1-31)
  dayOfMonth?: number;
  // For weekly: day of the week (0-6, where 0 is Sunday)
  dayOfWeek?: number;
  // Time in format "HH:MM" (24h)
  time: string;
  status: 'active' | 'paused';
  lastSent?: string;
  nextRun?: string;
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  botName: string;
  groupName: string;
  message: string;
  actualContent: string;
  isRealDelivery: boolean;
  deliveryStatus: 'success' | 'failed' | 'simulated';
  telegramMessageId?: number;
  telegramChatId?: string;
  telegramBotToken?: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: 'Promotion' | 'Support' | 'Greeting' | 'Alert' | 'Custom';
}

export interface UserAccount {
  email: string;
  passwordHash: string; // Stored user password
  name: string;
  createdAt: string;
}

export interface UserSession {
  email: string;
  name: string;
  loginTime: string;
}

