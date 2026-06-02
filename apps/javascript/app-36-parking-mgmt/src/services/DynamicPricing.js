class DynamicPricing {
  constructor(pool, mongoDb) {
    this.pool = pool;
    this.mongoDb = mongoDb;
  }

  async calculateFee(spotId, durationHours) {
    const spot = (await this.pool.query('SELECT price_rate FROM spots WHERE id = $1', [spotId])).rows[0];
    if (!spot) throw new Error('Spot not found');
    let rate = parseFloat(spot.price_rate);
    const rules = await this.mongoDb.collection('pricing_rules').find({}).toArray();
    const now = new Date();
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const currentDay = dayNames[now.getDay()];
    const currentHour = now.getHours() + now.getMinutes() / 60;

    for (const rule of rules) {
      if (rule.effectiveDays && rule.effectiveDays.includes(currentDay)) {
        if (rule.effectiveHours) {
          const start = parseFloat(rule.effectiveHours.start);
          const end = parseFloat(rule.effectiveHours.end);
          if (currentHour >= start && currentHour < end) {
            rate *= rule.multiplier;
          }
        } else {
          rate *= rule.multiplier;
        }
      }
    }
    return rate * durationHours;
  }
}

module.exports = { DynamicPricing };
