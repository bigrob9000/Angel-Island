/** Soft cloud blobs behind active nav pills — matches room / enter-button clouds. */
type Props = {
  /** Trim left overflow (first tab beside logo). */
  clipStart?: boolean;
  /** Trim right overflow (last tab beside sign-out). */
  clipEnd?: boolean;
};

export function NavCloudBackdrop({ clipStart = false, clipEnd = false }: Props) {
  const shapeClass = [
    "nav-cloud-shape",
    clipStart && "nav-cloud-shape-clip-start",
    clipEnd && "nav-cloud-shape-clip-end",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={shapeClass} aria-hidden>
      {!clipStart && (
        <span className="nav-cloud-blob" style={{ width: "58%", height: "78%", top: "18%", left: "-8%" }} />
      )}
      <span
        className="nav-cloud-blob"
        style={{
          width: clipStart ? "56%" : "52%",
          height: "72%",
          top: "8%",
          left: clipStart ? "4%" : "18%",
        }}
      />
      <span className="nav-cloud-blob" style={{ width: "48%", height: "68%", top: "14%", left: "42%" }} />
      <span className="nav-cloud-blob" style={{ width: "44%", height: "64%", top: "22%", left: "62%" }} />
      {!clipEnd && (
        <span className="nav-cloud-blob" style={{ width: "38%", height: "58%", top: "28%", left: "78%" }} />
      )}
    </span>
  );
}
