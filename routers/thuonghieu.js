var express = require('express');
var router = express.Router();
var ThuongHieu = require('../models/thuonghieu');
var DienThoai = require('../models/dienthoai'); 
var multer = require('multer');
var fs = require('fs');

// --- CẤU HÌNH LƯU TRỮ ẢNH ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        var dir = './public/images/brands/';
        // Tự động tạo thư mục nếu chưa có
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Đặt tên file: Thời gian hiện tại + tên gốc để tránh trùng
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware: Kiểm tra Admin
const kiemTraAdmin = (req, res, next) => {
    if (!req.session.MaNguoiDung || req.session.QuyenHan != 1) {
        req.session.error = 'Bạn không có quyền truy cập trang quản lý này.';
        return res.redirect('/dangnhap');
    }
    next();
};

// GET: Danh sách thương hiệu (Giao diện Quản lý)
router.get('/', kiemTraAdmin, async (req, res) => {
    try {
        var dsThuongHieu = await ThuongHieu.find();
        res.render('thuonghieu', { 
            title: 'Quản lý Thương Hiệu', 
            thuonghieu: dsThuongHieu 
        });
    } catch (error) {
        console.log(error);
    }
});

// GET: Form thêm thương hiệu
router.get('/them', kiemTraAdmin, (req, res) => {
    res.render('thuonghieu_them', { title: 'Thêm Thương Hiệu' });
});

// POST: Xử lý thêm (Đã thêm upload.single)
router.post('/them', kiemTraAdmin, upload.single('HinhAnh'), async (req, res) => {
    try {
        var data = {
            TenThuongHieu: req.body.TenThuongHieu,
            MoTa: req.body.MoTa
        };
        // Nếu có chọn file ảnh thì mới lưu đường dẫn vào Database
        if (req.file) {
            data.HinhAnh = '/images/brands/' + req.file.filename;
        }

        await ThuongHieu.create(data);
        req.session.success = 'Đã thêm thương hiệu mới!';
        res.redirect('/thuonghieu');
    } catch (error) {
        req.session.error = 'Lỗi khi thêm thương hiệu.';
        res.redirect('/thuonghieu/them');
    }
});

// GET: Form sửa thương hiệu
router.get('/sua/:id', kiemTraAdmin, async (req, res) => {
    try {
        var th = await ThuongHieu.findById(req.params.id);
        res.render('thuonghieu_sua', { 
            title: 'Sửa Thương Hiệu', 
            thuonghieu: th 
        });
    } catch (error) {
        console.log(error);
    }
});

// POST: Xử lý sửa (Đã thêm upload.single)
router.post('/sua/:id', kiemTraAdmin, upload.single('HinhAnh'), async (req, res) => {
    try {
        var data = {
            TenThuongHieu: req.body.TenThuongHieu,
            MoTa: req.body.MoTa
        };
        // Chỉ cập nhật HinhAnh nếu Admin chọn file mới
        if (req.file) {
            data.HinhAnh = '/images/brands/' + req.file.filename;
        }

        await ThuongHieu.findByIdAndUpdate(req.params.id, data);
        req.session.success = 'Đã cập nhật thương hiệu!';
        res.redirect('/thuonghieu');
    } catch (error) {
        req.session.error = 'Lỗi khi cập nhật.';
        res.redirect('/thuonghieu');
    }
});

// GET: Xử lý xóa
router.get('/xoa/:id', async (req, res) => {
    try {
        var id = req.params.id;

        // 1. Kiểm tra xem có sản phẩm nào thuộc thương hiệu này không
        var coSanPham = await DienThoai.findOne({ ThuongHieu: id });

        if (coSanPham) {
            // Nếu tìm thấy dù chỉ 1 máy, báo lỗi và không cho xóa
            req.session.error = 'Không thể xóa! Vẫn còn sản phẩm thuộc thương hiệu này.';
            return res.redirect('/thuonghieu');
        }

        // 2. Nếu không có máy nào thì mới tiến hành xóa
        await ThuongHieu.findByIdAndDelete(id);
        req.session.success = 'Đã xóa thương hiệu thành công!';
        res.redirect('/thuonghieu');

    } catch (error) {
        res.redirect('/error');
    }
});

module.exports = router;