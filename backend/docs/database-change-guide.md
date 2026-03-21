# Database Change Guide (for Backend Devs)

Tài liệu này hướng dẫn cách chỉnh sửa database schema an toàn cho team backend sử dụng:

- PostgreSQL (local / Supabase / Aiven)
- SQLAlchemy 2.x
- Alembic

## 1. Nguyên tắc bắt buộc

1. Không sửa schema trực tiếp trên production bằng SQL tay nếu thay đổi đó cần được version-control.
2. Mọi thay đổi schema phải đi qua Alembic migration.
3. Mỗi PR thay đổi model DB phải kèm migration file.
4. Migration phải chạy được trên database trống (`upgrade head`) và rollback cơ bản (`downgrade -1`).

## 2. Cấu hình kết nối

Project đọc `DATABASE_URL` từ `backend/.env` (xem `app/core/config.py`).

Ví dụ local:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/lotushack
```

Ví dụ Supabase (khuyên dùng direct connection cho migration):

```env
DATABASE_URL=postgresql+psycopg2://<user>:<url-encoded-password>@<host>:5432/postgres?sslmode=require
```

Lưu ý:

- Nếu password có ký tự đặc biệt (`@`, `:`, `/`, `?`, `#`) thì phải URL-encode.
- Runtime app có thể dùng pooler, nhưng migration nên ưu tiên direct connection để tránh lỗi DDL.

## 3. Quy trình chuẩn khi đổi schema

### Bước 1: sửa model

Sửa các file trong:

- `app/models/*`
- `app/schemas/*` (nếu API response/request đổi theo schema mới)
- `scripts/seed_demo_data.py` (nếu seed cần dữ liệu cho field mới)

### Bước 2: tạo migration

```bash
cd backend
source .venv/bin/activate
alembic revision --autogenerate -m "add_xxx_field_to_yyy"
```

Sau khi tạo, file nằm ở `backend/alembic/versions/`.

### Bước 3: review migration thủ công

Bắt buộc kiểm tra file migration trước khi chạy:

1. `upgrade()` có đúng SQL mong muốn không.
2. `downgrade()` có thể rollback hợp lý không.
3. Các thay đổi ENUM/NOT NULL/default có an toàn dữ liệu không.
4. Không drop nhầm bảng/cột quan trọng.

### Bước 4: chạy migration

```bash
alembic upgrade head
```

### Bước 5: test rollback nhanh

```bash
alembic downgrade -1
alembic upgrade head
```

Nếu rollback không cần hỗ trợ (một số migration dữ liệu phức tạp), phải ghi rõ trong PR description.

## 4. First migrate lên Supabase (database mới)

1. Set `DATABASE_URL` trong `backend/.env` sang Supabase direct connection.
2. Chạy:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
python -m scripts.seed_demo_data
```

3. Kiểm tra revision hiện tại:

```bash
alembic current
alembic heads
```

Hai lệnh trên cần trỏ về cùng head revision.

## 5. Trường hợp database đã có schema sẵn

Nếu DB đã có schema thủ công từ trước, không chạy `upgrade head` ngay.

Flow an toàn:

1. Backup schema/data.
2. So sánh schema hiện tại với migrations.
3. Nếu schema thực tế tương đương head hiện tại, dùng:

```bash
alembic stamp head
```

`stamp` chỉ đánh dấu version, không chạy SQL migration.

## 6. Lệnh hay dùng

```bash
# revision hiện tại
alembic current

# danh sách lịch sử migration
alembic history --verbose

# tạo migration mới
alembic revision --autogenerate -m "message"

# migrate lên mới nhất
alembic upgrade head

# rollback 1 bước
alembic downgrade -1
```

## 7. Lỗi thường gặp và cách xử lý

### `password authentication failed`

- Sai username/password trong `DATABASE_URL`.
- Password có ký tự đặc biệt nhưng chưa URL-encode.

### `type "...enum..." already exists`

- Thường do DB không clean hoặc migration cũ đã tạo enum.
- Kiểm tra lịch sử migration và trạng thái revision (`alembic current`).
- Với DB mới: reset schema rồi migrate lại từ đầu.
- Với DB đang chạy thật: chuẩn hóa bằng migration sửa enum hoặc `stamp` đúng trạng thái.

### Alembic chạy vào sai DB

- Kiểm tra `backend/.env` đang trỏ đúng môi trường chưa.
- Nhớ `alembic/env.py` đang override URL bằng `settings.DATABASE_URL`.

## 8. Checklist trước khi mở PR

1. Có migration file mới tương ứng thay đổi model.
2. `alembic upgrade head` chạy pass trên local DB sạch.
3. `alembic downgrade -1` và `upgrade head` chạy pass (hoặc có giải thích rõ lý do không rollback).
4. Seed script được cập nhật nếu cần.
5. README/docs liên quan được cập nhật nếu có thay đổi workflow.

## 9. Ghi chú migration 202603210006

Migration `202603210006_campaign_images_and_volunteer_relation.py` thêm:

- Bảng `campaign_images` để lưu metadata ảnh campaign upload từ API.
- Unique partial index `uq_volunteer_registrations_campaign_user` để mỗi supporter chỉ có tối đa 1 quan hệ volunteer với 1 campaign (khi `user_id` khác null).

Khi merge nhánh có migration này:

```bash
cd backend
alembic upgrade head
```

Nếu deploy môi trường mới, nhớ tạo thư mục upload theo config (`UPLOAD_DIR`) hoặc để app tự tạo khi startup.
