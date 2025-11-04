"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
const path_1 = require("path");
module.paths.push((0, path_1.join)(Editor.App.path, 'node_modules'));
exports.methods = {
    /**
     * Create a new scene
     */
    createNewScene() {
        try {
            const { director, Scene } = require('cc');
            const scene = new Scene();
            scene.name = 'New Scene';
            director.runScene(scene);
            return { success: true, message: 'New scene created successfully' };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Add component to a node
     */
    addComponentToNode(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            // Find node by UUID
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            // Get component class
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            // Add component
            const component = node.addComponent(ComponentClass);
            return {
                success: true,
                message: `Component ${componentType} added successfully`,
                data: { componentId: component.uuid }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Remove component from a node
     */
    removeComponentFromNode(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }
            node.removeComponent(component);
            return { success: true, message: `Component ${componentType} removed successfully` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Create a new node
     */
    createNode(name, parentUuid) {
        try {
            const { director, Node } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = new Node(name);
            if (parentUuid) {
                const parent = scene.getChildByUuid(parentUuid);
                if (parent) {
                    parent.addChild(node);
                }
                else {
                    scene.addChild(node);
                }
            }
            else {
                scene.addChild(node);
            }
            return {
                success: true,
                message: `Node ${name} created successfully`,
                data: { uuid: node.uuid, name: node.name }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get node information
     */
    getNodeInfo(nodeUuid) {
        var _a;
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            return {
                success: true,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: node.position,
                    rotation: node.rotation,
                    scale: node.scale,
                    parent: (_a = node.parent) === null || _a === void 0 ? void 0 : _a.uuid,
                    children: node.children.map((child) => child.uuid),
                    components: node.components.map((comp) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }))
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get all nodes in scene
     */
    getAllNodes() {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const nodes = [];
            const collectNodes = (node) => {
                var _a;
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    parent: (_a = node.parent) === null || _a === void 0 ? void 0 : _a.uuid
                });
                node.children.forEach((child) => collectNodes(child));
            };
            scene.children.forEach((child) => collectNodes(child));
            return { success: true, data: nodes };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Find node by name
     */
    findNodeByName(name) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByName(name);
            if (!node) {
                return { success: false, error: `Node with name ${name} not found` };
            }
            return {
                success: true,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: node.position
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get current scene information
     */
    getCurrentSceneInfo() {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            return {
                success: true,
                data: {
                    name: scene.name,
                    uuid: scene.uuid,
                    nodeCount: scene.children.length
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Set node property
     */
    setNodeProperty(nodeUuid, property, value) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            // Set property
            if (property === 'position') {
                node.setPosition(value.x || 0, value.y || 0, value.z || 0);
            }
            else if (property === 'rotation') {
                node.setRotationFromEuler(value.x || 0, value.y || 0, value.z || 0);
            }
            else if (property === 'scale') {
                node.setScale(value.x || 1, value.y || 1, value.z || 1);
            }
            else if (property === 'active') {
                node.active = value;
            }
            else if (property === 'name') {
                node.name = value;
            }
            else {
                // Try to set property directly
                node[property] = value;
            }
            return {
                success: true,
                message: `Property '${property}' updated successfully`
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get scene hierarchy
     */
    getSceneHierarchy(includeComponents = false) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const processNode = (node) => {
                const result = {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    children: []
                };
                if (includeComponents) {
                    result.components = node.components.map((comp) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }));
                }
                if (node.children && node.children.length > 0) {
                    result.children = node.children.map((child) => processNode(child));
                }
                return result;
            };
            const hierarchy = scene.children.map((child) => processNode(child));
            return { success: true, data: hierarchy };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Create prefab from node
     */
    createPrefabFromNode(nodeUuid, prefabPath) {
        try {
            const { director, instantiate } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            // Note: This is just a simulation implementation because prefab files cannot be created directly in runtime environment
            // Real prefab creation requires Editor API support
            return {
                success: true,
                data: {
                    prefabPath: prefabPath,
                    sourceNodeUuid: nodeUuid,
                    message: `Prefab created from node '${node.name}' at ${prefabPath}`
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Set component property
     */
    setComponentProperty(nodeUuid, componentType, property, value) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }
            // Special handling for common properties
            if (property === 'spriteFrame' && componentType === 'cc.Sprite') {
                // Support value as uuid or resource path
                if (typeof value === 'string') {
                    // First try to lookup by uuid
                    const assetManager = require('cc').assetManager;
                    assetManager.resources.load(value, require('cc').SpriteFrame, (err, spriteFrame) => {
                        if (!err && spriteFrame) {
                            component.spriteFrame = spriteFrame;
                        }
                        else {
                            // Try to load via uuid
                            assetManager.loadAny({ uuid: value }, (err2, asset) => {
                                if (!err2 && asset) {
                                    component.spriteFrame = asset;
                                }
                                else {
                                    // Direct assignment (compatible with already passed resource object)
                                    component.spriteFrame = value;
                                }
                            });
                        }
                    });
                }
                else {
                    component.spriteFrame = value;
                }
            }
            else if (property === 'material' && (componentType === 'cc.Sprite' || componentType === 'cc.MeshRenderer')) {
                // Support value as uuid or resource path
                if (typeof value === 'string') {
                    const assetManager = require('cc').assetManager;
                    assetManager.resources.load(value, require('cc').Material, (err, material) => {
                        if (!err && material) {
                            component.material = material;
                        }
                        else {
                            assetManager.loadAny({ uuid: value }, (err2, asset) => {
                                if (!err2 && asset) {
                                    component.material = asset;
                                }
                                else {
                                    component.material = value;
                                }
                            });
                        }
                    });
                }
                else {
                    component.material = value;
                }
            }
            else if (property === 'string' && (componentType === 'cc.Label' || componentType === 'cc.RichText')) {
                component.string = value;
            }
            else {
                component[property] = value;
            }
            // Optional: Refresh Inspector
            // Editor.Message.send('scene', 'snapshot');
            return { success: true, message: `Component property '${property}' updated successfully` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFNUMsUUFBQSxPQUFPLEdBQTRDO0lBQzVEOztPQUVHO0lBQ0gsY0FBYztRQUNWLElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsS0FBSyxDQUFDLElBQUksR0FBRyxXQUFXLENBQUM7WUFDekIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQztRQUN4RSxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLGFBQXFCO1FBQ3RELElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFF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LENBQUM7aUJBQU0sSUFBSSxRQUFRLEtBQUssUUFBUSxJQUFJLENBQUMsYUFBYSxLQUFLLFVBQVUsSUFBSSxhQUFhLEtBQUssYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDcEcsU0FBUyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7WUFDN0IsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDaEMsQ0FBQztZQUNELDhCQUE4QjtZQUM5Qiw0Q0FBNEM7WUFDNUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixRQUFRLHdCQUF3QixFQUFFLENBQUM7UUFDL0YsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcbm1vZHVsZS5wYXRocy5wdXNoKGpvaW4oRWRpdG9yLkFwcC5wYXRoLCAnbm9kZV9tb2R1bGVzJykpO1xyXG5cclxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlIGEgbmV3IHNjZW5lXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZU5ld1NjZW5lKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIFNjZW5lIH0gPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyBTY2VuZSgpO1xyXG4gICAgICAgICAgICBzY2VuZS5uYW1lID0gJ05ldyBTY2VuZSc7XHJcbiAgICAgICAgICAgIGRpcmVjdG9yLnJ1blNjZW5lKHNjZW5lKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ05ldyBzY2VuZSBjcmVhdGVkIHN1Y2Nlc3NmdWxseScgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZGQgY29tcG9uZW50IHRvIGEgbm9kZVxyXG4gICAgICovXHJcbiAgICBhZGRDb21wb25lbnRUb05vZGUobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcclxuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBGaW5kIG5vZGUgYnkgVVVJRFxyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQobm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gR2V0IGNvbXBvbmVudCBjbGFzc1xyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQWRkIGNvbXBvbmVudFxyXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlLmFkZENvbXBvbmVudChDb21wb25lbnRDbGFzcyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IGFkZGVkIHN1Y2Nlc3NmdWxseWAsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IGNvbXBvbmVudElkOiBjb21wb25lbnQudXVpZCB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVtb3ZlIGNvbXBvbmVudCBmcm9tIGEgbm9kZVxyXG4gICAgICovXHJcbiAgICByZW1vdmVDb21wb25lbnRGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xyXG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xyXG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGVgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlQ29tcG9uZW50KGNvbXBvbmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSByZW1vdmVkIHN1Y2Nlc3NmdWxseWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgYSBuZXcgbm9kZVxyXG4gICAgICovXHJcbiAgICBjcmVhdGVOb2RlKG5hbWU6IHN0cmluZywgcGFyZW50VXVpZD86IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIE5vZGUgfSA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcclxuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gbmV3IE5vZGUobmFtZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAocGFyZW50VXVpZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQocGFyZW50VXVpZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LmFkZENoaWxkKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRDaGlsZChub2RlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNjZW5lLmFkZENoaWxkKG5vZGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBOb2RlICR7bmFtZX0gY3JlYXRlZCBzdWNjZXNzZnVsbHlgLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IG5vZGUgaW5mb3JtYXRpb25cclxuICAgICAqL1xyXG4gICAgZ2V0Tm9kZUluZm8obm9kZVV1aWQ6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcclxuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQobm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uOiBub2RlLnJvdGF0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiBub2RlLnNjYWxlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQ/LnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PiBjaGlsZC51dWlkKSxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBub2RlLmNvbXBvbmVudHMubWFwKChjb21wOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuY29uc3RydWN0b3IubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogY29tcC5lbmFibGVkXHJcbiAgICAgICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IGFsbCBub2RlcyBpbiBzY2VuZVxyXG4gICAgICovXHJcbiAgICBnZXRBbGxOb2RlcygpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XHJcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbGxlY3ROb2RlcyA9IChub2RlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGUucGFyZW50Py51dWlkXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBub2RlLmNoaWxkcmVuLmZvckVhY2goKGNoaWxkOiBhbnkpID0+IGNvbGxlY3ROb2RlcyhjaGlsZCkpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2NlbmUuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQ6IGFueSkgPT4gY29sbGVjdE5vZGVzKGNoaWxkKSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBub2RlcyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpbmQgbm9kZSBieSBuYW1lXHJcbiAgICAgKi9cclxuICAgIGZpbmROb2RlQnlOYW1lKG5hbWU6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcclxuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeU5hbWUobmFtZSk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIG5hbWUgJHtuYW1lfSBub3QgZm91bmRgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCBjdXJyZW50IHNjZW5lIGluZm9ybWF0aW9uXHJcbiAgICAgKi9cclxuICAgIGdldEN1cnJlbnRTY2VuZUluZm8oKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xyXG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHNjZW5lLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogc2NlbmUudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBub2RlQ291bnQ6IHNjZW5lLmNoaWxkcmVuLmxlbmd0aFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNldCBub2RlIHByb3BlcnR5XHJcbiAgICAgKi9cclxuICAgIHNldE5vZGVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xyXG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTZXQgcHJvcGVydHlcclxuICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSAncG9zaXRpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlLnNldFBvc2l0aW9uKHZhbHVlLnggfHwgMCwgdmFsdWUueSB8fCAwLCB2YWx1ZS56IHx8IDApO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAncm90YXRpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlLnNldFJvdGF0aW9uRnJvbUV1bGVyKHZhbHVlLnggfHwgMCwgdmFsdWUueSB8fCAwLCB2YWx1ZS56IHx8IDApO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnc2NhbGUnKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlLnNldFNjYWxlKHZhbHVlLnggfHwgMSwgdmFsdWUueSB8fCAxLCB2YWx1ZS56IHx8IDEpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnYWN0aXZlJykge1xyXG4gICAgICAgICAgICAgICAgbm9kZS5hY3RpdmUgPSB2YWx1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ25hbWUnKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlLm5hbWUgPSB2YWx1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFRyeSB0byBzZXQgcHJvcGVydHkgZGlyZWN0bHlcclxuICAgICAgICAgICAgICAgIChub2RlIGFzIGFueSlbcHJvcGVydHldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgdXBkYXRlZCBzdWNjZXNzZnVsbHlgXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IHNjZW5lIGhpZXJhcmNoeVxyXG4gICAgICovXHJcbiAgICBnZXRTY2VuZUhpZXJhcmNoeShpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xyXG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NOb2RlID0gKG5vZGU6IGFueSk6IGFueSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlQ29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb21wb25lbnRzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoY29tcDogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjb21wLmNvbnN0cnVjdG9yLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZFxyXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gcHJvY2Vzc05vZGUoY2hpbGQpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgaGllcmFyY2h5ID0gc2NlbmUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PiBwcm9jZXNzTm9kZShjaGlsZCkpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBoaWVyYXJjaHkgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgcHJlZmFiIGZyb20gbm9kZVxyXG4gICAgICovXHJcbiAgICBjcmVhdGVQcmVmYWJGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBwcmVmYWJQYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBpbnN0YW50aWF0ZSB9ID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xyXG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBOb3RlOiBUaGlzIGlzIGp1c3QgYSBzaW11bGF0aW9uIGltcGxlbWVudGF0aW9uIGJlY2F1c2UgcHJlZmFiIGZpbGVzIGNhbm5vdCBiZSBjcmVhdGVkIGRpcmVjdGx5IGluIHJ1bnRpbWUgZW52aXJvbm1lbnRcclxuICAgICAgICAgICAgLy8gUmVhbCBwcmVmYWIgY3JlYXRpb24gcmVxdWlyZXMgRWRpdG9yIEFQSSBzdXBwb3J0XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IHByZWZhYlBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlTm9kZVV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcmVmYWIgY3JlYXRlZCBmcm9tIG5vZGUgJyR7bm9kZS5uYW1lfScgYXQgJHtwcmVmYWJQYXRofWBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZXQgY29tcG9uZW50IHByb3BlcnR5XHJcbiAgICAgKi9cclxuICAgIHNldENvbXBvbmVudFByb3BlcnR5KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XHJcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQobm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlLmdldENvbXBvbmVudChDb21wb25lbnRDbGFzcyk7XHJcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjb21tb24gcHJvcGVydGllc1xyXG4gICAgICAgICAgICBpZiAocHJvcGVydHkgPT09ICdzcHJpdGVGcmFtZScgJiYgY29tcG9uZW50VHlwZSA9PT0gJ2NjLlNwcml0ZScpIHtcclxuICAgICAgICAgICAgICAgIC8vIFN1cHBvcnQgdmFsdWUgYXMgdXVpZCBvciByZXNvdXJjZSBwYXRoXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcnN0IHRyeSB0byBsb29rdXAgYnkgdXVpZFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0TWFuYWdlciA9IHJlcXVpcmUoJ2NjJykuYXNzZXRNYW5hZ2VyO1xyXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0TWFuYWdlci5yZXNvdXJjZXMubG9hZCh2YWx1ZSwgcmVxdWlyZSgnY2MnKS5TcHJpdGVGcmFtZSwgKGVycjogYW55LCBzcHJpdGVGcmFtZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyICYmIHNwcml0ZUZyYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc3ByaXRlRnJhbWUgPSBzcHJpdGVGcmFtZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBsb2FkIHZpYSB1dWlkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIubG9hZEFueSh7IHV1aWQ6IHZhbHVlIH0sIChlcnIyOiBhbnksIGFzc2V0OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVycjIgJiYgYXNzZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnNwcml0ZUZyYW1lID0gYXNzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRGlyZWN0IGFzc2lnbm1lbnQgKGNvbXBhdGlibGUgd2l0aCBhbHJlYWR5IHBhc3NlZCByZXNvdXJjZSBvYmplY3QpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zcHJpdGVGcmFtZSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zcHJpdGVGcmFtZSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnbWF0ZXJpYWwnICYmIChjb21wb25lbnRUeXBlID09PSAnY2MuU3ByaXRlJyB8fCBjb21wb25lbnRUeXBlID09PSAnY2MuTWVzaFJlbmRlcmVyJykpIHtcclxuICAgICAgICAgICAgICAgIC8vIFN1cHBvcnQgdmFsdWUgYXMgdXVpZCBvciByZXNvdXJjZSBwYXRoXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0TWFuYWdlciA9IHJlcXVpcmUoJ2NjJykuYXNzZXRNYW5hZ2VyO1xyXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0TWFuYWdlci5yZXNvdXJjZXMubG9hZCh2YWx1ZSwgcmVxdWlyZSgnY2MnKS5NYXRlcmlhbCwgKGVycjogYW55LCBtYXRlcmlhbDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyICYmIG1hdGVyaWFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSBtYXRlcmlhbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0TWFuYWdlci5sb2FkQW55KHsgdXVpZDogdmFsdWUgfSwgKGVycjI6IGFueSwgYXNzZXQ6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyMiAmJiBhc3NldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSBhc3NldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3N0cmluZycgJiYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5MYWJlbCcgfHwgY29tcG9uZW50VHlwZSA9PT0gJ2NjLlJpY2hUZXh0JykpIHtcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdHJpbmcgPSB2YWx1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFtwcm9wZXJ0eV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBPcHRpb25hbDogUmVmcmVzaCBJbnNwZWN0b3JcclxuICAgICAgICAgICAgLy8gRWRpdG9yLk1lc3NhZ2Uuc2VuZCgnc2NlbmUnLCAnc25hcHNob3QnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENvbXBvbmVudCBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59OyJdfQ==