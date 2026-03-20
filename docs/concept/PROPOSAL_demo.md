# PROPOSAL

Status: Not started
Type: Main

# 1. TÓM TẮT Ý TƯỞNG (EXECUTIVE SUMMARY)

## 1.1. Bối cảnh (The Context)

Mặc dù tinh thần tương thân tương ái của người Việt Nam luôn bùng nổ mạnh mẽ trong các đợt bão lũ hay biến cố xã hội, mô hình vận hành thiện nguyện hiện tại vẫn mang tính tự phát và phân tán. Những rào cản về logistics, sự phân bổ nguồn lực thiếu đồng đều cùng bài toán minh bạch tài chính đang dần trở thành "nút thắt cổ chai", làm xói mòn niềm tin của cộng đồng.

## 1.2. Vấn đề đặt ra (Problem Statement)

Làm thế nào để thiết kế một hệ sinh thái cứu trợ tức thời, minh bạch, kết nối trực tiếp cung (tài chính, hiện vật, nhân lực) và cầu (người dân, vùng tâm điểm) mà không bị đoản mạch hay phụ thuộc rủi ro vào bất kỳ một tổ chức trung gian hay uy tín của một cá nhân duy nhất?

## 1.3. Giải pháp (The Solution)

Chúng tôi đề xuất một **Nền tảng Crowdsourcing Cứu Trợ (A Charity Marketplace)**. Dự án ứng dụng Trí tuệ Nhân tạo (AI) để chuẩn hóa và kiểm duyệt chiến dịch siêu tốc, tích hợp Bản đồ Cứu trợ trực tuyến (Relief Map) và Hệ thống Tín nhiệm (Credit Score) minh bạch. Đây là một mạng lưới điều phối an toàn, phi tập trung, giúp ghép đôi trực tiếp nguồn lực xã hội đến đúng định vị người cần.

## 1.4. Tác động cốt lõi (Core Impact)

- **Về mặt xã hội:** Số hóa và phi tập trung hóa hệ thống từ thiện. Tái thiết lập lòng tin của công chúng thông qua cơ chế giám sát chéo (crowd-auditing), chấm điểm tín nhiệm công khai và tuân thủ chặt chẽ hành lang pháp lý.
- **Về mặt vận hành:** Triệt tiêu sự lãng phí hệ thống, giải quyết triệt để tình trạng "nơi thừa, nơi thiếu" nhờ khả năng khớp lệnh Logistics thông minh trong "thời điểm vàng" cứu hộ.

---

# 2. PHÂN TÍCH VẤN ĐỀ CHI TIẾT (DEEP DIVE INTO PAIN POINTS)

## 2.1. Hộp đen của sự minh bạch (The Blackbox of Trust)

Đây là rào cản lớn nhất ngăn dòng vốn thiện nguyện. Các nhà hảo tâm đóng góp nhưng luồng tiền và vật phẩm thường rơi vào "hộp đen" – không thể truy xuất nguồn gốc hay kết quả phân bổ. Sự mập mờ trong thu chi dẫn đến khủng hoảng truyền thông, bào mòn niềm tin và thu hẹp đáng kể quy mô đóng góp của toàn xã hội.

## 2.2. Bất đối xứng thông tin Cung - Cầu (Information Asymmetry)

Rất nhiều doanh nghiệp và cá nhân sở hữu nguồn lực (tiền, vật tư, xe cộ) nhưng không định vị được điểm nóng cần cứu trợ thực sự. Ở chiều ngược lại, khu vực bị cô lập lại thiếu một kênh phát tín hiệu SOS đủ tin cậy để tiếp cận luồng viện trợ kịp thời.

## 2.3. Rủi ro tập trung (Single Point of Failure)

Các chiến dịch quyên góp truyền thống thường xoay quanh một vài cá nhân có sức ảnh hưởng (KOLs/Nghệ sĩ). Điều này tạo ra rủi ro "nút thắt cổ chai": khi khối lượng công việc vượt quá năng lực xử lý của một cá nhân, hệ thống sẽ đổ vỡ, kéo theo các hệ lụy nghiêm trọng về sai sót dữ liệu, phân bổ chậm trễ và rủi ro pháp lý (bài học từ các đợt cứu trợ miền Trung trong quá khứ).

