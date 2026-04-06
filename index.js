const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public')); // 让 public 文件夹里的网页可以被访问

// 临时把位置存在内存里
let latestData = {
    lat: 39.9042, // 默认北京天安门坐标
    lng: 116.4074,
    time: "等待首次打卡...",
    message: "我很好！"
};

// 安全密码：防止别人乱发位置给你妈，你可以自己改！
const SECRET_TOKEN = "mom123"; 

// 接口：手机端用来上传位置
app.post('/update', (req, res) => {
    const { token, lat, lng, message } = req.body;
    
    if (token !== SECRET_TOKEN) {
        return res.status(403).json({ error: "密码错误" });
    }
    
    latestData = {
        lat: lat,
        lng: lng,
        // 获取北京时间
        time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        message: message || "我很好，今天也是元气满满！"
    };
    
    console.log("位置已更新:", latestData);
    res.json({ success: true, data: latestData });
});

// 接口：网页端用来获取最新位置
app.get('/api/location', (req, res) => {
    res.json(latestData);
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`网站已启动，端口: ${PORT}`);
});
