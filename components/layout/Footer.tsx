import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="mt-12 border-t px-6 py-4"
      style={{
        borderColor: "rgba(210,195,165,0.4)",
        background: "linear-gradient(180deg, #F5EDD8 0%, #EEE2C4 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <div className="mx-auto max-w-6xl flex items-center justify-center gap-2">
        <Leaf size={14} style={{ color: "#3DBFAC" }} />
        <span className="text-xs font-semibold" style={{ color: "#6A7E8D" }}>
          Lemon Tree <span className="font-normal">Insights</span>
        </span>
      </div>
      <p className="text-xs mt-2" style={{ color: "#6A7E8D" }}>
        2026 © All rights reserved
      </p>
    </footer>
  );
}
