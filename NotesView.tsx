import React, { useState } from 'react';
import { DailyNote, MoodType, Reminder } from '../types';
import { Sparkles, Save, Heart, Search, Calendar, Tag, AlertCircle, Trash2, CheckSquare, Plus, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MOODS: { type: MoodType; emoji: string; label: string; color: string; bg: string }[] = [
  { type: 'happy', emoji: '😊', label: 'Senang', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { type: 'peaceful', emoji: '🧘', label: 'Damai', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { type: 'neutral', emoji: '😐', label: 'Biasa Saja', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  { type: 'excited', emoji: '🤩', label: 'Bersemangat', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  { type: 'tired', emoji: '😴', label: 'Lelah', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  { type: 'sad', emoji: '😢', label: 'Sedih', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
];

interface NotesViewProps {
  notes: DailyNote[];
  addNote: (note: Omit<DailyNote, 'id' | 'createdAt' | 'updatedAt'>) => DailyNote;
  deleteNote: (id: string) => void;
  addReminders: (reminders: Omit<Reminder, 'id' | 'isConfirmed' | 'isTriggered' | 'isAcknowledged'>[]) => void;
}

export default function NotesView({ notes, addNote, deleteNote, addReminders }: NotesViewProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mood, setMood] = useState<MoodType>('neutral');
  const [tagInput, setTagInput] = useState('');
  
  // AI Reminder states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedReminders, setDetectedReminders] = useState<{ title: string; dateTime: string; description?: string; sourceText: string; checked: boolean }[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Search & Filter notes
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [selectedNote, setSelectedNote] = useState<DailyNote | null>(null);

  // Auto-detect reminders from text via AI
  const handleDetectReminders = async () => {
    if (!content.trim()) {
      setAiError("Tulis konten catatan harian terlebih dahulu agar AI dapat menganalisis.");
      return;
    }
    setAiError(null);
    setIsAnalyzing(true);
    setDetectedReminders([]);

    try {
      // Send content to server API
      const res = await fetch("/api/analyze-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          currentDate: new Date(date).toISOString() // reference relative to date of note
        })
      });

      if (!res.ok) {
        throw new Error("Gagal menganalisis catatan. Coba periksa koneksi Anda.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.reminders && data.reminders.length > 0) {
        setDetectedReminders(
          data.reminders.map((rem: any) => ({
            ...rem,
            checked: true
          }))
        );
      } else {
        setAiError("AI tidak menemukan rencana atau agenda khusus dalam tulisan Anda kali ini.");
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Terjadi gangguan saat menghubungkan ke asisten AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    // Parse tags
    const tags = tagInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0)
      .map(t => t.startsWith('#') ? t : `#${t}`);

    // Add note
    const newNote = addNote({
      title,
      content,
      date,
      mood,
      tags
    });

    // Add checked AI reminders
    const remindersToCreate = detectedReminders
      .filter(r => r.checked)
      .map(r => ({
        noteId: newNote.id,
        title: r.title,
        dateTime: r.dateTime,
        description: r.description || `Diingatkan otomatis dari catatan harian: ${newNote.title}`,
        sourceText: r.sourceText
      }));

    if (remindersToCreate.length > 0) {
      addReminders(remindersToCreate);
    }

    // Reset Form
    setTitle('');
    setContent('');
    setTagInput('');
    setMood('neutral');
    setDetectedReminders([]);
    setAiError(null);
  };

  // Helper formatting dates in ID locale
  const formatDateID = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Filter processes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMood = filterMood === 'all' || note.mood === filterMood;
    return matchesSearch && matchesMood;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="notes-view-root">
      
      {/* LEFT PANEL: Create / Write Notes */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                Tulis Cerita Hari Ini
              </h2>
              <p className="text-xs text-slate-500 mt-1">Tuangkan perasaan dan agenda Anda dalam lembaran ini.</p>
            </div>
            
            {/* Note Date Selection */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent focus:outline-hidden font-medium text-slate-700 pointer-events-auto cursor-pointer"
              />
            </div>
          </div>

          <form onSubmit={handleSaveNote} className="space-y-4">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Catatan</label>
              <input
                id="note-title-input"
                type="text"
                placeholder="Judul hari ini... (misal: Hari yang Ramai di Kantor)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-300 focus:bg-white transition-colors"
              />
            </div>

            {/* Mood Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Suasana Hati (Mood)</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {MOODS.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setMood(item.type)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center group cursor-pointer ${
                      mood === item.type 
                        ? `${item.bg} scale-[1.03] shadow-xs` 
                        : 'border-slate-100 hover:border-slate-200 bg-white/50 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl mb-1 filter drop-shadow-xs group-hover:scale-110 transition-transform">{item.emoji}</span>
                    <span className={`text-[10px] font-medium ${mood === item.type ? item.color : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Cerita Anda</label>
                
                {/* AI Detection Trigger Button */}
                <button
                  type="button"
                  onClick={handleDetectReminders}
                  disabled={isAnalyzing || !content.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100/80 disabled:opacity-55 disabled:cursor-not-allowed transition-all text-[11px] font-medium text-indigo-600"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mendeteksi...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Deteksi Pengingat (AI)
                    </>
                  )}
                </button>
              </div>
              <textarea
                id="note-content-input"
                placeholder="Tuliskan pengalaman menyenangkan Anda hari ini. Jika Anda menulis rencana seperti 'besok saya ada janji makan malam jam 7 malam', kecerdasan AI dapat mengekstrak pengingatnya secara otomatis..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                required
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-300 focus:bg-white transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* AI Detected Reminders Panel */}
            <AnimatePresence>
              {(isAnalyzing || detectedReminders.length > 0 || aiError) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                          Agenda Terdeteksi AI
                        </h4>
                      </div>
                      {detectedReminders.length > 0 && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-medium px-2 py-0.5 rounded-full">
                          {detectedReminders.length} Remind
                        </span>
                      )}
                    </div>

                    {isAnalyzing && (
                      <div className="py-6 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                        <span className="text-xs text-indigo-600 font-medium animate-pulse">Menghubungi asisten AI untuk memindai jadwal...</span>
                      </div>
                    )}

                    {aiError && (
                      <div className="flex gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{aiError}</span>
                      </div>
                    )}

                    {!isAnalyzing && detectedReminders.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="text-[11px] text-indigo-700">Kami mendeteksi janji berikut. Centang untuk menyimpan ke daftar pengingat otomatis Anda:</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {detectedReminders.map((reminder, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => {
                                const copy = [...detectedReminders];
                                copy[idx].checked = !copy[idx].checked;
                                setDetectedReminders(copy);
                              }}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                reminder.checked 
                                  ? 'bg-white border-indigo-200 shadow-3xs' 
                                  : 'bg-indigo-50/20 border-transparent hover:bg-white/40'
                              }`}
                            >
                              <div className="mt-0.5">
                                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                                  reminder.checked 
                                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                                    : 'border-slate-300 bg-white'
                                }`}>
                                  {reminder.checked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{reminder.title}</p>
                                  <span className="text-[10px] text-slate-500 whitespace-nowrap bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                    {new Date(reminder.dateTime).toLocaleString('id-ID', {
                                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                {reminder.description && (
                                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{reminder.description}</p>
                                )}
                                <p className="text-[9px] text-indigo-500 italic mt-0.5">"{reminder.sourceText}"</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tag / Label (Pisahkan dengan Koma)</label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="pekerjaan, bersyukur, hobi"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden focus:border-slate-300 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium p-3 rounded-xl transition-all shadow-sm shadow-teal-600/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan Lembar Catatan
            </button>

          </form>
        </div>
      </div>

      {/* RIGHT PANEL: History & Search */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
          <h3 className="text-base font-semibold text-slate-800 tracking-tight mb-4">Urutan Catatan</h3>
          
          {/* Controls: Search & Category */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari catatan or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
            
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setFilterMood('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border shrink-0 transition-colors cursor-pointer ${
                  filterMood === 'all' 
                    ? 'bg-slate-800 border-slate-800 text-white' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua Mood
              </button>
              {MOODS.map(m => (
                <button
                  key={m.type}
                  onClick={() => setFilterMood(m.type)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                    filterMood === m.type 
                      ? `${m.bg} font-semibold` 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes Feed */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredNotes.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
              <p className="text-sm text-slate-500">Belum ada catatan harian yang cocok.</p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const currentMoodObj = MOODS.find(m => m.type === note.mood) || MOODS[2];
              return (
                <div 
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="bg-white border border-slate-100 hover:border-slate-300 rounded-xl p-4 transition-all hover:shadow-xs cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg filter drop-shadow-3xs" title={currentMoodObj.label}>{currentMoodObj.emoji}</span>
                        <h4 className="text-sm font-semibold text-slate-800 group-hover:text-teal-600 truncate transition-colors">
                          {note.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium mb-2">{formatDateID(note.date)}</p>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  </div>

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-slate-50">
                      {note.tags.map((t, idx) => (
                        <span key={idx} className="bg-slate-50 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-md font-medium border border-slate-100">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL NOTE MODAL / VIEW DRAWER */}
      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl filter drop-shadow-xs">
                    {MOODS.find(m => m.type === selectedNote.mood)?.emoji || '😐'}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">{selectedNote.title}</h3>
                    <p className="text-xs text-slate-400 font-medium">{formatDateID(selectedNote.date)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNote(null)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 p-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>

              {/* Content */}
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap py-2">
                {selectedNote.content}
              </div>

              {/* Tags */}
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                  {selectedNote.tags.map((t, index) => (
                    <span key={index} className="bg-slate-50 text-slate-500 border border-slate-200/50 text-[10px] px-2 py-0.5 rounded-lg font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer Delete */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Apakah Anda yakin ingin menghapus lembar catatan ini?")) {
                      deleteNote(selectedNote.id);
                      setSelectedNote(null);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Catatan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
