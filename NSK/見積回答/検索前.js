/**
 * NP_MITSUMORI_HINMOKU と既存見積明細を突き合わせ、
 * 差分がある品目だけ NP_MITSUMORI_DTL へ補完登録する。
 */
setInit();

/**
 * 初期処理（品目差分の抽出と明細登録）を実行する。
 */
function setInit() {

    var condiMap = TALON.getConditionData(); // 画面や前段処理から渡された検索条件を取得
    var NRHATTYU = condiMap['NRHATTYU'];     // 発注番号
    var NRMITSUMORI = condiMap['NRMITSUMORI']; // 見積番号
    var IDSIIRESAKI = condiMap['IDSIIRESAKI']; // 仕入先ID
    var conn = TALON.getDbConfig(); // DB接続情報

    var hinmokuMapList = getHinmokuMapList(conn, NRHATTYU); // 発注番号で品目一覧を取得
    var existingDtlMap = getDtlMap(conn, NRHATTYU, IDSIIRESAKI); // 既存明細をIDキーでマップ化

    var insertList = [];
    for (var i = 0; i < hinmokuMapList.length; i++) {

        var hinmokuMap = hinmokuMapList[i];
        var IDHINMOKU = hinmokuMap['IDHINMOKU'];
        var TXHINMOKU = hinmokuMap['TXHINMOKU'];
        var QTHATTYU = hinmokuMap['QTHATTYU'];
        var DTNOUKI = hinmokuMap['DTNOUKI'];

        var existingDtl = existingDtlMap[IDHINMOKU]; // 同じ品目IDの既存明細
        if (!hasDifference(existingDtl, hinmokuMap)) continue; // 差分なしならスキップ

        var insMap = {};
        insMap['NRHATTYU'] = NRHATTYU;
        insMap['NRMITSUMORI'] = NRMITSUMORI;
        insMap['IDSIIRESAKI'] = IDSIIRESAKI;
        insMap['IDHINMOKU'] = IDHINMOKU;
        insMap['TXHINMOKU'] = TXHINMOKU;
        insMap['QTHATTYU'] = QTHATTYU;
        insMap['DTNOUKI'] = DTNOUKI;

        insertList.push(insMap); // 挿入対象リストに追加
    }

    if (insertList.length === 0) return; // 追加対象が無ければ処理終了

    TalonDbUtil.begin(conn); // トランザクション開始
    for (var j = 0; j < insertList.length; j++) {
        insertByMapEx(conn, "NP_MITSUMORI_DTL", insertList[j], false); // 明細テーブルへ登録
    }
    TalonDbUtil.commit(conn); // コミット
}

/**
 * 指定の発注番号・仕入先に紐づく既存見積明細を取得し、品目IDをキーにしたマップで返す。
 *
 * @param {object} conn - DB接続オブジェクト
 * @param {string} NRHATTYU - 発注番号
 * @param {string} IDSIIRESAKI - 仕入先ID
 * @returns {Object.<string, object>} 品目IDをキーにした明細マップ
 */
function getDtlMap(conn, NRHATTYU, IDSIIRESAKI) {

    var whereMap = {
        NRHATTYU: NRHATTYU,
        IDSIIRESAKI: IDSIIRESAKI
    };

    var dtlList = selectList(conn, "NP_MITSUMORI_DTL", null, whereMap, null); // 既存明細を抽出
    var result = {};

    for (var i = 0; i < dtlList.length; i++) {
        var dtl = dtlList[i];
        result[dtl['IDHINMOKU']] = dtl; // 品目IDをキーにマッピング
    }

    return result;
}

/**
 * 既存明細と品目情報に差分があるか判定する。
 *
 * @param {object|null} existingDtl - 既存の明細データ
 * @param {object} hinmokuMap - 品目データ
 * @returns {boolean} 差分があれば true
 */
function hasDifference(existingDtl, hinmokuMap) {

    if (!existingDtl) return true; // 新規品目なら差分あり

    // 品目名、数量、納期のいずれかが異なる場合のみ差分ありと判断
    return existingDtl['TXHINMOKU'] !== hinmokuMap['TXHINMOKU']
        || existingDtl['QTHATTYU'] !== hinmokuMap['QTHATTYU']
        || existingDtl['DTNOUKI'] !== hinmokuMap['DTNOUKI'];
}

/**
 * NP_MITSUMORI_HINMOKU から発注番号に紐づく品目一覧を取得する。
 *
 * @param {object} conn - DB接続オブジェクト
 * @param {string} NRHATTYU - 発注番号
 * @returns {Array<object>} 品目データの配列
 */
function getHinmokuMapList(conn, NRHATTYU) {

    var whereMap2 = {
        NRHATTYU: NRHATTYU
    };

    return selectList(conn, "NP_MITSUMORI_HINMOKU", null, whereMap2, null); // 発注番号で品目一覧を取得
}
