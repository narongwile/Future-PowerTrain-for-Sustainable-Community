import { useState } from 'react';
import {
  Zap,
  Battery,
  Leaf,
  Flame,
  CircleDot,
  Car
} from 'lucide-react';

import Tab1FuelCell from './components/Tab1FuelCell';
import Tab2FuelCellStack from './components/Tab2FuelCellStack';
import Tab3CO2Separation from './components/Tab3CO2Separation';
import Tab4CH4Reforming from './components/Tab4CH4Reforming';
import Tab5LiionBattery from './components/Tab5LiionBattery';
import Tab6Powertrain from './components/Tab6Powertrain';

function App() {
  const [activeTab, setActiveTab] = useState(1);

  const tabs = [
    { id: 1, name: 'Q1 Fuel Cell Thermo', icon: <Zap size={18} /> },
    { id: 2, name: 'Q2 Fuel Cell Stack', icon: <Battery size={18} /> },
    { id: 3, name: 'CO₂ Separation', icon: <Leaf size={18} /> },
    { id: 4, name: 'CH₄ Reforming', icon: <Flame size={18} /> },
    { id: 5, name: 'Li-ion Battery', icon: <CircleDot size={18} /> },
    { id: 6, name: 'Future Powertrain', icon: <Car size={18} /> },
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <h1>
            <Zap size={24} color="var(--highlight-yellow)" />
            Future PowerTrain for Sustainable Community
          </h1>
          <div className="subtitle">
            Professor Takashi SASABE, School of Engineering, Department of Mechanical Engineering, Institute of Science Tokyo
          </div>
        </div>
        <div className="author">A2TE KMUTT: Narongkorn Buanarth 68070703806</div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Sidebar */}
        <div className="glass-panel sidebar">
          <h3 style={{ padding: '0 0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Simulations
          </h3>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        {activeTab === 1 && <Tab1FuelCell />}
        {activeTab === 2 && <Tab2FuelCellStack />}
        {activeTab === 3 && <Tab3CO2Separation />}
        {activeTab === 4 && <Tab4CH4Reforming />}
        {activeTab === 5 && <Tab5LiionBattery />}
        {activeTab === 6 && <Tab6Powertrain />}

      </main>
    </div>
  );
}

export default App;
