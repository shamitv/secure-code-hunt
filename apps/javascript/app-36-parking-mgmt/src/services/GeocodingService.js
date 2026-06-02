const axios = require('axios');

class GeocodingService {
  async resolveAddress(address) {
    const url = new URL(`https://api.maps.example.com/geocode?address=${encodeURIComponent(address)}`);
    if (!['api.maps.example.com'].includes(url.hostname)) {
      throw new Error('invalid host');
    }
    const response = await axios.get(url.toString(), { timeout: 5000 });
    return response.data;
  }
}

module.exports = { GeocodingService };
