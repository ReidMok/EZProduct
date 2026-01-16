/**
 * AI Product Generator using Google Gemini API
 * Generates complete product information including title, description, variants, and SEO metadata
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function getModelCandidates(): string[] {
  const candidates = [
    process.env.GEMINI_MODEL,
    // Common Gemini model identifiers (Google has changed naming/availability over time)
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
  ].filter(Boolean) as string[];

  // De-dup while preserving order
  return [...new Set(candidates)];
}

function getModel(name: string) {
  return genAI.getGenerativeModel({ model: name });
}

export interface ProductVariant {
  size: string; // e.g., "6inch", "8inch", "10inch"
  sizeCm: string; // e.g., "15cm*12.7cm*4cm"
  sizeInch: string; // e.g., "6inch*5inch*1.5inch"
  price: number;
  compareAtPrice: number;
  sku: string;
  weight: number; // in grams
}

export interface GeneratedProduct {
  title: string;
  descriptionHtml: string;
  variants: ProductVariant[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

/**
 * Generate product information using AI
 * @param keywords - Product keywords (e.g., "Minimalist Ceramic Coffee Mug")
 * @param imageUrl - Optional image URL for image-based generation
 * @returns Generated product data
 */
export async function generateProduct(
  keywords: string,
  imageUrl?: string
): Promise<GeneratedProduct> {
  const prompt = buildPrompt(keywords, imageUrl);

  try {
    const modelCandidates = getModelCandidates();
    let lastError: unknown;

    for (const modelName of modelCandidates) {
      try {
        const model = getModel(modelName);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON from AI response
        const jsonMatch =
          text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          throw new Error("Failed to parse AI response as JSON");
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const productData = JSON.parse(jsonStr);

        // Validate and format the response
        return validateAndFormatProduct(productData);
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);

        // If the model name is invalid / not supported, try the next candidate.
        const isModelNotFound =
          /404\s*not\s*found/i.test(msg) ||
          /model.*not\s*found/i.test(msg) ||
          /is\s+not\s+supported\s+for\s+generateContent/i.test(msg);

        if (isModelNotFound) {
          console.warn(
            `[AI] Model "${modelName}" not available for generateContent. Trying next...`
          );
          continue;
        }

        // For other errors (quota/auth/network), fail fast.
        throw err;
      }
    }

    throw new Error(
      `No available Gemini model found. Tried: ${modelCandidates.join(", ")}. ` +
        `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );

  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error(`Failed to generate product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build the AI prompt for product generation
 */
function buildPrompt(keywords: string, imageUrl?: string): string {
  const basePrompt = `You are an expert e-commerce product listing writer for general consumer products across multiple categories (home, lifestyle, fitness, pets, accessories, etc.).

Generate a complete product listing in JSON format for: "${keywords}"

Requirements:
1. Title: Create an SEO-optimized, attractive product title (max 100 characters). Include "Best Gift 🎁" if appropriate.
2. Description: Write a detailed HTML description (500-800 words) that includes:
   - Compelling product story and key features
   - Detailed specifications
   - Size comparison table showing both centimeters (cm) and inches (inch) in a clean HTML table format
   - Suitable use cases and gift ideas
   - Professional formatting with <p>, <ul>, <li>, <strong> tags
3. Variants: Create exactly 3 size variants:
   - 6inch variant: 6inch*5inch*1.5inch (15cm*12.7cm*4cm) - Base price
   - 8inch variant: 8inch*6inch*2inch (20cm*15cm*5cm) - Medium price (+20-30%)
   - 10inch variant: 10inch*7inch*2.5inch (25cm*18cm*6cm) - Premium price (+40-50%)
   Each variant must include: size, sizeCm, sizeInch, price (USD), compareAtPrice (2-3x price), sku (format: BJ140XXX-size), weight (in grams)
4. Tags: Generate 15-25 relevant tags including: gift_idea, new_arrival, bestseller, home_lifestyle, minimalist_style, holiday_gift, etc.
5. SEO: Generate SEO title and description (150-160 characters for description)

Return ONLY valid JSON in this exact format:
{
  "title": "Product Title",
  "descriptionHtml": "<p>Full HTML description with size table...</p>",
  "variants": [
    {
      "size": "6inch",
      "sizeCm": "15cm*12.7cm*4cm",
      "sizeInch": "6inch*5inch*1.5inch",
      "price": 79.90,
      "compareAtPrice": 200.00,
      "sku": "BJ140XXX-6inch",
      "weight": 900
    },
    {
      "size": "8inch",
      "sizeCm": "20cm*15cm*5cm",
      "sizeInch": "8inch*6inch*2inch",
      "price": 99.90,
      "compareAtPrice": 250.00,
      "sku": "BJ140XXX-8inch",
      "weight": 900
    },
    {
      "size": "10inch",
      "sizeCm": "25cm*18cm*6cm",
      "sizeInch": "10inch*7inch*2.5inch",
      "price": 119.90,
      "compareAtPrice": 300.00,
      "sku": "BJ140XXX-10inch",
      "weight": 1500
    }
  ],
  "tags": ["tag1", "tag2", ...],
  "seoTitle": "SEO Title",
  "seoDescription": "SEO description text"
}

Important: The descriptionHtml MUST include a size comparison table in HTML format showing both cm and inch measurements.`;

  if (imageUrl) {
    return `${basePrompt}\n\nProduct Image URL: ${imageUrl}\nPlease analyze the image and incorporate visual details into the description.`;
  }

  return basePrompt;
}

/**
 * Validate and format the AI-generated product data
 */
function validateAndFormatProduct(data: any): GeneratedProduct {
  // Validate required fields
  if (!data.title || !data.descriptionHtml || !data.variants || !Array.isArray(data.variants)) {
    throw new Error("Invalid product data structure from AI");
  }

  // Ensure we have exactly 3 variants
  if (data.variants.length !== 3) {
    throw new Error("Expected exactly 3 variants");
  }

  // Validate each variant
  data.variants.forEach((variant: any, index: number) => {
    if (!variant.size || !variant.price || !variant.sku) {
      throw new Error(`Variant ${index + 1} is missing required fields`);
    }
  });

  // Ensure tags is an array
  if (!Array.isArray(data.tags)) {
    data.tags = [];
  }

  return {
    title: data.title,
    descriptionHtml: data.descriptionHtml,
    variants: data.variants,
    tags: data.tags,
    seoTitle: data.seoTitle || data.title,
    seoDescription: data.seoDescription || "",
  };
}

