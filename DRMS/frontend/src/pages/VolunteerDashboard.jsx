import DashboardShell from '../components/DashboardShell';

export default function VolunteerDashboard() {
  return (
    <DashboardShell
      eyebrow="Volunteer portal"
      heading="Your team memberships"
      lead="Teams you belong to and shelter assignments will appear here as those features are added."
    >
      <div className="empty-state">
        Nothing built here yet — next up: which team you're on, and any
        shelter or task assignments.
      </div>
    </DashboardShell>
  );
}
