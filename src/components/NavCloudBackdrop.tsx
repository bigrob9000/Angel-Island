/** Soft cloud blobs behind active nav pills — lumpy, not a clipped oval. */
export function NavCloudBackdrop() {
  return (
    <span className="nav-cloud-highlight" aria-hidden>
      <span className="nav-cloud-highlight-blob nav-cloud-highlight-blob--1" />
      <span className="nav-cloud-highlight-blob nav-cloud-highlight-blob--2" />
      <span className="nav-cloud-highlight-blob nav-cloud-highlight-blob--3" />
      <span className="nav-cloud-highlight-blob nav-cloud-highlight-blob--4" />
      <span className="nav-cloud-highlight-blob nav-cloud-highlight-blob--5" />
    </span>
  );
}
