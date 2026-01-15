/**
 * Image Upload and Hosting Utility
 * Supports multiple image hosting providers: Cloudinary, AWS S3, or direct Shopify upload
 */

/**
 * Upload image to Cloudinary
 */
export async function uploadToCloudinary(
  imageFile: File | Blob,
  options?: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
    folder?: string;
  }
): Promise<string> {
  const cloudName = options?.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = options?.apiKey || process.env.CLOUDINARY_API_KEY;
  const apiSecret = options?.apiSecret || process.env.CLOUDINARY_API_SECRET;
  const folder = options?.folder || "shopify-products";

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials not configured");
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("upload_preset", "shopify_products"); // Configure in Cloudinary dashboard
  formData.append("folder", folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.secure_url; // Return the CDN URL
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error(
      `Failed to upload image to Cloudinary: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Upload image to AWS S3
 */
export async function uploadToS3(
  imageFile: File | Blob,
  options?: {
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    folder?: string;
  }
): Promise<string> {
  // This would require AWS SDK
  // For now, return a placeholder implementation
  throw new Error("S3 upload not yet implemented. Please use Cloudinary or Shopify Files API.");
}

/**
 * Upload image directly to Shopify Files API
 * This is the recommended approach for Shopify apps
 */
export async function uploadToShopify(
  imageFile: File | Blob,
  shop: string,
  accessToken: string
): Promise<string> {
  // Create form data
  const formData = new FormData();
  formData.append("file", imageFile);

  try {
    const response = await fetch(
      `https://${shop}/admin/api/2024-10/files.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify upload failed: ${errorText}`);
    }

    const data = await response.json();
    return data.file.url; // Return the Shopify CDN URL
  } catch (error) {
    console.error("Shopify upload error:", error);
    throw new Error(
      `Failed to upload image to Shopify: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get image URL from various sources
 * Handles both file uploads and existing URLs
 */
export async function processImageInput(
  input: File | Blob | string,
  options?: {
    shop?: string;
    accessToken?: string;
    uploadProvider?: "cloudinary" | "s3" | "shopify";
  }
): Promise<string> {
  // If it's already a URL, return it
  if (typeof input === "string") {
    return input;
  }

  // Otherwise, upload the file
  const provider = options?.uploadProvider || "shopify";

  switch (provider) {
    case "cloudinary":
      return await uploadToCloudinary(input);
    case "s3":
      return await uploadToS3(input);
    case "shopify":
      if (!options?.shop || !options?.accessToken) {
        throw new Error("Shop and access token required for Shopify upload");
      }
      return await uploadToShopify(input, options.shop, options.accessToken);
    default:
      throw new Error(`Unknown upload provider: ${provider}`);
  }
}

