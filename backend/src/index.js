import express from "express";
import { config } from "./config.js";
import { healthRouter } from "./routes/health.js";
import { checkoutRouter } from "./routes/checkout.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { ordersRouter } from "./routes/orders.js";
import { uploadsRouter } from "./routes/uploads.js";
import { listingsRouter } from "./routes/listings.js";
import { shopRouter } from "./routes/shop.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { cartRouter } from "./routes/cart.js";

const app = express();
app.use(express.json());

app.use(healthRouter);
app.use(checkoutRouter);
app.use(webhooksRouter);
app.use(ordersRouter);
app.use(uploadsRouter);
app.use(listingsRouter);
app.use(shopRouter);
app.use(dashboardRouter);
app.use(cartRouter);

app.listen(config.port, () => {
  console.log(`Munshi backend on ${config.publicBaseUrl} (port ${config.port})`);
});
