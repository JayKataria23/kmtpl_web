import { useState } from "react";
import * as XLSX from "xlsx";

interface UploadRow {
  date: string;
  particulars: string;
  buyer: string;
  consignee: string;
  orderNo?: string;
  paymentTerms?: string;
  otherReferences?: string;
  deliveryTerms?: string;
  grossTotal?: number;
  salesGst?: number;
  igst?: number;
  roundOff?: number;
  cgst?: number;
  sgst?: number;
}

interface ChallanDoc {
  id: string;
  buyer: string;
  consignee: string;
  date: string;
  particulars: string;
  orderNo?: string;
  paymentTerms?: string;
  otherReferences?: string;
  deliveryTerms?: string;
  grossTotal?: number;
  salesGst?: number;
  igst?: number;
  roundOff?: number;
  cgst?: number;
  sgst?: number;
}

function toIsoDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    try {
      const o = (XLSX.SSF as any).parse_date_code(value);
      if (!o) return null;
      const y = String(o.y).padStart(4, "0");
      const m = String(o.m).padStart(2, "0");
      const d = String(o.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    } catch {
      return null;
    }
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(s)) {
      const [d, m, y] = s.split(/[\/-]/);
      const year = y.length === 2 ? Number(y) + 2000 : Number(y);
      return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      return s.replace(/-(\d)(?!\d)/g, "-0$1");
    }
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  return null;
}

function safeString(value: unknown): string {
  if (value == null || value === "") return "";
  return String(value).trim();
}

function safeNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

