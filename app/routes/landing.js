const { TOPIC_ICONS } = require('../config');
const { getTopicIcon, countFiles } = require('../utils/formatters');

/**
 * Landing page route handler
 */
function getLandingPage(navTree) {
  return (req, res) => {
    const topics = navTree.filter(item => item.type === 'folder');
    const landingHtml = `
    <div class="landing-header">
      <h1>Tutorial Library</h1>
      <p>Choose a topic area to start learning.</p>
    </div>
    <div class="topic-grid">
      ${topics.map(t => {
      const readmePath = `/${t.path}/README.md`;
      const sections = t.children.filter(c => c.type === 'folder').length;
      const files = countFiles(t);
      const icon = getTopicIcon(t.name, TOPIC_ICONS);
      return `<a href="${readmePath}" class="topic-card">
          <span class="topic-card-icon">${icon}</span>
          <h2>${t.label}</h2>
          <p>${sections} section${sections !== 1 ? 's' : ''} &middot; ${files} file${files !== 1 ? 's' : ''}</p>
        </a>`;
    }).join('\n')}
    </div>
  `;
    res.render('layout', {
      title: 'Tutorial Library',
      content: landingHtml,
      navTree,
      currentPath: '',
      prevNode: null,
      nextNode: null,
    });
  };
}

module.exports = {
  getLandingPage,
};
