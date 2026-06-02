class BookingService {
  constructor(bookings, spots, events) {
    this.bookings = bookings;
    this.spots = spots;
    this.events = events;
  }

  async book(user, spotId, durationHours, totalCost) {
    const spot = await this.spots.findById(spotId);
    if (!spot) {
      throw new Error('Spot not found.');
    }
    return this.bookings.save({
      userId: user.id,
      spotId,
      durationHours,
      totalCost
    });
  }

  async cancel(user, bookingId) {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      return { found: false, allowed: false };
    }
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return { found: true, allowed: false };
    }
    booking.status = 'CANCELLED';
    await this.bookings.update(booking);
    return { found: true, allowed: true };
  }
}

module.exports = { BookingService };
