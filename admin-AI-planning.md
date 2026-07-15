# AI Quota & Rate Limit — Planning

> **Phạm vi:** Luồng người dùng **mua gói + chat với AI** (AI local: Ollama/AnythingLLM).
> **Nguyên tắc xuyên suốt:** KHÔNG hardcode — mọi hạn mức (quota) và rate-limit đều **admin cấu hình được**, engine đọc động từ DB.
> **Trạng thái:** Spec + data model đã **CHỐT**. Sẵn sàng triển khai.

---

## 1. Kiến trúc flow (per request)

```
User gửi message
      │
      ▼
Authentication                         → fail: 401
      │
      ▼
Rate Limiter (Redis)                   → vượt: 429
      │                                  (ngưỡng đọc theo gói của user)
      ▼
Quota Reserve (Atomic - DB)            → hết: 402 (gợi ý nâng gói / đợi kỳ sau)
      │   trừ 1 lượt (1 ví duy nhất)
      ▼
AI Runtime
      │   (bên trong có thể gọi LLM 1 lần / 5 lần / nhiều provider)
      │
      ├── Success
      │      └── Ghi Usage Log         (giữ nguyên lượt đã trừ)
      │
      └── Failure (500 / lỗi AI / timeout)
             ├── Rollback Quota        (hoàn 1 lượt — Cách A: trong finally)
             └── Ghi Error Log
```

**1 message = trừ đúng 1 quota**, bất kể AI Runtime bên trong gọi LLM mấy lần / mấy provider.

---

## 2. Business Quota (theo tháng — admin cấu hình per gói)

| Resource | Free | Education | Pro | Enterprise | PlanFeatureKey |
|---|---|---|---|---|---|
| AI Requests | 50 | 500 | 2.000 | Theo hợp đồng | `AI_QUERIES` |
| Projects | 3 | 20 | ∞ | ∞ | `MAX_PROJECTS` |
| Diagrams | 20 | 200 | ∞ | ∞ | `MAX_DIAGRAMS` |
| Export PDF | 10 | 100 | ∞ | ∞ | `EXPORT_PDF` *(mới)* |
| Collaborators | 1 | 5 | 20 | ∞ | `MAX_COLLABORATORS` |

- **AI Request** = tổng số lần gọi AI (chat, sinh sơ đồ, phân tích tài liệu…), **không phân biệt provider**.
- Số liệu trên chỉ là **giá trị seed** — admin sửa được qua UI quản lý gói.
- 3 trạng thái limit: `số ≥ 0` (hạn mức) · `-1` (∞, bỏ qua check) · `null` (**chưa đặt → chặn = 0**; seed bắt buộc có số).

---

## 3. Rate Limit (System Protection — admin cấu hình per gói, ẨN với user)

> Không hiển thị trên bảng giá / phía user. Là thông số kỹ thuật chống spam. Số dưới là **tham khảo**, admin sửa được.

| Plan | Request / 10 giây | Request / phút |
|---|---|---|
| Free | 3 | 10 |
| Education | 8 | 40 |
| Pro | 15 | 100 |
| Enterprise | Tuỳ chỉnh | Tuỳ chỉnh |

- Lưu ở **2 cột trên `Plan`**: `rate_limit_per_10s`, `rate_limit_per_min` (Enterprise `null` = tuỳ chỉnh/không giới hạn).
- Chỉ trả ở `GET /admin/plans`, **ẩn khỏi `GET /plans` public**.

---

## 4. Quyết định đã chốt

| # | Nội dung | Chốt |
|---|---|---|
| Ví quota | **1 ví duy nhất** (bỏ top-up) | ✅ |
| Chu kỳ reset | `reset_at = ngày mua/đổi gói + 30 ngày` (rolling, không theo lịch tháng) | ✅ |
| Reset | **Lazy** — kiểm tra lúc reserve, không cần cron | ✅ |
| Rollback | **Cách A** — reserve trước, lỗi thì `used-=1` trong `finally` | ✅ |
| `null` limit | Coi như **0 (chặn)**; seed phải có số cụ thể | ✅ |
| Hiển thị | Dạng **`used/limit`** (VD 10/20), thanh tô đậm theo tỉ lệ dùng | ✅ |
| Đổi gói (bất kỳ: nâng/hạ/hết hạn) | `used=0`, `limit=gói mới`, `reset_at=now+30d`. Hiển thị full gói mới (Free 3 → Pro 10 = **10**, không phải 13) | ✅ |
| 1 lượt | 1 message của user (không đếm theo số LLM call bên trong) | ✅ |
| **User mới đăng ký** | Ngưỡng theo **gói ACTIVE giá thấp nhất** (động, không hardcode "Free") | ✅ |
| **Admin gọi AI** | KHÔNG bypass rate-limit; **bypass quota** (không 402); request **vẫn ghi log + tính vào tổng lượt** để cuối tháng tính tiền AI | ✅ |
| Admin / user chưa có gói (rate-limit) | Dùng **ngưỡng cao nhất** (max rate-limit các gói) — động | ✅ |
| Rate-limit lưu ở | **Redis** (đếm cửa sổ), ngưỡng lấy từ `Plan` | ✅ |

**"AI thành công" = ** AI trả completion hợp lệ (không rỗng, không exception). Còn lại (rỗng / timeout / HTTP lỗi từ Ollama/AnythingLLM) = **Failure → hoàn lượt**.

