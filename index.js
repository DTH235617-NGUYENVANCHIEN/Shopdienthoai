var express = require('express');
var app = express();
var mongoose = require('mongoose');
var session = require('express-session');
var path = require('path');

// 1. GỌI CÁC ROUTER (Đường dẫn chức năng)
var indexRouter = require('./routers/index');
var authRouter = require('./routers/auth');
var taikhoanRouter = require('./routers/taikhoan');
var dienthoaiRouter = require('./routers/dienthoai'); 
var thuonghieuRouter = require('./routers/thuonghieu'); // Đã gọi ở đây
var donhangRouter = require('./routers/donhang');     
var DonHang = require('./models/donhang');
// 2. KẾT NỐI MONGODB ATLAS CỦA BẠN
var uri = 'mongodb://cvan4089_db_user:admin123@ac-ln9nte0-shard-00-01.fnoot0k.mongodb.net:27017/shopdienthoai?ssl=true&authSource=admin';
mongoose.connect(uri)
    .then(() => console.log('Đã kết nối DB ShopDienThoai thành công!'))
    .catch(err => console.log('Lỗi kết nối DB:', err));

// 3. CẤU HÌNH GIAO DIỆN & FILE TĨNH
app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 4. CẤU HÌNH SESSION
app.use(session({
    name: 'ShopDienThoaiSession',
    secret: 'mat_khau_bao_mat_shop',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // Hết hạn sau 30 ngày
    }
}));


// 5. BIẾN TOÀN CỤC & THÔNG BÁO LỖI
app.use(async (req, res, next) => {
    // Truyền session qua file EJS
    res.locals.session = req.session;
    
    // --- THÊM ĐOẠN NÀY ĐỂ HIỆN SỐ LƯỢNG GIỎ HÀNG TRÊN NAVBAR ---
    let tongSoLuongGioHang = 0;
    if (req.session.giohang) {
        tongSoLuongGioHang = req.session.giohang.length;
    }
    res.locals.soLuongGioHang = tongSoLuongGioHang;
    // -----------------------------------------------------------
    res.locals.soDonHangChoDuyet = 0; 

    // 2. Nếu ông sếp (Admin) đăng nhập, thì chạy đi đếm đơn hàng có TrangThai = 0 (Chờ duyệt)
    if (req.session && req.session.QuyenHan == 1) {
        try {
            const count = await DonHang.countDocuments({ TrangThai: 0 });
            res.locals.soDonHangChoDuyet = count;
        } catch (err) {
            console.log("Lỗi đếm đơn hàng: ", err);
        }
    }       
    var err = req.session.error;
    var msg = req.session.success;
    
    delete req.session.error;
    delete req.session.success;
    
    res.locals.message = '';
    if (err) res.locals.message = '<span class="text-danger">' + err + '</span>';
    if (msg) res.locals.message = '<span class="text-success">' + msg + '</span>';

    
    next();
});
// Middleware truyền Session và tính tổng số lượng Giỏ hàng cho mọi trang EJS
app.use(function(req, res, next) {
    res.locals.session = req.session;
    
    // Tính tổng số lượng hàng trong giỏ để hiện lên Navbar
    let tongSoLuongGioHang = 0;
    if (req.session.giohang) {
        tongSoLuongGioHang = req.session.giohang.length;
    }
    // Tạo một biến toàn cục 'soLuongGioHang' để file navbar.ejs đọc được
    res.locals.soLuongGioHang = tongSoLuongGioHang;
    
    next();
});

// 6. GẮN ĐƯỜNG DẪN CHO WEB
app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/taikhoan', taikhoanRouter);
app.use('/dienthoai', dienthoaiRouter); 
app.use('/thuonghieu', thuonghieuRouter); // BỔ SUNG DÒNG NÀY VÀO ĐÂY
app.use('/donhang', donhangRouter);     

// 7. KHỞI ĐỘNG SERVER
app.listen(3030, () => {
    console.log('Server is running at http://127.0.0.1:3030');
});