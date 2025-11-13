setInit();

function setInit() {

    var condiMap = TALON.getConditionData();
    var NRHATTYU = condiMap['NRHATTYU'];
    var NRMITSUMORI = condiMap['NRMITSUMORI'];
    var IDSIIRESAKI = condiMap['IDSIIRESAKI'];
    var conn = TALON.getDbConfig();

    var hinmokuMapList = getHinmokuMapList(conn, NRHATTYU);
    var existingDtlMap = getDtlMap(conn, NRHATTYU, IDSIIRESAKI);

    var insertList = [];
    for (var i = 0; i < hinmokuMapList.length; i++) {

        var hinmokuMap = hinmokuMapList[i];
        var IDHINMOKU = hinmokuMap['IDHINMOKU'];
        var TXHINMOKU = hinmokuMap['TXHINMOKU'];
        var QTHATTYU = hinmokuMap['QTHATTYU'];
        var DTNOUKI = hinmokuMap['DTNOUKI'];

        var existingDtl = existingDtlMap[IDHINMOKU];
        if (!hasDifference(existingDtl, hinmokuMap)) continue;

        var insMap = {};
        insMap['NRHATTYU'] = NRHATTYU;
        insMap['NRMITSUMORI'] = NRMITSUMORI;
        insMap['IDSIIRESAKI'] = IDSIIRESAKI;
        insMap['IDHINMOKU'] = IDHINMOKU;
        insMap['TXHINMOKU'] = TXHINMOKU;
        insMap['QTHATTYU'] = QTHATTYU;
        insMap['DTNOUKI'] = DTNOUKI;

        insertList.push(insMap);
    }

    if (insertList.length === 0) return;

    TalonDbUtil.begin(conn);
    for (var j = 0; j < insertList.length; j++) {
        insertByMapEx(conn, "NP_MITSUMORI_DTL", insertList[j], false);
    }
    TalonDbUtil.commit(conn);
}

function getDtlMap(conn, NRHATTYU, IDSIIRESAKI) {

    var whereMap = {
        NRHATTYU: NRHATTYU,
        IDSIIRESAKI: IDSIIRESAKI
    };

    var dtlList = selectList(conn, "NP_MITSUMORI_DTL", null, whereMap, null);
    var result = {};

    for (var i = 0; i < dtlList.length; i++) {
        var dtl = dtlList[i];
        result[dtl['IDHINMOKU']] = dtl;
    }

    return result;
}

function hasDifference(existingDtl, hinmokuMap) {

    if (!existingDtl) return true;

    return existingDtl['TXHINMOKU'] !== hinmokuMap['TXHINMOKU']
        || existingDtl['QTHATTYU'] !== hinmokuMap['QTHATTYU']
        || existingDtl['DTNOUKI'] !== hinmokuMap['DTNOUKI'];
}

function getHinmokuMapList(conn, NRHATTYU) {

    var whereMap2 = {
        NRHATTYU: NRHATTYU
    };

    return selectList(conn, "NP_MITSUMORI_HINMOKU", null, whereMap2, null);
}
