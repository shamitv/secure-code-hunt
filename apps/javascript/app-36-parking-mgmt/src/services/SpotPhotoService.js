const axios = require('axios');

// VULNERABILITY A10: Spot photo import fetches user-supplied URL without hostname validation.
// CHAIN LINK 2 (chain-02): Attacker supplies internal service URL learned from debug endpoint.
class SpotPhotoService {
  async importPhoto(imageUrl) {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 5000 });
    return { size: response.data.length, contentType: response.headers['content-type'] || 'application/octet-stream' };
  }
}

module.exports = { SpotPhotoService };
