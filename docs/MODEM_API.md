# UZLITRPRO — Meter data API for modem / platform developers

**Server:** `https://myuzlitrpro.uz` (Tashkent, Uzbekistan)
**Contact:** UZLITRPRO (Litr Energy Group)

中文说明见下方 / Chinese version below.

---

## 1. How to send readings

```
POST https://myuzlitrpro.uz/api/ingest
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

- HTTPS only (TLS 1.2+). Port 443.
- `<TOKEN>` is issued by UZLITRPRO (admin panel → Tokens). Keep it secret.
  `X-API-Key: <TOKEN>` is also accepted instead of `Authorization`.
- Two kinds of token:
  - **Platform token** — one token for your cloud platform / gateway, for many meters. Every reading must then include `modem_serial`.
  - **Meter token** — one token per device. `modem_serial` may be omitted.

## 2. Body

One reading, an array, or `{ "readings": [...] }` (max **500** per request).

```json
{
  "readings": [
    {
      "modem_serial": "860123456789012",
      "meter_serial": "WM-2026-000123",
      "value": 125.437,
      "measured_at": "2026-11-03T08:15:00Z",
      "battery": 3.62,
      "signal": 21
    }
  ]
}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `modem_serial` | string | yes (platform token) | Unique device ID: IMEI or modem serial. Must never change for a device. |
| `meter_serial` | string | recommended | Serial number printed on the water meter. |
| `value` | number | **yes** | **Cumulative total volume in m³** (the counter on the meter), not the usage since last time. Up to 3 decimals (litres). |
| `measured_at` | string or number | recommended | When the meter was read. ISO 8601 with timezone (`2026-11-03T08:15:00Z` or `…+05:00`), or Unix time (seconds or milliseconds). If missing, the server's receive time is used. |
| `battery` | number | optional | Battery voltage in volts (e.g. `3.62`). We warn below 3.1 V. |
| `signal` | number | optional | Signal: CSQ (0–31) or RSSI (dBm). |

Accepted alternative field names: `imei`/`device_id` for `modem_serial`; `reading`/`volume`/`total` for `value`; `timestamp`/`time` for `measured_at`; `rssi`/`csq` for `signal`; `voltage` for `battery`.

## 3. Response

```json
{ "ok": true, "accepted": 1, "duplicates": 0, "errors": [] }
```

| HTTP | Meaning | What the device should do |
|---|---|---|
| 200 | Stored (`accepted`), or already received before (`duplicates`) | Done. Delete from the device's buffer. |
| 400 | Bad JSON or all readings invalid; see `errors[].error` | Fix the data, do not retry the same body. |
| 401 | Missing or wrong token | Check the token. |
| 413 | More than 500 readings | Send in smaller batches. |
| 429 | Too many requests | Wait 60 s (`Retry-After`), then retry. |
| 5xx / timeout / no network | Server or network problem | **Keep the readings and retry later** (e.g. after 1, 5, 15, 60 min). |

Sending the same reading twice is safe: a reading with the same device and the same `measured_at` is stored only once. So on any doubt, **resend**.

## 4. Recommendations

- Report at least **once per day**; hourly is better (we draw daily usage charts and detect leaks).
  A device with no data for 1–2 days is shown as **offline**.
- Keep readings in device memory when there is no network and send them all later in one batch, each with its own `measured_at`.
- Use UTC (`Z`) or include the timezone offset. Do not send local time without an offset.
- Test first with the token we give you, then send us a sample request and response.

## 5. Questions for the modem manufacturer

1. Network: NB-IoT, LTE-M, 4G/2G or LoRaWAN? Which bands? Does it work with Uzbek operators (Uztelecom, Beeline, Ucell, Mobiuz)?
2. Does the device send **directly** to our URL over HTTPS, or through **your cloud platform** (which then forwards to us)? If MQTT, CoAP, raw TCP/UDP or a binary format, please send the full protocol document.
3. What is the reported `value`: cumulative total in m³? Resolution (litres)?
4. How often does it report, and can we change it remotely?
5. Other data available: valve open/close, leak, tamper / magnet attack, reverse flow, low battery alarms? (We can add these fields.)
6. Battery life and how many readings it stores without network.
7. Can we send commands to the device (valve control, interval change)?
8. A test device or simulator for integration testing.

