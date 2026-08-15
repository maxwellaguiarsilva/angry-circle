export class DataLoader {
  constructor() {
    this.sources = new Map();
  }

  async load(url) {
    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw new Error(`DataLoader: failed to fetch "${url}". Cause: ${cause.message}`);
    }
    if (!response.ok) {
      throw new Error(`DataLoader: fetch "${url}" returned HTTP ${response.status} ${response.statusText}.`);
    }
    let data;
    try {
      data = await response.json();
    } catch (cause) {
      throw new Error(`DataLoader: "${url}" is not valid JSON. Cause: ${cause.message}`);
    }
    this.sources.set(url, data);
    return data;
  }

  get(url, key) {
    const source = this.sources.get(url);
    if (source === undefined) {
      throw new Error(`DataLoader: source "${url}" not loaded. Call load() before get().`);
    }
    if (!(key in source)) {
      throw new Error(`DataLoader: missing key "${key}" in source "${url}".`);
    }
    return source[key];
  }
}
