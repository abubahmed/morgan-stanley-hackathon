import type { KpiStat } from "@/types/chat";
import KpiCard from "./KpiCard";

interface KpiSectionProps {
  stats: KpiStat[];
  role: string;
}

export default function KpiSection({ stats, role }: KpiSectionProps) {
  const roleLabel: Record<string, string> = {
    food_bank_partner: "a food bank partner",
    government_policy: "a government partner",
    donor: "a donor",
    volunteer: "a volunteer",
    researcher: "a researcher",
    community: "a community member",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Insights for you — prioritized based on your role as{" "}
        <span className="font-medium text-gray-700">{roleLabel[role] ?? "a partner"}</span>.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <KpiCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  );
}