---

# UZLITRPRO 水表数据接口（中文）

**服务器：** `https://myuzlitrpro.uz`（乌兹别克斯坦，塔什干）

## 1. 发送读数

```
POST https://myuzlitrpro.uz/api/ingest
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

- 仅支持 HTTPS（TLS 1.2 及以上），端口 443。
- `<TOKEN>` 由 UZLITRPRO 提供，请保密。也可以使用请求头 `X-API-Key: <TOKEN>`。
- 两种令牌：
  - **平台令牌**：用于贵方云平台/网关，一个令牌对应多个水表。每条读数必须包含 `modem_serial`。
  - **设备令牌**：每台设备一个令牌，可以不填 `modem_serial`。

## 2. 请求体

可以发送单条读数、数组，或 `{ "readings": [...] }`（每次最多 **500** 条）。示例见上方英文部分。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `modem_serial` | 字符串 | 是（平台令牌） | 设备唯一编号：IMEI 或模块序列号，不可更改 |
| `meter_serial` | 字符串 | 建议 | 水表表身上的编号 |
| `value` | 数字 | **是** | **累计总用水量（立方米 m³）**，不是本次用量。最多 3 位小数 |
| `measured_at` | 字符串或数字 | 建议 | 抄表时间。ISO 8601 带时区（如 `2026-11-03T08:15:00Z`），或 Unix 时间戳（秒或毫秒）。不填则使用服务器接收时间 |
| `battery` | 数字 | 可选 | 电池电压（伏），如 `3.62`；低于 3.1 V 时报警 |
| `signal` | 数字 | 可选 | 信号强度：CSQ（0–31）或 RSSI（dBm） |

## 3. 响应

| HTTP | 含义 | 设备应如何处理 |
|---|---|---|
| 200 | 已保存（`accepted`）或已收到过（`duplicates`） | 完成，可从缓存删除 |
| 400 | JSON 错误或数据无效，见 `errors[].error` | 修正数据，不要重复发送相同内容 |
| 401 | 令牌缺失或错误 | 检查令牌 |
| 413 | 超过 500 条 | 分批发送 |
| 429 | 请求过多 | 等待 60 秒后重试 |
| 5xx / 超时 / 无网络 | 服务器或网络问题 | **保留数据，稍后重试**（如 1、5、15、60 分钟后） |

重复发送是安全的：同一设备、同一 `measured_at` 的读数只保存一次。如有疑问，请重新发送。

## 4. 建议

- 每天至少上报 **1 次**，最好每小时 1 次（用于日用量图表和漏水检测）。1–2 天无数据会显示为 **离线**。
- 无网络时请在设备中缓存读数，恢复后一次性批量发送，每条带各自的 `measured_at`。
- 请使用 UTC（`Z`）或带时区偏移的时间。
- 请先用我们提供的测试令牌测试，并把请求和响应示例发给我们。

## 5. 需要厂家回答的问题

1. 通信方式：NB-IoT、LTE-M、4G/2G 还是 LoRaWAN？频段？是否支持乌兹别克斯坦运营商（Uztelecom、Beeline、Ucell、Mobiuz）？
2. 设备是 **直接** 通过 HTTPS 发送到我们的地址，还是通过 **贵方云平台** 转发？如果是 MQTT、CoAP、TCP/UDP 或二进制协议，请提供完整协议文档。
3. 上报的数值是否为累计总量（m³）？精度（升）？
4. 上报频率是多少？能否远程修改？
5. 是否还有其他数据：阀门状态、漏水、防拆/强磁报警、反向流量、低电量报警？（我们可以增加这些字段）
6. 电池寿命？无网络时可缓存多少条读数？
7. 能否向设备下发命令（阀门控制、修改上报间隔）？
8. 是否可以提供测试设备或模拟器用于联调？
