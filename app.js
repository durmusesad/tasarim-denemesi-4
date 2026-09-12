/* ==========================================================================
   KG Tahmin — Taktik Tahtası (futbol kadro/tahta metaforu)
   guvenHesapla() gerçek algoritma; Kadro Listem (Kupon) = gerçek çalışan
   hesap makinesi (toggle + localStorage + çarpımsal oran + tutar×oran).
   ========================================================================== */

const IDDAA_KATSAYI = 1.037;
const KUPON_ANAHTAR = "kgTahminKuponV1";

const IZINLI_TAM_LIGLER = [
  "türkiye süper ligi", "ingiltere premier lig", "ispanya la liga", "italya serie a",
  "fransa ligue 1", "suudi arabistan pro lig", "isveç allsvenskan", "norveç eliteserien",
  "finlandiya veikkausliiga", "çin süper lig",
];

function ligIzinliMi(ligAdiHam) {
  const hamKucuk = String(ligAdiHam).toLocaleLowerCase("tr-TR");
  const disariBirakPattern = /(kadın|bayan|women|female|rezerv|yedek|b takım|b takımı)/;
  const yasGrubuPattern = /\bu(1[5-9]|2[0-9])\b/;
  if (disariBirakPattern.test(hamKucuk) || yasGrubuPattern.test(hamKucuk)) return false;

  const govde = hamKucuk.split(",")[0].trim();
  if (IZINLI_TAM_LIGLER.includes(govde)) return true;
  if (hamKucuk.includes("hollanda") && hamKucuk.includes("eredivisie")) return true;
  if (hamKucuk.includes("portekiz") && hamKucuk.includes("premier")) return true;
  if (hamKucuk.includes("güney kore") && hamKucuk.includes("k lig")) return true;
  return false;
}

function oranGecerle(oran) {
  if (oran === null || oran === undefined) return null;
  return oran > 1.0 ? oran : null;
}

function guvenHesapla(mac, statsTablosu) {
  const iymsKg = oranGecerle(mac.iymsKg);
  const altUst6 = oranGecerle(mac.altUst6);
  if (iymsKg === null || altUst6 === null) {
    return { guven: null, onerilen: false, tutma: null, toplam: null, tutmaOrani: null, ligUygun: null };
  }
  const anahtar = `${Math.floor(iymsKg)},${Math.floor(altUst6)}`;
  const kayit = statsTablosu[anahtar];
  if (!kayit) {
    return { guven: null, onerilen: false, tutma: null, toplam: null, tutmaOrani: null, ligUygun: null };
  }
  const tutmaOrani = kayit.tutma / kayit.toplam;
  const ligUygun = ligIzinliMi(mac.lig);
  const kesinMi = kayit.toplam >= 3 && tutmaOrani === 1.0 && ligUygun;
  return { guven: kesinMi ? "kesin" : "olasi", onerilen: true, tutma: kayit.tutma, toplam: kayit.toplam, tutmaOrani, ligUygun };
}

function iddaaOranaCevir(nesineOran) {
  const gecerli = oranGecerle(nesineOran);
  if (gecerli === null) return null;
  return Math.round(gecerli * IDDAA_KATSAYI * 100) / 100;
}

function tlFormatla(sayi) {
  return sayi.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}

