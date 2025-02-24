const db = require("../utils/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.SECRET_KEY;
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(
  process.env.Google_cleint_id
);
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const LoginWithEmail_Controller=(req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });
    
    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        fav_recipes: user.fav_recipes ? JSON.parse(user.fav_recipes) : [],
        list_recipes: user.list_recipes ? JSON.parse(user.list_recipes) : [],
        profile_pic: user.profile_pic,
        recipes_created: user.recipes_created_cnt,
        fav_recipes_cnt: user.fav_recipes_cnt,
      },
    });
})};


const SignUp_Controler=async (req, res) => {
  console.log("sign up routee", req.body);
  const { email, password, name } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
    [email, hashedPassword, name],
    function (err) {
      if (err) {
        console.log(err);
        if (err.code === "SQLITE_CONSTRAINT") {
          return res.status(400).json({ message: "Email already exists" });
        }
        return res.status(500).json({ message: "Database error" });
      }
      return res.status(201).json({
        name,
      });
    })
};


const Login_With_Google=async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience:
        "540400376676-o2b36bvf6cmclci206sqbmsf36190669.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    db.get(
      "SELECT * FROM users WHERE google_id = ? OR email = ?",
      [googleId, email],
      (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });

        if (user) {
          // User exists, generate JWT
          console.log("user is", user);
          const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            {
              expiresIn: "24h",
            }
          );
          return res.status(200).json({
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              fav_recipes: user.fav_recipes ? JSON.parse(user.fav_recipes) : [],
              list_recipes: user.list_recipes
                ? JSON.parse(user.list_recipes)
                : [],
              profile_pic: user.profile_pic,
              recipes_created: user.recipes_created_cnt,
              fav_recipes_cnt: user.fav_recipes_cnt,
            },
          });
        } else {
          // New user
          db.run(
            "INSERT INTO users (google_id, email, name, profile_pic) VALUES (?, ?, ?, ?)",
            [googleId, email, name, picture],
            function (err) {
              if (err)
                return res.status(500).json({ message: "Database error" });

              const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET);

              res.status(201).json({
                token,
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  profile_pic: user.profile_pic,
                  recipes_created: user.recipes_created_cnt,
                  fav_recipes: user.fav_recipes
                    ? JSON.parse(user.fav_recipes)
                    : [],
                  list_recipes: user.list_recipes
                    ? JSON.parse(user.list_recipes)
                    : [],
                  fav_recipes_cnt: user.fav_recipes_cnt,
                },
              });
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(401).json({ message: "Invalid Google token" });
  }
};


const Forgot_Password_Controller=(req, res) => {
  const { email } = req.body;
  console.log(email, "lalith");
  if (!email) return res.status(400).json({ error: "Email is required" });

  db.get(
    "SELECT * FROM users WHERE email =?",
    [email],
    (err, user) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry
      console.log(otp, "otp");
      // Store OTP in DB
      db.run(
        "INSERT OR REPLACE INTO otps (email, otp, expires_at) VALUES (?, ?, ?)",
        [email, otp, expiresAt],
        (err) => {
          console.log(err);
          if (err) return res.status(500).json({ error: "Database error" });

          // Send OTP Email

          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "basavojuganesh@gmail.com",
              pass: process.env.EMAIL_APPCODE,
            },
          });

          const mailOptions = {
            from: "basavojuganesh@gmail.com",
            to: email,
            subject: "Forget Password From Recipe-share",
            text:
              "Your Password Reset OTP provided here and \n it will work only for 5 minuetes\n" +
              otp,
          };

          transporter.sendMail(mailOptions, (err) => {
            if (err)
              return res.status(500).json({ error: "Email sending failed" });
            res.status(200).json({ message: "OTP sent to email" });
          });
        }
      );
    }
  );
};


const Reset_password_Controller=async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ error: "All fields are required" });

  db.get(
    "SELECT * FROM otps WHERE email = ? AND otp = ?",
    [email, otp],
    (err, otpEntry) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!otpEntry) return res.status(400).json({ error: "Invalid OTP" });

      if (new Date(otpEntry.expires_at) < new Date()) {
        return res.status(400).json({ error: "OTP expired" });
      }

      // Hash new password
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err)
          return res.status(500).json({ error: "Error hashing password" });

        // Update password in DB
        db.run(
          "UPDATE users SET password = ? WHERE email = ?",
          [hashedPassword, email],
          (err) => {
            if (err) return res.status(500).json({ error: "Database error" });

            // Delete OTP after use
            db.run("DELETE FROM otps WHERE email = ?", [email], (err) => {
              if (err)
                return res.status(500).json({ error: "Error deleting OTP" });

              res.status(200).json({ message: "Password reset successful" });
            });
          }
        );
      });
    }
  );
};


module.exports={
    LoginWithEmail_Controller,
    Login_With_Google,
    Forgot_Password_Controller,
    SignUp_Controler,
    Reset_password_Controller,
}


