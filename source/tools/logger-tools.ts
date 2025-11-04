import { ToolDefinition, ToolResponse, ToolExecutor, ConsoleMessage } from '../types';
import * as fs from 'fs';
import * as path from 'path';

type Level = 'info' | 'warn' | 'error' | 'debug';
type Category = 'game-init' | 'betting' | 'socket' | 'physics' | 'api' | 'ui' | 'state' | 'pf' | 'sound' | 'preload' | 'analytics' | 'error' | 'scene' | 'node' | 'component' | 'prefab';

interface LogContext {
    category?: Category;
    workflow?: string;
    userId?: string;
    sessionId?: string;
    roundId?: string;
    betId?: string;
    timestamp?: string;
    duration?: number;
    requestId?: string;
    nodeUuid?: string;
    componentType?: string;
    sceneName?: string;
}

interface WorkflowTimer {
    id: string;
    startTime: number;
    category: Category;
    description: string;
}

interface LoggerConfig {
    maxLogs: number;
    autoSaveEnabled: boolean;
    autoDownloadEnabled: boolean;
    autoSaveInterval: number;
    autoDownloadInterval: number;
    storageKey: string;
}

class CocosLogger {
    private logs: string[] = [];
    private readonly maxLogs: number = 10000;
    private workflowTimers: Map<string, WorkflowTimer> = new Map();
    private activeWorkflows: Set<string> = new Set();
    private autoSaveEnabled: boolean = true;
    private autoDownloadEnabled: boolean = true;
    private autoSaveInterval: NodeJS.Timeout | null = null;
    private autoDownloadInterval: NodeJS.Timeout | null = null;
    private readonly STORAGE_KEY = 'cocos_game_logs';
    private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds
    private readonly AUTO_DOWNLOAD_INTERVAL = 300000; // 5 minutes
    private isEnabled: boolean = true;

    constructor() {
        this.initializeLogger();
    }

    private initializeLogger(): void {
        this.log('info', 'Cocos Game Logger initialized - Auto-save and auto-download enabled');

        // Load existing logs from storage
        this.loadFromStorage();

        // Start auto-save functionality
        this.startAutoSave();

        // Start auto-download functionality
        this.startAutoDownload();
    }

    private log(level: Level, message: string, data?: any, context?: LogContext) {
        if (!this.isEnabled) return;

        const timestamp = new Date().toISOString();
        let logEntry = `[${timestamp}] [${level.toUpperCase()}]`;

        // Add category if provided
        if (context?.category) {
            logEntry += ` [${context.category.toUpperCase()}]`;
        }

        logEntry += ` ${message}`;

        // Add workflow context
        if (context?.workflow) {
            logEntry += ` | Workflow: ${context.workflow}`;
        }

        // Add IDs if provided
        const ids = [];
        if (context?.userId) ids.push(`User:${context.userId}`);
        if (context?.sessionId) ids.push(`Session:${context.sessionId}`);
        if (context?.roundId) ids.push(`Round:${context.roundId}`);
        if (context?.betId) ids.push(`Bet:${context.betId}`);
        if (context?.requestId) ids.push(`Request:${context.requestId}`);
        if (context?.nodeUuid) ids.push(`Node:${context.nodeUuid}`);
        if (context?.componentType) ids.push(`Component:${context.componentType}`);
        if (context?.sceneName) ids.push(`Scene:${context.sceneName}`);
        if (ids.length > 0) {
            logEntry += ` | IDs: {${ids.join(', ')}}`;
        }

        // Add duration if provided
        if (context?.duration !== undefined) {
            logEntry += ` | Duration: ${context.duration}ms`;
        }

        // Add data
        if (data) {
            try {
                logEntry += ` | Data: ${JSON.stringify(data, this.safeStringifyReplacer, 2)}`;
            } catch (error) {
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

    private safeStringifyReplacer(key: string, value: any): any {
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

    private sendToEditorConsole(level: Level, message: string): void {
        try {
            // Send to Editor console if available
            if (typeof Editor !== 'undefined' && Editor.Message) {
                const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
                Editor.Message.send('console', consoleMethod, message);
            }
        } catch (error) {
            // Silently fail if Editor console is not available
        }
    }

    // Public logging methods
    info(message: string, data?: any, context?: LogContext) {
        this.log('info', message, data, context);
    }

    warn(message: string, data?: any, context?: LogContext) {
        this.log('warn', message, data, context);
    }

    error(message: string, data?: any, context?: LogContext) {
        this.log('error', message, data, context);
    }

    debug(message: string, data?: any, context?: LogContext) {
        this.log('debug', message, data, context);
    }

    // Workflow tracking methods
    startWorkflow(workflowId: string, category: Category, description: string, context?: LogContext) {
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
        }, { ...context, workflow: workflowId, category });
    }

    endWorkflow(workflowId: string, context?: LogContext) {
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
        }, { ...context, workflow: workflowId, category: timer.category, duration });
    }

