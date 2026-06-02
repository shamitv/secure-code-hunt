export class ConfigService {
  getEnv() {
    return { ...process.env };
  }
}
