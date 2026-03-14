import type { UserRole } from "@/types/chat";
import RoleCard from "./RoleCard";

const ROLES: {
  role: UserRole;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    role: "food_bank_partner",
    icon: "🏪",
    label: "Food Bank Partner",
    description: "I distribute food through my organization and want to understand supply & demand.",
  },
  {
    role: "government_policy",
    icon: "🏛️",
    label: "Government / Policy",
    description: "I'm a public servant or elected official looking for community impact data.",
  },
  {
    role: "donor",
    icon: "🤝",
    label: "Potential Donor",
    description: "I'm considering contributing food, funds, or resources and want to see impact.",
  },
  {
    role: "volunteer",
    icon: "🙋",
    label: "Volunteer / Advocate",
    description: "I want to help on the ground and understand where I'm needed most.",
  },
  {
    role: "researcher",
    icon: "📊",
    label: "Researcher / Analyst",
    description: "I need detailed data to study food insecurity patterns and trends.",
  },
  {
    role: "community",
    icon: "🏘️",
    label: "Community Member",
    description: "I want to find food resources near me or learn about what's available.",
  },
];

interface RoleGridProps {
  selectedRole: UserRole | null;
  onSelectRole: (role: UserRole) => void;
}

export default function RoleGrid({ selectedRole, onSelectRole }: RoleGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ROLES.map((r) => (
        <RoleCard
          key={r.role}
          {...r}
          isSelected={selectedRole === r.role}
          onClick={() => onSelectRole(r.role)}
        />
      ))}
    </div>
  );
}
