"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
var common_1 = require("@nestjs/common");
var bcrypt = require("bcrypt");
var AuthService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AuthService = _classThis = /** @class */ (function () {
        function AuthService_1(prisma, jwt, config) {
            this.prisma = prisma;
            this.jwt = jwt;
            this.config = config;
        }
        AuthService_1.prototype.register = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, passwordHash, result, tokens;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { email: dto.email },
                            })];
                        case 1:
                            existing = _a.sent();
                            if (existing) {
                                throw new common_1.ConflictException('Email already registered');
                            }
                            return [4 /*yield*/, bcrypt.hash(dto.password, 12)];
                        case 2:
                            passwordHash = _a.sent();
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var tenant, workspace, user;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.tenant.create({
                                                    data: {
                                                        name: dto.companyName || "".concat(dto.firstName, "'s Organization"),
                                                        slug: this.generateSlug(dto.companyName || dto.email),
                                                    },
                                                })];
                                            case 1:
                                                tenant = _a.sent();
                                                return [4 /*yield*/, tx.workspace.create({
                                                        data: {
                                                            tenantId: tenant.id,
                                                            name: 'Default Workspace',
                                                            slug: 'default',
                                                        },
                                                    })];
                                            case 2:
                                                workspace = _a.sent();
                                                return [4 /*yield*/, tx.user.create({
                                                        data: {
                                                            tenantId: tenant.id,
                                                            email: dto.email,
                                                            passwordHash: passwordHash,
                                                            firstName: dto.firstName,
                                                            lastName: dto.lastName,
                                                            role: 'TENANT_ADMIN',
                                                        },
                                                    })];
                                            case 3:
                                                user = _a.sent();
                                                return [4 /*yield*/, tx.membership.create({
                                                        data: {
                                                            userId: user.id,
                                                            workspaceId: workspace.id,
                                                            role: 'TENANT_ADMIN',
                                                        },
                                                    })];
                                            case 4:
                                                _a.sent();
                                                return [4 /*yield*/, tx.approvalQueue.create({
                                                        data: {
                                                            workspaceId: workspace.id,
                                                            name: 'Default Queue',
                                                            isDefault: true,
                                                            slaHours: 24,
                                                        },
                                                    })];
                                            case 5:
                                                _a.sent();
                                                return [2 /*return*/, { tenant: tenant, workspace: workspace, user: user }];
                                        }
                                    });
                                }); })];
                        case 3:
                            result = _a.sent();
                            return [4 /*yield*/, this.generateTokens(result.user.id, result.user.email, result.user.role, result.user.tenantId)];
                        case 4:
                            tokens = _a.sent();
                            return [2 /*return*/, __assign(__assign({}, tokens), { user: this.sanitizeUser(result.user) })];
                    }
                });
            });
        };
        AuthService_1.prototype.login = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, isPasswordValid, tokens;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { email: dto.email },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException('Invalid credentials');
                            }
                            return [4 /*yield*/, bcrypt.compare(dto.password, user.passwordHash)];
                        case 2:
                            isPasswordValid = _a.sent();
                            if (!isPasswordValid) {
                                throw new common_1.UnauthorizedException('Invalid credentials');
                            }
                            if (!user.isActive) {
                                throw new common_1.UnauthorizedException('Account is deactivated');
                            }
                            return [4 /*yield*/, this.prisma.user.update({
                                    where: { id: user.id },
                                    data: { lastLoginAt: new Date() },
                                })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.generateTokens(user.id, user.email, user.role, user.tenantId)];
                        case 4:
                            tokens = _a.sent();
                            return [2 /*return*/, __assign(__assign({}, tokens), { user: this.sanitizeUser(user) })];
                    }
                });
            });
        };
        AuthService_1.prototype.refresh = function (refreshToken) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, user, tokens, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 3, , 4]);
                            payload = this.jwt.verify(refreshToken, {
                                secret: this.config.get('auth.jwtRefreshSecret'),
                            });
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: payload.sub },
                                })];
                        case 1:
                            user = _b.sent();
                            if (!user || !user.isActive) {
                                throw new common_1.UnauthorizedException('Invalid refresh token');
                            }
                            return [4 /*yield*/, this.generateTokens(user.id, user.email, user.role, user.tenantId)];
                        case 2:
                            tokens = _b.sent();
                            return [2 /*return*/, tokens];
                        case 3:
                            _a = _b.sent();
                            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        AuthService_1.prototype.getMe = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { id: userId },
                                include: {
                                    memberships: {
                                        include: {
                                            workspace: {
                                                select: { id: true, name: true, slug: true },
                                            },
                                        },
                                    },
                                },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException('User not found');
                            }
                            return [2 /*return*/, this.sanitizeUser(user)];
                    }
                });
            });
        };
        AuthService_1.prototype.generateTokens = function (userId, email, role, tenantId) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, _a, accessToken, refreshToken;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            payload = { sub: userId, email: email, role: role, tenantId: tenantId };
                            return [4 /*yield*/, Promise.all([
                                    this.jwt.signAsync(payload, {
                                        secret: this.config.get('auth.jwtSecret'),
                                        expiresIn: this.config.get('auth.jwtAccessExpiry', '15m'),
                                    }),
                                    this.jwt.signAsync(payload, {
                                        secret: this.config.get('auth.jwtRefreshSecret'),
                                        expiresIn: this.config.get('auth.jwtRefreshExpiry', '7d'),
                                    }),
                                ])];
                        case 1:
                            _a = _b.sent(), accessToken = _a[0], refreshToken = _a[1];
                            return [2 /*return*/, { accessToken: accessToken, refreshToken: refreshToken }];
                    }
                });
            });
        };
        AuthService_1.prototype.sanitizeUser = function (user) {
            var passwordHash = user.passwordHash, sanitized = __rest(user, ["passwordHash"]);
            return sanitized;
        };
        AuthService_1.prototype.generateSlug = function (input) {
            return (input
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
                .substring(0, 50) +
                '-' +
                Date.now().toString(36));
        };
        return AuthService_1;
    }());
    __setFunctionName(_classThis, "AuthService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
}();
exports.AuthService = AuthService;
