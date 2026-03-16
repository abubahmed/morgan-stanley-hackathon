import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/types/chat";
import { FlaskConical, Download } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessage;
  onOpenReport?: (index: number) => void;
  onDownloadReport?: (index: number) => void;
}

export default function ChatMessageBubble({ message, onOpenReport, onDownloadReport }: ChatMessageProps) {
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
              p: (p) => <p className="mb-3 last:mb-0 whitespace-pre-wrap" {...p} />,
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
            {message.content.replace(/\n/g, "  \n")}
          </ReactMarkdown>
          {message.isStreaming && (
            <span
              className="ml-1 inline-block h-3.5 w-0.5 animate-pulse rounded-full"
              style={{ background: "linear-gradient(180deg, #3DBFAC, #27A090)" }}
            />
          )}
        </div>

        {/* Report action buttons */}
        {message.reportIndex != null && !message.isStreaming && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenReport?.(message.reportIndex!)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-all hover:shadow-sm active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #DDF0EC 0%, #C8E8E2 100%)",
                color: "#1A8070",
                border: "1px solid rgba(61,191,172,0.25)",
              }}
            >
              <FlaskConical size={12} />
              Open Report {message.reportIndex + 1}
            </button>
            <button
              onClick={() => onDownloadReport?.(message.reportIndex!)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-all hover:shadow-sm active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #FDECEA 0%, #F9D6D2 100%)",
                color: "#9B2C2C",
                border: "1px solid rgba(185,68,68,0.25)",
              }}
            >
              <Download size={12} />
              Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