## 2.4. Khủng hoảng Logistics (Resource Misallocation)

Sự thiếu vắng một "trung tâm điều phối dữ liệu" dẫn đến hiện tượng "đầu thừa, đuôi thẹo". Điển hình ở các vùng rốn lũ: một xã bị dồn ứ cục bộ hàng ngàn thùng mì tôm nhưng lại khát nước sạch và phao cứu sinh, trong khi các xã lân cận bị cô lập và không có đoàn tiếp cận.

---

# 3. CHÂN DUNG NGƯỜI DÙNG & KHUNG PHÁP LÝ (USER PERSONAS & COMPLIANCE)

Nền tảng xoay quanh 3 nhóm Actor (Chủ thể) chính. Hệ thống không chỉ cung cấp công cụ mà còn đóng vai trò "Legal Assistant" (Trợ lý pháp lý) giúp thao tác của người dùng tự động tuân thủ pháp luật.

## 3.1. Organizers (Người/Tổ chức Khởi tạo Chiến dịch)

Là hạt nhân tạo ra các luồng cứu trợ. Nền tảng sẽ số hóa và hỗ trợ quy trình pháp lý cho họ:

- **Giới hạn an toàn giai đoạn đầu:** Cơ chế sandbox gán giới hạn quy mô đối với số tiền, nhân lực và vật phẩm kêu gọi đối với các Organizer mới để giảm thiểu rủi ro.
- **Quy trình Verify tuân thủ Pháp luật (Nghị định 93/2021/NĐ-CP):** Để mở rộng quy mô (đạt "Tick xanh"), Hệ thống yêu cầu và hướng dẫn upload các chứng từ pháp lý:
    - *Khai báo tự động:* Cung cấp template văn bản thông báo đến UBND cấp xã nơi cư trú về mục đích, phương thức và thời gian vận động.
    - *Tài khoản độc lập:* Bắt buộc liên kết một tài khoản ngân hàng chuyên biệt biệt lập chỉ dùng cho chiến dịch (không dùng chung tài khoản cá nhân).
    - *Cam kết phân phối:* Cung cấp quy trình điền form thông báo văn bản điện tử để phối hợp cùng chính quyền địa phương tại nơi nhận cứu trợ, đảm bảo an ninh trật tự và rà soát đúng đối tượng thụ hưởng.
- **Quy trình Tổ chức Sự kiện Tình nguyện (Nghị định 38/2005/NĐ-CP):**
    - Hỗ trợ xuất các văn bản khai báo an ninh trật tự khi tập trung đông người; lưu ý pháp lý theo luật chuyên ngành (VD: Giấy phép y tế nếu tổ chức khám chữa bệnh miễn phí); và tích hợp danh sách thành viên để Export gửi Công an khai báo tạm trú (Theo Luật Cư trú 2020).

## 3.2. Volunteers (Lực lượng Tình nguyện viên)

- Đóng vai trò thực thi (vận tải, khuân vác, y tế, điều phối online).
- Được cấp hệ thống Tracking điểm kinh nghiệm. Một Volunteer hoạt động tích cực hoàn toàn có đủ uy tín để thăng bậc hoặc đăng ký trực tiếp với ứng dụng để, trở thành tài khoản Organizer mở chiến dịch riêng.

## 3.3. Donors (Mạnh thường quân / Nhà tài trợ)

- Có nhu cầu quan sát "bức tranh toàn cảnh" (Bird-eye view) xem vùng nào đang báo động đỏ (Red zone) để ra quyết định giải ngân.
- Cần sự linh hoạt tối đa trong hình thức đóng góp (Multi-channel donation): Chuyển khoản tiền mặt (QR Code), báo cáo tọa độ kho vật tư quyên góp (chăn màn, áo phao), hoặc chuyển đổi vai trò thành Tình nguyện viên.

---

# 4. KIẾN TRÚC SẢN PHẨM & TÍNH NĂNG CHI TIẾT (PRODUCT ARCHITECTURE)

## 4.1. Core Logic Flows (Luồng Vận Hành Cốt Lõi)

**1. Luồng Organization (Tổ chức điều hành)**

