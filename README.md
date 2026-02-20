# Future Power Train for Sustainable Community

![Build Status](https://img.shields.io/badge/build-passing-success)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-7.3-purple)

An interactive dashboard simulating thermodynamic, chemical, and electrical systems for future sustainable powertrains. Developed as part of coursework at the **Institute of Science Tokyo** by **A2TE KMUTT: Narongkorn Buanarth** (Instructor: Professor Takashi SASABE).

🔗 **[Live Demo](https://narongwile.github.io/Future-PowerTrain-for-Sustainable-Community/)**

## 📖 Overview

This web-based dashboard visualizes and computes theoretical problems related to sustainable energy systems. It translates mathematical models (Gibbs thermodynamics, fuel cell design, $CO_2$ separation work, steam reforming equilibrium, and Li-ion diffusion kinetics) into an interactive React application.

### Key Simulation Modules:
1. **Hydrogen-Oxygen PEM Fuel Cell Thermodynamics**: Calculates standard Gibbs free energy changes and maximum reversible cell voltage.
2. **Fuel Cell Stack Design**: Computes optimal cell arrays, volumes, and total output power constraints.
3. **$CO_2$ Separation Work**: Calculates the isothermal compression work required for Direct Air Capture (DAC) vs. post-combustion capture.
4. **Methane Steam Reforming ($CH_4$)**: Simulates equilibrium compositions for hydrogen production pathways.
5. **Li-ion Battery Diffusion Kinetics**: Models internal voltage drops and diffusion lengths inside lithium-ion architectures.
6. **Dynamic EV Powertrain Architecture**: A fully interactive 800V EV theoretical powertrain simulation. Features an active physics engine modeling vehicle dynamics, real-time energy flow visualizations, and interactive component monitoring modals.

## 🚀 Technologies Used

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Data Visualization**: [Plotly.js](https://plotly.com/javascript/)
- **Styling**: Native CSS with Glassmorphism UI & [Lucide React](https://lucide.dev/) Icons
- **Deployment**: GitHub Pages

## 💻 Local Development Setup

To run this dashboard locally on your machine, follow these steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn`

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/narongwile/Future-PowerTrain-for-Sustainable-Community.git
   cd Future-PowerTrain-for-Sustainable-Community
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

## ⚙️ Building and Deployment

To build the static files for production:
```bash
npm run build
```

This project is configured to deploy automatically to GitHub Pages. To push your local changes to the live website, simply run:
```bash
npm run deploy
```
*(Note: You must have write access to the repository to deploy).*

## 📚 Theoretical Foundation

All simulations, parameters, and structural analyses represented in this dashboard correspond directly to the rigorous mathematical derivations laid out in the official project report (`report_Future Power Train for Sustainable Community.tex`).

**Constants Used:**
- Universal Gas Constant ($\mathcal{R}$): $8.314 \text{ J}\cdot\text{mol}^{-1}\cdot\text{K}^{-1}$
- Faraday Constant ($\mathcal{F}$): $96485 \text{ C}\cdot\text{mol}^{-1}$

## 📝 License

This project was built for academic purposes.
