const requiredVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'REDIS_URL',
];

const optionalVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_ID',
  'GITHUB_SECRET',
  'RESEND_API_KEY',
  'GOOGLE_SHEETS_CLIENT_EMAIL',
  'GOOGLE_SHEETS_PRIVATE_KEY',
  'STRIPE_PRO_PRICE_ID',
  'STRIPE_TEAM_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
];

console.log('🔍 Checking environment variables...\n');

let missingRequired = [];

for (const varName of requiredVars) {
  if (process.env[varName]) {
    console.log(`✅ ${varName}`);
  } else {
    console.log(`❌ ${varName} - REQUIRED`);
    missingRequired.push(varName);
  }
}

console.log('\n📋 Optional variables:');
for (const varName of optionalVars) {
  if (process.env[varName]) {
    console.log(`✅ ${varName}`);
  } else {
    console.log(`⚪ ${varName} - not set`);
  }
}

if (missingRequired.length > 0) {
  console.log('\n❌ Missing required variables!');
  console.log('Please add these to your .env.local:');
  missingRequired.forEach(v => console.log(`  ${v}=...`));
  process.exit(1);
} else {
  console.log('\n✅ All required variables are set!');
}