- Số hóa quy trình tạo chiến dịch và đấu nối danh sách người thụ hưởng.
- Cập nhật nhu cầu linh hoạt (Live-update), quản trị nguồn nhân lực hỗ trợ.
- Public hóa dữ liệu thu-chi theo thời gian thực (Real-time Transparency).

**2. Luồng Supporter (Người ủng hộ đa nhiệm)**

- Khám phá các chiến dịch cấp bách qua UI trực quan.
- Tùy chọn đóng góp (Tiền / Hiện vật / Giờ công tình nguyện).
- Tra cứu và truy xuất dòng đời của khoản quyên góp.

**3. Luồng Beneficiary (Người thụ hưởng)**

- Được các Organization đối soát và định danh vào hệ thống.
- Phân luồng ưu tiên nhận hàng và cập nhật mốc trạng thái "Đã nhận viện trợ".

---

## 4.2. Khung Phân Hệ Tính Năng (Feature Modules Breakdown)

### 01 · Onboarding & Trust System (Hệ thống Xác thực & Tín nhiệm)

| Tính năng (Features) | Mô tả nghiệp vụ | User | Phân loại |
| --- | --- | --- | --- |
| Đăng ký Phân quyền | Email/SĐT. Định tuyến flow Tự phát vs Tổ chức ngay từ đầu. | ALL | Khởi tạo |
| Chuẩn hóa Tài khoản (AI-assisted) | Upload giấy tờ → AI bóc tách OCR & pre-check → Admin duyệt cuối. Tùy biến yêu cầu dựa trên loại hình (Tự phát / NGO). | ORG | P2 · V2 |
| Hệ thống Credit Score | Baseline score ban đầu. Thưởng (Rewards) khi hoàn thành chiến dịch. Phạt (Penalties) khi bị report hoặc bỏ ngang dự án. | ALL | P1 · MVP |
| Experience Level | Hệ thống cấp bậc. Ranking cao cho phép trọng số đánh giá uy tín (vote) có sức nặng hơn đối với các tổ chức. | ALL | P2 · V2 |
| Chống Lừa đảo (Anti-Scam) | Report engine. AI phân tích mật độ report → Admin can thiệp. Đóng băng tự động khi rủi ro vượt ngưỡng. | ALL | P1 · MVP |

### 02 · Campaign Management (Quản lý Chiến dịch)

| Tính năng (Features) | Mô tả nghiệp vụ | User | Phân loại |
| --- | --- | --- | --- |
| Lên khuôn Chiến dịch | Xác định: Target, Cơ cấu đóng góp (Tiền/Vật phẩm/Sức người), Deadline, Geolocation, và Media. | ORG | P1 · MVP |
| Nhập liệu tự động (Supporter Check-in) | AI Computer Vision nhận diện ảnh chụp (thùng hàng) → Tự động điền số lượng kiểm kê vào Ledger. | ORG | P2 · V2 |
| Check-in Bắt buộc (Milestones) | Bắt buộc cập nhật định kỳ: Hàng đã nhận, Tiền đã giải ngân kèm bằng chứng. Nếu skip → System vạch cờ đỏ (Red flag). | ORG | P1 · MVP |
| Rút quân & Báo cáo kết thúc | Tự động freeze khi đạt Goal. Auto-trigger gửi báo cáo hoàn thành đến toàn bộ Donors và Volunteers liên quan. | ORG | P1 · MVP |
| Smart Auditing (AI-assisted) | AI tổng hợp biên lai chứng từ thành Báo cáo Thu-Chi quy chuẩn. Tổ chức chỉ cần upload data thô. | ORG | P2 · V2 |

### 03 · Donation System (Cổng Quyên Góp Đa Phương)

| Tính năng (Features) | Mô tả nghiệp vụ | User | Phân loại |
| --- | --- | --- | --- |
| Cash flow (Mock demo MVP) | Tích hợp Payment Gateway (MoMo/VNPay). Yêu cầu ORG verified nếu huy động vượt hạn mức. | DON | P1 · MVP |
| Góp Hiện vật (Goods flow) | Gửi list vật phẩm, chốt tọa độ kho xuất. ORG nghiệm thu hàng qua hệ thống QR Check-in. | DON | P2 · V2 |
| Tracking Dòng tiền (Ledger) | Notification cá nhân hóa. Báo cáo "Đồng tiền của bạn đang làm gì ở đâu?". | DON | P1 · MVP |

