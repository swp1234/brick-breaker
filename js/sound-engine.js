/**
 * Sound Engine - Web Audio API
 * Provides sound effects for the Brick Breaker game
 */

class SoundEngine {
    constructor() {
        this.enabled = this.getSoundPreference();
        this.audioContext = null;
        this.masterGain = null;
        this.init();
    }

    getSoundPreference() {
        const saved = localStorage.getItem('sound_enabled');
        return saved !== null ? saved === 'true' : true;
    }

    setSoundPreference(enabled) {
        localStorage.setItem('sound_enabled', enabled);
    }

    init() {
        try {
            if (!window.AudioContext && !window.webkitAudioContext) {
                console.warn('Web Audio API not supported');
                this.enabled = false;
                return;
            }

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // Resume audio context on user interaction
            if (this.audioContext.state === 'suspended') {
                const resume = () => {
                    this.audioContext.resume().then(() => {
                        document.removeEventListener('click', resume);
                        document.removeEventListener('touchend', resume);
                    });
                };
                document.addEventListener('click', resume);
                document.addEventListener('touchend', resume);
            }

            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.enabled ? 0.3 : 0;
        } catch (error) {
            console.warn('Audio context initialization failed:', error);
            this.enabled = false;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        this.setSoundPreference(this.enabled);
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? 0.3 : 0;
        }
        return this.enabled;
    }

    isEnabled() {
        return this.enabled && this.audioContext;
    }

    // Paddle collision sound (low tone)
    playPaddleSound() {
        if (!this.isEnabled()) return;

        try {
            const ctx = this.audioContext;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.frequency.value = 400;
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (error) {
            console.warn('Error playing paddle sound:', error);
        }
    }

    // Brick collision sound (mid tone)
    playBrickSound(type = 'normal') {
        if (!this.isEnabled()) return;

        try {
            const ctx = this.audioContext;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain);

            // Different frequencies for different brick types
            const frequencies = {
                'normal': 600,
                'strong': 700,
                'special': 800,
                'unbreakable': 500
            };

            osc.frequency.value = frequencies[type] || 600;
            osc.type = 'square';

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch (error) {
            console.warn('Error playing brick sound:', error);
        }
    }

    // Wall collision sound
    playWallSound() {
        if (!this.isEnabled()) return;

        try {
            const ctx = this.audioContext;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.frequency.value = 350;
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.08);
        } catch (error) {
            console.warn('Error playing wall sound:', error);
        }
    }

    // Power-up collected sound
    playPowerupSound() {
        if (!this.isEnabled()) return;

        try {
            const ctx = this.audioContext;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch (error) {
            console.warn('Error playing powerup sound:', error);
        }
    }

    // Game over sound
    playGameOverSound() {
        if (!this.isEnabled()) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            const notes = [400, 350, 300, 250];

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(this.masterGain);

                osc.frequency.value = freq;
                osc.type = 'sine';

                const startTime = now + idx * 0.1;
                gain.gain.setValueAtTime(0.1, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

                osc.start(startTime);
                osc.stop(startTime + 0.1);
            });
        } catch (error) {
            console.warn('Error playing game over sound:', error);
        }
    }

    // Level clear/success sound
    playSuccessSound() {
        if (!this.isEnabled()) return;

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            const notes = [600, 800, 1000];

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(this.masterGain);

                osc.frequency.value = freq;
                osc.type = 'sine';

                const startTime = now + idx * 0.1;
                gain.gain.setValueAtTime(0.1, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

                osc.start(startTime);
                osc.stop(startTime + 0.15);
            });
        } catch (error) {
            console.warn('Error playing success sound:', error);
        }
    }

    // Life lost sound
    playLifeLostSound() {
        if (!this.isEnabled()) return;

        try {
            const ctx = this.audioContext;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch (error) {
            console.warn('Error playing life lost sound:', error);
        }
    }

    // Laser sound (special effect)
    playLaserSound() {
        if (!this.isEnabled()) return;

        try {
            const ctx = this.audioContext;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.frequency.setValueAtTime(1500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
            osc.type = 'square';

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (error) {
            console.warn('Error playing laser sound:', error);
        }
    }
}

// Global instance
window.sfx = new SoundEngine();
