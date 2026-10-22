# AI Review：訂單、付款、運費與購物車

- 審查日期：2026-10-22
- 審查方式：`security-reviewer` 與 `code-reviewer` 平行靜態審查，`test-runner` 執行 Unit 與 Integration Test
- 審查範圍：訂單、付款、運費、購物車及相關測試
- 原始審查階段限制：只審查與記錄問題，不修改程式碼或測試

## 修正結果（2026-10-22）

本報告的 7 項已確認問題均已修正並加入回歸測試：

- 非測試環境要求明確且至少 12 字元的管理員密碼，拒絕公開測試密碼，並支援 seed 管理員輪替。
- 會員訂單詳情加入 owner 條件，非本人訂單回 404。
- 購物車 PATCH 改用嚴格正整數驗證。
- 已付款回應強制驗證 CheckMacValue，並核對 MerchantID、MerchantTradeNo 與 TradeAmt。
- 偏遠地區由伺服器依收件地址規則判定。
- 1,500 元免運門檻改為 `>=`，原 skipped test 已恢復。
- 付款狀態查詢加入每會員、每訂單 5 秒冷卻與 429 回應。

原審查修正後驗證結果：`npm run test:unit` 為 `8 files / 65 tests passed`；`npm run test:integration` 為 `1 file / 12 tests passed`，無 skipped test。後續 Findings 保留原始審查證據，作為修正前狀態紀錄。Issue A 優惠碼已於後續 Issue #1 完成；Issue B、C 仍待實作。

## 摘要

本次審查原先確認 7 項問題：3 項 High、3 項 Medium、1 項 Low；現已依上節完成修正。另有 3 項 starter 已明示、目前尚未實作的驗收功能缺口，獨立列於後段，避免與既有功能的回歸混淆。

最優先處理的問題是：會員可讀取其他會員完整訂單、公開預設管理員憑證，以及購物車數量可被改成小數並影響金額與庫存。Unit 與 Integration Test 在正常可建立 Supertest listener 的環境皆通過，但現有測試沒有攔住上述問題；運費恰好 1,500 元的邊界測試更被明確 `skip`。

| 嚴重度 | 問題 | 主要影響 |
| --- | --- | --- |
| High | 公開預設管理員憑證 | 可取得所有訂單與收件個資 |
| High | 訂單詳情缺少 owner 條件 | 跨會員訂單與個資外洩 |
| High | 購物車 PATCH 接受小數數量 | 少付貨款、庫存與訂單資料失真 |
| Medium | 已付款回應缺少 CheckMacValue 時仍被接受 | 未完整驗證的付款結果可標記為 paid |
| Medium | 偏遠地區旗標由客戶端決定 | 可規避偏遠地區附加費 |
| Medium | 1,500 元免運門檻判斷錯誤 | 前端顯示免運但後端實際加價 |
| Low | 付款狀態查詢沒有節流 | 可高頻呼叫綠界並耗用服務資源 |

## Findings

### 1. High — 公開預設管理員憑證可存取所有訂單

位置：

- `src/database.js:115-126`
- `.env.example:15-17`
- `docs/README.md:59-65`
- `src/routes/adminOrderRoutes.js:9,90-124,210-230`

觸發情境：使用範例設定首次啟動，且部署者未覆寫 `ADMIN_EMAIL` 或 `ADMIN_PASSWORD`。系統會建立公開文件中列出的固定管理員帳密。管理員帳號建立後，日後只修改環境變數也不會輪替既有密碼。

影響：知道公開預設值的人可取得管理員 JWT，列出與查看所有訂單、收件姓名、Email、地址與交易資訊，並操作其他管理端資源。

證據：`seedAdminUser()` 在環境變數缺失時直接使用固定 fallback；管理員訂單路由在角色驗證通過後可讀取所有訂單。範例設定與文件同時公開相同憑證。

修復方向：非測試環境缺少管理員憑證或使用已知預設值時拒絕啟動；部署時要求高熵密碼，並提供既有管理員帳號的安全輪替流程。固定測試帳密只保留在隔離測試環境。

測試缺口：目前沒有驗證 production-like 環境不得以預設管理員密碼啟動的測試。

### 2. High — 任一登入會員可讀取其他會員完整訂單

位置：

- `src/routes/orderRoutes.js:350-364`
- `src/services/orderService.js:13-26`
- `tests/orders.test.js:110-130`

觸發情境：會員 B 取得會員 A 的訂單 UUID 後，以自己的有效 JWT 呼叫 `GET /api/orders/:id`。

影響：API 會回傳會員 A 的收件姓名、Email、地址、商品明細、金額、`user_id` 與 `merchant_trade_no`，造成個資及交易資料外洩。

證據：路由雖套用 `authMiddleware`，但明細查詢使用只含訂單 ID 條件的 `findOrderById()`。`serializeOrder()` 會展開並回傳完整訂單欄位。相較之下，付款查詢與測試付款端點已使用 `findOrderForUser()` 限制 owner。

