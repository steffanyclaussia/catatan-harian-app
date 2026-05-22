export type MoodType = 'happy' | 'neutral' | 'sad' | 'excited' | 'tired' | 'peaceful';

export interface DailyNote {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  mood: MoodType;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  noteId?: string; // Links to note if auto-extracted from it
  title: string;
  dateTime: string; // ISO String (UTC) or relative string
  description?: string;
  isConfirmed: boolean; // Confirmed by user
  isTriggered: boolean; // Time has passed
  isAcknowledged: boolean; // Dismissed by user
  sourceText?: string; // Text fragment that prompted this reminder
}

export interface AnalyticalSummary {
  moodEmoji: string;
  moodLabel: string;
  summary: string;
  positivityScore: number; // 0 to 100
  keyThemes: string[];
  suggestedTags: string[];
}
