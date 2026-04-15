import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  onClose: () => void;
}

// 4-7-8 pattern. 3 cycles total.
const PHASES = [
  { label: 'Breathe in',  duration: 4000, color: '#64B5F6' }, // blue
  { label: 'Hold',        duration: 7000, color: '#FFB74D' }, // amber
  { label: 'Breathe out', duration: 8000, color: '#81C784' }, // green
] as const;

const CYCLES = 3;
const SIZE = 160;
const RING = 10;
const INNER = SIZE - RING * 2;

export default function BreathingOverlay({ onClose }: Props) {
  const [phaseIdx, setPhaseIdx]   = useState(0);
  const [cycle, setCycle]         = useState(1);
  const [progress, setProgress]   = useState(0);
  const [secs, setSecs]           = useState(PHASES[0].duration / 1000);
  const [done, setDone]           = useState(false);

  useEffect(() => {
    let cancelled = false;
    let rafId: number;
    let pIdx = 0;
    let cNum = 1;

    function runPhase() {
      if (cancelled) return;
      setPhaseIdx(pIdx);
      setCycle(cNum);
      setProgress(0);
      setSecs(Math.round(PHASES[pIdx].duration / 1000));

      const dur = PHASES[pIdx].duration;
      const t0  = Date.now();

      function tick() {
        if (cancelled) return;
        const elapsed = Date.now() - t0;
        const p = Math.min(elapsed / dur, 1);
        setProgress(p);
        setSecs(Math.max(0, Math.ceil((dur - elapsed) / 1000)));

        if (p < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          const nextP = (pIdx + 1) % PHASES.length;
          const nextC = nextP === 0 ? cNum + 1 : cNum;
          if (nextC > CYCLES) {
            setDone(true);
          } else {
            pIdx = nextP;
            cNum = nextC;
            rafId = requestAnimationFrame(runPhase);
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    runPhase();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, []);

  const phase = PHASES[phaseIdx];
  const color = done ? '#81C784' : phase.color;
  const deg   = done ? 360 : Math.round(progress * 360);

  // conic-gradient clock sweep starting at 12 o'clock (from -90deg)
  const ringStyle = {
    backgroundImage: `conic-gradient(from -90deg, ${color} ${deg}deg, #2a2245 0deg)`,
  } as any;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>

        <Text style={styles.title}>🌬️  Breathing pause</Text>

        {/* Clock ring */}
        <View style={[styles.ring, ringStyle]}>
          <View style={styles.innerCircle}>
            {done ? (
              <Text style={styles.doneEmoji}>🌿</Text>
            ) : (
              <>
                <Text style={[styles.secs, { color }]}>{secs}</Text>
                <Text style={styles.secsLabel}>sec</Text>
              </>
            )}
          </View>
        </View>

        {/* Phase label */}
        <Text style={[styles.phaseLabel, { color }]}>
          {done ? 'Well done!' : phase.label}
        </Text>

        {/* Phase dots — active dot stretches wide */}
        {!done && (
          <View style={styles.dots}>
            {PHASES.map((ph, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === phaseIdx ? ph.color : '#3a3560' },
                  i === phaseIdx && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}

        <Text style={styles.cycleText}>
          {done
            ? 'You took a moment for yourself 💜'
            : `Cycle ${cycle} of ${CYCLES}`}
        </Text>

        <TouchableOpacity style={[styles.btn, { borderColor: color }]} onPress={onClose}>
          <Text style={[styles.btnText, { color }]}>
            {done ? 'Back to chat' : 'Skip'}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 5, 18, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    width: 300,
    backgroundColor: '#12101c',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#2e2848',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#c4aff5',
    letterSpacing: 0.3,
  },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    backgroundColor: '#12101c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secs: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
  },
  secsLabel: {
    fontSize: 12,
    color: '#55506a',
    marginTop: -2,
    fontWeight: '500',
  },
  doneEmoji: {
    fontSize: 40,
  },
  phaseLabel: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: -4,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
  },
  dot: {
    height: 7,
    width: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
  },
  cycleText: {
    fontSize: 13,
    color: '#5a5475',
    textAlign: 'center',
  },
  btn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
