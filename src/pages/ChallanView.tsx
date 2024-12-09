/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share2 } from "lucide-react";
import { useParams } from "react-router-dom";
import supabase from "@/utils/supabase";

interface Challan {
  id: string;
  challan_no: number;
  date: string;
  bill_to: { name: string } | null;
  ship_to: { name: string } | null;
  broker: { name: string } | null;
  transport: { name: string } | null;
  remark: string | null;
  created_by: string;
  discount: number;
}

interface ChallanEntry {
  id: number;
  design: string;
  meters: number;
  pcs: number;
  price: number;
  challan_id: string;
}

function ChallanView() {
  const { challanId } = useParams<{ challanId: string }>();
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChallanDetails = async () => {
      try {
        if (!challanId) {
          setError("No challan ID provided");
          return;
        }

        // Fetch the challan details with related entities
        const { data: challan, error: challanError } = await supabase
          .from("challans")
          .select(
            `
            *,
            bill_to:bill_to_id (name),
            ship_to:ship_to_id (name),
            broker:broker_id (name),
            transport:transport_id (name)
          `
          )
          .eq("id", challanId)
          .single();

        if (challanError) throw challanError;

        // Fetch the challan entries
        const { data: entries, error: entriesError } = await supabase
          .from("challan_entries")
          .select("*")
          .eq("challan_id", challanId);

        if (entriesError) throw entriesError;

        // Generate HTML after fetching both challan and entries
        const html = generateChallanHTML(challan, entries);
        setGeneratedHtml(html);
      } catch (error) {
        console.error("Error fetching challan details:", error);
        setError("Failed to fetch challan details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallanDetails();
  }, []);
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const generateChallanHTML = (
    challan: Challan,
    entries: ChallanEntry[]
  ): string => {
    const extraRows = 16 - entries.length;
    const entryRows =
      entries
        .map(
          (entry) => `
      <tr style="height:40px">
        <td>${entry.design}</td>
        <td>${entry.meters.toFixed(2)}</td>
        <td>${entry.pcs}</td>
        <td>${(entry.meters * entry.pcs).toFixed(2)}</td>
        <td>${entry.price.toFixed(2)}</td>
        <td>${challan.discount.toFixed(2)}</td>
        <td>${(
          entry.price *
          entry.meters *
          entry.pcs *
          (1 - challan.discount / 100)
        ).toFixed(2)}</td>
      </tr>
    `
        )
        .join("") +
      `
      <tr style="height:${40 * extraRows}px">
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    ` +
      `
      <tr style="height:40px; font-weight:bold">
        <td>Total</td>
        <td></td>
        <td>${entries.reduce((sum, entry) => sum + entry.pcs, 0)}</td>
        <td>${entries
          .reduce((sum, entry) => sum + entry.meters * entry.pcs, 0)
          .toFixed(2)}</td>
        <td></td>
        <td>Taxable Value</td>
        <td>₹${entries
          .reduce(
            (sum, entry) =>
              sum +
              entry.price *
                entry.meters *
                entry.pcs *
                (1 - challan.discount / 100),
            0
          )
          .toFixed(2)} + GST</td>
      </tr>`+
      `
      <tr style="height:${40 * 2}px">
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `
    ;

    return `
      <html>
        <head>
          <title>Challan No: ${challan.challan_no}</title>
          <style>
          @page {
            size: A4;
            margin: 1cm;
          }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .totals { font-weight: bold; }
          </style>
        </head>
        <body>
          <div style="border: 2px solid #000; display: flex; flex-direction: column;">
            <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold;">ॐ</div>
            <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold; font-size: xx-large;">
              K.M. TEXTILES PVT. LTD.
            </div>
            <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
              <div style="border-right: 1px solid #000; width: 55%; font-size: small">
                47-SHANTI BHAVEN, 1ST FLOOR, ROOM NO. 1, 2, 3, 4 <br />
                OLD HANUMAN LANE, KALBADEVI ROAD, MUMBAI-400002 <br />
                TEL : 022 40225657 / 022 40116437
                <i class="fa fa-whatsapp" style="margin-left: 10px"></i>:+91 8097301148 <br />
                EMAIL : k.m.textilespvtltd@gmail.com
              </div>
              <div style="width: 45%;">
                <div style="display: flex; justify-content: space-around; font-size: 20px;">
                  <span>Challan No.: <b>${challan.challan_no}</b></span>
                  <span>Date: <b>${formatDate(challan.date)}</b></span>
                </div>
                <div style="display: flex; flex-direction: row; font-size: small">
                  <div style="width: 25%; text-align: right">
                    Broker : <br />
                    Transport :
                  </div>
                  <div style="width: 75%; text-align: left; padding-left: 2; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${challan.broker?.name || "N/A"} <br />
                    ${challan.transport?.name || "N/A"}
                  </div>
                </div>
              </div>
            </div>
            <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
              <div style="width: 55%; border-right: 1px solid #000; font-size: small; min-height: 50px; align-content: center;">
                <b>To: <span style="font-size: large">${
                  challan.bill_to?.name || "N/A"
                }</span></b><br />
              </div>
              <div style="width: 45%; font-size: small; min-height: 50px; align-content: center;">
                <b>Delivery: <span style="font-size: large">${
                  challan.ship_to?.name || "N/A"
                }</span></b><br />
              </div>
            </div>
            <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row; min-height: 30px;">
              <div style="width: 10%; text-align: center; align-content: center">Remark:</div>
              <div style="width: 90%; word-wrap: break-word; font-weight: bold; color: red; align-content: center;">
                ${challan.remark || "N/A"}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Design</th>
                  <th>Meters</th>
                  <th>Pieces</th>
                  <th>Total Meters</th>
                  <th>Price</th>
                  <th>Discount %</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${entryRows}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  };

  const handleShare = () => {
    const currentUrl = window.location.href;
    const message = `Challan View: ${currentUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4" style={{ height: "100vh" }}>
      <Card className="max-w-md mx-auto shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Challan View</h1>
        <div className="flex justify-between mb-4">
          <Button
            onClick={() => {
              const iframe = document.querySelector("iframe");
              if (iframe) {
                iframe.contentWindow?.print();
              }
            }}
            className="flex-1 mr-2"
          >
            Print
          </Button>
          <Button onClick={handleShare} className="flex-1 mx-2">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </Card>
      {generatedHtml && (
        <iframe
          srcDoc={generatedHtml}
          title="Generated HTML Preview"
          style={{
            width: "100%",
            height: "1000px",
            border: "1px solid #ccc",
            marginTop: "20px",
            display: "flex",
            zoom: 0.5,
          }}
        />
      )}
    </div>
  );
}

export default ChallanView;
