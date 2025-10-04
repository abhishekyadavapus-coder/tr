
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedExpenseData } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        amount: { type: Type.NUMBER, description: "The total amount of the expense" },
        currency: { type: Type.STRING, description: "The 3-letter currency code (e.g., USD, EUR)" },
        date: { type: Type.STRING, description: "The date of the expense in YYYY-MM-DD format" },
        vendor: { type: Type.STRING, description: "The name of the vendor or merchant" },
        description: { type: Type.STRING, description: "A brief description of the items purchased" },
        category: { type: Type.STRING, description: "A suggested category like 'Meals & Entertainment', 'Travel', 'Office Supplies'" }
    },
    required: ["amount", "currency", "date", "vendor", "description", "category"]
};

export const extractExpenseFromReceipt = async (imageBase64: string): Promise<ExtractedExpenseData> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                    { text: "Analyze this receipt and extract the expense details. Provide the output in JSON format according to the provided schema." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText);
        
        return parsedData as ExtractedExpenseData;

    } catch (error) {
        console.error("Error processing receipt with Gemini API:", error);
        throw new Error("Failed to extract data from receipt.");
    }
};
