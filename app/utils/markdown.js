const path = require('path');
const MarkdownIt = require('markdown-it');
const taskLists = require('markdown-it-task-lists');
const mdAnchor = require('markdown-it-anchor');
const hljs = require('highlight.js');
const { CONTENT_ROOT } = require('../config');

// Wikilink map: lowercase basename → relative file path (set at startup)
let wikiLinkMap = new Map();
function setWikiLinkMap(map) { wikiLinkMap = map; }

// --- Markdown Configuration ---

const markdownConfig = {
  html: true,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch (_) { }
    }
    const md = new MarkdownIt();
    const className = lang ? ` class="language-${lang}"` : '';
    return `<pre class="hljs"><code${className}>${md.utils.escapeHtml(str)}</code></pre>`;
  },
};

// Custom plugin: rewrite relative .md links to absolute app URLs
function rewriteLinks(currentDir) {
  return function linkRewritePlugin(mdInstance) {
    const defaultRender = mdInstance.renderer.rules.link_open ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    mdInstance.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      const hrefIdx = tokens[idx].attrIndex('href');
      if (hrefIdx >= 0) {
        let href = tokens[idx].attrs[hrefIdx][1];
        if (href && !href.match(/^(https?:|mailto:|#)/) && !href.startsWith('/')) {
          const resolved = path.posix.normalize(path.posix.join(currentDir, href));
          tokens[idx].attrs[hrefIdx][1] = '/' + resolved;
        }
      }
      return defaultRender(tokens, idx, options, env, self);
    };
  };
}

// --- Obsidian preprocessing ---

function stripFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function resolveWikilinks(content) {
  return content.replace(
    /\[\[([^\]|#\n]+?)(?:#[^\]|\n]*)?(?:\|([^\]\n]+))?\]\]/g,
    (match, link, display) => {
      const key = link.trim().toLowerCase();
      const target = wikiLinkMap.get(key)
        || wikiLinkMap.get(key.replace(/\s+/g, '-'))
        || wikiLinkMap.get(key.replace(/\s+/g, '_'));
      const text = display ? display.trim() : link.trim();
      if (target) return `[${text}](/${target})`;
      return `**${text}**`;
    }
  );
}

const CALLOUT_ICONS = {
  info: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🚨', error: '❌',
  note: '📝', success: '✅', check: '✅', question: '❓', bug: '🐛',
  example: '📋', quote: '💬', abstract: '📄', summary: '📄', important: '❗',
  caution: '⚠️', failure: '❌', todo: '☑️', hint: '💡', done: '✅', seealso: '👁',
};

function processCallouts(content) {
  const lines = content.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    if (/^> \[!/.test(lines[i])) {
      const block = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        block.push(lines[i]);
        i++;
      }

      const firstContent = block[0].replace(/^> /, '');
      const calloutMatch = firstContent.match(/^\[!([\w-]+)\]\s*(.*)$/);

      if (calloutMatch) {
        const type = calloutMatch[1].toLowerCase();
        const titleText = calloutMatch[2].trim();
        const icon = CALLOUT_ICONS[type] || '📌';
        const displayTitle = titleText || (type.charAt(0).toUpperCase() + type.slice(1));
        const body = block.slice(1).map(l => l.replace(/^> ?/, '')).join('\n').trim();

        out.push(`<div class="callout callout-${type}">`);
        out.push(`<div class="callout-title">${icon} <strong>${displayTitle}</strong></div>`);
        out.push(`<div class="callout-body">\n\n${body}\n\n</div>`);
        out.push('</div>');
      } else {
        out.push(...block);
      }
    } else {
      out.push(lines[i]);
      i++;
    }
  }

  return out.join('\n');
}

/**
 * Renders markdown with frontmatter stripping, callout styling, and wikilink resolution
 */
function renderMarkdown(content, filePath) {
  const relDir = path.relative(CONTENT_ROOT, path.dirname(filePath)).replace(/\\/g, '/');

  // Normalize CRLF → LF so all regex anchors ($) work correctly on Windows-saved files
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  content = stripFrontmatter(content);
  content = processCallouts(content);
  content = resolveWikilinks(content);

  const renderer = new MarkdownIt(markdownConfig);
  renderer.use(taskLists, { enabled: true });
  renderer.use(mdAnchor, {
    permalink: mdAnchor.permalink.ariaHidden({
      placement: 'before',
      class: 'header-anchor',
      symbol: '#'
    })
  });
  renderer.use(rewriteLinks(relDir));

  return renderer.render(content);
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]+`/g, ' ')
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, l, d) => d || l)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>|\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(text) {
  const matches = text.match(/^#{1,3}\s+(.+)$/gm) || [];
  return matches.map(h => h.replace(/^#+\s+/, '').trim());
}

module.exports = {
  renderMarkdown,
  stripMarkdown,
  extractHeadings,
  setWikiLinkMap,
};
