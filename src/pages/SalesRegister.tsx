import React, { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import supabase from "@/utils/supabase";

interface InvoiceData {
  buyer: string;
  tax_invoice_number: string;
  total_amount_before_tax: string;
  matched_party?: string;
  party_id?: number | null;
}

interface PartyInfo {
  id: number;
  name: string;
}

function SalesRegister() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parties, setParties] = useState<PartyInfo[]>([]);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY!);

  useEffect(() => {
    fetchPartyNames();
  }, []);

  const fetchPartyNames = async () => {
    try {
      // Get distinct bill_to_id values from orders
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("bill_to_id")
        .not("bill_to_id", "is", null)
        .order("bill_to_id");

      if (orderError) throw orderError;

      // Extract unique bill_to_id values
      const uniqueBillToIds = [
        ...new Set(orderData.map((order) => order.bill_to_id)),
      ];

      if (uniqueBillToIds.length === 0) {
        setParties([]);
        return;
      }

      // Fetch corresponding party information
      const { data: partyData, error: partyError } = await supabase
        .from("party_profiles")
        .select("id, name")
        .in("id", uniqueBillToIds);

      if (partyError) throw partyError;

      setParties(partyData || []);
    } catch (error) {
      console.error("Error fetching party names:", error);
    }
  };

  // New matching function that counts matching characters

  const extractWords = (name: string): string[] => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 1); // Only keep words with length > 1
  };

  const calculateWordSimilarity = (str1: string, str2: string): number => {
    const words1 = extractWords(str1);
    const words2 = extractWords(str2);

    let matchCount = 0;
    let partialMatchCount = 0;

    // Check for complete word matches and partial matches
    for (const word1 of words1) {
      let bestPartialMatch = 0;

      for (const word2 of words2) {
        // Complete word match
        if (word1 === word2) {
          matchCount++;
          bestPartialMatch = 1;
          break;
        }

        // Check for partial match (one word is substring of another)
        if (word1.length >= 3 && word2.length >= 3) {
          if (word1.includes(word2) || word2.includes(word1)) {
            const partialScore =
              Math.min(word1.length, word2.length) /
              Math.max(word1.length, word2.length);
            bestPartialMatch = Math.max(bestPartialMatch, partialScore);
          }

          // Check for common prefix (first 3+ characters match)
          const minLength = Math.min(word1.length, word2.length);
          if (minLength >= 3) {
            const prefix = word1.substring(0, minLength);
            if (word2.startsWith(prefix)) {
              const prefixScore =
                prefix.length / Math.max(word1.length, word2.length);
              bestPartialMatch = Math.max(bestPartialMatch, prefixScore);
            }
          }
        }
      }

      partialMatchCount += bestPartialMatch;
    }

    // Calculate similarity score
    const totalWords = Math.max(words1.length, words2.length);
    if (totalWords === 0) return 0;

    // Give more weight to complete matches
    const weightedScore = (matchCount * 1.5 + partialMatchCount) / totalWords;
    return Math.min(1, weightedScore); // Cap at 1
  };

  // Calculate character-level similarity
  const calculateCharSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().replace(/\s+/g, "");
    const s2 = str2.toLowerCase().replace(/\s+/g, "");

    if (s1.length === 0 || s2.length === 0) return 0;

    // Count matching characters
    let matches = 0;
    const charMap: Record<string, number> = {};

    for (const char of s1) {
      charMap[char] = (charMap[char] || 0) + 1;
    }

    for (const char of s2) {
      if (charMap[char] && charMap[char] > 0) {
        matches++;
        charMap[char]--;
      }
    }

    // Calculate similarity score
    return matches / Math.max(s1.length, s2.length);
  };

  const findBestMatch = (buyerName: string): { name: string; id: number } => {
    let bestMatch = { name: buyerName, id: -1 };
    let highestScore = 0;

    for (const party of parties) {
      // Calculate both word-based and character-based similarity
      const wordSimilarity = calculateWordSimilarity(buyerName, party.name);
      const charSimilarity = calculateCharSimilarity(buyerName, party.name);

      // Combined score (favoring word similarity)
      const combinedScore = wordSimilarity * 0.7 + charSimilarity * 0.3;

      if (combinedScore > highestScore) {
        highestScore = combinedScore;
        bestMatch = { name: party.name, id: party.id };
      }
    }

    // Only consider it a match if score is above threshold
    return bestMatch;
  };

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
            text: "Extract the following information from this invoice image: buyer name, tax invoice number, and total amount before tax. The buyer name should include the address location writen bellow it",
          },
        ]);

        const parsedData = JSON.parse(result.response.text());
        const matchedParty = findBestMatch(parsedData.buyer);
        results.push({
          ...parsedData,
          matched_party: matchedParty.name,
          party_id: matchedParty.id,
        });
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
                      <th className="px-4 py-2 border-b">Extracted Buyer</th>
                      <th className="px-4 py-2 border-b">Matched Party</th>
                      <th className="px-4 py-2 border-b">Tax Invoice Number</th>
                      <th className="px-4 py-2 border-b">Amount Before Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.map((data, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 border-b">{data.buyer}</td>
                        <td className="px-4 py-2 border-b">
                          <span
                            className={
                              data.buyer !== data.matched_party
                                ? "text-blue-600 font-semibold"
                                : ""
                            }
                            title={
                              data.party_id ? `ID: ${data.party_id}` : undefined
                            }
                          >
                            {data.matched_party}
                          </span>
                        </td>
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
