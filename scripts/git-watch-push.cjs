const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEBOUNCE_MS = 6000; // Wait 6 seconds after the last edit before pushing

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.gemini',
  'scratch'
]);

let timeoutId = null;
let isPushing = false;

function hasGitChanges() {
  try {
    const status = execSync('git status --porcelain', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

function triggerAutoPush() {
  if (isPushing) return;
  if (!hasGitChanges()) return;

  isPushing = true;
  console.log('\n🔄 [Auto-Git] File changes detected. Starting automated push...');

  try {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: false
    });

    execSync('git add .', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync(`git commit -m "auto-sync: changes at ${timestamp}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('🚀 [Auto-Git] Pushing to origin main...');
    execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('✅ [Auto-Git] Successfully pushed all changes to GitHub!\n');
  } catch (err) {
    console.error('⚠️ [Auto-Git] Error during auto-push:', err.message);
  } finally {
    isPushing = false;
  }
}

function schedulePush(filename) {
  if (isPushing) return;
  if (timeoutId) clearTimeout(timeoutId);

  console.log(`📝 [Auto-Git] Change detected in ${filename || 'project'}. Scheduled push in ${DEBOUNCE_MS / 1000}s...`);
  timeoutId = setTimeout(() => {
    triggerAutoPush();
  }, DEBOUNCE_MS);
}

console.log('👁️  [Auto-Git] Watching repository for changes...');
console.log('📁 Root:', ROOT_DIR);
console.log('⏳ Any file change will automatically commit and push to GitHub.');

fs.watch(ROOT_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  const parts = filename.split(/[\\/]/);
  if (parts.some(p => IGNORED_DIRS.has(p))) return;
  if (filename.endsWith('.log') || filename.endsWith('.tmp')) return;

  schedulePush(filename);
});
