import { MCPServer } from './mcp-server';
import { readSettings, saveSettings } from './settings';
import { MCPServerSettings } from './types';
import { ToolManager } from './tools/tool-manager';

let mcpServer: MCPServer | null = null;
let toolManager: ToolManager;

/**
 * Registration method for the main process of Extension
 */
export const methods: { [key: string]: (...any: any) => any } = {
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
        } else {
            console.warn('[MCP Plugin] mcpServer not initialized');
        }
    },

    /**
     * Stop the MCP server
     */
    async stopServer() {
        if (mcpServer) {
            mcpServer.stop();
        } else {
            console.warn('[MCP Plugin] mcpServer not initialized');
        }
    },

    /**
     * Get server status
     */
    getServerStatus() {
        const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0, clients: 0 };
        const settings = mcpServer ? mcpServer.getSettings() : readSettings();
        return {
            ...status,
            settings: settings
        };
    },

    /**
     * Update server settings
     */
    updateSettings(settings: MCPServerSettings) {
        saveSettings(settings);
        if (mcpServer) {
            mcpServer.stop();
            mcpServer = new MCPServer(settings);
            mcpServer.start();
        } else {
            mcpServer = new MCPServer(settings);
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
        if (!mcpServer) return [];

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
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    /**
     * Get server settings (alternative method)
     */
    async getSettings() {
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    // Tool manager related methods
    async getToolManagerState() {
        return toolManager.getToolManagerState();
    },

    async createToolConfiguration(name: string, description?: string) {
        try {
            const config = toolManager.createConfiguration(name, description);
            return { success: true, id: config.id, config };
        } catch (error: any) {
            throw new Error(`Failed to create configuration: ${error.message}`);
        }
    },

    async updateToolConfiguration(configId: string, updates: any) {
        try {
            return toolManager.updateConfiguration(configId, updates);
        } catch (error: any) {
            throw new Error(`Failed to update configuration: ${error.message}`);
        }
    },

    async deleteToolConfiguration(configId: string) {
        try {
            toolManager.deleteConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to delete configuration: ${error.message}`);
        }
    },

    async setCurrentToolConfiguration(configId: string) {
        try {
            toolManager.setCurrentConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to set current configuration: ${error.message}`);
        }
    },

    async updateToolStatus(category: string, toolName: string, enabled: boolean) {
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
        } catch (error: any) {
            throw new Error(`Failed to update tool status: ${error.message}`);
        }
    },

    async updateToolStatusBatch(updates: any[]) {
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
        } catch (error: any) {
            throw new Error(`Failed to batch update tool status: ${error.message}`);
        }
    },

    async exportToolConfiguration(configId: string) {
        try {
            return { configJson: toolManager.exportConfiguration(configId) };
        } catch (error: any) {
            throw new Error(`Failed to export configuration: ${error.message}`);
        }
    },

    async importToolConfiguration(configJson: string) {
        try {
            return toolManager.importConfiguration(configJson);
        } catch (error: any) {
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
export function load() {
    console.log('Cocos MCP Server extension loaded');

    // Initialize tool manager
    toolManager = new ToolManager();

    // Read settings
    const settings = readSettings();
    mcpServer = new MCPServer(settings);

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
export function unload() {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
}