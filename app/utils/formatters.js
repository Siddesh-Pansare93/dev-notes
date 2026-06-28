/**
 * Formats a file/folder name for display
 * @param {string} name - File or folder name
 * @returns {string} Formatted display name
 */
function formatName(name) {
  // Any variant of readme (00-README.md, 00-readme.md, README.md) → "Overview"
  if (/^(?:\d+[-_])?readme\.md$/i.test(name)) return 'Overview';

  // Strip known extensions (.md, .canvas)
  let base = name.replace(/\.(md|canvas)$/i, '');
  // Strip leading underscores (e.g. _canvases → Canvases)
  base = base.replace(/^_+/, '');
  // Strip 3+ digit prefix (reference files: 0000-a-roadmap → Roadmap), keep 2-digit chapter prefixes (01-intro → 01 Intro)
  return base
    .replace(/^\d{3,}[-_](?:[a-z][-_])?/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Creates a breadcrumb string from a file path
 * @param {string} filePath - File path
 * @returns {string} Breadcrumb string
 */
function makeBreadcrumb(filePath) {
  const parts = filePath.split('/');
  if (parts.length < 2) return '';
  // Use top-level folder + immediate parent folder (if different)
  const topic = formatName(parts[0]);
  if (parts.length === 2) return topic;
  const section = formatName(parts[parts.length - 2]);
  return section !== topic ? `${topic} › ${section}` : topic;
}

/**
 * Gets a snippet from text with context around search terms
 * @param {string} body - Text to extract snippet from
 * @param {string[]} terms - Search terms
 * @param {number} length - Snippet length (default: 160)
 * @returns {string} Text snippet
 */
function getSnippet(body, terms, length = 160) {
  const lower = body.toLowerCase();
  let bestIdx = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
  }
  if (bestIdx === -1) return body.slice(0, length) + '…';
  const start = Math.max(0, bestIdx - 60);
  const end = Math.min(body.length, start + length);
  const snippet = (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
  return snippet;
}

/**
 * Gets an icon for a topic based on its name
 * @param {string} name - Topic name
 * @param {Object} topicIcons - Map of topic names to icons
 * @returns {string} Icon emoji
 */
function getTopicIcon(name, topicIcons) {
  const key = name.toLowerCase().replace(/[\s-]/g, '_');
  for (const [k, v] of Object.entries(topicIcons)) {
    if (key.includes(k.toLowerCase().replace(/[\s-]/g, '_'))) return v;
  }
  return '📚';
}

/**
 * Counts total files in a tree node
 * @param {Object} node - Tree node
 * @returns {number} Total file count
 */
function countFiles(node) {
  if (node.type === 'file') return 1;
  return node.children.reduce((sum, c) => sum + countFiles(c), 0);
}

module.exports = {
  formatName,
  makeBreadcrumb,
  getSnippet,
  getTopicIcon,
  countFiles,
};
