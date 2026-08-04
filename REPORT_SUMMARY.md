# Dashboard Quản lý Công Nợ Yteco

> **Người thực hiện:** Vũ Tiến Thành
> **Ngày nộp bài:** 2026-08-04
> **Mục tiêu:** Phân tích dữ liệu công nợ từ file JSON và xây dựng dashboard báo cáo trực quan

---

## 1. Tóm tắt cách tiếp cận

Bài test yêu cầu phân tích dữ liệu công nợ từ file ERP export (JSON) và xây dựng dashboard trực quan.
Tôi chia quá trình thành 3 bước:

```
[1] Phân tích dữ liệu nguồn
    → Hiểu ý nghĩa từng field, phát hiện vấn đề chất lượng data

[2] Xác định nghiệp vụ cần hiển thị
    → Xác định KPI, góc nhìn phân tích phù hợp với quản lý công nợ

[3] Xây dựng dashboard
    → React + Vite, dữ liệu tĩnh, deploy Vercel
```

---

## 2. Phân tích dữ liệu nguồn

### 2.1 Thông số cơ bản

| Thuộc tính | Giá trị |
|---|---|
| Nguồn | `congno.json` — export từ phần mềm ERP Yteco |
| Tổng bản ghi | **3.749 hóa đơn** |
| Mỗi record | 1 hóa đơn công nợ phải thu |
| Loại tiền | 100% VND |
| Phạm vi thời gian | 2010 – tháng 5/2026 |

### 2.2 Các fields được sử dụng và lý do chọn

| Field | Ý nghĩa nghiệp vụ | Dùng để tính |
|---|---|---|
| `CloseBal` | **Số dư cuối kỳ** = số tiền KH còn nợ chưa thanh toán | Mọi KPI và biểu đồ |
| `OverDue` | Số ngày đã quá hạn thanh toán | Phân loại tuổi nợ (aging) |
| `CustomerCode` | Mã định danh khách hàng | Nhóm hóa đơn theo KH |
| `BranchCode` | Mã chi nhánh (A01–A04) | Phân tích theo chi nhánh |
| `nhomLoaiHinh` | Nhóm loại hình kinh doanh | Phân tích theo loại hình |
| `phanLoaiCongNo` | Phân loại rủi ro (Loại 1, Loại 2) | Lọc công nợ rủi ro cao |
| `JobName` | Tên loại hình chi tiết (28 loại) | Phân tích sâu nghiệp vụ |
| `DocDate` | Ngày phát hành hóa đơn | Phân tích xu hướng theo năm |
| `DueDate` | Số ngày payment term được phép | Hiểu kỳ hạn thanh toán |
| `Amount` | Giá trị hóa đơn gốc | Tham chiếu, kiểm tra |
| `PaidAmount` | Số đã thanh toán | Kiểm tra: `CloseBal = Amount - PaidAmount` |

**Công thức cốt lõi được xác nhận:**
```
CloseBal = Amount - PaidAmount
→ Đúng với 3.648 / 3.749 records (97,3%)
```

### 2.3 Các fields bị loại bỏ và lý do

| Field | Lý do loại bỏ |
|---|---|
| `CloseBal_00` → `CloseBal_06` | Cột hiển thị ERP, **bị overlap** — một hóa đơn xuất hiện trong nhiều cột cùng lúc, nếu cộng lại sẽ tính trùng. Ví dụ: OverDue=104 ngày → vừa có giá trị ở `CloseBal_03T`, `CloseBal_04`, `CloseBal_06` |
| `OriginalCloseBal`, `OriginalAmount` | Toàn bộ data là VND nên bằng `CloseBal` / `Amount` |
| `_ColorAllRow`, `_BackColorCellDueDate` | Metadata giao diện ERP, không có giá trị nghiệp vụ |

---

## 3. Vấn đề chất lượng dữ liệu phát hiện được

### 3.1 Dữ liệu trống — xử lý bằng fallback

| Field | Số records trống | Xử lý |
|---|---|---|
| `nhomLoaiHinh = ""` | 1.393 HĐ (37%) | → Gán nhãn `"Khác"` + tooltip giải thích |
| `phanLoaiCongNo = ""` | 2.648 HĐ (71%) | → Gán nhãn `"Chưa xác định"` |
| `JobName = ""` | 508 HĐ (14%) | → Gán nhãn `"Khác"` |
| `CustomerName` có tiền tố `XX99999_` | Nhiều records | → Strip tiền tố, chỉ hiển thị tên thực |

### 3.2 CloseBal âm — 142 records

```
Nguyên nhân : DocCode = "H2" (phiếu hoàn trả / credit note)
Tác động    : Làm giảm tổng công nợ ~10,97 tỷ so với tổng hóa đơn dương
Quyết định  : GIỮ NGUYÊN trong tính toán — đây là nghiệp vụ hợp lệ
              (khách trả dư → ghi âm vào sổ công nợ)
```

**→ Điểm cần xác nhận với nhà tuyển dụng:** Nếu dashboard chỉ cần theo dõi "số tiền cần thu", nên filter `CloseBal > 0`. Nếu cần phản ánh đúng số dư kế toán thì giữ nguyên.

