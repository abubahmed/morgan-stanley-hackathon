import type { UserRole } from "@/types/chat";
import type { ElementType } from "react";

interface RoleCardProps {
  role: UserRole;
  Icon: ElementType;
  label: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function RoleCard({ Icon, label, description, isSelected, onClick }: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
      style={{
        background: isSelected
          ? "linear-gradient(145deg, #EBF8F5 0%, #F5EDD8 100%)"
          : "linear-gradient(145deg, #F8F2E4 0%, #F2EAD4 100%)",
        border: `1.5px solid ${isSelected ? "rgba(61,191,172,0.55)" : "rgba(200,190,165,0.4)"}`,
        boxShadow: isSelected ? "0 2px 12px rgba(61,191,172,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          background: isSelected
            ? "linear-gradient(135deg, #C8EDE8 0%, #A8DDD6 100%)"
            : "linear-gradient(135deg, #DDF0EC 0%, #C8E8E2 100%)",
        }}
      >
        <Icon size={18} style={{ color: isSelected ? "#1E9080" : "#3DBFAC" }} />
      </div>
      <p className="text-[14px] font-bold" style={{ color: "#1E2D3D" }}>{label}</p>
      <p className="text-[12px] leading-relaxed" style={{ color: "#6A7E8D" }}>{description}</p>
    </button>
  );
}
