const fs = require('fs');
const path = require('path');
const { CONTENT_ROOT, EXCLUDED } = require('../config');
const { formatName } = require('../utils/formatters');

/**
 * Builds a navigation tree from the file system
 * @param {string} dir - Directory to scan
 * @param {string} relPath - Relative path from content root
 * @returns {Array} Tree structure
 */
function buildTree(dir, relPath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const items = [];

  // Always skip these; only skip readme.md at the root level (inside topic folders it is the main content)
  const SKIP_FILES = new Set(['claude.md', 'agents.md', 'ascii_removal_summary.md']);

  // Collect all entries and sort together so numbered dirs/files interleave correctly
  const all = entries.filter(e => {
    if (e.name.startsWith('.')) return false;
    if (e.isDirectory()) return !EXCLUDED.has(e.name);
    return e.name.toLowerCase().endsWith('.md') || e.name.toLowerCase().endsWith('.canvas');
  });
  all.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  // Pin README.md to the front so "Overview" always appears before numbered chapters
  const readmeIdx = all.findIndex(e => e.name.toLowerCase() === 'readme.md');
  if (readmeIdx > 0) all.unshift(all.splice(readmeIdx, 1)[0]);

  for (const e of all) {
    if (e.isDirectory()) {
      const childRel = relPath ? `${relPath}/${e.name}` : e.name;
      const children = buildTree(path.join(dir, e.name), childRel);
      if (children.length > 0) {
        items.push({ type: 'folder', name: e.name, label: formatName(e.name), path: childRel, children });
      }
    } else {
      if (SKIP_FILES.has(e.name.toLowerCase())) continue;
      if (e.name.toLowerCase() === 'readme.md' && relPath === '') continue;
      const fileRel = relPath ? `${relPath}/${e.name}` : e.name;
      items.push({ type: 'file', name: e.name, label: formatName(e.name), path: fileRel });
    }
  }

  return items;
}

/**
 * Flattens a tree structure into a linear array of files
 * @param {Array} nodes - Tree nodes
 * @returns {Array} Flat array of file nodes
 */
function flattenTree(nodes) {
  let list = [];
  for (const n of nodes) {
    if (n.type === 'file') list.push(n);
    else if (n.type === 'folder') list = list.concat(flattenTree(n.children));
  }
  return list;
}

/**
 * Initializes navigation tree
 * @returns {Object} Navigation tree and flat file list
 */
function initializeNavigation() {
  console.log('Building navigation tree...');
  const navTree = buildTree(CONTENT_ROOT);
  const flatFiles = flattenTree(navTree);
  console.log(`Navigation tree built: ${flatFiles.length} files`);
  return { navTree, flatFiles };
}

module.exports = {
  buildTree,
  flattenTree,
  initializeNavigation,
};
