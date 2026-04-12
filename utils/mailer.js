const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// =======================================================
// 1. ĐIỀN THÔNG TIN TỪ GOOGLE CLOUD CỦA ÔNG VÀO ĐÂY
// =======================================================
const CLIENT_ID = '532299171106-fihkkls0mek65566vp6igvu7kmsbobvp.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REFRESH_TOKEN = '1//04y1E_7pqDpJtCgYIARAAGAQSNwF-L9Ir7XFoq5_1qq9MBxBkicHzeUUCrVgnfQ0s2ddg9JCf85DxLyCpwVTVFw5bL7R0IK-GEoA';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const MY_EMAIL = 'gamechienchoi@gmail.com'; // Email ông dùng nãy giờ

// Thiết lập OAuth2
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// =======================================================
// 2. HÀM GỬI EMAIL CHÀO MỪNG
// =======================================================
const guiEmailChaoMung = async (emailKhachHang, hoTenKhachHang) => {
    try {
        // Lấy mã Access Token mới (Tự động)
        const accessToken = await oAuth2Client.getAccessToken();

        // Cấu hình người gửi
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: MY_EMAIL,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken.token
            }
        });

        // Thiết kế nội dung Email
        const mailOptions = {
            from: `"Shop Điện Thoại Chiến 📱" <${MY_EMAIL}>`,
            to: emailKhachHang,
            subject: '🎉 Chào mừng bạn gia nhập ShopDienThoai!',
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #0d6efd;">Chào ${hoTenKhachHang},</h2>
                    <p>Tài khoản của bạn đã được đăng ký thành công!</p>
                    <p>Cảm ơn bạn đã tin tưởng. Từ nay bạn có thể thoải mái mua sắm các sản phẩm công nghệ mới nhất tại cửa hàng của chúng tôi.</p>
                    <br>
                    <p>Trân trọng,</p>
                    <b>Đội ngũ ShopDienThoai</b>
                </div>
            `
        };

        // Bóp cò gửi đi
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ ĐÃ GỬI EMAIL THÀNH CÔNG TỚI:', emailKhachHang);
        return result;

    } catch (error) {
        console.log('❌ LỖI GỬI EMAIL:', error);
    }
};

// 3. HÀM GỬI EMAIL THÔNG BÁO ĐẶT HÀNG THÀNH CÔNG
const guiEmailDatHang = async (emailKhachHang, hoTenKhachHang, maDonHang, tongTien) => {
    try {
        const accessToken = await oAuth2Client.getAccessToken();
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: MY_EMAIL,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken.token
            }
        });

        const mailOptions = {
            from: `"Shop Điện Thoại Chiến 📱" <${MY_EMAIL}>`,
            to: emailKhachHang,
            subject: `📦 Đặt hàng thành công - Mã đơn: #${maDonHang}`,
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #28a745; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #28a745;">Cảm ơn ${hoTenKhachHang} đã đặt hàng!</h2>
                    <p>Đơn hàng <b>#${maDonHang}</b> của bạn đã được hệ thống ghi nhận.</p>
                    <p>Tổng thanh toán: <b style="color: red; font-size: 18px;">${tongTien.toLocaleString('vi-VN')}đ</b></p>
                    <p>Chúng tôi sẽ sớm liên hệ với bạn để xác nhận giao hàng.</p>
                    <hr>
                    <p>Cần hỗ trợ? Vui lòng gọi Hotline: 1900 xxxx</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Đã gửi mail BÁO ĐƠN HÀNG cho:', emailKhachHang);
    } catch (error) {
        console.log('❌ LỖI GỬI MAIL ĐƠN HÀNG:', error);
    }
};

// Xuất cả 2 hàm ra để xài
module.exports = { guiEmailChaoMung, guiEmailDatHang };
