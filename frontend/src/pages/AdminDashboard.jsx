import { useState, useRef } from "react";
import DashboardShell from "../components/DashboardShell";
import DisasterManagementTab from "./admin/DisasterManagementTab";
import TeamReviewTab from "./admin/TeamReviewTab";
import ShelterManagementTab from "./admin/ShelterManagementTab";
import WarehouseManagementTab from "./admin/WarehouseManagementTab";
import ItemManagementTab from "./admin/ItemManagementTab";
import VictimManagementTab from "./admin/VictimManagementTab";
import InventoryManagementTab from "./admin/InventoryManagementTab";
import DonationManagementTab from "./admin/DonationManagementTab";
import ReliefRequestManagementTab from "./admin/ReliefRequestManagementTab";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("disaster");
  const refreshKey = useRef(0);

  const tabs = [
    {
      id: "disaster",
      label: "Disasters",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      id: "team",
      label: "Teams",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "shelter",
      label: "Shelters",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <path d="M5 21V9l7-5 7 5v12" />
          <path d="M9 21v-6h6v6" />
          <path d="M9 10h.01M15 10h.01" />
        </svg>
      ),
    },
    {
      id: "warehouse",
      label: "Warehouses",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <path d="M4 21V8l8-4 8 4v13" />
          <path d="M8 21v-7h8v7" />
          <path d="M8 10h.01M12 10h.01M16 10h.01" />
        </svg>
      ),
    },
    {
      id: "item",
      label: "Items",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21 8-9-5-9 5 9 5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 16 9 5 9-5" />
        </svg>
      ),
    },
    {
      id: "victim",
      label: "Victims",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="7" r="4" />
          <path d="M2 21v-2a7 7 0 0 1 14 0v2" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M22 21v-2a7 7 0 0 0-5-6.7" />
        </svg>
      ),
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7h18" />
          <path d="M5 7v13h14V7" />
          <path d="M8 7V4h8v3" />
          <path d="M8 11h8M8 15h5" />
        </svg>
      ),
    },
    {
      id: "donation",
      label: "Donations",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
          <path d="M2 7h20v5H2z" />
          <path d="M12 22V7" />
          <path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Z" />
          <path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z" />
        </svg>
      ),
    },
    {
      id: "relief",
      label: "Relief Requests",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
  ];

  const tabNav = (
    <nav className="tab-nav" role="tablist" aria-label="Admin sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          id={`tab-${tab.id}`}
          className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <DashboardShell
      layout="admin"
      eyebrow="Admin console"
      heading="Operations overview"
      lead="Manage disaster records, locations, and relief operations."
      sidebar={tabNav}
    >
      <div
        key={activeTab}
        className="tab-content"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === "disaster" && (
          <DisasterManagementTab refreshKey={refreshKey} />
        )}
        {activeTab === "team" && <TeamReviewTab />}
        {activeTab === "shelter" && <ShelterManagementTab />}
        {activeTab === "warehouse" && <WarehouseManagementTab />}
        {activeTab === "item" && <ItemManagementTab />}
        {activeTab === "victim" && <VictimManagementTab />}
        {activeTab === "inventory" && <InventoryManagementTab />}
        {activeTab === "donation" && <DonationManagementTab />}
        {activeTab === "relief" && <ReliefRequestManagementTab />}
      </div>
    </DashboardShell>
  );
}
