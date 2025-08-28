const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware สำหรับตรวจสอบ access token และ auto refresh
async function authenticateToken(req, res, next) {
    try {
        // ดึง access token จาก cookie หรือ header
        let accessToken = req.cookies?.accessToken ||
            req.headers.authorization?.replace('Bearer ', '');

        if (!accessToken) {
            return res.status(401).json({
                error: true,
                message: 'ไม่พบ access token'
            });
        }

        // ตรวจสอบ access token
        jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                // ถ้า access token หมดอายุ
                if (err.name === 'TokenExpiredError') {
                    console.log('Access token expired, trying to refresh...');

                    // พยายาม refresh token อัตโนมัติ
                    const refreshResult = await autoRefreshToken(req, res);

                    if (refreshResult.success) {
                        // ถ้า refresh สำเร็จ ให้ใช้ user data จาก refresh token
                        req.user = refreshResult.user;
                        return next();
                    } else {
                        // ถ้า refresh ไม่สำเร็จ
                        return res.status(401).json({
                            error: true,
                            message: refreshResult.message,
                            requireLogin: true
                        });
                    }
                } else {
                    // ถ้า token ไม่ valid
                    return res.status(403).json({
                        error: true,
                        message: 'Access token ไม่ถูกต้อง'
                    });
                }
            }

            // ถ้า access token ยังใช้ได้
            req.user = {
                userId: decoded.userId,
                username: decoded.username
            };
            next();
        });

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: true,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
        });
    }
}

// ฟังก์ชันสำหรับ auto refresh token
async function autoRefreshToken(req, res) {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return {
                success: false,
                message: 'ไม่มี refresh token กรุณาเข้าสู่ระบบใหม่'
            };
        }

        // หาผู้ใช้ที่มี refresh token นี้
        const findUser = await User.findOne({ refreshToken });
        if (!findUser) {
            return {
                success: false,
                message: 'Refresh token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่'
            };
        }

        // ตรวจสอบ refresh token
        return new Promise((resolve) => {
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    console.error('Refresh token verification failed:', err);
                    resolve({
                        success: false,
                        message: 'Refresh token หมดอายุ กรุณาเข้าสู่ระบบใหม่'
                    });
                    return;
                }

                // สร้าง access token ใหม่
                const newAccessToken = jwt.sign(
                    { userId: decoded.userId, username: decoded.username },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: "15m" }
                );

                // ตั้งค่า cookie ใหม่
                res.cookie("accessToken", newAccessToken, {
                    httpOnly: true,
                    secure: false, // ตั้งเป็น true ถ้าใช้ HTTPS
                    sameSite: "Strict",
                    maxAge: 15 * 60 * 1000, // 15 minutes
                });

                console.log(`Auto refreshed token for user: ${decoded.username}`);

                resolve({
                    success: true,
                    user: {
                        userId: decoded.userId,
                        username: decoded.username
                    },
                    newAccessToken
                });
            });
        });

    } catch (error) {
        console.error('Auto refresh error:', error);
        return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการ refresh token'
        };
    }
}

// Middleware สำหรับ optional authentication (ไม่บังคับต้องล็อกอิน)
async function optionalAuth(req, res, next) {
    try {
        let accessToken = req.cookies?.accessToken ||
            req.headers.authorization?.replace('Bearer ', '');

        if (!accessToken) {
            req.user = null;
            return next();
        }

        jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    // พยายาม refresh token อัตโนมัติ
                    const refreshResult = await autoRefreshToken(req, res);

                    if (refreshResult.success) {
                        req.user = refreshResult.user;
                    } else {
                        req.user = null;
                    }
                } else {
                    req.user = null;
                }
            } else {
                req.user = {
                    userId: decoded.userId,
                    username: decoded.username
                };
            }
            next();
        });

    } catch (error) {
        console.error('Optional auth middleware error:', error);
        req.user = null;
        next();
    }
}

// Middleware สำหรับการออกจากระบบ
async function logout(req, res, next) {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            // ลบ refresh token จากฐานข้อมูล
            await User.updateOne(
                { refreshToken },
                { $unset: { refreshToken: "" } }
            );
        }

        // ลบ cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        next();
    } catch (error) {
        console.error('Logout middleware error:', error);
        next();
    }
}

module.exports = {
    authenticateToken,
    optionalAuth,
    logout,
    autoRefreshToken
};
