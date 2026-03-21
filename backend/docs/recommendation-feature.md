# Recommendation Feature (Campaign + Supporter Matching)

## 1. Goal

Feature gồm 2 luồng:

- Gợi ý nội dung campaign (short description, description, tags, volunteer tasks, transparency notes).
- Gợi ý campaign phù hợp cho supporter dựa trên hồ sơ + hành vi trước đó.

## 2. Architecture

- `app/services/recommendation_service.py`
  - Heuristic engine (always available).
  - Optional OpenAI ChatGPT enhancement for campaign-draft generation (if `OPENAI_API_KEY` configured).
  - Optional Groq enhancement (fallback or supporter recommendation rewrite).
  - Multi-model routing: task đơn giản dùng model nhẹ, task phức tạp dùng model mạnh.
  - Fallback chain: preferred provider -> secondary provider -> heuristic.
- `app/services/groq_client.py`
  - Gọi Groq OpenAI-compatible endpoint `/chat/completions`.
  - Parse JSON output và có fallback khi model không hỗ trợ `response_format`.
- `app/services/openai_client.py`
  - Gọi OpenAI Chat Completions API.
  - Parse JSON output và fallback khi model không hỗ trợ `response_format`.
- `app/api/endpoints/recommendations.py`
  - Expose API cho frontend/backend consumers.

## 3. API Endpoints

### 3.1 Campaign draft recommendation

- `POST /api/v1/recommendations/campaign-draft`
- Auth: organization user hoặc superuser
- Request: `CampaignDraftRecommendationRequest`
- Response: `CampaignDraftRecommendationResponse`

Use case: organization nhập thông tin campaign thô -> lấy bản mô tả đề xuất có cấu trúc.
Output được sanitize để ngắn gọn, bỏ emoji/ký tự đặc biệt/markdown symbols.

### 3.2 Supporter campaign recommendation (self)

- `GET /api/v1/recommendations/me/campaigns?limit=8`
- Auth: supporter user
- Response: `SupporterCampaignRecommendationResponse`

Use case: supporter vào dashboard để thấy campaign phù hợp nhất.

### 3.3 Supporter campaign recommendation by supporter_id

- `GET /api/v1/recommendations/supporters/{supporter_id}/campaigns?limit=8`
- Auth: self hoặc superuser
- Response: `SupporterCampaignRecommendationResponse`

Use case: admin/superuser debug hoặc phân tích recommendation theo user cụ thể.

## 4. Matching logic (supporter)

Scoring heuristic hiện dùng:

- Fit theo `support_types` giữa supporter và campaign (money/goods/volunteer).
- Fit theo location (`province/district/address_line` so với supporter `location`).
- Funding gap (`goal_amount - raised_amount`).
- Urgency theo `ends_at`.
- Prior engagement (đã donate hoặc đăng ký volunteer campaign đó).

Output trả về:

- `match_score`
- `match_reasons[]`
- `suggested_actions[]`

Nếu bật Groq, hệ thống tinh chỉnh `match_reasons` và `suggested_actions` để tự nhiên hơn.

## 5. Environment variables

```env
RECOMMENDATION_USE_LLM=true
RECOMMENDATION_DRAFT_PREFERRED_PROVIDER=openai
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_SECONDS=20
GROQ_API_KEY=<your-groq-api-key>
GROQ_API_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_MODEL_HEAVY=
GROQ_MODEL_LIGHT=llama-3.1-8b-instant
GROQ_TIMEOUT_SECONDS=20
SUPPORTER_RECOMMENDATION_MAX_LIMIT=20
RECOMMENDATION_MODEL_ROUTING_ENABLED=true
RECOMMENDATION_DRAFT_COMPLEXITY_THRESHOLD=900
RECOMMENDATION_SUPPORTER_LIGHT_MAX_ITEMS=8
```

Routing behavior:

- `campaign-draft`: provider order theo `RECOMMENDATION_DRAFT_PREFERRED_PROVIDER`.
  Nếu provider chính lỗi, tự fallback sang provider còn lại, cuối cùng fallback heuristic.
  Với Groq, hệ thống tự tính độ phức tạp input để chọn model nhẹ/nặng.
- `supporter campaign rewrite`: số campaign ít -> model nhẹ, nhiều -> model nặng.

## 6. Production notes

- Nên giới hạn `limit` nhỏ (8-20) để giảm latency.
- Nên giám sát timeout/error rate của OpenAI/Groq API.
- Nên thêm cache theo `(supporter_id, profile_hash)` nếu traffic tăng.
- Không dựa hoàn toàn vào LLM: heuristic luôn là baseline an toàn.
