import Stripe from 'stripe';

const stripeApiVersion = '2026-04-22.dahlia' as const;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: stripeApiVersion,
});

const PRODUCTS = [
  {
    name: 'DataPresent Pro',
    description: '30 rapports/mois, tous formats export, templates sectoriels',
    prices: [
      { amount: 1900, interval: 'month', metadata: { plan: 'pro', interval: 'monthly' } },
    ],
  },
  {
    name: 'DataPresent Team',
    description: 'Rapports illimités, collaboration, white-label lite',
    prices: [
      { amount: 4900, interval: 'month', metadata: { plan: 'team', interval: 'monthly' } },
    ],
  },
];

async function createProductsAndPrices() {
  console.log('🚀 Creating DataPresent Stripe products and prices...\n');

  for (const productData of PRODUCTS) {
    console.log(`📦 Creating product: ${productData.name}`);

    const product = await stripe.products.create({
      name: productData.name,
      description: productData.description,
    });

    console.log(`   ✓ Product created: ${product.id}`);

    for (const priceData of productData.prices) {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceData.amount,
        currency: 'eur',
        recurring: {
          interval: priceData.interval as 'month',
        },
        metadata: priceData.metadata,
      });

      console.log(`   ✓ Price created: ${price.id} (${priceData.amount / 100}€/month)`);
    }
    console.log('');
  }

  console.log('✅ All products created successfully!\n');
  console.log('📝 Add these to your .env:');
  console.log('STRIPE_PRO_PRICE_ID=price_xxx (Pro monthly)');
  console.log('STRIPE_TEAM_PRICE_ID=price_xxx (Team monthly)');
}

createProductsAndPrices().catch(console.error);