---

## 5. Data model

### `plan_features` (đã có — thêm 1 key)
Thêm `EXPORT_PDF` vào `PlanFeatureKey`. Limits object của gói có **5 field**: `projects, diagrams, aiQueries, exportPdf, collaborators`. Engine đọc động (`null`=chặn, `-1`=∞, số=hạn mức).

### `Plan` (thêm 2 cột rate-limit)
```
rate_limit_per_10s  INTEGER  NULL   -- null = tuỳ chỉnh/không giới hạn (Enterprise)
rate_limit_per_min  INTEGER  NULL
```
Có trong `PlanRequest/PlanResponse` (admin) — **ẩn** khỏi public `/plans`.

### `user_quota` (mới — quota AI Requests)
| Cột | Ghi chú |
|---|---|
| `user_id` (PK/FK) | |
| `ai_used` | đã dùng trong kỳ |
| `ai_limit` | snapshot `AI_QUERIES` gói lúc đầu kỳ; `-1` = ∞ (bypass check) |
| `reset_at` | hết kỳ → lazy reset |
| `export_used` | *(nếu Export PDF tính theo tháng)* |

- **Reserve (atomic):**
  `UPDATE user_quota SET ai_used = ai_used + 1 WHERE user_id = ? AND (ai_limit = -1 OR ai_used < ai_limit)` → 0 dòng đổi = **402**.
- **Lazy reset** (gộp trong thao tác trước reserve): nếu `reset_at <= now()` → `ai_used=0`, `ai_limit = AI_QUERIES gói hiện tại`, `reset_at += 30d`.
- **Đổi gói:** `ai_used=0`, `ai_limit=gói mới`, `reset_at=now()+30d`.
- **Rollback:** `ai_used = ai_used - 1` (finally, khi Failure).
- **getOrCreate:** user chưa có subscription → `ai_limit` = `AI_QUERIES` của **gói ACTIVE giá thấp nhất** (`ORDER BY price ASC, created_at ASC LIMIT 1`). Không có gói ACTIVE nào → chặn (limit 0) + cảnh báo admin.

### Redis (rate-limit)
`rl:{userId}:10s` và `rl:{userId}:60s` — `INCR` + `EXPIRE`, so với ngưỡng của gói user (admin/no-plan → `max(rate_limit)`). Vượt → **429**.

### `ai_generation_logs` (đã có)
Giữ nguyên: **1 row / lần gọi LLM** (metrics token/cost/latency). Quota đếm ở `user_quota` (1/message) — **tách biệt** với số row log.

---

## 6. Phạm vi enforcement (tránh nhầm)

Flow phức tạp **rate-limit + reserve/rollback** chỉ áp cho **AI Requests**. Resource khác enforce đơn giản:

| Resource | Cách chặn |
|---|---|
| **AI Requests** | Full flow: rate-limit(429) + quota reserve/rollback(402) |
| **Export PDF** | Đếm `export_used/limit` theo tháng (reset cùng kỳ) — chốt tính theo tháng như AI |
| Projects / Diagrams / Collaborators | Check `count < limit` ngay lúc **tạo** (không rate-limit, không rollback) |

---

## 7. Plan triển khai

### Backend
1. **Migration/entity**
   - `PlanFeatureKey` thêm `EXPORT_PDF`; limits DTO thêm `exportPdf`.
   - `Plan` thêm `rate_limit_per_10s`, `rate_limit_per_min` (+ Request/Response/mapper, ẩn ở public).
   - Seed 4 gói: điền số thật (quota + rate-limit theo §2/§3).
2. **`user_quota`** entity + repository.
3. **QuotaService:** `getOrCreate` (gói thấp nhất) · lazy-reset · `reserve` (atomic → 402) · `rollback` · `resetOnPlanChange`.
4. **RateLimiterService (Redis):** check `10s`/`60s`, ngưỡng theo plan (admin/no-plan → max) → 429.
5. **Ghép vào endpoint chat AI:** Auth → RateLimit → Quota reserve (admin bypass, vẫn log) → Runtime → Success: usage log / Failure: rollback(finally) + error log.
6. **`GET /me/quota`** → `{ used, limit, resetAt }` (đã áp lazy reset).
7. **Hook đổi gói** (mua/nâng/hạ/hết hạn) → `resetOnPlanChange`.
8. **Export PDF** endpoint: check + tăng `export_used`. **Projects/Diagrams/Collaborators:** check `count < limit` lúc tạo (verify chỗ nào đã có).

### Frontend
1. **Admin plan editor:** thêm field limit **Export PDF** + 2 field **rate-limit** (per 10s / per phút) — không đưa lên Pricing public.
2. **User side:** thanh quota `used/limit` + ngày reset; popup **402** ("hết lượt → nâng gói / đợi kỳ sau `resetAt`"); xử lý **429** ("thao tác quá nhanh, thử lại sau").
3. **Pricing:** thêm dòng Export PDF vào matrix (limits đã render động sẵn).

### Migration/seed
- Backfill `user_quota` cho user hiện có (theo gói của họ / gói thấp nhất).

---

## 8. Thứ tự đề xuất
BE #1 (migration + seed) → #2,#3 (quota) → #4 (rate-limit) → #5 (ghép chat) → #6 endpoint → FE.
