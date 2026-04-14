const mongoose = require('mongoose');

const chiTietDonHangSchema = new mongoose.Schema({
    DonHang: { type: mongoose.Schema.Types.ObjectId, ref: 'DonHang', required: true }, 
    DienThoai: { type: mongoose.Schema.Types.ObjectId, ref: 'DienThoai', required: true }, 
    SoLuong: { type: Number, required: true },
    DonGia: { type: Number, required: true }
});

module.exports = mongoose.model('ChiTietDonHang', chiTietDonHangSchema);