# Issue #1 結帳優惠碼實作計畫

## 目標

依 Issue #1 實作訂單優惠碼。優惠規則集中於 `src/utils/coupon.js`，由伺服器驗證、計算及持久化，且不修改既有驗收測試。

## 完成項目

1. 建立 Coupon 模組，支援 `FLOWER100`、`SPRING10` 與已失效的 `SUMMER50`。
2. orders 資料表新增 `coupon_code` 與 `discount`，並提供既有資料庫 migration。
3. 建單時先計算商品折扣，再以折扣後商品小計判斷免運；優惠不折抵附加費或運費。
4. 建單回應、會員及管理員訂單列表與詳情回傳優惠碼及折扣快照。
5. 新增 Coupon Unit Test，保留既有 acceptance test 不變。
6. 更新 OpenAPI、架構、功能、測試、AI Review 與變更紀錄文件。

## 驗證結果

- `npm run test:unit`：9 files、80 tests passed、0 skipped
- `npm run test:integration`：1 file、12 tests passed、0 skipped
- `npm run test:acceptance -- coupon`：1 file、10 tests passed、0 skipped
- `npm run openapi`：成功產生 `openapi.json`
- `git diff --check`：通過
- 未執行 E2E；未修改開發用 `database.sqlite` 或指定 acceptance test
