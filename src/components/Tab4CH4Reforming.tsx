import { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { interpolatePchip } from '../utils/mathUtils';

const T_tbl = [298.15, 500, 1000, 1500, 2000, 2500, 3000];
const dG_reform_data = [
    -137.163 + 3 * 0 - (-50.768) - (-228.582),
    -155.414 + 3 * 0 - (-32.741) - (-219.051),
    -200.275 + 3 * 0 - 19.492 - (-192.590),
    -243.740 + 3 * 0 - 74.918 - (-164.376),
    -286.034 + 3 * 0 - 130.802 - (-135.528),
    -327.356 + 3 * 0 - 186.622 - (-106.416),
    -367.816 + 3 * 0 - 242.332 - (-77.163)
];
const R_gas = 8.314;

// Basic bisection method to solve for x since we don't have fzero in JS natively
function solveX(Kp_val: number, p_tot: number): number {
    const eqn = (x: number) => {
        return (27 * Math.pow(x, 4) * Math.pow(p_tot, 2)) / (4 * Math.pow(1 - x, 2) * Math.pow(1 + x, 2)) - Kp_val;
    };

    if (Kp_val > 1e12) return 0.9999;
    if (Kp_val < 1e-12) return 1e-4;

    let low = 1e-6;
    let high = 1 - 1e-6;

    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        if (eqn(mid) > 0) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return (low + high) / 2;
}

export default function Tab4CH4Reforming() {
    const [Tv, setTv] = useState(1000);
    const [pv, setPv] = useState(10);

    const { dG, Kp, fCH4, fH2O, fCO, fH2 } = useMemo(() => {
        const dG = interpolatePchip(T_tbl, dG_reform_data, Tv); // kJ/mol
        const Kp = Math.exp((-dG * 1e3) / (R_gas * Tv));

        const x_sol = solveX(Kp, pv);
        const tm = 2 + 2 * x_sol;

        return {
            dG, Kp,
            fCH4: (1 - x_sol) / tm,
            fH2O: (1 - x_sol) / tm,
            fCO: x_sol / tm,
            fH2: (3 * x_sol) / tm
        };
    }, [Tv, pv]);

    const barData = useMemo(() => {
        const pvec = [1, 10, 100];
        const dGt = interpolatePchip(T_tbl, dG_reform_data, Tv);
        const Kpt = Math.exp((-dGt * 1e3) / (R_gas * Tv));

        const ch4: number[] = [], h2o: number[] = [], co: number[] = [], h2: number[] = [];

        pvec.forEach(p => {
            const xt = solveX(Kpt, p);
            const tm2 = 2 + 2 * xt;
            ch4.push((1 - xt) / tm2);
            h2o.push((1 - xt) / tm2);
            co.push(xt / tm2);
            h2.push((3 * xt) / tm2);
        });

        return [
            { x: ['1 atm', '10 atm', '100 atm'], y: ch4, name: 'CH₄', type: 'bar', marker: { color: '#f97316' } },
            { x: ['1 atm', '10 atm', '100 atm'], y: h2o, name: 'H₂O', type: 'bar', marker: { color: '#0ea5e9' } },
            { x: ['1 atm', '10 atm', '100 atm'], y: co, name: 'CO', type: 'bar', marker: { color: '#eab308' } },
            { x: ['1 atm', '10 atm', '100 atm'], y: h2, name: 'H₂', type: 'bar', marker: { color: '#22c55e' } }
        ];
    }, [Tv]);

    // 3D Surface
    const surfaceData = useMemo(() => {
        const T_arr = Array.from({ length: 20 }, (_, i) => 600 + (i * 900) / 19);
        const p_arr = [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100];

        const zData = p_arr.map(p => {
            return T_arr.map(t => {
                const dGt = interpolatePchip(T_tbl, dG_reform_data, t);
                const Kpt = Math.exp((-dGt * 1e3) / (R_gas * t));
                const xt = solveX(Kpt, p);
                return (3 * xt) / (2 + 2 * xt);
            });
        });

        return {
            x: T_arr,
            y: p_arr.map(p => Math.log10(p)),
            z: zData,
            type: 'surface',
            colorscale: 'Portland',
            showscale: true,
            colorbar: { title: { text: 'H₂ mole fraction' }, tickfont: { color: 'white' }, titlefont: { color: 'white' } }
        };
    }, []);

    return (
        <div className="tab-content">
            <div className="glass-panel controls-panel">
                <h2>🔥 Reforming Parameters</h2>
                <div className="glass-card">
                    <div className="control-group">
                        <label>Temperature T (K):</label>
                        <input type="number" step="10" value={Tv} onChange={e => setTv(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Total pressure p (atm):</label>
                        <input type="number" step="1" value={pv} onChange={e => setPv(Number(e.target.value))} />
                    </div>
                </div>

                <div className="equation-box">
                    {'━━━━ Thermochemistry ━━━━\n'}
                    {`  ΔG°(${Tv}K) = ${dG.toFixed(3)} kJ/mol\n`}
                    {`  Kp = ${Kp.toExponential(3)}\n\n`}
                    {'━━━━ Mole Fractions ━━━━\n'}
                    {`  CH₄ = ${fCH4.toFixed(4)}\n`}
                    {`  H₂O = ${fH2O.toFixed(4)}\n`}
                    {`  CO  = ${fCO.toFixed(4)}\n`}
                    {`  H₂  = ${fH2.toFixed(4)}\n\n`}
                    {'━━━━ Verification ━━━━\n'}
                    {`  Sum = ${(fCH4 + fH2O + fCO + fH2).toFixed(4)} ✓\n`}
                </div>
            </div>

            <div className="glass-panel visualization-panel-3d">
                <Plot
                    data={[
                        surfaceData as any,
                        {
                            x: [Tv],
                            y: [Math.log10(pv)],
                            z: [fH2],
                            type: 'scatter3d',
                            mode: 'markers',
                            marker: { size: 6, color: 'red', line: { color: 'white', width: 2 } },
                            name: 'Selected Point',
                            showlegend: false
                        }
                    ]}
                    layout={{
                        title: { text: "H₂ Mole Fraction in Steam Reforming", font: { color: 'white' } },
                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                        margin: { l: 0, r: 0, t: 40, b: 0 },
                        scene: {
                            xaxis: { title: { text: 'Temperature (K)' }, color: 'white', gridcolor: '#333' },
                            yaxis: { title: { text: 'log10(P / atm)' }, color: 'white', gridcolor: '#333' },
                            zaxis: { title: { text: 'H₂ mole frac' }, color: 'white', gridcolor: '#333', range: [0, 0.8] },
                            camera: { eye: { x: -1.5, y: -1.5, z: 1.0 } }
                        }
                    }}
                    useResizeHandler={true} style={{ width: '100%', height: '100%' }}
                />
            </div>

            <div className="glass-panel visualization-panel-2d">
                <Plot
                    data={barData as any}
                    layout={{
                        barmode: 'group',
                        title: { text: `Equilibrium Mole Fractions at T = ${Tv} K`, font: { color: 'white' } },
                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                        margin: { l: 60, r: 20, t: 40, b: 50 },
                        xaxis: { color: 'white', gridcolor: '#333' },
                        yaxis: { title: { text: 'Mole Fraction' }, color: 'white', gridcolor: '#333', range: [0, 0.85] },
                        legend: { font: { color: 'white' }, bgcolor: 'rgba(0,0,0,0.5)', orientation: 'h', y: 1.1 }
                    }}
                    useResizeHandler={true} style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
}
