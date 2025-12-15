// 登録後に実装
calcKyufugaku()

// 登録前に実装
chk37Month();
chkNenrei40();

function calcKyufugaku() {

    // 給付額の計算
    var lineDataMap = TALON.getTargetData();

    var KENSA_RYO = lineDataMap['KENSA_RYO'];
    var HOJO_GAKU = lineDataMap['HOJO_GAKU'];
    var GENDO_GAKU = lineDataMap['GENDO_GAKU'];
    var KYUFU_GAKU = lineDataMap['KYUFU_GAKU'];

    var kensa = parseFloat(KENSA_RYO) || 0;
    var hojo = parseFloat(HOJO_GAKU) || 0;
    var gendo = parseFloat(GENDO_GAKU) || 0;

    var KOJIN_HUTAN_GAKU = kensa - hojo;
    var KEISANCHI = KOJIN_HUTAN_GAKU / 2;

    var calcValue = Math.floor(KEISANCHI / 100) * 100; // 100円未満切捨て

    KYUFU_GAKU = Math.min(calcValue, gendo); // 限度額と比較

    var shori = lineDataMap['SHORI_TUKI'];
    var genNo = lineDataMap['GEN_NO'];

    // =======================
    // UPDATE 作成
    // =======================

    var sql = ""
        + "UPDATE GEN0001 "
        + "SET KYUFU_GAKU = " + KYUFU_GAKU + " "
        + "WHERE SHORI_TUKI = '" + shori + "' "
        + "AND GEN_NO = '" + genNo + "'";

    // =======================
    // UPDATE 実行
    // =======================
    var count = TalonDbUtil.update(TALON.getDbConfig(), sql);

}

function chk37Month() {

    // 時効(37ヵ月経過)処理
    var lineDataMap = TALON.getTargetData();

    var SHORI_TUKI = lineDataMap['SHORI_TUKI'];
    var JUSHIN_DT = lineDataMap['JUSHIN_DT'];
    var GEN_NO = lineDataMap['GEN_NO'];

    var shoriYear = parseInt(SHORI_TUKI.substring(0, 4), 10);  // YYYY
    var shoriMonth = parseInt(SHORI_TUKI.substring(4, 6), 10);  // MM

    var jushinStr = JUSHIN_DT.replace(/\//g, ""); // "YYYYMMDD"
    var jushinYear = parseInt(jushinStr.substring(0, 4), 10); // YYYY
    var jushinMonth = parseInt(jushinStr.substring(4, 6), 10); // MM

    var monthDiff = (shoriYear - jushinYear) * 12 + (shoriMonth - jushinMonth);

    if (monthDiff >= 37) {
        TALON.addErrorMsg("会員番号[" + GEN_NO + "]は受診年月日から37ヵ月以上経過しています。");

        TALON.setIsSuccess(false);
    }
}

function chkNenrei40() {

    // 年齢チェック（40歳未満登録NG）
    var lineDataMap = TALON.getTargetData();

    var BIRTH = lineDataMap['BIRTH_SEIREKI'];
    var GEN_NO = lineDataMap['GEN_NO'];

    // birthが"YYYYMMDD"なので Date変換
    if (typeof BIRTH === "string" || typeof BIRTH === "number") {
        BIRTH = new Date(String(BIRTH).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"));
    }

    if (BIRTH instanceof Date && !isNaN(BIRTH)) {
        // 年齢計算
        var age = new Date(Date.now() - BIRTH).getUTCFullYear() - 1970;
        // 40歳未満はNG
        TALON.setIsSuccess(age >= 40);

    } else {
        TALON.addErrorMsg("会員番号[" + GEN_NO + "]は40歳未満の会員です");
        TALON.setIsSuccess(false);
    }
}