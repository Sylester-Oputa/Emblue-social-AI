"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('platform', function () { return ({
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    x: {
        clientId: process.env.X_CLIENT_ID || '',
        clientSecret: process.env.X_CLIENT_SECRET || '',
        callbackUrl: process.env.X_CALLBACK_URL || '',
    },
    instagram: {
        clientId: process.env.INSTAGRAM_CLIENT_ID || '',
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
        callbackUrl: process.env.INSTAGRAM_CALLBACK_URL || '',
    },
    facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        callbackUrl: process.env.FACEBOOK_CALLBACK_URL || '',
    },
    tiktok: {
        clientId: process.env.TIKTOK_CLIENT_ID || '',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
        callbackUrl: process.env.TIKTOK_CALLBACK_URL || '',
    },
}); });
