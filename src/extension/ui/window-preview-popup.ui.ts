import St from 'gi://St';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import Cogl from 'gi://Cogl';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { AppIcon } from 'resource:///org/gnome/shell/ui/appDisplay.js';
import { DashToDockUtil } from '../utils/dash-to-dock.util.js';
import { DashUtil } from '../utils/dash.util.js';
import { Dash } from 'resource:///org/gnome/shell/ui/dash.js';
import { BoxPointer } from 'resource:///org/gnome/shell/ui/boxpointer.js';
import { PopupAnimation } from 'resource:///org/gnome/shell/ui/boxpointer.js';
import { MouseLeaveUtil } from '../utils/mouse-leave.util.js';

export class WindowPreviewPopup {
    private _popupMenu: PopupMenu.PopupMenu | null = null;
    private _dashUtil = new DashUtil();
    private _dashToDockUtil = new DashToDockUtil();
    private _mouseLeaveUtil = new MouseLeaveUtil();

    private _popupMenuSignalIds = new Map<number, PopupMenu.PopupMenu>();
    private _popupMenuActorSignalIds = new Map<number, BoxPointer>();
    private _appIconSignalIds = new Map<number, AppIcon>();
    private _dashSignalIds = new Map<number, Dash>();
    private _dashToDockActorSignalIds = new Map<number, St.BoxLayout>();

    private _isPopupActorHovered = false;
    private _isAppIconHovered = false;
    private _isDashToDockBoxHovered = false;
    private _isMenuOpen = false;

    constructor() {
        this._buildUI();
        this._handleSignals();
    }

    private _buildUI(): void {
        this._popupMenu = new PopupMenu.PopupMenu(Main.overview.dash._box, 0.5, St.Side.BOTTOM);
        this._popupMenu.actor.track_hover = true;
        this._popupMenu.actor.hide();
        this._popupMenu.actor.set_style("min-width: auto;")

        Main.overview.dash._box.track_hover = true;
        Main.layoutManager.addChrome(this._popupMenu.actor);
    }

    private _handleSignals(): void {
        const dashToDockActor = this._dashToDockUtil.getDashToDockActor();

        if (!this._popupMenu || !dashToDockActor) {
            return;
        }

        const openStateChangeId = this._popupMenu.connect("open-state-changed", this._onPopupMenuOpenStateChanged.bind(this))
        this._popupMenuSignalIds.set(openStateChangeId, this._popupMenu);

        const hoverId = this._popupMenu.actor.connect("notify::hover", this._onPopupMenuHover.bind(this));
        this._popupMenuActorSignalIds.set(hoverId, this._popupMenu.actor);

        const dashToDockActorHoverId = dashToDockActor.connect("notify::hover", this._onDashToDockActorHover.bind(this));
        this._dashToDockActorSignalIds.set(dashToDockActorHoverId, dashToDockActor)

        for (const appIcon of this._dashUtil.getAppIcons()) {
            const hoverId = appIcon.connect("notify::hover", this._onAppIconHover.bind(this));
            this._appIconSignalIds.set(hoverId, appIcon);

            const popupMenuId = appIcon.connect("menu-state-changed", this._onAppIconMenuStateChanged.bind(this));
            this._appIconSignalIds.set(popupMenuId, appIcon);
        }
    }

    private _onPopupMenuOpenStateChanged(menu: PopupMenu.PopupMenu, args: boolean): void {
        if (menu.isOpen) {
            this._dashToDockUtil?.pinDock();
            this._isMenuOpen = true;
        } else {
            this._dashToDockUtil?.unpinDock();
            this._isMenuOpen = false;
        }
    }

    private _onPopupMenuHover(actor: BoxPointer, args: GObject.ParamSpec<unknown>): void {
        this._isPopupActorHovered = actor.hover ?? false;

        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (this._isAppIconHovered || this._isPopupActorHovered) {
                return GLib.SOURCE_REMOVE;
            }

            if (this._mouseLeaveUtil.leftBottom(actor)) {
                return GLib.SOURCE_REMOVE;
            }

            this._popupMenu?.close(PopupAnimation.FULL);

            return GLib.SOURCE_REMOVE;
        });
    }

    private _onDashToDockActorHover(actor: St.BoxLayout, args: GObject.ParamSpec<unknown>): void {
        this._isDashToDockBoxHovered = actor.hover;

        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (this._isDashToDockBoxHovered || this._isAppIconHovered) {
                return GLib.SOURCE_REMOVE;
            }

            if (this._mouseLeaveUtil.leftX(actor)) {
                this._popupMenu?.close(PopupAnimation.FULL);
            }

            return GLib.SOURCE_REMOVE;
        });
    }

    private _onAppIconHover(appIcon: AppIcon, args: GObject.ParamSpec<unknown>): void {
        this._isAppIconHovered = appIcon.hover;

        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            if (appIcon.app.get_n_windows() === 0) {
                this._popupMenu?.close(PopupAnimation.FULL);

                return GLib.SOURCE_REMOVE;
            }

            const windows = appIcon.app.get_windows().sort((x, y) => x.get_stable_sequence() - y.get_stable_sequence());

            this._popupMenu?.removeAll();

            for (const window of windows) {
                this._popupMenu?.addAction(`${window.title}`, () => window.delete(global.get_current_time()));
            }

            if (appIcon.hover && !this._isMenuOpen) {
                this._popupMenu?.open(PopupAnimation.FULL);
            }

            this._syncPopupPosition(appIcon);

            return GLib.SOURCE_REMOVE;
        });
    }

    private _onAppIconMenuStateChanged(appIcon: AppIcon, args: boolean): void {
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._popupMenu?.close(PopupAnimation.FULL);
            return GLib.SOURCE_REMOVE;
        });
    }

    private _syncPopupPosition(appIcon: AppIcon): void {
        this._popupMenu?.actor.setPosition(appIcon, 0.5);
    }

    public open() {
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._popupMenu?.open(PopupAnimation.FULL);
            return GLib.SOURCE_REMOVE;
        });
    }

    public close() {
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._popupMenu?.close(PopupAnimation.FULL);
            return GLib.SOURCE_REMOVE;
        });
    }

    public refeshPopupContents(): void {

    }

    public refreshAppIcons(): void {
        for (const [id, actor] of this._appIconSignalIds.entries()) {
            actor.disconnect(id);
            this._appIconSignalIds.delete(id);
        }

        for (const appIcon of this._dashUtil.getAppIcons()) {
            const hoverId = appIcon.connect("notify::hover", this._onAppIconHover.bind(this));
            this._appIconSignalIds.set(hoverId, appIcon);

            const popupMenuId = appIcon.connect("menu-state-changed", this._onAppIconMenuStateChanged.bind(this));
            this._appIconSignalIds.set(popupMenuId, appIcon);
        }
    }

    public destroy(): void {
        for (const [id, actor] of this._popupMenuSignalIds.entries()) {
            actor.disconnect(id);
        }

        for (const [id, actor] of this._popupMenuActorSignalIds.entries()) {
            actor.disconnect(id);
        }

        for (const [id, actor] of this._appIconSignalIds.entries()) {
            actor.disconnect(id);
        }

        for (const [id, actor] of this._dashSignalIds.entries()) {
            actor.disconnect(id);
        }

        this._popupMenu?.destroy();
        this._popupMenu = null;
    }
}