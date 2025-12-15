
// ================== Main ==================
setChoju();

function setChoju() {
    try {
        var db = TALON.getDbConfig();
        var conditionMap = TALON.getConditionData() || {};

        var TYOJU_KINGAKU = 5000; // マスタから取得したい

        var SHORI_TUKI = asStr(conditionMap["SHORI_TUKI"]);
        if (!SHORI_TUKI) return;

        var where = { SHORI_TUKI: SHORI_TUKI };
        var list = selectList(db, "TK_CHOJU_01", null, where, null) || [];


        var sokinMap = getSokinInfo(db, SHORI_TUKI);
        var dateObj = sokinMap['SOKIN_YOTEI_DATE']; // Java Date型

        // ① yyyyMMdd（文字列）
        var shiharaiDt = formatDateYYYYMMDD(dateObj);

        // ② 和暦（数値）
        var shiharaiWdt = formatWarekiCustom(dateObj);



        for (var i = 0; i < list.length; i++) {
            var row = list[i]; // JSオブジェクトとして扱う想定
            var ZOKU = asStr(row["ZOKU"]); // 0=本人, 他=配偶者
            var TK_NO = asStr(row["TK_NO"]);
            if (!TK_NO) continue;

            // TK_MEMBERから生年月日（和暦7桁）
            var whereTk = { TK_NO: TK_NO };
            var tkMap = selectOne(db, "TK_MEMBER", null, whereTk, null) || {};
            var HON_SEINENGAPI = asStr(tkMap["HON_SEINENGAPI"]);
            var HAI_SEINENGAPI = asStr(tkMap["HAI_SEINENGAPI"]);
            adjustHonKanaForKeizoku(tkMap)

            if (ZOKU === "0") {
                var r = judge77or88(HON_SEINENGAPI, SHORI_TUKI);
                if (r.hit === 77) {
                    var upd = {
                        TK_NO: TK_NO,
                        HON_TYOJU_77_SHIHARAI_YOTEI_SDT: shiharaiDt,
                        HON_TYOJU_77_SHIHARAI_YOTEI_WDT: shiharaiWdt,
                        TYOJU_77_HON_SHIHARAI_KINGAKU: TYOJU_KINGAKU,
                        HON_TYOJU_77_GINKO_CD: asStr(row["GINKOU_CD"]),
                        HON_TYOJU_77_SHITEN_CD: asStr(row["SHITEN_CD"]),
                        HON_TYOJU_77_KOZA_NO: asStr(row["KOUZA_NO"]),
                        HON_TYOJU_77_KOZA_MEIGI: asStr(row["KOUZAMEIGI"])
                    };
                    updateShiharai(upd);
                    insertCom02(tkMap, SHORI_TUKI, 5, "07", TYOJU_KINGAKU, row);
                } else if (r.hit === 88) {
                    var upd2 = {
                        TK_NO: TK_NO,
                        HON_TYOJU_88_SHIHARAI_YOTEI_SDT: shiharaiDt,
                        HON_TYOJU_88_SHIHARAI_YOTEI_WDT: shiharaiWdt,
                        TYOJU_88_HON_SHIHARAI_KINGAKU: TYOJU_KINGAKU,
                        HON_TYOJU_88_GINKO_CD: asStr(row["GINKOU_CD"]),
                        HON_TYOJU_88_SHITEN_CD: asStr(row["SHITEN_CD"]),
                        HON_TYOJU_88_KOZA_NO: asStr(row["KOUZA_NO"]),
                        HON_TYOJU_88_KOZA_MEIGI: asStr(row["KOUZAMEIGI"])
                    };
                    updateShiharai(upd2);
                    insertCom02(tkMap, SHORI_TUKI, 6, "09", TYOJU_KINGAKU, row);
                }
            } else {
                var rH = judge77or88(HAI_SEINENGAPI, SHORI_TUKI);
                if (rH.hit === 77) {
                    var upd3 = {
                        TK_NO: TK_NO,
                        HAI_TYOJU_77_SHIHARAI_YOTEI_SDT: shiharaiDt,
                        HAI_TYOJU_77_SHIHARAI_YOTEI_WDT: shiharaiWdt,
                        TYOJU_77_HAI_SHIHARAI_KINGAKU: TYOJU_KINGAKU,
                        HAI_TYOJU_77_GINKO_CD: asStr(row["GINKOU_CD"]),
                        HAI_TYOJU_77_SHITEN_CD: asStr(row["SHITEN_CD"]),
                        HAI_TYOJU_77_KOZA_NO: asStr(row["KOUZA_NO"]),
                        HAI_TYOJU_77_KOZA_MEIGI: asStr(row["KOUZAMEIGI"])
                    };
                    updateShiharai(upd3);
                    insertCom02(tkMap, SHORI_TUKI, 7, "08", TYOJU_KINGAKU, row);
                } else if (rH.hit === 88) {
                    var upd4 = {
                        TK_NO: TK_NO,
                        HAI_TYOJU_88_SHIHARAI_YOTEI_SDT: shiharaiDt,
                        HAI_TYOJU_88_SHIHARAI_YOTEI_WDT: shiharaiWdt,
                        TYOJU_88_HAI_SHIHARAI_KINGAKU: TYOJU_KINGAKU,
                        HAI_TYOJU_88_GINKO_CD: asStr(row["GINKOU_CD"]),
                        HAI_TYOJU_88_SHITEN_CD: asStr(row["SHITEN_CD"]),
                        HAI_TYOJU_88_KOZA_NO: asStr(row["KOUZA_NO"]),
                        HAI_TYOJU_88_KOZA_MEIGI: asStr(row["KOUZAMEIGI"])
                    };
                    updateShiharai(upd4);
                    insertCom02(tkMap, SHORI_TUKI, 8, "10", TYOJU_KINGAKU, row);
                }
            }
        }

        updateCloseStatus(db, SHORI_TUKI);
    } catch (e) {
        TALON.addErrorMsg((e && e.message) ? e.message : String(e));
    }
}


