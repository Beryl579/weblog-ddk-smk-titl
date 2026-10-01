"""
Ringkasan Proyek Weblog Pembelajaran Interaktif DDK
---------------------------------------------------
Skrip ini membuat file DOCX berisi penjelasan proyek dengan bahasa
sederhana untuk orang awam (bukan anak IT).

Cara pakai:
    1. Install library:  pip install python-docx
    2. Jalankan:         python generate_ringkasaan_weblog_ddk.py
    3. Hasil:            Ringkasan_Weblog_DDK.docx (di folder yang sama)
"""

try:
    from docx import Document
    from docx.shared import Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
except ImportError:
    print("Library 'python-docx' belum terpasang.")
    print("Jalankan dulu: pip install python-docx")
    raise SystemExit(1)


def tambah_paragraf(doc, teks, bold=False, size=11):
    p = doc.add_paragraph()
    run = p.add_run(teks)
    run.font.size = Pt(size)
    run.bold = bold
    return p


def buat_dokumen(nama_file="Ringkasan_Weblog_DDK.docx"):
    doc = Document()

    # ---- Judul ----
    judul = doc.add_heading("Ringkasan Proyek: Weblog Pembelajaran Interaktif DDK", level=0)
    judul.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = sub.add_run("Penjelasan dengan bahasa sederhana untuk orang awam (bukan anak IT)")
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
    r.italic = True

    doc.add_paragraph(
        "Dokumen ini merangkum fungsi, kegunaan, tujuan, dan fitur dari proyek "
        "Weblog Media Pembelajaran DDK milik Rismauli Napitupulu (Pendidikan Teknik Elektro, UNIMED)."
    )

    # ---- 1. Apa itu? ----
    doc.add_heading("1. Proyek Ini Apa Sih? (Penjelasan Sederhana)", level=1)
    doc.add_paragraph(
        "Bayangkan sebuah 'blog belajar online' khusus untuk pelajaran listrik di SMK. "
        "Namanya Weblog DDK (DDK = Dasar-Dasar Ketenagalistrikan). "
        "Siswa cukup buka alamat website dari HP, lalu masuk pakai NIS dan password, "
        "langsung bisa membaca materi, mengerjakan latihan soal, dan melihat nilainya sendiri."
    )
    doc.add_paragraph(
        "Kalau diibaratkan: ini seperti perpustakaan + ruang ujian + papan nilai yang "
        "digabung jadi satu website. Guru bisa memantau dari halaman khusus guru, "
        "tanpa harus memeriksa kertas satu per satu."
    )
    doc.add_paragraph(
        "Secara teknis website ini berjalan di atas layanan gratis Google (Google Apps Script + "
        "Google Sheets sebagai tempat menyimpan data). Jadi tidak perlu sewa server mahal. "
        "Ada juga versi demo yang bisa dibuka tanpa internet khusus (data tersimpan di HP masing-masing)."
    )

    # ---- 2. Tujuan ----
    doc.add_heading("2. Tujuannya Apa?", level=1)
    doc.add_paragraph("Proyek ini dibuat dengan 4 tujuan utama:")
    tujuan = [
        ("Membantu siswa belajar lebih mudah: ",
         "materi pelajaran listrik yang biasanya tebal dan membosankan, disajikan rapi per bab di HP, bisa dibuka kapan saja, lengkap dengan gambar, contoh, dan rangkuman."),
        ("Membuat belajar bertahap dan adil: ",
         "siswa harus lulus latihan Bab 1 dulu (nilai minimal 75) baru bisa buka Bab 2, begitu seterusnya sampai ujian akhir. Jadi tidak bisa loncat-loncat."),
        ("Membantu guru memantau dan menilai: ",
         "guru bisa melihat siapa yang sudah belajar, siapa yang belum, berapa nilainya, tanpa rekap manual di kertas/Excel."),
        ("Mendukung penelitian skripsi: ",
         "website ini dipakai sebagai 'alat bantu mengajar' untuk meneliti apakah belajar pakai blog membuat nilai siswa lebih baik. "
         "Kelas yang memakai blog dibandingkan dengan kelas yang hanya memakai presentasi biasa."),
    ]
    for judul_poin, isi in tujuan:
        p = doc.add_paragraph(style="List Bullet")
        run_j = p.add_run(judul_poin)
        run_j.bold = True
        p.add_run(isi)

    # ---- 3. Kegunaan ----
    doc.add_heading("3. Kegunaannya Untuk Siapa?", level=1)
    manfaat = [
        ("Untuk Siswa: ",
         "bisa belajar mandiri dari HP, mengerjakan 4 latihan bab + 1 ujian akhir (20 soal), langsung tahu nilai dan pembahasannya, tahu progres belajar sendiri."),
        ("Untuk Guru: ",
         "bisa melihat rekap nilai semua siswa dalam satu tabel, tahu rata-rata kelas, tahu siapa yang sudah / belum selesai, tidak perlu koreksi manual."),
        ("Untuk Sekolah / Peneliti: ",
         "data nilai tersimpan rapi dan bisa diunduh (CSV) untuk diolah lebih lanjut, misalnya untuk laporan atau analisis penelitian."),
    ]
    for judul_poin, isi in manfaat:
        p = doc.add_paragraph(style="List Bullet")
        run_j = p.add_run(judul_poin)
        run_j.bold = True
        p.add_run(isi)

    # ---- 4. Fitur ----
    doc.add_heading("4. Fitur-fiturnya Apa Saja? (Bahasa Awam)", level=1)
    doc.add_paragraph(
        "Berikut fitur utama website ini, dijelaskan seperti menjelaskan ke orang yang belum pernah pakai:"
    )

    fitur = [
        ("1. Daftar & Masuk (Login):",
         "Siswa baru klik 'Daftar', isi NIS, nama, pilih kelas (X TITL 1 / X TITL 2), dan buat password. "
         "Kalau sudah punya akun, tinggal masuk pakai NIS + password. Ada juga akun khusus guru dan admin."),
        ("2. Beranda Siswa (Dashboard):",
         "Halaman utama siswa. Isinya seperti 'panel listrik' — ada 5 saklar/lampu (4 materi + 1 ujian). "
         "Lampu menyala hijau artinya sudah lulus, kalau masih redup artinya belum. Ada juga angka progres, misal 'Materi 2 dari 4 selesai'."),
        ("3. Empat Materi Pelajaran:",
         "Materi 1: Proses Perencanaan Instalasi (cara merencanakan pemasangan listrik gedung, dari survei sampai serah terima). "
         "Materi 2: Pembuatan Panel (cara membuat panel listrik, misal panel otomatis PLN ke genset). "
         "Materi 3: Pemeliharaan & Perawatan (cara merawat dan memperbaiki peralatan listrik). "
         "Materi 4: Pengelolaan SDM (tentang pekerjaan lulusan listrik). "
         "Tiap materi ada penjelasan, gambar, contoh kasus, rangkuman, dan daftar istilah sulit (glosarium)."),
        ("4. Kuis Tiap Bab (12 soal):",
         "Setelah baca materi, siswa mengerjakan latihan 12 soal pilihan ganda. Harus dapat nilai 75 atau lebih supaya bab berikutnya terbuka. "
         "Soal tampil satu per satu, ada nomor 1–12, bisa maju-mundur, dan setelah selesai ada pembahasan jawabannya."),
        ("5. Ujian Akhir (20 soal):",
         "Ujian besar mencakup semua bab. Hanya bisa dibuka kalau 4 kuis sudah lulus semua. Aturannya mirip kuis, tapi jumlah soalnya 20."),
        ("6. Halaman Guru (Dashboard Guru):",
         "Halaman khusus guru (harus login sebagai guru). Isinya tabel berisi semua siswa: NIS, nama, nilai kuis 1–4, nilai ujian, rata-rata. "
         "Guru bisa mencari nama, mengurutkan nilai, dan mengekspor data ke file Excel/CSV."),
        ("7. Bisa Dibuka di HP:",
         "Tampilannya sudah disesuaikan untuk layar HP kecil (mulai 360px). Ada menu samping di laptop dan tombol menu di HP. Jadi siswa SMK yang kebanyakan pakai HP tetap nyaman."),
        ("8. Tiga Cara Menjalankan:",
         "Versi resmi (data tersimpan di Google, dipakai siswa sungguhan). Versi demo statis (untuk coba-coba cepat, data hanya di browser sendiri). "
         "Versi satu file Blogger (satu file HTML ditempel ke Blogspot). Versi lokal (untuk pengembang di laptop)."),
    ]
    for judul_fitur, isi in fitur:
        p = doc.add_heading(judul_fitur, level=2)
        # kecilkan sedikit ukuran heading fitur agar rapi
        for run in p.runs:
            run.font.size = Pt(12)
        doc.add_paragraph(isi)

    # ---- Tabel akun demo ----
    doc.add_heading("5. Contoh Akun Untuk Coba-coba", level=1)
    doc.add_paragraph("Ini akun contoh yang sudah disiapkan (berlaku di semua versi):")
    tabel = doc.add_table(rows=1, cols=3)
    tabel.style = "Light Grid Accent 1"
    hdr = tabel.rows[0].cells
    hdr[0].text = "Peran"
    hdr[1].text = "Username (NIS)"
    hdr[2].text = "Password"
    data_akun = [
        ("Siswa", "2024001", "siswa123"),
        ("Guru", "GURU001", "guru123"),
        ("Admin", "ADMIN001", "admin123"),
    ]
    for peran, user, pw in data_akun:
        row = tabel.add_row().cells
        row[0].text = peran
        row[1].text = user
        row[2].text = pw

    # ---- Cara pakai ----
    doc.add_heading("6. Cara Pakai Singkat (Untuk Orang Awam)", level=1)
    langkah = [
        "Siswa: buka link website → klik Daftar (kalau belum punya akun) → isi data → klik Masuk → baca Materi 1 → kerjakan Kuis 1 → kalau lulus lanjut ke Materi 2, begitu seterusnya sampai Ujian Akhir.",
        "Guru: buka link website → masuk pakai akun guru → buka halaman Guru → lihat tabel nilai → unduh data kalau perlu dibuat laporan.",
    ]
    for i, teks in enumerate(langkah, start=1):
        doc.add_paragraph(f"{i}. {teks}")

    # ---- Kesimpulan ----
    doc.add_heading("7. Kesimpulan Satu Paragraf", level=1)
    doc.add_paragraph(
        "Intinya, proyek ini adalah website belajar sederhana untuk pelajaran listrik kelas X SMK. "
        "Tujuannya supaya siswa lebih semangat dan mudah belajar dari HP, guru lebih mudah memantau nilai, "
        "dan peneliti bisa membuktikan apakah media blog benar-benar membantu menaikkan hasil belajar. "
        "Fitur intinya hanya tiga: baca materi, kerjakan soal bertahap, dan pantau nilai — "
        "tanpa fitur aneh-aneh seperti game, chatbot, atau video call, supaya fokus untuk belajar."
    )

    doc.add_paragraph("")
    penutup = doc.add_paragraph()
    penutup.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = penutup.add_run("— Selesai — Dokumen dibuat otomatis oleh generate_ringkasaan_weblog_ddk.py —")
    r2.font.size = Pt(9)
    r2.font.color.rgb = RGBColor(0x88, 0x88, 0x88)
    r2.italic = True

    doc.save(nama_file)
    print(f"Berhasil! File tersimpan: {nama_file}")


if __name__ == "__main__":
    buat_dokumen()
