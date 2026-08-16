// dash-icon-popup.ui.ts
import St from 'gi://St';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Graphene from 'gi://Graphene';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { AppIcon } from 'resource:///org/gnome/shell/ui/appDisplay.js';

const HOVER_CLOSE_DELAY: number = 0;
const HOVER_OPEN_DELAY: number = 0;

export class DashIconPopup extends PopupMenu.PopupMenu {
    private _isOpen: boolean = false;

    constructor(sourceActor: Clutter.Actor, arrowAlignment: number, arrowSide: St.Side) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._buildUI();
    }

    private _buildUI(): void {
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
        this.addAction(`${appIcon.app.get_name()}`, () => { });

        this.actor.set
        this.actor.setPosition(appIcon, 0.5);
        this.actor.show();

        this._isOpen = true;
    }

    public closeMenu(): void {
        this.actor.hide();
        this._isOpen = false;
    }
}

export class DashIconPopupManager {
    private _hoverBox: St.Widget | null = null;
    private _dashIconPopup: DashIconPopup | null = null;
    private _appIcons: AppIcon[] | null = null;
    private _hoveredAppIcon: AppIcon | null = null;

    private _hoverBoxHoverSignalIds: Map<number, St.Widget | null> = new Map<number, St.Widget | null>();
    private _hoverBoxLayoutChangedSignalIds: Map<number, St.Widget | null> = new Map<number, St.Widget | null>();
    private _appIconHoverSignalIds: Map<number, AppIcon | null> = new Map<number, AppIcon | null>();
    private _dashIconPopupAllocationSignalIds: Map<number, St.Widget | null> = new Map<number, St.Widget | null>();
    private _globalStageBeforeUpdateSignalIds: Map<number, Clutter.Stage> = new Map<number, Clutter.Stage>();


    private _hoverTimeoutSignalId: number | null = null;

    constructor(dashIconPopup: DashIconPopup, appIcons: AppIcon[]) {
        this._dashIconPopup = dashIconPopup;
        this._appIcons = appIcons;

        this._buildUI();
        this._handleSignals();
    }

    private _buildUI(): void {
        this._hoverBox = new St.Widget({
            reactive: false,
            track_hover: true,
            style: 'background-color: rgba(255,0,0,0.25);',
            width: 50,
            height: 50
        });

        Main.layoutManager.addChrome(this._hoverBox);
    }

    private _handleSignals(): void {
        console.log("HOVER BOX : ", !!this._hoverBox);
        console.log("DASH POPUP : ", !!this._dashIconPopup);
        console.log("APP ICONS : ", !!this._appIcons);

        console.log(!this._hoverBox || !this._dashIconPopup || !this._appIcons);

        if (!this._hoverBox || !this._dashIconPopup || !this._appIcons) {
            return;
        }

        for (const appIcon of this._appIcons) {
            const appIconHoverId = appIcon.connect("notify::hover", () => {
                // if (!this._dashIconPopup || !appIcon) {
                //     return;
                // }

                console.log("HOVER BOX : ", !!this._hoverBox);
                console.log("DASH POPUP : ", !!this._dashIconPopup);
                console.log("APP ICONS : ", !!this._appIcons);
                console.log("EXISTING : ", !this._hoverBox || !this._dashIconPopup || !this._appIcons);
                console.log("HOVERED");

                this._hoveredAppIcon = appIcon;
                this._positionResizeHoverBox(this._hoveredAppIcon);
            });
            this._appIconHoverSignalIds.set(appIconHoverId, appIcon);
        }

        const hoverBoxLayoutChangedId = this._hoverBox.connect("notify::hover", () => {
            if (!this._hoveredAppIcon) {
                return;
            }

            // this._positionResizeHoverBox(this._hoveredAppIcon);
        });
        this._hoverBoxLayoutChangedSignalIds.set(hoverBoxLayoutChangedId, this._hoverBox);

        const dashIconPopupAllocationId = this._hoverBox.connect("notify::allocation", () => {
            if (!this._hoveredAppIcon) {
                return;
            }

            this._onHover(this._hoveredAppIcon);

        });
        this._dashIconPopupAllocationSignalIds.set(dashIconPopupAllocationId, this._hoverBox);

        const globalStageBeforeUpdateSignalId = global.stage.connect("before-update", () => {
            if (!this._hoveredAppIcon) {
                return;
            }

            this._positionResizeHoverBox(this._hoveredAppIcon);
        });
        this._globalStageBeforeUpdateSignalIds.set(globalStageBeforeUpdateSignalId, global.stage);
    }

