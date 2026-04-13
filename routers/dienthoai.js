var express = require('express');
var router = express.Router();
var DienThoai = require('../models/dienthoai');
var ThuongHieu = require('../models/thuonghieu');
var ChiTietDonHang = require('../models/chitietdonhang');
var multer = require('multer');
var fs = require('fs');

// 1. CẤU HÌNH LƯU TRỮ ẢNH (Multer)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        var dir = './public/images/products/';
        // Tự động tạo thư mục nếu chưa có
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Tên file = Thời gian + tên gốc (để không trùng)
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// 2. MIDDLEWARE KIỂM TRA ADMIN
const kiemTraAdmin = (req, res, next) => {
    if (!req.session.MaNguoiDung || req.session.QuyenHan != 1) {
        req.session.error = 'Bạn không có quyền truy cập trang quản lý này.';
        return res.redirect('/dangnhap');
    }
    next();
};

// ==========================================================
// PHẦN 1: DÀNH CHO KHÁCH HÀNG (Dùng dienthoai_list.ejs)
// ==========================================================

// GET: /dienthoai/list - Danh sách sản phẩm cho khách
router.get('/list', async (req, res) => {
    try {
        // Lọc 2 điều kiện: Đang cho phép bán (TrangThai = 1) VÀ còn hàng (SoLuong > 0)
        var ds = await DienThoai.find({ 
            TrangThai: 1, 
            SoLuong: { $gt: 0 } 
        }).populate('ThuongHieu');

        res.render('dienthoai_list', { 
            title: 'Cửa hàng Điện Thoại', 
            dienthoai: ds 
        });
    } catch (error) {
        res.send('Lỗi lấy dữ liệu sản phẩm!');
    }
});

// GET: /dienthoai/chitiet/:id - Xem chi tiết
router.get('/chitiet/:id', async (req, res) => {
    try {
        // 1. Phải lấy thêm danh sách thương hiệu để cái Navbar không bị trống
        var dsThuongHieu = await ThuongHieu.find().exec();

        // 2. Phải có .populate('ThuongHieu') thì mới lấy được chữ "Apple"
        var dt = await DienThoai.findById(req.params.id).populate('ThuongHieu').exec();
       
        res.render('dienthoai_chitiet', { 
            title: dt.TenSP, 
            dt: dt,
            thuonghieu: dsThuongHieu
            
        });
    } catch (error) {
        res.redirect('/dienthoai/list');
    }
});

// ==========================================================
// PHẦN 2: DÀNH CHO ADMIN (Dùng dienthoai.ejs làm trang quản lý)
// ==========================================================

// GET: /dienthoai/ - Trang chủ quản lý (Table)
router.get('/', kiemTraAdmin, async (req, res) => {
    try {
        var ds = await DienThoai.find().populate('ThuongHieu');
        let successMsg = req.session.success || '';
        req.session.success = ''; // Xóa thông báo sau khi hiện
        res.render('dienthoai', { 
            title: 'Quản lý Sản phẩm', 
            dienthoai: ds, 
            message: successMsg 
        });
    } catch (error) {
        res.send('Lỗi trang quản lý!');
    }
});

// GET: /dienthoai/them - Mở form thêm
router.get('/them', kiemTraAdmin, async (req, res) => {
    var dsThuongHieu = await ThuongHieu.find();
    res.render('dienthoai_them', { 
        title: 'Thêm Điện Thoại Mới', 
        thuonghieu: dsThuongHieu 
    });
});

// POST: /dienthoai/them - Xử lý lưu
router.post('/them', kiemTraAdmin, upload.single('HinhAnh'), async (req, res) => {
    try {
        let data = {
            TenSP: req.body.TenSP,
            ThuongHieu: req.body.ThuongHieu,
            DonGia: req.body.DonGia,
            SoLuong: req.body.SoLuong,
            ManHinh: req.body.ManHinh,
            CPU: req.body.CPU,
            Ram: req.body.Ram,
            Rom: req.body.Rom,
            Pin: req.body.Pin,
            TrangThai: req.body.TrangThai
        };
        // Nếu có upload file thì lưu đường dẫn vào DB
        if (req.file) {
            data.HinhAnh = '/images/products/' + req.file.filename;
        }

        await DienThoai.create(data);
        req.session.success = 'Đã thêm sản phẩm thành công!';
        res.redirect('/dienthoai');
    } catch (error) {
        console.log(error);
        res.send('Lỗi khi thêm sản phẩm!');
    }
});

