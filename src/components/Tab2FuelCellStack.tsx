import { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';

export default function Tab2FuelCellStack() {
    const [Vc, setVc] = useState(0.6);
    const [ic, setIc] = useState(2000);
    const [Wc, setWc] = useState(20);
    const [Hc, setHc] = useState(20);
    const [tc, setTc] = useState(3);
    const [Ptgt, setPtgt] = useState(84);
    const [mfac] = useState(1.0);

    const { area, P1_kW, N_req, P_act, vol_L, stack_h } = useMemo(() => {
        const area = Wc * Hc;
        const Pd = (Vc * ic) / 1000; // W/cm²
        const P1 = Pd * area; // W per cell
        const P1_kW = P1 / 1000; // kW per cell
        const N_req = Math.ceil((Ptgt * mfac) / P1_kW);
        const P_act = N_req * P1_kW;
        const stack_h = (tc / 10) * N_req; // cm
        const vol_cm3 = Wc * Hc * stack_h; // cm³
        const vol_L = vol_cm3 / 1000;

        return { area, P1_kW, N_req, P_act, vol_L, stack_h, vol_cm3 };
    }, [Vc, ic, Wc, Hc, tc, Ptgt, mfac]);

    const lineData = useMemo(() => {
        const n_vec = Array.from({ length: N_req + 30 }, (_, i) => i + 1);
        const P_vec = n_vec.map(n => n * P1_kW);

        return [
            {
                x: n_vec,
                y: P_vec,
                type: 'scatter',
                mode: 'lines',
                line: { color: '#3b82f6', width: 3 },
                name: 'Stack power'
            },
            {
                x: [N_req],
                y: [P_act],
                type: 'scatter',
                mode: 'markers',
                marker: { color: '#4ade80', size: 12, line: { color: 'white', width: 2 } },
                name: 'Chosen point'
            }
        ];
    }, [N_req, P_act, P1_kW]);

    // Simplified 3D Stack Visualization (showing up to 20 plates)
    const stackData3D = useMemo(() => {
        const nshow = Math.min(N_req, 20);
        const zSpacing = stack_h / N_req; // Space per cell in cm

        // Create base coordinates for a single plate (rectangle)
        const xBase = [0, Wc, Wc, 0, 0];
        const yBase = [0, 0, Hc, Hc, 0];

        // Let's create a series of 3D lines (or extremely thin meshes)
        const traces = [];

        for (let k = 0; k < nshow; k++) {
            const z0 = k * zSpacing;
            // Interpolate color from blue to red (mimicking turbo colormap)
            const r = Math.round(50 + (k / nshow) * 205);
            const b = Math.round(250 - (k / nshow) * 200);

            traces.push({
                type: 'scatter3d',
                mode: 'lines',
                x: xBase,
                y: yBase,
                z: [z0, z0, z0, z0, z0],
                line: { color: `rgb(${r}, 50, ${b})`, width: 4 },
                surfaceaxis: 2,
                surfacecolor: `rgba(${r}, 50, ${b}, 0.5)`, // Pseudo solid feel
                showlegend: false
            });
        }

        return traces;
    }, [N_req, Wc, Hc, stack_h]);

    return (
        <div className="tab-content">
            <div className="glass-panel controls-panel">
                <h2>🔋 Stack Parameters</h2>
                <div className="glass-card">
                    <div className="control-group">
                        <label>Cell voltage V_cell (V):</label>
                        <input type="number" step="0.1" value={Vc} onChange={e => setVc(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Current density i (mA/cm²):</label>
                        <input type="number" step="10" value={ic} onChange={e => setIc(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Cell width W (cm):</label>
                        <input type="number" step="1" value={Wc} onChange={e => setWc(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Cell height H (cm):</label>
                        <input type="number" step="1" value={Hc} onChange={e => setHc(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Cell thickness t (mm):</label>
                        <input type="number" step="0.5" value={tc} onChange={e => setTc(Number(e.target.value))} />
                    </div>
                    <div className="control-group">
                        <label>Target power P_target (kW):</label>
                        <input type="number" step="1" value={Ptgt} onChange={e => setPtgt(Number(e.target.value))} />
                    </div>
                </div>

                <div className="equation-box">
                    {'━━━━ Single Cell ━━━━\n'}
                    {`  Active area   = ${area.toFixed(1)} cm²\n`}
                    {`  Power/cell    = ${P1_kW.toFixed(4)} kW\n\n`}
                    {'━━━━ Stack Design ━━━━\n'}
                    {`  Cells req     = ${N_req} cells\n`}
                    {`  Actual output = ${P_act.toFixed(2)} kW\n\n`}
                    {'━━━━ Geometry ━━━━\n'}
                    {`  Stack height  = ${stack_h.toFixed(1)} cm\n`}
                    {`  Volume        = ${vol_L.toFixed(2)} L\n`}
                </div>
            </div>

            <div className="glass-panel visualization-panel-3d">
                <Plot
                    data={stackData3D as any}
                    layout={{
                        title: { text: `Fuel Cell Stack: ${N_req} cells | Vol = ${vol_L.toFixed(2)} L`, font: { color: 'white' } },
                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                        margin: { l: 0, r: 0, t: 40, b: 0 },
                        scene: {
                            xaxis: { title: { text: 'Width (cm)' }, color: 'white', gridcolor: '#333', range: [0, Wc * 1.1] },
                            yaxis: { title: { text: 'Depth (cm)' }, color: 'white', gridcolor: '#333', range: [0, Hc * 1.1] },
                            zaxis: { title: { text: 'Stack height' }, color: 'white', gridcolor: '#333', range: [0, Math.max(1, stack_h) * 1.1] },
                            camera: { eye: { x: -1.2, y: -1.2, z: 0.8 } },
                            aspectratio: { x: 1, y: 1, z: 2 } // Make the stack look taller
                        }
                    }}
                    useResizeHandler={true} style={{ width: '100%', height: '100%' }}
                />
            </div>

            <div className="glass-panel visualization-panel-2d">
                <Plot
                    data={lineData as any}
                    layout={{
                        title: { text: 'Stack power vs number of cells', font: { color: 'white' } },
                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                        margin: { l: 60, r: 20, t: 40, b: 50 },
                        xaxis: { title: { text: 'Number of cells' }, color: 'white', gridcolor: '#333' },
                        yaxis: { title: { text: 'Total power (kW)' }, color: 'white', gridcolor: '#333' },
                        legend: { font: { color: 'white' }, bgcolor: 'rgba(0,0,0,0.5)' },
                        shapes: [
                            { type: 'line', x0: 0, x1: N_req + 20, y0: Ptgt, y1: Ptgt, line: { color: '#ef4444', width: 2, dash: 'dash' } },
                            { type: 'line', x0: N_req, x1: N_req, y0: 0, y1: Math.max(P_act, Ptgt) + 20, line: { color: '#4ade80', width: 2, dash: 'dash' } }
                        ]
                    }}
                    useResizeHandler={true} style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
}
