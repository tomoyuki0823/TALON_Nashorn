// ========== Public API ==========
setYotakuKaiinData();

// ========== Orchestrator ==========
function setYotakuKaiinData() {
    try {
        var db = TALON.getDbConfig();
        var conditionMap = TALON.getConditionData() || {};

        var SHORI_TUKI = asStr(conditionMap['SHORI_TUKI']);
        if (!SHORI_TUKI) return;

        // 送金予定日（1回だけ取得）
        var sokinInfo = getSokinInfo(db, SHORI_TUKI);
        var ymd = sokinInfo.ymd;     // "yyyyMMdd"
        var wareki = sokinInfo.wareki; // 数値和暦（5070315 など）

        var where = new java.util.HashMap();
        where.put("SHORI_TUKI", SHORI_TUKI);

        var list = selectList(db, "TK_YOTAKU_RENKEI", null, where, null) || [];

        for (var i = 0; i < list.length; i++) {
            var row = list[i]; // Java Map 前提
            var TK_NO = asStr(row.get('TK_NO'));

            if (!TK_NO) {
                TALON.addErrorMsg("TK_YOTAKU_RENKEI の行で TK_NO が空のため処理スキップしました。");
                continue;
            }

            var tkMap = getTkMap(TK_NO); // 既存の会員マスタ取得ロジック想定

            var HON_TAISYOKU_CD = asStr(row.get('HON_TAISYOKU_CD'));
            var HAI_TAISYOKU_CD = asStr(row.get('HAI_TAISYOKU_CD'));

            // 本人・配偶者どちらも対象外ならスキップ
            if (!HON_TAISYOKU_CD && !HAI_TAISYOKU_CD) {
                continue;
            }

            // 銀行コードは連携データ優先 → TK_MEMBER フォールバック
            var GINKOU_CD = row.get('GINKOU_CD') || tkMap['GINKOU_CD'];
            var SHITEN_CD = row.get('SHITEN_CD') || tkMap['SHITEN_CD'];
            var KOUZA_NO = row.get('KOUZA_NO');
            var SEIKYU_KANA_NM = row.get('SEIKYU_KANA_NM');

            // 本人カナ名の差し替え（資格継続パターン）
            adjustHonKanaForKeizoku(tkMap, row, HAI_TAISYOKU_CD);

            // 預託金金額（null → 0 に揃える）
            var HON_YOTAKUKIN_KINGAKU = normalizeAmount(row.get('HON_SHIHARAI_YOTAKUKIN'));
            var HAI_YOTAKUKIN_KINGAKU = normalizeAmount(row.get('HAI_SHIHARAI_YOTAKUKIN'));

            // ---------- 本人側（退職区分あり） ----------
            if (HON_TAISYOKU_CD) {
                // TK_MEMBER 更新（本人・配偶者の退職CD / 預託金）
                upsertTkForYotaku(HON_TAISYOKU_CD, HAI_TAISYOKU_CD,
                    HON_YOTAKUKIN_KINGAKU, HAI_YOTAKUKIN_KINGAKU,
                    TK_NO);

                // 本人・預託金
                if (hasPositiveAmount(HON_YOTAKUKIN_KINGAKU)) {
                    var updHonYotaku = buildYotakuShiharaiUpdateMap(
                        "HON", TK_NO, ymd, wareki, HON_YOTAKUKIN_KINGAKU,
                        GINKOU_CD, SHITEN_CD, KOUZA_NO, SEIKYU_KANA_NM
                    );
                    updateShiharai(db, updHonYotaku);
                }

                // 配偶者・預託金（※本人側処理のタイミングで一緒に更新）
                if (hasPositiveAmount(HAI_YOTAKUKIN_KINGAKU)) {
                    var updHaiYotaku = buildYotakuShiharaiUpdateMap(
                        "HAI", TK_NO, ymd, wareki, HAI_YOTAKUKIN_KINGAKU,
                        GINKOU_CD, SHITEN_CD, KOUZA_NO, SEIKYU_KANA_NM
                    );
                    updateShiharai(db, updHaiYotaku);
                }

                // COM02（預託金）登録
                insertCom02ForYotaku(tkMap, SHORI_TUKI, HON_YOTAKUKIN_KINGAKU, GINKOU_CD, SHITEN_CD);
            }

            // ---------- 本人・弔慰金 ----------
            if (HON_TAISYOKU_CD === "91") {
                var HON_SHIHARAI_TYOIKIN = normalizeAmount(row.get('HON_SHIHARAI_TYOIKIN'));
                if (hasPositiveAmount(HON_SHIHARAI_TYOIKIN)) {
                    var updHonChoi = buildChoiShiharaiUpdateMap(
                        "HON", TK_NO, ymd, wareki, HON_SHIHARAI_TYOIKIN,
                        GINKOU_CD, SHITEN_CD, KOUZA_NO, SEIKYU_KANA_NM
                    );

                    var updTkHonChoi = {
                        TK_NO: TK_NO,
                        HON_SHIHARAI_TYOIKIN: HON_SHIHARAI_TYOIKIN
                    };

                    updateTK(db, updTkHonChoi);
                    updateShiharai(db, updHonChoi);

                    // COM02（本人弔慰金）
                    insertCom02(tkMap, SHORI_TUKI, 3, "05", HON_SHIHARAI_TYOIKIN, {
                        GINKOU_CD: GINKOU_CD,
                        SHITEN_CD: SHITEN_CD
                    });
                }
            }

            // ---------- 配偶者・弔慰金 ----------
            if (HAI_TAISYOKU_CD === "91") {
                var HAI_TYOIKIN_KINGAKU = normalizeAmount(row.get('HAI_SHIHARAI_TYOIKIN'));
                if (hasPositiveAmount(HAI_TYOIKIN_KINGAKU)) {
                    var updHaiChoi = buildChoiShiharaiUpdateMap(
                        "HAI", TK_NO, ymd, wareki, HAI_TYOIKIN_KINGAKU,
                        GINKOU_CD, SHITEN_CD, KOUZA_NO, SEIKYU_KANA_NM
                    );

                    var updTkHaiChoi = {
                        TK_NO: TK_NO,
                        HAI_SHIHARAI_TYOIKIN: HAI_TYOIKIN_KINGAKU
                    };

                    updateTK(db, updTkHaiChoi);
                    updateShiharai(db, updHaiChoi);

                    // COM02（配偶者弔慰金）
                    insertCom02(tkMap, SHORI_TUKI, 4, "06", HAI_TYOIKIN_KINGAKU, {
                        GINKOU_CD: GINKOU_CD,
                        SHITEN_CD: SHITEN_CD
                    });
                }
            }

            // ---------- TK_MEMBER の一括更新（元データ側の項目） ----------
            var filtered = pickNonBlankToJs(row);
            filtered["TK_NO"] = TK_NO; // 主キーは必須

            if (Object.keys(filtered).length > 1) {
                updateByMapEx(db, "TK_MEMBER", filtered, ["TK_NO"], false);
            }
        }

        // 月次ステータス「06」へ
        updateCloseStatus(db, SHORI_TUKI, "06");

    } catch (e) {
        TALON.addErrorMsg(asMessage(e));
    }
}

