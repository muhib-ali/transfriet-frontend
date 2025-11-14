// src/app/dashboard/invoices/[id]/preview/page.tsx
"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { exportNodeToPdfNoGlobals } from "@/lib/pdf-export";

export default function InvoicePreview() {
  const ref = React.useRef<HTMLDivElement>(null);
  const sp = useSearchParams();

  async function handleDownload() {
    if (!ref.current) return;
    await exportNodeToPdfNoGlobals(ref.current, {
      fileName: "invoice-2025-005.pdf",
      margin: 24,
      scale: 2.5,
      a4: true,
    });
  }

  // Auto-download if ?download=1
  React.useEffect(() => {
    if (sp.get("download") === "1") {
      // thoda delay taake data/render complete ho
      setTimeout(() => handleDownload(), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleDownload} className="px-3 py-2 rounded bg-[#6d28d9] text-white">
          Download PDF
        </button>
      </div>

      {/* 👇 Yehi area PDF me jayega */}
      <div ref={ref}>
        {/* Header */}
        <div className="__section" style={{ marginBottom: 24 }}>
          <div className="__inv-head">Invoice</div>
          <div className="__meta" style={{ marginTop: 8 }}>
            <div>Created: 11/21/2025</div>
            <div>Valid Until: 11/28/2025</div>
            <div>Number: INV-2025-005</div>
          </div>
        </div>

        {/* Meta grid */}
        <div className="__grid __section">
          <div>
            <div style={{ fontWeight: 600 }}>Shipper</div>
            <div>BBBBB</div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Consignee</div>
            <div>aarscol</div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Destination</div>
            <div>Jebel Ali</div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Waybill / Ref</div>
            <div>12</div>
          </div>
        </div>

        {/* Items table */}
        <div className="__section">
          <table className="__table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Item</th>
                <th className="__t-center" style={{ width: 80 }}>Qty</th>
                <th className="__t-right" style={{ width: 120 }}>Price</th>
                <th className="__t-right" style={{ width: 120 }}>Tax</th>
                <th className="__t-right" style={{ width: 140 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* yahan map(items) karo */}
              <tr>
                <td>Protein<br/><span className="__meta">Protein shake</span></td>
                <td className="__t-center">1</td>
                <td className="__t-right">$5.00</td>
                <td className="__t-right">$0.50</td>
                <td className="__t-right">$5.50</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="__section __totals">
          <div className="__row">
            <span className="__meta">Sub Total</span>
            <span style={{ fontWeight: 600 }}>$5.00</span>
          </div>
          <div className="__row">
            <span className="__meta">Tax 10%</span>
            <span style={{ fontWeight: 600 }}>$0.50</span>
          </div>
          <div className="__row __total">
            <span>Total</span>
            <span style={{ color: "#6d28d9", fontSize: 18 }}>$5.50</span>
          </div>
        </div>
      </div>
    </div>
  );
}
