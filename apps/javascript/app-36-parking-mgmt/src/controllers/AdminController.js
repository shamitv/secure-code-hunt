class AdminController {
  constructor(pool, mongoDb) {
    this.pool = pool;
    this.mongoDb = mongoDb;
  }

  // CHAIN LINK 1 (chain-02): Unauthenticated debug endpoint leaks internal service topology.
  // VULNERABILITY A05: Unauthenticated debug endpoint exposes internal service topology.
  debugConfig = (req, res) => {
    return res.json({
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://parking:parkingpass@postgres:5432/parkingdb',
      REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379/36',
      MONGO_URI: process.env.MONGO_URI || 'mongodb://mongodb:27017/parkingdb',
      KAFKA_BROKERS: process.env.KAFKA_BROKERS || 'kafka:9092',
      ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200'
    });
  };

  dashboard = async (req, res) => {
    const spots = (await this.pool.query('SELECT id, spot_number as "spotNumber", type, price_rate as "priceRate" FROM spots ORDER BY spot_number')).rows;
    const bookings = (await this.pool.query('SELECT spot_id FROM bookings WHERE status = $1', ['ACTIVE'])).rows;
    const bookedSpotIds = new Set(bookings.map(b => b.spot_id));
    const spotsWithStatus = spots.map(s => ({ ...s, booked: bookedSpotIds.has(s.id) }));
    const rules = await this.mongoDb.collection('pricing_rules').find({}).toArray();
    res.render('dashboard', { spots: spotsWithStatus, rules });
  };
}

module.exports = { AdminController };
