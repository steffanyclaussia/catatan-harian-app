/**
 * Synthesizes a beautiful Zen chime sound using standard Web Audio API
 */
export function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Arpeggio of positive frequencies: E5 (659Hz), A5 (880Hz), C#6 (1109Hz)
    const notes = [659.25, 880.00, 1109.73];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + index * 0.12);

      // Connect volume envelope
      gainNode.gain.setValueAtTime(0, now + index * 0.12);
      gainNode.gain.linearRampToValueAtTime(0.2, now + index * 0.12 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 1.5);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 1.6);
    });
  } catch (err) {
    console.warn("Audio Context failed to play chime:", err);
  }
}

export function playTick() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (err) {
    // Fail silently
  }
}
