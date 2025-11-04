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
exports.ToolManager = void 0;
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ToolManager {
    constructor() {
        this.availableTools = [];
        this.settings = this.readToolManagerSettings();
        this.initializeAvailableTools();
        // If no configurations exist, automatically create a default configuration
        if (this.settings.configurations.length === 0) {
            console.log('[ToolManager] No configurations found, creating default configuration...');
            this.createConfiguration('Default Configuration', 'Automatically created default tool configuration');
        }
    }
    getToolManagerSettingsPath() {
        return path.join(Editor.Project.path, 'settings', 'tool-manager.json');
    }
    ensureSettingsDir() {
        const settingsDir = path.dirname(this.getToolManagerSettingsPath());
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
    }
    readToolManagerSettings() {
        const DEFAULT_TOOL_MANAGER_SETTINGS = {
            configurations: [],
            currentConfigId: '',
            maxConfigSlots: 5
        };
        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            if (fs.existsSync(settingsFile)) {
                const content = fs.readFileSync(settingsFile, 'utf8');
                return Object.assign(Object.assign({}, DEFAULT_TOOL_MANAGER_SETTINGS), JSON.parse(content));
            }
        }
        catch (e) {
            console.error('Failed to read tool manager settings:', e);
        }
        return DEFAULT_TOOL_MANAGER_SETTINGS;
    }
    saveToolManagerSettings(settings) {
        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        }
        catch (e) {
            console.error('Failed to save tool manager settings:', e);
            throw e;
        }
    }
    exportToolConfiguration(config) {
        return JSON.stringify(config, null, 2);
    }
    importToolConfiguration(configJson) {
        try {
            const config = JSON.parse(configJson);
            // Validate configuration format
            if (!config.id || !config.name || !Array.isArray(config.tools)) {
                throw new Error('Invalid configuration format');
            }
            return config;
        }
        catch (e) {
            console.error('Failed to parse tool configuration:', e);
            throw new Error('Invalid JSON format or configuration structure');
        }
    }
    initializeAvailableTools() {
        // Get the actual tool list from MCP server
        try {
            // Import all tool classes
            const { SceneTools } = require('./scene-tools');
            const { NodeTools } = require('./node-tools');
            const { ComponentTools } = require('./component-tools');
            const { PrefabTools } = require('./prefab-tools');
            const { ProjectTools } = require('./project-tools');
            const { DebugTools } = require('./debug-tools');
            const { PreferencesTools } = require('./preferences-tools');
            const { ServerTools } = require('./server-tools');
            const { BroadcastTools } = require('./broadcast-tools');
            const { SceneAdvancedTools } = require('./scene-advanced-tools');
            const { SceneViewTools } = require('./scene-view-tools');
            const { ReferenceImageTools } = require('./reference-image-tools');
            const { AssetAdvancedTools } = require('./asset-advanced-tools');
            const { ValidationTools } = require('./validation-tools');
            // Initialize tool instances
            const tools = {
                scene: new SceneTools(),
                node: new NodeTools(),
                component: new ComponentTools(),
                prefab: new PrefabTools(),
                project: new ProjectTools(),
                debug: new DebugTools(),
                preferences: new PreferencesTools(),
                server: new ServerTools(),
                broadcast: new BroadcastTools(),
                sceneAdvanced: new SceneAdvancedTools(),
                sceneView: new SceneViewTools(),
                referenceImage: new ReferenceImageTools(),
                assetAdvanced: new AssetAdvancedTools(),
                validation: new ValidationTools()
            };
            // Get tool list from each tool class
            this.availableTools = [];
            for (const [category, toolSet] of Object.entries(tools)) {
                const toolDefinitions = toolSet.getTools();
                toolDefinitions.forEach((tool) => {
                    this.availableTools.push({
                        category: category,
                        name: tool.name,
                        enabled: true, // Enabled by default
                        description: tool.description
                    });
                });
            }
            console.log(`[ToolManager] Initialized ${this.availableTools.length} tools from MCP server`);
        }
        catch (error) {
            console.error('[ToolManager] Failed to initialize tools from MCP server:', error);
            // If retrieval fails, use default tool list as fallback
            this.initializeDefaultTools();
        }
    }
    initializeDefaultTools() {
        // Default tool list as fallback option
        const toolCategories = [
            { category: 'scene', name: 'Scene Tools', tools: [
                    { name: 'getCurrentSceneInfo', description: 'Get current scene information' },
                    { name: 'getSceneHierarchy', description: 'Get scene hierarchy structure' },
                    { name: 'createNewScene', description: 'Create new scene' },
                    { name: 'saveScene', description: 'Save scene' },
                    { name: 'loadScene', description: 'Load scene' }
                ] },
            { category: 'node', name: 'Node Tools', tools: [
                    { name: 'getAllNodes', description: 'Get all nodes' },
                    { name: 'findNodeByName', description: 'Find node by name' },
                    { name: 'createNode', description: 'Create node' },
                    { name: 'deleteNode', description: 'Delete node' },
                    { name: 'setNodeProperty', description: 'Set node property' },
                    { name: 'getNodeInfo', description: 'Get node information' }
                ] },
            { category: 'component', name: 'Component Tools', tools: [
                    { name: 'addComponentToNode', description: 'Add component to node' },
                    { name: 'removeComponentFromNode', description: 'Remove component from node' },
                    { name: 'setComponentProperty', description: 'Set component property' },
                    { name: 'getComponentInfo', description: 'Get component information' }
                ] },
            { category: 'prefab', name: 'Prefab Tools', tools: [
                    { name: 'createPrefabFromNode', description: 'Create prefab from node' },
                    { name: 'instantiatePrefab', description: 'Instantiate prefab' },
                    { name: 'getPrefabInfo', description: 'Get prefab information' },
                    { name: 'savePrefab', description: 'Save prefab' }
                ] },
            { category: 'project', name: 'Project Tools', tools: [
                    { name: 'getProjectInfo', description: 'Get project information' },
                    { name: 'getAssetList', description: 'Get asset list' },
                    { name: 'createAsset', description: 'Create asset' },
                    { name: 'deleteAsset', description: 'Delete asset' }
                ] },
            { category: 'debug', name: 'Debug Tools', tools: [
                    { name: 'getConsoleLogs', description: 'Get console logs' },
                    { name: 'getPerformanceStats', description: 'Get performance statistics' },
                    { name: 'validateScene', description: 'Validate scene' },
                    { name: 'getErrorLogs', description: 'Get error logs' }
                ] },
            { category: 'preferences', name: 'Preferences Tools', tools: [
                    { name: 'getPreferences', description: 'Get preferences' },
                    { name: 'setPreferences', description: 'Set preferences' },
                    { name: 'resetPreferences', description: 'Reset preferences' }
                ] },
            { category: 'server', name: 'Server Tools', tools: [
                    { name: 'getServerStatus', description: 'Get server status' },
                    { name: 'getConnectedClients', description: 'Get connected clients' },
                    { name: 'getServerLogs', description: 'Get server logs' }
                ] },
            { category: 'broadcast', name: 'Broadcast Tools', tools: [
                    { name: 'broadcastMessage', description: 'Broadcast message' },
                    { name: 'getBroadcastHistory', description: 'Get broadcast history' }
                ] },
            { category: 'sceneAdvanced', name: 'Advanced Scene Tools', tools: [
                    { name: 'optimizeScene', description: 'Optimize scene' },
                    { name: 'analyzeScene', description: 'Analyze scene' },
                    { name: 'batchOperation', description: 'Batch operation' }
                ] },
            { category: 'sceneView', name: 'Scene View Tools', tools: [
                    { name: 'getViewportInfo', description: 'Get viewport information' },
                    { name: 'setViewportCamera', description: 'Set viewport camera' },
                    { name: 'focusOnNode', description: 'Focus on node' }
                ] },
            { category: 'referenceImage', name: 'Reference Image Tools', tools: [
                    { name: 'addReferenceImage', description: 'Add reference image' },
                    { name: 'removeReferenceImage', description: 'Remove reference image' },
                    { name: 'getReferenceImages', description: 'Get reference images list' }
                ] },
            { category: 'assetAdvanced', name: 'Advanced Asset Tools', tools: [
                    { name: 'importAsset', description: 'Import asset' },
                    { name: 'exportAsset', description: 'Export asset' },
                    { name: 'processAsset', description: 'Process asset' }
                ] },
            { category: 'validation', name: 'Validation Tools', tools: [
                    { name: 'validateProject', description: 'Validate project' },
                    { name: 'validateAssets', description: 'Validate assets' },
                    { name: 'generateReport', description: 'Generate report' }
                ] }
        ];
        this.availableTools = [];
        toolCategories.forEach(category => {
            category.tools.forEach(tool => {
                this.availableTools.push({
                    category: category.category,
                    name: tool.name,
                    enabled: true, // Enabled by default
                    description: tool.description
                });
            });
        });
        console.log(`[ToolManager] Initialized ${this.availableTools.length} default tools`);
    }
    getAvailableTools() {
        return [...this.availableTools];
    }
    getConfigurations() {
        return [...this.settings.configurations];
    }
    getCurrentConfiguration() {
        if (!this.settings.currentConfigId) {
            return null;
        }
        return this.settings.configurations.find(config => config.id === this.settings.currentConfigId) || null;
    }
    createConfiguration(name, description) {
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum configuration slots reached (${this.settings.maxConfigSlots})`);
        }
        const config = {
            id: (0, uuid_1.v4)(),
            name,
            description,
            tools: this.availableTools.map(tool => (Object.assign({}, tool))),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.settings.configurations.push(config);
        this.settings.currentConfigId = config.id;
        this.saveSettings();
        return config;
    }
    updateConfiguration(configId, updates) {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error('Configuration does not exist');
        }
        const config = this.settings.configurations[configIndex];
        const updatedConfig = Object.assign(Object.assign(Object.assign({}, config), updates), { updatedAt: new Date().toISOString() });
        this.settings.configurations[configIndex] = updatedConfig;
        this.saveSettings();
        return updatedConfig;
    }
    deleteConfiguration(configId) {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error('Configuration does not exist');
        }
        this.settings.configurations.splice(configIndex, 1);
        // If deleting the current configuration, clear the current config ID
        if (this.settings.currentConfigId === configId) {
            this.settings.currentConfigId = this.settings.configurations.length > 0
                ? this.settings.configurations[0].id
                : '';
        }
        this.saveSettings();
    }
    setCurrentConfiguration(configId) {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('Configuration does not exist');
        }
        this.settings.currentConfigId = configId;
        this.saveSettings();
    }
    updateToolStatus(configId, category, toolName, enabled) {
        console.log(`Backend: Updating tool status - configId: ${configId}, category: ${category}, toolName: ${toolName}, enabled: ${enabled}`);
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            console.error(`Backend: Config not found with ID: ${configId}`);
            throw new Error('Configuration does not exist');
        }
        console.log(`Backend: Found config: ${config.name}`);
        const tool = config.tools.find(t => t.category === category && t.name === toolName);
        if (!tool) {
            console.error(`Backend: Tool not found - category: ${category}, name: ${toolName}`);
            throw new Error('Tool does not exist');
        }
        console.log(`Backend: Found tool: ${tool.name}, current enabled: ${tool.enabled}, new enabled: ${enabled}`);
        tool.enabled = enabled;
        config.updatedAt = new Date().toISOString();
        console.log(`Backend: Tool updated, saving settings...`);
        this.saveSettings();
        console.log(`Backend: Settings saved successfully`);
    }
    updateToolStatusBatch(configId, updates) {
        console.log(`Backend: updateToolStatusBatch called with configId: ${configId}`);
        console.log(`Backend: Current configurations count: ${this.settings.configurations.length}`);
        console.log(`Backend: Current config IDs:`, this.settings.configurations.map(c => c.id));
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            console.error(`Backend: Config not found with ID: ${configId}`);
            console.error(`Backend: Available config IDs:`, this.settings.configurations.map(c => c.id));
            throw new Error('Configuration does not exist');
        }
        console.log(`Backend: Found config: ${config.name}, updating ${updates.length} tools`);
        updates.forEach(update => {
            const tool = config.tools.find(t => t.category === update.category && t.name === update.name);
            if (tool) {
                tool.enabled = update.enabled;
            }
        });
        config.updatedAt = new Date().toISOString();
        this.saveSettings();
        console.log(`Backend: Batch update completed successfully`);
    }
    exportConfiguration(configId) {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('Configuration does not exist');
        }
        return this.exportToolConfiguration(config);
    }
    importConfiguration(configJson) {
        const config = this.importToolConfiguration(configJson);
        // Generate new ID and timestamp
        config.id = (0, uuid_1.v4)();
        config.createdAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum configuration slots reached (${this.settings.maxConfigSlots})`);
        }
        this.settings.configurations.push(config);
        this.saveSettings();
        return config;
    }
    getEnabledTools() {
        const currentConfig = this.getCurrentConfiguration();
        if (!currentConfig) {
            return this.availableTools.filter(tool => tool.enabled);
        }
        return currentConfig.tools.filter(tool => tool.enabled);
    }
    getToolManagerState() {
        const currentConfig = this.getCurrentConfiguration();
        return {
            success: true,
            availableTools: currentConfig ? currentConfig.tools : this.getAvailableTools(),
            selectedConfigId: this.settings.currentConfigId,
            configurations: this.getConfigurations(),
            maxConfigSlots: this.settings.maxConfigSlots
        };
    }
    saveSettings() {
        console.log(`Backend: Saving settings, current configs count: ${this.settings.configurations.length}`);
        this.saveToolManagerSettings(this.settings);
        console.log(`Backend: Settings saved to file`);
    }
}
exports.ToolManager = ToolManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbC1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3Rvb2wtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBb0M7QUFFcEMsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixNQUFhLFdBQVc7SUFJcEI7UUFGUSxtQkFBYyxHQUFpQixFQUFFLENBQUM7UUFHdEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUVoQywyRUFBMkU7UUFDM0UsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwRUFBMEUsQ0FBQyxDQUFDO1lBQ3hGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyx1QkFBdUIsRUFBRSxrREFBa0QsQ0FBQyxDQUFDO1FBQzFHLENBQUM7SUFDTCxDQUFDO0lBRU8sMEJBQTBCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRU8saUJBQWlCO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzlCLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQztJQUNMLENBQUM7SUFFTyx1QkFBdUI7UUFDM0IsTUFB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LE9BQU8sQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFTSxtQkFBbUI7UUFDdEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDckQsT0FBTztZQUNILE9BQU8sRUFBRSxJQUFJO1lBQ2IsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQzlFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZTtZQUMvQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQ3hDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWM7U0FDL0MsQ0FBQztJQUNOLENBQUM7SUFFTyxZQUFZO1FBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0RBQW9ELElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDdkcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNKO0FBbmFELGtDQW1hQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5pbXBvcnQgeyBUb29sQ29uZmlnLCBUb29sQ29uZmlndXJhdGlvbiwgVG9vbE1hbmFnZXJTZXR0aW5ncywgVG9vbERlZmluaXRpb24gfSBmcm9tICcuLi90eXBlcyc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuXHJcbmV4cG9ydCBjbGFzcyBUb29sTWFuYWdlciB7XHJcbiAgICBwcml2YXRlIHNldHRpbmdzOiBUb29sTWFuYWdlclNldHRpbmdzO1xyXG4gICAgcHJpdmF0ZSBhdmFpbGFibGVUb29sczogVG9vbENvbmZpZ1tdID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHRoaXMucmVhZFRvb2xNYW5hZ2VyU2V0dGluZ3MoKTtcclxuICAgICAgICB0aGlzLmluaXRpYWxpemVBdmFpbGFibGVUb29scygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIElmIG5vIGNvbmZpZ3VyYXRpb25zIGV4aXN0LCBhdXRvbWF0aWNhbGx5IGNyZWF0ZSBhIGRlZmF1bHQgY29uZmlndXJhdGlvblxyXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW1Rvb2xNYW5hZ2VyXSBObyBjb25maWd1cmF0aW9ucyBmb3VuZCwgY3JlYXRpbmcgZGVmYXVsdCBjb25maWd1cmF0aW9uLi4uJyk7XHJcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlQ29uZmlndXJhdGlvbignRGVmYXVsdCBDb25maWd1cmF0aW9uJywgJ0F1dG9tYXRpY2FsbHkgY3JlYXRlZCBkZWZhdWx0IHRvb2wgY29uZmlndXJhdGlvbicpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFRvb2xNYW5hZ2VyU2V0dGluZ3NQYXRoKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnc2V0dGluZ3MnLCAndG9vbC1tYW5hZ2VyLmpzb24nKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGVuc3VyZVNldHRpbmdzRGlyKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHNldHRpbmdzRGlyID0gcGF0aC5kaXJuYW1lKHRoaXMuZ2V0VG9vbE1hbmFnZXJTZXR0aW5nc1BhdGgoKSk7XHJcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNldHRpbmdzRGlyKSkge1xyXG4gICAgICAgICAgICBmcy5ta2RpclN5bmMoc2V0dGluZ3NEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlYWRUb29sTWFuYWdlclNldHRpbmdzKCk6IFRvb2xNYW5hZ2VyU2V0dGluZ3Mge1xyXG4gICAgICAgIGNvbnN0IERFRkFVTFRfVE9PTF9NQU5BR0VSX1NFVFRJTkdTOiBUb29sTWFuYWdlclNldHRpbmdzID0ge1xyXG4gICAgICAgICAgICBjb25maWd1cmF0aW9uczogW10sXHJcbiAgICAgICAgICAgIGN1cnJlbnRDb25maWdJZDogJycsXHJcbiAgICAgICAgICAgIG1heENvbmZpZ1Nsb3RzOiA1XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5lbnN1cmVTZXR0aW5nc0RpcigpO1xyXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5nc0ZpbGUgPSB0aGlzLmdldFRvb2xNYW5hZ2VyU2V0dGluZ3NQYXRoKCk7XHJcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHNldHRpbmdzRmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoc2V0dGluZ3NGaWxlLCAndXRmOCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgLi4uREVGQVVMVF9UT09MX01BTkFHRVJfU0VUVElOR1MsIC4uLkpTT04ucGFyc2UoY29udGVudCkgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlYWQgdG9vbCBtYW5hZ2VyIHNldHRpbmdzOicsIGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gREVGQVVMVF9UT09MX01BTkFHRVJfU0VUVElOR1M7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzYXZlVG9vbE1hbmFnZXJTZXR0aW5ncyhzZXR0aW5nczogVG9vbE1hbmFnZXJTZXR0aW5ncyk6IHZvaWQge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW5zdXJlU2V0dGluZ3NEaXIoKTtcclxuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3NGaWxlID0gdGhpcy5nZXRUb29sTWFuYWdlclNldHRpbmdzUGF0aCgpO1xyXG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHNldHRpbmdzRmlsZSwgSlNPTi5zdHJpbmdpZnkoc2V0dGluZ3MsIG51bGwsIDIpKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzYXZlIHRvb2wgbWFuYWdlciBzZXR0aW5nczonLCBlKTtcclxuICAgICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBleHBvcnRUb29sQ29uZmlndXJhdGlvbihjb25maWc6IFRvb2xDb25maWd1cmF0aW9uKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGltcG9ydFRvb2xDb25maWd1cmF0aW9uKGNvbmZpZ0pzb246IHN0cmluZyk6IFRvb2xDb25maWd1cmF0aW9uIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWcgPSBKU09OLnBhcnNlKGNvbmZpZ0pzb24pO1xyXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBjb25maWd1cmF0aW9uIGZvcm1hdFxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5pZCB8fCAhY29uZmlnLm5hbWUgfHwgIUFycmF5LmlzQXJyYXkoY29uZmlnLnRvb2xzKSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24gZm9ybWF0Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZztcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSB0b29sIGNvbmZpZ3VyYXRpb246JywgZSk7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBKU09OIGZvcm1hdCBvciBjb25maWd1cmF0aW9uIHN0cnVjdHVyZScpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGluaXRpYWxpemVBdmFpbGFibGVUb29scygpOiB2b2lkIHtcclxuICAgICAgICAvLyBHZXQgdGhlIGFjdHVhbCB0b29sIGxpc3QgZnJvbSBNQ1Agc2VydmVyXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gSW1wb3J0IGFsbCB0b29sIGNsYXNzZXNcclxuICAgICAgICAgICAgY29uc3QgeyBTY2VuZVRvb2xzIH0gPSByZXF1aXJlKCcuL3NjZW5lLXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgTm9kZVRvb2xzIH0gPSByZXF1aXJlKCcuL25vZGUtdG9vbHMnKTtcclxuICAgICAgICAgICAgY29uc3QgeyBDb21wb25lbnRUb29scyB9ID0gcmVxdWlyZSgnLi9jb21wb25lbnQtdG9vbHMnKTtcclxuICAgICAgICAgICAgY29uc3QgeyBQcmVmYWJUb29scyB9ID0gcmVxdWlyZSgnLi9wcmVmYWItdG9vbHMnKTtcclxuICAgICAgICAgICAgY29uc3QgeyBQcm9qZWN0VG9vbHMgfSA9IHJlcXVpcmUoJy4vcHJvamVjdC10b29scycpO1xyXG4gICAgICAgICAgICBjb25zdCB7IERlYnVnVG9vbHMgfSA9IHJlcXVpcmUoJy4vZGVidWctdG9vbHMnKTtcclxuICAgICAgICAgICAgY29uc3QgeyBQcmVmZXJlbmNlc1Rvb2xzIH0gPSByZXF1aXJlKCcuL3ByZWZlcmVuY2VzLXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgU2VydmVyVG9vbHMgfSA9IHJlcXVpcmUoJy4vc2VydmVyLXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgQnJvYWRjYXN0VG9vbHMgfSA9IHJlcXVpcmUoJy4vYnJvYWRjYXN0LXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgU2NlbmVBZHZhbmNlZFRvb2xzIH0gPSByZXF1aXJlKCcuL3NjZW5lLWFkdmFuY2VkLXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgU2NlbmVWaWV3VG9vbHMgfSA9IHJlcXVpcmUoJy4vc2NlbmUtdmlldy10b29scycpO1xyXG4gICAgICAgICAgICBjb25zdCB7IFJlZmVyZW5jZUltYWdlVG9vbHMgfSA9IHJlcXVpcmUoJy4vcmVmZXJlbmNlLWltYWdlLXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgQXNzZXRBZHZhbmNlZFRvb2xzIH0gPSByZXF1aXJlKCcuL2Fzc2V0LWFkdmFuY2VkLXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgVmFsaWRhdGlvblRvb2xzIH0gPSByZXF1aXJlKCcuL3ZhbGlkYXRpb24tdG9vbHMnKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbCBpbnN0YW5jZXNcclxuICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB7XHJcbiAgICAgICAgICAgICAgICBzY2VuZTogbmV3IFNjZW5lVG9vbHMoKSxcclxuICAgICAgICAgICAgICAgIG5vZGU6IG5ldyBOb2RlVG9vbHMoKSxcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogbmV3IENvbXBvbmVudFRvb2xzKCksXHJcbiAgICAgICAgICAgICAgICBwcmVmYWI6IG5ldyBQcmVmYWJUb29scygpLFxyXG4gICAgICAgICAgICAgICAgcHJvamVjdDogbmV3IFByb2plY3RUb29scygpLFxyXG4gICAgICAgICAgICAgICAgZGVidWc6IG5ldyBEZWJ1Z1Rvb2xzKCksXHJcbiAgICAgICAgICAgICAgICBwcmVmZXJlbmNlczogbmV3IFByZWZlcmVuY2VzVG9vbHMoKSxcclxuICAgICAgICAgICAgICAgIHNlcnZlcjogbmV3IFNlcnZlclRvb2xzKCksXHJcbiAgICAgICAgICAgICAgICBicm9hZGNhc3Q6IG5ldyBCcm9hZGNhc3RUb29scygpLFxyXG4gICAgICAgICAgICAgICAgc2NlbmVBZHZhbmNlZDogbmV3IFNjZW5lQWR2YW5jZWRUb29scygpLFxyXG4gICAgICAgICAgICAgICAgc2NlbmVWaWV3OiBuZXcgU2NlbmVWaWV3VG9vbHMoKSxcclxuICAgICAgICAgICAgICAgIHJlZmVyZW5jZUltYWdlOiBuZXcgUmVmZXJlbmNlSW1hZ2VUb29scygpLFxyXG4gICAgICAgICAgICAgICAgYXNzZXRBZHZhbmNlZDogbmV3IEFzc2V0QWR2YW5jZWRUb29scygpLFxyXG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogbmV3IFZhbGlkYXRpb25Ub29scygpXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAvLyBHZXQgdG9vbCBsaXN0IGZyb20gZWFjaCB0b29sIGNsYXNzXHJcbiAgICAgICAgICAgIHRoaXMuYXZhaWxhYmxlVG9vbHMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBbY2F0ZWdvcnksIHRvb2xTZXRdIG9mIE9iamVjdC5lbnRyaWVzKHRvb2xzKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbERlZmluaXRpb25zID0gdG9vbFNldC5nZXRUb29scygpO1xyXG4gICAgICAgICAgICAgICAgdG9vbERlZmluaXRpb25zLmZvckVhY2goKHRvb2w6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXZhaWxhYmxlVG9vbHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogdG9vbC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLCAvLyBFbmFibGVkIGJ5IGRlZmF1bHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb25cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW1Rvb2xNYW5hZ2VyXSBJbml0aWFsaXplZCAke3RoaXMuYXZhaWxhYmxlVG9vbHMubGVuZ3RofSB0b29scyBmcm9tIE1DUCBzZXJ2ZXJgKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVG9vbE1hbmFnZXJdIEZhaWxlZCB0byBpbml0aWFsaXplIHRvb2xzIGZyb20gTUNQIHNlcnZlcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIC8vIElmIHJldHJpZXZhbCBmYWlscywgdXNlIGRlZmF1bHQgdG9vbCBsaXN0IGFzIGZhbGxiYWNrXHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZURlZmF1bHRUb29scygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGluaXRpYWxpemVEZWZhdWx0VG9vbHMoKTogdm9pZCB7XHJcbiAgICAgICAgLy8gRGVmYXVsdCB0b29sIGxpc3QgYXMgZmFsbGJhY2sgb3B0aW9uXHJcbiAgICAgICAgY29uc3QgdG9vbENhdGVnb3JpZXMgPSBbXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdzY2VuZScsIG5hbWU6ICdTY2VuZSBUb29scycsIHRvb2xzOiBbXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRDdXJyZW50U2NlbmVJbmZvJywgZGVzY3JpcHRpb246ICdHZXQgY3VycmVudCBzY2VuZSBpbmZvcm1hdGlvbicgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldFNjZW5lSGllcmFyY2h5JywgZGVzY3JpcHRpb246ICdHZXQgc2NlbmUgaGllcmFyY2h5IHN0cnVjdHVyZScgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2NyZWF0ZU5ld1NjZW5lJywgZGVzY3JpcHRpb246ICdDcmVhdGUgbmV3IHNjZW5lJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnc2F2ZVNjZW5lJywgZGVzY3JpcHRpb246ICdTYXZlIHNjZW5lJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnbG9hZFNjZW5lJywgZGVzY3JpcHRpb246ICdMb2FkIHNjZW5lJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnbm9kZScsIG5hbWU6ICdOb2RlIFRvb2xzJywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldEFsbE5vZGVzJywgZGVzY3JpcHRpb246ICdHZXQgYWxsIG5vZGVzJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZmluZE5vZGVCeU5hbWUnLCBkZXNjcmlwdGlvbjogJ0ZpbmQgbm9kZSBieSBuYW1lJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnY3JlYXRlTm9kZScsIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIG5vZGUnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdkZWxldGVOb2RlJywgZGVzY3JpcHRpb246ICdEZWxldGUgbm9kZScgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3NldE5vZGVQcm9wZXJ0eScsIGRlc2NyaXB0aW9uOiAnU2V0IG5vZGUgcHJvcGVydHknIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXROb2RlSW5mbycsIGRlc2NyaXB0aW9uOiAnR2V0IG5vZGUgaW5mb3JtYXRpb24nIH1cclxuICAgICAgICAgICAgXX0sXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdjb21wb25lbnQnLCBuYW1lOiAnQ29tcG9uZW50IFRvb2xzJywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2FkZENvbXBvbmVudFRvTm9kZScsIGRlc2NyaXB0aW9uOiAnQWRkIGNvbXBvbmVudCB0byBub2RlJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAncmVtb3ZlQ29tcG9uZW50RnJvbU5vZGUnLCBkZXNjcmlwdGlvbjogJ1JlbW92ZSBjb21wb25lbnQgZnJvbSBub2RlJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnc2V0Q29tcG9uZW50UHJvcGVydHknLCBkZXNjcmlwdGlvbjogJ1NldCBjb21wb25lbnQgcHJvcGVydHknIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRDb21wb25lbnRJbmZvJywgZGVzY3JpcHRpb246ICdHZXQgY29tcG9uZW50IGluZm9ybWF0aW9uJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAncHJlZmFiJywgbmFtZTogJ1ByZWZhYiBUb29scycsIHRvb2xzOiBbXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdjcmVhdGVQcmVmYWJGcm9tTm9kZScsIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIHByZWZhYiBmcm9tIG5vZGUnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdpbnN0YW50aWF0ZVByZWZhYicsIGRlc2NyaXB0aW9uOiAnSW5zdGFudGlhdGUgcHJlZmFiJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0UHJlZmFiSW5mbycsIGRlc2NyaXB0aW9uOiAnR2V0IHByZWZhYiBpbmZvcm1hdGlvbicgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3NhdmVQcmVmYWInLCBkZXNjcmlwdGlvbjogJ1NhdmUgcHJlZmFiJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAncHJvamVjdCcsIG5hbWU6ICdQcm9qZWN0IFRvb2xzJywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldFByb2plY3RJbmZvJywgZGVzY3JpcHRpb246ICdHZXQgcHJvamVjdCBpbmZvcm1hdGlvbicgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldEFzc2V0TGlzdCcsIGRlc2NyaXB0aW9uOiAnR2V0IGFzc2V0IGxpc3QnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdjcmVhdGVBc3NldCcsIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIGFzc2V0JyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZGVsZXRlQXNzZXQnLCBkZXNjcmlwdGlvbjogJ0RlbGV0ZSBhc3NldCcgfVxyXG4gICAgICAgICAgICBdfSxcclxuICAgICAgICAgICAgeyBjYXRlZ29yeTogJ2RlYnVnJywgbmFtZTogJ0RlYnVnIFRvb2xzJywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldENvbnNvbGVMb2dzJywgZGVzY3JpcHRpb246ICdHZXQgY29uc29sZSBsb2dzJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0UGVyZm9ybWFuY2VTdGF0cycsIGRlc2NyaXB0aW9uOiAnR2V0IHBlcmZvcm1hbmNlIHN0YXRpc3RpY3MnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICd2YWxpZGF0ZVNjZW5lJywgZGVzY3JpcHRpb246ICdWYWxpZGF0ZSBzY2VuZScgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldEVycm9yTG9ncycsIGRlc2NyaXB0aW9uOiAnR2V0IGVycm9yIGxvZ3MnIH1cclxuICAgICAgICAgICAgXX0sXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdwcmVmZXJlbmNlcycsIG5hbWU6ICdQcmVmZXJlbmNlcyBUb29scycsIHRvb2xzOiBbXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRQcmVmZXJlbmNlcycsIGRlc2NyaXB0aW9uOiAnR2V0IHByZWZlcmVuY2VzJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnc2V0UHJlZmVyZW5jZXMnLCBkZXNjcmlwdGlvbjogJ1NldCBwcmVmZXJlbmNlcycgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3Jlc2V0UHJlZmVyZW5jZXMnLCBkZXNjcmlwdGlvbjogJ1Jlc2V0IHByZWZlcmVuY2VzJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnc2VydmVyJywgbmFtZTogJ1NlcnZlciBUb29scycsIHRvb2xzOiBbXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRTZXJ2ZXJTdGF0dXMnLCBkZXNjcmlwdGlvbjogJ0dldCBzZXJ2ZXIgc3RhdHVzJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0Q29ubmVjdGVkQ2xpZW50cycsIGRlc2NyaXB0aW9uOiAnR2V0IGNvbm5lY3RlZCBjbGllbnRzJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0U2VydmVyTG9ncycsIGRlc2NyaXB0aW9uOiAnR2V0IHNlcnZlciBsb2dzJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnYnJvYWRjYXN0JywgbmFtZTogJ0Jyb2FkY2FzdCBUb29scycsIHRvb2xzOiBbXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdicm9hZGNhc3RNZXNzYWdlJywgZGVzY3JpcHRpb246ICdCcm9hZGNhc3QgbWVzc2FnZScgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldEJyb2FkY2FzdEhpc3RvcnknLCBkZXNjcmlwdGlvbjogJ0dldCBicm9hZGNhc3QgaGlzdG9yeScgfVxyXG4gICAgICAgICAgICBdfSxcclxuICAgICAgICAgICAgeyBjYXRlZ29yeTogJ3NjZW5lQWR2YW5jZWQnLCBuYW1lOiAnQWR2YW5jZWQgU2NlbmUgVG9vbHMnLCB0b29sczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnb3B0aW1pemVTY2VuZScsIGRlc2NyaXB0aW9uOiAnT3B0aW1pemUgc2NlbmUnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdhbmFseXplU2NlbmUnLCBkZXNjcmlwdGlvbjogJ0FuYWx5emUgc2NlbmUnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdiYXRjaE9wZXJhdGlvbicsIGRlc2NyaXB0aW9uOiAnQmF0Y2ggb3BlcmF0aW9uJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnc2NlbmVWaWV3JywgbmFtZTogJ1NjZW5lIFZpZXcgVG9vbHMnLCB0b29sczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0Vmlld3BvcnRJbmZvJywgZGVzY3JpcHRpb246ICdHZXQgdmlld3BvcnQgaW5mb3JtYXRpb24nIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdzZXRWaWV3cG9ydENhbWVyYScsIGRlc2NyaXB0aW9uOiAnU2V0IHZpZXdwb3J0IGNhbWVyYScgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2ZvY3VzT25Ob2RlJywgZGVzY3JpcHRpb246ICdGb2N1cyBvbiBub2RlJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAncmVmZXJlbmNlSW1hZ2UnLCBuYW1lOiAnUmVmZXJlbmNlIEltYWdlIFRvb2xzJywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2FkZFJlZmVyZW5jZUltYWdlJywgZGVzY3JpcHRpb246ICdBZGQgcmVmZXJlbmNlIGltYWdlJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAncmVtb3ZlUmVmZXJlbmNlSW1hZ2UnLCBkZXNjcmlwdGlvbjogJ1JlbW92ZSByZWZlcmVuY2UgaW1hZ2UnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRSZWZlcmVuY2VJbWFnZXMnLCBkZXNjcmlwdGlvbjogJ0dldCByZWZlcmVuY2UgaW1hZ2VzIGxpc3QnIH1cclxuICAgICAgICAgICAgXX0sXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdhc3NldEFkdmFuY2VkJywgbmFtZTogJ0FkdmFuY2VkIEFzc2V0IFRvb2xzJywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2ltcG9ydEFzc2V0JywgZGVzY3JpcHRpb246ICdJbXBvcnQgYXNzZXQnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdleHBvcnRBc3NldCcsIGRlc2NyaXB0aW9uOiAnRXhwb3J0IGFzc2V0JyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAncHJvY2Vzc0Fzc2V0JywgZGVzY3JpcHRpb246ICdQcm9jZXNzIGFzc2V0JyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAndmFsaWRhdGlvbicsIG5hbWU6ICdWYWxpZGF0aW9uIFRvb2xzJywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3ZhbGlkYXRlUHJvamVjdCcsIGRlc2NyaXB0aW9uOiAnVmFsaWRhdGUgcHJvamVjdCcgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3ZhbGlkYXRlQXNzZXRzJywgZGVzY3JpcHRpb246ICdWYWxpZGF0ZSBhc3NldHMnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZW5lcmF0ZVJlcG9ydCcsIGRlc2NyaXB0aW9uOiAnR2VuZXJhdGUgcmVwb3J0JyB9XHJcbiAgICAgICAgICAgIF19XHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgdGhpcy5hdmFpbGFibGVUb29scyA9IFtdO1xyXG4gICAgICAgIHRvb2xDYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xyXG4gICAgICAgICAgICBjYXRlZ29yeS50b29scy5mb3JFYWNoKHRvb2wgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hdmFpbGFibGVUb29scy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnkuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdG9vbC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsIC8vIEVuYWJsZWQgYnkgZGVmYXVsdFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbVG9vbE1hbmFnZXJdIEluaXRpYWxpemVkICR7dGhpcy5hdmFpbGFibGVUb29scy5sZW5ndGh9IGRlZmF1bHQgdG9vbHNgKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0QXZhaWxhYmxlVG9vbHMoKTogVG9vbENvbmZpZ1tdIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuYXZhaWxhYmxlVG9vbHNdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRDb25maWd1cmF0aW9ucygpOiBUb29sQ29uZmlndXJhdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gWy4uLnRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnNdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRDdXJyZW50Q29uZmlndXJhdGlvbigpOiBUb29sQ29uZmlndXJhdGlvbiB8IG51bGwge1xyXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5jdXJyZW50Q29uZmlnSWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmZpbmQoY29uZmlnID0+IGNvbmZpZy5pZCA9PT0gdGhpcy5zZXR0aW5ncy5jdXJyZW50Q29uZmlnSWQpIHx8IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNyZWF0ZUNvbmZpZ3VyYXRpb24obmFtZTogc3RyaW5nLCBkZXNjcmlwdGlvbj86IHN0cmluZyk6IFRvb2xDb25maWd1cmF0aW9uIHtcclxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5sZW5ndGggPj0gdGhpcy5zZXR0aW5ncy5tYXhDb25maWdTbG90cykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1heGltdW0gY29uZmlndXJhdGlvbiBzbG90cyByZWFjaGVkICgke3RoaXMuc2V0dGluZ3MubWF4Q29uZmlnU2xvdHN9KWApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29uZmlnOiBUb29sQ29uZmlndXJhdGlvbiA9IHtcclxuICAgICAgICAgICAgaWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgICAgICBuYW1lLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbixcclxuICAgICAgICAgICAgdG9vbHM6IHRoaXMuYXZhaWxhYmxlVG9vbHMubWFwKHRvb2wgPT4gKHsgLi4udG9vbCB9KSksXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMucHVzaChjb25maWcpO1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY3VycmVudENvbmZpZ0lkID0gY29uZmlnLmlkO1xyXG4gICAgICAgIHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVwZGF0ZUNvbmZpZ3VyYXRpb24oY29uZmlnSWQ6IHN0cmluZywgdXBkYXRlczogUGFydGlhbDxUb29sQ29uZmlndXJhdGlvbj4pOiBUb29sQ29uZmlndXJhdGlvbiB7XHJcbiAgICAgICAgY29uc3QgY29uZmlnSW5kZXggPSB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmZpbmRJbmRleChjb25maWcgPT4gY29uZmlnLmlkID09PSBjb25maWdJZCk7XHJcbiAgICAgICAgaWYgKGNvbmZpZ0luZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZG9lcyBub3QgZXhpc3QnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnNbY29uZmlnSW5kZXhdO1xyXG4gICAgICAgIGNvbnN0IHVwZGF0ZWRDb25maWc6IFRvb2xDb25maWd1cmF0aW9uID0ge1xyXG4gICAgICAgICAgICAuLi5jb25maWcsXHJcbiAgICAgICAgICAgIC4uLnVwZGF0ZXMsXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9uc1tjb25maWdJbmRleF0gPSB1cGRhdGVkQ29uZmlnO1xyXG4gICAgICAgIHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB1cGRhdGVkQ29uZmlnO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBkZWxldGVDb25maWd1cmF0aW9uKGNvbmZpZ0lkOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBjb25maWdJbmRleCA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMuZmluZEluZGV4KGNvbmZpZyA9PiBjb25maWcuaWQgPT09IGNvbmZpZ0lkKTtcclxuICAgICAgICBpZiAoY29uZmlnSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBkb2VzIG5vdCBleGlzdCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5zcGxpY2UoY29uZmlnSW5kZXgsIDEpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIElmIGRlbGV0aW5nIHRoZSBjdXJyZW50IGNvbmZpZ3VyYXRpb24sIGNsZWFyIHRoZSBjdXJyZW50IGNvbmZpZyBJRFxyXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmN1cnJlbnRDb25maWdJZCA9PT0gY29uZmlnSWQpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q29uZmlnSWQgPSB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmxlbmd0aCA+IDAgXHJcbiAgICAgICAgICAgICAgICA/IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnNbMF0uaWQgXHJcbiAgICAgICAgICAgICAgICA6ICcnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0Q3VycmVudENvbmZpZ3VyYXRpb24oY29uZmlnSWQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMuZmluZChjb25maWcgPT4gY29uZmlnLmlkID09PSBjb25maWdJZCk7XHJcbiAgICAgICAgaWYgKCFjb25maWcpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIGRvZXMgbm90IGV4aXN0Jyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDb25maWdJZCA9IGNvbmZpZ0lkO1xyXG4gICAgICAgIHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVwZGF0ZVRvb2xTdGF0dXMoY29uZmlnSWQ6IHN0cmluZywgY2F0ZWdvcnk6IHN0cmluZywgdG9vbE5hbWU6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBVcGRhdGluZyB0b29sIHN0YXR1cyAtIGNvbmZpZ0lkOiAke2NvbmZpZ0lkfSwgY2F0ZWdvcnk6ICR7Y2F0ZWdvcnl9LCB0b29sTmFtZTogJHt0b29sTmFtZX0sIGVuYWJsZWQ6ICR7ZW5hYmxlZH1gKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmZpbmQoY29uZmlnID0+IGNvbmZpZy5pZCA9PT0gY29uZmlnSWQpO1xyXG4gICAgICAgIGlmICghY29uZmlnKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEJhY2tlbmQ6IENvbmZpZyBub3QgZm91bmQgd2l0aCBJRDogJHtjb25maWdJZH1gKTtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIGRvZXMgbm90IGV4aXN0Jyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogRm91bmQgY29uZmlnOiAke2NvbmZpZy5uYW1lfWApO1xyXG5cclxuICAgICAgICBjb25zdCB0b29sID0gY29uZmlnLnRvb2xzLmZpbmQodCA9PiB0LmNhdGVnb3J5ID09PSBjYXRlZ29yeSAmJiB0Lm5hbWUgPT09IHRvb2xOYW1lKTtcclxuICAgICAgICBpZiAoIXRvb2wpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgQmFja2VuZDogVG9vbCBub3QgZm91bmQgLSBjYXRlZ29yeTogJHtjYXRlZ29yeX0sIG5hbWU6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVG9vbCBkb2VzIG5vdCBleGlzdCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IEZvdW5kIHRvb2w6ICR7dG9vbC5uYW1lfSwgY3VycmVudCBlbmFibGVkOiAke3Rvb2wuZW5hYmxlZH0sIG5ldyBlbmFibGVkOiAke2VuYWJsZWR9YCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdG9vbC5lbmFibGVkID0gZW5hYmxlZDtcclxuICAgICAgICBjb25maWcudXBkYXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBUb29sIHVwZGF0ZWQsIHNhdmluZyBzZXR0aW5ncy4uLmApO1xyXG4gICAgICAgIHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IFNldHRpbmdzIHNhdmVkIHN1Y2Nlc3NmdWxseWApO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyB1cGRhdGVUb29sU3RhdHVzQmF0Y2goY29uZmlnSWQ6IHN0cmluZywgdXBkYXRlczogeyBjYXRlZ29yeTogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IGVuYWJsZWQ6IGJvb2xlYW4gfVtdKTogdm9pZCB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IHVwZGF0ZVRvb2xTdGF0dXNCYXRjaCBjYWxsZWQgd2l0aCBjb25maWdJZDogJHtjb25maWdJZH1gKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogQ3VycmVudCBjb25maWd1cmF0aW9ucyBjb3VudDogJHt0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmxlbmd0aH1gKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogQ3VycmVudCBjb25maWcgSURzOmAsIHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMubWFwKGMgPT4gYy5pZCkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMuZmluZChjb25maWcgPT4gY29uZmlnLmlkID09PSBjb25maWdJZCk7XHJcbiAgICAgICAgaWYgKCFjb25maWcpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgQmFja2VuZDogQ29uZmlnIG5vdCBmb3VuZCB3aXRoIElEOiAke2NvbmZpZ0lkfWApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBCYWNrZW5kOiBBdmFpbGFibGUgY29uZmlnIElEczpgLCB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLm1hcChjID0+IGMuaWQpKTtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIGRvZXMgbm90IGV4aXN0Jyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogRm91bmQgY29uZmlnOiAke2NvbmZpZy5uYW1lfSwgdXBkYXRpbmcgJHt1cGRhdGVzLmxlbmd0aH0gdG9vbHNgKTtcclxuXHJcbiAgICAgICAgdXBkYXRlcy5mb3JFYWNoKHVwZGF0ZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRvb2wgPSBjb25maWcudG9vbHMuZmluZCh0ID0+IHQuY2F0ZWdvcnkgPT09IHVwZGF0ZS5jYXRlZ29yeSAmJiB0Lm5hbWUgPT09IHVwZGF0ZS5uYW1lKTtcclxuICAgICAgICAgICAgaWYgKHRvb2wpIHtcclxuICAgICAgICAgICAgICAgIHRvb2wuZW5hYmxlZCA9IHVwZGF0ZS5lbmFibGVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbmZpZy51cGRhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogQmF0Y2ggdXBkYXRlIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHlgKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZXhwb3J0Q29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmZpbmQoY29uZmlnID0+IGNvbmZpZy5pZCA9PT0gY29uZmlnSWQpO1xyXG4gICAgICAgIGlmICghY29uZmlnKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBkb2VzIG5vdCBleGlzdCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZXhwb3J0VG9vbENvbmZpZ3VyYXRpb24oY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaW1wb3J0Q29uZmlndXJhdGlvbihjb25maWdKc29uOiBzdHJpbmcpOiBUb29sQ29uZmlndXJhdGlvbiB7XHJcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5pbXBvcnRUb29sQ29uZmlndXJhdGlvbihjb25maWdKc29uKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgSUQgYW5kIHRpbWVzdGFtcFxyXG4gICAgICAgIGNvbmZpZy5pZCA9IHV1aWR2NCgpO1xyXG4gICAgICAgIGNvbmZpZy5jcmVhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgY29uZmlnLnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMubGVuZ3RoID49IHRoaXMuc2V0dGluZ3MubWF4Q29uZmlnU2xvdHMpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXhpbXVtIGNvbmZpZ3VyYXRpb24gc2xvdHMgcmVhY2hlZCAoJHt0aGlzLnNldHRpbmdzLm1heENvbmZpZ1Nsb3RzfSlgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMucHVzaChjb25maWcpO1xyXG4gICAgICAgIHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldEVuYWJsZWRUb29scygpOiBUb29sQ29uZmlnW10ge1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRDb25maWcgPSB0aGlzLmdldEN1cnJlbnRDb25maWd1cmF0aW9uKCk7XHJcbiAgICAgICAgaWYgKCFjdXJyZW50Q29uZmlnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF2YWlsYWJsZVRvb2xzLmZpbHRlcih0b29sID0+IHRvb2wuZW5hYmxlZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjdXJyZW50Q29uZmlnLnRvb2xzLmZpbHRlcih0b29sID0+IHRvb2wuZW5hYmxlZCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldFRvb2xNYW5hZ2VyU3RhdGUoKSB7XHJcbiAgICAgICAgY29uc3QgY3VycmVudENvbmZpZyA9IHRoaXMuZ2V0Q3VycmVudENvbmZpZ3VyYXRpb24oKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBhdmFpbGFibGVUb29sczogY3VycmVudENvbmZpZyA/IGN1cnJlbnRDb25maWcudG9vbHMgOiB0aGlzLmdldEF2YWlsYWJsZVRvb2xzKCksXHJcbiAgICAgICAgICAgIHNlbGVjdGVkQ29uZmlnSWQ6IHRoaXMuc2V0dGluZ3MuY3VycmVudENvbmZpZ0lkLFxyXG4gICAgICAgICAgICBjb25maWd1cmF0aW9uczogdGhpcy5nZXRDb25maWd1cmF0aW9ucygpLFxyXG4gICAgICAgICAgICBtYXhDb25maWdTbG90czogdGhpcy5zZXR0aW5ncy5tYXhDb25maWdTbG90c1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzYXZlU2V0dGluZ3MoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IFNhdmluZyBzZXR0aW5ncywgY3VycmVudCBjb25maWdzIGNvdW50OiAke3RoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMubGVuZ3RofWApO1xyXG4gICAgICAgIHRoaXMuc2F2ZVRvb2xNYW5hZ2VyU2V0dGluZ3ModGhpcy5zZXR0aW5ncyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IFNldHRpbmdzIHNhdmVkIHRvIGZpbGVgKTtcclxuICAgIH1cclxufSAiXX0=