    // Cocos-specific logging methods
    logSceneEvent(event: string, sceneData: any, context?: LogContext) {
        this.info(`Scene event: ${event}`, sceneData, { ...context, category: 'scene' });
    }

    logNodeEvent(event: string, nodeData: any, context?: LogContext) {
        this.info(`Node event: ${event}`, nodeData, { ...context, category: 'node' });
    }

    logComponentEvent(event: string, componentData: any, context?: LogContext) {
        this.info(`Component event: ${event}`, componentData, { ...context, category: 'component' });
    }

    logPrefabEvent(event: string, prefabData: any, context?: LogContext) {
        this.info(`Prefab event: ${event}`, prefabData, { ...context, category: 'prefab' });
    }

    logGameEvent(event: string, eventData: any, context?: LogContext) {
        this.info(`Game event: ${event}`, eventData, { ...context, category: 'game-init' });
    }

    logPhysicsEvent(event: string, physicsData: any, context?: LogContext) {
        this.debug(`Physics event: ${event}`, physicsData, { ...context, category: 'physics' });
    }

    logUIEvent(event: string, uiData: any, context?: LogContext) {
        this.debug(`UI event: ${event}`, uiData, { ...context, category: 'ui' });
    }

    logError(error: Error, contextData?: any, context?: LogContext) {
        this.error(`Error occurred: ${error.message}`, {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            contextData
        }, { ...context, category: 'error' });
    }

    // Get all logs as a formatted string
    getLogs(): string {
        const header = `Cocos Game Console Logs\nGenerated: ${new Date().toLocaleString()}\nTotal Logs: ${this.logs.length}\nProject: ${Editor.Project?.name || 'Unknown'}\n\n`;
        return header + this.logs.join('\n');
    }

    // Clear all logs
    clear() {
        this.logs = [];
        this.saveToStorage();
        this.log('info', 'Logger cleared');
    }

    // Download logs as a text file
    downloadLogs(filename?: string): string {
        const logsContent = this.getLogs();
        const projectName = Editor.Project?.name || 'cocos-project';
        const defaultFilename = filename || `cocos-game-logs-${projectName}-${new Date().toISOString().split('T')[0]}.txt`;

        try {
            // Save to project temp directory
            const projectPath = Editor.Project?.path || process.cwd();
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
        } catch (error: any) {
            this.error(`Failed to download logs: ${error.message}`, { filename: defaultFilename });
            return '';
        }
    }

