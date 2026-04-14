const mongoose = require('mongoose');

const dienThoaiSchema = new mongoose.Schema({
    TenSP: { type: String, required: true },
    ThuongHieu: { type: mongoose.Schema.Types.ObjectId, ref: 'ThuongHieu' }, 
    DonGia: { type: Number, required: true },
    SoLuong: { type: Number, default: 10 },
    HinhAnh: { type: String },
    // Cấu hình rút gọn
    ManHinh: { type: String },
    CPU: { type: String },
    Ram: { type: String },
    Rom: { type: String },
    Pin: { type: String },
    TrangThai: { type: Number, default: 1 } 
});

module.exports = mongoose.model('DienThoai', dienThoaiSchema);