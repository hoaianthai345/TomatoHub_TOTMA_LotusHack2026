# AI Architecture - TomatoHub

## 1. Mục tiêu tài liệu

Tài liệu này mô tả kiến trúc AI cho **TomatoHub** – nền tảng kết nối tổ chức thiện nguyện, supporter và người thụ hưởng, với trọng tâm:

- Giảm tải vận hành cho Organization
- Tăng khả năng matching nguồn lực đúng nơi cần
- Tăng minh bạch cho donor/supporter
- Hỗ trợ ra quyết định nhanh trong bối cảnh cứu trợ hoặc thiện nguyện
- Dễ triển khai ở mức MVP hackathon, nhưng vẫn có khả năng mở rộng sau này

Tài liệu này dùng để:
- team dev triển khai backend/frontend
- AI agent/code agent bám theo để generate code/service
- làm chuẩn thống nhất cho data flow và AI flow

---

# 2. Bối cảnh sản phẩm

## 2.1. Các vai trò chính

### Organization
- Tạo campaign
- Quản lý danh sách beneficiary
- Cập nhật nhu cầu
- Theo dõi supporter
- Theo dõi phân phối
- Public dữ liệu minh bạch

### Supporter
`role = supporter`

`support_type = donor_money | donor_goods | volunteer | shipper | coordinator`

Supporter có thể:
- Khám phá campaign
- Xem chi tiết campaign
- Chọn hình thức hỗ trợ
- Đăng ký tham gia / quyên góp
- Theo dõi trạng thái đóng góp
- Xem lịch sử hỗ trợ

### Beneficiary
- Được Organization thêm vào hệ thống
- Được Organization xác minh
- Được gán vào đợt hỗ trợ
- Được đánh dấu đã nhận hỗ trợ

---

# 3. Mục tiêu AI trong TomatoHub

AI trong hệ thống này **không phải để làm cho sản phẩm “ngầu”**, mà để giải quyết 4 bài toán vận hành chính:

## 3.1. Giảm việc thủ công cho Organization
Ví dụ:
- Tự gợi ý phân loại nhu cầu campaign
- Tự trích xuất thông tin từ mô tả campaign
- Gợi ý supporter phù hợp
- Gợi ý phân phối nguồn lực

## 3.2. Tăng khả năng matching
Ví dụ:
- Match supporter gần khu vực cần hỗ trợ
- Match volunteer theo kỹ năng / vị trí / thời gian
- Match donor_goods theo nhu cầu còn thiếu

## 3.3. Tăng minh bạch
Ví dụ:
- Tóm tắt sao kê / giao dịch / phân phối
- Phát hiện bất thường
- Tự sinh transparency summary dễ đọc cho người dùng

## 3.4. Hỗ trợ ra quyết định
Ví dụ:
- Campaign đang thiếu gì?
- Khu vực nào ưu tiên hơn?
- Đợt phân phối nào có rủi ro?
- Supporter nào phù hợp nhất cho nhiệm vụ hiện tại?

---

# 4. Nguyên tắc thiết kế AI

## 4.1. AI chỉ hỗ trợ, không tự quyết định cuối cùng
Các quyết định quan trọng như:
- xác minh beneficiary
- xác nhận đã nhận hàng
- duyệt campaign
- công bố minh bạch

phải có người chịu trách nhiệm cuối cùng.

## 4.2. Ưu tiên AI “assistive” trước AI “autonomous”
Ở MVP:
- AI gợi ý
- AI tóm tắt
- AI xếp hạng
- AI cảnh báo

Không nên để AI tự động approve/reject workflow quan trọng.

## 4.3. Có thể fallback nếu AI lỗi
Nếu AI service lỗi:
- app vẫn chạy được
- chỉ mất tính năng thông minh
- workflow cốt lõi không bị chặn

## 4.4. Dễ quan sát, dễ debug
Mọi kết quả AI nên lưu:
- input
- output
- model used
- confidence
- timestamp
- ai status

## 4.5. Ưu tiên free / cheap / external services trong hackathon
Không tự train model ở MVP.
Ưu tiên:
- LLM API miễn phí / free tier
- embedding model open-source
- geocoding miễn phí
- rules + heuristics kết hợp AI

---

# 5. Kiến trúc AI tổng thể

## 5.1. Tổng quan các tầng

