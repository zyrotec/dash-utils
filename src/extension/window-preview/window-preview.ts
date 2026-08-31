import St from 'gi://St';
import Shell from 'gi://Shell';
import { AppIcon } from 'resource:///org/gnome/shell/ui/appDisplay.js';
import { WindowPreviewPopup } from '../ui/window-preview-popup.ui.js';
import { Dash } from 'resource:///org/gnome/shell/ui/dash.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class WindowPreview {
    private _dashIconPopup: WindowPreviewPopup | null = null;

    private _dashBoxSignalids = new Map<number, St.Widget>();

    constructor() {
        this._buildUI();
        this._handleSignals();
    }

    private _buildUI(): void {
        this._dashIconPopup = new WindowPreviewPopup();
    }

    private _handleSignals(): void{
        const childAddedId = Main.overview.dash._box.connect("child-added", () => {
            this._dashIconPopup?.refreshAppIcons();
        });
        this._dashBoxSignalids.set(childAddedId, Main.overview.dash._box);
    }

    private onShellWindowChanged(): void {

    }

    public destroy(): void {
        for (const [id, actor] of this._dashBoxSignalids.entries()) {
            actor.disconnect(id);
        }

        this._dashIconPopup?.destroy();
        this._dashIconPopup = null;
    }
}