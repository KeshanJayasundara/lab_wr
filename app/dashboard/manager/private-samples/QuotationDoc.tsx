"use client";

/**
 * A4 quotation document (NWSDB – Water Reclamation Section format).
 * Inline styles + plain hex colours only, so html2canvas (PDF) renders it exactly like the preview.
 * The Senior Chemist name / designation is NOT printed: that space is left empty for the office seal.
 */

import { formatChem } from "@/lib/chemFormat";
import React, { forwardRef } from "react";
import { QUOTATION as Q } from "@/lib/quotationConfig";

export type QuotationData = {
  customer: { name: string; address: string; phone: string };
  date: string; // yyyy-mm-dd
  categoryName: string;
  samples: number;
  lines: { name: string; cost: number }[]; // cost already multiplied by the number of samples
  sscl: number;
  vat: number;
  vatRate: number;
  subtotal: number;
  total: number;
};

export const A4_W = 794; // px @96dpi
export const A4_H = 1123;

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SI = '"Noto Sans Sinhala","Iskoola Pota","Nirmala UI",serif';

const cell: React.CSSProperties = { border: "1px solid #000", padding: "6px 10px", verticalAlign: "top" };

const QuotationDoc = forwardRef<HTMLDivElement, { data: QuotationData }>(function QuotationDoc({ data }, ref) {
  const d = data;
  const n = d.lines.length;
  const dateText = d.date ? d.date.replace(/-/g, ".") : "";
  const year = d.date ? d.date.slice(0, 4) : "";
  const addressLines = d.customer.address.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  return (
    <div
      ref={ref}
      style={{
        width: A4_W,
        minHeight: A4_H,
        boxSizing: "border-box",
        padding: "40px 56px 28px",
        background: "#ffffff",
        color: "#000000",
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: 15,
        lineHeight: 1.4,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* letterhead */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ width: 90 }} />
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontFamily: SI, fontWeight: 700, fontSize: 17 }}>{Q.boardSi}</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{Q.board}</div>
          <div style={{ fontFamily: SI, fontWeight: 700, fontSize: 17 }}>{Q.sectionSi}</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>{Q.section}</div>
        </div>
        <img src="/logo.png" alt="" width={90} height={90} style={{ objectFit: "contain" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginTop: 14, fontSize: 12.5 }}>
        <div style={{ flex: 1.2 }}>
          <div><span style={{ fontFamily: SI }}>දුරකථන</span> Telephone: {Q.telephone}</div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontFamily: SI }}>කළමනාකරු (ජල පිළිසැකසුම්)</span> Manager (Water Reclamation): {Q.managerPhone}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div><span style={{ fontFamily: SI }}>ෆැක්ස්</span> Fax: {Q.fax}</div>
          <div style={{ marginTop: 4 }}><span style={{ fontFamily: SI }}>ඊ-මේල්</span> E-mail: {Q.email}</div>
        </div>
        <div style={{ flex: 0.8 }}>
          {Q.addressLines.map((l) => <div key={l}>{l}</div>)}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 14 }}>
        <div>
          <span style={{ fontFamily: SI }}>මගේ අංකය</span> Our ref:{" "}
          <b>{Q.refPrefix}{year}-………………………</b>
        </div>
        <div>
          <span style={{ fontFamily: SI }}>දිනය</span> Date: <b>{dateText}</b>
        </div>
      </div>

      {/* addressee */}
      <div style={{ marginTop: 22, fontWeight: 700 }}>
        <div>{d.customer.name}</div>
        {addressLines.map((l, i) => <div key={i}>{l}</div>)}
        {d.customer.phone && <div style={{ fontWeight: 400 }}>Tel: {d.customer.phone}</div>}
      </div>

      <div style={{ marginTop: 24, fontWeight: 700, textDecoration: "underline" }}>
        Quotation for {d.categoryName} Quality Testing
      </div>
      <p style={{ margin: "10px 0 12px" }}>{Q.intro}</p>

      {/* charges table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
        <thead>
          <tr>
            <th colSpan={2} style={{ ...cell, fontWeight: 400, textAlign: "center", height: 44 }}>Description</th>
            <th style={{ ...cell, fontWeight: 400, textAlign: "left", width: 90 }}>No of samples</th>
            <th style={{ ...cell, fontWeight: 400, textAlign: "center", width: 140 }}>cost/Rs</th>
          </tr>
        </thead>
        <tbody>
          {d.lines.map((l, i) => (
            <tr key={i}>
              {i === 0 && (
                <td rowSpan={n} style={{ ...cell, width: 150, fontWeight: 700 }}>
                  Analysis fee for {d.categoryName} sample
                </td>
              )}
              <td style={{ ...cell, borderTop: i === 0 ? "1px solid #000" : "none", borderBottom: "none" }}>{formatChem(l.name)}</td>
              {i === 0 && (
                <td rowSpan={n + 4} style={{ ...cell, textAlign: "center" }}>
                  {String(d.samples).padStart(2, "0")}
                </td>
              )}
              <td style={{ ...cell, textAlign: "right", borderTop: i === 0 ? "1px solid #000" : "none", borderBottom: "none" }}>
                {money(l.cost)}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ ...cell, fontStyle: "italic", borderTop: "1px solid #000" }}>Sub Total</td>
            <td style={{ ...cell, textAlign: "right" }}>{money(d.subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={2} style={cell}>SSCL</td>
            <td style={{ ...cell, textAlign: "right" }}>{money(d.sscl)}</td>
          </tr>
          <tr>
            <td colSpan={2} style={cell}>{d.vatRate}% VAT</td>
            <td style={{ ...cell, textAlign: "right" }}>{money(d.vat)}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...cell, fontWeight: 700 }}>Total</td>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{money(d.total)}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ margin: "10px 0 0" }}>{Q.payNote}</p>

      {/* signature + empty space for the office seal */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 36 }}>
        <div style={{ fontWeight: 700 }}>
          <div style={{ borderTop: "1px dotted #000", width: 260, marginBottom: 4 }} />
          {Q.signTitle}
        </div>
        <div style={{ width: 300, height: 96 }} />
      </div>

      {/* footer */}
      <div style={{ marginTop: "auto", paddingTop: 28 }}>
        <div style={{ borderTop: "2px solid #000", paddingTop: 6, textAlign: "center", fontSize: 11 }}>
          <div>{Q.footerMinistry}</div>
          <div style={{ fontStyle: "italic", fontWeight: 700, fontSize: 12 }}>{Q.footerMotto}</div>
        </div>
      </div>
    </div>
  );
});

export default QuotationDoc;