require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Mongoose Models for User and ContactForm
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
});

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const ContactForm = mongoose.model('ContactForm', contactSchema);

// Nodemailer Gmail Setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password
  },
});

// Root Route
app.get('/', (req, res) => {
  res.send('Welcome to the Coinova API!');
});

// Route to handle subscription (for users)
app.post('/subscribe', async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already subscribed.' });
    }

    // Save user data to MongoDB
    const newUser = new User({ name, email, phone });
    await newUser.save();

    // Send Welcome Email
    const htmlContent = `
     <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f9; color: #333;">
          <div style="max-width: 600px; margin: auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
            
            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:coinovaLogo" alt="Coinova Logo" style="width: 150px; height: auto;">
            </div>

            <!-- Welcome Heading -->
            <h1 style="text-align: center; color: #172A3A; font-size: 24px; font-weight: bold; text-shadow: 1px 1px 2px #09BC8A;">
              Welcome to <span style="color: #09BC8A;">Coinova</span>!
            </h1>

            <!-- Main Content -->
            <p style="font-size: 16px; line-height: 1.6; text-align: center; color: #555;">
              Hi ${name},<br><br>
              Thank you for signing up for early access to Coinova! We’re thrilled to bring you the best in crypto-to-Naira trading. 
              Get ready for a revolutionary experience as we make cryptocurrency accessible, secure, and simple for everyone in Nigeria.
            </p>

            <!-- Social Media Links -->
            <div style="text-align: center; margin-top: 30px;">
              <p style="font-size: 16px; color: #333; font-weight: bold;">Follow us on Social Media:</p>
              <a href="https://www.instagram.com/coinova_official/?igsh=bXZiemgxa3I3NXdt" target="_blank" style="margin: 0 10px; text-decoration: none;">
                <img src="https://cdn-icons-png.flaticon.com/512/1384/1384063.png" alt="Instagram" style="width: 40px; height: 40px;">
              </a>
              <a href="https://www.facebook.com/profile.php?id=61567637472237&mibextid=kFxxJD" target="_blank" style="margin: 0 10px; text-decoration: none;">
                <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" style="width: 40px; height: 40px;">
              </a>
            </div>

            <!-- Footer -->
            <p style="font-size: 12px; color: #888; text-align: center; margin-top: 40px;">
              &copy; 2024 Coinova. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
    
    
    const mailOptions = {
      from: `Coinova <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Coinova!',
      html: htmlContent,
    };

    // Send email to user
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Subscription successful!' });
  } catch (error) {
    console.error('Error subscribing user:', error);
    res.status(500).json({ message: 'An error occurred while subscribing.' });
  }
});

// Route to handle contact form submission
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    // Save contact form data to MongoDB (optional)
    const newContact = new ContactForm({ name, email, message });
    await newContact.save();

    // Send Email to Support Team and User
    const supportMailOptions = {
      from: `Coinova <${process.env.EMAIL_USER}>`,
      to: process.env.SUPPORT_EMAIL, // Support team email
      subject: 'New Contact Form Submission',
      text: `You have received a new contact form submission:\n\nName: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    const userMailOptions = {
      from: `Coinova <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Thank You for Contacting Coinova!',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f9; color: #333;">
            <div style="max-width: 600px; margin: auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
              <h1 style="text-align: center; color: #172A3A; font-size: 24px; font-weight: bold; text-shadow: 1px 1px 2px #09BC8A;">
                Thank You for Reaching Out to Coinova!
              </h1>
              <p style="font-size: 16px; line-height: 1.6; text-align: center; color: #555;">
                Hi ${name},<br><br>
                We’ve received your message and our team will get back to you as soon as possible.
              </p>
              <p style="font-size: 12px; color: #888; text-align: center; margin-top: 40px;">
                &copy; 2024 Coinova. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `,
    };

    // Send confirmation email to support and user
    await transporter.sendMail(supportMailOptions);
    await transporter.sendMail(userMailOptions);

    res.status(200).json({ message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Error handling contact form:', error);
    res.status(500).json({ message: 'An error occurred while sending your message.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
