<p align="center">
  <img src="apps/frontend/public/logo.svg" alt="CXSun Logo" width="120" />
</p>

# CXSun

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
**Version:** 1.0.75

CXSun is a comprehensive, enterprise-grade TypeScript monorepo designed for high-performance ERP, E-commerce, and Multi-tenant SaaS platforms. It provides a robust foundation for building scalable, AI-native applications with a focus on data isolation and modularity.

## 🚀 Overview

The platform is engineered with a modern, multi-tenant architecture to support complex business requirements:

- **Platform Layer:** Global orchestration managing tenants, industries, and system-wide configurations powered by a master MariaDB database.
- **Tenant Layer:** Secure data isolation for each tenant using dedicated MariaDB databases, ensuring privacy and scalability.
- **AI-Native Integration:** Built-in AI assist system designed to accelerate development cycles and provide intelligent operational support.
- **Modern Tech Stack:** Leveraging Fastify for a high-performance backend and React/Vite for a responsive, modern frontend experience.

## 🛠️ Usage

CXSun can be used as a foundation for various business applications:
- **ERP Systems:** Manage enterprise resources, supply chains, and business processes.
- **E-commerce Platforms:** Deploy multi-vendor or multi-store retail solutions.
- **SaaS Products:** Build and scale multi-tenant software services with ease.

---

## 📋 Requirements

- **Node.js:** v20+
- **Package Manager:** npm v10+
- **Databases:**
  - **MariaDB:** For platform-level orchestration and tenant-isolated business databases through `DB_*`.
  - **MariaDB/MySQL:** For tenant-specific business data.
- **Optional:** Redis (caching), Docker (deployment).

## ⚙️ Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/CODEXSUN/cxsun.git
    cd cxsun
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    ```bash
    cp .env.sample .env
    ```
    *Update `.env` with your local database credentials.*

4.  **Launch the platform:**
    ```bash
    npm run dev
    ```

## 💻 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start server and frontend concurrently |
| `npm run dev:server` | Start Fastify backend in development mode |
| `npm run dev:frontend` | Start React + Vite frontend in development mode |
| `npm run check` | Execute project-wide health checks |
| `npm run build:active` | Compile production builds for apps |

## 🏗️ Project Structure

```text
cxsun/
├── apps/
│   ├── server/          # High-performance Fastify backend
│   ├── frontend/        # Modern React + Vite frontend
│   └── cli/             # Internal developer experience tools
├── packages/
│   ├── shared/          # Universal types and utilities
│   └── ui/              # Component library (Tailwind + shadcn/ui)
├── assist/              # AI-native agent context and rules
└── storage/             # Persistent data and database storage
```

## 🤝 Contributing

We welcome contributions from the community! To get started:

1.  **Fork** the repository.
2.  **Create** a new feature branch (`git checkout -b feature/amazing-feature`).
3.  **Commit** your changes (`git commit -m 'Add some amazing feature'`).
4.  **Push** to the branch (`git push origin feature/amazing-feature`).
5.  **Open** a Pull Request.

Please ensure your code adheres to our TypeScript standards and includes appropriate tests.

## 🧪 Testing

```bash
# Run specific module tests
npm -w apps/server run test:master-data
```

## 🐳 Deployment

Deploy using Docker Compose:
```bash
docker compose -f .container/docker-compose.yml up --build
```

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---
*For in-depth technical documentation, refer to [assist/README.md](assist/README.md).*
