export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 微信验证 (保持不变)
    if (url.pathname === '/b503db5520ef5f24978fd0550e16f0a1.txt') {
      return new Response('766e26a03b73abdbb6368912ba490aea025c3b85', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    const TK = env.TIANDITU_KEY;

    // 2. 数据上传 (保持不变)
    if (request.method === 'POST' && url.pathname === '/update') {
      const body = await request.json();
      const { token, lat, lng, message, city, weather, distance, car_battery } = body;
      if (token !== env.UPLOAD_TOKEN) return new Response(JSON.stringify({ error: "暗号错误" }), { status: 403 });

      const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const data = {
        lat, lng, time,
        message: message || "我很好！",
        city: city || "这里",
        weather: weather || "",
        distance: distance || "",
        car_battery: car_battery || ""
      };

      await env.MOM_DATA.put("latest_location", JSON.stringify(data));
      return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 3. 数据查询 (保持不变)
    if (request.method === 'GET' && url.pathname === '/api/location') {
      const dataStr = await env.MOM_DATA.get("latest_location");
      if (!dataStr) return new Response(JSON.stringify({ lat: 39.9042, lng: 116.4074, time: "等待打卡...", message: "暂无数据", city: "这里" }), { headers: { 'Content-Type': 'application/json' } });
      return new Response(dataStr, { headers: { 'Content-Type': 'application/json' } });
    }

    // 4. 地图展示
    if (request.method === 'GET' && url.pathname === '/') {
      const html = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>我在这里</title>
            <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📍</text></svg>">
            <link rel="stylesheet" href="https://cdn.staticfile.net/leaflet/1.9.4/leaflet.css" />
            <script src="https://cdn.staticfile.net/leaflet/1.9.4/leaflet.js"></script>
            <style>
                body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; height: 100vh; overflow: hidden; }
                #map { height: 100vh; width: 100%; position: absolute; top: 0; left: 0; }
                #info {
                    position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
                    z-index: 1000; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
                    padding: 12px 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                    border-radius: 50px; min-width: 240px;
                }
                h3 { margin: 0 0 8px 0; color: #ff6b6b; font-size: 18px; }
                .details { margin: 2px 0; font-size: 12px; color: #555; display: flex; justify-content: center; gap: 10px; }

                .tag {
                    position: relative; background: #f0f4f8; padding: 4px 12px; border-radius: 12px;
                    color: #007aff; font-weight: bold; cursor: pointer; display: inline-block;
                    -webkit-user-select: none;
                }
                .tag.home { color: #ff8c00; background: #fff3e0; }
                .tag.car { color: #28a745; background: #e8f5e9; }

                .tag::after {
                    content: attr(data-tip); position: absolute; bottom: 125%; left: 50%; transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8); color: #fff; padding: 6px 10px; border-radius: 8px;
                    font-size: 11px; white-space: nowrap; visibility: hidden; opacity: 0; transition: opacity 0.2s; z-index: 2000; pointer-events: none;
                }
                .tag::before {
                    content: ""; position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
                    border: 6px solid transparent; border-top-color: rgba(0, 0, 0, 0.8); visibility: hidden; opacity: 0; transition: opacity 0.2s;
                }
                @media (hover: hover) { .tag:hover::after, .tag:hover::before { visibility: visible; opacity: 1; } }
                .tag:active::after, .tag:active::before { visibility: visible; opacity: 1; }
            </style>
        </head>
        <body>
            <div id="info">
                <h3 id="city-title">妈妈，我在这里！✨</h3>
                <div class="details">
                    <span id="time-tag" class="tag" data-tip="最后上报位置的时间">🕒 获取中...</span>
                    <span id="weather-tag" class="tag" style="display:none;" data-tip="这里的实时天气">⛅</span>
                    <span id="distance-tag" class="tag home" style="display:none;" data-tip="我离家的直线距离">🏠 离家</span>
                </div>
                <div class="details">
                    <span id="car-tag" class="tag car" style="display:none;" data-tip="小车的电量或状态">🚙</span>
                </div>
            </div>
            <div id="map"></div>
            <script>
                const map = L.map('map', { zoomControl: false }).setView([39.9042, 116.4074], 12);
                L.tileLayer('https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TK}', { subdomains: ['0','1','2','3','4','5','6','7'] }).addTo(map);
                L.tileLayer('https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TK}', { subdomains: ['0','1','2','3','4','5','6','7'] }).addTo(map);

                let marker = L.marker([39.9042, 116.4074]).addTo(map);

                function getRandomEmoji() {
                    const emojis = ["🥰", "😜", "😈", "😏", "🤣", "🌊", "😘", "😎", "🥳", "🤪"];
                    return emojis[Math.floor(Math.random() * emojis.length)];
                }

                async function fetchLocation() {
                    try {
                        const res = await fetch('/api/location');
                        const data = await res.json();

                        let emoji = getRandomEmoji();
                        if (data.weather) {
                            const tempMatch = data.weather.match(/-?\\d+/);
                            if (tempMatch) {
                                const temp = parseInt(tempMatch[0]);
                                if (temp > 35) emoji = "🫠";
                                else if (temp < 0) emoji = "🥶";
                            }
                            const wEl = document.getElementById('weather-tag');
                            wEl.style.display = 'inline-block';
                            wEl.innerText = "⛅ " + data.weather;
                            wEl.setAttribute('data-tip', "这里现在的天气是 " + data.weather);
                        }

                        if (data.city) {
                            document.getElementById('city-title').innerText = "妈妈，我在" + data.city + "！" + emoji;
                        }

                        const timeVal = (data.time && data.time.includes(' ')) ? data.time.split(' ')[1] : (data.time || "未知");
                        document.getElementById('time-tag').innerText = "🕒 " + timeVal;
                        document.getElementById('time-tag').setAttribute('data-tip', "上报时间：" + (data.time || "未知"));

                        if (data.distance) {
                            const dEl = document.getElementById('distance-tag');
                            dEl.style.display = 'inline-block';
                            let rawNum = parseFloat(String(data.distance).replace(/,/g, ''));
                            let displayStr = data.distance;
                            if (!isNaN(rawNum)) {
                                displayStr = (rawNum <= 0.05) ? "已到家 🎉" : (rawNum < 1 ? (rawNum * 1000).toFixed(0) + " 米" : rawNum.toFixed(1) + " 公里");
                            }
                            dEl.innerText = "🏠 " + displayStr;
                            dEl.setAttribute('data-tip', "离家距离：" + displayStr);
                        }
                        if (data.car_battery) {
                            const cEl = document.getElementById('car-tag');
                            cEl.style.display = 'inline-block';
                            cEl.innerText = "🚙 " + data.car_battery;
                            cEl.setAttribute('data-tip', "车辆状态：" + data.car_battery);
                        }

                        if (data.lat && data.lng) {
                            const lat = parseFloat(data.lat), lng = parseFloat(data.lng);
                            marker.setLatLng([lat, lng]);
                            map.setView([lat, lng], 13);
                        }
                    } catch (e) { console.error(e); }
                }

                fetchLocation();
                setInterval(fetchLocation, 60000);
            </script>
        </body>
        </html>
      `;
      return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }
    return new Response("Not Found", { status: 404 });
  }
};
