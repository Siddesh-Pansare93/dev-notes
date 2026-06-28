/**
 * Converts an Obsidian .canvas JSON file to markdown (mermaid chart + node detail cards)
 */

const CALLOUT_ICONS = {
  info: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🚨', error: '❌',
  note: '📝', success: '✅', check: '✅', question: '❓', bug: '🐛',
  example: '📋', quote: '💬', abstract: '📄', summary: '📄', important: '❗', caution: '⚠️',
};

// Obsidian color index → CSS class name
const COLOR_CLASSES = { '1': 'red', '2': 'orange', '3': 'yellow', '4': 'green', '5': 'cyan', '6': 'purple' };

function safeId(id) {
  return 'n' + id.replace(/[^a-zA-Z0-9]/g, '');
}

function stripWikilinks(text) {
  return (text || '').replace(/\[\[([^\]|#]+?)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, link, display) => display || link);
}

function getNodeLabel(node) {
  const raw = node.text || node.label || node.file || '';
  let text = stripWikilinks(raw);
  const lines = text.split('\n').map(l => l.trim())
    .filter(l => l && !/^-{3,}$/.test(l) && !l.startsWith('> ') && !l.startsWith('```'));
  if (!lines.length) return '...';
  let label = lines[0].replace(/^#{1,6}\s+/, '').trim();
  if (label.length > 55) label = label.slice(0, 52) + '...';
  return label.replace(/"/g, "'").replace(/[<>]/g, ' ');
}

function isInside(node, group) {
  return node.x >= group.x &&
    node.y >= group.y &&
    (node.x + (node.width || 0)) <= (group.x + group.width) &&
    (node.y + (node.height || 0)) <= (group.y + group.height);
}

function canvasToMarkdown(jsonContent, filename) {
  let data;
  try { data = JSON.parse(jsonContent); }
  catch { return `# ${filename}\n\n*Could not parse canvas file.*`; }

  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const groups = nodes.filter(n => n.type === 'group');
  const textNodes = nodes.filter(n => n.type === 'text' || n.type === 'file');

  // Map each text node to its group
  const nodeToGroup = new Map();
  for (const g of groups) {
    for (const n of textNodes) {
      if (isInside(n, g)) nodeToGroup.set(n.id, g.id);
    }
  }

  const title = filename.replace(/\.canvas$/i, '').replace(/-/g, ' ');
  let md = `# ${title}\n\n`;

  // ── Mermaid flowchart ──────────────────────────────────────────────────────
  let mmd = 'flowchart LR\n';

  for (const g of groups) {
    const gId = safeId(g.id);
    const gLabel = (g.label || '').replace(/"/g, "'");
    mmd += `  subgraph ${gId}["${gLabel}"]\n`;
    for (const n of textNodes) {
      if (nodeToGroup.get(n.id) === g.id) {
        mmd += `    ${safeId(n.id)}["${getNodeLabel(n)}"]\n`;
      }
    }
    mmd += '  end\n';
  }

  // Orphan nodes not inside any group
  for (const n of textNodes) {
    if (!nodeToGroup.has(n.id)) {
      mmd += `  ${safeId(n.id)}["${getNodeLabel(n)}"]\n`;
    }
  }

  for (const e of edges) {
    const from = safeId(e.fromNode);
    const to = safeId(e.toNode);
    const label = e.label ? `|"${e.label.replace(/"/g, "'")}"| ` : '';
    mmd += `  ${from} -->${label}${to}\n`;
  }

  md += '```mermaid\n' + mmd + '```\n\n';

  // ── Detailed node content ──────────────────────────────────────────────────
  const hasContent = textNodes.some(n => n.text && n.text.trim());
  if (hasContent) {
    md += '---\n\n## Details\n\n';
    // Sort nodes top-to-bottom, left-to-right for reading order
    const sorted = [...textNodes].sort((a, b) => (a.y - b.y) || (a.x - b.x));

    let lastGroupId = null;
    for (const n of sorted) {
      const gid = nodeToGroup.get(n.id);
      // Emit a group heading when the group changes
      if (gid !== lastGroupId) {
        lastGroupId = gid;
        const g = groups.find(g => g.id === gid);
        if (g && g.label) md += `### ${g.label}\n\n`;
      }
      if (n.text && n.text.trim()) {
        const colorClass = n.color ? ` canvas-card-${COLOR_CLASSES[n.color] || ''}` : '';
        md += `<div class="canvas-card${colorClass}">\n\n${n.text.trim()}\n\n</div>\n\n`;
      }
    }
  }

  return md;
}

module.exports = { canvasToMarkdown };
