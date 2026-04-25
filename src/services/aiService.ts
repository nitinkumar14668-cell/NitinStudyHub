import { GoogleGenAI } from "@google/genai";

const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const verifyPaymentScreenshot = async (base64Image: string, mimeType: string, expectedAmount: number) => {
  try {
    const prompt = `
      You are a strict payment verification assistant. You need to analyze this image to check if it's a valid and successful UPI or bank payment screenshot.
      The expected amount is ₹${expectedAmount}.
      Extract the Transaction ID, UTR, or UPI Reference Number (must be exactly 12 digits or a valid format), Amount Paid, and check if the payment is 'Successful' or 'Completed'.
      Also check for signs of a fake screenshot (e.g., impossible dates, obvious edits, missing UTR).
      A screenshot is ONLY valid if:
      1. It clearly shows a successful payment.
      2. The amount matches exactly ₹${expectedAmount}.
      3. It has a visible and valid Transaction ID or UTR.
      
      Return the result strictly in JSON format.
      Example JSON:
      {
        "isValid": true,
        "amount": 250,
        "transactionId": "312345678901",
        "reason": "Payment successful and amount matches."
      }
    `;

    const imagePart = {
      inlineData: {
        data: base64Image.split(',')[1] || base64Image,
        mimeType
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }, imagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            isValid: {
              type: "BOOLEAN",
              description: "Whether the payment screenshot is valid and successful"
            },
            amount: {
              type: "NUMBER",
              description: "The extracted amount"
            },
            transactionId: {
              type: "STRING",
              description: "The extracted transaction ID"
            },
            reason: {
              type: "STRING",
              description: "Reason for validation result"
            }
          },
          required: ["isValid", "amount", "transactionId", "reason"]
        }
      }
    });

    const text = response.text || '';
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Payment Verification Error:", error);
    return { isValid: false, reason: "Verification service error: " + (error instanceof Error ? error.message : "Unknown error") };
  }
};
export const generateNotePromotion = async (noteTitle: string, description: string, category: string) => {
  try {
    const prompt = `
      You are a social media marketing expert for an educational platform.
      Create a compelling YouTube Community Post or Short description for the following set of notes:
      Title: ${noteTitle}
      Description: ${description}
      Category: ${category}

      The tone should be: Exciting, helpful, and student-focused.
      Include:
      1. A catchy headline.
      2. 3 key benefits of these notes.
      3. Call to action.
      4. 5-7 relevant hashtags (include #NitinStudyHub).
      5. Emoticons.

      Return the response in JSON format.
      Example JSON:
      {
        "postTitle": "Catchy headline here",
        "description": "Full promotional text here",
        "tags": ["tag1", "tag2", "tag3"]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text || '';
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      postTitle: `Check out our new ${noteTitle} notes!`,
      description: `New study resource available for ${category}: ${description}`,
      tags: ["education", "study", "notes", "NitinStudyHub"]
    };
  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
};
