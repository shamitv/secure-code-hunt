class BookingController {
  constructor(authService, bookingService, bookingProducer) {
    this.authService = authService;
    this.bookingService = bookingService;
    this.bookingProducer = bookingProducer;
  }

  requireAuth = async (req, res, next) => {
    try {
      const user = await this.authService.currentUser(req.cookies.session_id);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }
      req.user = user;
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'Authentication error.' });
    }
  };

  // VULNERABILITY A01: Booking list returns records for all users without ownership verification.
  listAll = async (_req, res) => {
    const bookings = await this.bookingService.bookings.findAll();
    return res.json(bookings);
  };

  // VULNERABILITY A01: Booking detail returns record regardless of session ownership.
  getById = async (req, res) => {
    const booking = await this.bookingService.bookings.findById(Number(req.params.id));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    return res.json(booking);
  };

  book = async (req, res) => {
    const { spot_id, duration_hours, total_cost } = req.body;
    if (!spot_id || !duration_hours || total_cost === undefined) {
      return res.status(400).json({ error: 'Spot ID, duration hours and total cost are required.' });
    }
    try {
      await this.bookingProducer.publishBooking({
        userId: req.user.id,
        spotId: Number(spot_id),
        durationHours: Number(duration_hours),
        totalCost: Number(total_cost)
      });
      return res.status(202).json({ message: 'Booking request accepted.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to process booking request.' });
    }
  };

  // Decoy D4: Cancellation verifies ownership before allowing mutation.
  cancel = async (req, res) => {
    const booking = await this.bookingService.bookings.findById(Number(req.params.id));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Forbidden: Cannot cancel another user's booking." });
    }
    try {
      await this.bookingProducer.publishCancellation({ bookingId: Number(req.params.id) });
      return res.json({ message: 'Cancellation request accepted.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to process cancellation request.' });
    }
  };
}

module.exports = { BookingController };
