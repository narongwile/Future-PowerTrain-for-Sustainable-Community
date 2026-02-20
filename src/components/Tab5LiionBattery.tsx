import { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';

export default function Tab5LiionBattery() {
    const [D, setD] = useState(5e-10);
    const [La_um, setLaUm] = useState(150);
    const [Lb_um, setLbUm] = useState(100);
    const [dC_L, setDc_L] = useState(2);
    const [Clow_L] = useState(0);

    const {
        fluxA, fluxB, pct,
        Chigh, Clow, La, Lb, ctr
    } = useMemo(() => {
        const La = La_um * 1e-6; // m
        const Lb = Lb_um * 1e-6; // m
        const dC = dC_L * 1e3;   // mol/m³
        const Clow = Clow_L * 1e3; // mol/m³
        const Chigh = Clow + dC;

        const gradA = dC / La;
        const gradB = dC / Lb;

        const fluxA = -D * gradA;
        const fluxB = -D * gradB;

        const ratio = gradB / gradA; // = La/Lb
        const pct = (ratio - 1) * 100;

        const ctr = -25e-6; // center in m

        return { fluxA, fluxB, gradA, gradB, pct, Chigh, Clow, La, Lb, dC, ctr };
    }, [D, La_um, Lb_um, dC_L, Clow_L]);

    const profileData = useMemo(() => {
        const x_full = Array.from({ length: 150 }, (_, i) => (-100 + i * (150) / 149) * 1e-6);

        const Ca = x_full.map(x => {
            if (x <= ctr - La / 2) return Chigh;
            if (x >= ctr + La / 2) return Clow;
            return Chigh - (Chigh - Clow) * (x - (ctr - La / 2)) / La;
        });

        const Cb = x_full.map(x => {
            if (x <= ctr - Lb / 2) return Chigh;
            if (x >= ctr + Lb / 2) return Clow;
            return Chigh - (Chigh - Clow) * (x - (ctr - Lb / 2)) / Lb;
        });

        return [
            {
                x: x_full.map(x => x * 1e6),
                y: Ca.map(c => c / 1e3),
                type: 'scatter',
                mode: 'lines',
                line: { color: '#60a5fa', width: 3 },
                name: 'Profile (a)'
            },
            {
                x: x_full.map(x => x * 1e6),
                y: Cb.map(c => c / 1e3),
                type: 'scatter',
                mode: 'lines',
                line: { color: '#f87171', width: 3 },
                name: 'Profile (b)'
            }
        ];
    }, [ctr, La, Lb, Chigh, Clow]);

    // Pseudo-time 3D dataset
    const transientData = useMemo(() => {
        const Nt = 20;
        const x_arr = Array.from({ length: 40 }, (_, i) => (-100 + i * (150) / 39) * 1e-6);
        const tau_arr = Array.from({ length: Nt }, (_, i) => 0.01 + (i * 5) / (Nt - 1));

        const Css = x_arr.map(x => {
            if (x <= ctr - Lb / 2) return Chigh;
            if (x >= ctr + Lb / 2) return Clow;
            return Chigh - (Chigh - Clow) * (x - (ctr - Lb / 2)) / Lb;
        });

        const zData = tau_arr.map(tau => {
            const alpha = 1 - Math.exp(-tau);
            return x_arr.map((_, i) => ((1 - alpha) * Chigh + alpha * Css[i]) / 1e3);
        });

        return {
            x: x_arr.map(x => x * 1e6),
            y: tau_arr,
            z: zData,
            type: 'surface',
            colorscale: 'Parula',
            showscale: true,
            colorbar: { title: { text: 'Li⁺ (mol/L)' }, tickfont: { color: 'white' }, titlefont: { color: 'white' } }
        };
    }, [ctr, Lb, Chigh, Clow]);

    return (
        <div className="tab-content">
            <div className="glass-panel controls-panel">
                <h2>🔵 Li-ion Parameters</h2>
                <div className="glass-card">
                    <div className="control-group">
                        <label>Diffusion coeff D (m²/s):</label>
                        <input type="number" step="1e-11" value={D} onChange={e => setD(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Thickness a (μm):</label>
                        <input type="number" step="1" value={La_um} onChange={e => setLaUm(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Thickness b (μm):</label>
                        <input type="number" step="1" value={Lb_um} onChange={e => setLbUm(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>ΔC separator (mol/L):</label>
                        <input type="number" step="0.1" value={dC_L} onChange={e => setDc_L(Number(e.target.value))} />
                    </div>
                </div>

                <div className="equation-box">
                    {'━━━━ Profile (a) ━━━━\n'}
                    {`  La = ${La_um} μm\n`}
                    {`  Flux = ${fluxA.toFixed(5)} mol/(m²·s)\n\n`}
                    {'━━━━ Profile (b) ━━━━\n'}
                    {`  Lb = ${Lb_um} μm\n`}
                    {`  Flux = ${fluxB.toFixed(5)} mol/(m²·s)\n\n`}
                    {'━━━━ Result ━━━━\n'}
                    {`  Current density ↑ by ${pct.toFixed(1)}%\n`}
                    {`  Thinner separator → steeper\n  gradient → higher current\n`}
                </div>
            </div>

            <div className="glass-panel visualization-panel-3d">
                <Plot
                    data={[transientData as any]}
                    layout={{
                        title: { text: "Uniform → Steady-State Gradient", font: { color: 'white' } },
                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                        margin: { l: 0, r: 0, t: 40, b: 0 },
                        scene: {
                            xaxis: { title: { text: 'Cell Coord (μm)' }, color: 'white', gridcolor: '#333' },
                            yaxis: { title: { text: 'Time D·t/L²' }, color: 'white', gridcolor: '#333' },
                            zaxis: { title: { text: 'Li⁺ (mol/L)' }, color: 'white', gridcolor: '#333' },
                            camera: { eye: { x: -1.5, y: -1.5, z: 1.0 } }
                        }
                    }}
                    useResizeHandler={true} style={{ width: '100%', height: '100%' }}
                />
            </div>

            <div className="glass-panel visualization-panel-2d">
                <Plot
                    data={profileData as any}
                    layout={{
                        title: { text: `Concentration Profiles | Current ↑ by ${pct.toFixed(1)}%`, font: { color: 'white' } },
                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                        margin: { l: 60, r: 20, t: 40, b: 50 },
                        xaxis: { title: { text: 'Cell coordinate (μm)' }, color: 'white', gridcolor: '#333' },
                        yaxis: { title: { text: 'Li⁺ concentration (mol/L)' }, color: 'white', gridcolor: '#333' },
                        legend: { font: { color: 'white' }, bgcolor: 'rgba(0,0,0,0.5)', orientation: 'h', y: 1.1 }
                    }}
                    useResizeHandler={true} style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
}
