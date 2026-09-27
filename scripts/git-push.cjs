const { execSync } = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch (err) {
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    throw err;
  }
}

function autoPush(customMsg) {
  console.log('🔍 Checking git status...');
  const status = run('git status --porcelain');
  
  if (!status) {
    console.log('✅ Working tree clean. Checking if local commits need pushing...');
    try {
      const unpushed = run('git log origin/main..HEAD --oneline');
      if (unpushed) {
        console.log('🚀 Pushing unpushed commits to origin main...');
        execSync('git push origin main', { stdio: 'inherit' });
        console.log('🎉 Successfully pushed to GitHub!');
      } else {
        console.log('✨ Everything is already up to date on GitHub.');
      }
    } catch {
      console.log('🚀 Running git push origin main...');
      execSync('git push origin main', { stdio: 'inherit' });
    }
    return;
  }

  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false
  });

  const commitMsg = customMsg || `auto-sync: update project changes (${timestamp})`;

  console.log('📦 Staging changes...');
  execSync('git add .', { stdio: 'inherit' });

  console.log(`📝 Committing: "${commitMsg}"...`);
  try {
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  } catch {
    console.log('Nothing new to commit.');
  }

  console.log('🚀 Pushing to origin main...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('🎉 Successfully committed and pushed to GitHub!');
}

const customMessage = process.argv.slice(2).join(' ');
try {
  autoPush(customMessage);
} catch (err) {
  console.error('❌ Failed to push changes:', err.message);
  process.exit(1);
}
