class DeviceController {
  constructor(authService, deviceService, refreshService, telemetryQueryService) {
    this.authService = authService;
    this.deviceService = deviceService;
    this.refreshService = refreshService;
    this.telemetryQueryService = telemetryQueryService;
  }

  requireAuth = (req, res, next) => {
    const user = this.authService.currentUser(req.cookies.session_id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }
    req.user = user;
    return next();
  };

  runCommand = async (req, res) => {
    const { deviceId, command } = req.body;
    if (!deviceId || !command) {
      return res.status(400).json({ error: 'Device ID and command are required.' });
    }
    if (typeof command !== 'string' || command.length > 200) {
      return res.status(400).json({ error: 'Invalid command payload format.' });
    }

    try {
      const result = await this.deviceService.runCommand(Number(deviceId), command);
      return res.json(result);
    } catch (err) {
      return res.status(err.statusCode || 500).json(this.deviceService.commandError(err));
    }
  };

  refresh = async (req, res) => {
    const { statusUrl } = req.body;
    if (!statusUrl) {
      return res.status(400).json({ error: 'Status URL is required.' });
    }
    try {
      const data = await this.refreshService.refreshStatus(statusUrl);
      return res.json({ message: 'Device status updated.', data });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve device status.', details: err.message });
    }
  };

  detail = (req, res) => {
    const device = this.deviceService.getPublicDevice(Number(req.params.id));
    if (!device) {
      return res.status(404).json({ error: 'Device not found.' });
    }
    return res.json(device);
  };

  // CHAIN LINK 1 (chain-02): Telemetry endpoint accepts any device ID regardless of requesting user.
  // VULNERABILITY A01: Device telemetry endpoint returns data without verifying device ownership.
  getDeviceTelemetry = async (req, res) => {
    const deviceId = Number(req.params.id);
    try {
      const telemetry = await this.telemetryQueryService.getDeviceTelemetry(deviceId);
      return res.json({ deviceId, telemetry });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve telemetry.', details: err.message });
    }
  };

  queryDeviceTelemetry = async (req, res) => {
    const deviceId = Number(req.params.id);
    const { filter } = req.body;
    if (!filter) {
      return res.status(400).json({ error: 'Filter string is required.' });
    }
    try {
      const results = await this.telemetryQueryService.queryDeviceTelemetry(deviceId, filter);
      return res.json({ deviceId, filter, results });
    } catch (err) {
      return res.status(500).json({ error: 'Query failed.', details: err.message });
    }
  };

  getDeviceTelemetryRange = async (req, res) => {
    const deviceId = Number(req.params.id);
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to query parameters are required.' });
    }
    try {
      const telemetry = await this.telemetryQueryService.getDeviceTelemetryRange(deviceId, from, to);
      return res.json({ deviceId, from, to, telemetry });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve telemetry range.', details: err.message });
    }
  };
}

module.exports = { DeviceController };
