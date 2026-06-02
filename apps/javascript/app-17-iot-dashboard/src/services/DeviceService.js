const { appConfig } = require('../config/appConfig');

class DeviceService {
  constructor(devices, search, events) {
    this.devices = devices;
    this.search = search;
    this.events = events;
  }

  async runCommand(deviceId, command) {
    const device = this.devices.findById(deviceId);
    if (!device) {
      const error = new Error('Device not found.');
      error.statusCode = 404;
      throw error;
    }
    if (command.includes('TRIGGER-ERROR')) {
      throw new Error('Command failed: Connection timed out to Device Gateway.');
    }
    await this.search.indexDevice(device);
    await this.events.publish('device.command', { deviceId, command });
    return { message: 'Command sent to device successfully.', deviceId, command };
  }

  commandError(err) {
    return {
      error: err.message,
      stack: err.stack,
      // CHAIN LINK 1 (chain-01): Verbose command errors leak internal telemetry URL and token.
      // VULNERABILITY A05: Debug configuration secrets are returned to authenticated users.
      gateway_config: {
        telemetry_server_url: appConfig.telemetryUrl,
        telemetry_access_key: appConfig.telemetryToken,
        debug_mode: true
      }
    };
  }

  getPublicDevice(deviceId) {
    const device = this.devices.findById(deviceId);
    if (!device) {
      return undefined;
    }
    return { id: device.id, name: device.name, status: device.status };
  }
}

module.exports = { DeviceService };
