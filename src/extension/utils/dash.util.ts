import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { AppIcon } from 'resource:///org/gnome/shell/ui/appDisplay.js';

export class DashUtil {
    public getAppIcons(): AppIcon[] {
        const box = (Main.overview.dash as any)._box as Clutter.Actor;
        return box.get_children()
            .filter((actor: any) => actor.child && actor.child.icon && !actor.animatingOut)
            .map((actor: any) => actor.child) as AppIcon[];
    }

    public getDashBox(): Clutter.Actor {
        return (Main.overview.dash as any)._box as Clutter.Actor;
    }
}