// ========== Domain Logic ==========

/**
 * 本人カナ名の差し替え（資格継続パターン）
 * ・配偶者カナ＋退職CD=99 のとき本人カナを配偶者に差し替え
 *   それ以外は請求名で上書き
 */
function adjustHonKanaForKeizoku(tkMap, row, HAI_TAISYOKU_CD) {
    if (tkMap['HAI_KANA_SIMEI'] && HAI_TAISYOKU_CD === '99') {
        // 資格継続：本人名 ← 配偶者カナ
        tkMap['HON_KANA_SIMEI'] = row.get('HAI_KANA_SIMEI');
    } else {
        // 資格継続以外：本人名 ← 請求名カナ
        tkMap['HON_KANA_SIMEI'] = asStr(row.get('SEIKYU_KANA_NM'));
    }
}

/**
 * TK_MEMBER の預託金・退職区分を更新
 */
function upsertTkForYotaku(HON_TAISYOKU_CD, HAI_TAISYOKU_CD,
    HON_YOTAKUKIN_KINGAKU, HAI_YOTAKUKIN_KINGAKU,
    TK_NO) {

    var updTkMap = { TK_NO: TK_NO };

    if (hasPositiveAmount(HON_YOTAKUKIN_KINGAKU)) {
        updTkMap['HON_SHIHARAI_YOTAKUKIN'] = HON_YOTAKUKIN_KINGAKU;
    }
    if (hasPositiveAmount(HAI_YOTAKUKIN_KINGAKU)) {
        updTkMap['HAI_SHIHARAI_YOTAKUKIN'] = HAI_YOTAKUKIN_KINGAKU;
    }
    if (HON_TAISYOKU_CD) {
        updTkMap['HON_TAISYOKU_CD'] = HON_TAISYOKU_CD;
    }
    if (HAI_TAISYOKU_CD) {
        updTkMap['HAI_TAISYOKU_CD'] = HAI_TAISYOKU_CD;
    }

    if (Object.keys(updTkMap).length > 1) {
        updateTK(TALON.getDbConfig(), updTkMap);
    }
}

