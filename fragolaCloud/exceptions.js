// Base exception class
export class FragolaCloudError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FragolaError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, FragolaCloudError);
        }
    }
}
