var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');
var multer = require('multer'); 
var fs = require('fs');
const {guiEmailChaoMung} = require('../utils/mailer');

// CẤU HÌNH NƠI LƯU ẢNH
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        var dir = './public/images/users';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware: Chốt chặn bắt buộc đăng nhập
const kiemTraDangNhap = (req, res, next) => {
    if (!req.session.MaNguoiDung) {
        req.session.error = 'Vui lòng đăng nhập để tiếp tục!';
        return res.redirect('/dangnhap');
    }
    next();
};

// GET: Đăng ký
router.get('/dangky', async (req, res) => {
    let thongBao = req.session.error || req.session.success || '';
    req.session.error = ''; req.session.success = '';
    res.render('dangky', { title: 'Đăng ký tài khoản', message: thongBao });
});

// POST: Đăng ký 
router.post('/dangky', upload.single('HinhAnh'), async (req, res) => {
    try {
        if (req.body.MatKhau !== req.body.XacNhanMatKhau) {
            req.session.error = 'Mật khẩu xác nhận không khớp!';
            return res.redirect('/dangky');
        }
        var salt = bcrypt.genSaltSync(10);
        let duongDanAnh = req.file ? '/images/users/' + req.file.filename : '';

        var data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email,
            HinhAnh: duongDanAnh, 
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt),
            QuyenHan: 0,
            KichHoat: 1
        };
        await TaiKhoan.create(data);
        guiEmailChaoMung(req.body.Email, req.body.HoVaTen);
        req.session.success = 'Đăng ký thành công! Mời bạn đăng nhập.';
        res.redirect('/dangnhap');
    } catch (err) {
        req.session.error = 'Tên đăng nhập đã tồn tại!';
        res.redirect('/dangky');
    }
});

// GET: Đăng nhập
router.get('/dangnhap', async (req, res) => {
    let thongBao = req.session.error || req.session.success || '';
    req.session.error = ''; req.session.success = '';
    res.render('dangnhap', { title: 'Đăng nhập', message: thongBao });
});

// POST: Đăng nhập
router.post('/dangnhap', async (req, res) => {
    var taikhoan = await TaiKhoan.findOne({ TenDangNhap: req.body.TenDangNhap }).exec();
    if(taikhoan && bcrypt.compareSync(req.body.MatKhau, taikhoan.MatKhau)) {
        if(taikhoan.KichHoat == 0) {
            req.session.error = 'Tài khoản đã bị khóa!';
            return res.redirect('/dangnhap');
        }
        req.session.MaNguoiDung = taikhoan._id;
        req.session.HoVaTen = taikhoan.HoVaTen;
        req.session.QuyenHan = taikhoan.QuyenHan;

        
        // phân quyền trang
        if (taikhoan.QuyenHan == 1) {
            // Nếu là ADMIN: Bay thẳng vào trang quản trị
            res.redirect('/admin'); 
        } else {
            // Nếu là KHÁCH: Bay về trang chủ bán hàng
            // THÊM ĐÚNG 1 DÒNG NÀY ĐỂ PHỤC HỒI GIỎ HÀNG
            req.session.giohang = taikhoan.GioHang || [];
            res.redirect('/');
        }
    } else {
        req.session.error = 'Sai tên đăng nhập hoặc mật khẩu!';
        res.redirect('/dangnhap');
    }
});

// GET: Trang cá nhân
router.get('/caidat', kiemTraDangNhap, async (req, res) => {
    try {
        var tk = await TaiKhoan.findById(req.session.MaNguoiDung);
        let thongBao = req.session.error || req.session.success || '';
        req.session.error = ''; req.session.success = '';
        res.render('caidat', { title: 'Cài đặt cá nhân', taikhoan: tk, message: thongBao });
    } catch (err) { res.redirect('/'); }
});
// POST: Cập nhật thông tin cá nhân (Họ tên, Email, Ảnh)
router.post('/caidat/capnhat', kiemTraDangNhap, upload.single('HinhAnh'), async (req, res) => {
    try {
        var dataUpdate = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email
        };

        // Nếu người dùng có chọn ảnh mới thì cập nhật link ảnh mới
        if (req.file) {
            dataUpdate.HinhAnh = '/images/users/' + req.file.filename;
        }

        await TaiKhoan.findByIdAndUpdate(req.session.MaNguoiDung, dataUpdate);
        
        // Cập nhật lại tên hiển thị trên Session để Navbar đổi tên theo luôn
        req.session.HoVaTen = req.body.HoVaTen;

        req.session.success = 'Đã cập nhật hồ sơ cá nhân thành công!';
        res.redirect('/caidat');
    } catch (err) {
        console.log(err);
        req.session.error = 'Lỗi cập nhật hồ sơ!';
        res.redirect('/caidat');
    }
});
// POST: Đổi mật khẩu
router.post('/caidat/doimatkhau', kiemTraDangNhap, async (req, res) => {
    try {
        var tk = await TaiKhoan.findById(req.session.MaNguoiDung);
        if(!bcrypt.compareSync(req.body.MatKhauCu, tk.MatKhau)) {
            req.session.error = 'Mật khẩu cũ không đúng!';
            return res.redirect('/caidat#doimatkhau');
        }
        if(req.body.MatKhauMoi !== req.body.XacNhanMatKhau) {
            req.session.error = 'Xác nhận mật khẩu mới không khớp!';
            return res.redirect('/caidat#doimatkhau');
        }
        var salt = bcrypt.genSaltSync(10);
        await TaiKhoan.findByIdAndUpdate(req.session.MaNguoiDung, { 
            MatKhau: bcrypt.hashSync(req.body.MatKhauMoi, salt) 
        });
        req.session.success = 'Đã đổi mật khẩu thành công!';
        res.redirect('/caidat');
    } catch (err) { res.redirect('/caidat'); }
});

// GET: Đăng xuất
router.get('/dangxuat', async (req, res) => {
    try {
        // 1. Trước khi xóa session, chép giỏ hàng hiện tại lưu vào Database
        if (req.session.MaNguoiDung && req.session.giohang) {
            await TaiKhoan.findByIdAndUpdate(req.session.MaNguoiDung, { 
                GioHang: req.session.giohang 
            });
        }

        // 2. Lưu xong rồi thì mới an tâm hủy Session
        req.session.destroy();
        res.redirect('/');
        
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

module.exports = router;