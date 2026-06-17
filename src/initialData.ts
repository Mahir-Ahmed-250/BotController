import { TelegramBot, TelegramGroup, MessageSchedule, MessageTemplate, SimulationLog } from './types';

export const INITIAL_BOTS: TelegramBot[] = [
  {
    id: 'bot_01',
    name: 'OfferBot_01',
    token: '718290321:AAE7B_y3k-xXpX_8...',
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString()
  },
  {
    id: 'bot_02',
    name: 'Support_Master',
    token: '891012345:BBG8C_z4j-yYqY_9...',
    status: 'active',
    createdAt: new Date(Date.now() - 20 * 86400 * 1000).toISOString()
  },
  {
    id: 'bot_03',
    name: 'Global_Ads_Bot',
    token: '123456789:CCH9D_a5k-zZqZ_0...',
    status: 'paused',
    createdAt: new Date(Date.now() - 10 * 86400 * 1000).toISOString()
  }
];

export const INITIAL_GROUPS: TelegramGroup[] = [
  {
    id: 'group_01',
    name: 'Tech Community Global',
    chatId: '-1001481234567',
    botId: 'bot_01',
    memberCount: 4520
  },
  {
    id: 'group_02',
    name: 'Freelance Hub Global',
    chatId: '-1001298765432',
    botId: 'bot_02',
    memberCount: 1280
  },
  {
    id: 'group_03',
    name: 'MarketPlace Deals',
    chatId: '-1001556677889',
    botId: 'bot_03',
    memberCount: 9600
  },
  {
    id: 'group_04',
    name: 'Programming Addicts',
    chatId: '-1003344556677',
    botId: 'bot_01',
    memberCount: 654
  }
];

export const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'temp_payment_notice',
    title: 'Udvash Board Payment Notice',
    category: 'Alert',
    content: `💳পেমেন্ট সংক্রান্ত নোটিশ 💳\nযে সকল পরীক্ষকগণ {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে খাতা মূল্যায়নের পেমেন্ট নিতে আগ্রহী তারা এই ফর্মটি পূরণ করুন, উক্ত ফর্মটি {payment_deadline_bangla} তারিখ রাত ০৮:০০টা পর্যন্ত পূরণ করা যাবে, ফর্ম পূরণকারী ৫০টাকার অধিক ডিউ সম্পন্ন (TIN নম্বর যাদের আছে তাদের ১০০টাকা) পরীক্ষকদের পেমেন্ট {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে প্রদান করা হবে। একটি টি-পিন এর জন্য একবার এবং সতর্কতার সাথে ফর্মটি পূরণ করার জন্য বিশেষভাবে অনুরোধ করা যাচ্ছে।\n\nবিঃদ্রঃ ফর্ম পূরণ করে মোবাইল ব্যাংকিং এর মাধ্যমে পেমেন্ট এর প্রোসেসিং এর মাঝে আমাদের ক্যাম্পাসে এসে ফিজিক্যালি পেমেন্ট না নেওয়ার জন্য বিশেষ ভাবে অনুরোধ করা যাচ্ছে।\n\nফর্ম লিংকঃ https://tinyurl.com/udvashESMPayment\n\nউদ্ভাসের খাতা মূল্যায়নের পেমেন্ট সম্পর্কে বিস্তারিত জানতেঃ https://tinyurl.com/ESMPayment`
  },
  {
    id: 'temp_01',
    title: 'Monthly Offer Review',
    category: 'Promotion',
    content: `{greeting_english} Dear members! 🌟\n\nToday's Date: {date} and Time: {time}.\nWe have an exciting discount offer for all {member_count} members of our '{group_name}' group.\n\nInbox us for details. Thank you for staying connected!`
  },
  {
    id: 'temp_02',
    title: 'Daily Support Reminder',
    category: 'Support',
    content: `{greeting_english} everyone! 🙋‍♂️\n\nToday is {day}.\nOur weekly online mega content session is starting.\n\nTime: {time}\nFeel free to write to the admin if you face any issues.`
  },
  {
    id: 'temp_03',
    title: 'Weekly Promotional Ad',
    category: 'Greeting',
    content: `📢 Ad Alert: {group_name}\n\n{greeting_english}, admission has started for our new batch today, {date}.\nThis message was automatically sent via bot '{bot_name}'.\nFollow the pinned post for regular updates. ❤️`
  }
];

