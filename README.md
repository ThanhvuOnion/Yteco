# Yteco Dashboard — Báo cáo Công Nợ

Dashboard phân tích công nợ phải thu, xây dựng từ dữ liệu thực tế của Yteco.

## Cài đặt & Chạy

```bash
npm install
npm run dev
```
Mở trình duyệt tại: http://localhost:5173

## Build production

```bash
npm run build
```

## Tech Stack

- **React 19** + **Vite 8**
- **Tailwind CSS 3** — styling
- **Recharts** — biểu đồ
- **React Router DOM** — điều hướng

## Tính năng

| Trang | Nội dung |
|---|---|
| Tổng quan | 4 KPI cards, biểu đồ theo chi nhánh, aging tuổi nợ, xu hướng theo năm |
| Phân tích Công Nợ | Breakdown chi nhánh, top 10 KH nợ nhiều nhất, bảng chi tiết tuổi nợ |
| Danh sách Khách Hàng | Tìm kiếm, lọc theo chi nhánh & trạng thái, badge màu trạng thái |
| Loại Hình KD | Pie chart Hợp tác/Tự doanh/Tính phí, top JobName |
| Công Nợ Loại 2 | 114 hóa đơn rủi ro cao, chart + table có tìm kiếm |

## Dữ liệu

- **3,749 giao dịch** — nguồn từ ERP Yteco
- **4 chi nhánh**: Văn phòng (HCM), Hà Nội, Đà Nẵng, Cần Thơ
- **Tổng công nợ**: ~268 tỷ VND
- Dữ liệu tĩnh (JSON), không cần backend
