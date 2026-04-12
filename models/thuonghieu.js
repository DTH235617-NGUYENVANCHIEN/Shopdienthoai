const mongoose = require('mongoose');

const thuongHieuSchema = new mongoose.Schema({
    TenThuongHieu: { type: String, required: true },
    HinhAnh: { type: String },
    MoTa: { type: String }
});

module.exports = mongoose.model('ThuongHieu', thuongHieuSchema);