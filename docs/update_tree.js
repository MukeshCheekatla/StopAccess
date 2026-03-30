const fs = require('fs');
const path = require('path');

const EXCLUDES = new Set([
  '.git',
  'node_modules',
  '.turbo',
  '.next',
  '.artifacts',
  'dist',
  '.expo',
  '.gradle',
  'build',
  '.idea',
  '__pycache__',
  'docs',
]);

const SKIP_PATTERNS = [
  /android[\\/]+app[\\/]+src[\\/]+main[\\/]+assets[\\/]+index\.android\.bundle$/,
  /android[\\/]+app[\\/]+src[\\/]+main[\\/]+res[\\/]+drawable-[^\\/]+[\\/]node_modules_/,
  /extension[\\/]+dist[\\/]/,
];

function shouldSkip(fullPath) {
  return SKIP_PATTERNS.some((pattern) => pattern.test(fullPath));
}

function generateTree(dir, prefix = '') {
  const items = fs
    .readdirSync(dir)
    .filter((name) => !EXCLUDES.has(name))
    .map((name) => path.join(dir, name))
    .filter((fullPath) => !shouldSkip(fullPath))
    .sort((a, b) => {
      const aIsDir = fs.statSync(a).isDirectory();
      const bIsDir = fs.statSync(b).isDirectory();
      if (aIsDir !== bIsDir) {
        return aIsDir ? -1 : 1;
      }
      return path.basename(a).localeCompare(path.basename(b));
    });

  let output = '';

  items.forEach((fullPath, index) => {
    const name = path.basename(fullPath);
    const isDir = fs.statSync(fullPath).isDirectory();
    const isLast = index === items.length - 1;
    const branch = isLast ? '\\-- ' : '|-- ';
    const childPrefix = `${prefix}${isLast ? '    ' : '|   '}`;

    output += `${prefix}${branch}${name}\n`;

    if (isDir) {
      output += generateTree(fullPath, childPrefix);
    }
  });

  return output;
}

const rootDir = process.cwd();
const tree = generateTree(rootDir);
const content = `# Project Structure\n\n\`\`\`text\n${tree}\`\`\`\n`;

const outDir = path.join(rootDir, 'docs', 'imp', 'reference');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'PROJECT_STRUCTURE.md'), content, 'utf8');
console.log('Project structure updated.');
