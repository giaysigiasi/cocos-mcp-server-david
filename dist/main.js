"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
const mcp_server_1 = require("./mcp-server");
const settings_1 = require("./settings");
const tool_manager_1 = require("./tools/tool-manager");
let mcpServer = null;
let toolManager;
/**
 * Registration method for the main process of Extension
 */
exports.methods = {
    /**
     * Open the MCP server panel
     */
    openPanel() {
        Editor.Panel.open('cocos-mcp-server');
    },
    /**
     * Start the MCP server
     */
    async startServer() {
        if (mcpServer) {
            // Ensure using the latest tool configuration
            const enabledTools = toolManager.getEnabledTools();
            mcpServer.updateEnabledTools(enabledTools);
            await mcpServer.start();
        }
        else {
            console.warn('[MCP Plugin] mcpServer not initialized');
        }
    },
    /**
     * Stop the MCP server
     */
    async stopServer() {
        if (mcpServer) {
            mcpServer.stop();
        }
        else {
            console.warn('[MCP Plugin] mcpServer not initialized');
        }
    },
    /**
     * Get server status
     */
    getServerStatus() {
        const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0, clients: 0 };
        const settings = mcpServer ? mcpServer.getSettings() : (0, settings_1.readSettings)();
        return Object.assign(Object.assign({}, status), { settings: settings });
    },
    /**
     * Update server settings
     */
    updateSettings(settings) {
        (0, settings_1.saveSettings)(settings);
        if (mcpServer) {
            mcpServer.stop();
            mcpServer = new mcp_server_1.MCPServer(settings);
            mcpServer.start();
        }
        else {
            mcpServer = new mcp_server_1.MCPServer(settings);
            mcpServer.start();
        }
    },
    /**
     * Get tools list
     */
    getToolsList() {
        return mcpServer ? mcpServer.getAvailableTools() : [];
    },
    getFilteredToolsList() {
        if (!mcpServer)
            return [];
        // Get currently enabled tools
        const enabledTools = toolManager.getEnabledTools();
        // Update MCP server's enabled tools list
        mcpServer.updateEnabledTools(enabledTools);
        return mcpServer.getFilteredTools(enabledTools);
    },
    /**
     * Get server settings
     */
    async getServerSettings() {
        return mcpServer ? mcpServer.getSettings() : (0, settings_1.readSettings)();
    },
    /**
     * Get server settings (alternative method)
     */
    async getSettings() {
        return mcpServer ? mcpServer.getSettings() : (0, settings_1.readSettings)();
    },
    // Tool manager related methods
    async getToolManagerState() {
        return toolManager.getToolManagerState();
    },
    async createToolConfiguration(name, description) {
        try {
            const config = toolManager.createConfiguration(name, description);
            return { success: true, id: config.id, config };
        }
        catch (error) {
            throw new Error(`Failed to create configuration: ${error.message}`);
        }
    },
    async updateToolConfiguration(configId, updates) {
        try {
            return toolManager.updateConfiguration(configId, updates);
        }
        catch (error) {
            throw new Error(`Failed to update configuration: ${error.message}`);
        }
    },
    async deleteToolConfiguration(configId) {
        try {
            toolManager.deleteConfiguration(configId);
            return { success: true };
        }
        catch (error) {
            throw new Error(`Failed to delete configuration: ${error.message}`);
        }
    },
    async setCurrentToolConfiguration(configId) {
        try {
            toolManager.setCurrentConfiguration(configId);
            return { success: true };
        }
        catch (error) {
            throw new Error(`Failed to set current configuration: ${error.message}`);
        }
    },
    async updateToolStatus(category, toolName, enabled) {
        try {
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('No current configuration');
            }
            toolManager.updateToolStatus(currentConfig.id, category, toolName, enabled);
            // Update MCP server's tool list
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            return { success: true };
        }
        catch (error) {
            throw new Error(`Failed to update tool status: ${error.message}`);
        }
    },
    async updateToolStatusBatch(updates) {
        try {
            console.log(`[Main] updateToolStatusBatch called with updates count:`, updates ? updates.length : 0);
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('No current configuration');
            }
            toolManager.updateToolStatusBatch(currentConfig.id, updates);
            // Update MCP server's tool list
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            return { success: true };
        }
        catch (error) {
            throw new Error(`Failed to batch update tool status: ${error.message}`);
        }
    },
    async exportToolConfiguration(configId) {
        try {
            return { configJson: toolManager.exportConfiguration(configId) };
        }
        catch (error) {
            throw new Error(`Failed to export configuration: ${error.message}`);
        }
    },
    async importToolConfiguration(configJson) {
        try {
            return toolManager.importConfiguration(configJson);
        }
        catch (error) {
            throw new Error(`Failed to import configuration: ${error.message}`);
        }
    },
    async getEnabledTools() {
        return toolManager.getEnabledTools();
    }
};
/**
 * Method triggered on Extension Startup
 */
