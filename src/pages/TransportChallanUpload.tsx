import { useState, useMemo } from "react";
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, Toaster } from "@/components/ui";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface UploadRow {
	date: string;
	buyer: string;
	consignee: string;
	baleNo?: string;
	totalBale?: number;
	totalMeter?: number;
	transport?: string;
	gstNo?: string;
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
}

function toIsoDate(value: unknown): string | null {
	if (value == null || value === "") return null;
	if (typeof value === "number") {
		const o = (XLSX.SSF as any).parse_date_code(value);
		if (!o) return null;
		const y = String(o.y).padStart(4, "0");
		const m = String(o.m).padStart(2, "0");
		const d = String(o.d).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	if (typeof value === "string") {
		const s = value.trim();
		if (!s) return null;
		if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(s)) {
			const [a, b, c] = s.split(/[\/-]/);
			const d = Number(a);
			const m = Number(b);
			const y = c.length === 2 ? Number(c) + 2000 : Number(c);
			return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		}
		if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return s.replace(/-(\d)(?!\d)/g, "-0$1");
	}
	if (value instanceof Date && !isNaN(value.getTime())) {
		return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
	}
	return null;
}

export default function TransportChallanUpload() {
	const { toast } = useToast();
	const [file, setFile] = useState<File | null>(null);
	const [docs, setDocs] = useState<ChallanDoc[]>([]);
	const [showPreview, setShowPreview] = useState(false);

	const parseExcel = async () => {
		if (!file) {
			toast({ title: "No file", description: "Please select an Excel file" });
			return;
		}
		try {
			const buf = await file.arrayBuffer();
			const wb = XLSX.read(buf, { type: "array" });
			const sheet = wb.Sheets[wb.SheetNames[0]];
			const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
			if (!json.length) {
				toast({ title: "Empty sheet", description: "No rows found" });
				return;
			}
			const mapped: UploadRow[] = json.map((r) => ({
				date: toIsoDate(r["Date"] ?? r["DATE"] ?? r["Invoice Date"]) || new Date().toISOString().slice(0, 10),
				buyer: String(r["Buyer"] ?? r["Bill To"] ?? r["Party"] ?? "").toString().trim(),
				consignee: String(r["Consignee"] ?? r["Ship To"] ?? r["To"] ?? "").toString().trim(),
				baleNo: String(r["Bale No"] ?? r["BALE NO"] ?? r["Bale"] ?? "").toString().trim() || undefined,
				totalBale: Number(r["Total Bale"] ?? r["TOT BALE"] ?? r["Bales"] ?? "") || undefined,
				totalMeter: Number(r["Total Mr."] ?? r["Total Mtr"] ?? r["Meters"] ?? "") || undefined,
				transport: String(r["Transport"] ?? r["TRANSPORT"] ?? "").toString().trim() || undefined,
				gstNo: String(r["GST No"] ?? r["GSTIN"] ?? "").toString().trim() || undefined,
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
				}));
			setDocs(docsNow);
			setShowPreview(true);
			toast({ title: "Parsed", description: `${docsNow.length} challans ready` });
		} catch (e: any) {
			toast({ title: "Failed to parse", description: e?.message || "Invalid file", variant: "destructive" });
		}
	};

	const printAll = () => {
		setTimeout(() => window.print(), 100);
	};

	const preview = useMemo(() => (
		<div className="space-y-6">
			{docs.map((d) => (
				<div key={d.id} className="bg-white p-4 shadow print:shadow-none print:p-0">
					<div className="border border-gray-400 p-3">
						<div className="flex justify-between items-start">
							<div className="text-lg font-semibold">K. M. TEXTILES PVT. LTD.</div>
							<div className="text-right text-sm">
								<div>Date: {new Date(d.date).toLocaleDateString("en-GB")}</div>
							</div>
						</div>
						<div className="mt-2 grid grid-cols-2 gap-2 text-sm">
							<div>
								<div className="font-medium">To</div>
								<div className="font-semibold">{d.consignee || ""}</div>
								{d.gstNo ? <div>G.S.T No.: {d.gstNo}</div> : null}
							</div>
							<div>
								<div className="font-medium">Transport</div>
								<div className="font-semibold">{d.transport || ""}</div>
							</div>
						</div>
						<div className="mt-3 grid grid-cols-3 gap-2 text-sm">
							<div>Bale No.: <span className="font-semibold">{d.baleNo || ""}</span></div>
							<div>Total Bale: <span className="font-semibold">{d.totalBale ?? ""}</span></div>
							<div>Total Mtr.: <span className="font-semibold">{d.totalMeter ?? ""}</span></div>
						</div>
						<div className="mt-4 h-40 border border-dashed" />
						<div className="mt-4 text-xs flex justify-between">
							<div>Booking:</div>
							<div>G.S.T No.: {d.gstNo || ""}</div>
						</div>
					</div>
				</div>
			))}
		</div>
	), [docs]);

	return (
		<div className="container mx-auto mt-10 p-4">
			<h1 className="text-2xl font-bold mb-4">Transport Challan Upload</h1>
			<div className="space-y-2 mb-4">
				<Label htmlFor="file">Upload Excel</Label>
				<Input id="file" type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
				<div className="flex gap-2">
					<Button onClick={parseExcel}>Parse</Button>
					{docs.length > 0 ? <Button onClick={() => setShowPreview(true)}>Preview</Button> : null}
					{docs.length > 0 ? <Button onClick={printAll}>Print</Button> : null}
				</div>
			</div>

			<Dialog open={showPreview} onOpenChange={setShowPreview}>
				<DialogContent className="max-w-5xl w-full">
					<DialogHeader>
						<DialogTitle>Preview ({docs.length})</DialogTitle>
					</DialogHeader>
					<div className="max-h-[70vh] overflow-auto p-2 bg-gray-100 print:bg-white">
						{preview}
					</div>
				</DialogContent>
			</Dialog>
			<Toaster />
		</div>
	);
}