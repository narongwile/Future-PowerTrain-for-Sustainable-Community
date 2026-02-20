import { useState, useEffect, useRef, useCallback } from 'react';
import { Battery, Zap, AlertTriangle, Activity, Settings, Maximize2, Cpu } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   VEHICLE SPEC CONSTANTS  (Demo data — realistic EV values)
   ═══════════════════════════════════════════════════════════ */
const SPEC = {
    name: 'EV-X 800V Concept',
    mass: 1800,             // kg
    dragCoef: 0.28,
    frontalArea: 2.4,       // m²
    rho: 1.225,             // kg/m³ (air density)
    rollingRes: 150,        // N
    wheelRadius: 0.35,      // m
    gearRatio: 9.73,        // reduction gearbox
    maxMotorTorque: 400,    // Nm
    maxMotorRpm: 16000,
    maxMotorPower: 250,     // kW
    maxMotorForce: 9000,    // N at wheels (demo)
    maxBrakeForce: 15000,   // N
    regenLimit: 80,         // kW
    motorEfficiency: 0.92,
    regenEfficiency: 0.70,
    batteryCapacity: 77.4,  // kWh nominal
    batteryVoltage: 800,    // V
    hvacLoad: 1.5,          // kW constant loads
    demoCapacity: 1.0,      // kWh (scaled for demo speed)
};

/* ═══════════════════════════════════════════════════════════
   HUD GAUGE COMPONENTS
   ═══════════════════════════════════════════════════════════ */
