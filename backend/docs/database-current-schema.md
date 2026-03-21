# Database hiện tại (PostgreSQL)

Tài liệu mô tả schema database hiện tại của backend theo Alembic head:

- **Current head revision**: `202603210008`
- **Engine**: PostgreSQL
- **ORM**: SQLAlchemy 2.x
- **Migration**: Alembic

## 1. Tổng quan schema

Các bảng nghiệp vụ hiện có:

1. `organizations`
2. `users`
3. `campaigns`
4. `beneficiaries`
5. `monetary_donations`
6. `volunteer_registrations`
7. `campaign_checkpoints`
8. `volunteer_attendances`
9. `checkpoint_scan_logs`
10. `goods_checkins`
11. `campaign_images`

Bảng hệ thống migration:

1. `alembic_version`

## 2. Chuỗi migration

1. `202603210001_init_schema`
2. `202603210002_manual_campaign_flow`
3. `202603210003_auth_and_frontend_fields`
4. `202603210004_qr_checkin_flow`
5. `202603210005_goods_checkin_flow`
6. `202603210006_campaign_images_and_volunteer_relation`
7. `202603210007_auth_lifecycle_foundation`
8. `202603210008_add_cancelled_volunteer_status`

## 3. Enum types

1. `campaign_status`: `draft`, `published`, `closed`
2. `beneficiary_status`: `added`, `verified`, `assigned`, `received`
3. `volunteer_status`: `pending`, `approved`, `rejected`, `cancelled`

## 4. Chi tiết bảng

## `organizations`

Mục đích: lưu thông tin tổ chức tạo campaign.

Cột chính:

1. `id` UUID PK
2. `name` VARCHAR(255), unique, not null
3. `description` TEXT, nullable
4. `website` VARCHAR(255), nullable
5. `location` VARCHAR(120), nullable
6. `verified` BOOLEAN, not null, default false
7. `logo_url` VARCHAR(500), nullable
8. `created_at` TIMESTAMPTZ, default `now()`
9. `updated_at` TIMESTAMPTZ, default `now()`

Quan hệ:

1. 1-N với `users` (qua `users.organization_id`)
2. 1-N với `campaigns`
3. 1-N với `beneficiaries`
4. 1-N với `campaign_checkpoints`

## `users`

Mục đích: tài khoản đăng nhập (supporter, organization member, admin).

Cột chính:

1. `id` UUID PK
2. `email` VARCHAR(255), not null
3. `full_name` VARCHAR(255), not null
4. `hashed_password` VARCHAR(255), not null
5. `location` VARCHAR(120), nullable
6. `support_types` JSONB, not null, default `[]`
7. `is_active` BOOLEAN, not null, default true
8. `is_superuser` BOOLEAN, not null, default false
9. `refresh_token_version` INTEGER, not null, default 0
10. `organization_id` UUID FK -> `organizations.id` (on delete set null)
11. `created_at` TIMESTAMPTZ
12. `updated_at` TIMESTAMPTZ

Index/constraint:

1. `ix_users_email` unique (`email`)

Quan hệ:

1. N-1 với `organizations`
2. 1-N với `monetary_donations` (donor)
3. 1-N với `volunteer_registrations`
4. 1-N với `campaign_images` (uploader)
5. 1-N với `goods_checkins` (nullable)
6. 1-N với `checkpoint_scan_logs` (nullable)

## `campaigns`

Mục đích: chiến dịch gây quỹ/tình nguyện.

Cột chính:

1. `id` UUID PK
2. `organization_id` UUID FK -> `organizations.id` (on delete cascade)
3. `title` VARCHAR(255), not null
4. `slug` VARCHAR(255), unique, indexed
5. `short_description` VARCHAR(500), nullable
6. `description` TEXT, nullable
7. `tags` JSONB, not null, default `[]`
8. `cover_image_url` VARCHAR(500), nullable
9. `support_types` JSONB, not null
10. `goal_amount` NUMERIC(12,2), not null
11. `raised_amount` NUMERIC(12,2), not null
12. `province` VARCHAR(120), nullable
13. `district` VARCHAR(120), nullable
14. `address_line` VARCHAR(255), nullable
15. `latitude` NUMERIC(9,6), nullable
16. `longitude` NUMERIC(9,6), nullable
17. `media_urls` JSONB, not null
18. `starts_at` TIMESTAMPTZ, not null
19. `ends_at` TIMESTAMPTZ, nullable
20. `is_active` BOOLEAN, not null
21. `status` `campaign_status`, not null
22. `published_at` TIMESTAMPTZ, nullable
23. `closed_at` TIMESTAMPTZ, nullable
24. `created_at` TIMESTAMPTZ
25. `updated_at` TIMESTAMPTZ

