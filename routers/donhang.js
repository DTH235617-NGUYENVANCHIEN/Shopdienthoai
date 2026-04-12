var express = require('express');
var router = express.Router();
var DonHang = require('../models/donhang');
var ChiTietDonHang = require('../models/chitietdonhang');
var DienThoai = require('../models/dienthoai');
const TaiKhoan = require('../models/taikhoan'); 
const { guiEmailDatHang } = require('../utils/mailer');

// Middleware kiểm tra xem đã đăng nhập chưa (Giống thầy)
const kiemTraDangNhap = (req, res, next) => {
    if (!req.session.MaNguoiDung) {
        req.session.error = 'Vui lòng đăng nhập để xem đơn hàng!';
        return res.redirect('/dangnhap');
    }
    next();
};

// Middleware kiểm tra Quyền Admin
const kiemTraAdmin = (req, res, next) => {
    if (!req.session.MaNguoiDung || req.session.QuyenHan != 1) {
        req.session.error = 'Chỉ Admin mới có quyền quản lý đơn hàng.';
        return res.redirect('/dangnhap');
    }
    next();
};

// =======================================================
// 1. DÀNH CHO KHÁCH HÀNG
// =======================================================
// 1. THÊM SẢN PHẨM VÀO GIỎ HÀNG
router.get('/them/:id', async (req, res) => {
    try {
        var idSP = req.params.id;
        // Tìm thông tin điện thoại khách vừa bấm
        var sp = await DienThoai.findById(idSP).exec();

        if (!sp) return res.redirect('/error');

        // Nếu giỏ hàng chưa tồn tại trong Session thì tạo một mảng rỗng
        if (!req.session.giohang) {
            req.session.giohang = [];
        }

        // Kiểm tra xem món này đã có trong giỏ chưa
        var giohang = req.session.giohang;
        var viTri = giohang.findIndex(item => item.idSP == idSP);

        if (viTri >= 0) {
            // Đã có rồi thì tăng số lượng lên 1
            giohang[viTri].SoLuong += 1;
            giohang[viTri].ThanhTien = giohang[viTri].SoLuong * giohang[viTri].DonGia;
        } else {
            // Chưa có thì nhét món mới vào giỏ
            giohang.push({
                idSP: sp._id,
                TenSP: sp.TenSP,
                HinhAnh: sp.HinhAnh ? sp.HinhAnh.replace('/img/', '/images/') : '',
                DonGia: sp.DonGia,
                SoLuong: 1,
                ThanhTien: sp.DonGia
            });
        }

        // Báo thông báo màu xanh lá là đã thêm thành công
        req.session.success = 'Đã thêm ' + sp.TenSP + ' vào giỏ!';
        
        // Trở lại đúng cái trang mà khách vừa đứng (Giống hệt cách ông làm bên Admin)
        res.redirect(req.get('Referrer') || '/');

    } catch (error) {
        console.log(error);
        res.redirect('/error');
    }
});
// Route mới chuyên xử lý AJAX (không redirect)
router.get('/them-ajax/:id', async (req, res) => {
    try {
        var idSP = req.params.id;
        var sp = await DienThoai.findById(idSP).exec();
        
        if (!req.session.giohang) req.session.giohang = [];
        var giohang = req.session.giohang;
        var viTri = giohang.findIndex(item => item.idSP == idSP);

        if (viTri >= 0) {
            giohang[viTri].SoLuong += 1;
            giohang[viTri].ThanhTien = giohang[viTri].SoLuong * giohang[viTri].DonGia;
        } else {
            giohang.push({
                idSP: sp._id,
                TenSP: sp.TenSP,
                HinhAnh: sp.HinhAnh,
                DonGia: sp.DonGia,
                SoLuong: 1,
                ThanhTien: sp.DonGia
            });
        }

        // Tính lại tổng số lượng để trả về cho trình duyệt
        let newTotal = 0;
        // Nếu ông đếm theo DÒNG:
        newTotal = giohang.length; 
        // Nếu ông đếm theo TỔNG SẢN PHẨM thì dùng vòng lặp cộng dồn như cũ nhé.

        // TRẢ VỀ JSON (Đây là chìa khóa để không load trang)
        res.json({
            success: true,
            newTotal: newTotal
        });

    } catch (error) {
        res.json({ success: false });
    }
});
// 2. XEM GIỎ HÀNG
router.get('/giohang', (req, res) => {
    // Lấy giỏ hàng từ session ra, nếu không có thì gán là mảng rỗng
    var giohang = req.session.giohang || [];
    
    // Tính tổng tiền của cả giỏ hàng
    var tongTien = 0;
    for (let item of giohang) {
        tongTien += item.ThanhTien;
    }

    res.render('giohang', {
        title: 'Giỏ hàng của bạn',
        giohang: giohang,
        tongTien: tongTien
    });
});
// GET: Danh sách đơn hàng CỦA TÔI (Giống 'baiviet/cuatoi' của thầy)
router.get('/cuatoi', kiemTraDangNhap, async (req, res) => {
    // Lấy Mã người dùng đang đăng nhập
    var id = req.session.MaNguoiDung;
    
    // Tìm các đơn hàng do người này đặt
    var dh = await DonHang.find({ KhachHang: id }).sort({ NgayLap: -1 }).exec();
    
    res.render('donhang_cuatoi', {
        title: 'Đơn hàng của tôi',
        donhang: dh
    });
});

