// dash-icon-popup.ui.ts
import St from 'gi://St';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { AppIcon } from 'resource:///org/gnome/shell/ui/appDisplay.js';
import { DashToDockUtil } from '../utils/dash-to-dock.util.js';

class DashIconPopupEvents extends GObject.Object {
    static {
        GObject.registerClass({
            Signals: {
                'dash-popup-menu-open-state-changed': { param_types: [GObject.TYPE_BOOLEAN] },
            },
        }, this);
    }
}

export class DashIconPopup extends PopupMenu.PopupMenu {
    private _isOpen: boolean = false;
    public readonly events: DashIconPopupEvents = new DashIconPopupEvents();

    constructor(sourceActor: Clutter.Actor, arrowAlignment: number, arrowSide: St.Side) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._buildUI();
    }

    private _buildUI(): void {
        this.actor.reactive = true;
        this.actor.track_hover = true;
        Main.layoutManager.addChrome(this.actor);
        this.actor.hide();
    }

    private _onPopupmenuItemClick(window: Meta.Window) {
        console.log(`${window.get_id()} Clicked!!!`);
    }

    public getIsOpen(): boolean {
        return this._isOpen;
    }

    public getIsHovered(): boolean {
        return this.actor.hover ?? false;
    }

    public openMenu(appIcon: AppIcon): void {
        this.removeAll();

        for (const window of appIcon.app.get_windows()) {
            this.addAction(`${window.title}`, this._onPopupmenuItemClick.bind(this, window));
        }

        this.actor.set
        this.actor.setPosition(appIcon, 0.5);
        this.actor.show();

        this._isOpen = true;
        this.events.emit("dash-popup-menu-open-state-changed", true);
    }

    public closeMenu(): void {
        this.actor.hide();
        this._isOpen = false;
        this.events.emit("dash-popup-menu-open-state-changed", false);
    }
}
export class DashIconPopupManager {
    private _dashToDockUtil: DashToDockUtil = new DashToDockUtil();
    private _dashIconPopup: DashIconPopup | null = null;
    private _appIcons: AppIcon[] | null = null;
    private _hoveredAppIcon: AppIcon | null = null;

    private _appIconHoverSignalIds: Map<number, AppIcon | null> = new Map<number, AppIcon | null>();
    private _dashIconPopupOpenStateChangedSignalIds: Map<number, DashIconPopupEvents | null> = new Map<number, DashIconPopupEvents | null>();

    private _gobalStageMotionEventSignalId: number | null = null;
    private _hoverTimeoutSignalId: number | null = null;

    constructor(dashIconPopup: DashIconPopup, appIcons: AppIcon[]) {
        this._dashIconPopup = dashIconPopup;
        this._appIcons = appIcons;

        this._handleSignals();
    }

    private _handleSignals(): void {
        if (!this._dashIconPopup || !this._appIcons) {
            return;
        }

        for (const appIcon of this._appIcons) {
            const appIconHoverId = appIcon.connect("notify::hover", () => {
                if (appIcon.hover) {
                    this._hoveredAppIcon = appIcon;
                    this._onHover(appIcon);
                }
            });
            this._appIconHoverSignalIds.set(appIconHoverId, appIcon);
        }

        const dashIconPopupOpenStateChangedSignalId = this._dashIconPopup.events.connect("dash-popup-menu-open-state-changed", (_, args) => {
            if (args) {
                this._dashToDockUtil?.pinDock();
                this._startPointerTracking();
            } else {
                this._dashToDockUtil?.unpinDock();
                this._stopPointerTracking();
            }
        });
        this._dashIconPopupOpenStateChangedSignalIds.set(dashIconPopupOpenStateChangedSignalId, this._dashIconPopup.events);
    }

    private _startPointerTracking(): void {
        if (this._gobalStageMotionEventSignalId !== null) {
            return;
        }

        this._gobalStageMotionEventSignalId = global.stage.connect("motion-event", () => {
            if (!this._dashIconPopup?.getIsOpen()) {
                return Clutter.EVENT_PROPAGATE;
            }

            if (!this._isHovered()) {
                this._hoveredAppIcon = null;
                this._dashIconPopup?.closeMenu();
            }

            return Clutter.EVENT_PROPAGATE;
        });
    }

    private _stopPointerTracking(): void {
        if (this._gobalStageMotionEventSignalId !== null) {
            global.stage.disconnect(this._gobalStageMotionEventSignalId);
            this._gobalStageMotionEventSignalId = null;
        }
    }

    private _isHovered(): boolean {
        const [x, y] = global.get_pointer();
        const point = new Graphene.Point({ x, y });
        const icon = this._hoveredAppIcon?.visible ? this._hoveredAppIcon.get_transformed_extents() : null;
        const popup = this._dashIconPopup?.actor.visible ? this._dashIconPopup.actor.get_transformed_extents() : null;
        const dash = Main.overview.dash._box.visible ? Main.overview.dash._box.get_transformed_extents() : null;

        return (icon?.contains_point(point) ?? false) || 
            (popup?.contains_point(point) ?? false) || 
            (dash?.contains_point(point) ?? false);
    }

    private _onHover(appIcon: AppIcon): void {
        if (appIcon.app.get_n_windows() > 0) {
            if (!this._dashIconPopup?.isOpen) {
                GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    this._dashIconPopup?.openMenu(appIcon);

                    return GLib.SOURCE_REMOVE;
                });
            }
        } else {
            this._hoveredAppIcon = null;
            this._dashIconPopup?.closeMenu();
        }
    }

    public destroy(): void {
        for (const [hoverId, appIcon] of this._appIconHoverSignalIds.entries()) {
            appIcon?.disconnect(hoverId);
        }

        for (const [dashIconPopupOpenStateChangedId, dashIconPopupEvents] of this._dashIconPopupOpenStateChangedSignalIds.entries()) {
            dashIconPopupEvents?.disconnect(dashIconPopupOpenStateChangedId);
        }

        if (this._gobalStageMotionEventSignalId !== null) {
            global.stage.disconnect(this._gobalStageMotionEventSignalId);
            this._gobalStageMotionEventSignalId = null;
        }

        this._dashIconPopup?.destroy();
        this._dashIconPopup = null;
        this._hoveredAppIcon = null;
    }
}