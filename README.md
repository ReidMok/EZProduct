# EZProduct - Shopify App

AI-powered product generator and sync tool for Shopify stores. Automatically generates complete product listings including titles, descriptions, variants, pricing, and SEO metadata using Google Gemini AI.

## Features

- 🤖 **AI-Powered Generation**: Uses Google Gemini 1.5 Pro to generate complete product information
- 📦 **Auto-Sync to Shopify**: Automatically creates products in your Shopify store via GraphQL API
- 📊 **Smart Variants**: Generates 3 size variants (6", 8", 10") with automatic cm/inch conversion
- 🏷️ **SEO Optimization**: Includes SEO titles, descriptions, and relevant tags
- 📝 **Generation History**: Tracks all generated products in database
- 🖼️ **Image Support**: Optional image URL input for AI analysis

## Tech Stack

- **Framework**: Remix (React-based)
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (production)
- **UI**: Shopify Polaris Design System
- **AI**: Google Gemini 1.5 Pro API
- **API**: Shopify GraphQL API

## Prerequisites

- Node.js 18+ 
- Shopify CLI
- Google Gemini API Key
- Shopify Partner Account

## Installation

1. **Clone and Install Dependencies**
   ```bash
   cd ai-product-pro
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in:
   - `SHOPIFY_API_KEY` - From your Shopify Partner Dashboard
   - `SHOPIFY_API_SECRET` - From your Shopify Partner Dashboard
   - `GEMINI_API_KEY` - From Google AI Studio
   - `SHOPIFY_APP_URL` - Your app's public URL
   - `DATABASE_URL` - SQLite path or PostgreSQL connection string

3. **Initialize Database**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Configure Shopify App**
   - Update `shopify.app.toml` with your app details
   - Set `client_id` from Shopify Partner Dashboard
   - Configure `redirect_urls` and `application_url`

## Development

```bash
# Start development server
npm run dev

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Project Structure

```
ai-product-pro/
├── app/
│   ├── routes/
│   │   └── app._index.tsx      # Main product generation UI
│   ├── utils/
│   │   ├── ai.generator.ts     # AI product generation logic
│   │   └── shopify.sync.ts     # Shopify API sync logic
│   ├── db.server.ts            # Prisma client
│   ├── shopify.server.ts       # Shopify authentication
│   └── root.tsx                # App shell
├── prisma/
│   └── schema.prisma           # Database schema
├── shopify.app.toml           # Shopify app configuration
└── package.json
```

## Usage

1. **Install the App** in your Shopify store
2. **Navigate to the App** in your Shopify admin
3. **Enter Product Keywords** (e.g., "Three Divers Resin Night Light")
4. **Optionally add Image URL** for AI analysis
5. **Click "Generate & Sync Product"**
6. **Product is automatically created** in your store!

## API Integration

### AI Generation

The app uses Google Gemini 1.5 Pro to generate:
- SEO-optimized product titles
- Detailed HTML descriptions with size conversion tables
- 3 size variants with pricing
- SKU generation (BJ140XXX format)
- Relevant tags and SEO metadata

### Shopify Sync

Products are created via Shopify GraphQL API with:
- Product title and description
- Variants with pricing and SKU
- Product images (if provided)
- SEO metafields
- Tags and product type

## Database Schema

- **Shop**: Stores shop information and access tokens
- **ProductGeneration**: Tracks all AI-generated products with status

## Environment Variables

```env
# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=write_products,read_products
SHOPIFY_APP_URL=https://your-app-url.com

# Database
DATABASE_URL="file:./dev.db"  # SQLite for dev
# DATABASE_URL="postgresql://..."  # PostgreSQL for production

# AI
GEMINI_API_KEY=your_gemini_api_key
```

## Deployment

1. **Build the App**
   ```bash
   npm run build
   ```

2. **Deploy to Shopify**
   ```bash
   npm run deploy
   ```

3. **Update Database** (if using PostgreSQL)
   - Set `DATABASE_URL` to production PostgreSQL
   - Run migrations: `npm run db:migrate`

## Image Hosting (Optional)

For image upload support, integrate with:
- **Cloudinary**: Cloud-based image hosting
- **AWS S3**: Self-hosted solution
- **Shopify Files API**: Direct upload to Shopify

See `app/utils/image.upload.ts` (to be implemented) for image handling.

## Troubleshooting

### "GEMINI_API_KEY is not set"
- Ensure `.env` file exists and contains `GEMINI_API_KEY`
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### "Failed to sync product to Shopify"
- Check Shopify API credentials
- Verify app has `write_products` scope
- Check Shopify API rate limits

### Database errors
- Run `npm run db:generate` to regenerate Prisma client
- Run `npm run db:migrate` to apply migrations
- Check `DATABASE_URL` is correct

## License

MIT

## Support

For issues and questions, please open an issue in the repository.