### 3.3 OverDue tối đa — 5.817 ngày (~16 năm)

Có những hóa đơn từ năm 2010 vẫn chưa được xử lý. Dashboard gắn flag `isOutlier` cho các hóa đơn > 1.825 ngày (5 năm) nhưng vẫn hiển thị trong báo cáo.

---

## 4. Thiết kế Dashboard — Lý do chọn từng page

### Page 1 — Overview (Tổng quan)

**Mục tiêu:** Cho Ban giám đốc / quản lý cấp cao cái nhìn toàn cảnh trong 30 giây.

| Thành phần | Lý do chọn |
|---|---|
| 4 KPI Cards | Con số then chốt nhất: tổng nợ, nợ quá hạn, số KH, rủi ro Loại 2 |
| Bar Chart — Chi nhánh | So sánh hiệu quả thu hồi giữa 4 chi nhánh |
| Pie Chart — Nhóm loại hình | Tỷ trọng công nợ phân bổ theo mô hình kinh doanh |
| Cơ cấu Công Nợ theo Mức Độ Quá Hạn | Phân tích mức độ nghiêm trọng — bao nhiêu tiền đã "già" |
| Line Chart — Năm | Xu hướng nợ tích lũy qua các năm |

**Phát hiện quan trọng từ data:**
- **92,8% công nợ đang quá hạn** (249,2 / 268,6 tỷ)
- **52% hóa đơn và 60% số tiền** nằm ở bucket >365 ngày — tín hiệu rủi ro cao
- **Hà Nội: 100% công nợ quá hạn** (1,6 tỷ / 1,6 tỷ)

---

### Page 2 — DebtAnalysis (Phân tích chuyên sâu)

**Mục tiêu:** Cho kế toán / trưởng phòng tài chính phân tích nguyên nhân và phân bổ rủi ro.

| Thành phần | Lý do chọn |
|---|---|
| Progress bars — tỷ lệ QH theo CN | Trực quan hơn số tuyệt đối, so sánh tỷ lệ nhanh |
| Stacked Bar — Năm × Chi nhánh | Thấy được chi nhánh nào đóng góp vào nợ theo từng năm |
| Bảng Aging chi tiết | Tỷ lệ % từng bucket để đưa ra mức độ ưu tiên xử lý |
| Top N khách hàng | Tập trung vào ~20% KH tạo ra 80% giá trị nợ (Pareto) |

**Công thức Tỷ lệ quá hạn:**
```
overdueRate (%) = SUM(CloseBal nếu OverDue > 0) / SUM(CloseBal toàn CN) × 100
```

**Giải thích chart "Tỷ lệ Quá hạn theo Chi Nhánh":**

Mỗi dòng trong chart hiển thị 3 thông tin riêng biệt, không nên nhầm lẫn:

| Thành phần | Ý nghĩa | Ví dụ |
|---|---|---|
| Số góc trên phải | Tổng công nợ (`CloseBal`) của chi nhánh đó | 255 tỷ (Văn Phòng) |
| Chiều dài thanh bar | Số tiền quá hạn tuyệt đối so với chi nhánh có nhiều nhất | Văn Phòng dài hơn Hà Nội vì 250.5 tỷ >> 0.8 tỷ |
| "Tỷ lệ QH: X%" | % = overdueAmount / totalAmount **của chính chi nhánh đó** | 98.1% = 250.5 tỷ / 255 tỷ |
| "Quá hạn: X tỷ" | Số tiền quá hạn tuyệt đối của chi nhánh | 250.5 tỷ |

> **Lưu ý thiết kế:** Tỷ lệ % ở đây là tỷ lệ **nội bộ** của từng chi nhánh (mức độ rủi ro riêng), **không phải** % đóng góp vào tổng quá hạn toàn công ty. Văn Phòng 98.1% và Hà Nội 50% đều là tỷ lệ tính trên tổng công nợ của chính chi nhánh đó — nên không thể so sánh trực tiếp với nhau. Thanh bar mới là thứ cho phép so sánh tương quan giữa các chi nhánh (theo số tiền tuyệt đối).

---

### Page 3 — CustomerList (Danh sách khách hàng)

**Mục tiêu:** Cho nhân viên thu hồi công nợ tra cứu và lọc danh sách cần liên hệ.

**Cách tổng hợp:** Gom 3.749 hóa đơn → 804 dòng (1 dòng = 1 khách hàng)

```
Mỗi khách hàng hiển thị:
  Tổng CN      = SUM(CloseBal) tất cả hóa đơn của KH đó
  Quá hạn      = SUM(CloseBal nếu OverDue > 0)
  Ngày QH max  = MAX(OverDue) — hóa đơn trễ nhất
  Số HĐ        = COUNT(hóa đơn)
```

**4 bộ lọc độc lập:** Chi nhánh / Nhóm loại hình / Trạng thái quá hạn / Tìm kiếm tên-mã KH

---

### Page 4 — BusinessType (Loại hình kinh doanh)

**Mục tiêu:** Cho bộ phận kinh doanh thấy mô hình nào đang tạo ra nhiều công nợ nhất.

