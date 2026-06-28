const fs = require('fs');
const path = require('path');
const { CONTENT_ROOT } = require('../config');
const { stripMarkdown, extractHeadings } = require('../utils/markdown');
const { makeBreadcrumb, getSnippet } = require('../utils/formatters');

let searchIndex = [];

/**
 * Scores a search result item based on term matches
 * @param {Object} item - Search index item
 * @param {string[]} terms - Search terms
 * @returns {number} Score value
 */
function scoreItem(item, terms) {
  let score = 0;
  const titleL = item.titleLower;
  const headingsL = item.headingsLower;
  const bodyL = item.bodyLower;

  for (const term of terms) {
    // Title match: highest weight
    if (titleL === term) score += 120;
    else if (titleL.includes(term)) score += 60;

    // Heading match: high weight
    for (const h of headingsL) {
      if (h.includes(term)) score += 25;
    }

    // Body match: count occurrences, cap at 20
    let count = 0, pos = 0;
    while ((pos = bodyL.indexOf(term, pos)) !== -1) {
      count++;
      pos += term.length;
      if (count >= 20) break;
    }
    score += count * 2;
  }

  // Bonus: all terms present
  const allInTitle = terms.every(t => titleL.includes(t));
  const allInBody  = terms.every(t => bodyL.includes(t));
  if (allInTitle) score += 50;
  if (allInBody)  score += 10;

  return score;
}

/**
 * Builds search index from flat file list
 * @param {Array} flatFiles - Array of file nodes
 */
function buildSearchIndex(flatFiles) {
  console.log('Building search index...');
  searchIndex = [];
  
  for (const file of flatFiles) {
    try {
      const fullPath = path.resolve(CONTENT_ROOT, file.path);
      if (!fs.existsSync(fullPath)) continue;
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const headings = extractHeadings(raw);
      const body = stripMarkdown(raw);
      searchIndex.push({
        path: file.path,
        title: file.label,
        breadcrumb: makeBreadcrumb(file.path),
        headings,
        body,
        titleLower: file.label.toLowerCase(),
        headingsLower: headings.map(h => h.toLowerCase()),
        bodyLower: body.toLowerCase(),
      });
    } catch (e) {
      console.error('Error indexing file:', file.path, e);
    }
  }
  console.log(`Search index built: ${searchIndex.length} files`);
}

/**
 * Performs a search query on the index
 * @param {string} query - Search query string
 * @returns {Array} Search results
 */
function search(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return [];

  // Split into individual terms, filter short noise words
  const terms = q.split(/\s+/).filter(t => t.length >= 2);
  if (terms.length === 0) return [];

  const scored = [];
  for (const item of searchIndex) {
    // Item must match at least one term somewhere
    const matches = terms.some(t =>
      item.titleLower.includes(t) ||
      item.headingsLower.some(h => h.includes(t)) ||
      item.bodyLower.includes(t)
    );
    if (!matches) continue;

    const score = scoreItem(item, terms);
    const snippet = getSnippet(item.body, terms);
    scored.push({ title: item.title, path: item.path, breadcrumb: item.breadcrumb, snippet, score });
  }

  // Sort by score descending, return top 20
  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, 20).map(({ title, path, breadcrumb, snippet }) => ({
    title, path, breadcrumb, snippet
  }));

  return results;
}

module.exports = {
  buildSearchIndex,
  search,
};