修復方向：會員明細改用 `findOrderForUser(req.params.id, req.user.userId)`；查無或非本人訂單一律回 404。管理員查詢繼續走獨立的 admin route。

測試缺口：現有測試只驗證本人取得訂單，應新增兩個會員之間的越權負向案例，並確認不洩漏訂單是否存在。

### 3. High — 購物車 PATCH 接受小數數量，可少付貨款並破壞庫存

位置：

- `src/routes/cartRoutes.js:292-320`
- `src/utils/validators.js:15-17`
- `src/database.js:43-50`
- `src/services/orderService.js:47-59,103-106`
- `tests/cart.test.js:46-56,100-111`

觸發情境：會員或訪客對自己的購物車項目送出 `{ "quantity": 0.5 }`，接著登入並結帳。`true` 也會經 `Number()` 轉成 1；零或負數則通過路由檢查後撞上資料庫 constraint，最後可能成為 500 而不是 400。

影響：小數數量會直接進入小計計算、訂單快照與庫存扣減。偶數商品價格可形成整數付款總額，讓使用者只支付部分商品價格，並使庫存及訂單數量變成小數。

證據：PATCH 僅使用 `Number(quantity)` 並排除 `NaN`，沒有檢查正整數。SQLite 非 STRICT table 的 `INTEGER` affinity 仍可保存 `0.5`，而 `CHECK(quantity > 0)` 會通過。POST 已使用 `parsePositiveInteger()`，PATCH 卻未共用相同驗證。

修復方向：PATCH 與 POST 共用 `parsePositiveInteger()`，在寫入前拒絕小數、零、負數、boolean、陣列及不合法字串；DB 層可再加入 `typeof(quantity) = 'integer'` 約束或採用 STRICT table。

測試缺口：非法數量測試只覆蓋 POST。應為 PATCH 增加小數、零、負數、boolean、陣列與不合法字串案例，並確認統一回傳 400 `VALIDATION_ERROR`。

### 4. Medium — 已付款回應缺少 CheckMacValue 時驗證 fail-open

位置：

- `src/services/paymentService.js:10-27`
- `src/utils/ecpay.js:147-172`
- `src/routes/orderRoutes.js:517-528`
- `tests/integration/order-checkout.integration.test.js:421-453`

觸發情境：QueryTradeInfo 回傳 `TradeStatus=1`、相符的 `MerchantTradeNo` 與 `TradeAmt`，但完全缺少 `CheckMacValue`。

影響：缺少完整性證明的回應仍會被接受，pending 訂單會被標記為 paid。若上游、代理或其他網路信任邊界遭破壞，可能偽造付款成功結果。

證據：簽章驗證條件為 `tradeInfo.CheckMacValue && !verifyCheckMacValue(...)`，所以欄位不存在時直接略過驗證。這與架構文件所述的付款驗證流程不一致。

修復方向：對已付款回應強制要求非空 `CheckMacValue` 且驗證成功；同時核對 `MerchantID`、交易編號、金額與必要欄位。任一欄位缺漏或不符都應維持 pending 並回報驗證失敗。

測試缺口：目前只測錯誤簽章與錯誤金額，應新增「TradeStatus=1 但簽章缺失」及 MerchantID 不符的案例。

### 5. Medium — 偏遠地區附加費由客戶端自行宣告

位置：

- `src/routes/orderRoutes.js:113-155,177-195`
- `src/utils/shipping.js:43-72`

觸發情境：實際配送地址位於偏遠地區，但呼叫建立訂單 API 時傳入 `isRemoteArea: false`。

影響：使用者可規避 200 元偏遠地區附加費，重複造成配送成本損失。後端雖重新計算金額，影響費率的條件仍完全來自不可信的客戶端。

證據：路由只驗證 `isRemoteArea` 的型別，沒有依結構化地址、郵遞區號或物流查詢結果決定偏遠地區；`calculateShipping()` 直接採信該旗標。

修復方向：改由伺服器依結構化配送地點或物流服務結果決定偏遠區旗標與附加費；客戶端欄位只能作為 UI 輸入，不得直接成為最終計費依據。

測試缺口：缺少「客戶端宣告與伺服器地址判定不一致」的運費整合測試。

### 6. Medium — 恰好 1,500 元時後端仍收基本運費

位置：

- `src/utils/shipping.js:39-41`
- `public/js/pages/checkout.js:26-29`
- `tests/shipping.test.js:21-34`

觸發情境：商品小計正好為 1,500 元。

影響：前端顯示免基本運費，後端卻加收宅配 120 元或超商 60 元；訂單與 ECPay 表單會使用後端較高的持久化總額，造成顯示與實際收費不一致。

證據：後端使用 `subtotal > 1500`，前端及文件使用 `subtotal >= 1500`。唯一精確覆蓋 1,500 元邊界的測試被 `it.skip`。

