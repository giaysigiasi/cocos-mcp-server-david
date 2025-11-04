"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('Tool Manager panel shown'); },
        hide() { console.log('Tool Manager panel hidden'); }
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/default/tool-manager.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        panelTitle: '#panelTitle',
        createConfigBtn: '#createConfigBtn',
        importConfigBtn: '#importConfigBtn',
        exportConfigBtn: '#exportConfigBtn',
        configSelector: '#configSelector',
        applyConfigBtn: '#applyConfigBtn',
        editConfigBtn: '#editConfigBtn',
        deleteConfigBtn: '#deleteConfigBtn',
        toolsContainer: '#toolsContainer',
        selectAllBtn: '#selectAllBtn',
        deselectAllBtn: '#deselectAllBtn',
        saveChangesBtn: '#saveChangesBtn',
        totalToolsCount: '#totalToolsCount',
        enabledToolsCount: '#enabledToolsCount',
        disabledToolsCount: '#disabledToolsCount',
        configModal: '#configModal',
        modalTitle: '#modalTitle',
        configForm: '#configForm',
        configName: '#configName',
        configDescription: '#configDescription',
        closeModal: '#closeModal',
        cancelConfigBtn: '#cancelConfigBtn',
        saveConfigBtn: '#saveConfigBtn',
        importModal: '#importModal',
        importConfigJson: '#importConfigJson',
        closeImportModal: '#closeImportModal',
        cancelImportBtn: '#cancelImportBtn',
        confirmImportBtn: '#confirmImportBtn'
    },
    methods: {
        async loadToolManagerState() {
            try {
                this.toolManagerState = await Editor.Message.request('cocos-mcp-server', 'getToolManagerState');
                this.currentConfiguration = this.toolManagerState.currentConfiguration;
                this.configurations = this.toolManagerState.configurations;
                this.availableTools = this.toolManagerState.availableTools;
                this.updateUI();
            }
            catch (error) {
                console.error('Failed to load tool manager state:', error);
                this.showError('Failed to load tool manager state');
            }
        },
        updateUI() {
            this.updateConfigSelector();
            this.updateToolsDisplay();
            this.updateStatusBar();
            this.updateButtons();
        },
        updateConfigSelector() {
            const selector = this.$.configSelector;
            selector.innerHTML = '<option value="">Select configuration...</option>';
            this.configurations.forEach((config) => {
                const option = document.createElement('option');
                option.value = config.id;
                option.textContent = config.name;
                if (this.currentConfiguration && config.id === this.currentConfiguration.id) {
                    option.selected = true;
                }
                selector.appendChild(option);
            });
        },
        updateToolsDisplay() {
            const container = this.$.toolsContainer;
            if (!this.currentConfiguration) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>No configuration selected</h3>
                        <p>Please select a configuration or create a new one first</p>
                    </div>
                `;
                return;
            }
            const toolsByCategory = {};
            this.currentConfiguration.tools.forEach((tool) => {
                if (!toolsByCategory[tool.category]) {
                    toolsByCategory[tool.category] = [];
                }
                toolsByCategory[tool.category].push(tool);
            });
            container.innerHTML = '';
            Object.entries(toolsByCategory).forEach(([category, tools]) => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'tool-category';
                const enabledCount = tools.filter((t) => t.enabled).length;
                const totalCount = tools.length;
                categoryDiv.innerHTML = `
                    <div class="category-header">
                        <div class="category-name">${this.getCategoryDisplayName(category)}</div>
                        <div class="category-toggle">
                            <span>${enabledCount}/${totalCount}</span>
                            <input type="checkbox" class="checkbox category-checkbox" 
                                   data-category="${category}" 
                                   ${enabledCount === totalCount ? 'checked' : ''}>
                        </div>
                    </div>
                    <div class="tool-list">
                        ${tools.map((tool) => `
                            <div class="tool-item">
                                <div class="tool-info">
                                    <div class="tool-name">${tool.name}</div>
                                    <div class="tool-description">${tool.description}</div>
                                </div>
                                <div class="tool-toggle">
                                    <input type="checkbox" class="checkbox tool-checkbox" 
                                           data-category="${tool.category}" 
                                           data-name="${tool.name}" 
                                           ${tool.enabled ? 'checked' : ''}>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                container.appendChild(categoryDiv);
            });
            this.bindToolEvents();
        },
        bindToolEvents() {
            document.querySelectorAll('.category-checkbox').forEach((checkbox) => {
                checkbox.addEventListener('change', (e) => {
                    const category = e.target.dataset.category;
                    const checked = e.target.checked;
                    this.toggleCategoryTools(category, checked);
                });
            });
            document.querySelectorAll('.tool-checkbox').forEach((checkbox) => {
                checkbox.addEventListener('change', (e) => {
                    const category = e.target.dataset.category;
                    const name = e.target.dataset.name;
                    const enabled = e.target.checked;
                    this.updateToolStatus(category, name, enabled);
                });
            });
        },
        async toggleCategoryTools(category, enabled) {
            if (!this.currentConfiguration)
                return;
            console.log(`Toggling category tools: ${category} = ${enabled}`);
            const categoryTools = this.currentConfiguration.tools.filter((tool) => tool.category === category);
            if (categoryTools.length === 0)
                return;
            const updates = categoryTools.map((tool) => ({
                category: tool.category,
                name: tool.name,
                enabled: enabled
            }));
            try {
                // First update local state
                categoryTools.forEach((tool) => {
                    tool.enabled = enabled;
                });
                console.log(`Updated local category state: ${category} = ${enabled}`);
                // Immediately update UI
                this.updateStatusBar();
                this.updateCategoryCounts();
                this.updateToolCheckboxes(category, enabled);
                // Then send to backend
                await Editor.Message.request('cocos-mcp-server', 'updateToolStatusBatch', this.currentConfiguration.id, updates);
            }
            catch (error) {
                console.error('Failed to toggle category tools:', error);
                this.showError('Failed to toggle category tools');
                // If backend update fails, rollback local state
                categoryTools.forEach((tool) => {
                    tool.enabled = !enabled;
                });
                this.updateStatusBar();
                this.updateCategoryCounts();
                this.updateToolCheckboxes(category, !enabled);
            }
        },
        async updateToolStatus(category, name, enabled) {
            if (!this.currentConfiguration)
                return;
            console.log(`Updating tool status: ${category}.${name} = ${enabled}`);
            console.log(`Current config ID: ${this.currentConfiguration.id}`);
            // 先更新本地状态
            const tool = this.currentConfiguration.tools.find((t) => t.category === category && t.name === name);
            if (!tool) {
                console.error(`Tool not found: ${category}.${name}`);
                return;
            }
            try {
                tool.enabled = enabled;
                console.log(`Updated local tool state: ${tool.name} = ${tool.enabled}`);
                // Immediately update UI (only update statistics, don't re-render tool list)
                this.updateStatusBar();
                this.updateCategoryCounts();
                // Then send to backend
                console.log(`Sending to backend: configId=${this.currentConfiguration.id}, category=${category}, name=${name}, enabled=${enabled}`);
                const result = await Editor.Message.request('cocos-mcp-server', 'updateToolStatus', this.currentConfiguration.id, category, name, enabled);
                console.log('Backend response:', result);
            }
            catch (error) {
                console.error('Failed to update tool status:', error);
                this.showError('Failed to update tool status');
                // If backend update fails, rollback local state
                tool.enabled = !enabled;
                this.updateStatusBar();
                this.updateCategoryCounts();
            }
        },
        updateStatusBar() {
            if (!this.currentConfiguration) {
                this.$.totalToolsCount.textContent = '0';
                this.$.enabledToolsCount.textContent = '0';
                this.$.disabledToolsCount.textContent = '0';
                return;
            }
            const total = this.currentConfiguration.tools.length;
            const enabled = this.currentConfiguration.tools.filter((t) => t.enabled).length;
            const disabled = total - enabled;
            console.log(`Status bar update: total=${total}, enabled=${enabled}, disabled=${disabled}`);
            this.$.totalToolsCount.textContent = total.toString();
            this.$.enabledToolsCount.textContent = enabled.toString();
            this.$.disabledToolsCount.textContent = disabled.toString();
        },
        updateCategoryCounts() {
            if (!this.currentConfiguration)
                return;
            // Update count display for each category
            document.querySelectorAll('.category-checkbox').forEach((checkbox) => {
                const category = checkbox.dataset.category;
                const categoryTools = this.currentConfiguration.tools.filter((t) => t.category === category);
                const enabledCount = categoryTools.filter((t) => t.enabled).length;
                const totalCount = categoryTools.length;
                // Update count display
                const countSpan = checkbox.parentElement.querySelector('span');
                if (countSpan) {
                    countSpan.textContent = `${enabledCount}/${totalCount}`;
                }
                // Update category checkbox state
                checkbox.checked = enabledCount === totalCount;
            });
        },
        updateToolCheckboxes(category, enabled) {
            // Update all tool checkboxes for specific category
            document.querySelectorAll(`.tool-checkbox[data-category="${category}"]`).forEach((checkbox) => {
                checkbox.checked = enabled;
            });
        },
        updateButtons() {
            const hasCurrentConfig = !!this.currentConfiguration;
            this.$.editConfigBtn.disabled = !hasCurrentConfig;
            this.$.deleteConfigBtn.disabled = !hasCurrentConfig;
            this.$.exportConfigBtn.disabled = !hasCurrentConfig;
            this.$.applyConfigBtn.disabled = !hasCurrentConfig;
        },
        async createConfiguration() {
            this.editingConfig = null;
            this.$.modalTitle.textContent = 'Create Configuration';
            this.$.configName.value = '';
            this.$.configDescription.value = '';
            this.showModal('configModal');
        },
        async editConfiguration() {
            if (!this.currentConfiguration)
                return;
            this.editingConfig = this.currentConfiguration;
            this.$.modalTitle.textContent = 'Edit Configuration';
            this.$.configName.value = this.currentConfiguration.name;
            this.$.configDescription.value = this.currentConfiguration.description || '';
            this.showModal('configModal');
        },
        async saveConfiguration() {
            const name = this.$.configName.value.trim();
            const description = this.$.configDescription.value.trim();
            if (!name) {
                this.showError('Configuration name cannot be empty');
                return;
            }
            try {
                if (this.editingConfig) {
                    await Editor.Message.request('cocos-mcp-server', 'updateToolConfiguration', this.editingConfig.id, { name, description });
                }
                else {
                    await Editor.Message.request('cocos-mcp-server', 'createToolConfiguration', name, description);
                }
                this.hideModal('configModal');
                await this.loadToolManagerState();
            }
            catch (error) {
                console.error('Failed to save configuration:', error);
                this.showError('Failed to save configuration');
            }
        },
        async deleteConfiguration() {
            if (!this.currentConfiguration)
                return;
            const confirmed = await Editor.Dialog.warn('Confirm Delete', {
                detail: `Are you sure you want to delete configuration "${this.currentConfiguration.name}"? This action cannot be undone.`
            });
            if (confirmed) {
                try {
                    await Editor.Message.request('cocos-mcp-server', 'deleteToolConfiguration', this.currentConfiguration.id);
                    await this.loadToolManagerState();
                }
                catch (error) {
                    console.error('Failed to delete configuration:', error);
                    this.showError('Failed to delete configuration');
                }
            }
        },
        async applyConfiguration() {
            const configId = this.$.configSelector.value;
            if (!configId)
                return;
            try {
                await Editor.Message.request('cocos-mcp-server', 'setCurrentToolConfiguration', configId);
                await this.loadToolManagerState();
            }
            catch (error) {
                console.error('Failed to apply configuration:', error);
                this.showError('Failed to apply configuration');
            }
        },
        async exportConfiguration() {
            if (!this.currentConfiguration)
                return;
            try {
                const result = await Editor.Message.request('cocos-mcp-server', 'exportToolConfiguration', this.currentConfiguration.id);
                Editor.Clipboard.write('text', result.configJson);
                Editor.Dialog.info('Export Successful', { detail: 'Configuration copied to clipboard' });
            }
            catch (error) {
                console.error('Failed to export configuration:', error);
                this.showError('Failed to export configuration');
            }
        },
        async importConfiguration() {
            this.$.importConfigJson.value = '';
            this.showModal('importModal');
        },
        async confirmImport() {
            const configJson = this.$.importConfigJson.value.trim();
            if (!configJson) {
                this.showError('Please enter configuration JSON');
                return;
            }
            try {
                await Editor.Message.request('cocos-mcp-server', 'importToolConfiguration', configJson);
                this.hideModal('importModal');
                await this.loadToolManagerState();
                Editor.Dialog.info('Import Successful', { detail: 'Configuration imported successfully' });
            }
            catch (error) {
                console.error('Failed to import configuration:', error);
                this.showError('Failed to import configuration');
            }
        },
        async selectAllTools() {
            if (!this.currentConfiguration)
                return;
            console.log('Selecting all tools');
            const updates = this.currentConfiguration.tools.map((tool) => ({
                category: tool.category,
                name: tool.name,
                enabled: true
            }));
            try {
                // First update local state
                this.currentConfiguration.tools.forEach((tool) => {
                    tool.enabled = true;
                });
                console.log('Updated local state: all tools enabled');
                // Immediately update UI
                this.updateStatusBar();
                this.updateToolsDisplay();
                // Then send to backend
                await Editor.Message.request('cocos-mcp-server', 'updateToolStatusBatch', this.currentConfiguration.id, updates);
            }
            catch (error) {
                console.error('Failed to select all tools:', error);
                this.showError('Failed to select all tools');
                // If backend update fails, rollback local state
                this.currentConfiguration.tools.forEach((tool) => {
                    tool.enabled = false;
                });
                this.updateStatusBar();
                this.updateToolsDisplay();
            }
        },
        async deselectAllTools() {
            if (!this.currentConfiguration)
                return;
            console.log('Deselecting all tools');
            const updates = this.currentConfiguration.tools.map((tool) => ({
                category: tool.category,
                name: tool.name,
                enabled: false
            }));
            try {
                // First update local state
                this.currentConfiguration.tools.forEach((tool) => {
                    tool.enabled = false;
                });
                console.log('Updated local state: all tools disabled');
                // Immediately update UI
                this.updateStatusBar();
                this.updateToolsDisplay();
                // Then send to backend
                await Editor.Message.request('cocos-mcp-server', 'updateToolStatusBatch', this.currentConfiguration.id, updates);
            }
            catch (error) {
                console.error('Failed to deselect all tools:', error);
                this.showError('Failed to deselect all tools');
                // If backend update fails, rollback local state
                this.currentConfiguration.tools.forEach((tool) => {
                    tool.enabled = true;
                });
                this.updateStatusBar();
                this.updateToolsDisplay();
            }
        },
        getCategoryDisplayName(category) {
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
        },
        showModal(modalId) {
            this.$[modalId].style.display = 'block';
        },
        hideModal(modalId) {
            this.$[modalId].style.display = 'none';
        },
        showError(message) {
            Editor.Dialog.error('Error', { detail: message });
        },
        async saveChanges() {
            if (!this.currentConfiguration) {
                this.showError('No configuration selected');
                return;
            }
            try {
                // Ensure current configuration is saved to backend
                await Editor.Message.request('cocos-mcp-server', 'updateToolConfiguration', this.currentConfiguration.id, {
                    name: this.currentConfiguration.name,
                    description: this.currentConfiguration.description,
                    tools: this.currentConfiguration.tools
                });
                Editor.Dialog.info('Save Successful', { detail: 'Configuration changes have been saved' });
            }
            catch (error) {
                console.error('Failed to save changes:', error);
                this.showError('Failed to save changes');
            }
        },
        bindEvents() {
            this.$.createConfigBtn.addEventListener('click', this.createConfiguration.bind(this));
            this.$.editConfigBtn.addEventListener('click', this.editConfiguration.bind(this));
            this.$.deleteConfigBtn.addEventListener('click', this.deleteConfiguration.bind(this));
            this.$.applyConfigBtn.addEventListener('click', this.applyConfiguration.bind(this));
            this.$.exportConfigBtn.addEventListener('click', this.exportConfiguration.bind(this));
            this.$.importConfigBtn.addEventListener('click', this.importConfiguration.bind(this));
            this.$.selectAllBtn.addEventListener('click', this.selectAllTools.bind(this));
            this.$.deselectAllBtn.addEventListener('click', this.deselectAllTools.bind(this));
            this.$.saveChangesBtn.addEventListener('click', this.saveChanges.bind(this));
            this.$.closeModal.addEventListener('click', () => this.hideModal('configModal'));
            this.$.cancelConfigBtn.addEventListener('click', () => this.hideModal('configModal'));
            this.$.configForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveConfiguration();
            });
            this.$.closeImportModal.addEventListener('click', () => this.hideModal('importModal'));
            this.$.cancelImportBtn.addEventListener('click', () => this.hideModal('importModal'));
            this.$.confirmImportBtn.addEventListener('click', this.confirmImport.bind(this));
            this.$.configSelector.addEventListener('change', this.applyConfiguration.bind(this));
        }
    },
    ready() {
        this.toolManagerState = null;
        this.currentConfiguration = null;
        this.configurations = [];
        this.availableTools = [];
        this.editingConfig = null;
        this.bindEvents();
        this.loadToolManagerState();
    },
    beforeClose() {
        // Cleanup work
    },
    close() {
        // Panel close cleanup
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL3Rvb2wtbWFuYWdlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUF3QztBQUN4QywrQkFBNEI7QUFFNUIsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNqQyxTQUFTLEVBQUU7UUFDUCxJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRCxJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN2RDtJQUNELFFBQVEsRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLG9EQUFvRCxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQ3RHLEtBQUssRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHlDQUF5QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQ3hGLENBQUMsRUFBRTtRQUNDLFVBQVUsRUFBRSxhQUFhO1FBQ3pCLGVBQWUsRUFBRSxrQkFBa0I7UUFDbkMsZUFBZSxFQUFFLGtCQUFrQjtRQUNuQyxlQUFlLEVBQUUsa0JBQWtCO1FBQ25DLGNBQWMsRUFBRSxpQkFBaUI7UUFDakMsY0FBYyxFQUFFLGlCQUFpQjtRQUNqQyxhQUFhLEVBQUUsZ0JBQWdCO1FBQy9CLGVBQWUsRUFBRSxrQkFBa0I7UUFDbkMsY0FBYyxFQUFFLGlCQUFpQjtRQUNqQyxZQUFZLEVBQUUsZUFBZTtRQUM3QixjQUFjLEVBQUUsaUJBQWlCO1FBQ2pDLGNBQWMsRUFBRSxpQkFBaUI7UUFDakMsZUFBZSxFQUFFLGtCQUFrQjtRQUNuQyxpQkFBaUIsRUFBRSxvQkFBb0I7UUFDdkMsa0JBQWtCLEVBQUUscUJBQXFCO1FBQ3pDLFdBQVcsRUFB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SUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUN0RixJQUFJLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBRWpGLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDekYsQ0FBQztLQUNKO0lBQ0QsS0FBSztRQUNBLElBQVksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDckMsSUFBWSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQztRQUN6QyxJQUFZLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUNqQyxJQUFZLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUNqQyxJQUFZLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUVsQyxJQUFZLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDMUIsSUFBWSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDekMsQ0FBQztJQUNELFdBQVc7UUFDUCxlQUFlO0lBQ25CLENBQUM7SUFDRCxLQUFLO1FBQ0Qsc0JBQXNCO0lBQzFCLENBQUM7Q0FDRyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yLlBhbmVsLmRlZmluZSh7XHJcbiAgICBsaXN0ZW5lcnM6IHtcclxuICAgICAgICBzaG93KCkgeyBjb25zb2xlLmxvZygnVG9vbCBNYW5hZ2VyIHBhbmVsIHNob3duJyk7IH0sXHJcbiAgICAgICAgaGlkZSgpIHsgY29uc29sZS5sb2coJ1Rvb2wgTWFuYWdlciBwYW5lbCBoaWRkZW4nKTsgfVxyXG4gICAgfSxcclxuICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvZGVmYXVsdC90b29sLW1hbmFnZXIuaHRtbCcpLCAndXRmLTgnKSxcclxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXHJcbiAgICAkOiB7XHJcbiAgICAgICAgcGFuZWxUaXRsZTogJyNwYW5lbFRpdGxlJyxcclxuICAgICAgICBjcmVhdGVDb25maWdCdG46ICcjY3JlYXRlQ29uZmlnQnRuJyxcclxuICAgICAgICBpbXBvcnRDb25maWdCdG46ICcjaW1wb3J0Q29uZmlnQnRuJyxcclxuICAgICAgICBleHBvcnRDb25maWdCdG46ICcjZXhwb3J0Q29uZmlnQnRuJyxcclxuICAgICAgICBjb25maWdTZWxlY3RvcjogJyNjb25maWdTZWxlY3RvcicsXHJcbiAgICAgICAgYXBwbHlDb25maWdCdG46ICcjYXBwbHlDb25maWdCdG4nLFxyXG4gICAgICAgIGVkaXRDb25maWdCdG46ICcjZWRpdENvbmZpZ0J0bicsXHJcbiAgICAgICAgZGVsZXRlQ29uZmlnQnRuOiAnI2RlbGV0ZUNvbmZpZ0J0bicsXHJcbiAgICAgICAgdG9vbHNDb250YWluZXI6ICcjdG9vbHNDb250YWluZXInLFxyXG4gICAgICAgIHNlbGVjdEFsbEJ0bjogJyNzZWxlY3RBbGxCdG4nLFxyXG4gICAgICAgIGRlc2VsZWN0QWxsQnRuOiAnI2Rlc2VsZWN0QWxsQnRuJyxcclxuICAgICAgICBzYXZlQ2hhbmdlc0J0bjogJyNzYXZlQ2hhbmdlc0J0bicsXHJcbiAgICAgICAgdG90YWxUb29sc0NvdW50OiAnI3RvdGFsVG9vbHNDb3VudCcsXHJcbiAgICAgICAgZW5hYmxlZFRvb2xzQ291bnQ6ICcjZW5hYmxlZFRvb2xzQ291bnQnLFxyXG4gICAgICAgIGRpc2FibGVkVG9vbHNDb3VudDogJyNkaXNhYmxlZFRvb2xzQ291bnQnLFxyXG4gICAgICAgIGNvbmZpZ01vZGFsOiAnI2NvbmZpZ01vZGFsJyxcclxuICAgICAgICBtb2RhbFRpdGxlOiAnI21vZGFsVGl0bGUnLFxyXG4gICAgICAgIGNvbmZpZ0Zvcm06ICcjY29uZmlnRm9ybScsXHJcbiAgICAgICAgY29uZmlnTmFtZTogJyNjb25maWdOYW1lJyxcclxuICAgICAgICBjb25maWdEZXNjcmlwdGlvbjogJyNjb25maWdEZXNjcmlwdGlvbicsXHJcbiAgICAgICAgY2xvc2VNb2RhbDogJyNjbG9zZU1vZGFsJyxcclxuICAgICAgICBjYW5jZWxDb25maWdCdG46ICcjY2FuY2VsQ29uZmlnQnRuJyxcclxuICAgICAgICBzYXZlQ29uZmlnQnRuOiAnI3NhdmVDb25maWdCdG4nLFxyXG4gICAgICAgIGltcG9ydE1vZGFsOiAnI2ltcG9ydE1vZGFsJyxcclxuICAgICAgICBpbXBvcnRDb25maWdKc29uOiAnI2ltcG9ydENvbmZpZ0pzb24nLFxyXG4gICAgICAgIGNsb3NlSW1wb3J0TW9kYWw6ICcjY2xvc2VJbXBvcnRNb2RhbCcsXHJcbiAgICAgICAgY2FuY2VsSW1wb3J0QnRuOiAnI2NhbmNlbEltcG9ydEJ0bicsXHJcbiAgICAgICAgY29uZmlybUltcG9ydEJ0bjogJyNjb25maXJtSW1wb3J0QnRuJ1xyXG4gICAgfSxcclxuICAgIG1ldGhvZHM6IHtcclxuICAgICAgICBhc3luYyBsb2FkVG9vbE1hbmFnZXJTdGF0ZSh0aGlzOiBhbnkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHRoaXMudG9vbE1hbmFnZXJTdGF0ZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnZ2V0VG9vbE1hbmFnZXJTdGF0ZScpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbiA9IHRoaXMudG9vbE1hbmFnZXJTdGF0ZS5jdXJyZW50Q29uZmlndXJhdGlvbjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbnMgPSB0aGlzLnRvb2xNYW5hZ2VyU3RhdGUuY29uZmlndXJhdGlvbnM7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF2YWlsYWJsZVRvb2xzID0gdGhpcy50b29sTWFuYWdlclN0YXRlLmF2YWlsYWJsZVRvb2xzO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVVSSgpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgdG9vbCBtYW5hZ2VyIHN0YXRlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0Vycm9yKCdGYWlsZWQgdG8gbG9hZCB0b29sIG1hbmFnZXIgc3RhdGUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVwZGF0ZVVJKHRoaXM6IGFueSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNvbmZpZ1NlbGVjdG9yKCk7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG9vbHNEaXNwbGF5KCk7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQnV0dG9ucygpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVwZGF0ZUNvbmZpZ1NlbGVjdG9yKHRoaXM6IGFueSkge1xyXG4gICAgICAgICAgICBjb25zdCBzZWxlY3RvciA9IHRoaXMuJC5jb25maWdTZWxlY3RvcjtcclxuICAgICAgICAgICAgc2VsZWN0b3IuaW5uZXJIVE1MID0gJzxvcHRpb24gdmFsdWU9XCJcIj5TZWxlY3QgY29uZmlndXJhdGlvbi4uLjwvb3B0aW9uPic7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb25zLmZvckVhY2goKGNvbmZpZzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgICAgICAgICAgICAgIG9wdGlvbi52YWx1ZSA9IGNvbmZpZy5pZDtcclxuICAgICAgICAgICAgICAgIG9wdGlvbi50ZXh0Q29udGVudCA9IGNvbmZpZy5uYW1lO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudENvbmZpZ3VyYXRpb24gJiYgY29uZmlnLmlkID09PSB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLmlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uLnNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHNlbGVjdG9yLmFwcGVuZENoaWxkKG9wdGlvbik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVwZGF0ZVRvb2xzRGlzcGxheSh0aGlzOiBhbnkpIHtcclxuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gdGhpcy4kLnRvb2xzQ29udGFpbmVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gYFxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJlbXB0eS1zdGF0ZVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8aDM+Tm8gY29uZmlndXJhdGlvbiBzZWxlY3RlZDwvaDM+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPlBsZWFzZSBzZWxlY3QgYSBjb25maWd1cmF0aW9uIG9yIGNyZWF0ZSBhIG5ldyBvbmUgZmlyc3Q8L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICBgO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCB0b29sc0J5Q2F0ZWdvcnk6IGFueSA9IHt9O1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLnRvb2xzLmZvckVhY2goKHRvb2w6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0b29sc0J5Q2F0ZWdvcnlbdG9vbC5jYXRlZ29yeV0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0b29sc0J5Q2F0ZWdvcnlbdG9vbC5jYXRlZ29yeV0gPSBbXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRvb2xzQnlDYXRlZ29yeVt0b29sLmNhdGVnb3J5XS5wdXNoKHRvb2wpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcclxuXHJcbiAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKHRvb2xzQnlDYXRlZ29yeSkuZm9yRWFjaCgoW2NhdGVnb3J5LCB0b29sc106IFtzdHJpbmcsIGFueV0pID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5RGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeURpdi5jbGFzc05hbWUgPSAndG9vbC1jYXRlZ29yeSc7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZENvdW50ID0gdG9vbHMuZmlsdGVyKCh0OiBhbnkpID0+IHQuZW5hYmxlZCkubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG90YWxDb3VudCA9IHRvb2xzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeURpdi5pbm5lckhUTUwgPSBgXHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNhdGVnb3J5LWhlYWRlclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2F0ZWdvcnktbmFtZVwiPiR7dGhpcy5nZXRDYXRlZ29yeURpc3BsYXlOYW1lKGNhdGVnb3J5KX08L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNhdGVnb3J5LXRvZ2dsZVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+JHtlbmFibGVkQ291bnR9LyR7dG90YWxDb3VudH08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJjaGVja2JveCBjYXRlZ29yeS1jaGVja2JveFwiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZW5hYmxlZENvdW50ID09PSB0b3RhbENvdW50ID8gJ2NoZWNrZWQnIDogJyd9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidG9vbC1saXN0XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR7dG9vbHMubWFwKCh0b29sOiBhbnkpID0+IGBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0b29sLWl0ZW1cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidG9vbC1pbmZvXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0b29sLW5hbWVcIj4ke3Rvb2wubmFtZX08L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInRvb2wtZGVzY3JpcHRpb25cIj4ke3Rvb2wuZGVzY3JpcHRpb259PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInRvb2wtdG9nZ2xlXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImNoZWNrYm94IHRvb2wtY2hlY2tib3hcIiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY2F0ZWdvcnk9XCIke3Rvb2wuY2F0ZWdvcnl9XCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLW5hbWU9XCIke3Rvb2wubmFtZX1cIiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7dG9vbC5lbmFibGVkID8gJ2NoZWNrZWQnIDogJyd9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGApLmpvaW4oJycpfVxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgYDtcclxuXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2F0ZWdvcnlEaXYpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYmluZFRvb2xFdmVudHMoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBiaW5kVG9vbEV2ZW50cyh0aGlzOiBhbnkpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmNhdGVnb3J5LWNoZWNrYm94JykuZm9yRWFjaCgoY2hlY2tib3g6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKGU6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gZS50YXJnZXQuZGF0YXNldC5jYXRlZ29yeTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGVja2VkID0gZS50YXJnZXQuY2hlY2tlZDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZUNhdGVnb3J5VG9vbHMoY2F0ZWdvcnksIGNoZWNrZWQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRvb2wtY2hlY2tib3gnKS5mb3JFYWNoKChjaGVja2JveDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjaGVja2JveC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBlLnRhcmdldC5kYXRhc2V0LmNhdGVnb3J5O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBlLnRhcmdldC5kYXRhc2V0Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZCA9IGUudGFyZ2V0LmNoZWNrZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVUb29sU3RhdHVzKGNhdGVnb3J5LCBuYW1lLCBlbmFibGVkKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBhc3luYyB0b2dnbGVDYXRlZ29yeVRvb2xzKHRoaXM6IGFueSwgY2F0ZWdvcnk6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY3VycmVudENvbmZpZ3VyYXRpb24pIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBUb2dnbGluZyBjYXRlZ29yeSB0b29sczogJHtjYXRlZ29yeX0gPSAke2VuYWJsZWR9YCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeVRvb2xzID0gdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi50b29scy5maWx0ZXIoKHRvb2w6IGFueSkgPT4gdG9vbC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgICBpZiAoY2F0ZWdvcnlUb29scy5sZW5ndGggPT09IDApIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZXMgPSBjYXRlZ29yeVRvb2xzLm1hcCgodG9vbDogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IHRvb2wuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0b29sLm5hbWUsXHJcbiAgICAgICAgICAgICAgICBlbmFibGVkOiBlbmFibGVkXHJcbiAgICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGaXJzdCB1cGRhdGUgbG9jYWwgc3RhdGVcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5VG9vbHMuZm9yRWFjaCgodG9vbDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbC5lbmFibGVkID0gZW5hYmxlZDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVwZGF0ZWQgbG9jYWwgY2F0ZWdvcnkgc3RhdGU6ICR7Y2F0ZWdvcnl9ID0gJHtlbmFibGVkfWApO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEltbWVkaWF0ZWx5IHVwZGF0ZSBVSVxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlQ2F0ZWdvcnlDb3VudHMoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVG9vbENoZWNrYm94ZXMoY2F0ZWdvcnksIGVuYWJsZWQpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFRoZW4gc2VuZCB0byBiYWNrZW5kXHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3VwZGF0ZVRvb2xTdGF0dXNCYXRjaCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi5pZCwgdXBkYXRlcyk7XHJcblxyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHRvZ2dsZSBjYXRlZ29yeSB0b29sczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dFcnJvcignRmFpbGVkIHRvIHRvZ2dsZSBjYXRlZ29yeSB0b29scycpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIElmIGJhY2tlbmQgdXBkYXRlIGZhaWxzLCByb2xsYmFjayBsb2NhbCBzdGF0ZVxyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnlUb29scy5mb3JFYWNoKCh0b29sOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0b29sLmVuYWJsZWQgPSAhZW5hYmxlZDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlQ2F0ZWdvcnlDb3VudHMoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVG9vbENoZWNrYm94ZXMoY2F0ZWdvcnksICFlbmFibGVkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGFzeW5jIHVwZGF0ZVRvb2xTdGF0dXModGhpczogYW55LCBjYXRlZ29yeTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgdG9vbCBzdGF0dXM6ICR7Y2F0ZWdvcnl9LiR7bmFtZX0gPSAke2VuYWJsZWR9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBDdXJyZW50IGNvbmZpZyBJRDogJHt0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLmlkfWApO1xyXG5cclxuICAgICAgICAgICAgLy8g5YWI5pu05paw5pys5Zyw54q25oCBXHJcbiAgICAgICAgICAgIGNvbnN0IHRvb2wgPSB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLnRvb2xzLmZpbmQoKHQ6IGFueSkgPT5cclxuICAgICAgICAgICAgICAgIHQuY2F0ZWdvcnkgPT09IGNhdGVnb3J5ICYmIHQubmFtZSA9PT0gbmFtZSk7XHJcbiAgICAgICAgICAgIGlmICghdG9vbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgVG9vbCBub3QgZm91bmQ6ICR7Y2F0ZWdvcnl9LiR7bmFtZX1gKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHRvb2wuZW5hYmxlZCA9IGVuYWJsZWQ7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVXBkYXRlZCBsb2NhbCB0b29sIHN0YXRlOiAke3Rvb2wubmFtZX0gPSAke3Rvb2wuZW5hYmxlZH1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBJbW1lZGlhdGVseSB1cGRhdGUgVUkgKG9ubHkgdXBkYXRlIHN0YXRpc3RpY3MsIGRvbid0IHJlLXJlbmRlciB0b29sIGxpc3QpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVDYXRlZ29yeUNvdW50cygpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFRoZW4gc2VuZCB0byBiYWNrZW5kXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU2VuZGluZyB0byBiYWNrZW5kOiBjb25maWdJZD0ke3RoaXMuY3VycmVudENvbmZpZ3VyYXRpb24uaWR9LCBjYXRlZ29yeT0ke2NhdGVnb3J5fSwgbmFtZT0ke25hbWV9LCBlbmFibGVkPSR7ZW5hYmxlZH1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAndXBkYXRlVG9vbFN0YXR1cycsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi5pZCwgY2F0ZWdvcnksIG5hbWUsIGVuYWJsZWQpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0JhY2tlbmQgcmVzcG9uc2U6JywgcmVzdWx0KTtcclxuXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gdXBkYXRlIHRvb2wgc3RhdHVzOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0Vycm9yKCdGYWlsZWQgdG8gdXBkYXRlIHRvb2wgc3RhdHVzJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gSWYgYmFja2VuZCB1cGRhdGUgZmFpbHMsIHJvbGxiYWNrIGxvY2FsIHN0YXRlXHJcbiAgICAgICAgICAgICAgICB0b29sLmVuYWJsZWQgPSAhZW5hYmxlZDtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUNhdGVnb3J5Q291bnRzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICB1cGRhdGVTdGF0dXNCYXIodGhpczogYW55KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kLnRvdGFsVG9vbHNDb3VudC50ZXh0Q29udGVudCA9ICcwJztcclxuICAgICAgICAgICAgICAgIHRoaXMuJC5lbmFibGVkVG9vbHNDb3VudC50ZXh0Q29udGVudCA9ICcwJztcclxuICAgICAgICAgICAgICAgIHRoaXMuJC5kaXNhYmxlZFRvb2xzQ291bnQudGV4dENvbnRlbnQgPSAnMCc7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHRvdGFsID0gdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi50b29scy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGVuYWJsZWQgPSB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLnRvb2xzLmZpbHRlcigodDogYW55KSA9PiB0LmVuYWJsZWQpLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgZGlzYWJsZWQgPSB0b3RhbCAtIGVuYWJsZWQ7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgU3RhdHVzIGJhciB1cGRhdGU6IHRvdGFsPSR7dG90YWx9LCBlbmFibGVkPSR7ZW5hYmxlZH0sIGRpc2FibGVkPSR7ZGlzYWJsZWR9YCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiQudG90YWxUb29sc0NvdW50LnRleHRDb250ZW50ID0gdG90YWwudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgdGhpcy4kLmVuYWJsZWRUb29sc0NvdW50LnRleHRDb250ZW50ID0gZW5hYmxlZC50b1N0cmluZygpO1xyXG4gICAgICAgICAgICB0aGlzLiQuZGlzYWJsZWRUb29sc0NvdW50LnRleHRDb250ZW50ID0gZGlzYWJsZWQudG9TdHJpbmcoKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICB1cGRhdGVDYXRlZ29yeUNvdW50cyh0aGlzOiBhbnkpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAvLyBVcGRhdGUgY291bnQgZGlzcGxheSBmb3IgZWFjaCBjYXRlZ29yeVxyXG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuY2F0ZWdvcnktY2hlY2tib3gnKS5mb3JFYWNoKChjaGVja2JveDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IGNoZWNrYm94LmRhdGFzZXQuY2F0ZWdvcnk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeVRvb2xzID0gdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi50b29scy5maWx0ZXIoKHQ6IGFueSkgPT4gdC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZENvdW50ID0gY2F0ZWdvcnlUb29scy5maWx0ZXIoKHQ6IGFueSkgPT4gdC5lbmFibGVkKS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b3RhbENvdW50ID0gY2F0ZWdvcnlUb29scy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNvdW50IGRpc3BsYXlcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50U3BhbiA9IGNoZWNrYm94LnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3Rvcignc3BhbicpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvdW50U3Bhbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvdW50U3Bhbi50ZXh0Q29udGVudCA9IGAke2VuYWJsZWRDb3VudH0vJHt0b3RhbENvdW50fWA7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNhdGVnb3J5IGNoZWNrYm94IHN0YXRlXHJcbiAgICAgICAgICAgICAgICBjaGVja2JveC5jaGVja2VkID0gZW5hYmxlZENvdW50ID09PSB0b3RhbENvdW50O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICB1cGRhdGVUb29sQ2hlY2tib3hlcyh0aGlzOiBhbnksIGNhdGVnb3J5OiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgLy8gVXBkYXRlIGFsbCB0b29sIGNoZWNrYm94ZXMgZm9yIHNwZWNpZmljIGNhdGVnb3J5XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC50b29sLWNoZWNrYm94W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApLmZvckVhY2goKGNoZWNrYm94OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGNoZWNrYm94LmNoZWNrZWQgPSBlbmFibGVkO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICB1cGRhdGVCdXR0b25zKHRoaXM6IGFueSkge1xyXG4gICAgICAgICAgICBjb25zdCBoYXNDdXJyZW50Q29uZmlnID0gISF0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLiQuZWRpdENvbmZpZ0J0bi5kaXNhYmxlZCA9ICFoYXNDdXJyZW50Q29uZmlnO1xyXG4gICAgICAgICAgICB0aGlzLiQuZGVsZXRlQ29uZmlnQnRuLmRpc2FibGVkID0gIWhhc0N1cnJlbnRDb25maWc7XHJcbiAgICAgICAgICAgIHRoaXMuJC5leHBvcnRDb25maWdCdG4uZGlzYWJsZWQgPSAhaGFzQ3VycmVudENvbmZpZztcclxuICAgICAgICAgICAgdGhpcy4kLmFwcGx5Q29uZmlnQnRuLmRpc2FibGVkID0gIWhhc0N1cnJlbnRDb25maWc7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgYXN5bmMgY3JlYXRlQ29uZmlndXJhdGlvbih0aGlzOiBhbnkpIHtcclxuICAgICAgICAgICAgdGhpcy5lZGl0aW5nQ29uZmlnID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy4kLm1vZGFsVGl0bGUudGV4dENvbnRlbnQgPSAnQ3JlYXRlIENvbmZpZ3VyYXRpb24nO1xyXG4gICAgICAgICAgICB0aGlzLiQuY29uZmlnTmFtZS52YWx1ZSA9ICcnO1xyXG4gICAgICAgICAgICB0aGlzLiQuY29uZmlnRGVzY3JpcHRpb24udmFsdWUgPSAnJztcclxuICAgICAgICAgICAgdGhpcy5zaG93TW9kYWwoJ2NvbmZpZ01vZGFsJyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgYXN5bmMgZWRpdENvbmZpZ3VyYXRpb24odGhpczogYW55KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbikgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5lZGl0aW5nQ29uZmlnID0gdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy4kLm1vZGFsVGl0bGUudGV4dENvbnRlbnQgPSAnRWRpdCBDb25maWd1cmF0aW9uJztcclxuICAgICAgICAgICAgdGhpcy4kLmNvbmZpZ05hbWUudmFsdWUgPSB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLm5hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuJC5jb25maWdEZXNjcmlwdGlvbi52YWx1ZSA9IHRoaXMuY3VycmVudENvbmZpZ3VyYXRpb24uZGVzY3JpcHRpb24gfHwgJyc7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvd01vZGFsKCdjb25maWdNb2RhbCcpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGFzeW5jIHNhdmVDb25maWd1cmF0aW9uKHRoaXM6IGFueSkge1xyXG4gICAgICAgICAgICBjb25zdCBuYW1lID0gdGhpcy4kLmNvbmZpZ05hbWUudmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHRoaXMuJC5jb25maWdEZXNjcmlwdGlvbi52YWx1ZS50cmltKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIW5hbWUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0Vycm9yKCdDb25maWd1cmF0aW9uIG5hbWUgY2Fubm90IGJlIGVtcHR5Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5lZGl0aW5nQ29uZmlnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICd1cGRhdGVUb29sQ29uZmlndXJhdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWRpdGluZ0NvbmZpZy5pZCwgeyBuYW1lLCBkZXNjcmlwdGlvbiB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICdjcmVhdGVUb29sQ29uZmlndXJhdGlvbicsIG5hbWUsIGRlc2NyaXB0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVNb2RhbCgnY29uZmlnTW9kYWwnKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZFRvb2xNYW5hZ2VyU3RhdGUoKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzYXZlIGNvbmZpZ3VyYXRpb246JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93RXJyb3IoJ0ZhaWxlZCB0byBzYXZlIGNvbmZpZ3VyYXRpb24nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGFzeW5jIGRlbGV0ZUNvbmZpZ3VyYXRpb24odGhpczogYW55KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbikgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgY29uZmlybWVkID0gYXdhaXQgRWRpdG9yLkRpYWxvZy53YXJuKCdDb25maXJtIERlbGV0ZScsIHtcclxuICAgICAgICAgICAgICAgIGRldGFpbDogYEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgY29uZmlndXJhdGlvbiBcIiR7dGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi5uYW1lfVwiPyBUaGlzIGFjdGlvbiBjYW5ub3QgYmUgdW5kb25lLmBcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZmlybWVkKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnZGVsZXRlVG9vbENvbmZpZ3VyYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLmlkKTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRUb29sTWFuYWdlclN0YXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZWxldGUgY29uZmlndXJhdGlvbjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93RXJyb3IoJ0ZhaWxlZCB0byBkZWxldGUgY29uZmlndXJhdGlvbicpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgYXN5bmMgYXBwbHlDb25maWd1cmF0aW9uKHRoaXM6IGFueSkge1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWdJZCA9IHRoaXMuJC5jb25maWdTZWxlY3Rvci52YWx1ZTtcclxuICAgICAgICAgICAgaWYgKCFjb25maWdJZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnc2V0Q3VycmVudFRvb2xDb25maWd1cmF0aW9uJywgY29uZmlnSWQpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkVG9vbE1hbmFnZXJTdGF0ZSgpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGFwcGx5IGNvbmZpZ3VyYXRpb246JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93RXJyb3IoJ0ZhaWxlZCB0byBhcHBseSBjb25maWd1cmF0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBhc3luYyBleHBvcnRDb25maWd1cmF0aW9uKHRoaXM6IGFueSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY3VycmVudENvbmZpZ3VyYXRpb24pIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2V4cG9ydFRvb2xDb25maWd1cmF0aW9uJyxcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLmlkKTtcclxuXHJcbiAgICAgICAgICAgICAgICBFZGl0b3IuQ2xpcGJvYXJkLndyaXRlKCd0ZXh0JywgcmVzdWx0LmNvbmZpZ0pzb24pO1xyXG4gICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5pbmZvKCdFeHBvcnQgU3VjY2Vzc2Z1bCcsIHsgZGV0YWlsOiAnQ29uZmlndXJhdGlvbiBjb3BpZWQgdG8gY2xpcGJvYXJkJyB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBleHBvcnQgY29uZmlndXJhdGlvbjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dFcnJvcignRmFpbGVkIHRvIGV4cG9ydCBjb25maWd1cmF0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBhc3luYyBpbXBvcnRDb25maWd1cmF0aW9uKHRoaXM6IGFueSkge1xyXG4gICAgICAgICAgICB0aGlzLiQuaW1wb3J0Q29uZmlnSnNvbi52YWx1ZSA9ICcnO1xyXG4gICAgICAgICAgICB0aGlzLnNob3dNb2RhbCgnaW1wb3J0TW9kYWwnKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBhc3luYyBjb25maXJtSW1wb3J0KHRoaXM6IGFueSkge1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWdKc29uID0gdGhpcy4kLmltcG9ydENvbmZpZ0pzb24udmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZ0pzb24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0Vycm9yKCdQbGVhc2UgZW50ZXIgY29uZmlndXJhdGlvbiBKU09OJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2ltcG9ydFRvb2xDb25maWd1cmF0aW9uJywgY29uZmlnSnNvbik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVNb2RhbCgnaW1wb3J0TW9kYWwnKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZFRvb2xNYW5hZ2VyU3RhdGUoKTtcclxuICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuaW5mbygnSW1wb3J0IFN1Y2Nlc3NmdWwnLCB7IGRldGFpbDogJ0NvbmZpZ3VyYXRpb24gaW1wb3J0ZWQgc3VjY2Vzc2Z1bGx5JyB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbXBvcnQgY29uZmlndXJhdGlvbjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dFcnJvcignRmFpbGVkIHRvIGltcG9ydCBjb25maWd1cmF0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBhc3luYyBzZWxlY3RBbGxUb29scyh0aGlzOiBhbnkpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2VsZWN0aW5nIGFsbCB0b29scycpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlcyA9IHRoaXMuY3VycmVudENvbmZpZ3VyYXRpb24udG9vbHMubWFwKCh0b29sOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogdG9vbC5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgIG5hbWU6IHRvb2wubmFtZSxcclxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcclxuICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vIEZpcnN0IHVwZGF0ZSBsb2NhbCBzdGF0ZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi50b29scy5mb3JFYWNoKCh0b29sOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0b29sLmVuYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVXBkYXRlZCBsb2NhbCBzdGF0ZTogYWxsIHRvb2xzIGVuYWJsZWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBJbW1lZGlhdGVseSB1cGRhdGUgVUlcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVRvb2xzRGlzcGxheSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFRoZW4gc2VuZCB0byBiYWNrZW5kXHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3VwZGF0ZVRvb2xTdGF0dXNCYXRjaCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi5pZCwgdXBkYXRlcyk7XHJcblxyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHNlbGVjdCBhbGwgdG9vbHM6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93RXJyb3IoJ0ZhaWxlZCB0byBzZWxlY3QgYWxsIHRvb2xzJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gSWYgYmFja2VuZCB1cGRhdGUgZmFpbHMsIHJvbGxiYWNrIGxvY2FsIHN0YXRlXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLnRvb2xzLmZvckVhY2goKHRvb2w6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvb2wuZW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVUb29sc0Rpc3BsYXkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGFzeW5jIGRlc2VsZWN0QWxsVG9vbHModGhpczogYW55KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbikgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0Rlc2VsZWN0aW5nIGFsbCB0b29scycpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdXBkYXRlcyA9IHRoaXMuY3VycmVudENvbmZpZ3VyYXRpb24udG9vbHMubWFwKCh0b29sOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogdG9vbC5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgIG5hbWU6IHRvb2wubmFtZSxcclxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGaXJzdCB1cGRhdGUgbG9jYWwgc3RhdGVcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENvbmZpZ3VyYXRpb24udG9vbHMuZm9yRWFjaCgodG9vbDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbC5lbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVcGRhdGVkIGxvY2FsIHN0YXRlOiBhbGwgdG9vbHMgZGlzYWJsZWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBJbW1lZGlhdGVseSB1cGRhdGUgVUlcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVRvb2xzRGlzcGxheSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFRoZW4gc2VuZCB0byBiYWNrZW5kXHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3VwZGF0ZVRvb2xTdGF0dXNCYXRjaCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi5pZCwgdXBkYXRlcyk7XHJcblxyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGRlc2VsZWN0IGFsbCB0b29sczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dFcnJvcignRmFpbGVkIHRvIGRlc2VsZWN0IGFsbCB0b29scycpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIElmIGJhY2tlbmQgdXBkYXRlIGZhaWxzLCByb2xsYmFjayBsb2NhbCBzdGF0ZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi50b29scy5mb3JFYWNoKCh0b29sOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0b29sLmVuYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVUb29sc0Rpc3BsYXkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldENhdGVnb3J5RGlzcGxheU5hbWUodGhpczogYW55LCBjYXRlZ29yeTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlOYW1lczogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgJ3NjZW5lJzogJ1NjZW5lIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICdub2RlJzogJ05vZGUgVG9vbHMnLFxyXG4gICAgICAgICAgICAgICAgJ2NvbXBvbmVudCc6ICdDb21wb25lbnQgVG9vbHMnLFxyXG4gICAgICAgICAgICAgICAgJ3ByZWZhYic6ICdQcmVmYWIgVG9vbHMnLFxyXG4gICAgICAgICAgICAgICAgJ3Byb2plY3QnOiAnUHJvamVjdCBUb29scycsXHJcbiAgICAgICAgICAgICAgICAnZGVidWcnOiAnRGVidWcgVG9vbHMnLFxyXG4gICAgICAgICAgICAgICAgJ3ByZWZlcmVuY2VzJzogJ1ByZWZlcmVuY2VzIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICdzZXJ2ZXInOiAnU2VydmVyIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICdicm9hZGNhc3QnOiAnQnJvYWRjYXN0IFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICdzY2VuZUFkdmFuY2VkJzogJ0FkdmFuY2VkIFNjZW5lIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICdzY2VuZVZpZXcnOiAnU2NlbmUgVmlldyBUb29scycsXHJcbiAgICAgICAgICAgICAgICAncmVmZXJlbmNlSW1hZ2UnOiAnUmVmZXJlbmNlIEltYWdlIFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICdhc3NldEFkdmFuY2VkJzogJ0FkdmFuY2VkIEFzc2V0IFRvb2xzJyxcclxuICAgICAgICAgICAgICAgICd2YWxpZGF0aW9uJzogJ1ZhbGlkYXRpb24gVG9vbHMnXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBjYXRlZ29yeU5hbWVzW2NhdGVnb3J5XSB8fCBjYXRlZ29yeTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzaG93TW9kYWwodGhpczogYW55LCBtb2RhbElkOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy4kW21vZGFsSWRdLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGhpZGVNb2RhbCh0aGlzOiBhbnksIG1vZGFsSWQ6IHN0cmluZykge1xyXG4gICAgICAgICAgICB0aGlzLiRbbW9kYWxJZF0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzaG93RXJyb3IodGhpczogYW55LCBtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5lcnJvcignRXJyb3InLCB7IGRldGFpbDogbWVzc2FnZSB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBhc3luYyBzYXZlQ2hhbmdlcyh0aGlzOiBhbnkpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dFcnJvcignTm8gY29uZmlndXJhdGlvbiBzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGN1cnJlbnQgY29uZmlndXJhdGlvbiBpcyBzYXZlZCB0byBiYWNrZW5kXHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3VwZGF0ZVRvb2xDb25maWd1cmF0aW9uJyxcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLmlkLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdGhpcy5jdXJyZW50Q29uZmlndXJhdGlvbi5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLmRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xzOiB0aGlzLmN1cnJlbnRDb25maWd1cmF0aW9uLnRvb2xzXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmluZm8oJ1NhdmUgU3VjY2Vzc2Z1bCcsIHsgZGV0YWlsOiAnQ29uZmlndXJhdGlvbiBjaGFuZ2VzIGhhdmUgYmVlbiBzYXZlZCcgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSBjaGFuZ2VzOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0Vycm9yKCdGYWlsZWQgdG8gc2F2ZSBjaGFuZ2VzJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBiaW5kRXZlbnRzKHRoaXM6IGFueSkge1xyXG4gICAgICAgICAgICB0aGlzLiQuY3JlYXRlQ29uZmlnQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5jcmVhdGVDb25maWd1cmF0aW9uLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLiQuZWRpdENvbmZpZ0J0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuZWRpdENvbmZpZ3VyYXRpb24uYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJC5kZWxldGVDb25maWdCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmRlbGV0ZUNvbmZpZ3VyYXRpb24uYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJC5hcHBseUNvbmZpZ0J0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuYXBwbHlDb25maWd1cmF0aW9uLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLiQuZXhwb3J0Q29uZmlnQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5leHBvcnRDb25maWd1cmF0aW9uLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLiQuaW1wb3J0Q29uZmlnQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5pbXBvcnRDb25maWd1cmF0aW9uLmJpbmQodGhpcykpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kLnNlbGVjdEFsbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuc2VsZWN0QWxsVG9vbHMuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJC5kZXNlbGVjdEFsbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuZGVzZWxlY3RBbGxUb29scy5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy4kLnNhdmVDaGFuZ2VzQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5zYXZlQ2hhbmdlcy5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJC5jbG9zZU1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5oaWRlTW9kYWwoJ2NvbmZpZ01vZGFsJykpO1xyXG4gICAgICAgICAgICB0aGlzLiQuY2FuY2VsQ29uZmlnQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5oaWRlTW9kYWwoJ2NvbmZpZ01vZGFsJykpO1xyXG4gICAgICAgICAgICB0aGlzLiQuY29uZmlnRm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCAoZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVDb25maWd1cmF0aW9uKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kLmNsb3NlSW1wb3J0TW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmhpZGVNb2RhbCgnaW1wb3J0TW9kYWwnKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJC5jYW5jZWxJbXBvcnRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLmhpZGVNb2RhbCgnaW1wb3J0TW9kYWwnKSk7XHJcbiAgICAgICAgICAgIHRoaXMuJC5jb25maXJtSW1wb3J0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5jb25maXJtSW1wb3J0LmJpbmQodGhpcykpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kLmNvbmZpZ1NlbGVjdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMuYXBwbHlDb25maWd1cmF0aW9uLmJpbmQodGhpcykpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICByZWFkeSgpIHtcclxuICAgICAgICAodGhpcyBhcyBhbnkpLnRvb2xNYW5hZ2VyU3RhdGUgPSBudWxsO1xyXG4gICAgICAgICh0aGlzIGFzIGFueSkuY3VycmVudENvbmZpZ3VyYXRpb24gPSBudWxsO1xyXG4gICAgICAgICh0aGlzIGFzIGFueSkuY29uZmlndXJhdGlvbnMgPSBbXTtcclxuICAgICAgICAodGhpcyBhcyBhbnkpLmF2YWlsYWJsZVRvb2xzID0gW107XHJcbiAgICAgICAgKHRoaXMgYXMgYW55KS5lZGl0aW5nQ29uZmlnID0gbnVsbDtcclxuXHJcbiAgICAgICAgKHRoaXMgYXMgYW55KS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgKHRoaXMgYXMgYW55KS5sb2FkVG9vbE1hbmFnZXJTdGF0ZSgpO1xyXG4gICAgfSxcclxuICAgIGJlZm9yZUNsb3NlKCkge1xyXG4gICAgICAgIC8vIENsZWFudXAgd29ya1xyXG4gICAgfSxcclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIC8vIFBhbmVsIGNsb3NlIGNsZWFudXBcclxuICAgIH1cclxufSBhcyBhbnkpOyAiXX0=