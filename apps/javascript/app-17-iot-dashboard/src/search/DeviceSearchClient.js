class DeviceSearchClient {
  constructor(config, esClient) {
    this.config = config;
    this.esClient = esClient;
  }

  async indexDevice(device) {
    if (this.esClient) {
      try {
        await this.esClient.index({
          index: 'iot-device-logs',
          body: {
            device_id: device.id,
            event_type: 'device_indexed',
            message: `Device indexed: ${device.name}`,
            timestamp: new Date().toISOString()
          }
        });
      } catch (err) {
        console.warn('ES index failed:', err.message);
      }
    }
    return { target: this.config.deviceSearchUrl, indexedId: device.id };
  }

  // DECOY: Uses parameterized match query — not vulnerable to query DSL injection.
  async searchByDeviceName(name) {
    if (!this.esClient) return [];
    try {
      const result = await this.esClient.search({
        index: 'iot-device-logs',
        body: {
          query: {
            match: { message: name }
          }
        }
      });
      return result.hits.hits.map(h => h._source);
    } catch (err) {
      console.warn('ES search failed:', err.message);
      return [];
    }
  }
}

module.exports = { DeviceSearchClient };
