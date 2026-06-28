const path = require('path');

// Port configuration
const PORT = process.env.PORT || 4000;

// Content root is the root of the knowledge base (two levels up from app/config/)
const CONTENT_ROOT = path.resolve(__dirname, '..', '..');

// Directories to exclude from the file tree
const EXCLUDED = new Set(['app', 'node_modules', '.git', '.vscode', '.idea', '.playwright-mcp', '.ruff_cache', '.vercel', '_bases', 'daily']);

// Topic icons for the landing page
const TOPIC_ICONS = {
  // Web / frontend
  react: '⚛️', typescript: '🔷', javascript: '🟨',
  flutter: '💙', flutter_dart: '💙', dart: '💙',
  // Backend / infra
  devops: '🚀', devOPS: '🚀', postgresql: '🐘', sql: '🐘',
  docker: '🐳', kubernetes: '☸️', git: '🌿',
  cloud: '☁️', cloud_deployment: '☁️',
  // Systems / networks
  system_design: '🏗️', 'system design': '🏗️',
  'system-design': '🏗️', system_design_notes: '🏗️',
  api_security: '🔐', security: '🔐', api: '🔌',
  computer_networks: '🌐', networks: '🌐',
  operating_systems: '💻', 'operating systems': '💻',
  // Languages
  python: '🐍', rust: '🦀', go: '🐹', java: '☕',
  // Our new sections
  'database-notes': '🗄️', database: '🗄️',
  'golang-notes': '🐹', golang: '🐹',
  'js-notes': '🟡', js: '🟡',
  'system-design-notes': '🏗️',
  web3: '🔗', solidity: '🔗', blockchain: '🔗', solana: '◎',
  // Misc
  react19: '⚛️',
  springboot: '☕', spring: '☕', java: '☕',
};

module.exports = {
  PORT,
  CONTENT_ROOT,
  EXCLUDED,
  TOPIC_ICONS,
};
