#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY_DIR = path.join(ROOT, 'registry', 'effects');
const DIST_DIR = path.join(ROOT, 'registry', 'dist');

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

function collectEffectDirs(dir) {
  return fs.readdirSync(dir).flatMap((entry) => {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) return [p];
    return [];
  }).sort();
}

function ensurePackageForEffect(effectDir) {
  // read registry.json
  const registryFile = path.join(effectDir, 'registry.json');
  if (!fs.existsSync(registryFile)) return null;
  const meta = readJson(registryFile);
  const name = meta.packageName || `@hyperiux/${meta.name}`;
  const pkgFile = path.join(effectDir, 'package.json');
  let pkg = null;
  if (fs.existsSync(pkgFile)) {
    pkg = readJson(pkgFile);
  } else {
    // try to find main entry
    const files = fs.readdirSync(effectDir);
    const jsFile = files.find((f) => /\.jsx?$/.test(f) || /\.tsx?$/.test(f));
    const main = jsFile || 'index.js';
    pkg = {
      name,
      version: meta.version || '0.0.1',
      description: meta.description || meta.title || name,
      main: main,
      files: [main, 'registry.json'],
      keywords: [meta.category || 'effect', 'hyperiux'],
      dependencies: {},
    };
    if (Array.isArray(meta.dependencies)) {
      meta.dependencies.forEach((d) => { pkg.dependencies[d] = '*'; });
    }
    writeJson(pkgFile, pkg);
    console.log('wrote package.json for', name);
  }

  const packageFiles = Array.isArray(meta.files) && meta.files.length
    ? [...new Set([
        ...(meta.main ? [meta.main] : []),
        ...meta.files
          .filter((file) => file.type !== 'registry:asset')
          .map((file) => file.path),
        'registry.json',
      ])]
    : pkg.files;

  const dependencies = {};
  if (Array.isArray(meta.dependencies)) {
    meta.dependencies.forEach((dependency) => {
      dependencies[dependency] = pkg.dependencies?.[dependency] || '*';
    });
  }

  const nextPkg = {
    ...pkg,
    name,
    version: meta.version || pkg.version || '0.0.1',
    description: meta.description || meta.title || pkg.description || name,
    main: meta.main || pkg.main,
    files: packageFiles,
    dependencies,
  };

  if (JSON.stringify(nextPkg, null, 2) !== JSON.stringify(pkg, null, 2)) {
    pkg = nextPkg;
    writeJson(pkgFile, pkg);
    console.log('synced package.json for', name);
  }

  return { pkg, pkgFile, meta };
}

function packEffect(effectDir, info) {
  // If registry.json provides a sourcePath, assemble a staging dir that includes those files
  const meta = info.meta || {};
  const useSource = typeof meta.sourcePath === 'string' && meta.sourcePath.trim() !== '';
  let cwd = effectDir;
  let stagingDir = null;
  try {
    if (useSource) {
      stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hyperiux-'));
      // copy effectDir contents (registry.json + package.json or others) into staging
      fs.cpSync(effectDir, stagingDir, { recursive: true });

      // resolve sourcePath relative to repo root if it's not absolute
      const srcPath = path.isAbsolute(meta.sourcePath) ? meta.sourcePath : path.join(ROOT, meta.sourcePath);
      if (fs.existsSync(srcPath)) {
        // copy source folder into staging under `src` (preserve folder name)
        const baseName = path.basename(srcPath);
        const destPath = path.join(stagingDir, baseName);
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        console.warn('sourcePath not found for', effectDir, srcPath);
      }
      cwd = stagingDir;
    }

    const out = execSync('npm pack --silent', { cwd, stdio: ['ignore', 'pipe', 'inherit'] });
    const m = String(out || '').trim().split('\n').pop();
    const tarballName = m || `${info.pkg.name.replace('/', '-')}-${info.pkg.version}.tgz`;
    const src = path.join(cwd, tarballName);
    const dest = path.join(DIST_DIR, tarballName);
    fs.renameSync(src, dest);
    return dest;
  } catch (err) {
    console.error('pack failed for', effectDir, err && err.message);
    return null;
  } finally {
    if (stagingDir) {
      try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    }
  }
}

function walkRegistry(rootDir) {
  const categories = fs.readdirSync(rootDir).filter((f) => fs.statSync(path.join(rootDir, f)).isDirectory());
  const results = [];
  categories.forEach((cat) => {
    const catDir = path.join(rootDir, cat);
    const effects = collectEffectDirs(catDir);
    effects.forEach((effDir) => {
      const info = ensurePackageForEffect(effDir);
      if (!info) return;
      const tar = packEffect(effDir, info);
      if (tar) {
        results.push({ name: info.pkg.name, version: info.pkg.version, tarball: path.relative(ROOT, tar).replace(/\\\\/g, '/') });
      }
    });
  });
  return results;
}

console.log('Building registry packages...');
const built = walkRegistry(REGISTRY_DIR);
const indexFile = path.join(DIST_DIR, 'registry-index.json');
writeJson(indexFile, built);
console.log('Built', built.length, 'packages. index at', indexFile);
console.log('Done.');
