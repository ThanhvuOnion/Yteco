# Tài liệu Dashboard Công Nợ — Yteco

> Tài liệu này giải thích cách tính, công thức, và ý nghĩa của từng số liệu
> hiển thị trên 5 trang dashboard, dựa trên file `congno.json` (3.749 bản ghi).

---

## 1. Nguồn dữ liệu

| Thuộc tính | Giá trị |
|---|---|
| File | `src/data/congno.json` |
| Tổng bản ghi | 3.749 hóa đơn |
| Loại tiền | Toàn bộ VND |
| Nguồn gốc | Export từ phần mềm ERP nội bộ Yteco |

---

## 2. Ý nghĩa các Fields chính

### 2.1 Trường tài chính

| Field | Tên đầy đủ | Ý nghĩa | Ghi chú |
|---|---|---|---|
| `Amount` | Số tiền hóa đơn | Tổng giá trị hóa đơn gốc | Luôn dương |
| `PaidAmount` | Số đã thanh toán | Khách đã trả bao nhiêu | 0 nếu chưa trả |
| `CloseBal` | **Số dư cuối kỳ** | **Số tiền còn lại chưa thu** | Trường chính để tính mọi KPI |
| `OriginalCloseBal` | Số dư nguyên tệ | Giống `CloseBal` (toàn bộ VND) | Không dùng |
| `DueAmount` | Số tiền quá hạn | Phần `CloseBal` đã vượt hạn | Tham khảo |
| `OriginalAmount` | Số tiền nguyên tệ | Giống `Amount` (toàn bộ VND) | Không dùng |

**Công thức cốt lõi:**
```
CloseBal = Amount - PaidAmount
```
Kiểm tra: đúng với 3.648 / 3.749 records (97.3%).

**Ví dụ:**
```
DocNo     : XBH-2605-1470
Amount    : 36.750.000 đ   ← giá trị hóa đơn gốc
PaidAmount:          0 đ   ← chưa thanh toán
CloseBal  : 36.750.000 đ   ← toàn bộ vẫn còn nợ
```

---

### 2.2 Trường thời hạn & quá hạn

| Field | Ý nghĩa | Giá trị phổ biến |
|---|---|---|
| `DueDate` | Payment term — số ngày được phép nợ | 0, 30, 45, 60, 90, 120 ngày |
| `OverDue` | **Số ngày đã quá hạn** | 0 = trong hạn, >0 = quá hạn |

**`DueDate` phân bố trong data:**
| Payment term | Số hóa đơn |
|---|---|
| 0 ngày (thanh toán ngay) | 2.610 HĐ |
| 90 ngày | 586 HĐ |
| 30 ngày | 345 HĐ |
| 60 ngày | 97 HĐ |
| 45 ngày | 63 HĐ |

**Ví dụ đọc `OverDue`:**
```
OverDue = 0    → Hóa đơn vẫn trong hạn thanh toán
OverDue = 4    → Đã quá hạn 4 ngày
OverDue = 1979 → Đã quá hạn 1.979 ngày (~5,4 năm)
```

---

### 2.3 Trường phân loại

| Field | Ý nghĩa | Các giá trị có trong data |
|---|---|---|
| `BranchCode` | Mã chi nhánh | A01, A02, A03, A04 |
| `nhomLoaiHinh` | Nhóm loại hình kinh doanh | Hợp tác, Tính phí, Tự doanh, "" |
| `phanLoaiCongNo` | Phân loại rủi ro công nợ | Loại 1, Loại 2, "" |
| `JobName` | Tên loại hình kinh doanh chi tiết | 28 giá trị khác nhau, "" |
| `JobCode` | Mã loại hình kinh doanh | Có thể trống |

**Mapping `BranchCode`:**
| Code | Tên | Số HĐ | Tổng CN |
|---|---|---|---|
| A01 | Văn phòng | 3.353 | 255,3 tỷ |
| A04 | Cần Thơ | 293 | 10,6 tỷ |
| A02 | Hà Nội | 82 | 1,6 tỷ |
| A03 | Đà Nẵng | 21 | 1,1 tỷ |

---

