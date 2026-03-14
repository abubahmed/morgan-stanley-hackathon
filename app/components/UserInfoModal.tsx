"use client";

import { useState } from "react";
import type { UserInfo } from "@/types/chat";

interface UserInfoModalProps {
  existing?: UserInfo | null;
  onSubmit: (info: Omit<UserInfo, "id" | "createdAt">) => void;
  onCancel?: () => void;
}

export default function UserInfoModal({
  existing,
  onSubmit,
  onCancel,
}: UserInfoModalProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [organization, setOrganization] = useState(
    existing?.organization ?? ""
  );
  const [role, setRole] = useState<UserInfo["role"]>(
    existing?.role ?? "community"
  );
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    onSubmit({
      name: name.trim(),
      email: email.trim() || undefined,
      organization: organization.trim() || undefined,
      role,
    });
  };

  const isEdit = !!existing;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-[#FFD93D] flex items-center justify-center text-xl shrink-0">
            🍋
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 leading-tight">
              {isEdit ? "Edit your profile" : "Welcome to Lemon Tree Insights"}
            </h2>
            <p className="text-xs text-gray-500">
              {isEdit
                ? "Update your information below"
                : "Tell us a bit about yourself to get started"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Your name"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>

          {/* Organization */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Organization{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Food bank, NGO, city program…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserInfo["role"])}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
            >
              <option value="community">Community Member</option>
              <option value="coordinator">Pantry Coordinator</option>
              <option value="researcher">Researcher / Analyst</option>
              <option value="admin">Network Administrator</option>
            </select>
          </div>

          {error && (
            <p className="text-red-500 text-xs font-medium">{error}</p>
          )}

          <div className="flex gap-2 mt-1">
            {isEdit && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 bg-[#FFD93D] hover:bg-[#F5C800] text-gray-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            >
              {isEdit ? "Save changes" : "Get Started →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
