module.exports = async function setupMongo(mongoDb) {
  const existing = await mongoDb.listCollections({ name: 'lot_layouts' }).toArray();
  if (existing.length > 0) return;

  await mongoDb.collection('lot_layouts').createIndex({ lotId: 1 }, { unique: true });
  await mongoDb.collection('lot_layouts').createIndex({ zone: 1 });
  await mongoDb.collection('pricing_rules').createIndex({ ruleType: 1 });

  await mongoDb.collection('lot_layouts').insertMany([
    { lotId: 'A-101', zone: 'Level-1-North', spotCoordinates: { x: 12.5, y: 34.0 }, vehicleRestrictions: { maxHeightCm: 210, maxWeightKg: 2500, evOnly: false }, rules: [{ rule: 'no_overnight', effectiveTime: '22:00-06:00' }] },
    { lotId: 'A-102', zone: 'Level-1-North', spotCoordinates: { x: 14.0, y: 36.0 }, vehicleRestrictions: { maxHeightCm: 210, maxWeightKg: 2500, evOnly: false }, rules: [{ rule: 'no_overnight', effectiveTime: '22:00-06:00' }] },
    { lotId: 'B-201', zone: 'Level-2-South', spotCoordinates: { x: 25.0, y: 50.0 }, vehicleRestrictions: { maxHeightCm: 180, maxWeightKg: 2000, evOnly: false }, rules: [] },
    { lotId: 'B-202', zone: 'Level-2-South', spotCoordinates: { x: 27.0, y: 52.0 }, vehicleRestrictions: { maxHeightCm: 180, maxWeightKg: 2000, evOnly: false }, rules: [] }
  ]);

  await mongoDb.collection('pricing_rules').insertMany([
    { ruleType: 'peak_hour', effectiveDays: ['Mon','Tue','Wed','Thu','Fri'], effectiveHours: { start: '08:00', end: '10:00' }, multiplier: 1.5, restrictions: { minDurationHours: 1, spotTypes: ['Standard', 'Premium'] } },
    { ruleType: 'holiday', effectiveDays: ['Sat','Sun'], multiplier: 1.25, restrictions: { spotTypes: ['Premium'] } }
  ]);
};
