const { search } = require('../services/search');

/**
 * Search API route handler
 */
function searchAPI(req, res) {
  const results = search(req.query.q);
  res.json(results);
}

module.exports = {
  searchAPI,
};
