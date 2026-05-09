#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔧 Setting up Stripe CLI for DataPresent...\n');

function checkStripeCLI() {
  try {
    execSync('stripe --version', { stdio: 'pipe' });
    console.log('✅ Stripe CLI is installed');
    return true;
  } catch (error) {
    console.error('❌ Stripe CLI is not installed');
    console.log('\n📦 Please install Stripe CLI:');
    console.log('  Windows: https://stripe.com/docs/stripe-cli');
    console.log('  macOS: brew install stripe/stripe-cli/stripe');
    console.log('  Linux: curl -s https://packages.stripe.com/api/security/keypairs/stripe-cli-gpg/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg');
    console.log('         echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.com/stripe-cli-debian/ stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list');
    console.log('         sudo apt-get update && sudo apt-get install stripe');
    return false;
  }
}

function checkStripeLogin() {
  try {
    execSync('stripe config --list', { stdio: 'pipe' });
    console.log('✅ Stripe CLI is configured');
    return true;
  } catch (error) {
    console.log('⚠️  Stripe CLI needs to be logged in');
    return false;
  }
}

function stripeLogin() {
  try {
    console.log('📝 Please login to Stripe...');
    execSync('stripe login', { stdio: 'inherit' });
    console.log('✅ Successfully logged in to Stripe');
    return true;
  } catch (error) {
    console.error('❌ Failed to login to Stripe');
    return false;
  }
}

function startStripeWebhook() {
  return new Promise((resolve, reject) => {
    console.log('📡 Starting Stripe webhook forwarding...');

    const webhook = spawn('stripe', ['listen', '--forward-to', 'localhost:3000/api/stripe/webhook', '--events', 'checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted'], {
      stdio: 'pipe',
      detached: true
    });

    webhook.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);

      if (output.includes('Ready!')) {
        console.log('✅ Stripe webhook forwarding started');
        webhook.unref();
        resolve();
      }
    });

    webhook.stderr.on('data', (data) => {
      console.error('Stripe:', data.toString());
    });

    webhook.on('error', (error) => {
      console.error('❌ Failed to start Stripe webhook:', error.message);
      reject(error);
    });

    setTimeout(() => {
      if (!webhook.killed) {
        console.log('⚠️  Stripe webhook may not have started (timeout)');
      }
    }, 15000);
  });
}

function createWebhookSecret() {
  try {
    const result = execSync('stripe listen --print-json 2>&1', { encoding: 'utf8' });
    const match = result.match(/whsec_[a-zA-Z0-9]+/);
    if (match) {
      const webhookSecret = match[0];
      console.log('\n🔑 Your webhook secret:');
      console.log(`   ${webhookSecret}`);
      console.log('\n📝 Add to your .env.local:');
      console.log(`   STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
      return webhookSecret;
    }
  } catch (error) {
    console.log('⚠️  Could not extract webhook secret automatically');
  }
  return null;
}

async function main() {
  console.log('Stripe CLI Setup for DataPresent\n');

  if (!checkStripeCLI()) {
    process.exit(1);
  }

  if (!checkStripeLogin()) {
    console.log('\nTo login, run: stripe login');
    console.log('Or skip if you just want to forward events\n');
  }

  try {
    await startStripeWebhook();
    createWebhookSecret();

    console.log('\n✅ Stripe CLI setup complete!');
    console.log('\n📋 Available commands:');
    console.log('  stripe trigger checkout.session.completed');
    console.log('  stripe trigger customer.subscription.created');
    console.log('  stripe trigger invoice.paid');
    console.log('\n🛑 To stop: npm run stripe:stop');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();