# BỘ MOCKUP GIAO DIỆN HỆ THỐNG HOMESTAY BOOKING & ESCROW AI (14 MÀN HÌNH CHI TIẾT)

> **Thư mục lưu trữ**: `demonstration/`  
> **Phiên bản thiết kế**: v2.1 (Đồng bộ tuyệt đối BRD, 34 bảng CSDL MySQL 8.0, 8 Sequence Diagrams, Kiến trúc AI, API Specs)  
> **Phong cách UI/UX**: Modern Dark Glassmorphism, Micro-interactions, Tối ưu hóa trải nghiệm WebApp không viền thiết bị máy tính, chuẩn nhận diện thương hiệu **StayAI**.

---

## 1. Bản đồ luồng trải nghiệm người dùng tổng thể (User Journey Map)

```
[Khách / Host] ──► [01_Đăng nhập] / [02_Đăng ký (Role Selector)]
       │
       ├─► [PHÂN HỆ KHÁCH HÀNG (GUEST)]
       │     ├─► [03_Trang chủ: AI Search ngôn ngữ tự nhiên + Khối Địa điểm thịnh hành]
       │     ├─► [14_Ưu đãi & Khuyến mãi: Voucher ví điện tử + Festival Deal + Escrow cashback]
       │     ├─► [04_Danh sách tìm kiếm & Bản đồ tương tác Split Map]
       │     ├─► [05_Chi tiết Homestay: Bộ ảnh + Radar ABSA 4 khía cạnh + Gợi ý xung quanh]
       │     ├─► [06_Thanh toán đặt phòng: Checkbox Dịch vụ kèm theo + Huy hiệu Escrow 24h + VNPay QR]
       │     ├─► [07_Quản lý chuyến đi: Check-in/out an toàn + Modal Đánh giá 4 khía cạnh ABSA]
       │     └─► [08_Tin nhắn Realtime WebSocket trao đổi với Chủ nhà]
       │
       ├─► [PHÂN HỆ CHỦ NHÀ (HOST)]
       │     ├─► [09_Host Dashboard: Tổng quan doanh thu & Quỹ Escrow chờ giải ngân sau check-in]
       │     ├─► [10_Đăng tin Homestay: Upload ảnh Cloudinary CDN + AI CLIP check nét + Tiện ích & Dịch vụ]
       │     ├─► [11_Xác thực 4 lớp: Thang điểm tin cậy 140đ eKYC/GPS/CLIP ViT-B/32]
       │     ├─► [12_Bảng lịch & Định giá động AI: Gợi ý tăng/giảm giá theo CompSet 5km & Occupancy]
       │     └─► [08_Tin nhắn Realtime WebSocket & AI Smart Reply 3 gợi ý 1-chạm]
       │
       └─► [PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN CONSOLE)]
             └─► [13_Admin Console: Concierge Dropship + Duyệt eKYC 70-99đ + Đối soát Escrow Maker-Checker 7.5%]
```

---

## 2. Bảng tổng hợp chi tiết 14 màn hình giao diện