function ChallanPrint({ doc }: { doc: ChallanDoc }) {
  return (
    <div
      className="border border-black p-2 text-xs bg-white"
      style={{ fontFamily: 'serif', margin: 0, width: '12.5cm', height: '17cm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <div>
        <div className="text-center font-bold text-base leading-tight">K. M. TEXTILES PVT. LTD.</div>
        <div className="text-center text-[10px] font-semibold">Manufacturers of : GARMENT FANCY SHIRTING</div>
        <div className="text-center text-[9px] leading-tight">
          Sales off.: 47, Shanti Bhavan, 1st Floor, Room No. 1 to 4, Old Hanuman Lane,<br />
          Kalbadevi Road, Mumbai - 400 002. Tel.: 4022 6557 / 4011 6437<br />
          Packing : Gala No. 105, 1st Flr., K-bldg., Dharam Complex, Anjur Mankoli Rd.,<br />
          Rnhal, Bhiwandi. Mob.: 07738360227 / 08098775356
        </div>
        <div className="flex justify-between mt-1">
          <div className="text-[10px]">GST NO. : 27AAECK5443J1ZC</div>
          <div className="text-[10px]">Mob.: 09320002021</div>
        </div>
        <div className="text-center text-[10px] font-semibold mt-1 underline">TRANSPORT CHALLAN</div>
      </div>
      <div className="border border-black mt-2 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-1">
            <div className="flex justify-between">
              <span>Bale No. :</span>
              <span className="font-bold">{doc.id.split('_')[1] || ''}</span>
            </div>
          </div>
          <div className="p-1">
            <div className="flex justify-between">
              <span>Date :</span>
              <span className="font-bold">{doc.date ? new Date(doc.date).toLocaleDateString('en-GB') : ''}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-1">
            <div className="flex justify-between">
              <span>Total Mtr. :</span>
              <span className="font-bold"> </span>
            </div>
          </div>
          <div className="p-1">
            <div className="flex justify-between">
              <span>Total Bale :</span>
              <span className="font-bold">{doc.otherReferences || ''}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-1">
            <div className="flex justify-between">
              <span>Total Value :</span>
              <span className="font-bold">{doc.grossTotal ? `₹${doc.grossTotal.toLocaleString()}` : ''}</span>
            </div>
          </div>
          <div className="p-1">
            <div className="flex justify-between">
              <span>With Tax :</span>
              <span className="font-bold"> </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-1">
            <div className="flex justify-between">
              <span>Transport :</span>
              <span className="font-bold">{doc.deliveryTerms || ''}</span>
            </div>
          </div>
          <div className="p-1">
            <div className="flex justify-between">
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
        <div className="border-b border-black p-1" style={{ minHeight: '60px' }}>
          <div className="flex">
            <span className="w-12">To,</span>
            <span className="flex-1 font-bold">{doc.consignee}</span>
          </div>
        </div>
        <div className="border-b border-black p-1" style={{ minHeight: '60px' }}>
        </div>
        <div className="flex justify-between p-1">
          <div className="text-[10px]">G.S.T. No. :</div>
          <div className="text-[10px]">BOOKING :</div>
        </div>
      </div>
    </div>
  );
}

export default function TransportChallanUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<ChallanDoc[]>([]);
  const [message, setMessage] = useState("");

  const parseExcel = async () => {
    if (!file) {
      setMessage("Please select an Excel file");
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { 
        defval: "", 
        raw: true,
        header: 1
      });
      if (!json.length) {
        setMessage("No data found in the Excel file");
        return;
      }
      if (json.length <= 7) {
        setMessage("Excel file doesn't have enough rows. Expected at least 8 rows (7 company details + header row)");
        return;
      }
      const headerRowIndex = 7;
      const headers = json[headerRowIndex] as string[];
      const dataRows = json.slice(headerRowIndex + 1);
      const columnMap: Record<string, number> = {};
      headers.forEach((header, index) => {
        const h = String(header).trim();
        switch (h) {
          case 'Date': columnMap.date = index; break;
          case 'Particulars': columnMap.particulars = index; break;
          case 'Buyer': columnMap.buyer = index; break;
          case 'Consignee': columnMap.consignee = index; break;
          case 'Order No. & Date': columnMap.orderNo = index; break;
          case 'Terms of Payment': columnMap.paymentTerms = index; break;
          case 'Other References': columnMap.otherReferences = index; break;
          case 'Terms of Delivery': columnMap.deliveryTerms = index; break;
          case 'Gross Total': columnMap.grossTotal = index; break;
          case 'SALES GST': columnMap.salesGst = index; break;
          case 'IGST': columnMap.igst = index; break;
          case 'Round Off': columnMap.roundOff = index; break;
          case 'CGST': columnMap.cgst = index; break;
          case 'SGST': columnMap.sgst = index; break;
        }
      });
      const mapped: UploadRow[] = dataRows
        .filter(row => Array.isArray(row) && row.length > 0)
        .map((row) => ({
          date: toIsoDate(columnMap.date !== undefined ? row[columnMap.date] : null) || new Date().toISOString().slice(0, 10),
          particulars: safeString(columnMap.particulars !== undefined ? row[columnMap.particulars] : ""),
          buyer: safeString(columnMap.buyer !== undefined ? row[columnMap.buyer] : ""),
          consignee: safeString(columnMap.consignee !== undefined ? row[columnMap.consignee] : ""),
          orderNo: safeString(columnMap.orderNo !== undefined ? row[columnMap.orderNo] : "") || undefined,
          paymentTerms: safeString(columnMap.paymentTerms !== undefined ? row[columnMap.paymentTerms] : "") || undefined,
          otherReferences: safeString(columnMap.otherReferences !== undefined ? row[columnMap.otherReferences] : "") || undefined,
          deliveryTerms: safeString(columnMap.deliveryTerms !== undefined ? row[columnMap.deliveryTerms] : "") || undefined,
          grossTotal: safeNumber(columnMap.grossTotal !== undefined ? row[columnMap.grossTotal] : null),
          salesGst: safeNumber(columnMap.salesGst !== undefined ? row[columnMap.salesGst] : null),
          igst: safeNumber(columnMap.igst !== undefined ? row[columnMap.igst] : null),
          roundOff: safeNumber(columnMap.roundOff !== undefined ? row[columnMap.roundOff] : null),
          cgst: safeNumber(columnMap.cgst !== undefined ? row[columnMap.cgst] : null),
          sgst: safeNumber(columnMap.sgst !== undefined ? row[columnMap.sgst] : null),
        }));
      const docsNow: ChallanDoc[] = mapped
        .filter((r) => r.buyer || r.consignee)
        .map((r, i) => ({
          id: `${Date.now()}_${i}`,
          buyer: r.buyer,
          consignee: r.consignee || r.buyer,
          date: r.date,
          particulars: r.particulars,
          orderNo: r.orderNo,
          paymentTerms: r.paymentTerms,
          otherReferences: r.otherReferences,
          deliveryTerms: r.deliveryTerms,
          grossTotal: r.grossTotal,
          salesGst: r.salesGst,
          igst: r.igst,
          roundOff: r.roundOff,
          cgst: r.cgst,
          sgst: r.sgst,
        }));
      setDocs(docsNow);
      setMessage(`Successfully parsed ${docsNow.length} challans from Excel file`);
    } catch (e: any) {
      setMessage(`Failed to parse Excel file: ${e?.message || "Invalid file format"}`);
    }
  };

  // For print: each page = 2 copies of the same challan, one per page
  const printGrid = (
    <div id="challan-print-root">
      {docs.map((doc, idx) => (
        <div
          key={doc.id}
          className="flex flex-row justify-center items-start gap-0 mb-8 print:mb-0 print:break-inside-avoid print:page-break-after-always"
          style={{
            pageBreakAfter: idx < docs.length - 1 ? 'always' : 'auto',
            borderBottom: idx < docs.length - 1 ? '2px dashed #000' : undefined,
            marginBottom: idx < docs.length - 1 ? '0.5cm' : 0,
            paddingBottom: idx < docs.length - 1 ? '0.5cm' : 0,
            position: 'relative',
            minHeight: '18.5cm',
          }}
        >
          <div style={{ width: '13.5cm', height: '18cm', marginRight: '0.5cm', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChallanPrint doc={doc} />
          </div>
          <div style={{ width: '0.1cm', background: '#000', height: '100%', alignSelf: 'stretch', margin: '0 0.1cm' }} />
          <div style={{ width: '13.5cm', height: '18cm', marginLeft: '0.5cm', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChallanPrint doc={doc} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto mt-10 p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Transport Challan Generator</h1>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="file" className="text-sm font-medium">
              Upload Sales Register Excel File
            </label>
            <input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block border rounded px-2 py-1"
            />
            <div className="text-xs text-gray-500 mt-1">
              Supports Excel files with: 7 rows of company details followed by columns - Date, Particulars, Buyer, Consignee, Order No. & Date, Terms of Payment, Other References, Terms of Delivery, Gross Total, SALES GST, IGST, Round Off, CGST, SGST
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={parseExcel}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Parse Excel & Generate Challans
            </button>
            {docs.length > 0 && (
              <button
                onClick={() => setTimeout(() => window.print(), 100)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Print All Challans (2 copies each)
              </button>
            )}
          </div>
          {message && (
            <div className={`p-3 rounded text-sm ${
              message.includes('Successfully')
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
      {/* Always show preview grid below upload */}
      <div className="overflow-auto bg-gray-50 p-4 rounded-lg border min-h-[200px] max-h-[80vh]">
        {docs.length > 0 ? printGrid : <div className="text-gray-400 text-center">No challans to preview.</div>}
      </div>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #challan-print-root, #challan-print-root * { visibility: visible !important; }
          #challan-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            background: white !important;
            z-index: 9999 !important;
          }
          .container, .bg-white, .rounded-lg, .shadow-md, .p-4, .max-w-6xl, .overflow-auto, .min-h-[200px], .max-h-[80vh] {
            all: unset !important;
            display: contents !important;
          }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
