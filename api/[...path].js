// Vercel catch-all function for /api/* and rewritten /media/* requests.
const app = require('../server/server');
module.exports = (req, res) => {
  // Vercel rewrites /media/* into /api/media/*; restore the route expected by the app.
  if (req.url && req.url.startsWith('/api/media/')) req.url = req.url.slice(4);
  return app(req, res);
};
