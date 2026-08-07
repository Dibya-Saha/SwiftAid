import DashboardShell from '../components/DashboardShell';

export default function DonorDashboard() {
  return (
    <DashboardShell
      eyebrow="Donor portal"
      heading="Your donations"
      lead="Track what you've given and where it's headed once donation records are wired up."
    >
      <div className="empty-state">
        Nothing built here yet — next up: a form to log a donation, and a
        history of items you've sent to warehouses.
      </div>
    </DashboardShell>
  );
}
