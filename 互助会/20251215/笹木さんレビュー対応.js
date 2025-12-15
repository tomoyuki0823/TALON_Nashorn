zikouKakunin()       // 受診年月日Check
kanyuNenreiCheck()   // 加入日check ＋ 年齢Check
nendoKyufuCheck()    // 年度内重複check　←ここが上手く動きません

// 受診年月日Check
function zikouKakunin() {

    var lineDataMap = TALON.getTargetData();

    var SHORI_TUKI = lineDataMap['SHORI_TUKI'];
    var JUSHIN_DT = lineDataMap['JUSHIN_DT'];
    var GEN_NO = lineDataMap['GEN_NO'];

    if (!GEN_NO || !JUSHIN_DT || JUSHIN_DT.trim() === "") {
        return;
    }

    var JUSHIN_DATE = new Date(JUSHIN_DT);
    var LIMIT_DATE = new Date("2024-03-31");
    var TODAY = new Date();

    if (JUSHIN_DATE > TODAY) {
        TALON.addErrorMsg("会員番号[" + GEN_NO + "]の受診年月日が未来の日付です。");
        TALON.setIsSuccess(false);
        return;
    }

    if (JUSHIN_DATE < LIMIT_DATE) {

        TALON.addErrorMsg("会員番号[" + GEN_NO + "]の受診年月日が2024年3月31日より前です（制度開始前）");
        TALON.setIsSuccess(false);
        return;

    }

    var shoriYear = parseInt(SHORI_TUKI.substring(0, 4), 10);  // YYYY
    var shoriMonth = parseInt(SHORI_TUKI.substring(4, 6), 10);  // MM

    var jushinStr = JUSHIN_DT.split("/").join(""); // "YYYYMMDD"
    var jushinYear = parseInt(jushinStr.substring(0, 4), 10); // YYYY
    var jushinMonth = parseInt(jushinStr.substring(4, 6), 10); // MM

    var monthDiff = (shoriYear - jushinYear) * 12 + (shoriMonth - jushinMonth);

    if (monthDiff >= 37) {

        TALON.addErrorMsg("会員番号[" + GEN_NO + "]は受診年月日から37ヵ月以上経過しています。");
        TALON.setIsSuccess(false);

    }
}





// 空チェック
function hasValue(v) {
    return v !== null && v !== undefined && String(v).trim() !== "";
}

// Date変換（YYYYMMDD または YYYY/MM/DD → Date型）
function toDateFlexible(v) {
    if (!hasValue(v)) return null;

    var s = String(v).trim();

    // パターン1: YYYYMMDD
    if (/^\d{8}$/.test(s)) {
        var y = s.substring(0, 4);
        var m = s.substring(4, 6);
        var d = s.substring(6, 8);
        return new Date(y + "-" + m + "-" + d);
    }

    // パターン2: YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
        return new Date(s.replace(/\//g, "-"));
    }

    return null;
}



function kanyuNenreiCheck() {

    var lineDataMap = TALON.getTargetData();

    var GEN_NO = lineDataMap['GEN_NO'];
    var KANYU_DT_RAW = lineDataMap['GOJYO_KANYU_BI_SEIREKI'];
    var TAIKAI_DT_RAW = lineDataMap['GOJYO_TAIKAI_SEIREKI'];
    var BIRTH_RAW = lineDataMap['BIRTH_SEIREKI'];
    var JUSHIN_DT_RAW = lineDataMap['JUSHIN_DT'];

    // Date型に変換
    var TAIKAI_DT = toDateFlexible(TAIKAI_DT_RAW);
    var JUSHIN_DT = toDateFlexible(JUSHIN_DT_RAW);
    var BIRTH = toDateFlexible(BIRTH_RAW);

    // ---------------------------
    // ① 加入日がない → 登録NG
    // ---------------------------
    if (!hasValue(KANYU_DT_RAW)) {
        TALON.addErrorMsg("会員番号[" + GEN_NO + "]の加入日が不明のため登録できません。");
        TALON.setIsSuccess(false);
        return;
    }

    // ---------------------------------------
    // ② 退会日が存在する場合、受診年月日との比較
    // ---------------------------------------
    if (TAIKAI_DT instanceof Date && !isNaN(TAIKAI_DT.getTime())) {

        if (!(JUSHIN_DT instanceof Date) || isNaN(JUSHIN_DT.getTime())) {
            TALON.addErrorMsg("受診年月日（JUSHIN_DT）が不正です。");
            TALON.setIsSuccess(false);
            return;
        }

        // 退会日 < 受診日 → NG
        if (TAIKAI_DT < JUSHIN_DT) {
            TALON.addErrorMsg(
                "会員番号[" + GEN_NO + "]は受診日[" + JUSHIN_DT_RAW + "]時点で退会済みです。"
            );
            TALON.setIsSuccess(false);
            return;
        }
    }

    // -------------------------------
    // ③ 生年月日チェック（40歳未満NG）
    // -------------------------------
    if (!(BIRTH instanceof Date) || isNaN(BIRTH.getTime())) {
        TALON.addErrorMsg(
            "会員番号[" + GEN_NO + "]の生年月日が不正です。"
        );
        TALON.setIsSuccess(false);
        return;
    }

    var diff = Date.now() - BIRTH.getTime();
    var age = new Date(diff).getUTCFullYear() - 1970;

    if (age < 40) {
        TALON.addErrorMsg(
            "会員番号[" + GEN_NO + "]は40歳未満の会員です。"
        );
        TALON.setIsSuccess(false);
        return;
    }
}



function nendoKyufuCheck() {

    var lineDataMap = TALON.getTargetData();

    var GEN_NO = lineDataMap['GEN_NO'];
    var MUZYOUKEN = lineDataMap['MUZYOUKEN'];
    var KAIKEI_NENDO = lineDataMap['KAIKEI_NENDO'];
    var KYUFU_DVS = lineDataMap['KYUFU_DVS'];

    // 無条件フラグ 1 の場合、そのまま登録
    if (MUZYOUKEN == '1') {
        TALON.setIsSuccess(true);
        return;
    }

    // 重複チェックSQL
    var sql = ""
        + "SELECT COUNT(*) AS CNT "
        + "FROM GEN0001 "
        + "WHERE GEN_NO = '" + GEN_NO + "' "
        + "AND KAIKEI_NENDO = '" + KAIKEI_NENDO + "' "
        + "AND KYUFU_DVS = '" + KYUFU_DVS + "' "
        // TODO ここが MUZYOKEN がNULLの時に悪さをしている
        // NULLの時には0にする考慮が必要
        // + "AND MUZYOUKEN <> '1' ";
        + "AND COALESCE(MUZYOUKEN, '0') <> '1' ";

    var rs = TalonDbUtil.select(TALON.getDbConfig(), sql);

    // 更新時は1件（自分自身のレコード）のみなら登録OK
    if (TALON.isUpdate()) {
        if (rs[0]['CNT'] == 1) {
            TALON.setIsSuccess(true);
            return;
        }
    }

    // 通常の重複チェック
    if (rs[0]['CNT'] > 0) {
        TALON.addErrorMsg("同一年度内に既に登録があります（無条件を除く）");
        TALON.setIsSuccess(false);
    }
}