**2 cấp phân tích:**
- **Cấp nhóm** (`nhomLoaiHinh`): 4 nhóm lớn — Hợp tác, Tính phí, Tự doanh, Khác
- **Cấp chi tiết** (`JobName`): 28 loại hình cụ thể

**Top 3 loại hình theo công nợ:**
```
1. Hợp tác phân phối thuốc        : 61,6 tỷ (495 HĐ)
2. Hợp tác nhập khẩu, phân phối  : 46,9 tỷ (468 HĐ)
3. Hợp tác tính phí thuốc        : 42,5 tỷ (223 HĐ)
```

---

### Page 5 — Type2Debts (Công nợ Loại 2)

**Mục tiêu:** Trang ưu tiên xử lý — tập trung vào 114 hóa đơn rủi ro cao nhất.

**KPIs động** (thay đổi theo bộ lọc chi nhánh / tìm kiếm):
```
Số hóa đơn Loại 2    : 114
Tổng số tiền         : 5,5 tỷ
Số khách hàng liên quan: 13 KH (trung bình mỗi KH có ~8,8 HĐ Loại 2)
```

**Điểm đáng chú ý:** Có hóa đơn Loại 2 từ năm 2021 với OverDue = 1.979 ngày (~5,4 năm) và CloseBal = 159 triệu — đây là khoản nợ nghiêm trọng cần xử lý ngay.

---

## 5. Kiến trúc kỹ thuật

### Stack lựa chọn

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Framework | React 19 + Vite | Khởi tạo nhanh, HMR tốt |
| Styling | Tailwind CSS | Utility-first, không cần CSS file riêng |
| Charts | Recharts | Tích hợp tốt với React, đủ loại chart |
| Icons | MUI Icons | Bộ icon phong phú, nhất quán |
| Deploy | Vercel | Free tier, CI/CD tự động từ Git |
| Data | JSON tĩnh import | 3.749 records gọn nhẹ, không cần backend |

### Lý do không dùng Backend API

- File JSON chỉ 3,7MB, 3.749 records → đủ nhỏ để xử lý hoàn toàn phía client
- Tránh chi phí setup server, database, auth
- Data không thay đổi realtime → static approach phù hợp cho bài demo

### Cấu trúc code

```
src/
├── data/
│   └── congno.json              ← nguồn dữ liệu duy nhất
├── services/
│   └── dataService.js           ← toàn bộ logic tính toán, normalize
├── utils/
│   └── chartUtils.js            ← hằng số và formatter dùng chung
├── components/                  ← UI components tái sử dụng
│   ├── ChartCard.jsx            ← wrapper card cho biểu đồ
│   ├── ChartTooltip.jsx         ← tooltip thống nhất cho recharts
│   ├── PageHeader.jsx           ← tiêu đề trang
│   ├── EmptyTableRow.jsx        ← trạng thái bảng rỗng
│   ├── KPICard.jsx              ← thẻ KPI
│   ├── FilterBar.jsx            ← bộ lọc
│   ├── SortableHeader.jsx       ← header bảng có sort
│   ├── Pagination.jsx           ← phân trang
│   └── NhomBadge.jsx            ← badge loại hình + tooltip
├── hooks/
│   ├── useTableSort.js          ← custom hook sort bảng
│   └── usePagination.js         ← custom hook phân trang
└── pages/
    ├── Overview.jsx
    ├── DebtAnalysis.jsx
    ├── CustomerList.jsx
    ├── BusinessType.jsx
    └── Type2Debts.jsx
```

**Nguyên tắc thiết kế code:**
- Toàn bộ logic tính toán tập trung ở `dataService.js` — pages chỉ gọi hàm và render
- Dùng `for...of` và `if/else` thay vì `forEach`, `Set`, `Map` để code dễ đọc
- Mỗi page chia thành sub-components rõ ràng (BranchBarChart, AgingChart, v.v.)
- Shared components tránh lặp lại code (DRY)

---

## 6. Những điểm tôi nên hỏi trước khi làm

Nhìn lại, trước khi thực hiện bài test, tôi nên đặt các câu hỏi sau để tránh giả định:

| Câu hỏi | Tác động nếu không hỏi |
|---|---|
| File JSON đã là nguồn dữ liệu đầy đủ chưa, hay cần merge thêm từ 3 file Excel? | Có thể thiếu data, tính sai KPI |
| `phanLoaiCongNo = ""` → gọi là "Chưa xác định" có đúng không? | Sai nhãn nghiệp vụ |
| 142 records `CloseBal < 0` có tính vào tổng công nợ không? | Sai tổng 10,97 tỷ |
| `OverDue` được tính đến ngày nào — ngày export hay ngày hôm nay? | **⚠️ Đã xác minh: tính đến 01/07/2026 (ngày export), KHÔNG phải hôm nay** |
| KPI nào được ban giám đốc quan tâm nhất? | Sắp xếp ưu tiên hiển thị không đúng |
| Người dùng cuối là ai (kế toán, BGĐ, nhân viên thu hồi nợ)? | UX design không phù hợp |
