import React, { useState, useEffect } from 'react';
import { Reminder } from '../types';
import { Bell, Calendar, Clock, Trash2, Plus, Check, CheckCircle2, AlertCircle, Sparkles, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTick } from '../lib/audio';

interface RemindersViewProps {
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, 'id' | 'isConfirmed' | 'isTriggered' | 'isAcknowledged'>) => void;
  deleteReminder: (id: string) => void;
  toggleConfirmReminder: (id: string) => void;
  acknowledgeReminder: (id: string) => void;
}

export default function RemindersView({ 
  reminders, 
  addReminder, 
  deleteReminder, 
  toggleConfirmReminder, 
  acknowledgeReminder 
}: RemindersViewProps) {
  
  // Manual reminder form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [description, setDescription] = useState('');
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);

  // Time ticker to update countdowns
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000); // update every 10s is perfect for rendering relative times
    return () => clearInterval(timer);
  }, []);

  const handleCreateManualReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;

    // Combine date & time into ISO string
    const combinedDateTime = new Date(`${date}T${time}`).toISOString();

    addReminder({
      title,
      dateTime: combinedDateTime,
      description
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setTime('09:00');
    setDate(new Date().toISOString().split('T')[0]);
    setIsManualFormOpen(false);
    playTick();
  };

  // Helper remaining time text
  const getRemainingTimeText = (targetIsoStr: string) => {
    const target = new Date(targetIsoStr);
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return "Waktu telah tiba!";
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Dalam ${diffDays} hari ${diffHours % 24} jam`;
    }
    if (diffHours > 0) {
      return `Dalam ${diffHours} jam ${diffMins % 60} menit`;
    }
    return `Dalam ${diffMins} menit`;
  };

  // Format dates cleanly
  const formatDateTimeID = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Split reminders into segments
  const upcomingReminders = reminders.filter(r => new Date(r.dateTime).getTime() > now.getTime() && !r.isAcknowledged);
  const pastReminders = reminders.filter(r => (new Date(r.dateTime).getTime() <= now.getTime() || r.isTriggered) && !r.isAcknowledged);
  const dismissedReminders = reminders.filter(r => r.isAcknowledged);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="reminders-view-root">
      
      {/* LEFT COLUMN: Manage Reminders Form & Summary */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Toggle Form Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">Manajemen Alarm</h3>
              <p className="text-[11px] text-slate-400">Buat atau kelola konfigurasi pengingat Anda.</p>
            </div>
            
            <button
              onClick={() => {
                setIsManualFormOpen(!isManualFormOpen);
                playTick();
              }}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
              title="Tambah Pengingat Baru"
            >
              <Plus className={`w-4 h-4 transition-transform duration-300 ${isManualFormOpen ? 'rotate-45 text-rose-500' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Pengingat Berjalan</p>
              <p className="text-xl font-bold text-slate-800 tracking-tight">{upcomingReminders.length} <span className="text-xs font-normal text-slate-500">jadwal masa depan</span></p>
            </div>
          </div>

          {/* Quick instructions on auto reminders */}
          <div className="mt-4 p-3.5 rounded-xl bg-indigo-55/5 border border-indigo-100/50 flex gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-indigo-950">Ekstraksi Otomatis</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                Tulis catatan dan pencet tombol <span className="font-semibold text-indigo-600">Deteksi Pengingat</span> di menu Note. Asisten AI akan merangkum dan mendaftarkannya disini secara otomatis!
              </p>
            </div>
          </div>
        </div>

        {/* Manual Reminder Creation Form (Animated Box) */}
        <AnimatePresence>
          {isManualFormOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Tambah Pengingat Manual</h4>
                <form onSubmit={handleCreateManualReminder} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Kegiatan / Tugas</label>
                    <input
                      type="text"
                      placeholder="Contoh: Periksa kesehatan gigi"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tanggal</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jam alarm</label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Catatan Tambahan (Opsional)</label>
                    <textarea
                      placeholder="Rincian agenda atau persiapan penting..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:bg-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-teal-600/5 transition-all"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Pasang Pengingat
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT COLUMN: Active List & Completed logs */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* UPCOMING REMINDERS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Timer className="w-4 h-4 text-teal-600" />
              Pengingat Mendatang ({upcomingReminders.length})
            </h3>
          </div>

          <div className="space-y-3">
            {upcomingReminders.length === 0 ? (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                <p className="text-xs text-slate-400">Tidak ada pengingat masa depan yang aktif.</p>
              </div>
            ) : (
              upcomingReminders.map((reminder) => (
                <div 
                  key={reminder.id}
                  className={`bg-white rounded-xl border border-slate-100 hover:border-slate-200 p-4 transition-all shadow-3xs flex items-start gap-4 ${
                    !reminder.isConfirmed ? 'opacity-70 bg-slate-50/30' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                    <Bell className="w-4 h-4 animate-swing" style={{ transformOrigin: 'top center' }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          {reminder.title}
                          {reminder.sourceText && (
                            <span className="bg-indigo-50 text-indigo-700 text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Otomatis
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-3 text-slate-400 text-[10px] mt-1.5 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDateTimeID(reminder.dateTime)}
                          </span>
                          <span className="bg-teal-50 text-teal-700 font-semibold px-1.5 py-0.5 rounded-xs flex items-center gap-1 text-[9px]">
                            <Clock className="w-2.5 h-2.5" />
                            {getRemainingTimeText(reminder.dateTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {reminder.description && (
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 border border-slate-100 p-2 rounded-lg leading-relaxed">
                        {reminder.description}
                      </p>
                    )}

                    {reminder.sourceText && (
                      <p className="text-[10px] text-slate-400 italic mt-1.5 pl-2 border-l-2 border-slate-200">
                        Rujukan catatan: "{reminder.sourceText}"
                      </p>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0 self-start">
                    
                    {/* Toggle activation (if auto-extracted, can enable/disable) */}
                    {!reminder.isConfirmed && (
                      <button
                        onClick={() => toggleConfirmReminder(reminder.id)}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-medium text-[10px] rounded-lg transition-colors cursor-pointer"
                        title="Klik untuk mengaktifkan agenda draf ini"
                      >
                        Aktifkan
                      </button>
                    )}

                    {/* Selesai / Dismiss */}
                    <button
                      onClick={() => {
                        acknowledgeReminder(reminder.id);
                        playTick();
                      }}
                      className="p-1 px-1.5 bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                      title="Tandai Selesai"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Selesai
                    </button>

                    {/* Hapus */}
                    <button
                      onClick={() => {
                        if (confirm("Hapus pengingat ini?")) {
                          deleteReminder(reminder.id);
                          playTick();
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LOGS: PAST TRIGGERED REMINDERS */}
        {pastReminders.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-500" />
              Sudah Berbunyi / Melewati Waktu ({pastReminders.length})
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {pastReminders.map((reminder) => (
                <div 
                  key={reminder.id}
                  className="bg-slate-50 rounded-xl border border-slate-100 p-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 line-through truncate">{reminder.title}</p>
                    <p className="text-[10px] text-indigo-500 flex items-center gap-1 mt-0.5 font-medium">
                      <Clock className="w-2.5 h-2.5" />
                      Dipicu pada {formatDateTimeID(reminder.dateTime)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => acknowledgeReminder(reminder.id)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-teal-50 text-[10px] font-semibold text-slate-600 hover:text-teal-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Keluarkan
                    </button>
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      className="p-1 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPLETED JADWAL logs */}
        {dismissedReminders.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Arsip Pengingat Selesai ({dismissedReminders.length})
              </h3>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
              {dismissedReminders.map((reminder) => (
                <div 
                  key={reminder.id}
                  className="bg-white rounded-xl border border-slate-200/40 p-3 flex items-center justify-between gap-3 shadow-3xs hover:bg-slate-50/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 line-through truncate">{reminder.title}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{new Date(reminder.dateTime).toLocaleDateString('id', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    className="p-1 hover:text-rose-600 hover:bg-rose-50 text-slate-400 rounded-md transition-all shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
