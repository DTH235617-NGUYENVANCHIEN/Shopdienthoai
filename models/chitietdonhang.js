const mongoose = require('mongoose');

const chiTietDonHangSchema = new mongoose.Schema({
    DonHang: { type: mongoose.Schema.Types.ObjectId, ref: 'DonHang', required: true }, // Khóa ngoại liên kết với file donhang.js
    DienThoai: { type: mongoose.Schema.Types.ObjectId, ref: 'DienThoai', required: true }, // Khóa ngoại liên kết với file dienthoai.js
    SoLuong: { type: Number, required: true },
    DonGia: { type: Number, required: true } // Giá tại thời điểm mua
});

module.exports = mongoose.model('ChiTietDonHang', chiTietDonHangSchema);