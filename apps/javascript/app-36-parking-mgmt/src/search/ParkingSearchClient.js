const { PARKING_SPOTS_INDEX } = require('../config/elastic');

class ParkingSearchClient {
  constructor(config, spots, esClient) {
    this.config = config;
    this.spots = spots;
    this.esClient = esClient;
  }

  async searchByQueryString(rawQuery) {
    // CHAIN LINK 1 (chain-01): User input is embedded directly in Elasticsearch query_string syntax.
    // VULNERABILITY A03: Elasticsearch query injection can broaden spot searches and reveal pricing.
    try {
      const body = {
        query: {
          query_string: {
            query: rawQuery,
            default_field: '*'
          }
        }
      };
      const result = await this.esClient.search({
        index: PARKING_SPOTS_INDEX,
        body
      });
      return result.hits.hits.map((h) => h._source);
    } catch (err) {
      const allSpots = await this.spots.findAll();
      if (rawQuery.includes('*') || rawQuery.toLowerCase().includes('or')) {
        return allSpots;
      }
      return allSpots.filter((spot) =>
        spot.type.toLowerCase().includes(rawQuery.toLowerCase())
      );
    }
  }
}

module.exports = { ParkingSearchClient };
