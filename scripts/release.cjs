#!/usr/bin/env node

/**
 * Solo MMO: Midgard Camp - Release Automation Script
 * Handles version bumping, changelog updating, build verification, and git tagging.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');
const PKG_LOCK_PATH = path.join(ROOT_DIR, 'package-lock.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

// Colors for terminal output
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

function log(msg = '') {
  console.log(msg);
}

function success(msg) {
  console.log(`${c.green}✔ ${msg}${c.reset}`);
}

function warn(msg) {
  console.log(`${c.yellow}⚠ ${msg}${c.reset}`);
}

function error(msg) {
  console.error(`${c.red}✖ ${msg}${c.reset}`);
}

function info(msg) {
  console.log(`${c.cyan}ℹ ${msg}${c.reset}`);
}

// Readline prompt helper
function createPrompter() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return {
    ask(question, defaultVal = '') {
      return new Promise((resolve) => {
        const promptText = defaultVal
          ? `${question} ${c.gray}[${defaultVal}]${c.reset}: `
          : `${question}: `;
        rl.question(promptText, (answer) => {
          resolve(answer.trim() || defaultVal);
        });
      });
    },
    close() {
      rl.close();
    }
  };
}

// Semver parse and bump
function parseSemver(ver) {
  const match = ver.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || ''
  };
}

function computeNextVersion(currentVer, type) {
  const parsed = parseSemver(currentVer);
  if (!parsed) {
    throw new Error(`Cannot parse current version: "${currentVer}"`);
  }

  const { major, minor, patch } = parsed;

  switch (type.toLowerCase()) {
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
    default:
      if (parseSemver(type)) {
        return type;
      }
      return null;
  }
}

// Git command runner
function runGit(args, options = {}) {
  try {
    const res = spawnSync('git', args, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      shell: true,
      ...options
    });
    return {
      status: res.status,
      stdout: (res.stdout || '').trim(),
      stderr: (res.stderr || '').trim()
    };
  } catch (err) {
    return { status: 1, stdout: '', stderr: err.message };
  }
}

function checkGitAvailable() {
  const res = runGit(['--version']);
  return res.status === 0;
}

function checkGitRepo() {
  const res = runGit(['rev-parse', '--is-inside-work-tree']);
  return res.status === 0 && res.stdout === 'true';
}

function checkGitHubCliAvailable() {
  try {
    const res = spawnSync('gh', ['--version'], { shell: true, encoding: 'utf8' });
    return res.status === 0;
  } catch {
    return false;
  }
}

// Update CHANGELOG.md
function updateChangelog(newVersion, description) {
  const today = new Date().toISOString().slice(0, 10);
  const newEntryHeader = `## [${newVersion}] - ${today}`;
  const notes = description ? `- ${description}` : `- Release version ${newVersion}`;
  const newSection = `\n${newEntryHeader}\n### Added/Changed\n${notes}\n`;

  if (!fs.existsSync(CHANGELOG_PATH)) {
    const initialContent = `# Changelog\n\nAll notable changes to **Solo MMO: Midgard Camp** will be documented in this file.\n\n---\n${newSection}`;
    fs.writeFileSync(CHANGELOG_PATH, initialContent, 'utf8');
    return;
  }

  const content = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const dividerIndex = content.indexOf('---');

  let updatedContent = '';
  if (dividerIndex !== -1) {
    const header = content.slice(0, dividerIndex + 3);
    const body = content.slice(dividerIndex + 3);
    updatedContent = `${header}\n${newSection}${body}`;
  } else {
    // Append near top after first markdown heading
    const firstHeaderMatch = content.match(/^#\s+.+$/m);
    if (firstHeaderMatch) {
      const idx = firstHeaderMatch.index + firstHeaderMatch[0].length;
      updatedContent = content.slice(0, idx) + '\n' + newSection + content.slice(idx);
    } else {
      updatedContent = newSection + '\n' + content;
    }
  }

  fs.writeFileSync(CHANGELOG_PATH, updatedContent, 'utf8');
}

async function main() {
  log(`\n${c.bold}${c.cyan}======================================================${c.reset}`);
  log(`${c.bold}${c.cyan}  ⚔️  Solo MMO: Midgard Camp - Release Automation  ⚔️${c.reset}`);
  log(`${c.bold}${c.cyan}======================================================${c.reset}\n`);

  if (!fs.existsSync(PKG_PATH)) {
    error('package.json not found in project root!');
    process.exit(1);
  }

  const pkgRaw = fs.readFileSync(PKG_PATH, 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const currentVersion = pkg.version || '1.0.0';

  log(`Current version: ${c.bold}${c.green}v${currentVersion}${c.reset}\n`);

  // CLI Arguments
  const args = process.argv.slice(2);
  let requestedType = null;
  let customMessage = '';
  let skipBuild = false;
  let autoYes = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--skip-build' || arg === '--no-build') {
      skipBuild = true;
    } else if (arg === '-y' || arg === '--yes') {
      autoYes = true;
    } else if (arg === '-m' || arg === '--message') {
      customMessage = args[i + 1] || '';
      i++;
    } else if (!requestedType) {
      requestedType = arg;
    } else if (!customMessage) {
      customMessage = arg;
    }
  }

  const prompter = createPrompter();

  let nextVersion = null;

  try {
    if (requestedType) {
      nextVersion = computeNextVersion(currentVersion, requestedType);
      if (!nextVersion) {
        error(`Invalid version or release type: "${requestedType}"`);
        prompter.close();
        process.exit(1);
      }
    } else {
      const patchVer = computeNextVersion(currentVersion, 'patch');
      const minorVer = computeNextVersion(currentVersion, 'minor');
      const majorVer = computeNextVersion(currentVersion, 'major');

      log(`Select release type:`);
      log(`  ${c.bold}1)${c.reset} Patch   ${c.gray}(${currentVersion} -> ${c.green}${patchVer}${c.gray}) - Bug fixes & tweaks`);
      log(`  ${c.bold}2)${c.reset} Minor   ${c.gray}(${currentVersion} -> ${c.green}${minorVer}${c.gray}) - New features, items, balance`);
      log(`  ${c.bold}3)${c.reset} Major   ${c.gray}(${currentVersion} -> ${c.green}${majorVer}${c.gray}) - Major overhauls & milestones`);
      log(`  ${c.bold}4)${c.reset} Custom  ${c.gray}(Specify manual version)`);
      log(`  ${c.bold}0)${c.reset} Cancel\n`);

      const choice = await prompter.ask('Enter choice [1-4, 0]', '1');

      if (choice === '0' || choice.toLowerCase() === 'cancel') {
        info('Release cancelled.');
        prompter.close();
        process.exit(0);
      } else if (choice === '1' || choice.toLowerCase() === 'patch') {
        nextVersion = patchVer;
      } else if (choice === '2' || choice.toLowerCase() === 'minor') {
        nextVersion = minorVer;
      } else if (choice === '3' || choice.toLowerCase() === 'major') {
        nextVersion = majorVer;
      } else if (choice === '4' || choice.toLowerCase() === 'custom') {
        const inputVer = await prompter.ask('Enter custom semver version (e.g. 1.2.0)');
        if (!parseSemver(inputVer)) {
          error(`Invalid semantic version: "${inputVer}"`);
          prompter.close();
          process.exit(1);
        }
        nextVersion = inputVer;
      } else {
        error('Invalid option selected.');
        prompter.close();
        process.exit(1);
      }
    }

    if (!customMessage && !autoYes) {
      customMessage = await prompter.ask('\nEnter release description / changelog note (optional)');
    }

    log(`\nTarget Release: ${c.bold}${c.green}v${nextVersion}${c.reset}`);
    if (customMessage) {
      log(`Release Note:   ${c.cyan}${customMessage}${c.reset}`);
    }

    if (!autoYes) {
      const confirm = await prompter.ask('\nProceed with release? (Y/n)', 'Y');
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        info('Release cancelled.');
        prompter.close();
        process.exit(0);
      }
    }

    // Step 1: Build verification
    if (!skipBuild) {
      log(`\n${c.bold}📦 [1/5] Running build & typecheck verification...${c.reset}`);
      try {
        execSync('npm run build', {
          cwd: ROOT_DIR,
          stdio: 'inherit',
          shell: true
        });
        success('Build verification succeeded!');
      } catch (err) {
        error('Build failed! Release halted to prevent publishing broken code.');
        prompter.close();
        process.exit(1);
      }
    } else {
      info('[1/5] Skipping build check (--skip-build).');
    }

    // Backup state in case of failure
    const originalPkgContent = pkgRaw;
    const hasPkgLock = fs.existsSync(PKG_LOCK_PATH);
    const originalLockContent = hasPkgLock ? fs.readFileSync(PKG_LOCK_PATH, 'utf8') : null;
    const hasChangelog = fs.existsSync(CHANGELOG_PATH);
    const originalChangelog = hasChangelog ? fs.readFileSync(CHANGELOG_PATH, 'utf8') : null;

    try {
      // Step 2: Update package.json
      log(`\n${c.bold}📝 [2/5] Updating version in package.json...${c.reset}`);
      pkg.version = nextVersion;
      fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      success(`package.json updated to v${nextVersion}`);

      // Update package-lock.json if present
      if (hasPkgLock) {
        const pkgLock = JSON.parse(originalLockContent);
        pkgLock.version = nextVersion;
        if (pkgLock.packages && pkgLock.packages['']) {
          pkgLock.packages[''].version = nextVersion;
        }
        fs.writeFileSync(PKG_LOCK_PATH, JSON.stringify(pkgLock, null, 2) + '\n', 'utf8');
        success(`package-lock.json updated to v${nextVersion}`);
      }

      // Step 3: Update CHANGELOG.md
      log(`\n${c.bold}📖 [3/5] Updating CHANGELOG.md...${c.reset}`);
      updateChangelog(nextVersion, customMessage);
      success(`CHANGELOG.md updated for v${nextVersion}`);

      // Step 4: Git verification & Tagging
      log(`\n${c.bold}🏷️  [4/5] Git operations & tagging...${c.reset}`);
      const gitAvailable = checkGitAvailable();
      const inGitRepo = gitAvailable && checkGitRepo();

      if (!gitAvailable) {
        warn('Git CLI is not installed or not in PATH.');
        log(`${c.gray}Files (package.json, CHANGELOG.md) have been updated to v${nextVersion}.${c.reset}`);
        log(`${c.gray}You can commit and tag manually in VS Code or GitHub Desktop.${c.reset}`);
      } else if (!inGitRepo) {
        warn('Project is not yet initialized as a Git repository (.git not found).');
        log(`${c.gray}To initialize: run 'git init', then commit and tag 'v${nextVersion}'.${c.reset}`);
      } else {
        // Stage files
        runGit(['add', 'package.json', 'CHANGELOG.md']);
        if (hasPkgLock) {
          runGit(['add', 'package-lock.json']);
        }

        // Commit
        const commitMsg = customMessage
          ? `chore(release): v${nextVersion} - ${customMessage}`
          : `chore(release): v${nextVersion}`;
        const commitRes = runGit(['commit', '-m', `"${commitMsg}"`]);
        if (commitRes.status === 0) {
          success(`Created Git commit: "${commitMsg}"`);
        } else {
          warn(`Git commit returned: ${commitRes.stderr || commitRes.stdout || 'clean working tree'}`);
        }

        // Tag
        const tagMsg = customMessage
          ? `Release v${nextVersion}: ${customMessage}`
          : `Release v${nextVersion}`;
        const tagRes = runGit(['tag', '-a', `v${nextVersion}`, '-m', `"${tagMsg}"`]);
        if (tagRes.status === 0) {
          success(`Created Git tag: v${nextVersion}`);
        } else {
          warn(`Could not create tag v${nextVersion}: ${tagRes.stderr}`);
        }

        // Step 5: Git Push & GitHub Release
        log(`\n${c.bold}🚀 [5/5] Remote synchronization...${c.reset}`);
        const remoteCheck = runGit(['remote']);
        const hasRemote = remoteCheck.stdout.trim().length > 0;

        if (hasRemote) {
          let push = autoYes;
          if (!autoYes) {
            const pushAnswer = await prompter.ask(
              `Push commit and tag v${nextVersion} to remote GitHub? (Y/n)`,
              'Y'
            );
            push = pushAnswer.toLowerCase() === 'y' || pushAnswer.toLowerCase() === 'yes';
          }

          if (push) {
            info('Pushing commits and tags...');
            const pushRes = runGit(['push', '--follow-tags']);
            if (pushRes.status === 0) {
              success('Successfully pushed commits and tags to remote!');
            } else {
              warn(`Push returned: ${pushRes.stderr || pushRes.stdout}`);
            }

            // GitHub CLI release creation (if gh CLI is installed)
            if (checkGitHubCliAvailable()) {
              let createGhRelease = autoYes;
              if (!autoYes) {
                const ghAnswer = await prompter.ask('Create official GitHub Release via gh CLI? (y/N)', 'N');
                createGhRelease = ghAnswer.toLowerCase() === 'y';
              }
              if (createGhRelease) {
                const ghArgs = [
                  'release',
                  'create',
                  `v${nextVersion}`,
                  '--title',
                  `"v${nextVersion}"`,
                  '--notes',
                  `"${customMessage || `Release v${nextVersion}`}"`
                ];
                const ghRes = spawnSync('gh', ghArgs, { cwd: ROOT_DIR, shell: true, encoding: 'utf8' });
                if (ghRes.status === 0) {
                  success(`GitHub Release v${nextVersion} published!`);
                } else {
                  warn(`Could not create gh release: ${ghRes.stderr}`);
                }
              }
            }
          } else {
            info('Push skipped. Remember to push tags later with: git push --follow-tags');
          }
        } else {
          info('No git remote configured yet. When you add a remote origin, run:');
          log(`  ${c.cyan}git push -u origin main --follow-tags${c.reset}`);
        }
      }

      log(`\n${c.bold}${c.green}🎉 Release v${nextVersion} completed successfully!${c.reset}\n`);

    } catch (err) {
      error(`Error during release process: ${err.message}`);
      // Rollback
      log('Rolling back modified files...');
      fs.writeFileSync(PKG_PATH, originalPkgContent, 'utf8');
      if (hasPkgLock && originalLockContent) {
        fs.writeFileSync(PKG_LOCK_PATH, originalLockContent, 'utf8');
      }
      if (hasChangelog && originalChangelog) {
        fs.writeFileSync(CHANGELOG_PATH, originalChangelog, 'utf8');
      }
      warn('Files restored to previous state.');
      prompter.close();
      process.exit(1);
    }

  } finally {
    prompter.close();
  }
}

main().catch((err) => {
  error(`Unhandled error: ${err.message}`);
  process.exit(1);
});