修復方向：後端免運判斷改為 `>=`，恢復該測試，並新增 API／整合測試確認訂單及付款表單金額一致。

測試缺口：`tests/shipping.test.js:29-34` 是本次 Unit Test 唯一 skipped test，且正好遮蔽此缺陷。

### 7. Low — 付款狀態查詢沒有節流

位置：

- `src/routes/orderRoutes.js:496-545`

觸發情境：會員建立一筆 pending 訂單後，高頻重送 `POST /api/orders/:id/check-payment`。

影響：每次請求都立即觸發對綠界的外部查詢，可能耗用服務資源、撞上供應商限制，或影響其他正常付款確認。

證據：路由有 JWT 與訂單歸屬檢查，但沒有每使用者／每訂單 rate limit、冷卻時間或短期快取。

修復方向：按使用者及訂單加入查詢冷卻、短期快取與 rate limit，超限時回 429。

測試缺口：缺少連續高頻查詢與 429 行為測試。

## 修正前 Test Runner 結果（歷史紀錄）

### `npm run test:unit`

- 受限沙箱首次執行：exit code 1。
- 原因：環境禁止 Supertest 綁定本機暫時 listener，出現 `listen EPERM`；這不是應用程式斷言失敗。
- 在允許建立 listener 的執行環境重跑：exit code 0。
- 有效結果：7 個 test files 全數通過，`54 passed / 1 skipped`。
- skipped test：`tests/shipping.test.js:29-34`，即 1,500 元免運邊界案例。

### `npm run test:integration`

- 受限沙箱首次執行：exit code 1。
- 原因：同樣是 Supertest listener 的 `listen EPERM` 環境限制。
- 在允許建立 listener 的執行環境重跑：exit code 0。
- 有效結果：1 個 test file 通過，`10 passed`。

### 測試完整性判讀

- Unit 與 Integration 全綠不代表本報告的問題不存在；現有測試缺少跨會員訂單隔離、付款成功但簽章缺失、購物車 PATCH 非正整數，以及 server-authoritative 偏遠地區判定案例。
- 沒有 tracked 測試在目前工作樹中被刪除或修改。
- 全測試搜尋只發現一個 `skip`，且該測試正好覆蓋已確認的免運門檻問題。
- 本次依要求未執行 E2E；E2E 會使用已啟動的開發服務、寫入開發 DB 並連線綠界 staging。

## Starter 已知驗收缺口

下列 starter 項目有 acceptance tests，但不列為原始 AI Review 的既有功能回歸。`test:unit`、`test:integration` 與 CI 都不會執行 acceptance tests，因此需分別執行指定驗收測試。

### Issue A — 優惠碼（已於 Issue #1 完成）

- 規格測試：`tests/acceptance/coupon.test.js:35-121`
- 完成內容：Coupon 模組集中優惠規則；建單驗證 `couponCode`，保存 `coupon_code`／`discount` 快照，並以折扣後商品小計判斷免運。
- 驗證：`npm run test:acceptance -- coupon`。

### Issue B — 取消訂單與庫存回補尚未實作

- 規格測試：`tests/acceptance/cancel-order.test.js:42-100`
- 現況：沒有 `POST /api/orders/:id/cancel`；orders status constraint 也不包含 `cancelled`。
- 影響：會員無法取消 pending 訂單，系統亦無法原子回補庫存或防止重複回補。

### Issue C — 我的訂單篩選與分頁尚未實作

- 規格測試：`tests/acceptance/order-filter.test.js:33-119`
- 現況：會員訂單列表忽略 `status`、`page`、`limit`，固定回傳所有訂單且沒有 pagination metadata。
- 影響：狀態篩選、參數驗證、limit 上限與穩定分頁排序皆未符合驗收規格。

## 已確認的正向控制

- 購物車 dualAuth 在 Authorization 存在但 token 無效時會直接回 401，不會降級使用 Session。
- 建立訂單只接受 JWT。
- 商品價格與運費金額由伺服器端資料重新計算，不直接接受客戶端傳入的總額。
- 建立訂單、寫入品項、扣庫存與清空購物車位於同一個 SQLite transaction，integration test 也驗證中途失敗會完整 rollback。
- 付款查詢有訂單歸屬限制，並核對交易編號及金額；狀態更新限定 `pending → paid`。
- 相關 SQL 值使用參數綁定。

## 建議處理順序

1. 修正訂單 IDOR，並補跨會員隔離測試。
2. 移除 production 預設管理員憑證，建立輪替流程。
3. 統一購物車 PATCH／POST 的正整數驗證，補齊 DB 約束與負向測試。
4. 付款驗證改為 CheckMacValue 必填且 fail closed。
5. 將偏遠地區判定移至可信的伺服器端規則。
6. 修正 1,500 元免運邊界並取消 skipped test。
7. 加入付款查詢節流，再按課程 Issue 次序完成三項 acceptance 功能。
