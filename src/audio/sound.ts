// SOM DO CASTELO
// Tudo é sintetizado na hora com WebAudio: nenhum arquivo de áudio para baixar.
// Música: um bordão grave (quinta) e um alaúde dedilhando notas de uma escala
// modal, em três climas (dia, noite, tensão) que trocam com cross-fade.
// Efeitos: clique de madeira, pergaminho, moedas, sino, multidão, tambores...
// O navegador só libera áudio depois do primeiro toque: até lá, nada toca.

export type MusicMood = 'dia' | 'noite' | 'tensao' | 'festa' | 'luto' | 'silencio';
export type Sfx = 'click' | 'page' | 'coin' | 'bell' | 'good' | 'bad' | 'choose' | 'sting' | 'crown' | 'whisper' | 'drum' | 'sword' | 'door';
export type CrowdSound = 'aplausos' | 'vaias' | 'murmurios' | 'gritos' | 'escudos' | 'silencio' | 'objetos' | 'lenços';

interface Prefs { music: boolean; sfx: boolean }
const KEY = 'king-or-not-audio';

// escalas (semitons a partir da tônica) e andamento de cada clima
const MOODS: Record<Exclude<MusicMood, 'silencio'>, { root: number; scale: number[]; beat: number; density: number; drone: number; vol: number; harmony: number; perc: number }> = {
  // dia: ré maior, andamento de feira, terças por cima e um pandeiro leve
  dia: { root: 50, scale: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], beat: 0.3, density: 0.72, drone: 0.035, vol: 0.55, harmony: 0.45, perc: 0.5 },
  // noite: sol maior pentatônica, calma (aconchego, não tristeza)
  noite: { root: 55, scale: [0, 2, 4, 7, 9, 12, 14, 16], beat: 0.48, density: 0.55, drone: 0.03, vol: 0.45, harmony: 0.3, perc: 0 },
  // tensão: lá frígio, só nas urgências, na investigação e na guerra
  tensao: { root: 45, scale: [0, 1, 3, 5, 7, 8, 12], beat: 0.32, density: 0.5, drone: 0.06, vol: 0.5, harmony: 0, perc: 0.35 },
  // festa: sol maior rápido, dança
  festa: { root: 55, scale: [0, 2, 4, 5, 7, 9, 12, 14, 16], beat: 0.22, density: 0.85, drone: 0.03, vol: 0.55, harmony: 0.6, perc: 0.8 },
  // luto: sol menor, lento (só o velório e as derrotas)
  luto: { root: 43, scale: [0, 3, 5, 7, 8, 12], beat: 0.9, density: 0.35, drone: 0.06, vol: 0.5, harmony: 0, perc: 0 },
};
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private prefs: Prefs = { music: true, sfx: true };
  private mood: MusicMood = 'silencio';
  private layer: { gain: GainNode; stop: () => void } | null = null;
  private timer = 0;
  private nextNote = 0;
  private step = 0;
  private lastNote = 0;

  constructor() {
    try { const p = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (p) this.prefs = { music: p.music !== false, sfx: p.sfx !== false }; } catch { /* sem armazenamento */ }
    // o primeiro toque em qualquer lugar libera o som
    const unlock = () => { this.init(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend(); else void this.ctx.resume();
    });
  }

  get musicOn() { return this.prefs.music; }
  get sfxOn() { return this.prefs.sfx; }
  toggleMusic() { this.prefs.music = !this.prefs.music; this.savePrefs(); this.applyVolumes(); }
  toggleSfx() { this.prefs.sfx = !this.prefs.sfx; this.savePrefs(); this.applyVolumes(); }
  private savePrefs() { try { localStorage.setItem(KEY, JSON.stringify(this.prefs)); } catch { /* ok */ } }

  private init() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    // um pouco de compressão para nada estourar no celular
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
    // ruído branco reaproveitado por pergaminho, multidão, tambor...
    const n = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    const want = this.mood;
    this.mood = 'silencio';
    this.setMood(want);
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.prefs.music ? 1 : 0, t, 0.2);
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfx ? 0.8 : 0, t, 0.05);
  }

  // ---------- música ----------
  setMood(m: MusicMood) {
    if (m === this.mood && (this.layer || m === 'silencio')) return;
    this.mood = m;
    if (!this.ctx) return; // toca quando o som for liberado
    const ctx = this.ctx, t = ctx.currentTime;
    // o clima anterior some devagar
    if (this.layer) { const old = this.layer; old.gain.gain.setTargetAtTime(0, t, 0.9); window.setTimeout(() => old.stop(), 4000); this.layer = null; }
    window.clearInterval(this.timer);
    if (m === 'silencio') return;
    const M = MOODS[m];
    const gain = ctx.createGain(); gain.gain.value = 0; gain.gain.setTargetAtTime(M.vol, t, 1.2);
    gain.connect(this.musicBus);
    // bordão: tônica e quinta, serrote filtrado com um vibrato bem lento
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.7;
    const dg = ctx.createGain(); dg.gain.value = M.drone;
    lp.connect(dg).connect(gain);
    const oscs: OscillatorNode[] = [];
    for (const [semi, det] of [[-12, 0], [-5, 4], [0, -6]] as const) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(M.root + semi); o.detune.value = det;
      o.connect(lp); o.start(); oscs.push(o);
    }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lg = ctx.createGain(); lg.gain.value = 140; lfo.connect(lg).connect(lp.frequency); lfo.start(); oscs.push(lfo);
    this.layer = { gain, stop: () => { for (const o of oscs) try { o.stop(); } catch { /* já parou */ } gain.disconnect(); } };
    // o alaúde: agenda notas um pouco à frente (mais estável que setTimeout)
    this.nextNote = t + 0.6;
    this.step = 0;
    const layer = this.layer;
    this.timer = window.setInterval(() => {
      if (!this.ctx || this.layer !== layer) return;
      while (this.nextNote < this.ctx.currentTime + 0.5) {
        this.pluckStep(M, gain, this.nextNote);
        this.nextNote += M.beat * (this.step % 8 === 7 ? 2 : 1);
        this.step++;
      }
    }, 150);
  }

  private pluckStep(M: (typeof MOODS)['dia'], out: GainNode, at: number) {
    // frases de 8 passos: começa e termina perto da tônica, caminha por graus vizinhos
    const phrasePos = this.step % 8;
    if (phrasePos !== 0 && Math.random() > M.density) return;
    const sc = M.scale;
    let idx = phrasePos === 0 || phrasePos === 7 ? (Math.random() < 0.6 ? 0 : 4 % sc.length) : this.lastNote + Math.round((Math.random() - 0.5) * 3);
    idx = Math.max(0, Math.min(sc.length - 1, idx));
    this.lastNote = idx;
    this.pluck(hz(M.root + 12 + sc[idx]), at, out, 0.26);
    // terça (dois graus acima) por cima: soa como duas cordas, alegre
    if (M.harmony && Math.random() < M.harmony) this.pluck(hz(M.root + 12 + sc[Math.min(sc.length - 1, idx + 2)]), at + 0.012, out, 0.14);
    // pandeiro leve no contratempo
    if (M.perc && Math.random() < M.perc) this.shaker(at + M.beat / 2, out);
    if (phrasePos === 0 && Math.random() < 0.5) this.pluck(hz(M.root + sc[0]), at, out, 0.16); // baixo no tempo forte
  }

  private shaker(at: number, out: AudioNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.05, at + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, at + 0.08);
    src.connect(f).connect(g).connect(out); src.start(at, Math.random()); src.stop(at + 0.1);
  }

  // corda dedilhada: triângulo + harmônico com ataque curto e queda exponencial
  private pluck(f: number, at: number, out: AudioNode, vol: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, at + 1.6);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, at); lp.frequency.exponentialRampToValueAtTime(f * 1.5, at + 0.8);
    g.connect(lp).connect(out);
    for (const [mul, type, amp] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]] as const) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul;
      const og = ctx.createGain(); og.gain.value = amp;
      o.connect(og).connect(g); o.start(at); o.stop(at + 1.7);
    }
  }

  // ---------- efeitos ----------
  private noise(at: number, dur: number, filter: BiquadFilterType, freq: number, q: number, vol: number, out: AudioNode = this.sfxBus, attack = 0.005) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    src.connect(f).connect(g).connect(out);
    src.start(at, Math.random() * 1.5); src.stop(at + dur + 0.05);
    return { f, g };
  }
  private tone(at: number, f: number, dur: number, type: OscillatorType, vol: number, out: AudioNode = this.sfxBus, attack = 0.004) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    o.connect(g).connect(out); o.start(at); o.stop(at + dur + 0.05);
    return o;
  }

  play(s: Sfx) {
    if (!this.ctx || !this.prefs.sfx) return;
    const t = this.ctx.currentTime + 0.01;
    switch (s) {
      case 'click': this.tone(t, 900, 0.05, 'triangle', 0.12); this.noise(t, 0.03, 'bandpass', 2400, 2, 0.08); break;
      case 'page': { const n = this.noise(t, 0.28, 'bandpass', 3000, 0.8, 0.12, this.sfxBus, 0.03); n.f.frequency.setValueAtTime(1800, t); n.f.frequency.linearRampToValueAtTime(4200, t + 0.25); break; }
      case 'coin': for (const [i, f] of [1568, 2093, 2637].entries()) this.tone(t + i * 0.06, f, 0.35, 'sine', 0.12); break;
      case 'bell': {
        // sino de igreja: parciais inarmônicas com queda longa
        for (const [mul, amp, dur] of [[0.5, 0.25, 4], [1, 0.3, 3.5], [1.19, 0.15, 3], [1.5, 0.12, 2.5], [2, 0.1, 2], [2.74, 0.06, 1.5]] as const) this.tone(t, 330 * mul, dur, 'sine', amp, this.sfxBus, 0.002);
        break;
      }
      case 'good': [0, 4, 7].forEach((st, i) => this.tone(t + i * 0.09, hz(72 + st), 0.5, 'triangle', 0.12)); break;
      case 'bad': this.tone(t, 110, 0.45, 'sawtooth', 0.08); this.tone(t, 116, 0.45, 'sawtooth', 0.06); this.noise(t, 0.2, 'lowpass', 300, 1, 0.15); break;
      case 'choose': this.tone(t, hz(79), 0.4, 'sine', 0.1); this.tone(t + 0.05, hz(86), 0.5, 'sine', 0.07); break;
      case 'sting': {
        // susto: tambor grave e um acorde menor dissonante
        this.noise(t, 0.6, 'lowpass', 160, 1, 0.5);
        this.tone(t, 55, 0.8, 'sine', 0.35);
        for (const st of [0, 1, 6]) this.tone(t + 0.05, hz(57 + st), 1.6, 'sawtooth', 0.035, this.sfxBus, 0.08);
        break;
      }
      case 'crown': {
        for (const [i, st] of [0, 7, 12, 16, 19, 24].entries()) this.tone(t + i * 0.07, hz(67 + st), 1.8 - i * 0.15, 'triangle', 0.08);
        this.tone(t, hz(55), 2.5, 'sine', 0.12);
        break;
      }
      case 'whisper': this.noise(t, 1.2, 'bandpass', 2600, 3, 0.05, this.sfxBus, 0.25); break;
      case 'drum': for (const i of [0, 0.22, 0.44]) { this.noise(t + i, 0.3, 'lowpass', 180, 1, 0.45); this.tone(t + i, 70, 0.3, 'sine', 0.3); } break;
      case 'sword': { const o = this.tone(t, 2200, 0.7, 'square', 0.04); o.frequency.exponentialRampToValueAtTime(1500, t + 0.7); this.noise(t, 0.15, 'highpass', 4000, 1, 0.2); break; }
      case 'door': this.noise(t, 0.5, 'lowpass', 220, 2, 0.35); this.tone(t, 82, 0.4, 'sine', 0.2); break;
    }
  }

  // a praça reage: ruído de multidão modulado
  crowd(kind: CrowdSound, size = 1) {
    if (!this.ctx || !this.prefs.sfx) return;
    const t = this.ctx.currentTime + 0.01;
    const v = Math.min(1, 0.4 + size * 0.6);
    switch (kind) {
      case 'aplausos': for (let i = 0; i < 40; i++) this.noise(t + Math.random() * 1.8, 0.05, 'bandpass', 1800 + Math.random() * 1500, 1.5, 0.12 * v); break;
      case 'gritos': { const n = this.noise(t, 2.2, 'bandpass', 700, 1.2, 0.3 * v, this.sfxBus, 0.15); n.f.frequency.linearRampToValueAtTime(1100, t + 0.8); for (let i = 0; i < 25; i++) this.noise(t + Math.random() * 1.6, 0.05, 'bandpass', 2200, 1.5, 0.09 * v); break; }
      case 'vaias': case 'objetos': { const n = this.noise(t, 2, 'bandpass', 320, 3, 0.35 * v, this.sfxBus, 0.25); n.f.frequency.linearRampToValueAtTime(240, t + 1.8); this.tone(t, 150, 1.8, 'sawtooth', 0.03 * v, this.sfxBus, 0.3); break; }
      case 'murmurios': this.noise(t, 1.8, 'bandpass', 500, 1, 0.14 * v, this.sfxBus, 0.4); break;
      case 'escudos': for (const i of [0, 0.5, 1]) { this.noise(t + i, 0.12, 'bandpass', 900, 2, 0.35 * v); this.tone(t + i, 90, 0.2, 'sine', 0.25 * v); } break;
      case 'lenços': this.noise(t, 1.4, 'highpass', 3000, 0.5, 0.05 * v, this.sfxBus, 0.3); break;
      case 'silencio': break;
    }
  }
}

export const sound = new Sound();