| STT | File Mockup | Phân hệ | Tên màn hình chức năng | Tham chiếu thiết kế kỹ thuật |
| :---: | :--- | :--- | :--- | :--- |
| **01** | `01_dang_nhap.jpg` | Auth | Trang Đăng nhập (Email/SĐT, Mật khẩu, Social OAuth) | `01_Kien_truc_tong_the.md` (Module_Auth), `04_Thiet_ke_API_Specification.md` |
| **02** | `02_dang_ky.jpg` | Auth | Trang Đăng ký (Tab chuyển Khách / Host, Điều khoản Escrow) | `01_Kien_truc_tong_the.md` (Module_Auth), `02_Thiet_ke_CSDL_Chi_tiet.md` |
| **03** | `03_trang_chu_khach_hang_ai_search.jpg` | Customer | Trang chủ & Thanh tìm kiếm AI NLP Search + Khám phá điểm đến | `01_Kien_truc_tong_the.md` (Module_AI_NLP), `05_Kien_truc_AI_Algorithms.md` |
| **04** | `04_danh_sach_tim_kiem_ban_do.jpg` | Customer | Danh sách phòng tìm kiếm & Bản đồ tương tác Split Map | `01_Kien_truc_tong_the.md` (Module_Search), `04_Thiet_ke_API_Specification.md` |
| **05** | `05_chi_tiet_homestay_radar_absa.jpg` | Customer | Trang chi tiết Homestay, Tóm tắt AI & Radar Chart ABSA | `03_Thiet_ke_Luong_Sequence.md` (FLOW-08), `05_Kien_truc_AI_Algorithms.md` |
| **06** | `06_thanh_toan_escrow_vnpay.jpg` | Customer / Escrow | Checkout đặt phòng, Dịch vụ kèm theo, Bảo chứng Escrow & VNPay | `03_Thiet_ke_Luong_Sequence.md` (FLOW-04), `04_Thiet_ke_API_Specification.md` |
| **07** | `07_quan_ly_chuyen_di_danh_gia.jpg` | Customer / Review | Quản lý Chuyến đi & Modal Đánh giá sau Check-in/Check-out | `03_Thiet_ke_Luong_Sequence.md` (FLOW-08), `02_Thiet_ke_CSDL_Chi_tiet.md` |
| **08** | `08_chat_realtime_smart_reply.jpg` | Customer & Host | Chat thời gian thực WebSocket & AI Smart Reply 3 gợi ý | `03_Thiet_ke_Luong_Sequence.md` (FLOW-07), `04_Thiet_ke_API_Specification.md` |
| **09** | `09_host_dashboard_tong_quan.jpg` | Host / Portal | Dashboard Quản lý Doanh thu & Quỹ Escrow chờ giải ngân | `01_Kien_truc_tong_the.md` (Module_Host), `03_Thiet_ke_Luong_Sequence.md` |
| **10** | `10_host_dang_tin_homestay.jpg` | Host / Property | Biểu mẫu Tạo Homestay, Upload ảnh Cloudinary & CLIP AI | `01_Kien_truc_tong_the.md` (Module_Property), `06_Bao_mat_Ha_tang.md` |
| **11** | `11_host_xac_thuc_4_lop_trust_score.jpg` | Host / eKYC | Đăng ký Xác thực Chủ nhà 4 Lớp (Thang điểm 140đ) | `03_Thiet_ke_Luong_Sequence.md` (FLOW-03), `05_Kien_truc_AI_Algorithms.md` |
| **12** | `12_host_dinh_gia_phong_dong_ai.jpg` | Host / AI Pricing | Bảng lịch & Trợ lý Điều chỉnh giá phòng động thông minh | `03_Thiet_ke_Luong_Sequence.md` (FLOW-06), `05_Kien_truc_AI_Algorithms.md` |
| **13** | `13_admin_dashboard_concierge_doi_soat.jpg` | Admin Console | Hàng đợi Concierge, Thẩm định eKYC 70-99đ & Maker-Checker 7.5% | `03_Thiet_ke_Luong_Sequence.md` (FLOW-05), `01_Kien_truc_tong_the.md` |
| **14** | `14_uu_dai_khuyen_mai.jpg` | Customer / Deals | Trang Ưu đãi, Khuyến mãi & Ví Voucher bảo chứng Escrow | `01_Kien_truc_tong_the.md` (Module_Promotion), Chuẩn Booking.com Deals |

---

## 3. Thuyết minh chi tiết từng màn hình giao diện