/**
 * COM02（預託金）登録
 * ・区分やCOM_02内の種別は既存 insertCom02 の仕様に委譲
 */
function insertCom02ForYotaku(tkMap, SHORI_TUKI, HON_YOTAKUKIN_KINGAKU, GINKOU_CD, SHITEN_CD) {
    if (!hasPositiveAmount(HON_YOTAKUKIN_KINGAKU)) return;

    insertCom02(tkMap, SHORI_TUKI, 1, "03", HON_YOTAKUKIN_KINGAKU, {
        GINKOU_CD: GINKOU_CD,
        SHITEN_CD: SHITEN_CD
    });
}

// ========== TK_SHIHARAI マップ生成 ==========

/**
 * 預託金支払用 TK_SHIHARAI 更新マップ生成
 * prefix: "HON" or "HAI"
 */
function buildYotakuShiharaiUpdateMap(
    prefix,
    TK_NO,
    ymd,
    wareki,
    amount,
    GINKOU_CD,
    SHITEN_CD,
    KOUZA_NO,
    SEIKYU_KANA_NM
) {
    var p = prefix.toUpperCase();
    var m = { TK_NO: TK_NO };

    m[p + "_YOTAKUKIN_SHIHARAI_SDT"] = ymd;
    m[p + "_YOTAKUKIN_SHIHARAI_WDT"] = wareki;
    m[p + "_YOTAKUKIN"] = amount;
    m[p + "_YOTAKUKIN_GINKO_CD"] = asStr(GINKOU_CD);
    m[p + "_YOTAKUKIN_SHITEN_CD"] = asStr(SHITEN_CD);
    m[p + "_YOTAKUKIN_KOZA_NO"] = asStr(KOUZA_NO);
    m[p + "_YOTAKUKIN_KOZA_MEIGI"] = asStr(SEIKYU_KANA_NM);

    return m;
}

/**
 * 弔慰金支払用 TK_SHIHARAI 更新マップ生成
 * prefix: "HON" or "HAI"
 */
