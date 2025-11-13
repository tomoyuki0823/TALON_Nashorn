
setInit();

function setInit() {

    var condiMap = TALON.getConditionData();
    var NRHATTYU = condiMap['NRHATTYU'];
    var NRMITSUMORI = condiMap['NRMITSUMORI'];
    var IDSIIRESAKI = condiMap['IDSIIRESAKI'];
    var conn = TALON.getDbConfig();

    var cnt = getDtlCnt(conn, NRHATTYU, IDSIIRESAKI);

    if (0 < cnt) return;

    var hinmokuMapList = getHinmokuMapList(conn, NRHATTYU);

    TalonDbUtil.begin(conn);
    for (var i = 0; i < hinmokuMapList.length; i++) {

        var hinmokuMap = hinmokuMapList[i];
        var IDHINMOKU = hinmokuMap['IDHINMOKU'];
        var TXHINMOKU = hinmokuMap['TXHINMOKU'];
        var QTHATTYU = hinmokuMap['QTHATTYU'];
        var DTNOUKI = hinmokuMap['DTNOUKI'];

        var insMap = {}
        insMap['NRHATTYU'] = NRHATTYU;
        insMap['NRMITSUMORI'] = NRMITSUMORI;
        insMap['IDSIIRESAKI'] = IDSIIRESAKI;
        insMap['IDHINMOKU'] = IDHINMOKU;
        insMap['TXHINMOKU'] = TXHINMOKU;
        insMap['QTHATTYU'] = QTHATTYU;
        insMap['DTNOUKI'] = DTNOUKI;

        insertByMapEx(conn, "NP_MITSUMORI_DTL", insMap, false)
    }
    TalonDbUtil.commit(conn);
}


function getDtlCnt(conn, NRHATTYU, IDSIIRESAKI) {

    var whereMap = {

        NRHATTYU: NRHATTYU,
        IDSIIRESAKI: IDSIIRESAKI
    }

    return getCount(conn, "NP_MITSUMORI_DTL", whereMap);
}

function getHinmokuMapList(conn, NRHATTYU) {

    var whereMap2 = {

        NRHATTYU: NRHATTYU
    }

    return selectList(conn, "NP_MITSUMORI_HINMOKU", null, whereMap2, null);
}