### 2.4 Trường định danh khách hàng & hóa đơn

| Field | Ý nghĩa |
|---|---|
| `CustomerCode` | Mã khách hàng (dùng để nhóm theo KH) |
| `CustomerName` | Tên đầy đủ (có thể có tiền tố `XX99999_`) |
| `PersonName1` | Tên thay thế nếu `CustomerName` trống |
| `DocNo` | Số hóa đơn |
| `DocDate` | Ngày phát hành hóa đơn |
| `DocCode` | Loại chứng từ (H2 = phiếu hoàn trả) |
| `Year` | Năm kế toán |

---

### 2.5 Các trường KHÔNG sử dụng

| Field | Lý do bỏ qua |
|---|---|
| `CloseBal_00` → `CloseBal_06` | Cột hiển thị ERP — bị overlap, không cộng lại được |
| `OriginalCloseBal_XX` | Như trên, thêm nguyên tệ |
| `_ColorAllRow`, `_BackColorCellDueDate` | Metadata giao diện ERP |
| `OriginalAmount`, `OriginalCloseBal` | Toàn bộ VND nên = Amount / CloseBal |
| `OriginalPaidAmount`, `DueOriginalAmount` | Như trên |

> **Tại sao `CloseBal_XX` không dùng được?**
> Mỗi hóa đơn xuất hiện trong nhiều cột cùng lúc:
> ```
> Record OverDue=104 ngày → CloseBal_03T = 9tr, CloseBal_04 = 9tr, CloseBal_06 = 9tr
> → Nếu cộng tất cả sẽ tính 9tr × 3 lần = sai
> ```

---

## 3. Quy tắc chuẩn hóa dữ liệu (Normalize)

Áp dụng khi load JSON, trước khi hiển thị:

| Field gốc | Giá trị gốc | Sau chuẩn hóa |
|---|---|---|
| `nhomLoaiHinh` | `""` (1.393 HĐ) | `"Khác"` |
| `phanLoaiCongNo` | `""` (2.648 HĐ) | `"Chưa xác định"` |
| `JobName` | `""` (508 HĐ) | `"Khác"` |
| `CustomerName` | `"NC99999_Tên KH"` | Bỏ tiền tố → `"Tên KH"` |
| `BranchCode` | `"A01"` | `"Văn phòng"` (qua BRANCH_MAP) |
| `OverDue` | `null` | `0` |

**Công thức phân bucket tuổi nợ (`overdueBucket`):**
```
OverDue = 0         → "Trong hạn"
OverDue 1–30        → "1 - 30 ngày"
OverDue 31–90       → "31 - 90 ngày"
OverDue 91–180      → "91 - 180 ngày"
OverDue 181–365     → "181 - 365 ngày"
OverDue > 365       → "> 365 ngày"
```

**Lưu ý `CloseBal` âm (142 records):**
- Xảy ra khi `DocCode = "H2"` (phiếu hoàn trả / credit note)
- `PaidAmount >= Amount` nên `CloseBal < 0`
- Dashboard **bao gồm** các giá trị này → làm giảm tổng công nợ xuống ~10,97 tỷ
- Đây là nghiệp vụ hợp lệ, không phải lỗi dữ liệu

---

## 4. Trang 1 — Overview (Tổng quan)

### 4.1 KPI Cards

**Card 1 — Tổng công nợ phải thu**
```
Công thức : SUM(CloseBal) trên toàn bộ 3.749 records
Kết quả   : 268,6 tỷ đồng
Phụ chú   : "3.749 giao dịch"
```

**Card 2 — Công nợ quá hạn**
```
Công thức : SUM(CloseBal) với điều kiện OverDue > 0
Kết quả   : 249,2 tỷ đồng
Tỷ lệ     : (249,2 / 268,6) × 100 = 92,8%
Số records: 3.335 / 3.749 hóa đơn đang quá hạn
```

**Card 3 — Số khách hàng**
```
Công thức : Đếm CustomerCode duy nhất (không trùng lặp)
Kết quả   : 804 khách hàng
Ghi chú   : Một KH có thể có nhiều hóa đơn
```

