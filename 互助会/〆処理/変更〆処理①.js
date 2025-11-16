setHenkoList();

// ========== Orchestrator ==========
function setHenkoList() {
    try {
        var db = TALON.getDbConfig();
        var conditionMap = TALON.getConditionData() || {};
        var lineDataMap = TALON.getTargetData() || {};

        var input = validateInputs(conditionMap);
        if (!input.ok) return; // エラーは内部でaddErrorMsg済み

        var where = { SHORI_TUKI: input.SHORI_TUKI };
        var list = selectList(db, "TK_HENKO2", null, where, null) || [];

        for (var i = 0; i < list.length; i++) {
            var henkoMap = list[i]; // Java Map 想定

            // 1) 空白値を除去（null/undefined/空文字/空白のみを除外）
            var filtered = pickNonBlank(henkoMap);

            // 2) 主キー TK_NO の存在チェック（※空ならスキップ）
            // ★★ ここを get に変更 ★★
            var tkNo = asStr(henkoMap.get("TK_NO"));
            if (!tkNo) {
                TALON.addErrorMsg("TK_HENKO2 の行で TK_NO が空のため更新スキップしました。");
                continue;
            }

            // 主キーは WHERE に必要なので filtered にも保持
            filtered["TK_NO"] = tkNo;

            // 3) 値が何も無ければスキップ（TK_NOのみ=実質更新無しの防止）
            if (Object.keys(filtered).length <= 1) {
                continue;
            }

            // 4) 更新実行：キーは TK_NO 固定
            updateByMapEx(db, "TK_MEMBER", filtered, ["TK_NO"], false);
        }

        // 5) 月締め更新
        updateCloseStatus(db, input.SHORI_TUKI, "02");

    } catch (e) {
        TALON.addErrorMsg(asMessage(e));
    }
}
