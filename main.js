const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_SETTINGS = {
    hoverWidth: 20,
    narrowWidth: 800
};

module.exports = class HideBarsPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        
        this.autoHideMode = false;
        this.userForcedAutoHideMode = null;
        this.wasFullscreenOrNarrow = false;
        
        this.savedLeftCollapsed = true;
        this.savedRightCollapsed = true;
        
        this.leftForceShow = false;
        this.rightForceShow = false;
        
        this.isLeftHoverExpanded = false;
        this.isRightHoverExpanded = false;
        this.ignoreLayoutChange = false;
        
        // Add settings tab
        this.addSettingTab(new HideBarsSettingTab(this.app, this));
        
        // Keyboard shortcut to toggle auto-hide mode
        this.addCommand({
            id: 'toggle-auto-hide',
            name: 'Toggle Auto-Hide for both sidebars',
            callback: () => {
                this.checkState(true);
            }
        });
        
        // Listen to native collapse/expand to sync state manually triggered by user UI buttons
        this.registerEvent(
            this.app.workspace.on("layout-change", () => {
                if (this.ignoreLayoutChange) return;
                
                if (this.autoHideMode) {
                    // Check if user manually expanded or collapsed
                    const leftCollapsed = this.app.workspace.leftSplit.collapsed;
                    if (!leftCollapsed && !this.isLeftHoverExpanded) {
                        // User manually expanded it (force show)
                        this.leftForceShow = true;
                    } else if (leftCollapsed && this.leftForceShow) {
                        // User manually collapsed it, removing the force show
                        this.leftForceShow = false;
                    }
                    if (leftCollapsed && this.isLeftHoverExpanded) {
                        this.isLeftHoverExpanded = false;
                    }
        
                    const rightCollapsed = this.app.workspace.rightSplit.collapsed;
                    if (!rightCollapsed && !this.isRightHoverExpanded) {
                        this.rightForceShow = true;
                    } else if (rightCollapsed && this.rightForceShow) {
                        this.rightForceShow = false;
                    }
                    if (rightCollapsed && this.isRightHoverExpanded) {
                        this.isRightHoverExpanded = false;
                    }
                }
            })
        );
        
        // Setup mousemove for hover logic
        this.onMouseMove = this.onMouseMove.bind(this);
        document.addEventListener('mousemove', this.onMouseMove);
        
        // Setup window resize for auto-hide activation based on window size
        this.onResize = this.onResize.bind(this);
        window.addEventListener('resize', this.onResize);
        
        // Initial check once layout is ready
        this.app.workspace.onLayoutReady(() => {
            this.savedLeftCollapsed = this.app.workspace.leftSplit.collapsed;
            this.savedRightCollapsed = this.app.workspace.rightSplit.collapsed;
            this.checkState();
        });
    }
    
    onunload() {
        document.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('resize', this.onResize);
    }
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.checkState();
    }
    
    expandLeft(isHover = false) {
        this.ignoreLayoutChange = true;
        this.isLeftHoverExpanded = isHover;
        this.app.workspace.leftSplit.expand();
        setTimeout(() => { this.ignoreLayoutChange = false; }, 100);
    }
    
    collapseLeft() {
        this.ignoreLayoutChange = true;
        this.isLeftHoverExpanded = false;
        this.app.workspace.leftSplit.collapse();
        setTimeout(() => { this.ignoreLayoutChange = false; }, 100);
    }
    
    expandRight(isHover = false) {
        this.ignoreLayoutChange = true;
        this.isRightHoverExpanded = isHover;
        this.app.workspace.rightSplit.expand();
        setTimeout(() => { this.ignoreLayoutChange = false; }, 100);
    }
    
    collapseRight() {
        this.ignoreLayoutChange = true;
        this.isRightHoverExpanded = false;
        this.app.workspace.rightSplit.collapse();
        setTimeout(() => { this.ignoreLayoutChange = false; }, 100);
    }
    
    onMouseMove(e) {
        if (!this.autoHideMode) return;
        
        // Left sidebar
        if (!this.leftForceShow) {
            if (this.app.workspace.leftSplit.collapsed) {
                if (e.clientX <= this.settings.hoverWidth) {
                    this.expandLeft(true);
                }
            } else if (this.isLeftHoverExpanded) {
                const leftSplitEl = document.querySelector('.workspace-split.mod-left-split');
                if (leftSplitEl) {
                    const rect = leftSplitEl.getBoundingClientRect();
                    // Mouse is to the right of the expanded left sidebar
                    if (e.clientX > rect.right + 5) {
                        this.collapseLeft();
                    }
                }
            }
        }
        
        // Right sidebar
        if (!this.rightForceShow) {
            if (this.app.workspace.rightSplit.collapsed) {
                if (window.innerWidth - e.clientX <= this.settings.hoverWidth) {
                    this.expandRight(true);
                }
            } else if (this.isRightHoverExpanded) {
                const rightSplitEl = document.querySelector('.workspace-split.mod-right-split');
                if (rightSplitEl) {
                    const rect = rightSplitEl.getBoundingClientRect();
                    // Mouse is to the left of the expanded right sidebar
                    if (e.clientX < rect.left - 5) {
                        this.collapseRight();
                    }
                }
            }
        }
    }
    
    onResize() {
        this.checkState();
    }
    
    checkState(fromShortcut = false) {
        // Robust fullscreen detection
        const isFullscreen = document.fullscreenElement !== null 
            || document.body.classList.contains('is-fullscreen')
            || (window.innerWidth >= screen.width - 5 && window.innerHeight >= screen.height - 5)
            || (window.outerWidth >= screen.width - 5 && window.outerHeight >= screen.height - 5);
            
        const isNarrow = window.innerWidth <= this.settings.narrowWidth;
        const isFullscreenOrNarrow = isFullscreen || isNarrow;
        
        let shouldBeAutoHide = isFullscreenOrNarrow;
        
        if (fromShortcut) {
            this.userForcedAutoHideMode = !this.autoHideMode;
            shouldBeAutoHide = this.userForcedAutoHideMode;
        } else {
            // Only clear the user override if the base window condition has changed
            if (this.wasFullscreenOrNarrow !== isFullscreenOrNarrow) {
                this.userForcedAutoHideMode = null;
            }
            if (this.userForcedAutoHideMode !== null) {
                shouldBeAutoHide = this.userForcedAutoHideMode;
            }
        }
        
        this.wasFullscreenOrNarrow = isFullscreenOrNarrow;
        
        if (shouldBeAutoHide !== this.autoHideMode) {
            if (shouldBeAutoHide) {
                // Turning ON auto-hide
                // Snapshot the native states exactly at the moment before we hide them
                this.savedLeftCollapsed = this.app.workspace.leftSplit.collapsed;
                this.savedRightCollapsed = this.app.workspace.rightSplit.collapsed;
                
                this.autoHideMode = true;
                this.leftForceShow = false;
                this.rightForceShow = false;
                
                this.collapseLeft();
                this.collapseRight();
            } else {
                // Turning OFF auto-hide
                this.autoHideMode = false;
                this.leftForceShow = false;
                this.rightForceShow = false;
                
                if (!this.savedLeftCollapsed) this.expandLeft(false);
                else this.collapseLeft();
                
                if (!this.savedRightCollapsed) this.expandRight(false);
                else this.collapseRight();
            }
        }
    }
};

class HideBarsSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'HideBars Settings' });

        new Setting(containerEl)
            .setName('Hover Area Width')
            .setDesc('Width of the invisible edge area (in pixels) that triggers the sidebar to expand.')
            .addText(text => text
                .setPlaceholder('20')
                .setValue(String(this.plugin.settings.hoverWidth))
                .onChange(async (value) => {
                    const parsed = parseInt(value, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                        this.plugin.settings.hoverWidth = parsed;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Narrow Window Width Threshold')
            .setDesc('If the window width is less than this value (in pixels), sidebars will auto-hide even if not in fullscreen mode.')
            .addText(text => text
                .setPlaceholder('800')
                .setValue(String(this.plugin.settings.narrowWidth))
                .onChange(async (value) => {
                    const parsed = parseInt(value, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                        this.plugin.settings.narrowWidth = parsed;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}
