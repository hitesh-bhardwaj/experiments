// Shared stat-card markup - previously copy-pasted per page across
// dashboard/page.js, dashboard/usage/page.js, and dashboard/invoicing/page.js.
// Extracted here since the new admin activity pages need the identical look.
export function StatCard({ label, value, detail }) {
  return (
    <div className="flex h-full flex-col justify-between p-6 gap-6 bg-[#272727]">
      <div className="flex flex-col gap-2">
        <p className="text-white">{label}</p>
        {detail && <div className="text-[#838383]">{detail}</div>}

      </div>
      <p className="text-2xl font-medium font-laygrotesk leading-none">{value}</p>
    </div>
  );
}