### 01. Trang Đăng Nhập (`01_dang_nhap.jpg`)
* **Mục tiêu**: Cung cấp cổng xác thực an toàn, thân thiện cho cả Khách hàng và Chủ nhà.
* **Thành phần**:
  * Thẻ kính mờ thủy tinh (Frosted Glassmorphism).
  * Nhập Email / Số điện thoại và Mật khẩu (có icon ẩn/hiện mật khẩu).
  * Checkbox *Ghi nhớ đăng nhập* và liên kết *Quên mật khẩu?*.
  * Nút đăng nhập chính hiệu ứng phát sáng neon (Neon Glow).
  * Tích hợp đăng nhập một chạm qua mạng xã hội: **Google OAuth 2.0** và **Facebook Login**.
  * Liên kết chuyển hướng sang màn hình Đăng ký mới.

### 02. Trang Đăng Ký Tài Khoản (`02_dang_ky.jpg`)
* **Mục tiêu**: Thu thập thông tin và phân quyền vai trò người dùng ngay từ bước khởi tạo.
* **Thành phần**:
  * Bộ chuyển đổi Segmented Tab: `[Khách du lịch]` hoặc `[Chủ nhà Homestay (Host)]`.
  * Các trường biểu mẫu: Họ và tên, Email, Số điện thoại di động, Mật khẩu, Nhập lại mật khẩu.
  * Checkbox cam kết pháp lý: *"Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo vệ thanh toán Escrow của StayAI"*.
  * Nút kêu gọi hành động: `[Đăng Ký Tài Khoản]`.

### 03. Trang Chủ Khách Hàng & Tìm Kiếm AI NLP (`03_trang_chu_khach_hang_ai_search.jpg`)
* **Mục tiêu**: Giúp khách hàng tìm kiếm phòng tự nhiên như đang trò chuyện với người bản địa.
* **Thành phần**:
  * Thanh tìm kiếm AI NLP thông minh: Cho phép nhập câu truy vấn dài ngữ nghĩa (*"Tìm homestay view đồi mộng mơ ở Đà Lạt cho 4 người có bếp nướng BBQ giá dưới 2 triệu/đêm"*).
  * Các thẻ Tag lọc nhanh: `View đồi/núi`, `Bếp BBQ sân vườn`, `Gần trung tâm`, `Host xác thực 140đ`.
  * Khối điểm đến thịnh hành (*Đà Lạt, Sa Pa, Hội An*) giúp khách click 1-chạm để lọc phòng ngay.

### 04. Danh Sách Tìm Kiếm & Bản Đồ Tương Tác Split Map (`04_danh_sach_tim_kiem_ban_do.jpg`)
* **Mục tiêu**: Cho phép khách đối chiếu trực quan vị trí phòng trên bản đồ với danh sách phòng thực tế.
* **Thành phần**:
  * Thanh lọc đa tiêu chí phía trên: Điểm đến (Đà Lạt), Khoảng ngày (18/10 - 20/10), Số khách (4 người), Thanh trượt khoảng giá (1.000.000đ - 2.500.000đ).
  * Cột bên trái: Danh sách thẻ Homestay (*Mây Lang Thang, The Kupid Hill, An Vui Villa*) đi kèm huy hiệu `Bảo chứng Escrow`, `Host 140/140đ`, điểm sao trung bình.
  * Cột bên phải: Bản đồ tối màu phong cách Cyberpunk với các ghim giá phát sáng (`1.2M`, `1.45M`, `2.1M`) và popup nổi khi người dùng di chuột qua phòng tương ứng.

### 05. Chi Tiết Homestay & Biểu Đồ Radar ABSA (`05_chi_tiet_homestay_radar_absa.jpg`)
* **Mục tiêu**: Cung cấp bức tranh toàn diện và minh bạch về chất lượng homestay dựa trên phản hồi của khách trước.
* **Thành phần**:
  * Bộ sưu tập ảnh phòng chất lượng cao (Cloudinary CDN URL).
  * Khung tóm tắt AI Review Summary tự động trích xuất ưu/nhược điểm từ hàng trăm bình luận.
  * **Biểu đồ mạng nhện (Radar Chart)** phân tích 4 khía cạnh ABSA cốt lõi:
    1. Vệ sinh & Tiện nghi (`Cleanliness & Facilities`)
    2. Vị trí & Cảnh quan (`Location & View`)
    3. Thái độ phục vụ Host (`Host & Service`)
    4. Độ tương xứng giá tiền (`Value for Money`)
  * Widget Đặt phòng nhanh bên phải với chính sách cam kết tiền phòng được bảo vệ an toàn và mục tiện ích khám phá xung quanh.

