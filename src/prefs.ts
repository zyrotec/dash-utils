import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

class DashUtilsPrefsPage extends Adw.PreferencesPage {
  declare _toggle_row: Adw.SwitchRow;
  declare _spin_row: Adw.SpinRow;

  static {
    GObject.registerClass(
      {
        GTypeName: 'DashUtilsPrefsPage',
        Template: GLib.Uri.resolve_relative(
          import.meta.url,
          './ui/prefs.ui',
          GLib.UriFlags.NONE
        ),
        InternalChildren: ['toggle_row', 'spin_row'],
      },
      this
    );
  }
}

export default class DashUtilsPreferences extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    const settings = this.getSettings();
    const page = new DashUtilsPrefsPage();

    settings.bind(
      'enable-feature', page._toggle_row, 'active',
      Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
      'some-number', page._spin_row, 'value',
      Gio.SettingsBindFlags.DEFAULT
    );

    window.add(page);
  }
}