Index/constraint:

1. `ix_campaigns_slug` unique (`slug`)
2. `ix_campaigns_status` (`status`)
3. `ck_campaigns_ends_after_starts`: `ends_at IS NULL OR ends_at > starts_at`

Quan hệ:

1. 1-N với `beneficiaries`
2. 1-N với `monetary_donations`
3. 1-N với `volunteer_registrations`
4. 1-N với `campaign_checkpoints`
5. 1-N với `campaign_images`
6. 1-N với `volunteer_attendances`
7. 1-N với `checkpoint_scan_logs`
8. 1-N với `goods_checkins`

## `beneficiaries`

Mục đích: người nhận hỗ trợ.

Cột chính:

1. `id` UUID PK
2. `organization_id` UUID FK -> `organizations.id` (on delete cascade)
3. `campaign_id` UUID FK -> `campaigns.id` (on delete set null)
4. `full_name` VARCHAR(255), not null
5. `location` VARCHAR(255), nullable
6. `category` VARCHAR(120), not null
7. `story` TEXT, nullable
8. `target_support_amount` NUMERIC(12,2), not null
9. `is_verified` BOOLEAN, not null
10. `status` `beneficiary_status`, not null
11. `created_at` TIMESTAMPTZ

## `monetary_donations`

Mục đích: giao dịch quyên góp tiền.

Cột chính:

1. `id` UUID PK
2. `campaign_id` UUID FK -> `campaigns.id` (on delete cascade)
3. `donor_user_id` UUID FK -> `users.id` (on delete set null)
4. `donor_name` VARCHAR(255), not null
5. `amount` NUMERIC(12,2), not null
6. `currency` VARCHAR(3), default `USD`
7. `payment_method` VARCHAR(50), default `bank_transfer`
8. `note` TEXT, nullable
9. `donated_at` TIMESTAMPTZ

## `volunteer_registrations`

Mục đích: đăng ký tình nguyện theo campaign.

Cột chính:

1. `id` UUID PK
2. `campaign_id` UUID FK -> `campaigns.id` (on delete cascade)
3. `user_id` UUID FK -> `users.id` (on delete set null)
4. `full_name` VARCHAR(255), not null
5. `email` VARCHAR(255), not null
6. `phone_number` VARCHAR(30), nullable
7. `message` TEXT, nullable
8. `status` `volunteer_status`, not null
9. `registered_at` TIMESTAMPTZ

Index/constraint:

1. `uq_volunteer_registrations_campaign_user` unique partial (`campaign_id`, `user_id`) với điều kiện `user_id IS NOT NULL`

Ý nghĩa nghiệp vụ:

1. Một supporter đã link account chỉ có tối đa 1 đăng ký cho mỗi campaign.

## `campaign_checkpoints`

Mục đích: các điểm check-in/check-out QR theo campaign.

Cột chính:

1. `id` UUID PK
2. `campaign_id` UUID FK -> `campaigns.id` (on delete cascade)
3. `organization_id` UUID FK -> `organizations.id` (on delete cascade)
4. `name` VARCHAR(255), not null
5. `checkpoint_type` VARCHAR(50), not null (`volunteer` hoặc `goods` theo logic app)
6. `description` TEXT, nullable
7. `address_line` VARCHAR(255), nullable
8. `latitude` NUMERIC(9,6), nullable
9. `longitude` NUMERIC(9,6), nullable
10. `is_active` BOOLEAN, not null
11. `created_at` TIMESTAMPTZ
12. `updated_at` TIMESTAMPTZ

Index:

1. `ix_campaign_checkpoints_campaign_id`
2. `ix_campaign_checkpoints_organization_id`

## `volunteer_attendances`

Mục đích: phiên điểm danh check-in/check-out tình nguyện viên.

Cột chính:

1. `id` UUID PK
2. `campaign_id` UUID FK -> `campaigns.id` (on delete cascade)
3. `checkpoint_id` UUID FK -> `campaign_checkpoints.id` (on delete cascade)
4. `registration_id` UUID FK -> `volunteer_registrations.id` (on delete cascade)
5. `user_id` UUID FK -> `users.id` (on delete cascade)
6. `check_in_at` TIMESTAMPTZ, not null
7. `check_out_at` TIMESTAMPTZ, nullable
8. `duration_minutes` INTEGER, nullable
9. `created_at` TIMESTAMPTZ
10. `updated_at` TIMESTAMPTZ