    // Get log count
    getLogCount(): number {
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

    isLoggingEnabled(): boolean {
        return this.isEnabled;
    }

    // Get recent logs (last N entries)
    getRecentLogs(count: number = 10): string[] {
        return this.logs.slice(-count);
    }

    // Auto-save functionality
    private startAutoSave(): void {
        if (!this.autoSaveEnabled) return;

        this.autoSaveInterval = setInterval(() => {
            this.saveToStorage();
            this.debug('Auto-saved logs to storage', { logCount: this.logs.length });
        }, this.AUTO_SAVE_INTERVAL);
    }

    private startAutoDownload(): void {
        if (!this.autoDownloadEnabled) return;

        this.autoDownloadInterval = setInterval(() => {
            if (this.logs.length > 0) {
                this.downloadLogs(`auto-cocos-game-logs-${new Date().toISOString().split('T')[0]}-${Date.now()}.txt`);
                this.info('Auto-downloaded logs', { logCount: this.logs.length });
            }
        }, this.AUTO_DOWNLOAD_INTERVAL);
    }

    private saveToStorage(): void {
        try {
            const projectPath = Editor.Project?.path || process.cwd();
            const storagePath = path.join(projectPath, 'temp', this.STORAGE_KEY + '.json');

            const logsData = {
                logs: this.logs,
                timestamp: new Date().toISOString(),
                logCount: this.logs.length,
                projectName: Editor.Project?.name || 'Unknown'
            };

            const dir = path.dirname(storagePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(storagePath, JSON.stringify(logsData, null, 2), 'utf8');
        } catch (error: any) {
            this.error('Failed to save logs to storage', { error: error.message });
        }
    }

    private loadFromStorage(): void {
        try {
            const projectPath = Editor.Project?.path || process.cwd();
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
        } catch (error: any) {
            this.warn('Failed to load logs from storage', { error: error.message });
        }
    }

    // Stop auto-save and auto-download (for cleanup)
    stopAutoOperations(): void {
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
export const cocosLogger = new CocosLogger();

export class LoggerTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
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

    private async getLoggerStatus(): Promise<ToolResponse> {
        return {
            success: true,
            data: {
                enabled: cocosLogger.isLoggingEnabled(),
                logCount: cocosLogger.getLogCount(),
                maxLogs: 10000,
                autoSaveEnabled: true,
                autoDownloadEnabled: true,
                projectName: Editor.Project?.name || 'Unknown'
            }
        };
    }

    private async enableLogger(): Promise<ToolResponse> {
        cocosLogger.enable();
        return {
            success: true,
            message: 'Logger enabled successfully'
        };
    }

    private async disableLogger(): Promise<ToolResponse> {
        cocosLogger.disable();
        return {
            success: true,
            message: 'Logger disabled successfully'
        };
    }

    private async getLogs(count: number = 50, filter: string = 'all'): Promise<ToolResponse> {
        let logs = cocosLogger.getRecentLogs(count);

        if (filter !== 'all') {
            logs = logs.filter(log => log.includes(`[${filter.toUpperCase()}]`));
        }

        return {
            success: true,
            data: {
                total: cocosLogger.getLogCount(),
                returned: logs.length,
                filter: filter,
                logs: logs
            }
        };
    }

    private async downloadLogs(filename?: string): Promise<ToolResponse> {
        const filepath = cocosLogger.downloadLogs(filename);
        return {
            success: true,
            data: {
                filepath: filepath,
                filename: path.basename(filepath)
            },
            message: `Logs downloaded to: ${filepath}`
        };
    }

    private async clearLogs(): Promise<ToolResponse> {
        cocosLogger.clear();
        return {
            success: true,
            message: 'All logs cleared successfully'
        };
    }

    private async logMessage(level: Level, message: string, category?: Category, data?: any): Promise<ToolResponse> {
        const context: LogContext | undefined = category ? { category } : undefined;

        switch (level) {
            case 'info':
                cocosLogger.info(message, data, context);
                break;
            case 'warn':
                cocosLogger.warn(message, data, context);
                break;
            case 'error':
                cocosLogger.error(message, data, context);
                break;
            case 'debug':
                cocosLogger.debug(message, data, context);
                break;
        }

        return {
            success: true,
            message: `Log message added: ${message}`
        };
    }

    private async startWorkflow(workflowId: string, category: Category, description: string): Promise<ToolResponse> {
        cocosLogger.startWorkflow(workflowId, category, description);
        return {
            success: true,
            message: `Workflow started: ${description}`
        };
    }

    private async endWorkflow(workflowId: string): Promise<ToolResponse> {
        cocosLogger.endWorkflow(workflowId);
        return {
            success: true,
            message: `Workflow ended: ${workflowId}`
        };
    }
}
