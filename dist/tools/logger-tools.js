"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerTools = exports.cocosLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class CocosLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 10000;
        this.workflowTimers = new Map();
        this.activeWorkflows = new Set();
        this.autoSaveEnabled = true;
        this.autoDownloadEnabled = true;
        this.autoSaveInterval = null;
        this.autoDownloadInterval = null;
        this.STORAGE_KEY = 'cocos_game_logs';
        this.AUTO_SAVE_INTERVAL = 30000; // 30 seconds
        this.AUTO_DOWNLOAD_INTERVAL = 300000; // 5 minutes
        this.isEnabled = true;
        this.initializeLogger();
    }
    initializeLogger() {
        this.log('info', 'Cocos Game Logger initialized - Auto-save and auto-download enabled');
        // Load existing logs from storage
        this.loadFromStorage();
        // Start auto-save functionality
        this.startAutoSave();
        // Start auto-download functionality
        this.startAutoDownload();
    }
    log(level, message, data, context) {
        if (!this.isEnabled)
            return;
        const timestamp = new Date().toISOString();
        let logEntry = `[${timestamp}] [${level.toUpperCase()}]`;
        // Add category if provided
        if (context === null || context === void 0 ? void 0 : context.category) {
            logEntry += ` [${context.category.toUpperCase()}]`;
        }
        logEntry += ` ${message}`;
        // Add workflow context
        if (context === null || context === void 0 ? void 0 : context.workflow) {
            logEntry += ` | Workflow: ${context.workflow}`;
        }
        // Add IDs if provided
        const ids = [];
        if (context === null || context === void 0 ? void 0 : context.userId)
            ids.push(`User:${context.userId}`);
        if (context === null || context === void 0 ? void 0 : context.sessionId)
            ids.push(`Session:${context.sessionId}`);
        if (context === null || context === void 0 ? void 0 : context.roundId)
            ids.push(`Round:${context.roundId}`);
        if (context === null || context === void 0 ? void 0 : context.betId)
            ids.push(`Bet:${context.betId}`);
        if (context === null || context === void 0 ? void 0 : context.requestId)
            ids.push(`Request:${context.requestId}`);
        if (context === null || context === void 0 ? void 0 : context.nodeUuid)
            ids.push(`Node:${context.nodeUuid}`);
        if (context === null || context === void 0 ? void 0 : context.componentType)
            ids.push(`Component:${context.componentType}`);
        if (context === null || context === void 0 ? void 0 : context.sceneName)
            ids.push(`Scene:${context.sceneName}`);
        if (ids.length > 0) {
            logEntry += ` | IDs: {${ids.join(', ')}}`;
        }
        // Add duration if provided
        if ((context === null || context === void 0 ? void 0 : context.duration) !== undefined) {
            logEntry += ` | Duration: ${context.duration}ms`;
        }
        // Add data
        if (data) {
            try {
                logEntry += ` | Data: ${JSON.stringify(data, this.safeStringifyReplacer, 2)}`;
            }
            catch (error) {
                logEntry += ` | Data: [Circular or Non-Serializable Object]`;
            }
        }
        // Store in memory
        this.logs.push(logEntry);
        // Prevent memory overflow
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        // Auto-save to storage on critical logs
        if (level === 'error' || message.includes('Workflow completed') || message.includes('API Response')) {
            this.saveToStorage();
        }
        // Also send to Editor console
        this.sendToEditorConsole(level, logEntry);
    }
    safeStringifyReplacer(key, value) {
        // Handle circular references and non-serializable objects
        if (typeof value === 'object' && value !== null) {
            if (value instanceof Error) {
                return { error: value.message, stack: value.stack };
            }
            if (value instanceof Date) {
                return value.toISOString();
            }
            if (typeof value === 'function') {
                return '[Function]';
            }
            if (value.constructor && value.constructor.name !== 'Object') {
                return `[${value.constructor.name}]`;
            }
        }
        return value;
    }
    sendToEditorConsole(level, message) {
        try {
            // Send to Editor console if available
            if (typeof Editor !== 'undefined' && Editor.Message) {
                const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
                Editor.Message.send('console', consoleMethod, message);
            }
        }
        catch (error) {
            // Silently fail if Editor console is not available
        }
    }
    // Public logging methods
    info(message, data, context) {
        this.log('info', message, data, context);
    }
    warn(message, data, context) {
        this.log('warn', message, data, context);
    }
    error(message, data, context) {
        this.log('error', message, data, context);
    }
    debug(message, data, context) {
        this.log('debug', message, data, context);
    }
    // Workflow tracking methods
    startWorkflow(workflowId, category, description, context) {
        if (this.activeWorkflows.has(workflowId)) {
            this.warn(`Workflow already active: ${workflowId}`, { workflowId, category }, context);
            return;
        }
        this.activeWorkflows.add(workflowId);
        this.workflowTimers.set(workflowId, {
            id: workflowId,
            startTime: Date.now(),
            category,
            description
        });
        this.info(`Workflow started: ${description}`, {
            workflowId,
            category,
            startTime: new Date().toISOString()
        }, Object.assign(Object.assign({}, context), { workflow: workflowId, category }));
    }
    endWorkflow(workflowId, context) {
        const timer = this.workflowTimers.get(workflowId);
        if (!timer) {
            this.warn(`Workflow not found: ${workflowId}`, { workflowId }, context);
            return;
        }
        const duration = Date.now() - timer.startTime;
        this.activeWorkflows.delete(workflowId);
        this.workflowTimers.delete(workflowId);
        this.info(`Workflow completed: ${timer.description}`, {
            workflowId,
            category: timer.category,
            duration,
            endTime: new Date().toISOString()
        }, Object.assign(Object.assign({}, context), { workflow: workflowId, category: timer.category, duration }));
    }
    // Cocos-specific logging methods
    logSceneEvent(event, sceneData, context) {
        this.info(`Scene event: ${event}`, sceneData, Object.assign(Object.assign({}, context), { category: 'scene' }));
    }
    logNodeEvent(event, nodeData, context) {
        this.info(`Node event: ${event}`, nodeData, Object.assign(Object.assign({}, context), { category: 'node' }));
    }
    logComponentEvent(event, componentData, context) {
        this.info(`Component event: ${event}`, componentData, Object.assign(Object.assign({}, context), { category: 'component' }));
    }
    logPrefabEvent(event, prefabData, context) {
        this.info(`Prefab event: ${event}`, prefabData, Object.assign(Object.assign({}, context), { category: 'prefab' }));
    }
    logGameEvent(event, eventData, context) {
        this.info(`Game event: ${event}`, eventData, Object.assign(Object.assign({}, context), { category: 'game-init' }));
    }
    logPhysicsEvent(event, physicsData, context) {
        this.debug(`Physics event: ${event}`, physicsData, Object.assign(Object.assign({}, context), { category: 'physics' }));
    }
    logUIEvent(event, uiData, context) {
        this.debug(`UI event: ${event}`, uiData, Object.assign(Object.assign({}, context), { category: 'ui' }));
    }
    logError(error, contextData, context) {
        this.error(`Error occurred: ${error.message}`, {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            contextData
        }, Object.assign(Object.assign({}, context), { category: 'error' }));
    }
    // Get all logs as a formatted string
    getLogs() {
        var _a;
        const header = `Cocos Game Console Logs\nGenerated: ${new Date().toLocaleString()}\nTotal Logs: ${this.logs.length}\nProject: ${((_a = Editor.Project) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'}\n\n`;
        return header + this.logs.join('\n');
    }
    // Clear all logs
    clear() {
        this.logs = [];
        this.saveToStorage();
        this.log('info', 'Logger cleared');
    }
    // Download logs as a text file
    downloadLogs(filename) {
        var _a, _b;
        const logsContent = this.getLogs();
        const projectName = ((_a = Editor.Project) === null || _a === void 0 ? void 0 : _a.name) || 'cocos-project';
        const defaultFilename = filename || `cocos-game-logs-${projectName}-${new Date().toISOString().split('T')[0]}.txt`;
        try {
            // Save to project temp directory
            const projectPath = ((_b = Editor.Project) === null || _b === void 0 ? void 0 : _b.path) || process.cwd();
            const tempDir = path.join(projectPath, 'temp', 'logs');
            const filePath = path.join(tempDir, defaultFilename);
            // Ensure directory exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            // Write file
            fs.writeFileSync(filePath, logsContent, 'utf8');
            // Also send to Editor console
            this.info(`Logs downloaded to: ${filePath}`, { filename: defaultFilename, path: filePath });
            return filePath;
        }
        catch (error) {
            this.error(`Failed to download logs: ${error.message}`, { filename: defaultFilename });
            return '';
        }
    }
    // Get log count
    getLogCount() {
        return this.logs.length;
    }
    // Enable/disable logging
    enable() {
        this.isEnabled = true;
        this.log('info', 'Logging enabled');
    }
    disable() {
        this.isEnabled = false;
        this.log('info', 'Logging disabled');
    }
    isLoggingEnabled() {
        return this.isEnabled;
    }
    // Get recent logs (last N entries)
    getRecentLogs(count = 10) {
        return this.logs.slice(-count);
    }
    // Auto-save functionality
    startAutoSave() {
        if (!this.autoSaveEnabled)
            return;
        this.autoSaveInterval = setInterval(() => {
            this.saveToStorage();
            this.debug('Auto-saved logs to storage', { logCount: this.logs.length });
        }, this.AUTO_SAVE_INTERVAL);
    }
    startAutoDownload() {
        if (!this.autoDownloadEnabled)
            return;
        this.autoDownloadInterval = setInterval(() => {
            if (this.logs.length > 0) {
                this.downloadLogs(`auto-cocos-game-logs-${new Date().toISOString().split('T')[0]}-${Date.now()}.txt`);
                this.info('Auto-downloaded logs', { logCount: this.logs.length });
            }
        }, this.AUTO_DOWNLOAD_INTERVAL);
    }
    saveToStorage() {
        var _a, _b;
        try {
            const projectPath = ((_a = Editor.Project) === null || _a === void 0 ? void 0 : _a.path) || process.cwd();
            const storagePath = path.join(projectPath, 'temp', this.STORAGE_KEY + '.json');
            const logsData = {
                logs: this.logs,
                timestamp: new Date().toISOString(),
                logCount: this.logs.length,
                projectName: ((_b = Editor.Project) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown'
            };
            const dir = path.dirname(storagePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(storagePath, JSON.stringify(logsData, null, 2), 'utf8');
        }
        catch (error) {
            this.error('Failed to save logs to storage', { error: error.message });
        }
    }
    loadFromStorage() {
        var _a;
        try {
            const projectPath = ((_a = Editor.Project) === null || _a === void 0 ? void 0 : _a.path) || process.cwd();
            const storagePath = path.join(projectPath, 'temp', this.STORAGE_KEY + '.json');
            if (fs.existsSync(storagePath)) {
                const logsData = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
                if (logsData.logs && Array.isArray(logsData.logs)) {
                    this.logs = logsData.logs;
                    this.info('Loaded logs from storage', {
                        loadedCount: this.logs.length,
                        storedTimestamp: logsData.timestamp,
                        projectName: logsData.projectName
                    });
                }
            }
        }
        catch (error) {
            this.warn('Failed to load logs from storage', { error: error.message });
        }
    }
    // Stop auto-save and auto-download (for cleanup)
    stopAutoOperations() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        if (this.autoDownloadInterval) {
            clearInterval(this.autoDownloadInterval);
            this.autoDownloadInterval = null;
        }
        this.saveToStorage();
        this.log('info', 'Auto-operations stopped and final save completed');
    }
}
// Create a singleton instance
exports.cocosLogger = new CocosLogger();
class LoggerTools {
    getTools() {
        return [
            {
                name: 'logger_get_status',
                description: 'Get current logger status and configuration',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'logger_enable',
                description: 'Enable logging',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'logger_disable',
                description: 'Disable logging',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'logger_get_logs',
                description: 'Get recent logs',
                inputSchema: {
                    type: 'object',
                    properties: {
                        count: {
                            type: 'number',
                            description: 'Number of recent logs to retrieve',
                            default: 50,
                            minimum: 1,
                            maximum: 1000
                        },
                        filter: {
                            type: 'string',
                            description: 'Filter logs by level',
                            enum: ['all', 'info', 'warn', 'error', 'debug'],
                            default: 'all'
                        }
                    }
                }
            },
            {
                name: 'logger_download_logs',
                description: 'Download logs to file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filename: {
                            type: 'string',
                            description: 'Custom filename for the log file (optional)'
                        }
                    }
                }
            },
            {
                name: 'logger_clear_logs',
                description: 'Clear all logs',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'logger_log_message',
                description: 'Add a custom log message',
                inputSchema: {
                    type: 'object',
                    properties: {
                        level: {
                            type: 'string',
                            description: 'Log level',
                            enum: ['info', 'warn', 'error', 'debug'],
                            default: 'info'
                        },
                        message: {
                            type: 'string',
                            description: 'Log message'
                        },
                        category: {
                            type: 'string',
                            description: 'Log category',
                            enum: ['game-init', 'betting', 'socket', 'physics', 'api', 'ui', 'state', 'pf', 'sound', 'preload', 'analytics', 'error', 'scene', 'node', 'component', 'prefab']
                        },
                        data: {
                            type: 'object',
                            description: 'Additional data to log'
                        }
                    },
                    required: ['message']
                }
            },
            {
                name: 'logger_start_workflow',
                description: 'Start a workflow timer',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workflowId: {
                            type: 'string',
                            description: 'Unique workflow identifier'
                        },
                        category: {
                            type: 'string',
                            description: 'Workflow category',
                            enum: ['game-init', 'betting', 'socket', 'physics', 'api', 'ui', 'state', 'pf', 'sound', 'preload', 'analytics', 'error', 'scene', 'node', 'component', 'prefab']
                        },
                        description: {
                            type: 'string',
                            description: 'Workflow description'
                        }
                    },
                    required: ['workflowId', 'category', 'description']
                }
            },
            {
                name: 'logger_end_workflow',
                description: 'End a workflow timer',
                inputSchema: {
                    type: 'object',
                    properties: {
                        workflowId: {
                            type: 'string',
                            description: 'Workflow identifier to end'
                        }
                    },
                    required: ['workflowId']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'logger_get_status':
                return await this.getLoggerStatus();
            case 'logger_enable':
                return await this.enableLogger();
            case 'logger_disable':
                return await this.disableLogger();
            case 'logger_get_logs':
                return await this.getLogs(args.count, args.filter);
            case 'logger_download_logs':
                return await this.downloadLogs(args.filename);
            case 'logger_clear_logs':
                return await this.clearLogs();
            case 'logger_log_message':
                return await this.logMessage(args.level, args.message, args.category, args.data);
            case 'logger_start_workflow':
                return await this.startWorkflow(args.workflowId, args.category, args.description);
            case 'logger_end_workflow':
                return await this.endWorkflow(args.workflowId);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async getLoggerStatus() {
        var _a;
        return {
            success: true,
            data: {
                enabled: exports.cocosLogger.isLoggingEnabled(),
                logCount: exports.cocosLogger.getLogCount(),
                maxLogs: 10000,
                autoSaveEnabled: true,
                autoDownloadEnabled: true,
                projectName: ((_a = Editor.Project) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'
            }
        };
    }
    async enableLogger() {
        exports.cocosLogger.enable();
        return {
            success: true,
            message: 'Logger enabled successfully'
        };
    }
    async disableLogger() {
        exports.cocosLogger.disable();
        return {
            success: true,
            message: 'Logger disabled successfully'
        };
    }
    async getLogs(count = 50, filter = 'all') {
        let logs = exports.cocosLogger.getRecentLogs(count);
        if (filter !== 'all') {
            logs = logs.filter(log => log.includes(`[${filter.toUpperCase()}]`));
        }
        return {
            success: true,
            data: {
                total: exports.cocosLogger.getLogCount(),
                returned: logs.length,
                filter: filter,
                logs: logs
            }
        };
    }
    async downloadLogs(filename) {
        const filepath = exports.cocosLogger.downloadLogs(filename);
        return {
            success: true,
            data: {
                filepath: filepath,
                filename: path.basename(filepath)
            },
            message: `Logs downloaded to: ${filepath}`
        };
    }
    async clearLogs() {
        exports.cocosLogger.clear();
        return {
            success: true,
            message: 'All logs cleared successfully'
        };
    }
    async logMessage(level, message, category, data) {
        const context = category ? { category } : undefined;
        switch (level) {
            case 'info':
                exports.cocosLogger.info(message, data, context);
                break;
            case 'warn':
                exports.cocosLogger.warn(message, data, context);
                break;
            case 'error':
                exports.cocosLogger.error(message, data, context);
                break;
            case 'debug':
                exports.cocosLogger.debug(message, data, context);
                break;
        }
        return {
            success: true,
            message: `Log message added: ${message}`
        };
    }
    async startWorkflow(workflowId, category, description) {
        exports.cocosLogger.startWorkflow(workflowId, category, description);
        return {
            success: true,
            message: `Workflow started: ${description}`
        };
    }
    async endWorkflow(workflowId) {
        exports.cocosLogger.endWorkflow(workflowId);
        return {
            success: true,
            message: `Workflow ended: ${workflowId}`
        };
    }
}
exports.LoggerTools = LoggerTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2xvZ2dlci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBb0M3QixNQUFNLFdBQVc7SUFjYjtRQWJRLFNBQUksR0FBYSxFQUFFLENBQUM7UUFDWCxZQUFPLEdBQVcsS0FBSyxDQUFDO1FBQ2pDLG1CQUFjLEdBQStCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDdkQsb0JBQWUsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN6QyxvQkFBZSxHQUFZLElBQUksQ0FBQztRQUNoQyx3QkFBbUIsR0FBWSxJQUFJLENBQUM7UUFDcEMscUJBQWdCLEdBQTBCLElBQUksQ0FBQztRQUMvQyx5QkFBb0IsR0FBMEIsSUFBSSxDQUFDO1FBQzFDLGdCQUFXLEdBQUcsaUJBQWlCLENBQUM7UUFDaEMsdUJBQWtCLEdBQUcsS0FBSyxDQUFDLENBQUMsYUFBYTtRQUN6QywyQkFBc0IsR0FBRyxNQUFNLENBQUMsQ0FBQyxZQUFZO1FBQ3RELGNBQVMsR0FBWSxJQUFJLENBQUM7UUFHOUIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVPLGdCQUFnQjtRQUNwQixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxxRUFBcUUsQ0FBQyxDQUFDO1FBRXhGLGtDQUFrQztRQUNsQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFdkIsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUVyQixvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVPLEdBQUcsQ0FBQyxLQUFZLEVBQUUsT0FBZSxFQUFFLElBQVUsRUFBRSxPQUFvQjtRQUN2RSxJQUFJLENBQUMs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dCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciwgQ29uc29sZU1lc3NhZ2UgfSBmcm9tICcuLi90eXBlcyc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuXHJcbnR5cGUgTGV2ZWwgPSAnaW5mbycgfCAnd2FybicgfCAnZXJyb3InIHwgJ2RlYnVnJztcclxudHlwZSBDYXRlZ29yeSA9ICdnYW1lLWluaXQnIHwgJ2JldHRpbmcnIHwgJ3NvY2tldCcgfCAncGh5c2ljcycgfCAnYXBpJyB8ICd1aScgfCAnc3RhdGUnIHwgJ3BmJyB8ICdzb3VuZCcgfCAncHJlbG9hZCcgfCAnYW5hbHl0aWNzJyB8ICdlcnJvcicgfCAnc2NlbmUnIHwgJ25vZGUnIHwgJ2NvbXBvbmVudCcgfCAncHJlZmFiJztcclxuXHJcbmludGVyZmFjZSBMb2dDb250ZXh0IHtcclxuICAgIGNhdGVnb3J5PzogQ2F0ZWdvcnk7XHJcbiAgICB3b3JrZmxvdz86IHN0cmluZztcclxuICAgIHVzZXJJZD86IHN0cmluZztcclxuICAgIHNlc3Npb25JZD86IHN0cmluZztcclxuICAgIHJvdW5kSWQ/OiBzdHJpbmc7XHJcbiAgICBiZXRJZD86IHN0cmluZztcclxuICAgIHRpbWVzdGFtcD86IHN0cmluZztcclxuICAgIGR1cmF0aW9uPzogbnVtYmVyO1xyXG4gICAgcmVxdWVzdElkPzogc3RyaW5nO1xyXG4gICAgbm9kZVV1aWQ/OiBzdHJpbmc7XHJcbiAgICBjb21wb25lbnRUeXBlPzogc3RyaW5nO1xyXG4gICAgc2NlbmVOYW1lPzogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgV29ya2Zsb3dUaW1lciB7XHJcbiAgICBpZDogc3RyaW5nO1xyXG4gICAgc3RhcnRUaW1lOiBudW1iZXI7XHJcbiAgICBjYXRlZ29yeTogQ2F0ZWdvcnk7XHJcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgTG9nZ2VyQ29uZmlnIHtcclxuICAgIG1heExvZ3M6IG51bWJlcjtcclxuICAgIGF1dG9TYXZlRW5hYmxlZDogYm9vbGVhbjtcclxuICAgIGF1dG9Eb3dubG9hZEVuYWJsZWQ6IGJvb2xlYW47XHJcbiAgICBhdXRvU2F2ZUludGVydmFsOiBudW1iZXI7XHJcbiAgICBhdXRvRG93bmxvYWRJbnRlcnZhbDogbnVtYmVyO1xyXG4gICAgc3RvcmFnZUtleTogc3RyaW5nO1xyXG59XHJcblxyXG5jbGFzcyBDb2Nvc0xvZ2dlciB7XHJcbiAgICBwcml2YXRlIGxvZ3M6IHN0cmluZ1tdID0gW107XHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IG1heExvZ3M6IG51bWJlciA9IDEwMDAwO1xyXG4gICAgcHJpdmF0ZSB3b3JrZmxvd1RpbWVyczogTWFwPHN0cmluZywgV29ya2Zsb3dUaW1lcj4gPSBuZXcgTWFwKCk7XHJcbiAgICBwcml2YXRlIGFjdGl2ZVdvcmtmbG93czogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XHJcbiAgICBwcml2YXRlIGF1dG9TYXZlRW5hYmxlZDogYm9vbGVhbiA9IHRydWU7XHJcbiAgICBwcml2YXRlIGF1dG9Eb3dubG9hZEVuYWJsZWQ6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgcHJpdmF0ZSBhdXRvU2F2ZUludGVydmFsOiBOb2RlSlMuVGltZW91dCB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBhdXRvRG93bmxvYWRJbnRlcnZhbDogTm9kZUpTLlRpbWVvdXQgfCBudWxsID0gbnVsbDtcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgU1RPUkFHRV9LRVkgPSAnY29jb3NfZ2FtZV9sb2dzJztcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgQVVUT19TQVZFX0lOVEVSVkFMID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcclxuICAgIHByaXZhdGUgcmVhZG9ubHkgQVVUT19ET1dOTE9BRF9JTlRFUlZBTCA9IDMwMDAwMDsgLy8gNSBtaW51dGVzXHJcbiAgICBwcml2YXRlIGlzRW5hYmxlZDogYm9vbGVhbiA9IHRydWU7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5pbml0aWFsaXplTG9nZ2VyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpbml0aWFsaXplTG9nZ2VyKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMubG9nKCdpbmZvJywgJ0NvY29zIEdhbWUgTG9nZ2VyIGluaXRpYWxpemVkIC0gQXV0by1zYXZlIGFuZCBhdXRvLWRvd25sb2FkIGVuYWJsZWQnKTtcclxuXHJcbiAgICAgICAgLy8gTG9hZCBleGlzdGluZyBsb2dzIGZyb20gc3RvcmFnZVxyXG4gICAgICAgIHRoaXMubG9hZEZyb21TdG9yYWdlKCk7XHJcblxyXG4gICAgICAgIC8vIFN0YXJ0IGF1dG8tc2F2ZSBmdW5jdGlvbmFsaXR5XHJcbiAgICAgICAgdGhpcy5zdGFydEF1dG9TYXZlKCk7XHJcblxyXG4gICAgICAgIC8vIFN0YXJ0IGF1dG8tZG93bmxvYWQgZnVuY3Rpb25hbGl0eVxyXG4gICAgICAgIHRoaXMuc3RhcnRBdXRvRG93bmxvYWQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGxvZyhsZXZlbDogTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZywgZGF0YT86IGFueSwgY29udGV4dD86IExvZ0NvbnRleHQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNFbmFibGVkKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgICAgICBsZXQgbG9nRW50cnkgPSBgWyR7dGltZXN0YW1wfV0gWyR7bGV2ZWwudG9VcHBlckNhc2UoKX1dYDtcclxuXHJcbiAgICAgICAgLy8gQWRkIGNhdGVnb3J5IGlmIHByb3ZpZGVkXHJcbiAgICAgICAgaWYgKGNvbnRleHQ/LmNhdGVnb3J5KSB7XHJcbiAgICAgICAgICAgIGxvZ0VudHJ5ICs9IGAgWyR7Y29udGV4dC5jYXRlZ29yeS50b1VwcGVyQ2FzZSgpfV1gO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9nRW50cnkgKz0gYCAke21lc3NhZ2V9YDtcclxuXHJcbiAgICAgICAgLy8gQWRkIHdvcmtmbG93IGNvbnRleHRcclxuICAgICAgICBpZiAoY29udGV4dD8ud29ya2Zsb3cpIHtcclxuICAgICAgICAgICAgbG9nRW50cnkgKz0gYCB8IFdvcmtmbG93OiAke2NvbnRleHQud29ya2Zsb3d9YDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEFkZCBJRHMgaWYgcHJvdmlkZWRcclxuICAgICAgICBjb25zdCBpZHMgPSBbXTtcclxuICAgICAgICBpZiAoY29udGV4dD8udXNlcklkKSBpZHMucHVzaChgVXNlcjoke2NvbnRleHQudXNlcklkfWApO1xyXG4gICAgICAgIGlmIChjb250ZXh0Py5zZXNzaW9uSWQpIGlkcy5wdXNoKGBTZXNzaW9uOiR7Y29udGV4dC5zZXNzaW9uSWR9YCk7XHJcbiAgICAgICAgaWYgKGNvbnRleHQ/LnJvdW5kSWQpIGlkcy5wdXNoKGBSb3VuZDoke2NvbnRleHQucm91bmRJZH1gKTtcclxuICAgICAgICBpZiAoY29udGV4dD8uYmV0SWQpIGlkcy5wdXNoKGBCZXQ6JHtjb250ZXh0LmJldElkfWApO1xyXG4gICAgICAgIGlmIChjb250ZXh0Py5yZXF1ZXN0SWQpIGlkcy5wdXNoKGBSZXF1ZXN0OiR7Y29udGV4dC5yZXF1ZXN0SWR9YCk7XHJcbiAgICAgICAgaWYgKGNvbnRleHQ/Lm5vZGVVdWlkKSBpZHMucHVzaChgTm9kZToke2NvbnRleHQubm9kZVV1aWR9YCk7XHJcbiAgICAgICAgaWYgKGNvbnRleHQ/LmNvbXBvbmVudFR5cGUpIGlkcy5wdXNoKGBDb21wb25lbnQ6JHtjb250ZXh0LmNvbXBvbmVudFR5cGV9YCk7XHJcbiAgICAgICAgaWYgKGNvbnRleHQ/LnNjZW5lTmFtZSkgaWRzLnB1c2goYFNjZW5lOiR7Y29udGV4dC5zY2VuZU5hbWV9YCk7XHJcbiAgICAgICAgaWYgKGlkcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGxvZ0VudHJ5ICs9IGAgfCBJRHM6IHske2lkcy5qb2luKCcsICcpfX1gO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQWRkIGR1cmF0aW9uIGlmIHByb3ZpZGVkXHJcbiAgICAgICAgaWYgKGNvbnRleHQ/LmR1cmF0aW9uICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgbG9nRW50cnkgKz0gYCB8IER1cmF0aW9uOiAke2NvbnRleHQuZHVyYXRpb259bXNgO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQWRkIGRhdGFcclxuICAgICAgICBpZiAoZGF0YSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgbG9nRW50cnkgKz0gYCB8IERhdGE6ICR7SlNPTi5zdHJpbmdpZnkoZGF0YSwgdGhpcy5zYWZlU3RyaW5naWZ5UmVwbGFjZXIsIDIpfWA7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBsb2dFbnRyeSArPSBgIHwgRGF0YTogW0NpcmN1bGFyIG9yIE5vbi1TZXJpYWxpemFibGUgT2JqZWN0XWA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFN0b3JlIGluIG1lbW9yeVxyXG4gICAgICAgIHRoaXMubG9ncy5wdXNoKGxvZ0VudHJ5KTtcclxuXHJcbiAgICAgICAgLy8gUHJldmVudCBtZW1vcnkgb3ZlcmZsb3dcclxuICAgICAgICBpZiAodGhpcy5sb2dzLmxlbmd0aCA+IHRoaXMubWF4TG9ncykge1xyXG4gICAgICAgICAgICB0aGlzLmxvZ3MgPSB0aGlzLmxvZ3Muc2xpY2UoLXRoaXMubWF4TG9ncyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBBdXRvLXNhdmUgdG8gc3RvcmFnZSBvbiBjcml0aWNhbCBsb2dzXHJcbiAgICAgICAgaWYgKGxldmVsID09PSAnZXJyb3InIHx8IG1lc3NhZ2UuaW5jbHVkZXMoJ1dvcmtmbG93IGNvbXBsZXRlZCcpIHx8IG1lc3NhZ2UuaW5jbHVkZXMoJ0FQSSBSZXNwb25zZScpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2F2ZVRvU3RvcmFnZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQWxzbyBzZW5kIHRvIEVkaXRvciBjb25zb2xlXHJcbiAgICAgICAgdGhpcy5zZW5kVG9FZGl0b3JDb25zb2xlKGxldmVsLCBsb2dFbnRyeSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzYWZlU3RyaW5naWZ5UmVwbGFjZXIoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBhbnkge1xyXG4gICAgICAgIC8vIEhhbmRsZSBjaXJjdWxhciByZWZlcmVuY2VzIGFuZCBub24tc2VyaWFsaXphYmxlIG9iamVjdHNcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZXJyb3I6IHZhbHVlLm1lc3NhZ2UsIHN0YWNrOiB2YWx1ZS5zdGFjayB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnW0Z1bmN0aW9uXSc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLm5hbWUgIT09ICdPYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYFske3ZhbHVlLmNvbnN0cnVjdG9yLm5hbWV9XWA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2VuZFRvRWRpdG9yQ29uc29sZShsZXZlbDogTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFNlbmQgdG8gRWRpdG9yIGNvbnNvbGUgaWYgYXZhaWxhYmxlXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRWRpdG9yICE9PSAndW5kZWZpbmVkJyAmJiBFZGl0b3IuTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29uc29sZU1ldGhvZCA9IGxldmVsID09PSAnZXJyb3InID8gJ2Vycm9yJyA6IGxldmVsID09PSAnd2FybicgPyAnd2FybicgOiAnbG9nJztcclxuICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnNlbmQoJ2NvbnNvbGUnLCBjb25zb2xlTWV0aG9kLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIC8vIFNpbGVudGx5IGZhaWwgaWYgRWRpdG9yIGNvbnNvbGUgaXMgbm90IGF2YWlsYWJsZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBQdWJsaWMgbG9nZ2luZyBtZXRob2RzXHJcbiAgICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgZGF0YT86IGFueSwgY29udGV4dD86IExvZ0NvbnRleHQpIHtcclxuICAgICAgICB0aGlzLmxvZygnaW5mbycsIG1lc3NhZ2UsIGRhdGEsIGNvbnRleHQpO1xyXG4gICAgfVxyXG5cclxuICAgIHdhcm4obWVzc2FnZTogc3RyaW5nLCBkYXRhPzogYW55LCBjb250ZXh0PzogTG9nQ29udGV4dCkge1xyXG4gICAgICAgIHRoaXMubG9nKCd3YXJuJywgbWVzc2FnZSwgZGF0YSwgY29udGV4dCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBkYXRhPzogYW55LCBjb250ZXh0PzogTG9nQ29udGV4dCkge1xyXG4gICAgICAgIHRoaXMubG9nKCdlcnJvcicsIG1lc3NhZ2UsIGRhdGEsIGNvbnRleHQpO1xyXG4gICAgfVxyXG5cclxuICAgIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgZGF0YT86IGFueSwgY29udGV4dD86IExvZ0NvbnRleHQpIHtcclxuICAgICAgICB0aGlzLmxvZygnZGVidWcnLCBtZXNzYWdlLCBkYXRhLCBjb250ZXh0KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBXb3JrZmxvdyB0cmFja2luZyBtZXRob2RzXHJcbiAgICBzdGFydFdvcmtmbG93KHdvcmtmbG93SWQ6IHN0cmluZywgY2F0ZWdvcnk6IENhdGVnb3J5LCBkZXNjcmlwdGlvbjogc3RyaW5nLCBjb250ZXh0PzogTG9nQ29udGV4dCkge1xyXG4gICAgICAgIGlmICh0aGlzLmFjdGl2ZVdvcmtmbG93cy5oYXMod29ya2Zsb3dJZCkpIHtcclxuICAgICAgICAgICAgdGhpcy53YXJuKGBXb3JrZmxvdyBhbHJlYWR5IGFjdGl2ZTogJHt3b3JrZmxvd0lkfWAsIHsgd29ya2Zsb3dJZCwgY2F0ZWdvcnkgfSwgY29udGV4dCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYWN0aXZlV29ya2Zsb3dzLmFkZCh3b3JrZmxvd0lkKTtcclxuICAgICAgICB0aGlzLndvcmtmbG93VGltZXJzLnNldCh3b3JrZmxvd0lkLCB7XHJcbiAgICAgICAgICAgIGlkOiB3b3JrZmxvd0lkLFxyXG4gICAgICAgICAgICBzdGFydFRpbWU6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgIGNhdGVnb3J5LFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmluZm8oYFdvcmtmbG93IHN0YXJ0ZWQ6ICR7ZGVzY3JpcHRpb259YCwge1xyXG4gICAgICAgICAgICB3b3JrZmxvd0lkLFxyXG4gICAgICAgICAgICBjYXRlZ29yeSxcclxuICAgICAgICAgICAgc3RhcnRUaW1lOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9LCB7IC4uLmNvbnRleHQsIHdvcmtmbG93OiB3b3JrZmxvd0lkLCBjYXRlZ29yeSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBlbmRXb3JrZmxvdyh3b3JrZmxvd0lkOiBzdHJpbmcsIGNvbnRleHQ/OiBMb2dDb250ZXh0KSB7XHJcbiAgICAgICAgY29uc3QgdGltZXIgPSB0aGlzLndvcmtmbG93VGltZXJzLmdldCh3b3JrZmxvd0lkKTtcclxuICAgICAgICBpZiAoIXRpbWVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2FybihgV29ya2Zsb3cgbm90IGZvdW5kOiAke3dvcmtmbG93SWR9YCwgeyB3b3JrZmxvd0lkIH0sIGNvbnRleHQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSB0aW1lci5zdGFydFRpbWU7XHJcbiAgICAgICAgdGhpcy5hY3RpdmVXb3JrZmxvd3MuZGVsZXRlKHdvcmtmbG93SWQpO1xyXG4gICAgICAgIHRoaXMud29ya2Zsb3dUaW1lcnMuZGVsZXRlKHdvcmtmbG93SWQpO1xyXG5cclxuICAgICAgICB0aGlzLmluZm8oYFdvcmtmbG93IGNvbXBsZXRlZDogJHt0aW1lci5kZXNjcmlwdGlvbn1gLCB7XHJcbiAgICAgICAgICAgIHdvcmtmbG93SWQsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiB0aW1lci5jYXRlZ29yeSxcclxuICAgICAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgICAgIGVuZFRpbWU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH0sIHsgLi4uY29udGV4dCwgd29ya2Zsb3c6IHdvcmtmbG93SWQsIGNhdGVnb3J5OiB0aW1lci5jYXRlZ29yeSwgZHVyYXRpb24gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29jb3Mtc3BlY2lmaWMgbG9nZ2luZyBtZXRob2RzXHJcbiAgICBsb2dTY2VuZUV2ZW50KGV2ZW50OiBzdHJpbmcsIHNjZW5lRGF0YTogYW55LCBjb250ZXh0PzogTG9nQ29udGV4dCkge1xyXG4gICAgICAgIHRoaXMuaW5mbyhgU2NlbmUgZXZlbnQ6ICR7ZXZlbnR9YCwgc2NlbmVEYXRhLCB7IC4uLmNvbnRleHQsIGNhdGVnb3J5OiAnc2NlbmUnIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ05vZGVFdmVudChldmVudDogc3RyaW5nLCBub2RlRGF0YTogYW55LCBjb250ZXh0PzogTG9nQ29udGV4dCkge1xyXG4gICAgICAgIHRoaXMuaW5mbyhgTm9kZSBldmVudDogJHtldmVudH1gLCBub2RlRGF0YSwgeyAuLi5jb250ZXh0LCBjYXRlZ29yeTogJ25vZGUnIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ0NvbXBvbmVudEV2ZW50KGV2ZW50OiBzdHJpbmcsIGNvbXBvbmVudERhdGE6IGFueSwgY29udGV4dD86IExvZ0NvbnRleHQpIHtcclxuICAgICAgICB0aGlzLmluZm8oYENvbXBvbmVudCBldmVudDogJHtldmVudH1gLCBjb21wb25lbnREYXRhLCB7IC4uLmNvbnRleHQsIGNhdGVnb3J5OiAnY29tcG9uZW50JyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dQcmVmYWJFdmVudChldmVudDogc3RyaW5nLCBwcmVmYWJEYXRhOiBhbnksIGNvbnRleHQ/OiBMb2dDb250ZXh0KSB7XHJcbiAgICAgICAgdGhpcy5pbmZvKGBQcmVmYWIgZXZlbnQ6ICR7ZXZlbnR9YCwgcHJlZmFiRGF0YSwgeyAuLi5jb250ZXh0LCBjYXRlZ29yeTogJ3ByZWZhYicgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nR2FtZUV2ZW50KGV2ZW50OiBzdHJpbmcsIGV2ZW50RGF0YTogYW55LCBjb250ZXh0PzogTG9nQ29udGV4dCkge1xyXG4gICAgICAgIHRoaXMuaW5mbyhgR2FtZSBldmVudDogJHtldmVudH1gLCBldmVudERhdGEsIHsgLi4uY29udGV4dCwgY2F0ZWdvcnk6ICdnYW1lLWluaXQnIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ1BoeXNpY3NFdmVudChldmVudDogc3RyaW5nLCBwaHlzaWNzRGF0YTogYW55LCBjb250ZXh0PzogTG9nQ29udGV4dCkge1xyXG4gICAgICAgIHRoaXMuZGVidWcoYFBoeXNpY3MgZXZlbnQ6ICR7ZXZlbnR9YCwgcGh5c2ljc0RhdGEsIHsgLi4uY29udGV4dCwgY2F0ZWdvcnk6ICdwaHlzaWNzJyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dVSUV2ZW50KGV2ZW50OiBzdHJpbmcsIHVpRGF0YTogYW55LCBjb250ZXh0PzogTG9nQ29udGV4dCkge1xyXG4gICAgICAgIHRoaXMuZGVidWcoYFVJIGV2ZW50OiAke2V2ZW50fWAsIHVpRGF0YSwgeyAuLi5jb250ZXh0LCBjYXRlZ29yeTogJ3VpJyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dFcnJvcihlcnJvcjogRXJyb3IsIGNvbnRleHREYXRhPzogYW55LCBjb250ZXh0PzogTG9nQ29udGV4dCkge1xyXG4gICAgICAgIHRoaXMuZXJyb3IoYEVycm9yIG9jY3VycmVkOiAke2Vycm9yLm1lc3NhZ2V9YCwge1xyXG4gICAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICAgICAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcclxuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udGV4dERhdGFcclxuICAgICAgICB9LCB7IC4uLmNvbnRleHQsIGNhdGVnb3J5OiAnZXJyb3InIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBhbGwgbG9ncyBhcyBhIGZvcm1hdHRlZCBzdHJpbmdcclxuICAgIGdldExvZ3MoKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBoZWFkZXIgPSBgQ29jb3MgR2FtZSBDb25zb2xlIExvZ3NcXG5HZW5lcmF0ZWQ6ICR7bmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpfVxcblRvdGFsIExvZ3M6ICR7dGhpcy5sb2dzLmxlbmd0aH1cXG5Qcm9qZWN0OiAke0VkaXRvci5Qcm9qZWN0Py5uYW1lIHx8ICdVbmtub3duJ31cXG5cXG5gO1xyXG4gICAgICAgIHJldHVybiBoZWFkZXIgKyB0aGlzLmxvZ3Muam9pbignXFxuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2xlYXIgYWxsIGxvZ3NcclxuICAgIGNsZWFyKCkge1xyXG4gICAgICAgIHRoaXMubG9ncyA9IFtdO1xyXG4gICAgICAgIHRoaXMuc2F2ZVRvU3RvcmFnZSgpO1xyXG4gICAgICAgIHRoaXMubG9nKCdpbmZvJywgJ0xvZ2dlciBjbGVhcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRG93bmxvYWQgbG9ncyBhcyBhIHRleHQgZmlsZVxyXG4gICAgZG93bmxvYWRMb2dzKGZpbGVuYW1lPzogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBsb2dzQ29udGVudCA9IHRoaXMuZ2V0TG9ncygpO1xyXG4gICAgICAgIGNvbnN0IHByb2plY3ROYW1lID0gRWRpdG9yLlByb2plY3Q/Lm5hbWUgfHwgJ2NvY29zLXByb2plY3QnO1xyXG4gICAgICAgIGNvbnN0IGRlZmF1bHRGaWxlbmFtZSA9IGZpbGVuYW1lIHx8IGBjb2Nvcy1nYW1lLWxvZ3MtJHtwcm9qZWN0TmFtZX0tJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0udHh0YDtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gU2F2ZSB0byBwcm9qZWN0IHRlbXAgZGlyZWN0b3J5XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2plY3RQYXRoID0gRWRpdG9yLlByb2plY3Q/LnBhdGggfHwgcHJvY2Vzcy5jd2QoKTtcclxuICAgICAgICAgICAgY29uc3QgdGVtcERpciA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ3RlbXAnLCAnbG9ncycpO1xyXG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbih0ZW1wRGlyLCBkZWZhdWx0RmlsZW5hbWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gRW5zdXJlIGRpcmVjdG9yeSBleGlzdHNcclxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHRlbXBEaXIpKSB7XHJcbiAgICAgICAgICAgICAgICBmcy5ta2RpclN5bmModGVtcERpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFdyaXRlIGZpbGVcclxuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgbG9nc0NvbnRlbnQsICd1dGY4Jyk7XHJcblxyXG4gICAgICAgICAgICAvLyBBbHNvIHNlbmQgdG8gRWRpdG9yIGNvbnNvbGVcclxuICAgICAgICAgICAgdGhpcy5pbmZvKGBMb2dzIGRvd25sb2FkZWQgdG86ICR7ZmlsZVBhdGh9YCwgeyBmaWxlbmFtZTogZGVmYXVsdEZpbGVuYW1lLCBwYXRoOiBmaWxlUGF0aCB9KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmaWxlUGF0aDtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXJyb3IoYEZhaWxlZCB0byBkb3dubG9hZCBsb2dzOiAke2Vycm9yLm1lc3NhZ2V9YCwgeyBmaWxlbmFtZTogZGVmYXVsdEZpbGVuYW1lIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBsb2cgY291bnRcclxuICAgIGdldExvZ0NvdW50KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubG9ncy5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRW5hYmxlL2Rpc2FibGUgbG9nZ2luZ1xyXG4gICAgZW5hYmxlKCkge1xyXG4gICAgICAgIHRoaXMuaXNFbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmxvZygnaW5mbycsICdMb2dnaW5nIGVuYWJsZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBkaXNhYmxlKCkge1xyXG4gICAgICAgIHRoaXMuaXNFbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5sb2coJ2luZm8nLCAnTG9nZ2luZyBkaXNhYmxlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGlzTG9nZ2luZ0VuYWJsZWQoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNFbmFibGVkO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCByZWNlbnQgbG9ncyAobGFzdCBOIGVudHJpZXMpXHJcbiAgICBnZXRSZWNlbnRMb2dzKGNvdW50OiBudW1iZXIgPSAxMCk6IHN0cmluZ1tdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5sb2dzLnNsaWNlKC1jb3VudCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQXV0by1zYXZlIGZ1bmN0aW9uYWxpdHlcclxuICAgIHByaXZhdGUgc3RhcnRBdXRvU2F2ZSgpOiB2b2lkIHtcclxuICAgICAgICBpZiAoIXRoaXMuYXV0b1NhdmVFbmFibGVkKSByZXR1cm47XHJcblxyXG4gICAgICAgIHRoaXMuYXV0b1NhdmVJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5zYXZlVG9TdG9yYWdlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZGVidWcoJ0F1dG8tc2F2ZWQgbG9ncyB0byBzdG9yYWdlJywgeyBsb2dDb3VudDogdGhpcy5sb2dzLmxlbmd0aCB9KTtcclxuICAgICAgICB9LCB0aGlzLkFVVE9fU0FWRV9JTlRFUlZBTCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzdGFydEF1dG9Eb3dubG9hZCgpOiB2b2lkIHtcclxuICAgICAgICBpZiAoIXRoaXMuYXV0b0Rvd25sb2FkRW5hYmxlZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICB0aGlzLmF1dG9Eb3dubG9hZEludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sb2dzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRMb2dzKGBhdXRvLWNvY29zLWdhbWUtbG9ncy0ke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdfS0ke0RhdGUubm93KCl9LnR4dGApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbmZvKCdBdXRvLWRvd25sb2FkZWQgbG9ncycsIHsgbG9nQ291bnQ6IHRoaXMubG9ncy5sZW5ndGggfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCB0aGlzLkFVVE9fRE9XTkxPQURfSU5URVJWQUwpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2F2ZVRvU3RvcmFnZSgpOiB2b2lkIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0Py5wYXRoIHx8IHByb2Nlc3MuY3dkKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0b3JhZ2VQYXRoID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCAndGVtcCcsIHRoaXMuU1RPUkFHRV9LRVkgKyAnLmpzb24nKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGxvZ3NEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgbG9nczogdGhpcy5sb2dzLFxyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBsb2dDb3VudDogdGhpcy5sb2dzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIHByb2plY3ROYW1lOiBFZGl0b3IuUHJvamVjdD8ubmFtZSB8fCAnVW5rbm93bidcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IHBhdGguZGlybmFtZShzdG9yYWdlUGF0aCk7XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XHJcbiAgICAgICAgICAgICAgICBmcy5ta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhzdG9yYWdlUGF0aCwgSlNPTi5zdHJpbmdpZnkobG9nc0RhdGEsIG51bGwsIDIpLCAndXRmOCcpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgdGhpcy5lcnJvcignRmFpbGVkIHRvIHNhdmUgbG9ncyB0byBzdG9yYWdlJywgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBsb2FkRnJvbVN0b3JhZ2UoKTogdm9pZCB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdD8ucGF0aCB8fCBwcm9jZXNzLmN3ZCgpO1xyXG4gICAgICAgICAgICBjb25zdCBzdG9yYWdlUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ3RlbXAnLCB0aGlzLlNUT1JBR0VfS0VZICsgJy5qc29uJyk7XHJcblxyXG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhzdG9yYWdlUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvZ3NEYXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoc3RvcmFnZVBhdGgsICd1dGY4JykpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGxvZ3NEYXRhLmxvZ3MgJiYgQXJyYXkuaXNBcnJheShsb2dzRGF0YS5sb2dzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9ncyA9IGxvZ3NEYXRhLmxvZ3M7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmZvKCdMb2FkZWQgbG9ncyBmcm9tIHN0b3JhZ2UnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlZENvdW50OiB0aGlzLmxvZ3MubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZWRUaW1lc3RhbXA6IGxvZ3NEYXRhLnRpbWVzdGFtcCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdE5hbWU6IGxvZ3NEYXRhLnByb2plY3ROYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHRoaXMud2FybignRmFpbGVkIHRvIGxvYWQgbG9ncyBmcm9tIHN0b3JhZ2UnLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBTdG9wIGF1dG8tc2F2ZSBhbmQgYXV0by1kb3dubG9hZCAoZm9yIGNsZWFudXApXHJcbiAgICBzdG9wQXV0b09wZXJhdGlvbnMoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuYXV0b1NhdmVJbnRlcnZhbCkge1xyXG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuYXV0b1NhdmVJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXV0b1NhdmVJbnRlcnZhbCA9IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmF1dG9Eb3dubG9hZEludGVydmFsKSB7XHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5hdXRvRG93bmxvYWRJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXV0b0Rvd25sb2FkSW50ZXJ2YWwgPSBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnNhdmVUb1N0b3JhZ2UoKTtcclxuICAgICAgICB0aGlzLmxvZygnaW5mbycsICdBdXRvLW9wZXJhdGlvbnMgc3RvcHBlZCBhbmQgZmluYWwgc2F2ZSBjb21wbGV0ZWQnKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gQ3JlYXRlIGEgc2luZ2xldG9uIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCBjb2Nvc0xvZ2dlciA9IG5ldyBDb2Nvc0xvZ2dlcigpO1xyXG5cclxuZXhwb3J0IGNsYXNzIExvZ2dlclRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsb2dnZXJfZ2V0X3N0YXR1cycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBjdXJyZW50IGxvZ2dlciBzdGF0dXMgYW5kIGNvbmZpZ3VyYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7fVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnbG9nZ2VyX2VuYWJsZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0VuYWJsZSBsb2dnaW5nJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2xvZ2dlcl9kaXNhYmxlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlzYWJsZSBsb2dnaW5nJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2xvZ2dlcl9nZXRfbG9ncycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCByZWNlbnQgbG9ncycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgcmVjZW50IGxvZ3MgdG8gcmV0cmlldmUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogMTAwMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaWx0ZXIgbG9ncyBieSBsZXZlbCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2FsbCcsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InLCAnZGVidWcnXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdhbGwnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsb2dnZXJfZG93bmxvYWRfbG9ncycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Rvd25sb2FkIGxvZ3MgdG8gZmlsZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDdXN0b20gZmlsZW5hbWUgZm9yIHRoZSBsb2cgZmlsZSAob3B0aW9uYWwpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnbG9nZ2VyX2NsZWFyX2xvZ3MnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDbGVhciBhbGwgbG9ncycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsb2dnZXJfbG9nX21lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBZGQgYSBjdXN0b20gbG9nIG1lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTG9nIGxldmVsJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnaW5mbycsICd3YXJuJywgJ2Vycm9yJywgJ2RlYnVnJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnaW5mbydcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0xvZyBtZXNzYWdlJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0xvZyBjYXRlZ29yeScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dhbWUtaW5pdCcsICdiZXR0aW5nJywgJ3NvY2tldCcsICdwaHlzaWNzJywgJ2FwaScsICd1aScsICdzdGF0ZScsICdwZicsICdzb3VuZCcsICdwcmVsb2FkJywgJ2FuYWx5dGljcycsICdlcnJvcicsICdzY2VuZScsICdub2RlJywgJ2NvbXBvbmVudCcsICdwcmVmYWInXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWRkaXRpb25hbCBkYXRhIHRvIGxvZydcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbWVzc2FnZSddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsb2dnZXJfc3RhcnRfd29ya2Zsb3cnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTdGFydCBhIHdvcmtmbG93IHRpbWVyJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JrZmxvd0lkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVW5pcXVlIHdvcmtmbG93IGlkZW50aWZpZXInXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnV29ya2Zsb3cgY2F0ZWdvcnknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnYW1lLWluaXQnLCAnYmV0dGluZycsICdzb2NrZXQnLCAncGh5c2ljcycsICdhcGknLCAndWknLCAnc3RhdGUnLCAncGYnLCAnc291bmQnLCAncHJlbG9hZCcsICdhbmFseXRpY3MnLCAnZXJyb3InLCAnc2NlbmUnLCAnbm9kZScsICdjb21wb25lbnQnLCAncHJlZmFiJ11cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXb3JrZmxvdyBkZXNjcmlwdGlvbidcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnd29ya2Zsb3dJZCcsICdjYXRlZ29yeScsICdkZXNjcmlwdGlvbiddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsb2dnZXJfZW5kX3dvcmtmbG93JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRW5kIGEgd29ya2Zsb3cgdGltZXInLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtmbG93SWQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXb3JrZmxvdyBpZGVudGlmaWVyIHRvIGVuZCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnd29ya2Zsb3dJZCddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ2xvZ2dlcl9nZXRfc3RhdHVzJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldExvZ2dlclN0YXR1cygpO1xyXG4gICAgICAgICAgICBjYXNlICdsb2dnZXJfZW5hYmxlJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmVuYWJsZUxvZ2dlcigpO1xyXG4gICAgICAgICAgICBjYXNlICdsb2dnZXJfZGlzYWJsZSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5kaXNhYmxlTG9nZ2VyKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2xvZ2dlcl9nZXRfbG9ncyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRMb2dzKGFyZ3MuY291bnQsIGFyZ3MuZmlsdGVyKTtcclxuICAgICAgICAgICAgY2FzZSAnbG9nZ2VyX2Rvd25sb2FkX2xvZ3MnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZG93bmxvYWRMb2dzKGFyZ3MuZmlsZW5hbWUpO1xyXG4gICAgICAgICAgICBjYXNlICdsb2dnZXJfY2xlYXJfbG9ncyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jbGVhckxvZ3MoKTtcclxuICAgICAgICAgICAgY2FzZSAnbG9nZ2VyX2xvZ19tZXNzYWdlJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxvZ01lc3NhZ2UoYXJncy5sZXZlbCwgYXJncy5tZXNzYWdlLCBhcmdzLmNhdGVnb3J5LCBhcmdzLmRhdGEpO1xyXG4gICAgICAgICAgICBjYXNlICdsb2dnZXJfc3RhcnRfd29ya2Zsb3cnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc3RhcnRXb3JrZmxvdyhhcmdzLndvcmtmbG93SWQsIGFyZ3MuY2F0ZWdvcnksIGFyZ3MuZGVzY3JpcHRpb24pO1xyXG4gICAgICAgICAgICBjYXNlICdsb2dnZXJfZW5kX3dvcmtmbG93JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmVuZFdvcmtmbG93KGFyZ3Mud29ya2Zsb3dJZCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRMb2dnZXJTdGF0dXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICBlbmFibGVkOiBjb2Nvc0xvZ2dlci5pc0xvZ2dpbmdFbmFibGVkKCksXHJcbiAgICAgICAgICAgICAgICBsb2dDb3VudDogY29jb3NMb2dnZXIuZ2V0TG9nQ291bnQoKSxcclxuICAgICAgICAgICAgICAgIG1heExvZ3M6IDEwMDAwLFxyXG4gICAgICAgICAgICAgICAgYXV0b1NhdmVFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgYXV0b0Rvd25sb2FkRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHByb2plY3ROYW1lOiBFZGl0b3IuUHJvamVjdD8ubmFtZSB8fCAnVW5rbm93bidcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBlbmFibGVMb2dnZXIoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb2Nvc0xvZ2dlci5lbmFibGUoKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnTG9nZ2VyIGVuYWJsZWQgc3VjY2Vzc2Z1bGx5J1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBkaXNhYmxlTG9nZ2VyKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29jb3NMb2dnZXIuZGlzYWJsZSgpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdMb2dnZXIgZGlzYWJsZWQgc3VjY2Vzc2Z1bGx5J1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRMb2dzKGNvdW50OiBudW1iZXIgPSA1MCwgZmlsdGVyOiBzdHJpbmcgPSAnYWxsJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgbGV0IGxvZ3MgPSBjb2Nvc0xvZ2dlci5nZXRSZWNlbnRMb2dzKGNvdW50KTtcclxuXHJcbiAgICAgICAgaWYgKGZpbHRlciAhPT0gJ2FsbCcpIHtcclxuICAgICAgICAgICAgbG9ncyA9IGxvZ3MuZmlsdGVyKGxvZyA9PiBsb2cuaW5jbHVkZXMoYFske2ZpbHRlci50b1VwcGVyQ2FzZSgpfV1gKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICB0b3RhbDogY29jb3NMb2dnZXIuZ2V0TG9nQ291bnQoKSxcclxuICAgICAgICAgICAgICAgIHJldHVybmVkOiBsb2dzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIGZpbHRlcjogZmlsdGVyLFxyXG4gICAgICAgICAgICAgICAgbG9nczogbG9nc1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGRvd25sb2FkTG9ncyhmaWxlbmFtZT86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3QgZmlsZXBhdGggPSBjb2Nvc0xvZ2dlci5kb3dubG9hZExvZ3MoZmlsZW5hbWUpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgIGZpbGVwYXRoOiBmaWxlcGF0aCxcclxuICAgICAgICAgICAgICAgIGZpbGVuYW1lOiBwYXRoLmJhc2VuYW1lKGZpbGVwYXRoKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtZXNzYWdlOiBgTG9ncyBkb3dubG9hZGVkIHRvOiAke2ZpbGVwYXRofWBcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY2xlYXJMb2dzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29jb3NMb2dnZXIuY2xlYXIoKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnQWxsIGxvZ3MgY2xlYXJlZCBzdWNjZXNzZnVsbHknXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxvZ01lc3NhZ2UobGV2ZWw6IExldmVsLCBtZXNzYWdlOiBzdHJpbmcsIGNhdGVnb3J5PzogQ2F0ZWdvcnksIGRhdGE/OiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGNvbnN0IGNvbnRleHQ6IExvZ0NvbnRleHQgfCB1bmRlZmluZWQgPSBjYXRlZ29yeSA/IHsgY2F0ZWdvcnkgfSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xyXG4gICAgICAgICAgICBjYXNlICdpbmZvJzpcclxuICAgICAgICAgICAgICAgIGNvY29zTG9nZ2VyLmluZm8obWVzc2FnZSwgZGF0YSwgY29udGV4dCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnd2Fybic6XHJcbiAgICAgICAgICAgICAgICBjb2Nvc0xvZ2dlci53YXJuKG1lc3NhZ2UsIGRhdGEsIGNvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcclxuICAgICAgICAgICAgICAgIGNvY29zTG9nZ2VyLmVycm9yKG1lc3NhZ2UsIGRhdGEsIGNvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnJzpcclxuICAgICAgICAgICAgICAgIGNvY29zTG9nZ2VyLmRlYnVnKG1lc3NhZ2UsIGRhdGEsIGNvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiBgTG9nIG1lc3NhZ2UgYWRkZWQ6ICR7bWVzc2FnZX1gXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHN0YXJ0V29ya2Zsb3cod29ya2Zsb3dJZDogc3RyaW5nLCBjYXRlZ29yeTogQ2F0ZWdvcnksIGRlc2NyaXB0aW9uOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGNvY29zTG9nZ2VyLnN0YXJ0V29ya2Zsb3cod29ya2Zsb3dJZCwgY2F0ZWdvcnksIGRlc2NyaXB0aW9uKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiBgV29ya2Zsb3cgc3RhcnRlZDogJHtkZXNjcmlwdGlvbn1gXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGVuZFdvcmtmbG93KHdvcmtmbG93SWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29jb3NMb2dnZXIuZW5kV29ya2Zsb3cod29ya2Zsb3dJZCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgbWVzc2FnZTogYFdvcmtmbG93IGVuZGVkOiAke3dvcmtmbG93SWR9YFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn1cclxuIl19