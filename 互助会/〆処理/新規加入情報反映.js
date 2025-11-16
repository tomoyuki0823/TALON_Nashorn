// ========== Public API ==========
setShikiSime();

// ========== Orchestrator ==========
function setShikiSime() {
    try {
        var db           = TALON.getDbConfig();
        var conditionMap = TALON.getConditionData() || {};

        // SHORI_TUKI のバリデーション（共通）
        var input = validateInputs(conditionMap);
        if (!input.ok) return; // エラーは関数内で addErrorMsg 済み

        // 対象月の新規データ取得
        var shinkiList = fetchShinkiList(db, input.SHORI_TUKI);

        // TK_MEMBER 入れ替え（UPSERT相当）
        upsertMembersFromShinkiList(db, shinkiList);

        // 月締め更新：四期締め完了 → "04"
        updateCloseStatus(db, input.SHORI_TUKI, "04");

    } catch (e) {
        TALON.addErrorMsg(asMessage(e));
    }
}

// ========== Queries ==========
function fetchShinkiList(db, SHORI_TUKI) {
    var where = { SHORI_TUKI: SHORI_TUKI };
    var list  = selectList(db, "TK_SHINKI", null, where, null) || [];
    return list;
}

// ========== Domain Ops ==========
function upsertMembersFromShinkiList(db, shinkiList) {
    if (!shinkiList || shinkiList.length === 0) return;

    for (var i = 0; i < shinkiList.length; i++) {
        var shinki = shinkiList[i] || {};
        var tkNo   = asStr(shinki["TK_NO"]);
        if (!tkNo) {
            // 想定外ではあるが、一応スキップ
            TALON.addErrorMsg("TK_SHINKI の行で TK_NO が空のため TK_MEMBER 更新をスキップしました。");
            continue;
        }

        var whereMember = { TK_NO: tkNo };

        // DELETE → INSERT（実質 UPSERT）
        deleteByMapEx(db, "TK_MEMBER", whereMember, ["TK_NO"], false);
        insertByMapEx(db, "TK_MEMBER", shinki, false);
    }
}
