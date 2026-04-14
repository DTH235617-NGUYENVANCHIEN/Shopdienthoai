const { google } = require('googleapis');
// THÔNG TIN CHÌA KHÓA GOOGLE CLOUD
const CLIENT_ID = '532299171106-fihkkls0mek65566vp6igvu7kmsbobvp.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REFRESH_TOKEN = '1//04y1E_7pqDpJtCgYIARAAGAQSNwF-L9Ir7XFoq5_1qq9MBxBkicHzeUUCrVgnfQ0s2ddg9JCf85DxLyCpwVTVFw5bL7R0IK-GEoA';
const MY_EMAIL = 'gamechienchoi@gmail.com';

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });


// HÀM MÃ HÓA EMAIL 
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
//HÀM GỬI EMAIL CHÀO MỪNG (Khi đăng ký tài khoản)
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

        console.log('[GMAIL API] ĐÃ GỬI MAIL CHÀO MỪNG TỚI:', emailKhachHang);
    } catch (error) {
        console.log('[GMAIL API] LỖI GỬI EMAIL CHÀO MỪNG:', error);
    }
};
// HÀM GỬI EMAIL THÔNG BÁO ĐẶT HÀNG THÀNH CÔNG
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

// HÀM GỬI EMAIL THÔNG BÁO ĐÃ DUYỆT ĐƠN (ĐANG GIAO)
const guiEmailDuyetDon = async (emailKhachHang, hoTenKhachHang, maDonHang) => {
    try {
        const subject = `🚚 Đơn hàng #${maDonHang} đang được giao tới bạn!`;
        const html = `
            <div style="font-family: Arial, sans-serif; border: 1px solid #0d6efd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #0d6efd;">Tin vui đây ${hoTenKhachHang} ơi!</h2>
                <p>Đơn hàng <b>#${maDonHang}</b> của bạn đã được Shop duyệt và bàn giao cho đơn vị vận chuyển.</p>
                <p>Bạn vui lòng để ý điện thoại để shipper liên hệ giao hàng trong vòng 1-3 ngày tới nhé.</p>
                <div style="background-color: #f8f9fa; padding: 10px; border-left: 4px solid #0d6efd;">
                    <i>Trạng thái: <b>Đang giao hàng</b></i>
                </div>
                <hr>
                <p>Cảm ơn bạn đã ủng hộ Shop Điện Thoại Chiến!</p>
            </div>
        `;
        
        const raw = createEncodedMail(emailKhachHang, subject, html);
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: raw }
        });
        console.log('✅ [GMAIL API] ĐÃ GỬI MAIL DUYỆT ĐƠN CHO:', emailKhachHang);
    } catch (error) {
        console.log('❌ LỖI GỬI MAIL DUYỆT ĐƠN:', error);
    }
};
// HÀM THÔNG BÁO CHO ADMIN KHI CÓ ĐƠN MỚI
const guiEmailThongBaoAdmin = async (maDonHang, tenKhach, tongTien) => {
    try {
        const domain = "https://shopdienthoai-dxvs.onrender.com"; // Link Render của sếp
        const subject = `🔥 SẾP ƠI! CÓ ĐƠN HÀNG MỚI: #${maDonHang}`;
        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; border: 2px dashed #ffc107; padding: 25px; border-radius: 15px; background-color: #fffdf5; max-width: 600px; margin: auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 50px;">🛍️</span>
                </div>
                <h2 style="color: #856404; text-align: center; margin-top: 0;">📢 THÔNG BÁO CÓ ĐƠN HÀNG MỚI!</h2>
                <p style="font-size: 16px; line-height: 1.6;">Chào Admin Chiến, hệ thống vừa ghi nhận một đơn hàng mới từ khách hàng <b>${tenKhach}</b>.</p>
                
                <div style="background: #fff; padding: 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="margin: 5px 0;">🆔 Mã đơn hàng: <b style="color: #0d6efd;">#${maDonHang}</b></p>
                    <p style="margin: 5px 0;">💰 Giá trị đơn: <b style="color: #dc3545;">${tongTien.toLocaleString('vi-VN')}đ</b></p>
                </div>

                <p style="text-align: center; margin-top: 25px;">
                    <a href="${domain}/donhang" style="background-color: #ffc107; color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 10px; display: inline-block; font-size: 18px; border: 1px solid #e5ac00;">
                        VÀO DUYỆT ĐƠN NGAY 🚀
                    </a>
                </p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999; text-align: center;">Đây là thông báo tự động từ hệ thống Shop Điện Thoại Chiến.</p>
            </div>
        `;

        const raw = createEncodedMail('gamechienchoi@gmail.com', subject, html);
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: raw } });
        console.log('🚀 [GMAIL API] ĐÃ BÁO TIN CHO ADMIN!');
    } catch (error) {
        console.log('❌ LỖI BÁO TIN ADMIN:', error);
    }
};

// NHỚ THÊM VÀO module.exports nha sếp
module.exports = { guiEmailChaoMung, guiEmailDatHang, guiEmailDuyetDon, guiEmailThongBaoAdmin };