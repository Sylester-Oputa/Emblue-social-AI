"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('queue', function () { return ({
    defaultAttempts: parseInt(process.env.QUEUE_DEFAULT_ATTEMPTS || '3', 10),
    defaultBackoff: parseInt(process.env.QUEUE_DEFAULT_BACKOFF || '3000', 10),
}); });
