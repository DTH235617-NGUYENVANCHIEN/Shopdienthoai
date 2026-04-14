const mongoose = require('mongoose');

const donHangSchema = new mongoose.Schema({
    KhachHang: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan' }, 
    NguoiNhan: { type: String, required: true },
    SDT: { type: String, required: true },
    DiaChi: { type: String, required: true },
    GhiChu: { type: String },
    PhuongThucTT: { type: String, default: 'Thanh toán khi nhận hàng (COD)' },
    TongTien: { type: Number, required: true },
    TrangThai: { type: Number, default: 0 }, 
    NgayLap: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DonHang', donHangSchema);