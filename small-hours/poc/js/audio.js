'use strict';
/* =============================================================================
   SMALL HOURS — Procedural audio. No asset files. All synthesized via WebAudio.
   Robust: every call is guarded; if WebAudio is unavailable or blocked, the
   game is silent but fully functional. Toggle with M.
   ============================================================================= */
const SOUND = (() => {
    let ctx = null, master = null, muted = false;
    let drone = null, hum = null, tone = null, heartTimer = null;

    function ensure() {
        if (ctx) return true;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
            return true;
        } catch (e) { ctx = null; return false; }
    }
    function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

    function osc(type, freq, gain, dest) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = freq; g.gain.value = gain;
        o.connect(g); g.connect(dest || master); o.start();
        return { o, g };
    }

    function startDrone() {
        if (!ensure() || drone) return; resume();
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.connect(master);
        const a = osc('sawtooth', 55, 0.10, lp);
        const b = osc('sawtooth', 55.4, 0.08, lp);  // slight detune = unease
        drone = { a, b, lp };
    }
    function startHum() {                              // fluorescent 60Hz buzz
        if (!ensure() || hum) return; resume();
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 120; bp.Q.value = 6; bp.connect(master);
        hum = { n: osc('square', 60, 0.015, bp), bp };
    }

    function heartbeat(bpm) {
        if (!ensure()) return; resume();
        stopHeart();
        const period = 60000 / (bpm || 60);
        const thump = () => {
            if (!ctx) return;
            const g = ctx.createGain(); g.connect(master);
            const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 60; o.connect(g);
            const now = ctx.currentTime;
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
            o.start(now); o.stop(now + 0.2);
        };
        heartTimer = setInterval(() => { thump(); setTimeout(thump, period * 0.28); }, period);
    }
    function stopHeart() { if (heartTimer) { clearInterval(heartTimer); heartTimer = null; } }

    function startTone() {                              // rising paralysis tension
        if (!ensure() || tone) return; resume();
        const t = osc('triangle', 110, 0.0, master);
        t.g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 12);
        t.o.frequency.linearRampToValueAtTime(190, ctx.currentTime + 12);
        tone = t;
    }
    function stopTone() { if (tone) { try { tone.o.stop(); } catch (e) {} tone = null; } }

    function stinger() {                                // sharp dissonant hit
        if (!ensure()) return; resume();
        [233, 247, 466].forEach((f, i) => {
            const g = ctx.createGain(); g.connect(master);
            const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(g);
            const now = ctx.currentTime;
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.25, now + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
            o.start(now); o.stop(now + 0.65);
        });
    }

    function silence() {                                // the loudest tool: cut all
        [drone && drone.a, drone && drone.b, hum && hum.n].forEach(x => { if (x) { try { x.o.stop(); } catch (e) {} } });
        drone = null; hum = null; stopTone(); stopHeart();
    }

    function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; }

    return { startDrone, startHum, heartbeat, stopHeart, startTone, stopTone, stinger, silence, toggleMute, ensure };
})();
