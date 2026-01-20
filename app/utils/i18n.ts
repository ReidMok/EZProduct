/**
 * Internationalization (i18n) utilities
 * Supports English (en) and Chinese (zh)
 */

export type Language = 'en' | 'zh';

export const translations = {
  en: {
    // Page header
    pageTitle: "EZProduct - AI Product Generator",
    pageSubtitle: "Generate complete product listings with AI and sync to your store",
    
    // Language toggle
    switchToEnglish: "English",
    switchToChinese: "中文",
    
    // Session refresh banner
    sessionRefreshedTitle: "Session Refreshed",
    sessionRefreshedMessage: "Your session token has been refreshed. Please click the button again to generate your product.",
    
    // Error/Success banners
    errorTitle: "Error",
    successTitle: "Success!",
    successMessage: "Product generated and synced successfully!",
    viewProduct: "View Product",
    
    // Form section
    formTitle: "Generate New Product",
    
    // Keywords field
    keywordsLabel: "Product Keywords",
    keywordsPlaceholder: "e.g., Ceramic Coffee Mug, Yoga Mat, Pet Collar",
    keywordsHelp: "Enter keywords describing your product. AI will generate title, description, variants, and SEO metadata.",
    keywordsRequired: "Please enter product keywords",
    
    // Image URL field
    imageUrlLabel: "Product Image URL (Optional)",
    imageUrlPlaceholder: "https://example.com/product-image.jpg",
    imageUrlHelp: "Optional: Provide an image URL for AI to analyze and incorporate into the description.",
    
    // Size options field
    sizeOptionsLabel: "Size Options (Optional)",
    sizeOptionsPlaceholder: "e.g., S, M, L, XL  or  Small, Medium, Large",
    sizeOptionsHelp: "Optional: Enter size options separated by commas. If left empty, AI will generate appropriate sizes based on product type.",
    
    // Brand name field
    brandNameLabel: "Brand Name (Optional)",
    brandNamePlaceholder: "e.g., Your Brand Name",
    brandNameHelp: "Optional: Enter your brand name to be naturally incorporated into the title and description.",
    
    // Product notes field
    productNotesLabel: "Additional Product Info (Optional)",
    productNotesPlaceholder: "e.g., Handmade, Exclusive Design, Limited Edition...",
    productNotesHelp: "Optional: Add extra information about the product such as materials, craftsmanship, features, etc.",
    
    // Submit button
    submitButton: "Generate & Sync Product",
    submittingButton: "Generating...",
    
    // How it works section
    howItWorksTitle: "How It Works",
    step1Title: "1. Enter Keywords:",
    step1Desc: "Describe your product (e.g., \"Minimalist Ceramic Mug\", \"Handmade Resin Figurine\")",
    step2Title: "2. Optional Settings:",
    step2Image: "Image URL: Provide product image URL, AI will analyze and add to product",
    step2Size: "Size Options: Custom sizes (e.g., S/M/L/XL), or let AI generate automatically",
    step2Brand: "Brand Name: Add your brand, will be incorporated into title and description",
    step2Notes: "Additional Info: Add materials, craftsmanship, and other features",
    step3Title: "3. AI Generation:",
    step3Desc: "AI will intelligently create based on product type:",
    step3Item1: "SEO-optimized title and description",
    step3Item2: "Appropriate size variants (S/M/L for clothing, dimensions for decor, etc.)",
    step3Item3: "Reasonable pricing and SKU",
    step3Item4: "Relevant tags and SEO metadata",
    step4Title: "4. Auto Sync:",
    step4Desc: "Product is automatically created in your Shopify store",
  },
  zh: {
    // Page header
    pageTitle: "EZProduct - AI 产品生成器",
    pageSubtitle: "使用 AI 生成完整的产品列表并同步到您的商店",
    
    // Language toggle
    switchToEnglish: "English",
    switchToChinese: "中文",
    
    // Session refresh banner
    sessionRefreshedTitle: "会话已刷新",
    sessionRefreshedMessage: "您的会话令牌已刷新。请重新点击按钮生成产品。",
    
    // Error/Success banners
    errorTitle: "错误",
    successTitle: "成功！",
    successMessage: "产品已成功生成并同步！",
    viewProduct: "查看产品",
    
    // Form section
    formTitle: "生成新产品",
    
    // Keywords field
    keywordsLabel: "产品关键词",
    keywordsPlaceholder: "例如：陶瓷咖啡杯、瑜伽垫、宠物项圈",
    keywordsHelp: "输入描述产品的关键词。AI 将生成标题、描述、变体和 SEO 元数据。",
    keywordsRequired: "请输入产品关键词",
    
    // Image URL field
    imageUrlLabel: "产品图片链接（可选）",
    imageUrlPlaceholder: "https://example.com/product-image.jpg",
    imageUrlHelp: "可选：提供图片链接，AI 会分析图片并融入产品描述中。",
    
    // Size options field
    sizeOptionsLabel: "尺寸选项（可选）",
    sizeOptionsPlaceholder: "例如：S, M, L, XL  或  小号, 中号, 大号",
    sizeOptionsHelp: "可选：输入产品的尺寸选项，用逗号分隔。如不填写，AI 会根据产品类型自动生成合适的尺寸。",
    
    // Brand name field
    brandNameLabel: "品牌名称（可选）",
    brandNamePlaceholder: "例如：您的品牌名称",
    brandNameHelp: "可选：输入品牌名称，会自然地融入标题和描述中。",
    
    // Product notes field
    productNotesLabel: "产品补充说明（可选）",
    productNotesPlaceholder: "例如：手工制作，独家设计，限量版...",
    productNotesHelp: "可选：添加关于产品的额外信息，如材质、工艺、特色等，AI 会融入产品描述。",
    
    // Submit button
    submitButton: "生成并同步产品",
    submittingButton: "生成中...",
    
    // How it works section
    howItWorksTitle: "使用说明",
    step1Title: "1. 输入产品关键词：",
    step1Desc: '描述你的产品（如："极简陶瓷咖啡杯"、"手工树脂摆件"）',
    step2Title: "2. 可选设置：",
    step2Image: "图片链接：提供产品图片 URL，AI 会分析并添加到产品中",
    step2Size: "尺寸选项：自定义尺寸（如 S/M/L/XL），不填则 AI 智能生成",
    step2Brand: "品牌名称：添加你的品牌，会融入标题和描述",
    step2Notes: "补充说明：添加材质、工艺等特色信息",
    step3Title: "3. AI 生成：",
    step3Desc: "AI 会根据产品类型智能创建：",
    step3Item1: "SEO 优化的标题和描述",
    step3Item2: "适合产品类型的尺寸变体（服装用 S/M/L，摆件用尺寸等）",
    step3Item3: "合理的定价和 SKU",
    step3Item4: "相关标签和 SEO 元数据",
    step4Title: "4. 自动同步：",
    step4Desc: "产品自动创建到你的 Shopify 店铺",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

/**
 * Get translation for a key in the specified language
 */
export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || translations.en[key] || key;
}

/**
 * Get saved language preference from localStorage
 * Defaults to 'en' (English)
 */
export function getSavedLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem('ezproduct_language');
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    // Ignore localStorage errors
  }
  return 'en';
}

/**
 * Save language preference to localStorage
 */
export function saveLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ezproduct_language', lang);
  } catch {
    // Ignore localStorage errors
  }
}
