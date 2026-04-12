const mongoose = require('mongoose');

const dienThoaiSchema = new mongoose.Schema({
    TenSP: { type: String, required: true },
    ThuongHieu: { type: mongoose.Schema.Types.ObjectId, ref: 'ThuongHieu' }, // Liên kết tới bảng Thương Hiệu
    DonGia: { type: Number, required: true },
    SoLuong: { type: Number, default: 10 },
    HinhAnh: { type: String },
    // Cấu hình rút gọn
    ManHinh: { type: String },
    CPU: { type: String },
    Ram: { type: String },
    Rom: { type: String },
    Pin: { type: String },
    TrangThai: { type: Number, default: 1 } // 1: Đang bán, 0: Ngừng kinh doanh
});

module.exports = mongoose.model('DienThoai', dienThoaiSchema);