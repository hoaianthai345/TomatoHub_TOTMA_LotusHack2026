# Project Features Draft

# I. USER PIPELINE

> **Ghi chú về role:**
- **Supporter** là tên gọi chung, gồm: Volunteer (VOL) và Donor (DON). Trong feature list dùng VOL / DON để chỉ rõ từng nhóm.
- **Beneficiary** không có tài khoản trên app. Toàn bộ vòng đời của Beneficiary (thêm, xác minh, phân bổ, đánh dấu đã nhận) được quản lý bởi Organization.
> 

---

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

**Luồng Beneficiary** *(được quản lý bởi Organization, không có tài khoản)*

- Được Organization thêm vào hệ thống
- Được Organization xác minh
- Được phân vào đợt hỗ trợ
- Được đánh dấu đã nhận hỗ trợ

# II. FEATURE LISTS

> **Quy ước ưu tiên:** 1 = cao nhất, 4 = thấp nhất / nice to have
> 

---

## 00 · QR Check-in System *(shared module)*

> Module dùng chung cho cả Donation (vật phẩm) và Volunteer. Build một lần, tái sử dụng ở cả hai luồng.
> 

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Generate QR | Hệ thống tạo QR gắn với từng sự kiện cụ thể: bàn giao vật phẩm hoặc điểm tập kết tình nguyện. QR mã hóa: campaign_id + event_type + timestamp | ORG | 1 |  |
| Scan & xác nhận | Người dùng scan QR → app xác nhận đúng campaign / đúng sự kiện → ghi nhận hành động (nhận hàng / check-in giờ tình nguyện) | DON, VOL | 1 |  |
| Log lịch sử scan | Mỗi lần scan được lưu: ai scan, lúc nào, thuộc campaign nào, loại sự kiện gì. Dùng cho sao kê và lịch sử cá nhân | ALL | 1 |  |

---

## 01 · Onboarding & Trust System

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Đăng ký tài khoản | Email / SĐT. Tách biệt flow cá nhân vs tổ chức ngay từ bước đầu | ALL | 4 |  |
| Verified Organization *(AI-assisted)* | Upload giấy tờ → AI đọc & pre-check → Admin duyệt cuối. Phân loại: nhóm tự phát / hội nhóm / NGO → yêu cầu giấy tờ khác nhau theo từng loại | ORG | 3 |  |
| Credit Score | Base score khi đăng ký. Cộng: hoàn thành campaign, nhận đánh giá tốt từ user có điểm cao (experience-weighted). Trừ: báo cáo scam được xác nhận, campaign không hoàn thành không lý do. Hiển thị công khai trên profile | ALL | 3 |  |
| Experience Level | Tích lũy qua hoạt động. User level cao được quyền đánh giá tổ chức (ảnh hưởng credit) | ALL | 4 |  |
| Báo cáo scam | Nút report trên mọi campaign / profile. AI phân loại → Admin xử lý. Tự động freeze campaign khi có nhiều report | ALL | 4 |  |

---

## 02 · Campaign Management

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Tạo campaign | Mục tiêu, loại đóng góp (tiền / vật phẩm / nhân lực), thời hạn, vị trí địa lý, ảnh/video | ORG | 1 |  |
| Campaign Detail page | Màn hình xem chi tiết campaign: mô tả, tiến độ, danh sách nhu cầu, lịch sử check-in, nút hành động (donate / đăng ký tình nguyện). Dùng chung cho cả ORG lẫn Supporter | ALL | 1 |  |
| Quản lý người hỗ trợ | ORG xem danh sách Donor và Volunteer đã đăng ký, trạng thái từng người (chờ xác nhận / đang tham gia / hoàn thành), có thể confirm hoặc từ chối | ORG | 1 |  |
| Nhập liệu vật phẩm *(AI-assisted)* | Chụp ảnh thùng hàng → AI nhận diện & điền số lượng tự động vào danh sách | ORG | 2 |  |
| Check-in tiến độ | ORG cập nhật định kỳ (bắt buộc): đã nhận bao nhiêu, đã dùng bao nhiêu, ảnh chứng minh. Nếu không cập nhật → hệ thống cảnh báo | ORG | 1 |  |
| Đóng & tổng kết campaign | Khi đủ mục tiêu hoặc hết hạn: tự động đóng, generate báo cáo cuối, thông báo đến DON và VOL đã tham gia | ORG | 1 |  |
| Sao kê tự động *(AI-assisted)* | AI tổng hợp thu-chi thành báo cáo chuẩn, hiển thị công khai. ORG chỉ cần upload chứng từ. Chạy sau khi campaign đóng | ORG | 2 |  |

---

## 03 · Donation System

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Quyên góp tiền (Mock demo) | Chuyển khoản, MoMo, VNPay. Dưới ngưỡng X → đơn giản. Trên ngưỡng X → bắt buộc verified ORG | DON | 3 |  |
| Quyên góp vật phẩm | DON đăng ký loại vật phẩm, số lượng, địa điểm giao. ORG confirm nhận. QR check-in khi bàn giao → dùng module 00 | DON | 1 |  |
| Theo dõi đóng góp cá nhân | DON xem lịch sử, tiền đi đâu, campaign cập nhật ra sao. Push thông báo khi có check-in mới | DON | 1 |  |

