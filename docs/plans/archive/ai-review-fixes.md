# AI Review 問題修正計畫

## 目標

修正 `docs/ai-review.md` 中 7 項已確認問題，補齊回歸測試，通過 Unit 與 Integration Test 後提交並推送至 `main`。優惠碼、取消訂單、會員訂單篩選與分頁屬 starter 已知驗收缺口，不納入本次修正。

## 完成項目

1. 移除非測試環境的公開預設管理員憑證，讓環境變數成為必要設定，並安全同步既有 seed 管理員密碼。
2. 訂單詳情以訂單 ID 與目前會員 ID 聯合查詢，補跨會員 404 測試。
3. 購物車 PATCH 與 POST 共用正整數驗證，補小數、零、負數與異常型別測試。
4. 已付款的 QueryTradeInfo 回應必須包含有效 CheckMacValue，並核對 MerchantID。
5. 偏遠地區由伺服器根據收件地址規則判定，不接受客戶端旗標作為計費依據。
6. 免運門檻修正為大於等於 1,500 元，恢復精確邊界測試。
7. 付款狀態查詢加入每會員、每訂單 5 秒冷卻與 429 回應，避免高頻外部查詢。
8. 更新 OpenAPI、使用說明與 `docs/ai-review.md` 修正狀態。

## 驗證結果

- `npm run test:unit`：8 files、65 tests passed
- `npm run test:integration`：1 file、12 tests passed
- `git diff --check`：通過
- 未執行 E2E；測試未修改開發用 `database.sqlite`
