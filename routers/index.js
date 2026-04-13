    var express = require('express');
    var router = express.Router();
    var ThuongHieu = require('../models/thuonghieu');
    var DienThoai = require('../models/dienthoai');
    var TaiKhoan = require('../models/taikhoan');
    var DonHang = require('../models/donhang');

    // 1. GET: Trang chủ (Gộp cả logic phân quyền và chia nhãn hàng)
    router.get('/', async (req, res) => {
        try {
            // Lấy danh sách tất cả thương hiệu
            var dsThuongHieu = await ThuongHieu.find().exec();

            // Lấy sản phẩm theo từng nhãn hàng (mỗi hãng 4 cái mới nhất)
            var dataTrangChu = await Promise.all(dsThuongHieu.map(async (th) => {
                var sanPhamTheoHang = await DienThoai.find({ 
                    ThuongHieu: th._id, 
                    TrangThai: 1 
                })
                .sort({ _id: -1 })
                .limit(4)   
                .exec();
                
                return {
                    tenHang: th.TenThuongHieu,
                    idHang: th._id,
                    danhSachSP: sanPhamTheoHang
                };
            }));

            var dataHienThi = dataTrangChu.filter(item => item.danhSachSP.length > 0);

            // LUÔN LUÔN trả về trang người dùng (index)
            res.render('index', {
                title: 'Trang chủ Shop Điện Thoại',
                thuonghieu: dsThuongHieu,
                data: dataHienThi
            });

        } catch (error) {
            console.log(error);
            res.redirect('/error');
        }
    });

    // 2. GET: TRANG QUẢN TRỊ (Cửa riêng dành cho Admin)
    router.get('/admin', async (req, res) => {
        try {
            // Kiểm tra quyền: Nếu KHÔNG PHẢI admin thì đá về trang chủ người dùng
            if (req.session.MaNguoiDung && req.session.QuyenHan == 1) {
                
                // --- A. Code gốc của Thầy ---
                var dsThuongHieu = await ThuongHieu.find().exec();
                var dtAdmin = await DienThoai.find({ TrangThai: 1 })
                    .sort({ _id: -1 })
                    .populate('ThuongHieu')
                    .limit(12).exec();

                // --- B. Code Thống Kê (Mới Thêm) ---
                var tongSanPham = await DienThoai.countDocuments();
                var tongKhachHang = await TaiKhoan.countDocuments({ QuyenHan: 0 });
                var donHangMoi = await DonHang.countDocuments({ TrangThai: 0 });
                
                // Tính tổng doanh thu từ đơn hàng đã giao (TrangThai = 2)
                var doanhThu = await DonHang.aggregate([
                    { $match: { TrangThai: 2 } }, 
                    { $group: { _id: null, total: { $sum: "$TongTien" } } }
                ]);
                var tongDoanhThu = doanhThu.length > 0 ? doanhThu[0].total : 0;

                // --- C. Đẩy ra Giao Diện ---
                res.render('admin', {
                    title: 'Bảng điều khiển Admin',
                    thuonghieu: dsThuongHieu,
                    dienthoai: dtAdmin,
                    // 4 biến này để truyền cho cái giao diện xịn xò lúc nãy
                    tongSanPham: tongSanPham,
                    tongKhachHang: tongKhachHang,
                    donHangMoi: donHangMoi,
                    tongDoanhThu: tongDoanhThu
                });
            } else {
                res.redirect('/'); // Không có quyền thì về trang chủ khách
            }
        } catch (error) {
            console.log("Lỗi load trang admin:", error);
            res.redirect('/');
        }
    });
    // GET: Trang quản lý danh sách đơn hàng dành cho ADMIN
    router.get('/admin/donhang', async (req, res) => {
        try {
            // 1. Kiểm tra "thẻ bài" Admin
            if (!req.session.MaNguoiDung || req.session.QuyenHan != 1) {
                req.session.error = "Ông không phải Admin, đừng có mà lẻn vào đây nha!";
                return res.redirect('/');
            }

            // 2. Lấy danh sách thương hiệu (để Navbar không bị lỗi menu)
            var dsThuongHieu = await ThuongHieu.find().exec();

            // 3. Lấy tất cả đơn hàng, sắp xếp cái mới nhất lên đầu trang
            var dsDonHang = await DonHang.find()
                .sort({ NgayDat: -1 })
                .exec();

            // 4. Render ra file admin_donhang.ejs
            res.render('donhang', {
                title: 'Quản lý đơn hàng của hệ thống',
                thuonghieu: dsThuongHieu,
                donhang: dsDonHang
            });

        } catch (error) {
            console.log(error);
            res.redirect('/error');
        }
    });
    // GET: Smartphone news (Top 10 sản phẩm mới nhất)
    router.get('/hot', async (req, res) => {
        try {
            // 1. Lấy danh sách thương hiệu (giữ nguyên cho Navbar)
            var dsThuongHieu = await ThuongHieu.find().exec();

            // 2. Lấy 10 máy mới nhất
            // Tui thêm điều kiện SoLuong > 0 để chắc chắn hàng mới phải CÒN HÀNG mới cho lên top
            var dtHot = await DienThoai.find({ 
                TrangThai: 1, 
                SoLuong: { $gt: 0 } // Thêm cái này nếu ông muốn máy mới phải còn hàng
            })
            .sort({ _id: -1 }) // _id: -1 là lấy thằng vừa mới tạo xong nhét lên đầu
            .limit(10)
            .populate('ThuongHieu')
            .exec();

            // DEBUG: Ông mở màn hình đen (Terminal) xem nó có ra cái máy mới ông vừa tạo không
            console.log("🔥 DANH SÁCH HOT:", dtHot.length, "máy");

            // 3. Đổ dữ liệu ra trang tìm kiếm
            res.render('timkiem', {
                title: 'Smartphone Mới Nhất',
                dienthoai: dtHot,
                tukhoa: '🔥 Top 10 Smartphone Vừa Về Hàng', 
                thuonghieu: dsThuongHieu 
            });
        } catch (error) {
            console.log("❌ LỖI ROUTE HOT:", error);
            res.redirect('/error');
        }
    });
    // GET: Xem sản phẩm theo thương hiệu cụ thể
    router.get('/thuonghieu/:id', async (req, res) => {
        try {
            var idHang = req.params.id;

            // 1. Phải lấy lại ds thương hiệu để truyền vào Navbar (không là bị lỗi undefined)
            var dsThuongHieu = await ThuongHieu.find().exec();

            // 2. Tìm cái hãng mà khách vừa bấm vào
            var hangHienTai = await ThuongHieu.findById(idHang).exec();

            // 3. Lọc sản phẩm: đúng mã hãng AND đang bán
            var dsSTheoHang = await DienThoai.find({ 
                ThuongHieu: idHang, 
                TrangThai: 1 
            }).sort({ _id: -1 }).exec();

            // 4. Trả về trang tìm kiếm (dùng chung giao diện cho tiện)
            res.render('timkiem', {
                title: 'Hãng ' + hangHienTai.TenThuongHieu,
                dienthoai: dsSTheoHang,
                tukhoa: 'Thương hiệu: ' + hangHienTai.TenThuongHieu,
                thuonghieu: dsThuongHieu // Để Navbar hiện lại danh sách hãng
            });
        } catch (error) {
            console.log(error);
            res.redirect('/error');
        }
    });
    // GET: Kết quả tìm kiếm
    router.get('/timkiem', async (req, res) => {
        try {
            var tukhoa = req.query.tukhoa || '';
            
            // Phải lấy danh sách thương hiệu để Navbar không bị trắng
            var dsThuongHieu = await ThuongHieu.find().exec();

            var dt = await DienThoai.find({ 
                TenSP: { $regex: tukhoa, $options: 'i' },
                TrangThai: 1
            }).populate('ThuongHieu').exec();
            
            res.render('timkiem', {
                title: 'Kết quả tìm kiếm: ' + tukhoa,
                dienthoai: dt,
                tukhoa: tukhoa,
                thuonghieu: dsThuongHieu // THÊM DÒNG NÀY VÀO LÀ HẾT LỖI MẤT MENU
            });
        } catch (error) {
            console.log(error);
            res.redirect('/error');
        }
    });
    // GET: API Tìm kiếm nhanh (Live Search)
    router.get('/api/timkiem-nhanh', async (req, res) => {
        try {
            var tukhoa = req.query.tukhoa;
            if (!tukhoa) return res.json([]); // Nếu không gõ gì thì trả về rỗng

            // Tìm 5 sản phẩm khớp tên, dùng select() để chỉ lấy ID, Tên, Hình, Giá cho nhẹ web
            var ketqua = await DienThoai.find({
                TenSP: { $regex: tukhoa, $options: 'i' },
                TrangThai: 1
            })
            .limit(5)
            .select('_id TenSP HinhAnh DonGia')
            .exec();

            res.json(ketqua); // Trả dữ liệu về dạng JSON
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    module.exports = router;