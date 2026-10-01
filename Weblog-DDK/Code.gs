/**
 * Code.gs — Headless REST API Gateway untuk Weblog DDK (Netlify Frontend)
 * Menerima request HTTP (POST/GET) dari website di Netlify
 * dan merespon dalam format JSON murni via ContentService.
 */

/**
 * Endpoint Utama: Menerima HTTP POST dari Netlify
 */
function doPost(e) {
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = {};
    try {
      payload = JSON.parse(contents);
    } catch (parseErr) {
      payload = e.parameter || {};
    }

    var action = String(payload.action || (e && e.parameter && e.parameter.action) || '').trim();
    var data = payload.data || payload;

    var result = handleApiAction(action, data);
    return createJsonResponse(result);

  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Server Error: ' + err.message
    });
  }
}

/**
 * Endpoint Tambahan: Menerima HTTP GET (bisa untuk uji coba di browser)
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = String(params.action || 'ping').trim();

    if (action === 'ping') {
      return createJsonResponse({
        success: true,
        message: 'Backend API Weblog DDK Aktif!',
        timestamp: new Date().toISOString()
      });
    }

    var result = handleApiAction(action, params);
    return createJsonResponse(result);

  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Server Error: ' + err.message
    });
  }
}

/**
 * Router Logika Bisnis: Memanggil fungsi sesuai aksi (action)
 */
function handleApiAction(action, data) {
  switch (action) {
    // 1. Otentikasi
    case 'login':
      return login(data.nis, data.password);

    case 'register':
      return register(data.nis, data.nama, data.kelas, data.password, data.confirmPassword || data.pw2);

    case 'getCurrentUser':
      var u = getCurrentUser(data.nis);
      return u ? { success: true, user: u } : { success: false, message: 'Sesi habis' };

    case 'logout':
      return logout(data.nis);

    // 2. Progres Siswa & Gating Kuis
    case 'getStudentProgress':
      return getStudentProgress(data);

    case 'submitMateriQuiz':
      return submitMateriQuiz(data);

    // 3. Dashboard Guru
    case 'getGuruOverview':
      return getGuruOverview(data);

    default:
      return {
        success: false,
        message: 'Action "' + action + '" tidak dikenali'
      };
  }
}

/**
 * Helper: Mengembalikan respon dalam format JSON resmi
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