### 04 · Volunteer System (Điều phối Tình Nguyện Viên)

| Tính năng (Features) | Mô tả nghiệp vụ | User | Phân loại |
| --- | --- | --- | --- |
| Job Bidding & Tham gia | Đăng ký theo Skill-set (Y tế, Khuân vác, Lái xe, Media) và Booking khung giờ trống. | VOL | P1 · MVP |
| Check-in/out Hiện trường | QR quét tại điểm tập kết. Định lượng "Số giờ tình nguyện" (Work-hours) để chuyển hóa thành Exp. | VOL | P2 · V2 |
| Hồ sơ Năng lực (CV Tình nguyện) | Tổng hợp giờ cống hiến, kỹ năng. Export E-Certificate (Chứng nhận điện tử). | VOL | P2 · V2 |

### 05 · Relief Map (Bản Đồ Cứu Trợ Tác Chiến)

| Tính năng (Features) | Mô tả nghiệp vụ | User | Phân loại |
| --- | --- | --- | --- |
| Heatmap Chiến dịch | Trực quan hóa GPS. Áp dụng hệ màu sinh học (Xanh: Ổn định / Đỏ: Báo động khẩn cấp thiếu hụt). | ALL | P1 · MVP |
| Mạng lưới Kho bãi (Storage Map) | Hiển thị điểm tập kết hàng hóa. Live-update Tồn kho vật tư dự trữ chuẩn bị xuất bến. | ORG/VOL | P2 · V2 |
| Thuật toán Logistics (AI-assisted) | Xử lý bài toán "Kho A dư - Khu B thiếu" → AI gợi ý Route vận tải tối ưu cho đội xe. ORG có quyền Approve. | ORG | P3 |

### 06 · Community Feed (Mạng Lưới Thông Tin Cứu Trợ)

| Tính năng (Features) | Mô tả nghiệp vụ | User | Phân loại |
| --- | --- | --- | --- |
| Timeline Cứu trợ | Bảng tin Live theo dõi tiến độ giải ngân của các chiến dịch hot. | ALL | P1 · MVP |
| Knowledge Sharing | Môi trường chia sẻ cẩm nang sinh tồn, kinh nghiệm tác chiến của cựu VOL/ORG (có tính năng kiểm duyệt bài). | ORG/VOL | P2 · V2 |
| In-context Messaging | Liên lạc khép kín trong ngữ cảnh một campaign (Hỏi thăm đường đi, điểm tập kết) thay vì chat rác tự do. | ALL | P2 · V2 |
| Smart Push Notifications | Bắn thông báo Geofencing (chiến dịch đang thiếu người cách bạn 5km) và cập nhật số dư mục tiêu. | ALL | P1 · MVP |

### 07 · Admin & Moderation (Bảng Điều Khiển Quản Trị)

| Tính năng (Features) | Mô tả nghiệp vụ | User | Phân loại |
| --- | --- | --- | --- |
| Duyệt ORG Tự động | Dashboard duyệt hồ sơ ứng dụng pre-check của AI. Giảm tải sức người cho Moderation team. | Admin | P1 · MVP |
| Tribunal System | Xử lý hàng đợi vi phạm. Freeze accounts vi phạm chính sách khẩn cấp. | Admin | P1 · MVP |
| Credit Override | Quyền can thiệp điểm Uy tín theo cơ chế Logs lưu vết đầy đủ trong các case đặc biệt (có audit). | Admin | P2 · V2 |

---

## 4.3. Các Phân Hệ Trí Tuệ Nhân Tạo (AI Integrations)

Tận dụng API của các nhà tài trợ (OpenRouter/Qwen/Fal.ai) để giải quyết các nút thắt dữ liệu thô:

