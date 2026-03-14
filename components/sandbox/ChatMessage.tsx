import type { ChatMessage, AIMode } from "@/types/chat";

const modeBadge: Record<AIMode, { label: string; bg: string; color: string }> = {
  query:         { label: "Query",         bg: "linear-gradient(135deg, #DDF0EC 0%, #C8E8E2 100%)", color: "#1A8070" },
  exploration:   { label: "Exploration",   bg: "linear-gradient(135deg, #F5EDD8 0%, #EDE0C0 100%)", color: "#8A6020" },
  investigation: { label: "Investigation", bg: "linear-gradient(135deg, #FEF3E2 0%, #FDEBD0 100%)", color: "#B86810" },
};

interface ChatMessageProps { message: ChatMessage }

export default function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[72%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] leading-relaxed text-white"
          style={{
            background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)",
            boxShadow: "0 2px 10px rgba(61,191,172,0.25)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1.5">
        {message.mode && (
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: modeBadge[message.mode].bg, color: modeBadge[message.mode].color }}
          >
            {modeBadge[message.mode].label} Mode
          </span>
        )}
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] leading-relaxed"
          style={{
            background: "white",
            border: "1px solid rgba(210,195,165,0.45)",
            color: "#1E2D3D",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          }}
        >
          {message.content}
          {message.isStreaming && (
            <span
              className="ml-1 inline-block h-3.5 w-0.5 animate-pulse rounded-full"
              style={{ background: "linear-gradient(180deg, #3DBFAC, #27A090)" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
