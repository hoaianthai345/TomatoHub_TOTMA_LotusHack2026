# Recommendation Feature (Campaign + Supporter Matching)

## 1. Goal

Feature gồm 2 luồng:

- Gợi ý nội dung campaign (short description, description, tags, volunteer tasks, transparency notes).
- Gợi ý campaign phù hợp cho supporter dựa trên hồ sơ + hành vi trước đó.

## 2. Architecture

- `app/services/recommendation_service.py`
  - Heuristic engine (always available).
  - Optional Groq enhancement (if `GROQ_API_KEY` configured).
  - Fallback về heuristic khi Groq timeout/error/JSON invalid.
- `app/services/groq_client.py`
  - Gọi Groq OpenAI-compatible endpoint `/chat/completions`.
  - Parse JSON output và có fallback khi model không hỗ trợ `response_format`.
- `app/api/endpoints/recommendations.py`
  - Expose API cho frontend/backend consumers.

## 3. API Endpoints

### 3.1 Campaign draft recommendation

- `POST /api/v1/recommendations/campaign-draft`
- Auth: organization user hoặc superuser
- Request: `CampaignDraftRecommendationRequest`
- Response: `CampaignDraftRecommendationResponse`

Use case: organization nhập thông tin campaign thô -> lấy bản mô tả đề xuất có cấu trúc.

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
GROQ_API_KEY=<your-groq-api-key>
GROQ_API_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TIMEOUT_SECONDS=20
SUPPORTER_RECOMMENDATION_MAX_LIMIT=20
```

## 6. Production notes

- Nên giới hạn `limit` nhỏ (8-20) để giảm latency.
- Nên giám sát timeout/error rate của Groq API.
- Nên thêm cache theo `(supporter_id, profile_hash)` nếu traffic tăng.
- Không dựa hoàn toàn vào LLM: heuristic luôn là baseline an toàn.
