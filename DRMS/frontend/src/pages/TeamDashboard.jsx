import DashboardShell from '../components/DashboardShell';

export default function TeamDashboard() {
  return (
    <DashboardShell
      eyebrow="Team console"
      heading="Assigned distributions"
      lead="Once distributions are wired up, your team's dispatch queue will show here."
    >
      <div className="empty-state">
        Nothing built here yet — next up: list of distributions assigned to
        your team, with status updates.
      </div>
    </DashboardShell>
  );
}
