# UZLITR'ni o'z serverimizga ko'chirish (UzCloud)

Hamma narsa bitta serverda ishlaydi: **sayt + ma'lumotlar bazasi + HTTPS + har kungi zaxira nusxa + Uztelecom'ga yuborish**.
Ma'lumotlar O'zbekistonda saqlanadi, serverning IP manzili doimiy.

## 1. Serverga kirish (Windows)

1. **PowerShell**'ni oching (Start → "PowerShell").
2. Quyidagini yozing (`root` o'rniga qog'ozdagi login bo'lishi mumkin):
   ```
   ssh root@198.163.197.118
   ```
3. "Are you sure you want to continue connecting?" deb so'rasa, `yes` deb yozing.
4. Parolni kiriting. **Parol yozilganda ekranda ko'rinmaydi**, bu normal holat. Yozib, Enter bosing.

> Agar login `root` bo'lmasa, kirgandan keyin `sudo -i` deb yozing va parolni yana kiriting.

## 2. O'rnatish (bitta buyruq, ~10 daqiqa)

```
curl -fsSL https://raw.githubusercontent.com/abdullohisroilov122-collab/uzlitr-billing/main/deploy/setup.sh | bash
```

Skript 3 ta narsani so'raydi:
- **Site address**: hozircha shunchaki **Enter** bosing (`198-163-197-118.sslip.io` bo'ladi, darhol HTTPS bilan ishlaydi).
- **Admin phone** va **parol**: faqat baza bo'sh bo'lsa ishlatiladi. Keyingi qadamda eski ma'lumotlarni ko'chirsangiz, eski login va parolingiz ishlaydi.

Oxirida `✅ Done! Open: https://...` chiqadi. Shu manzilni brauzerda oching.

## 3. Eski ma'lumotlarni Neon'dan ko'chirish

1. Vercel → loyiha → **Settings → Environment Variables** → `DATABASE_URL` (yoki `POSTGRES_URL`) qiymatini nusxalang.
2. **Noutbukdagi** PowerShell'da (serverga ulanmasdan, `PS C:\Users\...>` holatida) manzilni nusxalab, quyidagini yozing. U nusxalangan manzilni serverga o'zi yuboradi:
   ```
   Get-Clipboard | ssh root@198.163.197.118 "cat > /root/neon.txt"
   ```
3. Serverga kiring va ko'chirishni boshlang (`YES` deb tasdiqlaysiz):
   ```
   bash /opt/uzlitr/deploy/migrate-from-neon.sh
   ```

Oxirida nechta abonent, hisoblagich va ko'rsatkich ko'chgani chiqadi. Saytga eski telefon va parolingiz bilan kiring.

## 4. myuzlitrpro.uz domenini ulash

1. Domen sotib olingan joyda (DNS sozlamalari) **A yozuv** qo'shing: `@` → `198.163.197.118` (`www` uchun ham).
2. Serverda `.env`'ni oching:
   ```
   nano /opt/uzlitr/.env
   ```
   `SITE_ADDRESS=` qatorini `SITE_ADDRESS=myuzlitrpro.uz` qiling. Saqlash: **Ctrl+O**, Enter, **Ctrl+X**.
3. Qayta ishga tushiring:
   ```
   cd /opt/uzlitr && docker compose up -d
   ```
   HTTPS sertifikati o'zi olinadi (1–2 daqiqa).
4. Modemlar ma'lumot yuboradigan manzilni yangilang: `https://myuzlitrpro.uz/api/ingest`

## 5. Uztelecom token kelganda

```
nano /opt/uzlitr/.env
```
Ikki qatorning boshidagi `#` belgisini o'chiring va tokenni yozing:
```
VODOKANAL_API_URL=https://watermeter.uztelecom.uz/api/Meter/Post
VODOKANAL_API_KEY=bu_yerga_token
```
Keyin: `bash /opt/uzlitr/deploy/update.sh`

## Kundalik ishlar

| Nima qilish | Buyruq |
|---|---|
| Yangi versiyani o'rnatish (GitHub'dan) | `bash /opt/uzlitr/deploy/update.sh` |
| Holatni ko'rish | `cd /opt/uzlitr && docker compose ps` |
| Sayt loglari | `cd /opt/uzlitr && docker compose logs -f app` (chiqish: Ctrl+C) |
| Zaxira nusxalar | `ls /opt/uzlitr/deploy/backups` (har kuni 02:00 da, 14 kun saqlanadi) |

**Zaxiradan tiklash** (faqat kerak bo'lsa!):
```
cd /opt/uzlitr && docker compose stop app
gunzip -c deploy/backups/uzlitr-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U uzlitr -d uzlitr
docker compose start app
```

## Xavfsizlik

- Faqat SSH (22), HTTP (80) va HTTPS (443) portlari ochiq. Ma'lumotlar bazasi tashqaridan ko'rinmaydi.
- `/opt/uzlitr/.env` faylida maxfiy kalitlar bor, uni hech kimga yubormang.
- Birinchi kirishdan keyin server parolini almashtiring: `passwd`
