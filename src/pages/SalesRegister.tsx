import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface InvoiceData {
  buyer: string;
  tax_invoice_number: string;
  total_amount_before_tax: string;
}

function SalesRegister() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY!);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const processImages = async () => {
    setIsProcessing(true);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `only return json in the following format:
      {
        "buyer": "string",
        "tax_invoice_number": "string",
        "total_amount_before_tax": "string"
      }`,
    });

    const results: InvoiceData[] = [];

    for (const file of selectedFiles) {
      try {
        // Convert File to base64
        const base64Data = await fileToBase64(file);

        const chatSession = model.startChat({
          generationConfig: {
            temperature: 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        });

        const result = await chatSession.sendMessage([
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data.split(",")[1],
            },
          },
          {
            text: "Extract the following information from this invoice image: buyer name, tax invoice number, and total amount before tax. Return only these three fields in JSON format.",
          },
        ]);

        const parsedData = JSON.parse(result.response.text());
        results.push(parsedData);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }

    setInvoiceData(results);
    setIsProcessing(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {selectedFiles.length > 0 && (
        <>
          <button
            onClick={processImages}
            disabled={isProcessing}
            className="mb-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isProcessing ? "Processing..." : "Process Images"}
          </button>

          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Selected Images:</h3>
            <ul className="list-disc pl-5 mb-4">
              {selectedFiles.map((file, index) => (
                <li key={index} className="text-gray-700">
                  {file.name}
                </li>
              ))}
            </ul>
          </div>

          {invoiceData.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Extracted Data:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 border-b">Buyer</th>
                      <th className="px-4 py-2 border-b">Tax Invoice Number</th>
                      <th className="px-4 py-2 border-b">Amount Before Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.map((data, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 border-b">{data.buyer}</td>
                        <td className="px-4 py-2 border-b">
                          {data.tax_invoice_number}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {data.total_amount_before_tax}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SalesRegister;
