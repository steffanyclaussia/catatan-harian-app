import React, { useState } from 'react';
import { DailyNote, AnalyticalSummary } from '../types';
import { Sparkles, BarChart2, Heart, Award, Calendar, ChevronRight, Hash, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface AnalyticsViewProps {
  notes: DailyNote[];
}

export default function AnalyticsView({ notes }: AnalyticsViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AnalyticalSummary | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Compute general metrics
  const totalNotes = notes.length;

  // Streak calculation (consecutive dates)
  const calculateStreak = () => {
    if (notes.length === 0) return 0;
    
    // Sort unique dates descending
    const dates = Array.from(new Set(notes.map(n => n.date)))
      .map(dStr => new Date(dStr))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    let today = new Date();
    today.setHours(0,0,0,0);

    let yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Let's check if the first recorded date is either today or yesterday
    const firstRecorded = dates[0];
    firstRecorded.setHours(0,0,0,0);

    if (firstRecorded.getTime() !== today.getTime() && firstRecorded.getTime() !== yesterday.getTime()) {
      return 0; // streak broken
    }

    streak = 1;
    let expectedDate = new Date(firstRecorded);

    for (let i = 1; i < dates.length; i++) {
      const nextDate = dates[i];
      nextDate.setHours(0,0,0,0);

      // subtract 1 day from expected
      expectedDate.setDate(expectedDate.getDate() - 1);

      if (nextDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (nextDate.getTime() > expectedDate.getTime()) {
        continue; // multiple entries on same day / handled by unique Set, but just in case
      } else {
        break; // streak broke
      }
    }

    return streak;
  };

  const streakCount = calculateStreak();

  // Mood counts
  const moodLabelsMap: { [key: string]: { label: string; emoji: string; color: string; value: number } } = {
    happy: { label: 'Senang', emoji: '😊', color: '#f59e0b', value: 0 },
    peaceful: { label: 'Damai', emoji: '🧘', color: '#10b981', value: 0 },
    neutral: { label: 'Biasa Saja', emoji: '😐', color: '#64748b', value: 0 },
    excited: { label: 'Bersemangat', emoji: '🤩', color: '#f43f5e', value: 0 },
    tired: { label: 'Lelah', emoji: '😴', color: '#6366f1', value: 0 },
    sad: { label: 'Sedih', emoji: '😢', color: '#3b82f6', value: 0 }
  };

  notes.forEach(note => {
    if (moodLabelsMap[note.mood]) {
      moodLabelsMap[note.mood].value++;
    }
  });

  const moodChartData = Object.keys(moodLabelsMap).map(key => ({
    name: moodLabelsMap[key].emoji + ' ' + moodLabelsMap[key].label,
    count: moodLabelsMap[key].value,
    color: moodLabelsMap[key].color
  })).filter(item => item.count > 0);

  // Parse top recurring tags
  const tagsCounter: { [key: string]: number } = {};
  notes.forEach(note => {
    if (note.tags) {
      note.tags.forEach(tag => {
        tagsCounter[tag] = (tagsCounter[tag] || 0) + 1;
      });
    }
  });

  const popularTags = Object.keys(tagsCounter)
    .map(name => ({ name, count: tagsCounter[name] }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 5);

  // Sentiment distribution over time (for Area chart)
  const timelineData = [...notes]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((note, index) => {
      // Map mood to a numeric positivity baseline as fallback if no AI yet
      const moodValueMap: { [key: string]: number } = {
        happy: 85,
        excited: 95,
        peaceful: 75,
        neutral: 50,
        tired: 30,
        sad: 15
      };

      return {
        tanggal: new Date(note.date).toLocaleDateString('id', { day: 'numeric', month: 'short' }),
        'Positivity Score': moodValueMap[note.mood] || 50,
        judul: note.title
      };
    })
    .slice(-10); // Show last 10 entries for cleaner chart

  // Trigger AI Daily reflections/insights based on latest content
  const handleGenerateAIInsights = async () => {
    if (notes.length === 0) {
      setAiError("Anda perlu menulis setidaknya satu catatan harian!");
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setAiAnalysis(null);

    // Get content from the latest note to analyze
    const sortedNotes = [...notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestNote = sortedNotes[0];

    try {
      const res = await fetch("/api/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: latestNote.content })
      });

      if (!res.ok) throw new Error("Terjadi masalah saat menghubungi asisten AI.");
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAiAnalysis(data.insights);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Gagal membangkitkan refleksi psikonaratif AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="analytics-view-root">
      
      {/* LEFT ASPECT: KPI metrics & Visual Charts */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
            <p className="text-xs text-slate-400 font-medium font-sans">Total Jurnal</p>
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1">{totalNotes}</p>
            <span className="text-[10px] text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-sm mt-2 inline-block">Lembaran Cerita</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
            <p className="text-xs text-slate-400 font-medium font-sans">Beruntun Menulis</p>
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1">
              {streakCount} <span className="text-sm font-semibold text-slate-500">hari</span>
            </p>
            <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-sm mt-2 inline-block flex items-center gap-1 w-max">
              <Award className="w-3 h-3" /> Streak Aktif
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-400 font-medium font-sans font-sans">Rerata Energi</p>
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1">
              {notes.length > 0 
                ? `${Math.round(notes.reduce((acc, current) => {
                    const moodValueMap: { [key: string]: number } = { happy: 85, excited: 95, peaceful: 75, neutral: 50, tired: 30, sad: 15 };
                    return acc + (moodValueMap[current.mood] || 50);
                  }, 0) / notes.length)}%`
                : '0%'
              }
            </p>
            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-sm mt-2 inline-block flex items-center gap-1 w-max">
              <Heart className="w-3 h-3 fill-rose-500 stroke-rose-500" /> Skor Emosi Positif
            </span>
          </div>
        </div>

        {/* Recharts Charts Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Mood Distribution BarChart */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-teal-600" />
              <h4 className="text-sm font-semibold text-slate-800">Distribusi Mood Harian</h4>
            </div>

            <div className="h-60 w-full">
              {moodChartData.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center">
                  <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Belum ada chart data harian mood.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moodChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(241,245,249,0.5)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {moodChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Positivity score over time map AreaChart */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1 px-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-xs leading-none">AI</span>
              <h4 className="text-sm font-semibold text-slate-800">Tren Log Suasana Hati</h4>
            </div>

            <div className="h-60 w-full">
              {timelineData.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center">
                  <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Tulis log beberapa hari untuk memetakan tren emosi.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Positivity Score" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorPos)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* RIGHT ASPECT: Deep AI Mind Care reflection assistant */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Dynamic AI Insights Generator Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs relative overflow-hidden">
          {/* subtle abstract gradient in background */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-100/30 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-semibold text-slate-800">Analisis Psiko-Naratif (AI)</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-5">
            Dapatkan pemetaan emosional, rekomendasi refleksi hidup ramah, dan ringkasan kondisi kepribadian Anda berdasarkan tulisan harian terakhir.
          </p>

          <button
            onClick={handleGenerateAIInsights}
            disabled={isGenerating || notes.length === 0}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium p-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                Merangkum Tulisan...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                Minta Refleksi Harian AI
              </>
            )}
          </button>

          {notes.length === 0 && (
            <p className="text-[10px] text-amber-600 italic text-center mt-2">Simpan setidaknya 1 catatan harian untuk mengaktifkan asisten AI</p>
          )}

          {aiError && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 flex gap-1.5">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* AI generated insights outcome */}
          <AnimatePresence>
            {aiAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-6 space-y-4 pt-5 border-t border-slate-100"
              >
                {/* Mood Tag & Positivity Gauge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl filter drop-shadow-3xs">{aiAnalysis.moodEmoji}</span>
                    <span className="text-xs font-semibold text-slate-700 capitalize bg-slate-100 px-2 py-0.5 rounded-md">
                      {moodLabelsMap[aiAnalysis.moodLabel]?.label || aiAnalysis.moodLabel}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-medium">Energi Positif</p>
                    <p className="text-sm font-extrabold text-teal-600">{aiAnalysis.positivityScore}%</p>
                  </div>
                </div>

                {/* Main feedback paragraph */}
                <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-150/40 text-xs text-slate-700 leading-relaxed font-sans shadow-4xs">
                  "{aiAnalysis.summary}"
                </div>

                {/* Extracted themes */}
                {aiAnalysis.keyThemes && aiAnalysis.keyThemes.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fokus Utama</h4>
                    <div className="space-y-1.5">
                      {aiAnalysis.keyThemes.map((theme, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium font-sans">
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{theme}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Tags */}
                {aiAnalysis.suggestedTags && aiAnalysis.suggestedTags.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Rekomendasi Tag</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysis.suggestedTags.map((tag, idx) => (
                        <span key={idx} className="bg-indigo-50 text-indigo-700 font-semibold text-[10px] px-2 py-0.5 rounded-lg border border-indigo-100">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Popular Tags List in client side */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">Label Tersering</h4>
          {popularTags.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Belum ada label kustom.</p>
          ) : (
            <div className="space-y-2">
              {popularTags.map((tag, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-1 text-slate-700">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tag.name}</span>
                  </div>
                  <span className="bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-xs text-[10px]">
                    {tag.count} kali
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
