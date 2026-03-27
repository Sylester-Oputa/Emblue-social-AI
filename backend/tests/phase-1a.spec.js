"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var test_1 = require("@playwright/test");
var BASE = 'http://localhost:3000';
// ── Shared state across tests ──
var accessToken;
var refreshToken;
var userId;
var testUser = {
    email: "test-".concat(Date.now(), "@emblue.dev"),
    password: 'StrongP@ss123',
    firstName: 'Test',
    lastName: 'User',
    companyName: 'Test Corp',
};
test_1.test.describe.serial('Phase 1A — Foundation & Bootstrap', function () {
    // ── Health ──
    (0, test_1.test)('GET /health → 200, status ok', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.get("".concat(BASE, "/health"))];
                case 1:
                    res = _c.sent();
                    (0, test_1.expect)(res.status()).toBe(200);
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _c.sent();
                    (0, test_1.expect)(body.success).toBe(true);
                    (0, test_1.expect)(body.data.status).toBe('ok');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('GET /health/ready → 200, has services.database', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.get("".concat(BASE, "/health/ready"))];
                case 1:
                    res = _c.sent();
                    (0, test_1.expect)(res.status()).toBe(200);
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _c.sent();
                    (0, test_1.expect)(body.success).toBe(true);
                    (0, test_1.expect)(body.data.services).toBeDefined();
                    (0, test_1.expect)(body.data.services.database).toBeDefined();
                    (0, test_1.expect)(body.data.services.database.status).toBe('healthy');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('GET /docs → Swagger UI accessible', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.get("".concat(BASE, "/docs"))];
                case 1:
                    res = _c.sent();
                    // Swagger returns HTML or redirects
                    (0, test_1.expect)([200, 301, 302]).toContain(res.status());
                    return [2 /*return*/];
            }
        });
    }); });
    // ── Auth: Register ──
    (0, test_1.test)('POST /auth/register → 201, returns tokens + user', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.post("".concat(BASE, "/auth/register"), {
                        data: testUser,
                    })];
                case 1:
                    res = _c.sent();
                    (0, test_1.expect)(res.status()).toBe(201);
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _c.sent();
                    (0, test_1.expect)(body.success).toBe(true);
                    (0, test_1.expect)(body.data.accessToken).toBeTruthy();
                    (0, test_1.expect)(body.data.refreshToken).toBeTruthy();
                    (0, test_1.expect)(body.data.user).toBeDefined();
                    (0, test_1.expect)(body.data.user.email).toBe(testUser.email);
                    (0, test_1.expect)(body.data.user.passwordHash).toBeUndefined();
                    accessToken = body.data.accessToken;
                    refreshToken = body.data.refreshToken;
                    userId = body.data.user.id;
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('POST /auth/register duplicate email → 409', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.post("".concat(BASE, "/auth/register"), {
                        data: testUser,
                    })];
                case 1:
                    res = _c.sent();
                    (0, test_1.expect)(res.status()).toBe(409);
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _c.sent();
                    (0, test_1.expect)(body.success).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    // ── Auth: Login ──
    (0, test_1.test)('POST /auth/login → 200, returns tokens', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.post("".concat(BASE, "/auth/login"), {
                        data: {
                            email: testUser.email,
                            password: testUser.password,
                        },
                    })];
                case 1:
                    res = _c.sent();
                    (0, test_1.expect)(res.status()).toBe(200);
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _c.sent();
                    (0, test_1.expect)(body.success).toBe(true);
                    (0, test_1.expect)(body.data.accessToken).toBeTruthy();
                    (0, test_1.expect)(body.data.refreshToken).toBeTruthy();
                    (0, test_1.expect)(body.data.user).toBeDefined();
                    // Update tokens from login
                    accessToken = body.data.accessToken;
                    refreshToken = body.data.refreshToken;
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('POST /auth/login wrong password → 401', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.post("".concat(BASE, "/auth/login"), {
                        data: {
                            email: testUser.email,
                            password: 'WrongP@ss999',
                        },
                    })];
                case 1:
                    res = _c.sent();
                    (0, test_1.expect)(res.status()).toBe(401);
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _c.sent();
                    (0, test_1.expect)(body.success).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    // ── Auth: Me ──
    (0, test_1.test)('GET /auth/me with token → 200, returns user', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.get("".concat(BASE, "/auth/me"), {
                        headers: { Authorization: "Bearer ".concat(accessToken) },
                    })];
                case 1:
                    res = _c.sent();
                    (0, test_1.expect)(res.status()).toBe(200);
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _c.sent();
                    (0, test_1.expect)(body.success).toBe(true);
                    (0, test_1.expect)(body.data.email).toBe(testUser.email);
                    (0, test_1.expect)(body.data.id).toBe(userId);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('GET /auth/me no token → 401', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.get("".concat(BASE, "/auth/me"))];
                case 1:
                    res = _c.sent();
                    (0, test_1.expect)(res.status()).toBe(401);
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _c.sent();
                    (0, test_1.expect)(body.success).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    // ── Auth: Refresh ──
    (0, test_1.test)('POST /auth/refresh → 200, returns new accessToken', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var res, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.post("".concat(BASE, "/auth/refresh"), {
                        data: { refreshToken: refreshToken },
                    })];
                case 1:
                    res = _c.sent();
                    (0, test_1.expect)(res.status()).toBe(200);
                    return [4 /*yield*/, res.json()];
                case 2:
                    body = _c.sent();
                    (0, test_1.expect)(body.success).toBe(true);
                    (0, test_1.expect)(body.data.accessToken).toBeTruthy();
                    (0, test_1.expect)(body.data.refreshToken).toBeTruthy();
                    return [2 /*return*/];
            }
        });
    }); });
});
