"use strict";
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var core_1 = require("@nestjs/core");
var bullmq_1 = require("@nestjs/bullmq");
var schedule_1 = require("@nestjs/schedule");
// Config
var app_config_1 = require("./config/app.config");
var database_config_1 = require("./config/database.config");
var redis_config_1 = require("./config/redis.config");
var auth_config_1 = require("./config/auth.config");
var platform_config_1 = require("./config/platform.config");
var queue_config_1 = require("./config/queue.config");
// Core modules
var database_module_1 = require("./database/database.module");
var auth_module_1 = require("./auth/auth.module");
var audit_module_1 = require("./audit/audit.module");
// Feature modules
var tenants_module_1 = require("./tenants/tenants.module");
var workspaces_module_1 = require("./workspaces/workspaces.module");
var users_module_1 = require("./users/users.module");
var integrations_module_1 = require("./integrations/integrations.module");
var ingestion_module_1 = require("./ingestion/ingestion.module");
var signals_module_1 = require("./signals/signals.module");
var intelligence_module_1 = require("./intelligence/intelligence.module");
var policies_module_1 = require("./policies/policies.module");
var approvals_module_1 = require("./approvals/approvals.module");
var responses_module_1 = require("./responses/responses.module");
var delivery_module_1 = require("./delivery/delivery.module");
var campaigns_module_1 = require("./campaigns/campaigns.module");
var analytics_module_1 = require("./analytics/analytics.module");
var notifications_module_1 = require("./notifications/notifications.module");
var ops_module_1 = require("./ops/ops.module");
// Guards
var jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
var roles_guard_1 = require("./common/guards/roles.guard");
// Controllers
var app_controller_1 = require("./app.controller");
// Queue names
var queue_events_1 = require("./common/constants/queue-events");
var AppModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: __spreadArray(__spreadArray([
                // Configuration
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                    load: [app_config_1.default, database_config_1.default, redis_config_1.default, auth_config_1.default, platform_config_1.default, queue_config_1.default],
                    envFilePath: '.env',
                }),
                // BullMQ
                bullmq_1.BullModule.forRoot({
                    connection: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: parseInt(process.env.REDIS_PORT || '6379', 10),
                        password: process.env.REDIS_PASSWORD || undefined,
                    },
                })
            ], queue_events_1.ALL_QUEUE_NAMES.map(function (name) {
                return bullmq_1.BullModule.registerQueue({ name: name });
            }), true), [
                // Schedule (cron jobs)
                schedule_1.ScheduleModule.forRoot(),
                // Core
                database_module_1.DatabaseModule,
                auth_module_1.AuthModule,
                audit_module_1.AuditModule,
                // Feature modules
                tenants_module_1.TenantsModule,
                workspaces_module_1.WorkspacesModule,
                users_module_1.UsersModule,
                integrations_module_1.IntegrationsModule,
                ingestion_module_1.IngestionModule,
                signals_module_1.SignalsModule,
                intelligence_module_1.IntelligenceModule,
                policies_module_1.PoliciesModule,
                approvals_module_1.ApprovalsModule,
                responses_module_1.ResponsesModule,
                delivery_module_1.DeliveryModule,
                campaigns_module_1.CampaignsModule,
                analytics_module_1.AnalyticsModule,
                notifications_module_1.NotificationsModule,
                ops_module_1.OpsModule,
            ], false),
            controllers: [app_controller_1.AppController],
            providers: [
                // Global JWT guard — all routes are protected by default
                {
                    provide: core_1.APP_GUARD,
                    useClass: jwt_auth_guard_1.JwtAuthGuard,
                },
                // Global roles guard
                {
                    provide: core_1.APP_GUARD,
                    useClass: roles_guard_1.RolesGuard,
                },
            ],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppModule = _classThis = /** @class */ (function () {
        function AppModule_1() {
        }
        return AppModule_1;
    }());
    __setFunctionName(_classThis, "AppModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
}();
exports.AppModule = AppModule;
