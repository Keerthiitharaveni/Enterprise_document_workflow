const STYLES = {
  pending: "bg-amber-soft text-amber",
  approved: "bg-pine-soft text-pine-dark",
  rejected: "bg-brick-soft text-brick",
  draft: "bg-canvas text-slate",
};

const DOTS = {
  pending: "bg-amber",
  approved: "bg-pine",
  rejected: "bg-brick",
  draft: "bg-slate",
};

export default function StatusBadge({ status }) {
  const key = STYLES[status] ? status : "draft";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium ${STYLES[key]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[key]}`} />
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}
