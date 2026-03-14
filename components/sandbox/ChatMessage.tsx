import type { ChatMessage, AIMode } from "@/types/chat";

const modeBadge: Record<AIMode, { label: string; color: string }> = {
  query: { label: "Query Mode", color: "bg-blue-100 text-blue-700" },
  exploration: { label: "Exploration Mode", color: "bg-purple-100 text-purple-700" },
  investigation: { label: "Investigation Mode", color: "bg-orange-100 text-orange-700" },
};

interface ChatMessageProps {
  message: ChatMessage;
}

export default function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-lt-green-600 px-4 py-2.5 text-sm text-white shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1">
        {message.mode && (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${modeBadge[message.mode].color}`}
          >
            {modeBadge[message.mode].label}
          </span>
        )}
        <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
          {message.content}
          {message.isStreaming && (
            <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-lt-green-500" />
          )}
        </div>
      </div>
    </div>
  );
}
