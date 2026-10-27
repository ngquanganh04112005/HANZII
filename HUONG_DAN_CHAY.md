# 🏮 Hướng Dẫn Chạy Project HANZII

## ✅ Yêu Cầu

- **Node.js** đã được cài (cài tại https://nodejs.org, chọn bản LTS)
- **npm** đi kèm tự động khi cài Node.js

---

## 🚀 Lần Đầu Chạy (chỉ làm 1 lần)

Mở **PowerShell** hoặc **Terminal**, chạy từng lệnh sau:

```powershell
# 1. Di chuyển vào thư mục project
cd d:\NguyenQuangAnh\PRJ_1\HANZII

# 2. Thêm Node.js vào PATH (nếu npm chưa được nhận dạng)
$env:Path = "C:\Program Files\nodejs;" + $env:Path

# 3. Cài dependencies (chỉ cần làm 1 lần duy nhất)
npm install
```

> ⏳ Bước `npm install` có thể mất **3-5 phút** lần đầu do tải ~500MB packages.

---

## ▶️ Chạy Project (mỗi lần muốn dùng)

```powershell
# 1. Di chuyển vào thư mục project
cd d:\NguyenQuangAnh\PRJ_1\HANZII

# 2. Thêm Node.js vào PATH (nếu cần)
$env:Path = "C:\Program Files\nodejs;" + $env:Path

# 3. Khởi động dev server
npm run dev
```

Sau đó mở trình duyệt và truy cập:

## 👉 http://localhost:8080/

---

## ⚠️ Lưu Ý

| Vấn đề | Giải pháp |
|--------|-----------|
| `npm` không được nhận dạng | Chạy `$env:Path = "C:\Program Files\nodejs;" + $env:Path` trước |
| Port 8080 bị chiếm | Tắt ứng dụng đang dùng port 8080 rồi thử lại |
| Lỗi sau khi pull code mới | Chạy lại `npm install` |

---

## 🛑 Dừng Server

Nhấn **`Ctrl + C`** trong terminal để dừng dev server.

---

## 🛠️ Các Lệnh Khác

```powershell
npm run build      # Build production
npm run preview    # Xem bản build
npm run lint       # Kiểm tra lỗi code
npm run test       # Chạy tests
```

---

> 💡 **Tip**: Sau khi restart máy tính, bạn có thể cần chạy lại lệnh `$env:Path` trước khi dùng npm.  
> Để fix vĩnh viễn, vào **Control Panel → System → Advanced → Environment Variables** và thêm `C:\Program Files\nodejs` vào biến `Path`.
