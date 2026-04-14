export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/b503db5520ef5f24978fd0550e16f0a1.txt') {
      return new Response('766e26a03b73abdbb6368912ba490aea025c3b85', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    // 天地图密钥
    const TK = env.TIANDITU_KEY;
    
    // 1. 数据上传逻辑 (POST /update)
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

    // 2. 数据查询接口 (GET /api/location)
    if (request.method === 'GET' && url.pathname === '/api/location') {
      const dataStr = await env.MOM_DATA.get("latest_location");
      if (!dataStr) return new Response(JSON.stringify({ lat: 39.9042, lng: 116.4074, time: "等待打卡...", message: "暂无数据", city: "这里" }), { headers: { 'Content-Type': 'application/json' } });
      return new Response(dataStr, { headers: { 'Content-Type': 'application/json' } });
    }

    // 3. 地图展示逻辑 (GET /)
    if (request.method === 'GET' && url.pathname === '/') {
      const html = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>我在这里</title>
            <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📍</text></svg>">
            <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📍</text></svg>">
            <link rel="stylesheet" href="https://cdn.staticfile.net/leaflet/1.9.4/leaflet.css" />
            <script src="https://cdn.staticfile.net/leaflet/1.9.4/leaflet.js"></script>
            <style>
                body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; height: 100vh; }
                #map { height: 100vh; width: 100%; position: absolute; top: 0; left: 0; }
                #info { 
                    position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
                    z-index: 1000; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
                    padding: 12px 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.15); 
                    border-radius: 50px; min-width: 240px; white-space: nowrap;
                }
                h3 { margin: 0 0 5px 0; color: #ff6b6b; font-size: 18px; }
                .details { margin: 2px 0; font-size: 12px; color: #555; display: flex; justify-content: center; gap: 8px; }
                .tag { background: #f0f4f8; padding: 2px 8px; border-radius: 10px; color: #007aff; font-weight: bold; }
                .tag.home { color: #ff8c00; background: #fff3e0; }
                .msg { margin-top: 5px; font-size: 14px; color: #333; font-style: italic; }
                .tag.car { color: #28a745; background: #e8f5e9; }
            </style>
        </head>
        <body>
            <div id="info">
                <h3 id="city-title">妈妈，我在这里！🥰 </h3>
                <div class="details">
                    <span id="time-tag" class="tag">🕒 获取中...</span>
                    <span id="weather-tag" class="tag" style="display:none;">⛅</span>
                    <span id="distance-tag" class="tag home" style="display:none;">🏠 离家</span>
                </div>
                <div class="details">
                    <span id="car-tag" class="tag car" style="display:none;">🚙</span>
                </div>
            </div>
            <div id="map"></div>
            <script>
                const map = L.map('map', { zoomControl: false }).setView([39.9042, 116.4074], 12);
                
                // 天地图卫星底图 + 矢量注记 (无需坐标转换)
                L.tileLayer('https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TK}', {
                    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7']
                }).addTo(map);
                L.tileLayer('https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TK}', {
                    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7']
                }).addTo(map);
                
                let marker = L.marker([39.9042, 116.4074]).addTo(map);

                async function fetchLocation() {
                    try {
                        const res = await fetch('/api/location');
                        const data = await res.json();
                        document.getElementById('time-tag').innerText = "🕒 " + data.time.split(' ')[1];
                        //document.getElementById('message-text').innerText = '🚙' + data.car_battery;
                        if (data.city) document.getElementById('city-title').innerText = "妈妈，我在" + data.city + "！🥰 ";
                        
                        if (data.weather) {
                            const wEl = document.getElementById('weather-tag');
                            wEl.style.display = 'inline-block'; wEl.innerText = "⛅ " + data.weather;
                        }
                        if (data.distance) {
                            const dEl = document.getElementById('distance-tag');
                            dEl.style.display = 'inline-block';
                            let rawNum = parseFloat(String(data.distance).replace(/,/g, ''));
                            let displayStr = data.distance; 
                            if (!isNaN(rawNum)) {
                                displayStr = (rawNum <= 0.05) ? "已到家 🎉" : (rawNum < 1 ? (rawNum * 1000).toFixed(0) + " 米" : rawNum.toFixed(1) + " 公里");
                            }
                            dEl.innerText = "🏠 " + displayStr;
                        }
                        if (data.car_battery) {
                            const cEl = document.getElementById('car-tag');
                            cEl.style.display = 'inline-block';
                            cEl.innerText = "🚙" + data.car_battery ;
                        }
                        
                        // 原始坐标直接使用
                        if (data.lat && data.lng) {
                            const lat = parseFloat(data.lat), lng = parseFloat(data.lng);
                            marker.setLatLng([lat, lng]);
                            map.setView([lat, lng], 12); 
                        }
                    } catch (e) {
                        document.getElementById('message-text').innerText = "获取位置失败，可能没网了~";
                    }
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
