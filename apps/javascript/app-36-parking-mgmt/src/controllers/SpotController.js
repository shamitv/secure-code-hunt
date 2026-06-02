class SpotController {
  constructor(authService, spotService, lotLayoutService, mongoDb, spotPhotoService) {
    this.authService = authService;
    this.spotService = spotService;
    this.lotLayoutService = lotLayoutService;
    this.mongoDb = mongoDb;
    this.spotPhotoService = spotPhotoService;
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

  requireAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access only.' });
    }
    return next();
  };

  create = async (req, res) => {
    try {
      const spot = await this.spotService.createSpot(req.body);
      return res.status(201).json({ message: 'Spot registered.', spotId: spot.id });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  };

  search = async (req, res) => {
    const result = await this.spotService.search(String(req.query.q || ''));
    return res.json(result);
  };

  detail = async (req, res) => {
    const spot = await this.spotService.findById(Number(req.params.id));
    if (!spot) {
      return res.status(404).json({ error: 'Spot not found.' });
    }
    return res.json(spot);
  };

  getLayout = async (req, res) => {
    const spot = await this.spotService.findById(Number(req.params.id));
    if (!spot) {
      return res.status(404).json({ error: 'Spot not found.' });
    }
    const layout = await this.lotLayoutService.getByLotId(this.mongoDb, spot.spotNumber);
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found for this spot.' });
    }
    return res.json(layout);
  };

  importPhoto = async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required.' });
    }
    try {
      const result = await this.spotPhotoService.importPhoto(imageUrl);
      return res.json({ message: 'Photo imported.', ...result });
    } catch (err) {
      return res.status(400).json({ error: 'Failed to import photo: ' + err.message });
    }
  };
}

module.exports = { SpotController };
