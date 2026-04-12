const mongoose = require('mongoose');

const donHangSchema = new mongoose.Schema({
    KhachHang: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan' }, // ID người mua (nếu có)
    NguoiNhan: { type: String, required: true },
    SDT: { type: String, required: true },
    DiaChi: { type: String, required: true },
    GhiChu: { type: String },
    PhuongThucTT: { type: String, default: 'Thanh toán khi nhận hàng (COD)' },
    TongTien: { type: Number, required: true }, // Tổng tiền của cả đơn
    TrangThai: { type: Number, default: 0 }, // 0: Chờ xác nhận, 1: Đang giao, 2: Đã giao, 3: Đã hủy
    NgayLap: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DonHang', donHangSchema);