```text
[Frontend]
    |
    v
[FastAPI Backend]
    |
    +--> [Core Business Services]
    |         - Campaign Service
    |         - Supporter Service
    |         - Beneficiary Service
    |         - Donation/Distribution Service
    |
    +--> [AI Orchestrator]
    |         - Prompt builder
    |         - AI task router
    |         - Rules engine
    |         - Confidence handler
    |
    +--> [AI Modules]
    |         - Campaign Understanding
    |         - Matching Engine
    |         - Transparency Summarizer
    |         - Risk / Anomaly Detector
    |         - Location Intelligence
    |
    +--> [Data Layer]
              - PostgreSQL
              - Redis (optional cache / queue)
              - Object Storage (evidence images, files)
              - Vector Store (optional, later)
# 6. Các AI modules chính

## 6.1. Module A - Campaign Understanding

### Mục tiêu

Biến mô tả chiến dịch tự do thành dữ liệu có cấu trúc.

### Input

* campaign title
    
* campaign description
    
* target area
    
* requested support text
    
* uploaded evidence / document metadata
    

### Output

* campaign category
    
* urgency level
    
* extracted needs
    
* normalized location
    
* suggested tags
    
* summary for supporters
    

### Ví dụ output

JSON{  
  "category": "flood_relief",  
  "urgency_level": "high",  
  "needs": [  
    {"item": "drinking_water", "quantity": 500, "unit": "bottle"},  
    {"item": "instant_noodles", "quantity": 200, "unit": "box"},  
    {"item": "volunteer_medical", "quantity": 5, "unit": "person"}  
  ],  
  "location_normalized": {  
    "province": "An Giang",  
    "district": "Chau Phu"  
  },  
  "tags": ["flood", "emergency", "food", "water"],  
  "supporter_summary": "Chiến dịch đang cần nước uống, mì gói và tình nguyện viên y tế tại Châu Phú, An Giang."  
}

### Cách triển khai MVP

* LLM prompt extraction
    
* Kết hợp schema validation bằng Pydantic
    
* Nếu parse lỗi thì fallback về rule-based tags đơn giản
    

### Giá trị

* Organization không phải nhập quá nhiều field thủ công
    
* Dữ liệu campaign được chuẩn hóa để matching tốt hơn
    

* * *

## 6.2. Module B - Supporter Matching Engine

### Mục tiêu

Gợi ý supporter phù hợp nhất với campaign hoặc task.

### Dữ liệu dùng để match

* supporter type
    
* kỹ năng
    
* vị trí địa lý
    
* bán kính sẵn sàng di chuyển
    
* lịch rảnh
    
* lịch sử tham gia
    
* độ tin cậy
    
* nhu cầu campaign còn thiếu
    

### Loại matching

#### 1. donor_money matching

Gợi ý campaign đáng quan tâm theo:

* khu vực
    
* loại chiến dịch
    
* độ khẩn cấp
    
* minh bạch
    

#### 2. donor_goods matching

Map hàng supporter có thể cho với nhu cầu campaign còn thiếu.

#### 3. volunteer matching

Match theo:

* khoảng cách
    
* kỹ năng
    
* availability
    
* độ phù hợp nhiệm vụ
    

#### 4. shipper matching

Match theo:

* route gần
    
* phương tiện
    
* tải trọng
    
* thời gian có thể nhận task
    

#### 5. coordinator matching

Match theo:

* kinh nghiệm điều phối
    
* số campaign đã tham gia
    
* độ uy tín
    

### Output

JSON{  
  "campaign_id": "cmp_001",  
  "recommended_supporters": [  
    {  
      "supporter_id": "sup_101",  
      "match_score": 0.91,  
      "reason": [  
        "Cách khu vực chiến dịch 3.2km",  
        "Đã từng tham gia 4 chiến dịch cứu trợ",  
        "Có kỹ năng vận chuyển hàng cứu trợ"  
      ]  
    }  
  ]  
}

### Công thức MVP đề xuất

Không cần AI end-to-end ngay từ đầu.

Dùng hybrid scoring:

match_score =  
  0.35 * location_score +  
  0.25 * skill_score +  
  0.20 * availability_score +  
  0.10 * trust_score +  
  0.10 * campaign_need_fit

Sau đó dùng LLM để:

* giải thích kết quả match
    
* sinh reason text cho UI
    

### Giá trị

* Dễ demo
    
* Dễ debug
    
* Minh bạch vì score có thể giải thích được
    

* * *

## 6.3. Module C - Transparency Summarizer

### Mục tiêu

Tự sinh báo cáo minh bạch dễ đọc cho người dùng cuối.

### Input

* donation transactions
    
* distribution records
    
* beneficiary receive records
    
* campaign progress
    
* evidence files metadata
    

### Output

* tóm tắt campaign
    
* tổng tiền đã nhận
    
* tổng hàng đã nhận
    
* tổng đã phân phối
    
* số beneficiary đã nhận
    
* phần còn thiếu / còn tồn
    
* cảnh báo dữ liệu thiếu
    

### Ví dụ output

JSON{  
  "campaign_id": "cmp_001",  
  "summary_text": "Chiến dịch đã tiếp nhận 120 triệu đồng, 350 thùng mì và 500 chai nước. Đã phân phối đến 87 hộ dân, hiện còn thiếu thuốc cơ bản và 2 chuyến vận chuyển.",  
  "status": "in_progress",  
  "missing_information": [  
    "Chưa có biên nhận cho đợt phân phối ngày 2026-03-20"  
  ]  
}

### Cách triển khai MVP

* SQL aggregate lấy số liệu
    
* LLM chỉ làm phần diễn giải ngôn ngữ tự nhiên
    
* Không giao cho LLM tính toán số liệu gốc
    

### Giá trị

* Minh bạch
    
* Dễ đọc
    
* Tăng niềm tin donor/supporter
    

* * *

## 6.4. Module D - Risk / Anomaly Detector

### Mục tiêu

Phát hiện dữ liệu bất thường để cảnh báo Organization hoặc Admin.

### Một số rule MVP

* Tổng phân phối > tổng nhận
    
* Một beneficiary nhận trùng quá nhiều lần trong thời gian ngắn
    
* Không có bằng chứng cho một đợt giao hàng
    
* Volunteer đăng ký nhưng no-show quá nhiều
    
* Campaign cập nhật nhu cầu bất thường liên tục
    
* Một supporter tạo quá nhiều giao dịch nhỏ đáng ngờ trong thời gian ngắn
    

### Output

JSON{  
  "campaign_id": "cmp_001",  
  "alerts": [  
    {  
      "type": "distribution_exceeds_received",  
      "severity": "high",  
      "message": "Số lượng gạo đã phân phối vượt quá số lượng ghi nhận đã nhận."  
    }  
  ]  
}

### Giai đoạn MVP

Dùng rule-based trước.

### Giai đoạn sau

* anomaly detection model
    
* graph-based fraud signals
    
* trust score theo hành vi
    

### Giá trị

* Phù hợp bài toán minh bạch
    
* Làm nổi bật yếu tố “AI for trust”
    

* * *

## 6.5. Module E - Location Intelligence

### Mục tiêu

Chuẩn hóa vị trí và hỗ trợ gợi ý gần khu vực.

### Chức năng

* geocoding địa chỉ text thành lat/lng
    
* reverse geocoding
    
* tính khoảng cách supporter ↔ campaign
    
* gợi ý supporter gần nhất
    
* nhóm beneficiary theo khu vực
    

### MVP

* Dùng geocoding API miễn phí
    
* Lưu lat/lng vào DB
    
* Tính distance bằng PostGIS hoặc Haversine formula
    

### Giá trị

* Matching tốt hơn
    
* Hiển thị map
    
* Hữu ích cho volunteer / shipper
    

* * *

# 7. AI Orchestrator

## 7.1. Vai trò

AI Orchestrator là lớp điều phối trung tâm giữa business logic và AI services.

Nó chịu trách nhiệm:

* chọn module AI phù hợp
    
* build prompt
    
* validate output
    
* fallback nếu AI fail
    
* log kết quả AI
    
* trả output chuẩn cho backend
    

## 7.2. Tại sao cần Orchestrator

Không gọi LLM trực tiếp từ controller vì:

* khó kiểm soát
    
* khó retry
    
* khó audit
    
* khó thay model sau này
    

## 7.3. Giao diện đề xuất

PythonRunclass AIOrchestrator:  
    async def extract_campaign_info(self, campaign_payload): ...  
    async def recommend_supporters(self, campaign_id): ...  
    async def summarize_transparency(self, campaign_id): ...  
    async def detect_risks(self, campaign_id): ...  
    async def explain_match_score(self, match_payload): ...

* * *

# 8. Dòng dữ liệu AI chính

## 8.1. Flow 1 - Tạo campaign

Organization tạo campaign  
    -> Backend lưu raw campaign  
    -> Trigger Campaign Understanding  
    -> AI extract needs / tags / urgency  
    -> Save structured campaign_ai_profile  
    -> UI hiển thị gợi ý cho Organization confirm

### Lưu ý

Organization phải có quyền sửa trước khi publish.

* * *

## 8.2. Flow 2 - Gợi ý supporter

Campaign published / campaign updated  
    -> Backend lấy nhu cầu còn thiếu  
    -> Matching Engine tính score supporter  
    -> LLM giải thích ngắn cho top matches  
    -> Trả top supporters cho UI / admin dashboard

* * *

## 8.3. Flow 3 - Transparency summary

Có donation / distribution mới  
    -> Update aggregate data  
    -> Trigger summary builder  
    -> LLM viết summary tự nhiên  
    -> Save public transparency summary

* * *

## 8.4. Flow 4 - Risk detection

Khi có transaction / distribution / beneficiary update  
    -> Rule engine chạy kiểm tra  
    -> Nếu có bất thường -> tạo alert  
    -> Admin/Organization thấy trên dashboard

* * *

# 9. Kiến trúc dữ liệu AI

## 9.1. Bảng dữ liệu chính nên có

### `campaigns`

Thông tin chiến dịch cơ bản

### `campaign_ai_profiles`

Kết quả AI extract cho campaign

Ví dụ field:

* `campaign_id`
    
* `category`
    
* `urgency_level`
    
* `needs_json`
    
* `tags_json`
    
* `location_normalized_json`
    
* `supporter_summary`
    
* `confidence_score`
    
* `model_name`
    
* `created_at`
    

### `supporter_profiles`

Thông tin supporter

### `supporter_capabilities`

Kỹ năng, loại hỗ trợ, bán kính di chuyển, thời gian rảnh

### `matches`

Kết quả matching đã tính

Ví dụ field:

* `campaign_id`
    
* `supporter_id`
    
* `match_score`
    
* `score_breakdown_json`
    
* `reason_json`
    
* `status`
    

### `transparency_snapshots`

Snapshot báo cáo minh bạch

### `risk_alerts`

Các cảnh báo bất thường

### `ai_logs`

Log đầy đủ các lần gọi AI

Field đề xuất:

* `task_type`
    
* `input_json`
    
* `output_json`
    
* `status`
    
* `latency_ms`
    
* `model_name`
    
* `error_message`
    
* `created_at`
    

* * *

# 10. Mô hình và công nghệ đề xuất

## 10.1. Giai đoạn hackathon MVP

### LLM

Dùng cho:

* extract campaign info
    
* write summary
    
* explain matching reason
    

Có thể chọn một trong các hướng:

* Gemini API
    
* OpenAI API
    
* OpenRouter free models
    
* Groq + open-source LLM
    

### Embedding

Chưa bắt buộc ở MVP.  
Chỉ cần nếu muốn:

* semantic search campaign
    
* semantic matching mô tả supporter / campaign
    

### Rule Engine

Dùng Python thuần hoặc service riêng:

* risk rules
    
* score calculation
    
* validation
    

### Geocoding

* Nominatim / OpenStreetMap
    
* hoặc Google Maps nếu team có key
    

### Database

* PostgreSQL
    
* Redis optional cho queue/cache
    

### Queue

MVP có thể chạy sync.  
Nếu có thời gian:

* Celery / RQ / FastAPI BackgroundTasks
    

* * *

## 10.2. Giai đoạn scale sau hackathon

Có thể thêm:

* vector database
    
* model routing
    
* feature store
    
* trust scoring service
    
* event-driven architecture
    
* admin investigation dashboard
    
* image verification AI
    
* OCR cho biên nhận / sao kê / giấy tờ
    

* * *

# 11. Prompting strategy

## 11.1. Nguyên tắc

* ép output về JSON
    
* schema rõ ràng
    
* prompt ngắn, cụ thể
    
* không để model tự suy diễn quá mức
    
* luôn validate output
    

## 11.2. Ví dụ prompt extract campaign

You are an AI assistant for a charity coordination platform.  
  
Task:  
Extract structured campaign information from the provided text.  
  
Return valid JSON only with the following fields:  
- category  
- urgency_level  
- needs  
- tags  
- supporter_summary  
  
Rules:  
- Do not invent unsupported facts.  
- If quantity is unclear, use null.  
- supporter_summary must be concise and understandable to normal users.

## 11.3. Ví dụ prompt explain matching

You are an assistant that explains why a supporter matches a charity campaign.  
  
Given structured scoring data, generate 2-3 short bullet reasons in simple language.  
Do not mention internal formulas.  
Do not exaggerate certainty.

* * *

# 12. API design đề xuất

## 12.1. Campaign AI

### `POST /ai/campaigns/extract`

Input:

JSON{  
  "title": "Hỗ trợ bà con vùng ngập",  
  "description": "Chiến dịch cần nước sạch, mì gói, thuốc cơ bản..."  
}

Output:

JSON{  
  "category": "flood_relief",  
  "urgency_level": "high",  
  "needs": [...],  
  "tags": [...],  
  "supporter_summary": "..."  
}

* * *

## 12.2. Matching

### `GET /ai/campaigns/{campaign_id}/matches`

Output:

JSON{  
  "campaign_id": "cmp_001",  
  "matches": [  
    {  
      "supporter_id": "sup_101",  
      "match_score": 0.91,  
      "reason": [  
        "Gần khu vực hỗ trợ",  
        "Có kỹ năng vận chuyển",  
        "Từng tham gia chiến dịch tương tự"  
      ]  
    }  
  ]  
}

* * *

## 12.3. Transparency Summary

### `GET /ai/campaigns/{campaign_id}/transparency-summary`

* * *

## 12.4. Risk Alerts

### `GET /ai/campaigns/{campaign_id}/risk-alerts`

* * *

# 13. Frontend integration points

## 13.1. Với Organization dashboard

Hiển thị:

* AI extracted campaign info
    
* suggested missing needs
    
* top supporter matches
    
* risk alerts
    
* transparency summary draft
    

## 13.2. Với Supporter dashboard

Hiển thị:

* campaign recommendations
    
* lý do campaign phù hợp
    
* gợi ý hành động tiếp theo
    

## 13.3. Với Public campaign page

Hiển thị:

* campaign summary
    
* progress
    
* transparency summary
    
* các chỉ số minh bạch dễ hiểu
    

* * *

# 14. Quy tắc nghiệp vụ AI quan trọng

## 14.1. Không cho AI tự xác minh người thụ hưởng hoàn toàn

AI chỉ có thể:

* gợi ý thiếu giấy tờ
    
* phát hiện record nghi ngờ trùng
    
* hỗ trợ phân loại
    

Người thật phải duyệt.

## 14.2. Không cho AI tự công bố số liệu gốc nếu chưa qua aggregate chuẩn

Tất cả số liệu public phải lấy từ DB aggregate đã kiểm tra, không lấy trực tiếp từ câu trả lời LLM.

## 14.3. AI phải luôn có trạng thái

Ví dụ:

* `pending`
    
* `completed`
    
* `failed`
    
* `needs_review`
    

* * *

# 15. Error handling và fallback

## 15.1. Nếu LLM timeout

* trả về dữ liệu mặc định
    
* không chặn flow chính
    
* lưu log lỗi
    

## 15.2. Nếu output AI sai schema

* retry 1 lần với repair prompt
    
* nếu vẫn lỗi -> fallback rule-based hoặc manual review
    

## 15.3. Nếu geocoding fail

* cho phép lưu text location raw
    
* đánh dấu `location_status = unresolved`
    

* * *

# 16. Logging, monitoring, observability

## 16.1. Cần log gì

* request id
    
* campaign id / supporter id liên quan
    
* AI task type
    
* input size
    
* latency
    
* model name
    
* output validation result
    
* error reason
    

## 16.2. Metrics cần theo dõi

* AI success rate
    
* average latency
    
* % parse JSON fail
    
* % suggestion accepted by Organization
    
* matching click-through rate
    
* số alert bất thường / ngày
    

* * *

# 17. Security và privacy

## 17.1. Dữ liệu nhạy cảm

* beneficiary identity
    
* phone
    
* address cụ thể
    
* transaction details
    
* internal evidence files
    

## 17.2. Quy tắc

* không gửi dữ liệu nhạy cảm không cần thiết lên LLM
    
* mask thông tin cá nhân trước khi prompt
    
* public transparency chỉ hiển thị dữ liệu đã được phép công khai
    
* log AI không lưu raw PII nếu không cần
    

## 17.3. Prompt redaction

Trước khi gọi LLM:

* ẩn số điện thoại
    
* ẩn CCCD/ID
    
* ẩn địa chỉ quá chi tiết nếu không cần
    

* * *

# 18. Roadmap triển khai thực tế

## Phase 1 - Hackathon MVP

Làm trước:

1. Campaign Understanding
    
2. Matching Engine hybrid
    
3. Transparency Summarizer
    
4. Risk Detector rule-based
    
5. Location Intelligence cơ bản
    

## Phase 2 - Sau demo

1. Queue/background jobs
    
2. Better scoring
    
3. Admin alert center
    
4. Embedding search
    
5. OCR chứng từ / biên nhận
    

## Phase 3 - Scale production

1. Event-driven AI pipeline
    
2. Trust score per actor
    
3. Fraud graph analysis
    
4. Model versioning
    
5. Human-in-the-loop workflow hoàn chỉnh
    

* * *

# 19. Gợi ý cấu trúc source code

backend/  
  app/  
    api/  
      routes/  
        campaigns.py  
        supporters.py  
        ai.py  
    core/  
      config.py  
      security.py  
    services/  
      campaign_service.py  
      supporter_service.py  
      transparency_service.py  
      risk_service.py  
    ai/  
      orchestrator.py  
      prompts/  
        campaign_extract.txt  
        match_explain.txt  
        transparency_summary.txt  
      modules/  
        campaign_understanding.py  
        matching_engine.py  
        summarizer.py  
        anomaly_detector.py  
        location_service.py  
      schemas/  
        campaign_ai.py  
        match_result.py  
        transparency.py  
    models/  
    repositories/  
    workers/

* * *

# 20. Pseudocode triển khai

## 20.1. Campaign extraction

PythonRunasync def extract_campaign_info(campaign):  
    prompt = build_campaign_prompt(campaign)  
    raw_output = await llm.generate(prompt)  
    parsed = validate_campaign_json(raw_output)  
    if not parsed:  
        return fallback_extract(campaign)  
    return parsed

## 20.2. Matching

PythonRundef compute_match_score(campaign, supporter):  
    location_score = calc_location_score(campaign, supporter)  
    skill_score = calc_skill_score(campaign, supporter)  
    availability_score = calc_availability_score(campaign, supporter)  
    trust_score = calc_trust_score(supporter)  
    need_fit_score = calc_need_fit(campaign, supporter)  
  
    score = (  
        0.35 * location_score +  
        0.25 * skill_score +  
        0.20 * availability_score +  
        0.10 * trust_score +  
        0.10 * need_fit_score  
    )  
    return round(score, 4)

## 20.3. Transparency summary

PythonRunasync def build_transparency_summary(campaign_id):  
    aggregates = get_campaign_aggregates(campaign_id)  
    prompt = build_summary_prompt(aggregates)  
    text = await llm.generate(prompt)  
    return {  
        "campaign_id": campaign_id,  
        "summary_text": text,  
        "aggregates": aggregates  
    }

* * *

# 21. Định nghĩa MVP “đủ tốt để demo”

MVP AI được xem là đủ tốt nếu:

* Organization tạo campaign và AI tự gợi ý nhu cầu
    
* Hệ thống gợi ý top supporter phù hợp
    
* Có trang transparency summary tự động
    
* Có ít nhất vài rule phát hiện bất thường
    
* Có thể giải thích được tại sao match / tại sao alert
    

Không cần ở MVP:

* training model riêng
    
* recommendation engine phức tạp
    
* fraud detection bằng deep learning
    
* OCR nâng cao
    
* multi-agent phức tạp
    

* * *

# 22. Tóm tắt quyết định kiến trúc

## Chúng ta chọn:

* FastAPI làm backend chính
    
* PostgreSQL làm nguồn dữ liệu thật
    
* AI Orchestrator làm lớp gọi AI tập trung
    
* Hybrid AI = Rules + Scoring + LLM
    
* Rule-based anomaly trước, ML sau
    
* Aggregate data trước rồi mới dùng LLM để diễn giải
    
* Human review cho các bước nhạy cảm
    

## Chúng ta chưa chọn ở MVP:

* model train riêng
    
* vector DB bắt buộc
    
* event bus phức tạp
    
* full autonomous workflow
    

* * *

# 23. Kết luận

Kiến trúc AI của TomatoHub nên đi theo hướng:

* **AI hỗ trợ vận hành**
    
* **AI tăng minh bạch**
    
* **AI giải thích được**
    
* **AI không phá vỡ luồng nghiệp vụ cốt lõi**
    
* **MVP đơn giản nhưng có đường mở rộng rõ ràng**
    

Trọng tâm của hệ thống không phải là “AI làm tất cả”, mà là:

* giảm thao tác thủ công
    
* tăng chất lượng matching
    
* tăng độ tin cậy của dữ liệu
    
* tăng khả năng công khai minh bạch cho cộng đồng
    

Đây là hướng phù hợp nhất để vừa làm được trong hackathon, vừa có tiềm năng phát triển thành sản phẩm thật sau này.