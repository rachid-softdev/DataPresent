const { execSync } = require('child_process');

console.log('Testing Stripe webhooks for DataPresent...\n');

const webhooks = [
  {
    name: 'Checkout Session Completed',
    command: 'stripe trigger checkout.session.completed',
    description: 'Simulates successful subscription creation'
  },
  {
    name: 'Customer Subscription Updated',
    command: 'stripe trigger customer.subscription.updated',
    description: 'Simulates subscription update'
  },
  {
    name: 'Customer Subscription Deleted',
    command: 'stripe trigger customer.subscription.deleted',
    description: 'Simulates subscription cancellation'
  },
  {
    name: 'Invoice Payment Succeeded',
    command: 'stripe trigger invoice.payment_succeeded',
    description: 'Simulates successful payment'
  },
  {
    name: 'Invoice Payment Failed',
    command: 'stripe trigger invoice.payment_failed',
    description: 'Simulates failed payment'
  }
];

function runWebhookTest(webhook) {
  try {
    console.log(`\n--- Testing: ${webhook.name} ---`);
    console.log(`Description: ${webhook.description}`);
    console.log('Executing...');
    
    execSync(webhook.command, { stdio: 'inherit' });
    
    console.log(`\n✅ ${webhook.name} test completed!`);
    console.log('Check your application logs.');
    
  } catch (error) {
    console.error(`❌ Failed to test ${webhook.name}:`, error.message);
  }
}

const args = process.argv.slice(2);

if (args.length > 0) {
  const webhookName = args[0].toLowerCase();
  const webhook = webhooks.find(w => 
    w.name.toLowerCase().includes(webhookName) || 
    w.command.includes(webhookName)
  );
  
  if (webhook) {
    runWebhookTest(webhook);
  } else {
    console.error('Webhook not found. Available webhooks:');
    webhooks.forEach(w => console.log(`  - ${w.name.toLowerCase()}`));
    process.exit(1);
  }
} else {
  console.log('Available webhooks:');
  webhooks.forEach((w, i) => console.log(`  ${i + 1}. ${w.name} - ${w.description}`));
  console.log('\nUsage: node scripts/stripe-test-webhooks.js <webhook-name>');
  console.log('Example: node scripts/stripe-test-webhooks.js checkout');
}

// Check Stripe CLI
try {
  execSync('stripe config --list', { stdio: 'pipe' });
} catch {
  console.error('⚠️  Stripe CLI not configured. Run: npm run stripe:setup');
}