class DiagnosticsController {
  constructor(diagnosticsService) {
    this.diagnosticsService = diagnosticsService;
  }

  search = async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required.' });
    }
    try {
      const result = await this.diagnosticsService.searchLogs(q);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Search failed.', details: err.message });
    }
  };

  searchSafe = async (req, res) => {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Query parameter name is required.' });
    }
    try {
      const result = await this.diagnosticsService.searchLogsSafe(name);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Search failed.', details: err.message });
    }
  };
}

module.exports = { DiagnosticsController };
