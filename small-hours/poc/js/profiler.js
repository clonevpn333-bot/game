'use strict';
/* =============================================================================
   SMALL HOURS — The Fear Profiler  (THE SURPRISE, demonstrated for real)
   See ../../docs/04_THE_SURPRISE.md

   Logs HOW you play — purely from normal mouse/keyboard input. No webcam, no
   mic, no network. At the end it reads your behavior back to you in a clinical
   report that is unsettlingly specific. Persistence ("the clinic remembers you")
   uses localStorage only and is trivially clearable.
   ============================================================================= */
const PROFILER = (() => {
    let d = blank();
    let lastMx = null;

    function blank() {
        return {
            start: Date.now(),
            readDisclosure: false,   // did you open page 4 of the consent form?
            signDelayMs: 0,          // hesitation before signing
            breaths: 0,
            breathGaps: [],          // cadence samples -> respiratory steadiness
            confronts: 0,            // looked directly at the Visitor
            avoids: 0,               // looked away from the Visitor
            enduredMs: 0,            // time spent in paralysis
            steadied: false,         // held Shift to self-regulate in paralysis
            mouseDist: 0,            // total cursor travel (agitation proxy)
            jitterPeak: 0            // peak cursor speed (panic proxy)
        };
    }

    function visits() { try { return parseInt(localStorage.getItem('ashgrove_visits') || '0', 10) || 0; } catch (e) { return 0; } }
    function recordVisit() { try { const n = visits() + 1; localStorage.setItem('ashgrove_visits', String(n)); return n; } catch (e) { return 1; } }

    function reset() { d = blank(); lastMx = null; }
    function set(k, v) { d[k] = v; }
    function inc(k, by) { d[k] += (by == null ? 1 : by); }

    function mouse(mx) {
        if (lastMx != null) {
            const dist = Math.abs(mx - lastMx);
            d.mouseDist += dist;
            if (dist > d.jitterPeak) d.jitterPeak = dist;
        }
        lastMx = mx;
    }
    function breath(gapMs) { d.breaths++; if (gapMs > 0) d.breathGaps.push(gapMs); }

    function steadiness() {
        // coefficient of variation of breath cadence -> "controlled" vs "erratic"
        const g = d.breathGaps; if (g.length < 2) return 'insufficient data';
        const m = g.reduce((a, b) => a + b, 0) / g.length;
        const v = g.reduce((a, b) => a + (b - m) * (b - m), 0) / g.length;
        const cv = Math.sqrt(v) / (m || 1);
        return cv < 0.25 ? 'controlled' : cv < 0.55 ? 'unsteady' : 'erratic';
    }

    function fmt(ms) {
        const s = Math.max(0, Math.round(ms / 1000));
        return String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }

    // Build the clinical end-card. Returns ordered { label, value } rows + note + footer.
    function report() {
        const primary = d.confronts >= d.avoids
            ? ['Confrontation', 'subject held the source in direct view']
            : ['Avoidance', 'subject would not look directly at the source'];
        const agitation = d.jitterPeak > 120 ? 'severe' : d.mouseDist > 6000 ? 'elevated' : 'low';

        const rows = [
            ['SUBJECT', 'Eli Mercer'],
            ['SESSION', new Date().toLocaleString()],
            ['PRIMARY FEAR RESPONSE', primary[0] + ' (' + primary[1] + ')'],
            ['LATENCY TO COMPLIANCE', fmt(d.signDelayMs) + (d.signDelayMs > 12000 ? '  (hesitant)' : '  (compliant)')],
            ['DISCLOSURE', d.readDisclosure ? 'Reviewed page 4 (rare)' : 'Did not read disclosure (p.4)'],
            ['RESPIRATORY CONTROL', steadiness() + (d.steadied ? '; attempted self-regulation' : '')],
            ['PARALYSIS ENDURED', fmt(d.enduredMs)],
            ['AGITATION INDEX', agitation]
        ];

        // A personalized, clinically-warm "note" chosen by dominant behavior.
        let note;
        if (!d.readDisclosure)
            note = 'Subject did not read the disclosure before signing. They never do. This is why we are able to keep the lights on.';
        else if (primary[0] === 'Avoidance')
            note = 'Subject consistently refused to look directly at the source. We find avoidant subjects produce our richest recordings.';
        else if (d.steadied)
            note = 'Subject attempted to control their breathing under restraint. Admirable. We have catalogued the attempt.';
        else
            note = 'Subject stared directly into it. Most cannot. We will want you back for that.';

        const v = visits();
        const visitLine = v > 1 ? 'Welcome back. This is visit #' + v + '. We told you we would see you again.' : null;

        return {
            rows,
            note,
            visitLine,
            footer: "Thank you for your contribution. We've learned so much about you.\nWe'll see you again soon."
        };
    }

    return { reset, set, inc, mouse, breath, report, visits, recordVisit, data: () => d };
})();