**Card 4 — Công nợ Loại 2**
```
Công thức : Đếm số records có phanLoaiCongNo = "Loại 2"
Kết quả   : 114 hóa đơn
Ý nghĩa   : Công nợ rủi ro cao, cần ưu tiên xử lý
```

---

### 4.2 Biểu đồ: Công nợ theo Chi nhánh (Bar Chart)

**Công thức:**
```
Với mỗi BranchCode (A01–A04):
  totalAmount   = SUM(CloseBal)            ← tổng tất cả HĐ của chi nhánh
  overdueAmount = SUM(CloseBal) nếu OverDue > 0  ← phần quá hạn
  count         = COUNT(records)
```

**Kết quả:**
| Chi nhánh | Tổng CN | Quá hạn | Số HĐ |
|---|---|---|---|
| Văn phòng | 255,3 tỷ | 239,7 tỷ | 3.353 |
| Cần Thơ | 10,6 tỷ | 7,5 tỷ | 293 |
| Hà Nội | 1,6 tỷ | 1,6 tỷ | 82 |
| Đà Nẵng | 1,1 tỷ | 0,4 tỷ | 21 |

---

### 4.3 Biểu đồ: Phân bổ Nhóm Loại Hình (Pie Chart)

**Công thức:**
```
Nhóm theo nhomLoaiHinh (đã chuẩn hóa):
  value = SUM(CloseBal)
  count = COUNT(records)
```

**Kết quả:**
| Nhóm | Tổng CN | Số HĐ |
|---|---|---|
| Hợp tác | 114,6 tỷ | 1.127 |
| Khác (trống) | 59,8 tỷ | 1.393 |
| Tính phí | 50,9 tỷ | 571 |
| Tự doanh | 43,4 tỷ | 658 |

---

### 4.4 Biểu đồ: Aging — Phân tích Tuổi Nợ (Bar Chart)

**Công thức:**
```
Áp dụng hàm getOverdueBucket(OverDue) để phân nhóm:
  Với mỗi bucket:
    amount = SUM(CloseBal)
    count  = COUNT(records)
```

**Kết quả:**
| Bucket | Số HĐ | Số tiền |
|---|---|---|
| Trong hạn | 414 | 19,4 tỷ |
| 1 - 30 ngày | 374 | 38,9 tỷ |
| 31 - 90 ngày | 552 | 24,1 tỷ |
| 91 - 180 ngày | 163 | 6,4 tỷ |
| 181 - 365 ngày | 299 | 18,7 tỷ |
| > 365 ngày | **1.947** | **161,1 tỷ** |

> Nhận xét: **52% hóa đơn và 60% số tiền** nằm ở bucket >365 ngày — đây là vấn đề cần ưu tiên xử lý.

---

### 4.5 Biểu đồ: Xu hướng Công nợ theo Năm (Line Chart)

**Công thức:**
```
Nhóm theo docYear = DocDate.slice(0, 4)  ← lấy 4 ký tự đầu của ngày HĐ
  totalAmount   = SUM(CloseBal)
  overdueAmount = SUM(CloseBal) nếu OverDue > 0
```

**Kết quả nổi bật:**
| Năm | Tổng CN | Số HĐ | Ghi chú |
|---|---|---|---|
| 2021 | 26,3 tỷ | 230 | Bắt đầu tăng mạnh |
| 2022 | 32,7 tỷ | 481 | |
| 2024 | 42,2 tỷ | 505 | |
| 2025 | 36,6 tỷ | 700 | |
| 2026 | 91,6 tỷ | 1.338 | Cao nhất, data đến tháng 5/2026 |

---

## 5. Trang 2 — Phân tích Công Nợ (DebtAnalysis)

### 5.1 Tỷ lệ quá hạn theo Chi nhánh (Progress Bars)

**Công thức:**
```
overdueRate (%) = (overdueAmount / totalAmount) × 100
```

**Ví dụ — Hà Nội:**
```
totalAmount   = 1,6 tỷ
overdueAmount = 1,6 tỷ
overdueRate   = (1,6 / 1,6) × 100 = 100%  ← toàn bộ Hà Nội đang quá hạn
```

---

