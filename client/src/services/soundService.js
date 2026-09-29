/**
 * Sound synthesis service using Web Audio API
 * Generates warning sirens, ADAS collision pulses, alarm sounds, and UI chimes for the driver HUD.
 */

export const SIREN_PROFILES = [
  {
    id: 'modern_radar',
    name: 'Radar Collision Alert (ADAS)',
    description: 'Triple high-tech automotive collision warning pulses',
    tag: 'Recommended',
    toneClass: 'radar',
  },
  {
    id: 'hi_lo_emergency',
    name: 'Emergency Hi-Lo Siren',
    description: 'Alternating European two-tone vehicle siren',
    tag: 'Classic',
    toneClass: 'emergency',
  },
  {
    id: 'yelp_alarm',
    name: 'Interceptor Yelp Sweep',
    description: 'Rapid upward emergency vehicle frequency sweeps',
    tag: 'Urgent',
    toneClass: 'yelp',
  },
  {
    id: 'cockpit_master',
    name: 'Cockpit Master Caution',
    description: 'Harmonic triad aviation warning chime',
    tag: 'Pleasant',
    toneClass: 'caution',
  },
  {
    id: 'rapid_staccato',
    name: 'Staccato Pulsar Beep',
    description: 'Rapid 4-pulse sharp perimeter alert',
    tag: 'Digital',
    toneClass: 'pulsar',
  },
];

class SoundService {
  constructor() {
    this.audioCtx = null;
    this.currentProfile = 'modern_radar';
    this.volume = 0.85; // 0.0 to 1.0
    this.alarmLoopTimer = null;
    this.isAlarmLooping = false;

    if (typeof window !== 'undefined') {
      this.currentProfile = localStorage.getItem('pawalert_siren_profile') || 'modern_radar';
      const savedVol = localStorage.getItem('pawalert_siren_volume');
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol);
      }
    }
  }

  _initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  getProfiles() {
    return SIREN_PROFILES;
  }

  getProfile() {
    return this.currentProfile;
  }

  setProfile(profileId) {
    this.currentProfile = profileId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pawalert_siren_profile', profileId);
    }
  }

  getVolume() {
    return this.volume;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('pawalert_siren_volume', this.volume.toString());
    }
  }

  /**
   * Main driver warning siren playback
   */
  playWarningSiren(overrideProfile = null) {
    if (this.volume <= 0.01) return;
    const profile = overrideProfile || this.currentProfile;
    try {
      this._initContext();
      if (!this.audioCtx) return;

      switch (profile) {
        case 'hi_lo_emergency':
          this._playHiLoSiren();
          break;
        case 'yelp_alarm':
          this._playYelpSiren();
          break;
        case 'cockpit_master':
          this._playCockpitChime();
          break;
        case 'rapid_staccato':
          this._playStaccatoPulsar();
          break;
        case 'modern_radar':
        default:
          this._playModernRadar();
          break;
      }
    } catch (e) {
      console.warn('SoundService synthesis note:', e.message);
    }
  }

  /**
   * Continuous alarm sound loop for active danger zones (< 350m proximity)
   */
  startContinuousAlarm(intervalMs = 2800) {
    if (this.isAlarmLooping) return;
    this.isAlarmLooping = true;
    this.playWarningSiren();
    this.alarmLoopTimer = setInterval(() => {
      this.playWarningSiren();
    }, intervalMs);
  }

  stopContinuousAlarm() {
    this.isAlarmLooping = false;
    if (this.alarmLoopTimer) {
      clearInterval(this.alarmLoopTimer);
      this.alarmLoopTimer = null;
    }
  }

  /**
   * Profile 1: Modern ADAS Automotive Collision Radar Alert (Triple Pulse)
   */
  _playModernRadar() {
    const now = this.audioCtx.currentTime;
    const pulses = [0, 0.16, 0.32];
    const masterGain = this.volume;

    pulses.forEach((offset) => {
      const t = now + offset;
      
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(920, t);
      osc1.frequency.exponentialRampToValueAtTime(1480, t + 0.08);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1840, t);
      osc2.frequency.exponentialRampToValueAtTime(2960, t + 0.08);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.35 * masterGain, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(t);
      osc1.stop(t + 0.12);
      osc2.start(t);
      osc2.stop(t + 0.12);
    });
  }

  /**
   * Profile 2: European Emergency Hi-Lo Siren
   */
  _playHiLoSiren() {
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const masterGain = this.volume;

    osc.type = 'sawtooth';

    // Tone pattern: High -> Low -> High -> Low (960Hz <-> 720Hz)
    osc.frequency.setValueAtTime(960, now);
    osc.frequency.setValueAtTime(720, now + 0.22);
    osc.frequency.setValueAtTime(960, now + 0.44);
    osc.frequency.setValueAtTime(720, now + 0.66);

    gain.gain.setValueAtTime(0.28 * masterGain, now);
    gain.gain.setValueAtTime(0.28 * masterGain, now + 0.85);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.95);
  }

  /**
   * Profile 3: Rapid Interceptor Yelp Siren
   */
  _playYelpSiren() {
    const now = this.audioCtx.currentTime;
    const sweeps = [0, 0.2, 0.4];
    const masterGain = this.volume;

    sweeps.forEach((offset) => {
      const t = now + offset;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(550, t);
      osc.frequency.exponentialRampToValueAtTime(1450, t + 0.16);

      gain.gain.setValueAtTime(0.3 * masterGain, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  /**
   * Profile 4: Aviation Cockpit Master Caution Chime
   */
  _playCockpitChime() {
    const now = this.audioCtx.currentTime;
    const chord = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
    const masterGain = this.volume;

    chord.forEach((freq, idx) => {
      const t = now + idx * 0.08;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.3 * masterGain, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.75);
    });
  }

  /**
   * Profile 5: Digital Staccato Warning Pulsar
   */
  _playStaccatoPulsar() {
    const now = this.audioCtx.currentTime;
    const beeps = [0, 0.1, 0.2, 0.3];
    const masterGain = this.volume;

    beeps.forEach((offset) => {
      const t = now + offset;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1046.5, t); // C6

      gain.gain.setValueAtTime(0.22 * masterGain, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  /**
   * Gentle chime for standard UI notifications
   */
  playNotificationChime() {
    try {
      this._initContext();
      if (!this.audioCtx || this.volume <= 0.01) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.1); // A5

      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }
}

export const soundService = new SoundService();
