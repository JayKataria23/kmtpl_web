import { useState } from "react";
import * as XLSX from "xlsx";

export default function TransportChallanUpload() {
	const [file, setFile] = useState(null);
	const [challans, setChallans] = useState([]);
	const [message, setMessage] = useState("");

	const handleFileUpload = async () => {
		if (!file) {
			setMessage("Please select a file");
			return;
		}

		try {
			const data = await file.arrayBuffer();
			const workbook = XLSX.read(data);
			const sheet = workbook.Sheets[workbook.SheetNames[0]];
			const rows = XLSX.utils.sheet_to_json(sheet);

			const challanData = rows.map((row, index) => ({
				id: index,
				date: new Date().toLocaleDateString(),
				party: row.Party || row.Buyer || "",
				consignee: row.Consignee || row.Party || row.Buyer || "",
				bales: row["Total Bale"] || row.Bales || "",
				meters: row["Total Mtr"] || row.Meters || "",
				transport: row.Transport || "",
			}));

			setChallans(challanData.filter(c => c.party));
			setMessage(`${challanData.length} challans created`);
		} catch (error) {
			setMessage("Error reading file");
		}
	};

	const printChallans = () => {
		window.print();
	};

	return (
		<div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
			<h1>Transport Challan Generator</h1>
			
			<div style={{ marginBottom: "20px" }}>
				<input 
					type="file" 
					accept=".xlsx,.xls"
					onChange={(e) => setFile(e.target.files[0])}
				/>
				<button onClick={handleFileUpload} style={{ marginLeft: "10px" }}>
					Upload & Parse
				</button>
				{challans.length > 0 && (
					<button onClick={printChallans} style={{ marginLeft: "10px" }}>
						Print All
					</button>
				)}
			</div>

			{message && <p>{message}</p>}

			<div className="challans-container">
				{challans.map((challan) => (
					<div key={challan.id} className="challan" style={{
						border: "2px solid black",
						padding: "20px",
						marginBottom: "30px",
						backgroundColor: "white",
						pageBreakAfter: "always"
					}}>
						<div style={{ textAlign: "center", marginBottom: "20px" }}>
							<h2>K. M. TEXTILES PVT. LTD.</h2>
							<p>Plot No. 505, 1st Floor-A, Riddhi Corporate</p>
							<p>Aarey Road, Behind Bharatiyamata Hospital, Goregaon (E), Mumbai-400063</p>
						</div>

						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
							<div>
								<h3>DELIVERY CHALLAN</h3>
							</div>
							<div>
								<p><strong>Date:</strong> {challan.date}</p>
							</div>
						</div>

						<div style={{ marginBottom: "20px" }}>
							<p><strong>To:</strong></p>
							<p style={{ fontSize: "18px", fontWeight: "bold" }}>{challan.consignee}</p>
						</div>

						<div style={{ marginBottom: "20px" }}>
							<p><strong>Transport:</strong> {challan.transport}</p>
						</div>

						<table style={{ width: "100%", border: "1px solid black", marginBottom: "20px" }}>
							<tr style={{ backgroundColor: "#f0f0f0" }}>
								<th style={{ border: "1px solid black", padding: "10px" }}>Total Bales</th>
								<th style={{ border: "1px solid black", padding: "10px" }}>Total Meters</th>
							</tr>
							<tr>
								<td style={{ border: "1px solid black", padding: "10px", textAlign: "center" }}>
									{challan.bales}
								</td>
								<td style={{ border: "1px solid black", padding: "10px", textAlign: "center" }}>
									{challan.meters}
								</td>
							</tr>
						</table>

						<div style={{ marginBottom: "40px" }}>
							<p><strong>Description:</strong></p>
							<div style={{ border: "1px dashed black", height: "60px", marginTop: "10px" }}></div>
						</div>

						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<div>
								<p>Driver Signature: _______________</p>
							</div>
							<div>
								<p>For K. M. TEXTILES PVT. LTD.</p>
								<br />
								<p>Authorized Signatory</p>
							</div>
						</div>
					</div>
				))}
			</div>

			<style>{`
				@media print {
					body * { visibility: hidden; }
					.challans-container, .challans-container * { visibility: visible; }
					.challan { page-break-after: always; }
				}
			`}</style>
		</div>
	);
}
