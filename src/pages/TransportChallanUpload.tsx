import { useState, useMemo } from "react";
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";
import * as XLSX from "xlsx";

interface UploadRow {
	date: string;
	buyer: string;
	consignee: string;
	baleNo?: string;
	totalBale?: number;
	totalMeter?: number;
	transport?: string;
	gstNo?: string;
	amount?: number;
	rate?: number;
}

interface ChallanDoc {
	id: string;
	buyer: string;
	consignee: string;
	date: string;
	baleNo?: string;
	totalBale?: number;
	totalMeter?: number;
	transport?: string;
	gstNo?: string;
	amount?: number;
	rate?: number;
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

			// Find header row (usually the first row with meaningful data)
			let headerRowIndex = 0;
			for (let i = 0; i < Math.min(5, json.length); i++) {
				const row = json[i];
				if (Array.isArray(row) && row.some(cell => 
					String(cell).toLowerCase().includes('date') || 
					String(cell).toLowerCase().includes('party') ||
					String(cell).toLowerCase().includes('consignee')
				)) {
					headerRowIndex = i;
					break;
				}
			}

			const headers = json[headerRowIndex] as string[];
			const dataRows = json.slice(headerRowIndex + 1);

			// Create column mapping
			const columnMap: Record<string, number> = {};
			headers.forEach((header, index) => {
				const h = String(header).toLowerCase().trim();
				if (h.includes('date')) columnMap.date = index;
				else if (h.includes('party') || h.includes('buyer') || h.includes('bill to')) columnMap.buyer = index;
				else if (h.includes('consignee') || h.includes('ship to') || h.includes('to')) columnMap.consignee = index;
				else if (h.includes('bale no') || h.includes('bale')) columnMap.baleNo = index;
				else if (h.includes('total bale') || h.includes('tot bale') || h.includes('bales')) columnMap.totalBale = index;
				else if (h.includes('total m') || h.includes('meter') || h.includes('mtr')) columnMap.totalMeter = index;
				else if (h.includes('transport')) columnMap.transport = index;
				else if (h.includes('gst') && h.includes('no')) columnMap.gstNo = index;
				else if (h.includes('amount') || h.includes('value')) columnMap.amount = index;
				else if (h.includes('rate')) columnMap.rate = index;
			});

			const mapped: UploadRow[] = dataRows
				.filter(row => Array.isArray(row) && row.length > 0)
				.map((row) => ({
					date: toIsoDate(columnMap.date !== undefined ? row[columnMap.date] : null) || 
						  new Date().toISOString().slice(0, 10),
					buyer: safeString(columnMap.buyer !== undefined ? row[columnMap.buyer] : ""),
					consignee: safeString(columnMap.consignee !== undefined ? row[columnMap.consignee] : ""),
					baleNo: safeString(columnMap.baleNo !== undefined ? row[columnMap.baleNo] : "") || undefined,
					totalBale: safeNumber(columnMap.totalBale !== undefined ? row[columnMap.totalBale] : null),
					totalMeter: safeNumber(columnMap.totalMeter !== undefined ? row[columnMap.totalMeter] : null),
					transport: safeString(columnMap.transport !== undefined ? row[columnMap.transport] : "") || undefined,
					gstNo: safeString(columnMap.gstNo !== undefined ? row[columnMap.gstNo] : "") || undefined,
					amount: safeNumber(columnMap.amount !== undefined ? row[columnMap.amount] : null),
					rate: safeNumber(columnMap.rate !== undefined ? row[columnMap.rate] : null),
				}));

			const docsNow: ChallanDoc[] = mapped
				.filter((r) => r.buyer || r.consignee)
				.map((r, i) => ({
					id: `${Date.now()}_${i}`,
					buyer: r.buyer,
					consignee: r.consignee || r.buyer,
					date: r.date,
					baleNo: r.baleNo,
					totalBale: r.totalBale,
					totalMeter: r.totalMeter,
					transport: r.transport,
					gstNo: r.gstNo,
					amount: r.amount,
					rate: r.rate,
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
								<div className="font-semibold text-sm mb-1">CONSIGNEE:</div>
								<div className="font-bold text-lg">{d.consignee || d.buyer}</div>
								{d.gstNo && (
									<div className="text-sm mt-1">G.S.T No.: {d.gstNo}</div>
								)}
							</div>
							<div>
								<div className="font-semibold text-sm mb-1">TRANSPORT:</div>
								<div className="font-bold">{d.transport || "By Road"}</div>
							</div>
						</div>

						{/* Details Table */}
						<div className="border border-gray-400 mb-4">
							<div className="bg-gray-100 px-3 py-2 border-b border-gray-400">
								<div className="grid grid-cols-4 gap-2 text-sm font-semibold">
									<div>Bale No.</div>
									<div>Total Bales</div>
									<div>Total Meters</div>
									<div>Amount</div>
								</div>
							</div>
							<div className="px-3 py-4">
								<div className="grid grid-cols-4 gap-2 text-sm">
									<div className="font-semibold">{d.baleNo || "-"}</div>
									<div className="font-semibold">{d.totalBale || "-"}</div>
									<div className="font-semibold">{d.totalMeter || "-"}</div>
									<div className="font-semibold">{d.amount ? `₹${d.amount.toLocaleString()}` : "-"}</div>
								</div>
							</div>
						</div>

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
							Supports Excel files with columns: Date, Party/Buyer, Consignee, Bale No, Total Bales, Total Meters, etc.
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
			<style jsx>{`
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