// GET: /dienthoai/sua/:id - Mở form sửa
router.get('/sua/:id', kiemTraAdmin, async (req, res) => {
    try {
        var dsThuongHieu = await ThuongHieu.find();
        var dt = await DienThoai.findById(req.params.id);
        res.render('dienthoai_sua', { 
            title: 'Sửa thông tin', 
            thuonghieu: dsThuongHieu, 
            dt: dt 
        });
    } catch (error) {
        res.redirect('/dienthoai');
    }
});

// POST: /dienthoai/sua/:id - Xử lý cập nhật
router.post('/sua/:id', kiemTraAdmin, upload.single('HinhAnh'), async (req, res) => {
    try {
        let data = {
            TenSP: req.body.TenSP,
            ThuongHieu: req.body.ThuongHieu,
            DonGia: req.body.DonGia,
            SoLuong: req.body.SoLuong,
            ManHinh: req.body.ManHinh,
            CPU: req.body.CPU,
            Ram: req.body.Ram,
            Rom: req.body.Rom,
            Pin: req.body.Pin,
            TrangThai: req.body.TrangThai
        };
        // Chỉ cập nhật ảnh mới nếu người dùng có chọn file
        if (req.file) {
            data.HinhAnh = '/images/products/' + req.file.filename;
        }

        await DienThoai.findByIdAndUpdate(req.params.id, data);
        req.session.success = 'Cập nhật sản phẩm thành công!';
        res.redirect('/dienthoai');
    } catch (error) {
        res.send('Lỗi khi cập nhật!');
    }
});

// GET: /dienthoai/xoa/:id - Xóa sản phẩm
// GET: Xóa sản phẩm (Có kiểm tra ràng buộc dữ liệu)
router.get('/xoa/:id', kiemTraAdmin, async (req, res) => {
    try {
        var idSP = req.params.id;

        // 1. KIỂM TRA RÀNG BUỘC: Xem có đơn hàng nào từng chứa máy này không?
        // (Chỉ cần tìm thấy 1 dòng trong ChiTietDonHang là đủ để chặn)
        var spTrongDonHang = await ChiTietDonHang.findOne({ DienThoai: idSP });

        if (spTrongDonHang) {
            // CẢNH BÁO ĐỎ: Trả về thông báo lỗi, bắt buộc dùng nút "Ngừng kinh doanh"
            req.session.error = ' Không thể xóa! Sản phẩm này đã có giao dịch. Vui lòng chuyển sang trạng thái "Ngừng kinh doanh".';
            return res.redirect('/dienthoai');
        }

        // 2. NẾU AN TOÀN (Chưa ai mua bao giờ): Tiến hành xóa vĩnh viễn
        await DienThoai.findByIdAndDelete(idSP);
        
        req.session.success = 'Đã xóa sản phẩm thành công!';
        res.redirect('/dienthoai'); // Load lại trang danh sách

    } catch (error) {
        console.log("Lỗi khi xóa sản phẩm:", error);
        res.redirect('/error');
    }
});
// GET: Đổi trạng thái sản phẩm (Đang bán <-> Ngừng kinh doanh)
router.get('/doitrangthai/:id', kiemTraAdmin, async (req, res) => {
    try {
        var id = req.params.id;
        
        // 1. Tìm cái máy đó trong DB
        var dt = await DienThoai.findById(id);

        // 2. Đảo ngược trạng thái: Nếu đang 1 (bán) thì thành 0 (ngừng) và ngược lại
        var trangThaiMoi = (dt.TrangThai == 1) ? 0 : 1;

        // 3. Cập nhật vào Database
        await DienThoai.findByIdAndUpdate(id, { TrangThai: trangThaiMoi });

        // 4. Báo tin vui và quay lại trang danh sách
        req.session.success = 'Đã cập nhật trạng thái sản phẩm!';
        res.redirect('/dienthoai'); // Hoặc res.redirect(req.get('Referrer')) để đứng yên tại chỗ
        
    } catch (error) {
        console.log(error);
        res.redirect('/error');
    }
});
module.exports = router;