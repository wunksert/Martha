import 'dotenv/config';
import prisma from '../src/prisma.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  description: string;
  descriptionHtml: string;
  variants: {
    edges: Array<{
      node: {
        compareAtPrice: string | null;
      };
    }>;
  };
  media: {
    edges: Array<{
      node: {
        image?: {
          url: string;
          altText: string | null;
        };
      };
    }>;
  };
}

interface ProductsResponse {
  data: {
    products: {
      edges: Array<{
        node: ShopifyProduct;
      }>;
    };
  };
}

function extractCompareAtPrices(variants: ShopifyProduct['variants']): {
  min: string | null;
  max: string | null;
  currencyCode: string | null;
} {
  const prices = variants.edges
    .map((edge) => edge.node.compareAtPrice)
    .filter((price): price is string => price !== null)
    .map((price) => parseFloat(price));

  if (prices.length === 0) {
    return { min: null, max: null, currencyCode: null };
  }

  const min = Math.min(...prices).toString();
  const max = Math.max(...prices).toString();
  // Default to USD for now, as we don't have currency info in the query
  return { min, max, currencyCode: 'USD' };
}

function extractMedia(media: ShopifyProduct['media']): string {
  const mediaArray = media.edges
    .map((edge) => edge.node.image)
    .filter((img): img is { url: string; altText: string | null } => img !== undefined)
    .map((img) => ({
      url: img.url,
      altText: img.altText || null,
    }));

  return JSON.stringify(mediaArray);
}

async function seedProducts() {
  try {
    const productsPath = join(__dirname, '..', 'products.json');
    const productsData = JSON.parse(
      readFileSync(productsPath, 'utf-8')
    ) as ProductsResponse;

    const shop = process.env.STORE_DOMAIN?.replace('.myshopify.com', '') || 'riley-sandbox-112024';

    console.log(`Seeding ${productsData.data.products.edges.length} products...`);

    for (const edge of productsData.data.products.edges) {
      const product = edge.node;
      const compareAtPrices = extractCompareAtPrices(product.variants);
      const mediaJson = extractMedia(product.media);

      // Extract Shopify ID from GID format: gid://shopify/Product/8672056148218
      const shopifyId = product.id.split('/').pop() || product.id;

      try {
        await prisma.product.upsert({
          where: { shopifyId },
          update: {
            title: product.title,
            handle: product.handle,
            status: product.status,
            description: product.description || null,
            descriptionHtml: product.descriptionHtml || null,
            compareAtPriceMin: compareAtPrices.min,
            compareAtPriceMax: compareAtPrices.max,
            compareAtPriceCurrencyCode: compareAtPrices.currencyCode,
            media: mediaJson || null,
            shop,
          },
          create: {
            shopifyId,
            shop,
            title: product.title,
            handle: product.handle,
            status: product.status,
            description: product.description || null,
            descriptionHtml: product.descriptionHtml || null,
            compareAtPriceMin: compareAtPrices.min,
            compareAtPriceMax: compareAtPrices.max,
            compareAtPriceCurrencyCode: compareAtPrices.currencyCode,
            media: mediaJson || null,
          },
        });

        console.log(`✓ Seeded: ${product.title}`);
      } catch (error) {
        console.error(`✗ Failed to seed ${product.title}:`, error);
      }
    }

    console.log('\n✅ Seeding complete!');
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedProducts();

