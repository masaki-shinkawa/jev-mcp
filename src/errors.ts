export class JevApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'JevApiError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
