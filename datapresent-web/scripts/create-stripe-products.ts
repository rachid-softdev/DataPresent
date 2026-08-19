import Stripe from "stripe";

const stripeApiVersion = "2026-06-24.dahlia" as const;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: stripeApiVersion,
});

const PRODUCTS = [
  {
    name: "DataPresent Starter",
    description: "30 rapports/mois, tous formats export, templates sectoriels",
    prices: [
      { amount: 1900, interval: "month", metadata: { plan: "starter", interval: "monthly" } },
    ],
  },
  {
    name: "DataPresent Pro",
    description: "Rapports illimités, collaboration, API",
    prices: [{ amount: 4900, interval: "month", metadata: { plan: "pro", interval: "monthly" } }],
  },
];

async function createProductsAndPrices() {
  console.log("🚀 Creating DataPresent Stripe products and prices...\n");

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
        currency: "eur",
        recurring: {
          interval: priceData.interval as "month",
        },
        metadata: priceData.metadata,
      });

      console.log(`   ✓ Price created: ${price.id} (${priceData.amount / 100}€/month)`);
    }
    console.log("");
  }

  console.log("✅ All products created successfully!\n");
  console.log("📝 Add these to your .env:");
  console.log("STRIPE_PRICE_STARTER_MONTHLY=price_xxx (Starter monthly)");
  console.log("STRIPE_PRICE_PRO_MONTHLY=price_xxx (Pro monthly)");
}

createProductsAndPrices().catch(console.error);
