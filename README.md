
# 🏥 E-BOND - Backend (NestJS)

Proyecto backend desarrollado con **NestJS**, **TypeORM**, **PostgreSQL** y múltiples módulos para gestionar un sistema completo de e‑commerce: usuarios, productos, carrito, órdenes, pagos, chat, autenticación y más.

---

## 🚀 Tecnologías principales
- **NestJS**
- **TypeORM**
- **PostgreSQL**
- **JWT Auth + Guards + Roles**
- **Stripe Payments**
- **Nodemailer / Supabase Auth (opcional)**
- **WebSockets (Chatbot)**

---

## 📁 Estructura del proyecto
```
src/
├── auth/
├── cart/
├── category/
├── chat/
├── invoice/
├── order/
├── order-detail/
├── pay-methods/
├── payment/
├── product/
├── role/
├── stripe/
└── user/
```

---

## ⚙️ Instalación
```bash
git clone <repo>
cd proyecto-backend
npm install
```

---

## 🔧 Variables de entorno (.env)
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=12345
DATABASE_NAME=hormigadb
JWT_SECRET=supersecretkey
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
MAIL_USER=tu_correo@gmail.com
MAIL_PASS=contraseña
```

---

## 🛠 Ejecutar el proyecto
```bash
npm run start:dev
```

---

## 🔐 Autenticación
Incluye:
- Login
- Registro
- Recuperación de contraseña
- Roles (ADMIN / CLIENT)
- Guards personalizados

---

## 🛒 Módulo de Productos
- CRUD completo
- Categorías
- Integración opcional con DummyJSON

---

## 🛍 Carrito de compras
- Agregar productos
- Actualizar cantidades
- Checkout con validaciones

---

## 📦 Órdenes y detalles
- Crear orden desde carrito
- Descontar stock (transacciones + bloqueo Pessimistic Write)
- CRUD admin

---

## 💳 Pagos
Implementación con Stripe:
- Checkout Session
- Payment Intents
- Webhooks
- Actualización automática de estado del pago

---

## 💬 Chatbot (WebSockets)
Módulo opcional usando Gateway y conexiones en tiempo real.

---

## 🧪 Testing
Incluye estructura base con Jest.

---

## 🧾 Licencia
MIT

EOF

echo "README.md generado correctamente"


## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