### 5.2 Công nợ theo Năm & Chi nhánh (Stacked Bar)

**Công thức:**
```
Nhóm theo (docYear, branchName):
  Giá trị mỗi ô = SUM(CloseBal)
```
Mỗi bar là 1 năm, màu sắc tách biệt theo 4 chi nhánh.

---

### 5.3 Bảng Chi tiết Tuổi Nợ

**Công thức thêm — Tỷ lệ (%):**
```
tỷLệ (%) = (count của bucket / tổng tất cả records) × 100
```

**Ví dụ — bucket "> 365 ngày":**
```
count  = 1.947
tổng   = 3.749
tỷ lệ  = (1.947 / 3.749) × 100 = 51,9%
```

---

### 5.4 Top Khách hàng Nợ nhiều nhất (Table)

**Công thức (nhóm theo CustomerCode):**
```
totalAmount    = SUM(CloseBal)
overdueAmount  = SUM(CloseBal) nếu OverDue > 0
maxOverdueDays = MAX(OverDue)
count          = COUNT(hóa đơn của KH đó)
```

**Ví dụ — KH01111:**
```
Số hóa đơn    : 513
totalAmount   : 71,4 tỷ  (KH lớn nhất)
maxOverdueDays: lấy từ hóa đơn có OverDue lớn nhất của KH này
```

**Bộ lọc:**
- Top N: 5 / 10 / 20 khách hàng
- Sắp xếp theo: Tổng CN / Quá hạn / Ngày QH max / Số hóa đơn

---

## 6. Trang 3 — Danh sách Khách hàng (CustomerList)

### Cách tổng hợp (1 dòng = 1 khách hàng)

**Công thức:**
```
Nhóm theo CustomerCode:
  name           = tên của record đầu tiên
  totalAmount    = SUM(CloseBal)
  overdueAmount  = SUM(CloseBal) nếu OverDue > 0
  maxOverdueDays = MAX(OverDue)
  invoiceCount   = COUNT(records)
```

**Ví dụ minh hoạ:**
```
CustomerCode: KH00535
Tên KH      : [tên khách hàng]
Số HĐ       : 620 hóa đơn
totalAmount : 38,1 tỷ
```

### Bộ lọc

| Bộ lọc | Logic |
|---|---|
| Tìm kiếm | name.includes(query) OR code.includes(query) |
| Chi nhánh | branchName === filter |
| Loại hình | nhomLoaiHinh === filter |
| Trạng thái | Trong hạn: maxOverdueDays = 0 |
| | 1–30 ngày: 0 < maxOverdueDays ≤ 30 |
| | 31–90 ngày: 30 < maxOverdueDays ≤ 90 |
| | >90 ngày: maxOverdueDays > 90 |

---

## 7. Trang 4 — Loại Hình Kinh Doanh (BusinessType)

### 7.1 Summary Cards (4 thẻ nhóm)

**Công thức:**
```
Nhóm theo nhomLoaiHinh:
  value      = SUM(CloseBal)
  count      = COUNT(records)
  percentage = (value / tổng tất cả) × 100
```

---

### 7.2 Pie Chart + Progress Bars

```
Hiển thị 4 nhóm nhomLoaiHinh:
  Hợp tác : 114,6 tỷ (42,7%)
  Khác    :  59,8 tỷ (22,3%)
  Tính phí:  50,9 tỷ (19,0%)
  Tự doanh:  43,4 tỷ (16,2%)
```

---

### 7.3 Top 10 JobName (Horizontal Bar)

**Công thức:**
```
Nhóm theo JobName (đã chuẩn hóa — trống → "Khác"):
  amount = SUM(CloseBal)
  count  = COUNT(records)
Lấy top 10 theo amount
```

**Top 5 JobName:**
| Loại hình | Số HĐ | Tổng CN |
|---|---|---|
| Hợp tác phân phối thuốc | 495 | 61,6 tỷ |
| Hợp tác nhập khẩu, phân phối thuốc | 468 | 46,9 tỷ |
| Hợp tác tính phí thuốc (không qua kho) | 223 | 42,5 tỷ |
| Tự doanh thuốc làm thị trường trực tiếp | 607 | 42,2 tỷ |
| Khác (JobName trống — 508 HĐ) | 508 | 33,6 tỷ |