export const INITIAL_SCHEDULES: MessageSchedule[] = [
  {
    id: 'sched_payment_notice_01',
    name: 'Udvash 1st Slot (Monthly - 14th @ 10:00 AM)',
    botId: 'bot_01',
    groupId: 'group_01',
    messageTemplate: `💳পেমেন্ট সংক্রান্ত নোটিশ 💳\nযে সকল পরীক্ষকগণ {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে খাতা মূল্যায়নের পেমেন্ট নিতে আগ্রহী তারা এই ফর্মটি পূরণ করুন, উক্ত ফর্মটি {payment_deadline_bangla} তারিখ রাত ০৮:০০টা পর্যন্ত পূরণ করা যাবে, ফর্ম পূরণকারী ৫০টাকার অধিক ডিউ সম্পন্ন (TIN নম্বর যাদের আছে তাদের ১০০টাকা) পরীক্ষকদের পেমেন্ট {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে প্রদান করা হবে। একটি টি-পিন এর জন্য একবার এবং সতর্কতার সাথে ফর্মটি পূরণ করার জন্য বিশেষভাবে অনুরোধ করা যাচ্ছে।\n\nবিঃদ্রঃ ফর্ম পূরণ করে মোবাইল ব্যাংকিং এর মাধ্যমে পেমেন্ট এর প্রোসেসিং এর মাঝে আমাদের ক্যাম্পাসে এসে ফিজিক্যালি পেমেন্ট না নেওয়ার জন্য বিশেষ ভাবে অনুরোধ করা যাচ্ছে।\n\nফর্ম লিংকঃ https://tinyurl.com/udvashESMPayment\n\nউদ্ভাসের খাতা মূল্যায়নের পেমেন্ট সম্পর্কে বিস্তারিত জানতেঃ https://tinyurl.com/ESMPayment`,
    recurrence: 'monthly',
    dayOfMonth: 14,
    time: '10:00',
    status: 'active'
  },
  {
    id: 'sched_payment_notice_02',
    name: 'Udvash 2nd Slot (Monthly - 28th @ 10:00 AM)',
    botId: 'bot_01',
    groupId: 'group_01',
    messageTemplate: `💳পেমেন্ট সংক্রান্ত নোটিশ 💳\nযে সকল পরীক্ষকগণ {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে খাতা মূল্যায়নের পেমেন্ট নিতে আগ্রহী তারা এই ফর্মটি পূরণ করুন, উক্ত ফর্মটি {payment_deadline_bangla} তারিখ রাত ০৮:০০টা পর্যন্ত পূরণ করা যাবে, ফর্ম পূরণকারী ৫০টাকার অধিক ডিউ সম্পন্ন (TIN নম্বর যাদের আছে তাদের ১০০টাকা) পরীক্ষকদের পেমেন্ট {payment_month_bangla} {payment_year_bangla} এর {payment_slot_bangla_locative} মোবাইল ব্যাংকিং এর মাধ্যমে প্রদান করা হবে। একটি টি-পিন এর জন্য একবার এবং সতর্কতার সাথে ফর্মটি পূরণ করার জন্য বিশেষভাবে অনুরোধ করা যাচ্ছে।\n\nবিঃদ্রঃ ফর্ম পূরণ করে মোবাইল ব্যাংকিং এর মাধ্যমে পেমেন্ট এর প্রোসেসিং এর মাঝে আমাদের ক্যাম্পাসে এসে ফিজিক্যালি পেমেন্ট না নেওয়ার জন্য বিশেষ ভাবে অনুরোধ করা যাচ্ছে।\n\nফর্ম লিংকঃ https://tinyurl.com/udvashESMPayment\n\nউদ্ভাসের খাতা মূল্যায়নের পেমেন্ট সম্পর্কে বিস্তারিত জানতেঃ https://tinyurl.com/ESMPayment`,
    recurrence: 'monthly',
    dayOfMonth: 28,
    time: '10:00',
    status: 'active'
  },
  {
    id: 'sched_01',
    name: 'Monthly Offer Alert',
    botId: 'bot_01',
    groupId: 'group_01',
    messageTemplate: `{greeting_english} Dear members! 🌟\n\nToday's Date: {date} and Time: {time}.\nWe have an exciting discount offer for all {member_count} members of our '{group_name}' group.\n\nThank you for staying with us!`,
    recurrence: 'monthly',
    dayOfMonth: 15,
    time: '11:00',
    status: 'active',
    lastSent: new Date(Date.now() - 15 * 86400 * 1000).toISOString()
  },
  {
    id: 'sched_02',
    name: 'Weekly Support Meeting',
    botId: 'bot_02',
    groupId: 'group_02',
    messageTemplate: `{greeting_english} everyone! 🙋‍♂️\n\nToday is {day}.\nOur weekly online mega content session is starting.\n\nTime: {time}\nFeel free to write to the admin if you face any issues.`,
    recurrence: 'weekly',
    dayOfWeek: 1, // Monday
    time: '14:30',
    status: 'active'
  },
  {
    id: 'sched_03',
    name: 'Daily Greeting Message',
    botId: 'bot_01',
    groupId: 'group_04',
    messageTemplate: `{greeting_english}, you are viewing the automation demo of the {group_name} group. Have a wonderful day! ✨`,
    recurrence: 'daily',
    time: '09:00',
    status: 'paused'
  }
];

export const INITIAL_LOGS: SimulationLog[] = [
  {
    id: 'log_01',
    timestamp: new Date(Date.now() - 1200000).toLocaleString('en-US'),
    type: 'success',
    botName: 'OfferBot_01',
    groupName: 'Tech Community Global',
    message: 'Message sent successfully as scheduled.',
    actualContent: 'Good morning Dear members! 🌟\n\nToday\'s Date: June 15, 2026 and Time: 11:00 AM.\nWe have an exciting discount offer for all 4520 members of our Tech Community Global group.\n\nThank you for staying with us!',
    isRealDelivery: false,
    deliveryStatus: 'simulated'
  },
  {
    id: 'log_02',
    timestamp: new Date(Date.now() - 600000).toLocaleString('en-US'),
    type: 'info',
    botName: 'Support_Master',
    groupName: 'Freelance Hub Global',
    message: 'Bot webhook session established. Connection is stable.',
    actualContent: '',
    isRealDelivery: false,
    deliveryStatus: 'simulated'
  },
  {
    id: 'log_03',
    timestamp: new Date(Date.now() - 300000).toLocaleString('en-US'),
    type: 'warning',
    botName: 'Global_Ads_Bot',
    groupName: 'MarketPlace Deals',
    message: 'Bot is offline or status is paused. Message delivery skipped.',
    actualContent: '',
    isRealDelivery: false,
    deliveryStatus: 'simulated'
  }
];
