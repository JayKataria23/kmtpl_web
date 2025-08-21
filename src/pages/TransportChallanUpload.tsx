import { useState, useMemo } from "react";
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";
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
		// Handle DD/MM/YYYY or DD-MM-YYYY format
		if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(s)) {
			const [d, m, y] = s.split(/[\/-]/);
			const year = y.length === 2 ? Number(y) + 2000 : Number(y);
			return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		}
		// Handle YYYY-MM-DD format
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

export default function TransportChallanUpload() {
	const [file, setFile] = useState<File | null>(null);
	const [docs, setDocs] = useState<ChallanDoc[]>([]);
	const [showPreview, setShowPreview] = useState(false);
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

			// Skip first 7 rows (company details) and use row 7 (index 7) as headers
			if (json.length <= 7) {
				setMessage("Excel file doesn't have enough rows. Expected at least 8 rows (7 company details + header row)");
				return;
			}

			const headerRowIndex = 7; // Row 8 (0-indexed as 7)
			const headers = json[headerRowIndex] as string[];
			const dataRows = json.slice(headerRowIndex + 1);

			// Create column mapping based on exact column names
			const columnMap: Record<string, number> = {};
			headers.forEach((header, index) => {
				const h = String(header).trim();
				switch (h) {
					case 'Date':
						columnMap.date = index;
						break;
					case 'Particulars':
						columnMap.particulars = index;
						break;
					case 'Buyer':
						columnMap.buyer = index;
						break;
					case 'Consignee':
						columnMap.consignee = index;
						break;
					case 'Order No. & Date':
						columnMap.orderNo = index;
						break;
					case 'Terms of Payment':
						columnMap.paymentTerms = index;
						break;
					case 'Other References':
						columnMap.otherReferences = index;
						break;
					case 'Terms of Delivery':
						columnMap.deliveryTerms = index;
						break;
					case 'Gross Total':
						columnMap.grossTotal = index;
						break;
					case 'SALES GST':
						columnMap.salesGst = index;
						break;
					case 'IGST':
						columnMap.igst = index;
						break;
					case 'Round Off':
						columnMap.roundOff = index;
						break;
					case 'CGST':
						columnMap.cgst = index;
						break;
					case 'SGST':
						columnMap.sgst = index;
						break;
				}
			});

			const mapped: UploadRow[] = dataRows
				.filter(row => Array.isArray(row) && row.length > 0)
				.map((row) => ({
					date: toIsoDate(columnMap.date !== undefined ? row[columnMap.date] : null) || 
						  new Date().toISOString().slice(0, 10),
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
			setShowPreview(true);
			setMessage(`Successfully parsed ${docsNow.length} challans from Excel file`);
		} catch (e: any) {
			setMessage(`Failed to parse Excel file: ${e?.message || "Invalid file format"}`);
		}
	};

	const printAll = () => {
		setTimeout(() => window.print(), 100);
	};

	const preview = useMemo(() => (
		<div className="space-y-6">
			{docs.map((d) => (
				<div key={d.id} className="bg-white p-4 shadow print:shadow-none print:p-0 border print:border-black">
					<div className="border border-gray-400 p-4">
						{/* Header */}
						<div className="flex justify-between items-start mb-4">
							<div>
								<div className="text-xl font-bold">K. M. TEXTILES PVT. LTD.</div>
								<div className="text-sm text-gray-600 mt-1">
									Plot No. 505, 1st Floor-A, Riddhi Corporate,
								</div>
								<div className="text-sm text-gray-600">
									Aarey Road, Behind Bharatiyamata Hospital, Goregaon (E), Mumbai-400063
								</div>
								<div className="text-sm text-gray-600">
									GST No.: 27AABCK7906B1ZG | Email: kmtextiles.mfg@gmail.com
								</div>
							</div>
							<div className="text-right">
								<div className="text-lg font-semibold">DELIVERY CHALLAN</div>
								<div className="text-sm mt-1">Date: {new Date(d.date).toLocaleDateString("en-GB")}</div>
							</div>
						</div>

						{/* Party Details */}
						<div className="grid grid-cols-2 gap-6 mb-4">
							<div>
								<div className="font-semibold text-sm mb-1">TO:</div>
								<div className="font-bold text-lg">{d.consignee || d.buyer}</div>
								{d.buyer !== d.consignee && d.buyer && (
									<div className="text-sm mt-1">Buyer: {d.buyer}</div>
								)}
							</div>
							<div>
								<div className="font-semibold text-sm mb-1">TRANSPORT:</div>
								<div className="font-bold">{d.deliveryTerms || "By Road"}</div>
								{d.orderNo && (
									<div className="text-sm mt-1">Order No.: {d.orderNo}</div>
								)}
							</div>
						</div>

						{/* Details Table */}
						<div className="border border-gray-400 mb-4">
							<div className="bg-gray-100 px-3 py-2 border-b border-gray-400">
								<div className="grid grid-cols-5 gap-2 text-sm font-semibold">
									<div>Particulars</div>
									<div>Gross Total</div>
									<div>CGST</div>
									<div>SGST</div>
									<div>IGST</div>
								</div>
							</div>
							<div className="px-3 py-4">
								<div className="grid grid-cols-5 gap-2 text-sm">
									<div className="font-semibold">{d.particulars || "-"}</div>
									<div className="font-semibold">{d.grossTotal ? `₹${d.grossTotal.toLocaleString()}` : "-"}</div>
									<div className="font-semibold">{d.cgst ? `₹${d.cgst.toLocaleString()}` : "-"}</div>
									<div className="font-semibold">{d.sgst ? `₹${d.sgst.toLocaleString()}` : "-"}</div>
									<div className="font-semibold">{d.igst ? `₹${d.igst.toLocaleString()}` : "-"}</div>
								</div>
							</div>
						</div>

						{/* Additional Details */}
						{(d.paymentTerms || d.otherReferences) && (
							<div className="mb-4 text-sm">
								{d.paymentTerms && (
									<div><span className="font-semibold">Payment Terms:</span> {d.paymentTerms}</div>
								)}
								{d.otherReferences && (
									<div><span className="font-semibold">Other References:</span> {d.otherReferences}</div>
								)}
							</div>
						)}

						{/* Description Area */}
						<div className="mb-4">
							<div className="text-sm font-semibold mb-2">Description of Goods:</div>
							<div className="border border-dashed border-gray-400 h-20"></div>
						</div>

						{/* Footer */}
						<div className="flex justify-between items-end text-xs">
							<div>
								<div>Booking: ________________</div>
								<div className="mt-2">Driver Signature: ________________</div>
							</div>
							<div className="text-right">
								<div>For K. M. TEXTILES PVT. LTD.</div>
								<div className="mt-8">Authorized Signatory</div>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	), [docs]);

	return (
		<div className="container mx-auto mt-10 p-4 max-w-4xl">
			<h1 className="text-3xl font-bold mb-6">Transport Challan Generator</h1>
			
			<div className="bg-white p-6 rounded-lg shadow-md mb-6">
				<div className="space-y-4">
					<div>
						<Label htmlFor="file" className="text-sm font-medium">
							Upload Sales Register Excel File
						</Label>
						<Input 
							id="file" 
							type="file" 
							accept=".xlsx,.xls" 
							onChange={(e) => setFile(e.target.files?.[0] || null)}
							className="mt-1"
						/>
						<div className="text-xs text-gray-500 mt-1">
							Supports Excel files with: 7 rows of company details followed by columns - Date, Particulars, Buyer, Consignee, Order No. & Date, Terms of Payment, Other References, Terms of Delivery, Gross Total, SALES GST, IGST, Round Off, CGST, SGST
						</div>
					</div>
					
					<div className="flex gap-3">
						<Button onClick={parseExcel} className="bg-blue-600 hover:bg-blue-700">
							Parse Excel & Generate Challans
						</Button>
						{docs.length > 0 && (
							<>
								<Button 
									onClick={() => setShowPreview(true)} 
									variant="outline"
								>
									Preview ({docs.length})
								</Button>
								<Button 
									onClick={printAll} 
									className="bg-green-600 hover:bg-green-700"
								>
									Print All
								</Button>
							</>
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

			<Dialog open={showPreview} onOpenChange={setShowPreview}>
				<DialogContent className="max-w-6xl w-full h-[90vh]">
					<DialogHeader>
						<DialogTitle className="text-lg">
							Preview Delivery Challans ({docs.length} documents)
						</DialogTitle>
					</DialogHeader>
					<div className="flex-1 overflow-auto p-4 bg-gray-50 print:bg-white">
						{preview}
					</div>
				</DialogContent>
			</Dialog>

			{/* Print Styles */}
			<style>{`
				@media print {
					body * { visibility: hidden; }
					.print\\:shadow-none, .print\\:shadow-none * { visibility: visible; }
					.print\\:shadow-none { 
						position: absolute;
						left: 0;
						top: 0;
						width: 100%;
					}
					.print\\:border-black { border-color: black !important; }
					.print\\:bg-white { background: white !important; }
					.print\\:p-0 { padding: 0 !important; }
				}
			`}</style>
		</div>
	);
																				 }