- **AI Module 1 – Data Intake & Normalization:** RPA bot giúp chuẩn hóa dữ liệu Người thụ hưởng từ file Excel thô/Hình ảnh; xử lý chống trùng lặp (de-duplication) và phân vùng các loại nhu cầu thiết yếu.
- **AI Module 2 – Priority Scoring (Machine Learning):** Mô hình chấm điểm ưu tiên khẩn cấp cho từng Campaign hoặc Danh sách cứu hộ. Scoring dựa trên các Weight (Trọng số): *Mức độ đe dọa sinh mạng, Mức thu nhập vùng, Khả năng được xác minh từ chính quyền*.
- **AI Module 3 – Auto-Transparency Report:** Natural Language Generation (NLG) engine tổng hợp các khoản thu chi phức tạp thành một Báo cáo Minh bạch dạng văn bản chuẩn mực, súc tích chỉ bằng 1 cú click (giảm gánh nặng cho Ban Tổ Chức).

---

# 5. CHIẾN LƯỢC GO-TO-MARKET VÀ TRIỂN KHAI MỞ RỘNG (DEPLOYMENT TIMELINE)

- **Giai đoạn 1: MVP (36-Hour Hackathon Sprint - 03/2026)**
    - Tích hợp 100% tài nguyên để hoàn thiện Khung tính năng **[P1 · MVP]**.
    - *Mục tiêu trình diễn:* Tạo hiệu ứng "WOW" qua Giao diện Dashboard đẹp mắt, luồng tạo Campaign siêu tốc (bằng AI) và Bản đồ cứu trợ (Relief Map) chạy Real-time tương tác mượt mà.
- **Giai đoạn 2: Pilot Local (V2 Launch - Hậu Hackathon)**
    - Cập nhật các module xác thực pháp lý và kiểm duyệt giấy tờ tự động tuân thủ Nghị định 93.
    - Khởi chạy thử nghiệm (Closed Beta) cho một tổ chức sinh viên hoặc hội nhóm thiện nguyện địa phương ứng dụng tính năng quét mã QR tại các điểm cầu.
- **Giai đoạn 3: Skunkworks & National Scale (P3)**
    - Tích hợp lõi AI Machine Learning xử lý bài toán VRP (Vehicle Routing Problem) để phân phối xe tải vận chuyển tối ưu.
    - Phủ rộng các cổng thanh toán e-Wallet, tiến tới kết nối API với khối Cơ quan ban ngành và các Tổ chức phi chính phủ (NGOs).

---

# 6. MÔ HÌNH PHÁT TRIỂN BỀN VỮNG (IMPACT & SUSTAINABILITY)

## 6.1. Chiều sâu Tác động Xã hội (Social ROI)

- **Tái thiết niềm tin:** Tạo ra một văn hóa từ thiện bằng số liệu định lượng minh bạch, dựa trên tính kỷ luật thay vì chỉ bằng lòng trắc ẩn tự phát.
- **Tuân thủ hóa tự động:** Loại bỏ rào cản hành chính rườm rà cho các nhà từ thiện cá nhân bằng cách nhúng trực tiếp luật lệ (Nghị định 93) vào quy trình sử dụng App.
- **Cứu Tế Kịp Thời:** Tối ưu hóa "thời gian vàng" định tuyến hàng hóa, loại bỏ tình trạng chết đói cục bộ ngay cạnh các kho hàng cứu trợ đầy ắp.

## 6.2. Hoạch định Mô hình Kinh doanh (Financial Sustainability)

Dự án duy trì chi phí Server và R&D thông qua 3 luồng doanh thu chiến lược:

1. **Optional Tipping (Mô hình Nền tảng Tự nguyện):** Gợi ý một khoản "Tip" 1%-3% từ các Mạnh thường quân ở khâu Checkout, trích thẳng vào quỹ Vận hành nền tảng (Áp dụng thành công từ GoFundMe & BuyMeACoffee).
2. **Corporate CSR Sponsorships (Hợp tác B2B):** Các tập đoàn/Thương hiệu lớn trả phí để đồng hành (Hiển thị Logo tài trợ, Bao tiêu chi phí các chuyến xe vận tải trên bản đồ Relief Map).
3. **Data-as-a-Service (DaaS):** Cung cấp các gói API dữ liệu (đã được làm sạch và ẩn danh) phục vụ khâu phân tích rủi ro thiên tai, hỗ trợ định hướng chính sách cho Chính phủ hoặc các Tổ chức Nghiên cứu quốc tế.