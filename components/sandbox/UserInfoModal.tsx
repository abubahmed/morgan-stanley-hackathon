"use client";

import { useState } from "react";
import type { UserInfo } from "@/types/chat";

interface UserInfoModalProps {
  existing?: UserInfo | null;
  onSubmit: (info: Omit<UserInfo, "id" | "createdAt">) => void;
  onCancel?: () => void;
}

export default function UserInfoModal({ existing, onSubmit, onCancel }: UserInfoModalProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [organization, setOrganization] = useState(existing?.organization ?? "");
  const [role, setRole] = useState<NonNullable<UserInfo["role"]>>(existing?.role ?? "community");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    onSubmit({ name: name.trim(), email: email.trim() || undefined, organization: organization.trim() || undefined, role });
  };

  const isEdit = !!existing;

  const inputClass = "w-full rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2"
    + " border transition-colors";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-base"
            style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}
          >
            LT
          </div>
          <div>
            <h2 className="text-[16px] font-bold leading-tight" style={{ color: "#1E2D3D" }}>
              {isEdit ? "Edit your profile" : "Welcome to LemonAId"}
            </h2>
            <p className="text-[12px]" style={{ color: "#8A9AAA" }}>
              {isEdit ? "Update your information below" : "Tell us about yourself to get started"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#4A5E6D" }}>
              Name <span className="text-red-400">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Your name" autoFocus
              className={inputClass}
              style={{ borderColor: "#EDE2C4", color: "#1E2D3D" }} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#4A5E6D" }}>
              Email <span className="text-[11px] font-normal" style={{ color: "#9AAAB8" }}>(optional)</span>
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className={inputClass}
              style={{ borderColor: "#EDE2C4", color: "#1E2D3D" }} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#4A5E6D" }}>
              Organization <span className="text-[11px] font-normal" style={{ color: "#9AAAB8" }}>(optional)</span>
            </label>
            <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)}
              placeholder="Food bank, city program, NGO..."
              className={inputClass}
              style={{ borderColor: "#EDE2C4", color: "#1E2D3D" }} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#4A5E6D" }}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as NonNullable<UserInfo["role"]>)}
              className={inputClass + " bg-white cursor-pointer"}
              style={{ borderColor: "#EDE2C4", color: "#1E2D3D" }}>
              <option value="community">Community Member</option>
              <option value="coordinator">Pantry Coordinator</option>
              <option value="researcher">Researcher / Analyst</option>
              <option value="admin">Network Administrator</option>
            </select>
          </div>

          {error && <p className="text-red-400 text-[12px] font-medium">{error}</p>}

          <div className="flex gap-2 mt-1">
            {isEdit && onCancel && (
              <button type="button" onClick={onCancel}
                className="flex-1 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors"
                style={{ border: "1px solid #EDE2C4", color: "#4A5E6D" }}>
                Cancel
              </button>
            )}
            <button type="submit"
              className="flex-1 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:shadow-md"
              style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #1A8E80 100%)" }}>
              {isEdit ? "Save changes" : "Get Started"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
