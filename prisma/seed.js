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
require("dotenv/config");
var client_1 = require("@prisma/client");
var mockData_1 = require("../lib/mockData");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, mockCasts_1, cast, _a, mockAvailabilities_1, castAvail, _b, _c, dayAvail;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('Seeding Database...');
                    // 1. Create default StoreSetting
                    return [4 /*yield*/, prisma.storeSetting.upsert({
                            where: { id: 'main-store' },
                            update: {
                                name: 'Demo Store',
                                businessStart: '18:00',
                                businessEnd: '05:00',
                                defaultSegments: mockData_1.storeSettings.defaultSegments,
                            },
                            create: {
                                id: 'main-store',
                                name: 'Demo Store',
                                businessStart: '18:00',
                                businessEnd: '05:00',
                                defaultSegments: mockData_1.storeSettings.defaultSegments,
                            },
                        })];
                case 1:
                    // 1. Create default StoreSetting
                    _d.sent();
                    _i = 0, mockCasts_1 = mockData_1.mockCasts;
                    _d.label = 2;
                case 2:
                    if (!(_i < mockCasts_1.length)) return [3 /*break*/, 5];
                    cast = mockCasts_1[_i];
                    return [4 /*yield*/, prisma.cast.upsert({
                            where: { id: cast.id },
                            update: {
                                name: cast.name,
                                hourlyWage: cast.hourlyWage,
                                averageSales: cast.averageSales,
                                nominationRate: cast.nominationRate,
                                isRookie: cast.isRookie,
                                preferredSegments: cast.preferredSegments,
                            },
                            create: {
                                id: cast.id,
                                name: cast.name,
                                hourlyWage: cast.hourlyWage,
                                averageSales: cast.averageSales,
                                nominationRate: cast.nominationRate,
                                isRookie: cast.isRookie,
                                preferredSegments: cast.preferredSegments,
                            },
                        })];
                case 3:
                    _d.sent();
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    _a = 0, mockAvailabilities_1 = mockData_1.mockAvailabilities;
                    _d.label = 6;
                case 6:
                    if (!(_a < mockAvailabilities_1.length)) return [3 /*break*/, 11];
                    castAvail = mockAvailabilities_1[_a];
                    _b = 0, _c = castAvail.availability;
                    _d.label = 7;
                case 7:
                    if (!(_b < _c.length)) return [3 /*break*/, 10];
                    dayAvail = _c[_b];
                    return [4 /*yield*/, prisma.availability.upsert({
                            where: {
                                castId_date: {
                                    castId: castAvail.castId,
                                    date: dayAvail.date,
                                }
                            },
                            update: {
                                startTime: dayAvail.startTime,
                                endTime: dayAvail.endTime,
                                segments: dayAvail.segments,
                            },
                            create: {
                                castId: castAvail.castId,
                                date: dayAvail.date,
                                startTime: dayAvail.startTime,
                                endTime: dayAvail.endTime,
                                segments: dayAvail.segments,
                            },
                        })];
                case 8:
                    _d.sent();
                    _d.label = 9;
                case 9:
                    _b++;
                    return [3 /*break*/, 7];
                case 10:
                    _a++;
                    return [3 /*break*/, 6];
                case 11:
                    console.log('Database Seeding Completed');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })
    .catch(function (e) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.error(e);
                return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                process.exit(1);
                return [2 /*return*/];
        }
    });
}); });
