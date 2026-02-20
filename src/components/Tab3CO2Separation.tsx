import { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';

const R_gas = 8.314;

export default function Tab3CO2Separation() {
    const [ppm, setPpm] = useState(400);
    const [ref, setRef] = useState(10); // % vol
    const [Tval, setTval] = useState(298.15);

    const { w_ref, w_dac, fac, ln_ref, ln_dac } = useMemo(() => {
        const ratio_ref = 100 / ref;
        const ratio_dac = 1e6 / ppm;

        const ln_ref = Math.log(ratio_ref);
        const ln_dac = Math.log(ratio_dac);

        const w_ref = R_gas * Tval * ln_ref; // J/mol
        const w_dac = R_gas * Tval * ln_dac;
        const fac = ln_dac / ln_ref;

        return { w_ref, w_dac, fac, ln_ref, ln_dac };
    }, [ppm, ref, Tval]);

    // 3D Surface
    const surfaceData = useMemo(() => {
        // We map T from 250 to 450, PM from 10 to 1,000,000 (log scale interpolation)
        const T_v = Array.from({ length: 20 }, (_, i) => 250 + (i * 200) / 19);
        const logP_v = Array.from({ length: 30 }, (_, i) => 1 + (i * 5) / 29); // 10^1 to 10^6

        // Z matrix: Work in kJ/mol => (R * T * ln(1e6 / P)) / 1000
        const zData = logP_v.map(lp => {
            const p = Math.pow(10, lp);
            return T_v.map(t => Math.max(0, (R_gas * t * Math.log(1e6 / p)) / 1000));
        });

        return {
            x: T_v,
            y: logP_v,
            z: zData,
            type: 'surface',
            colorscale: 'Hot',
            showscale: true,
            colorbar: { title: { text: 'Work (kJ/mol)' }, tickfont: { color: 'white' }, titlefont: { color: 'white' } }
        };
    }, []);

    // 2D Line
    const lineData = useMemo(() => {
        const ppm2 = Array.from({ length: 100 }, (_, i) => Math.pow(10, 1 + (i * 5) / 99));
        const w2 = ppm2.map(p => Math.max(0, (R_gas * Tval * Math.log(1e6 / p)) / 1000));

        return [
            {
                x: ppm2,
                y: w2,
                type: 'scatter',
                mode: 'lines',
                line: { color: '#38bdf8', width: 3 },
                name: 'Work Curve'
            },
            {
                x: [ppm],
                y: [w_dac / 1000],
                type: 'scatter',
                mode: 'markers',
                marker: { color: '#22d3ee', size: 12, line: { color: 'white', width: 2 } },
                name: 'DAC Config'
            },
            {
                x: [ref * 10000],
                y: [w_ref / 1000],
                type: 'scatter',
                mode: 'markers',
                marker: { color: '#4ade80', size: 12, line: { color: 'white', width: 2 } },
                name: 'Flue-gas Config'
            }
        ];
    }, [ppm, ref, Tval, w_dac, w_ref]);

    return (
        <div className="tab-content">
            <div className="glass-panel controls-panel">
                <h2>🌿 CO₂ Parameters</h2>
                <div className="glass-card">
                    <div className="control-group">
                        <label>Atmospheric CO₂ (ppm):</label>
                        <input type="number" step="10" value={ppm} onChange={e => setPpm(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Reference conc (% vol):</label>
                        <input type="number" step="1" value={ref} onChange={e => setRef(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Temperature T (K):</label>
                        <input type="number" step="10" value={Tval} onChange={e => setTval(Number(e.target.value))} />
                    </div>
                </div>

                <div className="equation-box">
                    {'━━━━ Detailed Results ━━━━\n'}
                    {`  T = ${Tval.toFixed(2)} K\n`}
                    {`  R = 8.314 J/(mol·K)\n\n`}
                    {`  Flue gas (${ref}%):\n`}
                    {`    ln(${100}/${ref}) = ${ln_ref.toFixed(4)}\n`}
                    {`    w_ref = ${(w_ref / 1000).toFixed(2)} kJ/mol\n\n`}
                    {`  DAC (${ppm} ppm):\n`}
                    {`    ln(1e6/${ppm}) = ${ln_dac.toFixed(4)}\n`}
                    {`    w_dac = ${(w_dac / 1000).toFixed(2)} kJ/mol\n\n`}
                    {`  DAC needs ${fac.toFixed(2)}× more work`}
                </div>
            </div>

            <div className="glass-panel visualization-panel-3d">
                <Plot
                    data={[
                        surfaceData as any,
                        {
                            x: [Tval, Tval],
                            y: [Math.log10(ppm), Math.log10(ref * 10000)],
                            z: [w_dac / 1000, w_ref / 1000],
                            type: 'scatter3d',
                            mode: 'markers',
                            marker: { size: 8, color: ['#22d3ee', '#4ade80'], line: { color: 'white', width: 2 } },
                            name: 'Selected Points',
                            showlegend: false
                        }
                    ]}
                    layout={{
                        title: { text: `Separation Work Surface (Ratio: ${fac.toFixed(2)}×)`, font: { color: 'white' } },
                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                        margin: { l: 0, r: 0, t: 40, b: 0 },
                        scene: {
                            xaxis: { title: { text: 'Temperature (K)' }, color: 'white', gridcolor: '#333' },
                            yaxis: { title: { text: 'log(PPM)' }, color: 'white', gridcolor: '#333' },
                            zaxis: { title: { text: 'Work (kJ/mol)' }, color: 'white', gridcolor: '#333' },
                            camera: { eye: { x: -1.5, y: -1.5, z: 0.8 } }
                        }
                    }}
                    useResizeHandler={true} style={{ width: '100%', height: '100%' }}
                />
            </div>

            <div className="glass-panel visualization-panel-2d">
                <Plot
                    data={lineData as any}
                    layout={{
                        title: { text: `CO₂ Separation Work at T=${Tval.toFixed(1)} K`, font: { color: 'white' } },
                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                        margin: { l: 60, r: 20, t: 40, b: 50 },
                        xaxis: { type: 'log', title: { text: 'CO₂ concentration (ppm) [Log Scale]' }, color: 'white', gridcolor: '#333' },
                        yaxis: { title: { text: 'Separation work (kJ/mol)' }, color: 'white', gridcolor: '#333', rangemode: 'tozero' },
                        legend: { font: { color: 'white' }, bgcolor: 'rgba(0,0,0,0.5)' },
                        shapes: [
                            { type: 'line', x0: ppm, x1: ppm, y0: 0, y1: w_dac / 1000, line: { color: '#00ffff', width: 2, dash: 'dash' } },
                            { type: 'line', x0: ref * 10000, x1: ref * 10000, y0: 0, y1: w_ref / 1000, line: { color: '#4ade80', width: 2, dash: 'dash' } }
                        ]
                    }}
                    useResizeHandler={true} style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
}
