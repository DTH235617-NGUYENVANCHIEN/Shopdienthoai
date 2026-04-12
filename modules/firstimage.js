function firstImage(noiDung) {
    var regExp = /<img[^>]+src="?([^"\s]+)"?[^>]*\/>/g;
    var results = regExp.exec(noiDung);
    // Sửa link này thành ảnh mặc định trong thư mục public/images của bạn
    var image = '/images/no-image.png'; 
    if(results) image = results[1];
    return image;
}
module.exports = firstImage;