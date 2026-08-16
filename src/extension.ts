import { WindowPreview } from './extension/window-preview/window-preview.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class MyExtension extends Extension {
  private _windowPreview: WindowPreview | null = null;
  
  enable() {
    this._windowPreview = new WindowPreview();
  }

  disable() {
    this._windowPreview?.destroy();
  }
}