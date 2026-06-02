// CHAIN LINK 2 (chain-01): Booking price is trusted from the client instead of recalculated.
// VULNERABILITY A04: Client-controlled totalCost permits zero or negative cost bookings.
class BookingProducer {
  constructor(kafkaProducer) {
    this.producer = kafkaProducer;
  }

  async publishBooking(bookingData) {
    await this.producer.send({
      topic: 'parking-bookings',
      messages: [{ value: JSON.stringify(bookingData) }]
    });
  }

  async publishCancellation(cancellationData) {
    await this.producer.send({
      topic: 'parking-cancellations',
      messages: [{ value: JSON.stringify(cancellationData) }]
    });
  }
}

module.exports = { BookingProducer };
