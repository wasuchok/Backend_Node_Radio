// ตัวอย่างการทำงานของ Auto Refresh Token Middleware
// วิธีใช้งาน API endpoints หลังจากติดตั้ง middleware

/**
 * 1. การ Login
 * POST /auth/login
 * Body: { username: "test", password: "password" }
 * 
 * Response:
 * {
 *   "ok": true,
 *   "result": {
 *     "message": "เข้าสู่ระบบสำเร็จ",
 *     "accessToken": "eyJ...",
 *     "username": "test"
 *   }
 * }
 * 
 * Cookies ที่จะถูกตั้งค่า:
 * - accessToken (อายุ 15 นาที)
 * - refreshToken (อายุ 7 วัน)
 */

/**
 * 2. การเข้าถึง Protected Routes
 * GET /auth/profile
 * Cookies: accessToken, refreshToken
 * 
 * กรณี accessToken ยังใช้ได้:
 * Response: { "ok": true, "user": { "userId": "...", "username": "test" } }
 * 
 * กรณี accessToken หมดอายุ แต่ refreshToken ยังใช้ได้:
 * - Middleware จะทำ refresh อัตโนมัติ
 * - ตั้งค่า accessToken ใหม่ใน cookie
 * - Response: { "ok": true, "user": { "userId": "...", "username": "test" } }
 * 
 * กรณี refreshToken หมดอายุ:
 * Response: { "error": true, "message": "Refresh token หมดอายุ กรุณาเข้าสู่ระบบใหม่", "requireLogin": true }
 */

/**
 * 3. การใช้งานใน Frontend JavaScript
 */

class ApiClient {
    async callAPI(endpoint, options = {}) {
        const response = await fetch(endpoint, {
            ...options,
            credentials: 'include' // สำคัญ! ต้องส่ง cookies
        });

        if (response.status === 401) {
            const errorData = await response.json();
            if (errorData.requireLogin) {
                // Redirect to login
                window.location.href = '/login';
                return null;
            }
        }

        return response;
    }

    // ตัวอย่างการเรียกใช้ protected endpoint
    async getProfile() {
        const response = await this.callAPI('/auth/profile');
        if (response) {
            return await response.json();
        }
        return null;
    }

    async startPlaylist() {
        const response = await this.callAPI('/playlist/start-playlist');
        if (response) {
            return await response.json();
        }
        return null;
    }
}

/**
 * 4. ตัวอย่าง Timeline การทำงาน
 * 
 * Time 0:00 - User login สำเร็จ
 * - accessToken expires at 0:15
 * - refreshToken expires at 7 days
 * 
 * Time 0:10 - User เรียก API → ใช้งานได้ปกติ
 * Time 0:16 - User เรียก API → accessToken หมดอายุ
 * - Middleware detect token expired
 * - Auto refresh token
 * - Set new accessToken (expires at 0:31)
 * - Return API response ปกติ
 * 
 * Time 0:20 - User เรียก API → ใช้งานได้ปกติ (ใช้ token ใหม่)
 */

/**
 * 5. Routes ที่ใช้ middleware นี้
 * 
 * Routes ที่ต้องการ authentication:
 * - POST /playlist/setup (authenticateToken)
 * - GET /playlist/start-playlist (authenticateToken)
 * - GET /playlist/next-track (authenticateToken)
 * - GET /playlist/prev-track (authenticateToken)
 * - GET /playlist/stop-playlist (authenticateToken)
 * - DELETE /song/remove/:songId (authenticateToken)
 * - GET /auth/profile (authenticateToken)
 * 
 * Routes ที่ไม่บังคับ authentication:
 * - GET /playlist/ (optionalAuth)
 * - GET /playlist/song (optionalAuth)
 */

/**
 * 6. การ Logout
 * POST /auth/logout
 * 
 * จะทำการ:
 * - ลบ refreshToken จากฐานข้อมูล
 * - Clear cookies (accessToken, refreshToken)
 * 
 * Response: { "ok": true, "message": "ออกจากระบบสำเร็จ" }
 */

/**
 * 7. Manual Refresh Token (ถ้าต้องการ)
 * GET /auth/refreshToken
 * 
 * Response: { "ok": true, "message": "ออก accessToken ใหม่สำเร็จ", "accessToken": "new_token" }
 */

// Export ถ้าต้องการใช้เป็น module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient };
}
