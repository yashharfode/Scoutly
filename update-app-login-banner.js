const fs = require('fs');
let code = fs.readFileSync('frontend/src/App.tsx', 'utf8');

// Enhance the Login & Captcha banner in CockpitView
const oldBannerSection = `{session.isLogin && (
        <div className="error-banner" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Lock size={26} color="#c07b48" />
            <div>
              <strong>🔐 Login Required on This Website</strong>
              <p style={{ margin: 0, fontSize: 13 }}>Please sign in to your account in the opened browser window.</p>
            </div>
          </div>
          <button className="primary-button" onClick={onResume} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Play size={14} /> I've Logged In — Continue
          </button>
        </div>
      )}`;

const newBannerSection = `{session.isLogin && (
        <div style={{ marginTop: 18, padding: "20px 24px", background: "#fffbeb", border: "2px solid #fde68a", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: "#fef3c7", padding: 10, borderRadius: 10 }}>
              <Lock size={28} color="#b45309" />
            </div>
            <div>
              <strong style={{ fontSize: 16, color: "#92400e" }}>🔐 Please Log In Inside the Opened Browser Window</strong>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78350f" }}>
                Sign in to your account (Google/Email/OTP) in the Chromium window. Scoutly will persist your login session so you stay logged in for future applications.
              </p>
            </div>
          </div>
          <button className="primary-button" onClick={onResume} style={{ background: "#d97706", display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", fontSize: 14 }}>
            <Play size={16} /> I've Logged In — Fast Apply 🚀
          </button>
        </div>
      )}`;

code = code.replace(oldBannerSection, newBannerSection);
fs.writeFileSync('frontend/src/App.tsx', code);
console.log('Updated login banner in App.tsx');
