import St from 'gi://St';
import { AppIcon } from 'resource:///org/gnome/shell/ui/appDisplay.js';
import { DashUtil } from '../utils/dash.util.js';
import { DashIconPopup, DashIconPopupManager } from '../ui/dash-icon-popup.ui.js';

export class WindowPreview {
    private _dashUtil = new DashUtil();
    private _dashIconPopup: DashIconPopup | null = null;
    private _dashIconPopupManager: DashIconPopupManager | null = null;

    constructor() {
        this._buildUI();
    }

    private _buildUI(): void {
        const dash = this._dashUtil.getDashBox();
        this._dashIconPopup = new DashIconPopup(dash, 0.5, St.Side.BOTTOM);
        this._dashIconPopupManager = new DashIconPopupManager(this._dashIconPopup, this._dashUtil.getAppIcons());
    }

    public destroy(): void {
        this._dashIconPopupManager?.destroy();
        this._dashIconPopupManager = null;

        this._dashIconPopup?.destroy();
        this._dashIconPopup = null;
    }
}