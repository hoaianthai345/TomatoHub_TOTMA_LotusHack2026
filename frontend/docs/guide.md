# TomatoHub Frontend Guide

## 1. Project Goal

Frontend is built first to:

- help the team visualize the product early
- lock the MVP flow faster
- use mock data for demo before backend is completed

This app is currently developed as an **extendable prototype**, prioritizing:

- clear user flow
- demo-friendly UI
- modular code structure
- easy API integration later

---

## 2. Core Product Direction

TomatoHub is not a fully manual charity app.

It is a **Volunteer & Aid Coordination Platform** where:

- **Organization** creates and manages campaigns
- **Supporter** contributes through money, goods, volunteering, shipping, or coordination
- **Beneficiary** receives support and is managed by Organization
- **Transparency** is built into the workflow, not added later as a separate report

---

## 3. Main Roles

### Organization

Creates campaigns, updates needs, manages beneficiaries, supporters, goods, donations, and transparency data.

### Supporter

A supporter is any user who helps a campaign in one or more ways.

```ts
role = "supporter"
support_type = "donor_money" | "donor_goods" | "volunteer" | "shipper" | "coordinator"	

Supporter types:

donor_money: donates money

donor_goods: donates physical items

volunteer: joins field support activities

shipper: helps with delivery

coordinator: supports local coordination or on-site organization

One user may support in more than one way depending on future product logic.

Beneficiary

A beneficiary is the person or household receiving aid.
This role is mainly managed by Organization and does not require a full direct-user flow in MVP.

4. MVP Screens
Public / Supporter side

Home

Search / Map

Campaign List

Campaign Detail

Donation Form

Supporter Registration

Forum

Profile

Organization side

Organization Dashboard

Create Campaign

Beneficiary Management

Supporter Management

Donation / Goods Management

Transparency Page

Organization Profile

5. Product Logic Summary
Organization flow

Create campaign

Import or add beneficiary list

Update campaign needs

Manage supporters

Track donations and distribution

Publish transparency data

Supporter flow

Explore campaigns

View campaign details

Choose support type

Submit donation or registration

Track participation status

View contribution history

Beneficiary flow

Added by Organization

Verified by Organization

Assigned to support round

Marked as received support

6. Transparency Principle

Every campaign should eventually show:

summary

ledger

distribution log

evidence

Transparency is a core feature of the product.

It should be visible in the app workflow instead of being handled manually outside the system.

7. Frontend Development Principles
1. Flow first

Build end-to-end user flow before polishing small UI details.

2. Use mock data

Backend is not required at the beginning.
Use mock data to build UI and demo product logic.

3. Keep components modular

Split UI into reusable components for easier scaling and API connection later.

4. Avoid putting heavy logic directly inside pages

Pages should mainly handle layout and composition.

5. Use clear naming

Variable names, folders, and components should be easy to understand and maintain.

8. Suggested Source Structure
src/
  assets/
  components/
    common/
    campaign/
    dashboard/
    forms/
    transparency/
    supporter/
    beneficiary/
  layouts/
  pages/
    home/
    campaigns/
    campaign-detail/
    donate/
    supporter/
    organization/
  routes/
  mocks/
  types/
  services/
  hooks/
  utils/
9. Mock Data Needed

campaigns

organizations

beneficiaries

supporters

donations

aid items

supporter tasks

transparency logs

forum posts

10. Build Priority
Phase 1

Home

Campaign List

Campaign Detail

Organization Dashboard

Phase 2

Create Campaign

Donation Form

Supporter Registration

Transparency Page

Phase 3

Beneficiary Management

Supporter Management

Forum

Profile

11. UI Thinking for MVP

The current frontend should be treated as an interactive product prototype.

That means:

the flow should be understandable

the screens should be usable

the mock data should feel realistic

the demo should clearly show product value

This is more important than building every detail like a production system.

12. Important Notes

This is not a full production app yet

The current goal is to build a clear and convincing MVP prototype

AI features can be mocked in the first version

Do not lock product logic into the word “volunteer” only

Support can come from many forms, so use the broader role Supporter

13. Team Notes

Before building any screen, always ask:

Which role is this screen for?

What is the main user action here?

Where will the data come from when backend is connected?

If these 3 questions are still unclear, do not go too deep into implementation yet.


# Đã sửa những gì
- Gộp toàn bộ nội dung lại thành **1 file `.md` duy nhất**.
- Đồng bộ toàn bộ role theo hướng **Supporter**.
- Viết theo kiểu ngắn, rõ, phù hợp đặt làm **README trong source FE**.
- Giữ đủ các phần team cần follow: mục tiêu, role, flow, screen, cấu trúc source, nguyên tắc code.

Bạn có thể đặt tên file là:

`README.md`

hoặc nếu muốn tách riêng cho frontend:

`FRONTEND_GUIDE.md`
```
