var express = require('express');
var router = express.Router();
var DonHang = require('../models/donhang');
var ThuongHieu = require('../models/thuonghieu');
var ChiTietDonHang = require('../models/chitietdonhang');
var DienThoai = require('../models/dienthoai');
const TaiKhoan = require('../models/taikhoan'); 
const { guiEmailDatHang,guiEmailDuyetDon,guiEmailThongBaoAdmin } = require('../utils/mailer');

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
//  dành cho khách hàng
//  thêm sản phẩm vào giỏ
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
        
        // Trở lại đúng cái trang mà khách vừa đứng 
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
        

        // trả về cái json để không load trang
        res.json({
            success: true,
            newTotal: newTotal
        });

    } catch (error) {
        res.json({ success: false });
    }
});
// xem giỏ hàng
router.get('/giohang', kiemTraDangNhap,(req, res) => {
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
// GET: Danh sách đơn hàng của tôi
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
// GET: Xóa hẳn 1 món khỏi giỏ hàng
router.get('/xoa-mon/:id', (req, res) => {
    var idSP = req.params.id;
    var giohang = req.session.giohang || [];
    
    req.session.giohang = giohang.filter(item => item.idSP != idSP);
    req.session.success = 'Đã xóa sản phẩm khỏi giỏ hàng!';
    res.redirect('/donhang/giohang');
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
// GET: Khách hàng tự hủy đơn
router.get('/huy/:id', kiemTraDangNhap, async (req, res) => {
    try {
        var id = req.params.id;
        var dh = await DonHang.findById(id);

        // láy giờ hiện tại trừ đi giờ tạo hóa đơn rồi đổi ra phút và làm tròn bằng Math.floor
        let soPhutDaQua = Math.floor((new Date() - new Date(dh.NgayLap)) / (1000 * 60));
        
        // Khách chỉ được hủy đơn CỦA MÌNH, đang Chờ duyệt, và dưới 30 phút
        if (dh.KhachHang == req.session.MaNguoiDung && dh.TrangThai == 0 && soPhutDaQua <= 30) {
            // Đổi trạng thái thành -1 (Đã hủy)
            await DonHang.findByIdAndUpdate(id, { TrangThai: -1 });
            req.session.success = 'Đã hủy đơn hàng thành công!';
        } else {
            req.session.error = 'Không thể hủy đơn hàng này!';
        }
        
        res.redirect('/donhang/cuatoi');
    } catch (error) {
        console.log(error);
        res.redirect('/error');
    }
});
// Dành cho ADMIN: Quản lý toàn bộ đơn hàng
router.get('/', async (req, res) => {
    try {
        // 1. Trạm gác Admin
        if (!req.session.MaNguoiDung || req.session.QuyenHan != 1) {
            req.session.error = "Bạn không có quyền truy cập!";
            return res.redirect('/');
        }

        // 2. Lấy dữ liệu 
        var dsThuongHieu = await ThuongHieu.find().exec();
        var dsDonHang = await DonHang.find().sort({ NgayLap: -1 }).exec();

        // 3. Render ra giao diện
        res.render('donhang', {
            title: 'Quản lý đơn hàng của hệ thống',
            thuonghieu: dsThuongHieu, 
            donhang: dsDonHang       
        });

    } catch (error) {
        console.log("Lỗi:", error);
        res.redirect('/error');
    }
});
// GET: Duyệt đơn hàng
router.get('/duyet/:id', kiemTraAdmin, async (req, res) => {
    try {
        var id = req.params.id;
        // 1. PHẢI CÓ .populate('KhachHang') thì mới lấy được Email để gửi
        var dh = await DonHang.findById(id).populate('KhachHang');
        if (!dh) return res.redirect('/donhang');
        // 2. LOGIC TRỪ KHO: Nên trừ khi Duyệt đơn (Từ Chờ xác nhận 0 -> Đang giao 1)
        if (dh.TrangThai == 0) { 
            // Tìm tất cả các món trong đơn hàng này 
            var chiTiet = await ChiTietDonHang.find({ DonHang: id });

            // Chạy vòng lặp để trừ số lượng từng món trong kho
            for (let item of chiTiet) {
                await DienThoai.findByIdAndUpdate(item.DienThoai, {
                    $inc: { SoLuong: -item.SoLuong } 
                });
            }
        }
        // 3. Cập nhật trạng thái đơn hàng
        // Nếu là 0 (Chờ duyệt) -> lên 1 (Đang giao)
        // Nếu là 1 (Đang giao) -> lên 2 (Đã giao)
        var trangThaiMoi = (dh.TrangThai == 0) ? 1 : 2;
        await DonHang.findByIdAndUpdate(id, { 'TrangThai': trangThaiMoi });
        
        // 4. Gửi email Chỉ gửi khi chuyển sang Đang giao
        if (trangThaiMoi == 1 && dh.KhachHang && dh.KhachHang.Email) {
            let maDonNgan = dh._id.toString().slice(-6).toUpperCase();
            // Gọi hàm gửi mail báo hàng đang đi
            guiEmailDuyetDon(dh.KhachHang.Email, dh.NguoiNhan, maDonNgan);
        }
        
        req.session.success = (trangThaiMoi == 1) 
            ? 'Đã duyệt đơn, trừ kho và gửi mail thông báo cho khách!' 
            : 'Đã cập nhật trạng thái đơn hàng thành Đã giao!';
            
        res.redirect(req.get('Referrer') || '/donhang');

    } catch (error) {
        console.log("Lỗi duyệt đơn:", error);
        req.session.error = 'Có lỗi xảy ra khi xử lý đơn hàng!';
        res.redirect('/donhang');
    }
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
router.get('/tang/:id', async (req, res) => { // Thêm chữ async ở đây
    try {
        var idSP = req.params.id;
        var giohang = req.session.giohang || [];
        var viTri = giohang.findIndex(item => item.idSP == idSP);

        if (viTri >= 0) {
            // 1. Tìm máy này trong Database để check kho thực tế
            var spTrongKho = await DienThoai.findById(idSP);

            // 2. Kiểm tra: Nếu tăng thêm 1 mà vượt quá số lượng trong kho
            if (giohang[viTri].SoLuong + 1 > spTrongKho.SoLuong) {
                // Báo lỗi cho khách biết (Dùng cái req.session.error mà ông hay xài á)
                req.session.error = `Xin lỗi, cửa hàng hiện chỉ còn ${spTrongKho.SoLuong} máy này!`;
                return res.redirect('/donhang/giohang');
            }

            // 3. Nếu còn đủ hàng thì mới cho tăng
            giohang[viTri].SoLuong += 1;
            giohang[viTri].ThanhTien = giohang[viTri].SoLuong * giohang[viTri].DonGia;
            
            req.session.success = 'Đã cập nhật số lượng!';
        }
        res.redirect('/donhang/giohang');
    } catch (error) {
        console.log(error);
        res.redirect('/donhang/giohang');
    }
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



// GET: Hiển thị trang thanh toán
router.get('/thanhtoan', kiemTraDangNhap, async (req, res) => {
    try {
        let giohang = req.session.giohang || [];
        
        if (giohang.length === 0) {
            req.session.error = 'Giỏ hàng của bạn đang trống!';
            return res.redirect('/');
        }

        //  Lấy danh sách ID khách vừa tick từ trên URL xuống
        let dsIdDuocChon = req.query.ids ? req.query.ids.split(',') : [];

        //  LỌC GIỎ HÀNG: Chỉ lấy những món khách có tick
        let giohangDuocChon = giohang.filter(sp => dsIdDuocChon.includes(sp.idSP.toString()));

        if (giohangDuocChon.length === 0) {
            req.session.error = 'Vui lòng chọn sản phẩm cần thanh toán!';
            return res.redirect('/giohang');
        }
        
        //  Tính tổng tiền (chỉ tính cho những món đã chọn)
        let tongTien = 0;
        giohangDuocChon.forEach(sp => tongTien += sp.ThanhTien);

        //  Lưu mấy món đã lọc này vào một cái "giỏ nháp" để lát chốt đơn xài
        req.session.giohang_tam = giohangDuocChon;

        //  Lấy thông tin user từ DB để lấy SĐT và Địa chỉ
        const user = await TaiKhoan.findById(req.session.MaNguoiDung);


        res.render('thanhtoan', { 
            title: 'Thanh toán đơn hàng', 
            giohang: giohangDuocChon, 
            tongTien: tongTien,
            user: user // Ném cục user này sang EJS để điền sẵn form
        });

    } catch (error) {
        console.log("Lỗi trang thanh toán:", error);
        res.redirect('/error');
    }
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

            guiEmailThongBaoAdmin(maDonNgan, req.body.HoTenNhan, tongTien);
        }
        let idsDaMua = giohangChotDon.map(sp => sp.idSP.toString()); // Lấy ID mấy món vừa mua
        // Lọc lại giỏ gốc: Chỉ giữ lại những món CHƯA MUA
        req.session.giohang = req.session.giohang.filter(sp => !idsDaMua.includes(sp.idSP.toString()));
        
       // luu lại thông tin địa chỉ và điện thoại mới cập nhật của khách vào tài khoản để lần sau khỏi phải nhập
        await TaiKhoan.findByIdAndUpdate(req.session.MaNguoiDung, {
            GioHang: req.session.giohang,
            DienThoai: req.body.DienThoaiNhan,   
            DiaChi: req.body.DiaChiNhan
        });
        req.session.giohang_tam = null; 
        req.session.success = 'Đặt hàng thành công! Đang chờ Shop duyệt đơn.';
        res.redirect('/'); // Xong thì đưa khách về trang chủ (hoặc trang Lịch sử đơn hàng)

    } catch (error) {
        console.log(error);
        req.session.error = 'Có lỗi xảy ra khi đặt hàng!';
        res.redirect('/donhang/thanhtoan');
    }
});

// GET: ADMIN HỦY ĐƠN / XỬ LÝ BOM HÀNG
router.get('/admin-huy/:id', kiemTraAdmin, async (req, res) => {
    try {
        var id = req.params.id;
        var dh = await DonHang.findById(id);
        
        // 1. NẾU LÀ ĐƠN "ĐANG GIAO (1)" BỊ BOM HÀNG
        // Lúc duyệt (0 -> 1) mình đã TRỪ kho rồi, giờ Hủy thì phải CỘNG LẠI kho
        if (dh.TrangThai == 1) {
            var chiTiet = await ChiTietDonHang.find({ DonHang: id });
            
            // Vòng lặp cộng trả lại kho
            for (let item of chiTiet) {
                await DienThoai.findByIdAndUpdate(item.DienThoai, {
                    $inc: { SoLuong: item.SoLuong } // Đưa số dương để CỘNG THÊM
                });
            }
            req.session.success = 'Đã báo Bom Hàng và cộng trả số lượng vào kho!';
        } 
        // 2. NẾU LÀ ĐƠN "CHỜ XÁC NHẬN (0)" ADMIN TỰ HỦY
        // Chưa trừ kho nên chỉ cần đổi trạng thái, không cần làm gì thêm
        else if (dh.TrangThai == 0) {
            req.session.success = 'Đã hủy đơn hàng thành công!';
        }

        // 3. Đổi trạng thái đơn hàng thành -1 (Đã hủy)
        await DonHang.findByIdAndUpdate(id, { TrangThai: -1 });
        
        res.redirect(req.get('Referrer') || '/admin/donhang');

    } catch (error) {
        console.log("Lỗi Admin Hủy Đơn:", error);
        res.redirect('/error');
    }
});
module.exports = router;