import type { UserRole } from "@/types/chat";

interface RoleCardProps {
  role: UserRole;
  icon: string;
  label: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function RoleCard({
  icon,
  label,
  description,
  isSelected,
  onClick,
}: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md cursor-pointer ${
        isSelected
          ? "border-lt-green-600 bg-lt-green-50 shadow-sm"
          : "border-gray-200 bg-white hover:border-lt-green-300"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
          isSelected ? "bg-lt-green-100" : "bg-gray-100"
        }`}
      >
        {icon}
      </div>
      <p className={`text-sm font-semibold ${isSelected ? "text-lt-green-800" : "text-gray-900"}`}>
        {label}
      </p>
      <p className="text-xs leading-relaxed text-gray-500">{description}</p>
    </button>
  );
}
