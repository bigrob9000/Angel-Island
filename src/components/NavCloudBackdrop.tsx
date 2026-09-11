/** Soft cloud blobs behind active nav pills — contained inside each pill. */
export function NavCloudBackdrop() {
  return (
    <span className="nav-cloud-highlight" aria-hidden>
      <span className="nav-cloud-highlight-blob nav-cloud-highlight-blob--a" />
      <span className="nav-cloud-highlight-blob nav-cloud-highlight-blob--b" />
      <span className="nav-cloud-highlight-blob nav-cloud-highlight-blob--c" />
    </span>
  );
}
