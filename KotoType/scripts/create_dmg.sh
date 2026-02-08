#!/bin/bash
set -e

validate_app_bundle_layout() {
    local bundle_path="$1"
    local invalid_entries

    if [ ! -d "${bundle_path}/Contents" ]; then
        echo "❌ Error: ${bundle_path} is missing Contents directory"
        exit 1
    fi

    invalid_entries="$(find "${bundle_path}" -mindepth 1 -maxdepth 1 ! -name 'Contents' -print)"
    if [ -n "${invalid_entries}" ]; then
        echo "❌ Error: Unexpected items found at ${bundle_path} root (only Contents is allowed):"
        echo "${invalid_entries}"
        exit 1
    fi
}

APP_NAME="KotoType"
APP_BUNDLE="${APP_NAME}.app"
APP_VERSION="$(./scripts/version.sh)"
DMG_NAME="${APP_NAME}-${APP_VERSION}.dmg"
VOL_NAME="KotoType"

echo "Creating DMG for ${APP_BUNDLE}..."

# アプリが存在するか確認
if [ ! -d "${APP_BUNDLE}" ]; then
    echo "❌ Error: ${APP_BUNDLE} not found"
    echo "Please run ./create_app.sh first"
    exit 1
fi

echo "Validating app bundle layout..."
validate_app_bundle_layout "${APP_BUNDLE}"

# 一時ディレクトリを作成
TMP_DIR="dmg_temp"
rm -rf "${TMP_DIR}"
mkdir -p "${TMP_DIR}"

# アプリをコピー
echo "Copying app bundle..."
if command -v ditto >/dev/null 2>&1; then
    ditto "${APP_BUNDLE}" "${TMP_DIR}/${APP_BUNDLE}"
else
    cp -R "${APP_BUNDLE}" "${TMP_DIR}/"
fi

# アプリケーションフォルダのシンボリックリンクを作成
echo "Creating Applications link..."
ln -s /Applications "${TMP_DIR}/Applications"

# DMGを作成
echo "Creating DMG..."
hdiutil create -volname "${VOL_NAME}" \
  -srcfolder "${TMP_DIR}" \
  -ov -format UDZO \
  "${DMG_NAME}"

# 一時ディレクトリを削除
rm -rf "${TMP_DIR}"

# DMGサイズを確認
SIZE=$(du -h "${DMG_NAME}" | cut -f1)
echo ""
echo "✅ DMG created successfully!"
echo "File: ${DMG_NAME}"
echo "Size: ${SIZE}"
echo ""
echo "To test: open ${DMG_NAME}"
