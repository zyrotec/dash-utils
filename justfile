UUID := "dash-utils@zyrotec"
INSTALL_DIR := env_var('HOME') + "/.local/share/gnome-shell/extensions/" + UUID

build: 
    rm -rf dist/*
    pnpm run build
    mkdir -p dist/resources
    mkdir -p dist/schemas
    mkdir -p dist/ui
    cp src/schemas/*.gschema.xml dist/schemas
    cp src/resources/prefs.gresource.xml dist/resources
    glib-compile-schemas dist/schemas/
    blueprint-compiler compile src/preferences/prefs.blp --output dist/ui/prefs.ui
    glib-compile-resources dist/resources/prefs.gresource.xml --sourcedir=dist --target=dist/resources/prefs.gresource

package: build
    mkdir -p release && cd dist && zip -r ../release/{{UUID}}.zip .

install: build
    mkdir -p {{INSTALL_DIR}}
    cp -r dist/* {{INSTALL_DIR}}
    cp src/stylesheet.css {{INSTALL_DIR}}
    cp metadata.json {{INSTALL_DIR}}

debug: 
    SHELL_DEBUG=a11 dbus-run-session gnome-shell --devkit --wayland --no-x11

dev: install debug

clean: 
    rm -rf dist/