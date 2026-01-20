/**
 * CSV Template for Batch Product Generation
 */

export const CSV_HEADERS = [
  'keywords',           // Required: Product keywords
  'imageUrl',           // Optional: Product image URL
  'sizeOptions',        // Optional: Comma-separated sizes (e.g., "S,M,L,XL")
  'brandName',          // Optional: Brand name
  'productNotes',       // Optional: Additional product info
] as const;

// CSV templates with bilingual headers and required/optional indicators
export const CSV_TEMPLATE_EN = `keywords (关键词) [Required / 必填],imageUrl (图片链接) [Optional / 可选],sizeOptions (尺寸选项) [Optional / 可选],brandName (品牌名称) [Optional / 可选],productNotes (产品说明) [Optional / 可选]
Yoga Mat,,S;M;L,YogaBrand,Premium non-slip surface
Pet Collar,https://example.com/collar.jpg,Small;Medium;Large,PetPals,Adjustable leather collar
Coffee Mug,,Standard,MugLife,350ml capacity`;

export const CSV_TEMPLATE_ZH = `keywords (关键词) [Required / 必填],imageUrl (图片链接) [Optional / 可选],sizeOptions (尺寸选项) [Optional / 可选],brandName (品牌名称) [Optional / 可选],productNotes (产品说明) [Optional / 可选]
瑜伽垫,,S;M;L,瑜伽品牌,高级防滑表面
宠物项圈,https://example.com/collar.jpg,小号;中号;大号,宠物伙伴,可调节皮质项圈
咖啡杯,,标准款,杯生活,350ml容量`;

export interface BatchProductRow {
  keywords: string;
  imageUrl?: string;
  sizeOptions?: string;
  brandName?: string;
  productNotes?: string;
  rowNumber: number;
}

/**
 * Parse CSV content into batch product rows
 */
export function parseCSV(csvContent: string): { rows: BatchProductRow[]; errors: string[] } {
  const lines = csvContent.trim().split(/\r?\n/);
  const errors: string[] = [];
  const rows: BatchProductRow[] = [];

  if (lines.length < 2) {
    errors.push('CSV must have at least a header row and one data row');
    return { rows, errors };
  }

  // Parse header - handle bilingual headers with required/optional indicators
  // Use parseCSVLine to handle quoted fields properly
  const headerRaw = parseCSVLine(lines[0]);
  const header = headerRaw.map(h => h.trim().toLowerCase());
  
  // Find column indices by matching English or Chinese keywords
  // Support headers like "keywords (关键词) [Required / 必填]"
  const findColumnIndex = (patterns: string[]): number => {
    for (let i = 0; i < header.length; i++) {
      const headerText = header[i];
      for (const pattern of patterns) {
        if (headerText.includes(pattern.toLowerCase())) {
          return i;
        }
      }
    }
    return -1;
  };
  
  const keywordsIndex = findColumnIndex(['keywords', '关键词']);
  
  if (keywordsIndex === -1) {
    errors.push('CSV must have a "keywords" or "关键词" column');
    return { rows, errors };
  }

  const imageUrlIndex = findColumnIndex(['imageurl', '图片链接']);
  const sizeOptionsIndex = findColumnIndex(['sizeoptions', '尺寸选项']);
  const brandNameIndex = findColumnIndex(['brandname', '品牌名称']);
  const productNotesIndex = findColumnIndex(['productnotes', '产品说明']);

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    // Handle CSV with potential quoted fields
    const values = parseCSVLine(line);
    
    const keywords = values[keywordsIndex]?.trim();
    if (!keywords) {
      errors.push(`Row ${i + 1}: Missing required "keywords" field`);
      continue;
    }

    rows.push({
      keywords,
      imageUrl: imageUrlIndex >= 0 ? values[imageUrlIndex]?.trim() || undefined : undefined,
      // Note: sizeOptions uses semicolon as separator within CSV to avoid conflict with CSV comma
      sizeOptions: sizeOptionsIndex >= 0 ? values[sizeOptionsIndex]?.trim().replace(/;/g, ',') || undefined : undefined,
      brandName: brandNameIndex >= 0 ? values[brandNameIndex]?.trim() || undefined : undefined,
      productNotes: productNotesIndex >= 0 ? values[productNotesIndex]?.trim() || undefined : undefined,
      rowNumber: i + 1,
    });
  }

  return { rows, errors };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Generate CSV content for download
 */
export function generateTemplateCSV(lang: 'en' | 'zh'): string {
  return lang === 'zh' ? CSV_TEMPLATE_ZH : CSV_TEMPLATE_EN;
}

/**
 * Validate a batch product row
 */
export function validateRow(row: BatchProductRow): string[] {
  const errors: string[] = [];
  
  if (!row.keywords || row.keywords.length < 2) {
    errors.push(`Row ${row.rowNumber}: Keywords too short (minimum 2 characters)`);
  }
  
  if (row.keywords && row.keywords.length > 200) {
    errors.push(`Row ${row.rowNumber}: Keywords too long (maximum 200 characters)`);
  }
  
  if (row.imageUrl && !isValidUrl(row.imageUrl)) {
    errors.push(`Row ${row.rowNumber}: Invalid image URL format`);
  }
  
  return errors;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
