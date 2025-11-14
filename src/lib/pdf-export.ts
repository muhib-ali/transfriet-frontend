// src/lib/pdf-export.ts
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/** Hex/RGB only CSS (NO oklch) – yeh clone ke andar inject hogi */
const PRINT_SAFE_CSS = `
  :root {
    --bg: #ffffff;
    --fg: #0f172a;
    --muted: #f1f5f9;
    --muted-fg: #475569;
    --primary: #6d28d9;
    --border: #e5e7eb;
  }
  .__inv-root { background:#ffffff; color:var(--fg); }
  .__no-anim, .__no-anim * {
    box-shadow:none !important; filter:none !important;
    backdrop-filter:none !important; animation:none !important; transition:none !important;
  }
  .__inv-head { color: var(--primary); font-weight:800; font-size:36px; line-height:1; }
  .__meta { font-size:12px; color:var(--muted-fg); }
  .__grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .__section { margin-top:16px; }
  .__table { width:100%; border-collapse:collapse; border:1px solid var(--border); font-size:12px; }
  .__table th, .__table td { border:1px solid var(--border); padding:10px 12px; }
  .__t-right { text-align:right; } .__t-center { text-align:center; }
  .__totals { width:320px; margin-left:auto; font-size:14px; }
  .__row { display:flex; align-items:center; justify-content:space-between; margin:4px 0; }
  .__total { border-top:1px solid var(--border); margin-top:8px; padding-top:8px; font-weight:800; }
`;

type ExportOptions = {
  fileName?: string;
  margin?: number;
  scale?: number;
  a4?: boolean; // true => A4 portrait
};

/**
 * Export any element to PDF WITHOUT touching global CSS.
 * It clones the node, injects print-safe CSS, then renders.
 */
export async function exportNodeToPdfNoGlobals(
  node: HTMLElement,
  { fileName = "invoice.pdf", margin = 24, scale = 2.5, a4 = true }: ExportOptions = {}
) {
  // 1) Clone target node
  const clone = node.cloneNode(true) as HTMLElement;

  // 2) Wrap in a root that enforces our print-safe look
  const wrapper = document.createElement("div");
  wrapper.className = "__inv-root __no-anim";
  wrapper.style.background = "#ffffff";
  wrapper.style.padding = "24px";
  wrapper.style.width = `${node.clientWidth || 900}px`;
  wrapper.appendChild(clone);

  // 3) Off-screen sandbox
  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-100000px";
  sandbox.style.top = "0";
  sandbox.appendChild(wrapper);

  // 4) Inject style tag (scoped to clone tree)
  const style = document.createElement("style");
  style.type = "text/css";
  style.appendChild(document.createTextNode(PRINT_SAFE_CSS));
  wrapper.prepend(style);

  document.body.appendChild(sandbox);

  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: "#ffffff",
      scale,
      useCORS: true,
      imageTimeout: 0,
      logging: false,
    });

    const img = canvas.toDataURL("image/png");

    if (a4) {
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      const x = (pageW - w) / 2;
      const y = margin;
      pdf.addImage(img, "PNG", x, y, w, h, undefined, "FAST");
      pdf.save(fileName);
    } else {
      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? "l" : "p",
        unit: "px",
        format: [canvas.width + margin * 2, canvas.height + margin * 2],
      });
      pdf.addImage(img, "PNG", margin, margin, canvas.width, canvas.height, undefined, "FAST");
      pdf.save(fileName);
    }
  } finally {
    document.body.removeChild(sandbox);
  }
}
