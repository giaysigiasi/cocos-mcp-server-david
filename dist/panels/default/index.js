"use strict";
/* eslint-disable vue/one-component-per-file */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const panelDataMap = new WeakMap();
module.exports = Editor.Panel.define({
    listeners: {
        show() {
            console.log('[MCP Panel] Panel shown');
        },
        hide() {
            console.log('[MCP Panel] Panel hidden');
        },
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        panelTitle: '#panelTitle',
    },
    ready() {
        if (this.$.app) {
            const app = (0, vue_1.createApp)({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            // Create main app component
            app.component('McpServerApp', (0, vue_1.defineComponent)({
                setup() {
                    // Reactive data
                    const activeTab = (0, vue_1.ref)('server');
                    const serverRunning = (0, vue_1.ref)(false);
                    const serverStatus = (0, vue_1.ref)('Stopped');
                    const connectedClients = (0, vue_1.ref)(0);
                    const httpUrl = (0, vue_1.ref)('');
                    const isProcessing = (0, vue_1.ref)(false);
                    const settings = (0, vue_1.ref)({
                        port: 3000,
                        autoStart: false,
                        debugLog: false,
                        maxConnections: 10
                    });
                    const availableTools = (0, vue_1.ref)([]);
                    const toolCategories = (0, vue_1.ref)([]);
                    // Computed properties
                    const statusClass = (0, vue_1.computed)(() => ({
                        'status-running': serverRunning.value,
                        'status-stopped': !serverRunning.value
                    }));
                    const totalTools = (0, vue_1.computed)(() => availableTools.value.length);
                    const enabledTools = (0, vue_1.computed)(() => availableTools.value.filter(t => t.enabled).length);
                    const disabledTools = (0, vue_1.computed)(() => totalTools.value - enabledTools.value);
                    const settingsChanged = (0, vue_1.ref)(false);
                    // Methods
                    const switchTab = (tabName) => {
                        activeTab.value = tabName;
                        if (tabName === 'tools') {
                            loadToolManagerState();
                        }
                    };
                    const toggleServer = async () => {
                        try {
                            if (serverRunning.value) {
                                await Editor.Message.request('cocos-mcp-server', 'stop-server');
                            }
                            else {
                                // Use current panel settings when starting server
                                const currentSettings = {
                                    port: settings.value.port,
                                    autoStart: settings.value.autoStart,
                                    enableDebugLog: settings.value.debugLog,
                                    maxConnections: settings.value.maxConnections
                                };
                                await Editor.Message.request('cocos-mcp-server', 'update-settings', currentSettings);
                                await Editor.Message.request('cocos-mcp-server', 'start-server');
                            }
                            console.log('[Vue App] Server toggled');
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to toggle server:', error);
                        }
                    };
                    const saveSettings = async () => {
                        try {
                            // Create a simple object to avoid cloning errors
                            const settingsData = {
                                port: settings.value.port,
                                autoStart: settings.value.autoStart,
                                debugLog: settings.value.debugLog,
                                maxConnections: settings.value.maxConnections
                            };
                            const result = await Editor.Message.request('cocos-mcp-server', 'update-settings', settingsData);
                            console.log('[Vue App] Save settings result:', result);
                            settingsChanged.value = false;
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to save settings:', error);
                        }
                    };
                    const copyUrl = async () => {
                        try {
                            await navigator.clipboard.writeText(httpUrl.value);
                            console.log('[Vue App] URL copied to clipboard');
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to copy URL:', error);
                        }
                    };
                    const loadToolManagerState = async () => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'getToolManagerState');
                            if (result && result.success) {
                                // Always load backend state to ensure data is up to date
                                availableTools.value = result.availableTools || [];
                                console.log('[Vue App] Loaded tools:', availableTools.value.length);
                                // Update tool categories
                                const categories = new Set(availableTools.value.map(tool => tool.category));
                                toolCategories.value = Array.from(categories);
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to load tool manager state:', error);
                        }
                    };
                    const updateToolStatus = async (category, name, enabled) => {
                        try {
                            console.log('[Vue App] updateToolStatus called:', category, name, enabled);
                            // First update local state
                            const toolIndex = availableTools.value.findIndex(t => t.category === category && t.name === name);
                            if (toolIndex !== -1) {
                                availableTools.value[toolIndex].enabled = enabled;
                                // Force trigger reactive update
                                availableTools.value = [...availableTools.value];
                                console.log('[Vue App] Local state updated, tool enabled:', availableTools.value[toolIndex].enabled);
                            }
                            // Call backend update
                            const result = await Editor.Message.request('cocos-mcp-server', 'updateToolStatus', category, name, enabled);
                            if (!result || !result.success) {
                                // If backend update fails, rollback local state
                                if (toolIndex !== -1) {
                                    availableTools.value[toolIndex].enabled = !enabled;
                                    availableTools.value = [...availableTools.value];
                                }
                                console.error('[Vue App] Backend update failed, rolled back local state');
                            }
                            else {
                                console.log('[Vue App] Backend update successful');
                            }
                        }
                        catch (error) {
                            // If an error occurs, rollback local state
                            const toolIndex = availableTools.value.findIndex(t => t.category === category && t.name === name);
                            if (toolIndex !== -1) {
                                availableTools.value[toolIndex].enabled = !enabled;
                                availableTools.value = [...availableTools.value];
                            }
                            console.error('[Vue App] Failed to update tool status:', error);
                        }
                    };
                    const selectAllTools = async () => {
                        try {
                            // Directly update local state, then save
                            availableTools.value.forEach(tool => tool.enabled = true);
                            await saveChanges();
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to select all tools:', error);
                        }
                    };
                    const deselectAllTools = async () => {
                        try {
                            // Directly update local state, then save
                            availableTools.value.forEach(tool => tool.enabled = false);
                            await saveChanges();
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to deselect all tools:', error);
                        }
                    };
                    const saveChanges = async () => {
                        try {
                            // Create plain object to avoid Vue3 reactive object cloning errors
                            const updates = availableTools.value.map(tool => ({
                                category: String(tool.category),
                                name: String(tool.name),
                                enabled: Boolean(tool.enabled)
                            }));
                            console.log('[Vue App] Sending updates:', updates.length, 'tools');
                            const result = await Editor.Message.request('cocos-mcp-server', 'updateToolStatusBatch', updates);
                            if (result && result.success) {
                                console.log('[Vue App] Tool changes saved successfully');
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to save tool changes:', error);
                        }
                    };
                    const toggleCategoryTools = async (category, enabled) => {
                        try {
                            // Directly update local state, then save
                            availableTools.value.forEach(tool => {
                                if (tool.category === category) {
                                    tool.enabled = enabled;
                                }
                            });
                            await saveChanges();
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to toggle category tools:', error);
                        }
                    };
                    const getToolsByCategory = (category) => {
                        return availableTools.value.filter(tool => tool.category === category);
                    };
                    const getCategoryDisplayName = (category) => {
                        const categoryNames = {
                            'scene': 'Scene Tools',
                            'node': 'Node Tools',
                            'component': 'Component Tools',
                            'prefab': 'Prefab Tools',
                            'project': 'Project Tools',
                            'debug': 'Debug Tools',
                            'preferences': 'Preferences Tools',
                            'server': 'Server Tools',
                            'broadcast': 'Broadcast Tools',
                            'sceneAdvanced': 'Advanced Scene Tools',
                            'sceneView': 'Scene View Tools',
                            'referenceImage': 'Reference Image Tools',
                            'assetAdvanced': 'Advanced Asset Tools',
                            'validation': 'Validation Tools'
                        };
                        return categoryNames[category] || category;
                    };
                    // Watch for settings changes
                    (0, vue_1.watch)(settings, () => {
                        settingsChanged.value = true;
                    }, { deep: true });
                    // Load data when component is mounted
                    (0, vue_1.onMounted)(async () => {
                        // Load tool manager state
                        await loadToolManagerState();
                        // Get settings information from server status
                        try {
                            const serverStatus = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                            if (serverStatus && serverStatus.settings) {
                                settings.value = {
                                    port: serverStatus.settings.port || 3000,
                                    autoStart: serverStatus.settings.autoStart || false,
                                    debugLog: serverStatus.settings.enableDebugLog || false,
                                    maxConnections: serverStatus.settings.maxConnections || 10
                                };
                                console.log('[Vue App] Server settings loaded from status:', serverStatus.settings);
                            }
                            else if (serverStatus && serverStatus.port) {
                                // Compatible with old versions, only get port information
                                settings.value.port = serverStatus.port;
                                console.log('[Vue App] Port loaded from server status:', serverStatus.port);
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to get server status:', error);
                            console.log('[Vue App] Using default server settings');
                        }
                        // Periodically update server status
                        setInterval(async () => {
                            try {
                                const result = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                                if (result) {
                                    serverRunning.value = result.running;
                                    serverStatus.value = result.running ? 'Running' : 'Stopped';
                                    connectedClients.value = result.clients || 0;
                                    httpUrl.value = result.running ? `http://localhost:${result.port}` : '';
                                    isProcessing.value = false;
                                }
                            }
                            catch (error) {
                                console.error('[Vue App] Failed to get server status:', error);
                            }
                        }, 2000);
                    });
                    return {
                        // Data
                        activeTab,
                        serverRunning,
                        serverStatus,
                        connectedClients,
                        httpUrl,
                        isProcessing,
                        settings,
                        availableTools,
                        toolCategories,
                        settingsChanged,
                        // Computed properties
                        statusClass,
                        totalTools,
                        enabledTools,
                        disabledTools,
                        // Methods
                        switchTab,
                        toggleServer,
                        saveSettings,
                        copyUrl,
                        loadToolManagerState,
                        updateToolStatus,
                        selectAllTools,
                        deselectAllTools,
                        saveChanges,
                        toggleCategoryTools,
                        getToolsByCategory,
                        getCategoryDisplayName
                    };
                },
                template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/vue/mcp-server-app.html'), 'utf-8'),
            }));
            app.mount(this.$.app);
            panelDataMap.set(this, app);
            console.log('[MCP Panel] Vue3 app mounted successfully');
        }
    },
    beforeClose() { },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7QUFFL0MsdUNBQXdDO0FBQ3hDLCtCQUE0QjtBQUM1Qiw2QkFBaUc7QUFFakcsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQTRCN0MsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNqQyxTQUFTLEVBQUU7UUFDUCxJQUFJO1lBQ0EsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFDRCxJQUFJO1lBQ0EsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzVDLENBQUM7S0FDSjtJQUNELFFBQVEsRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLDZDQUE2QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQy9GLEtBQUssRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHlDQUF5QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQ3hGLENBQUMsRUFBRTtRQUNDLEdBQUcsRUFBRSxNQUFNO1FBQ1gsVUFBVSxFQUFFLGFBQWE7S0FDNUI7SUFDRCxLQUFLO1FBQ0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLEdBQUcsSUFBQSxlQUFTLEVBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTVFLDRCQUE0QjtZQUM1QixHQUFHLENBQUMsU0FBUyxDQUFD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R0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksR0FBRyxFQUFFLENBQUM7WUFDTixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNMLENBQUM7Q0FDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSB2dWUvb25lLWNvbXBvbmVudC1wZXItZmlsZSAqL1xyXG5cclxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGNyZWF0ZUFwcCwgQXBwLCBkZWZpbmVDb21wb25lbnQsIHJlZiwgY29tcHV0ZWQsIG9uTW91bnRlZCwgd2F0Y2gsIG5leHRUaWNrIH0gZnJvbSAndnVlJztcclxuXHJcbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xyXG5cclxuLy8gRGVmaW5lIHRvb2wgY29uZmlndXJhdGlvbiBpbnRlcmZhY2VcclxuaW50ZXJmYWNlIFRvb2xDb25maWcge1xyXG4gICAgY2F0ZWdvcnk6IHN0cmluZztcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIGVuYWJsZWQ6IGJvb2xlYW47XHJcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG59XHJcblxyXG4vLyBEZWZpbmUgY29uZmlndXJhdGlvbiBpbnRlcmZhY2VcclxuaW50ZXJmYWNlIENvbmZpZ3VyYXRpb24ge1xyXG4gICAgaWQ6IHN0cmluZztcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgICB0b29sczogVG9vbENvbmZpZ1tdO1xyXG4gICAgY3JlYXRlZEF0OiBzdHJpbmc7XHJcbiAgICB1cGRhdGVkQXQ6IHN0cmluZztcclxufVxyXG5cclxuLy8gRGVmaW5lIHNlcnZlciBzZXR0aW5ncyBpbnRlcmZhY2VcclxuaW50ZXJmYWNlIFNlcnZlclNldHRpbmdzIHtcclxuICAgIHBvcnQ6IG51bWJlcjtcclxuICAgIGF1dG9TdGFydDogYm9vbGVhbjtcclxuICAgIGRlYnVnTG9nOiBib29sZWFuO1xyXG4gICAgbWF4Q29ubmVjdGlvbnM6IG51bWJlcjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcclxuICAgIGxpc3RlbmVyczoge1xyXG4gICAgICAgIHNob3coKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQIFBhbmVsXSBQYW5lbCBzaG93bicpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaGlkZSgpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1AgUGFuZWxdIFBhbmVsIGhpZGRlbicpO1xyXG4gICAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxyXG4gICAgJDoge1xyXG4gICAgICAgIGFwcDogJyNhcHAnLFxyXG4gICAgICAgIHBhbmVsVGl0bGU6ICcjcGFuZWxUaXRsZScsXHJcbiAgICB9LFxyXG4gICAgcmVhZHkoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJC5hcHApIHtcclxuICAgICAgICAgICAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHt9KTtcclxuICAgICAgICAgICAgYXBwLmNvbmZpZy5jb21waWxlck9wdGlvbnMuaXNDdXN0b21FbGVtZW50ID0gKHRhZykgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xyXG5cclxuICAgICAgICAgICAgLy8gQ3JlYXRlIG1haW4gYXBwIGNvbXBvbmVudFxyXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdNY3BTZXJ2ZXJBcHAnLCBkZWZpbmVDb21wb25lbnQoe1xyXG4gICAgICAgICAgICAgICAgc2V0dXAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVhY3RpdmUgZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdGl2ZVRhYiA9IHJlZignc2VydmVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VydmVyUnVubmluZyA9IHJlZihmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VydmVyU3RhdHVzID0gcmVmKCdTdG9wcGVkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGVkQ2xpZW50cyA9IHJlZigwKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBodHRwVXJsID0gcmVmKCcnKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1Byb2Nlc3NpbmcgPSByZWYoZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHJlZjxTZXJ2ZXJTZXR0aW5ncz4oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiAzMDAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z0xvZzogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiAxMFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVUb29scyA9IHJlZjxUb29sQ29uZmlnW10+KFtdKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sQ2F0ZWdvcmllcyA9IHJlZjxzdHJpbmdbXT4oW10pO1xyXG5cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIENvbXB1dGVkIHByb3BlcnRpZXNcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IGNvbXB1dGVkKCgpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdzdGF0dXMtcnVubmluZyc6IHNlcnZlclJ1bm5pbmcudmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdzdGF0dXMtc3RvcHBlZCc6ICFzZXJ2ZXJSdW5uaW5nLnZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b3RhbFRvb2xzID0gY29tcHV0ZWQoKCkgPT4gYXZhaWxhYmxlVG9vbHMudmFsdWUubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSBjb21wdXRlZCgoKSA9PiBhdmFpbGFibGVUb29scy52YWx1ZS5maWx0ZXIodCA9PiB0LmVuYWJsZWQpLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzYWJsZWRUb29scyA9IGNvbXB1dGVkKCgpID0+IHRvdGFsVG9vbHMudmFsdWUgLSBlbmFibGVkVG9vbHMudmFsdWUpO1xyXG5cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzQ2hhbmdlZCA9IHJlZihmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIE1ldGhvZHNcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzd2l0Y2hUYWIgPSAodGFiTmFtZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVRhYi52YWx1ZSA9IHRhYk5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YWJOYW1lID09PSAndG9vbHMnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2FkVG9vbE1hbmFnZXJTdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9nZ2xlU2VydmVyID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlcnZlclJ1bm5pbmcudmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3N0b3Atc2VydmVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVzZSBjdXJyZW50IHBhbmVsIHNldHRpbmdzIHdoZW4gc3RhcnRpbmcgc2VydmVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFNldHRpbmdzID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBzZXR0aW5ncy52YWx1ZS5wb3J0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IHNldHRpbmdzLnZhbHVlLmF1dG9TdGFydCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGVidWdMb2c6IHNldHRpbmdzLnZhbHVlLmRlYnVnTG9nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhDb25uZWN0aW9uczogc2V0dGluZ3MudmFsdWUubWF4Q29ubmVjdGlvbnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAndXBkYXRlLXNldHRpbmdzJywgY3VycmVudFNldHRpbmdzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3N0YXJ0LXNlcnZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTZXJ2ZXIgdG9nZ2xlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byB0b2dnbGUgc2VydmVyOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhdmVTZXR0aW5ncyA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNpbXBsZSBvYmplY3QgdG8gYXZvaWQgY2xvbmluZyBlcnJvcnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzRGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBzZXR0aW5ncy52YWx1ZS5wb3J0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogc2V0dGluZ3MudmFsdWUuYXV0b1N0YXJ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnTG9nOiBzZXR0aW5ncy52YWx1ZS5kZWJ1Z0xvZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhDb25uZWN0aW9uczogc2V0dGluZ3MudmFsdWUubWF4Q29ubmVjdGlvbnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICd1cGRhdGUtc2V0dGluZ3MnLCBzZXR0aW5nc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTYXZlIHNldHRpbmdzIHJlc3VsdDonLCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3NDaGFuZ2VkLnZhbHVlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIHNhdmUgc2V0dGluZ3M6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29weVVybCA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGh0dHBVcmwudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBVUkwgY29waWVkIHRvIGNsaXBib2FyZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBjb3B5IFVSTDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2FkVG9vbE1hbmFnZXJTdGF0ZSA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnZ2V0VG9vbE1hbmFnZXJTdGF0ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsd2F5cyBsb2FkIGJhY2tlbmQgc3RhdGUgdG8gZW5zdXJlIGRhdGEgaXMgdXAgdG8gZGF0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlID0gcmVzdWx0LmF2YWlsYWJsZVRvb2xzIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gTG9hZGVkIHRvb2xzOicsIGF2YWlsYWJsZVRvb2xzLnZhbHVlLmxlbmd0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b29sIGNhdGVnb3JpZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0gbmV3IFNldChhdmFpbGFibGVUb29scy52YWx1ZS5tYXAodG9vbCA9PiB0b29sLmNhdGVnb3J5KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbENhdGVnb3JpZXMudmFsdWUgPSBBcnJheS5mcm9tKGNhdGVnb3JpZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBsb2FkIHRvb2wgbWFuYWdlciBzdGF0ZTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVUb29sU3RhdHVzID0gYXN5bmMgKGNhdGVnb3J5OiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSB1cGRhdGVUb29sU3RhdHVzIGNhbGxlZDonLCBjYXRlZ29yeSwgbmFtZSwgZW5hYmxlZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyc3QgdXBkYXRlIGxvY2FsIHN0YXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sSW5kZXggPSBhdmFpbGFibGVUb29scy52YWx1ZS5maW5kSW5kZXgodCA9PiB0LmNhdGVnb3J5ID09PSBjYXRlZ29yeSAmJiB0Lm5hbWUgPT09IG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvb2xJbmRleCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZVt0b29sSW5kZXhdLmVuYWJsZWQgPSBlbmFibGVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvcmNlIHRyaWdnZXIgcmVhY3RpdmUgdXBkYXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHMudmFsdWUgPSBbLi4uYXZhaWxhYmxlVG9vbHMudmFsdWVdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gTG9jYWwgc3RhdGUgdXBkYXRlZCwgdG9vbCBlbmFibGVkOicsIGF2YWlsYWJsZVRvb2xzLnZhbHVlW3Rvb2xJbmRleF0uZW5hYmxlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBiYWNrZW5kIHVwZGF0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICd1cGRhdGVUb29sU3RhdHVzJywgY2F0ZWdvcnksIG5hbWUsIGVuYWJsZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgYmFja2VuZCB1cGRhdGUgZmFpbHMsIHJvbGxiYWNrIGxvY2FsIHN0YXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvb2xJbmRleCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHMudmFsdWVbdG9vbEluZGV4XS5lbmFibGVkID0gIWVuYWJsZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlID0gWy4uLmF2YWlsYWJsZVRvb2xzLnZhbHVlXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEJhY2tlbmQgdXBkYXRlIGZhaWxlZCwgcm9sbGVkIGJhY2sgbG9jYWwgc3RhdGUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBCYWNrZW5kIHVwZGF0ZSBzdWNjZXNzZnVsJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBhbiBlcnJvciBvY2N1cnMsIHJvbGxiYWNrIGxvY2FsIHN0YXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sSW5kZXggPSBhdmFpbGFibGVUb29scy52YWx1ZS5maW5kSW5kZXgodCA9PiB0LmNhdGVnb3J5ID09PSBjYXRlZ29yeSAmJiB0Lm5hbWUgPT09IG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvb2xJbmRleCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZVt0b29sSW5kZXhdLmVuYWJsZWQgPSAhZW5hYmxlZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZSA9IFsuLi5hdmFpbGFibGVUb29scy52YWx1ZV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIHVwZGF0ZSB0b29sIHN0YXR1czonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RBbGxUb29scyA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERpcmVjdGx5IHVwZGF0ZSBsb2NhbCBzdGF0ZSwgdGhlbiBzYXZlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZS5mb3JFYWNoKHRvb2wgPT4gdG9vbC5lbmFibGVkID0gdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBzYXZlQ2hhbmdlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBzZWxlY3QgYWxsIHRvb2xzOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2VsZWN0QWxsVG9vbHMgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEaXJlY3RseSB1cGRhdGUgbG9jYWwgc3RhdGUsIHRoZW4gc2F2ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHMudmFsdWUuZm9yRWFjaCh0b29sID0+IHRvb2wuZW5hYmxlZCA9IGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHNhdmVDaGFuZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIGRlc2VsZWN0IGFsbCB0b29sczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYXZlQ2hhbmdlcyA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBwbGFpbiBvYmplY3QgdG8gYXZvaWQgVnVlMyByZWFjdGl2ZSBvYmplY3QgY2xvbmluZyBlcnJvcnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZXMgPSBhdmFpbGFibGVUb29scy52YWx1ZS5tYXAodG9vbCA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBTdHJpbmcodG9vbC5jYXRlZ29yeSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogU3RyaW5nKHRvb2wubmFtZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogQm9vbGVhbih0b29sLmVuYWJsZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTZW5kaW5nIHVwZGF0ZXM6JywgdXBkYXRlcy5sZW5ndGgsICd0b29scycpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAndXBkYXRlVG9vbFN0YXR1c0JhdGNoJywgdXBkYXRlcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gVG9vbCBjaGFuZ2VzIHNhdmVkIHN1Y2Nlc3NmdWxseScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBzYXZlIHRvb2wgY2hhbmdlczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvZ2dsZUNhdGVnb3J5VG9vbHMgPSBhc3luYyAoY2F0ZWdvcnk6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRGlyZWN0bHkgdXBkYXRlIGxvY2FsIHN0YXRlLCB0aGVuIHNhdmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlLmZvckVhY2godG9vbCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvb2wuY2F0ZWdvcnkgPT09IGNhdGVnb3J5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2wuZW5hYmxlZCA9IGVuYWJsZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBzYXZlQ2hhbmdlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byB0b2dnbGUgY2F0ZWdvcnkgdG9vbHM6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2V0VG9vbHNCeUNhdGVnb3J5ID0gKGNhdGVnb3J5OiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF2YWlsYWJsZVRvb2xzLnZhbHVlLmZpbHRlcih0b29sID0+IHRvb2wuY2F0ZWdvcnkgPT09IGNhdGVnb3J5KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBnZXRDYXRlZ29yeURpc3BsYXlOYW1lID0gKGNhdGVnb3J5OiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeU5hbWVzOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3NjZW5lJzogJ1NjZW5lIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdub2RlJzogJ05vZGUgVG9vbHMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbXBvbmVudCc6ICdDb21wb25lbnQgVG9vbHMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3ByZWZhYic6ICdQcmVmYWIgVG9vbHMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Byb2plY3QnOiAnUHJvamVjdCBUb29scycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZGVidWcnOiAnRGVidWcgVG9vbHMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3ByZWZlcmVuY2VzJzogJ1ByZWZlcmVuY2VzIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXJ2ZXInOiAnU2VydmVyIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdicm9hZGNhc3QnOiAnQnJvYWRjYXN0IFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzY2VuZUFkdmFuY2VkJzogJ0FkdmFuY2VkIFNjZW5lIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzY2VuZVZpZXcnOiAnU2NlbmUgVmlldyBUb29scycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncmVmZXJlbmNlSW1hZ2UnOiAnUmVmZXJlbmNlIEltYWdlIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhc3NldEFkdmFuY2VkJzogJ0FkdmFuY2VkIEFzc2V0IFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICd2YWxpZGF0aW9uJzogJ1ZhbGlkYXRpb24gVG9vbHMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYXRlZ29yeU5hbWVzW2NhdGVnb3J5XSB8fCBjYXRlZ29yeTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuXHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gV2F0Y2ggZm9yIHNldHRpbmdzIGNoYW5nZXNcclxuICAgICAgICAgICAgICAgICAgICB3YXRjaChzZXR0aW5ncywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5nc0NoYW5nZWQudmFsdWUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIHsgZGVlcDogdHJ1ZSB9KTtcclxuXHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIGRhdGEgd2hlbiBjb21wb25lbnQgaXMgbW91bnRlZFxyXG4gICAgICAgICAgICAgICAgICAgIG9uTW91bnRlZChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvYWQgdG9vbCBtYW5hZ2VyIHN0YXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGxvYWRUb29sTWFuYWdlclN0YXRlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgc2V0dGluZ3MgaW5mb3JtYXRpb24gZnJvbSBzZXJ2ZXIgc3RhdHVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXJTdGF0dXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VydmVyU3RhdHVzICYmIHNlcnZlclN0YXR1cy5zZXR0aW5ncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLnZhbHVlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBzZXJ2ZXJTdGF0dXMuc2V0dGluZ3MucG9ydCB8fCAzMDAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IHNlcnZlclN0YXR1cy5zZXR0aW5ncy5hdXRvU3RhcnQgfHwgZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnTG9nOiBzZXJ2ZXJTdGF0dXMuc2V0dGluZ3MuZW5hYmxlRGVidWdMb2cgfHwgZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiBzZXJ2ZXJTdGF0dXMuc2V0dGluZ3MubWF4Q29ubmVjdGlvbnMgfHwgMTBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gU2VydmVyIHNldHRpbmdzIGxvYWRlZCBmcm9tIHN0YXR1czonLCBzZXJ2ZXJTdGF0dXMuc2V0dGluZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZXJ2ZXJTdGF0dXMgJiYgc2VydmVyU3RhdHVzLnBvcnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb21wYXRpYmxlIHdpdGggb2xkIHZlcnNpb25zLCBvbmx5IGdldCBwb3J0IGluZm9ybWF0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MudmFsdWUucG9ydCA9IHNlcnZlclN0YXR1cy5wb3J0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gUG9ydCBsb2FkZWQgZnJvbSBzZXJ2ZXIgc3RhdHVzOicsIHNlcnZlclN0YXR1cy5wb3J0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gZ2V0IHNlcnZlciBzdGF0dXM6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBVc2luZyBkZWZhdWx0IHNlcnZlciBzZXR0aW5ncycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQZXJpb2RpY2FsbHkgdXBkYXRlIHNlcnZlciBzdGF0dXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJSdW5uaW5nLnZhbHVlID0gcmVzdWx0LnJ1bm5pbmc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclN0YXR1cy52YWx1ZSA9IHJlc3VsdC5ydW5uaW5nID8gJ1J1bm5pbmcnIDogJ1N0b3BwZWQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWRDbGllbnRzLnZhbHVlID0gcmVzdWx0LmNsaWVudHMgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHR0cFVybC52YWx1ZSA9IHJlc3VsdC5ydW5uaW5nID8gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtyZXN1bHQucG9ydH1gIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzUHJvY2Vzc2luZy52YWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBnZXQgc2VydmVyIHN0YXR1czonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDIwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVRhYixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVyUnVubmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVyU3RhdHVzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWRDbGllbnRzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBodHRwVXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1Byb2Nlc3NpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbENhdGVnb3JpZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzQ2hhbmdlZCxcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbXB1dGVkIHByb3BlcnRpZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsVG9vbHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWRUb29scyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWRUb29scyxcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1ldGhvZHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVTZXJ2ZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVTZXR0aW5ncyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29weVVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZFRvb2xNYW5hZ2VyU3RhdGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVRvb2xTdGF0dXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdEFsbFRvb2xzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNlbGVjdEFsbFRvb2xzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlQ2hhbmdlcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlQ2F0ZWdvcnlUb29scyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0VG9vbHNCeUNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRDYXRlZ29yeURpc3BsYXlOYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL3Z1ZS9tY3Atc2VydmVyLWFwcC5odG1sJyksICd1dGYtOCcpLFxyXG4gICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgICBhcHAubW91bnQodGhpcy4kLmFwcCk7XHJcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQIFBhbmVsXSBWdWUzIGFwcCBtb3VudGVkIHN1Y2Nlc3NmdWxseScpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBiZWZvcmVDbG9zZSgpIHsgfSxcclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIGNvbnN0IGFwcCA9IHBhbmVsRGF0YU1hcC5nZXQodGhpcyk7XHJcbiAgICAgICAgaWYgKGFwcCkge1xyXG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn0pOyJdfQ==