const { registerUser, loginUser } = require("../services/user.service");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

async function register(req, res) {
  try {
    const { username, password } = req.body;

    const result = await registerUser(username, password);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    const { refreshToken, accessToken, ...rest } = await loginUser(username, password);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000,
    });
    res.json({ ok: true, result: rest });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
}

async function refreshToken(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json({ error: true, message: "ไม่มี refresh token" });
    }

    const findUser = await User.findOne({ refreshToken });
    if (!findUser) {
      return res
        .status(403)
        .json({ error: true, message: "Refresh token ไม่ถูกต้อง" });
    }

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err) {
          return res.status(403).json({
            error: true,
            message: "Refresh token หมดอายุหรือไม่ถูกต้อง",
          });
        }

        const newAccessToken = jwt.sign(
          { userId: decoded.userId, username: decoded.username },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );

        // ตั้งค่า cookie ใหม่
        res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: false,
          sameSite: "Strict",
          maxAge: 15 * 60 * 1000,
        });

        return res.json({
          ok: true,
          message: "ออก accessToken ใหม่สำเร็จ",
          accessToken: newAccessToken,
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(400).json({ ok: false, error: error.message });
  }
}

async function logout(req, res) {
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

    res.json({
      ok: true,
      message: "ออกจากระบบสำเร็จ"
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
}

async function getProfile(req, res) {
  try {
    res.json({
      ok: true,
      user: {
        userId: req.user.userId,
        username: req.user.username
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
}

module.exports = { register, login, refreshToken, logout, getProfile };
