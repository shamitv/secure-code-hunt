module.exports = async function seedUserProfiles(mongoDb) {
  const existing = await mongoDb.collection('user_profiles').countDocuments();
  if (existing > 0) return;

  await mongoDb.collection('user_profiles').createIndex({ userId: 1 }, { unique: true });

  await mongoDb.collection('user_profiles').insertMany([
    { userId: 1, phone: '+1-555-0101', address: '123 Maple St, Springfield', paymentLast4: '4242' },
    { userId: 2, phone: '+1-555-0102', address: '456 Oak Ave, Springfield', paymentLast4: '5678' },
    { userId: 3, phone: '+1-555-0103', address: '789 Pine Rd, Springfield', paymentLast4: '9012' }
  ]);
};
