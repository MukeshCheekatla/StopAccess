const fs = require('fs');
const path = require('path');

const EXCLUDES = [
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
];

function generateTree(dir, prefix = '') {
  const files = fs
    .readdirSync(dir)
    .filter((file) => !EXCLUDES.includes(file))
    .sort((a, b) => {
      const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
      const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
      if (aIsDir && !bIsDir) {
        return -1;
      }
      if (!aIsDir && bIsDir) {
        return 1;
      }
      return a.localeCompare(b);
    });

  let tree = '';
  files.forEach((file, index) => {
    const isLast = index === files.length - 1;
    const fullPath = path.join(dir, file);
    const isDir = fs.statSync(fullPath).isDirectory();

    tree += `${prefix}${isLast ? '└── ' : '├── '}${file}\n`;

    if (isDir) {
      tree += generateTree(fullPath, `${prefix}${isLast ? '    ' : '│   '}`);
    }
  });
  return tree;
}

const rootDir = process.cwd();
const tree = generateTree(rootDir);
const header = '# Project Structure\n\n```text\n';
const footer = '```\n';

const outDir = path.join(rootDir, 'docs', 'imp', 'reference');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'PROJECT_STRUCTURE.md'),
  header + tree + footer,
);
console.log('Tree updated!');
