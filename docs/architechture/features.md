# I. USER PIPELINE

**Luồng Organization**

- Tạo chiến dịch
- Import hoặc thêm danh sách người thụ hưởng
- Cập nhật nhu cầu của chiến dịch
- Quản lý người hỗ trợ
- Theo dõi quyên góp và phân phối
- Công khai dữ liệu minh bạch

**Luồng Supporter → vol | donor item | donor**

- Khám phá các chiến dịch
- Xem chi tiết chiến dịch
- Chọn hình thức hỗ trợ
- Gửi quyên góp hoặc đăng ký tham gia
- Theo dõi trạng thái tham gia
- Xem lịch sử đóng góp

**Luồng Beneficiary**

- Được Organization thêm vào hệ thống
- Được Organization xác minh
- Được phân vào đợt hỗ trợ
- Được đánh dấu đã nhận hỗ trợ

# II. FEATURE LISTS

## 01 · Onboarding & Trust System

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Đăng ký tài khoản  | Email / SĐT. Tách biệt flow cá nhân vs tổ chức ngay từ bước đầu | ALL | 4 |  |
| Verified Organization *(AI-assisted)* | Upload giấy tờ → AI đọc & pre-check → Admin duyệt cuối. Phân loại: nhóm tự phát / hội nhóm / NGO → yêu cầu giấy tờ khác nhau theo từng loại | ORG | 3 |  |
| Credit Score | Base score khi đăng ký. Cộng: hoàn thành campaign, nhận đánh giá tốt từ user có điểm cao (experience-weighted). Trừ: báo cáo scam được xác nhận, campaign không hoàn thành không lý do. Hiển thị công khai trên profile | ALL | 3 |  |
| Experience Level | Tích lũy qua hoạt động. User level cao được quyền đánh giá tổ chức (ảnh hưởng credit) | ALL | 4 |  |
| Báo cáo scam | Nút report trên mọi campaign / profile. AI phân loại → Admin xử lý. Tự động freeze campaign khi có nhiều report | ALL | 4 |  |

---

## 02 · Campaign Management

[project_draft_v2.md](attachment:71055427-e548-44f6-9608-bd77f481eb8b:project_draft_v2.md)

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Tạo campaign | Mục tiêu, loại đóng góp (tiền / vật phẩm / nhân lực), thời hạn, vị trí địa lý, ảnh/video | ORG | 1 |  |
| Nhập liệu vật phẩm + checkin **Supporter** | Chụp ảnh thùng hàng → AI nhận diện & điền số lượng tự động vào danh sách hoặc có thể nhập thủ công | ORG | 2 |  |
| Check-in tiến độ | ORG cập nhật định kỳ (bắt buộc): đã nhận bao nhiêu, đã dùng bao nhiêu, ảnh chứng minh. Nếu không cập nhật → hệ thống cảnh báo | ORG | 1 |  |
| Đóng & tổng kết campaign | Khi đủ mục tiêu hoặc hết hạn: tự động đóng, generate báo cáo cuối, thông báo đến DON và VOL đã tham gia | ORG | 1 |  |

---

## 03 · Donation System

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Quyên góp tiền (Mock demo) | Chuyển khoản, MoMo, VNPay. Dưới ngưỡng X → đơn giản. Trên ngưỡng X → bắt buộc verified ORG | DON | 3 |  |
| Quyên góp vật phẩm | DON đăng ký loại vật phẩm, số lượng, địa điểm giao. ORG confirm nhận. QR check-in khi bàn giao | DON | 1 |  |
| Theo dõi đóng góp cá nhân | DON xem lịch sử, tiền đi đâu, campaign cập nhật ra sao. Push thông báo khi có check-in mới | DON | 1 |  |

---

## 04 · Volunteer System

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Đăng ký tình nguyện | VOL chọn campaign, chọn vai trò (đóng gói / vận chuyển / y tế / online), đăng ký khung giờ | VOL | 1 |  |
| Check-in / Check-out  | QR code tại điểm tập kết. Ghi nhận giờ tình nguyện, tích lũy vào experience | VOL | 1 |  |
| Lịch sử tình nguyện | Số giờ, số campaign, kỹ năng đã đóng góp. Có thể export chứng nhận | VOL | 3 |  |

---

## 05 · Relief Map

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Bản đồ campaign | Hiển thị campaign đang chạy theo vị trí. Màu sắc theo mức độ cần hỗ trợ (đủ / đang thiếu / khẩn cấp) | ALL | 2 |  |
| Bản đồ kho vật tư (bàn sau) | Hiển thị điểm tập kết / kho. Tồn kho cập nhật theo check-in của ORG | ORG, VOL | 3 |  |
| Gợi ý phân bổ *(AI-assisted)* | Khi kho A thừa và khu B thiếu → AI gợi ý route vận chuyển tối ưu. Cần xác nhận từ ORG trước khi thực hiện | ORG | 3 |  |

---

## 06 · Community Feed

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Trang chủ (Campaign) | Hiển thị check-in mới nhất, campaign sắp diễn ra, kết quả đã hoàn thành — theo dõi được, không cần vào xem thủ công | ALL | 1 |  |
| Thông báo push | Campaign gần bạn, check-in mới từ campaign đã đóng góp, cảnh báo campaign sắp hết hạn chưa đủ mục tiêu | ALL | 4 |  |

---

## 07 · Admin & Moderation

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Admin Dashboard | Queue các tổ chức chờ verified, AI đã pre-check, Admin chỉ cần quyết định cuối | Admin | 1 |  |
| Xử lý báo cáo scam | Queue report theo mức độ nghiêm trọng. Freeze campaign tạm thời khi đủ ngưỡng báo cáo | Admin | 4 |  |
| Điều chỉnh credit thủ công | Admin có thể override credit trong trường hợp đặc biệt, có log đầy đủ | Admin | 4 |  |

---

# III. AI FEATURES

### AI module 1 – Data Intake & Normalization

Hỗ trợ đọc dữ liệu beneficiary từ file upload, chuẩn hóa trường dữ liệu và nhận diện loại nhu cầu cơ bản.

### AI module 2 – Priority Scoring

Chấm điểm ưu tiên beneficiary dựa trên một số tín hiệu như loại nhu cầu, thu nhập, mức xác minh hoặc hoàn cảnh.

### AI module 3 – Transparency Report Generation

Sinh một đoạn báo cáo ngắn tóm tắt tình hình campaign sau khi có donation và allocation, giúp organization không cần viết tay báo cáo công khai.

---