// GET: Xem chi tiết 1 đơn hàng cụ thể
router.get('/chitiet/:id', kiemTraDangNhap, async (req, res) => {
    var id = req.params.id;
    var dh = await DonHang.findById(id).populate('KhachHang');
    var chitiet = await ChiTietDonHang.find({ DonHang: id }).populate('DienThoai');
    
    res.render('donhang_chitiet', {
        title: 'Chi tiết đơn hàng',
        donhang: dh,
        chitietdonhang: chitiet
    });
});


// =======================================================
// 2. DÀNH CHO ADMIN
// =======================================================

// GET: Danh sách TẤT CẢ đơn hàng (Giống 'baiviet/' của thầy)
router.get('/', kiemTraAdmin, async (req, res) => {
    var dh = await DonHang.find().populate('KhachHang').sort({ NgayLap: -1 }).exec();
    
    res.render('donhang', {
        title: 'Quản lý đơn hàng',
        donhang: dh
    });
});

// GET: Duyệt đơn hàng / Cập nhật trạng thái (Giống 'baiviet/duyet/:id' của thầy)
router.get('/duyet/:id', kiemTraAdmin, async (req, res) => {
    var id = req.params.id;
    var dh = await DonHang.findById(id);
    
    // Logic cập nhật trạng thái: 0 (Chờ duyệt) -> 1 (Đang giao) -> 2 (Đã giao thành công)
    var trangThaiMoi = dh.TrangThai;
    if (dh.TrangThai == 0) trangThaiMoi = 1;
    else if (dh.TrangThai == 1) trangThaiMoi = 2;
    
    await DonHang.findByIdAndUpdate(id, { 'TrangThai': trangThaiMoi });
    
    req.session.success = 'Đã cập nhật trạng thái đơn hàng!';
    res.redirect(req.get('Referrer') || '/donhang'); // Trở lại trang trước (Giống hệt thầy)
});

// GET: Xóa / Hủy đơn hàng (Giống 'baiviet/xoa/:id' của thầy)
router.get('/xoa/:id', async (req, res) => {
    var id = req.params.id;
    
    // Xóa đơn hàng chính
    await DonHang.findByIdAndDelete(id);
    
    // Xóa luôn các chi tiết của đơn hàng đó để dọn rác DB
    await ChiTietDonHang.deleteMany({ DonHang: id });
    
    req.session.success = 'Đã hủy đơn hàng thành công!';
    res.redirect(req.get('Referrer') || '/donhang/cuatoi');
});

// GET: Tăng số lượng sản phẩm thêm 1
router.get('/tang/:id', (req, res) => {
    var idSP = req.params.id;
    var giohang = req.session.giohang || [];
    var viTri = giohang.findIndex(item => item.idSP == idSP);

    if (viTri >= 0) {
        giohang[viTri].SoLuong += 1;
        giohang[viTri].ThanhTien = giohang[viTri].SoLuong * giohang[viTri].DonGia;
    }
    res.redirect('/donhang/giohang');
});

// GET: Giảm số lượng sản phẩm đi 1
router.get('/giam/:id', (req, res) => {
    var idSP = req.params.id;
    var giohang = req.session.giohang || [];
    var viTri = giohang.findIndex(item => item.idSP == idSP);

    if (viTri >= 0) {
        if (giohang[viTri].SoLuong > 1) {
            giohang[viTri].SoLuong -= 1;
            giohang[viTri].ThanhTien = giohang[viTri].SoLuong * giohang[viTri].DonGia;
        } 
    }
    res.redirect('/donhang/giohang');
});

// GET: Xóa hẳn 1 món khỏi giỏ hàng
router.get('/xoa-mon/:id', (req, res) => {
    var idSP = req.params.id;
    var giohang = req.session.giohang || [];
    
    req.session.giohang = giohang.filter(item => item.idSP != idSP);
    req.session.success = 'Đã xóa sản phẩm khỏi giỏ hàng!';
    res.redirect('/donhang/giohang');
});