function buildChoiShiharaiUpdateMap(
    prefix,
    TK_NO,
    ymd,
    wareki,
    amount,
    GINKOU_CD,
    SHITEN_CD,
    KOUZA_NO,
    SEIKYU_KANA_NM
) {
    var p = prefix.toUpperCase();
    var m = { TK_NO: TK_NO };

    m[p + "_TYOIKIN_SHIHARAI_SDT"] = ymd;
    m[p + "_TYOIKIN_SHIHARAI_WDT"] = wareki;
    m[p + "_TYOIKIN"] = amount;
    m[p + "_TYOIKIN_GINKO_CD"] = asStr(GINKOU_CD);
    m[p + "_TYOIKIN_SHITEN_CD"] = asStr(SHITEN_CD);
    m[p + "_TYOIKIN_KOZA_NO"] = asStr(KOUZA_NO);
    m[p + "_TYOIKIN_KOZA_MEIGI"] = asStr(SEIKYU_KANA_NM);

    return m;
}

// ========== Repository / DB Access ==========

function updateShiharai(db, updateMap) {
    updateByMapEx(db, "TK_SHIHARAI", updateMap, ['TK_NO'], false);
}

function updateTK(db, updateMap) {
    updateByMapEx(db, "TK_MEMBER", updateMap, ['TK_NO'], false);
}

/**
 * 送金情報取得（予定日 → 西暦・和暦）
 */
function getSokinInfo(db, SHORI_TUKI) {
    var sql = "SELECT * FROM TPIM0004 WHERE YM_ID = '" + SHORI_TUKI + "'";
    var list = TalonDbUtil.select(db, sql) || [];
    if (!list.length) {
        return { ymd: "", wareki: "" };
    }

    var sokinMap = list[0];
    var dateObj = sokinMap['SOKIN_YOTEI_DATE']; // Java Date 型想定

    var ymd = formatDateYYYYMMDD(dateObj);   // "yyyyMMdd"
    var wareki = formatWarekiCustom(dateObj);   // 数値和暦（5070315 など）

    return { ymd: ymd, wareki: wareki };
}

// ========== 共通ユーティリティ ==========

/**
 * null / undefined を 0 にそろえる
 */
function normalizeAmount(v) {
    if (v == null) return 0;
    return v;
}

function hasPositiveAmount(KINGAKU) {
    if (KINGAKU == null) return false;
    return Number(KINGAKU) > 0;
}

function formatDateYYYYMMDD(d) {
    if (!d) return "";
    var sdf = new java.text.SimpleDateFormat("yyyyMMdd");
    return sdf.format(d);
}

/**
 * 和暦数値形式への変換
 * 令和: 先頭 5, 平成: 4, 昭和: 3
 * 例）令和7年3月15日 → 5070315
 */
function formatWarekiCustom(d) {
    if (!d) return "";

    var ymd = formatDateYYYYMMDD(d); // "yyyyMMdd"
    if (!ymd || ymd.length !== 8) return "";

    var year = parseInt(ymd.substring(0, 4), 10);
    var monthDay = ymd.substring(4); // "MMDD"

    // 令和 5xxxxxx（2019/05/01〜）
    if (year > 2019 || (year === 2019 && monthDay >= "0501")) {
        var wYearR = year - 2018; // 令和元年=2019 → 1
        return "5" + zeroPad(wYearR, 2) + monthDay;
    }

    // 平成 4xxxxxx（1989/01/08〜2019/04/30）
    if (year > 1989 || (year === 1989 && monthDay >= "0108")) {
        var wYearH = year - 1988; // 平成元年=1989 → 1
        return "4" + zeroPad(wYearH, 2) + monthDay;
    }

    // 昭和 3xxxxxx（1926/12/25〜1989/01/07）
    if (year > 1926 || (year === 1926 && monthDay >= "1225")) {
        var wYearS = year - 1925; // 昭和元年=1926 → 1
        return "3" + zeroPad(wYearS, 2) + monthDay;
    }

    // 対象外は空文字（必要ならエラー出力も可）
    return "";
}

function zeroPad(n, width) {
    var s = String(n);
    while (s.length < width) s = "0" + s;
    return s;
}
