# Udyog AI 🚀  
An AI-powered chatbot platform for **sales and marketing automation**, streamlining customer interactions, lead generation, and payment processing.  

---

## 📌 Features  
- **AI Chatbot** – Automates customer interactions for businesses.  
- **Lead Capture** – Captures and stores leads in real-time.  
- **Email Marketing** – Sends automated emails based on customer actions.  
- **Real-time Chat** – Enables instant customer-business communication.  
- **Role-based Access** – Supports admin and user roles.  
- **Payment Processing** – Secure transactions via **Stripe**.  
- **Authentication & Security** – User authentication via **Clerk**.  
- **Cloud Storage** – Uses **Uploadcare** for media handling.  
- **Scalable Infrastructure** – Powered by **Neon** (PostgreSQL), **Cloudways**, and **Bun**.  

---

## 🎨 UI/UX Design  
The platform’s user interface was designed in **Figma**, ensuring a seamless and intuitive experience.  

🔗 **[Live Figma Prototype](https://www.figma.com/proto/WXFXDbfC6qUQlklsGu21JM/Udyog-AI?node-id=98-45&t=TSB3UjrgeRNh1kjg-1&scaling=min-zoom&content-scaling=fixed&page-id=98%3A44&starting-point-node-id=98%3A45)**  

> *(Click the link to view the interactive design in Figma.)*  

---

## 🛠️ Tech Stack  
- **Frontend:** Next.js 15, Tailwind CSS  
- **Backend:** Node.js, Prisma ORM  
- **Database:** Neon (PostgreSQL)  
- **Authentication:** Clerk  
- **Cloud Storage:** Uploadcare  
- **Hosting & Deployment:** Cloudways  
- **Payments:** Stripe  
- **Real-time Updates:** Pusher  
- **Design & Prototyping:** Figma  

---

## 🚀 Installation & Setup  

### **Step 1️⃣ Clone the Repository**  
Open your terminal and run the following command:  

```bash
git clone https://github.com/prathamesh901/Udyog-AI.git
cd Udyog-AI
```

This will download the repository and navigate you to the project folder.  

### **Step 2️⃣ Install Dependencies**  
Run the following command to install all required dependencies:  

```bash
npm install
```

This will install Next.js, Prisma, Clerk, Stripe, Pusher, and other necessary packages.  

### **Step 3️⃣ Set Up Environment Variables**  
Create a `.env.local` file in the root directory and add the following environment variables:  

```env
# Database Configuration  
DATABASE_URL="your_neon_database_url"

# Clerk Authentication  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"

# Uploadcare Storage  
UPLOADCARE_PUBLIC_KEY="your_uploadcare_key"

# Stripe Payment Processing  
STRIPE_SECRET_KEY="your_stripe_secret_key"

# Pusher for Real-Time Updates  
PUSHER_APP_ID="your_pusher_app_id"
PUSHER_KEY="your_pusher_key"
PUSHER_SECRET="your_pusher_secret"
PUSHER_CLUSTER="your_pusher_cluster"
```

Replace the placeholder values with your actual API keys from the respective service providers.  

### **Step 4️⃣ Generate Prisma Client**  
Run the following command to generate the Prisma client:  

```bash
npx prisma generate
```

If you have made changes to the database schema, apply migrations by running:  

```bash
npx prisma migrate dev --name init
```

This ensures the Prisma schema is updated with the latest database changes.  

### **Step 5️⃣ Start the Development Server**  
Run the following command to start the project:  

```bash
npm run dev
```

By default, the project will be available at `http://localhost:3000`.  

### **Troubleshooting**  
- If the database connection fails, double-check the `DATABASE_URL` in `.env.local`.  
- If Prisma does not work, try running `npx prisma generate` again.  
- If authentication issues occur, verify that Clerk keys are correctly configured.  

---

## 🔧 Usage Guide  

### **Admin Panel**  
- Manage leads, view analytics, and configure chatbot settings.  
- Monitor chatbot performance and user interactions in real-time.  

### **Chatbot Setup**  
- Customize automated responses and predefined workflows.  
- Configure chatbot behavior to handle customer queries effectively.  

### **Marketing Automation**  
- Set up automated email campaigns for lead nurturing and customer engagement.  
- Schedule and track email performance to improve conversion rates.  

### **Payment Processing**  
- Accept customer payments using **Stripe integration**.  
- Manage invoices and transaction history for seamless business operations.  
