import React, { useState, useEffect } from 'react';
import { DailyNote, Reminder } from './types';
import NotesView from './components/NotesView';
import RemindersView from './components/RemindersView';
import AnalyticsView from './components/AnalyticsView';
import AlarmOverlay from './components/AlarmOverlay';
import { BookOpen, Bell, BarChart2, Heart, Calendar, Sparkles } from 'lucide-react';
import { playTick, playChime } from './lib/audio';

// Helper to load state from localStorage safely
const getLocalData = <T,>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.warn(`Error loading localStorage for key ${key}:`, e);
    return defaultValue;
  }
};

export default function App() {
  const [notes, setNotes] = useState<DailyNote[]>(() => getLocalData<DailyNote[]>('notes', []));
  const [reminders, setReminders] = useState<Reminder[]>(() => getLocalData<Reminder[]>('reminders', []));
  
  const [activeTab, setActiveTab] = useState<'notes' | 'reminders' | 'analytics'>('notes');
  const [activeAlarm, setActiveAlarm] = useState<Reminder | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Periodic Reminder Checker Engine (runs background check every 5 seconds)
  useEffect(() => {
    const checker = setInterval(() => {
      const now = new Date().getTime();
      
      const dueReminderIndex = reminders.findIndex(r => {
        const reminderTime = new Date(r.dateTime).getTime();
        return reminderTime <= now && !r.isTriggered && r.isConfirmed && !r.isAcknowledged;
      });

      if (dueReminderIndex !== -1) {
        const found = reminders[dueReminderIndex];
        
        // Trigger the alarm!
        setActiveAlarm(found);
        
        // Mark as triggered in state so it only sounds once.
        const updated = [...reminders];
        updated[dueReminderIndex] = {
          ...found,
          isTriggered: true
        };
        setReminders(updated);
      }
    }, 5000);

    return () => clearInterval(checker);
  }, [reminders]);

  // --- ACTIONS HANDLERS ---
  const addNote = (noteData: Omit<DailyNote, 'id' | 'createdAt' | 'updatedAt'>): DailyNote => {
    const id = Math.random().toString(36).substring(2, 11);
    const nowStr = new Date().toISOString();
    
    const newNote: DailyNote = {
      ...noteData,
      id,
      createdAt: nowStr,
      updatedAt: nowStr
    };

    setNotes(prev => [newNote, ...prev]);
    return newNote;
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    // Cascade delete associated reminders
    setReminders(prev => prev.filter(r => r.noteId !== id));
  };

  const addReminder = (remData: Omit<Reminder, 'id' | 'isConfirmed' | 'isTriggered' | 'isAcknowledged'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newReminder: Reminder = {
      ...remData,
      id,
      isConfirmed: true,
      isTriggered: false,
      isAcknowledged: false
    };
    setReminders(prev => [newReminder, ...prev]);
  };

  const addReminders = (remsArray: Omit<Reminder, 'id' | 'isConfirmed' | 'isTriggered' | 'isAcknowledged'>[]) => {
    const newReminders = remsArray.map(item => ({
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      isConfirmed: true,
      isTriggered: false,
      isAcknowledged: false
    }));
    setReminders(prev => [...newReminders, ...prev]);
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const toggleConfirmReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, isConfirmed: !r.isConfirmed } : r));
  };

  const acknowledgeReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, isAcknowledged: true, isTriggered: true } : r));
    if (activeAlarm && activeAlarm.id === id) {
      setActiveAlarm(null);
    }
  };

  const snoozeReminder = (id: string) => {
    const snoozeTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // snooze 5 minutes
    setReminders(prev => prev.map(r => r.id === id ? {
      ...r,
      dateTime: snoozeTime,
      isTriggered: false,
      isAcknowledged: false
    } : r));
    setActiveAlarm(null);
  };

  const changeTab = (tab: 'notes' | 'reminders' | 'analytics') => {
    setActiveTab(tab);
    playTick();
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 font-sans">
      
      {/* GLOWING HEADER BACKGROUND ACCENT */}
      <div className="absolute top-0 inset-x-0 h-64 bg-linear-to-b from-teal-500/10 via-slate-50/5 to-transparent pointer-events-none" />

      {/* TOP NAVIGATION NAV BAR */}
      <header className="border-b border-slate-100/80 bg-white/75 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-5 h-5 fill-teal-100/10" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none">Lembaran</h1>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Catatan & Pengingat Pintar</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
            <button
              onClick={() => changeTab('notes')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'notes' 
                  ? 'bg-white text-slate-800 shadow-3xs font-bold' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Buku Harian</span>
            </button>

            <button
              onClick={() => changeTab('reminders')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all relative ${
                activeTab === 'reminders' 
                  ? 'bg-white text-slate-800 shadow-3xs font-bold' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>Pengingat</span>
              {reminders.filter(r => new Date(r.dateTime).getTime() > Date.now() && !r.isAcknowledged).length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white" />
              )}
            </button>

            <button
              onClick={() => changeTab('analytics')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-white text-slate-800 shadow-3xs font-bold' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 shrink-0" />
              <span>Wawasan AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* BODY WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        
        {/* Welcome Jumbotron Banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 bg-teal-50 text-teal-700 text-[10px] uppercase font-bold tracking-widest rounded-md">Lembaran Workspace</span>
              <span className="text-slate-300">|</span>
              <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mt-1">
              {activeTab === 'notes' && "Halo, Tuangkan Pikiran Anda Hari Ini"}
              {activeTab === 'reminders' && "Agenda & Pemicu Alarm Anda"}
              {activeTab === 'analytics' && "Rangkuman Kondisi Pikiran"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Semua data disimpan secara privat di dalam perangkat komputer lokal Anda.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-3 px-4 shadow-3xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                <Heart className="w-4 h-4 fill-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Mood Dominan</p>
                <p className="text-sm font-extrabold text-slate-800 leading-none mt-1">
                  {notes.length === 0 ? "Biasa Saja" : (() => {
                    const counts: { [key: string]: number } = {};
                    notes.forEach(n => counts[n.mood] = (counts[n.mood] || 0) + 1);
                    const listObj = Object.keys(counts).map(k => ({ mood: k, qty: counts[k] }));
                    const top = listObj.sort((a,b) => b.qty - a.qty)[0];
                    const moodLabelMap: { [key: string]: string } = {
                      happy: "😊 Senang",
                      peaceful: "🧘 Damai",
                      neutral: "😐 Biasa Saja",
                      excited: "🤩 Semangat",
                      tired: "😴 Lelah",
                      sad: "😢 Sedih"
                    };
                    return moodLabelMap[top.mood] || "😐 Biasa Saja";
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab content layouts with animations */}
        <div className="min-h-96">
          {activeTab === 'notes' && (
            <NotesView 
              notes={notes} 
              addNote={addNote} 
              deleteNote={deleteNote} 
              addReminders={addReminders} 
            />
          )}

          {activeTab === 'reminders' && (
            <RemindersView 
              reminders={reminders}
              addReminder={addReminder} 
              deleteReminder={deleteReminder} 
              toggleConfirmReminder={toggleConfirmReminder} 
              acknowledgeReminder={acknowledgeReminder} 
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView notes={notes} />
          )}
        </div>

      </main>

      {/* BACKGROUND FLOATING ALARM POPUP OVERLAY */}
      {activeAlarm && (
        <AlarmOverlay
          activeAlarm={activeAlarm}
          onDismiss={acknowledgeReminder}
          onSnooze={snoozeReminder}
        />
      )}

    </div>
  );
}
