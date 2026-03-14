import ReactMarkdown from "react-markdown";
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
          <ReactMarkdown
            components={{
              h1: (p) => <h1 className="text-lg font-bold mb-2 mt-1" {...p} />,
              h2: (p) => <h2 className="text-base font-bold mb-1.5 mt-1" {...p} />,
              h3: (p) => <h3 className="text-[14px] font-semibold mb-1 mt-1" {...p} />,
              p: (p) => <p className="mb-2 last:mb-0" {...p} />,
              ul: (p) => <ul className="list-disc pl-5 mb-2 space-y-0.5" {...p} />,
              ol: (p) => <ol className="list-decimal pl-5 mb-2 space-y-0.5" {...p} />,
              li: (p) => <li className="text-[14px]" {...p} />,
              strong: (p) => <strong className="font-semibold" {...p} />,
              em: (p) => <em className="italic" {...p} />,
              code: ({ className, children, ...p }) =>
                className ? (
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-[13px] font-mono my-2">
                    <code {...p}>{children}</code>
                  </pre>
                ) : (
                  <code className="bg-gray-100 rounded px-1 py-0.5 text-[13px] font-mono" {...p}>{children}</code>
                ),
              blockquote: (p) => (
                <blockquote
                  className="border-l-4 pl-3 italic my-2 text-[13px]"
                  style={{ borderColor: "#3DBFAC", color: "#4A6070" }}
                  {...p}
                />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
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
