const mongoose = require('mongoose');

const taikhoanSchema = new mongoose.Schema({
    HoVaTen: { type: String, required: true },
    Email: { type: String },
    HinhAnh: { type: String },
    
    TenDangNhap: { type: String, required: true, unique: true }, 
    
    MatKhau: { type: String, required: true },
    QuyenHan: { type: Number, default: 0 },
    KichHoat: { type: Number, default: 1 },
    GioHang: { type: Array, default: [] }
});

module.exports = mongoose.model('TaiKhoan', taikhoanSchema);