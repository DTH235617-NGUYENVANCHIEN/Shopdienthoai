var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');
var multer = require('multer'); // KHAI BÁO MULTER

// CẤU HÌNH LƯU ẢNH (Dùng chung thư mục uploads)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/users'); // Lưu vào thư mục public/images/user
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware: Kiểm tra Admin
const kiemTraAdmin = (req, res, next) => {
    if (!req.session.MaNguoiDung || req.session.QuyenHan != 1) {
        req.session.error = 'Chỉ Admin mới có quyền truy cập trang quản lý tài khoản.';
        return res.redirect('/dangnhap');
    }
    next();
};

// GET: Danh sách tài khoản
router.get('/', kiemTraAdmin, async (req, res) => {
    try {
        var tk = await TaiKhoan.find();
        res.render('taikhoan', { title: 'Danh sách tài khoản', taikhoan: tk });
    } catch (error) {
        console.log(error);
        res.redirect('/error');
    }
});

// GET: Thêm tài khoản
router.get('/them', kiemTraAdmin, async (req, res) => {
    res.render('taikhoan_them', { title: 'Thêm tài khoản' });
});

// POST: Thêm tài khoản (Kẹp thêm upload.single('HinhAnh'))
router.post('/them', kiemTraAdmin, upload.single('HinhAnh'), async (req, res) => {
    try {
        var salt = bcrypt.genSaltSync(10);
        
        // Xử lý lấy đường dẫn ảnh nếu Admin có up file
        let duongDanAnh = '';
        if (req.file) {
            duongDanAnh = '/images/users/' + req.file.filename;
        }

        var data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email,
            HinhAnh: duongDanAnh, // Lưu ảnh thực tế
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt),
            QuyenHan: req.body.QuyenHan || 0,
            KichHoat: req.body.KichHoat || 1
        };
        await TaiKhoan.create(data);
        req.session.success = 'Đã thêm tài khoản thành công.';
        res.redirect('/taikhoan');
    } catch (error) {
        console.log(error);
        req.session.error = 'Lỗi: Tên đăng nhập đã tồn tại hoặc hệ thống bận.';
        res.redirect('/taikhoan/them');
    }
});

// GET: Sửa tài khoản
router.get('/sua/:id', kiemTraAdmin, async (req, res) => {
    try {
        var id = req.params.id;
        var tk = await TaiKhoan.findById(id);
        res.render('taikhoan_sua', { title: 'Sửa tài khoản', taikhoan: tk });
    } catch (error) {
        console.log(error);
    }
});

// POST: Sửa tài khoản (Kẹp thêm upload.single('HinhAnh') để Admin có thể đổi ảnh)
router.post('/sua/:id', kiemTraAdmin, upload.single('HinhAnh'), async (req, res) => {
    try {
        var id = req.params.id;
        var salt = bcrypt.genSaltSync(10);
        
        var data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email,
            TenDangNhap: req.body.TenDangNhap,
            QuyenHan: req.body.QuyenHan,
            KichHoat: req.body.KichHoat
        };

        // Nếu Admin có chọn ảnh mới thì cập nhật, không thì giữ nguyên ảnh cũ
        if (req.file) {
            data.HinhAnh = '/images/users/' + req.file.filename;
        } else if (req.body.HinhAnh) {
            data.HinhAnh = req.body.HinhAnh; // Lấy từ input hidden
        }
        
        // Nếu có nhập pass mới thì mới mã hóa và lưu
        if(req.body.MatKhau && req.body.MatKhau.trim() !== '') {
            data.MatKhau = bcrypt.hashSync(req.body.MatKhau, salt);
        }
            
        await TaiKhoan.findByIdAndUpdate(id, data);
        req.session.success = 'Đã cập nhật thông tin tài khoản.';
        res.redirect('/taikhoan');
    } catch (error) {
        console.log(error);
        req.session.error = 'Lỗi khi cập nhật tài khoản.';
        res.redirect('/taikhoan/sua/' + req.params.id);
    }
});

// GET: Xóa tài khoản
router.get('/xoa/:id', kiemTraAdmin, async (req, res) => {
    try {
        var id = req.params.id;
        // Chống Admin lỡ tay xóa nhầm chính mình
        if(id == req.session.MaNguoiDung) {
            req.session.error = 'Không thể tự xóa tài khoản của chính mình!';
            return res.redirect('/taikhoan');
        }

        await TaiKhoan.findByIdAndDelete(id);
        req.session.success = 'Đã xóa tài khoản.';
        res.redirect('/taikhoan');
    } catch (error) {
        console.log(error);
    }
});
// GET: Khóa / Mở khóa tài khoản nhanh
router.get('/khoa/:id', kiemTraAdmin, async (req, res) => {
    try {
        var id = req.params.id;
        
        // Chống tự khóa chính mình
        if(id == req.session.MaNguoiDung) {
            req.session.error = 'Bạn không thể tự khóa tài khoản của mình!';
            return res.redirect('/taikhoan');
        }

        // Tìm tài khoản đó ra xem nó đang bị khóa hay đang hoạt động
        var tk = await TaiKhoan.findById(id);
        
        // Đảo ngược trạng thái: Nếu đang 1 thì thành 0, nếu đang 0 thì thành 1
        var trangThaiMoi = tk.KichHoat == 1 ? 0 : 1; 
        
        // Lưu lại vào DB
        await TaiKhoan.findByIdAndUpdate(id, { KichHoat: trangThaiMoi });
        
        req.session.success = trangThaiMoi == 1 ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!';
        res.redirect('/taikhoan');
    } catch (error) {
        console.log(error);
    }
});
module.exports = router;