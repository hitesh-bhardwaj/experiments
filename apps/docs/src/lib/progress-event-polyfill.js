if (typeof globalThis.ProgressEvent === "undefined") {
  globalThis.ProgressEvent = class ProgressEvent extends Event {
    constructor(type, eventInitDict = {}) {
      super(type, eventInitDict);
      this.lengthComputable = Boolean(eventInitDict.lengthComputable);
      this.loaded = Number(eventInitDict.loaded ?? 0);
      this.total = Number(eventInitDict.total ?? 0);
    }
  };
}
