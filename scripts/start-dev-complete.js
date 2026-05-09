#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 Starting DataPresent Complete Development Environment...\n');

let runningProcesses = [];

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    const examplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(examplePath)) {
      console.log('   Creating .env.local from .env.example...');
      fs.copyFileSync(examplePath, envPath);
    }
  }

  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=').replace(/^"|"$/g, '');
        }
      }
    });
  }
}

function checkPostgres() {
  try {
    execSync('psql --version', { stdio: 'pipe' });
    console.log('✅ PostgreSQL client is available');
    return true;
  } catch {
    console.log('⚠️  PostgreSQL client not found');
    console.log('   On Windows: install PostgreSQL from https://www.postgresql.org/download/windows/');
    console.log('   On macOS: brew install postgresql');
    console.log('   On Linux: sudo apt-get install postgresql');
    return false;
  }
}

function checkRedis() {
  const net = require('net');
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 2000;
    
    const redisHost = process.env.REDIS_URL?.replace(/redis:\/\//, '').split(':')[0] || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_URL?.replace(/redis:\/\//, '').split(':')[1] || '6379');
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      console.log('✅ Redis is available');
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      console.log('⚠️  Redis not reachable on ' + redisHost + ':' + redisPort);
      console.log('   Make sure Redis is running on WSL Ubuntu');
      resolve(false);
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      console.log('⚠️  Redis not reachable:', err.message);
      console.log('   Make sure Redis is running on WSL Ubuntu');
      resolve(false);
    });
    
    socket.connect(redisPort, redisHost);
  });
}

function isMailHogRunning() {
  try {
    execSync('netstat -an | findstr ":1025"', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function startMailHog() {
  return new Promise((resolve) => {
    if (isMailHogRunning()) {
      console.log('✅ MailHog is already running');
      return resolve();
    }

    const mailhogDir = path.join(process.cwd(), '.mailhog');
    const platform = os.platform();
    const mailhogFile = platform === 'win32' ? 'MailHog.exe' : 'MailHog';
    const mailhogBinary = path.join(mailhogDir, mailhogFile);

    if (!fs.existsSync(mailhogBinary)) {
      console.log('📥 MailHog not found, downloading...');
      try {
        execSync('node scripts/setup-mailhog.js', { stdio: 'inherit' });
      } catch (error) {
        console.log('⚠️  Failed to setup MailHog - skipping email testing');
        return resolve();
      }
    }

    console.log('📧 Starting MailHog...');
    try {
      const mailhog = spawn(mailhogBinary, [], {
        stdio: 'pipe',
        detached: true
      });
      mailhog.unref();

      setTimeout(() => {
        if (isMailHogRunning()) {
          console.log('✅ MailHog started successfully');
          console.log('🌐 MailHog UI: http://localhost:8025');
          console.log('📮 SMTP: localhost:1025');
        }
      }, 2000);
    } catch (error) {
      console.log('⚠️  Failed to start MailHog:', error.message);
    }

    resolve();
  });
}

function setupDatabase() {
  try {
    console.log('🗄️  Setting up PostgreSQL database...');

    const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
    if (!fs.existsSync(prismaClientPath)) {
      console.log('   Generating Prisma client...');
      execSync('npx prisma generate', { stdio: 'inherit' });
    } else {
      console.log('   Prisma client already exists');
    }

    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✅ Database setup complete');
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n💡 Make sure PostgreSQL is running with correct credentials in .env.local');
    return false;
  }
}

function getPidOnPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, { stdio: 'pipe' }).toString();
    const lines = out.trim().split('\n').filter(l => l.includes('LISTENING'));
    if (!lines.length) return null;
    const parts = lines[0].trim().split(/\s+/);
    return parts[parts.length - 1];
  } catch {
    return null;
  }
}

async function killPort(port) {
  const pid = getPidOnPort(port);
  if (!pid) return;

  console.log(`⚠️  Port ${port} occupied by PID ${pid} — killing...`);
  try {
    execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'pipe' });
  } catch {}
  await new Promise(r => setTimeout(r, 1000));
}

function writeEnvKey(key, value) {
  const envPath = path.join(process.cwd(), '.env.local');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  
  if (new RegExp(`^${key}=`, 'm').test(content)) {
    content = content.replace(new RegExp(`^${key}=.*`, 'm'), `${key}="${value}"`);
  } else {
    content += `\n${key}="${value}"\n`;
  }
  fs.writeFileSync(envPath, content);
}

