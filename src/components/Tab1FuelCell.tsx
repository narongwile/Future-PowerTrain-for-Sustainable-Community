import { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { interpolatePchip } from '../utils/mathUtils';

const T_tbl = [298.15, 500, 1000, 1500, 2000, 2500, 3000];
const dG_H2Og = [-228.582, -219.051, -192.590, -164.376, -135.528, -106.416, -77.163];
const R_gas = 8.314;
const F_far = 96485;
const n_H2 = 2;

export default function Tab1FuelCell() {
    const [Tsel, setTsel] = useState(500);

    // Derived values for the selected temperature
    const { dG_sel, E_sel } = useMemo(() => {
        const dG = interpolatePchip(T_tbl, dG_H2Og, Tsel);
        const E = (-dG * 1e3) / (n_H2 * F_far);
        return { dG_sel: dG, E_sel: E };
    }, [Tsel]);

    // Generate 3D Surface Data
    const surfaceData = useMemo(() => {
        const T_v = Array.from({ length: 40 }, (_, i) => 298 + (i * (3000 - 298)) / 39);
        const pH2 = Array.from({ length: 20 }, (_, i) => 0.2 + (i * (1.0 - 0.2)) / 19);

        const zData = pH2.map(p =>
            T_v.map(t => {
                const dG_base = interpolatePchip(T_tbl, dG_H2Og, t);
                return dG_base + (R_gas * t / 1e3) * Math.log(p);
            })
        );

        return {
            x: T_v,
            y: pH2,
            z: zData,
            type: 'surface',
            colorscale: 'Turbo',
            showscale: true,
            colorbar: { title: { text: 'ΔG (kJ/mol)' }, tickfont: { color: 'white' }, titlefont: { color: 'white' } }
        };
    }, []);

    // Generate 2D Line Data
    const lineData = useMemo(() => {
        const T_fine = Array.from({ length: 150 }, (_, i) => 298 + (i * (3000 - 298)) / 149);
        const E_fine = T_fine.map(t => {
            const dG = interpolatePchip(T_tbl, dG_H2Og, t);
            return (-dG * 1e3) / (n_H2 * F_far);
        });

        const E_tbl = dG_H2Og.map(dg => (-dg * 1e3) / (n_H2 * F_far));

        return [
            {
                x: T_fine,
                y: E_fine,
                type: 'scatter',
                mode: 'lines',
                line: { color: '#3b82f6', width: 3 },
                name: 'E_rev curve'
            },
            {
                x: T_tbl,
                y: E_tbl,
                type: 'scatter',
                mode: 'markers',
                marker: { color: '#fb923c', size: 8 },
                name: 'Table points'
            },
            {
                x: [Tsel],
                y: [E_sel],
                type: 'scatter',
                mode: 'markers',
                marker: { color: '#4ade80', size: 12, line: { color: 'white', width: 2 } },
                name: 'Selected'
            }
        ];
    }, [Tsel, E_sel]);

    return (
        <div className="tab-content">
            {/* Controls Panel */}
            <div className="glass-panel controls-panel">
                <h2>⚡ Parameters & Results</h2>

                <div className="glass-card">
                    <div className="control-group">
                        <label>
                            <span>Temperature T (K)</span>
                            <span className="color-blue" style={{ fontWeight: 'bold' }}>T = {Tsel} K</span>
                        </label>
                        <input
                            type="range"
                            min="298" max="3000" step="1"
                            value={Tsel}
                            onChange={(e) => setTsel(Number(e.target.value))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>298K</span>
                            <span>1500K</span>
                            <span>3000K</span>
                        </div>
                    </div>

                    <div className="result-box">
                        <div className="color-red result-value">ΔG = {dG_sel.toFixed(4)} kJ/mol</div>
                        <div className="color-green result-value" style={{ fontSize: '1.25rem' }}>E_rev = {E_sel.toFixed(4)} V</div>
                        <div className="color-yellow" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Rounded → {E_sel.toFixed(3)} V</div>
                    </div>
                </div>

                <div className="equation-box">
                    {'Reaction: H₂ + ½O₂ → H₂O(g)\n\n'}
                    {'ΔG from Standard Gibbs table\n'}
                    {'(pchip interpolation)\n\n'}
                    {'E = −ΔG × 10³ / (n · F)\n'}
                    {'  n = 2 electrons\n'}
                    {'  F = 96 485 C/mol'}
                </div>

                <div className="glass-card" style={{ padding: '1rem' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>T (K)</th>
                                <th>ΔG H₂O(g) (kJ/mol)</th>
                                <th>E_rev (V)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {T_tbl.map((t, i) => (
                                <tr key={t}>
                                    <td>{t}</td>
                                    <td>{dG_H2Og[i]}</td>
                                    <td>{((-dG_H2Og[i] * 1e3) / (n_H2 * F_far)).toFixed(4)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3D Visualization */}
            <div className="glass-panel visualization-panel-3d">
                <Plot
                    data={[
                        surfaceData as any,
                        {
                            x: [Tsel],
                            y: [0.6], // Mock H2 pressure middle value for the dot
                            z: [dG_sel],
                            type: 'scatter3d',
                            mode: 'markers',
                            marker: { size: 6, color: 'red', line: { color: 'white', width: 2 } },
                            name: 'Selected'
                        }
                    ]}
                    layout={{
                        title: { text: `Gibbs Free Energy Surface | T=${Tsel} K`, font: { color: 'white' } },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        margin: { l: 0, r: 0, t: 40, b: 0 },
                        scene: {
                            xaxis: { title: { text: 'Temperature (K)' }, color: 'white', gridcolor: '#333' },
                            yaxis: { title: { text: 'pH2 (atm)' }, color: 'white', gridcolor: '#333' },
                            zaxis: { title: { text: 'ΔG (kJ/mol)' }, color: 'white', gridcolor: '#333' },
                            camera: { eye: { x: -1.5, y: -1.5, z: 1.2 } }
                        },
                        showlegend: false
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            {/* 2D Visualization */}
            <div className="glass-panel visualization-panel-2d">
                <Plot
                    data={lineData as any}
                    layout={{
                        title: { text: 'Maximum Reversible Voltage E = −ΔG / (nF)', font: { color: 'white' } },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        margin: { l: 60, r: 20, t: 40, b: 50 },
                        xaxis: { title: { text: 'Temperature (K)' }, color: 'white', gridcolor: '#333' },
                        yaxis: { title: { text: 'Reversible Cell Voltage (V)' }, color: 'white', gridcolor: '#333' },
                        legend: { font: { color: 'white' }, bgcolor: 'rgba(0,0,0,0.5)' },
                        shapes: [
                            { type: 'line', x0: Tsel, x1: Tsel, y0: 0.9, y1: 1.2, line: { color: '#facc15', dash: 'dash' } },
                            { type: 'line', x0: 200, x1: 3000, y0: E_sel, y1: E_sel, line: { color: '#4ade80', dash: 'dash' } }
                        ],
                        annotations: [
                            { x: Tsel + 100, y: E_sel + 0.01, text: `(${Tsel}K, ${E_sel.toFixed(4)}V)`, font: { color: 'white' }, showarrow: false }
                        ]
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
}