### 06. Thanh Toán Đặt Phòng & Bảo Chứng Escrow VNPay (`06_thanh_toan_escrow_vnpay.jpg`)
* **Mục tiêu**: Đảm bảo khách hàng hoàn toàn yên tâm khi xuống tiền đặt phòng.
* **Thành phần**:
  * Chi tiết hóa đơn: Giá thuê đêm, phí dọn dẹp, tùy chọn dịch vụ bổ sung (thuê xe máy, set than BBQ).
  * Huy hiệu cam kết bảo vệ Escrow: *"Tiền phòng được giữ tại tài khoản trung gian của nền tảng và chỉ giải ngân cho Host sau 24h kể từ khi Check-in an toàn"*.
  * Chính sách hủy phòng minh bạch: Hoàn 100% khi hủy trước ngày quy định.
  * Cổng thanh toán tích hợp VNPay QR, Thẻ nội địa ATM và Thẻ quốc tế Visa/MasterCard.

### 07. Quản Lý Chuyến Đi & Modal Đánh Giá Sau Check-in/Check-out (`07_quan_ly_chuyen_di_danh_gia.jpg`)
* **Mục tiêu**: Kiểm soát tính xác thực của đánh giá (chỉ khách đã hoàn tất lưu trú mới được đánh giá).
* **Thành phần**:
  * Giao diện *Chuyến đi của tôi* với các tab `Sắp tới` và `Đã hoàn thành`.
  * Thẻ đặt phòng trạng thái: `Đã Check-out an toàn • Hoàn thành`.
  * Hộp thoại Modal nổi bật *Đánh Giá & Trải Nghiệm Homestay*:
    * Xếp hạng sao tổng quan (1 - 5 sao).
    * Đánh giá chi tiết 4 khía cạnh ABSA (Vệ sinh, Vị trí, Thái độ Host, Mức độ tương xứng giá).
    * Khung nhập nhận xét chi tiết có cảm nghĩ thực tế.
    * Khu vực kéo thả tải ảnh thực tế chuyến đi để chống review ảo.
    * Nút hành động: `[Gửi Đánh Giá]`.

### 08. Chat Realtime WebSocket & AI Smart Reply (`08_chat_realtime_smart_reply.jpg`)
* **Mục tiêu**: Kết nối tức thì giữa khách và chủ nhà, đồng thời giảm 80% thời gian soạn tin nhắn cho chủ nhà.
* **Thành phần**:
  * Cửa sổ chat 2 chiều qua giao thức WebSocket (Socket.IO).
  * Thẻ thông tin phòng và thời gian đặt phòng ghim cố định ở đầu khung chat.
  * Khách nhắn hỏi: *"Chào anh, homestay mình có sẵn bếp nướng BBQ và gia vị cơ bản ngoài sân không ạ? Tụi em định nấu nướng tối thứ 7"*.
  * Thanh gợi ý thông minh **AI Smart Reply** (trích xuất tự động từ danh mục tiện nghi của homestay):
    1. *"Có sẵn bếp than nướng BBQ và gia vị mắm muối tiêu, anh chị chỉ cần mang than và đồ ăn nhé!"*
    2. *"Dạ có sẵn sân nướng BBQ miễn phí, có bàn ghế ngoài trời luôn ạ."*
    3. *"Homestay có đầy đủ đồ nướng và có hỗ trợ dọn dẹp phí 100k nếu cần ạ."*
  * Chủ nhà chỉ cần bấm 1 chạm để gửi ngay lập tức.

