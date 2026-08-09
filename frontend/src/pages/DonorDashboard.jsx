import { useState } from 'react';
import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';

export default function DonorDashboard() {
  const [activeTab, setActiveTab] = useState('disasters');

  const tabNav = (
    <nav className="tab-nav" role="tablist" aria-label="Donor sections">
      <button
        role="tab"
        aria-selected={activeTab === 'disasters'}
        aria-controls="panel-disasters"
        id="tab-disasters"
        className={`tab-btn ${activeTab === 'disasters' ? 'active' : ''}`}
        onClick={() => setActiveTab('disasters')}
      >
        <span className="tab-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <span>Disasters</span>
      </button>
    </nav>
  );

  return (
    <DashboardShell
      layout="admin"
      heading="Your donations"
      lead="Stay aware of active incidents while donation workflows are prepared."
      sidebar={tabNav}
    >
      <div
        key={activeTab}
        className="tab-content"
        role="tabpanel"
        id="panel-disasters"
        aria-labelledby="tab-disasters"
      >
        {activeTab === 'disasters' && <DisasterList />}
      </div>
    </DashboardShell>
  );
}
