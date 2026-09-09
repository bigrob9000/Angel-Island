/** Soft cloud blobs behind active nav pills — matches room / enter-button clouds. */
export function NavCloudBackdrop() {
  return (
    <span className="nav-cloud-shape" aria-hidden>
      <span className="nav-cloud-blob" style={{ width: "58%", height: "78%", top: "18%", left: "-8%" }} />
      <span className="nav-cloud-blob" style={{ width: "52%", height: "72%", top: "8%", left: "18%" }} />
      <span className="nav-cloud-blob" style={{ width: "48%", height: "68%", top: "14%", left: "42%" }} />
      <span className="nav-cloud-blob" style={{ width: "44%", height: "64%", top: "22%", left: "62%" }} />
      <span className="nav-cloud-blob" style={{ width: "38%", height: "58%", top: "28%", left: "78%" }} />
    </span>
  );
}
