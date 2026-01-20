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
    // Try latest stable models first
    "gemini-1.5-pro-latest",
    "gemini-1.5-flash-latest",
    // Then try specific versions
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    // Try newer models
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    // Fallback to older stable model
    "gemini-pro",
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

export interface ProductGenerationOptions {
  keywords: string;
  imageUrl?: string;
  /** 
   * Custom size options, e.g., "S, M, L, XL" or "小号, 中号, 大号" or "6inch, 8inch, 10inch"
   * If not provided, AI will generate appropriate sizes based on product type
   */
  sizeOptions?: string;
  /** Brand name to use for the product */
  brandName?: string;
  /** Additional product description/notes from user */
  productNotes?: string;
}

/**
 * Generate product information using AI
 * @param options - Product generation options
 * @returns Generated product data
 */
export async function generateProduct(
  options: ProductGenerationOptions | string,
  imageUrl?: string
): Promise<GeneratedProduct> {
  // Support legacy call signature: generateProduct(keywords, imageUrl)
  const opts: ProductGenerationOptions = typeof options === 'string' 
    ? { keywords: options, imageUrl } 
    : options;
  
  const prompt = buildPrompt(opts);

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
        const errStr = String(err).toLowerCase();

        // Enhanced error detection for model not available errors
        const isModelNotFound =
          /404\s*not\s*found/i.test(msg) ||
          /model.*not\s*found/i.test(msg) ||
          /is\s+not\s+supported\s+for\s+generateContent/i.test(msg) ||
          /model.*not\s+available/i.test(msg) ||
          /not\s+available\s+for\s+generateContent/i.test(msg) ||
          errStr.includes("not available") ||
          errStr.includes("model not found") ||
          errStr.includes("invalid model");

        if (isModelNotFound) {
          console.warn(
            `[AI] Model "${modelName}" not available for generateContent. Error: ${msg}. Trying next model...`
          );
          continue;
        }

        // Log other errors but continue trying next model if it's a model-related error
        console.error(`[AI] Error with model "${modelName}":`, err);
        
        // For quota/auth/network errors, fail fast
        const isFatalError = 
          /quota/i.test(msg) ||
          /unauthorized/i.test(msg) ||
          /authentication/i.test(msg) ||
          /api\s*key/i.test(msg);

        if (isFatalError) {
          throw err;
        }

        // For other errors, try next model
        continue;
      }
    }

    // If we've exhausted all models, throw a clear error
    const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
      `No available Gemini model found. Tried models: ${modelCandidates.join(", ")}. ` +
        `Last error: ${errorMsg}. ` +
        `Please check your GEMINI_API_KEY and GEMINI_MODEL environment variables, or try a different API key.`
    );

  } catch (error) {
    console.error("[AI Generator] Final Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[AI Generator] Error Message:", errorMessage);
    throw new Error(`Failed to generate product: ${errorMessage}`);
  }
}

/**
 * Build the AI prompt for product generation
 */