function startStripeWebhook() {
  return new Promise((resolve) => {
    console.log('💳 Starting Stripe webhook forwarding...');

    try {
      execSync('stripe --version', { stdio: 'pipe' });
    } catch {
      console.log('⚠️  Stripe CLI not installed — skipping webhook.');
      return resolve();
    }

    try {
      execSync('stripe config --list', { stdio: 'pipe' });
    } catch {
      console.log('⚠️  Stripe CLI not logged in — skipping webhook.');
      return resolve();
    }

    const webhook = spawn('stripe', ['listen', '--forward-to', 'localhost:3000/api/stripe/webhook'], {
      stdio: ['pipe', 'pipe', 'pipe'], detached: true
    });
    runningProcesses.push(webhook);

    let resolved = false;
    webhook.stdout.on('data', (data) => {
      const output = data.toString();
      const secretMatch = output.match(/whsec_[a-zA-Z0-9]+/);
      if (secretMatch) {
        writeEnvKey('STRIPE_WEBHOOK_SECRET', secretMatch[0]);
        console.log('🔐 STRIPE_WEBHOOK_SECRET saved to .env.local');
      }
      if (!resolved && output.includes('Ready!')) {
        resolved = true;
        console.log('✅ Stripe webhook ready');
        webhook.unref();
        resolve();
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('✅ Stripe webhook started (timeout)');
        webhook.unref();
        resolve();
      }
    }, 10000);
  });
}

function setupStripeProducts() {
  try {
    console.log('💳 Setting up Stripe products...');
    execSync('npx tsx scripts/create-stripe-products.ts', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Stripe products setup skipped:', error.message);
  }
}

function cleanup() {
  console.log('\n🛑 Stopping all services...');
  runningProcesses.forEach(proc => {
    try { if (proc && !proc.killed) proc.kill('SIGTERM'); } catch {}
  });
  try {
    execSync('taskkill /F /IM stripe.exe', { stdio: 'pipe' });
  } catch {}
  try {
    execSync('taskkill /F /IM MailHog.exe', { stdio: 'pipe' });
  } catch {}
  console.log('✅ All services stopped');
  process.exit(0);
}

async function startWorkers() {
  try {
    console.log('⚙️  Starting BullMQ workers...');
    execSync('npx tsx scripts/start-workers.ts', { 
      stdio: 'inherit', 
      shell: true,
      detached: true 
    });
    console.log('✅ Workers started');
  } catch (error) {
    console.log('⚠️  Workers failed to start:', error.message);
  }
}

async function startMailHogService() {
  try {
    console.log('📧 Starting MailHog service...');
    await startMailHog();
  } catch (error) {
    console.log('⚠️  MailHog failed to start:', error.message);
  }
}

async function main() {
  try {
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    loadEnv();

    const hasPostgres = checkPostgres();
    const hasRedis = await checkRedis();

    if (!hasPostgres || !hasRedis || !setupDatabase()) {
      console.log('\n⚠️  Continuing anyway - some features may not work');
    }
    console.log('');

    await killPort(3000);

    console.log('🚀 Starting Next.js development server...\n');
    const nextDev = spawn('next', ['dev'], { stdio: 'inherit', shell: true });
    runningProcesses.push(nextDev);

    nextDev.on('close', (code) => {
      console.log(`Next.js exited with code ${code}`);
      cleanup();
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    await startStripeWebhook();
    console.log('');

    await startMailHogService();
    console.log('');

    setupStripeProducts();

    await startWorkers();
    console.log('');

    console.log('🌟 Development environment is ready!');
    console.log('');
    console.log('📊 Services:');
    console.log('   • PostgreSQL  → Configure in .env.local');
    console.log('   • Redis       → Configure in .env.local');
    console.log('   • Next.js     → http://localhost:3000');
    console.log('   • Stripe      → localhost:3000/api/stripe/webhook');
    console.log('   • Workers     → Generate & Export queues');
    console.log('   • MailHog     → http://localhost:8025 (SMTP: 1025)');

  } catch (error) {
    console.error('❌ Failed to start:', error.message);
    cleanup();
  }
}

main();