---

## 04 · Volunteer System

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Đăng ký tình nguyện | VOL chọn campaign, chọn vai trò (đóng gói / vận chuyển / y tế / online), đăng ký khung giờ | VOL | 1 |  |
| Theo dõi trạng thái đăng ký | VOL xem trạng thái đơn đăng ký: chờ duyệt / được xác nhận / từ chối. Push thông báo khi ORG cập nhật | VOL | 1 |  |
| Check-in / Check-out thực địa | QR code tại điểm tập kết → dùng module 00. Ghi nhận giờ tình nguyện, tích lũy vào experience | VOL | 1 |  |
| Lịch sử tình nguyện | Số giờ, số campaign, kỹ năng đã đóng góp. Có thể export chứng nhận | VOL | 3 |  |

---

## 05 · Beneficiary Management

> Không có UI cho Beneficiary. Toàn bộ module này là công cụ dành cho ORG quản lý người thụ hưởng.
> 

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Import danh sách Beneficiary | ORG upload file (CSV / Excel). AI module 1 chuẩn hóa dữ liệu, nhận diện trường thông tin và loại nhu cầu → xem thêm AI module 1 | ORG | 4 |  |
| Thêm Beneficiary thủ công | ORG thêm từng người: tên, nhu cầu, địa chỉ, ghi chú hoàn cảnh | ORG | 4 |  |
| Xác minh Beneficiary | ORG đánh dấu đã xác minh thông tin (gặp trực tiếp / qua địa phương). Beneficiary chưa xác minh hiển thị cảnh báo khi phân bổ | ORG | 4 |  |
| Chấm điểm ưu tiên *(AI-assisted)* | AI module 2 tự động tính điểm ưu tiên dựa trên loại nhu cầu, mức xác minh, hoàn cảnh. ORG có thể override thủ công | ORG | 4 |  |
| Phân bổ vào đợt hỗ trợ | ORG gán Beneficiary vào đợt cụ thể của campaign. Gợi ý thứ tự theo điểm ưu tiên | ORG | 4 |  |
| Đánh dấu đã nhận hỗ trợ | ORG check-off từng Beneficiary sau khi bàn giao. Dữ liệu này dùng cho sao kê minh bạch | ORG | 4 |  |

---

## 06 · Relief Map

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Bản đồ campaign | Hiển thị campaign đang chạy theo vị trí. Màu sắc theo mức độ cần hỗ trợ (đủ / đang thiếu / khẩn cấp) | ALL | 2 |  |
| Bản đồ kho vật tư (bàn sau) | Hiển thị điểm tập kết / kho. Tồn kho cập nhật theo check-in của ORG | ORG, VOL | 3 |  |
| Gợi ý phân bổ *(AI-assisted)* | Khi kho A thừa và khu B thiếu → AI gợi ý route vận chuyển tối ưu. Cần xác nhận từ ORG trước khi thực hiện | ORG | 3 |  |

---

## 07 · Community Feed

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Trang chủ (Campaign) | Hiển thị check-in mới nhất, campaign sắp diễn ra, kết quả đã hoàn thành — theo dõi được, không cần vào xem thủ công | ALL | 1 |  |
| Thông báo push | Campaign gần bạn, check-in mới từ campaign đã đóng góp, cảnh báo campaign sắp hết hạn chưa đủ mục tiêu | ALL | 4 |  |

---

## 08 · Admin & Moderation

| Tính năng | Mô tả | User | Ưu tiên | Tiến độ |
| --- | --- | --- | --- | --- |
| Admin Dashboard | Queue các tổ chức chờ verified, AI đã pre-check, Admin chỉ cần quyết định cuối | Admin | 1 |  |
| Xử lý báo cáo scam | Queue report theo mức độ nghiêm trọng. Freeze campaign tạm thời khi đủ ngưỡng báo cáo | Admin | 4 |  |
| Điều chỉnh credit thủ công | Admin có thể override credit trong trường hợp đặc biệt, có log đầy đủ | Admin | 4 |  |

---

# III. AI FEATURES

### AI module 1 – Data Intake & Normalization

Hỗ trợ đọc dữ liệu beneficiary từ file upload, chuẩn hóa trường dữ liệu và nhận diện loại nhu cầu cơ bản.
→ *UI tương ứng: 05 · Import danh sách Beneficiary*

### AI module 2 – Priority Scoring

Chấm điểm ưu tiên beneficiary dựa trên một số tín hiệu như loại nhu cầu, thu nhập, mức xác minh hoặc hoàn cảnh.
→ *UI tương ứng: 05 · Chấm điểm ưu tiên*

### AI module 3 – Transparency Report Generation

Sinh một đoạn báo cáo ngắn tóm tắt tình hình campaign sau khi có donation và allocation, giúp organization không cần viết tay báo cáo công khai.
→ *UI tương ứng: 02 · Sao kê tự động*

---