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
            var tkMap = getTkMap(TK_NO);

            var HON_TAISYOKU_CD = asStr(row.get('HON_TAISYOKU_CD'));
            var HAI_TAISYOKU_CD = asStr(row.get('HAI_TAISYOKU_CD'));

            if (!HON_TAISYOKU_CD && !HAI_TAISYOKU_CD) {
                continue; // データ読み飛ばし
            }

            var GINKOU_CD = row.get('GINKOU_CD');
            var SHITEN_CD = row.get('SHITEN_CD');

            if (!GINKOU_CD) GINKOU_CD = tkMap['GINKOU_CD'];
            if (!SHITEN_CD) SHITEN_CD = tkMap['SHITEN_CD'];

            // ---------- 本人側 ----------
            if (HON_TAISYOKU_CD) {
                // 本人・預託金
                var HON_YOTAKUKIN_KINGAKU = row.get('HON_YOTAKUKIN_KINGAKU');
                if (HON_YOTAKUKIN_KINGAKU != null && String(HON_YOTAKUKIN_KINGAKU).trim() !== "" && HON_YOTAKUKIN_KINGAKU > 0) {
                    var updHonYotaku = {
                        TK_NO: TK_NO,
                        HON_YOTAKUKIN_SHIHARAI_SDT: warekiToSeireki(row.get('HON_TAIKAI_SEINENGAPI')), // ← 西暦
                        HON_YOTAKUKIN_SHIHARAI_WDT: asStr(row.get('HON_TAIKAI_SEINENGAPI')),           // ← 和暦(原票)
                        HON_YOTAKUKIN: HON_YOTAKUKIN_KINGAKU,
                        HON_YOTAKUKIN_GINKO_CD: asStr(row.get('GINKOU_CD')),
                        HON_YOTAKUKIN_SHITEN_CD: asStr(row.get('SHITEN_CD')),
                        HON_YOTAKUKIN_KOZA_NO: asStr(row.get('KOUZA_NO')),
                        HON_YOTAKUKIN_KOZA_MEIGI: asStr(row.get('SEIKYU_KANA_NM'))
                    };


                    updateShiharai(updHonYotaku);
                    insertCom02(tkMap, SHORI_TUKI, 1, "03", HON_YOTAKUKIN_KINGAKU, row);

                }

                // 本人・弔慰金
                var HON_SHIHARAI_TYOIKIN = row.get('HON_SHIHARAI_TYOIKIN');
                if (HON_SHIHARAI_TYOIKIN != null && String(HON_SHIHARAI_TYOIKIN).trim() !== "") {
                    var updHonChoi = {
                        TK_NO: TK_NO,
                        HON_TYOIKIN_SHIHARAI_SDT: warekiToSeireki(row.get('HON_TAIKAI_SEINENGAPI')),
                        HON_TYOIKIN_SHIHARAI_WDT: asStr(row.get('HON_TAIKAI_SEINENGAPI')),
                        HON_TYOIKIN: HON_SHIHARAI_TYOIKIN,
                        HON_TYOIKIN_GINKO_CD: asStr(row.get('GINKOU_CD')),
                        HON_TYOIKIN_SHITEN_CD: asStr(row.get('SHITEN_CD')),
                        HON_TYOIKIN_KOZA_NO: asStr(row.get('KOUZA_NO')),
                        HON_TYOIKIN_KOZA_MEIGI: asStr(row.get('SEIKYU_KANA_NM'))
                    };
                    updateShiharai(updHonChoi);
                    insertCom02(tkMap, SHORI_TUKI, 3, "05", HON_SHIHARAI_TYOIKIN, row);
                }
            }

            // ---------- 配偶者側 ----------
            if (HAI_TAISYOKU_CD) {
                // 配偶者・預託金
                var HAI_YOTAKUKIN_KINGAKU = row.get('HAI_YOTAKUKIN_KINGAKU');
                if (HAI_YOTAKUKIN_KINGAKU != null && String(HAI_YOTAKUKIN_KINGAKU).trim() !== "" && HAI_YOTAKUKIN_KINGAKU > 0) {
                    var updHaiYotaku = {
                        TK_NO: TK_NO,
                        HAI_YOTAKUKIN_SHIHARAI_SDT: warekiToSeireki(row.get('HAI_TAIKAI_SEINENGAPI')),
                        HAI_YOTAKUKIN_SHIHARAI_WDT: asStr(row.get('HAI_TAIKAI_SEINENGAPI')),
                        HAI_YOTAKUKIN: HAI_YOTAKUKIN_KINGAKU,
                        HAI_YOTAKUKIN_GINKO_CD: asStr(row.get('GINKOU_CD')),
                        HAI_YOTAKUKIN_SHITEN_CD: asStr(row.get('SHITEN_CD')),
                        HAI_YOTAKUKIN_KOZA_NO: asStr(row.get('KOUZA_NO')),
                        HAI_YOTAKUKIN_KOZA_MEIGI: asStr(row.get('SEIKYU_KANA_NM'))
                    };
                    updateShiharai(updHaiYotaku);
                    insertCom02(tkMap, SHORI_TUKI, 2, "04", HAI_YOTAKUKIN_KINGAKU, row);
                }

                // 配偶者・弔慰金  ※フィールド名を「TYOIKIN」で統一（YOU/KI混在対処）
                var HAI_TYOIKIN_KINGAKU = row.get('HAI_TYOIKIN_KINGAKU');
                if (HAI_TYOIKIN_KINGAKU != null && String(HAI_TYOIKIN_KINGAKU).trim() !== "" && HAI_TYOIKIN_KINGAKU > 0) {
                    var updHaiChoi = {
                        TK_NO: TK_NO,
                        HAI_TYOIKIN_SHIHARAI_SDT: warekiToSeireki(row.get('HAI_TAIKAI_SEINENGAPI')),
                        HAI_TYOIKIN_SHIHARAI_WDT: asStr(row.get('HAI_TAIKAI_SEINENGAPI')),
                        HAI_TYOIKIN: HAI_TYOIKIN_KINGAKU,
                        HAI_TYOIKIN_GINKO_CD: asStr(row.get('GINKOU_CD')),
                        HAI_TYOIKIN_SHITEN_CD: asStr(row.get('SHITEN_CD')),
                        HAI_TYOIKIN_KOZA_NO: asStr(row.get('KOUZA_NO')),
                        HAI_TYOIKIN_KOZA_MEIGI: asStr(row.get('SEIKYU_KANA_NM'))
                    };
                    updateShiharai(updHaiChoi);
                    insertCom02(tkMap, SHORI_TUKI, 4, "06", HAI_TYOIKIN_KINGAKU, row);
                }
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

        updateCloseStatus(db, SHORI_TUKI, "06");

    } catch (e) {
        TALON.addErrorMsg(asMessage(e));
    }
}

// 支払テーブル更新（キー設計は運用に合わせて拡張推奨）
function updateShiharai(updateMap) {
    // 可能なら ["TK_NO","SHORI_TUKI"] や 種別カラム（例: SHIHARAI_KBN）もキーに足すと安全
    updateByMapEx(TALON.getDbConfig(), "TK_SHIHARAI", updateMap, ['TK_NO'], false);
}

