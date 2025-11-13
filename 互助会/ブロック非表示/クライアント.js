var isValid = true;
function resizeContents_end() {
    if (isValid) {
        // 対象ブロックを強制非表示
        document.getElementById("box2").style.display = 'none';
    }
    isValid = false;
}