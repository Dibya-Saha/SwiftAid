import { useEffect, useState } from "react";
import { fetchDonations } from "../../utils/api";

export default function DonationManagementTab() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDonations() {
      try {
        const { donations: rows } = await fetchDonations();
        setDonations(rows || []);
      } catch (err) {
        console.error("[Admin] failed to load donations:", err);
        setError(err.message || "Failed to load donations");
      } finally {
        setLoading(false);
      }
    }

    loadDonations();
  }, []);

  if (loading) return <div className="empty-state">Loading donations...</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!donations.length)
    return <div className="empty-state">No donations found.</div>;

  return (
    <section className="module-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Supply contributions</div>
          <h2>All donations</h2>
        </div>
        <span className="count-badge">{donations.length} total</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Donor</th>
              <th>Warehouse</th>
              <th>Item</th>
              <th>Category</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((donation) => (
              <tr key={donation.donation_id}>
                <td>{new Date(donation.donated_at).toLocaleDateString()}</td>
                <td>
                  <strong>{donation.donor_name || "Unknown"}</strong>
                  <small>{donation.donor_email || ""}</small>
                </td>
                <td>{donation.warehouse_name}</td>
                <td>{donation.item_name}</td>
                <td>
                  <span className="status-badge">{donation.category}</span>
                </td>
                <td>
                  {donation.quantity} {donation.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
