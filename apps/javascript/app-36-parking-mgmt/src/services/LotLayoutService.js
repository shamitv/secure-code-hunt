class LotLayoutService {
  async getByLotId(db, lotId) {
    return db.collection('lot_layouts').findOne({ lotId });
  }

  async create(db, layout) {
    return db.collection('lot_layouts').insertOne(layout);
  }
}

module.exports = { LotLayoutService };
