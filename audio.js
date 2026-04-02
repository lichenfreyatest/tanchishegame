/**
 * 音效模块 - 使用 Web Audio API 生成音效
 * 无需外部音频文件
 */

export class AudioManager {
  constructor() {
    this.enabled = true;
    this.audioCtx = null;
    this.bgmNode = null;
    this.bgmGain = null;
    this.isBgmPlaying = false;
  }

  init() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API 不可用');
      this.enabled = false;
    }
  }

  ensureContext() {
    if (!this.audioCtx) {
      this.init();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBgm();
    }
  }

  // 吃食物音效 - 欢快的上升音
  playEatSound() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 主音
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523, now);       // C5
    osc1.frequency.setValueAtTime(659, now + 0.06); // E5
    osc1.frequency.setValueAtTime(784, now + 0.12); // G5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // 和声
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1047, now + 0.05);
    gain2.gain.setValueAtTime(0.08, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.2);
  }

  // 游戏结束音效 - 下降的悲伤音
  playGameOverSound() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 下降音阶
    const notes = [392, 349, 330, 262]; // G4, F4, E4, C4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.1, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.2);
    });

    // 低沉的结束音
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(130, now + 0.6);
    bassOsc.frequency.exponentialRampToValueAtTime(65, now + 1.2);
    bassGain.gain.setValueAtTime(0.12, now + 0.6);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    bassOsc.start(now + 0.6);
    bassOsc.stop(now + 1.2);
  }

  // 按钮点击音效
  playClickSound() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 背景音乐 - 简单的循环旋律
  startBgm() {
    if (!this.enabled || this.isBgmPlaying) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    this.isBgmPlaying = true;
    this.playBgmLoop();
  }

  playBgmLoop() {
    if (!this.enabled || !this.isBgmPlaying) return;
    
    const ctx = this.audioCtx;
    if (!ctx) return;
    const now = ctx.currentTime;

    // 简单的背景旋律 - C大调音阶循环
    const melody = [
      { freq: 262, dur: 0.3 }, // C4
      { freq: 294, dur: 0.3 }, // D4
      { freq: 330, dur: 0.3 }, // E4
      { freq: 349, dur: 0.3 }, // F4
      { freq: 392, dur: 0.3 }, // G4
      { freq: 349, dur: 0.3 }, // F4
      { freq: 330, dur: 0.3 }, // E4
      { freq: 294, dur: 0.3 }, // D4
    ];

    let time = now;
    const nodes = [];

    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, time);
      gain.gain.setValueAtTime(0.03, time);
      gain.gain.setValueAtTime(0.03, time + note.dur * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + note.dur);
      nodes.push({ osc, gain });
      time += note.dur;
    });

    this.bgmNodes = nodes;
    
    // 循环播放
    const totalDuration = melody.reduce((sum, n) => sum + n.dur, 0) * 1000;
    this.bgmTimer = setTimeout(() => {
      if (this.isBgmPlaying && this.enabled) {
        this.playBgmLoop();
      }
    }, totalDuration);
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // 转向音效
  playTurnSound() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}
