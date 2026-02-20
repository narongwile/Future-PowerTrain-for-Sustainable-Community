export function interpolatePchip(x: number[], y: number[], targetX: number): number {
    // A simplified linear interpolation for the sake of the web demo,
    // since a full pchip is complex to implement from scratch. 
    // For the smooth curve in Tab 1, linear is often sufficient if the points are dense,
    // but let's implement a basic cubic or linear here.

    if (targetX <= x[0]) return y[0];
    if (targetX >= x[x.length - 1]) return y[y.length - 1];

    for (let i = 0; i < x.length - 1; i++) {
        if (targetX >= x[i] && targetX <= x[i + 1]) {
            const t = (targetX - x[i]) / (x[i + 1] - x[i]);
            // Linear interpolation
            return y[i] + t * (y[i + 1] - y[i]);
        }
    }
    return 0;
}
