import React, { useEffect } from 'react';
import { Reminder } from '../types';
import { Bell, Check, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playChime } from '../lib/audio';

interface AlarmOverlayProps {
  activeAlarm: Reminder | null;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
}

export default function AlarmOverlay({ activeAlarm, onDismiss, onSnooze }: AlarmOverlayProps) {
  
  // Play chime periodically while alarm is active
  useEffect(() => {
    if (!activeAlarm) return;

    // Play right away
    playChime();

    // Play every 8 seconds while drawer is active
    const interval = setInterval(() => {
      playChime();
    }, 8000);

    return () => clearInterval(interval);
  }, [activeAlarm]);

  if (!activeAlarm) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[999]" id="alarm-overlay">
      
      {/* Visual glowing backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl animate-pulse delay-700 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 15 }}
        className="bg-white/95 border border-slate-100 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden"
      >
        
        {/* Animated Bell Header icon */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-lg scale-150 animate-ping duration-1000" />
            <div className="w-16 h-16 bg-teal-500 text-white rounded-full flex items-center justify-center shadow-lg relative z-10 animate-bounce">
              <Bell className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-5">⏰ Alarm Pengingat Harian!</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Waktu Anda Telah Tiba</p>
        </div>

        {/* Content body */}
        <div className="p-4 rounded-xl bg-slate-100/50 border border-slate-200/50 space-y-2">
          <h3 className="text-base font-extrabold text-slate-850 truncate">{activeAlarm.title}</h3>
          
          {activeAlarm.description && (
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {activeAlarm.description}
            </p>
          )}

          {activeAlarm.sourceText && (
            <div className="border-t border-slate-200/60 pt-2 mt-2">
              <p className="text-[10px] text-slate-400 italic">
                Sumber Catatan: "{activeAlarm.sourceText}"
              </p>
            </div>
          )}
        </div>

        {/* Bottom actions: Snooze & Dismiss */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          
          {/* Snooze */}
          <button
            onClick={() => onSnooze(activeAlarm.id)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Clock className="w-4 h-4" />
            Tunda 5 Menit
          </button>

          {/* Dismiss / Mark Done */}
          <button
            onClick={() => onDismiss(activeAlarm.id)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold p-3 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/10"
          >
            <Check className="w-4 h-4" />
            Selesai / Tutup
          </button>

        </div>

      </motion.div>
    </div>
  );
}
