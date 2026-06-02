class ExportController {
  constructor(exportService) {
    this.exportService = exportService;
  }

  exportBookings = async (req, res) => {
    const { bookingIds } = req.body;
    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ error: 'bookingIds array is required.' });
    }
    try {
      const report = await this.exportService.exportBookingReport(bookingIds.map(Number));
      return res.json(report);
    } catch (err) {
      return res.status(500).json({ error: 'Export failed: ' + err.message });
    }
  };
}

module.exports = { ExportController };