Index:

1. `ix_volunteer_attendances_user_campaign` (`user_id`, `campaign_id`)
2. `ix_volunteer_attendances_open_session` (`checkpoint_id`, `user_id`, `check_out_at`)

## `checkpoint_scan_logs`

Mục đích: log toàn bộ lần quét QR (thành công hoặc từ chối).

Cột chính:

1. `id` UUID PK
2. `campaign_id` UUID FK -> `campaigns.id` (on delete cascade)
3. `checkpoint_id` UUID FK -> `campaign_checkpoints.id` (on delete cascade)
4. `registration_id` UUID FK -> `volunteer_registrations.id` (on delete set null)
5. `user_id` UUID FK -> `users.id` (on delete set null)
6. `scan_type` VARCHAR(30) (`check_in` / `check_out` theo logic app)
7. `result` VARCHAR(30) (`success` / `rejected` theo logic app)
8. `message` TEXT, nullable
9. `token_nonce` VARCHAR(64), nullable
10. `scanned_at` TIMESTAMPTZ

Index:

1. `ix_checkpoint_scan_logs_checkpoint_scanned_at` (`checkpoint_id`, `scanned_at`)
2. `ix_checkpoint_scan_logs_user_id` (`user_id`)

## `goods_checkins`

Mục đích: ghi nhận check-in hàng hóa qua checkpoint goods.

Cột chính:

1. `id` UUID PK
2. `campaign_id` UUID FK -> `campaigns.id` (on delete cascade)
3. `checkpoint_id` UUID FK -> `campaign_checkpoints.id` (on delete cascade)
4. `user_id` UUID FK -> `users.id` (on delete set null)
5. `donor_name` VARCHAR(255), not null
6. `item_name` VARCHAR(255), not null
7. `quantity` NUMERIC(12,2), not null
8. `unit` VARCHAR(50), not null
9. `note` TEXT, nullable
10. `checked_in_at` TIMESTAMPTZ

Index:

1. `ix_goods_checkins_campaign_checked_in_at` (`campaign_id`, `checked_in_at`)
2. `ix_goods_checkins_checkpoint_checked_in_at` (`checkpoint_id`, `checked_in_at`)

## `campaign_images`

Mục đích: metadata ảnh upload cho campaign.

Cột chính:

1. `id` UUID PK
2. `campaign_id` UUID FK -> `campaigns.id` (on delete cascade)
3. `uploaded_by_user_id` UUID FK -> `users.id` (on delete set null)
4. `relative_path` VARCHAR(500), not null, unique
5. `original_filename` VARCHAR(255), not null
6. `mime_type` VARCHAR(120), not null
7. `size_bytes` INTEGER, not null
8. `created_at` TIMESTAMPTZ

Index/constraint:

1. `uq_campaign_images_relative_path` unique (`relative_path`)
2. `ix_campaign_images_campaign_id`
3. `ix_campaign_images_uploaded_by_user_id`

## 5. Quan hệ chính (ER tóm tắt)

```text
organizations 1---N users
organizations 1---N campaigns
organizations 1---N beneficiaries
organizations 1---N campaign_checkpoints

campaigns 1---N beneficiaries
campaigns 1---N monetary_donations
campaigns 1---N volunteer_registrations
campaigns 1---N campaign_checkpoints
campaigns 1---N volunteer_attendances
campaigns 1---N checkpoint_scan_logs
campaigns 1---N goods_checkins
campaigns 1---N campaign_images

users 1---N monetary_donations (nullable donor_user_id)
users 1---N volunteer_registrations (nullable user_id)
users 1---N volunteer_attendances
users 1---N checkpoint_scan_logs (nullable user_id)
users 1---N goods_checkins (nullable user_id)
users 1---N campaign_images (nullable uploaded_by_user_id)
```

## 6. Rule dữ liệu quan trọng đang được enforce ở DB

1. `campaigns.ends_at` phải lớn hơn `starts_at` hoặc null.
2. `users.email` là duy nhất.
3. `campaigns.slug` là duy nhất.
4. `campaign_images.relative_path` là duy nhất.
5. Với bản ghi volunteer có `user_id` khác null: duy nhất theo cặp (`campaign_id`, `user_id`).

## 7. Lưu ý cho dev khi chỉnh schema

1. Không sửa DB production thủ công nếu thay đổi đó cần version control.
2. Mọi thay đổi phải đi qua Alembic migration.
3. Tham khảo thêm: `backend/docs/database-change-guide.md`.