### 09. Host Management Dashboard Tổng Quan (`09_host_dashboard_tong_quan.jpg`)
* **Mục tiêu**: Giúp chủ nhà nắm bắt toàn bộ hoạt động kinh doanh trong nháy mắt.
* **Thành phần**:
  * Menu điều hướng phân hệ Chủ nhà bên trái.
  * Thông tin Host đã đạt chứng nhận `Host Đã Xác Thực 140/140đ`.
  * Các thẻ chỉ số kinh doanh then chốt:
    * *Doanh thu tháng này*: 48.500.000 VND (+15.4% tăng trưởng).
    * *Số dư Escrow chờ giải ngân*: 12.800.000 VND (Giải ngân sau 24h khách check-in).
    * *Tỷ lệ lấp đầy phòng*: 86%.
    * *Đánh giá trung bình*: 4.92 / 5.0 (98 lượt đánh giá).
  * Biểu đồ xu hướng doanh thu và bảng danh sách khách sắp Check-in hôm nay với nút `[Xác nhận Check-in]`.
  * Thẻ thông báo AI Alert: *"AI gợi ý tăng giá cuối tuần thêm +18%"*.

### 10. Tạo Mới Homestay & Upload Ảnh Cloudinary (`10_host_dang_tin_homestay.jpg`)
* **Mục tiêu**: Chuẩn hóa thông tin phòng và thẩm định chất lượng hình ảnh ngay khi tạo phòng.
* **Thành phần**:
  * Thanh tiến trình Stepper 4 bước: `1. Thông tin cơ bản` -> `2. Hình ảnh & Tiện ích (Active)` -> `3. Định vị GPS & Giá phòng` -> `4. Thẩm định eKYC`.
  * Khung tải ảnh trực quan kéo thả, tích hợp tự động đẩy ảnh lên **Cloudinary CDN** với URL bảo mật.
  * Bộ sưu tập ảnh phòng xem trước có nhãn chứng nhận xanh: `AI CLIP: Ảnh đạt chuẩn độ nét & xác thực`.
  * Các thẻ chọn nhanh tiện ích: Bếp nướng BBQ, Bếp nấu gia đình, Wifi, Chỗ đậu ô tô, Máy giặt/sấy.
  * Ô nhập giá niêm yết cơ bản (1.200.000 VND/đêm) và nút chuyển bước `[Tiếp tục: Xác thực Tọa độ GPS]`.

### 11. Đăng Ký Xác Thực Chủ Nhà 4 Lớp 140 Điểm (`11_host_xac_thuc_4_lop_trust_score.jpg`)
* **Mục tiêu**: Ngăn chặn 100% tình trạng lừa đảo phòng ảo, chủ nhà ma.
* **Thành phần**:
  * Thanh tiến trình tính điểm Trust Score 4 chặng:
    1. **CCCD / eKYC (+40đ)**: OCR nhận diện thông tin và mã hóa cơ sở dữ liệu bằng AES-256-CBC.
    2. **Xác thực số điện thoại OTP (+30đ)**: Liên kết SĐT chủ sở hữu chính chủ.
    3. **Tọa độ thực tế Haversine GPS (+30đ)**: Kiểm tra vị trí đứng tại homestay với sai số <50m.
    4. **Ảnh phòng thực tế CLIP Model (+40đ)**: So khớp ảnh chụp từ camera thực tế với ảnh phòng đăng ký (độ tương đồng 83.5%).
  * Huy hiệu cấp phát sau khi đạt 140/140đ: `Host Đã Xác Thực Danh Tính & Không Gian Phòng`.