---

## 8. Trang 5 — Công nợ Loại 2 (Type2Debts)

### Điều kiện lọc
```
phanLoaiCongNo === "Loại 2"
→ 114 bản ghi thỏa mãn
```

### 8.1 KPI Row (3 thẻ động — thay đổi theo bộ lọc)

```
recordCount    = COUNT(filteredRecords)            = 114
totalAmount    = SUM(CloseBal) trong filteredRecords = 5,5 tỷ
uniqueCustomers = COUNT(CustomerCode duy nhất)      = 13
```

**Ví dụ — 1 record Loại 2:**
```
CustomerCode  : NC00082
DocNo         : 0016997
DocDate       : 2021-01-29
CloseBal      : 159.070.149 đ
OverDue       : 1.979 ngày  (~5,4 năm quá hạn)
nhomLoaiHinh  : Khác
phanLoaiCongNo: Loại 2
```

### 8.2 Top 10 Khách hàng Loại 2 (Bar Chart)

**Công thức:**
```
Nhóm theo CustomerCode trong filteredRecords:
  amount = SUM(CloseBal)
  count  = COUNT(records)
Lấy top 10
```

### 8.3 Bảng chi tiết

Hiển thị từng hóa đơn Loại 2 (không gom nhóm), có:
- Bộ lọc theo chi nhánh
- Tìm kiếm theo tên KH / mã KH / số HĐ
- Sắp xếp theo bất kỳ cột nào
- Phân trang

---

## 9. Sơ đồ quan hệ các Fields

```
congno.json (3.749 records)
│
├── Mỗi record = 1 hóa đơn
│     ├── CustomerCode ──→ nhóm lại → 804 khách hàng
│     ├── BranchCode   ──→ map → branchName (4 chi nhánh)
│     ├── CloseBal     ──→ trường tiền chính (Amount - PaidAmount)
│     ├── OverDue      ──→ số ngày quá hạn → phân bucket aging
│     ├── nhomLoaiHinh ──→ "" → "Khác" | Hợp tác | Tính phí | Tự doanh
│     ├── phanLoaiCongNo → "" → "Chưa xác định" | "Loại 1" | "Loại 2"
│     ├── JobName      ──→ "" → "Khác" | 27 loại hình khác
│     └── DocDate      ──→ slice(0,4) → docYear (2010–2026)
│
└── Các trường BỎ QUA
      ├── CloseBal_00 ~ CloseBal_06  (cột ERP, bị overlap)
      ├── OriginalCloseBal_XX        (nguyên tệ, toàn VND)
      └── _ColorAllRow, _BackColor.. (metadata ERP)
```

---

## 10. Câu hỏi thường gặp

**Q: Tại sao tổng công nợ là 268,6 tỷ thay vì 279,6 tỷ?**
> A: Dashboard tính `SUM(CloseBal)` bao gồm 142 records có CloseBal âm (phiếu hoàn trả DocCode H2). Các phiếu này làm giảm tổng đi ~10,97 tỷ. Đây là nghiệp vụ hợp lệ.

**Q: Tại sao 92,8% công nợ đang quá hạn — con số này có cao bất thường không?**
> A: 3.335 / 3.749 hóa đơn có OverDue > 0. Điều này phản ánh thực trạng thu hồi công nợ của công ty — đặc biệt có 1.947 HĐ (52%) quá hạn trên 365 ngày, cần ưu tiên xử lý.

**Q: "Khác" trong nhóm loại hình là gì?**
> A: 1.393 hóa đơn có `nhomLoaiHinh = ""` (trống) trong ERP — thường là dữ liệu cũ (2021–2023) chưa được phân loại hoặc loại hình đặc biệt.

**Q: Tại sao có 804 khách hàng nhưng 3.749 hóa đơn?**
> A: Mỗi khách hàng có thể có nhiều hóa đơn. Ví dụ KH00535 có tới 620 hóa đơn. Dashboard trang CustomerList gom tất cả hóa đơn của cùng một `CustomerCode` thành 1 dòng.
