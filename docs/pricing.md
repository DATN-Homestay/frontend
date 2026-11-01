# Lịch giá và gợi ý AI (REQ-021)

Trang `/host/pricing` dùng API NestJS; trình duyệt không gọi trực tiếp FastAPI. Backend chịu trách nhiệm lấy dữ liệu thị trường và gọi AI service.

## Chạy

1. Khởi động AI service và backend theo [hướng dẫn REQ-021](../../backend/docs/REQ-021.md).
2. Từ thư mục `frontend`, chạy `npm run dev`.
3. Đăng nhập tài khoản Host/Admin sở hữu homestay, mở **Lịch giá & AI Đề xuất**.

Khi chạy local, `/api` được proxy đến `http://localhost:3000`. Dùng `VITE_PROXY_TARGET` nếu backend chạy ở địa chỉ khác. Khi triển khai, cấu hình `VITE_API_URL` là origin của backend, không thêm `/api/v1` vì API client đã thêm tiền tố này.

## Hành vi

- Chọn homestay, phòng và ngày từ hôm nay theo giờ Việt Nam. Có thể chọn trực tiếp một ngày trên lịch.
- Lịch tải đúng tháng đang xem, gồm các ngày ở đầu/cuối tuần thuộc tháng liền kề. Ngày chưa có bản ghi lịch dùng giá gốc theo quy tắc backend.
- **Giá gốc**, **giá đang bán**, **giá AI đề xuất** và **giá Host muốn áp dụng** được hiển thị riêng. Sửa ô nhập không thay đổi mức giá đề xuất đã tính.
- Hiển thị số chỗ nghỉ tương đồng, giá thị trường, tỷ lệ kín phòng, yếu tố nhu cầu, giải thích và cảnh báo từ backend.
- Khi thiếu dữ liệu, giá thị trường/tỷ lệ kín phòng hiện “Chưa có dữ liệu”; giá đang bán giữ nguyên và không thể áp dụng giá AI.
- Giá nhập phải nằm trong ±30% giá gốc, tối đa hai chữ số thập phân. Biên giá được so sánh bằng đơn vị tiền nhỏ nhất để tránh lỗi số thực.
- **Áp dụng giá** mở bước xác nhận phòng/ngày/số tiền; chỉ sau xác nhận mới gửi PUT. **Giữ giá hiện tại** đóng gợi ý mà không gửi cập nhật.
- Ngày đang có khách giữ chỗ có thể xem gợi ý nhưng không được áp dụng. “Không mở bán” có thể do Host đóng lịch hoặc do đặt phòng; thay đổi giá không mở lại phòng.
- Gợi ý cũ, dữ liệu thay đổi hoặc khóa thanh toán trả HTTP 409: xóa gợi ý, tải lại lịch và yêu cầu lấy gợi ý mới. Lỗi AI hiển thị thông báo và cho thử lại, không dùng dữ liệu mô phỏng.
- Đổi phòng/ngày sẽ bỏ kết quả AI cũ. Phản hồi đến muộn của phòng/tháng trước không ghi đè lựa chọn hiện tại.
- Cập nhật giá hàng loạt giữ cố định phòng tại thời điểm mở hộp thoại và kiểm tra những ngày đang giữ chỗ trước khi gửi cập nhật.

## Kiểm tra

Các kiểm thử dùng dữ liệu cố định và không thay đổi database thật. Tiện ích ngày/tiền dùng Node.js 24 trở lên:

```powershell
npm run test:pricing
```

`npx vite build` kiểm tra đóng gói giao diện. Lệnh build đầy đủ hiện còn bị chặn bởi lỗi TypeScript sẵn có ở các trang Admin và `HomestayDetail`, ngoài phần dự đoán giá.
