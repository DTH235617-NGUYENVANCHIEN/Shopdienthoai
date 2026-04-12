const { google } = require('googleapis');
// =======================================================
// 1. THÔNG TIN CHÌA KHÓA GOOGLE CLOUD
// =======================================================
const CLIENT_ID = '532299171106-fihkkls0mek65566vp6igvu7kmsbobvp.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REFRESH_TOKEN = '1//04y1E_7pqDpJtCgYIARAAGAQSNwF-L9Ir7XFoq5_1qq9MBxBkicHzeUUCrVgnfQ0s2ddg9JCf85DxLyCpwVTVFw5bL7R0IK-GEoA';
const MY_EMAIL = 'gamechienchoi@gmail.com';

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// =======================================================
// 2. HÀM MÃ HÓA EMAIL (Bắt buộc của Gmail API)
// =======================================================
// =======================================================
// 2. HÀM MÃ HÓA EMAIL (Đã fix lỗi font chữ người gửi)
// =======================================================
const createEncodedMail = (to, subject, htmlContent) => {
    // Đóng gói tên Shop theo đúng chuẩn chống lỗi font của Gmail
    const tenShop = "Shop Điện Thoại Chiến 📱";
    const tenShopDaMaHoa = `=?utf-8?B?${Buffer.from(tenShop).toString('base64')}?=`;

    const str = [
        `Content-Type: text/html; charset="UTF-8"\n`,
        `MIME-Version: 1.0\n`,
        `To: ${to}\n`,
        `From: ${tenShopDaMaHoa} <${MY_EMAIL}>\n`, // Đã ráp tên mã hóa vào đây
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=\n\n`,
        `${htmlContent}`
    ].join('');
    
    return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
// =======================================================
// 3. HÀM GỬI EMAIL CHÀO MỪNG (Khi đăng ký tài khoản)
// =======================================================
const guiEmailChaoMung = async (emailKhachHang, hoTenKhachHang) => {
    try {
        const subject = '   🎉 Chào mừng bạn gia nhập ShopDienThoai!';
        const html = `
            <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #0d6efd;">Chào ${hoTenKhachHang},</h2>
                <p>Tài khoản của bạn đã được đăng ký thành công!</p>
                <p>Cảm ơn bạn đã tin tưởng. Từ nay bạn có thể thoải mái mua sắm các sản phẩm công nghệ mới nhất tại cửa hàng của chúng tôi.</p>
                <br>
                <p>Trân trọng,</p>
                <b>Đội ngũ ShopDienThoai</b>
            </div>
        `;
        
        const raw = createEncodedMail(emailKhachHang, subject, html);

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: raw }
        });

        console.log('✅ [GMAIL API] ĐÃ GỬI MAIL CHÀO MỪNG TỚI:', emailKhachHang);
    } catch (error) {
        console.log('❌ LỖI GỬI EMAIL CHÀO MỪNG:', error);
    }
};

// =======================================================
// 4. HÀM GỬI EMAIL THÔNG BÁO ĐẶT HÀNG THÀNH CÔNG
// =======================================================
const guiEmailDatHang = async (emailKhachHang, hoTenKhachHang, maDonHang, tongTien) => {
    try {
        const subject = `📦 Đặt hàng thành công - Mã đơn: #${maDonHang}`;
        const html = `
            <div style="font-family: Arial, sans-serif; border: 1px solid #28a745; padding: 20px; border-radius: 10px;">
                <h2 style="color: #28a745;">Cảm ơn ${hoTenKhachHang} đã đặt hàng!</h2>
                <p>Đơn hàng <b>#${maDonHang}</b> của bạn đã được hệ thống ghi nhận.</p>
                <p>Tổng thanh toán: <b style="color: red; font-size: 18px;">${tongTien.toLocaleString('vi-VN')}đ</b></p>
                <p>Chúng tôi sẽ sớm liên hệ với bạn để xác nhận giao hàng.</p>
                <hr>
                <p>Cần hỗ trợ? Vui lòng gọi Hotline: 1900 xxxx</p>
            </div>
        `;
        
        const raw = createEncodedMail(emailKhachHang, subject, html);

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: raw }
        });

        console.log('✅ [GMAIL API] ĐÃ GỬI MAIL BÁO ĐƠN HÀNG CHO:', emailKhachHang);
    } catch (error) {
        console.log('❌ LỖI GỬI MAIL ĐƠN HÀNG:', error);
    }
};

// Xuất cả 2 hàm ra để xài ở các Router khác
module.exports = { guiEmailChaoMung, guiEmailDatHang };