function buildPrompt(opts: ProductGenerationOptions): string {
  const { keywords, imageUrl, sizeOptions, brandName, productNotes } = opts;
  
  // Build size instruction based on user input
  let sizeInstruction: string;
  let variantExample: string;
  
  if (sizeOptions && sizeOptions.trim()) {
    // User provided custom sizes
    const sizes = sizeOptions.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean);
    const sizeCount = Math.min(sizes.length, 5); // Max 5 variants
    
    sizeInstruction = `3. Variants: Create exactly ${sizeCount} size variants based on user-specified sizes: "${sizeOptions}"
   For each size, create appropriate dimensions based on the product type.
   Each variant must include: size (use the exact size name provided), sizeCm (dimensions in cm), sizeInch (dimensions in inches), price (USD, increasing for larger sizes), compareAtPrice (2-3x price), sku (format: ${brandName ? brandName.substring(0, 3).toUpperCase() : 'PRD'}XXX-size), weight (in grams, appropriate for product)`;
    
    variantExample = sizes.slice(0, sizeCount).map((size, i) => `    {
      "size": "${size}",
      "sizeCm": "appropriate cm dimensions",
      "sizeInch": "appropriate inch dimensions",
      "price": ${(79.90 + i * 20).toFixed(2)},
      "compareAtPrice": ${(200.00 + i * 50).toFixed(2)},
      "sku": "${brandName ? brandName.substring(0, 3).toUpperCase() : 'PRD'}XXX-${size}",
      "weight": ${600 + i * 200}
    }`).join(',\n');
  } else {
    // AI generates appropriate sizes based on product type
    sizeInstruction = `3. Variants: Analyze the product type and create 2-4 appropriate size variants.
   - For clothing: use S, M, L, XL (or 小号, 中号, 大号 for Chinese products)
   - For home decor/figurines: use dimensions like 6inch, 8inch, 10inch
   - For jewelry: use One Size or specific ring/bracelet sizes
   - For bags: use Small, Medium, Large
   - For electronics: use storage/capacity sizes
   - For food/consumables: use weight-based sizes (100g, 250g, 500g)
   Choose the most appropriate sizing system for this product type.
   Each variant must include: size, sizeCm, sizeInch (or N/A if not applicable), price (USD), compareAtPrice (2-3x price), sku (format: ${brandName ? brandName.substring(0, 3).toUpperCase() : 'PRD'}XXX-size), weight (in grams)`;
    
    variantExample = `    {
      "size": "Size Name (appropriate for product)",
      "sizeCm": "dimensions in cm",
      "sizeInch": "dimensions in inches",
      "price": 79.90,
      "compareAtPrice": 200.00,
      "sku": "${brandName ? brandName.substring(0, 3).toUpperCase() : 'PRD'}XXX-size",
      "weight": 500
    }`;
  }
  
  // Build brand instruction
  const brandInstruction = brandName 
    ? `\n\nBrand Information: This product is from "${brandName}". Include the brand name naturally in the title and description.`
    : '';
  
  // Build product notes instruction
  const notesInstruction = productNotes
    ? `\n\nAdditional Product Information from seller:\n${productNotes}\nPlease incorporate this information into the product description.`
    : '';

  const basePrompt = `You are an expert e-commerce product listing writer for general consumer products across multiple categories (home, lifestyle, fitness, pets, accessories, clothing, jewelry, etc.).

Generate a complete product listing in JSON format for: "${keywords}"${brandInstruction}${notesInstruction}

Requirements:
1. Title: Create an SEO-optimized, attractive product title (max 100 characters).${brandName ? ` Include brand "${brandName}".` : ''} Include "Best Gift 🎁" if appropriate for gift-able products.
2. Description: Write a detailed HTML description (500-800 words) that includes:
   - Compelling product story and key features${brandName ? `\n   - Brand introduction for "${brandName}"` : ''}
   - Detailed specifications
   - Size comparison table showing dimensions in a clean HTML table format (use cm and/or inches as appropriate)
   - Suitable use cases and gift ideas
   - Professional formatting with <p>, <ul>, <li>, <strong> tags
${sizeInstruction}
4. Tags: Generate 15-25 relevant tags including: gift_idea, new_arrival, bestseller, home_lifestyle, minimalist_style, holiday_gift, and category-specific tags.
5. SEO: Generate SEO title and description (150-160 characters for description)

Return ONLY valid JSON in this exact format:
{
  "title": "Product Title",
  "descriptionHtml": "<p>Full HTML description with size table...</p>",
  "variants": [
${variantExample}
  ],
  "tags": ["tag1", "tag2", ...],
  "seoTitle": "SEO Title",
  "seoDescription": "SEO description text"
}

Important: 
- The descriptionHtml MUST include a size comparison table in HTML format.
- Use size names/units that are appropriate for this specific product category.
- Prices should be realistic for the product type and size.`;

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

  // Ensure we have at least 1 variant and max 5
  if (data.variants.length < 1) {
    throw new Error("Expected at least 1 variant");
  }
  if (data.variants.length > 5) {
    // Trim to 5 variants if more were generated
    data.variants = data.variants.slice(0, 5);
  }

  // Validate each variant
  data.variants.forEach((variant: any, index: number) => {
    if (!variant.size || !variant.price || !variant.sku) {
      throw new Error(`Variant ${index + 1} is missing required fields`);
    }
    // Ensure numeric values
    variant.price = parseFloat(variant.price) || 79.90;
    variant.compareAtPrice = parseFloat(variant.compareAtPrice) || variant.price * 2.5;
    variant.weight = parseInt(variant.weight) || 500;
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

