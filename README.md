# 🌐 Figma Localization Tool

Plugin Figma giúp dịch text UI sang bất kỳ ngôn ngữ nào bằng **Google Gemini AI**. Chọn frame, chọn ngôn ngữ, bấm dịch — xong trong vài giây.

---

## ✨ Tính năng

### Dịch thuật
- 🤖 **Dịch bằng AI** — Sử dụng Google Gemini để dịch tự nhiên, đúng ngữ cảnh UI
- 🌍 **11+ ngôn ngữ có sẵn** — Việt, Nhật, Hàn, Trung, Thái, Tây Ban Nha, Pháp, Đức, Bồ Đào Nha, Nga + tự nhập mã ISO
- 🌐 **Chọn ngôn ngữ nguồn** — Không giới hạn tiếng Anh, hỗ trợ dịch từ bất kỳ ngôn ngữ nào
- 📋 **Tự động trích xuất text** — Quét toàn bộ text layer trong frame được chọn
- 🖼️ **Không phá bản gốc** — Tạo bản sao đã dịch, giữ nguyên frame gốc

### Dịch hàng loạt (Batch)
- 🚀 **Batch translation** — Dịch sang nhiều ngôn ngữ cùng lúc từ một frame nguồn
- 📐 **Bố cục lưới tự động** — Cấu hình số cột (Cols), khoảng cách ngang (H-Gap) và dọc (V-Gap)
- 📊 **Thanh tiến trình** — Theo dõi trạng thái dịch từng ngôn ngữ trong batch

### Phát hiện tràn text (Overflow Detection)
- 🔍 **Phát hiện overflow 2 lượt** — Nhận diện text bị tràn khung hoặc bị cắt (clipped)
- 🔴 **Đánh dấu trực quan** — Viền đỏ nét đứt quanh các text node bị tràn
- 🔧 **Tự động sửa overflow** — Lượt 2 dịch lại text có giới hạn ký tự phù hợp với khung chứa

### Giao diện & Cài đặt
- 🗂️ **UI 3 tab** — Translate, Settings, Log — giao diện gọn gàng, dễ sử dụng
- 📋 **Activity Log** — Nhật ký hoạt động theo phiên, nhóm theo batch hoặc từng lượt dịch
- 📈 **Token tracking** — Theo dõi token input/output của Gemini API theo phiên
- ⚡ **Chọn model AI** — Tự do chọn model Gemini (Flash, Pro, v.v.)
- ✏️ **Tuỳ chỉnh prompt** — Điều chỉnh giọng văn, độ dài, phong cách dịch
- 💾 **Lưu cài đặt** — API key, model, prompt được lưu tự động trên máy

---

## 🔑 Hướng dẫn lấy API Key từ Google AI Studio

Bạn cần một API key **miễn phí** từ Google để sử dụng plugin.

### Các bước:

1. Truy cập **[Google AI Studio](https://aistudio.google.com/apikey)**

2. Đăng nhập bằng **tài khoản Google** của bạn

3. Nhấn nút **"Create API Key"** (Tạo API Key)

4. Chọn một Google Cloud project (hoặc tạo mới — miễn phí)

5. **Sao chép API key** — key có dạng: `AIzaSy...xxxxx`

6. **Dán vào** ô **🔑 API Key** trong plugin

> **💡 Mẹo:**
> - Bản miễn phí cho phép gọi API khá nhiều mỗi ngày — đủ dùng cho hầu hết các tác vụ dịch
> - API key được lưu **trên máy bạn** qua `clientStorage` của Figma — không gửi lên bất kỳ server nào khác
> - Giữ API key bí mật — không chia sẻ công khai

---

## 📦 Cài đặt vào Figma

1. Mở **Figma Desktop App** (bản cài trên máy tính)
2. Vào **Menu (☰)** → **Plugins** → **Development** → **Import plugin from manifest...**
3. Tìm đến thư mục project, chọn file `manifest.json`
4. Plugin sẽ xuất hiện trong **Plugins → Development**

---

## 🚀 Hướng dẫn sử dụng

### Bước 1: Mở plugin
- Click phải vào canvas → **Plugins** → **Development** → **Localization Tool**

### Bước 2: Cài đặt lần đầu (tab Settings)
- Dán **API key** từ Google AI Studio vào ô 🔑
- Nhấn **🔄 Tải model** để tải danh sách model Gemini có sẵn
- Chọn model muốn dùng (mặc định: `gemini-2.5-flash`)
- Tuỳ chỉnh prompt dịch nếu cần

### Bước 3: Dịch đơn (tab Translate)
1. **Chọn 1 Frame** trên canvas Figma
2. **Chọn ngôn ngữ nguồn** (ngôn ngữ gốc của frame)
3. **Chọn ngôn ngữ đích** từ dropdown (hoặc nhập mã ISO tuỳ ý)
4. Nhấn **🚀 Dịch ngay**
5. ✅ Frame mới xuất hiện bên cạnh frame gốc với nội dung đã dịch

### Bước 3b: Dịch hàng loạt (Batch mode)
1. **Bật chế độ Batch** trên tab Translate
2. **Tick chọn các ngôn ngữ** muốn dịch
3. **Cấu hình bố cục** — số cột, khoảng cách H-Gap và V-Gap
4. Nhấn **🚀 Dịch ngay** — plugin sẽ dịch lần lượt từng ngôn ngữ
5. ✅ Các frame đã dịch được xếp thành lưới tự động

### Bước 4: Kiểm tra overflow
- Sau khi dịch, plugin tự động phát hiện text bị tràn khung
- Các text tràn được đánh dấu viền đỏ nét đứt
- Plugin tự động dịch lại (lượt 2) với giới hạn ký tự phù hợp
- Kiểm tra tab **Log** để xem chi tiết và token đã dùng

---

## ✏️ Tuỳ chỉnh Prompt

Bạn có thể tuỳ chỉnh prompt dịch bằng cách nhấn **Hiện/Ẩn** bên cạnh mục Prompt.

### Các biến tự động thay thế:
| Biến | Mô tả |
|------|-------|
| `{{TEXT_LIST}}` | Danh sách text trích từ Figma **(bắt buộc)** |
| `{{SOURCE_LANG_NAME}}` | Tên ngôn ngữ gốc (vd: English) |
| `{{SOURCE_LANG_CODE}}` | Mã ISO ngôn ngữ gốc (vd: en) |
| `{{LANG_NAME}}` | Tên ngôn ngữ đích (vd: Tiếng Việt, Tiếng Nhật) |
| `{{LANG_CODE}}` | Mã ISO ngôn ngữ đích (vd: vi, ja, ko) |

### Ví dụ tuỳ chỉnh:
- *"Giữ nguyên tên riêng, brand name"*
- *"Dùng giọng trang trọng"* hoặc *"giọng thân mật"*
- *"Mỗi bản dịch tối đa 15 ký tự"* (khi UI hẹp)
- *"Nếu là thuật ngữ kỹ thuật phổ biến thì giữ tiếng Anh"*

---

## ⚠️ Lưu ý bảo mật

- **API key** được lưu trên máy bạn qua `clientStorage` của Figma — **không bao giờ** gửi lên server nào khác ngoài Google Gemini API
- **Quyền truy cập mạng** bị giới hạn chỉ cho domain `generativelanguage.googleapis.com`
- **Không theo dõi, không analytics** — plugin hoạt động hoàn toàn offline ngoại trừ lúc gọi API dịch

---

## 📄 Giấy phép

MIT License — xem file [LICENSE](LICENSE) để biết chi tiết.