// ================== Domain helpers ==================
// 支払テーブル更新（必要ならキー拡張: ['TK_NO','SHORI_TUKI','KBN'] 等）
function updateShiharai(updateMap) {
    updateByMapEx(TALON.getDbConfig(), "TK_SHIHARAI", updateMap, ["TK_NO"], false);
}

// 締め状態更新
function updateCloseStatus(db, SHORI_TUKI) {
    var updateMap = new Array();

    var lineDataMap = TALON.getTargetData();
    var SIME_STATUS = lineDataMap["SIME_STATUS"];

    if (SIME_STATUS == "06") {
        updateMap["SIME_STATUS"] = "07";
    } else if (SIME_STATUS == "07") {
        updateMap["SIME_STATUS"] = "08";
    }

    updateMap["SHORI_TUKI"] = SHORI_TUKI;
    updateMap["SIME_CHOJU"] = "02";

    updateByMapEx(db, "TK_SIME_01", updateMap, ["SHORI_TUKI"], false);
}

// ---------------------------------------
// 共通関数
// ---------------------------------------
function formatDateYYYYMMDD(d) {
    if (!d) return "";
    var sdf = new java.text.SimpleDateFormat("yyyyMMdd");
    return sdf.format(d);
}

function formatWarekiCustom(d) {
    if (!d) return "";

    var ymd = formatDateYYYYMMDD(d); // "yyyyMMdd"
    var year = parseInt(ymd.substring(0, 4), 10);
    var monthDay = ymd.substring(4); // MMDD

    // 令和（2019/05/01〜）
    if (year > 2019 || (year === 2019 && monthDay >= "0501")) {
        var wYear = year - 2018; // 令和年
        return "5" + zeroPad(wYear, 2) + monthDay;
    }

    // 平成（1989/01/08〜2019/04/30）
    if (year > 1989 || (year === 1989 && monthDay >= "0108")) {
        var wYear = year - 1988;
        return "4" + zeroPad(wYear, 2) + monthDay;
    }

    // 昭和（1926/12/25〜1989/01/07）
    if (year > 1926 || (year === 1926 && monthDay >= "1225")) {
        var wYear = year - 1925;
        return "3" + zeroPad(wYear, 2) + monthDay;
    }

    return ""; // 範囲外
}

function zeroPad(n, width) {
    var s = String(n);
    while (s.length < width) s = "0" + s;
    return s;
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

/**
 * 本人カナ名の差し替え（資格継続パターン）
 * ・配偶者カナ＋退職CD=99 のとき本人カナを配偶者に差し替え
 *   それ以外は請求名で上書き
 */
function adjustHonKanaForKeizoku(tkMap) {

    var HON_TAISYOKU_CD = tkMap['HON_TAISYOKU_CD'];
    var HAI_TAISYOKU_CD = tkMap['HAI_TAISYOKU_CD'];
    var HAI_KANA_SIMEI = tkMap['HAI_KANA_SIMEI'];
    var SEIKYU_KANA_NM = tkMap['SEIKYU_KANA_NM'];

    if (HON_TAISYOKU_CD != "90" && HON_TAISYOKU_CD != "91") {

        return;
    }

    if (HAI_KANA_SIMEI && HAI_TAISYOKU_CD == "99") {

        tkMap['HON_KANA_SIMEI'] = HAI_KANA_SIMEI;

    } else {

        tkMap['HON_KANA_SIMEI'] = SEIKYU_KANA_NM;
    }
}