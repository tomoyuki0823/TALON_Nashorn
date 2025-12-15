updateSime();

function updateSime() {

    var db = TALON.getDbConfig();
    var conditionMap = TALON.getConditionData() || {};
    var SHORI_TUKI = conditionMap['SHORI_TUKI']

    var updMap = {

        SHORI_TUKI: SHORI_TUKI,
        SOKIN_FLG: '1'
    }

    // 対象処理年月の〆処理を一括で行う。
    updateByMapEx(db, "GEN0001", updMap, ["SHORI_TUKI"], false);
}