# Issue #5：我的訂單篩選與分頁

## 目標

- 讓 `GET /api/orders` 支援本人訂單的狀態篩選與分頁。
- 嚴格驗證 `status`、`page`、`limit`，並將 `limit` 上限設為 50。
- 維持既有前端訂單頁可讀取 `data.orders`，同時回傳標準 `pagination` metadata。

## 實作

1. 擴充訂單 service，以使用者與選填狀態計算總筆數並查詢指定頁面。
2. 在會員訂單 route 驗證 query、組合分頁回應並補齊 OpenAPI JSDoc。
3. 擴充 Unit/API Test，涵蓋預設分頁、狀態篩選、上限與無效參數。
4. 更新 FEATURES、ARCHITECTURE、TESTING、CHANGELOG 與既有 AI review 狀態。
5. 重新產生 `openapi.json`，由 `test-runner` 執行 Unit、Integration 與指定 Acceptance Test。

## 邊界

- 不修改後台訂單列表。
- 不修改 `tests/acceptance/order-filter.test.js`。
- 不執行 E2E，不寫入開發用 `database.sqlite`。
- 不合併 PR。

## 驗證結果

- `npm run test:unit`：9 個檔案、82 項測試通過。
- `npm run test:integration`：1 個檔案、12 項測試通過。
- `npm run test:acceptance -- order-filter`：1 個檔案、7 項測試通過。
- 審查後補強 safe integer 與 offset 邊界，極大 `page` 會回 400；OpenAPI 亦明確記錄 `limit` 的截斷行為與錯誤格式。
