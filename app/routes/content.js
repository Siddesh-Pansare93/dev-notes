const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const { CONTENT_ROOT } = require('../config');
const { renderMarkdown } = require('../utils/markdown');
const { canvasToMarkdown } = require('../utils/canvas');
const { formatName } = require('../utils/formatters');

const md = new MarkdownIt();

/**
 * Content rendering route handler
 */
function getContent(navTree, flatFiles) {
  return (req, res) => {
    // Normalize the URL path
    let urlPath = decodeURIComponent(req.path).replace(/\\/g, '/');

    // Remove leading slash
    if (urlPath.startsWith('/')) urlPath = urlPath.slice(1);

    // Resolve to filesystem path
    let filePath = path.resolve(CONTENT_ROOT, urlPath);

    // Path traversal protection
    if (!filePath.startsWith(CONTENT_ROOT)) {
      return res.status(403).send('Forbidden');
    }

    // If it's a directory, redirect to README.md, first direct .md file, or first file anywhere under this path
    try {
      if (fs.statSync(filePath).isDirectory()) {
        const trailing = req.path.endsWith('/') ? '' : '/';
        const base = req.path + trailing;
        const readmePath = path.join(filePath, 'README.md');
        if (fs.existsSync(readmePath)) {
          return res.redirect(base + 'README.md');
        }
        // Try direct .md/.canvas files
        const entries = fs.readdirSync(filePath)
          .filter(f => f.toLowerCase().endsWith('.md') || f.toLowerCase().endsWith('.canvas'))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        if (entries.length > 0) return res.redirect(base + entries[0]);
        // Fall back to first file anywhere under this path in the nav tree
        const relDir = (urlPath.endsWith('/') ? urlPath : urlPath + '/');
        const first = flatFiles.find(f => f.path.startsWith(relDir));
        if (first) return res.redirect('/' + first.path);
        return res.redirect('/');
      }
    } catch (_) { }

    // If path doesn't end with a known extension, try appending .md
    const isCanvas = filePath.toLowerCase().endsWith('.canvas');
    if (!filePath.toLowerCase().endsWith('.md') && !isCanvas) {
      filePath += '.md';
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).render('layout', {
        title: 'Not Found',
        content: `<h1>404 - Not Found</h1><p>The file <code>${md.utils.escapeHtml(urlPath)}</code> was not found.</p><p><a href="/">Go home</a></p>`,
        navTree,
        currentPath: urlPath,
        prevNode: null,
        nextNode: null,
      });
    }

    // Read file; canvas files are converted to markdown first
    let raw = fs.readFileSync(filePath, 'utf-8');
    if (filePath.toLowerCase().endsWith('.canvas')) {
      raw = canvasToMarkdown(raw, path.basename(filePath));
    }

    // Calculate reading time
    const wordCount = raw.trim().split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    let html = renderMarkdown(raw, filePath);

    // Inject reading time below the first h1
    const readingTimeHtml = `<div class="reading-time"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${readingTime} min read</div>`;
    if (html.includes('</h1>')) {
      html = html.replace(/(<\/h1>)/i, `$1\n${readingTimeHtml}`);
    } else {
      html = readingTimeHtml + html;
    }

    const relPath = path.relative(CONTENT_ROOT, filePath).replace(/\\/g, '/');

    // Find prev/next navigation
    let prevNode = null;
    let nextNode = null;
    const currentIndex = flatFiles.findIndex(f => f.path === relPath);
    if (currentIndex >= 0) {
      if (currentIndex > 0) prevNode = flatFiles[currentIndex - 1];
      if (currentIndex < flatFiles.length - 1) nextNode = flatFiles[currentIndex + 1];
    }

    res.render('layout', {
      title: formatName(path.basename(filePath)),
      content: html,
      navTree,
      currentPath: relPath,
      prevNode,
      nextNode,
    });
  };
}

module.exports = {
  getContent,
};
