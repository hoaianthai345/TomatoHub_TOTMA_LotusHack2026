# Brainstorm

Person: HoàiAn Thái
Status: Done
Type: Concept

# I. USER CHÍNH

- ORGANIZATION
- DONOR
- VOLUNTEER

# II. PROBLEMS CẦN GIẢI QUYẾT

1. CỘNG ĐỒNG RỜI RẠC 
2. **VIỆC QUYÊN GÓP THIẾU MINH BẠCH**
3. THÔNG TIN CHẬM TRỄ, KHÔNG PHẢN ÁNH THỰC TRẠNG
4. THIỀU ĐIỀU PHỐI NGUỒN LỰC 

## PAINS (HIỆN TẠI) VÀ GAINS (PRODUCT):

| **STT** | **PAINS (HIỆN TẠI)** | **GAINS (PRODUCT):** | **GHI CHÚ** | **QUESTIONS** |  |
| --- | --- | --- | --- | --- | --- |
| 1 | Cộng đồng rời rạc, chưa thực sự hiệu quả | Xây dựng **Forum** |   • Cập nhật, push các thông tin về campaign sắp diễn ra
  • Chia sẻ kinh nghiệm 
→ Kết nối giữa **ORGANIZATION** và **DONOR** |  |  |
| 2 | Thiếu minh bạch
  • Việc thu tiền, vật phẩm chưa được xác thực rõ ràng → bị lợi dụng → VOLUNTEER và DONOR mất niềm tin |   1. Verified organization
  2. 
  3. **Credit system**
  4. Flow checkin |   1. Tổ chức muốn scale up (thu tiền và vật phẩm nhiều hơn 1 **THRESHOLD** nhất định buộc verified bởi admin)
  2.  |   • Threshold
  • Chi phí vận hành QR
  • 
  • 
  • Verified: |  |
| 3.  | Thông tin chậm trễ, không phản ánh thực trạng |   1. Cập nhật tiến độ & thông tin
chính thức từ ORGANIZATION

#2. Chức năng nhắn tin giữa VOLUNTEER, DONOR và ORGANIZATION |   1. Cập nhật qua thông báo, **Forum**
 |  |  |
| 4.  | Có nơi dư thừa đồ cứu trợ, nơi khác lại thiếu. | Bản đồ tình nguyện cập nhật
theo thời gian thực | Hệ thống sẽ:
• hiển thị nơi **thiếu nguồn lực**
• gợi ý **phân bổ cứu trợ**
• tối ưu **logistics** |   • Phương thức hiện thị mức độ thiếu (thông qua màu trên map hay push thông báo trên app, push lên forum?)
  • Hệ thống phân bổ như thế nào? Khả thi không? |  |
|  |  |  |  |  |  |
| … | Người tổ chức phải tốn công quản lý rất nhiều | dùng AI để tự động hóa quy trình nhập liệu, phân loại nhu cầu, gợi ý phân bổ, hỗ trợ giao nhận và công khai sao kê theo thời gian thực. |  |  |  |
|  |  |  |  |  |  |

## QR Check-in Flow

### Happy path

1. Volunteer đến / Donor mang items → Quét mã QR của Organization
2. Hệ thống kiểm tra → **QR hợp lệ?**
3. Nếu **Có** → Check-in thành công → Thông báo đến: Organization, Volunteer, Donor + Inventory cập nhật kho

### Error path

Nếu **Không** → Hiện thông báo lỗi tương ứng:

- Sai campaign ID
- QR hết hạn
- Đã check-in rồi (trùng lặp)

Credit system:

- base:
- cộng: có thể được đánh giá bởi user có mức độ hoạt động cao (experience system)
- trừ: phát hiện scam

Verified hoạt động: → dùng AI
- cần có giấy tờ→ app sẽ là hệ thống trung gian recommend

- tùy theo loại