const Gauge = ({ value, max, label, unit, color }: {
    value: number; max: number; label: string; unit: string; color: string;
}) => {
    const r = 40;
    const c = Math.PI * r;
    const pct = Math.max(0, Math.min(1, value / max));
    const dashoffset = c - pct * c;

    return (
        <div style={{ position: 'relative', width: '120px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="120" height="70" viewBox="0 0 100 60">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#222" strokeWidth="8" strokeLinecap="round" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                    strokeDasharray={c} strokeDashoffset={dashoffset} />
            </svg>
            <div style={{ position: 'absolute', top: '22px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', lineHeight: '1' }}>{value.toFixed(0)}</div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{unit}</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#e5e7eb', marginTop: '-5px', fontWeight: 'bold', letterSpacing: '1px' }}>{label}</div>
        </div>
    );
};

const PowerGauge = ({ value }: { value: number }) => {
    const r = 40;
    const c = Math.PI * r;
    const isRegen = value < 0;
    const absVal = Math.abs(value);
    const maxScale = isRegen ? SPEC.regenLimit : SPEC.maxMotorPower;
    const barPct = Math.max(0, Math.min(1, absVal / maxScale));

    return (
        <div style={{ position: 'relative', width: '160px', height: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'scale(1.1)' }}>
            <svg width="120" height="70" viewBox="0 0 100 60">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#222" strokeWidth="8" strokeLinecap="round" />
                <line x1="50" y1="8" x2="50" y2="15" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
                {isRegen ? (
                    <path d="M 50 10 A 40 40 0 0 0 10 50" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                        strokeDasharray={c / 2} strokeDashoffset={(c / 2) - barPct * (c / 2)} />
                ) : (
                    <path d="M 50 10 A 40 40 0 0 1 90 50" fill="none" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                        strokeDasharray={c / 2} strokeDashoffset={(c / 2) - barPct * (c / 2)} />
                )}
            </svg>
            <div style={{ position: 'absolute', top: '22px', textAlign: 'center' }}>
                <div style={{
                    fontSize: '1.8rem', fontWeight: 'bold', lineHeight: '1',
                    color: isRegen ? '#10b981' : '#fbbf24',
                    textShadow: `0 0 10px ${isRegen ? 'rgba(16,185,129,0.5)' : 'rgba(251,191,36,0.5)'}`
                }}>
                    {absVal.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{isRegen ? 'REGEN kW' : 'POWER kW'}</div>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#e5e7eb', marginTop: '-5px', fontWeight: 'bold', letterSpacing: '1px' }}>MOTOR LOAD</div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   TELEMETRY ROW COMPONENT
   ═══════════════════════════════════════════════════════════ */
const TelRow = ({ label, value, unit, color }: { label: string; value: string; unit: string; color?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>{label}</span>
        <span style={{ color: color || '#e5e7eb', fontWeight: 600, fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif" }}>
            {value} <span style={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: 400 }}>{unit}</span>
        </span>
    </div>
);

/* ═══════════════════════════════════════════════════════════
   ENERGY BAR (mini horizontal bar)
   ═══════════════════════════════════════════════════════════ */
const EnergyBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
    const pct = Math.max(0, Math.min(100, (Math.abs(value) / max) * 100));
    return (
        <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '2px' }}>
                <span>{label}</span>
                <span style={{ color }}>{value.toFixed(1)} kW</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#1a1a2e', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.15s linear' }} />
            </div>
        </div>
    );
};


/* ═══════════════════════════════════════════════════════════
   MAIN TAB COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function Tab6Powertrain() {
    // React state for rendering
    const [activeModal, setActiveModal] = useState<string | null>(null);

    const [speedKmh, setSpeedKmh] = useState(0);
    const [powerKw, setPowerKw] = useState(0);
    const [soc, setSoc] = useState(80);
    const [gasVal, setGasVal] = useState(0);
    const [brakeVal, setBrakeVal] = useState(0);
    const [phase, setPhase] = useState(0);
    const [rotAngle, setRotAngle] = useState(0);

    // Extended telemetry
    const [motorTorque, setMotorTorque] = useState(0);
    const [motorRpm, setMotorRpm] = useState(0);
    const [accelG, setAccelG] = useState(0);
    const [battCurrent, setBattCurrent] = useState(0);
    const [dragPower, setDragPower] = useState(0);
    const [regenPower, setRegenPower] = useState(0);
    const [distanceKm, setDistanceKm] = useState(0);
    const [energyUsedKwh, setEnergyUsedKwh] = useState(0);
    const [efficiency, setEfficiency] = useState(0);
    const [driveState, setDriveState] = useState('STANDBY');

    // Refs for input and physics
    const gasPressed = useRef(false);
    const brakePressed = useRef(false);

    const stateRef = useRef({
        speedMs: 0, soc: 80, gasVal: 0, brakeVal: 0, phase: 0, rot: 0,
        distM: 0, energyJ: 0, prevAccel: 0
    });

    /* ── Physics Loop ────────────────────────────────────── */
    useEffect(() => {
        let animationFrame: number;
        let lastTime = performance.now();

        const animate = (time: number) => {
            const dt = Math.min((time - lastTime) / 1000, 0.1);
            lastTime = time;
            const s = stateRef.current;

            // 1. Pedal smoothing
            s.gasVal = gasPressed.current
                ? Math.min(1, s.gasVal + dt * 2.5)
                : Math.max(0, s.gasVal - dt * 4.0);
            s.brakeVal = brakePressed.current
                ? Math.min(1, s.brakeVal + dt * 4.0)
                : Math.max(0, s.brakeVal - dt * 6.0);

            // 2. Forces
            const propulsion = s.gasVal * SPEC.maxMotorForce;
            const braking = s.brakeVal * SPEC.maxBrakeForce;
            const aeroDrag = 0.5 * SPEC.rho * SPEC.dragCoef * SPEC.frontalArea * s.speedMs * s.speedMs;
            const drag = s.speedMs > 0.1 ? aeroDrag + SPEC.rollingRes : 0;
            let netForce = propulsion - drag;
            if (s.speedMs > 0) netForce -= braking;
            const accel = netForce / SPEC.mass;
            s.speedMs = Math.max(0, s.speedMs + accel * dt);
            s.prevAccel = accel;

            // 3. Motor model
            const wheelOmega = s.speedMs / SPEC.wheelRadius;
            const motorOmega = wheelOmega * SPEC.gearRatio;
            const motorRpmCalc = (motorOmega * 60) / (2 * Math.PI);
            const torqueAtWheel = propulsion * SPEC.wheelRadius;
            const motorTorqueCalc = torqueAtWheel / SPEC.gearRatio;

            // 4. Electrical model
            let elecPowerKw = 0;
            let regenKw = 0;
            if (s.gasVal > 0) {
                elecPowerKw = (propulsion * s.speedMs) / SPEC.motorEfficiency / 1000;
            } else if (s.brakeVal > 0 && s.speedMs > 1) {
                regenKw = Math.min((braking * s.speedMs) * SPEC.regenEfficiency / 1000, SPEC.regenLimit);
                elecPowerKw = -regenKw;
            }
            elecPowerKw += SPEC.hvacLoad;
            if (s.speedMs === 0 && s.gasVal === 0) elecPowerKw = 1.0;

            const dragPowerKw = (aeroDrag * s.speedMs) / 1000;
            const battCurrentA = (elecPowerKw * 1000) / SPEC.batteryVoltage;

            // 5. Energy & SOC
            const powerHrs = elecPowerKw * (dt / 3600);
            s.soc = Math.max(0, Math.min(100, s.soc - (powerHrs / SPEC.demoCapacity) * 100));
            s.distM += s.speedMs * dt;
            s.energyJ += Math.abs(elecPowerKw) * dt; // kW·s → kJ (accumulated for efficiency)

            // Efficiency: Wh/km
            const distKm = s.distM / 1000;
            const energyKwh = s.energyJ / 3600; // kW·s → kWh
            const effWhKm = distKm > 0.01 ? (energyKwh * 1000) / distKm : 0;

            // 6. Drive state label
            let state = 'STANDBY';
            if (s.gasVal > 0.05 && s.speedMs > 0.5) state = 'ACCELERATING';
            else if (s.brakeVal > 0.05 && s.speedMs > 0.5) state = regenKw > 1 ? 'REGEN BRAKING' : 'BRAKING';
            else if (s.speedMs > 1) state = 'COASTING';
            else if (s.gasVal > 0) state = 'LAUNCH';

            // 7. Visual animation
            st_rot_phase(s, dt, elecPowerKw, wheelOmega);

            // 8. Push to React
            setGasVal(s.gasVal);
            setBrakeVal(s.brakeVal);
            setSpeedKmh(s.speedMs * 3.6);
            setPowerKw(elecPowerKw);
            setSoc(s.soc);
            setPhase(s.phase);
            setRotAngle(s.rot);
            setMotorTorque(motorTorqueCalc);
            setMotorRpm(motorRpmCalc);
            setAccelG(accel / 9.81);
            setBattCurrent(battCurrentA);
            setDragPower(dragPowerKw);
            setRegenPower(regenKw);
            setDistanceKm(distKm);
            setEnergyUsedKwh(energyKwh);
            setEfficiency(effWhKm);
            setDriveState(state);

            animationFrame = requestAnimationFrame(animate);
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, []);

    const resetSim = useCallback(() => {
        const s = stateRef.current;
        s.speedMs = 0; s.soc = 80; s.gasVal = 0; s.brakeVal = 0; s.phase = 0; s.rot = 0;
        s.distM = 0; s.energyJ = 0; s.prevAccel = 0;
        gasPressed.current = false;
        brakePressed.current = false;
    }, []);

    /* ── SVG Derivations ─────────────────────────────────── */
    const dir = powerKw > 2 ? 1 : powerKw < -1 ? -1 : 0;
    const p = phase < 0 ? phase + 1 : phase;

    let dcPosArrowX = 35 + p * 13, dcNegArrowX = 35 + ((p + 0.5) % 1) * 13;
    if (dir === -1) { dcPosArrowX = 48 - p * 13; dcNegArrowX = 48 - ((p + 0.5) % 1) * 13; }
    else if (dir === 0) { dcPosArrowX = 41.5; dcNegArrowX = 41.5; }

    const acXs = [68 + (p % 1) * 9, 68 + ((p + 0.33) % 1) * 9, 68 + ((p + 0.66) % 1) * 9];
    if (dir === -1) { acXs[0] = 77 - (p % 1) * 9; acXs[1] = 77 - ((p + 0.33) % 1) * 9; acXs[2] = 77 - ((p + 0.66) % 1) * 9; }

    let mech1Y = 42 - p * 5, mech2Y = 25 - p * 15;
    if (dir === -1) { mech1Y = 37 + p * 5; mech2Y = 10 + p * 15; }
    else if (dir === 0) { mech1Y = 39.5; mech2Y = 17.5; }

    const motorPolygonPoints = Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 12 + rotAngle;
        const r = i % 2 === 0 ? 4 : 2.5;
        return `${85 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
    }).join(' ');

    // Drive state colour
    const stateColor = driveState === 'REGEN BRAKING' ? '#10b981' :
        driveState === 'ACCELERATING' || driveState === 'LAUNCH' ? '#fbbf24' :
            driveState === 'COASTING' ? '#60a5fa' : '#6b7280';

    /* ══════════════════════════════════════════════════════
       RENDER
       ══════════════════════════════════════════════════════ */
    return (
        <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }}>

            {/* ── HUD Gauges ─────────────────────────────────── */}
            <div className="glass-panel" style={{
                display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                padding: '0.8rem 1rem', marginBottom: '0.75rem',
                background: 'linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.35), rgba(0,0,0,0.6))',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
                <Gauge value={speedKmh} max={250} label="SPEED" unit="km/h" color="#0ea5e9" />
                <Gauge value={motorRpm} max={SPEC.maxMotorRpm} label="MOTOR" unit="RPM" color="#a78bfa" />
                <PowerGauge value={powerKw} />
                <Gauge value={motorTorque} max={SPEC.maxMotorTorque} label="TORQUE" unit="Nm" color="#fb923c" />
                <Gauge value={soc} max={100} label="BATTERY" unit="%" color={soc > 30 ? "#4ade80" : (soc > 15 ? "#fbbf24" : "#ef4444")} />
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '0.75rem', minHeight: '0' }}>

                {/* ── Left Column: Controls + Telemetry ────────── */}
                <div style={{ flex: '0 0 210px', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>

                    {/* Drive Controls */}
                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                        <h3 style={{ textAlign: 'center', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.75rem', margin: '0 0 0.75rem 0' }}>
                            Drive Controls
                        </h3>

                        {/* Gas Pedal */}
                        <div
                            style={{
                                position: 'relative', width: '100%', height: '100px', background: '#111',
                                borderRadius: '10px', overflow: 'hidden', border: `2px solid rgba(34, 197, 94, ${gasVal > 0 ? 0.8 : 0.3})`,
                                cursor: 'pointer', touchAction: 'none', marginBottom: '0.75rem',
                                boxShadow: gasVal > 0 ? '0 0 15px rgba(34,197,94,0.25)' : 'none'
                            }}
                            onPointerDown={e => { e.preventDefault(); gasPressed.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}
                            onPointerUp={e => { e.preventDefault(); gasPressed.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
                            onContextMenu={e => e.preventDefault()}
                        >
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${gasVal * 100}%`, background: 'linear-gradient(to top, rgba(34,197,94,0.5), rgba(34,197,94,0.15))' }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 'bold', fontSize: '0.9rem', textShadow: '0 0 10px rgba(34,197,94,0.6)' }}>
                                ▲ ACCELERATE
                            </div>
                        </div>

                        {/* Brake Pedal */}
                        <div
                            style={{
                                position: 'relative', width: '100%', height: '100px', background: '#111',
                                borderRadius: '10px', overflow: 'hidden', border: `2px solid rgba(239,68,68, ${brakeVal > 0 ? 0.8 : 0.3})`,
                                cursor: 'pointer', touchAction: 'none',
                                boxShadow: brakeVal > 0 ? '0 0 15px rgba(239,68,68,0.25)' : 'none'
                            }}
                            onPointerDown={e => { e.preventDefault(); brakePressed.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}
                            onPointerUp={e => { e.preventDefault(); brakePressed.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
                            onContextMenu={e => e.preventDefault()}
                        >
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${brakeVal * 100}%`, background: 'linear-gradient(to top, rgba(239,68,68,0.5), rgba(239,68,68,0.15))' }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem', textShadow: '0 0 10px rgba(239,68,68,0.6)' }}>
                                ▼ BRAKE
                            </div>
                        </div>

                        <button onClick={resetSim} style={{
                            marginTop: '0.75rem', width: '100%', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', cursor: 'pointer',
                            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '1px'
                        }}>
                            ↺ RESET SIMULATION
                        </button>
                    </div>

                    {/* Live Telemetry */}
                    <div className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.15)', flex: 1 }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)'
                        }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>Telemetry</span>
                            <span style={{
                                fontSize: '0.7rem', fontWeight: 700, color: stateColor,
                                padding: '2px 8px', borderRadius: '4px',
                                background: `${stateColor}15`, border: `1px solid ${stateColor}40`
                            }}>{driveState}</span>
                        </div>

                        <TelRow label="Speed" value={speedKmh.toFixed(1)} unit="km/h" color="#0ea5e9" />
                        <TelRow label="Motor RPM" value={motorRpm.toFixed(0)} unit="rpm" color="#a78bfa" />
                        <TelRow label="Torque" value={motorTorque.toFixed(1)} unit="Nm" color="#fb923c" />
                        <TelRow label="Acceleration" value={accelG.toFixed(2)} unit="g" color={accelG > 0 ? '#4ade80' : accelG < -0.05 ? '#ef4444' : '#9ca3af'} />
                        <TelRow label="Battery I" value={battCurrent.toFixed(1)} unit="A" color={battCurrent < 0 ? '#10b981' : '#fbbf24'} />
                        <TelRow label="Distance" value={distanceKm.toFixed(3)} unit="km" />
                        <TelRow label="Energy Used" value={energyUsedKwh.toFixed(3)} unit="kWh" />
                        <TelRow label="Efficiency" value={efficiency > 0 ? efficiency.toFixed(0) : '—'} unit="Wh/km" color={efficiency > 0 && efficiency < 180 ? '#4ade80' : '#fbbf24'} />

                        {/* Energy Budget Bars */}
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px' }}>
                                Energy Budget
                            </div>
                            <EnergyBar label="Motor Drive" value={powerKw > 0 ? powerKw : 0} max={SPEC.maxMotorPower} color="#fbbf24" />
                            <EnergyBar label="Aero Drag" value={dragPower} max={50} color="#f97316" />
                            <EnergyBar label="Regen Recovery" value={regenPower} max={SPEC.regenLimit} color="#10b981" />
                            <EnergyBar label="HVAC + Aux" value={SPEC.hvacLoad} max={10} color="#0ea5e9" />
                        </div>
                    </div>
                </div>

                {/* ── Right: Architecture Schematic + Spec Table ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0 }}>

                    {/* SVG Schematic */}
                    <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                            <text x="50" y="6" fill="#4ade80" fontSize="3" fontWeight="bold" textAnchor="middle">
                                Dynamic Energy Flow Schematic
                            </text>

                            {/* Static Blocks - Interactivity */}
                            <g fillOpacity="0.85">
                                {/* Battery Block */}
                                <g cursor="pointer" onClick={() => setActiveModal('BATTERY')} style={{ transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    <rect x="10" y="30" width="25" height="40" rx="2" fill="#255940" stroke="#4ade80" strokeWidth="0.5" />
                                    <text x="22.5" y="45" fill="white" fontSize="2.2" fontWeight="bold" textAnchor="middle">High Voltage</text>
                                    <text x="22.5" y="48" fill="white" fontSize="2.2" fontWeight="bold" textAnchor="middle">Battery Pack</text>
                                    <text x="22.5" y="51" fill="#4ade80" fontSize="2" textAnchor="middle">{SPEC.batteryVoltage}V · {SPEC.batteryCapacity}kWh</text>
                                    <text x="22.5" y="54.5" fill="#fbbf24" fontSize="2" fontWeight="bold" textAnchor="middle">SOC {soc.toFixed(1)}%</text>
                                    {/* SOC mini bar */}
                                    <rect x="14" y="57" width="17" height="2" rx="1" fill="#1a1a2e" />
                                    <rect x="14" y="57" width={Math.max(0, 17 * soc / 100)} height="2" rx="1" fill={soc > 30 ? '#4ade80' : soc > 15 ? '#fbbf24' : '#ef4444'} />
                                </g>

                                {/* BMS Block */}
                                <g cursor="pointer" onClick={() => setActiveModal('BMS')} style={{ transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    <rect x="10" y="75" width="25" height="12" rx="2" fill="#334c66" stroke="white" strokeWidth="0.5" />
                                    <text x="22.5" y="80" fill="white" fontSize="2" fontWeight="bold" textAnchor="middle">Battery Management</text>
                                    <text x="22.5" y="83" fill="white" fontSize="2" fontWeight="bold" textAnchor="middle">System (BMS)</text>
                                </g>

                                {/* OBC Block */}
                                <g cursor="pointer" onClick={() => setActiveModal('OBC')} style={{ transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    <rect x="10" y="10" width="25" height="12" rx="2" fill="#66334c" stroke="white" strokeWidth="0.5" />
                                    <text x="22.5" y="15" fill="white" fontSize="2" fontWeight="bold" textAnchor="middle">On-Board Charger</text>
                                    <text x="22.5" y="18" fill="white" fontSize="2" fontWeight="bold" textAnchor="middle">(OBC) & AC/DC</text>
                                </g>

                                {/* Inverter Block */}
                                <g cursor="pointer" onClick={() => setActiveModal('INVERTER')} style={{ transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    <rect x="48" y="40" width="20" height="20" rx="2" fill="#994c1a" stroke="#f59e0b" strokeWidth="0.5" />
                                    <text x="58" y="48" fill="white" fontSize="2.2" fontWeight="bold" textAnchor="middle">Silicon-Carbide</text>
                                    <text x="58" y="51" fill="white" fontSize="2.2" fontWeight="bold" textAnchor="middle">(SiC) Inverter</text>
                                    <text x="58" y="54.5" fill="#facc15" fontSize="1.8" textAnchor="middle">{battCurrent.toFixed(0)}A</text>
                                </g>

                                {/* Gearbox Block */}
                                <g cursor="pointer" onClick={() => setActiveModal('GEARBOX')} style={{ transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    <rect x="78" y="25" width="14" height="12" rx="2" fill="#4d4d4d" stroke="white" strokeWidth="0.5" />
                                    <text x="85" y="30" fill="white" fontSize="2" fontWeight="bold" textAnchor="middle">Reduction</text>
                                    <text x="85" y="33" fill="white" fontSize="2" fontWeight="bold" textAnchor="middle">{SPEC.gearRatio}:1</text>
                                </g>

                                {/* Thermal Loop Block */}
                                <g cursor="pointer" onClick={() => setActiveModal('THERMAL')} style={{ transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    <rect x="45" y="80" width="40" height="10" rx="2" fill="#1a6699" stroke="#38bdf8" strokeWidth="0.5" />
                                    <text x="65" y="84" fill="white" fontSize="2.2" fontWeight="bold" textAnchor="middle">HVAC &amp; Thermal Mgt</text>
                                    <text x="65" y="87" fill="white" fontSize="2.2" fontWeight="bold" textAnchor="middle">Radiator / Chiller Loop</text>
                                </g>
                            </g>

                            {/* Wheels */}
                            <line x1="72" y1="10" x2="98" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
                            <g transform={`translate(72, 10) scale(1, ${0.4})`}>
                                <ellipse cx="0" cy="0" rx="3" ry="8" fill="#111" stroke="#9ca3af" strokeWidth="0.5" />
                                <line x1={-3 * Math.cos(rotAngle)} y1={-8 * Math.sin(rotAngle)} x2={3 * Math.cos(rotAngle)} y2={8 * Math.sin(rotAngle)} stroke="#d1d5db" strokeWidth="0.5" />
                            </g>
                            <g transform={`translate(98, 10) scale(1, ${0.4})`}>
                                <ellipse cx="0" cy="0" rx="3" ry="8" fill="#111" stroke="#9ca3af" strokeWidth="0.5" />
                                <line x1={-3 * Math.cos(rotAngle)} y1={-8 * Math.sin(rotAngle)} x2={3 * Math.cos(rotAngle)} y2={8 * Math.sin(rotAngle)} stroke="#d1d5db" strokeWidth="0.5" />
                            </g>

                            <circle cx="85" cy="50" r="8" fill="#336699" stroke="white" strokeWidth="0.5" />

                            {/* DC Lines */}
                            <line x1="35" y1="55" x2="48" y2="55" stroke="#4a1a1a" strokeWidth="1.5" />
                            <line x1="35" y1="45" x2="48" y2="45" stroke="#1a1a4a" strokeWidth="1.5" />
                            <polygon points={dir === -1 ? "-1.5,-1 1.5,0 -1.5,1" : "1.5,-1 -1.5,0 1.5,1"}
                                transform={`translate(${dcPosArrowX}, 55) scale(1.5)`}
                                fill={dir === -1 ? "#4ade80" : "#ef4444"} display={dir === 0 ? "none" : "block"} />
                            <polygon points={dir === -1 ? "1.5,-1 -1.5,0 1.5,1" : "-1.5,-1 1.5,0 -1.5,1"}
                                transform={`translate(${dcNegArrowX}, 45) scale(1.5)`}
                                fill={dir === -1 ? "#4ade80" : "#3b82f6"} display={dir === 0 ? "none" : "block"} />

                            {/* AC Lines */}
                            <line x1="68" y1="53" x2="77" y2="53" stroke="#4a3300" strokeWidth="1.5" />
                            <line x1="68" y1="50" x2="77" y2="50" stroke="#4a3300" strokeWidth="1.5" />
                            <line x1="68" y1="47" x2="77" y2="47" stroke="#4a3300" strokeWidth="1.5" />
                            {[...Array(3)].map((_, i) => (
                                <polygon key={i}
                                    points={dir === -1 ? "1.5,-1 -1.5,0 1.5,1" : "-1.5,-1 1.5,0 -1.5,1"}
                                    transform={`translate(${dir === 0 ? 72.5 : acXs[i]}, ${53 - i * 3}) scale(1.2)`}
                                    fill={dir === -1 ? "#4ade80" : dir === 1 ? "#facc15" : "none"} />
                            ))}

                            {/* Mech Lines */}
                            <line x1="85" y1="42" x2="85" y2="37" stroke="#6b7280" strokeWidth="1.5" />
                            <line x1="85" y1="25" x2="85" y2="10" stroke="#6b7280" strokeWidth="1.5" />
                            <polygon points={dir === -1 ? "-1,1.5 0,-1.5 1,1.5" : "-1,-1.5 0,1.5 1,-1.5"}
                                transform={`translate(85, ${mech1Y}) scale(1.2)`}
                                fill={dir === -1 ? "#4ade80" : dir === 1 ? "#d1d5db" : "none"} />
                            <polygon points={dir === -1 ? "-1,1.5 0,-1.5 1,1.5" : "-1,-1.5 0,1.5 1,-1.5"}
                                transform={`translate(85, ${mech2Y}) scale(1.2)`}
                                fill={dir === -1 ? "#4ade80" : dir === 1 ? "#d1d5db" : "none"} />

                            {/* Motor Rotor Block */}
                            <g cursor="pointer" onClick={() => setActiveModal('MOTOR')} style={{ transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                <polygon points={motorPolygonPoints}
                                    fill={dir === 1 ? '#f59e0b' : dir === -1 ? '#4ade80' : '#9ca3af'} />
                                <text x="85" y="50" fill="white" fontSize="2.5" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle" stroke="none">Motor</text>
                            </g>

                            {/* Cooling & CAN Lines */}
                            <g strokeWidth="0.5" fill="none">
                                <path d="M45,85 L22.5,85 L22.5,70" stroke="#0ea5e9" />
                                <line x1="55" y1="80" x2="55" y2="60" stroke="#0ea5e9" />
                                <line x1="85" y1="80" x2="85" y2="58" stroke="#0ea5e9" />
                                <text x="28" y="87" fill="#0ea5e9" fontSize="2" fontWeight="bold" stroke="none">Cooling</text>

                                <path d="M35,81 L60,81 L60,60" stroke="#4ade80" strokeDasharray="1,1" />
                                <path d="M60,81 L94,81 L94,50 L93,50" stroke="#4ade80" strokeDasharray="1,1" />
                                <line x1="22.5" y1="75" x2="22.5" y2="70" stroke="#4ade80" strokeDasharray="1,1" />
                                <line x1="22.5" y1="30" x2="22.5" y2="22" stroke="#4ade80" strokeDasharray="1,1" />
                                <text x="75" y="83" fill="#4ade80" fontSize="2" fontWeight="bold" stroke="none">CAN BUS</text>
                            </g>
                        </svg>
                    </div>

                    {/* Vehicle Specification Table */}
                    <div className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.15)', overflowX: 'auto' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, marginBottom: '6px' }}>
                            Vehicle Specification — {SPEC.name}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', fontSize: '0.72rem' }}>
                            {[
                                { l: 'Mass', v: `${SPEC.mass} kg` },
                                { l: 'Cd × A', v: `${(SPEC.dragCoef * SPEC.frontalArea).toFixed(3)} m²` },
                                { l: 'Battery', v: `${SPEC.batteryCapacity} kWh` },
                                { l: 'Voltage', v: `${SPEC.batteryVoltage} V` },
                                { l: 'Peak Power', v: `${SPEC.maxMotorPower} kW` },
                                { l: 'Max Torque', v: `${SPEC.maxMotorTorque} Nm` },
                                { l: 'Max RPM', v: `${SPEC.maxMotorRpm}` },
                                { l: 'Gear Ratio', v: `${SPEC.gearRatio}:1` },
                                { l: 'Motor η', v: `${(SPEC.motorEfficiency * 100).toFixed(0)}%` },
                                { l: 'Regen η', v: `${(SPEC.regenEfficiency * 100).toFixed(0)}%` },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '4px 8px',
                                    border: '1px solid rgba(255,255,255,0.04)'
                                }}>
                                    <div style={{ color: '#6b7280', fontSize: '0.65rem', marginBottom: '1px' }}>{s.l}</div>
                                    <div style={{ color: '#e5e7eb', fontWeight: 600 }}>{s.v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Component Details Modal ───────────────────────── */}
            {activeModal && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setActiveModal(null)}>
                    <div style={{
                        background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '16px', width: '500px', maxWidth: '95%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {activeModal === 'BATTERY' && <Battery color="#4ade80" size={24} />}
                                {activeModal === 'BMS' && <Activity color="#38bdf8" size={24} />}
                                {activeModal === 'OBC' && <Zap color="#fbbf24" size={24} />}
                                {activeModal === 'INVERTER' && <Cpu color="#f59e0b" size={24} />}
                                {activeModal === 'MOTOR' && <Settings color="#a78bfa" size={24} />}
                                {activeModal === 'GEARBOX' && <Maximize2 color="#9ca3af" size={24} />}
                                {activeModal === 'THERMAL' && <AlertTriangle color="#ef4444" size={24} />}
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 600, letterSpacing: '0.5px' }}>
                                    {activeModal === 'BATTERY' && 'High Voltage Battery Pack'}
                                    {activeModal === 'BMS' && 'Battery Management System'}
                                    {activeModal === 'OBC' && 'On-Board AC Charger'}
                                    {activeModal === 'INVERTER' && 'Silicon-Carbide Inverter'}
                                    {activeModal === 'MOTOR' && 'Traction Motor'}
                                    {activeModal === 'GEARBOX' && 'Reduction Gearbox'}
                                    {activeModal === 'THERMAL' && 'Thermal Management'}
                                </h2>
                            </div>
                            <button onClick={() => setActiveModal(null)} style={{
                                background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', width: '32px', height: '32px',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none',
                                transition: 'background 0.2s, color 0.2s'
                            }} onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }} onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
                                ×
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            {activeModal === 'BATTERY' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Chemistry</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>Lithium-Ion NMC</div>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Nominal Voltage</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>{SPEC.batteryVoltage} V</div>
                                        </div>
                                    </div>
                                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: '#4ade80' }}>State of Charge (SOC)</span>
                                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{soc.toFixed(1)}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${soc}%`, height: '100%', background: soc > 20 ? '#4ade80' : '#ef4444', transition: 'width 0.3s ease' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                                            <span>Est. Capacity remaining:</span>
                                            <span style={{ color: '#e2e8f0' }}>{((soc / 100) * SPEC.batteryCapacity).toFixed(1)} kWh / {SPEC.batteryCapacity.toFixed(1)} kWh</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ color: '#9ca3af' }}>Live Amperage</span>
                                            <span style={{ color: battCurrent < 0 ? '#10b981' : '#fbbf24', fontWeight: 600 }}>{battCurrent.toFixed(1)} A</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ color: '#9ca3af' }}>Live DC Load</span>
                                            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{Math.abs((battCurrent * SPEC.batteryVoltage) / 1000).toFixed(1)} kW</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8', borderLeft: '3px solid #4ade80' }}>
                                        The high-voltage 800V class architecture dramatically reduces cable cross-section, weight, and $I^2R$ thermal waste heat, unlocking ultra-fast DC charging profiles with minimal voltage sag during high-acceleration launches.
                                    </div>
                                </div>
                            )}

                            {activeModal === 'BMS' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Data Interface</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>CAN-Bus (500k)</div>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Balancing</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>Active Shunt</div>
                                        </div>
                                    </div>

                                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: '#38bdf8' }}>Max Allowed Regen Limit</span>
                                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{SPEC.regenLimit.toFixed(0)} kW</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${(Math.abs(regenPower) / SPEC.regenLimit) * 100}%`, height: '100%', background: '#38bdf8', transition: 'width 0.1s linear' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                                            <span>Current Recovery Load:</span>
                                            <span style={{ color: regenPower > 0 ? '#10b981' : '#e2e8f0' }}>{regenPower.toFixed(1)} kW</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8', borderLeft: '3px solid #38bdf8' }}>
                                        Continuously multiplexes voltage measurements across hundreds of cells in series. Implements rapid thermal interlocks and calculates dynamic max charge/discharge limits depending on internal temperatures and chemical state vectors.
                                    </div>
                                </div>
                            )}

                            {activeModal === 'OBC' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Target Function</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>AC → DC Rectification</div>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Max Rate</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>22 kW (3-Phase)</div>
                                        </div>
                                    </div>
                                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                        <Zap size={32} color="#fbbf24" style={{ opacity: 0.5 }} />
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#fbbf24' }}>Grid Connection Status</div>
                                            <div style={{ color: '#e2e8f0', fontSize: '0.85rem', marginTop: '0.2rem' }}>Vehicle is currently driving. AC connection is locked out.</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8', borderLeft: '3px solid #fbbf24' }}>
                                        Takes standard Level 1 or Level 2 AC power from charging pedestals and steps it up and rectifies it to the 800V DC required by the battery. Bypassed entirely during DC Fast Charging sessions.
                                    </div>
                                </div>
                            )}

                            {activeModal === 'INVERTER' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Switching Matrix</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>SiC MOSFETs</div>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Combined η</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>{(SPEC.motorEfficiency * 100).toFixed(0)}%</div>
                                        </div>
                                    </div>

                                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: '#f59e0b' }}>Live Load Draw</span>
                                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{powerKw.toFixed(1)} kW</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(100, (Math.abs(powerKw) / SPEC.maxMotorPower) * 100)}%`, height: '100%', background: powerKw < 0 ? '#10b981' : '#f59e0b', transition: 'width 0.1s linear' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                                            <span>Vector Flow:</span>
                                            <span style={{ color: powerKw < 0 ? '#10b981' : '#e2e8f0', fontWeight: 'bold' }}>{powerKw < 0 ? '← Regen to Batt' : powerKw > 5 ? '→ Drive to Motor' : 'Standby'}</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8', borderLeft: '3px solid #f59e0b' }}>
                                        Silicon-Carbide allows for dramatically higher switching frequencies with minimal switching losses. It converts the 800V DC flow into a variable-frequency 3-phase AC waveform to rotate the motor precisely.
                                    </div>
                                </div>
                            )}

                            {activeModal === 'MOTOR' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Machine Type</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>Permanent Magnet Sync (PMSM)</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Peak Power</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>{SPEC.maxMotorPower} kW</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(167, 139, 250, 0.05)', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.25rem' }}>Live RPM</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                                {motorRpm.toFixed(0)} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 400 }}>rad/min</span>
                                            </div>
                                            <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                                                <div style={{ width: `${(Math.abs(motorRpm) / SPEC.maxMotorRpm) * 100}%`, height: '100%', background: '#a78bfa', transition: 'width 0.1s linear' }} />
                                            </div>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(251, 146, 60, 0.05)', border: '1px solid rgba(251, 146, 60, 0.2)' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#fb923c', fontWeight: 600, marginBottom: '0.25rem' }}>Live Axle Torque</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                                {motorTorque.toFixed(0)} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 400 }}>Nm</span>
                                            </div>
                                            <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                                                <div style={{ width: `${(Math.abs(motorTorque) / SPEC.maxMotorTorque) * 100}%`, height: '100%', background: '#fb923c', transition: 'width 0.1s linear' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8', borderLeft: '3px solid #a78bfa' }}>
                                        High energy density rare-earth rotor creates an intensely strong magnetic field. Translates 3-phase AC electromagnetism directly into physical torque in milliseconds, delivering max torque essentially at 0 RPM.
                                    </div>
                                </div>
                            )}

                            {activeModal === 'GEARBOX' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Reduction Ratio</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>{SPEC.gearRatio} to 1</div>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Lubrication</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ATF Splash Cooled</div>
                                        </div>
                                    </div>
                                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(156, 163, 175, 0.05)', border: '1px solid rgba(156, 163, 175, 0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ color: '#9ca3af' }}>Input (Motor Speed)</span>
                                            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{motorRpm.toFixed(0)} rpm</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                            <span style={{ color: '#9ca3af' }}>Output (Wheel Axle Speed)</span>
                                            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{(motorRpm / SPEC.gearRatio).toFixed(0)} rpm</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8', borderLeft: '3px solid #9ca3af' }}>
                                        Because electric motors have incredibly wide operating RPM bands ({SPEC.maxMotorRpm} rpm peak), multi-speed gearboxes are unnecessary. This single gear vastly multiplies torque {SPEC.gearRatio}x while stepping down rotational velocity.
                                    </div>
                                </div>
                            )}

                            {activeModal === 'THERMAL' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Architecture</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>Octovalve Heat Pump</div>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Fluid Media</div>
                                            <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 500 }}>Glycol Chiller Loop</div>
                                        </div>
                                    </div>

                                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: '#ef4444' }}>Auxiliary Drain Baseline</span>
                                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{SPEC.hvacLoad.toFixed(1)} kW</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                                            <span>Constant Vampire Current:</span>
                                            <span style={{ color: '#e2e8f0' }}>{(SPEC.hvacLoad * 1000 / SPEC.batteryVoltage).toFixed(2)} A (DC)</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8', borderLeft: '3px solid #ef4444' }}>
                                        A unified thermal management center. It cleverly utilizes waste heat from the Battery and Inverter to warm the cabin during winter via the Heat Pump, while reversing flow to aggressively chill those components during intense driving loads.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATION HELPER (separated to keep loop lean)
   ═══════════════════════════════════════════════════════════ */
function st_rot_phase(
    s: { phase: number; rot: number; speedMs: number },
    dt: number, elecPowerKw: number, wheelOmega: number
) {
    s.rot = (s.rot - wheelOmega * dt) % (Math.PI * 2);
    let pSpd = 0, pDir = 0;
    if (elecPowerKw > 2) { pSpd = Math.min(8, Math.max(0.2, elecPowerKw / 20)); pDir = 1; }
    else if (elecPowerKw < -1) { pSpd = Math.min(8, Math.max(0.2, Math.abs(elecPowerKw) / 20)); pDir = -1; }
    s.phase = (s.phase + pSpd * pDir * dt) % 1;
}
