const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",

    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendOTP = async (
    to,
    otp,
    subject
) => {
    const mailOptions = {
        from:
            process.env.SMTP_FROM ||
            process.env.SMTP_USER,

        to,

        subject,

        text:
            `Your OTP is ${otp}. ` +
            `It is valid for ` +
            `${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`,

        html: `
            <div style="font-family: Arial, sans-serif;">
                <h2>Verification Code</h2>

                <p>Your verification code is:</p>

                <h1 style="letter-spacing: 5px;">
                    ${otp}
                </h1>

                <p>
                    This OTP is valid for
                    ${process.env.OTP_EXPIRY_MINUTES || 10}
                    minutes.
                </p>

                <p>
                    If you did not request this code,
                    please ignore this email.
                </p>
            </div>
        `
    };

    await transporter.sendMail(
        mailOptions
    );
};

const verifySMTPConnection = async () => {
    await transporter.verify();

    console.log(
        "SMTP connection verified."
    );
};

module.exports = {
    sendOTP,
    verifySMTPConnection
};