// CHUC NANG NAY DE GUI EMAIL THONG BAO DAT HANG THANH CONG SE DUOC VIET TRONG utils/mailer.js, SAU DO GOI HAM DO TAI DAY KHI KHACH HANG CHOT DON THANH CONG. O DAY TOI GIUP ONG GOI HAM guiEmailDatHang() NEU KHACH HANG CO EMAIL TRONG DATABASE, VA TRUYEN CAC THAM SO CAN THIET DE GUI MAIL. ONG CHI CAN COPY ĐOẠN CODE DƯỚI VÀ DÁN VÀO SAU KHI LƯU ĐƠN HÀNG THÀNH CÔNG TRONG ROUTER POST '/xacnhan' Ở PHẦN 2 DÀNH CHO KHÁCH HÀNG Ở TRÊN.
// GET: Hiển thị trang thanh toán
router.get('/thanhtoan', kiemTraDangNhap, (req, res) => {
    let giohang = req.session.giohang || [];
    
    if (giohang.length === 0) {
        req.session.error = 'Giỏ hàng của bạn đang trống!';
        return res.redirect('/');
    }

    // 1. Lấy danh sách ID khách vừa tick từ trên URL xuống
    let dsIdDuocChon = req.query.ids ? req.query.ids.split(',') : [];

    // 2. LỌC GIỎ HÀNG: Chỉ lấy những món khách có tick
    let giohangDuocChon = giohang.filter(sp => dsIdDuocChon.includes(sp.idSP.toString()));

    if (giohangDuocChon.length === 0) {
        req.session.error = 'Vui lòng chọn sản phẩm cần thanh toán!';
        return res.redirect('/giohang');
    }

    // 3. Tính tổng tiền (chỉ tính cho những món đã chọn)
    let tongTien = 0;
    giohangDuocChon.forEach(sp => tongTien += sp.ThanhTien);

    // 4. BÍ KÍP: Lưu mấy món đã lọc này vào một cái "giỏ nháp" để lát chốt đơn xài
    req.session.giohang_tam = giohangDuocChon;

    res.render('thanhtoan', { 
        title: 'Thanh toán đơn hàng', 
        giohang: giohangDuocChon, // Chỉ ném những món đã lọc ra màn hình Tóm tắt
        tongTien: tongTien,
        HoVaTen: req.session.HoVaTen
    });
});

// 2. POST: Chốt đơn hàng & Ghi vào Database
router.post('/xacnhan', kiemTraDangNhap, async (req, res) => {
    try {
        let giohangChotDon = req.session.giohang_tam || [];
        if (giohangChotDon.length === 0) return res.redirect('/');

        let tongTien = 0;
        giohangChotDon.forEach(sp => tongTien += sp.ThanhTien);

        // A. Tạo Đơn Hàng mới
        const donMoi = new DonHang({
            // Vế TRÁI là tên cột trong Schema của ông | Vế PHẢI là dữ liệu lấy từ Form/Session
            KhachHang: req.session.MaNguoiDung,         
            NguoiNhan: req.body.HoTenNhan,              
            SDT: req.body.DienThoaiNhan,                
            DiaChi: req.body.DiaChiNhan,                
            GhiChu: req.body.GhiChu,
            PhuongThucTT: req.body.PhuongThucThanhToan, // Lưu cái MoMo hoặc COD vào đây nè
            TongTien: tongTien,
            TrangThai: 0 // 0: Chờ xác nhận
        });
        const donDaLuu = await donMoi.save();

        // B. Lưu Chi tiết Đơn hàng (Duyệt qua từng món trong giỏ)
        for (let sp of giohangChotDon) {
            const chiTiet = new ChiTietDonHang({
                DonHang: donDaLuu._id,   
                DienThoai: sp.idSP, 
                SoLuong: sp.SoLuong,
                DonGia: sp.DonGia,
                ThanhTien: sp.ThanhTien
            });
            await chiTiet.save();
        }

        // C. Gửi Email thông báo (Lấy Email từ Database dựa vào ID)
        const user = await TaiKhoan.findById(req.session.MaNguoiDung);
        if (user && user.Email) {
            // Cắt bớt ID đơn hàng cho ngắn gọn (Lấy 6 số cuối)
            let maDonNgan = donDaLuu._id.toString().slice(-6).toUpperCase();
            guiEmailDatHang(user.Email, req.body.HoTenNhan, maDonNgan, tongTien);
        }
        let idsDaMua = giohangChotDon.map(sp => sp.idSP.toString()); // Lấy ID mấy món vừa mua
        // Lọc lại giỏ gốc: Chỉ giữ lại những món CHƯA MUA
        req.session.giohang = req.session.giohang.filter(sp => !idsDaMua.includes(sp.idSP.toString()));
        
       
        await TaiKhoan.findByIdAndUpdate(req.session.MaNguoiDung, { GioHang: req.session.giohang });
        req.session.giohang_tam = null;
        req.session.success = 'Đặt hàng thành công! Đang chờ Shop duyệt đơn.';
        res.redirect('/'); // Xong thì đưa khách về trang chủ (hoặc trang Lịch sử đơn hàng)

    } catch (error) {
        console.log(error);
        req.session.error = 'Có lỗi xảy ra khi đặt hàng!';
        res.redirect('/donhang/thanhtoan');
    }
});
module.exports = router;