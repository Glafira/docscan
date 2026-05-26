#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const EXTENSIONS = new Set(['.pas', '.dfm']);
const IGNORE_DIRS = new Set(['.git']);

function collectFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        results.push(...collectFiles(fullPath));
      }
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node collect-delphi.js <source-dir> [output-file]');
    process.exit(1);
  }

  const sourceDir = path.resolve(args[0]);
  const outputFile = path.resolve(args[1] || 'delphi-sources.txt');

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  console.log(`Scanning: ${sourceDir}`);
  const files = collectFiles(sourceDir);
  console.log(`Found ${files.length} file(s)`);

  const out = fs.createWriteStream(outputFile, { encoding: 'utf8' });

  for (const filePath of files) {
    const relativePath = path.relative(sourceDir, filePath);
    const fileName = path.basename(filePath);
    const header = `// === ФАЙЛ: ${fileName} | PATH: ${relativePath} ===\n`;

    out.write(header);

    await new Promise((resolve, reject) => {
      const rs = fs.createReadStream(filePath, { encoding: 'utf8' });
      rs.on('error', reject);
      rs.pipe(out, { end: false });
      rs.on('end', () => {
        out.write('\n\n');
        resolve();
      });
    });
  }

  await new Promise((resolve) => out.end(resolve));
  console.log(`Done. Output: ${outputFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