function saatFormatla(isoZaman) {
  return new Date(isoZaman).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* ==========================================================================
   KADRO LİSTEM / KUPON — localStorage tabanlı gerçek hesaplayıcı
   ========================================================================== */

function kuponOku() {
  try {
    const ham = localStorage.getItem(KUPON_ANAHTAR);
    return ham ? JSON.parse(ham) : [];
  } catch {
    return [];
  }
}

function kuponYaz(liste) {
  try {
    localStorage.setItem(KUPON_ANAHTAR, JSON.stringify(liste));
  } catch { /* localStorage kullanılamıyorsa sessizce yok say */ }
}

function kupondaMi(id) {
  return kuponOku().some((k) => k.id === id);
}

function kuponToggle(mac, kaynakOran) {
  const liste = kuponOku();
  const idx = liste.findIndex((k) => k.id === mac.id);
  if (idx >= 0) {
    liste.splice(idx, 1);
  } else {
    const iddaaOran = iddaaOranaCevir(kaynakOran);
    if (iddaaOran === null) return;
    liste.push({ id: mac.id, evSahibi: mac.evSahibi, deplasman: mac.deplasman, oran: iddaaOran });
  }
  kuponYaz(liste);
  tumEkraniGuncelle();
}

function kupondanCikar(id) {
  kuponYaz(kuponOku().filter((k) => k.id !== id));
  tumEkraniGuncelle();
}

function kuponuTemizle() {
  kuponYaz([]);
  tumEkraniGuncelle();
}

function kuponToplamOran() {
  const liste = kuponOku();
  if (liste.length === 0) return 0;
  return liste.reduce((carpim, k) => carpim * k.oran, 1);
}

/* ==========================================================================
   RENDER
   ========================================================================== */

let VERI = null;
let bultenFiltre = "hepsi";
let arsivAlt = "aktif";

async function veriYukle() {
  const res = await fetch("data.json");
  VERI = await res.json();
  document.getElementById("uretimZamani").textContent = saatFormatla(VERI.olusturulmaZamani);
  tumEkraniGuncelle();
}

function tumEkraniGuncelle() {
  if (!VERI) return;
  bultenCiz();
  canliCiz();
  arsivCiz();
  kuponCiz();
  kadroRozetiGuncelle();
}

function sahaButonuHtml(mac, kaynakOran) {
  const gecerli = oranGecerle(kaynakOran);
  const eklendi = kupondaMi(mac.id);
  if (gecerli === null) {
    return `<button class="saha-cikar-btn devre-disi" disabled>Oran Yok</button>`;
  }
  const iddaaOran = iddaaOranaCevir(gecerli);
  return `<button class="saha-cikar-btn ${eklendi ? "eklendi" : ""}" data-kupon-id="${mac.id}">
    ${eklendi ? "✓ Kadroda · " + iddaaOran.toFixed(2) : "Kadroya Al · " + iddaaOran.toFixed(2)}
  </button>`;
}

function formaEtiketHtml(guven) {
  if (guven === "kesin") return `<span class="forma-etiket ilk11">İLK 11</span>`;
  if (guven === "olasi") return `<span class="forma-etiket yedek">YEDEK KULÜBESİ</span>`;
  return `<span class="forma-etiket dis">KADRO DIŞI</span>`;
}

function oyuncuKartiHtml(mac, hesap) {
  let detay = "";
  if (hesap.guven) {
    detay = `Geçmiş ${hesap.tutma}/${hesap.toplam} · %${(hesap.tutmaOrani * 100).toFixed(0)} form${hesap.ligUygun === false ? " · lig dışı" : ""}`;
  }
  const sinif = hesap.guven === "kesin" ? "ilk11-karti" : hesap.guven === "olasi" ? "yedek-karti" : "";
  return `
    <article class="oyuncu-karti ${sinif}" data-guven="${hesap.guven || "yok"}">
      <div class="oyuncu-ust">
        <span>${mac.lig}</span>
        <span>${saatFormatla(mac.macZamani)}</span>
      </div>
      <div class="oyuncu-takimlar">
        <span class="oyuncu-takim">${mac.evSahibi}</span>
        <span class="oyuncu-vs">SAHA İÇİ</span>
        <span class="oyuncu-takim">${mac.deplasman}</span>
      </div>
      <div class="istatistik-satiri">
        <div class="istatistik-hucre ${oranGecerle(mac.msKg) === null ? "bos" : ""}"><span class="ad">MS-KG</span><span class="deger">${iddaaOranaCevir(mac.msKg)?.toFixed(2) ?? "—"}</span></div>
        <div class="istatistik-hucre ${oranGecerle(mac.altUst6) === null ? "bos" : ""}"><span class="ad">6+ Gol</span><span class="deger">${oranGecerle(mac.altUst6)?.toFixed(2) ?? "—"}</span></div>
        <div class="istatistik-hucre ${oranGecerle(mac.iymsKg) === null ? "bos" : ""}"><span class="ad">İY/MS-KG</span><span class="deger">${oranGecerle(mac.iymsKg)?.toFixed(2) ?? "—"}</span></div>
      </div>
      <div class="alt-satir">
        <div>
          ${formaEtiketHtml(hesap.guven)}
          <div class="forma-detay">${detay}</div>
        </div>
        ${sahaButonuHtml(mac, mac.msKg)}
      </div>
    </article>
  `;
}

function bultenCiz() {
  const hesaplar = VERI.bulten.map((m) => ({ mac: m, hesap: guvenHesapla(m, VERI.statsTablosu) }));
  const ilk11 = hesaplar.filter((h) => h.hesap.guven === "kesin").length;
  const yedek = hesaplar.filter((h) => h.hesap.guven === "olasi").length;

  document.getElementById("bultenSkorTahtasi").innerHTML = `
    <div class="skor-hucre"><span class="sayi">${hesaplar.length}</span><span class="etiket">Toplam Maç</span></div>
    <div class="skor-hucre ilk11"><span class="sayi">${ilk11}</span><span class="etiket">İlk 11</span></div>
    <div class="skor-hucre yedek"><span class="sayi">${yedek}</span><span class="etiket">Yedek Kulübesi</span></div>
  `;

  const filtreli = hesaplar.filter((h) => {
    if (bultenFiltre === "hepsi") return true;
    return h.hesap.guven === bultenFiltre;
  });

  const govde = document.getElementById("bultenListesi");
  govde.innerHTML = filtreli.length
    ? filtreli.map((h) => oyuncuKartiHtml(h.mac, h.hesap)).join("")
    : `<div class="bos-hal">Bu kadroda maç bulunamadı.</div>`;
}

document.getElementById("bultenFiltre").addEventListener("click", (e) => {
  const btn = e.target.closest(".filtre-cip");
  if (!btn) return;
  bultenFiltre = btn.dataset.f;
  document.querySelectorAll("#bultenFiltre .filtre-cip").forEach((b) => b.classList.toggle("aktif", b === btn));
  bultenCiz();
});

function dakikaYuzdesi(dakika) {
  if (dakika === "Devre Arası") return 50;
  const n = parseInt(dakika, 10);
  if (Number.isNaN(n)) return 50;
  return Math.min(96, Math.max(4, (n / 90) * 100));
}

function sahaKartiHtml(mac) {
  const g = mac.dondurulmusGuven || { guven: null };
  const kaynakOran = mac.canliMsKg != null ? mac.canliMsKg : mac.msKg;
  let taktikHtml = "";
  if (mac.kirmiziSinyal) {
    const s = mac.kirmiziSinyal;
    taktikHtml = `<div class="taktik-cikma"><strong>🟨 Taktik Sinyali · ${s.taktik}</strong>${s.tahmin} — dk ${s.dk}' skor ${s.skorEv}-${s.skorDep}</div>`;
  }
  let detay = "";
  if (g.guven) detay = `kickoff öncesi sabit · ${g.tutma}/${g.toplam}`;
  return `
    <article class="saha-karti" data-guven="${g.guven || "yok"}">
      <div class="saha-ust">
        <span>${mac.lig}</span>
        <span class="canli-yanip"><span class="top"></span>${mac.dakika}</span>
      </div>
      <div class="mini-saha">
        <span class="mini-skor">${mac.evSahibi.slice(0, 3).toUpperCase()} ${mac.skorEv} - ${mac.skorDep} ${mac.deplasman.slice(0, 3).toUpperCase()}</span>
        <span class="mini-top" style="left:${dakikaYuzdesi(mac.dakika)}%;"></span>
      </div>
      <div class="sinyal-guc-satiri">
        <span class="ad">Sahadaki Canlı KG Oranı</span>
        <span class="deger">${oranGecerle(mac.canliMsKg)?.toFixed(2) ?? "—"}</span>
      </div>
      ${taktikHtml}
      <div class="alt-satir">
        <div>
          ${formaEtiketHtml(g.guven)}
          <div class="forma-detay">${detay}</div>
        </div>
        ${sahaButonuHtml(mac, kaynakOran)}
      </div>
    </article>
  `;
}

function canliCiz() {
  const govde = document.getElementById("canliListesi");
  govde.innerHTML = VERI.canli.length
    ? VERI.canli.map(sahaKartiHtml).join("")
    : `<div class="bos-hal">Şu anda sahada maç yok.</div>`;
}

function notKartiHtml(s, bitenMi) {
  const durumAd = { acik: "AÇIK", kapali: "KAPALI", mac_bulunamadi: "MAÇ BULUNAMADI", hata: "HATA" }[s.durum] || s.durum;
  let market = "";
  if (s.oran !== null && s.oran !== undefined) {
    market = `<div class="not-market-satiri">
      <div class="not-market-hucre oneri"><span class="ad">${s.yon}</span><div class="val">${s.oran.toFixed(2)}</div></div>
      <div class="not-market-hucre"><span class="ad">Karşı Yön</span><div class="val">${s.digerOran.toFixed(2)}</div></div>
    </div>`;
  } else {
    market = `<div class="bos-hal" style="padding:10px;">Market oranı alınamadı</div>`;
  }
  return `
    <article class="not-karti">
      <div class="not-ust">
        <span>${s.taktik} · ${s.lig || ""}</span>
        <span class="durum-damga ${s.durum}">${durumAd}</span>
      </div>
      <div class="not-tahmin">${s.tahmin}</div>
      <div class="not-alt-bilgi">${s.home} ${s.skorEv} - ${s.skorDep} ${s.away} · dk ${s.dk}' · ${s.market}</div>
      ${market}
      ${bitenMi ? `<span class="sonuc-damga ${s.sonuc}">${s.sonuc}</span>` : ""}
    </article>
  `;
}

function arsivCiz() {
  const govde = document.getElementById("arsivListesi");
  const liste = arsivAlt === "aktif" ? VERI.arsiv.aktif : VERI.arsiv.biten;
  govde.innerHTML = liste.length
    ? liste.map((s) => notKartiHtml(s, arsivAlt === "biten")).join("")
    : `<div class="bos-hal">Defterde kayıt yok.</div>`;
}

document.getElementById("arsivFiltre").addEventListener("click", (e) => {
  const btn = e.target.closest(".filtre-cip");
  if (!btn) return;
  arsivAlt = btn.dataset.a;
  document.querySelectorAll("#arsivFiltre .filtre-cip").forEach((b) => b.classList.toggle("aktif", b === btn));
  arsivCiz();
});

function slotKartiHtml(k, sira) {
  return `
    <article class="slot-karti">
      <span class="slot-forma">${sira}</span>
      <div class="slot-bilgi">
        <span class="takimlar">${k.evSahibi} – ${k.deplasman}</span>
        <span class="pazar">Karşılıklı Gol · Var</span>
      </div>
      <span class="slot-oran">${k.oran.toFixed(2)}</span>
      <button class="slot-cikar" data-cikar-id="${k.id}">×</button>
    </article>
  `;
}

function kuponCiz() {
  const liste = kuponOku();
  const govde = document.getElementById("kadroSlotlari");
  govde.innerHTML = liste.length
    ? liste.map((k, i) => slotKartiHtml(k, i + 1)).join("")
    : `<div class="bos-hal">Kadro listenizde maç bulunmamaktadır.</div>`;

  document.getElementById("kuponAdet").textContent = liste.length;
  const toplamOran = kuponToplamOran();
  document.getElementById("kuponToplamOran").textContent = liste.length ? toplamOran.toFixed(2) : "0.00";

  kazancHesapla();
}

function kazancHesapla() {
  const tutarStr = document.getElementById("kuponTutar").value;
  const tutar = parseFloat(tutarStr.replace(",", ".")) || 0;
  const toplamOran = kuponToplamOran();
  const kazanc = tutar * toplamOran;
  document.getElementById("kuponKazanc").textContent = tlFormatla(kazanc);
}

document.getElementById("kuponTutar").addEventListener("input", kazancHesapla);
document.getElementById("kadroBosaltBtn").addEventListener("click", kuponuTemizle);

function kadroRozetiGuncelle() {
  const liste = kuponOku();
  document.getElementById("kadroSayisi").textContent = liste.length;
  document.getElementById("kadroOran").textContent = `${kuponToplamOran().toFixed(2)}x`;
}

/* ---- kadroya al / çıkar tıklamaları (event delegation) ---- */
document.getElementById("ana-icerik").addEventListener("click", (e) => {
  const ekleBtn = e.target.closest("[data-kupon-id]");
  if (ekleBtn) {
    const id = ekleBtn.dataset.kuponId;
    const tumMaclar = [...VERI.bulten, ...VERI.canli];
    const mac = tumMaclar.find((m) => m.id === id);
    if (mac) {
      const kaynakOran = mac.canliMsKg != null ? mac.canliMsKg : mac.msKg;
      kuponToggle(mac, kaynakOran);
    }
    return;
  }
  const cikarBtn = e.target.closest("[data-cikar-id]");
  if (cikarBtn) {
    kupondanCikar(cikarBtn.dataset.cikarId);
  }
});

/* ---- sekme geçişi ---- */
function sekmeyeGit(ad) {
  document.querySelectorAll(".tahta-sayfa").forEach((s) => s.classList.toggle("aktif", s.id === `sayfa-${ad}`));
  document.querySelectorAll(".sekme-etiket").forEach((b) => b.classList.toggle("aktif", b.dataset.sekme === ad));
  window.scrollTo({ top: 0, behavior: "instant" });
}

document.getElementById("sekmeNav").addEventListener("click", (e) => {
  const btn = e.target.closest(".sekme-etiket");
  if (!btn) return;
  sekmeyeGit(btn.dataset.sekme);
});

document.getElementById("kadroRozeti").addEventListener("click", () => sekmeyeGit("kupon"));

veriYukle();
