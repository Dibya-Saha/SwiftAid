import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';

export default function DonorDashboard() {
  return (
    <DashboardShell
      eyebrow="Donor portal"
      heading="Your donations"
      lead="Stay aware of active incidents while donation workflows are prepared."
    >
      <DisasterList />
    </DashboardShell>
  );
}
