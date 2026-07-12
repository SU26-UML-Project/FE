# Phân công công việc — Admin Dashboard (2 người)

> **Nguồn:** [admin-dashboard-planning (2).md](./admin-dashboard-planning%20(2).md)
> **Cập nhật:** 2026-07-08
> **Phạm vi:** Toàn bộ task **KHÔNG tính mảng AI Cost Logging** (task 1–10, 12, 27 → parked, chia sau).
> **Nguyên tắc:** mỗi người tự làm cả **BE + FE** cho tính năng của mình để nắm trọn luồng.

---

## 🤝 Việc chốt chung — làm NGÀY 1 (trước khi tách)

- [ ] Chốt schema bảng `ai_generation_logs` (A dùng cho chart cost, tạm mock tới khi mảng AI chia sau).
- [ ] Chốt **format event SSE** (payload notification) — A xây, mảng AI sau này publish vào.
- [ ] Thống nhất DTO response `overview` + `ai-metrics` (A build BE, B không đụng nhưng cần biết field).

---

## 👤 NGƯỜI A — "Metrics → Chart & Real-time"

**Luồng nắm được:** DB aggregate → API → biểu đồ, và thông báo real-time (SSE/Redis).

### Backend
- [ ] **(P1) Task 11** — `DashboardService` overview: DAU, MAU, MRR, Churn, ARPU, Margin.
  - Nguồn: `User.lastActiveAt`, `Subscription`, `Plan`. Không cần mảng AI.
- [ ] **(P1) Task 13** — `DashboardController`: endpoint `GET /admin/dashboard/overview` + `/ai-metrics`.
- [ ] **(P2) Task 18** — `Notification` entity + bảng `notifications`.
- [ ] **(P2) Task 19** — SSE endpoint `GET /admin/dashboard/events` + Redis Pub/Sub.
- [ ] **(P2) Task 20** — Notification CRUD API (`GET` list, `PATCH /{id}/read`, `PATCH /read-all`) + rate limit (1/type/giờ, CRITICAL 15 phút).
- [ ] **(P3) Task 24** — `Plan.price` DOUBLE → BigDecimal `DECIMAL(10,2)` (ưu tiên `ALTER` preserve data) + `PaymentTransaction.amount`.
- [ ] **(P3) Task 25** — `Plan` thêm field `color`, `popular`, `status`, `yearlyBilling`, `yearlyDiscount`.

### Frontend
- [ ] **(P1) Task 15** — `adminMetricsService` gọi endpoints `overview` + `ai-metrics`.
- [ ] **(P1) Task 16** — `recharts`: line API Latency & Error Rate + bar Chi phí AI theo ngày (split màu provider).
  - ⚠️ Phần cost-by-day cần `ai_generation_logs` → dùng **mock** cho tới khi mảng AI chia.
- [ ] **(P2) Task 21** — NotificationPanel + SSE client (`EventSource`), badge số thật (bỏ hardcode `2`).

---

## 👤 NGƯỜI B — "Data Cleanup, Power Users & Plan"

**Luồng nắm được:** dọn số liệu giả, bảng xếp hạng power-user, quản lý gói cước.

### Backend
- [ ] **(P2) Task 17** — Query Top Cost Drivers (top user theo `SUM(cost_usd)`) + Top Projects (theo số diagram).
  - ⚠️ Top Cost Drivers phụ thuộc `ai_generation_logs` → tạm mock; Top Projects làm được ngay.
- [ ] **(P3) Task 26** — `PlanFeature` entity + bảng `plan_features` (MAX_PROJECTS, MAX_DIAGRAMS, AI_QUERIES, MAX_COLLABORATORS) + CRUD API (no grandfathering).

### Frontend
- [ ] **(P1) Task 14** — Fix `AnalyticsTab` hardcoded (storage `projects*0.15`, trend `+100%`, system health load 12/latency 45ms) + **sửa bug `activeSubscribers`** (dùng tổng count, không count page size=1).
- [ ] **(P1) Task 23** — Implement 3 tab còn placeholder (BE audit đã có sẵn API):
  - [ ] `audit-logs`
  - [ ] `user-activity`
  - [ ] `system-settings`
- [ ] **(P2) Task 22** — Top 5 Users by AI Cost + Top 5 Projects by Diagram (hàng 3 dashboard).
- [ ] **(P3) price CRUD UI (§4.5)** — UI admin sửa giá gói + feature flags.

---

## 📊 Cân bằng tải

| Phase | Người A | Người B |
|---|---|---|
| **P1 (tuần 1–3, ưu tiên cao)** | 4 task (11, 13, 15, 16) | 2 task nhưng nặng (14 + 23 = 3 tab) |
| **P2** | 4 task (18, 19, 20, 21 — gồm SSE khó) | 2 task (17, 22) |
| **P3** | 2 task (24, 25) | 2 task (26, price UI) |

- Người A ôm phần **khó nhất** (SSE/Redis) → nhẹ tải Phase 1.
- Người B bù bằng **khối lượng FE** (dọn hardcode + 3 tab) → cả hai bận đều từ tuần 1.

---

## 🚫 Chưa giao (mảng AI — parked, chia sau)

Task 1–10 (AI cost logging pipeline), 12 (ai-metrics aggregate phần AI), 27 (Anomaly detection + Price-sync cronjob).
