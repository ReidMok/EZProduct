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
  size: string; // Size name, e.g., "S", "M", "L" or "Small", "Medium", "Large"
  sizeCm: string; // Dimensions in centimeters, or "N/A" if not applicable
  sizeInch: string; // Dimensions in inches, or "N/A" if not applicable
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
   * Custom size options provided by user
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
    
    sizeInstruction = `3. Variants: Create exactly ${sizeCount} size variants using these user-specified sizes: "${sizeOptions}"
   Use the EXACT size names provided by the user.
   Each variant must include: size (use exact name provided), sizeCm (or "N/A"), sizeInch (or "N/A"), price (USD, reasonable for product), compareAtPrice (2-3x price), sku (format: ${brandName ? brandName.substring(0, 3).toUpperCase() : 'PRD'}XXX-size), weight (in grams)`;
    
    variantExample = sizes.slice(0, sizeCount).map((size, i) => `    {
      "size": "${size}",
      "sizeCm": "N/A",
      "sizeInch": "N/A",
      "price": ${(29.90 + i * 10).toFixed(2)},
      "compareAtPrice": ${(59.90 + i * 20).toFixed(2)},
      "sku": "${brandName ? brandName.substring(0, 3).toUpperCase() : 'PRD'}XXX-${size}",
      "weight": ${300 + i * 100}
    }`).join(',\n');
  } else {
    // AI generates appropriate sizes based on product type
    sizeInstruction = `3. Variants: Analyze the product type from the keywords and create 2-4 appropriate size variants.
   Choose a sizing system that is STANDARD for this specific product category:
   - Clothing/Apparel: S, M, L, XL or 小号, 中号, 大号
   - Shoes: US/EU/UK shoe sizes
   - Jewelry (rings): Ring sizes (5, 6, 7, 8, etc.) or One Size for bracelets/necklaces
   - Bags/Backpacks: Small, Medium, Large
   - Electronics: storage/memory sizes (64GB, 128GB, etc.)
   - Food/Beverages: weight-based (100g, 250g, 500g) or volume-based
   - Furniture/Large items: dimensions in cm or inches
   - Art/Posters: standard frame sizes
   - Cosmetics: volume (30ml, 50ml, 100ml)
   - If the product doesn't typically have sizes, use "Standard" or "One Size"
   
   IMPORTANT: Only use dimension-based sizes (like cm/inches) if the product category normally uses them.
   Each variant must include: size, sizeCm (or "N/A"), sizeInch (or "N/A"), price (USD), compareAtPrice (2-3x price), sku (format: ${brandName ? brandName.substring(0, 3).toUpperCase() : 'PRD'}XXX-size), weight (in grams)`;
    
    variantExample = `    {
      "size": "appropriate size name for this product category",
      "sizeCm": "dimensions if applicable, or N/A",
      "sizeInch": "dimensions if applicable, or N/A",
      "price": 29.90,
      "compareAtPrice": 59.90,
      "sku": "${brandName ? brandName.substring(0, 3).toUpperCase() : 'PRD'}XXX-size",
      "weight": 300
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

  const basePrompt = `You are an expert e-commerce product listing writer. Your job is to create professional product listings based ONLY on the keywords provided by the user.

Generate a complete product listing in JSON format for: "${keywords}"${brandInstruction}${notesInstruction}

CRITICAL RULES:
- Base ALL content strictly on the provided keywords
- Do NOT add materials, features, or characteristics that are not mentioned in the keywords
- Do NOT assume the product is made of any specific material (like resin, wood, ceramic) unless explicitly stated
- Do NOT assume specific dimensions unless explicitly stated
- Keep the description focused and relevant to what the keywords describe

Requirements:
1. Title: Create an SEO-optimized, attractive product title (max 100 characters).${brandName ? ` Include brand "${brandName}".` : ''} Include "Best Gift 🎁" only if the product seems gift-appropriate.
2. Description: Write a detailed HTML description (400-600 words) that includes:
   - Product features based ONLY on the provided keywords${brandName ? `\n   - Brand mention for "${brandName}"` : ''}
   - Relevant specifications (do not invent specifications not implied by keywords)
   - Size/variant comparison table if multiple sizes exist
   - Suitable use cases
   - Professional formatting with <p>, <ul>, <li>, <strong> tags
${sizeInstruction}
4. Tags: Generate 15-20 relevant tags based on the product keywords, including category-specific tags.
5. SEO: Generate SEO title and description (150-160 characters for description)

Return ONLY valid JSON in this exact format:
{
  "title": "Product Title",
  "descriptionHtml": "<p>HTML description...</p>",
  "variants": [
${variantExample}
  ],
  "tags": ["tag1", "tag2", ...],
  "seoTitle": "SEO Title",
  "seoDescription": "SEO description text"
}

Important: 
- Only include a size table if multiple size variants exist
- Use size names/units that are standard for this specific product category
- Prices should be realistic for the product type`;

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
    variant.price = parseFloat(variant.price) || 29.90;
    variant.compareAtPrice = parseFloat(variant.compareAtPrice) || variant.price * 2;
    variant.weight = parseInt(variant.weight) || 300;
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