function load() {
    console.log('Cocos MCP Server extension loaded');
    // Initialize tool manager
    toolManager = new tool_manager_1.ToolManager();
    // Read settings
    const settings = (0, settings_1.readSettings)();
    mcpServer = new mcp_server_1.MCPServer(settings);
    // Initialize MCP server's tool list
    const enabledTools = toolManager.getEnabledTools();
    mcpServer.updateEnabledTools(enabledTools);
    // If auto-start is enabled, start the server
    if (settings.autoStart) {
        mcpServer.start().catch(err => {
            console.error('Failed to auto-start MCP server:', err);
        });
    }
}
/**
 * Method triggered when uninstalling the extension
 */
function unload() {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQXFOQSxvQkFvQkM7QUFLRCx3QkFLQztBQW5QRCw2Q0FBeUM7QUFDekMseUNBQXdEO0FBRXhELHVEQUFtRDtBQUVuRCxJQUFJLFNBQVMsR0FBcUIsSUFBSSxDQUFDO0FBQ3ZDLElBQUksV0FBd0IsQ0FBQztBQUU3Qjs7R0FFRztBQUNVLFFBQUEsT0FBTyxHQUE0QztJQUM1RDs7T0FFRztJQUNILFNBQVM7UUFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFJRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXO1FBQ2IsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNaLDZDQUE2QztZQUM3QyxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDbkQsU0FBUyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzNDLE1BQU0sU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzVCLENBQUM7YUFBTSxDQUFDO1lBQ0osT0FBTyxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsVUFBVTtRQUNaLElBQUksU0FBUyxFQUFFLENBQUM7WUFDWixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDckIsQ0FBQzthQUFNLENBQUM7WUFDSixPQUFPLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxDQUFDLENBQUM7UUFDM0QsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILGVBQWU7UUFDWCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FB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QUcsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztBQUNMLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLE1BQU07SUFDbEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQixTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUNQU2VydmVyIH0gZnJvbSAnLi9tY3Atc2VydmVyJztcclxuaW1wb3J0IHsgcmVhZFNldHRpbmdzLCBzYXZlU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJztcclxuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcclxuaW1wb3J0IHsgVG9vbE1hbmFnZXIgfSBmcm9tICcuL3Rvb2xzL3Rvb2wtbWFuYWdlcic7XHJcblxyXG5sZXQgbWNwU2VydmVyOiBNQ1BTZXJ2ZXIgfCBudWxsID0gbnVsbDtcclxubGV0IHRvb2xNYW5hZ2VyOiBUb29sTWFuYWdlcjtcclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RyYXRpb24gbWV0aG9kIGZvciB0aGUgbWFpbiBwcm9jZXNzIG9mIEV4dGVuc2lvblxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcclxuICAgIC8qKlxyXG4gICAgICogT3BlbiB0aGUgTUNQIHNlcnZlciBwYW5lbFxyXG4gICAgICovXHJcbiAgICBvcGVuUGFuZWwoKSB7XHJcbiAgICAgICAgRWRpdG9yLlBhbmVsLm9wZW4oJ2NvY29zLW1jcC1zZXJ2ZXInKTtcclxuICAgIH0sXHJcblxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFN0YXJ0IHRoZSBNQ1Agc2VydmVyXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHN0YXJ0U2VydmVyKCkge1xyXG4gICAgICAgIGlmIChtY3BTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgLy8gRW5zdXJlIHVzaW5nIHRoZSBsYXRlc3QgdG9vbCBjb25maWd1cmF0aW9uXHJcbiAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRvb2xNYW5hZ2VyLmdldEVuYWJsZWRUb29scygpO1xyXG4gICAgICAgICAgICBtY3BTZXJ2ZXIudXBkYXRlRW5hYmxlZFRvb2xzKGVuYWJsZWRUb29scyk7XHJcbiAgICAgICAgICAgIGF3YWl0IG1jcFNlcnZlci5zdGFydCgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignW01DUCBQbHVnaW5dIG1jcFNlcnZlciBub3QgaW5pdGlhbGl6ZWQnKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU3RvcCB0aGUgTUNQIHNlcnZlclxyXG4gICAgICovXHJcbiAgICBhc3luYyBzdG9wU2VydmVyKCkge1xyXG4gICAgICAgIGlmIChtY3BTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgbWNwU2VydmVyLnN0b3AoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tNQ1AgUGx1Z2luXSBtY3BTZXJ2ZXIgbm90IGluaXRpYWxpemVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCBzZXJ2ZXIgc3RhdHVzXHJcbiAgICAgKi9cclxuICAgIGdldFNlcnZlclN0YXR1cygpIHtcclxuICAgICAgICBjb25zdCBzdGF0dXMgPSBtY3BTZXJ2ZXIgPyBtY3BTZXJ2ZXIuZ2V0U3RhdHVzKCkgOiB7IHJ1bm5pbmc6IGZhbHNlLCBwb3J0OiAwLCBjbGllbnRzOiAwIH07XHJcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBtY3BTZXJ2ZXIgPyBtY3BTZXJ2ZXIuZ2V0U2V0dGluZ3MoKSA6IHJlYWRTZXR0aW5ncygpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIC4uLnN0YXR1cyxcclxuICAgICAgICAgICAgc2V0dGluZ3M6IHNldHRpbmdzXHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVcGRhdGUgc2VydmVyIHNldHRpbmdzXHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZVNldHRpbmdzKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncykge1xyXG4gICAgICAgIHNhdmVTZXR0aW5ncyhzZXR0aW5ncyk7XHJcbiAgICAgICAgaWYgKG1jcFNlcnZlcikge1xyXG4gICAgICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xyXG4gICAgICAgICAgICBtY3BTZXJ2ZXIgPSBuZXcgTUNQU2VydmVyKHNldHRpbmdzKTtcclxuICAgICAgICAgICAgbWNwU2VydmVyLnN0YXJ0KCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbWNwU2VydmVyID0gbmV3IE1DUFNlcnZlcihzZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIG1jcFNlcnZlci5zdGFydCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdG9vbHMgbGlzdFxyXG4gICAgICovXHJcbiAgICBnZXRUb29sc0xpc3QoKSB7XHJcbiAgICAgICAgcmV0dXJuIG1jcFNlcnZlciA/IG1jcFNlcnZlci5nZXRBdmFpbGFibGVUb29scygpIDogW107XHJcbiAgICB9LFxyXG5cclxuICAgIGdldEZpbHRlcmVkVG9vbHNMaXN0KCkge1xyXG4gICAgICAgIGlmICghbWNwU2VydmVyKSByZXR1cm4gW107XHJcblxyXG4gICAgICAgIC8vIEdldCBjdXJyZW50bHkgZW5hYmxlZCB0b29sc1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRvb2xNYW5hZ2VyLmdldEVuYWJsZWRUb29scygpO1xyXG5cclxuICAgICAgICAvLyBVcGRhdGUgTUNQIHNlcnZlcidzIGVuYWJsZWQgdG9vbHMgbGlzdFxyXG4gICAgICAgIG1jcFNlcnZlci51cGRhdGVFbmFibGVkVG9vbHMoZW5hYmxlZFRvb2xzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG1jcFNlcnZlci5nZXRGaWx0ZXJlZFRvb2xzKGVuYWJsZWRUb29scyk7XHJcbiAgICB9LFxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgc2VydmVyIHNldHRpbmdzXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGdldFNlcnZlclNldHRpbmdzKCkge1xyXG4gICAgICAgIHJldHVybiBtY3BTZXJ2ZXIgPyBtY3BTZXJ2ZXIuZ2V0U2V0dGluZ3MoKSA6IHJlYWRTZXR0aW5ncygpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCBzZXJ2ZXIgc2V0dGluZ3MgKGFsdGVybmF0aXZlIG1ldGhvZClcclxuICAgICAqL1xyXG4gICAgYXN5bmMgZ2V0U2V0dGluZ3MoKSB7XHJcbiAgICAgICAgcmV0dXJuIG1jcFNlcnZlciA/IG1jcFNlcnZlci5nZXRTZXR0aW5ncygpIDogcmVhZFNldHRpbmdzKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFRvb2wgbWFuYWdlciByZWxhdGVkIG1ldGhvZHNcclxuICAgIGFzeW5jIGdldFRvb2xNYW5hZ2VyU3RhdGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRvb2xNYW5hZ2VyLmdldFRvb2xNYW5hZ2VyU3RhdGUoKTtcclxuICAgIH0sXHJcblxyXG4gICAgYXN5bmMgY3JlYXRlVG9vbENvbmZpZ3VyYXRpb24obmFtZTogc3RyaW5nLCBkZXNjcmlwdGlvbj86IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZyA9IHRvb2xNYW5hZ2VyLmNyZWF0ZUNvbmZpZ3VyYXRpb24obmFtZSwgZGVzY3JpcHRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBpZDogY29uZmlnLmlkLCBjb25maWcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGNyZWF0ZSBjb25maWd1cmF0aW9uOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBhc3luYyB1cGRhdGVUb29sQ29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nLCB1cGRhdGVzOiBhbnkpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXR1cm4gdG9vbE1hbmFnZXIudXBkYXRlQ29uZmlndXJhdGlvbihjb25maWdJZCwgdXBkYXRlcyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgY29uZmlndXJhdGlvbjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgYXN5bmMgZGVsZXRlVG9vbENvbmZpZ3VyYXRpb24oY29uZmlnSWQ6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRvb2xNYW5hZ2VyLmRlbGV0ZUNvbmZpZ3VyYXRpb24oY29uZmlnSWQpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBkZWxldGUgY29uZmlndXJhdGlvbjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgYXN5bmMgc2V0Q3VycmVudFRvb2xDb25maWd1cmF0aW9uKGNvbmZpZ0lkOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB0b29sTWFuYWdlci5zZXRDdXJyZW50Q29uZmlndXJhdGlvbihjb25maWdJZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHNldCBjdXJyZW50IGNvbmZpZ3VyYXRpb246ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIHVwZGF0ZVRvb2xTdGF0dXMoY2F0ZWdvcnk6IHN0cmluZywgdG9vbE5hbWU6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb25maWcgPSB0b29sTWFuYWdlci5nZXRDdXJyZW50Q29uZmlndXJhdGlvbigpO1xyXG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRDb25maWcpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gY3VycmVudCBjb25maWd1cmF0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRvb2xNYW5hZ2VyLnVwZGF0ZVRvb2xTdGF0dXMoY3VycmVudENvbmZpZy5pZCwgY2F0ZWdvcnksIHRvb2xOYW1lLCBlbmFibGVkKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBNQ1Agc2VydmVyJ3MgdG9vbCBsaXN0XHJcbiAgICAgICAgICAgIGlmIChtY3BTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRvb2xNYW5hZ2VyLmdldEVuYWJsZWRUb29scygpO1xyXG4gICAgICAgICAgICAgICAgbWNwU2VydmVyLnVwZGF0ZUVuYWJsZWRUb29scyhlbmFibGVkVG9vbHMpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgdG9vbCBzdGF0dXM6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIHVwZGF0ZVRvb2xTdGF0dXNCYXRjaCh1cGRhdGVzOiBhbnlbXSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTWFpbl0gdXBkYXRlVG9vbFN0YXR1c0JhdGNoIGNhbGxlZCB3aXRoIHVwZGF0ZXMgY291bnQ6YCwgdXBkYXRlcyA/IHVwZGF0ZXMubGVuZ3RoIDogMCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50Q29uZmlnID0gdG9vbE1hbmFnZXIuZ2V0Q3VycmVudENvbmZpZ3VyYXRpb24oKTtcclxuICAgICAgICAgICAgaWYgKCFjdXJyZW50Q29uZmlnKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGN1cnJlbnQgY29uZmlndXJhdGlvbicpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0b29sTWFuYWdlci51cGRhdGVUb29sU3RhdHVzQmF0Y2goY3VycmVudENvbmZpZy5pZCwgdXBkYXRlcyk7XHJcblxyXG4gICAgICAgICAgICAvLyBVcGRhdGUgTUNQIHNlcnZlcidzIHRvb2wgbGlzdFxyXG4gICAgICAgICAgICBpZiAobWNwU2VydmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0b29sTWFuYWdlci5nZXRFbmFibGVkVG9vbHMoKTtcclxuICAgICAgICAgICAgICAgIG1jcFNlcnZlci51cGRhdGVFbmFibGVkVG9vbHMoZW5hYmxlZFRvb2xzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gYmF0Y2ggdXBkYXRlIHRvb2wgc3RhdHVzOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBhc3luYyBleHBvcnRUb29sQ29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgY29uZmlnSnNvbjogdG9vbE1hbmFnZXIuZXhwb3J0Q29uZmlndXJhdGlvbihjb25maWdJZCkgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGV4cG9ydCBjb25maWd1cmF0aW9uOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBhc3luYyBpbXBvcnRUb29sQ29uZmlndXJhdGlvbihjb25maWdKc29uOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXR1cm4gdG9vbE1hbmFnZXIuaW1wb3J0Q29uZmlndXJhdGlvbihjb25maWdKc29uKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGltcG9ydCBjb25maWd1cmF0aW9uOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBhc3luYyBnZXRFbmFibGVkVG9vbHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRvb2xNYW5hZ2VyLmdldEVuYWJsZWRUb29scygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1ldGhvZCB0cmlnZ2VyZWQgb24gRXh0ZW5zaW9uIFN0YXJ0dXBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkge1xyXG4gICAgY29uc29sZS5sb2coJ0NvY29zIE1DUCBTZXJ2ZXIgZXh0ZW5zaW9uIGxvYWRlZCcpO1xyXG5cclxuICAgIC8vIEluaXRpYWxpemUgdG9vbCBtYW5hZ2VyXHJcbiAgICB0b29sTWFuYWdlciA9IG5ldyBUb29sTWFuYWdlcigpO1xyXG5cclxuICAgIC8vIFJlYWQgc2V0dGluZ3NcclxuICAgIGNvbnN0IHNldHRpbmdzID0gcmVhZFNldHRpbmdzKCk7XHJcbiAgICBtY3BTZXJ2ZXIgPSBuZXcgTUNQU2VydmVyKHNldHRpbmdzKTtcclxuXHJcbiAgICAvLyBJbml0aWFsaXplIE1DUCBzZXJ2ZXIncyB0b29sIGxpc3RcclxuICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRvb2xNYW5hZ2VyLmdldEVuYWJsZWRUb29scygpO1xyXG4gICAgbWNwU2VydmVyLnVwZGF0ZUVuYWJsZWRUb29scyhlbmFibGVkVG9vbHMpO1xyXG5cclxuICAgIC8vIElmIGF1dG8tc3RhcnQgaXMgZW5hYmxlZCwgc3RhcnQgdGhlIHNlcnZlclxyXG4gICAgaWYgKHNldHRpbmdzLmF1dG9TdGFydCkge1xyXG4gICAgICAgIG1jcFNlcnZlci5zdGFydCgpLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBhdXRvLXN0YXJ0IE1DUCBzZXJ2ZXI6JywgZXJyKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIE1ldGhvZCB0cmlnZ2VyZWQgd2hlbiB1bmluc3RhbGxpbmcgdGhlIGV4dGVuc2lvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHVubG9hZCgpIHtcclxuICAgIGlmIChtY3BTZXJ2ZXIpIHtcclxuICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xyXG4gICAgICAgIG1jcFNlcnZlciA9IG51bGw7XHJcbiAgICB9XHJcbn0iXX0=