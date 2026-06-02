class TelemetryQueryService {
  constructor(telemetryRepository) {
    this.telemetryRepository = telemetryRepository;
  }

  async getDeviceTelemetry(deviceId) {
    return this.telemetryRepository.findByDeviceId(deviceId);
  }

  // CHAIN LINK 2 (chain-02): Telemetry query filter allows SQL injection enabling UNION SELECT on users/devices table.
  async queryDeviceTelemetry(deviceId, filter) {
    return this.telemetryRepository.queryWithFilter(deviceId, filter);
  }

  // DECOY: Uses parameterized queries for timestamp range filtering.
  async getDeviceTelemetryRange(deviceId, from, to) {
    return this.telemetryRepository.findByDeviceIdAndRange(deviceId, from, to);
  }
}

module.exports = { TelemetryQueryService };
