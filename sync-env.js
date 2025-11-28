#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootEnv = path.join(__dirname, '.env');
const webEnv = path.join(__dirname, 'apps', 'web', '.env.local');

if (fs.existsSync(rootEnv)) {
    fs.copyFileSync(rootEnv, webEnv);
    console.log('✅ Copied .env to apps/web/.env.local');
} else {
    console.error('❌ .env file not found at root');
    process.exit(1);
}