    private _isHovered(): boolean {
        if(!this._hoverBox) {
            return false;
        }

        const [x, y] = global.get_pointer();
        const point = new Graphene.Point({ x, y });

        const hoverBridgeRect = this._hoverBox.visible
            ? this._hoverBox.get_transformed_extents()
            : null;

        console.log(hoverBridgeRect?.contains_point(point));
        return hoverBridgeRect?.contains_point(point) ?? false;
    }

    private _positionResizeHoverBox(appIcon: AppIcon): void {
        if (!this._hoverBox || !this._dashIconPopup || !appIcon) {
            return;
        }

        const iconRect = appIcon.get_transformed_extents();
        const popupRect = this._dashIconPopup.actor.get_transformed_extents();

        console.log("POPUP RECT : ",!!popupRect)

        if (!iconRect || !this._isFiniteRect(iconRect)) {
            return;
        }

        const top = (popupRect && this._isFiniteRect(popupRect) && this._dashIconPopup.actor.is_visible()) ? 
            Math.min(iconRect.origin.y + iconRect.size.height, popupRect.origin.y):
            Math.min(iconRect.origin.y + iconRect.size.height, iconRect.origin.y);
        const bottom = (popupRect && this._isFiniteRect(popupRect) && this._dashIconPopup.actor.is_visible()) ? 
            Math.max(iconRect.origin.y + iconRect.size.height, popupRect.origin.y):
            Math.max(iconRect.origin.y + iconRect.size.height, iconRect.origin.y);

        const centerX = iconRect.origin.x + iconRect.size.width / 2;
        const width = (popupRect && this._isFiniteRect(popupRect) && this._dashIconPopup.actor.is_visible()) ? 
            Math.max(popupRect.size.width, 20):
            Math.max(iconRect.size.width, 20);

        this._hoverBox.set_position(centerX - width / 2, top);
        this._hoverBox.set_size(width, Math.max(bottom - top, 1));
    }

    private _isFiniteRect(rect: Graphene.Rect): boolean {
        return Number.isFinite(rect.origin.x)
            && Number.isFinite(rect.origin.y)
            && Number.isFinite(rect.size.width)
            && Number.isFinite(rect.size.height);
    }

    private _onHover(appIcon: AppIcon): void {
        this._clearHoverTimeout();
        // this._positionResizeHoverBox(appIcon);

        if (this._isHovered() && appIcon.app.get_n_windows() > 0) {
            if (!this._dashIconPopup?.isOpen) {
                this._dashIconPopup?.openMenu(appIcon);
            }
        } else {
            this._hoveredAppIcon = null;
            this._dashIconPopup?.closeMenu();
        }
    }

    private _clearHoverTimeout(): void {
        if (this._hoverTimeoutSignalId !== null) {
            GLib.source_remove(this._hoverTimeoutSignalId);
            this._hoverTimeoutSignalId = null;
        }
    }

    public destroy(): void {
        this._clearHoverTimeout();

        for (const [layoutChangedId, hoverBox] of this._hoverBoxLayoutChangedSignalIds.entries()) {
            hoverBox?.disconnect(layoutChangedId);
        }

        for (const [hoverId, appIcon] of this._appIconHoverSignalIds.entries()) {
            appIcon?.disconnect(hoverId);
        }

        for (const [allowcationId, dashIconPopup] of this._dashIconPopupAllocationSignalIds.entries()) {
            dashIconPopup?.disconnect(allowcationId);
        }

        for (const [updateId, globalStage] of this._globalStageBeforeUpdateSignalIds.entries()) {
            globalStage?.disconnect(updateId);
        }

        this._hoverBox?.destroy();
        this._hoverBox = null;
    }
}