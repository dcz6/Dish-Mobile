import OpenAI from "openai";
import type { ParsedReceipt } from "@shared/schema";

// Lazy initialization - only create OpenAI client when needed
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openai;
}

const RECEIPT_PARSING_PROMPT = `You are a receipt parsing assistant. Analyze the provided receipt image and extract the following information in JSON format:

{
  "restaurantName": "Name of the restaurant",
  "restaurantAddress": "Address if visible, or null",
  "datetime": "ISO 8601 datetime string (e.g., 2024-01-15T19:30:00Z). If only date visible, use noon. If not visible, use current date.",
  "total": "Total amount as a number (e.g., 45.99), or null if not visible",
  "lineItems": [
    {
      "dishName": "Name of the dish/item",
      "price": "Price as a number (e.g., 12.99), or null if not clear"
    }
  ]
}

Important guidelines:
- Extract only food/drink items, not tax, tip, or service charges
- Use descriptive dish names, not abbreviations
- If price is unclear, set it to null
- If restaurant name is not visible, make a reasonable guess or use "Unknown Restaurant"
- Return ONLY the JSON object, no additional text`;

export async function parseReceiptImage(imageBase64: string): Promise<ParsedReceipt> {
  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: RECEIPT_PARSING_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const parsed = JSON.parse(content);

    return {
      restaurantName: parsed.restaurantName || "Unknown Restaurant",
      restaurantAddress: parsed.restaurantAddress || undefined,
      datetime: parsed.datetime || new Date().toISOString(),
      total: typeof parsed.total === "number" ? parsed.total : null,
      lineItems: Array.isArray(parsed.lineItems)
        ? parsed.lineItems.map((item: any) => ({
            dishName: item.dishName || "Unknown Item",
            price: typeof item.price === "number" ? item.price : null,
          }))
        : [],
    };
  } catch (error) {
    console.error("Receipt parsing error:", error);
    return {
      restaurantName: "",
      datetime: new Date().toISOString(),
      total: null,
      lineItems: [],
    };
  }
}
