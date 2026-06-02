class SpotService {
  constructor(spots, searchClient, events) {
    this.spots = spots;
    this.searchClient = searchClient;
    this.events = events;
  }

  async createSpot(input) {
    const spot = await this.spots.save(input);
    this.events.publish('security.audit.spot.created', { spotId: spot.id, spotNumber: spot.spotNumber });
    console.log(`[SECURITY AUDIT] New parking spot ${spot.spotNumber} registered at ${new Date().toISOString()}`);
    return spot;
  }

  async search(rawQuery) {
    return this.searchClient.searchByQueryString(rawQuery);
  }

  async findById(id) {
    return this.spots.findById(id);
  }
}

module.exports = { SpotService };
