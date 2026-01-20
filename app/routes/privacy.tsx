import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy - EZProduct" },
    { name: "description", content: "EZProduct Privacy Policy" },
  ];
};

export default function Privacy() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif", lineHeight: "1.6" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Privacy Policy</h1>
      
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>
      
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>1. Data Collection</h2>
        <p>
          EZProduct collects product keywords and related information that you provide to generate product listings. 
          We also collect product generation history to help you track your created products.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>2. Data Usage</h2>
        <p>
          We use your data solely to generate product content and sync products to your Shopify store. 
          Your product keywords and information are used to create AI-generated product listings including titles, 
          descriptions, variants, and pricing.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>3. Data Storage</h2>
        <p>
          Product generation history is stored securely in our database. We retain this data to help you track 
          your product creation history and improve our services.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>4. Third-Party Services</h2>
        <p>
          We use Google Gemini AI API to generate product content. Please review Google's privacy policy 
          at <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc" }}>https://policies.google.com/privacy</a>.
        </p>
        <p>
          We use Shopify APIs to sync products to your store. Please review Shopify's privacy policy 
          at <a href="https://www.shopify.com/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc" }}>https://www.shopify.com/legal/privacy</a>.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>5. Data Sharing</h2>
        <p>
          We do not sell, trade, or rent your personal information to third parties. We only share data 
          with third-party services (Google Gemini AI, Shopify) as necessary to provide our services.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>6. User Rights</h2>
        <p>
          You have the right to access, update, or delete your data at any time. To exercise these rights, 
          please contact us using the information provided below.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>7. Cookies</h2>
        <p>
          We use cookies to maintain your session and improve your experience. You can control cookies 
          through your browser settings.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>8. Security</h2>
        <p>
          We implement appropriate security measures to protect your data. However, no method of transmission 
          over the Internet is 100% secure.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>9. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify you of any changes by posting 
          the new policy on this page and updating the "Last updated" date.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>10. Contact</h2>
        <p>
          If you have any questions about this privacy policy, please contact us at:
        </p>
        <p>
          Email: <a href="mailto:support@ezproduct.app" style={{ color: "#0066cc" }}>support@ezproduct.app</a>
        </p>
        <p>
          Or through the Shopify App support channels.
        </p>
      </section>
    </div>
  );
}
