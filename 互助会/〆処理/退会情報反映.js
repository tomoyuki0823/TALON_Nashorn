setYotakuKaiinData();

function setYotakuKaiinData() {
    try {
        var db = TALON.getDbConfig();
        var conditionMap = TALON.getConditionData() || {};

        var SHORI_TUKI = asStr(conditionMap['SHORI_TUKI']);
        if (!SHORI_TUKI) return;

        var where = new java.util.HashMap();
        where.put("SHORI_TUKI", SHORI_TUKI);

        var list = selectList(db, "TK_YOTAKU_RENKEI", null, where, null) || [];

        for (var i = 0; i < list.length; i++) {
            var row = list[i]; // Java Map 前提
            var TK_NO = asStr(row.get('TK_NO'));

            var HON_TAISYOKU_CD = asStr(row.get('HON_TAISYOKU_CD'));
            var HAI_TAISYOKU_CD = asStr(row.get('HAI_TAISYOKU_CD'));

            if (!HON_TAISYOKU_CD && !HAI_TAISYOKU_CD) {
                continue; // データ読み飛ばし
            }

            // ---------- TK_MEMBER の更新（必要な場合のみ）
            var filtered = pickNonBlankToJs(row);
            if (!TK_NO) {
                TALON.addErrorMsg("TK_YOTAKU の行で TK_NO が空のため更新スキップしました。");
                continue;
            }
            filtered["TK_NO"] = TK_NO;

            if (Object.keys(filtered).length > 1) {
                updateByMapEx(db, "TK_MEMBER", filtered, ["TK_NO"], false);
            }
        }

        updateCloseStatus(db, SHORI_TUKI, "03");

    } catch (e) {
        TALON.addErrorMsg(asMessage(e));
    }
}

// 支払テーブル更新（キー設計は運用に合わせて拡張推奨）
function updateShiharai(updateMap) {
    // 可能なら ["TK_NO","SHORI_TUKI"] や 種別カラム（例: SHIHARAI_KBN）もキーに足すと安全
    updateByMapEx(TALON.getDbConfig(), "TK_SHIHARAI", updateMap, ['TK_NO'], false);
}