### 12. Bảng Lịch & Định Giá Phòng Động Thông Minh AI (`12_host_dinh_gia_phong_dong_ai.jpg`)
* **Mục tiêu**: Giúp chủ nhà tối ưu hóa doanh thu và tỷ lệ lấp đầy theo biến động thị trường.
* **Thành phần**:
  * Bảng lịch 14 ngày thể hiện giá từng ngày và tỷ lệ lấp đầy (Occupancy).
  * Hộp thoại AI Popup thông minh đề xuất tăng giá cuối tuần **+18%** (từ 1.200.000đ lên 1.415.000đ).
  * Phần giải trình thuật toán AI (Explainable AI): Căn cứ vào dữ liệu 15 homestay tương đồng (CompSet) trong bán kính 5km có tỷ lệ lấp đầy đạt 92% do trùng dịp sự kiện văn hóa.
  * 2 nút bấm thao tác nhanh cho Host: `[Áp dụng giá mới]` hoặc `[Giữ nguyên giá]`.

### 13. Bảng Quản Trị Viên & Đối Soát Escrow Maker-Checker (`13_admin_dashboard_concierge_doi_soat.jpg`)
* **Mục tiêu**: Cung cấp công cụ vận hành thông suốt cho đội ngũ Admin nền tảng.
* **Thành phần**:
  * Hàng thẻ chỉ số vĩ mô: Doanh thu Escrow đang giữ (245.800.000đ), Hoa hồng nền tảng 7.5% (18.435.000đ), Đơn Concierge đang xử lý (12 đơn), Hồ sơ eKYC cần duyệt tay (5 hồ sơ).
  * **Hàng đợi Concierge Dropshipping**: Danh sách đặt phòng tự động qua Booking.com bằng thẻ thanh toán ảo.
  * **Bảng thẩm định eKYC thủ công**: Danh sách chủ nhà có điểm tin cậy nằm trong vùng 70-99đ để Admin đối chiếu thủ công trước khi duyệt cấp huy hiệu.
  * **Sổ cái đối soát Giải ngân Escrow (Maker-Checker 2 bước)**:
    * *Mã đơn*: BK-8829 | *Tổng tiền*: 3.600.000 VND
    * *Hoa hồng nền tảng (7.5%)*: 270.000 VND (bằng 1/2 Booking.com)
    * *Thực chi Host*: 3.330.000 VND
    * *Trạng thái*: Chờ Checker duyệt
    * Nút duyệt: `[Phê duyệt chuyển khoản Host]`.

### 14. Trang Ưu Đãi & Ví Voucher Bảo Chứng Escrow (`14_uu_dai_khuyen_mai.jpg`)
* **Mục tiêu**: Trung tâm khuyến mãi chuẩn Booking.com Deals, kích thích khách chốt đơn và tham gia đánh giá verified.
* **Thành phần**:
  * Thanh điều hướng chuẩn: `[StayAI] [Chỗ nghỉ] [Ưu đãi (Active glowing)] [Cho thuê chỗ nghỉ (Host 140đ)]`.
  * Bộ lọc nhóm deal: `Tất cả ưu đãi`, `Deal mùa lễ hội Đà Lạt`, `Ưu đãi đặt sớm (Early Bird)`, `Deal phút chót`, `Voucher Escrow`.
  * Banner sự kiện lớn: *Festival Hoa Đà Lạt 2026 - Giảm ngay 15% cho tất cả homestay view đồi*.
  * Lưới thẻ ví Voucher (Voucher Wallet Cards):
    * `STAYAI100`: Giảm 100.000 VND cho đơn đầu tiên, nút `[Lưu mã]`.
    * `ESCROW50K`: Hoàn tiền 50.000 VND khi hoàn tất Check-in & Review có ảnh thực tế.
    * `EARLYBIRD`: Giảm 12% khi đặt phòng trước 14 ngày.
  * Danh sách các Homestay đang áp dụng ưu đãi với giá gốc gạch ngang và giá ưu đãi hiển thị rõ ràng.
