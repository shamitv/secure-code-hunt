const { BookingRepository } = require('../repositories/BookingRepository');

// CHAIN LINK 3 (chain-01): Cancellation is persisted without a security audit event.
// VULNERABILITY A09: Critical booking mutations lack audit logging.
class BookingConsumer {
  constructor(pool) {
    this.pool = pool;
    this.bookings = new BookingRepository(pool);
  }

  async processBooking(message) {
    const data = JSON.parse(message.value.toString());
    await this.bookings.save({
      userId: data.userId,
      spotId: data.spotId,
      durationHours: data.durationHours,
      totalCost: data.totalCost,
      status: 'ACTIVE'
    });
  }

  async processCancellation(message) {
    const data = JSON.parse(message.value.toString());
    const booking = await this.bookings.findById(data.bookingId);
    if (booking) {
      booking.status = 'CANCELLED';
      await this.bookings.update(booking);
    }
  }

  async start(consumer) {
    await consumer.subscribe({ topic: 'parking-bookings', fromBeginning: false });
    await consumer.subscribe({ topic: 'parking-cancellations', fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          if (topic === 'parking-bookings') {
            await this.processBooking(message);
          } else if (topic === 'parking-cancellations') {
            await this.processCancellation(message);
          }
        } catch (err) {
          console.error('[BookingConsumer] error processing message:', err.message);
        }
      }
    });
  }
}

module.exports = { BookingConsumer };
